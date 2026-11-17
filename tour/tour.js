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
  function dropOnto(a, zone, chip){
    var el = H.$(zone);
    return a.wait(500)
      .then(function(){ return a.drag({ x: innerWidth - 140, y: 150 }, el, { chip: chip, ms: 1000, after: 0 }); })
      .then(function(){ if(el) el.classList.add('dragover'); return a.wait(500); })
      .then(function(){ if(el) el.classList.remove('dragover'); });
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
      sc.src = scriptBase() + 'demo-data.js?v=20261115f';
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
    handleImportFile(b64File(d.xlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    return waitIdle(function(){ return window.uploadImportSummary && uploadImportSummary.activity; }, 60000);
  }
  function demoImportImages(){
    if(!demoMode || typeof handleImageFiles !== 'function') return Promise.resolve();
    var d = window.BODA_TOUR_DEMO;
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
    var f = expFrame(); if(!f) return { x: 0, y: 0 };
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
    return a.move(p0.x, p0.y, 700).then(function(){
      fire('pointerdown', sx, sy);
      return a.wait(150);
    }).then(function(){
      return a.move(p1.x, p1.y, 1000, function(cx, cy){ var q = m.inn(cx, cy); fire('pointermove', q.x, q.y); });
    }).then(function(){
      fire('pointerup', tx, ty);
      a.ripple();
      return a.wait(450);
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
    return a.move(p0.x, p0.y, 600).then(function(){ fire('pointerdown', sx, sy); return a.wait(150); })
      .then(function(){ return a.move(p1.x, p1.y, 900, function(cx, cy){ var q = m.inn(cx, cy); fire('pointermove', q.x, q.y); }); })
      .then(function(){ fire('pointerup', tx, ty); a.ripple(); return a.wait(400); });
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
  /* SCBN 底圖：示範左右移動（往左 5%，再移回來，完成圖跟預設位置一樣） */
  var BG_FIX = { scbn: { steps: [{ axis: 'x', delta: -5 }, { axis: 'x', delta: 5 }] } };
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
        spot([panel], true);
        return a.wait(700)
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
          .then(function(){ return a.wait(400); })
          .then(function(){ blk.block.dispatchEvent(new win.MouseEvent('mouseleave')); });
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
      return a.move(p.x, p.y, guard === 1 ? 450 : 150).then(function(){
        a.ripple();
        btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true, shiftKey: big }));
        return a.wait(260);
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
      var f = proxyRect, e = 0.32;
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

  /* ══════════════════ 步驟（要改文字或增減步驟改這裡） ══════════════════
     有動畫的步驟：動畫演完（匯入結果出現）才出現「下一步」，讓人停下來看。 */
  var STEPS = [
    { intro: true,
      title: '歡迎使用 活動素材製作工具 - MS編輯器',
      body: '要用示範工單，帶你走一遍嗎？',
      before: goUpload },

    { target: function(){ return proxy; }, place: 'right',
      title: '上傳工單',
      body: '拖入工單，下方會列出帶入的版位。',
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
        return a.show(innerWidth - 140, 150)
          .then(demoImportWorkOrder)
          .then(function(){ if(demoMode) setCoverTarget(); return a.wait(250); })
          .then(function(){ return dropOnto(a, '#import-drop', '📄 ' + demoWorkOrderName()); })
          .then(function(){ hold('wo', false); return a.hide(); })
          .then(function(){ return H.wait(500); });
      } },

    { target: '#upload-level', place: 'bottom',
      title: '活動等級自動帶入',
      body: '依工單的活動，自動換成對應等級。',
      after: uncoverLevel,
      anim: function(){ return H.wait(600).then(rollLevel).then(function(){ return H.wait(300); }); } },

    { target: function(){ return proxy; }, place: 'left',
      title: '放入圖片素材',
      body: '拖入圖片資料夾，下方會顯示配對結果。',
      before: function(){
        spot([cardOf('#import-img-drop')]);
      },
      after: function(){ clearDrop(); hold('img', false); },
      anim: function(a){
        var n = demoImageCount();
        if(demoMode && typeof uploadedImages !== 'undefined' && uploadedImages.length) return H.wait(300);
        if(demoMode) hold('img', true);
        return a.show(innerWidth - 140, 150)
          .then(demoImportImages)
          .then(function(){ return a.wait(250); })
          .then(function(){ return dropOnto(a, '#import-img-drop', '📁 圖片素材' + (n ? '（' + n + ' 張）' : '')); })
          .then(function(){ hold('img', false); return a.hide(); })
          .then(function(){ return H.wait(500); })
          /* 結果出現、停下來看的時候，曝光資源才在背後先畫好 */
          .then(function(){ if(demoMode) prerenderExposure(true); });
      } },

    { target: function(){ return proxy; }, place: 'right', pad: 8,
      title: '開始編輯',
      body: '按下後，左側的製作步驟就會開啟。',
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
      body: '工單列的商品圖，會自動放進商品區。',
      before: function(){
        return goExposure().then(function(){ return openAcc('boda-acc-body-product'); })
          .then(function(){ var l = E$('#bn-prod-list'); if(l) l.scrollIntoView({ block: 'center' }); spot([l]); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '代言人放到人物區',
      body: '人物照要分開放：從商品移除，改傳到人物。',
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
            spot([sec], true);
            return a.wait(500);
          })
          .then(function(){ return clickIn(a, E$('#bn-endorser-photo-btn'), false, 200); })
          .then(function(){ return a.hide(); })
          .then(function(){ if(photo) setFiles(E$('#bn-endorser-photo-inp'), [b64File(photo, 'image/png')]); return expIdle(); })
          .then(function(){ return H.wait(600); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '上傳 LOGO',
      body: '拖入品牌 LOGO，各版位會一起套用。',
      before: function(){
        return openAcc('boda-acc-body-logo').then(function(){
          var s0 = E$('#boda-acc-body-logo'); if(s0) s0.scrollIntoView({ block: 'center' });
          spot([E$('#boda-acc-body-logo')]);
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

    { target: function(){ return proxy; }, place: 'left',
      title: '選背景圖',
      body: '在背景圖庫選類別、點一張圖，各版位自動套用。',
      before: function(){
        return openAcc('boda-acc-body-bg').then(function(){
          var b = E$('#boda-acc-body-bg'); if(b) b.scrollIntoView({ block: 'center' });
          spot([E$('#boda-acc-body-bg')]);
        });
      },
      after: function(){
        var m = E$('#bnBgLibModal'); var c = m && m.classList.contains('open') && m.querySelector('.bn-bglib-close');
        if(c) c.click();
      },
      anim: function(a){
        if(!demoMode) return H.wait(300);
        return clickIn(a, E$('#bn-bg-open-btn'), true, 500)
          .then(function(){ return H.waitFor(function(){ var m = E$('#bnBgLibModal'); return m && m.classList.contains('open') && m.querySelector('.bn-bglib-card'); }, 8000); })
          .then(function(){
            var m = E$('#bnBgLibModal .bn-bglib-modal');
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
          .then(function(){ return a.hide(); })
          .then(function(){ return expIdle(); })
          .then(function(){
            /* 套用後打亮第一張版位，看背景換好的樣子 */
            var first = expDoc() && expDoc().querySelector('.preview-block');
            if(first) try{ first.scrollIntoView({ block: 'start' }); }catch(e){}
            spot([first || E$('#boda-acc-body-bg')], true);
            return H.wait(800);
          });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '拖曳調整位置',
      body: '直接在畫布上拖曳、拉角落縮放，調整人物和商品。',
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
      title: '換一張調整，會先提醒',
      body: '調過的版位還在連動時，換到別張操作會先跳出提醒，看清楚再選。',
      before: function(){
        var blk = hbnBlock();
        if(blk) try{ blk.block.scrollIntoView({ block: 'center' }); }catch(e){}
        return H.wait(400).then(function(){ spot([blk ? blk.block : null], true); });
      },
      anim: function(a){
        var blk = hbnBlock();
        if(!demoMode || !blk || E$('#boda-link-ask')) return H.wait(300);
        return a.wait(600).then(function(){ return openLinkAsk(a, blk); })
          .then(function(dlg){ if(dlg) spot([dlg.firstElementChild || dlg], true); return a.hide(); })
          .then(function(){ return H.wait(500); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '僅套用至未完成版位',
      body: '選「僅套用至未完成版位」，排好的 DD Card 不會被覆蓋，再來調 HBN。',
      before: function(){
        var dlg = E$('#boda-link-ask');
        if(dlg) spot([dlg.firstElementChild || dlg]);
        else { var blk = hbnBlock(); spot([blk ? blk.block : null]); }
      },
      anim: function(a){
        var blk = hbnBlock();
        if(!demoMode || !blk) return H.wait(300);
        var dlg = E$('#boda-link-ask');
        return (dlg ? a.wait(700).then(function(){ return clickIn(a, dlg.querySelector('[data-v="prev"]'), true, 600); }) : H.wait(100))
          .then(function(){ spot([blk.block], true); return a.wait(700); })
          .then(function(){ return arrangeLayout(a, blk, ARRANGE.hbn); })
          .then(function(){ return a.hide(); })
          .then(function(){ return expIdle(); })
          .then(function(){ return H.wait(500); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '特殊版位：先解除連動',
      body: 'SCBN 這類特殊版位，先按右上角解除連動，再調整底圖和商品位置。',
      before: function(){
        var d = expDoc(), b = null;
        if(d) Array.prototype.forEach.call(d.querySelectorAll('.preview-block'), function(x){ if(!b && /SCBN/i.test((x.querySelector('.pname') || {}).textContent || '')) b = x; });
        if(b) try{ b.scrollIntoView({ block: 'center', behavior: 'smooth' }); }catch(e){}
        return H.wait(700).then(function(){ return H.waitFor(function(){ return blockByName(/SCBN/i); }, 8000); })
          .then(function(){ var blk = blockByName(/SCBN/i); spot([blk ? blk.block : b], true); });
      },
      after: function(){ var blk = blockByName(/SCBN/i); if(blk) blk.block.dispatchEvent(new (blk.block.ownerDocument.defaultView.MouseEvent)('mouseleave')); },
      anim: function(a){
        var blk = blockByName(/SCBN/i);
        if(!demoMode || !blk) return H.wait(300);
        return unlinkByLock(a, blk)
          .then(function(){ return adjustBg(a, blk, BG_FIX.scbn); })
          .then(function(){ spot([blk.block], true); return a.wait(500); })
          .then(function(){ return arrangeLayout(a, blk, ARRANGE.scbn); })
          .then(function(){ return a.hide(); })
          /* LPBN PC／APP 不示範，在背後直接排好（照 Iona 的完成圖） */
          .then(function(){ return arrangeSilently([/LPBN_PC橫/i, /LPBN_APP橫/i]); })
          .then(function(){ return expIdle(); })
          .then(function(){ return H.wait(500); });
      } },

    { target: function(){ return proxy; }, place: 'left',
      title: '曝光資源完成',
      body: '都調好後，按「曝光資源完成」，左側會打勾，接著到活動頁。',
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
      } }
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
      '.tg-root:has(.tg-card.tg-intro){--tg-backdrop:rgba(18,24,28,.22)!important;}';
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
      var resumed = false;
      try{ resumed = sessionStorage.getItem(RESUME_KEY) === '1'; sessionStorage.removeItem(RESUME_KEY); }catch(e){}
      /* 有編輯中的內容：開場先說明會清除，按「開始導覽」才重置；按「先不用」什麼都不動 */
      needReset = !resumed && hasExistingWork();
      STEPS[0].body = needReset
        ? '示範會先清除目前網頁上的內容，再匯入示範工單。<br>要保留的話，請先下載暫存檔。'
        : '要用示範工單，帶你走一遍嗎？';
      demoMode = true;
      return loadDemoData().then(function(d){ if(!d){ demoMode = false; needReset = false; } });
    },
    onStep: function(i, step){
      document.querySelector('.tg-next').disabled = false;
      setControls(!(step.anim && !motionOff()));
    },
    onEnd: function(reason){
      setControls(true);
      clearDrop();
      spotOff();
      uncoverLevel();
      hold('wo', false); hold('img', false);
      /* 導覽停在提醒視窗時結束：照導覽示範的選「僅套用至未完成版位」關掉 */
      try{ var ask = E$('#boda-link-ask'); if(ask){ var pv = ask.querySelector('[data-v="prev"]'); if(pv) pv.click(); } }catch(e){}
      prerenderExposure(false);
      /* Loading 遮罩：等背景工作都跑完再恢復顯示，結束時進曝光資源也不會跳出來 */
      H.wait(500).then(function(){ return H.waitFor(function(){ return !busyNow(); }, 30000); }).then(function(){
        setTimeout(function(){ document.documentElement.classList.remove('boda-tour-on'); }, 400);
      });
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
  var resume = false;
  try{ resume = sessionStorage.getItem(RESUME_KEY) === '1'; }catch(e){}
  if(resume || forced || !tour.hasSeen()){
    H.waitFor(function(){ return !appBusy() && H.$('#upload-level'); }, 60000).then(function(ok){
      if(ok) setTimeout(function(){ if(!appBusy()) tour.start(resume ? 1 : 0); }, 400);
    });
  }

})();
