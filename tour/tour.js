'use strict';
/*
  tour/tour.js：BOD 新手導覽（首頁上傳 4 步 → 曝光資源 9 步，最後按完成到活動頁）
  ------------------------------------------------------------
  引擎是 tour/tour-guide.js，這支只放步驟和文案，不改工具原本的程式。
  首頁還沒有內容時，會真的匯入示範工單與圖片（tour/demo-data.js，虛構品牌「穀樂日」），
  按「開始編輯」進入編輯；已有編輯內容時只播動畫，不會動到資料。

  文案和步驟都在下面的 STEPS。
  想讓大家再看一次：把 TOUR_KEY 的 v1 改成 v2。
  測試：網址加 ?tour 會強制再跑一次（例如 index.html?tour#upload）。

  規則（沿用天天補貨日的導覽）：
  - 有動畫的步驟，動畫演完才出現「上一步／下一步」。
*/
(function(){

  var TOUR_KEY = 'boda_onboarding_tour_v1';
  var H = TourGuide.helpers;

  /* ══════════════════ 小工具 ══════════════════ */
  /* 工具還在載入（app-loading 轉圈）時不開始導覽 */
  function appBusy(){
    if(window.APP_LOADING && window.APP_LOADING.active === true) return true;
    var el = document.getElementById('app-loading');
    if(!el || !el.classList.contains('show') || el.getAttribute('aria-hidden') === 'true') return false;
    var st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden';
  }
  function currentView(){
    var v = document.querySelector('.view.active');
    return v ? v.id.replace(/^view-/, '') : '';
  }
  /* 導覽要在首頁（上傳頁）進行；結束後回到原本那一頁 */
  var startView = '';
  function goUpload(){
    if(currentView() !== 'upload' && typeof showView === 'function') showView('upload', { skipLoading: true });
    return H.waitFor(function(){ return H.visible(H.$('#upload-level')); }, 3000);
  }
  /* 示範拖檔：拖到時框線變色 */
  function dropOnto(a, zone, chip, keep){
    var el = H.$(zone);
    return a.wait(150)
      .then(function(){ return a.drag({ x: innerWidth - 140, y: 150 }, el, { chip: chip, ms: 650, after: 0 }); })
      .then(function(){ if(el) el.classList.add('dragover'); return keep ? null : a.wait(500); })
      .then(function(){ if(el && !keep) el.classList.remove('dragover'); });
  }
  function clearDrop(){
    ['#import-drop', '#import-img-drop'].forEach(function(s){ var el = H.$(s); if(el) el.classList.remove('dragover'); });
  }

  /* ══════════════════ 示範資料（虛構品牌「穀樂日」） ══════════════════
     tour/demo-data.js 約 1.5MB，只在導覽開始時才載入。
     首頁還沒有任何工單／圖片時，導覽會真的匯入示範工單與圖片，讓你看到實際結果；
     已經有編輯中的內容就只播動畫，不會蓋掉你的資料。 */
  var demoMode = false;   // true：這次導覽會真的匯入示範資料
  function scriptBase(){
    var s = document.querySelector('script[src*="tour/tour.js"]');
    return s ? s.src.replace(/tour\.js(\?.*)?$/, '') : 'tour/';
  }
  function loadDemoData(){
    if(window.BODA_TOUR_DEMO) return Promise.resolve(window.BODA_TOUR_DEMO);
    return new Promise(function(res){
      var sc = document.createElement('script');
      sc.src = scriptBase() + 'demo-data.js?v=20261116c';
      sc.onload = function(){ res(window.BODA_TOUR_DEMO || null); };
      sc.onerror = function(){ res(null); };
      document.head.appendChild(sc);
    });
  }
  function b64File(item, type){
    var bin = atob(item.b64), u8 = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], item.name, { type: type });
  }
  function hasExistingWork(){
    try{
      if(window.uploadImportSummary && uploadImportSummary.activity) return true;
      if(typeof uploadedImages !== 'undefined' && uploadedImages && uploadedImages.length) return true;
      if(typeof currentImportColumns !== 'undefined' && currentImportColumns && currentImportColumns.length) return true;
    }catch(e){}
    return false;
  }
  /* 已有編輯內容時：導覽先替你按左下「重置」（自動確認），重新整理後從第 1 步接著跑 */
  var RESUME_KEY = 'boda_tour_resume_after_reset';
  var needReset = false;
  function resetThenResume(){
    try{ sessionStorage.setItem(RESUME_KEY, '1'); }catch(e){}
    var btn = document.getElementById('boda-reset-all');
    if(btn) btn.click();
    /* 確認框出現就按「確定」；之後頁面會自己重新整理 */
    H.waitFor(function(){ autoConfirm(); return false; }, 15000);
    return new Promise(function(){});   // 不 resolve：等頁面重新整理
  }
  /* 2026-11-16：導覽匯入過示範資料，結束時（看完或中途略過）自動清除全部、回到首頁。
     沒匯入示範資料（例如有自己的內容、開場按「先不用」）就什麼都不動。 */
  var demoTouched = false;
  function resetAfterTour(){
    try{ sessionStorage.removeItem(RESUME_KEY); sessionStorage.removeItem(SECTION_KEY); }catch(e){}
    /* 網址拿掉 ?tour，重新整理後才不會又開始導覽 */
    try{ history.replaceState(null, '', location.pathname + '#upload'); }catch(e){}
    /* 自動按的確認框不顯示出來 */
    document.documentElement.classList.add('boda-tour-autoreset');
    var btn = document.getElementById('boda-reset-all');
    if(!btn){ location.reload(); return; }
    btn.click();
    H.waitFor(function(){ autoConfirm(); return false; }, 15000);
  }
  function busyNow(){ return !!(window.APP_LOADING && window.APP_LOADING.active === true); }
  /* 匯入時若跳出「要覆蓋原先活動嗎？」之類的確認框，導覽替你按「是」 */
  function autoConfirm(){
    var d = document.getElementById('boda-choice-dialog');
    if(d && H.visible(d)){ var ok = d.querySelector('.bcd-primary'); if(ok) ok.click(); }
  }
  function waitIdle(check, ms){
    return H.waitFor(function(){ autoConfirm(); return !busyNow() && (!check || check()); }, ms || 30000);
  }
  function demoImportWorkOrder(){
    if(!demoMode || typeof handleImportFile !== 'function') return Promise.resolve();
    var d = window.BODA_TOUR_DEMO;
    demoTouched = true;
    handleImportFile(b64File(d.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    return waitIdle(function(){ return window.uploadImportSummary && uploadImportSummary.activity; }, 60000);
  }
  function demoImportImages(){
    if(!demoMode || typeof handleImageFiles !== 'function') return Promise.resolve();
    var d = window.BODA_TOUR_DEMO;
    demoTouched = true;
    handleImageFiles(d.images.map(function(it){ return b64File(it, 'image/png'); }));
    return H.wait(400).then(function(){ return waitIdle(null, 60000); });
  }
  /* ══════════════════ 打亮範圍（可以在動畫中途變大） ══════════════════
     導覽引擎每一幀都會重新量目標的位置，所以打亮一個自己控制大小的透明框（proxy），
     改變 proxy 的範圍就能讓打亮框平順地長大，例如：先只亮上傳框，匯入後再把活動等級一起框進來。 */
  var proxy = null, proxyEls = [], proxyRect = null, proxyFrom = null, proxyT0 = 0, proxyRaf = 0;
  /* ── 曝光資源（iframe）裡的元素 ── */
  function expFrame(){ return document.getElementById('exposure-frame'); }
  function expDoc(){ var f = expFrame(); try{ return f && f.contentDocument; }catch(e){ return null; } }
  function E$(sel){ var d = expDoc(); return d ? d.querySelector(sel) : null; }
  function frameOffset(el){
    if(!el || el.ownerDocument === document) return { x: 0, y: 0 };
    var f = expFrame(), doc = el.ownerDocument;
    if(!f || f.contentDocument !== doc){
      f = Array.prototype.filter.call(document.querySelectorAll('iframe'), function(x){ try{ return x.contentDocument === doc; }catch(e){ return false; } })[0] || f;
    }
    if(!f) return { x: 0, y: 0 };
    var r = f.getBoundingClientRect();
    return { x: r.left + f.clientLeft, y: r.top + f.clientTop };
  }
  function ptOf(el){
    var r = el.getBoundingClientRect(), o = frameOffset(el);
    return { x: o.x + r.left + r.width / 2, y: o.y + r.top + r.height / 2 };
  }
  /* 游標移到 iframe 裡的元素按一下（real：真的觸發 click） */
  function clickIn(a, el, real, after){
    if(!el) return a.wait(300);
    try{ el.scrollIntoView({ block: 'nearest' }); }catch(e){}
    return H.wait(120).then(function(){
      var p = ptOf(el);
      return a.move(p.x, p.y, 650);
    }).then(function(){
      a.ripple();
      el.style.transition = 'transform .12s'; el.style.transform = 'scale(.94)';
      return a.wait(140);
    }).then(function(){
      el.style.transform = '';
      if(real) el.click();
      return a.wait(after != null ? after : 400);
    });
  }
  /* 拖一個「檔案」到 iframe 裡的元素上 */
  function dropIn(a, el, chip){
    if(!el) return a.wait(300);
    try{ el.scrollIntoView({ block: 'nearest' }); }catch(e){}
    var p = ptOf(el);
    return a.drag({ x: innerWidth - 160, y: 140 }, p, { chip: chip, ms: 1000, after: 200 });
  }
  /* 把示範檔案放進 iframe 裡的 <input type=file>，觸發它原本的上傳流程 */
  function setFiles(input, files){
    if(!input) return;
    var win = input.ownerDocument.defaultView, dt = new win.DataTransfer();
    files.forEach(function(f){ dt.items.add(f); });
    input.files = dt.files;
    input.dispatchEvent(new win.Event('change', { bubbles: true }));
  }
  function openAcc(bodyId){
    var body = E$('#' + bodyId), sec = body && body.closest('.boda-acc');
    if(sec && !sec.classList.contains('is-open')){ var h = sec.querySelector('.boda-acc-head'); if(h) h.click(); }
    return H.wait(350);
  }
  function prodRow(name){
    var rows = expDoc() ? expDoc().querySelectorAll('#bn-prod-list .bn-prod-item') : [];
    for(var i = 0; i < rows.length; i++) if(rows[i].textContent.indexOf(name) !== -1) return rows[i];
    return null;
  }
  /* 曝光資源畫布還在處理（載入遮罩、圖片處理）時先等一下，動畫才不會卡 */
  function expIdle(ms){
    return H.wait(300).then(function(){
      return H.waitFor(function(){
        var ov = E$('#bn-loading-overlay');
        return !busyNow() && !(ov && ov.classList.contains('show'));
      }, ms || 15000);
    });
  }
  /* 第一張有代言人照的版位（版位 iframe 在曝光資源 iframe 裡面，又縮放顯示） */
  function firstEndorserBlock(){
    var d = expDoc(); if(!d) return null;
    var blocks = Array.prototype.slice.call(d.querySelectorAll('.preview-block'));
    /* DD Card 優先（示範的擺法是照 DD Card 量的） */
    blocks.sort(function(x, y){
      var dx = /ddcard/i.test((x.querySelector('.pname') || {}).textContent || '') ? 0 : 1;
      var dy = /ddcard/i.test((y.querySelector('.pname') || {}).textContent || '') ? 0 : 1;
      return dx - dy;
    });
    for(var i = 0; i < blocks.length; i++){
      var ifr = blocks[i].querySelector('iframe'), ld = null;
      try{ ld = ifr && ifr.contentDocument; }catch(e){}
      var box = ld && ld.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
      if(box && H.visible(ifr)) return { block: blocks[i], ifr: ifr, doc: ld, box: box };
    }
    return null;
  }
  /* 版位 iframe 內座標 ↔ 最外層畫面座標 */
  function layoutMapper(blk){
    var r = blk.ifr.getBoundingClientRect(), o = frameOffset(blk.ifr);
    var sc = r.width / (blk.ifr.offsetWidth || r.width || 1);
    return {
      out: function(x, y){ return { x: o.x + r.left + x * sc, y: o.y + r.top + y * sc }; },
      inn: function(x, y){ return { x: (x - o.x - r.left) / sc, y: (y - o.y - r.top) / sc }; }
    };
  }
  /* 示範拖曳：在版位裡拖一個元素到 (tx,ty)（版位 iframe 內座標）。
     真的送 pointer 事件，工具會照常記錄位置、連動到其他版位。 */
  function dragInLayout(a, blk, el, tx, ty){
    var win = blk.doc.defaultView, m = layoutMapper(blk);
    var br = el.getBoundingClientRect();
    var sx = br.left + br.width / 2, sy = br.top + Math.min(br.height / 2, 40);
    tx += sx - (br.left + br.width / 2); ty += sy - (br.top + br.height / 2);   // 以抓的點為準
    var p0 = m.out(sx, sy), p1 = m.out(tx, ty);
    function fire(type, x, y){
      try{ el.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true })); }catch(e){}
    }
    return a.move(p0.x, p0.y, 450).then(function(){
      fire('pointerdown', sx, sy);
      return a.wait(100);
    }).then(function(){
      return a.move(p1.x, p1.y, 600, function(cx, cy){ var q = m.inn(cx, cy); fire('pointermove', q.x, q.y); });
    }).then(function(){
      fire('pointerup', tx, ty);
      a.ripple();
      return a.wait(250);
    });
  }
  /* 拖角落把手縮放（以左上角為基準，拉到指定寬度） */
  function resizeInLayout(a, blk, box, targetW){
    var win = blk.doc.defaultView, m = layoutMapper(blk);
    var h = box.querySelector('[data-corner="se"]');
    var br = box.getBoundingClientRect(), ratio = br.width / (br.height || 1);
    var sx = br.right - 3, sy = br.bottom - 3;
    var dw = targetW - br.width, tx = sx + dw, ty = sy + dw / ratio;
    var tgt = h || box;
    var p0 = m.out(sx, sy), p1 = m.out(tx, ty);
    function fire(type, x, y){
      try{ tgt.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true })); }catch(e){}
    }
    if(!h || Math.abs(dw) < 2) return a.wait(100);
    return a.move(p0.x, p0.y, 400).then(function(){ fire('pointerdown', sx, sy); return a.wait(100); })
      .then(function(){ return a.move(p1.x, p1.y, 550, function(cx, cy){ var q = m.inn(cx, cy); fire('pointermove', q.x, q.y); }); })
      .then(function(){ fire('pointerup', tx, ty); a.ripple(); return a.wait(250); });
  }
  /* 圖片裡真正有內容的範圍（去掉透明邊），回傳 0～1 的比例。
     商品圖有沒有被裁掉透明邊，各台電腦的處理結果可能不同，所以每次實際量。 */
  var _contentCache = {};
  function contentFrac(box){
    var img = box && box.querySelector('img');
    if(!img || !img.naturalWidth) return { x0: 0, y0: 0, x1: 1, y1: 1 };
    var key = img.src.length + ':' + img.src.slice(-64);
    if(_contentCache[key]) return _contentCache[key];
    var res = { x0: 0, y0: 0, x1: 1, y1: 1 };
    try{
      var N = 120, c = document.createElement('canvas');
      var iw = img.naturalWidth, ih = img.naturalHeight, sc = N / Math.max(iw, ih);
      c.width = Math.max(1, Math.round(iw * sc)); c.height = Math.max(1, Math.round(ih * sc));
      var g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      var d = g.getImageData(0, 0, c.width, c.height).data, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
      for(var y = 0; y < c.height; y++) for(var x = 0; x < c.width; x++){
        if(d[(y * c.width + x) * 4 + 3] > 24){ if(x < x0) x0 = x; if(y < y0) y0 = y; if(x > x1) x1 = x; if(y > y1) y1 = y; }
      }
      if(x1 >= x0 && y1 >= y0) res = { x0: x0 / c.width, y0: y0 / c.height, x1: (x1 + 1) / c.width, y1: (y1 + 1) / c.height };
    }catch(e){}
    _contentCache[key] = res;
    return res;
  }
  /* 把元素擺到指定位置：spec 是「看得到的內容」相對整張畫布的比例（左、上、寬） */
  function placeVisible(a, blk, box, spec){
    if(!box) return Promise.resolve();
    var W = blk.ifr.offsetWidth, Hh = blk.ifr.offsetHeight;
    var f = spec.width ? contentFrac(box) : { x0: 0, y0: 0, x1: 1, y1: 1 };
    var p = spec.width ? resizeInLayout(a, blk, box, spec.width * W / Math.max(0.05, f.x1 - f.x0)) : Promise.resolve();
    return p.then(function(){
      var r = box.getBoundingClientRect();
      var left = spec.left * W - f.x0 * r.width, top = spec.top * Hh - f.y0 * r.height;
      return dragInLayout(a, blk, box, left + r.width / 2, top + r.height / 2);
    });
  }
  /* 照 Iona 給的參考圖量的擺法（比例都是「看得到的人物／商品」相對整張畫布）：
     人物放大、商品縮小在右邊、代言人小字在人物左邊 */
  var ARRANGE = {
    ddcard: {
      person:  { left: 0.243, top: 0.453, width: 0.341 },
      product: { left: 0.567, top: 0.529, width: 0.307 },
      note:    { left: 0.065, top: 0.563 }
    },
    hbn: {
      person:  { left: 0.644, top: 0.092, width: 0.134 },
      product: { left: 0.787, top: 0.236, width: 0.1225 },
      note:    { left: 0.546, top: 0.358 }
    },
    /* 以下照 Iona 的完成圖量的（比例＝看得到的人物／商品相對整張畫布） */
    scbn: {      /* 1200×200 */
      person:  { left: 0.547, top: 0.093, width: 0.077 },
      product: { left: 0.631, top: 0.293, width: 0.0806 },
      note:    { left: 0.448, top: 0.343 }
    },
    lpbn: {      /* LPBN_PC橫LOGO 1200×400 */
      person:  { left: 0.607, top: 0.093, width: 0.144 },
      product: { left: 0.767, top: 0.250, width: 0.179 },
      note:    { left: 0.524, top: 0.393 }
    },
    lpbnApp: {   /* LPBN_APP橫LOGO 1200×550 */
      person:  { left: 0.603, top: 0.177, width: 0.151 },
      product: { left: 0.769, top: 0.344, width: 0.187 },
      note:    { left: 0.520, top: 0.373 }
    }
  };
  /* SCBN 底圖：按「↓」往下移 3 格（3%） */
  var BG_FIX = { scbn: { presetY: -111.6, steps: [{ axis: 'y', delta: 3 }], finalY: -108.6 } };
  function arrangeLayout(a, blk, spec){
    var person = blk.box, prod = blk.doc.querySelector('.bn-prod-box');
    return placeVisible(a, blk, person, spec.person)
      .then(function(){ return H.wait(250); })
      .then(function(){ return placeVisible(a, blk, prod, spec.product); })
      .then(function(){ return H.wait(250); })
      .then(function(){
        var note = blk.doc.querySelector('.bn-endorser-note');
        if(!note || !H.visible(note)) return;
        return placeVisible(a, blk, note, spec.note);
      });
  }
  function arrangeDDCard(a, blk){ return arrangeLayout(a, blk, ARRANGE.ddcard); }
  /* 找指定名稱的版位（pname 符合 re）且有代言人照 */
  function blockByName(re){
    var d = expDoc(); if(!d) return null;
    var blocks = d.querySelectorAll('.preview-block');
    for(var i = 0; i < blocks.length; i++){
      if(!re.test((blocks[i].querySelector('.pname') || {}).textContent || '')) continue;
      var ifr = blocks[i].querySelector('iframe'), ld = null;
      try{ ld = ifr && ifr.contentDocument; }catch(e){}
      var box = ld && ld.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
      if(box) return { block: blocks[i], ifr: ifr, doc: ld, box: box };
    }
    return null;
  }
  function lastBlockEl(){
    var d = expDoc(); if(!d) return null;
    var bl = Array.prototype.slice.call(d.querySelectorAll('.preview-block'));
    for(var i = 0; i < bl.length; i++) if(/LPBN_PC橫/i.test((bl[i].querySelector('.pname') || {}).textContent || '')) return bl[i];
    return bl[bl.length - 1] || null;
  }
  function lastBlock(){
    return blockByName(/LPBN_PC橫/i) || (function(){
      var d = expDoc(); if(!d) return null;
      var bl = d.querySelectorAll('.preview-block'); if(!bl.length) return null;
      var b = bl[bl.length - 1], ifr = b.querySelector('iframe'), ld = null;
      try{ ld = ifr && ifr.contentDocument; }catch(e){}
      var box = ld && ld.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
      return box ? { block: b, ifr: ifr, doc: ld, box: box } : null;
    })();
  }
  /* 按版位右上角「版位連動」→ 變成「獨立編輯」 */
  function unlinkByLock(a, blk){
    var btn = blk.block.querySelector('.bn-layout-lock');
    if(!btn || !btn.classList.contains('is-linked')) return a.wait(200);
    spot([btn], true);
    return a.wait(500).then(function(){ return clickIn(a, btn, true, 700); })
      .then(function(){ spot([blk.block], true); return a.wait(500); });
  }
  /* 用版位右側「背景圖調整」面板改底圖：原尺寸 → 拖縮放滑桿 → 按水平／垂直箭頭 */
  function adjustBg(a, blk, fix){
    var win = blk.block.ownerDocument.defaultView;
    blk.block.dispatchEvent(new win.MouseEvent('mouseenter'));
    var panel = null;
    return H.waitFor(function(){ panel = blk.block.querySelector('.bn-bg-panel'); return panel && H.visible(panel) && panel; }, 3000)
      .then(function(){
        if(!panel) return;
        return presetBgY(blk, panel, fix.presetY)
          .then(function(){ return a.wait(500); })
          .then(function(){
            if(fix.scale == null) return;
            var auto = panel.querySelector('[data-fit="auto"]');
            return clickIn(a, auto, true, 500);
          })
          .then(function(){
            if(fix.scale == null) return;
            var sl = panel.querySelector('.bg-scale');
            if(!sl || sl.disabled) return;
            var r = sl.getBoundingClientRect(), o = frameOffset(sl), mn = +sl.min, mx = +sl.max;
            function px(v){ return o.x + r.left + 7 + (v - mn) / (mx - mn) * (r.width - 14); }
            var y = o.y + r.top + r.height / 2, from = +sl.value;
            return a.move(px(from), y, 500).then(function(){
              a.ripple();
              return a.move(px(fix.scale), y, 1000, function(cx){
                var v = Math.round(mn + (cx - o.x - r.left - 7) / (r.width - 14) * (mx - mn));
                v = Math.max(Math.min(from, fix.scale), Math.min(Math.max(from, fix.scale), v));
                if(String(v) !== sl.value){ sl.value = v; sl.dispatchEvent(new win.Event('input', { bubbles: true })); }
              });
            }).then(function(){
              if(String(fix.scale) !== sl.value){ sl.value = fix.scale; sl.dispatchEvent(new win.Event('input', { bubbles: true })); }
              return a.wait(400);
            });
          })
          .then(function(){
            if(!fix.steps) return;
            var ch = Promise.resolve();
            fix.steps.forEach(function(st){
              ch = ch.then(function(){
                var v = panel.querySelector(st.axis === 'x' ? '.bg-x-val' : '.bg-y-val');
                return nudgeTo(a, panel, st.axis, Math.round(parseFloat(v.textContent) || 0) + st.delta).then(function(){ return a.wait(500); });
              });
            });
            return ch;
          })
          .then(function(){
            if(fix.steps) return;
            /* dx／dy：在目前位置上再移動多少 %；x／y：移到指定位置 */
            var xv = panel.querySelector('.bg-x-val'), yv = panel.querySelector('.bg-y-val');
            var tx = fix.dx != null ? Math.round(parseFloat(xv.textContent) || 0) + fix.dx : fix.x;
            var ty = fix.dy != null ? Math.round(parseFloat(yv.textContent) || 0) + fix.dy : fix.y;
            return (tx != null ? nudgeTo(a, panel, 'x', tx) : Promise.resolve())
              .then(function(){ return ty != null ? nudgeTo(a, panel, 'y', ty) : null; });
          })
          .then(function(){ return fix.finalY != null ? presetBgY(blk, panel, fix.finalY, true) : null; })
          .then(function(){ return a.wait(400); });
      });
  }
  /* 背景圖垂直位置直接設成指定值（面板顯示的 %，例如 -111.6）。
     舊式定位先送一次「↓」讓系統換成置中定位，再精準設定，水平位置不變。 */
  function presetBgY(blk, panel, disp, onlyIfDiff){
    if(disp == null) return Promise.resolve();
    var win = blk.block.ownerDocument.defaultView, id = null;
    try{ id = new URLSearchParams((blk.ifr.getAttribute('src') || '').split('?')[1] || '').get('bnid'); }catch(e){}
    if(!id || !win._bnGetBgStates || !win._bnSetBgStates) return Promise.resolve();
    function st(){ var all = win._bnGetBgStates() || {}; return all[id]; }
    var s0 = st(); if(!s0 || !s0.src) return Promise.resolve();
    if(onlyIfDiff && Math.abs(Number(s0.y) - 50 - disp) < 0.05) return Promise.resolve();
    var p = Promise.resolve();
    if(s0.positionMode !== 'center'){
      var dn = panel.querySelector('.bg-nudge[data-axis="y"][data-delta="1"]');
      if(dn) dn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      p = H.waitFor(function(){ var s = st(); return s && s.positionMode === 'center'; }, 2500);
    }
    return p.then(function(){
      var all = win._bnGetBgStates() || {}, s = all[id]; if(!s) return;
      s.positionMode = 'center'; s.y = 50 + disp; s._userEdited = true; s._initialized = true;
      win._bnSetBgStates(all, id);
      return H.wait(250).then(function(){
        var yv = panel.querySelector('.bg-y-val'); if(yv) yv.textContent = Math.round(disp * 10) / 10 + '%';
      });
    });
  }
  /* 按箭頭把水平／垂直位置調到目標（面板顯示的 %）；差 5 以上用 Shift 一次 5% */
  function nudgeTo(a, panel, axis, target){
    var valEl = panel.querySelector(axis === 'x' ? '.bg-x-val' : '.bg-y-val');
    function cur(){ return Math.round(parseFloat(valEl.textContent) || 0); }
    var chain = Promise.resolve(), guard = 0;
    function step(){
      var d = target - cur();
      if(!d || guard++ > 30) return Promise.resolve();
      var btn = panel.querySelector('.bg-nudge[data-axis="' + axis + '"][data-delta="' + (d > 0 ? 1 : -1) + '"]');
      if(!btn) return Promise.resolve();
      var big = Math.abs(d) >= 5, win = btn.ownerDocument.defaultView;
      var p = ptOf(btn);
      return a.move(p.x, p.y, guard === 1 ? 450 : 200).then(function(){
        a.ripple();
        /* 按下去的樣子：縮一下、變橘色，看得出有點到 */
        var o = { t: btn.style.transform, bg: btn.style.background, c: btn.style.color, tr: btn.style.transition };
        btn.style.transition = 'transform .1s, background .1s';
        btn.style.transform = 'scale(.86)'; btn.style.background = '#EE4D2D'; btn.style.color = '#fff';
        btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, shiftKey: big }));
        return a.wait(180).then(function(){
          btn.style.transform = o.t; btn.style.background = o.bg; btn.style.color = o.c;
          return a.wait(260).then(function(){ btn.style.transition = o.tr; });
        });
      }).then(step);
    }
    return chain.then(step);
  }
  /* 不播動畫、直接把版位擺好：先解除該版位連動（不影響其他版位），再送拖曳／縮放事件 */
  function silentDrag(blk, el, handle, x0, y0, x1, y1){
    var win = blk.doc.defaultView, t = handle || el;
    function fire(type, x, y){
      try{ t.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true })); }catch(e){}
    }
    fire('pointerdown', x0, y0);
    for(var i = 1; i <= 6; i++) fire('pointermove', x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6);
    fire('pointerup', x1, y1);
  }
  function silentPlace(blk, box, spec){
    if(!box || !spec) return;
    var W = blk.ifr.offsetWidth, Hh = blk.ifr.offsetHeight;
    var f = spec.width ? contentFrac(box) : { x0: 0, y0: 0, x1: 1, y1: 1 };
    if(spec.width){
      var h = box.querySelector('[data-corner="se"]'), br = box.getBoundingClientRect();
      var tw = spec.width * W / Math.max(0.05, f.x1 - f.x0), dw = tw - br.width;
      if(h && Math.abs(dw) >= 2) silentDrag(blk, box, h, br.right - 3, br.bottom - 3, br.right - 3 + dw, br.bottom - 3 + dw * br.height / br.width);
    }
    var r = box.getBoundingClientRect();
    var left = spec.left * W - f.x0 * r.width, top = spec.top * Hh - f.y0 * r.height;
    var sx = r.left + r.width / 2, sy = r.top + Math.min(r.height / 2, 40);
    silentDrag(blk, box, null, sx, sy, sx + (left - r.left), sy + (top - r.top));
  }
  function arrangeSilently(res){
    var specs = { 'LPBN_PC橫': ARRANGE.lpbn, 'LPBN_APP橫': ARRANGE.lpbnApp };
    var d = expDoc(); if(!d) return Promise.resolve();
    var chain = Promise.resolve();
    res.forEach(function(re){
      chain = chain.then(function(){
        var b = null;
        Array.prototype.forEach.call(d.querySelectorAll('.preview-block'), function(x){ if(!b && re.test((x.querySelector('.pname') || {}).textContent || '')) b = x; });
        if(!b) return;
        /* 還沒載入的版位直接啟動載入（不用捲過去） */
        var ifr = b.querySelector('iframe');
        if(ifr && ifr.getAttribute('data-bn-src') && typeof d.defaultView.bnLazyActivate === 'function') d.defaultView.bnLazyActivate(ifr);
        return H.waitFor(function(){ return blockByName(re); }, 10000).then(function(){
          var blk = blockByName(re); if(!blk) return;
          return H.wait(600).then(function(){
            var lock = blk.block.querySelector('.bn-layout-lock');
            if(lock && lock.classList.contains('is-linked')) lock.click();
            return H.wait(200);
          }).then(function(){
            var key = Object.keys(specs).filter(function(k){ return new RegExp(k, 'i').test((blk.block.querySelector('.pname') || {}).textContent || ''); })[0];
            var sp = specs[key]; if(!sp) return;
            silentPlace(blk, blk.box, sp.person);
            silentPlace(blk, blk.doc.querySelector('.bn-prod-box'), sp.product);
            var note = blk.doc.querySelector('.bn-endorser-note');
            if(note && H.visible(note)) silentPlace(blk, note, sp.note);
          });
        });
      });
    });
    return chain;
  }
  function hbnBlock(){ return blockByName(/^\s*HBN_橫式/i) || blockByName(/HBN/i); }
  /* 在另一張版位按下去：跳出「這張的編輯會連動修改上一張」的提醒（先停著讓人看清楚） */
  function openLinkAsk(a, blk){
    var win = blk.doc.defaultView, m = layoutMapper(blk), br = blk.box.getBoundingClientRect();
    var x = br.left + br.width / 2, y = br.top + Math.min(br.height / 2, 40), p0 = m.out(x, y);
    return a.move(p0.x, p0.y, 800).then(function(){
      a.ripple();
      try{ blk.box.dispatchEvent(new win.PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, isPrimary: true })); }catch(e){}
      try{ blk.box.dispatchEvent(new win.PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 0, isPrimary: true })); }catch(e){}
      return H.waitFor(function(){ return E$('#boda-link-ask'); }, 2500);
    });
  }
  /* 擺成：人物在左、商品在右，代言人小字放在人物左邊（不是 DD Card 時的簡易擺法） */
  function dragPersonLeft(a, blk){
    var box = blk.box, zone = box.parentElement.getBoundingClientRect(), br = box.getBoundingClientRect();
    return dragInLayout(a, blk, box, zone.left + zone.width * 0.26, br.top + br.height / 2)
      .then(function(){ return H.wait(400); })
      .then(function(){
        var note = blk.doc.querySelector('.bn-endorser-note');
        if(!note || !H.visible(note)) return;
        var p = box.getBoundingClientRect(), nr = note.getBoundingClientRect();
        var cx = Math.max(nr.width / 2 + 4, p.left - nr.width / 2 - 6);
        return dragInLayout(a, blk, note, cx, p.top + p.height * 0.45);
      });
  }
  function goExposure(){
    prerenderExposure(false);
    if(currentView() !== 'exposure' && typeof goToWorkflowStep === 'function'){
      if(typeof window.bodaUnlockWorkflow === 'function') window.bodaUnlockWorkflow();
      goToWorkflowStep('exposure');
    }
    return H.waitFor(function(){ return currentView() === 'exposure' && E$('#bn-prod-list') && H.visible(E$('#bn-prod-list')); }, 20000)
      .then(function(){ return expIdle(); });
  }
  function cardOf(sel){ var el = H.$(sel); return el ? (el.closest('.upload-card') || el) : null; }
  function unionOf(els){
    var r = null;
    els.forEach(function(el){
      if(!el || !H.visible(el)) return;
      var b0 = el.getBoundingClientRect(), o = frameOffset(el);   // 曝光資源裡的元素要加上 iframe 的位置
      var b = { left: b0.left + o.x, top: b0.top + o.y, right: b0.right + o.x, bottom: b0.bottom + o.y };
      r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) }
            : { l: b.left, t: b.top, r: b.right, b: b.bottom };
    });
    return r;
  }
  function proxyLoop(){
    var goal = unionOf(proxyEls);
    if(goal){
      /* 一律平順地追上目標：移動到別的元素、或目標本身變大（例如匯入後下方出現狀態）都不會一下子跳過去 */
      if(!proxyFrom) proxyRect = proxyRect || goal;
      else { proxyRect = proxyFrom; proxyFrom = null; }
      var f = proxyRect, e = 1;   // 直接對準新位置，不在途中變形（避免 Z 字形移動）
      proxyRect = { l: f.l + (goal.l - f.l) * e, t: f.t + (goal.t - f.t) * e, r: f.r + (goal.r - f.r) * e, b: f.b + (goal.b - f.b) * e };
      proxy.style.left = proxyRect.l + 'px'; proxy.style.top = proxyRect.t + 'px';
      proxy.style.width = (proxyRect.r - proxyRect.l) + 'px'; proxy.style.height = (proxyRect.b - proxyRect.t) + 'px';
    }
    proxyRaf = requestAnimationFrame(proxyLoop);
  }
  /* 設定要打亮哪些元素；animate:true 從目前範圍平順長大／縮小 */
  function spot(els, animate){
    if(!proxy){
      proxy = document.createElement('div');
      proxy.id = 'boda-tour-spot';
      proxy.style.cssText = 'position:fixed;pointer-events:none;visibility:hidden;left:0;top:0;width:0;height:0;';
      document.body.appendChild(proxy);
    }
    if(!animate) proxyRect = null;   // 不要動畫：直接放到新位置
    proxyFrom = animate && proxyRect ? proxyRect : null;
    proxyT0 = performance.now();
    proxyEls = els.filter(Boolean);
    if(!proxyRaf) proxyLoop();
    return proxy;
  }
  /* 目標函式每一幀都會被呼叫：只回傳 proxy，不改範圍（範圍只在 before 和動畫裡設定） */
  function spotOff(){ if(proxyRaf) cancelAnimationFrame(proxyRaf); proxyRaf = 0; proxyRect = null; }

  /* 活動等級：匯入工單時下拉選單其實已經換成新等級。
     第 1 步先用一層「蓋子」維持顯示「未選擇」，到第 2 步才讓「未選擇」往上滑走、新名稱滑上來。 */
  var levelCover = null;
  function levelText(){
    var sel = H.$('#upload-level-select');
    return sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
  }
  function coverLevel(fromText){
    uncoverLevel();
    var sel = H.$('#upload-level-select');
    if(!sel || !fromText) return;
    var r = sel.getBoundingClientRect(), cs = getComputedStyle(sel);
    var lineH = r.height - 2;
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:2147479990;pointer-events:none;overflow:hidden;box-sizing:border-box;' +
      'left:' + (r.left + 1) + 'px;top:' + (r.top + 1) + 'px;width:' + (r.width - 34) + 'px;height:' + lineH + 'px;' +
      'background:' + (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? cs.backgroundColor : '#fff') + ';' +
      'border-radius:' + cs.borderRadius + ';padding-left:' + cs.paddingLeft + ';font:' + cs.font + ';color:' + cs.color + ';';
    var strip = document.createElement('div');
    strip.style.cssText = 'transition:transform .6s cubic-bezier(.2,.8,.2,1);';
    [fromText, ''].forEach(function(t, i){
      var d = document.createElement('div');
      d.textContent = t;
      d.style.cssText = 'height:' + lineH + 'px;line-height:' + lineH + 'px;white-space:nowrap;' + (i ? 'font-weight:700;color:#EE4D2D;' : '');
      strip.appendChild(d);
    });
    box.appendChild(strip);
    document.body.appendChild(box);
    levelCover = { box: box, strip: strip, lineH: lineH };
  }
  /* 匯入完成後，把蓋子第二行填上新的等級名稱（第 2 步再滑上來） */
  function setCoverTarget(){
    if(!levelCover) return;
    var lines = levelCover.strip.children, to = levelText();
    if(lines[1]) lines[1].textContent = to;
    if(!to || to === lines[0].textContent) uncoverLevel();
  }
  function uncoverLevel(){
    if(levelCover){ levelCover.box.remove(); levelCover = null; }
    var sel = H.$('#upload-level-select'); if(sel) sel.style.boxShadow = '';
  }
  function rollLevel(){
    if(!levelCover) return H.wait(300);
    var c = levelCover, sel = H.$('#upload-level-select');
    if(sel){ sel.style.transition = 'box-shadow .3s'; }
    c.strip.style.transform = 'translateY(-' + c.lineH + 'px)';
    if(sel) sel.style.boxShadow = '0 0 0 4px rgba(238,77,45,.35)';
    return H.wait(1400).then(function(){
      c.box.style.transition = 'opacity .3s'; c.box.style.opacity = '0';
      return H.wait(320);
    }).then(function(){ if(levelCover === c) uncoverLevel(); });
  }
  /* 左側製作步驟：導覽中解鎖時，深色鎖住狀態一起淡出成開啟狀態（鎖頭拿掉） */
  function hold(name, on){ document.documentElement.classList.toggle('boda-tour-hold-' + name, !!on); }
  function prerenderExposure(on){
    var v = document.getElementById('view-exposure');
    if(!v) return;
    if(on && typeof ensureExposureLoaded === 'function') try{ ensureExposureLoaded({ quiet: true }); }catch(e){}
    v.classList.toggle('boda-tour-prerender', !!on && !v.classList.contains('active'));
  }
  function demoImageCount(){ return window.BODA_TOUR_DEMO ? window.BODA_TOUR_DEMO.images.length : 0; }
  function demoWorkOrderName(){ return window.BODA_TOUR_DEMO ? window.BODA_TOUR_DEMO.xlsx.name : '工單.xlsx'; }


  /* ══════════════════ 活動頁資源 ══════════════════ */
  function impSlot(i){ return document.querySelector('#import-preview-list .imp-slot[data-col="' + i + '"]'); }
  function impReady(){
    return H.waitFor(function(){ return currentView() === 'import' && impSlot(4) && impSlot(4).offsetParent; }, 15000)
      .then(function(){ return H.wait(300); });
  }
  function goImport(){
    if(currentView() !== 'import' && typeof goToWorkflowStep === 'function') try{ goToWorkflowStep('import'); }catch(e){}
    return impReady();
  }
  /* 第 N 格捲到畫面中間；lock：同時鎖定這一格，右側工具列跟著切到這格 */
  function showSlot(i, lock){
    var el = impSlot(i);
    if(el) try{ el.scrollIntoView({ block: 'center' }); }catch(e){}
    if(lock && typeof lockImportCol === 'function') try{ lockImportCol(i); }catch(e){}
    return H.wait(450);
  }
  function msbnSlot(){ return impSlot(4); }
  function signToolRow(){
    var col = document.querySelector('#import-block-tools .import-band-tool-col[data-col="4"]');
    var row = col && col.querySelector('.import-image-tool-row[data-key="signImg"]');
    return row ? (row.closest('.import-image-tool-group') || row) : null;
  }
  function colorRow(key){ return document.querySelector('#import-color-list .ic-color-row[data-key="' + key + '"]'); }
  function setRowHex(key, v){
    var row = colorRow(key), hex = row && row.querySelector('.icc-hex');
    if(!hex) return;
    hex.value = v;
    hex.dispatchEvent(new Event('input', { bubbles: true }));
    hex.dispatchEvent(new Event('change', { bubbles: true }));
  }
  /* 畫布上點色塊會開瀏覽器原生色盤（導覽無法操作），這裡用一個長得像色盤的小框示範輸入色碼 */
  var fakePick = null;
  function closeFakePicker(){ if(fakePick){ fakePick.remove(); fakePick = null; } }
  function openFakePicker(pt, title, from){
    closeFakePicker();
    var box = document.createElement('div');
    box.id = 'boda-tour-fakepick';
    box.style.cssText = 'position:fixed;z-index:2147479990;width:212px;padding:12px;background:#fff;border-radius:10px;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.28);font:12px/1.4 sans-serif;color:#1f2937;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s;';
    box.innerHTML = '<div style="font-weight:700;margin-bottom:8px">' + title + '</div>' +
      '<div class="fp-sw" style="height:72px;border-radius:6px;border:1px solid #e5e7eb;background:' + from + ';transition:background .25s"></div>' +
      '<div style="display:flex;gap:6px;align-items:center;margin-top:8px"><span style="color:#6b7280">色碼</span>' +
      '<input class="fp-hex" type="text" value="' + from + '" style="flex:1;min-width:0;height:28px;padding:3px 7px;border:1px solid #d1d5db;border-radius:5px;font:12px monospace"></div>';
    document.body.appendChild(box);
    var x = Math.min(innerWidth - 230, Math.max(8, pt.x + 14)), y = Math.min(innerHeight - 150, Math.max(8, pt.y + 14));
    box.style.left = x + 'px'; box.style.top = y + 'px';
    var hex = box.querySelector('.fp-hex'), sw = box.querySelector('.fp-sw');
    hex.addEventListener('input', function(){ if(/^#[0-9a-f]{6}$/i.test(hex.value)) sw.style.background = hex.value; });
    requestAnimationFrame(function(){ box.style.opacity = '1'; box.style.transform = 'none'; });
    fakePick = box;
    return box;
  }
  /* 在畫布上的可編輯文字裡一個字一個字打字 */
  function typeEditable(a, el, text){
    var p = ptOf(el);
    return a.move(p.x, p.y, 650).then(function(){
      a.ripple();
      el.focus();
      try{ var r = document.createRange(); r.selectNodeContents(el); r.collapse(false); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }catch(e){}
      var i = 0;
      return new Promise(function(res){
        (function next(){
          if(i >= text.length) return res();
          var ch = text.charAt(i++);
          if(!document.execCommand('insertText', false, ch)){ el.textContent += ch; el.dispatchEvent(new Event('input', { bubbles: true })); }
          setTimeout(next, 110);
        })();
      });
    }).then(function(){ return a.wait(400); }).then(function(){ el.blur(); return a.wait(500); });
  }

  /* ── 活動頁畫布：圖片拖曳／縮放、文字刪字（送真的滑鼠事件給畫布，資料會真的改） ── */
  function impGeo(slot){
    var m = slot && slot.querySelector('.imp-mount'); if(!m) return null;
    var r = m.getBoundingClientRect();
    return { x: r.left, y: r.top, s: r.width / (m.offsetWidth || 1200) };
  }
  function impOverlay(){ var o = document.querySelector('.bn-import-transform-overlay'); return o && o.style.display !== 'none' ? o : null; }
  function impBody(img){ var o = impOverlay(); return o ? o.getBoundingClientRect() : img.getBoundingClientRect(); }
  function impDeselect(){
    try{ document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 2, clientY: 2 })); }catch(e){}
  }
  /* 點一下圖片：出現四角把手 */
  function impSelect(a, img){
    var r = img.getBoundingClientRect();
    return a.move(r.left + r.width / 2, r.top + r.height / 2, 400).then(function(){
      a.ripple();
      img.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return a.wait(250);
    });
  }
  /* 拉右下角把手縮放到指定寬度（px，畫面上的） */
  function impResize(a, img, targetW){
    var o = impOverlay(), h = o && o.querySelector('[data-bn-corner="se"]');
    if(!h) return a.wait(100);
    var r = o.getBoundingClientRect(), k = targetW / (r.width || 1);
    if(Math.abs(k - 1) < 0.02) return a.wait(100);
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2, hx = r.right, hy = r.bottom;
    var tx = cx + (hx - cx) * k, ty = cy + (hy - cy) * k;
    function fire(t, x, y){ try{ h.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerup' ? 0 : 1, isPrimary: true })); }catch(e){} }
    return a.move(hx, hy, 350).then(function(){ fire('pointerdown', hx, hy); return a.wait(100); })
      .then(function(){ return a.move(tx, ty, 550, function(x, y){ fire('pointermove', x, y); }); })
      .then(function(){ fire('pointerup', tx, ty); return a.wait(200); });
  }
  /* 按住拖曳：mousedown 在元素上，之後在 document 上移動 */
  function impDrag(a, el, grabEl, dx, dy, silent){
    var r = el.getBoundingClientRect(), sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    function mv(x, y){ document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: x, clientY: y, buttons: 1 })); }
    function down(){ (grabEl || el).dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: sx, clientY: sy, button: 0, buttons: 1 })); }
    function up(){ document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: sx + dx, clientY: sy + dy })); }
    if(Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) return Promise.resolve();
    if(silent){ down(); for(var i = 1; i <= 6; i++) mv(sx + dx * i / 6, sy + dy * i / 6); up(); return H.wait(120); }
    return a.move(sx, sy, 400).then(function(){ down(); return a.wait(100); })
      .then(function(){ return a.move(sx + dx, sy + dy, 600, function(x, y){ mv(x, y); }); })
      .then(function(){ up(); a.ripple(); return a.wait(250); });
  }
  /* 圖片排到指定位置／寬度（spec 是版位原尺寸 1200 寬的座標：left/top/width） */
  function impPlaceImg(a, slot, img, spec){
    var g = impGeo(slot); if(!g || !img) return a.wait(100);
    return impSelect(a, img)
      .then(function(){ return spec.width ? impResize(a, img, spec.width * g.s) : null; })
      .then(function(){
        var r = impBody(img);
        return impDrag(a, img, img, g.x + spec.left * g.s - r.left, g.y + spec.top * g.s - r.top);
      })
      .then(function(){ return H.wait(200); })
      .then(function(){
        /* 誤差補正（看不出來的小修） */
        var r = impBody(img);
        return impDrag(a, img, img, g.x + spec.left * g.s - r.left, g.y + spec.top * g.s - r.top, true);
      });
  }
  /* 文字／簽名圖：只移動位置 */
  function impPlaceEl(a, slot, el, grabEl, spec){
    var g = impGeo(slot); if(!g || !el) return a.wait(100);
    var r = el.getBoundingClientRect();
    return impDrag(a, el, grabEl, g.x + spec.left * g.s - r.left, g.y + spec.top * g.s - r.top);
  }
  /* 可編輯文字：游標放到某段字後面，往回刪 n 個字（或 n=null 刪到空） */
  function impDeleteText(a, el, after, n){
    var node = null, idx = -1, tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t;
    while((t = tw.nextNode())){
      var i = after ? t.nodeValue.indexOf(after) : -1;
      if(after && i >= 0){ node = t; idx = i + after.length; break; }
      if(!after){ node = t; idx = t.nodeValue.length; }
    }
    if(!node) return a.wait(200);
    var rg = document.createRange(); rg.setStart(node, Math.max(0, idx - 1)); rg.setEnd(node, idx);
    var rr = rg.getBoundingClientRect();
    return a.move(rr.right, rr.top + rr.height / 2, 650).then(function(){
      a.ripple();
      el.focus();
      var c = document.createRange(); c.setStart(node, idx); c.collapse(true);
      var sel = getSelection(); sel.removeAllRanges(); sel.addRange(c);
      return a.wait(400);
    }).then(function(){
      var k = 0;
      return new Promise(function(res){
        (function next(){
          var left = (el.innerText || '').replace(/\s/g, '');
          if((n != null && k >= n) || (n == null && !left) || k > 30) return res();
          k++; document.execCommand('delete');
          setTimeout(next, 260);
        })();
      });
    }).then(function(){ return a.wait(500); }).then(function(){ el.blur(); return a.wait(700); });
  }
  function toolCol(i){ return document.querySelector('#import-block-tools .import-band-tool-col[data-col="' + i + '"]'); }
  function prodImgs(slot){ return slot ? Array.prototype.slice.call(slot.querySelectorAll('[data-img-field="productImg"] img')) : []; }
  /* 依參考圖量的擺法（版位原尺寸座標）。MSBN 第二張：人物放大靠左、商品縮小、簽名小字在左側；
     第三張：商品袋與角色分開擺 */
  var IMP_ARRANGE = {
    msbn2: { person: { left: 173, top: 22, width: 295 }, product: { left: 388, top: 65, width: 185 },
             sign: { left: 49, top: 245 }, note: { left: 55, top: 168 } },
    msbn3: { bag: { left: 687, top: 22, width: 194 }, chara: { left: 892, top: 131, width: 114 } },
    msbn3p: { right: { left: 856, top: 79, width: 248 } }
  };
  /* 切到某一個製作步驟的頁面 */
  function goStep(key){
    if(currentView() !== key && typeof goToWorkflowStep === 'function') try{ goToWorkflowStep(key); }catch(e){}
    return H.waitFor(function(){ return currentView() === key; }, 8000).then(function(){ return H.wait(400); });
  }
  /* 取色工具（iframe）裡的元素 */
  function C$(sel){
    var f = document.getElementById('color-frame'), d = null;
    try{ d = f && f.contentDocument; }catch(e){}
    return d ? d.querySelector(sel) : null;
  }
  /* 不播動畫的「快速動畫器」：同一套拖曳／縮放程式，直接跑完 */
  function QA(){
    var x = 0, y = 0;
    return {
      move: function(tx, ty, ms, on){
        if(on){ for(var i = 1; i <= 6; i++) on(x + (tx - x) * i / 6, y + (ty - y) * i / 6); }
        x = tx; y = ty; return Promise.resolve();
      },
      wait: function(ms){ return H.wait(Math.min(ms || 0, 150)); },
      ripple: function(){}, hide: function(){ return Promise.resolve(); }
    };
  }
  function railStep(key){ return document.querySelector('#nav-rail .nav-step[data-step="' + key + '"]'); }
  /* 點左側步驟進去 → 按該頁的完成 → 燈亮 */
  function reconfirm(a, key){
    if(!demoMode) return H.wait(300);
    return a.wait(400).then(function(){ return clickIn(a, railStep(key), false, 200); })
      .then(function(){ return goStep(key); })
      .then(function(){
        if(key === 'import') return impReady();
        return H.waitFor(function(){ return E$('#boda-exposure-done-btn'); }, 15000);
      })
      .then(function(){ return H.wait(500); })
      .then(function(){
        var btn = key === 'import' ? H.$('#boda-import-done-btn') : E$('#boda-exposure-done-btn');
        if(!btn) return;
        try{ btn.scrollIntoView({ block: 'nearest' }); }catch(e){}
        spot([btn], true);
        return a.wait(700).then(function(){ return clickIn(a, btn, false, 300); });
      })
      .then(function(){ return a.hide(); })
      .then(function(){
        if(typeof setWorkflowStepStatus === 'function') setWorkflowStepStatus(key, 'done');
        spot([railStep(key)], true);
        return H.wait(1300);
      });
  }
  /* 吸底工具（iframe）裡的元素 */
  function B$(sel){
    var f = document.getElementById('bottom-standalone-frame'), d = null;
    try{ d = f && f.contentDocument; }catch(e){}
    return d ? d.querySelector(sel) : null;
  }
  function bCard(i){ return B$('.slot-card[data-slot-card-index="' + i + '"]'); }
  function bBtn(re){
    var f = document.getElementById('bottom-standalone-frame'), d = null;
    try{ d = f && f.contentDocument; }catch(e){}
    return d ? Array.prototype.filter.call(d.querySelectorAll('button'), function(b){ return re.test(b.textContent) && b.offsetParent; })[0] : null;
  }
  function bottomReady(){
    return H.waitFor(function(){ var k = B$('#konva-container'); return bCard(0) && k && !k.hidden; }, 30000).then(function(){ return H.wait(500); });
  }
  function pickBottomIcon(a, i, name){
    var c = bCard(i), trig = c && c.querySelector('.icon-trigger');
    if(!trig) return a.wait(200);
    try{ c.scrollIntoView({ block: 'nearest' }); }catch(e){}
    spot([c], true);
    return a.wait(300).then(function(){ return clickIn(a, trig, true, 500); })
      .then(function(){
        var tile = Array.prototype.filter.call((B$('.icon-picker') || document.createElement('i')).querySelectorAll('.icon-tile'), function(t){
          var n = t.querySelector('.icon-tile-name'); return n && n.textContent === name;
        })[0];
        if(!tile) return;
        try{ tile.scrollIntoView({ block: 'nearest' }); }catch(e){}
        spot([B$('.icon-picker')], true);
        return a.wait(400).then(function(){ return clickIn(a, tile, true, 600); });
      });
  }
  /* 打亮範圍要含標題：手風琴（標題列＋內容）、人物區（含上方標題） */
  function accParts(bodyId){
    var body = E$('#' + bodyId), sec = body && body.closest('.boda-acc');
    var head = sec && sec.querySelector('.boda-acc-head');
    return [head || null, body];
  }
  function withTitle(el){
    if(!el) return [null];
    var prev = el.previousElementSibling;
    while(prev && !(prev.textContent || '').trim()) prev = prev.previousElementSibling;
    return prev && /人物|代言人/.test(prev.textContent || '') ? [prev, el] : [el];
  }
  function launchBtn(){
    return document.getElementById('boda-help-menu') ||
      Array.prototype.filter.call(document.querySelectorAll('#nav-rail button, #nav-rail a'), function(b){ return /教學/.test(b.textContent || ''); })[0] || null;
  }
  /* 說明框內顯示「正在產生下載預覽 xx%」（讀主程式 Loading 的進度） */
  function showBuildProgress(){
    var body = document.querySelector('.tg-card .tg-body');
    if(!body) return function(){};
    var orig = body.innerHTML, tm = setInterval(tick, 300);
    function tick(){
      var n = pkgProgress || 0;
      body.innerHTML = '正在準備所有圖片的下載預覽，請稍候…' +
        '<div style="margin-top:8px;height:6px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden">' +
        '<i style="display:block;height:100%;width:' + Math.max(4, n) + '%;background:#EE4D2D;transition:width .3s"></i></div>' +
        '<div style="margin-top:4px;font-size:12px;opacity:.8">' + (n ? n + '%' : '準備中…') + '</div>';
    }
    tick();
    return function(){ clearInterval(tm); body.innerHTML = orig; };
  }
  function setCardBody(html){ var b = document.querySelector('.tg-card .tg-body'); if(b) b.innerHTML = html; }
  /* 整包下載：在背後先準備好（工單回填、活動頁／吸底圖片、曝光資源圖片、暫存檔），按下時直接打開檢查畫面 */
  var pkgPromise = null, pkgProgress = 0;
  function prebuildPackage(){
    if(pkgPromise) return pkgPromise;
    if(typeof downloadImportImage !== 'function' || typeof showPackageDownloadPreview !== 'function') return Promise.reject(new Error('no package api'));
    var bundle = { timestamp: Date.now(), workOrder: null, images: [], exposureImages: [], snapshot: null, warnings: [] };
    var importView = document.getElementById('view-import');
    var off = importView && !importView.classList.contains('active');
    if(off) importView.classList.add('bn-offscreen-render');
    pkgProgress = 5;
    pkgPromise = Promise.resolve()
      .then(function(){
        if(typeof currentImportWorkbook === 'undefined' || !currentImportWorkbook || typeof buildImportedWorkOrderXlsxFile !== 'function'){ bundle.warnings.push('工單未輸出：目前不是由原始 .xlsx 工單匯入。'); return; }
        return Promise.resolve().then(buildImportedWorkOrderXlsxFile).then(function(f){ bundle.workOrder = f; })
          .catch(function(err){ bundle.warnings.push('工單未輸出：' + (err && err.message ? err.message : err)); });
      })
      .then(function(){ pkgProgress = 20; return downloadImportImage({ collectOnly: true }); })
      .then(function(r){
        bundle.images = r && r.files ? r.files : [];
        if(r && r.failures && r.failures.length) bundle.warnings.push('部分獨立版位圖片輸出失敗：' + r.failures.map(function(x){ return x.filename; }).join('、'));
        (r && r.notes || []).forEach(function(n){ if(n) bundle.warnings.push(n); });
      }, function(err){ bundle.warnings.push('圖片未輸出：' + (err && err.message ? err.message : err)); })
      .then(function(){ pkgProgress = 70; return typeof requestExposureExportFiles === 'function' ? requestExposureExportFiles() : null; })
      .then(function(res){
        bundle.exposureImages = res && res.files ? res.files : [];
        if(res && res.note) bundle.warnings.push(res.note);
      }, function(err){ bundle.warnings.push('曝光資源圖片未輸出：' + (err && err.message ? err.message : err)); })
      .then(function(){ pkgProgress = 92; return typeof buildImportSnapshot === 'function' ? buildImportSnapshot() : null; })
      .then(function(snap){
        bundle.snapshot = snap;
        pkgProgress = 100;
        if(off) importView.classList.remove('bn-offscreen-render');
        try{ if(typeof appLoadingFinish === 'function') appLoadingFinish(''); }catch(e){}
        return bundle;
      }, function(err){
        if(off) importView.classList.remove('bn-offscreen-render');
        pkgPromise = null; throw err;
      });
    return pkgPromise;
  }
  /* 用準備好的內容打開檢查畫面；按「確認下載 ZIP」照常下載 */
  function openPackagePreview(bundle){
    if(!bundle || H.$('#boda-dl-preview')) return;
    showPackageDownloadPreview(bundle).then(function(go){
      if(!go || typeof downloadImportPackageZip !== 'function') return;
      return downloadImportPackageZip(bundle);
    });
  }
  /* 段落完成的小煙火：從說明框上方炸開，加一個完成小標 */
  function celebrate(text, big){
    if(motionOff && motionOff()) return;
    /* 煙火從說明框的標題（例如「曝光資源完成」）那一行炸開 */
    /* 煙火放在說明框裡面（跟著說明框移動），位置對準標題那一行 */
    var card = document.querySelector('.tg-card'), tt = card && card.querySelector('.tg-title');
    if(!card || !tt) return;
    var cr = card.getBoundingClientRect(), r = tt.getBoundingClientRect();
    var tw = r.width;
    try{ var rg = document.createRange(); rg.selectNodeContents(tt); tw = Math.min(r.width, rg.getBoundingClientRect().width || r.width); }catch(e){}
    var tx0 = r.left - cr.left, cx = tx0 + tw / 2, cy = r.top - cr.top + r.height / 2;
    var layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible;';
    card.appendChild(layer);
    var COLORS = ['#EE4D2D', '#FFB19F', '#F5A623', '#2BB673', '#4D9B95', '#FFD84D', '#7C6CF2'];
    function burst(x, y, n, dist, delay){
      for(var i = 0; i < n; i++){
        var d = document.createElement('i'), ang = Math.PI * 2 * i / n + Math.random() * 0.3, len = dist * (0.6 + Math.random() * 0.5);
        var sz = 4 + Math.random() * 4;
        d.style.cssText = 'position:absolute;left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;' +
          'background:' + COLORS[i % COLORS.length] + ';opacity:1;transform:translate(-50%,-50%);' +
          'transition:transform .9s cubic-bezier(.15,.7,.3,1) ' + delay + 'ms,opacity .9s ease ' + (delay + 250) + 'ms;';
        layer.appendChild(d);
        (function(el, tx, ty){
          requestAnimationFrame(function(){ requestAnimationFrame(function(){
            el.style.transform = 'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px)) scale(.6)';
            el.style.opacity = '0';
          }); });
        })(d, Math.cos(ang) * len, Math.sin(ang) * len + 30);
      }
    }
    burst(cx, cy, 26, 110, 0);
    burst(cx - 90, cy + 10, 16, 70, 220);
    burst(cx + 90, cy + 10, 16, 70, 380);
    if(big){ burst(cx - 170, cy + 30, 18, 80, 560); burst(cx + 170, cy + 30, 18, 80, 700); }
    var tag = document.createElement('div');
    tag.textContent = big ? '🎉 ' + (text || '全部完成！') : '🎉 完成！';
    tag.style.cssText = 'position:absolute;left:' + (tx0 + tw + 10) + 'px;top:' + cy + 'px;transform:translate(0,-50%) scale(.6);opacity:0;transform-origin:left center;' +
      'background:#EE4D2D;color:#fff;font:700 14px/1 sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 6px 18px rgba(238,77,45,.4);' +
      'transition:transform .35s cubic-bezier(.2,1.6,.4,1),opacity .3s;white-space:nowrap;';
    layer.appendChild(tag);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ tag.style.opacity = '1'; tag.style.transform = 'translate(0,-50%) scale(1)'; }); });
    setTimeout(function(){ tag.style.opacity = '0'; tag.style.transform = 'translate(0,-80%) scale(.9)'; }, 1700);
    setTimeout(function(){ layer.remove(); }, 2300);
  }
  /* ── 分段導覽：可以只看曝光資源／活動頁／取色工具／吸底 ── */
  var SECTION_KEY = 'boda_tour_section';
  var SECTIONS = {
    exposure: { label: '曝光資源', title: '商品自動帶入' },
    import:   { label: '活動頁資源', title: '商品圖自動套入' },
    color:    { label: '取色工具', title: '活動頁面配色' },
    bottom:   { label: '吸底工具', title: '編輯吸底' }
  };
  function sectionIndex(key){
    var t = SECTIONS[key] && SECTIONS[key].title;
    for(var i = 0; i < STEPS.length; i++) if(STEPS[i].title === t) return i;
    return 0;
  }
  /* 第 4 格 MSBN：人物、商品、簽名、代言人文案排好位置（原「微調素材排版」的動作） */
  function arrangeMsbn2(a){
    var s = msbnSlot(), imgs = prodImgs(s), A = IMP_ARRANGE.msbn2;
    if(!demoMode || !s || imgs.length < 2) return H.wait(300);
    return a.wait(400)
      .then(function(){ return impPlaceImg(a, s, imgs[0], A.person); })
      .then(function(){ return impPlaceImg(a, s, imgs[1], A.product); })
      .then(function(){ impDeselect(); return a.wait(200); })
      .then(function(){
        var si = s.querySelector('[data-img-field="signImg"] img');
        return si ? impPlaceEl(a, s, si, si, A.sign) : null;
      })
      .then(function(){
        var n = s.querySelector('[data-field="signNote"]'), box = n && n.closest('[data-movable-canvas-text]');
        return box ? impPlaceEl(a, s, box, n, A.note) : null;
      })
      .then(function(){ impDeselect(); try{ var sel = getSelection(); sel && sel.removeAllRanges(); }catch(e){} return H.wait(400); });
  }
  /* 背後匯入示範工單＋圖片、解鎖左側步驟（不播動畫） */
  function silentPrepare(key){
    var have = window.uploadImportSummary && uploadImportSummary.activity && typeof uploadedImages !== 'undefined' && uploadedImages.length;
    return (have ? Promise.resolve() : goUpload())
      .then(function(){ if(!(window.uploadImportSummary && uploadImportSummary.activity)) return demoImportWorkOrder(); })
      .then(function(){ if(!(typeof uploadedImages !== 'undefined' && uploadedImages.length)) return demoImportImages(); })
      .then(function(){
        if(typeof window.bodaUnlockWorkflow === 'function') window.bodaUnlockWorkflow();
        uncoverLevel(); hold('wo', false); hold('img', false);
        if(key === 'exposure') prerenderExposure(true);
        return H.wait(400);
      });
  }
  function askResetForSection(key){
    var go = typeof bodaChoiceDialog === 'function'
      ? bodaChoiceDialog({ title: '要看「' + SECTIONS[key].label + '」的導覽嗎？',
          body: '示範會先清除目前網頁上的內容，再匯入示範工單。\n要保留的話，請先下載暫存檔。',
          okText: '清除並開始', cancelText: '先不用' })
      : Promise.resolve(confirm('示範會先清除目前網頁上的內容，確定要開始嗎？'));
    return go.then(function(ok){
      if(!ok){ try{ sessionStorage.removeItem(SECTION_KEY); }catch(e){} return; }
      try{ sessionStorage.setItem(SECTION_KEY, key); }catch(e){}
      var btn = document.getElementById('boda-reset-all');
      if(btn) btn.click();
      H.waitFor(function(){ autoConfirm(); return false; }, 15000);
    });
  }
  function startSection(key){
    if(!SECTIONS[key]){ try{ sessionStorage.removeItem(SECTION_KEY); }catch(e){} return tour.start(0); }
    try{ sessionStorage.setItem(SECTION_KEY, key); }catch(e){}
    if(hasExistingWork()) return askResetForSection(key);
    return tour.start(sectionIndex(key));
  }
  /* ── 里程進度：說明框上方 5 個圖示（上傳 → 曝光資源 → 活動頁 → 取色 → 吸底） ──
     完成的填橘色、目前的外圈發亮；看過導覽的人在開場頁可以點圖示，直接從那一段開始。 */
  var MS_KEYS = ['upload', 'exposure', 'import', 'color', 'bottom'];
  var MS_FALLBACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="6"/></svg>';
  var MS_OWN = {
    /* 取色：吸色滴管（類似 PS 吸色工具；原本選單的定位圖示中間有白點） */
    color: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>'
  };
  function msIcon(key){
    if(MS_OWN[key]) return MS_OWN[key];
    var svg = document.querySelector('#nav-rail .nav-step[data-step="' + key + '"] svg');
    return svg ? svg.outerHTML : MS_FALLBACK;
  }
  function stageOf(i){
    if(i <= 0) return -1;
    var st = 0;
    ['exposure', 'import', 'color', 'bottom'].forEach(function(k, n){ if(i >= sectionIndex(k)) st = n + 1; });
    return st;
  }
  (function(){
    var css = document.createElement('style');
    css.textContent =
      '.boda-ms{display:flex;align-items:center;margin:-2px 0 14px;}' +
      /* 連線：還沒看的段落亮、看完的變暗 */
      '.boda-ms i.ln{flex:1;height:2px;background:#8a8a96;border-radius:1px;margin:0 4px;transition:background .4s;}' +
      '.boda-ms i.ln.on{background:#3a3a44;}' +
      /* 還沒看：亮的外框和圖示 */
      '.boda-ms b{position:relative;flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
        'border:1.5px solid #c9c9d1;color:#ececf0;background:transparent;transition:all .35s;}' +
      '.boda-ms b svg{width:15px;height:15px;fill:none!important;stroke:currentColor!important;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}' +
      '.boda-ms b svg *{fill:none!important;stroke:currentColor!important;}' +
      /* 看完：變深色 */
      '.boda-ms b.done{background:#34343c;border-color:#34343c;color:#6e6e78;}' +
      /* 正在看：亮燈，橘底白圖示 */
      '.boda-ms b.cur{background:#EE4D2D;border-color:#EE4D2D;color:#fff;box-shadow:0 0 0 4px rgba(238,77,45,.25),0 0 14px rgba(238,77,45,.55);}' +
      '.boda-ms.pick b{cursor:pointer;}' +
      '.boda-ms.pick b:not(.cur):hover{border-color:#EE4D2D;color:#fff;background:#EE4D2D;transform:scale(1.12);}' +
      '.boda-ms.pick b:focus-visible{outline:2px solid #EE4D2D;outline-offset:2px;}';
    document.head.appendChild(css);
  })();
  function renderMilestones(i){
    var card = document.querySelector('.tg-card'); if(!card) return;
    var bar = card.querySelector('.boda-ms');
    if(!bar){
      bar = document.createElement('div'); bar.className = 'boda-ms';
      bar.innerHTML = MS_KEYS.map(function(k, n){
        return (n ? '<i class="ln"></i>' : '') + '<b data-k="' + k + '" role="button" tabindex="-1">' + msIcon(k) + '</b>';
      }).join('');
      bar.addEventListener('click', function(e){
        var b = e.target.closest('b[data-k]');
        if(!b || !bar.classList.contains('pick') || b.classList.contains('cur')) return;
        jumpToSection(b.getAttribute('data-k'));
      });
      card.insertBefore(bar, card.firstChild);
    }
    /* 開場頁：看過的人才可以點；導覽進行中：隨時可以點圖示跳到那一段 */
    var st = stageOf(i), pick = i === 0 ? seenBefore : true;
    bar.classList.toggle('pick', pick);
    Array.prototype.forEach.call(bar.querySelectorAll('b'), function(b, n){
      b.classList.toggle('done', n < st);
      b.classList.toggle('cur', n === st);
      var canGo = pick && n !== st;
      b.tabIndex = canGo ? 0 : -1;
      b.title = canGo ? '跳到這一段' : '';
      b.style.cursor = canGo ? 'pointer' : 'default';
    });
    Array.prototype.forEach.call(bar.querySelectorAll('i.ln'), function(l, n){ l.classList.toggle('on', n < st); });
  }
  var seenBefore = false;
  /* 開場頁點圖示：直接從那一段開始（有自己的編輯內容會先清除，示範資料在背後帶入） */
  function jumpToSection(key){
    if(key === 'upload'){ tour.go(1); return; }
    if(needReset){
      try{ sessionStorage.setItem(SECTION_KEY, key); }catch(e){}
      resetThenResume();
      return;
    }
    setControls(false);
    setCardBody('正在準備示範資料，馬上開始…');
    silentPrepare(key).then(function(){ tour.go(sectionIndex(key)); });
  }
  function demoSignFile(){
    var d = window.BODA_TOUR_DEMO;
    return d && d.sign ? b64File(d.sign, 'image/png') : null;
  }

  /* ══════════════════ 步驟（要改文字或增減步驟改這裡） ══════════════════
     有動畫的步驟：動畫演完（匯入結果出現）才出現「下一步」，讓人停下來看。 */
  var STEPS = [
    { intro: true,
      title: '歡迎使用\n活動素材製作工具-MS編輯器/BN編輯器',
      body: '只要 3 分鐘，帶你快速上手所有功能！',
      before: goUpload },

    { target: function(){ return proxy; }, place: 'right',
      title: '上傳工單',
      body: '拖入工單檔案，下方會自動列出這次需要製作的所有版位。',
      before: function(){
        if(needReset) return resetThenResume();
        return goUpload().then(function(){ spot([cardOf('#import-drop')]); });
      },
      after: function(){ clearDrop(); hold('wo', false); },
      anim: function(a){
        var before = levelText();
        if(demoMode && window.uploadImportSummary && uploadImportSummary.activity) return H.wait(300);  // 已匯入（按了上一步再回來）
        /* 1) 先蓋住活動等級、把結果藏起來，背後匯入（畫面靜止時才忙，不會卡動畫）
           2) 匯入完再演拖曳 3) 放開時一次顯示結果 */
        if(demoMode){ coverLevel(before); hold('wo', true); }
        /* 一開始就演拖曳（不用等）；放開後才在背後匯入，匯入完一次顯示結果 */
        return a.show(innerWidth - 140, 150)
          .then(function(){ return dropOnto(a, '#import-drop', '📄 ' + demoWorkOrderName(), true); })
          .then(function(){ return a.hide(); })
          .then(demoImportWorkOrder)
          .then(function(){ clearDrop(); if(demoMode) setCoverTarget(); hold('wo', false); return H.wait(250); })
          .then(function(){ return H.wait(500); });
      } },

    { target: '#upload-level', place: 'bottom',
      title: '自動帶入活動等級',
      body: '系統會根據工單內容，自動切換成對應的活動等級。',
      after: uncoverLevel,
      anim: function(){ return H.wait(600).then(rollLevel).then(function(){ return H.wait(300); }); } },

    { target: function(){ return proxy; }, place: 'left',
      title: '上傳圖片素材',
      body: '直接拖入整個圖片資料夾，下方會立刻顯示素材的配對結果。',
      before: function(){
        spot([cardOf('#import-img-drop')]);
      },
      after: function(){ clearDrop(); hold('img', false); },
      anim: function(a){
        var n = demoImageCount();
        if(demoMode && typeof uploadedImages !== 'undefined' && uploadedImages.length) return H.wait(300);
        if(demoMode) hold('img', true);
        return a.show(innerWidth - 140, 150)
          .then(function(){ return dropOnto(a, '#import-img-drop', '📁 圖片素材' + (n ? '（' + n + ' 張）' : ''), true); })
          .then(function(){ return a.hide(); })
          .then(demoImportImages)
          .then(function(){ clearDrop(); hold('img', false); return H.wait(250); })
          .then(function(){ return H.wait(500); })
          /* 結果出現、停下來看的時候，曝光資源才在背後先畫好 */
          .then(function(){ if(demoMode) prerenderExposure(true); });
      } },

    { target: function(){ return proxy; }, place: 'right', pad: 8,
      title: '開始編輯',
      body: '點擊「開始編輯」，啟動左側展開製作步驟清單。',
      before: function(){ spot([H.$('#btn-upload-start')]); },
      anim: function(a){
        var btn = H.$('#btn-upload-start');
        return a.wait(500)
          .then(function(){ return a.click(btn, { after: 300 }); })
          .then(function(){ return a.hide(); })
          .then(function(){
            /* 打亮框先移到左側（還是鎖住的樣子），停一下再解鎖 */
            spot([H.$('#nav-make-group') || H.$('#nav-rail')], true);
            return H.wait(1100);
          })
          .then(function(){
            /* 只解鎖左側步驟、先不換頁；按「完成」才進到曝光資源 */
            if(demoMode && typeof window.bodaUnlockWorkflow === 'function') window.bodaUnlockWorkflow();
            return H.wait(1200);
          });
      } },

    /* ═════════ 曝光資源 ═════════ */
    { target: function(){ return proxy; }, place: 'left',
      title: '商品自動帶入',
      body: '工單裡列出的商品圖，系統會自動幫你放進「商品區」。',
      before: function(){
        return goExposure().then(function(){ return openAcc('boda-acc-body-product'); })
          .then(function(){ var l = E$('#bn-prod-list'); if(l) l.scrollIntoView({ block: 'center' }); spot([l]); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '代言人放到人物區',
      body: '因素材功能限制，人物照與商品需要分開上傳。',
      before: function(){ spot([E$('#bn-prod-list')]); },
      anim: function(a){
        var row = prodRow('代言人照');
        if(!demoMode || !row) return H.wait(300);
        var d = window.BODA_TOUR_DEMO, photo = null;
        d.images.forEach(function(it){ if(/代言人/.test(it.name)) photo = it; });
        return clickIn(a, row.querySelector('.rm'), true, 500)
          .then(function(){ return expIdle(); })
          .then(function(){
            var sec = E$('#bn-endorser-section');
            spot(withTitle(sec), true);
            return a.wait(500);
          })
          .then(function(){ return clickIn(a, E$('#bn-endorser-photo-btn'), false, 200); })
          .then(function(){ return a.hide(); })
          .then(function(){ if(photo) setFiles(E$('#bn-endorser-photo-inp'), [b64File(photo, 'image/png')]); return expIdle(); })
          .then(function(){ return H.wait(600); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '上傳 LOGO',
      body: '拖入品牌 LOGO，所有版位都會同步套用。',
      before: function(){
        return openAcc('boda-acc-body-logo').then(function(){
          var s0 = E$('#boda-acc-body-logo'); if(s0) s0.scrollIntoView({ block: 'center' });
          spot(accParts('boda-acc-body-logo'));
        });
      },
      anim: function(a){
        var d = window.BODA_TOUR_DEMO;
        if(!demoMode || !d.logo || (E$('#bn-logo-list') && E$('#bn-logo-list').children.length)) return H.wait(300);
        return dropIn(a, E$('#bn-logo-drop'), '🏷 ' + d.logo.name)
          .then(function(){ return a.hide(); })
          .then(function(){ setFiles(E$('#bn-logo-inp'), [b64File(d.logo, d.logo.type || 'image/png')]); return expIdle(); })
          .then(function(){ return H.wait(600); });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '選背景圖',
      body: '到背景圖庫挑喜歡的視覺，各版位就會自動套用。',
      before: function(){
        return openAcc('boda-acc-body-bg').then(function(){
          var b = E$('#boda-acc-body-bg'); if(b) b.scrollIntoView({ block: 'center' });
          spot(accParts('boda-acc-body-bg'));
        });
      },
      after: function(){
        document.documentElement.classList.remove('boda-tour-card-up');
        var m = E$('#bnBgLibModal'); var c = m && m.classList.contains('open') && m.querySelector('.bn-bglib-close');
        if(c) c.click();
      },
      anim: function(a){
        if(!demoMode) return H.wait(300);
        return clickIn(a, E$('#bn-bg-open-btn'), true, 500)
          .then(function(){ return H.waitFor(function(){ var m = E$('#bnBgLibModal'); return m && m.classList.contains('open') && m.querySelector('.bn-bglib-card'); }, 8000); })
          .then(function(){
            var m = E$('#bnBgLibModal .bn-bglib-modal');
            document.documentElement.classList.add('boda-tour-card-up');   /* 說明框往上，不擋「套用」 */
            spot([m], true);
            return a.wait(700);
          })
          /* 先選一個類別（EL），清單只剩這類，再點第一張 */
          .then(function(){
            var chip = null;
            var chips = expDoc() ? expDoc().querySelectorAll('#bnBgLibModal .bn-bglib-filter-cat .bn-bglib-chip') : [];
            for(var i = 0; i < chips.length; i++){ if(/^\s*EL\b/.test(chips[i].textContent)){ chip = chips[i]; break; } }
            if(!chip && chips.length > 1) chip = chips[1];
            return clickIn(a, chip, true, 700);
          })
          .then(function(){ return clickIn(a, E$('#bnBgLibModal .bn-bglib-card'), true, 500); })
          .then(function(){ return clickIn(a, E$('#bnBgLibModal .bn-bglib-apply'), true, 400); })
          .then(function(){ document.documentElement.classList.remove('boda-tour-card-up'); return a.hide(); })
          .then(function(){ return expIdle(); })
          .then(function(){
            /* 套用後打亮第一張版位，看背景換好的樣子 */
            var first = expDoc() && expDoc().querySelector('.preview-block');
            if(first) try{ first.scrollIntoView({ block: 'start' }); }catch(e){}
            spot([first || E$('#boda-acc-body-bg')], true);
            return H.wait(800);
          });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '商品編輯',
      body: '直接在畫布上拖曳移動、拉動四角縮放。',
      before: function(){
        var blk = firstEndorserBlock();
        if(blk) try{ blk.block.scrollIntoView({ block: 'start' }); }catch(e){}
        return H.wait(300).then(function(){ spot([blk ? blk.block : null], true); });
      },
      anim: function(a){
        var blk = firstEndorserBlock();
        if(!demoMode || !blk) return H.wait(300);
        var isDD = /ddcard/i.test((blk.block.querySelector('.pname') || {}).textContent || '');
        return (isDD ? arrangeDDCard(a, blk) : dragPersonLeft(a, blk)).then(function(){ return a.hide(); }).then(function(){ return expIdle(); })
          .then(function(){ return H.wait(500); });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '完成的版位被重新修改時，會出現警示',
      body: '建議選「僅套用至未完成版位」，避免已完成的版位連動調整，其他版位也能繼續連動。',
      before: function(){
        var dlg = E$('#boda-link-ask');
        if(dlg){ spot([dlg.firstElementChild || dlg]); return; }
        var blk = hbnBlock();
        if(!blk){ spot([null]); return; }
        try{ blk.block.scrollIntoView({ block: 'center' }); }catch(e){}
        /* 說明框和警示視窗一起出現：先在 HBN 上按一下打開警示 */
        return H.wait(400).then(function(){
          if(demoMode){
            var win = blk.doc.defaultView, br = blk.box.getBoundingClientRect();
            var x = br.left + br.width / 2, y = br.top + Math.min(br.height / 2, 40);
            ['pointerdown', 'pointerup'].forEach(function(t){
              try{ blk.box.dispatchEvent(new win.PointerEvent(t, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: t === 'pointerdown' ? 1 : 0, isPrimary: true })); }catch(e){}
            });
          }
          return H.waitFor(function(){ return E$('#boda-link-ask'); }, 2500);
        }).then(function(d){ spot([d ? (d.firstElementChild || d) : blk.block]); });
      },
      /* 先讓人看完說明，按「下一步」後才示範按「僅套用至未完成版位」 */ },

    { target: function(){ return proxy; }, place: 'left',
      title: '連動編輯',
      body: '連動的版位將會同步修改素材。',
      before: function(){
        var dlg = E$('#boda-link-ask');
        if(dlg){ spot([dlg.firstElementChild || dlg]); return; }
        var blk = hbnBlock(); spot([blk ? blk.block : null]);
      },
      anim: function(a){
        var blk = hbnBlock();
        if(!demoMode || !blk) return H.wait(300);
        var dlg = E$('#boda-link-ask');
        return (dlg ? a.wait(300).then(function(){ return clickIn(a, dlg.querySelector('[data-v="prev"]'), true, 500); }) : a.wait(300))
          .then(function(){ blk = hbnBlock() || blk; spot([blk.block], true); return a.wait(400); })
          .then(function(){ return arrangeLayout(a, blk, ARRANGE.hbn); })
          .then(function(){ return a.hide(); })
          .then(function(){ return expIdle(); })
          .then(function(){ return H.wait(400); });
      } },

    /* ── SCBN：三步，打亮範圍與說明框都固定在版位下方，不擋右側背景面板 ── */
    { target: function(){ return proxy; }, place: 'bottom',
      title: '特殊版位先取消連動',
      body: '遇到像 SCBN 這類特殊版位，請先點擊右上角「取消連動」，再進行個別微調。',
      before: function(){
        var d = expDoc(), b = null;
        if(d) Array.prototype.forEach.call(d.querySelectorAll('.preview-block'), function(x){ if(!b && /SCBN/i.test((x.querySelector('.pname') || {}).textContent || '')) b = x; });
        if(b) try{ b.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(e){}
        return H.wait(700).then(function(){ return H.waitFor(function(){ return blockByName(/SCBN/i); }, 8000); })
          .then(function(){ var blk = blockByName(/SCBN/i); spot([blk ? blk.block : b]); });
      },
      anim: function(a){
        var blk = blockByName(/SCBN/i);
        if(!demoMode || !blk) return H.wait(300);
        var btn = blk.block.querySelector('.bn-layout-lock');
        if(!btn || !btn.classList.contains('is-linked')) return H.wait(300);
        return a.wait(500).then(function(){ return clickIn(a, btn, true, 600); }).then(function(){ return a.hide(); });
      } },

    { target: function(){ return proxy; }, place: 'bottom',
      title: '調整背景圖',
      body: '調整右側的背景面板，點擊方向箭頭就能移動底圖位置。',
      before: function(){
        var blk = blockByName(/SCBN/i); if(!blk){ spot([null]); return; }
        var win = blk.block.ownerDocument.defaultView;
        blk.block.dispatchEvent(new win.MouseEvent('mouseenter'));
        return H.waitFor(function(){ var pn = blk.block.querySelector('.bn-bg-panel'); return pn && H.visible(pn) && pn; }, 3000)
          .then(function(pn){ spot([blk.block, pn || null]); });
      },
      after: function(){ var blk = blockByName(/SCBN/i); if(blk) blk.block.dispatchEvent(new (blk.block.ownerDocument.defaultView.MouseEvent)('mouseleave')); },
      anim: function(a){
        var blk = blockByName(/SCBN/i);
        if(!demoMode || !blk) return H.wait(300);
        return adjustBg(a, blk, BG_FIX.scbn).then(function(){ return a.hide(); }).then(function(){ return H.wait(300); });
      } },

    { target: function(){ return proxy; }, place: 'bottom',
      title: '商品編輯',
      body: '直接在畫布上拖曳移動、拉動四角縮放。',
      before: function(){ var blk = blockByName(/SCBN/i); spot([blk ? blk.block : null]); },
      anim: function(a){
        var blk = blockByName(/SCBN/i);
        if(!demoMode || !blk) return H.wait(300);
        return a.wait(300)
          .then(function(){ return arrangeLayout(a, blk, ARRANGE.scbn); })
          .then(function(){ return a.hide(); })
          /* LPBN PC／APP 不示範，在背後直接排好（照 Iona 的完成圖） */
          .then(function(){ return arrangeSilently([/LPBN_PC橫/i, /LPBN_APP橫/i]); })
          .then(function(){ return expIdle(); })
          .then(function(){ return H.wait(400); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '確認完成',
      body: '按下「曝光資源完成」，左側清單會打勾，頁面跳轉「活動頁」。',
      before: function(){
        var btn = E$('#boda-exposure-done-btn');
        if(btn) try{ btn.scrollIntoView({ block: 'nearest' }); }catch(e){}
        spot([btn], true);
      },
      anim: function(a){
        var btn = E$('#boda-exposure-done-btn');
        if(!demoMode || !btn) return H.wait(300);
        return a.wait(500)
          .then(function(){ return clickIn(a, btn, false, 300); })
          .then(function(){ return a.hide(); })
          .then(function(){
            /* 先標成完成，打亮左側「曝光資源」看到打勾，再換到活動頁 */
            if(typeof setWorkflowStepStatus === 'function') setWorkflowStepStatus('exposure', 'done');
            spot([document.querySelector('#nav-rail .nav-step[data-step="exposure"]')], true);
            celebrate('曝光資源完成！');
            return H.wait(1500);
          })
          .then(function(){
            if(typeof finishCurrentWorkflowStep === 'function' && currentView() === 'exposure') finishCurrentWorkflowStep('done');
            return H.wait(600);
          })
          .then(function(){
            spot([document.querySelector('#nav-rail .nav-step[data-step="import"]')], true);
            return H.wait(900);
          });
      } },
    /* ═════════ 活動頁資源 ═════════ */
    { target: function(){ return proxy; }, place: 'left',
      title: '商品圖自動套入',
      body: '工單帶入的商品圖會自動放進對應版位中。',
      before: function(){
        return goImport().then(function(){
          var c = document.getElementById('import-canvas-main');
          if(c) try{ c.scrollTop = 0; }catch(e){}
          var s0 = impSlot(0); if(s0) try{ s0.scrollIntoView({ block: 'start' }); }catch(e){}
          return H.wait(300);
        }).then(function(){ spot([H.$('#import-canvas-area')], true); });
      } },

    { target: function(){ return proxy; }, place: 'bottom',
      title: '超規警示',
      body: '文字超過版位上限時會出現紅字提醒，需精簡後再下載。',
      before: function(){
        return showSlot(2).then(function(){
          spot([impSlot(2), document.querySelector('#imp-text-limit-layer .bn-text-limit-bubble')], true);
        });
      },
      anim: function(a){
        var el = impSlot(2) && impSlot(2).querySelector('[data-field="name"]');
        if(!demoMode || !el || (el.innerText || '').indexOf('/餅乾') < 0) return H.wait(300);
        /* 先看一下紅字，再刪掉「/餅乾」讓紅字消失 */
        return a.wait(1500).then(function(){ return impDeleteText(a, el, '/餅乾', 3); })
          .then(function(){ spot([impSlot(2)], true); return a.hide(); })
          .then(function(){ return H.wait(400); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '調整配色',
      body: '打開右側「顏色」欄位編輯，所有版位都會同步更新。',
      before: function(){
        var sec = H.$('#import-color-section');
        if(sec) try{ sec.scrollIntoView({ block: 'nearest' }); }catch(e){}
        return H.wait(300).then(function(){ spot([H.$('#import-color-head')], true); });
      },
      anim: function(a){
        if(!demoMode) return H.wait(300);
        var head = H.$('#import-color-head'), sec = H.$('#import-color-section');
        function typeRow(key, val){
          var row = colorRow(key);
          if(!row) return Promise.resolve();
          try{ row.scrollIntoView({ block: 'nearest' }); }catch(e){}
          spot([row], true);
          return a.wait(450).then(function(){ return a.type(row.querySelector('.icc-hex'), val, { speed: 110 }); })
            .then(function(){ var h = colorRow(key) && colorRow(key).querySelector('.icc-hex'); if(h) h.blur(); return a.wait(800); });
        }
        var open = sec && sec.classList.contains('is-open') ? a.wait(300) : a.wait(400).then(function(){ return a.click(head, { real: true, after: 500 }); });
        return open
          .then(function(){ return typeRow('promoBg', '#d07c06'); })     /* 促標底色 */
          .then(function(){ return typeRow('promoText', '#ffffff'); })   /* 往下一格：促標字色 */
          .then(function(){ spot([colorRow('promoBg'), colorRow('promoText')], true); return a.hide(); })
          .then(function(){ return H.wait(300); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '特殊狀況-上傳簽名檔1',
      body: '簽名檔請從指定欄位上傳。',
      before: function(){
        return showSlot(4, true).then(function(){ return H.wait(300); }).then(function(){
          var g = signToolRow(); if(g) try{ g.scrollIntoView({ block: 'center' }); }catch(e){}
          return H.wait(250);
        }).then(function(){ spot([signToolRow()], true); });
      },
      anim: function(a){
        var g = signToolRow(), f = demoSignFile();
        if(!demoMode || !g || !f || typeof applyPickedImportFieldImage !== 'function') return H.wait(300);
        var btn = Array.prototype.filter.call(g.querySelectorAll('button'), function(b){ return /補圖|新增|換圖/.test(b.textContent); })[0] || g;
        return a.wait(500)
          .then(function(){ return a.click(btn, { after: 200 }); })
          .then(function(){
            /* 示範時不開檔案視窗，直接放入示範簽名檔 */
            window.importFieldPickTarget = { idx: 4, key: 'signImg', imageIndex: 0, ctxName: 'import', append: false };
            applyPickedImportFieldImage(f);
            return H.waitFor(function(){ var s = msbnSlot(); return s && s.querySelector('[data-img-field="signImg"] img'); }, 6000);
          })
          .then(function(){ return H.wait(500); })
          .then(function(){
            /* 停在右側欄位：簽名那一列已有圖 */
            var g2 = signToolRow(); if(g2) try{ g2.scrollIntoView({ block: 'nearest' }); }catch(e){}
            spot([g2], true); return a.hide();
          })
          .then(function(){ return H.wait(900); });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '特殊狀況-上傳簽名檔2',
      body: '簽名檔上傳後，系統會自動開啟代言人文案的輸入框。',
      before: function(){
        return showSlot(4).then(function(){ spot([msbnSlot()], true); });
      },
      anim: function(a){
        var s = msbnSlot(), note = s && s.querySelector('[data-field="signNote"]');
        if(!demoMode || !note) return H.wait(300);
        var typed = (note.innerText || '').trim() ? a.wait(300)
          : a.wait(400).then(function(){ return typeEditable(a, note, '品牌代言人 黃沐妍'); });
        /* 2026-11-16：原「微調素材排版」併進這一步，只演動作、不另外出說明框 */
        return typed.then(function(){ return arrangeMsbn2(a); })
          .then(function(){ return a.hide(); });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '特殊狀況-調整圖片前後順序',
      body: '到右側圖層清單按「↑」，就能把圖層往上移一層。',
      before: function(){
        /* 這張先直接排好（不播動畫），只示範前後順序 */
        return showSlot(5, true).then(function(){
          var s5 = impSlot(5), imgs = prodImgs(s5), A = IMP_ARRANGE.msbn3;
          if(!demoMode || imgs.length < 2 || s5.__bodaTourArranged) return;
          s5.__bodaTourArranged = true;
          return impPlaceImg(QA(), s5, imgs[0], A.bag)
            .then(function(){ return impPlaceImg(QA(), s5, imgs[1], A.chara); })
            .then(function(){ impDeselect(); return H.wait(300); });
        }).then(function(){ spot([impSlot(5)], true); });
      },
      anim: function(a){
        var s5 = impSlot(5), imgs = prodImgs(s5);
        var c = toolCol(5), row = c && c.querySelector('.import-image-tool-row[data-key="productImg"][data-image-index="1"]');
        var btn = row && Array.prototype.filter.call(row.querySelectorAll('button'), function(b){ return /往前一層/.test(b.title || ''); })[0];
        if(!demoMode || !btn || btn.disabled || !imgs[0]) return H.wait(300);
        return a.wait(400)
          /* 1) 框選商品袋：看到它的陰影壓在角色上 */
          .then(function(){ return impSelect(a, imgs[0]); })
          .then(function(){ var o = impOverlay(); spot([impSlot(5)], true); return a.wait(1400); })
          /* 2) 到右側清單，角色那一列按 ↑ */
          .then(function(){
            var g = row.closest('.import-image-tool-group') || row;
            try{ g.scrollIntoView({ block: 'nearest' }); }catch(e){}
            spot([g], true);
            return a.wait(500);
          })
          .then(function(){ return a.click(btn, { real: true, after: 300 }); })
          .then(function(){ impDeselect(); return a.hide(); })
          /* 按完會重畫畫布與右側清單：等重畫完、捲回這一格，再重新打亮（舊的元素已被換掉） */
          .then(function(){ return H.wait(900); })
          .then(function(){ return showSlot(5, true); })
          .then(function(){ spot([impSlot(5)], true); return H.wait(800); });
      } },

    { target: function(){ return proxy; }, place: 'top',
      title: '特殊狀況-圓標移除',
      body: '圓標沒有文字時，底色會自動隱藏（按「＋」可隨時加回來）。',
      before: function(){
        if(typeof unlockImportCol === 'function') try{ unlockImportCol(); }catch(e){}
        var last = impSlot(8);
        if(last) try{ last.scrollIntoView({ block: 'end' }); }catch(e){}
        return H.wait(500).then(function(){ spot([impSlot(8)], true); });
      },
      anim: function(a){
        var s = impSlot(8), el = s && s.querySelector('[data-field="badge3"]');
        if(!demoMode || !el || !(el.innerText || '').trim()) return H.wait(300);
        return a.wait(400).then(function(){ return impDeleteText(a, el, null, null); })
          .then(function(){
            /* 「＋」出現的位置：游標移過去指一下 */
            var s2 = impSlot(8), plus = s2 && Array.prototype.filter.call(s2.querySelectorAll('button, [role="button"]'), function(b){ return /＋|\+/.test(b.textContent) && b.offsetParent; }).pop();
            if(!plus) return a.wait(300);
            var r = plus.getBoundingClientRect();
            return a.move(r.left + r.width / 2, r.top + r.height / 2, 700).then(function(){ return a.wait(900); });
          })
          .then(function(){
            /* 圓標拿掉後空間變大：把右邊商品拉大 */
            var s3 = impSlot(8), img = s3 && s3.querySelector('[data-img-field="productImg3"] img');
            return img ? impPlaceImg(a, s3, img, IMP_ARRANGE.msbn3p.right) : null;
          })
          .then(function(){ impDeselect(); return a.hide(); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '確認完成',
      body: '按下「活動頁完成」，左側清單打勾，繼續製作「活動頁面配色」。',
      before: function(){
        var btn = H.$('#boda-import-done-btn');
        if(btn) try{ btn.scrollIntoView({ block: 'nearest' }); }catch(e){}
        spot([btn], true);
      },
      anim: function(a){
        var btn = H.$('#boda-import-done-btn');
        if(!demoMode || !btn) return H.wait(300);
        return a.wait(500)
          .then(function(){ return a.click(btn, { after: 300 }); })
          .then(function(){ return a.hide(); })
          .then(function(){
            if(typeof setWorkflowStepStatus === 'function') setWorkflowStepStatus('import', 'done');
            spot([document.querySelector('#nav-rail .nav-step[data-step="import"]')], true);
            celebrate('活動頁完成！');
            return H.wait(1500);
          })
          .then(function(){
            if(typeof finishCurrentWorkflowStep === 'function' && currentView() === 'import') finishCurrentWorkflowStep('done');
            return H.wait(800);
          })
          .then(function(){
            spot([document.querySelector('#nav-rail .nav-step[data-step="color"]')], true);
            return H.wait(900);
          });
      } },

    /* ═════════ 取色工具 ═════════ */
    { target: function(){ return proxy; }, place: 'left',
      title: '活動頁面配色',
      body: '這裡會顯示設計完成的配色結果，簡單瀏覽確認即可。',
      before: function(){
        return goStep('color').then(function(){ return H.waitFor(function(){ return C$('#simRoles .role[data-key="ctabg"]'); }, 15000); })
          .then(function(){ return H.wait(400); })
          .then(function(){ spot([H.$('#color-wrap')], true); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '確認完成',
      body: '按下「取色工具完成」，左側清單打勾，繼續製作「吸底」。',
      before: function(){
        var b = C$('#bodaColorDone');
        if(b) try{ b.scrollIntoView({ block: 'nearest' }); }catch(e){}
        return H.wait(200).then(function(){ spot([b], true); });
      },
      anim: function(a){
        var b = C$('#bodaColorDone');
        if(!demoMode || !b) return H.wait(300);
        return a.wait(400).then(function(){ return clickIn(a, b, false, 300); })
          .then(function(){ return a.hide(); })
          .then(function(){
            if(typeof setWorkflowStepStatus === 'function') setWorkflowStepStatus('color', 'done');
            spot([railStep('color')], true);
            celebrate('取色工具完成！');
            return H.wait(1300);
          });
      } },

    /* ═════════ 吸底工具 ═════════ */
    { target: function(){ return proxy; }, place: 'left',
      title: '編輯吸底',
      body: '工單上的吸底文字已經自動帶入，依照對應的版位上傳 icon。',
      before: function(){
        return goStep('bottom').then(bottomReady)
          .then(function(){ spot([H.$('#view-bottom')], true); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '上傳素材',
      body: '上傳素材提供 icon 跟 Logo 選項，請依照素材屬性選擇。',
      before: function(){
        return bottomReady().then(function(){
          var c = bCard(1); if(c) try{ c.scrollIntoView({ block: 'nearest' }); }catch(e){}
          return H.wait(250).then(function(){ spot([c], true); });
        });
      },
      anim: function(a){
        var c = bCard(1), d = window.BODA_TOUR_DEMO, inp = c && c.querySelector('input[type=file]');
        var up = c && Array.prototype.filter.call(c.querySelectorAll('button'), function(b){ return /上傳/.test(b.textContent); })[0];
        if(!demoMode || !inp || !d || !d.bottomIcon) return H.wait(300);
        return a.wait(400).then(function(){ return clickIn(a, up, false, 300); })
          .then(function(){
            /* 示範時不開檔案視窗，直接放入示範 icon */
            setFiles(inp, [b64File(d.bottomIcon, 'image/png')]);
            return H.waitFor(function(){ return bBtn(/加為一般 icon/); }, 4000);
          })
          .then(function(btn){
            if(!btn) return;
            spot([bCard(1)], true);
            return a.wait(900).then(function(){ return clickIn(a, btn, true, 900); });
          })
          .then(function(){ spot([bCard(1)], true); return a.hide(); })
          .then(function(){ return H.wait(400); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '從資料庫選素材',
      body: '提供內建資料庫挑選常用 icon。',
      before: function(){
        var c = bCard(2); if(c) try{ c.scrollIntoView({ block: 'nearest' }); }catch(e){}
        return H.wait(250).then(function(){ spot([c], true); });
      },
      anim: function(a){
        if(!demoMode || !bCard(2)) return H.wait(300);
        var picks = ['dunbbell', 'new badge', 'fire'], ch = a.wait(300);
        picks.forEach(function(name, k){
          ch = ch.then(function(){ return pickBottomIcon(a, k + 2, name); });
        });
        return ch.then(function(){ var bp = B$('#panel'); spot([B$('#stage-wrap') || bp], true); return a.hide(); })
          .then(function(){ return H.wait(800); })
          /* 吸底都設定好了：趁看說明的時候，在背後先把整包下載的圖片準備好 */
          .then(function(){ prebuildPackage(); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '確認完成',
      body: '按下「吸底完成」，若所有項目皆已完成，系統會詢問是否要整包下載。',
      before: function(){
        var b = B$('#boda-bottom-done-btn');
        if(b) try{ b.scrollIntoView({ block: 'nearest' }); }catch(e){}
        return H.wait(200).then(function(){ spot([b], true); });
      },
      anim: function(a){
        var b = B$('#boda-bottom-done-btn');
        if(!demoMode || !b) return H.wait(300);
        prebuildPackage();
        return a.wait(400).then(function(){ return clickIn(a, b, true, 300); })
          .then(function(){ celebrate(); return H.wait(1600); })
          .then(function(){ return H.waitFor(function(){ return H.$('#boda-choice-dialog'); }, 5000); })
          .then(function(dlg){
            if(!dlg) return;
            spot([dlg.querySelector('.bcd-panel') || dlg], true);
            return a.wait(2200).then(function(){ return clickIn(a, dlg.querySelector('[data-v="1"]'), false, 300); })
              .then(function(){
                /* 圖片已在背後準備好：關掉詢問視窗，直接打開檢查視窗（不重新產生） */
                var c = dlg.querySelector('[data-v="0"]'); if(c) c.click();
              });
          })
          .then(function(){ return a.hide(); })
          .then(function(){
            spot([H.$('#nav-rail')], true);
            var stop = showBuildProgress();
            return prebuildPackage().then(function(bundle){ stop(); openPackagePreview(bundle); }, function(){ stop(); });
          })
          .then(function(){ return H.waitFor(function(){ return H.$('#boda-dl-preview .bdp-panel'); }, 10000); })
          .then(function(p){
            if(p) spot([p], true);
            setCardBody('所有要下載的內容，都可以在這裡預覽。');
            return H.wait(400);
          });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '確認完成',
      body: '點擊圖片逐張檢查，確認沒問題就按下「確認下載 ZIP」。',
      before: function(){
        if(!H.$('#boda-dl-preview') && demoMode) prebuildPackage().then(openPackagePreview);
        return H.waitFor(function(){ return H.$('#boda-dl-preview .bdp-panel'); }, 180000)
          .then(function(p){ spot([p], true); });
      },
      anim: function(a){
        var pnl = H.$('#boda-dl-preview .bdp-panel');
        if(!demoMode || !pnl) return H.wait(300);
        var fig = pnl.querySelector('figure');
        return a.wait(600)
          .then(function(){ return fig ? clickIn(a, fig, true, 500) : null; })
          .then(function(){
            var box = H.$('#boda-dl-lightbox');
            if(!box) return;
            spot([box], true);
            return a.wait(1200)
              .then(function(){ return clickIn(a, box.querySelector('.bdl-next'), true, 1000); })
              .then(function(){ return clickIn(a, box.querySelector('.bdl-next'), true, 1000); })
              .then(function(){ return clickIn(a, box.querySelector('.bdl-close'), true, 400); });
          })
          .then(function(){
            var ok = H.$('#boda-dl-preview [data-v="1"]');
            spot([ok], true);
            /* 示範只指一下，不真的下載 */
            return a.wait(500).then(function(){ return ok ? clickIn(a, ok, false, 400) : null; });
          })
          .then(function(){ return a.hide(); });
      } },

    { target: function(){ return proxy; }, place: 'right',
      title: '導覽結束',
      body: '<span style="font-size:12px;opacity:.8">隨時想複習，只要點擊左下角「教學」→「導覽」，就能重新播放這份說明。</span>',
      before: function(){
        try{ var lb = document.querySelector('#boda-dl-lightbox .bdl-close'); if(lb) lb.click(); }catch(e){}
        /* 停在下載檢查畫面，打亮「教學」 */
        return H.wait(300).then(function(){ spot([launchBtn()], true); });
      },
      anim: function(){ return H.wait(250).then(function(){ celebrate('恭喜完成導覽！', true); return H.wait(1800); }); } }
  ];


  /* ══════════════════ 動畫演完才出現按鈕 ══════════════════ */
  var controlsHidden = false;
  function setControls(show){
    controlsHidden = !show;
    ['.tg-next', '.tg-prev'].forEach(function(sel){
      var b = document.querySelector(sel);
      if(b) b.style.visibility = show ? '' : 'hidden';
    });
    if(show){
      var next = document.querySelector('.tg-next');
      if(next) try{ next.focus({ preventScroll: true }); }catch(e){}
    }
  }
  function motionOff(){
    try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; }
  }
  STEPS.forEach(function(step){
    if(!step.anim) return;
    var play = step.anim;
    step.animOnce = true;
    step.anim = function(a, t){
      return Promise.resolve().then(function(){ return play(a, t); }).then(function(){
        setControls(true);
        return a.hide();
      }, function(e){
        if(!e || !e.tourAbort) setControls(true);
        throw e;
      });
    };
  });

  /* ══════════════════ 開始與結束 ══════════════════ */
  /* 遮罩淡一點；開場那一步更淡 */
  (function(){
    var st = document.createElement('style');
    st.textContent = 'html.boda-tour-on #app-loading{opacity:0!important;visibility:hidden!important;}' +
      /* 先在背後匯入（畫面先維持「還沒上傳」的樣子），拖曳動畫演完才一次顯示結果：
         匯入時主執行緒會忙一下，放在動畫之前就不會讓游標、打亮框卡頓 */
      'html.boda-tour-hold-wo #view-upload #import-drop.is-done,html.boda-tour-hold-img #view-upload #import-img-drop.is-done{border-style:dashed;border-color:var(--border-strong);background:#fbfcfc;}' +
      'html.boda-tour-hold-wo #view-upload #import-drop.is-done::before,html.boda-tour-hold-img #view-upload #import-img-drop.is-done::before{display:none;}' +
      'html.boda-tour-hold-wo #import-drop .up-done-text,html.boda-tour-hold-img #import-img-drop .up-done-text{display:none;}' +
      'html.boda-tour-hold-wo #view-upload #btn-upload-start{opacity:.4;}' +
      'html.boda-tour-hold-wo #import-log,html.boda-tour-hold-wo #upload-exposure-status,html.boda-tour-hold-img #upload-img-status{display:none!important;}' +
      'html.boda-tour-on #view-upload #import-drop .up-done-text,html.boda-tour-on #view-upload #import-img-drop .up-done-text{animation:bodaTourFadeUp .45s ease both;}' +
      '@keyframes bodaTourFadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}' +
      'html.boda-tour-on #import-log>*,html.boda-tour-on #upload-exposure-status:not([hidden]),' +
      'html.boda-tour-on #upload-img-status>*{animation:bodaTourFadeUp .45s ease both;}' +
      'html.boda-tour-on #nav-make-group .nav-step,html.boda-tour-on #nav-make-group .nav-step *{transition:opacity .6s ease,color .6s ease,background-color .6s ease,filter .6s ease!important;}' +
      /* 曝光資源預先在背後畫好：透明、點不到、疊在首頁後面，切過去時畫布已經載入完成 */
      '#view-exposure.boda-tour-prerender{display:block!important;position:fixed!important;inset:0!important;' +
      'opacity:0!important;pointer-events:none!important;z-index:-1!important;}' +
      '.tg-root{--tg-backdrop:rgba(18,24,28,.45)!important;}' +
      '.tg-root:has(.tg-card.tg-intro){--tg-backdrop:rgba(18,24,28,.22)!important;}' +
      'html.boda-tour-card-up .tg-card{margin-top:-160px!important;}' +
      /* 開場標題較長：只在空格、「-」、「/」處換行，不把「編輯器」拆開 */
      '.tg-card.tg-intro .tg-title{word-break:keep-all;white-space:pre-line;}' +
      'html.boda-tour-autoreset #boda-choice-dialog{opacity:0!important;}';
    document.head.appendChild(st);
  })();
  var tour = TourGuide.create({
    storageKey: TOUR_KEY,
    autoStart: false,              // 等工具載完才開始，見下面
    forceParam: null,
    launchButton: {
      container: '#nav-rail',
      className: 'boda-tour-launch',
      prepend: false,
      html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 8.5a2.5 2.5 0 0 1 4.7 1.2c0 1.8-2.5 2-2.5 3.8M12 17h.01"/></svg><span>使用教學</span>'
    },
    theme: 'dark',
    accent: '#EE4D2D',
    zIndex: 2147480000,            // 工具的 loading、彈窗層級很高，導覽要在最上面
    steps: STEPS,
    onStart: function(){
      /* 導覽中不顯示 Loading 遮罩（匯入照常在背景跑，步驟會等它跑完才出現「下一步」） */
      document.documentElement.classList.add('boda-tour-on');
      startView = currentView();
      var resumed = false, section = '';
      try{ resumed = sessionStorage.getItem(RESUME_KEY) === '1'; sessionStorage.removeItem(RESUME_KEY); }catch(e){}
      try{ section = sessionStorage.getItem(SECTION_KEY) || ''; sessionStorage.removeItem(SECTION_KEY); }catch(e){}
      /* 只看某一段：先在背後匯入示範工單與圖片，再從那一段開始 */
      if(section && SECTIONS[section]){
        needReset = false; demoMode = true;
        return loadDemoData().then(function(d){
          if(!d){ demoMode = false; return; }
          return silentPrepare(section);
        });
      }
      /* 有編輯中的內容：開場先說明會清除，按「開始導覽」才重置；按「先不用」什麼都不動 */
      needReset = !resumed && hasExistingWork();
      seenBefore = tour.hasSeen() && !/[?&]tour=first\b/.test(location.search);
      STEPS[0].body = (needReset
        ? '示範會先清除目前網頁上的內容，再匯入示範工單。<br>要保留的話，請先下載暫存檔。'
        : '只要 3 分鐘，帶你快速上手所有功能！');
      demoMode = true;
      return loadDemoData().then(function(d){ if(!d){ demoMode = false; needReset = false; } });
    },
    onStep: function(i, step){
      renderMilestones(i);
      document.querySelector('.tg-next').disabled = false;
      setControls(!(step.anim && !motionOff()));
    },
    onEnd: function(reason){
      setControls(true);
      clearDrop();
      spotOff();
      uncoverLevel();
      hold('wo', false); hold('img', false);
      closeFakePicker(); impDeselect();
      document.documentElement.classList.remove('boda-tour-card-up');
      /* 停在下載檢查視窗時結束：導覽只示範，不真的下載 */
      try{ var lb = document.querySelector('#boda-dl-lightbox .bdl-close'); if(lb) lb.click(); }catch(e){}
      try{ if(typeof unlockImportCol === 'function' && typeof IMPORT_SYNC !== 'undefined' && IMPORT_SYNC.lockedIndex >= 0) unlockImportCol(); }catch(e){}
      /* 導覽停在提醒視窗時結束：照導覽示範的選「僅套用至未完成版位」關掉 */
      try{ var ask = E$('#boda-link-ask'); if(ask){ var pv = ask.querySelector('[data-v="prev"]'); if(pv) pv.click(); } }catch(e){}
      prerenderExposure(false);
      /* Loading 遮罩：等背景工作都跑完再恢復顯示，結束時進曝光資源也不會跳出來 */
      H.wait(500).then(function(){ return H.waitFor(function(){ return !busyNow(); }, 30000); }).then(function(){
        setTimeout(function(){ document.documentElement.classList.remove('boda-tour-on'); }, 400);
      });
      if(demoTouched){ demoTouched = false; resetAfterTour(); return; }
      /* 看完最後一步按「完成」：進到曝光資源 */
      if(reason === 'done' && demoMode && currentView() === 'upload' && typeof goToWorkflowStep === 'function' && typeof uploadCanStart === 'function' && uploadCanStart()){
        if(typeof window.bodaUnlockWorkflow === 'function') window.bodaUnlockWorkflow();
        goToWorkflowStep('exposure');
        return;
      }
      if(startView && startView !== 'upload' && currentView() !== startView && typeof showView === 'function'){
        showView(startView, { skipLoading: true });
      }
    }
  });
  /* 沿用舊導覽按鈕的 id 和樣式，左側選單的排列與 loading 例外設定都不用改。
     按鈕要等頁面載完才會建立，所以也排在 DOMContentLoaded 之後。 */
  function decorateLaunch(){
    var btn = document.querySelector('[data-tour-launch]');
    if(!btn) return;
    btn.id = 'boda-tour-launch';
    btn.title = '開始 BOD 操作導覽';
    btn.setAttribute('data-skip-app-loading', '');
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorateLaunch);
  else decorateLaunch();
  window.bodaTour = tour;

  /* 鍵盤也要遵守「動畫沒演完不能換步」，要比導覽的按鍵處理更早攔下 */
  window.addEventListener('keydown', function(e){
    if(!tour.isActive()) return;
    var forward = e.key === 'ArrowRight' || e.key === 'Enter', back = e.key === 'ArrowLeft';
    if(controlsHidden && (forward || back)){
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);

  /* 第一次開啟（或網址有 ?tour）：等工具載入完成再開始 */
  var forced = /[?&]tour(=|&|$)/.test(location.search);
  var urlSection = (location.search.match(/[?&]tour=(exposure|import|color|bottom)\b/) || [])[1] || '';
  var resume = false, pendingSection = '';
  try{ resume = sessionStorage.getItem(RESUME_KEY) === '1'; }catch(e){}
  try{ pendingSection = sessionStorage.getItem(SECTION_KEY) || ''; }catch(e){}
  if(urlSection && !pendingSection){ pendingSection = urlSection; try{ sessionStorage.setItem(SECTION_KEY, urlSection); }catch(e){} }
  if(pendingSection || resume || forced || !tour.hasSeen()){
    H.waitFor(function(){ return !appBusy() && H.$('#upload-level'); }, 60000).then(function(ok){
      if(!ok) return;
      setTimeout(function(){
        if(appBusy()) return;
        if(pendingSection && SECTIONS[pendingSection]){
          /* 指定段落但有自己的編輯內容：先問、清除後再從那一段開始 */
          if(hasExistingWork() && !resume) return askResetForSection(pendingSection);
          return tour.start(sectionIndex(pendingSection));
        }
        tour.start(resume ? 1 : 0);
      }, 400);
    });
  }



})();
