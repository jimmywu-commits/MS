#!/usr/bin/env python3
"""把 tools/build-tp-sba.py 打好的包（output/tp-sba）發佈到 TP artifact。

步驟：
  1. 先打包：python tools/build-tp-sba.py
  2. 在 TP 個人設定產生一個 Personal Access Token（tp_pat_...），放進環境變數 TP_TOKEN。
     PowerShell：$env:TP_TOKEN = "tp_pat_..."
     token 只從環境變數讀，不會寫進檔案或印出來。
  3. 發佈到既有的 artifact：
       python tools/publish-tp-sba.py --artifact <artifact_id>
     或第一次先建立一個新的 artifact（parent 是 TP 上的資料夾 id）：
       python tools/publish-tp-sba.py --create --parent <folder_id> --name "MS 曝光資源 SBA（TP 測試）"
  4. 只想看會送出什麼、不連線：加 --dry-run

做的事：
  - 圖片與字型：逐一用 artifact_asset_upload_url 取得上傳網址，PUT 原始檔案（已上傳過的會略過）。
  - 文字檔（html/css/js/json）：放進 artifact_publish 的 files，一次發佈成新版本。
  - TP 掃描沒過時會列出每一個 finding（檔案與原因），並以錯誤碼 1 結束。

連線方式：TP 的 MCP 端點（預設 https://twtc.shopee.tw/mcp，可用 --endpoint 或 TP_ENDPOINT 改），
  以 JSON-RPC 呼叫 initialize → tools/call，只用 Python 標準函式庫。
"""
import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BUNDLE = ROOT / 'output' / 'tp-sba'
DEFAULT_ENDPOINT = 'https://twtc.shopee.tw/mcp'
PROTOCOL_VERSION = '2025-06-18'

TEXT_EXT = {'.html', '.js', '.css', '.json', '.svg', '.txt', '.md', '.csv', '.tsv'}
ASSET_TYPES = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
}
REQUEST_MAX_BYTES = 1024 * 1024


class TPError(Exception):
    pass


