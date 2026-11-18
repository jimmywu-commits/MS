/* ============================================================
   UI-005（2026-11-12）：BODA 嵌入模式的曝光資源右側欄重排與收合（Accordion）
   - 由 BODA/index.html 於 iframe load 後注入到 shopee 子頁（與 exposure-light.css 相同機制），在子頁的 document 內執行。
   - 只在 html[data-host="boda"] 生效；獨立開啟 shopee 時不會載入也不會執行。
   - 只「搬移」既有節點（appendChild／insertBefore），不重建 innerHTML、不複製節點：所有 id、事件監聽、資料綁定原樣保留。
   - 收合只以 hidden 屬性隱藏內容，不移除 DOM、不清空輸入值或圖片；展開／收合不呼叫任何外掛函式。
   - 原區段標題（.s-section）只加上 data-boda-acc-src 標記後由 CSS 隱藏，不刪除（外掛／導覽仍可查到節點）。
   - 預設全部收合；畫布選到商品、代言人、文字等物件時，只展開對應區段。
   - UI-005-B 修正：標題列不帶 role="button"（避免被 BODA 的全選／全消放大規則命中），role／tabindex／aria 放在標題文字。
   ============================================================ */
(function () {
  'use strict';
  if (!document.documentElement || document.documentElement.getAttribute('data-host') !== 'boda') return;
  if (window.__bodaExposureSidebarAcc) return;
  window.__bodaExposureSidebarAcc = true;

  var STORE_KEY = 'boda.exposure.sidebar.acc.v1';
  /* 進入曝光資源時右欄常態全收合。 */
  var DEFAULT_OPEN = {};
  var SECTIONS = [
    { key: 'layout',    title: '版位選擇' },
    { key: 'bg',        title: '背景圖' },
    { key: 'text',      title: '文字內容' },
    { key: 'color',     title: '顏色' },
    { key: 'logo',      title: 'LOGO（最多3張）' },
    { key: 'product',   title: '曝品圖（最多 3品 / 2人 / 1人+2品）' },            /* 2026-11-14：商品＋人物合成一區（人物區塊併進來，見 mergeExposureProductSection） */
    { key: 'character', title: '人物圖（最多2張）' },
    { key: 'endorser',  title: '代言人' }
  ];
  var POLL_MS = 250, POLL_MAX = 80; /* 最多等 20 秒，等外掛把區塊插入 #sidebar-scroll */

  var state = loadState();
  var shells = {};   /* key → { root, head, extra, body, filled } */
  var listEl = null;

  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); return (s && typeof s === 'object') ? s : {}; }
    catch (e) { return {}; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 私密模式等情況忽略 */ }
  }
  function isOpen(key) {
    return Object.prototype.hasOwnProperty.call(state, key) ? !!state[key] : !!DEFAULT_OPEN[key];
  }
  function applyOpen(key, open) {
    var sh = shells[key];
    if (!sh) return;
    sh.root.classList.toggle('is-open', open);
    sh.title.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) sh.body.removeAttribute('hidden'); else sh.body.setAttribute('hidden', '');
  }
  function toggle(key) {
    var open = !isOpen(key);
    if (open) openOnly(key, true);
    else collapseAll(true);
  }
  function setOnlyOpen(key, persist) {
    SECTIONS.forEach(function (section) {
      var open = !!key && section.key === key;
      state[section.key] = open;
      applyOpen(section.key, open);
    });
    if (persist) saveState();
  }
  function collapseAll(persist) { setOnlyOpen('', persist); }
  function openOnly(key, persist) {
    if ((key === 'character' || key === 'endorser') && productMerged) key = 'product';   /* 人物（代言人）已併進「曝品圖」 */
    if (!shells[key]) return;
    var wasOpen = isOpen(key);
    setOnlyOpen(key, persist);
    if (!wasOpen && shells[key].head && shells[key].head.scrollIntoView) {
      try { shells[key].head.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* 舊瀏覽器略過 */ }
    }
  }

  function buildShells(scroll, lvWrap) {
    listEl = document.createElement('div');
    listEl.className = 'boda-acc-list';
    SECTIONS.forEach(function (s) {
      var root = document.createElement('section');
      root.className = 'boda-acc is-empty';
      root.setAttribute('data-acc', s.key);

      /* 標題列本身不加 role="button"：BODA 主頁的 scaleExposureLayoutBulkActions() 會對子頁所有
         button／[role="button"] 以文字含「全選」「全消」判斷並套 transform:scale(1.2)，
         「版位選擇」標題列含全選／全消按鈕，整列會被放大而溢出 340px。可及性屬性改放在標題文字上。 */
      var head = document.createElement('div');
      head.className = 'boda-acc-head';

      var title = document.createElement('span');
      title.className = 'boda-acc-title';
      title.textContent = s.title;
      title.setAttribute('role', 'button');
      title.setAttribute('tabindex', '0');
      title.setAttribute('aria-controls', 'boda-acc-body-' + s.key);
      var extra = document.createElement('span');
      extra.className = 'boda-acc-extra';
      var arrow = document.createElement('span');
      arrow.className = 'boda-acc-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      head.appendChild(title); head.appendChild(extra); head.appendChild(arrow);

      var body = document.createElement('div');
      body.className = 'boda-acc-body';
      body.id = 'boda-acc-body-' + s.key;

      head.addEventListener('click', function (e) {
        /* 標題列右側的既有按鈕（全選／全消）自行處理，不觸發展開／收合 */
        if (e.target && e.target.closest && e.target.closest('.boda-acc-extra')) return;
        toggle(s.key);
      });
      title.addEventListener('keydown', function (e) {
        if (e.target !== title) return;
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(s.key); }
      });

      root.appendChild(head); root.appendChild(body);
      listEl.appendChild(root);
      shells[s.key] = { root: root, head: head, title: title, extra: extra, body: body, filled: false };
      applyOpen(s.key, isOpen(s.key));
    });
    /* 放在活動等級下拉之後；其餘原節點依序搬進各區塊 */
    if (lvWrap && lvWrap.parentNode === scroll) scroll.insertBefore(listEl, lvWrap.nextSibling);
    else scroll.insertBefore(listEl, scroll.firstChild);
  }

  function findHeader(scroll, prefix) {
    var els = scroll.querySelectorAll('.s-section');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-boda-acc-src')) continue;
      if (el.classList.contains('boda-acc-head')) continue;
      if (String(el.textContent || '').trim().indexOf(prefix) === 0) return el;
    }
    return null;
  }
  function markSrc(header) { if (header) header.setAttribute('data-boda-acc-src', '1'); }
  function fill(key, nodes, header) {
    var sh = shells[key];
    if (!sh || sh.filled) return false;
    var moved = 0;
    (nodes || []).forEach(function (n) { if (n && n.nodeType === 1) { sh.body.appendChild(n); moved++; } });
    if (!moved) return false;
    markSrc(header);
    sh.filled = true;
    sh.root.classList.remove('is-empty');
    return true;
  }

  /* 各區塊的來源節點（都是既有節點，只搬不建） */
  function tryLayout(scroll) {
    var header = findHeader(scroll, '排版選擇');
    var checks = document.getElementById('layout-checks');
    if (!header || !checks) return false;
    /* 全選／全消按鈕群搬到新標題列右側（節點與 onclick 原樣保留） */
    var kids = Array.prototype.slice.call(header.children);
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].querySelector && kids[i].querySelector('button')) { shells.layout.extra.appendChild(kids[i]); break; }
    }
    return fill('layout', [checks], header);
  }
  function tryText(scroll) {
    var header = document.getElementById('section-text');
    if (!header) return false;
    var nodes = [], n = header.nextSibling;
    while (n) {
      if (n.nodeType === 1) {
        if (n.classList.contains('s-section') || n.classList.contains('boda-acc-list')) break;
        if (n.tagName !== 'SCRIPT') nodes.push(n);
      }
      n = n.nextSibling;
    }
    return fill('text', nodes, header);
  }
  function tryColor(scroll) {
    var header = findHeader(scroll, '其他顏色');
    var rows = document.getElementById('color-rows');
    if (!header || !rows) return false;
    return fill('color', [rows], header);
  }
  function tryPluginSection(scroll, key, prefix, requiredId) {
    if (requiredId && !document.getElementById(requiredId)) return false;
    var header = findHeader(scroll, prefix);
    if (!header) return false;
    var sec = header.nextElementSibling;
    if (!sec || !sec.classList.contains('bn-section')) return false;
    return fill(key, [sec], header);
  }
  function tryCharacter() {
    /* 人物圖按鈕與提示原本放在商品圖 .bn-section 內；人物卡片本身與商品共用 #bn-prod-list（前後順序連動），維持不動 */
    if (!shells.product.filled) return false;
    var ids = ['bn-char-open-btn', 'bn-char-inp', 'bn-char2-open-btn', 'bn-char2-inp', 'bn-char-hint'];
    var nodes = [];
    ids.forEach(function (id) { var el = document.getElementById(id); if (el) nodes.push(el); });
    return fill('character', nodes, null);
  }

  /* UI-005-D：商品圖上傳按鈕文字（外掛不會再改寫此文字；事件與 id 不動） */
  function relabelProductButton() {
    var b = document.getElementById('bn-prod-open-btn');
    if (b && String(b.textContent || '').trim() === '＋ 上傳商品圖') b.textContent = '＋ 點擊上傳商品圖';
  }

  /* ── UI-005-E：人物圖區塊 ──
     外掛把人物卡片跟商品卡片一起渲染進 #bn-prod-list（renderProdList() 每次 innerHTML='' 重建）。
     這裡不改渲染邏輯，只在每次重建後把「人物列」搬到人物圖 Accordion 內的 #boda-char-list（節點原樣搬移，事件保留）；
     偵測重建用 MutationObserver（childList，只看 #bn-prod-list 本身）。
     單一上傳入口 #boda-char-upload-btn 只轉呼叫既有的隱藏按鈕（人物圖1 空 → 1，否則人物圖2 空 → 2；兩張皆有 → 停用，不覆蓋）。
     既有入口不支援拖曳，文字只寫「點擊上傳」。 */
  var charUi = null; /* { wrap, btn, list, observer } */

  function isCharRow(row) {
    if (!row || row.nodeType !== 1 || !row.classList.contains('bn-prod-item')) return false;
    var st = row.getAttribute('style') || '';
    if (/e2874a|226,\s*135,\s*74/i.test(st)) return true;          /* buildCharacterRowEl：row.style.border='1px solid #e2874a55' */
    var spans = row.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      if (/^人物圖[12]（跟/.test(String(spans[i].textContent || '').trim())) return true; /* posLabel */
    }
    return false;
  }
  function charSlotFree(id, key) {
    var b = document.getElementById(id);
    if (!b) return null;
    var hasChar = b.classList.contains('has-char') || !!window[key];
    return hasChar ? null : b;
  }
  function freeCharSlot() {
    return charSlotFree('bn-char-open-btn', '_bnCharacter') || charSlotFree('bn-char2-open-btn', '_bnCharacter2') || null;
  }
  function refreshCharButton() {
    if (!charUi) return;
    var t = freeCharSlot();
    charUi.btn.disabled = !t;
    charUi.btn.title = t ? ('點擊上傳' + (t.id === 'bn-char-open-btn' ? '人物圖1' : '人物圖2')) : '已達 2 張上限，請先移除其中一張再上傳';
  }
  function relocateCharRows() {
    if (!charUi) return;
    var list = document.getElementById('bn-prod-list');
    if (!list) return;
    /* 外掛每次重建都會清空 #bn-prod-list，先前搬過來的列已是過期節點，移除後再搬新的 */
    while (charUi.list.firstChild) charUi.list.removeChild(charUi.list.firstChild);
    var rows = Array.prototype.slice.call(list.children);
    rows.forEach(function (row) { if (isCharRow(row)) charUi.list.appendChild(row); });
    charUi.wrap.classList.toggle('has-rows', charUi.list.children.length > 0);
    refreshCharButton();
  }
  function setupCharacterSection() {
    if (charUi) return true;
    var sh = shells.character;
    if (!sh || !sh.filled || !shells.product.filled) return false;
    var list = document.getElementById('bn-prod-list');
    if (!list || !window.MutationObserver) return false;

    var wrap = document.createElement('div');
    wrap.className = 'boda-char-wrap';
    wrap.id = 'boda-char-wrap';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'boda-char-upload-btn';
    btn.textContent = '＋ 點擊上傳人物圖';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var t = freeCharSlot();
      if (t) t.click(); /* 既有按鈕的 click → 對應 file input.click()；流程與資料對應不變 */
    });
    var dest = document.createElement('div');
    dest.className = 'bn-prod-list';
    dest.id = 'boda-char-list';
    wrap.appendChild(btn); wrap.appendChild(dest);
    sh.body.insertBefore(wrap, sh.body.firstChild);

    charUi = { wrap: wrap, btn: btn, list: dest, observer: null };
    charUi.observer = new MutationObserver(function (records) {
      /* 自己把人物列搬出 #bn-prod-list 也會產生 childList 紀錄（只有 removedNodes，且節點已在 #boda-char-list）：略過，
         否則會把剛搬好的列當成過期節點清掉。其餘（外掛重建：有 addedNodes，或移除的是商品列）才重新分流。 */
      var mine = records.every(function (r) {
        if (r.addedNodes.length) return false;
        for (var i = 0; i < r.removedNodes.length; i++) { if (r.removedNodes[i].parentNode !== charUi.list) return false; }
        return true;
      });
      if (!mine) relocateCharRows();
    });
    charUi.observer.observe(list, { childList: true });
    relocateCharRows();
    return true;
  }

  /* ── UI-005-F：畫布空白「商品／人物範圍」提示底色（BODA 模式不顯示）──
     版型 config.css 以 .商品範圍／.商品圖範圍 的背景色當編輯提示（多為 rgba(235,104,119,.4)，首頁LOGO牆 #939fdb），
     layout-runtime 在範圍內無商品／人物框時還原該底色（含移除最後一張）。這裡只在每張版位 iframe 文件注入一條
     background: transparent !important（與 runtime 上傳後、下載截圖時設定的值相同），不動容器、尺寸、定位、事件與輸出。
     版位 iframe 會延遲載入／切換版位時重建，故對已存在與新加入的 iframe 都在 load 後注入（每份 document 一次）。 */
  var ZONE_STYLE_ID = 'boda-empty-zone-hint';
  var ZONE_STYLE_CSS = '.\u5546\u54c1\u7bc4\u570d,.\u5546\u54c1\u5716\u7bc4\u570d{background:transparent !important;}';
  function injectEmptyZoneStyle(frame) {
    try {
      var doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
      if (!doc || !doc.head || doc.location.href === 'about:blank') return;
      if (doc.getElementById(ZONE_STYLE_ID)) return;
      var st = doc.createElement('style');
      st.id = ZONE_STYLE_ID;
      st.textContent = ZONE_STYLE_CSS;
      doc.head.appendChild(st);
    } catch (e) { /* 尚未可讀時略過，load 後再試 */ }
  }
  function watchLayoutFrame(frame) {
    if (!frame || frame.__bodaZoneHintHooked) {
      injectEmptyZoneStyle(frame);
      bindCanvasAccordion(frame);
      return;
    }
    frame.__bodaZoneHintHooked = true;
    frame.addEventListener('load', function () {
      injectEmptyZoneStyle(frame);
      bindCanvasAccordion(frame);
    });
    injectEmptyZoneStyle(frame);
    bindCanvasAccordion(frame);
  }

  /* 畫布物件 → 右欄工具。使用 capture，即使畫布的拖曳程式會 stopPropagation 也能正確連動。 */
  function canvasToolFor(target) {
    if (!target || target.nodeType !== 1 || !target.closest) return '';
    if (target.closest('.bn-prod-box')) return 'product';
    if (target.closest('.bn-endorser-box,.bn-endorser-note')) return 'endorser';
    if (target.closest('.bn-char-box')) return 'character';
    /* 部分 Logo img 設了 pointer-events:none，點擊目標會落在 Logo 範圍容器。 */
    if (target.closest('.bn-logo-box,.bn-ar-logo-box,img.bn-logo-img,[class*="logo範圍"],[class*="LOGO範圍"]')) return 'logo';
    /* makeEditable() 會先標記 data-bn-edit-bound，點一下文字才展開工具。 */
    if (target.closest('[data-bn-edit-bound="1"],[contenteditable="true"]')) return 'text';
    if (target.closest('#\u5e95\u5716,.\u80cc\u666f\u5716,.\u5e95\u5716')) return 'bg';
    return '';
  }
  function bindCanvasAccordion(frame) {
    try {
      var doc = frame && (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document));
      if (!doc || !doc.documentElement || doc.location.href === 'about:blank' || doc.__bodaAccBound) return;
      doc.__bodaAccBound = true;
      doc.addEventListener('pointerdown', function (e) {
        var key = canvasToolFor(e.target);
        if (key) openOnly(key, false);
        else collapseAll(false);
      }, true);
    } catch (e) { /* 尚未載入或不同來源時，load 後再試 */ }
  }
  function setupEmptyZoneHint() {
    var area = document.getElementById('preview-area');
    if (!area || area.__bodaZoneHintObserver) return !!area;
    var scan = function () { area.querySelectorAll('iframe').forEach(watchLayoutFrame); };
    scan();
    if (window.MutationObserver) {
      var t = 0;
      area.__bodaZoneHintObserver = new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 0); });
      area.__bodaZoneHintObserver.observe(area, { childList: true, subtree: true });
    }
    return true;
  }

  /* ── UI-005-H：代言人小字黑白字色圓圈 ──
     既有狀態：_bnEndorserNote.color（'' = 自動黑白，否則為手動色碼）；UI 為 #bn-endorser-note-auto（.on = 自動）與
     #bn-endorser-note-color（input[type=color]）。這裡只新增兩個圓圈，點擊時轉呼叫既有控制項：
       白／黑 → 設定 #bn-endorser-note-color 的值並 dispatch input（外掛 listener 更新狀態、廣播畫布；BODA bridge 回報活動頁）
       再點已選中的圓圈 → 觸發 #bn-endorser-note-auto click（回到自動黑白）。
     選中狀態由既有 .on 與 color 值推得，呈現方式與「掛標顏色」圓圈相同（.color-dot ＋ .active）；自動模式兩圈皆未選取。 */
  var NOTE_WHITE = '#ffffff', NOTE_BLACK = '#111827';
  var noteUi = null;
  function noteColorNow() {
    var auto = document.getElementById('bn-endorser-note-auto');
    var color = document.getElementById('bn-endorser-note-color');
    if (!auto || !color) return null;
    if (auto.classList.contains('on')) return '';
    return String(color.value || '').toLowerCase();
  }
  function isDarkHex(hex) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return false;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  }
  function refreshNoteDots() {
    if (!noteUi) return;
    var cur = noteColorNow();
    if (cur === null) return;
    var isAuto = cur === '';
    /* 與「掛標顏色」相同：只切 .active，自動模式兩圈皆未選取，不另加標記 */
    noteUi.white.classList.toggle('active', !isAuto && !isDarkHex(cur));
    noteUi.black.classList.toggle('active', !isAuto && isDarkHex(cur));
    noteUi.box.title = isAuto ? '目前：自動黑白（依小字底下的顏色）' : ('目前：手動 ' + cur);
  }
  function setNoteColor(hex) {
    var color = document.getElementById('bn-endorser-note-color');
    var auto = document.getElementById('bn-endorser-note-auto');
    if (!color || !auto) return;
    var cur = noteColorNow();
    var wantAuto = cur !== '' && cur !== null && (isDarkHex(cur) === isDarkHex(hex));
    if (wantAuto) { auto.click(); }                       /* 再點已選中的 → 回自動 */
    else {
      color.value = hex;
      color.dispatchEvent(new Event('input', { bubbles: true }));
    }
    refreshNoteDots();
  }
  function setupEndorserNoteDots() {
    if (noteUi) return true;
    var sh = shells.endorser;
    if (!sh || !sh.filled) return false;
    var wrap = document.querySelector('#bn-endorser-section .bn-endorser-note-wrap');
    var label = wrap && wrap.querySelector('label');
    var auto = document.getElementById('bn-endorser-note-auto');
    var color = document.getElementById('bn-endorser-note-color');
    if (!label || !auto || !color) return false;

    var box = document.createElement('span');
    box.className = 'boda-note-dots';
    function mkDot(key, hex, title) {
      var d = document.createElement('span');
      d.className = 'color-dot boda-note-dot';
      d.setAttribute('role', 'button');
      d.setAttribute('tabindex', '0');
      d.dataset.noteColor = key;
      d.title = title;
      d.style.background = hex;
      /* 同 renderTagColorRow：白色圓圈以 inline inset 內框區隔白底 */
      if (key === 'white') d.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,.35)';
      d.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); setNoteColor(hex); });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setNoteColor(hex); }
      });
      return d;
    }
    var white = mkDot('white', NOTE_WHITE, '白字（再點一次回自動黑白）');
    var black = mkDot('black', NOTE_BLACK, '黑字（再點一次回自動黑白）');
    box.appendChild(white); box.appendChild(black);
    label.appendChild(box);
    noteUi = { box: box, white: white, black: black };

    /* 狀態同步：外掛 renderEndorserNoteUI() 會切 .on／改 color.value（含暫存還原） */
    if (window.MutationObserver) {
      new MutationObserver(refreshNoteDots).observe(auto, { attributes: true, attributeFilter: ['class'] });
    }
    document.addEventListener('input', function (e) { if (e.target === color) refreshNoteDots(); });
    document.addEventListener('bn-state-dirty', refreshNoteDots);
    refreshNoteDots();
    return true;
  }

  /* ── 2026-11-14：「曝品圖」＝商品＋人物一個區塊 ──
     曝品圖是總稱：商品、人物（代言人照、簽名檔）屬性不同，要分開上傳才能辨識，
     所以兩個上傳管道都放在「曝品圖」裡、各自一小塊，不再是兩個可以分別收合的區。
     （目前曝光資源沒有舊的「人物圖」上傳入口，人物就是「代言人」那一區。）只搬既有節點，不重建。 */
  var productMerged = false;
  function mergeExposureProductSection() {
    if (productMerged) return true;
    var prod = shells.product, person = shells.endorser;
    if (!prod || !person || !prod.filled || !person.filled) return false;
    function sub(title, hint, nodes) {
      var box = document.createElement('div');
      box.className = 'boda-sub';
      var h = document.createElement('div');
      h.className = 'boda-sub-title';
      h.textContent = title;
      box.appendChild(h);
      if (hint) {
        var p = document.createElement('div');
        p.className = 'boda-sub-hint';
        p.textContent = hint;
        box.appendChild(p);
      }
      nodes.forEach(function (n) { box.appendChild(n); });
      return box;
    }
    var prodNodes = Array.prototype.slice.call(prod.body.childNodes);
    var personNodes = Array.prototype.slice.call(person.body.childNodes);
    /* 舊版曝光資源若還有「人物圖」上傳入口，一起收進人物這一塊，不另外成一區 */
    var chr = shells.character;
    if (chr && chr.filled) personNodes = Array.prototype.slice.call(chr.body.childNodes).concat(personNodes);
    if (chr) { chr.root.hidden = true; chr.root.classList.add('boda-acc-merged'); }
    var intro = document.createElement('div');
    intro.className = 'boda-sub-intro';
    intro.textContent = '商品和人物要分開上傳。';
    prod.body.appendChild(intro);
    prod.body.appendChild(sub('商品', '商品去背圖，會自動加影子。', prodNodes));
    prod.body.appendChild(sub('人物（代言人照、簽名檔）', '', personNodes));
    person.root.hidden = true;
    person.root.classList.add('boda-acc-merged');
    productMerged = true;
    return true;
  }
  /* 進到曝光資源時預設打開「曝品圖」。主頁每次切到曝光資源也會呼叫這個。 */
  var defaultOpened = false;
  window.__bodaExposureOpenDefault = function () {
    if (!shells.product || !shells.product.filled) return false;
    openOnly('product', false);
    defaultOpened = true;
    return true;
  };

  function renameLevelTitle() {
    var lv = document.getElementById('lv-section');
    if (lv && String(lv.textContent || '').trim() === '等級') lv.textContent = '活動等級';
  }

  function tick(scroll) {
    tryLayout(scroll);
    tryText(scroll);
    tryColor(scroll);
    tryPluginSection(scroll, 'bg', '背景圖', 'bn-bg-open-btn');
    tryPluginSection(scroll, 'logo', 'Logo 上傳', 'bn-logo-drop');
    tryPluginSection(scroll, 'product', '商品圖', 'bn-prod-open-btn');
    relabelProductButton();
    tryCharacter();
    setupCharacterSection();
    tryPluginSection(scroll, 'endorser', '代言人', 'bn-endorser-section');
    setupEndorserNoteDots();
    mergeExposureProductSection();
    if (!defaultOpened && productMerged) window.__bodaExposureOpenDefault();
    return SECTIONS.every(function (s) { return shells[s.key].filled; }) && !!charUi && !!noteUi && productMerged;
  }

  function start() {
    var scroll = document.getElementById('sidebar-scroll');
    if (!scroll) { if (start.n++ < POLL_MAX) setTimeout(start, POLL_MS); return; }
    renameLevelTitle();
    setupEmptyZoneHint();
    /* 不沿用舊版「版位選擇預設展開」的儲存狀態。 */
    state = {};
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* 私密模式等情況略過 */ }
    buildShells(scroll, document.getElementById('lv-wrap'));
    collapseAll(false);
    var n = 0;
    (function poll() {
      if (tick(scroll)) return;
      if (n++ < POLL_MAX) setTimeout(poll, POLL_MS);
    })();
  }
  start.n = 0;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  /* ══ 背景圖調整面板（2026-11-14） ══════════════════════════════
     背景圖的縮放／移動在「滑鼠移到版位上」時，版位右側出現的「背景圖調整」小面板（← → ↑ ↓）。
     面板固定出現在版位右側；版位很寬時可能跑出畫面外看不到，這裡把它拉回畫面內（改放版位內側），
     並在背景圖區塊加一句說明，讓人知道要把滑鼠移到版位上。 */
  function placeBgPanel(panel) {
    if (!panel || panel.style.display === 'none') return;
    var block = panel.closest('.preview-block');
    if (!block) return;
    var br = block.getBoundingClientRect();
    var pw = panel.offsetWidth || 150;
    var limit = window.innerWidth - 8;   /* 疊在右側工具列上沒關係（面板在最上層），只處理跑出畫面外 */
    var left = parseFloat(panel.style.left) || 0;
    if (left + pw <= limit) return;                       /* 右邊放得下就不動 */
    var inside = Math.min(br.right - pw - 8, limit - pw); /* 改放版位內側右上 */
    var top = Math.max(br.top + 44, Math.min(parseFloat(panel.style.top) || 0, br.bottom - (panel.offsetHeight || 180) - 8));
    var nl = Math.round(Math.max(br.left + 8, inside)) + 'px';
    var nt = Math.round(top) + 'px';
    if (panel.style.left !== nl) panel.style.left = nl;
    if (panel.style.top !== nt) panel.style.top = nt;
  }
  function watchBgPanels() {
    var seen = typeof WeakSet === 'function' ? new WeakSet() : null;
    var mo = new MutationObserver(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.bn-bg-panel'), function (panel) {
        if (seen && seen.has(panel)) return;
        if (seen) seen.add(panel);
        new MutationObserver(function () { placeBgPanel(panel); })
          .observe(panel, { attributes: true, attributeFilter: ['style'] });
        placeBgPanel(panel);
      });
    });
    mo.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }
  function addBgHint() {
    var sh = shells.bg;
    if (!sh || !sh.filled || !sh.body) { if (addBgHint.n++ < 120) setTimeout(addBgHint, 250); return; }
    if (sh.body.querySelector('.boda-bg-move-hint')) return;
    var hint = document.createElement('div');
    hint.className = 'boda-sub-hint boda-bg-move-hint';
    hint.style.padding = '6px 12px 4px';
    hint.textContent = '套用背景圖後，滑鼠移到中間的版位上，會出現「背景圖調整」，可縮放、用 ← → ↑ ↓ 移動位置（按住 Shift 一次移 5%）。';
    sh.body.appendChild(hint);
  }
  addBgHint.n = 0;
  if (document.body) watchBgPanels(); else document.addEventListener('DOMContentLoaded', watchBgPanels);
  /* 2026-11-14：背景圖區塊的說明文字依需求拿掉（addBgHint 保留不呼叫） */

  /* ══ 版位連動提醒（2026-11-14） ══════════════════════════════
     曝光資源預設所有版位的商品／人物／代言人小字位置連動。使用者在 A 版位調過，
     再去 B 版位拖曳時，往往不知道 A 也會跟著動。第一次換到另一張版位操作時先擋下來問：
     「改為單張編輯」＝取消所有版位連動（之後每張各自調整，可再按版位右上「版位連動」接回）；
     「維持連動」＝照舊。被擋下的那一下不會生效，選完請再操作一次。
     2026-11-15：改成每次換到另一張都問；按鈕改成「固定上一張」（先調好的固定，這張繼續帶動其他版位）。 */
  /* last＝真的被拖動／縮放／旋轉過的版位（收到該版位的位置更新才算，單純點選不算）；
     pending＝剛按下的版位，等它送出位置更新才記成 last。 */
  /* 2026-11-15：每次換到「另一張」版位操作時都要問（不再只問一次）。
     edited＝真的調過的版位（收到位置更新才算），依時間排序；
     換到 X 操作時，只要有「調過、還在連動、不是同系列」的其他版位，就先擋下來問。
     allowed＝已經問過、這次可以直接操作的版位；之後在別張調過東西，再回到這張會再問。 */
  var linkAsk = { edited: [], pending: '', allowed: '', open: false };
  var LINK_EDIT_TYPES = ['bn-product-layout-update', 'bn-product-rotate', 'bn-character-layout-update',
    'bn-endorser-rotate', 'bn-endorser-note-layout-update'];
  window.addEventListener('message', function (e) {
    var d = e && e.data;
    if (!d || LINK_EDIT_TYPES.indexOf(d.type) === -1 || d.snapshotOnly) return;
    if (window._bnExporting || window._bnSuppressProductLayoutWrite) return;
    var id = d.bnid != null ? String(d.bnid) : '';
    if (!id || id !== linkAsk.pending) return;
    var label = layoutLabel(id);   /* 記下名稱：上傳 LOGO 後這張可能換成同系列另一張而從畫面消失 */
    linkAsk.edited = linkAsk.edited.filter(function (x) { return x.id !== id; });
    linkAsk.edited.push({ id: id, label: label, family: layoutFamily(label) });
    if (linkAsk.allowed && linkAsk.allowed !== id) linkAsk.allowed = '';
  });
  var LINK_TARGETS = '.bn-prod-box,.bn-char-box,.bn-endorser-note';
  function frameBnid(ifr) {
    try { return new URLSearchParams((ifr.getAttribute('src') || '').split('?')[1] || '').get('bnid') || ''; } catch (e) { return ''; }
  }
  function layoutIsLinked(id) {
    /* 首頁LOGO牆、SearchICON_PRODUCT 本來就不參與商品連動 */
    if (/首頁logo牆|searchicon_product/i.test(layoutLabel(id))) return false;
    try { return typeof window._bnIsProductLayoutLocked === 'function' ? !!window._bnIsProductLayoutLocked(id) : false; } catch (e) { return false; }
  }
  function linkedLayoutIds() {
    try {
      return (window.loadLayouts() || []).filter(function (l) { return l && l.enabled !== false; })
        .map(function (l) { return String(l.id); })
        .filter(function (id) { return !!document.getElementById('iframe-' + id) && layoutIsLinked(id); });
    } catch (e) { return []; }
  }
  /* 同系列（例如 ddcard方logo／ddcard橫logo／ddcard無logo）算同一種版位，換來換去不算「編輯第二張」 */
  function layoutFamily(label) {
    return String(label || '').replace(/[_\s-]*(橫式|方式|橫|方|無)?logo(排版)?$/i, '').toLowerCase();
  }
  function layoutLabel(id) {
    var ifr = document.getElementById('iframe-' + id);
    var block = ifr && ifr.closest('.preview-block');
    var n = block && block.querySelector('.pname');
    return n ? n.textContent.trim() : '前一張版位';
  }
  /* 回傳 'keep'（確定全部覆蓋）| 'prev'（僅套用至未完成版位）| 'all'（解除所有連動）| 'cancel'（Esc）
     2026-11-15：改成「固定上一張」——先調好的那張解除連動、固定下來，正在調的這張繼續帶動其他版位。 */
  function linkDialog(prevName, curName) {
    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.id = 'boda-link-ask';
      wrap.setAttribute('role', 'dialog');
      wrap.setAttribute('aria-modal', 'true');
      wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,22,.45);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      var btn = 'border-radius:8px;padding:8px 14px;font:inherit;font-size:13px;cursor:pointer;';
      wrap.innerHTML =
        '<div style="width:440px;max-width:100%;background:#fff;color:#1f2a28;border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.25);padding:22px 22px 18px">' +
        '<h3 style="margin:0 0 8px;font-size:16px">是否覆蓋已排好的版位？</h3>' +
        '<p class="b" style="margin:0;font-size:13px;line-height:1.7;color:#4b5a57;white-space:pre-line"></p>' +
        '<div style="display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:18px">' +
        /* 2026-11-15 文案（Iona）：主要建議＝僅套用至未完成版位（橘底）、次要＝解除所有連動（橘框）、不建議＝確定全部覆蓋（灰底白字，不起眼） */
        '<button type="button" data-v="keep" style="' + btn + 'border:1px solid #b8c2c0;background:#b8c2c0;color:#fff">確定全部覆蓋</button>' +
        '<button type="button" data-v="all" style="' + btn + 'border:1px solid #ee4d2d;background:#fff;color:#ee4d2d;font-weight:700">解除所有連動</button>' +
        '<button type="button" data-v="prev" style="' + btn + 'border:1px solid #ee4d2d;background:#ee4d2d;color:#fff;font-weight:700">僅套用至未完成版位</button>' +
        '</div></div>';
      wrap.querySelector('.b').textContent =
        '系統預設會同步更新所有版位。為避免辛苦排好的內容被覆蓋，請選擇連動修改範圍：';
      function close(v) { document.removeEventListener('keydown', onKey, true); wrap.remove(); resolve(v); }
      /* Esc：什麼都不選、直接關掉（不當成「確定全部覆蓋」），下次操作會再問 */
      function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close('cancel'); } }
      wrap.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) close(b.getAttribute('data-v')); });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(wrap);
      try { wrap.querySelector('[data-v="prev"]').focus(); } catch (e) {}
    });
  }
  function unlinkOneLayout(id) {
    try {
      if (typeof window._bnSetProductLayoutLock === 'function') window._bnSetProductLayoutLock(id, false);
      else { window._bnProductLayoutLocks = window._bnProductLayoutLocks || {}; window._bnProductLayoutLocks[id] = false; }
    } catch (e) {}
    try { if (typeof window._bnRefreshProductLayoutLockUI === 'function') window._bnRefreshProductLayoutLockUI(); } catch (e) {}
  }
  function unlinkAllLayouts() {
    var ids = linkedLayoutIds();
    ids.forEach(function (id) {
      try {
        if (typeof window._bnSetProductLayoutLock === 'function') window._bnSetProductLayoutLock(id, false);
        else { window._bnProductLayoutLocks = window._bnProductLayoutLocks || {}; window._bnProductLayoutLocks[id] = false; }
      } catch (e) {}
    });
    try { if (typeof window._bnRefreshProductLayoutLockUI === 'function') window._bnRefreshProductLayoutLockUI(); } catch (e) {}
  }
  function onLayoutPointerDown(ifr, e) {
    var t = e.target;
    if (!t || !t.closest || !t.closest(LINK_TARGETS)) return;
    var id = frameBnid(ifr);
    if (!id) return;
    if (linkAsk.open) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    linkAsk.pending = id;
    if (linkAsk.allowed === id || !layoutIsLinked(id)) return;
    var curLabel = layoutLabel(id), curFamily = layoutFamily(curLabel);
    /* 會被一起改到的：調過、還在畫面上且仍在連動、不是這張也不是同系列（ddcard 方／橫／無 LOGO 算同一張） */
    var prevs = linkAsk.edited.filter(function (x) {
      if (x.id === id || x.family === curFamily) return false;
      if (!document.getElementById('iframe-' + x.id)) return false;
      return layoutIsLinked(x.id);
    });
    if (!prevs.length || linkedLayoutIds().length < 2) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    linkAsk.open = true;
    var names = prevs.map(function (x) { return x.label; }).join('」、「');
    linkDialog(names, curLabel).then(function (v) {
      linkAsk.open = false;
      if (v === 'cancel') return;                      /* Esc 關掉：不做任何改變，下次操作再問 */
      linkAsk.allowed = id;                            /* 選完再操作這張不會再問；去別張調過再回來會再問 */
      if (v === 'all') unlinkAllLayouts();
      else if (v === 'prev') prevs.forEach(function (x) { unlinkOneLayout(x.id); });   /* 固定先前調過的；這張繼續連動 */
    });
  }
  function hookLayoutFrames() {
    Array.prototype.forEach.call(document.querySelectorAll('.preview-block iframe'), function (ifr) {
      var doc;
      try { doc = ifr.contentDocument; } catch (e) { return; }
      if (!doc || !doc.documentElement || ifr.__bodaLinkDoc === doc) return;
      ifr.__bodaLinkDoc = doc;
      doc.addEventListener('pointerdown', function (e) { onLayoutPointerDown(ifr, e); }, true);
    });
  }
  setInterval(hookLayoutFrames, 1000);
})();
