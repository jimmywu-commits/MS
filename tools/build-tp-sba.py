#!/usr/bin/env python3
"""把曝光資源編輯器的 SBA 版位打包成 TP（Tech Platform artifact）可以發佈的資料夾。

用法（在 repo 根目錄）：
    python tools/build-tp-sba.py                       # 產出 output/tp-sba/
    python tools/build-tp-sba.py --bg-per-category 3   # 每個底圖分類放 3 張（預設 2）
    python tools/build-tp-sba.py --no-fonts            # 不放字型（改用系統字型）
    python tools/build-tp-sba.py --no-slim             # 不精簡程式（保留註解與縮排，方便除錯）
    python tools/build-tp-sba.py --manual-url https://…/JBP編輯器使用說明書.pdf
發佈：python tools/publish-tp-sba.py（見該檔說明）

做的事：
  1. 只複製 SBA 三個版位（SBA_APP方LOGO、SBA_APP橫LOGO、SBA_PC）需要的檔案。
  2. js/bn-store.js 換成 js/bn-store-tp.js（只放記憶體，包內不會出現瀏覽器儲存 API）。
  3. js/index.js 只列 SBA 三個版位；bgimg/index.json 只留選到的橫式底圖。
  4. 使用說明書 PDF 不放（TP 不收 pdf）：給 --manual-url 就改成開新分頁連過去，否則隱藏按鈕。
  5. 精簡文字檔：拿掉整行的註解與行首縮排（TP 單次發佈請求上限 1 MiB），精簡後用 node 檢查語法。
  6. 依 TP 發佈規則檢查整包，有問題就列出來並以錯誤碼 1 結束。

TP artifact_publish 的限制（2026-11 工具說明）：
  - 文字檔（html/css/js/json/svg/txt/md/csv/tsv）：最多 100 個、共 5 MiB，而且整個發佈請求不能超過 1 MiB。
  - 圖片與字型（png/jpg/gif/webp、woff2/woff/ttf/otf）另外上傳成 assets：每個最大 20 MiB、最多 2000 個、共 1 GiB。

TP 規則出處：docs/給Jimmy_bned上TP修改說明_20261120.md、tp 的 artifact_authoring_guide。
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'shopee2'
DEFAULT_OUT = ROOT / 'output' / 'tp-sba'

SBA_LAYOUTS = ['SBA_APP方LOGO', 'SBA_APP橫LOGO', 'SBA_PC']

# 主頁、外掛與資料（照原本路徑放進包內）
CODE_FILES = [
    'index.html',
    'js/bn-dialog.js',
    'js/vendor/browser-loader.js',
    'js/bn-editor-plugin.js',
    'js/bn-state-plugin.js',
    'js/bn-workorder-upload-plugin.js',
    'js/bn-bg-library-plugin.js',
    'js/bn-whatsnew-plugin.js',
    'js/editor-plugin.js',          # 商品圖編輯（點「編輯」時才載入）
    'js/logo-editor-plugin.js',     # LOGO 編輯
    'js/logo-autotrim-plugin.js',   # LOGO 去白邊
    'js/bn-shadow-plugin.js',       # 影子
    'js/shadow-plugin.js',          # 影子引擎（bn-shadow-plugin 載入）
    'js/layout-runtime.js',         # 版位頁共用程式
    'js/banwords-engine-hbn.js',
    'js/changelog.json',
    'banwords.rules.json',
]
ASSET_FILES = [
    'html/img/ig-shopee-logo-card.png',  # 主頁固定載入
    'html/img/bg.png',                   # 商品圖編輯器的透明格底
    '程式檔案/跳出.png',
    '程式檔案/建議範圍框.PNG',
]
FONT_FILES = [
    'fonts/ShopeeNotoSans(content)-Regular.woff2',
    'fonts/ShopeeNotoSans(content)-Medium.woff2',
    'fonts/ShopeeNotoSans(content)-Bold.woff2',
]
BG_CATEGORIES = ['EL', 'Fashion', 'FMCG', 'Lifestyle']

TEXT_EXT = {'.html', '.js', '.css', '.json', '.svg', '.txt', '.md', '.csv', '.tsv'}
ASSET_TYPES = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
}
TEXT_MAX_FILES = 100
TEXT_MAX_BYTES = 5 * 1024 * 1024
REQUEST_MAX_BYTES = 1024 * 1024
REQUEST_SAFE_BYTES = 960 * 1024      # 留一點給請求裡的其他欄位
ASSET_MAX_BYTES = 20 * 1024 * 1024
ASSET_MAX_COUNT = 2000


def copy(rel_src, out, rel_dst=None):
    src = SRC / rel_src
    if not src.is_file():
        raise SystemExit(f'找不到來源檔：shopee2/{rel_src}')
    dst = out / (rel_dst or rel_src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def write_text(out, rel, text):
    dst = out / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(text, encoding='utf-8', newline='')


def build_index_js(out):
    names = ',\n'.join(f'  "{n}.html"' for n in SBA_LAYOUTS)
    write_text(out, 'js/index.js',
               '/* TP 版（tools/build-tp-sba.py 產生）：只放 SBA 三個版位。 */\n'
               f'var BN_LAYOUTS = [\n{names}\n];\n'
               "if (typeof window._bn_scan_cb === 'function') window._bn_scan_cb(BN_LAYOUTS);\n")


def build_backgrounds(out, per_category):
    """只放 SBA 用得到的橫式底圖，每個分類取前 N 張，並改寫 bgimg/index.json。"""
    data = json.loads((SRC / 'bgimg/index.json').read_text(encoding='utf-8'))
    picked = {}
    files = []
    for cat in BG_CATEGORIES:
        cat_data = data.get(cat) or {}
        hbn_key = 'hbn' if 'hbn' in cat_data else 'HBN'
        keep = []
        for name in cat_data.get(hbn_key) or []:
            if len(keep) >= per_category:
                break
            rel = f'bgimg/{cat}/{hbn_key}/{name}'
            if (SRC / rel).is_file():
                keep.append(name)
                files.append(rel)
        if keep:
            picked[cat] = {hbn_key: keep, 'ddcard': []}
    # A 活動公版只在 MS 主頁傳入 A／B+ 等級（或網址 #all）時才會出現，TP 獨立頁看不到，不放。
    if '_rules' in data:
        picked['_rules'] = data['_rules']
    # 外掛也會讀 bgimg/brand.json（原始資料夾沒有這個檔）；放一個空的，TP 上才不會出現 404
    write_text(out, 'bgimg/brand.json', 'null')
    for rel in files:
        copy(rel, out)
    write_text(out, 'bgimg/index.json', json.dumps(picked, ensure_ascii=False, indent=1))
    return len(files)


# ── 精簡 ────────────────────────────────────────────────────────────
# 只拿掉「整行」的註解與行首縮排，不動同一行裡程式後面的註解，避免誤刪字串裡的 // 或 /*。
_BLOCK_COMMENT_LINE = re.compile(r'(?m)^[ \t]*/\*(?:(?!\*/)[\s\S])*\*/[ \t]*\r?\n')
_LINE_COMMENT_LINE = re.compile(r'(?m)^[ \t]*//[^\n]*\n')
_HTML_COMMENT = re.compile(r'<!--(?!\[)(?:(?!-->)[\s\S])*-->')
_INDENT = re.compile(r'(?m)^[ \t]+')
_BLANK_LINES = re.compile(r'(?:\r?\n){2,}')


def slim_text(text, ext):
    if ext == '.json':
        try:
            return json.dumps(json.loads(text), ensure_ascii=False, separators=(',', ':'))
        except ValueError:
            return text
    if ext not in ('.js', '.html', '.css'):
        return text
    text = _BLOCK_COMMENT_LINE.sub('', text)
    if ext != '.css':
        text = _LINE_COMMENT_LINE.sub('', text)
    if ext == '.html':
        text = _HTML_COMMENT.sub('', text)
    text = _INDENT.sub('', text)
    return _BLANK_LINES.sub('\n', text)


def slim_bundle(out):
    before = after = 0
    for p in sorted(out.rglob('*')):
        ext = p.suffix.lower()
        if not p.is_file() or ext not in ('.js', '.html', '.css', '.json'):
            continue
        raw = p.read_text(encoding='utf-8')
        new = slim_text(raw, ext)
        before += len(raw.encode('utf-8'))
        after += len(new.encode('utf-8'))
        p.write_text(new, encoding='utf-8', newline='')
    return before, after


def syntax_check(out):
    """用 node --check 檢查每支 .js 與 .html 裡的內嵌 script；沒有 node 就略過。"""
    node = shutil.which('node')
    if not node:
        return ['找不到 node，略過語法檢查'], []
    import subprocess
    import tempfile
    errors = []
    jobs = [(p.relative_to(out).as_posix(), p.read_text(encoding='utf-8')) for p in sorted(out.rglob('*.js'))]
    for p in sorted(out.rglob('*.html')):
        text = p.read_text(encoding='utf-8')
        for i, block in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>', text)):
            jobs.append((f'{p.relative_to(out).as_posix()} 第 {i + 1} 段 script', block))
    with tempfile.TemporaryDirectory() as tmp:
        tmp_js = Path(tmp) / 'check.js'
        for label, code in jobs:
            tmp_js.write_text(code, encoding='utf-8')
            r = subprocess.run([node, '--check', str(tmp_js)], capture_output=True, text=True, encoding='utf-8', errors='replace')
            if r.returncode != 0:
                msg = (r.stderr or '').strip().splitlines()
                errors.append(f'{label}：精簡後語法錯誤（{msg[-1] if msg else "?"}）')
    return [], errors


def strip_font_faces(out):
    """沒放字型時，拿掉版位頁的 @font-face，避免 TP 上一直出現字型 404（主控台紅字）。"""
    count = 0
    for name in SBA_LAYOUTS:
        path = out / 'html' / f'{name}.html'
        text = path.read_text(encoding='utf-8')
        text, n = re.subn(r'@font-face\s*\{[^}]*\}\s*', '', text)
        count += n
        path.write_text(text, encoding='utf-8', newline='')
    return count


def patch_index_html(out, manual_url):
    path = out / 'index.html'
    text = path.read_text(encoding='utf-8')
    nl = '\r\n' if '\r\n' in text else '\n'
    # 使用說明書 PDF：TP 不收 pdf，iframe 不預先載入
    pdf_src = 'src="JBP編輯器使用說明書.pdf#view=FitH"'
    if pdf_src not in text:
        raise SystemExit('index.html 找不到使用說明書 iframe，請更新 build-tp-sba.py')
    text = text.replace(pdf_src, 'src="about:blank"')
    open_line = 'document.getElementById("manual-btn").onclick=function(){m.classList.add("show");};'
    if open_line not in text:
        raise SystemExit('index.html 找不到使用說明書按鈕的程式，請更新 build-tp-sba.py')
    if manual_url:
        safe = manual_url.replace('&', '&amp;').replace('"', '&quot;')
        old_btn = '<div id="manual-btn">📖 使用說明書</div>'
        if old_btn not in text:
            raise SystemExit('index.html 找不到使用說明書按鈕，請更新 build-tp-sba.py')
        text = text.replace(old_btn, f'<a id="manual-btn" href="{safe}" target="_blank" rel="noopener" '
                                     'style="text-decoration:none;box-sizing:border-box">📖 使用說明書</a>')
        text = text.replace(open_line, '/* TP 版：使用說明書改成連結開新分頁（tools/build-tp-sba.py） */')
    else:
        text = text.replace(open_line, '/* TP 版：沒有使用說明書（tools/build-tp-sba.py） */')
        text = text.replace('</head>', f'<style>#manual-btn{{display:none!important;}}</style>{nl}</head>', 1)
    path.write_text(text, encoding='utf-8', newline='')


# ── 檢查 ────────────────────────────────────────────────────────────
CHECKS = [
    ('瀏覽器儲存 API（TP 掃描會直接擋）', re.compile(r'\b(localStorage|sessionStorage|indexedDB)\b|document\.cookie')),
    ('HTML 行內事件屬性（onclick 等）', re.compile(r'''<[a-zA-Z][^>]*\son[a-z]{3,}\s*=|['"]\s*\+?\s*['"]?\s*\bon(click|change|input|load|error|submit|keydown|keyup|mousedown|mouseup|focus|blur)\s*=\s*\\?["']''')),
    ('window.open', re.compile(r'\bwindow\.open\s*\(')),
    ('fetch 網址不是寫死的字串', re.compile(r'''\bfetch\s*\(\s*(?!(['"])[^'"+]*\1\s*[,)])''')),
    ('eval / new Function / Worker / type=module', re.compile(r'''(?<![.\w$])eval\s*\(|new\s+Function\s*\(|new\s+(Shared)?Worker\s*\(|type\s*=\s*["']module["']''')),
    ('原生 alert / confirm / prompt', re.compile(r'(?<![.\w$])(alert|confirm|prompt)\s*\(')),
    ('外部 script／link 不是 cdnjs', re.compile(r'''<(script|link)\b[^>]*(src|href)\s*=\s*["']https?://(?!cdnjs\.cloudflare\.com/)''', re.I)),
]
# 只看程式碼、不看註解的 html2canvas（只是提醒）
HTML2CANVAS = re.compile(r'html2canvas')
REF = re.compile(r'''['"(](\.\./)?((?:js|html|img|bgimg|fonts|程式檔案)/[^'"()?#\s]+\.(?:json|js|css|png|jpe?g|PNG|JPG|woff2|html))(?![\w.])''')
# 只在 MS 主頁（BODA 模式）才會載入、TP 版用不到的檔案
REF_IGNORE = {'js/help-settings.js'}


def strip_comments(text, ext):
    if ext == '.json':
        return text
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    text = re.sub(r'(?m)^\s*//.*$', '', text)
    if ext == '.html':
        text = re.sub(r'<!--.*?-->', '', text, flags=re.S)
    return text


def publish_request_bytes(out, text_files):
    """估算 artifact_publish 請求的大小（文字檔內容會以 JSON 字串送出）。"""
    payload = [{'path': p.relative_to(out).as_posix(), 'content': p.read_text(encoding='utf-8')} for p in text_files]
    return len(json.dumps({'files': payload}, ensure_ascii=False).encode('utf-8'))


def check_bundle(out):
    errors, warnings = [], []
    files = sorted(p for p in out.rglob('*') if p.is_file())
    text_files = [p for p in files if p.suffix.lower() in TEXT_EXT]
    assets = [p for p in files if p.suffix.lower() in ASSET_TYPES]
    text_bytes = sum(p.stat().st_size for p in text_files)
    asset_bytes = sum(p.stat().st_size for p in assets)
    if len(text_files) > TEXT_MAX_FILES:
        errors.append(f'文字檔 {len(text_files)} 個，超過 TP 上限 {TEXT_MAX_FILES}')
    if text_bytes > TEXT_MAX_BYTES:
        errors.append(f'文字檔共 {text_bytes / 1048576:.2f} MiB，超過 TP 上限 5 MiB')
    request = publish_request_bytes(out, text_files)
    if request > REQUEST_MAX_BYTES:
        errors.append(f'發佈請求約 {request / 1048576:.2f} MiB，超過 TP 單次上限 1 MiB')
    elif request > REQUEST_SAFE_BYTES:
        warnings.append(f'發佈請求約 {request / 1048576:.2f} MiB，接近 TP 單次上限 1 MiB')
    if len(assets) > ASSET_MAX_COUNT:
        errors.append(f'圖片／字型 {len(assets)} 個，超過 TP 上限 {ASSET_MAX_COUNT}')
    for p in files:
        rel = p.relative_to(out).as_posix()
        ext = p.suffix.lower()
        if ext not in TEXT_EXT and ext not in ASSET_TYPES:
            errors.append(f'{rel}：TP 不收 {ext or "沒有副檔名的"} 檔')
        if ext in ASSET_TYPES and p.stat().st_size > ASSET_MAX_BYTES:
            errors.append(f'{rel}：{p.stat().st_size / 1048576:.1f} MiB，超過單一 asset 上限 20 MiB')
        if ext not in TEXT_EXT:
            continue
        raw = p.read_text(encoding='utf-8', errors='replace')
        # 儲存 API 連註解都算，用原文檢查；其他規則看去掉註解後的程式碼
        code = strip_comments(raw, ext)
        for label, rx in CHECKS:
            source = raw if label.startswith('瀏覽器儲存') else code
            for m in rx.finditer(source):
                line = source.count('\n', 0, m.start()) + 1
                where = f'{rel}:{line}' if source is raw else rel
                errors.append(f'{where}：{label}（{m.group(0)[:60]!r}）')
        if HTML2CANVAS.search(code):
            warnings.append(f'{rel}：程式碼裡還有 html2canvas 字樣（TP 不能用這個截圖引擎）')
        # 參照到但包內沒有的檔案
        base = p.parent
        for m in REF.finditer(code):
            target = m.group(2)
            if '{' in target or '+' in target or target in REF_IGNORE:
                continue
            # 相對路徑可能是相對包的根目錄、這個檔案所在資料夾，或版位頁所在的 html/
            cand = [out / target, base / ((m.group(1) or '') + target), out / 'html' / ((m.group(1) or '') + target)]
            if not any(c.resolve().is_file() for c in cand):
                warnings.append(f'{rel} 參照了包內沒有的 {target}')
    stats = {'text_files': len(text_files), 'text_bytes': text_bytes, 'request_bytes': request,
             'assets': len(assets), 'asset_bytes': asset_bytes}
    return files, stats, errors, sorted(set(warnings))


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    ap = argparse.ArgumentParser(description='打包 SBA 版位的 TP 版')
    ap.add_argument('--out', default=str(DEFAULT_OUT), help='輸出資料夾（預設 output/tp-sba）')
    ap.add_argument('--bg-per-category', type=int, default=2, help='每個底圖分類放幾張（預設 2，0＝不放底圖）')
    ap.add_argument('--no-fonts', dest='fonts', action='store_false', help='不放 ShopeeNotoSans 字型（預設會放，以 asset 上傳，約 23 MB）')
    ap.add_argument('--no-slim', dest='slim', action='store_false', help='不精簡程式（保留註解與縮排）')
    ap.add_argument('--manual-url', default='', help='使用說明書的網址；不給就隱藏按鈕')
    args = ap.parse_args()

    out = Path(args.out).resolve()
    if out == ROOT or ROOT not in out.parents:
        raise SystemExit('輸出資料夾必須在 repo 裡面的子資料夾（例如 output/tp-sba）')
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for rel in CODE_FILES + ASSET_FILES:
        copy(rel, out)
    copy('js/bn-store-tp.js', out, 'js/bn-store.js')
    for name in SBA_LAYOUTS:
        for ext in ('.html', '.css', '.config.css'):
            copy(f'html/{name}{ext}', out)
    for tag in sorted((SRC / 'html/img/tag').glob('SBA_*.png')):
        copy(tag.relative_to(SRC).as_posix(), out)
    if args.fonts:
        for rel in FONT_FILES:
            copy(rel, out)
    else:
        strip_font_faces(out)
    build_index_js(out)
    bg_count = build_backgrounds(out, max(0, args.bg_per_category)) if args.bg_per_category > 0 else 0
    if args.bg_per_category <= 0:
        write_text(out, 'bgimg/index.json', '{}')
    patch_index_html(out, args.manual_url)

    slim_note = ''
    syntax_errors = []
    if args.slim:
        before, after = slim_bundle(out)
        slim_note = f'；程式精簡 {before / 1048576:.2f} → {after / 1048576:.2f} MiB'
        skipped, syntax_errors = syntax_check(out)
        for s in skipped:
            print('提醒：' + s)

    files, stats, errors, warnings = check_bundle(out)
    errors = syntax_errors + errors
    manifest = [{'path': p.relative_to(out).as_posix(), 'bytes': p.stat().st_size} for p in files]
    (out.parent / (out.name + '-manifest.json')).write_text(
        json.dumps({'files': manifest, **stats}, ensure_ascii=False, indent=1), encoding='utf-8')

    print(f'輸出：{out}')
    print(f'文字檔 {stats["text_files"]} 個、{stats["text_bytes"] / 1048576:.2f} MiB（發佈請求約 {stats["request_bytes"] / 1048576:.2f} MiB，上限 1 MiB）{slim_note}')
    print(f'圖片／字型 {stats["assets"]} 個、{stats["asset_bytes"] / 1048576:.2f} MiB（以 asset 上傳）；底圖 {bg_count} 張；字型 {"有" if args.fonts else "沒有"}')
    if not args.fonts:
        print('注意：沒有放字型，TP 上預覽與下載圖會用系統字型。')
    for w in warnings:
        print('提醒：' + w)
    for e in errors:
        print('錯誤：' + e)
    if errors:
        print(f'共 {len(errors)} 個錯誤，這包不能上 TP。')
        sys.exit(1)
    print('檢查通過。')


if __name__ == '__main__':
    main()