class MCPClient:
    """最小的 MCP（Streamable HTTP）用戶端：initialize 一次，之後用 tools/call 呼叫工具。"""

    def __init__(self, endpoint, token):
        self.endpoint = endpoint
        self.token = token
        self.session_id = None
        self.next_id = 1

    def _post(self, message, expect_reply=True):
        body = json.dumps(message, ensure_ascii=False).encode('utf-8')
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'Authorization': 'Bearer ' + self.token,
            'MCP-Protocol-Version': PROTOCOL_VERSION,
        }
        if self.session_id:
            headers['Mcp-Session-Id'] = self.session_id
        req = urllib.request.Request(self.endpoint, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                sid = resp.headers.get('Mcp-Session-Id')
                if sid:
                    self.session_id = sid
                ctype = resp.headers.get('Content-Type', '')
                raw = resp.read().decode('utf-8', errors='replace')
        except urllib.error.HTTPError as e:
            detail = e.read().decode('utf-8', errors='replace')[:500]
            if e.code in (401, 403):
                raise TPError(f'TP 拒絕連線（HTTP {e.code}）：請確認 TP_TOKEN 正確、沒有過期。{detail}')
            raise TPError(f'TP 回應 HTTP {e.code}：{detail}')
        except urllib.error.URLError as e:
            raise TPError(f'連不到 TP（{self.endpoint}）：{e.reason}')
        if not expect_reply:
            return None
        return self._parse(raw, ctype, message.get('id'))

    @staticmethod
    def _parse(raw, ctype, want_id):
        candidates = []
        if 'text/event-stream' in ctype:
            data_lines = []
            for line in raw.splitlines():
                if line.startswith('data:'):
                    data_lines.append(line[5:].lstrip())
                elif not line.strip() and data_lines:
                    candidates.append('\n'.join(data_lines))
                    data_lines = []
            if data_lines:
                candidates.append('\n'.join(data_lines))
        else:
            candidates.append(raw)
        for text in candidates:
            try:
                msg = json.loads(text)
            except ValueError:
                continue
            if isinstance(msg, dict) and msg.get('id') == want_id:
                if 'error' in msg:
                    raise TPError(f'TP 回傳錯誤：{msg["error"]}')
                return msg.get('result')
        raise TPError('看不懂 TP 的回應：' + raw[:300])

    def initialize(self):
        self.request('initialize', {
            'protocolVersion': PROTOCOL_VERSION,
            'capabilities': {},
            'clientInfo': {'name': 'ms-build-tp-sba', 'version': '1.0'},
        })
        self._post({'jsonrpc': '2.0', 'method': 'notifications/initialized'}, expect_reply=False)

    def request(self, method, params):
        msg = {'jsonrpc': '2.0', 'id': self.next_id, 'method': method, 'params': params}
        self.next_id += 1
        return self._post(msg)

    def call(self, tool, arguments):
        result = self.request('tools/call', {'name': tool, 'arguments': arguments})
        if not isinstance(result, dict):
            raise TPError(f'{tool} 沒有回傳結果')
        data = result.get('structuredContent')
        if data is None:
            texts = [c.get('text', '') for c in result.get('content', []) if c.get('type') == 'text']
            joined = '\n'.join(texts)
            try:
                data = json.loads(joined)
            except ValueError:
                data = {'text': joined}
        if result.get('isError'):
            raise TPError(f'{tool} 失敗：{json.dumps(data, ensure_ascii=False)[:800]}')
        return data


def collect(bundle):
    files, assets, skipped = [], [], []
    for p in sorted(bundle.rglob('*')):
        if not p.is_file():
            continue
        rel = p.relative_to(bundle).as_posix()
        ext = p.suffix.lower()
        if ext in TEXT_EXT:
            files.append({'path': rel, 'content': p.read_text(encoding='utf-8')})
        elif ext in ASSET_TYPES:
            data = p.read_bytes()
            assets.append({'path': rel, 'bytes': data, 'sha256': hashlib.sha256(data).hexdigest(),
                           'size': len(data), 'content_type': ASSET_TYPES[ext]})
        else:
            skipped.append(rel)
    return files, assets, skipped


def put_asset(upload_url, headers, data):
    req = urllib.request.Request(upload_url, data=data, headers=dict(headers or {}), method='PUT')
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            if resp.status >= 300:
                raise TPError(f'上傳失敗（HTTP {resp.status}）')
    except urllib.error.HTTPError as e:
        raise TPError(f'上傳失敗（HTTP {e.code}）：{e.read().decode("utf-8", errors="replace")[:300]}')


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    ap = argparse.ArgumentParser(description='發佈 output/tp-sba 到 TP artifact')
    ap.add_argument('--bundle', default=str(DEFAULT_BUNDLE), help='打包好的資料夾（預設 output/tp-sba）')
    ap.add_argument('--artifact', default=os.environ.get('TP_ARTIFACT_ID', ''), help='要發佈的 artifact id（或環境變數 TP_ARTIFACT_ID）')
    ap.add_argument('--create', action='store_true', help='先建立新的 artifact 再發佈（要搭配 --parent、--name）')
    ap.add_argument('--parent', default='', help='建立時放在哪個 TP 資料夾（folder id）')
    ap.add_argument('--name', default='MS 曝光資源 SBA', help='建立時的 artifact 名稱')
    ap.add_argument('--title', default=None, help='這個版本的標題（不給就沿用）')
    ap.add_argument('--endpoint', default=os.environ.get('TP_ENDPOINT', DEFAULT_ENDPOINT))
    ap.add_argument('--dry-run', action='store_true', help='只列出會送出什麼，不連線')
    args = ap.parse_args()

    bundle = Path(args.bundle).resolve()
    if not (bundle / 'index.html').is_file():
        raise SystemExit(f'{bundle} 裡沒有 index.html，請先執行 python tools/build-tp-sba.py')
    files, assets, skipped = collect(bundle)
    request_bytes = len(json.dumps({'files': files}, ensure_ascii=False).encode('utf-8'))
    print(f'文字檔 {len(files)} 個（發佈請求約 {request_bytes / 1048576:.2f} MiB，上限 1 MiB）')
    print(f'圖片／字型 {len(assets)} 個，共 {sum(a["size"] for a in assets) / 1048576:.2f} MiB（逐一上傳成 asset）')
    for s in skipped:
        print(f'略過（TP 不收這種檔案）：{s}')
    if request_bytes > REQUEST_MAX_BYTES:
        raise SystemExit('文字檔太大，超過 TP 單次發佈上限 1 MiB；請確認打包時有精簡（不要加 --no-slim）。')
    if args.dry_run:
        for a in assets:
            print(f'  asset {a["path"]}  {a["size"] / 1024:.0f} KB  {a["content_type"]}')
        print('（--dry-run：沒有連線，也沒有發佈）')
        return

    token = os.environ.get('TP_TOKEN', '').strip()
    if not token:
        raise SystemExit('沒有 TP_TOKEN。請先在 TP 產生 Personal Access Token，再設定環境變數 TP_TOKEN。')
    if not args.artifact and not args.create:
        raise SystemExit('請給 --artifact <id>，或用 --create --parent <folder_id> 建立新的 artifact。')

    client = MCPClient(args.endpoint, token)
    try:
        client.initialize()
        artifact_id = args.artifact
        if args.create:
            if not args.parent:
                raise SystemExit('--create 需要 --parent <folder_id>')
            created = client.call('artifact_create', {'parent': args.parent, 'name': args.name})
            artifact_id = created.get('id') or (created.get('artifact') or {}).get('id')
            if not artifact_id:
                raise TPError('建立 artifact 後沒拿到 id：' + json.dumps(created, ensure_ascii=False)[:300])
            print(f'已建立 artifact：{artifact_id}')

        refs = []
        uploaded = reused = 0
        for a in assets:
            info = client.call('artifact_asset_upload_url', {
                'artifact_id': artifact_id, 'sha256': a['sha256'], 'size': a['size'], 'content_type': a['content_type'],
            })
            blob_id = info.get('blob_id') or info.get('blobId')
            if not blob_id:
                raise TPError(f'{a["path"]} 沒拿到 blob_id：' + json.dumps(info, ensure_ascii=False)[:300])
            if info.get('upload_url'):
                put_asset(info['upload_url'], info.get('upload_headers'), a['bytes'])
                uploaded += 1
            else:
                reused += 1
            refs.append({'path': a['path'], 'blobId': blob_id})
        print(f'asset：新上傳 {uploaded} 個、沿用 {reused} 個')

        params = {'artifact_id': artifact_id, 'files': files, 'assets': refs}
        if args.title is not None:
            params['title'] = args.title
        result = client.call('artifact_publish', params)
    except TPError as e:
        raise SystemExit('錯誤：' + str(e))

    if isinstance(result, dict) and result.get('passed') is False:
        print(f'TP 掃描沒通過：{result.get("reason")}')
        for f in result.get('findings') or []:
            print('  - ' + json.dumps(f, ensure_ascii=False))
        for f in result.get('asset_failures') or []:
            print('  - asset ' + json.dumps(f, ensure_ascii=False))
        sys.exit(1)
    print('發佈完成：')
    for key in ('version', 'container_url', 'public_url', 'slug_url'):
        if isinstance(result, dict) and result.get(key):
            print(f'  {key}: {result[key]}')
    if not any(isinstance(result, dict) and result.get(k) for k in ('container_url', 'public_url', 'slug_url')):
        print('  ' + json.dumps(result, ensure_ascii=False)[:800])


if __name__ == '__main__':
    main()
