/* bn-dialog.js：頁面內的提示／確認視窗，取代瀏覽器原生的 alert、confirm。
 *
 * TP 的沙盒不允許原生對話框：confirm 會直接回傳 false（等於永遠按取消）、alert 不會出現。
 * 所以一律改用這支，兩種版本（GitLab／TP）共用。
 *
 *   BnDialog.alert(message, {okText})                        → Promise，按下按鈕後完成
 *   BnDialog.confirm(message, {okText, cancelText, danger})  → Promise<boolean>，確定為 true
 *
 * 多個視窗同時被叫出時會排隊，一次只顯示一個。
 * Enter＝確定，Esc＝取消（alert 時 Esc 也是關閉），點背景不會關閉。
 */
(function (root) {
  'use strict';
  if (root.BnDialog) return;

  var queue = Promise.resolve();

  function ensureStyle() {
    if (document.getElementById('bn-dialog-style')) return;
    var style = document.createElement('style');
    style.id = 'bn-dialog-style';
    style.textContent = [
      '.bn-dialog-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.6);}',
      '.bn-dialog-box{width:min(380px,100%);background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.5);padding:20px 20px 16px;font:14px/1.6 "PingFang TC","Microsoft JhengHei","Segoe UI",Arial,sans-serif;}',
      '.bn-dialog-msg{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 16px;}',
      '.bn-dialog-actions{display:flex;justify-content:flex-end;gap:8px;}',
      '.bn-dialog-actions button{min-width:76px;padding:7px 14px;border-radius:8px;border:1px solid #30363d;background:#21262d;color:#e6edf3;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}',
      '.bn-dialog-actions button:hover{border-color:#8b949e;}',
      '.bn-dialog-actions button:focus-visible{outline:2px solid #58a6ff;outline-offset:2px;}',
      '.bn-dialog-actions .bn-dialog-ok{background:#1f6feb;border-color:#1f6feb;color:#fff;}',
      '.bn-dialog-actions .bn-dialog-ok.danger{background:#da3633;border-color:#da3633;}'
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function open(opts) {
    return new Promise(function (resolve) {
      ensureStyle();
      var lastFocus = document.activeElement;
      var overlay = document.createElement('div');
      overlay.className = 'bn-dialog-overlay';
      var box = document.createElement('div');
      box.className = 'bn-dialog-box';
      box.setAttribute('role', opts.cancel ? 'alertdialog' : 'dialog');
      box.setAttribute('aria-modal', 'true');
      var msg = document.createElement('p');
      msg.className = 'bn-dialog-msg';
      msg.id = 'bn-dialog-msg-' + Date.now();
      msg.textContent = String(opts.message == null ? '' : opts.message);
      box.setAttribute('aria-describedby', msg.id);
      var actions = document.createElement('div');
      actions.className = 'bn-dialog-actions';
      var cancelBtn = null;
      if (opts.cancel) {
        cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'bn-dialog-cancel';
        cancelBtn.textContent = opts.cancel;
        actions.appendChild(cancelBtn);
      }
      var okBtn = document.createElement('button');
      okBtn.type = 'button';
      okBtn.className = 'bn-dialog-ok' + (opts.danger ? ' danger' : '');
      okBtn.textContent = opts.ok;
      actions.appendChild(okBtn);
      box.appendChild(msg);
      box.appendChild(actions);
      overlay.appendChild(box);

      function close(result) {
        document.removeEventListener('keydown', onKey, true);
        overlay.remove();
        try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (_) {}
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
        else if (e.key === 'Enter' && document.activeElement !== cancelBtn) { e.preventDefault(); e.stopPropagation(); close(true); }
        else if (e.key === 'Tab') {
          /* 焦點只在視窗內的按鈕間切換 */
          var list = cancelBtn ? [cancelBtn, okBtn] : [okBtn];
          var i = list.indexOf(document.activeElement);
          e.preventDefault();
          list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].focus();
        }
      }
      okBtn.addEventListener('click', function () { close(true); });
      if (cancelBtn) cancelBtn.addEventListener('click', function () { close(false); });
      document.addEventListener('keydown', onKey, true);
      (document.body || document.documentElement).appendChild(overlay);
      (opts.danger && cancelBtn ? cancelBtn : okBtn).focus();
    });
  }

  function enqueue(opts) {
    var job = queue.then(function () { return open(opts); });
    queue = job.catch(function () {});
    return job;
  }

  root.BnDialog = {
    alert: function (message, options) {
      options = options || {};
      return enqueue({ message: message, ok: options.okText || '知道了', cancel: null }).then(function () {});
    },
    confirm: function (message, options) {
      options = options || {};
      return enqueue({
        message: message,
        ok: options.okText || '確定',
        cancel: options.cancelText || '取消',
        danger: !!options.danger
      });
    }
  };
})(window);
