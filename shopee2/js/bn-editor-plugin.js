/*!
 * BN Editor Plugin v4
 * Logo 上傳 + 商品圖上傳（兩步驟視窗：選圖→排大小）+ 下載
 */
(function () {
  if (window.__BN_EDITOR_PLUGIN__) return;
  window.__BN_EDITOR_PLUGIN__ = true;

  var _bnEditorScriptNode=document.currentScript;
  var _bnEditorScriptBase=new URL('.',(_bnEditorScriptNode&&_bnEditorScriptNode.src)||new URL('js/bn-editor-plugin.js',document.baseURI).href).href;

  /* 版位 iframe 的量測值（畫布／背景區尺寸、背景色），由 layout-runtime 用 bn-layout-metrics 送來。
     TP 上讀不到 iframe 內容，一律用這份快取，不直接讀 iframe 的 document。 */
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.type !== 'bn-layout-metrics') return;
    var frames = document.querySelectorAll('iframe');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) { frames[i]._bnMetrics = e.data; return; }
    }
  });
  function bnFrameMetrics(ifr) { return (ifr && ifr._bnMetrics) || null; }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ══ CSS ══ */
    var style = document.createElement('style');
    style.textContent = `
.bn-section{padding:4px 14px 10px}
.bn-drop{border:1.5px dashed var(--border,#30363d);border-radius:7px;padding:9px 10px;text-align:center;cursor:pointer;transition:border-color .15s,background .15s;color:var(--text3,#6e7681);font-size:11px;position:relative}
.bn-drop:hover,.bn-drop.drag{border-color:var(--accent,#1f6feb);background:rgba(31,111,235,.06);color:var(--accent,#1f6feb)}
.bn-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-prev{width:100%;margin-top:6px;border-radius:5px;border:1px solid var(--border,#30363d);display:none;object-fit:contain;max-height:60px;background:rgba(255,255,255,.05)}
.bn-prev.show{display:block}
.bn-clr{margin-top:4px;width:100%;background:transparent;border:1px solid var(--border,#30363d);border-radius:5px;color:var(--text2,#8b949e);font-size:11px;padding:3px;cursor:pointer;transition:.12s;display:none}
.bn-clr.show{display:block}
.bn-clr:hover{border-color:var(--red,#da3633);color:var(--red,#da3633)}
.bn-prod-list{margin-top:6px;display:flex;flex-direction:column;gap:4px}
.bn-prod-item{display:flex;align-items:center;gap:6px;background:var(--bg2,#1c2333);border-radius:5px;padding:4px 7px;font-size:11px;color:var(--text2,#8b949e)}
.bn-prod-item img{width:32px;height:32px;object-fit:contain;border-radius:3px;background:rgba(255,255,255,.05)}
.bn-prod-item span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bn-prod-item button{background:transparent;border:1px solid var(--border,#30363d);border-radius:4px;color:var(--text3,#6e7681);font-size:10px;padding:2px 6px;cursor:pointer}
.bn-prod-item button:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
.bn-prod-item button.rm:hover{border-color:var(--red,#da3633);color:var(--red,#da3633)}
.bn-prod-move{display:flex;flex-direction:column;gap:2px;flex-shrink:0}
.bn-prod-move button{padding:1px 5px;font-size:10px;line-height:1.2}
#bn-prod-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed var(--border,#30363d);border-radius:7px;color:var(--text2,#8b949e);font-size:11px;cursor:pointer;text-align:center;transition:.15s;margin-bottom:2px}
#bn-prod-open-btn:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
#bn-char-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed #e2874a;border-radius:7px;color:#e2874a;font-size:11px;cursor:pointer;text-align:center;transition:.15s}
#bn-char-open-btn:hover{border-color:#e2874a;background:rgba(226,135,74,.08)}
#bn-char-open-btn.has-char{border-style:solid}
#bn-char2-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed #e2874a;border-radius:7px;color:#e2874a;font-size:11px;cursor:pointer;text-align:center;transition:.15s}
#bn-char2-open-btn:hover{border-color:#e2874a;background:rgba(226,135,74,.08)}
#bn-char2-open-btn.has-char{border-style:solid}
.bn-endorser-btns{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.bn-endorser-up{display:block;width:100%;padding:8px 4px;background:var(--bg2,#1c2333);border:1.5px dashed #a855f7;border-radius:7px;color:#c084fc;font-size:11px;cursor:pointer;text-align:center;transition:.15s}
.bn-endorser-up:hover{background:rgba(168,85,247,.08)}
.bn-endorser-up.has-img{border-style:solid}
.bn-prod-item.bn-endorser-item{border:1px solid rgba(168,85,247,.35)}
.bn-endorser-note-wrap{margin-top:8px;display:flex;flex-direction:column;gap:4px}
.bn-endorser-note-wrap label{display:flex;justify-content:space-between;gap:6px;font-size:11px;color:var(--text2,#8b949e)}
#bn-endorser-note-count{font-size:10px;color:var(--text3,#6e7681)}
#bn-endorser-note-count.over{color:var(--red,#da3633)}
.bn-endorser-note-wrap.over textarea,.bn-endorser-note-wrap.limit-flash textarea{border-color:var(--red,#da3633)!important;box-shadow:0 0 0 2px rgba(218,54,51,.25)}
#bn-endorser-note-inp{width:100%;box-sizing:border-box;resize:none;min-height:46px;padding:6px 8px;background:var(--bg2,#1c2333);border:1px solid var(--border,#30363d);border-radius:6px;color:var(--text,#e6edf3);font-size:12px;line-height:1.5;font-family:inherit}
#bn-endorser-note-inp:focus{outline:none;border-color:#a855f7}
.bn-endorser-note-color{display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text3,#6e7681)}
.bn-endorser-note-color button{background:transparent;border:1px solid var(--border,#30363d);border-radius:4px;color:var(--text3,#6e7681);font-size:10px;padding:2px 7px;cursor:pointer}
.bn-endorser-note-color button.on{border-color:#a855f7;color:#c084fc}
.bn-endorser-note-color input[type=color]{width:26px;height:20px;padding:0;border:1px solid var(--border,#30363d);border-radius:4px;background:transparent;cursor:pointer}
.bn-endorser-hint{font-size:10px;color:var(--text3,#6e7681);margin-top:6px;line-height:1.5}
.bn-endorser-hint.on{color:#c084fc}
.bn-endorser-editing .hbn-plugin-modal [data-act="shadow"]{display:none!important}
#bn-download-bar{padding:10px 14px;border-top:1px solid var(--border,#30363d);flex-shrink:0}
.bn-dl-btn{display:block;width:100%;padding:9px;background:linear-gradient(135deg,#1d4ed8,#0d47a1);border:none;border-radius:7px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:opacity .12s}
.bn-ms-terms-line{display:flex;align-items:flex-start;gap:5px;margin:0 0 7px;color:var(--text3,#8b949e);font-size:10px;line-height:1.45}
.bn-ms-terms-line input{width:13px;height:13px;margin:1px 0 0;accent-color:#ee4d2d;flex:0 0 auto}
.bn-ms-terms-line label{cursor:pointer}.bn-ms-terms-line a{color:#60a5fa;text-decoration:underline;cursor:pointer}
.bn-dl-btn:disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
.bn-dl-btn:hover{opacity:.88}
.bn-dl-btn:disabled{opacity:.35;cursor:not-allowed}
.bn-dl-progress{font-size:10px;color:var(--text3,#6e7681);text-align:center;margin-top:5px;min-height:14px}

/* ── 背景上傳 Modal ── */
#bn-bg-open-btn{display:block;width:100%;padding:8px;background:var(--bg2,#1c2333);border:1.5px dashed var(--border,#30363d);border-radius:7px;color:var(--text2,#8b949e);font-size:11px;cursor:pointer;text-align:center;transition:.15s;box-sizing:border-box}
#bn-bg-open-btn:hover{border-color:var(--accent,#1f6feb);color:var(--accent,#1f6feb)}
#bn-bg-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
#bn-bg-modal.show{display:flex}
.bn-bg-modal-box{background:#13161f;border:1px solid #252b3d;border-radius:14px;width:min(720px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}
.bn-bg-pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bn-bg-drop-card{border:1.5px dashed #252b3d;border-radius:12px;padding:14px;text-align:center;cursor:pointer;color:#687090;font-size:12px;position:relative;transition:.15s;min-height:190px;display:flex;flex-direction:column;justify-content:center;background:#0d1018}
.bn-bg-drop-card:hover,.bn-bg-drop-card.over{border-color:#4a90e2;background:rgba(74,144,226,.06);color:#4a90e2}
.bn-bg-drop-card input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-bg-drop-card img{display:none;width:100%;height:120px;object-fit:contain;border-radius:8px;margin:8px 0;background:rgba(255,255,255,.04)}
.bn-bg-drop-card.has-img img{display:block}
.bn-bg-drop-title{font-size:14px;font-weight:700;color:#dde3f0;margin-bottom:4px}
.bn-bg-drop-desc{font-size:11px;line-height:1.6;color:#687090}
.bn-bg-drop-name{font-size:10px;color:#8b9dbf;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}
.bn-bg-hint{font-size:12px;color:#8b9dbf;background:rgba(74,144,226,.08);border:1px solid rgba(74,144,226,.2);border-radius:10px;padding:9px 12px;margin-bottom:14px;line-height:1.7}
@media(max-width:640px){.bn-bg-pair-grid{grid-template-columns:1fr}.bn-bg-modal-box{width:94vw}}

/* ── 商品上傳 Modal ── */
#bn-prod-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
#bn-prod-modal.show{display:flex}
.bn-modal-box{background:#13161f;border:1px solid #252b3d;border-radius:14px;width:min(520px,94vw);max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden}
.bn-modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #252b3d}
.bn-modal-head h3{font-size:14px;font-weight:700;color:#dde3f0;margin:0}
.bn-modal-close{background:transparent;border:none;color:#687090;font-size:20px;cursor:pointer;line-height:1;padding:0}
.bn-modal-close:hover{color:#dde3f0}
.bn-modal-body{flex:1;overflow-y:auto;padding:16px 18px}
.bn-modal-foot{padding:12px 18px;border-top:1px solid #252b3d;display:flex;gap:8px;justify-content:flex-end;align-items:center}
.bn-step-tabs{display:flex;gap:8px;margin-bottom:14px}
.bn-step-tab{padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;border:1px solid #252b3d;color:#687090;background:transparent;cursor:pointer}
.bn-step-tab.on{background:#1a1e2b;color:#4a90e2;border-color:#4a90e2}
.bn-modal-drop{border:1.5px dashed #252b3d;border-radius:10px;padding:18px;text-align:center;cursor:pointer;color:#687090;font-size:12px;position:relative;transition:.15s;margin-bottom:12px}
.bn-modal-drop:hover,.bn-modal-drop.over{border-color:#4a90e2;background:rgba(74,144,226,.06);color:#4a90e2}
.bn-modal-drop input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.bn-preview-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:8px}
.bn-preview-cell{position:relative;border:1.5px solid #252b3d;border-radius:10px;overflow:hidden;background:#0d1018;cursor:pointer;transition:.15s}
.bn-preview-cell.is-hero{border-color:#4a90e2;box-shadow:0 0 0 2px rgba(74,144,226,.2)}
.bn-preview-cell img{width:100%;height:88px;object-fit:contain;padding:6px;display:block}
.bn-preview-cell .pc-name{font-size:10px;color:#687090;padding:0 6px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.bn-preview-cell .pc-hero{position:absolute;top:5px;left:5px;background:#4a90e2;color:#fff;border-radius:999px;font-size:9px;font-weight:900;padding:2px 6px}
.bn-preview-cell .pc-rm{position:absolute;top:5px;right:5px;width:20px;height:20px;border-radius:50%;background:rgba(13,16,24,.85);border:1px solid rgba(255,255,255,.15);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;z-index:2}
.bn-limit-msg{font-size:11px;text-align:center;padding:4px 0;color:#687090;margin-bottom:4px}
/* step2 rank */
.bn-rank-row{display:flex;gap:12px;align-items:flex-end;justify-content:center;min-height:140px;position:relative;padding:8px 0}
.bn-rank-card{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:grab;user-select:none;position:relative;transition:opacity .15s}
.bn-rank-card.dragging{opacity:.4}
.bn-rank-img-wrap{display:flex;align-items:flex-end;justify-content:center;position:relative}
.bn-rank-img-wrap img{object-fit:contain;width:auto;display:block}
.bn-rank-arrow{background:rgba(255,255,255,.08);border:1px solid #252b3d;color:#687090;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;position:absolute;bottom:2px;transition:.12s;z-index:2}
.bn-rank-arrow:hover{background:#1a1e2b;color:#4a90e2;border-color:#4a90e2}
.bn-rank-arrow.left-arr{left:-26px}
.bn-rank-arrow.right-arr{right:-26px}
.bn-rank-name{font-size:10px;color:#687090;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.bn-rank-tag{font-size:10px;font-weight:700;border-radius:999px;padding:2px 8px}
.bn-rank-tag.hero{background:#4a90e2;color:#fff}
.bn-rank-tag.left{background:#1a1e2b;color:#687090;border:1px solid #252b3d}
.bn-rank-tag.right{background:#1a1e2b;color:#687090;border:1px solid #252b3d}
.bn-rank-hint{font-size:11px;color:#687090;text-align:center;margin-top:6px}
.bn-drop-line{position:absolute;top:4px;bottom:4px;width:3px;background:#4a90e2;border-radius:3px;box-shadow:0 0 8px rgba(74,144,226,.7);pointer-events:none;display:none;z-index:10}
.bn-btn-skip{background:transparent;border:1px solid #252b3d;color:#687090;font-size:12px;padding:7px 14px;border-radius:7px;cursor:pointer;transition:.12s}
.bn-btn-skip:hover{border-color:#4a90e2;color:#4a90e2}
.bn-btn-confirm{background:linear-gradient(135deg,#1d4ed8,#0d47a1);border:none;color:#fff;font-size:12px;font-weight:700;padding:7px 18px;border-radius:7px;cursor:pointer;transition:opacity .12s}
.bn-btn-confirm:hover{opacity:.88}
.bn-btn-confirm:disabled{opacity:.35;cursor:not-allowed}
`;
    document.head.appendChild(style);

    /* ── 狀態 ── */
    /* logo 支援最多3張 */
    window._bnLogos = window._bnLogos || [];   /* [{id,src}] */
    window._bnLogoDataUrl = window._bnLogoDataUrl || null;  /* 向下相容：第一張 */
    /* SearchICON_LOGO 的可拖曳位置；下載暫存時會另轉成檔名鍵。 */
    window._bnLogoLayouts = window._bnLogoLayouts || {};
    var MAX_LOGOS = 3;
    window._bnProducts    = window._bnProducts    || [];
    /* 商品版位連動狀態：未記錄的版位預設為鎖定（全部連動），只有明確
       設成 false 的版位才是單獨編輯。這個 map 會由 bn-state-plugin 一起保存。 */
    window._bnProductLayoutLocks = window._bnProductLayoutLocks || {};
    var MAX_PROD = 3;
    /* 人物圖：現在最多可以上傳2張，各自可超出商品範圍/畫布。
       規則：0張人物 -> 商品最多顯示3張(原本三角排版全開)；
             1張人物 -> 商品最多顯示2張；
             2張人物 -> 商品完全不顯示。
       _bnCharacter = 人物1，_bnCharacter2 = 人物2，兩者結構完全一樣。 */
    window._bnCharacter = window._bnCharacter || null;  /* {id,src,ratio,name,layouts:{bnid:layout}} */
    window._bnCharacter2 = window._bnCharacter2 || null;
    /* 兩個人物都存在時，誰排在前面（'_bnCharacter' 或 '_bnCharacter2'）。
       只有兩個人物都存在時才有意義，這時候兩者一定緊鄰在一起、不會被商品
       插在中間（商品這時本來就完全不顯示，跟商品比前後沒有意義）。 */
    window._bnCharPairFirst = window._bnCharPairFirst || '_bnCharacter';
    /* 代言人：代言人照、簽名檔各一個欄位（結構同人物圖，另有 meta.rotate／baseSrc），
       代言人小字 {text,color,layouts:{bnid:layout}}。 */
    window._bnEndorserPhoto = window._bnEndorserPhoto || null;
    window._bnEndorserSign = window._bnEndorserSign || null;
    window._bnEndorserNote = window._bnEndorserNote || {text:'', color:'', layouts:{}};

    /* 曝光資源已移除一般人物圖上傳；保留舊訊息相容，但不計入新排版。 */
    function getCharacterCount(){ return 0; }
    function hasEndorserImage(){
      return !!(window._bnEndorserPhoto || window._bnEndorserSign);
    }
    function getEndorserImageCount(){
      return window._bnEndorserPhoto ? 1 : 0;
    }
    /* 只有代言人照占品數；簽名檔不限制商品顯示件數。 */
    function productLimitActive(){
      return getEndorserImageCount() > 0;
    }
    /* 商品與代言人照各算 1 品，合計最多 3 品；簽名檔、代言人小字不占品數。
       有代言人照時可顯示 2 件商品；只有簽名檔時仍可顯示 3 件。 */
    function getMaxProductsVisible(){
      return Math.max(0, 3 - getEndorserImageCount());
    }

    /* ── 工具 ── */
    function readFile(file){ return new Promise(function(res,rej){var r=new FileReader();r.onload=function(e){res(e.target.result);};r.onerror=rej;r.readAsDataURL(file);}); }
    function loadImg(src){ return new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i);};i.onerror=rej;i.src=src;}); }
    /* 動態載入 script 只做一次：避免使用者快速連點（例如連按兩次「編輯Logo」）
       在第一支 script 還沒 onload 完成前，window.BNLogoMenu/HBNProductEditorPlugin
       都還是 undefined，導致同一個 <script src> 被插入兩次、整支檔案的初始化邏輯
       （事件綁定等）跟著執行兩次。用一個 pending Promise 快取住同一個 src 的載入狀態。 */
    var _bnScriptLoadPromises = {};
    function loadScriptOnce(src){
      if(_bnScriptLoadPromises[src]) return _bnScriptLoadPromises[src];
      var p = new Promise(function(resolve, reject){
        var s = document.createElement('script');
        s.src = src;
        s.onload = function(){ resolve(); };
        s.onerror = function(){ delete _bnScriptLoadPromises[src]; reject(new Error('load failed: '+src)); };
        document.head.appendChild(s);
      });
      _bnScriptLoadPromises[src] = p;
      return p;
    }
    function sampleCorner(d,w,h){function px(x,y){var i=(y*w+x)*4;return{r:d[i],g:d[i+1],b:d[i+2],a:d[i+3]};}var c=[px(0,0),px(w-1,0),px(0,h-1),px(w-1,h-1)].filter(function(p){return p.a>200;});if(!c.length)return{r:255,g:255,b:255};var r=0,g=0,b=0;c.forEach(function(p){r+=p.r;g+=p.g;b+=p.b;});return{r:r/c.length,g:g/c.length,b:b/c.length};}
    function autoTrim(img){var max=1200,sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));var w=Math.max(1,Math.round(img.naturalWidth*sc)),h=Math.max(1,Math.round(img.naturalHeight*sc));var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,w,h);var id=ctx.getImageData(0,0,w,h),d=id.data,bg=sampleCorner(d,w,h);var x0=w,y0=h,x1=-1,y1=-1;for(var y=0;y<h;y++)for(var x=0;x<w;x++){var i=(y*w+x)*4,a=d[i+3];if(a>18&&(a<245||Math.abs(d[i]-bg.r)+Math.abs(d[i+1]-bg.g)+Math.abs(d[i+2]-bg.b)>46)&&!(d[i]>246&&d[i+1]>246&&d[i+2]>246)){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}}if(x1<0)return{src:img.src,ratio:img.naturalWidth/img.naturalHeight};var pad=Math.round(Math.max(w,h)*.015);x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);var tw=x1-x0+1,th=y1-y0+1;var o=document.createElement('canvas');o.width=tw;o.height=th;o.getContext('2d').drawImage(c,x0,y0,tw,th,0,0,tw,th);return{src:o.toDataURL('image/png'),ratio:tw/th};}

    /* ── 廣播 ── */
    var _bnNoShadowVariantCache = new WeakMap();
    var _bnNoShadowFrameQueue = new WeakMap();
    function isNoShadowTemplateFrame(frame){
      var source = String(frame && (frame.getAttribute('src') || frame.src) || '');
      try{ source += ' ' + decodeURIComponent(source); }catch(_){}
      var block = frame && frame.closest ? frame.closest('.preview-block') : null;
      var title = block && block.querySelector('.pname') ? block.querySelector('.pname').textContent : '';
      return /campaign_card|首頁logo牆/i.test(source + ' ' + title);
    }
    function findProductForAsset(msg){
      var products = window._bnProducts || [];
      for(var i=0;i<products.length;i++){
        if(String(products[i].id) === String(msg && msg.id)) return products[i];
      }
      return null;
    }
    function buildNoShadowVariant(product, msg){
      var meta = product && product.meta || {};
      var baseSrc = (product && (product.baseSrc || meta.baseSrc)) || (msg && msg.baseSrc) || '';
      if(!baseSrc) return Promise.resolve(null);
      var rotate = Number(meta.rotate !== undefined ? meta.rotate : (msg && msg.rotate)) || 0;
      rotate = ((rotate % 360) + 360) % 360;
      if(rotate > 180) rotate -= 360;
      rotate = Math.round(rotate * 10) / 10;
      function compose(){
        if(!window._bnGroundShadow) throw new Error('商品影子引擎尚未載入');
        var draft = {
          src:baseSrc, baseSrc:baseSrc,
          ratio:Number(product && product.ratio) || Number(msg && msg.ratio) || 1,
          meta:{rotate:rotate, baseSrc:baseSrc}
        };
        return window._bnGroundShadow.applyToProduct(draft, {enabled:false}).then(function(){
          return {src:draft.src, ratio:draft.ratio, productRect:draft.meta && draft.meta.productRect,
            rotate:rotate, baseSrc:baseSrc};
        });
      }
      var cache = product && _bnNoShadowVariantCache.get(product);
      if(cache && cache.baseSrc === baseSrc && cache.rotate === rotate) return cache.promise;
      var job = Promise.resolve(window._bnGroundShadow ? null :
        loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body')).then(compose);
      if(product){
        var entry = {baseSrc:baseSrc, rotate:rotate, promise:job};
        _bnNoShadowVariantCache.set(product, entry);
        job = job.catch(function(error){
          if(_bnNoShadowVariantCache.get(product) === entry) _bnNoShadowVariantCache.delete(product);
          throw error;
        });
        entry.promise = job;
      }
      return job;
    }
    function postFrameMessage(frame, msg){
      try{
        if(!frame || !frame.contentWindow) return false;
        frame.contentWindow.postMessage(msg, '*');
        return true;
      }catch(_){ return false; }
    }
    function enqueueNoShadowFrameMessage(frame, task){
      var previous = _bnNoShadowFrameQueue.get(frame) || Promise.resolve();
      var next = previous.catch(function(){}).then(task);
      _bnNoShadowFrameQueue.set(frame, next);
      next.then(function(){
        if(_bnNoShadowFrameQueue.get(frame) === next) _bnNoShadowFrameQueue.delete(frame);
      }, function(){
        if(_bnNoShadowFrameQueue.get(frame) === next) _bnNoShadowFrameQueue.delete(frame);
      });
      return next;
    }
    function waitForNoShadowFrameMessages(frame){
      return _bnNoShadowFrameQueue.get(frame) || Promise.resolve();
    }
    function sendFrameMessage(frame, msg){
      if(!frame || !frame.contentWindow) return Promise.resolve(false);
      var noShadowFrame = isNoShadowTemplateFrame(frame);
      var productAssetMessage = msg && (msg.type === 'bn-product-add' || msg.type === 'bn-product-update-image');
      var orderedMessage = msg && (msg.type === 'bn-product-remove' || msg.type === 'bn-product-zorder');
      if(!noShadowFrame || (!productAssetMessage && !orderedMessage)){
        postFrameMessage(frame, msg);
        return Promise.resolve(true);
      }
      if(orderedMessage){
        return enqueueNoShadowFrameMessage(frame, function(){ postFrameMessage(frame, msg); return true; });
      }
      return enqueueNoShadowFrameMessage(frame, function(){
        var product = findProductForAsset(msg);
        return buildNoShadowVariant(product, msg).then(function(asset){
          if(!asset){ postFrameMessage(frame, msg); return false; }
          var outgoing = Object.assign({}, msg, {
            src:asset.src, ratio:asset.ratio, productRect:asset.productRect,
            rotate:asset.rotate, rotationBaked:true, baseSrc:asset.baseSrc
          });
          postFrameMessage(frame, outgoing);
          if(msg.type === 'bn-product-add' && msg.preserveExistingLayout === true){
            postFrameMessage(frame, {
              type:'bn-product-update-image', id:outgoing.id, src:outgoing.src,
              ratio:outgoing.ratio, productRect:outgoing.productRect, rotate:outgoing.rotate,
              rotationBaked:true, preserveFrame:true
            });
          }
          return true;
        }).catch(function(error){
          console.warn('[bn-editor] 無影子商品圖產生失敗，暫時保留原圖', error);
          postFrameMessage(frame, msg);
          return false;
        });
      });
    }
    function broadcast(msg){
      document.querySelectorAll('.preview-block iframe').forEach(function(f){ sendFrameMessage(f,msg); });
    }
    function broadcastTo(id,msg){
      var f = document.getElementById('iframe-'+id);
      if(f) sendFrameMessage(f,msg);
    }
    function requestProductLayouts(){ broadcast({type:'bn-product-layout-request'}); }
    function getIframeLayoutId(frame){
      try{
        var id = new URLSearchParams(String(frame.src || '').split('?')[1] || '').get('bnid');
        return id ? String(id) : '';
      }catch(_){ return ''; }
    }
    /* 快照只讀每張畫板的現有位置，不是新的拖曳操作。記錄進行中的快照，
       也保護尚未更新 runtime 的 iframe：它回傳的舊格式不能再觸發跨版位連動。 */
    var _layoutSnapshotRequests = {};
    function isLayoutSnapshotUpdate(data){
      return !!(data && data.snapshotOnly) || Object.keys(_layoutSnapshotRequests).length > 0;
    }
    /* 兩種下載共用：輸出前向每個 iframe 取回最後一刻的商品、人物與
       SearchICON_LOGO 位置。complete 回覆逾時時，仍保留既有即時資料繼續。 */
    function syncLayoutSnapshot(timeoutMs){
      return new Promise(function(resolve){
        var requestId = 'layout_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        var pending = {};
        document.querySelectorAll('.preview-block iframe').forEach(function(frame){
          var id = getIframeLayoutId(frame);
          if(id) pending[id] = true;
        });
        var settled = false;
        var timer = null;
        function finish(){
          if(settled) return;
          settled = true;
          if(timer) clearTimeout(timer);
          window.removeEventListener('message', onComplete);
          delete _layoutSnapshotRequests[requestId];
          resolve();
        }
        function onComplete(ev){
          var data = ev.data || {};
          if(data.type !== 'bn-layout-snapshot-complete' || data.requestId !== requestId) return;
          if(data.bnid) delete pending[String(data.bnid)];
          if(!Object.keys(pending).length) finish();
        }
        if(!Object.keys(pending).length){ finish(); return; }
        _layoutSnapshotRequests[requestId] = true;
        window.addEventListener('message', onComplete);
        timer = setTimeout(finish, Math.max(300, Number(timeoutMs) || 900));
        broadcast({type:'bn-layout-snapshot-request', requestId:requestId});
      });
    }
    function markStateDirty(){ try{ document.dispatchEvent(new CustomEvent('bn-state-dirty')); }catch(_){ } }

    /* 商品版位連動：所有已啟用版位共用商品框的百分比座標；單一版位解鎖後，
       該版位仍保留自己的 layouts[id]，不再接收其他版位的更新。 */
    function normalizePairName(name){
      return String(name || '')
        .replace(/\.html$/i, '')
        .replace(/#U65b9|#U6a6b/gi, '')
        .replace(/[方橫横]/g, '')
        .replace(/(square|vertical|portrait|horizontal|landscape)/gi, '')
        .replace(/[\s_\-()（）]+/g, '')
        .toLowerCase();
    }
    function getLayoutById(id){
      if(typeof window.loadLayouts !== 'function') return null;
      var layouts = window.loadLayouts() || [];
      return layouts.find(function(l){ return String(l.id) === String(id); }) || null;
    }
    function productLayoutSyncEligible(id){
      var layout = getLayoutById(id) || {};
      var name = String(layout.file || layout.name || '');
      /* 首頁 LOGO 牆、SearchICON_PRODUCT、Campaign Card 不加入跨版位商品位置連動。 */
      return !/首頁logo牆/i.test(name) && !/searchicon_product/i.test(name) && !/campaign[ _-]*card/i.test(name);
    }
    function getPairedLayoutIds(sourceId){
      if(typeof window.loadLayouts !== 'function') return [];
      var layouts = window.loadLayouts() || [];
      var src = layouts.find(function(l){ return String(l.id) === String(sourceId); });
      if(!src) return [];
      var key = normalizePairName(src.name || src.file);
      if(!key) return [];
      return layouts.filter(function(l){
        return l.enabled !== false && String(l.id) !== String(sourceId) && normalizePairName(l.name || l.file) === key;
      }).map(function(l){ return String(l.id); });
    }
    function productLayoutIsLocked(id){
      return !window._bnProductLayoutLocks || window._bnProductLayoutLocks[String(id)] !== false;
    }
    function productLayoutClone(layout){
      try{ return JSON.parse(JSON.stringify(layout || {})); }
      catch(_){ return {}; }
    }
    function getLayoutCanvasSize(id){
      var l = getLayoutById(id) || {};
      var w = Number(l.w || l.width || 0);
      var h = Number(l.h || l.height || 0);
      return {w:w > 0 ? w : 0, h:h > 0 ? h : 0};
    }
    function productLayoutWithPercent(layout, sourceBnid){
      var out = productLayoutClone(layout);
      var size = getLayoutCanvasSize(sourceBnid);
      /* 新版 iframe 已直接傳百分比；舊版暫存／舊 iframe 沒有時才用版位尺寸補算。 */
      if(out.leftPct === undefined && size.w > 0 && isFinite(Number(out.left))) out.leftPct = Number(out.left) / size.w;
      if(out.topPct === undefined && size.h > 0 && isFinite(Number(out.top))) out.topPct = Number(out.top) / size.h;
      if(out.widthPct === undefined && size.w > 0 && isFinite(Number(out.width))) out.widthPct = Number(out.width) / size.w;
      if(out.heightPct === undefined && size.h > 0 && isFinite(Number(out.height))) out.heightPct = Number(out.height) / size.h;
      return out;
    }
    function productLayoutForTarget(layout, sourceBnid, targetBnid){
      var out = productLayoutWithPercent(layout, sourceBnid);
      var targetSize = getLayoutCanvasSize(targetBnid);
      /* 同時保存目標版位的 px 值與共用百分比：runtime 會優先用百分比，
         之後的暫存／下載若只讀 px 也不會拿到來源版位的錯誤尺寸。 */
      if(targetSize.w > 0 && isFinite(Number(out.leftPct))) out.left = Number(out.leftPct) * targetSize.w;
      if(targetSize.h > 0 && isFinite(Number(out.topPct))) out.top = Number(out.topPct) * targetSize.h;
      if(targetSize.w > 0 && isFinite(Number(out.widthPct))) out.width = Number(out.widthPct) * targetSize.w;
      if(targetSize.h > 0 && isFinite(Number(out.heightPct))) out.height = Number(out.heightPct) * targetSize.h;
      return out;
    }
    function getProductSyncLayoutIds(){
      if(typeof window.loadLayouts !== 'function') return [];
      return (window.loadLayouts() || []).filter(function(l){
        return l && l.id !== undefined && l.id !== null && l.enabled !== false
          && productLayoutSyncEligible(l.id);
      }).map(function(l){ return String(l.id); });
    }
    function findLockedProductLayout(product, exceptBnid){
      if(!product || !product.layouts) return null;
      var ids = getProductSyncLayoutIds();
      for(var i=0;i<ids.length;i++){
        var id = ids[i];
        if(String(id) === String(exceptBnid) || !productLayoutIsLocked(id)) continue;
        if(product.layouts[id]) return {id:id, layout:product.layouts[id]};
      }
      return null;
    }
    function syncProductLayoutToLinkedLayouts(product, sourceBnid, layout){
      if(!product || !layout || !productLayoutSyncEligible(sourceBnid) || !productLayoutIsLocked(sourceBnid)) return;
      if(!product.layouts) product.layouts = {};
      var ids = getProductSyncLayoutIds();
      ids.forEach(function(tid){
        if(String(tid) === String(sourceBnid) || !productLayoutIsLocked(tid)) return;
        var cloned = productLayoutForTarget(layout, sourceBnid, tid);
        product.layouts[tid] = cloned;
        broadcastTo(tid, {type:'bn-product-layout-apply', id:product.id, layout:cloned});
      });
    }
    /* 舊函式名稱保留，避免其他既有流程引用時失效；商品現在改為全部鎖定版位連動。 */
    function syncProductLayoutToPairs(product, sourceBnid, layout){
      syncProductLayoutToLinkedLayouts(product, sourceBnid, layout);
    }
    function setProductLayoutLock(id, locked){
      var key = String(id);
      if(!window._bnProductLayoutLocks) window._bnProductLayoutLocks = {};
      window._bnProductLayoutLocks[key] = locked !== false;
      if(window._bnProductLayoutLocks[key]){
        /* 重新鎖定時，優先把目前共同鎖定群組的狀態套回這一張；若尚未有
           可參考版位，就保留它現有位置，之後會跟著共同編輯。 */
        (window._bnProducts || []).forEach(function(product){
          if(!product) return;
          if(!product.layouts) product.layouts = {};
          var ref = findLockedProductLayout(product, key);
          var sourceId = ref ? ref.id : key;
          var sourceLayout = ref ? ref.layout : product.layouts[key];
          if(!sourceLayout) return;
          var cloned = productLayoutForTarget(sourceLayout, sourceId, key);
          product.layouts[key] = cloned;
          broadcastTo(key, {type:'bn-product-layout-apply', id:product.id, layout:cloned});
        });
        ['_bnCharacter','_bnCharacter2','_bnEndorserPhoto','_bnEndorserSign'].forEach(function(slotKey){
          var slot=window[slotKey];if(!slot)return;
          if(!slot.layouts)slot.layouts={};
          var isEndorser=slotKey.indexOf('_bnEndorser')===0;
          var ref=(isEndorser&&endorserMasterSourceFor(slot,key))||findLockedProductLayout(slot,key);
          var sourceId=ref?ref.id:key,layout=ref?ref.layout:slot.layouts[key];
          if(!layout)return;
          var cloned=productLayoutForTarget(layout,sourceId,key);slot.layouts[key]=cloned;
          broadcastTo(key,{type:'bn-character-layout-apply',id:slot.id,layout:cloned});
        });
        /* 代言人小字也一起從該跟的指標版位拿位置 */
        var lockNote=window._bnEndorserNote;
        if(lockNote&&lockNote.layouts&&lockNote.text){
          var noteRef=endorserMasterSourceFor(lockNote,key);
          if(noteRef){
            var noteCloned=JSON.parse(JSON.stringify(noteRef.layout));lockNote.layouts[key]=noteCloned;
            broadcastTo(key,{type:'bn-endorser-note-layout-apply',layout:noteCloned});
          }
        }
      }
      if(typeof window._bnRefreshProductLayoutLockUI === 'function'){
        window._bnRefreshProductLayoutLockUI();
      }
      markStateDirty();
    }
    window._bnIsProductLayoutLocked = productLayoutIsLocked;
    window._bnSetProductLayoutLock = setProductLayoutLock;
    /* 人物1、人物2共用畫布右上角的鎖鏈；只同步已鎖定且允許連動的版位。 */
    function syncCharacterLayoutToPairs(slotKey, sourceBnid, layout){
      var slot = window[slotKey];
      if(!slot || !layout || !productLayoutSyncEligible(sourceBnid) || !productLayoutIsLocked(sourceBnid)) return;
      var pairIds = getProductSyncLayoutIds();
      if(!pairIds.length) return;
      if(!slot.layouts) slot.layouts = {};
      pairIds.forEach(function(tid){
        if(String(tid)===String(sourceBnid)||!productLayoutIsLocked(tid))return;
        var cloned = productLayoutForTarget(layout,sourceBnid,tid);
        slot.layouts[tid] = cloned;
        broadcastTo(tid, {type:'bn-character-layout-apply', id:slot.id, layout:cloned});
      });
    }

    /* ── 代言人連動：HBN 是主要指標、LPBN 是第二指標，其他版位自動配合 ──
       - 改 HBN：全部鎖定版位跟著（LPBN 那組在 LPBN 自己調過之前也跟 HBN）。
       - 改 LPBN：LPBN 那組跟著（寬高比 < 3.2 比 HBN 方的版位：FB_POST、ddcard、IG、Coin、SBA_APP…），
         之後再改 HBN 不會蓋掉 LPBN 那組；換一張代言人照才重新全部跟 HBN。
       - 改其他版位：只動自己和同尺寸的方／橫版。 */
    function endorserLayoutFile(id){
      var l = getLayoutById(id) || {};
      return String(l.file || l.name || '');
    }
    function endorserMasterOf(id){
      var n = endorserLayoutFile(id);
      if(/^hbn_/i.test(n)) return 'hbn';
      if(/^lpbn_/i.test(n)) return 'lpbn';
      return '';
    }
    function endorserGroupOf(id){
      var m = endorserMasterOf(id); if(m) return m;
      var s = getLayoutCanvasSize(id);
      return (s.w > 0 && s.h > 0 && s.w / s.h < 3.2) ? 'lpbn' : 'hbn';
    }
    function endorserLpbnOwn(){
      var n = window._bnEndorserNote, p = window._bnEndorserPhoto;
      return !!(n && p && n.lpbnOwnPhotoId && n.lpbnOwnPhotoId === p.id);
    }
    function markEndorserLpbnOwn(){
      var p = window._bnEndorserPhoto;
      if(p) endorserNoteState().lpbnOwnPhotoId = p.id;
    }
    /* 只有這些版位會放代言人（同 layout-runtime 的 _bnEndorserTemplate） */
    function endorserLayoutSupported(id){
      return /^(?:ddcard|ig|hbn_|lpbn_|coin_pagebn|fb_post|scbn|活動總覽|sba_|ams\s*bn-)/i
        .test(endorserLayoutFile(id).replace(/^.*[\\/]/, ''));
    }
    function endorserSyncTargets(sourceBnid){
      var src = String(sourceBnid);
      var ids = getProductSyncLayoutIds().filter(function(id){
        return String(id) !== src && productLayoutIsLocked(id) && endorserLayoutSupported(id);
      });
      var master = endorserMasterOf(src);
      if(!master){
        var pairs = getPairedLayoutIds(src).map(String);
        return ids.filter(function(id){ return pairs.indexOf(String(id)) !== -1; });
      }
      if(master === 'lpbn') return ids.filter(function(id){ return endorserGroupOf(id) === 'lpbn'; });
      var lpbnOwn = endorserLpbnOwn();
      return ids.filter(function(id){
        var grp = endorserGroupOf(id);
        return grp === 'hbn' || (grp === 'lpbn' && !lpbnOwn);
      });
    }
    function syncEndorserSlotLayout(slotKey, sourceBnid, layout){
      var slot = window[slotKey];
      if(!slot || !layout || !productLayoutSyncEligible(sourceBnid) || !productLayoutIsLocked(sourceBnid)) return;
      if(!slot.layouts) slot.layouts = {};
      endorserSyncTargets(sourceBnid).forEach(function(tid){
        var cloned = productLayoutForTarget(layout, sourceBnid, tid);
        slot.layouts[tid] = cloned;
        broadcastTo(tid, {type:'bn-character-layout-apply', id:slot.id, layout:cloned});
      });
    }
    /* 重新鎖上某個版位時，代言人要從它該跟的指標版位拿位置 */
    function endorserMasterSourceFor(entity, targetId){
      if(!entity || !entity.layouts) return null;
      var want = (endorserGroupOf(targetId) === 'lpbn' && endorserLpbnOwn()) ? 'lpbn' : 'hbn';
      var ids = getProductSyncLayoutIds();
      for(var i = 0; i < ids.length; i++){
        var id = ids[i];
        if(String(id) === String(targetId) || !productLayoutIsLocked(id)) continue;
        if(endorserMasterOf(id) === want && entity.layouts[id]) return {id:id, layout:entity.layouts[id]};
      }
      return null;
    }
    /* 舊版暫存（代言人照沒有 efr）：HBN／LPBN 的 iframe 就緒時請它用新規則重新回報一次，
       其他版位就會照新規則自動配合，不用人工重調。 */
    function endorserMigrationSourceId(){
      /* 只讓一個指標版位負責轉換：有載入的 HBN 優先（照版位清單順序），沒有才用 LPBN */
      var ids = getProductSyncLayoutIds().filter(function(id){
        return productLayoutIsLocked(id) && document.getElementById('iframe-' + id);
      });
      var hbn = ids.filter(function(id){ return endorserMasterOf(id) === 'hbn'; });
      if(hbn.length) return String(hbn[0]);
      var lpbn = ids.filter(function(id){ return endorserMasterOf(id) === 'lpbn'; });
      return lpbn.length ? String(lpbn[0]) : '';
    }
    function requestEndorserMigrationIfNeeded(id){
      var photo = window._bnEndorserPhoto;
      if(!photo || !photo.layouts || !endorserMasterOf(id) || !productLayoutIsLocked(id)) return;
      var own = photo.layouts[String(id)];
      if(!own || own.efr) return;
      if(endorserMigrationSourceId() !== String(id)) return;
      broadcastTo(id, {type:'bn-endorser-repost'});
    }
    /* 延遲載入的 BN 要跟商品圖一樣，建立 iframe 時就先取得已編輯的
       代言人大小／位置，不能因為當時還沒有畫出就回到預設值。 */
    function hydrateEndorserLayoutForReadyFrame(id){
      var key=String(id||'');
      if(!key||!endorserLayoutSupported(key)||!productLayoutIsLocked(key))return false;
      var changed=false;
      ENDORSER_SLOTS.forEach(function(slotKey){
        var slot=window[slotKey];if(!slot)return;
        if(!slot.layouts)slot.layouts={};
        if(slot.layouts[key])return;
        var ref=endorserMasterSourceFor(slot,key)||findLockedProductLayout(slot,key);
        if(!ref||!ref.layout)return;
        slot.layouts[key]=productLayoutForTarget(ref.layout,ref.id,key);
        changed=true;
      });
      var note=window._bnEndorserNote;
      if(note&&note.text){
        if(!note.layouts)note.layouts={};
        if(!note.layouts[key]){
          var noteRef=endorserMasterSourceFor(note,key)||findLockedProductLayout(note,key);
          if(noteRef&&noteRef.layout){
            note.layouts[key]=productLayoutClone(noteRef.layout);
            changed=true;
          }
        }
      }
      if(changed)markStateDirty();
      return changed;
    }

    /* Logo 版型自動切換：
       - 只有 1 顆且高 >= 寬：有方／橫雙版本的版位一律選方版、取消橫版。
       - 2 顆以上，或只有 1 顆但寬 > 高：一律選橫版、取消方版。

       配對不寫死版位清單，而是沿用 normalizePairName()。因此目前的 IG、HBN、
       DDCard、Coin Page、FB Post，以及日後新增的同名方／橫版都會自動套用；
       SearchICON 等只有單一版本的版位完全不受影響。 */
    var _bnLogoLayoutSelectSeq = 0;
    function getLogoLayoutVariant(layout){
      var name = String((layout && (layout.name || layout.file)) || '');
      if(/橫|横|horizontal|landscape/i.test(name)) return 'horizontal';
      if(/方|square|vertical|portrait/i.test(name)) return 'square';
      return '';
    }
    function applyLogoLayoutVariant(mode){
      if(mode !== 'square' && mode !== 'horizontal') return false;
      /* BODA 等級外掛會接管排版清單的 checked／userTouched 狀態；
         優先走它的橋接 API，避免一般 Shopee 的 checked 更新在重繪時
         被 BODA 的等級預設值覆蓋。獨立 Shopee 沒有此 API，才走下方原本流程。 */
      if(typeof window.bnAutoSelectLogoVariant === 'function'){
        return !!window.bnAutoSelectLogoVariant(mode, true);
      }
      if(typeof window.loadLayouts !== 'function') return false;
      var layouts = window.loadLayouts() || [];
      var groups = {};
      layouts.forEach(function(layout){
        if(layout.enabled === false) return;
        var variant = getLogoLayoutVariant(layout);
        if(!variant) return;
        var key = normalizePairName(layout.name || layout.file);
        if(!key) return;
        if(!groups[key]) groups[key] = {square:[], horizontal:[]};
        groups[key][variant].push(layout);
      });

      var desiredById = {};
      var getChecked = typeof window.getLayoutCheckedValue === 'function'
                       ? window.getLayoutCheckedValue : null;
      Object.keys(groups).forEach(function(key){
        var pair = groups[key];
        if(!pair.square.length || !pair.horizontal.length) return;
        /* 使用者已手動取消該配對的所有版位時，不強制重新啟用 */
        if(getChecked){
          var anyActive = pair.square.some(getChecked) || pair.horizontal.some(getChecked);
          if(!anyActive) return;
        }
        pair.square.forEach(function(layout){
          desiredById[layout.id] = mode === 'square';
        });
        pair.horizontal.forEach(function(layout){
          desiredById[layout.id] = mode === 'horizontal';
        });
      });

      var changed = false;
      if(typeof window.setLayoutChecks === 'function'){
        /* 由主編輯器直接更新 renderPreviews() 真正使用的 checked 變數。 */
        changed = window.setLayoutChecks(desiredById);
      }else{
        /* 舊版入口的相容備援。 */
        var nextChecked = window.checked || (window.checked = {});
        Object.keys(desiredById).forEach(function(id){
          var next = desiredById[id];
          if(nextChecked[id] !== next){ nextChecked[id] = next; changed = true; }
        });
        if(changed){
          if(typeof window.renderChecks === 'function') window.renderChecks();
          if(typeof window.renderPreviews === 'function' && !window._bnExporting) window.renderPreviews();
        }
      }
      if(changed){
        markStateDirty();
      }
      return changed;
    }
    /* 無 LOGO 版位（例如 ddcard無logo）：完全沒有上傳 LOGO 時預設維持勾選，
       一旦上傳了任一 LOGO 就自動取消勾選；若之後把 LOGO 全部移除，再自動恢復勾選。
       這個版位沒有方／橫版本，不會進入 applyLogoLayoutVariant 的配對邏輯，因此獨立處理。 */
    function isNoLogoLayout(layout){
      var name = String((layout && (layout.name || layout.file)) || '');
      return /無\s*logo/i.test(name);
    }
    function applyNoLogoLayoutSelection(hasLogos){
      if(typeof window.loadLayouts !== 'function') return false;
      var layouts = window.loadLayouts() || [];
      var desiredById = {};
      layouts.forEach(function(layout){
        if(layout.enabled === false) return;
        if(!isNoLogoLayout(layout)) return;
        desiredById[layout.id] = !hasLogos;
      });
      if(!Object.keys(desiredById).length) return false;

      var changed = false;
      if(typeof window.setLayoutChecks === 'function'){
        changed = window.setLayoutChecks(desiredById);
      }else{
        var nextChecked = window.checked || (window.checked = {});
        Object.keys(desiredById).forEach(function(id){
          var next = desiredById[id];
          if(nextChecked[id] !== next){ nextChecked[id] = next; changed = true; }
        });
        if(changed){
          if(typeof window.renderChecks === 'function') window.renderChecks();
          if(typeof window.renderPreviews === 'function' && !window._bnExporting) window.renderPreviews();
        }
      }
      if(changed){ markStateDirty(); }
      return changed;
    }
    function syncLogoLayoutSelection(){
      var seq = ++_bnLogoLayoutSelectSeq;
      var manualRevision = Number(window._bnLogoLayoutManualRevision) || 0;
      var logos = window._bnLogos || [];
      applyNoLogoLayoutSelection(logos.length > 0);
      if(!logos.length){
        /* BODA 的 LPBN 一般版同時承擔方 Logo／無 Logo；沒有 Logo 時
           也要通知等級外掛收旂同組其他變體。 */
        if(typeof window.bnAutoSelectLogoVariant === 'function'){
          return Promise.resolve(!!window.bnAutoSelectLogoVariant('none', true));
        }
        return Promise.resolve(false);
      }
      if(logos.length > 1) return Promise.resolve(applyLogoLayoutVariant('horizontal'));

      var logo = logos[0];
      function applyRatio(ratio){
        if(seq !== _bnLogoLayoutSelectSeq || window._bnLogos.length !== 1 || window._bnLogos[0] !== logo) return false;
        /* 尺寸量測期間若使用者已手動勾選／取消版位，就以使用者操作為準。 */
        if((Number(window._bnLogoLayoutManualRevision) || 0) !== manualRevision) return false;
        ratio = Number(ratio);
        if(!(ratio > 0)) return false;
        logo.ratio = ratio;
        if(ratio <= 1) return applyLogoLayoutVariant('square');
        if(ratio > 1) return applyLogoLayoutVariant('horizontal');
      }

      if(Number(logo.ratio) > 0) return Promise.resolve(applyRatio(logo.ratio));
      return loadImg(logo.uploadSrc || logo.src).then(function(img){
        return applyRatio(img.naturalWidth / img.naturalHeight);
      })['catch'](function(){ return false; });
    }
    /* BODA 依工單總覽勾選版位後（整類勾選），要再依目前的 LOGO 自動挑方／橫／無 LOGO 版。 */
    window._bnSyncLogoLayoutSelection = syncLogoLayoutSelection;
    window.addEventListener('message', function(ev){
      var d = ev.data || {};
      if(d.type === 'bn-searchicon-logo-layout-update' && d.layout){
        if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
        var logoLayoutId = d.bnid ? String(d.bnid) : '';
        if(!logoLayoutId) return;
        window._bnLogoLayouts[logoLayoutId] = JSON.parse(JSON.stringify(d.layout));
        markStateDirty();
        return;
      }
      if(d.type === 'bn-campaign-card-logo-layout-update' && d.layout){
        if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
        var campaignLogoLayoutId = d.bnid ? String(d.bnid) : '';
        var campaignLogoAsset = window._bnCampaignCardAssets && window._bnCampaignCardAssets.logo;
        if(!campaignLogoLayoutId || !campaignLogoAsset) return;
        if(!campaignLogoAsset.layoutById) campaignLogoAsset.layoutById = {};
        campaignLogoAsset.layoutById[campaignLogoLayoutId] = JSON.parse(JSON.stringify(d.layout));
        campaignLogoAsset.layout = JSON.parse(JSON.stringify(d.layout));
        markStateDirty();
        return;
      }
      if(d.type === 'bn-campaign-card-product-layout-update' && d.id && d.layout){
        if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
        var campaignProductAsset = window._bnCampaignCardAssets && window._bnCampaignCardAssets.product;
        if(!campaignProductAsset) return;
        var campaignProductLayoutId = d.bnid ? String(d.bnid) : 'default';
        if(!campaignProductAsset.layoutById) campaignProductAsset.layoutById = {};
        campaignProductAsset.layoutById[campaignProductLayoutId] = JSON.parse(JSON.stringify(d.layout));
        if(isLayoutSnapshotUpdate(d)) return;
        campaignProductAsset.layout = JSON.parse(JSON.stringify(d.layout));
        markStateDirty();
        return;
      }
      if(d.type === 'bn-character-layout-update' && d.layout){
        /* 與商品版位更新共用同一個 listener，避免重複註冊造成的衝突。
           用訊息裡的 id 判斷這次更新是人物1還是人物2。 */
        if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
        var slotKey = null;
        if(window._bnCharacter && window._bnCharacter.id === d.id) slotKey = '_bnCharacter';
        else if(window._bnCharacter2 && window._bnCharacter2.id === d.id) slotKey = '_bnCharacter2';
        /* 代言人照／簽名檔在畫布上也是 .bn-char-box，位置回報走同一則訊息 */
        else slotKey = endorserSlotById(d.id);
        if(!slotKey) return;
        var slot = window[slotKey];
        if(!slot.layouts) slot.layouts = {};
        var ckey = d.bnid ? String(d.bnid) : 'default';
        /* 代言人：快照不是使用者操作。這格已經是從別的版位連動過來的位置時，
           晚到的舊快照不能把它倒回去（否則重新整理後會用回舊位置）。 */
        if(ENDORSER_SLOTS.indexOf(slotKey) !== -1 && isLayoutSnapshotUpdate(d)){
          var prevEndorser = slot.layouts[ckey];
          if(prevEndorser && prevEndorser.src && d.layout.src && String(prevEndorser.src) !== String(d.layout.src)) return;
        }
        slot.layouts[ckey] = d.layout;
        if(isLayoutSnapshotUpdate(d))return;
        if(ENDORSER_SLOTS.indexOf(slotKey) !== -1){
          /* 使用者在 LPBN 調過：LPBN 那組從此有自己的版本（舊暫存轉換不算） */
          if(!d.migrate && endorserMasterOf(ckey) === 'lpbn') markEndorserLpbnOwn();
          syncEndorserSlotLayout(slotKey, ckey, d.layout);
        } else {
          syncCharacterLayoutToPairs(slotKey, ckey, d.layout);
        }
        markStateDirty();
        return;
      }
      if(d.type !== 'bn-product-layout-update' || !d.id || !d.layout) return;
      /* 下載圖片/同步 iframe 期間，iframe 可能因重送商品而回傳 layout-update。
         這些不是使用者拖曳，不能寫回 _bnProducts，也不能觸發本機暫存，
         否則下載會反過來覆蓋背景色、底圖或商品排版。 */
      if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
      var p = (window._bnProducts || []).find(function(x){ return x.id === d.id; });
      if(!p) return;
      if(!p.layouts) p.layouts = {};
      var key = d.bnid ? String(d.bnid) : 'default';
      p.layouts[key] = d.layout;
      /* 匯出／下載暫存的快照必須保留每張畫板各自的 px 座標；不能把
         最後回覆的一張再次當成連動來源，回頭擠壓其他已排好的商品。 */
      if(isLayoutSnapshotUpdate(d)) return;
      if(productLayoutSyncEligible(key)) syncProductLayoutToPairs(p, key, d.layout);
      /* 也保留最後一次實際畫布座標，方便舊版 JSON 或單版位還原 */
      p.x = d.layout.left; p.y = d.layout.top; p.width = d.layout.width; p.height = d.layout.height;
      p.layout = d.layout;
      markStateDirty();
    });

    /* ══ Logo 上傳 ══ */
    function insertLogoUI(){
      var scroll=document.getElementById('sidebar-scroll');
      if(!scroll||document.getElementById('bn-logo-drop'))return;
      var target=null;
      scroll.querySelectorAll('.s-section').forEach(function(el){if(el.textContent.trim()==='排版選擇')target=el;});
      var sec=document.createElement('div');
      sec.innerHTML=[
        '<div class="s-section" style="margin-top:14px">Logo 上傳（最多3張）</div>',
        '<div class="bn-section">',
        '  <div class="bn-drop" id="bn-logo-drop">',
        '    <input type="file" accept="image/*" multiple id="bn-logo-inp">',
        '    ＋ 點擊或拖曳上傳 Logo',
        '  </div>',
        '  <div class="bn-prod-list" id="bn-logo-list"></div>',
        '</div>',
      ].join('');
      if(target)scroll.insertBefore(sec,target);else scroll.appendChild(sec);
      var inp=document.getElementById('bn-logo-inp');
      var drop=document.getElementById('bn-logo-drop');
      inp.addEventListener('change',function(){
        doLoadLogos(this.files);
        inp.value='';
      });
      drop.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('drag');});
      drop.addEventListener('dragleave',function(){this.classList.remove('drag');});
      drop.addEventListener('drop',function(e){
        e.preventDefault();this.classList.remove('drag');
        doLoadLogos(Array.from(e.dataTransfer.files).filter(function(f){return f.type.startsWith('image/');}));
      });
    }

    function renderLogoList(){
      var list=document.getElementById('bn-logo-list');
      if(!list)return;
      list.innerHTML='';
      window._bnLogos.forEach(function(lg,i){
        var row=document.createElement('div');row.className='bn-prod-item';
        var img=document.createElement('img');img.src=lg.src;
        var name=document.createElement('span');name.textContent='Logo '+(i+1);
        /* 恢復圓邊狀態 */
        if(lg.round){ img.dataset.bnLogoRound='1'; img.style.borderRadius='50%'; }

        /* 編輯按鈕：點了彈出四個選項 */
        /* ◀ ▶ 換位置箭頭 */
        var moveWrap=document.createElement('div');
        moveWrap.style.cssText='display:flex;flex-direction:column;gap:2px;flex-shrink:0;';

        var upLogo=document.createElement('button');upLogo.textContent='▲';upLogo.title='往前';
        var dnLogo=document.createElement('button');dnLogo.textContent='▼';dnLogo.title='往後';
        var logoIdx = window._bnLogos.indexOf(lg);
        upLogo.disabled = logoIdx === 0;
        dnLogo.disabled = logoIdx === window._bnLogos.length - 1;
        upLogo.style.opacity = upLogo.disabled ? '0.3' : '1';
        dnLogo.style.opacity = dnLogo.disabled ? '0.3' : '1';

        upLogo.addEventListener('click',(function(lid){return function(){
          var idx=window._bnLogos.findIndex(function(x){return x.id===lid;});
          if(idx<=0)return;
          var tmp=window._bnLogos[idx]; window._bnLogos[idx]=window._bnLogos[idx-1]; window._bnLogos[idx-1]=tmp;
          window._bnLogoDataUrl=window._bnLogos[0].src;
          renderLogoList(); broadcast({type:'bn-logos',logos:window._bnLogos});
        };})(lg.id));

        dnLogo.addEventListener('click',(function(lid){return function(){
          var idx=window._bnLogos.findIndex(function(x){return x.id===lid;});
          if(idx<0||idx>=window._bnLogos.length-1)return;
          var tmp=window._bnLogos[idx]; window._bnLogos[idx]=window._bnLogos[idx+1]; window._bnLogos[idx+1]=tmp;
          window._bnLogoDataUrl=window._bnLogos[0].src;
          renderLogoList(); broadcast({type:'bn-logos',logos:window._bnLogos});
        };})(lg.id));

        moveWrap.appendChild(upLogo); moveWrap.appendChild(dnLogo);

        var editBtn=document.createElement('button');editBtn.textContent='編輯';
        editBtn.addEventListener('click',(function(lid, imgRef){return function(e){
          e.stopPropagation();
          showLogoMenu(lid, imgRef, editBtn);
        };})(lg.id, img));

        var btn=document.createElement('button');btn.textContent='移除';
        btn.addEventListener('click',(function(lid){return function(){
          window._bnLogos=window._bnLogos.filter(function(x){return x.id!==lid;});
          window._bnLogoDataUrl=window._bnLogos.length?window._bnLogos[0].src:null;
          renderLogoList();
          broadcast({type:'bn-logo-remove',id:lid});
          broadcast({type:'bn-logos',logos:window._bnLogos});
          syncLogoLayoutSelection();
        };})(lg.id));
        row.appendChild(img);row.appendChild(name);row.appendChild(moveWrap);row.appendChild(editBtn);row.appendChild(btn);
        list.appendChild(row);
      });
      /* drop 按鈕狀態 */
      var drop=document.getElementById('bn-logo-drop');
      if(drop) drop.style.opacity=window._bnLogos.length>=MAX_LOGOS?'0.4':'1';
    }


    /* 工具列「編輯」按鈕的選單 */
    function showLogoMenu(lid, imgEl, anchorEl){
      function doShow(){
        if(!window.BNLogoMenu){ return; }
        var n = window._bnLogos.length;
        var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
        /* 建選單 */
        var menu = document.getElementById('_bn_logo_inline_menu');
        if(!menu){
          menu = document.createElement('div');
          menu.id = '_bn_logo_inline_menu';
          menu.style.cssText = [
            'position:fixed;z-index:999999;',
            'background:#111;color:#fff;',
            'border-radius:10px;',
            'box-shadow:0 8px 24px rgba(0,0,0,.4);',
            'padding:6px 0;min-width:120px;',
          ].join('');
          document.body.appendChild(menu);
          document.addEventListener('click', function(){
            menu.style.display='none';
          });
        }

        var items = [
          { label:'裁切', action:'crop' },
          { label:'加圓邊', action:'round' },
        ];

        menu.innerHTML = '';
        items.forEach(function(item){
          if(item.hidden) return;
          var b = document.createElement('button');
          b.textContent = item.action === 'round'
            ? (imgEl.dataset.bnLogoRound === '1' ? '取消圓邊' : '加圓邊')
            : item.label;
          b.style.cssText = 'display:block;width:100%;border:0;background:transparent;color:#fff;text-align:left;padding:7px 14px;font-size:13px;cursor:pointer;';
          b.addEventListener('mouseover', function(){ this.style.background='#2b2b2b'; });
          b.addEventListener('mouseout',  function(){ this.style.background='transparent'; });
          b.addEventListener('click', function(e){
            e.stopPropagation();
            menu.style.display = 'none';
            handleLogoAction(item.action, lid, imgEl);
          });
          menu.appendChild(b);
        });

        /* 定位到按鈕旁邊 */
        var rect = anchorEl.getBoundingClientRect();
        var left = rect.left;
        var top  = rect.bottom + 4;
        if(left + 130 > window.innerWidth) left = window.innerWidth - 134;
        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';
        menu.style.display = 'block';
      }

      if(window.BNLogoMenu){ doShow(); }
      else {
        loadScriptOnce('js/logo-editor-plugin.js').then(doShow)['catch'](function(){ BnDialog.alert('logo-editor-plugin.js 載入失敗'); });
      }
    }

    function handleLogoAction(action, lid, imgEl){
      if(action === 'crop'){
        window.BNLogoMenu.openCropEditor(imgEl.src, function(newSrc){
          if(!newSrc) return;
          var lo = window._bnLogos.find(function(x){return x.id===lid;});
          if(lo){
            lo.src = newSrc;
            imgEl.src = newSrc;
            window._bnLogoDataUrl = window._bnLogos[0].src;
            broadcast({type:'bn-logos', logos:window._bnLogos});
            loadImg(newSrc).then(function(img){
              lo.ratio = img.naturalWidth / img.naturalHeight;
              syncLogoLayoutSelection();
            })['catch'](function(){ syncLogoLayoutSelection(); });
          }
        });
      } else if(action === 'swap'){
        var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
        if(idx >= 0){
          var next = (idx + 1) % window._bnLogos.length;
          var tmp = window._bnLogos[idx];
          window._bnLogos[idx] = window._bnLogos[next];
          window._bnLogos[next] = tmp;
          window._bnLogoDataUrl = window._bnLogos[0].src;
          renderLogoList();
          broadcast({type:'bn-logos', logos:window._bnLogos});
        }
      } else if(action === 'round'){
        var isOn = imgEl.dataset.bnLogoRound === '1';
        imgEl.dataset.bnLogoRound = isOn ? '' : '1';
        imgEl.style.borderRadius  = isOn ? '' : '10px';
        /* 把 round 狀態存進 _bnLogos */
        var lo = window._bnLogos.find(function(x){return x.id===lid;});
        if(lo) lo.round = !isOn;
        broadcast({type:'bn-logos', logos:window._bnLogos});
        renderLogoList();
      } else if(action === 'delete'){
        window._bnLogos = window._bnLogos.filter(function(x){return x.id!==lid;});
        window._bnLogoDataUrl = window._bnLogos.length ? window._bnLogos[0].src : null;
        renderLogoList();
        broadcast({type:'bn-logo-remove', id:lid});
        broadcast({type:'bn-logos', logos:window._bnLogos});
        syncLogoLayoutSelection();
      }
    }

    /* ══ Logo Menu（logo-editor-plugin.js 的 BNLogoMenu） ══ */
    function attachLogoMenu(lid, imgEl){
      function doAttach(){
        if(!window.BNLogoMenu){ return; }
        var n = window._bnLogos.length;
        window.BNLogoMenu.attach(imgEl, {
          showSwap: n > 1,
          onEdit: function(el, newSrc){
            var lo = window._bnLogos.find(function(x){return x.id===lid;});
            if(lo){
              lo.src = newSrc;
              el.src = newSrc;
              window._bnLogoDataUrl = window._bnLogos[0].src;
              broadcast({type:'bn-logos', logos:window._bnLogos});
              loadImg(newSrc).then(function(img){
                lo.ratio = img.naturalWidth / img.naturalHeight;
                syncLogoLayoutSelection();
              })['catch'](function(){ syncLogoLayoutSelection(); });
            }
          },
          onSwap: function(){
            /* 往右移：把此 logo 往後排一位 */
            var idx = window._bnLogos.findIndex(function(x){return x.id===lid;});
            if(idx < 0) return;
            var next = (idx + 1) % window._bnLogos.length;
            var tmp = window._bnLogos[idx];
            window._bnLogos[idx] = window._bnLogos[next];
            window._bnLogos[next] = tmp;
            window._bnLogoDataUrl = window._bnLogos[0].src;
            renderLogoList();
            broadcast({type:'bn-logos', logos:window._bnLogos});
          },
          onDelete: function(){
            window._bnLogos = window._bnLogos.filter(function(x){return x.id!==lid;});
            window._bnLogoDataUrl = window._bnLogos.length ? window._bnLogos[0].src : null;
            renderLogoList();
            broadcast({type:'bn-logo-remove', id:lid});
            broadcast({type:'bn-logos', logos:window._bnLogos});
            syncLogoLayoutSelection();
          },
          onRound: function(el, isOn){
            broadcast({type:'bn-logos', logos:window._bnLogos});
          }
        });
      }
      if(window.BNLogoMenu){
        doAttach();
      } else {
        loadScriptOnce('js/logo-editor-plugin.js').then(doAttach)['catch'](function(){ BnDialog.alert('logo-editor-plugin.js 載入失敗'); });
      }
    }

    /* ══ Logo 自動去白邊 ══
       上傳的 logo 原圖常常四周留一大片白底或透明區域，直接放到版位上，
       實際看到的 logo 會比框小很多。這裡在「存進 _bnLogos 之前」先把多餘
       留白裁掉，後續裁切／圓邊／廣播到 iframe 用的都是裁好的版本，
       整個流程其他地方完全不用改。

       判斷邏輯放在 js/logo-autotrim-plugin.js（window.BNLogoTrim），
       刻意不沿用上面商品圖用的 autoTrim()：那一版會無條件把接近純白的
       像素當留白，白色 logo（白蝦皮、白字 logo）套下去會被整張切爛。

       這是「加分功能」，所以每一層都留退路：plugin 載入失敗、canvas 被
       跨網域汙染、判斷不出邊界 → 一律回原圖，絕不擋住上傳。 */
    function logoAutoTrimSrc(src){
      function run(){
        if(!window.BNLogoTrim) return Promise.resolve(null);
        return window.BNLogoTrim.trim(src).then(function(r){
          return (r && r.trimmed && r.src) ? r.src : null;
        })['catch'](function(){ return null; });
      }
      if(window.BNLogoTrim) return run();
      return loadScriptOnce('js/logo-autotrim-plugin.js')
        .then(run)['catch'](function(){ return null; });
    }

    /* 回傳 Promise，讓多檔上傳可以「一張處理完再處理下一張」，
       維持使用者選檔的順序（去白邊是非同步的，同時併發跑完成順序不保證，
       Logo1 / Logo2 / Logo3 會亂掉）。 */
    function doLoadLogo(file){
      if(window._bnLogos.length>=MAX_LOGOS)return Promise.resolve();
      return readFile(file).then(function(s){
        return Promise.all([logoAutoTrimSrc(s), loadImg(s)['catch'](function(){ return null; })]).then(function(results){
          var trimmed = results[0];
          var sourceImg = results[1];
          if(window._bnLogos.length>=MAX_LOGOS)return;
          var id='logo_'+Date.now()+'_'+(++_bnLogoSeq);
          var lg={id:id,src:trimmed||s};
          /* 保留剛上傳、還沒去邊的原圖：之後若要做「還原原圖」或除錯，
             不必請使用者重新上傳。 */
          lg.uploadSrc=s;
          if(sourceImg && sourceImg.naturalWidth && sourceImg.naturalHeight){
            lg.ratio=sourceImg.naturalWidth/sourceImg.naturalHeight;
          }
          if(trimmed) lg.autoTrimmed=true;
          window._bnLogos.push(lg);
          window._bnLogoDataUrl=window._bnLogos[0].src;
          renderLogoList();
          /* 廣播：送出全部 logos */
          broadcast({type:'bn-logos',logos:window._bnLogos});
        });
      })['catch'](function(){});
    }

    /* 同一毫秒內連續上傳兩張圖時 Date.now() 會一樣，id 撞號會讓
       移除／排序抓錯那一列，補一個序號確保唯一。 */
    var _bnLogoSeq=0;

    /* 依序處理多個檔案（含上限） */
    function doLoadLogos(files){
      var remaining=MAX_LOGOS-window._bnLogos.length;
      return Array.prototype.slice.call(files,0,Math.max(0,remaining))
        .reduce(function(chain,f){
          return chain.then(function(){ return doLoadLogo(f); });
        }, Promise.resolve())
        .then(function(){ return syncLogoLayoutSelection(); });
    }

    /* ══ 人物上傳（單張；可超出商品範圍與畫布；有人物圖時商品僅顯示第1張） ══ */
    /* 只負責「＋上傳人物圖 / ⟳更換人物圖」按鈕的文字狀態、以及底下的提示文字，
       人物圖真正的卡片（縮圖/編輯/移除/上下層箭頭）改到 buildCharacterRowEl()，
       跟商品一起放進 #bn-prod-list，這樣人物才能跟主品「排在一起」調整上下層，
       不會被上傳按鈕隔開。 */
    /* slotKey 是 '_bnCharacter'(人物1) 或 '_bnCharacter2'(人物2)，
       兩個人物欄位結構、操作邏輯完全一樣，用同一套函式、傳不同 slotKey 重複使用。 */
    function charSlotSuffix(slotKey){ return slotKey === '_bnCharacter2' ? '2' : ''; }
    function charSlotLabel(slotKey){ return slotKey === '_bnCharacter2' ? '人物圖2' : '人物圖1'; }

    function renderCharRow(slotKey){
      var suffix = charSlotSuffix(slotKey);
      var btn = document.getElementById('bn-char'+suffix+'-open-btn');
      var slot = window[slotKey];
      if(slot){
        if(btn){ btn.textContent='⟳ 更換'+charSlotLabel(slotKey); btn.classList.add('has-char'); }
      } else {
        if(btn){ btn.textContent='＋ 上傳'+charSlotLabel(slotKey); btn.classList.remove('has-char'); }
      }
      var hint = document.getElementById('bn-char-hint');
      if(hint) hint.style.display = getCharacterCount()>0 ? 'block' : 'none';
      if(typeof renderProdList === 'function') renderProdList();
    }

    /* 建立人物圖的卡片列（跟商品列同一種 .bn-prod-item 結構，
       按鈕順序也刻意跟商品列一致：縮圖／名稱 → ▲▼ → 編輯 → 移除）。
       pairInfo 有值時代表「兩個人物都存在」，這時候上下箭頭改成跟另一個
       人物互相交換順序（兩個人物一定要排在一起，不會被商品插在中間，
       因為 2 張人物存在時，商品本來就完全不顯示，跟商品比前後沒有意義）。
       pairInfo 為 null 時維持原本邏輯：只跟「目前最上層的商品」比前後。 */
    function buildCharacterRowEl(slotKey, pairInfo){
      var c = window[slotKey];
      var aboveMain = c.aboveMain !== false;
      var row=document.createElement('div'); row.className='bn-prod-item';
      row.style.flexWrap='wrap'; row.style.gap='4px';
      row.style.border='1px solid #e2874a55';

      var img=document.createElement('img'); img.src=c.src;

      var infoWrap=document.createElement('div');
      infoWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';
      var name=document.createElement('span');
      name.textContent=c.name||charSlotLabel(slotKey);
      name.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;';
      var posLabel=document.createElement('span');
      posLabel.textContent = pairInfo
        ? (charSlotLabel(slotKey)+'（跟'+charSlotLabel(pairInfo.otherKey)+'比前後，商品已完全不顯示）')
        : (charSlotLabel(slotKey)+'（跟目前最上層商品比前後）');
      posLabel.style.cssText='font-size:9px;font-weight:700;color:#e2874a;';
      infoWrap.appendChild(name); infoWrap.appendChild(posLabel);

      var moveWrap=document.createElement('div'); moveWrap.className='bn-prod-move';
      var upBtn=document.createElement('button'); upBtn.textContent='▲';
      var downBtn=document.createElement('button'); downBtn.textContent='▼';

      if(pairInfo){
        /* 配對交換模式：兩個人物一定緊鄰在一起，上下箭頭是跟另一個人物
           互相交換排列順序，不是跟商品比較。 */
        upBtn.title = '往前（跟'+charSlotLabel(pairInfo.otherKey)+'交換順序）';
        downBtn.title = '往後（跟'+charSlotLabel(pairInfo.otherKey)+'交換順序）';
        upBtn.disabled = pairInfo.isFirst;      /* 已經排最前面就不用再往前 */
        downBtn.disabled = !pairInfo.isFirst;   /* 已經排最後面就不用再往後 */
        upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
        downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';
        upBtn.addEventListener('click', function(){
          window._bnCharPairFirst = slotKey;
          renderProdList();
          markStateDirty();
        });
        downBtn.addEventListener('click', function(){
          window._bnCharPairFirst = pairInfo.otherKey;
          renderProdList();
          markStateDirty();
        });
      } else {
        /* 上移/下移：只跟「目前最上層的商品」比前後（該商品可能因使用者調整
           了商品的上下層箭頭而換人，人物圖互動對象會自動跟著換） */
        upBtn.title = '往前（蓋住目前最上層的商品）';
        downBtn.title = '往後（被目前最上層的商品蓋住）';
        upBtn.disabled = aboveMain;
        downBtn.disabled = !aboveMain;
        upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
        downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';
        upBtn.addEventListener('click', function(){
          if(!window[slotKey]) return;
          window[slotKey].aboveMain = true;
          renderProdList();
          broadcastCharacter(slotKey);
          markStateDirty();
        });
        downBtn.addEventListener('click', function(){
          if(!window[slotKey]) return;
          window[slotKey].aboveMain = false;
          renderProdList();
          broadcastCharacter(slotKey);
          markStateDirty();
        });
      }
      moveWrap.appendChild(upBtn); moveWrap.appendChild(downBtn);

      var editBtn=document.createElement('button'); editBtn.textContent='編輯';
      editBtn.title='裁切・去背・擦除・影子';
      editBtn.addEventListener('click', function(){ openCharacterEditor(slotKey); });

      var rmBtn=document.createElement('button'); rmBtn.textContent='移除'; rmBtn.className='rm';
      rmBtn.addEventListener('click', function(){
        window[slotKey] = null;
        renderCharRow(slotKey); /* renderCharRow 內部會一併呼叫 renderProdList() 重繪清單 */
        broadcastCharacter(slotKey);
        markStateDirty();
      });

      /* 跟商品列一模一樣的排列順序：縮圖/資訊 → ▲▼ → 編輯 → 移除 */
      row.appendChild(img); row.appendChild(infoWrap); row.appendChild(moveWrap);
      row.appendChild(editBtn); row.appendChild(rmBtn);
      return row;
    }

    function broadcastCharacter(slotKey){
      var slot = window[slotKey];
      if(slot){
        broadcast({type:'bn-character-add', slot:slotKey, id:slot.id, src:slot.src,
          ratio:slot.ratio, layoutById:slot.layouts||null,
          aboveMain: slot.aboveMain !== false});
      } else {
        broadcast({type:'bn-character-remove', slot:slotKey});
      }
      broadcastCharacterVisibility();
    }
    /* 兩個人物都存在時，誰在前面(蓋住誰)明確告知畫布——之前「往上/往下」
       交換順序的按鈕，只有更新面板自己的 _bnCharPairFirst 狀態、重繪清單，
       完全沒有通知畫布要重新排前後順序，導致面板上看起來換了，但畫布上
       兩個人物的疊層順序其實根本沒有變。這裡把這個資訊也廣播出去，
       畫布收到後才會真的調整兩個人物的 z-index。
       只有兩個人物都存在時這則訊息才有意義；0或1個人物時 pairFirst 傳 null，
       畫布端會用回原本「跟商品比前後」的邏輯。 */
    function broadcastCharacterPairOrder(){
      var activeCharKeys = ['_bnCharacter','_bnCharacter2'].filter(function(k){ return window[k]; });
      var pairFirst = null;
      if(activeCharKeys.length === 2){
        pairFirst = (window._bnCharPairFirst && activeCharKeys.indexOf(window._bnCharPairFirst) !== -1)
          ? window._bnCharPairFirst : activeCharKeys[0];
      }
      broadcast({type:'bn-character-pair-order', pairFirst: pairFirst});
    }
    /* 有人物圖時，商品最多只顯示「目前最上層（z-order 排序最前面）」的幾件；
       規則：0張人物->最多3件(全開)，1張人物->最多2件，2張人物->完全不顯示。
       這件事完全由面板端決定並明確告知每個 iframe（用商品 id 清單，不用 position），
       不讓 iframe 自己用 DOM z-index 猜。
       renderProdList() 每次重繪清單時都會呼叫這個函式，商品新增/移除/排序都會涵蓋到，
       兩個人物前後順序也一併在這裡廣播，確保跟可見度同步更新、不會漏送。 */
    function broadcastCharacterVisibility(zSortedIn){
      var zSorted = zSortedIn || window._bnProducts.slice().sort(function(a,b){ return (a.zOrder||0)-(b.zOrder||0); });
      var maxVisible = getMaxProductsVisible();
      var visibleIds = zSorted.slice(0, maxVisible).map(function(p){ return p.id; });
      broadcast({type:'bn-character-visibility', hasChar: productLimitActive(), maxVisible:maxVisible, visibleIds:visibleIds,
        /* 向下相容：topId 給還沒更新的舊版 layout-runtime.js 當備援 */
        topId: visibleIds.length ? visibleIds[0] : null});
      broadcastCharacterPairOrder();
    }
    /* 只換圖片內容（去背/裁切/擦除/影子編輯完成後用），完全不動人物圖目前的
       位置/大小/上下層——避免像 bn-character-add 那樣整個重建造成畫面閃跳。 */
    function broadcastCharacterImageUpdate(slotKey){
      var slot = window[slotKey];
      if(!slot) return;
      broadcast({type:'bn-character-update-image', slot:slotKey, id:slot.id,
        src:slot.src, ratio:slot.ratio});
    }
    /* 暴露給 bn-state-plugin：暫存/工單載入後可重新渲染面板並廣播給 iframe */
    window._bnRenderCharacter = function(){ renderCharRow('_bnCharacter'); renderCharRow('_bnCharacter2'); };
    window._bnBroadcastCharacter = function(){ broadcastCharacter('_bnCharacter'); broadcastCharacter('_bnCharacter2'); };

    /* ── 開啟人物圖編輯器（裁切/去背/擦除/影子），跟商品共用同一支 editor-plugin.js ── */
    function openCharacterEditor(slotKey){
      if(!window[slotKey]) return;
      if(!window.HBNProductEditorPlugin){
        loadScriptOnce('js/editor-plugin.js').then(function(){ doOpenCharacterEditor(slotKey); })['catch'](function(){ BnDialog.alert('editor-plugin.js 載入失敗'); });
        return;
      }
      doOpenCharacterEditor(slotKey);
    }

    function doOpenCharacterEditor(slotKey){
      if(!window.HBNProductEditorPlugin){ BnDialog.alert('editor-plugin.js 未載入'); return; }
      var c = window[slotKey];
      if(!c) return;

      var wrap=document.getElementById('bn-edit-wrap');
      if(!wrap){
        wrap=document.createElement('div');
        wrap.id='bn-edit-wrap';
        wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:400px;height:400px;';
        document.body.appendChild(wrap);
      }
      wrap.innerHTML='';
      var box=document.createElement('div');
      box.className='editor-item';
      var editMeta = c.meta || {};
      var shadowMeta = editMeta.shadow || null;
      var baseSrc = c.baseSrc || editMeta.baseSrc || c.src;
      box.dataset.baseSrc = baseSrc;
      if(shadowMeta && shadowMeta.enabled){
        box.dataset.shadowEnabled = '1';
        box.dataset.pluginShadowX = String(shadowMeta.x || 0);
        box.dataset.pluginShadowY = String(shadowMeta.y || 0);
        box.dataset.pluginShadowW = String(shadowMeta.w || 0);
        box.dataset.pluginShadowH = String(shadowMeta.h || 0);
      }
      box.style.cssText='position:relative;width:400px;height:400px;';
      var img=document.createElement('img');
      img.src=c.src;
      img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
      box.appendChild(img);
      wrap.appendChild(box);

      var observer=new MutationObserver(function(){
        if(img.src && img.src!==c.src && img.src.startsWith('data:')){
          observer.disconnect();
          c.src=img.src;
          c.baseSrc = (box.dataset && box.dataset.baseSrc) ? box.dataset.baseSrc : c.src;
          c.meta = c.meta || {};
          c.meta.baseSrc = c.baseSrc;
          if(box.dataset && box.dataset.shadowEnabled === '1'){
            c.meta.shadow = {
              enabled:true,
              x:parseFloat(box.dataset.pluginShadowX || '0'),
              y:parseFloat(box.dataset.pluginShadowY || '0'),
              w:parseFloat(box.dataset.pluginShadowW || '0'),
              h:parseFloat(box.dataset.pluginShadowH || '0')
            };
          } else {
            c.meta.shadow = {enabled:false};
          }
          var editedRatio = box.dataset && box.dataset.outputRatio ? parseFloat(box.dataset.outputRatio) : NaN;
          if(isFinite(editedRatio) && editedRatio > 0){
            c.ratio = editedRatio;
          } else if(img.naturalWidth && img.naturalHeight){
            c.ratio = img.naturalWidth / img.naturalHeight;
          }
          /* 保留使用者編輯前調整好的位置/大小（c.layouts），不要清掉——
             理由跟商品編輯一樣：清掉會導致編輯完成後人物圖跳回預設位置/尺寸，
             體驗不好。裁切/去背後比例可能改變，但沿用原本的框、用
             object-fit:contain 顯示新圖片即可，畫面頂多留一點內縮空白。 */
          renderCharRow(slotKey);
          broadcastCharacterImageUpdate(slotKey);
          markStateDirty();
        }
      });
      observer.observe(img,{attributes:true,attributeFilter:['src']});

      window.HBNProductEditorPlugin.open(img);
    }

    function initCharacterUpload(slotKey){
      var suffix = charSlotSuffix(slotKey);
      var openBtn = document.getElementById('bn-char'+suffix+'-open-btn');
      var inp = document.getElementById('bn-char'+suffix+'-inp');
      if(!openBtn || !inp) return;
      renderCharRow(slotKey);
      openBtn.addEventListener('click', function(){ inp.click(); });
      inp.addEventListener('change', function(){
        var file = this.files && this.files[0];
        this.value='';
        if(!file) return;
        readFile(file).then(function(src){
          return loadImg(src).then(function(img){
            /* 跟商品上傳一樣：自動判別背景色，裁切到人物實際內容的寬高，
               而不是直接用整張原圖(含四周留白/背景)的比例。 */
            var trimmed = autoTrim(img);
            var prevSlot = window[slotKey];
            var keepId = prevSlot ? prevSlot.id : ('character'+suffix+'_'+Date.now());
            var keepAboveMain = prevSlot ? (prevSlot.aboveMain !== false) : true;
            window[slotKey] = {
              id: keepId,
              src: trimmed.src,
              ratio: trimmed.ratio || 1,
              name: file.name || charSlotLabel(slotKey),
              aboveMain: keepAboveMain, /* 換圖不應該連上下層設定都被重置 */
              layouts: {} /* 換圖重設手動位置，改回預設：商品範圍右側 1/3 寬、高度 auto */
            };
            renderCharRow(slotKey);
            broadcastCharacter(slotKey);
            markStateDirty();
          });
        })['catch'](function(){ BnDialog.alert('人物圖片讀取失敗，請換一張圖片再試'); });
      });
    }

    /* ══ 代言人照＋簽名檔＋代言人小字 ══
       管理方式跟商品圖一樣（縮圖／▲▼／編輯／旋轉角度／移除），但兩張圖都不加影子：
       上傳與工單匯入不烘貼地陰影，編輯視窗也把「加 / 編輯影子」藏起來。
       旋轉沿用商品的管線（baseSrc → 旋轉 → 裁透明邊），影子設定一律關閉。
       畫布規則（預設位置、前後順序、小字字級與黑白字）在 layout-runtime.js。 */
    var ENDORSER_SLOTS = ['_bnEndorserPhoto', '_bnEndorserSign'];
    var ENDORSER_LABEL = {_bnEndorserPhoto:'代言人照', _bnEndorserSign:'簽名檔'};
    /* 曝光資源的代言人／簽名檔小字：最多 10 字＝兩排、每排 5 字（中文 1、英數 0.5），同 MSBN 簽名小字。
       手打／貼上超過會直接擋住；工單帶入或輸入法漏網的超字保留原文、標紅並擋下載（同其他文字欄位）。 */
    var ENDORSER_NOTE_LINE_MAX = 5;
    var ENDORSER_NOTE_LINES = 2;
    var ENDORSER_NOTE_MAX_UNITS = 10;
    var _endorserRotateJobs = {};
    var _endorserRotatePromises = {};
    var _editingEndorserSlot = null;

    function endorserSlotById(id){
      if(!id) return null;
      for(var i = 0; i < ENDORSER_SLOTS.length; i++){
        var s = window[ENDORSER_SLOTS[i]];
        if(s && s.id === id) return ENDORSER_SLOTS[i];
      }
      return null;
    }
    function endorserNoteState(){
      var n = window._bnEndorserNote;
      if(!n || typeof n !== 'object') n = window._bnEndorserNote = {text:'', color:'', layouts:{}};
      if(!n.layouts || typeof n.layouts !== 'object') n.layouts = {};
      if(typeof n.text !== 'string') n.text = n.text == null ? '' : String(n.text);
      if(typeof n.color !== 'string') n.color = '';
      return n;
    }
    function endorserSlotMessage(slotKey){
      var slot = window[slotKey];
      if(!slot) return {type:'bn-endorser-remove', slot:slotKey};
      return {type:'bn-endorser-add', slot:slotKey, id:slot.id, src:slot.src, ratio:slot.ratio,
        layoutById:slot.layouts || null,
        aboveMain: slotKey === '_bnEndorserPhoto' ? slot.aboveMain === true : true,
        rotate:(slot.meta && slot.meta.rotate) || 0};
    }
    function endorserNoteMessage(){
      var n = endorserNoteState();
      return {type:'bn-endorser-note', text:n.text || '', color:n.color || '', layoutById:n.layouts || {}};
    }
    /* 給單一 iframe（下載前／iframe 就緒）補送完整代言人狀態。
       includeRemoves：下載時連「沒有的欄位」也送 remove，清掉 iframe 裡殘留的舊圖。 */
    function sendEndorserStateTo(send, includeRemoves){
      ENDORSER_SLOTS.forEach(function(slotKey){
        if(window[slotKey] || includeRemoves) send(endorserSlotMessage(slotKey));
      });
      if(endorserNoteState().text || includeRemoves) send(endorserNoteMessage());
    }
    function broadcastEndorser(slotKey){
      /* 先送商品可見度，畫布才知道還顯示哪件商品（決定代言人預設放哪一側） */
      broadcastCharacterVisibility();
      broadcast(endorserSlotMessage(slotKey));
    }
    function broadcastAllEndorser(){
      broadcastCharacterVisibility();
      ENDORSER_SLOTS.forEach(function(slotKey){ broadcast(endorserSlotMessage(slotKey)); });
      broadcast(endorserNoteMessage());
    }
    function broadcastEndorserNote(){ broadcast(endorserNoteMessage()); }

    /* 代言人照只裁透明外框、不裁白邊（照片的白底是畫面的一部分，同 BODA 的 alphaOnly），
       超大原圖縮到最長邊 1400px；沒有透明像素的照片存成 JPEG，避免暫存檔暴增。 */
    function endorserAlphaTrim(img){
      var nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      var sc = Math.min(1, 1400 / Math.max(nw, nh));
      var w = Math.max(1, Math.round(nw * sc)), h = Math.max(1, Math.round(nh * sc));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var ctx = c.getContext('2d', {willReadFrequently:true});
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      var d;
      try{ d = ctx.getImageData(0, 0, w, h).data; }catch(_){ return {src:img.src, ratio:nw / nh}; }
      var x0 = w, y0 = h, x1 = -1, y1 = -1, translucent = false;
      for(var y = 0; y < h; y++){
        for(var x = 0; x < w; x++){
          var a = d[(y * w + x) * 4 + 3];
          if(a < 250) translucent = true;
          if(a > 8){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
        }
      }
      if(x1 < 0){ x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
      var tw = x1 - x0 + 1, th = y1 - y0 + 1;
      if(tw === w && th === h && sc === 1) return {src:img.src, ratio:w / h};
      var o = document.createElement('canvas'); o.width = tw; o.height = th;
      o.getContext('2d').drawImage(c, x0, y0, tw, th, 0, 0, tw, th);
      return {src:translucent ? o.toDataURL('image/png') : o.toDataURL('image/jpeg', 0.92), ratio:tw / th};
    }
    /* 簽名檔沿用商品的 autoTrim（依四角底色裁掉留白）。 */
    function makeEndorserSlotFromSrc(slotKey, src, name, prev){
      return loadImg(src).then(function(img){
        var trimmed = slotKey === '_bnEndorserSign' ? autoTrim(img) : endorserAlphaTrim(img);
        return {
          id: prev ? prev.id : ((slotKey === '_bnEndorserSign' ? 'endorser_sign_' : 'endorser_photo_') + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
          src: trimmed.src, baseSrc: trimmed.src, ratio: trimmed.ratio || 1,
          name: name || ENDORSER_LABEL[slotKey],
          aboveMain: prev ? prev.aboveMain === true : false, /* 預設在商品後面（同 MSBN） */
          layouts: {},  /* 換圖回到預設位置 */
          meta: {rotate:0, baseSrc:trimmed.src}
        };
      });
    }

    /* ── 工單匯入時分辨哪張是代言人照、哪張是簽名檔 ──
       1. 檔名：有「簽名／sign」是簽名檔；有「代言／照／photo」是代言人照。
       2. 圖片：簽名檔通常是單色細筆畫（亮度變化小）、筆畫面積小、偏橫；照片相反。
       3. 都分不出來時照欄位順序：「代言人照＋簽名檔」→ 第 1 張照片、第 2 張簽名。 */
    function endorserNameRole(name){
      var n = String(name || '').toLowerCase();
      if(/簽名|簽|sign|signature|autograph/.test(n)) return 'sign';
      if(/代言|照|photo|portrait|人像|形象/.test(n)) return 'photo';
      return '';
    }
    function analyzeEndorserImage(src){
      return loadImg(src).then(function(img){
        var nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
        var sc = Math.min(1, 160 / Math.max(nw, nh));
        var w = Math.max(1, Math.round(nw * sc)), h = Math.max(1, Math.round(nh * sc));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var ctx = c.getContext('2d', {willReadFrequently:true});
        ctx.drawImage(img, 0, 0, w, h);
        var d = ctx.getImageData(0, 0, w, h).data, total = w * h, transparent = 0, i;
        for(i = 3; i < d.length; i += 4) if(d[i] < 20) transparent++;
        var alphaBg = transparent / total > 0.05;
        var ink = 0, sum = 0, sumSq = 0, sat = 0;
        for(i = 0; i < d.length; i += 4){
          if(d[i+3] < 20) continue;
          var r = d[i], g = d[i+1], b = d[i+2];
          var L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          var spread = Math.max(r, g, b) - Math.min(r, g, b);
          /* 沒有透明背景的圖（例如白紙掃描的簽名）把近白色當成底 */
          if(!alphaBg && L > 232 && spread < 24) continue;
          ink++; sum += L; sumSq += L * L; sat += spread;
        }
        var mean = ink ? sum / ink : 0;
        return {ratio:nw / nh, coverage:ink / total,
          lumSD:ink ? Math.sqrt(Math.max(0, sumSq / ink - mean * mean)) : 0,
          sat:ink ? sat / ink : 0};
      })['catch'](function(){ return null; });
    }
    function endorserSignatureScore(f){
      if(!f) return 0;
      var s = 0;
      if(f.lumSD < 22) s += 2; else if(f.lumSD < 38) s += 1; else if(f.lumSD > 55) s -= 1;
      if(f.coverage < 0.3) s += 1; else if(f.coverage > 0.5) s -= 1;
      if(f.ratio > 1.25) s += 1; else if(f.ratio < 0.9) s -= 1;
      if(f.sat > 60) s -= 1;
      return s;
    }
    function classifyEndorserItems(items){
      items = (items || []).slice(0, 2);
      if(!items.length) return Promise.resolve({photo:null, sign:null, method:''});
      var roles = items.map(function(it){ return endorserNameRole(it.name); });
      function pick(photoIdx, method){
        return {photo:photoIdx === null ? null : items[photoIdx],
          sign:items.length === 2 ? items[photoIdx === null ? 0 : 1 - photoIdx] : (photoIdx === null ? items[0] : null),
          method:method};
      }
      if(items.length === 1 && roles[0]) return Promise.resolve(pick(roles[0] === 'photo' ? 0 : null, 'name'));
      if(items.length === 2 && roles[0] !== roles[1] && (roles[0] || roles[1])){
        var known = roles[0] ? 0 : 1;
        return Promise.resolve(pick(roles[known] === 'photo' ? known : 1 - known, 'name'));
      }
      return Promise.all(items.map(function(it){ return analyzeEndorserImage(it.src); })).then(function(feats){
        var scores = feats.map(endorserSignatureScore);
        if(items.length === 1) return pick(scores[0] >= 2 ? null : 0, 'image');
        if(Math.abs(scores[0] - scores[1]) >= 2) return pick(scores[0] > scores[1] ? 1 : 0, 'image');
        return pick(0, 'order');
      });
    }

    /* ── 旋轉：跟商品同一條管線，影子關閉 ── */
    function setEndorserRotation(slotKey, deg, done, opts){
      var slot = window[slotKey];
      if(!slot){ if(done) done(); return Promise.resolve(); }
      var keepScale = !(opts && opts.keepScale === false);
      if(!window._bnGroundShadow){
        return loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body').then(function(){ return setEndorserRotation(slotKey, deg, done, opts); })['catch'](function(){
          BnDialog.alert('bn-shadow-plugin.js 載入失敗');
          if(done) done();
        });
      }
      var rot = window._bnGroundShadow.normalizeRotate(deg);
      slot.meta = slot.meta || {};
      if(!slot.baseSrc) slot.baseSrc = slot.meta.baseSrc || slot.src;
      var prevRot = Number(slot.meta.rotate) || 0;
      var draft = {src:slot.src, baseSrc:slot.baseSrc, ratio:slot.ratio, meta:{rotate:rot, baseSrc:slot.baseSrc}};
      var seq = (_endorserRotateJobs[slotKey] = (_endorserRotateJobs[slotKey] || 0) + 1);
      var job = window._bnGroundShadow.applyToProduct(draft, {enabled:false}).then(function(){
        if(_endorserRotateJobs[slotKey] !== seq || window[slotKey] !== slot) return;
        slot.src = draft.src; slot.ratio = draft.ratio;
        slot.meta.rotate = rot; slot.meta.baseSrc = slot.baseSrc;
        renderEndorserUI();
        broadcast({type:'bn-endorser-update-image', slot:slotKey, id:slot.id, src:slot.src, ratio:slot.ratio, rotate:rot, keepScale:keepScale});
        markStateDirty();
      })['catch'](function(err){
        if(_endorserRotateJobs[slotKey] !== seq) return;
        console.warn('[bn-editor] 代言人旋轉重算失敗', err);
        broadcast({type:'bn-endorser-update-image', slot:slotKey, id:slot.id, src:slot.src, ratio:slot.ratio, rotate:prevRot});
      }).then(function(){ if(done) done(); });
      _endorserRotatePromises[slotKey] = job;
      job.then(function(){ if(_endorserRotatePromises[slotKey] === job) delete _endorserRotatePromises[slotKey]; });
      return job;
    }
    window.addEventListener('message', function(ev){
      var d = ev.data || {};
      if(d.type === 'bn-endorser-rotate'){
        if(window._bnExporting) return;
        var rk = endorserSlotById(d.id) || (ENDORSER_SLOTS.indexOf(d.slot) !== -1 ? d.slot : null);
        var rs = rk && window[rk];
        if(!rs) return;
        var cur = Number(rs.meta && rs.meta.rotate) || 0;
        setEndorserRotation(rk, d.absolute ? (Number(d.rotate) || 0) : cur + (Number(d.delta) || 0));
        return;
      }
      if(d.type === 'bn-endorser-note-layout-update'){
        if(window._bnSuppressProductLayoutWrite || window._bnExporting) return;
        var n = endorserNoteState();
        var nk = d.bnid ? String(d.bnid) : 'default';
        if(d.snapshotOnly && d.layout){
          var prevNote = n.layouts[nk];
          if(prevNote && prevNote.src && d.layout.src && String(prevNote.src) !== String(d.layout.src)) return;
        }
        if(d.layout) n.layouts[nk] = d.layout; else delete n.layouts[nk];
        /* 各版位自己算的預設位置／換圖後的相對位置只記下來，不連動其他版位 */
        if(d.snapshotOnly) return;
        if(!d.migrate && endorserMasterOf(nk) === 'lpbn') markEndorserLpbnOwn();
        syncEndorserNoteLayoutToPairs(nk, d.layout);
        markStateDirty();
      }
    });
    /* 小字位置跟代言人照、簽名檔同一套連動（HBN 主要指標、LPBN 第二指標，其他版位自動配合）。 */
    function syncEndorserNoteLayoutToPairs(sourceBnid, layout){
      if(!layout || !productLayoutSyncEligible(sourceBnid) || !productLayoutIsLocked(sourceBnid)) return;
      var n = endorserNoteState();
      endorserSyncTargets(sourceBnid).forEach(function(tid){
        var cloned = JSON.parse(JSON.stringify(layout));
        n.layouts[tid] = cloned;
        broadcastTo(tid, {type:'bn-endorser-note-layout-apply', layout:cloned});
      });
    }

    /* ── 編輯（裁切／去背／擦除），不提供影子 ── */
    document.addEventListener('click', function(e){
      if(!_editingEndorserSlot) return;
      var btn = e.target && e.target.closest ? e.target.closest('.hbn-plugin-modal [data-act="shadow"]') : null;
      if(!btn) return;
      e.stopPropagation(); e.preventDefault();
    }, true);
    function setEndorserEditing(slotKey){
      _editingEndorserSlot = slotKey || null;
      document.documentElement.classList.toggle('bn-endorser-editing', !!slotKey);
    }
    function watchEndorserEditorClose(){
      var modal = document.querySelector('.hbn-plugin-modal');
      if(!modal){ setEndorserEditing(null); return; }
      var mo = new MutationObserver(function(){
        if(modal.classList.contains('open')) return;
        mo.disconnect();
        setEndorserEditing(null);
      });
      mo.observe(modal, {attributes:true, attributeFilter:['class']});
    }
    function openEndorserEditor(slotKey){
      if(!window[slotKey]) return;
      if(!window.HBNProductEditorPlugin){
        loadScriptOnce('js/editor-plugin.js').then(function(){ doOpenEndorserEditor(slotKey); })['catch'](function(){ BnDialog.alert('editor-plugin.js 載入失敗'); });
        return;
      }
      doOpenEndorserEditor(slotKey);
    }
    function doOpenEndorserEditor(slotKey){
      var slot = window[slotKey];
      if(!slot || !window.HBNProductEditorPlugin) return;
      var wrap = document.getElementById('bn-edit-wrap');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.id = 'bn-edit-wrap';
        wrap.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:400px;height:400px;';
        document.body.appendChild(wrap);
      }
      wrap.innerHTML = '';
      var box = document.createElement('div');
      box.className = 'editor-item';
      /* 有旋轉時在「沒旋轉的原圖」上編輯，做完再重新旋轉 */
      var base = slot.baseSrc || (slot.meta && slot.meta.baseSrc) || slot.src;
      var rotated = !!(Number(slot.meta && slot.meta.rotate) || 0);
      var openSrc = rotated ? base : slot.src;
      box.dataset.baseSrc = openSrc;
      box.style.cssText = 'position:relative;width:400px;height:400px;';
      var img = document.createElement('img');
      img.src = openSrc;
      img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block;';
      box.appendChild(img);
      wrap.appendChild(box);
      var observer = new MutationObserver(function(){
        if(!img.src || img.src === openSrc || img.src.indexOf('data:') !== 0) return;
        observer.disconnect();
        if(window[slotKey] !== slot) return;
        var edited = img.src;
        loadImg(edited).then(function(ei){
          slot.baseSrc = edited;
          slot.meta = slot.meta || {};
          slot.meta.baseSrc = edited;
          var rot = Number(slot.meta.rotate) || 0;
          if(rot) return setEndorserRotation(slotKey, rot, null, {keepScale:false});
          slot.src = edited;
          var outRatio = box.dataset && box.dataset.outputRatio ? parseFloat(box.dataset.outputRatio) : NaN;
          slot.ratio = isFinite(outRatio) && outRatio > 0 ? outRatio : ((ei.naturalWidth / ei.naturalHeight) || slot.ratio);
          renderEndorserUI();
          broadcast({type:'bn-endorser-update-image', slot:slotKey, id:slot.id, src:slot.src, ratio:slot.ratio, rotate:0});
          markStateDirty();
        })['catch'](function(){ BnDialog.alert(ENDORSER_LABEL[slotKey] + '編輯結果讀取失敗'); });
      });
      observer.observe(img, {attributes:true, attributeFilter:['src']});
      setEndorserEditing(slotKey);
      window.HBNProductEditorPlugin.open(img);
      watchEndorserEditorClose();
    }

    /* ── 左側清單 ── */
    function swapEndorserSlots(){
      var photo = window._bnEndorserPhoto, sign = window._bnEndorserSign;
      /* 角色互換後位置回到預設（照片／簽名的預設大小不同），旋轉角度保留 */
      window._bnEndorserPhoto = sign ? Object.assign({}, sign, {layouts:{}, aboveMain:false}) : null;
      window._bnEndorserSign = photo ? Object.assign({}, photo, {layouts:{}}) : null;
      renderEndorserUI();
      broadcastAllEndorser();
      markStateDirty();
    }
    function buildEndorserRowEl(slotKey){
      var slot = window[slotKey];
      var isPhoto = slotKey === '_bnEndorserPhoto';
      var row = document.createElement('div');
      row.className = 'bn-prod-item bn-endorser-item';
      row.style.flexWrap = 'wrap'; row.style.gap = '4px';

      var img = document.createElement('img'); img.src = slot.src;
      var info = document.createElement('div');
      info.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';
      var name = document.createElement('span');
      name.textContent = slot.name || ENDORSER_LABEL[slotKey];
      name.title = slot.name || '';
      name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;';
      var role = document.createElement('span');
      role.textContent = isPhoto
        ? ('代言人照（' + (slot.aboveMain === true ? '在商品前面' : '在商品後面') + '）')
        : '簽名檔（蓋在最上層）';
      role.style.cssText = 'font-size:9px;font-weight:700;color:#c084fc;';
      info.appendChild(name); info.appendChild(role);
      row.appendChild(img); row.appendChild(info);

      if(isPhoto){
        var move = document.createElement('div'); move.className = 'bn-prod-move';
        var up = document.createElement('button'); up.textContent = '▲'; up.title = '往前（蓋住目前最上層的商品）';
        var down = document.createElement('button'); down.textContent = '▼'; down.title = '往後（被目前最上層的商品蓋住）';
        up.disabled = slot.aboveMain === true;
        down.disabled = slot.aboveMain !== true;
        up.style.opacity = up.disabled ? '0.3' : '1';
        down.style.opacity = down.disabled ? '0.3' : '1';
        function setAbove(v){
          if(!window[slotKey]) return;
          window[slotKey].aboveMain = v;
          renderEndorserUI();
          broadcast({type:'bn-endorser-order', aboveMain:v});
          markStateDirty();
        }
        up.addEventListener('click', function(){ setAbove(true); });
        down.addEventListener('click', function(){ setAbove(false); });
        move.appendChild(up); move.appendChild(down);
        row.appendChild(move);
      }

      var editBtn = document.createElement('button'); editBtn.textContent = '編輯';
      editBtn.title = '裁切・去背・擦除（不加影子）';
      editBtn.addEventListener('click', function(){ openEndorserEditor(slotKey); });
      row.appendChild(editBtn);

      var rotWrap = document.createElement('label');
      rotWrap.title = '旋轉角度（-180～180°）。也可以直接拖畫布上的旋轉把手，按住 Shift 以 15° 為單位。';
      rotWrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;font-size:10px;color:#8b949e;';
      var rotInp = document.createElement('input');
      rotInp.type = 'number'; rotInp.min = '-180'; rotInp.max = '180'; rotInp.step = '1';
      rotInp.value = String(Math.round(Number(slot.meta && slot.meta.rotate) || 0));
      rotInp.style.cssText = 'width:46px;padding:2px 4px;font-size:11px;background:#0d1117;color:#e6e8ef;border:1px solid #30363d;border-radius:4px;';
      var rotUnit = document.createElement('span'); rotUnit.textContent = '°';
      rotWrap.appendChild(rotInp); rotWrap.appendChild(rotUnit);
      var rotTimer = null;
      rotInp.addEventListener('input', function(){
        var v = Number(rotInp.value);
        if(!isFinite(v)) return;
        clearTimeout(rotTimer);
        rotTimer = setTimeout(function(){
          rotInp.disabled = true;
          setEndorserRotation(slotKey, v, function(){ rotInp.disabled = false; });
        }, 250);
      });
      row.appendChild(rotWrap);

      var swapBtn = document.createElement('button'); swapBtn.textContent = '⇄';
      swapBtn.title = isPhoto ? '自動判斷錯了：改成簽名檔（跟簽名檔對調）' : '自動判斷錯了：改成代言人照（跟代言人照對調）';
      swapBtn.addEventListener('click', swapEndorserSlots);
      row.appendChild(swapBtn);

      var rmBtn = document.createElement('button'); rmBtn.textContent = '移除'; rmBtn.className = 'rm';
      rmBtn.addEventListener('click', function(){
        window[slotKey] = null;
        renderEndorserUI();
        broadcastEndorser(slotKey);
        markStateDirty();
      });
      row.appendChild(rmBtn);
      return row;
    }

    function endorserCharUnits(ch){
      var c = ch.charCodeAt(0);
      return (c <= 0xFF || (c >= 0xFF61 && c <= 0xFF9F)) ? 0.5 : 1;
    }
    function endorserLineUnits(line){
      var n = 0;
      for(var i = 0; i < line.length; i++) n += endorserCharUnits(line[i]);
      return n;
    }
    function endorserNoteStatus(text){
      var t = String(text == null ? '' : text).replace(/\r\n?/g, '\n');
      var units = endorserLineUnits(t.replace(/\n/g, ''));
      var lines = t ? t.split('\n').length : 0;
      return {units: Math.round(units * 10) / 10, lines: lines,
        over: units > ENDORSER_NOTE_MAX_UNITS + 0.001 || lines > ENDORSER_NOTE_LINES};
    }
    /* 給曝光資源的字數上限檢查（常駐提醒、下載前硬擋）用，算法跟左側字數提示一致 */
    window._bnEndorserNoteStatus = endorserNoteStatus;
    /* 一排超過 5 字時自動流到下一排（同 MSBN 兩行欄位）；不刪字，超過 10 字或兩排時字數提示變紅。 */
    function normalizeEndorserNoteText(text){
      var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
      var out = [];
      lines.forEach(function(line){
        var cur = '', units = 0;
        for(var i = 0; i < line.length; i++){
          var u = endorserCharUnits(line[i]);
          if(units + u > ENDORSER_NOTE_LINE_MAX && cur){ out.push(cur); cur = ''; units = 0; }
          cur += line[i]; units += u;
        }
        out.push(cur);
      });
      return out.join('\n');
    }
    function renderEndorserNoteUI(){
      var n = endorserNoteState();
      var inp = document.getElementById('bn-endorser-note-inp');
      /* 舊暫存是用舊的換行規則存的：不在輸入中時照現在的規則（每排 5 字）重排一次，再送給版位 */
      if(document.activeElement !== inp && n.text){
        var rewrapped = normalizeEndorserNoteText(n.text);
        if(rewrapped !== n.text){
          n.text = rewrapped;
          setTimeout(function(){ broadcastEndorserNote(); markStateDirty(); }, 0);
        }
      }
      if(inp && document.activeElement !== inp && inp.value !== n.text) inp.value = n.text;
      var st = endorserNoteStatus(n.text);
      var cnt = document.getElementById('bn-endorser-note-count');
      if(cnt){
        cnt.textContent = n.text
          ? st.units + '/' + ENDORSER_NOTE_MAX_UNITS + ' 字' + (st.lines > ENDORSER_NOTE_LINES ? '・超過兩排' : '')
          : '最多 10 字（兩排）';
        cnt.classList.toggle('over', st.over);
      }
      var wrap = inp && inp.closest ? inp.closest('.bn-endorser-note-wrap') : null;
      if(wrap) wrap.classList.toggle('over', st.over);
      if(typeof window.bnRefreshLimitAlert === 'function') window.bnRefreshLimitAlert();
      var auto = document.getElementById('bn-endorser-note-auto');
      var color = document.getElementById('bn-endorser-note-color');
      if(auto) auto.classList.toggle('on', !n.color);
      if(color && n.color && color.value.toLowerCase() !== n.color.toLowerCase()) color.value = n.color;
    }
    function initEndorserNoteUI(){
      var inp = document.getElementById('bn-endorser-note-inp');
      var auto = document.getElementById('bn-endorser-note-auto');
      var color = document.getElementById('bn-endorser-note-color');
      var timer = null;
      function commit(){
        var raw = inp.value;
        var normalized = normalizeEndorserNoteText(raw);
        if(normalized !== raw){
          var caret = inp.selectionStart;
          var atEnd = caret === raw.length;
          inp.value = normalized;
          var pos = atEnd ? normalized.length : Math.min(normalized.length, caret + (normalized.length - raw.length));
          try{ inp.setSelectionRange(pos, pos); }catch(_){ }
        }
        endorserNoteState().text = normalized;
        renderEndorserNoteUI();
        clearTimeout(timer);
        timer = setTimeout(function(){ broadcastEndorserNote(); markStateDirty(); }, 120);
      }
      if(inp){
        /* 手打或貼上會超過 10 字（或第三排）就直接擋住，跟其他文字欄位一樣；
           選字中不擋，選完若超過就保留原文、標紅並擋下載。 */
        var wrap = inp.closest ? inp.closest('.bn-endorser-note-wrap') : null;
        var flashTimer = null;
        var nextValue = function(insert){
          var s = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
          var e2 = inp.selectionEnd == null ? inp.value.length : inp.selectionEnd;
          return inp.value.slice(0, s) + insert + inp.value.slice(e2);
        };
        var wouldOverflow = function(value){
          var st = endorserNoteStatus(normalizeEndorserNoteText(value));
          return st.over;
        };
        var flash = function(){
          if(!wrap) return;
          wrap.classList.add('limit-flash');
          clearTimeout(flashTimer);
          flashTimer = setTimeout(function(){ wrap.classList.remove('limit-flash'); }, 450);
        };
        inp.addEventListener('beforeinput', function(e){
          if(e.isComposing) return;
          var type = e.inputType || '';
          if(type.indexOf('delete') === 0 || type.indexOf('history') === 0) return;
          var insert = (type === 'insertLineBreak' || type === 'insertParagraph') ? '\n' : (e.data || '');
          if(!insert) return;
          if(wouldOverflow(nextValue(insert))){ e.preventDefault(); flash(); }
        });
        inp.addEventListener('paste', function(e){
          var text = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\r\n?/g, '\n');
          if(wouldOverflow(nextValue(text))){ e.preventDefault(); flash(); }
        });
        /* 注音／拼音選字中不改值，選完（compositionend）才整理換行 */
        inp.addEventListener('input', function(e){ if(e.isComposing) return; commit(); });
        inp.addEventListener('compositionend', commit);
      }
      if(auto) auto.addEventListener('click', function(){
        endorserNoteState().color = '';
        renderEndorserNoteUI(); broadcastEndorserNote(); markStateDirty();
      });
      if(color) color.addEventListener('input', function(){
        endorserNoteState().color = color.value;
        renderEndorserNoteUI(); broadcastEndorserNote(); markStateDirty();
      });
    }
    function renderEndorserUI(){
      var photoBtn = document.getElementById('bn-endorser-photo-btn');
      var signBtn = document.getElementById('bn-endorser-sign-btn');
      if(photoBtn){
        photoBtn.textContent = window._bnEndorserPhoto ? '⟳ 更換代言人照' : '＋ 上傳代言人照';
        photoBtn.classList.toggle('has-img', !!window._bnEndorserPhoto);
      }
      if(signBtn){
        signBtn.textContent = window._bnEndorserSign ? '⟳ 更換簽名檔' : '＋ 上傳簽名檔';
        signBtn.classList.toggle('has-img', !!window._bnEndorserSign);
      }
      var list = document.getElementById('bn-endorser-list');
      if(list){
        list.innerHTML = '';
        ENDORSER_SLOTS.forEach(function(slotKey){ if(window[slotKey]) list.appendChild(buildEndorserRowEl(slotKey)); });
      }
      var hint = document.getElementById('bn-endorser-hint');
      if(hint) hint.classList.toggle('on', hasEndorserImage());
      renderEndorserNoteUI();
      if(typeof renderProdList === 'function') renderProdList();
    }
    function initEndorserUpload(slotKey){
      var key = slotKey === '_bnEndorserSign' ? 'sign' : 'photo';
      var btn = document.getElementById('bn-endorser-' + key + '-btn');
      var inp = document.getElementById('bn-endorser-' + key + '-inp');
      if(!btn || !inp) return;
      btn.addEventListener('click', function(){ inp.click(); });
      inp.addEventListener('change', function(){
        var file = this.files && this.files[0];
        this.value = '';
        if(!file) return;
        readFile(file).then(function(src){
          return makeEndorserSlotFromSrc(slotKey, src, file.name, window[slotKey]);
        }).then(function(slot){
          window[slotKey] = slot;
          renderEndorserUI();
          broadcastEndorser(slotKey);
          markStateDirty();
        })['catch'](function(){ BnDialog.alert(ENDORSER_LABEL[slotKey] + '讀取失敗，請換一張圖片再試'); });
      });
    }

    /* ── BODA 工單：工單總覽「代言人照+簽名檔路徑」與「代言人小字」 ──
       同一包素材重送時（BODA 每讀完一批圖片、或重新整理後曝光資源載入時都會再推一次）
       不覆蓋使用者在這裡的手動調整；只有工單內容變了、或目前完全沒有代言人圖時才重新套用。
       上次套用的工單內容記在 _bnEndorserNote.woSig／woNote，跟暫存一起保存，重新整理後也認得。 */
    function endorserItemsSignature(items){
      return (items || []).map(workorderAssetKey).join('||');
    }
    function endorserWorkorderNeedsApply(payload){
      var items = normalizeWorkorderAssets(payload && payload.endorsers, 'endorser');
      if(!payload || payload.replaceEndorser !== true || !items.length) return false;
      return endorserItemsSignature(items) !== (endorserNoteState().woSig || '') || !hasEndorserImage();
    }
    function endorserWorkorderNoteText(payload){
      var raw = payload && typeof payload.endorserNote === 'string' ? payload.endorserNote.trim() : '';
      return raw ? normalizeEndorserNoteText(raw) : '';
    }
    function endorserWorkorderNoteNeedsApply(payload){
      var text = endorserWorkorderNoteText(payload);
      var n = endorserNoteState();
      /* 只比文字本身、不比換行位置：換行規則改了，同一份工單重送也不會蓋掉手動調整 */
      var flat = function(s){ return String(s || '').replace(/\n/g, ''); };
      return !!text && (flat(text) !== flat(n.woNote) || !n.text);
    }
    function buildWorkorderEndorserSlots(payload){
      var items = normalizeWorkorderAssets(payload.endorsers, 'endorser');
      return classifyEndorserItems(items).then(function(roles){
        return Promise.all([
          roles.photo ? makeEndorserSlotFromSrc('_bnEndorserPhoto', roles.photo.src, roles.photo.name, null) : null,
          roles.sign ? makeEndorserSlotFromSrc('_bnEndorserSign', roles.sign.src, roles.sign.name, null) : null
        ]).then(function(slots){
          return {photo:slots[0], sign:slots[1], method:roles.method, sig:endorserItemsSignature(items)};
        });
      });
    }

    /* 暴露給 bn-state-plugin／工單外掛 */
    window._bnRenderEndorser = function(){ renderEndorserUI(); };
    window._bnBroadcastEndorser = function(){ broadcastAllEndorser(); };
    window._bnSetEndorserNote = function(text){
      endorserNoteState().text = normalizeEndorserNoteText(text);
      /* 外部帶入（工單）：輸入框有焦點也要換成新內容 */
      var noteInp = document.getElementById('bn-endorser-note-inp');
      if(noteInp) noteInp.value = endorserNoteState().text;
      renderEndorserUI();
      broadcastEndorserNote();
      markStateDirty();
    };
    window._bnClassifyEndorserItems = classifyEndorserItems;

    /* ══ 商品上傳（Modal） ══ */
    var modal, staged=[], heroIdx=0, rankOrder=null, currentStep=1, dragSrc=null;
    var productOptionsTourState=null;

    function insertProductUI(){
      var scroll=document.getElementById('sidebar-scroll');
      if(!scroll||document.getElementById('bn-prod-open-btn'))return;
      var target=null;
      scroll.querySelectorAll('.s-section').forEach(function(el){if(el.textContent.trim()==='排版選擇')target=el;});
      var sec=document.createElement('div');
      sec.innerHTML=[
        '<div class="s-section" style="margin-top:8px">商品圖（最多3張）</div>',
        '<div class="bn-section">',
        '  <button id="bn-prod-open-btn">＋ 上傳商品圖</button>',
        '  <div class="bn-prod-list" id="bn-prod-list"></div>',
        '</div>',
        '<div class="s-section" style="margin-top:8px">代言人（照片＋簽名檔，不加影子）</div>',
        '<div class="bn-section" id="bn-endorser-section">',
        '  <div class="bn-endorser-btns">',
        '    <button id="bn-endorser-photo-btn" class="bn-endorser-up">＋ 上傳代言人照</button>',
        '    <button id="bn-endorser-sign-btn" class="bn-endorser-up">＋ 上傳簽名檔</button>',
        '  </div>',
        '  <input type="file" id="bn-endorser-photo-inp" accept="image/*" style="display:none">',
        '  <input type="file" id="bn-endorser-sign-inp" accept="image/*" style="display:none">',
        '  <div class="bn-prod-list" id="bn-endorser-list"></div>',
        '  <div class="bn-endorser-note-wrap">',
        '    <label for="bn-endorser-note-inp"><span>代言人小字</span><span id="bn-endorser-note-count">最多 10 字（兩排）</span></label>',
        '    <textarea id="bn-endorser-note-inp" rows="2" data-limit="10" placeholder="最多 10 字，每排 5 字（Enter 換第二排）"></textarea>',
        '    <div class="bn-endorser-note-color"><span>字色</span><button type="button" id="bn-endorser-note-auto" class="on" title="依小字底下的顏色自動用黑字或白字（同 MSBN）">自動黑白</button><input type="color" id="bn-endorser-note-color" value="#111827" title="手動指定字色"></div>',
        '  </div>',
        '  <div id="bn-endorser-hint" class="bn-endorser-hint">商品與代言人照各算 1 品，合計最多 3 品；簽名檔、代言人小字不占品數。有代言人照時可顯示 2 件商品；只有簽名檔時仍可顯示 3 件商品。只放在 ddcard、IG、HBN、LPBN、Coin、FB POST、SCBN、活動總覽、SBA、AMS。代言人照、簽名檔、小字各自拖曳；簽名檔和小字以代言人照為基準連動到其他版位，三者在每個版位都一樣靠近。</div>',
        '</div>',
        '<div class="s-section" style="margin-top:8px">背景圖</div>',
        '<div class="bn-section">',
        '  <button id="bn-bg-open-btn">⬆ 上傳背景圖</button>',
        '  <input type="file" id="bn-bg-inp" accept="image/*" style="display:none">',
        '  <div id="bn-bg-preview" style="display:none;margin-top:6px">',
        '    <div style="position:relative;margin-bottom:4px">',
        '      <img id="bn-bg-thumb" style="width:100%;max-height:60px;object-fit:cover;border-radius:5px;border:1px solid var(--border,#30363d)">',
        '      <button id="bn-bg-clear" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,.6);border:none;color:#fff;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;line-height:1">✕</button>',
        '    </div>',
        '    <div id="bn-bg-summary" style="font-size:10px;color:var(--text3,#687090)">各版位可在右側獨立調整縮放和位置</div>',
        '  </div>',
        '</div>',
      ].join('');
      if(target)scroll.insertBefore(sec,target);else scroll.appendChild(sec);
      document.getElementById('bn-prod-open-btn').addEventListener('click',openModal);
      buildModal();
      initEndorserUpload('_bnEndorserPhoto');
      initEndorserUpload('_bnEndorserSign');
      initEndorserNoteUI();
      renderEndorserUI();

      /* 背景圖上傳事件 */
      var bgInp = document.getElementById('bn-bg-inp');
      var bgPreview = document.getElementById('bn-bg-preview');
      var bgThumb = document.getElementById('bn-bg-thumb');
      var bgClear = document.getElementById('bn-bg-clear');
      var bgOpenBtn = document.getElementById('bn-bg-open-btn');

      /* 每個版位獨立的背景圖狀態 */
      var _bgStates = {}; /* { layoutId: {src,fit,scale,x,y} } */
      var _bgActiveId = null; /* 目前編輯的版位 id */

      function isNoImageBackgroundLayout(id, ifrEl){
        var name = getLayoutNameById(id);
        var src = '';
        try{ src = decodeURIComponent(String((ifrEl && (ifrEl.getAttribute('src') || ifrEl.src)) || '')); }catch(_){ }
        var combined = name + ' ' + src;
        if(/SearchICON_(LOGO|PRODUCT|TEXT)|首頁LOGO牆/i.test(combined)) return true;
        if(/\bAR(?:_LOGO)?\b/i.test(combined)) return true;
        return false;
      }

      function cloneBgStates(){
        var out = {};
        var hasSrc = false;
        Object.keys(_bgStates).forEach(function(id){
          var st = _bgStates[id] || {};
          var noImageBg = isNoImageBackgroundLayout(id, null);
          if(!noImageBg && st.src && st.src !== '__BN_IDB__') hasSrc = true;
          out[id] = {
            src: (!noImageBg && st.src && st.src !== '__BN_IDB__') ? st.src : null,
            fit: st.fit || 'auto',
            sizeBasis: st.sizeBasis || 'width',
            positionMode: st.positionMode || 'legacy',
            scale: st.scale !== undefined ? st.scale : 100,
            x: st.x !== undefined ? st.x : 50,
            y: st.y !== undefined ? st.y : 50,
            slab: !!st.slab,
            _initialized: !!st._initialized,
            _userEdited: !!st._userEdited,
            _orient: st._orient || ''
          };
        });

        /* 舊版背景上傳流程只存在 window._bgDataUrl；若 _bgStates 尚未建立，
           下載/本機暫存仍要把畫布上的背景圖完整帶走。 */
        if(!hasSrc && window._bgDataUrl){
          document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
            var id = getIfrBnid(ifrEl);
            if(!id) return;
            if(isNoImageBackgroundLayout(id, ifrEl)) return;
            out[id] = out[id] || (function(){ var _dp=getDefaultBgParamsForLayout(id, ifrEl); return {fit:_dp.fit,sizeBasis:_dp.sizeBasis||'width',positionMode:'legacy',scale:_dp.scale,x:_dp.x,y:_dp.y,_initialized:true}; })();
            out[id].src = window._bgDataUrl;
            out[id].fit = out[id].fit || 'auto';
            out[id].scale = out[id].scale !== undefined ? out[id].scale : 100;
            out[id].x = out[id].x !== undefined ? out[id].x : 50;
            out[id].y = out[id].y !== undefined ? out[id].y : 50;
            out[id]._initialized = true;
          });
        }
        return out;
      }

      function refreshBgPreviewFromStates(){
        var first = null;
        Object.keys(_bgStates).some(function(id){
          if(_bgStates[id] && _bgStates[id].src){ first = _bgStates[id].src; return true; }
          return false;
        });
        if(bgThumb) bgThumb.src = first || '';
        if(bgPreview) bgPreview.style.display = first ? 'block' : 'none';
        if(bgOpenBtn) bgOpenBtn.textContent = first ? '⬆ 更換背景圖' : '⬆ 上傳背景圖';
      }

      function applyBgStates(nextStates, activeId){
        var prevStates = _bgStates || {};
        _bgStates = {};
        var hasRealSrc = false;
        if(nextStates && typeof nextStates === 'object'){
          Object.keys(nextStates).forEach(function(id){
            var st = nextStates[id] || {};
            var prev = prevStates[id] || {};
            /* __BN_IDB__ 是 本機暫存 輕量備援的佔位符，不能當成 null 廣播，否則會洗掉畫布背景。 */
            var src = isNoImageBackgroundLayout(id, null) ? null
              : (st.src === '__BN_IDB__' ? (prev.src || window._bgDataUrl || null) : (st.src || null));
            if(src) hasRealSrc = true;
            _bgStates[id] = {
              src: src,
              fit: st.fit || prev.fit || 'auto',
              sizeBasis: st.sizeBasis || prev.sizeBasis || 'width',
              positionMode: st.positionMode || (st.src === '__BN_IDB__' ? prev.positionMode : '') || 'legacy',
              scale: st.scale !== undefined ? parseInt(st.scale,10) : (prev.scale !== undefined ? prev.scale : 100),
              x: st.x !== undefined ? parseFloat(st.x) : (prev.x !== undefined ? prev.x : 50),
              y: st.y !== undefined ? parseFloat(st.y) : (prev.y !== undefined ? prev.y : 50),
              slab: !!st.slab,
              _initialized: st._initialized !== false,
              _userEdited: !!st._userEdited,
              _orient: st._orient || ''
            };
          });
        }
        /* 若載入的是舊版 JSON，只帶 legacySrc，補成每個 iframe 的背景狀態。 */
        if(!hasRealSrc && window._bgDataUrl){
          document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
            var id = getIfrBnid(ifrEl);
            if(!id) return;
            if(isNoImageBackgroundLayout(id, ifrEl)) return;
            _bgStates[id] = _bgStates[id] || (function(){ var _dp=getDefaultBgParamsForLayout(id, ifrEl); return {fit:_dp.fit,sizeBasis:_dp.sizeBasis||'width',positionMode:'legacy',scale:_dp.scale,x:_dp.x,y:_dp.y,_initialized:true}; })();
            _bgStates[id].src = window._bgDataUrl;
          });
        }
        _bgActiveId = activeId || _bgActiveId || null;
        refreshBgPreviewFromStates();
        /* 上傳暫存後 iframe 可能尚未 ready，連續補送確保右側畫布也吃到背景圖。 */
        [0, 120, 350, 800, 1500].forEach(function(delay){
          setTimeout(function(){ buildBgPanels(); bgBroadcastAll(); }, delay);
        });
      }

      function getBgState(id){
        if(!_bgStates[id]) _bgStates[id] = {src:null,fit:'auto',sizeBasis:'width',positionMode:'legacy',scale:100,x:50,y:50};
        return _bgStates[id];
      }

      /* 暴露給 bn-state-plugin：讓下載/上傳暫存能完整包含背景圖與各版位設定 */
      window._bnGetBgStates = function(){ return cloneBgStates(); };
      window._bnSetBgStates = function(states, activeId){ applyBgStates(states, activeId); };
      window._bnGetBgActiveId = function(){ return _bgActiveId; };
      window._bnRefreshCanvasBackgrounds = function(){
        if(window._bgDataUrl){
          document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
            var id = getIfrBnid(ifrEl);
            if(!id) return;
            if(isNoImageBackgroundLayout(id, ifrEl)) return;
            var st = getBgState(id);
            if(!st.src) st.src = window._bgDataUrl;
          });
        }
        bgBroadcastAll();
      };
      /* 懶載入的版位是在使用者往下捲動後才建立；它可能完全錯過先前
         選背景時的廣播。版位回報 bn-iframe-ready 時只補送該版位目前的
         背景狀態，不重播商品、LOGO 或任何排版訊息。 */
      window._bnBgReadyCallback = function(id){
        if(!id) return;
        var ifrEl = document.getElementById('iframe-' + id);
        if(!ifrEl) return;
        var st = getBgState(String(id));
        /* 2026-11-14：上傳 LOGO 後版位會換成同系列的另一張（例如 HBN_橫式LOGO → HBN_方式LOGO），
           背景狀態是照版位存的，新版位就回到預設、看起來像「背景調整被重置」。
           新版位還沒被手動調整過時，沿用同系列版位手動調好的縮放／位置。 */
        if(!st._userEdited){
          var sib = findBgVariantSibling(String(id), ifrEl);
          if(sib){
            ['src','fit','sizeBasis','positionMode','scale','x','y','slab'].forEach(function(k){ if(sib[k] !== undefined) st[k] = sib[k]; });
            st._initialized = true; st._userEdited = true; st._orient = sib._orient;
          }
        }
        var sources = window._bnBgOrientationSources || null;
        if(!st.src && sources){
          st.src = getBgLayoutOrientation(String(id), ifrEl) === 'vertical'
            ? (sources.vertical || sources.horizontal)
            : (sources.horizontal || sources.vertical);
          if(st.src && !st._initialized){
            var params = getDefaultBgParamsForLayout(String(id), ifrEl);
            st.fit = params.fit; st.sizeBasis = params.sizeBasis || 'width';
            st.scale = params.scale; st.x = params.x; st.y = params.y;
            st._initialized = true;
          }
        }
        bgSendToIframe(ifrEl, String(id));
        /* 2026-11-14：懶載入的版位在 buildBgPanels 跑的當下還沒有 src（取不到 bnid），
           所以沒建「背景圖調整」面板，滑鼠移上去不會出現。就緒時補建。 */
        try{ buildBgPanels(true); }catch(_){ }
      };
      /* 精準同步單一 iframe 背景。下載圖片會用這個，避免廣播全部版位時
         把尚未 ready 或 id 取不到的 iframe 送成 null 背景。 */
      window._bnSendBgToIframe = function(ifrEl, id){
        if(!ifrEl || !id) return;
        bgSendToIframe(ifrEl, String(id));
      };
      window._bnGetBgStateForId = function(id){
        if(!id) return null;
        try{ return JSON.parse(JSON.stringify(getBgState(String(id)))); }catch(_){ return getBgState(String(id)); }
      };

      function getIfrBnid(ifrEl){
        try{
          /* 先從 src query string 取 */
          var qs = (ifrEl.src||'').split('?')[1]||'';
          var id = new URLSearchParams(qs).get('bnid');
          if(id) return String(id);
          /* fallback：延遲載入的 iframe 還沒設 src，從 data-bn-src 取；再不行用版位回報的 bnid */
          id = new URLSearchParams(((ifrEl.dataset && ifrEl.dataset.bnSrc)||'').split('?')[1]||'').get('bnid');
          if(id) return String(id);
          var m = bnFrameMetrics(ifrEl);
          if(m && m.bnid) return String(m.bnid);
        }catch(_){}
        return null;
      }

      /* SLAB 底圖走獨立的 bn-bg-slab 訊息（由 layout-runtime.js 依各版位
         自己的商品範圍/商品圖範圍高度重新計算縮放與位置），不能跟一般
         背景共用 bn-bg，否則版位收到的是「一般背景」語意，商品範圍的
         40% 提示色塊/線框、置中對齊都會跑掉。 */
      function bgPostForState(ifrEl, st, src){
        if(src && st && st.slab){
          /* 「背景圖調整」面板的縮放／水平／垂直也要能微調 SLAB 圖：
             一起送過去，由版位端疊在 DRED 對齊算出的基準上。
             scale=100、x=50、y=50 就等於純 DRED 對齊的原始位置。 */
          try{ ifrEl.contentWindow.postMessage(
            {type:'bn-bg-slab', src:src, scale:st.scale, x:st.x, y:st.y}, '*');
          }catch(_){}
          return;
        }
        try{ ifrEl.contentWindow.postMessage(
          {type:'bn-bg', src:src||null, fit:st.fit, sizeBasis:st.sizeBasis, positionMode:st.positionMode, scale:st.scale, x:st.x, y:st.y}, '*');
        }catch(_){}
      }

      function bgSendToIframe(ifrEl, id){
        var st = getBgState(id);
        var src = isNoImageBackgroundLayout(id, ifrEl) ? null : st.src;
        bgPostForState(ifrEl, st, src);
      }

      function bgBroadcastOne(id){
        document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
          if(getIfrBnid(ifrEl) === String(id)) bgSendToIframe(ifrEl, id);
        });
      }

      function bgBroadcastAll(){
        document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
          var id = getIfrBnid(ifrEl);
          /* id 取不到時，用 _bgActiveId 的狀態廣播給所有 iframe */
          var st = id ? getBgState(id) : (_bgActiveId ? getBgState(_bgActiveId) : null);
          if(!st) return;
          var src = (id && isNoImageBackgroundLayout(id, ifrEl)) ? null : st.src;
          bgPostForState(ifrEl, st, src);
        });
      }

      function bgBroadcast(){
        if(_bgActiveId){
          bgBroadcastOne(_bgActiveId);
        } else {
          /* activeId 未設定，廣播所有版位 */
          document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
            var id = getIfrBnid(ifrEl);
            if(id) bgSendToIframe(ifrEl, id);
          });
        }
      }

      /* 這裡原本有一個 bn-bg-slab-clamped 的接收器：版位端把 SLAB 縮放夾在
         100% 之後，回報實際值來修正面板滑桿。現在版位端不再夾限（各版位的
         預設構圖 SCBN 127%、其餘 120% 本來就要超過 100%），沒有人會送這個
         訊息，接收器就一併移除，避免留下「會自動改掉你設定的 %」的錯覺。 */

      /* 舊的版位切換函式保留但不使用 */
      function bindBgLayoutSwitch(){
        document.querySelectorAll('.preview-block').forEach(function(block){
          block.addEventListener('click', function(){
            var ifrEl = block.querySelector('iframe');
            if(!ifrEl) return;
            var bnid = getIfrBnid(ifrEl);
            if(!bnid) return;
            _bgActiveId = bnid;
            var st = getBgState(bnid);
            /* 更新控制面板 */
            var scaleEl = document.getElementById('bn-bg-scale');
            var scaleValEl = document.getElementById('bn-bg-scale-val');
            var xEl = document.getElementById('bn-bg-x');
            var yEl = document.getElementById('bn-bg-y');
            var thumbEl = document.getElementById('bn-bg-thumb');
            var previewEl = document.getElementById('bn-bg-preview');
            var openBtnEl = document.getElementById('bn-bg-open-btn');
            if(scaleEl){ scaleEl.value = st.scale; }
            if(scaleValEl){ scaleValEl.textContent = st.scale+'%'; }
            if(xEl){ xEl.value = st.x; }
            if(yEl){ yEl.value = st.y; }
            if(thumbEl && st.src){ thumbEl.src = st.src; }
            if(previewEl){ previewEl.style.display = st.src ? 'block' : 'none'; }
            if(openBtnEl){ openBtnEl.textContent = st.src ? '⬆ 更換背景圖' : '⬆ 上傳背景圖'; }
            updateFitBtns(st.fit);
            /* 標示選取中的版位 */
            document.querySelectorAll('.preview-block').forEach(function(b){
              b.style.outline = b===block ? '2px solid #4a90e2' : '';
            });
          });
        });
        /* 預設選第一個版位 */
        var first = document.querySelector('.preview-block iframe');
        if(first && !_bgActiveId){
          var bnid = getIfrBnid(first);
          if(bnid) _bgActiveId = bnid;
        }
      }

      /* 每次 iframe ready 後重新綁定 */
      var origOnIframeReady = window._bnOnIframeReady;
      window._bnOnIframeReady = function(id){
        if(typeof origOnIframeReady==='function') origOnIframeReady(id);
        setTimeout(function(){
          /* bindBgLayoutSwitch() 已停用呼叫：這個函式本身有 bug
             （內部呼叫 updateFitBtns(st.fit) 少傳了第一個 panelEl 參數，
             導致 st.fit 這個字串被誤當成 DOM 元素呼叫 .querySelectorAll，
             使用者一點擊預覽區塊就會丟出未捕捉的例外），而且它的功能
             （點擊版位切換要編輯哪個版位的背景）已經被下面「每個版位
             各自的浮動面板」（buildBgPanels）取代，不需要再呼叫這個
             舊函式，直接跳過即可。 */
          /* 把已有的狀態推給新 iframe。
             一定要走 bgPostForState()，不能直接送 bn-bg：SLAB 底圖必須用
             bn-bg-slab 才會依版位的曝品範圍重算對齊。這裡以前寫死 bn-bg，
             結果 iframe 只要重新 ready 一次（字體載入完成、版位重繪…），
             畫布上已經對好的 SLAB 底圖就會被降級成一般背景——變成置中
             縮放、商品範圍的 40% 線框也退回粉紅色塊。 */
          var st = getBgState(id);
          if(st.src && !isNoImageBackgroundLayout(id, null)){
            document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
              var bnid = getIfrBnid(ifrEl);
              if(bnid && String(bnid)===String(id)) bgPostForState(ifrEl, st, st.src);
            });
          }
        }, 300);
      };

      /* 吸取圖片左上角 5x5px 平均色 */
      function sampleTopLeftColor(dataUrl, cb){
        var img = new Image();
        img.onload = function(){
          var c = document.createElement('canvas');
          /* 2026-11-14 修正：原本把整張圖縮成 5×5 取平均（＝全圖平均色，偏淺），改成真的取左上角 8×8 */
          var sn = Math.max(1, Math.min(8, img.naturalWidth || img.width || 1, img.naturalHeight || img.height || 1));
          c.width = sn; c.height = sn;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, sn, sn, 0, 0, sn, sn);
          var d = ctx.getImageData(0, 0, sn, sn).data;
          var r=0,g=0,b=0;
          for(var i=0;i<d.length;i+=4){ r+=d[i]; g+=d[i+1]; b+=d[i+2]; }
          var n=d.length/4;
          r=Math.round(r/n); g=Math.round(g/n); b=Math.round(b/n);
          cb('#'+[r,g,b].map(function(v){ return ('0'+v.toString(16)).slice(-2); }).join(''));
        };
        img.src = dataUrl;
      }
      function applySampledBackgroundTextPalette(dataUrl){
        sampleTopLeftColor(dataUrl, function(hex){
          if(!hex || !window.colorState || typeof window.applyColor !== 'function') return;
          window.colorState.canvasBg = hex;
          window._bnCanvasBgHardLock = hex;
          window._bnPersistentCanvasBg = hex;
          window._bnUserCanvasBgLocked = true;

          /* 背景圖的左上角色仍作為畫布鎖定色，但文字配色改用
             64×24 的文字區／視覺區分析結果。 */
          var previousKey = window.cpActiveKey;
          var previousSkip = window._bnSkipAutoTextPalette;
          window._bnSkipAutoTextPalette = true;
          window.cpActiveKey = 'canvasBg';
          try{
            window.applyColor(hex);
          }finally{
            window.cpActiveKey = previousKey;
            window._bnSkipAutoTextPalette = previousSkip;
          }

          function applyPalette(samples){
            if(typeof window.applyAutoTextPalette !== 'function') return;
            window.applyAutoTextPalette(
              samples && samples.canvasBg ? samples.canvasBg : hex,
              samples && samples.visualBg ? samples.visualBg : hex
            );
          }

          if(typeof window.sampleBackgroundColors === 'function'){
            try{
              var sampled = window.sampleBackgroundColors(dataUrl);
              if(sampled && typeof sampled.then === 'function') sampled.then(applyPalette);
              else applyPalette(null);
            }catch(_){ applyPalette(null); }
          }else{
            applyPalette(null);
          }
          markStateDirty();
        });
      }

      function updateFitBtns(panelEl, fitVal){
        if(!panelEl) return;
        panelEl.querySelectorAll('[data-fit]').forEach(function(btn){
          var active = btn.dataset.fit === fitVal || btn.dataset.fit === 'auto' && fitVal !== 'cover';
          btn.classList.toggle('on', active); /* UI-003 2D: BODA 嵌入模式以 .on 套用選中配色；不改下方 inline 邏輯 */
          btn.style.background = active ? '#1f6feb' : 'rgba(255,255,255,.06)';
          btn.style.color = active ? '#fff' : '#8b9dbf';
        });
      }

      var bgNaturalCache={};
      function getBgNatural(src){
        if(!bgNaturalCache[src])bgNaturalCache[src]=loadImg(src).then(function(image){return {w:image.naturalWidth||image.width,h:image.naturalHeight||image.height};}).catch(function(error){delete bgNaturalCache[src];throw error;});
        return bgNaturalCache[src];
      }
      function getBgContainerSize(ifrEl,image){
        /* 背景區尺寸由版位用 bn-layout-metrics 回報（不直接讀 iframe 內容）；還沒收到時用 iframe 尺寸。 */
        var m=bnFrameMetrics(ifrEl),bg=m&&(m.bg||m.canvas);
        return {w:bg&&bg.w||parseFloat(ifrEl.style.width)||ifrEl.width||image.w,
          h:bg&&bg.h||parseFloat(ifrEl.style.height)||ifrEl.height||image.h};
      }

      /* 建立每個 preview-block 右側的背景圖控制面板 */
      /* ── 2026-11-14 背景調整：同系列沿用＋版位連動 ───────────────── */
      function bgVariantKey(id){
        var n = String(getLayoutNameById(id) || '').replace(/\.html$/i,'');
        return n.replace(/[_\s-]*(橫式|方式|橫|方|無)?logo(排版)?$/i,'').toLowerCase();
      }
      function findBgVariantSibling(id, ifrEl){
        var key = bgVariantKey(id);
        if(!key) return null;
        var orient = getBgLayoutOrientation(id, ifrEl);
        var found = null;
        Object.keys(_bgStates).some(function(other){
          if(String(other) === String(id)) return false;
          var o = _bgStates[other];
          if(!o || !o._userEdited || !o.src || bgVariantKey(other) !== key) return false;
          if(o._orient && o._orient !== orient) return false;
          found = o; return true;
        });
        return found;
      }
      function bgLayoutLinked(id){
        try{ return typeof window._bnIsProductLayoutLocked === 'function' ? !!window._bnIsProductLayoutLocked(String(id)) : false; }catch(_){ return false; }
      }
      /* 調整一張版位的背景（舊存檔先換算成 center 座標，避免第一次調整跳位）。done(st, pre) 在真的改完後呼叫。 */
      function editBgFor(tid, tIfr, update, done){
        var st=getBgState(tid),src=st.src;
        function commit(){
          if(getBgState(tid)!==st||st.src!==src)return;
          var pre={scale:Number(st.scale),x:Number(st.x),y:Number(st.y),fit:st.fit,sizeBasis:st.sizeBasis};
          update(st);st._initialized=true;st._userEdited=true;st._orient=getBgLayoutOrientation(tid,tIfr);
          bgBroadcastOne(tid);markStateDirty();
          if(done)done(st,pre);
        }
        if(st.slab||st.positionMode==='center'){commit();return;}
        if(Number(st.x)===50&&Number(st.y)===50){st.positionMode='center';commit();return;}
        getBgNatural(src).then(function(image){
          if(getBgState(tid)!==st||st.src!==src)return;
          if(st.positionMode!=='center'){
            var size=getBgContainerSize(tIfr,image),iw,ih,factor;
            if(st.fit==='cover'||st.fit==='contain'){factor=(st.fit==='cover'?Math.max:Math.min)(size.w/image.w,size.h/image.h);iw=image.w*factor;ih=image.h*factor;}
            else if(st.fit==='height100'||st.fit==='auto'&&st.sizeBasis==='height'){ih=size.h*st.scale/100;iw=ih*image.w/image.h;}
            else{iw=size.w*st.scale/100;ih=iw*image.h/image.w;}
            st.x=50+(Number(st.x)-50)*(1-iw/size.w);st.y=50+(Number(st.y)-50)*(1-ih/size.h);st.positionMode='center';
          }
          commit();
        }).catch(function(error){console.warn('[bn-editor] 無法讀取背景尺寸，保留原構圖',error);});
      }
      /* 版位連動中的其他版位（同方向背景）跟著做同樣的調整：縮放等比例、位置同樣位移量、原尺寸／填滿同步。
         各版位原本的預設位置（例如 SCBN、FB_POST 的特殊擺法）不會被蓋掉，只疊加這次的變化量。 */
      function propagateBgEdit(sourceId, sourceIfr, st, pre){
        if(!bgLayoutLinked(sourceId)) return;
        var orient = getBgLayoutOrientation(sourceId, sourceIfr);
        var ratio = pre.scale ? Number(st.scale)/pre.scale : 1;
        var dx = Number(st.x) - pre.x, dy = Number(st.y) - pre.y;
        var fitChanged = st.fit !== pre.fit || st.sizeBasis !== pre.sizeBasis;
        if(!fitChanged && ratio === 1 && !dx && !dy) return;
        document.querySelectorAll('.preview-block iframe').forEach(function(tIfr){
          var tid = getIfrBnid(tIfr);
          if(!tid || String(tid) === String(sourceId)) return;
          if(isNoImageBackgroundLayout(tid, tIfr) || !bgLayoutLinked(tid)) return;
          var t = _bgStates[tid];
          if(!t || !t.src || !!t.slab !== !!st.slab) return;
          if(getBgLayoutOrientation(tid, tIfr) !== orient) return;
          editBgFor(String(tid), tIfr, function(ts){
            if(fitChanged){ ts.fit = st.fit; ts.sizeBasis = st.sizeBasis; }
            if(ratio !== 1) ts.scale = Math.max(1, Math.min(700, Math.round(Number(ts.scale) * ratio)));
            ts.x = Math.max(-100, Math.min(200, Number(ts.x) + dx));
            ts.y = Math.max(-100, Math.min(200, Number(ts.y) + dy));
          });
        });
      }

      /* skipExisting：懶載入版位就緒時只補建新面板，不重送其他版位的背景 */
      function buildBgPanels(skipExisting){
        document.querySelectorAll('.preview-block').forEach(function(block){
          if(block.querySelector('.bn-bg-panel')) {
            if(skipExisting) return;
            /* 背景圖上傳/暫存載入後，面板已存在時仍要補送目前背景到 iframe。 */
            var existedIframe = block.querySelector('iframe');
            var existedId = existedIframe ? getIfrBnid(existedIframe) : null;
            if(existedIframe && existedId) bgSendToIframe(existedIframe, existedId);
            return;
          }
          var ifrEl = block.querySelector('iframe');
          if(!ifrEl) return;
          /* SearchICON 系列版位不需要背景圖調整浮動面板（純色圓形背景，無背景圖可調） */
          if(/SearchICON/i.test(ifrEl.getAttribute('src') || '')) return;
          var id = getIfrBnid(ifrEl);
          if(!id) return;
          /* 2026-11-14：首頁LOGO牆等固定白底、不吃背景圖的版位，也不需要「背景圖調整」面板 */
          if(isNoImageBackgroundLayout(id, ifrEl)) return;

          var panel = document.createElement('div');
          panel.className = 'bn-bg-panel';
          panel.style.cssText = [
            'position:fixed;width:150px;',
            'background:#13161f;border:1px solid #2e3347;border-radius:8px;',
            'padding:8px;font-size:10px;color:#8b9dbf;',
            'display:none;z-index:10000;',
            'box-shadow:0 4px 16px rgba(0,0,0,.4);'
          ].join('');

          /* 跟隨視窗捲動：固定在版位右側，垂直置中於視窗可見區域（不超出版位範圍）*/
          function updatePanelPos(){
            if(panel.style.display === 'none') return;
            var blockRect = block.getBoundingClientRect();
            var panelH = panel.offsetHeight || 200;
            /* 水平：版位右側 8px */
            var px = blockRect.right + 8;
            /* 垂直：視窗中心，限制在版位範圍內 */
            var viewMid = window.innerHeight / 2;
            var py = viewMid - panelH / 2;
            var minY = blockRect.top;
            var maxY = blockRect.bottom - panelH;
            py = Math.max(minY, Math.min(py, maxY));
            panel.style.left = px + 'px';
            panel.style.top  = py + 'px';
          }
          window.addEventListener('scroll', updatePanelPos, true);
          panel.innerHTML = [
            '<div style="font-weight:700;margin-bottom:6px;color:#dde3f0">背景圖調整</div>',
            '<div style="display:flex;gap:3px;margin-bottom:6px">',
            '  <button data-fit="auto"    style="flex:1;padding:3px;border-radius:4px;border:none;cursor:pointer;font-size:9px">原尺寸</button>',
            '  <button data-fit="cover"   style="flex:1;padding:3px;border-radius:4px;border:none;cursor:pointer;font-size:9px">填滿</button>',
            '</div>',
            '<div style="margin-bottom:2px">縮放 <span class="bg-scale-val">100%</span></div>',
            '<input type="range" class="bg-scale" min="1" max="700" value="100" aria-label="以圖片中心縮放背景" style="width:100%;margin-bottom:4px">',
            '<div style="margin-bottom:3px">水平位置 <span class="bg-x-val">0%</span></div>',
            '<div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" class="bg-nudge" data-axis="x" data-delta="-1" aria-label="背景向左" title="向左移 1%，Shift 加速" style="flex:1">←</button><button type="button" class="bg-nudge" data-axis="x" data-delta="1" aria-label="背景向右" title="向右移 1%，Shift 加速" style="flex:1">→</button></div>',
            '<div style="margin-bottom:3px">垂直位置 <span class="bg-y-val">0%</span></div>',
            '<div style="display:flex;gap:6px"><button type="button" class="bg-nudge" data-axis="y" data-delta="-1" aria-label="背景向上" title="向上移 1%，Shift 加速" style="flex:1">↑</button><button type="button" class="bg-nudge" data-axis="y" data-delta="1" aria-label="背景向下" title="向下移 1%，Shift 加速" style="flex:1">↓</button></div>',
          ].join('');

          /* 事件 */
          function setSlider(el, disabled){
            el.disabled = disabled;
            el.style.opacity = disabled ? '0.3' : '1';
            el.style.cursor  = disabled ? 'not-allowed' : 'pointer';
          }
          function updateSliderState(fitVal){
            var scaleEl = panel.querySelector('.bg-scale');
            setSlider(scaleEl, !getBgState(id).slab && /^(cover|contain)$/.test(fitVal));
            panel.querySelectorAll('.bg-nudge').forEach(function(button){setSlider(button,false);});
          }

          function editBackground(update){
            /* 2026-11-14：改用共用的 editBgFor，改完再連動到其他「版位連動」中的版位 */
            editBgFor(id, ifrEl, update, function(st, pre){
              syncPanelValues();
              propagateBgEdit(id, ifrEl, st, pre);
            });
          }

          panel.querySelectorAll('[data-fit]').forEach(function(btn){
            btn.addEventListener('click', function(){
              editBackground(function(st){if(btn.dataset.fit==='auto'&&st.fit==='height100')st.sizeBasis='height';st.fit=btn.dataset.fit;});
            });
          });
          panel.querySelector('.bg-scale').addEventListener('input', function(){
            if(this.disabled)return;
            var v = Math.max(1,Math.min(700,parseInt(this.value)||100));
            editBackground(function(st){st.scale=v;});
          });
          panel.querySelectorAll('.bg-nudge').forEach(function(button){
            function nudge(shift){
              var axis=button.dataset.axis,delta=Number(button.dataset.delta)*(shift?5:1);
              editBackground(function(st){st[axis]=Math.max(-100,Math.min(200,Number(st[axis])+delta));});
            }
            /* 2026-11-14：長按連續移動（按住 0.4 秒後每 0.08 秒移一次）；長按過後放開的那次 click 不再多移一格 */
            var holdTimer=null,repeatTimer=null,repeated=false;
            function stopHold(){clearTimeout(holdTimer);clearInterval(repeatTimer);holdTimer=repeatTimer=null;}
            button.addEventListener('pointerdown',function(event){
              if(event.button!==0)return;
              repeated=false;stopHold();
              var shift=event.shiftKey;
              holdTimer=setTimeout(function(){
                repeatTimer=setInterval(function(){repeated=true;nudge(shift);},80);
              },400);
            });
            ['pointerup','pointerleave','pointercancel','blur'].forEach(function(t){button.addEventListener(t,stopHold);});
            button.addEventListener('click',function(event){
              if(repeated){repeated=false;return;}
              nudge(event.shiftKey);
            });
          });

          /* 面板的滑桿一定要跟目前實際套用的 scale/x/y 同步，不能一直停在
             HTML 寫死的 100/50/50——不然使用者滑動之前看到的數字，
             跟目前畫布上實際套用的值對不起來，量出來的參數就不準了。
             每次要顯示面板前都重新同步一次目前的真實狀態。 */
          function syncPanelValues(){
            var st = getBgState(id);
            var scaleEl2 = panel.querySelector('.bg-scale');
            if(scaleEl2 && st.scale !== undefined){
              scaleEl2.value = st.scale;
              panel.querySelector('.bg-scale-val').textContent = st.scale + '%';
            }
            panel.querySelector('.bg-x-val').textContent = Math.round((Number(st.x)-50)*10)/10+'%';
            panel.querySelector('.bg-y-val').textContent = Math.round((Number(st.y)-50)*10)/10+'%';
            updateFitBtns(panel, st.fit || 'auto');
            updateSliderState(st.fit || 'auto');
          }

          /* 初始 fit 樣式（預設原尺寸）*/
          updateFitBtns(panel, 'auto');
          updateSliderState('auto');

          /* hover 顯示面板：用 timer 延遲隱藏，避免移到面板途中消失 */
          var _hideTimer = null;
          function showPanel(){
            var thumb = document.getElementById('bn-bg-thumb');
            if(!thumb || !thumb.src) return;
            clearTimeout(_hideTimer);
            syncPanelValues();
            if(!getBgState(id).slab)getBgNatural(getBgState(id).src).catch(function(){});
            panel.style.display = 'block';
            updatePanelPos();
          }
          function hidePanel(){
            clearTimeout(_hideTimer);
            _hideTimer = setTimeout(function(){ panel.style.display = 'none'; }, 300);
          }
          block.style.position = 'relative';
          block.addEventListener('mouseenter', showPanel);
          block.addEventListener('mouseleave', hidePanel);
          panel.addEventListener('mouseenter', function(){ clearTimeout(_hideTimer); });
          panel.addEventListener('mouseleave', hidePanel);

          block.appendChild(panel);
        });
      }

      /* 用 id 查 window.loadLayouts() 拿到「乾淨、沒有經過網址編碼」的檔名。
         之前用 ifrEl.src 這個網址字串去比對版位名稱，遇到中文字元
         （方/橫）會被瀏覽器自動轉成百分比編碼，就算加了 decodeURIComponent
         解碼，也可能因為呼叫時機、iframe src 尚未正確設定等各種原因失準。
         loadLayouts() 裡每個版位本來就存了乾淨的 name/file 字串
         （例如 "FB_POST_方LOGO"），直接查表比對，不用經過網址、不用解碼，
         最不容易出錯，這裡當作主要判斷依據。 */
      function getLayoutNameById(id){
        try{
          var layouts = (typeof window.loadLayouts === 'function') ? (window.loadLayouts() || []) : [];
          var item = layouts.find(function(l){ return String(l.id) === String(id); });
          return item ? String(item.name || item.file || '') : '';
        }catch(_){ return ''; }
      }

      function getBgLayoutOrientation(id, ifrEl){
        /*
         * 背景套用方向改用版位實際寬高比判斷，不再用名稱裡的「橫 / 方 / 直」判斷。
         * 例如「DDCard 橫 Logo」只是 Logo 排法，版位本身仍是方 / 直比例，應吃直式背景。
         *
         * 例外：FB_POST_方LOGO / FB_POST_橫LOGO / SCBN_APP 這幾個版位，
         * 畫布本身雖然是寬>高（照寬高比規則會判斷成橫式），但這幾個版位
         * 固定要吃「直式」背景圖，不要吃橫式，是這幾個版位專屬的例外，
         * 優先於下面的寬高比判斷，不影響其他版位。 */
        var layoutName = getLayoutNameById(id);
        if(/FB_POST_(方|橫)LOGO/i.test(layoutName) || /SCBN_APP/i.test(layoutName)) return 'vertical';
        try{
          /* 瀏覽器的 iframe.src 屬性回傳的是完整解析過的 URL，
             網址裡的中文字元（方/橫）會被自動轉成百分比編碼
             （例如「方」變成 %E6%96%B9），直接用中文字元的規則去比對
             這個編碼過的字串一定比對不到，這正是這個名稱例外規則一直
             沒有生效的真正原因。這裡先用 decodeURIComponent 把網址解碼
             回原本的中文字元，再做比對。這裡只當作 loadLayouts() 查不到
             資料時的備援，主要判斷已經改用上面 getLayoutNameById()。 */
          var srcName = ifrEl && ifrEl.src ? String(ifrEl.src) : '';
          try{ srcName = decodeURIComponent(srcName); }catch(_){ }
          if(/FB_POST_(方|橫)LOGO/i.test(srcName) || /SCBN_APP/i.test(srcName)) return 'vertical';
        }catch(_){ }

        function toNum(v){
          var n = parseFloat(v);
          return isFinite(n) && n > 0 ? n : 0;
        }
        function pickBySize(w, h){
          w = toNum(w); h = toNum(h);
          if(w && h) return w > h ? 'horizontal' : 'vertical';
          return '';
        }

        /* 版位尺寸由版位用 bn-layout-metrics 回報（不直接讀 iframe 內容） */
        try{
          var metrics = bnFrameMetrics(ifrEl);
          if(metrics){
            var byData = pickBySize(metrics.fw, metrics.fh);
            if(byData) return byData;
            var byCanvas = metrics.canvas ? pickBySize(metrics.canvas.w, metrics.canvas.h) : '';
            if(byCanvas) return byCanvas;
          }
        }catch(_){}

        try{
          var layouts = (typeof window.loadLayouts === 'function') ? (window.loadLayouts() || []) : [];
          var item = layouts.find(function(l){ return String(l.id) === String(id); });
          if(item){
            var byLayout = pickBySize(item.width || item.w || item.fw || item.canvasWidth, item.height || item.h || item.fh || item.canvasHeight);
            if(byLayout) return byLayout;
          }
        }catch(_){}

        return 'vertical';
      }


      function getDefaultBgFitForLayout(id, ifrEl){
        /* 一般背景預設原尺寸；橫／直版原有的縮放基準另存在 sizeBasis，
           保留初始構圖，同時讓面板的縮放與方向箭頭可直接操作。 */
        return 'auto';
      }

      /* SCBN_APP 專屬預設值：縮放 160%，位置在縮放 160% 的基礎上，
         往右微調（換算成 background-position 百分比約 43.06%，
         對應到畫布 1200px 寬、160% 縮放下大約等於視覺上往右移 50px；
         這個數字是照 CSS background-position 的公式反推出來的，
         實際效果會因為每張圖片的比例略有差異，不是每張圖都剛好精準 50px，
         但方向和大致幅度是對的，上傳實際圖片後可以再用右側面板微調）。
         垂直維持置中(50%)，其他版位維持原本 scale:100 / x:50 / y:50。 */
      function isScbnApp(id, ifrEl){
        try{
          var layoutName = getLayoutNameById(id);
          if(/SCBN_APP/i.test(layoutName)) return true;
          var srcName = ifrEl && ifrEl.src ? String(ifrEl.src) : '';
          return /SCBN_APP/i.test(srcName) || /SCBN_APP/i.test(String(id||''));
        }catch(_){ return false; }
      }
      function isFbPost(id, ifrEl){
        try{
          var layoutName = getLayoutNameById(id);
          if(/FB_POST_(方|橫)LOGO/i.test(layoutName)) return true;
          var srcName = ifrEl && ifrEl.src ? String(ifrEl.src) : '';
          try{ srcName = decodeURIComponent(srcName); }catch(_){ }
          return /FB_POST_(方|橫)LOGO/i.test(srcName);
        }catch(_){ return false; }
      }
      function isSbaPc(id, ifrEl){
        try{
          var layoutName = getLayoutNameById(id);
          if(/^SBA_PC$/i.test(layoutName)) return true;
          var srcName = ifrEl && ifrEl.src ? String(ifrEl.src) : '';
          try{ srcName = decodeURIComponent(srcName); }catch(_){ }
          return /SBA_PC/i.test(srcName);
        }catch(_){ return false; }
      }
      function isAmsBn(id, ifrEl){
        try{
          var layoutName = getLayoutNameById(id);
          if(/AMS\s*BN/i.test(layoutName)) return true;
          var srcName = ifrEl && ifrEl.src ? String(ifrEl.src) : '';
          try{ srcName = decodeURIComponent(srcName); }catch(_){ }
          return /AMS\s*BN/i.test(srcName) || /AMS\s*BN/i.test(String(id || ''));
        }catch(_){ return false; }
      }
      function getDefaultBgParamsForLayout(id, ifrEl){
        var fit = getDefaultBgFitForLayout(id, ifrEl);
        if(isScbnApp(id, ifrEl)){
          /* SCBN_APP 吃直式背景圖時：圖片寬度＝畫布寬度的 1/4（scale:25，
             畫布1200px寬 → 圖片顯示寬度300px，高度auto），位置放在
             「右邊第二格」——假設整條畫布從左到右分成4等分格子各300px
             （0-300 / 300-600 / 600-900 / 900-1200），從右邊數第二格
             是 600-900px 這一格，置中點=750px，換算成畫布寬度百分比
             ≈62.5%。這個「4等分格子」是我依你的描述推算的，如果實際
             畫面上的格子劃分方式不是這樣切，麻煩告訴我正確的格子寬度，
             我可以重新換算這個百分比。 */
          return { fit: 'width100', scale: 43, x: 71, y: 81 };
        }
        if(isSbaPc(id, ifrEl)){
          return { fit: fit, scale: 100, x: 102, y: 50 };
        }
        if(isFbPost(id, ifrEl)){
          /* FB_POST 吃直式背景圖時：位置在畫面右半部（水平置中點在畫面
             75% 的位置，也就是右半邊的正中間），放大 20%（scale:120）。 */
          return { fit: 'width100', scale: 58, x: 110, y: 82 };
        }
        if(isAmsBn(id, ifrEl)){
          /* AMS BN 方 logo／橫 logo 的預設背景：縮放 121%，水平位置 58；
             垂直位置沿用一般預設 50。 */
          return { fit: fit, scale: 121, x: 58, y: 50 };
        }
        return { fit: fit, sizeBasis:getBgLayoutOrientation(id, ifrEl)==='horizontal'?'height':'width', scale: 100, x: 50, y: 50 };
      }
      /* 暴露給 bn-bg-library-plugin.js（背景圖庫）共用：
         圖庫套用背景圖是完全獨立的另一支檔案，原本自己複製了一份
         「判斷橫式/直式、預設 fit/scale/x/y」的邏輯，沒有這幾個版位的
         專屬例外，導致「手動上傳」修好了，但「選圖庫」還是不對。
         暴露這兩個函式讓兩邊共用同一套判斷依據，以後只要改這裡一份，
         兩條路徑都會同步生效，不會再各自寫一份、各自忘記同步更新。 */
      window._bnGetBgLayoutOrientation = getBgLayoutOrientation;
      window._bnGetDefaultBgParamsForLayout = getDefaultBgParamsForLayout;
      window._bnIsNoImageBackgroundLayout = isNoImageBackgroundLayout;

      function applyBgByOrientation(horizontalSrc, verticalSrc){
        var h = horizontalSrc || null;
        var v = verticalSrc || null;
        if(!h && !v) return;
        var single = (h && !v) ? h : ((!h && v) ? v : null);
        window._bgDataUrl = h || v || single || null;
        window._bnBgOrientationSources = { horizontal:h || v || null, vertical:v || h || null };
        document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
          var id = getIfrBnid(ifrEl);
          if(!id) return;
          var st = getBgState(id);
          if(isNoImageBackgroundLayout(id, ifrEl)){ st.src = null; st.slab = false; return; }
          var nextSrc = single || (getBgLayoutOrientation(id, ifrEl) === 'vertical' ? v : h) || h || v;
          st.src = nextSrc;
          st.slab = false;
          if(!st._initialized){
            var _dp = getDefaultBgParamsForLayout(id, ifrEl);
            st.scale = _dp.scale; st.x = _dp.x; st.y = _dp.y; st.fit = _dp.fit; st.sizeBasis=_dp.sizeBasis||'width';st.positionMode='legacy';
            st._initialized = true;
          }
        });
        if(bgThumb) bgThumb.src = h || v || '';
        if(bgPreview) bgPreview.style.display = 'block';
        if(bgOpenBtn) bgOpenBtn.textContent = '⬆ 更換背景圖';
        var sum = document.getElementById('bn-bg-summary');
        if(sum) sum.textContent = (h && v) ? '已分別套用橫式 / 直式背景，各版位可在右側獨立調整縮放和位置' : '已套用單張背景到所有版位，各版位可在右側獨立調整縮放和位置';
        bgBroadcastAll();
        markStateDirty();
        setTimeout(buildBgPanels, 100);
        applySampledBackgroundTextPalette(h || v);
      }

      function buildBgUploadModal(){
        if(document.getElementById('bn-bg-modal')) return;
        var el = document.createElement('div');
        el.id = 'bn-bg-modal';
        el.innerHTML = [
          '<div class="bn-bg-modal-box">',
          '  <div class="bn-modal-head"><h3>上傳背景圖</h3><button class="bn-modal-close" id="bn-bg-close">×</button></div>',
          '  <div class="bn-modal-body">',
          '    <div class="bn-bg-hint">左邊放橫式背景、右邊放直式背景。只放一邊時會套用到全部版位；兩邊都有時，系統會依每個版位的實際寬高比判斷：寬大於高套橫式，否則套直式。</div>',
          '    <div class="bn-bg-pair-grid">',
          '      <div class="bn-bg-drop-card" id="bn-bg-hdrop">',
          '        <div class="bn-bg-drop-title">橫式背景圖</div>',
          '        <div class="bn-bg-drop-desc">拖曳到這裡，或點擊選取檔案</div>',
          '        <img id="bn-bg-himg"><div class="bn-bg-drop-name" id="bn-bg-hname"></div>',
          '        <input id="bn-bg-hinp" type="file" accept="image/*">',
          '      </div>',
          '      <div class="bn-bg-drop-card" id="bn-bg-vdrop">',
          '        <div class="bn-bg-drop-title">直式背景圖</div>',
          '        <div class="bn-bg-drop-desc">拖曳到這裡，或點擊選取檔案</div>',
          '        <img id="bn-bg-vimg"><div class="bn-bg-drop-name" id="bn-bg-vname"></div>',
          '        <input id="bn-bg-vinp" type="file" accept="image/*">',
          '      </div>',
          '    </div>',
          '  </div>',
          '  <div class="bn-modal-foot"><button class="bn-btn-skip" id="bn-bg-cancel">取消</button><button class="bn-btn-confirm" id="bn-bg-confirm">套用背景</button></div>',
          '</div>'
        ].join('');
        document.body.appendChild(el);
        var stagedH = null, stagedV = null;
        function readTo(slot, file){
          if(!file || !file.type || !file.type.startsWith('image/')) return;
          var r = new FileReader();
          r.onload = function(e){
            var dataUrl = e.target.result;
            if(slot === 'h') stagedH = dataUrl; else stagedV = dataUrl;
            var drop = document.getElementById(slot === 'h' ? 'bn-bg-hdrop' : 'bn-bg-vdrop');
            var img = document.getElementById(slot === 'h' ? 'bn-bg-himg' : 'bn-bg-vimg');
            var name = document.getElementById(slot === 'h' ? 'bn-bg-hname' : 'bn-bg-vname');
            if(drop) drop.classList.add('has-img');
            if(img) img.src = dataUrl;
            if(name) name.textContent = file.name;
          };
          r.readAsDataURL(file);
        }
        function bindDrop(slot){
          var drop = document.getElementById(slot === 'h' ? 'bn-bg-hdrop' : 'bn-bg-vdrop');
          var inp = document.getElementById(slot === 'h' ? 'bn-bg-hinp' : 'bn-bg-vinp');
          if(!drop || !inp) return;
          inp.addEventListener('change', function(){ readTo(slot, this.files && this.files[0]); this.value=''; });
          drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', function(){ drop.classList.remove('over'); });
          drop.addEventListener('drop', function(e){
            e.preventDefault(); drop.classList.remove('over');
            readTo(slot, e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
          });
        }
        bindDrop('h'); bindDrop('v');
        function close(){ el.classList.remove('show'); }
        document.getElementById('bn-bg-close').addEventListener('click', close);
        document.getElementById('bn-bg-cancel').addEventListener('click', close);
        el.addEventListener('click', function(e){ if(e.target === el) close(); });
        document.getElementById('bn-bg-confirm').addEventListener('click', function(){
          applyBgByOrientation(stagedH, stagedV);
          close();
        });
        window._bnOpenBgModal = function(){ el.classList.add('show'); };
      }

      buildBgUploadModal();
      if(bgOpenBtn) bgOpenBtn.addEventListener('click', function(){ if(window._bnOpenBgModal) window._bnOpenBgModal(); });

      if(bgInp){
        bgInp.addEventListener('change', function(){
          var file = this.files[0];
          if(!file) return;
          var reader = new FileReader();
          reader.onload = function(e){
            var dataUrl = e.target.result;
            window._bgDataUrl = dataUrl;
            /* 把所有版位的 src 都設成這張圖，各自保留自己的 scale/x/y/fit */
            document.querySelectorAll('.preview-block iframe').forEach(function(ifrEl){
              var id = getIfrBnid(ifrEl);
              if(!id) return;
              var st = getBgState(id);
              if(isNoImageBackgroundLayout(id, ifrEl)){ st.src = null; st.slab = false; return; }
              st.src = dataUrl;
              st.slab = false;
              /* 只有第一次上傳才重設位置，已有設定則保留 */
              if(!st._initialized){
                var _dp2 = getDefaultBgParamsForLayout(id, ifrEl);
                st.scale = _dp2.scale; st.x = _dp2.x; st.y = _dp2.y; st.fit = _dp2.fit;st.sizeBasis=_dp2.sizeBasis||'width';st.positionMode='legacy';
                st._initialized = true;
              }
            });
            bgThumb.src = dataUrl;
            bgPreview.style.display = 'block';
            if(bgOpenBtn) bgOpenBtn.textContent = '⬆ 更換背景圖';
            /* 立即廣播給所有版位 */
            bgBroadcastAll();
            markStateDirty();
            /* 建立/更新版位右側控制面板 */
            setTimeout(buildBgPanels, 100);
            /* 吸左上角顏色→自動套用背景色 */
            applySampledBackgroundTextPalette(dataUrl);
          };
          reader.readAsDataURL(file);
          bgInp.value = '';
        });

        bgClear.addEventListener('click', function(){
          /* 清除所有版位的背景圖 */
          Object.keys(_bgStates).forEach(function(id){ _bgStates[id].src = null; _bgStates[id].slab = false; });
          window._bgDataUrl = null;
          bgThumb.src = '';
          bgPreview.style.display = 'none';
          if(bgOpenBtn) bgOpenBtn.textContent = '⬆ 上傳背景圖';
          bgBroadcastAll();
          markStateDirty();
          /* 隱藏所有控制面板 */
          document.querySelectorAll('.bn-bg-panel').forEach(function(p){ p.style.display='none'; });
        });

        /* 初始化版位右側控制面板（iframe ready 後觸發） */
        setTimeout(buildBgPanels, 1000);
      }
    }

    function buildModal(){
      if(document.getElementById('bn-prod-modal'))return;
      var el=document.createElement('div');
      el.id='bn-prod-modal';
      el.innerHTML=[
        '<div class="bn-modal-box">',
        '  <div class="bn-modal-head"><h3>上傳商品圖</h3><button class="bn-modal-close" id="bn-mc">×</button></div>',
        '  <div class="bn-modal-body">',
        '    <div class="bn-step-tabs">',
        '      <button class="bn-step-tab on" id="bn-st1">① 選取圖片</button>',
        '      <button class="bn-step-tab" id="bn-st2">② 確認大小比例</button>',
        '    </div>',
        '    <div id="bn-sc1">',
        '      <div class="bn-modal-drop" id="bn-mdrop">',
        '        <div style="font-size:22px;margin-bottom:4px">🖼️</div>',
        '        <div style="font-size:13px;font-weight:700;color:#dde3f0">拖曳或點擊選取圖片</div>',
        '        <p style="margin:4px 0 0;font-size:11px">最多3張，可多選</p>',
        '        <input id="bn-mfinp" type="file" accept="image/*" multiple>',
        '      </div>',
        '      <div class="bn-preview-grid" id="bn-mpgrid"></div>',
        '      <div id="bn-mno" style="text-align:center;color:#687090;font-size:12px;padding:8px">尚未選取圖片</div>',
        '      <div class="bn-limit-msg" id="bn-mlimit"></div>',
        '    </div>',
        '    <div id="bn-sc2" style="display:none">',
        '      <div style="font-size:12px;color:#4a90e2;background:rgba(74,144,226,.08);border:1px solid rgba(74,144,226,.2);border-radius:10px;padding:8px 12px;margin-bottom:14px;line-height:1.8">',
        '        ・<b style="color:#dde3f0">最前面 = 主品</b>，放中間最大<br>',
        '        ・左側配品第二大，右側配品最小<br>',
        '        ・用 ← → 箭頭或拖曳調整順序',
        '      </div>',
        '      <div class="bn-rank-row" id="bn-rrow"></div>',
        '      <div class="bn-rank-hint">圖片高度反映構圖時的相對大小</div>',
        '    </div>',
        '  </div>',
        '  <div class="bn-modal-foot">',
        '    <button class="bn-btn-skip" id="bn-mback" style="display:none">← 上一步</button>',
        '    <button class="bn-btn-skip" id="bn-mskip">跳過，直接套用</button>',
        '    <button class="bn-btn-confirm" id="bn-mnext">下一步 →</button>',
        '  </div>',
        '</div>',
      ].join('');
      document.body.appendChild(el);
      modal=el;

      // 事件綁定
      document.getElementById('bn-mc').addEventListener('click',closeModal);
      modal.addEventListener('click',function(e){if(e.target===modal)closeModal();});
      document.getElementById('bn-st1').addEventListener('click',function(){if(currentStep!==1)showStep(1);});
      document.getElementById('bn-st2').addEventListener('click',function(){if(currentStep!==2&&staged.length&&staged.length<=MAX_PROD)showStep(2);});
      document.getElementById('bn-mnext').addEventListener('click',function(){
        if(productOptionsTourState)return;
        if(currentStep===1){if(!staged.length||staged.length>MAX_PROD)return;showStep(2);}
        else{applyWithOrder(rankOrderToHeroFirst());closeModal();}
      });
      document.getElementById('bn-mback').addEventListener('click',function(){showStep(1);});
      document.getElementById('bn-mskip').addEventListener('click',function(){
        if(productOptionsTourState)return;
        if(!staged.length){closeModal();return;}
        applyWithOrder(staged.slice(0,MAX_PROD),true);closeModal();
      });
      var mdrop=document.getElementById('bn-mdrop');
      var mfinp=document.getElementById('bn-mfinp');
      mdrop.addEventListener('click',function(e){if(e.target===mfinp)return;mfinp.click();});
      mdrop.addEventListener('dragover',function(e){e.preventDefault();this.classList.add('over');});
      mdrop.addEventListener('dragleave',function(){this.classList.remove('over');});
      mdrop.addEventListener('drop',function(e){e.preventDefault();this.classList.remove('over');handleFiles(Array.from(e.dataTransfer.files));});
      mfinp.addEventListener('change',function(){handleFiles(Array.from(this.files));this.value='';});
    }

    function openModal(){
      if(productOptionsTourState)return;
      staged=window._bnProducts.map(function(p){return{src:p.src,name:p.name,ratio:p.ratio,fromExisting:true,id:p.id,baseSrc:p.baseSrc,meta:p.meta?JSON.parse(JSON.stringify(p.meta)):undefined};});
      heroIdx=0; rankOrder=null; currentStep=1;
      renderPreview(); updateLimit(); showStep(1);
      modal.classList.add('show');
    }
    function closeModal(){
      if(productOptionsTourState){closeProductOptionsTour();return;}
      modal.classList.remove('show');
    }

    /* 教學專用：使用真正的第二頁與 renderRankRow，但不套用、不重建商品。
       使用獨立的暫存資料／排序容器；離開時連原有 DOM 與事件一起還原。 */
    function productOptionsDemoItems(){
      var art=[
        {id:'tour-speaker',name:'藍色喇叭',body:'<rect x="44" y="24" width="112" height="198" rx="24" fill="#83b6e4" stroke="#d1e7fa" stroke-width="3"/><rect x="54" y="72" width="92" height="128" rx="15" fill="#355775"/><circle cx="100" cy="111" r="23" fill="#182e43" stroke="#7496b3" stroke-width="6"/><circle cx="100" cy="166" r="23" fill="#182e43" stroke="#7496b3" stroke-width="6"/><circle cx="100" cy="48" r="10" fill="#eff6fc"/>'},
        {id:'tour-headphones',name:'橘色耳機',body:'<path d="M42 139V96a58 58 0 0 1 116 0v43" fill="none" stroke="#edb482" stroke-width="22"/><path d="M42 139V96a58 58 0 0 1 116 0v43" fill="none" stroke="#ffdbb9" stroke-width="9"/><rect x="23" y="116" width="43" height="89" rx="19" fill="#dd8650" stroke="#ffdbb9" stroke-width="3"/><rect x="134" y="116" width="43" height="89" rx="19" fill="#dd8650" stroke="#ffdbb9" stroke-width="3"/><path d="M62 133v55M138 133v55" stroke="#754a38" stroke-width="8" stroke-linecap="round"/>'},
        {id:'tour-bottle',name:'紫色保養瓶',body:'<rect x="75" y="15" width="50" height="54" rx="7" fill="#e9def4"/><path d="M78 18h44v7H78z" fill="#bca0d9"/><rect x="54" y="64" width="92" height="158" rx="21" fill="#b397d7" stroke="#e9def4" stroke-width="3"/><path d="M67 88v99" stroke="#f3ebff" stroke-width="7" stroke-linecap="round" opacity=".5"/><rect x="66" y="117" width="68" height="64" rx="4" fill="#f8f1ff"/><path d="M82 138h36M87 150h26M91 162h18" stroke="#8a6baa" stroke-width="4" stroke-linecap="round"/>'}
      ];
      return art.map(function(item){return {id:item.id,name:item.name,ratio:200/240,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="240" viewBox="0 0 200 240">'+item.body+'</svg>')};});
    }
    function closeProductOptionsTour(){
      var saved=productOptionsTourState;if(!saved)return;
      productOptionsTourState=null;
      saved.events.forEach(function(type){modal.removeEventListener(type,saved.blockInput,true);});
      if(saved.previewRow.parentNode)saved.previewRow.parentNode.replaceChild(saved.row,saved.previewRow);
      staged=saved.staged;heroIdx=saved.heroIdx;rankOrder=saved.rankOrder;currentStep=saved.currentStep;dragSrc=saved.dragSrc;
      saved.views.forEach(function(view){
        view.attrs.forEach(function(attr){if(attr.value===null)view.el.removeAttribute(attr.name);else view.el.setAttribute(attr.name,attr.value);});
        if(view.text!==null)view.el.textContent=view.text;
      });
      if(saved.intro)saved.intro.el.innerHTML=saved.intro.html;
      if(saved.hint)saved.hint.el.textContent=saved.hint.text;
      if(saved.parent&&modal.parentNode!==saved.parent)saved.parent.insertBefore(modal,saved.next&&saved.next.parentNode===saved.parent?saved.next:null);
      saved.scrolls.forEach(function(scroll){scroll.el.scrollTop=scroll.top;scroll.el.scrollLeft=scroll.left;});
    }
    function openProductOptionsTour(options){
      if(productOptionsTourState||window._bnExporting||window._bnStateDownloading)return null;
      var interactive=!!(options&&options.interactiveDemo),host=interactive&&options.host;
      if(interactive&&(!host||host!==document.getElementById('shopee-tour-root')||!host.isConnected))return null;
      if(!modal)buildModal();
      if(!modal||modal.classList.contains('show'))return null;
      var row=document.getElementById('bn-rrow');if(!row)return null;
      var views=[modal].concat(['bn-sc1','bn-sc2','bn-st1','bn-st2','bn-mback','bn-mnext','bn-mskip','bn-mfinp','bn-mc'].map(function(id){return document.getElementById(id);}));
      if(views.some(function(el){return !el;}))return null;
      var saved={staged:staged,heroIdx:heroIdx,rankOrder:rankOrder,currentStep:currentStep,dragSrc:dragSrc,
        interactive:interactive,parent:modal.parentNode,next:modal.nextSibling,
        row:row,previewRow:row.cloneNode(false),events:['click','change','input','drop','dragstart','dragover'],
        views:views.map(function(el){return {el:el,text:/^(bn-mnext|bn-mskip)$/.test(el.id)?el.textContent:null,
          attrs:['class','style','hidden','disabled','inert','aria-hidden','data-bn-product-tour'].map(function(name){return {name:name,value:el.getAttribute(name)};})};}),
        scrolls:Array.from(modal.querySelectorAll('.bn-modal-body')).map(function(el){return {el:el,top:el.scrollTop,left:el.scrollLeft};})};
      saved.blockInput=function(event){
        if(interactive&&saved.previewRow.contains(event.target)&&/^(click|dragstart|dragover|drop)$/.test(event.type))return;
        event.preventDefault();event.stopImmediatePropagation();
      };
      productOptionsTourState=saved;
      try{
        row.parentNode.replaceChild(saved.previewRow,row);
        staged=interactive?productOptionsDemoItems():(window._bnProducts||[]).slice().sort(function(a,b){return (a.position||0)-(b.position||0);}).slice(0,MAX_PROD).map(function(p){
          return {src:p.src,name:p.name,ratio:p.ratio,fromExisting:true,id:p.id};
        });
        heroIdx=0;rankOrder=null;dragSrc=null;
        showStep(2);
        if(interactive){
          var intro=document.getElementById('bn-sc2').firstElementChild,hint=document.getElementById('bn-sc2').querySelector('.bn-rank-hint');
          if(intro){saved.intro={el:intro,html:intro.innerHTML};intro.innerHTML='・<b style="color:#dde3f0">中間 = 最大主品，圖層在最下面</b><br>・拖曳任一示範商品到另一張上，即可互換位置<br>・只調整教學示範，不會套用到正式商品';}
          if(hint){saved.hint={el:hint,text:hint.textContent};hint.textContent='試試滑鼠拖曳換位；也可用左右箭頭。中間始終是較大的主品。';}
          host.appendChild(modal);modal.removeAttribute('inert');modal.removeAttribute('aria-hidden');
        }
        if(!staged.length){
          var empty=document.createElement('div');empty.className='bn-rank-hint';
          empty.textContent='尚未上傳商品；上傳後，這裡會顯示商品的大小比例與左右排序。';
          saved.previewRow.appendChild(empty);
        }
        ['bn-mnext','bn-mskip','bn-mback','bn-st1','bn-st2','bn-mfinp','bn-mc'].forEach(function(id){document.getElementById(id).disabled=true;});
        saved.events.forEach(function(type){modal.addEventListener(type,saved.blockInput,true);});
        if(!interactive){modal.setAttribute('inert','');modal.setAttribute('aria-hidden','true');}
        modal.setAttribute('data-bn-product-tour',interactive?'interactive':'true');modal.classList.add('show');
        return {element:modal,panel:modal.querySelector('.bn-modal-box'),count:staged.length,interactive:interactive,
          close:function(){if(productOptionsTourState===saved)closeProductOptionsTour();}};
      }catch(error){closeProductOptionsTour();throw error;}
    }
    window.BNProductOptionsTour={version:'20261029-2',open:openProductOptionsTour,close:closeProductOptionsTour,
      isOpen:function(){return !!productOptionsTourState;}};

    function handleFiles(files){
      var imgs=files.filter(function(f){return f.type.startsWith('image/');});
      var toAdd=imgs.slice(0,Math.max(0,MAX_PROD-staged.length+(staged.filter(function(s){return s.fromExisting;}).length)));
      if(!toAdd.length){updateLimit();renderPreview();return;}
      Promise.all(toAdd.map(function(f){return readFile(f).then(function(src){return{file:f,src:src,name:f.name.replace(/\.[^.]+$/,''),ratio:1};});}))
        .then(function(results){results.forEach(function(r){if(staged.length<MAX_PROD)staged.push(r);});renderPreview();updateLimit();});
    }

    function updateLimit(){
      var el=document.getElementById('bn-mlimit');
      var n=staged.length;
      if(n>MAX_PROD){el.style.color='#f5a623';el.textContent='目前 '+n+' 張，請移除 '+(n-MAX_PROD)+' 張才可繼續';}
      else if(n===MAX_PROD){el.style.color='#4a90e2';el.textContent='✓ 已選 3 張，可繼續下一步';}
      else if(n>0){el.style.color='#687090';el.textContent='已選 '+n+' 張（最多3張）';}
      else{el.textContent='';}
      var btn=document.getElementById('bn-mnext');
      if(btn&&currentStep===1){var ok=n>0&&n<=MAX_PROD;btn.disabled=!ok;}
    }

    function renderPreview(){
      var grid=document.getElementById('bn-mpgrid');
      var noEl=document.getElementById('bn-mno');
      if(!grid)return;
      grid.innerHTML='';
      noEl.style.display=staged.length?'none':'';
      staged.forEach(function(item,i){
        var isHero=(i===heroIdx);
        var cell=document.createElement('div');
        cell.className='bn-preview-cell'+(isHero?' is-hero':'');
        cell.innerHTML=(isHero?'<div class="pc-hero">主品</div>':'')+
          '<img src="'+item.src+'">'+
          '<div class="pc-name">'+item.name+'</div>'+
          '<div class="pc-rm" data-ri="'+i+'">×</div>';
        cell.addEventListener('click',function(e){if(e.target.dataset.ri!==undefined)return;heroIdx=i;renderPreview();});
        cell.querySelector('.pc-rm').addEventListener('click',function(e){
          e.stopPropagation();
          staged.splice(+e.target.dataset.ri,1);
          if(heroIdx>=staged.length)heroIdx=Math.max(0,staged.length-1);
          renderPreview();updateLimit();
        });
        grid.appendChild(cell);
      });
    }

    /* ── Step 2: 排序 ── */
    /* 排序確認(step2)畫面的「視覺位置→角色」對照表，刻意跟最終畫布的排版視覺順序
       保持一致：主品(hero)在畫面上要「置中」，左配品在左、右配品在右
       （n=2 時比照畫布的特例：左＝配品、右＝主品，畫布本來就是這樣排）。
       這樣使用者在 step2 看到的排列，跟套用後畫布上看到的排列會是同一種視覺順序，
       不會出現「這裡明明排第一個，套用後卻跑到中間」的落差。 */
    function rankRoleMap(n){
      if(n<=1) return ['hero'];
      if(n===2) return ['left','hero'];
      return ['left','hero','right'];
    }

    /* 預設圖層順序：匯入後畫面上是左／中／右，
       中間主品固定在最下面，左右配品疊在主品前面。
       zOrder 越小代表越上層；因此主品（position=0）要放最後。 */
    function defaultProductZOrder(position, count){
      count = Math.max(1, Number(count) || 1);
      position = Number(position);
      if(!isFinite(position) || position < 0) position = 0;
      return position === 0 ? Math.max(0, count - 1) : Math.max(0, position - 1);
    }

    function initRankOrder(){
      var n = staged.length;
      var roles = rankRoleMap(n);
      var heroSlot = roles.indexOf('hero');
      var others = [];
      staged.forEach(function(_,i){ if(i!==heroIdx) others.push(i); });
      rankOrder = new Array(n);
      if(heroSlot >= 0 && heroSlot < n) rankOrder[heroSlot] = heroIdx;
      var oi = 0;
      for(var s=0; s<n; s++){
        if(s === heroSlot) continue;
        rankOrder[s] = others[oi++];
      }
    }

    function renderRankRow(){
      var row=document.getElementById('bn-rrow');
      if(!row)return;
      var demoMode=!!(productOptionsTourState&&productOptionsTourState.interactive);
      if(demoMode){
        var fresh=row.cloneNode(false);row.parentNode.replaceChild(fresh,row);row=fresh;productOptionsTourState.previewRow=row;
      }
      function currentDemo(){return !demoMode||productOptionsTourState&&productOptionsTourState.previewRow===row;}
      row.innerHTML='';
      var roles = rankRoleMap(rankOrder.length);
      var roleLabels  = {hero:'中間主品（最下面）', left:'左側配品', right:'右側配品'};
      var roleHeights = {hero:120, left:95, right:75};
      dragSrc=null;

      rankOrder.forEach(function(itemIdx,pos){
        var item=staged[itemIdx];
        if(!item)return;
        var role = roles[pos] || 'left';
        var h=roleHeights[role]||75;
        var w=Math.round(h*(item.ratio||1));

        var card=document.createElement('div');
        card.className='bn-rank-card'; card.dataset.pos=pos; card.draggable=true;
        if(demoMode)card.dataset.tourProduct=item.id;

        var wrap=document.createElement('div');
        wrap.className='bn-rank-img-wrap'; wrap.style.cssText='width:'+w+'px;height:'+h+'px;';
        var img=document.createElement('img');
        img.src=item.src; img.style.cssText='height:'+h+'px;width:auto;max-width:'+w+'px;';
        if(demoMode){img.draggable=false;img.alt=item.name+'（教學示範）';}
        wrap.appendChild(img);

        if(pos>0){
          var al=document.createElement('button');al.className='bn-rank-arrow left-arr';al.textContent='‹';al.title='往左移';
          al.addEventListener('click',function(e){e.stopPropagation();if(!currentDemo())return;var t=rankOrder[pos];rankOrder[pos]=rankOrder[pos-1];rankOrder[pos-1]=t;renderRankRow();});
          wrap.appendChild(al);
        }
        if(pos<rankOrder.length-1){
          var ar=document.createElement('button');ar.className='bn-rank-arrow right-arr';ar.textContent='›';ar.title='往右移';
          ar.addEventListener('click',function(e){e.stopPropagation();if(!currentDemo())return;var t=rankOrder[pos];rankOrder[pos]=rankOrder[pos+1];rankOrder[pos+1]=t;renderRankRow();});
          wrap.appendChild(ar);
        }
        card.appendChild(wrap);

        var nameEl=document.createElement('div');nameEl.className='bn-rank-name';nameEl.textContent=item.name;card.appendChild(nameEl);
        var tagEl=document.createElement('div');tagEl.className='bn-rank-tag '+role;tagEl.textContent=roleLabels[role]||'配品';card.appendChild(tagEl);

        card.addEventListener('dragstart',function(e){if(!currentDemo())return;dragSrc=+card.dataset.pos;e.dataTransfer.effectAllowed='move';if(demoMode)e.dataTransfer.setData('text/plain',item.id);setTimeout(function(){card.classList.add('dragging');},0);});
        card.addEventListener('dragend',function(){card.classList.remove('dragging');hideLine();dragSrc=null;});
        row.appendChild(card);
      });

      /* drop line */
      var line=document.createElement('div');line.className='bn-drop-line';row.appendChild(line);
      function hideLine(){line.style.display='none';}
      function getInsertIdx(cx){var cards=Array.from(row.querySelectorAll('.bn-rank-card'));for(var i=0;i<cards.length;i++){var r=cards[i].getBoundingClientRect();if(cx<r.left+r.width*.5)return i;}return cards.length;}
      function showLine(cx){var cards=Array.from(row.querySelectorAll('.bn-rank-card'));var rr=row.getBoundingClientRect();var idx=getInsertIdx(cx);var lx;if(!cards.length){lx=0;}else if(idx===0){lx=cards[0].getBoundingClientRect().left-rr.left-8;}else if(idx>=cards.length){lx=cards[cards.length-1].getBoundingClientRect().right-rr.left+8;}else{lx=(cards[idx-1].getBoundingClientRect().right+cards[idx].getBoundingClientRect().left)/2-rr.left;}line.style.left=Math.round(lx)+'px';line.style.display='block';}
      row.addEventListener('dragover',function(e){if(!currentDemo()||dragSrc===null)return;e.preventDefault();showLine(e.clientX);});
      row.addEventListener('dragleave',function(e){if(!row.contains(e.relatedTarget))hideLine();});
      row.addEventListener('drop',function(e){
        e.preventDefault();hideLine();if(!currentDemo()||dragSrc===null)return;
        var target=demoMode&&e.target.closest&&e.target.closest('.bn-rank-card');
        if(target&&row.contains(target)){var to=+target.dataset.pos,temp=rankOrder[dragSrc];rankOrder[dragSrc]=rankOrder[to];rankOrder[to]=temp;}
        else{var idx=getInsertIdx(e.clientX);var moved=rankOrder.splice(dragSrc,1)[0];if(idx>dragSrc)idx--;rankOrder.splice(idx,0,moved);}
        dragSrc=null;renderRankRow();
      });
    }

    function showStep(n){
      currentStep=n;
      document.getElementById('bn-sc1').style.display=n===1?'':'none';
      document.getElementById('bn-sc2').style.display=n===2?'':'none';
      document.getElementById('bn-st1').classList.toggle('on',n===1);
      document.getElementById('bn-st2').classList.toggle('on',n===2);
      document.getElementById('bn-mback').style.display=n===2?'':'none';
      document.getElementById('bn-mnext').textContent=n===1?'下一步 →':'確認並套用';
      document.getElementById('bn-mskip').textContent=n===1?'跳過，直接套用':'跳過比例，直接套用';
      document.getElementById('bn-mnext').disabled=false;
      if(n===1)updateLimit();
      if(n===2){initRankOrder();renderRankRow();}
    }

    /* ── 套用 ──
       注意：這裡假設 orderedItems 是「主品優先」順序：[0]=主品/中，[1]=左配，[2]=右配。
       step2 的 rankOrder 現在是「視覺左到右」順序（跟畫面看到的一致），
       呼叫端（確認並套用按鈕）需要先轉換成主品優先順序才能傳進來，
       「跳過，直接套用」這條路徑則本來就是用 staged 的上傳順序，也符合主品優先假設。 */
    async function applyWithOrder(orderedItems,skipRatio){
      if(productOptionsTourState)return;
      if(!orderedItems.length)return;
      /* 清除舊商品 */
      var oldIds=window._bnProducts.map(function(p){return p.id;});
      oldIds.forEach(function(id){broadcast({type:'bn-product-remove',id:id});});
      window._bnProducts=[];

      var sizeRatios=skipRatio?null:[1,0.85,0.72];
      for(var i=0;i<orderedItems.length;i++){
        var item=orderedItems[i];
        var src=item.src;
        /* 如果是已有的商品直接用，否則先 autoTrim */
        if(!item.fromExisting){
          var img=await loadImg(src);
          var trimmed=autoTrim(img);
          src=trimmed.src;
          item.ratio=trimmed.ratio;
        }
        var id='p'+Date.now()+'_'+i;
        var sizeScale=sizeRatios?sizeRatios[i]||0.72:1;
        /* position: 0=主品(中), 1=左配, 2=右配 */
        var positionMap = [0, 1, 2];
        var pos = positionMap[i] !== undefined ? positionMap[i] : i;
        var zOrder = defaultProductZOrder(pos, orderedItems.length);
        var prod = {id:id,src:src,ratio:item.ratio||1,name:item.name,sizeScale:sizeScale,position:pos,zOrder:zOrder};
        if(item.baseSrc) prod.baseSrc = item.baseSrc;
        if(item.meta) prod.meta = JSON.parse(JSON.stringify(item.meta));
        /* 新上傳的商品：自動合成貼地陰影（bn-shadow-plugin.js）。
           baseSrc 保留去背/裁切後的原圖，src 換成「原圖＋影子」。 */
        if(!item.fromExisting && !window._bnGroundShadow){
          /* 影子外掛按需載入：還沒載入就先載，不然新商品沒有影子也沒有商品本體範圍 */
          try{ await loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body'); }catch(err){ console.warn('[bn-editor] 影子外掛載入失敗', err); }
        }
        if(!item.fromExisting && window._bnGroundShadow){
          try{
            prod.baseSrc = src;
            await window._bnGroundShadow.applyToProduct(prod, window._bnGroundShadow.DEFAULT);
          }catch(err){ console.warn('[bn-editor] 自動影子合成失敗', err); prod.src = src; }
        }
        window._bnProducts.push(prod);
        broadcast({type:'bn-product-add',id:id,src:prod.src,ratio:prod.ratio||1,name:item.name,index:i,sizeScale:sizeScale,position:pos,zOrder:zOrder,layoutById:item.layouts||null,layout:item.layout||null,rotate:(prod.meta&&prod.meta.rotate)||0,productRect:prod.meta&&prod.meta.productRect});
        await new Promise(function(r){setTimeout(r,50);});
      }
      renderProdList();
      /* ★ 上傳後一定要補送一次 z-index 順序。bn-product-add 本身不設 z-index，
         這裡直接同步，確保畫布跟工具列都維持「中間主品在最下面」的預設。 */
      broadcastZOrder();
      markStateDirty();
    }

    /* 把 rankOrder（step2 畫面上的視覺左到右順序）轉換成 applyWithOrder 需要的
       「主品優先」順序：[主品, 左配, 右配]（缺誰就跳過）。 */
    function rankOrderToHeroFirst(){
      var roles = rankRoleMap(rankOrder.length);
      var out = [];
      var heroSlot = roles.indexOf('hero');
      if(heroSlot >= 0) out.push(rankOrder[heroSlot]);
      roles.forEach(function(r, idx){ if(r === 'left') out.push(rankOrder[idx]); });
      roles.forEach(function(r, idx){ if(r === 'right') out.push(rankOrder[idx]); });
      return out.map(function(i){ return staged[i]; });
    }

    /* 大中小位置標籤 */
    var POS_LABELS = ['主品（中）', '左配品', '右配品'];
    var POS_COLORS = ['#4a90e2', '#687090', '#687090'];

    function renderProdList(){
      var list=document.getElementById('bn-prod-list');
      if(!list)return;
      list.innerHTML='';
      /* 依 position 排序顯示：主品第一 */
      var sorted = window._bnProducts.slice().sort(function(a,b){
        var pa = a.position !== undefined ? a.position : 99;
        var pb = b.position !== undefined ? b.position : 99;
        return pa - pb;
      });
      /* 初始化舊資料沒有記錄的 zOrder；新的預設是中間主品在最下面。 */
      sorted.forEach(function(p, i){
        if(p.zOrder === undefined){
          var position = p.position !== undefined ? p.position : i;
          p.zOrder = defaultProductZOrder(position, sorted.length);
        }
      });
      /* z-index 排序：zOrder 小的在上面（蓋住其他） */
      var zSorted = window._bnProducts.slice().sort(function(a,b){
        return (a.zOrder||0) - (b.zOrder||0);
      });
      /* 工具列顯示用 zSorted（前面的蓋住後面的）。
         人物圖現在是跟「目前最上層（z-order 排序最前面）」的商品放在一起，
         不再鎖死「主品(中)」——使用者拖動商品的上下層箭頭換了誰在最上層，
         人物圖互動的對象也會自動換成新的最上層商品，這裡 topIdxInZ 永遠是 0。
         現在最多可以有 2 個人物欄位，各自獨立比較「在最上層商品前面還後面」，
         同一側(前面/後面)有多個人物時，依人物1、人物2的順序排列。 */
      var topIdxInZ = 0;
      broadcastCharacterVisibility(zSorted);

      var charSlotKeys = ['_bnCharacter', '_bnCharacter2'];
      var activeCharKeys = charSlotKeys.filter(function(k){ return window[k]; });

      if(activeCharKeys.length === 2){
        /* 兩個人物都存在：一定緊鄰排在一起，不會被商品插在中間——
           這時候商品本來就完全不顯示（2張人物->商品可見數=0），
           跟商品比前後沒有意義，改成兩個人物互相比前後。 */
        var firstKey = (window._bnCharPairFirst && activeCharKeys.indexOf(window._bnCharPairFirst) !== -1)
          ? window._bnCharPairFirst : activeCharKeys[0];
        var secondKey = activeCharKeys.filter(function(k){ return k !== firstKey; })[0];
        list.appendChild(buildCharacterRowEl(firstKey,  {otherKey:secondKey, isFirst:true}));
        list.appendChild(buildCharacterRowEl(secondKey, {otherKey:firstKey,  isFirst:false}));

        /* 商品照常全部列出(方便管理/移除)，但不會有人物插在中間。 */
        zSorted.forEach(function(p){
          list.appendChild(buildProductRowEl(p, zSorted, null));
        });
      } else {
        var singleCharKey = activeCharKeys[0] || null;
        for(var zi=0; zi<zSorted.length; zi++){
          var p = zSorted[zi];
          /* 人物圖只跟「目前最上層」的商品放在一起，方便一起調整上下層——
             不再被「上傳人物圖」按鈕隔開。依 aboveMain 決定插在它前面或後面。 */
          if(singleCharKey && zi === topIdxInZ && window[singleCharKey].aboveMain !== false){
            list.appendChild(buildCharacterRowEl(singleCharKey, null));
          }
          var swapKeyForThis = (singleCharKey && zi === topIdxInZ) ? singleCharKey : null;
          list.appendChild(buildProductRowEl(p, zSorted, swapKeyForThis));
          if(singleCharKey && zi === topIdxInZ && window[singleCharKey].aboveMain === false){
            list.appendChild(buildCharacterRowEl(singleCharKey, null));
          }
        }
      }
      /* 沒有商品、但有人物圖（理論上少見，人物預設是跟主品綁在一起顯示）：
         至少讓人物卡片還是看得到、能編輯/移除。兩個人物同時存在、且沒有商品時
         已經在上面的分支處理過了，這裡只補「剛好只有 1 個人物、沒有商品」的情況。 */
      if(!zSorted.length && activeCharKeys.length === 1){
        list.appendChild(buildCharacterRowEl(activeCharKeys[0], null));
      }
    }

    /* 建立單一商品的清單卡片列。抽成獨立函式是因為現在有兩種呼叫情境：
       ①一般情況(0或1個人物)：商品可能需要跟人物比前後(swapKey 有值)
       ②兩個人物都存在時：商品照常列出但不跟人物比前後(swapKey傳null)。 */
    function buildProductRowEl(p, zSorted, swapKey){
        var row=document.createElement('div');row.className='bn-prod-item';
        row.style.flexWrap='wrap';row.style.gap='4px';

        var img=document.createElement('img');img.src=p.src;

        var infoWrap=document.createElement('div');
        infoWrap.style.cssText='flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;';

        var name=document.createElement('span');
        name.textContent=p.name;
        name.style.cssText='overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;';

        var posLabel=document.createElement('span');
        var posIdx = p.position !== undefined ? p.position : 0;
        posLabel.textContent = POS_LABELS[posIdx] || '';
        posLabel.style.cssText='font-size:9px;font-weight:700;color:'+( POS_COLORS[posIdx]||'#687090')+';';

        infoWrap.appendChild(name);
        infoWrap.appendChild(posLabel);

        var editBtn=document.createElement('button');editBtn.textContent='編輯';
        editBtn.title='裁切・去背・擦除・影子';
        editBtn.addEventListener('click',(function(pid){return function(){
          openProductEditor(pid);
        };})(p.id));

        var shadowBtn=document.createElement('button');shadowBtn.textContent='影子';
        var gsOn = p.meta && p.meta.groundShadow && p.meta.groundShadow.enabled;
        shadowBtn.title = gsOn ? '編輯影子（目前：開）' : '編輯影子（目前：關）';
        if(gsOn) shadowBtn.style.color='#58a6ff';
        shadowBtn.addEventListener('click',(function(pid){return function(){
          openGroundShadowEditor(pid);
        };})(p.id));

        /* 旋轉角度：數字輸入，畫布上也有旋轉把手可以直接拖 */
        var rotWrap=document.createElement('label');
        rotWrap.title='旋轉角度（-180～180°）。也可以直接拖畫布上商品上方的旋轉把手，按住 Shift 以 15° 為單位。';
        rotWrap.style.cssText='display:inline-flex;align-items:center;gap:2px;font-size:10px;color:#8b949e;';
        var rotInp=document.createElement('input');
        rotInp.type='number'; rotInp.min='-180'; rotInp.max='180'; rotInp.step='1';
        rotInp.value=String(Math.round(Number(p.meta && p.meta.rotate) || 0));
        rotInp.style.cssText='width:46px;padding:2px 4px;font-size:11px;background:#0d1117;color:#e6e8ef;border:1px solid #30363d;border-radius:4px;';
        var rotUnit=document.createElement('span'); rotUnit.textContent='°';
        rotWrap.appendChild(rotInp); rotWrap.appendChild(rotUnit);
        var rotTimer=null;
        rotInp.addEventListener('input',(function(pid){return function(){
          var v=Number(rotInp.value);
          if(!isFinite(v)) return;
          clearTimeout(rotTimer);
          rotTimer=setTimeout(function(){
            rotInp.disabled=true;
            setProductRotation(pid, v, function(){ rotInp.disabled=false; });
          },250);
        };})(p.id));

        var rmBtn=document.createElement('button');rmBtn.textContent='移除';rmBtn.className='rm';
        rmBtn.addEventListener('click',function(){
          window._bnProducts=window._bnProducts.filter(function(x){return x.id!==p.id;});
          renderProdList();broadcast({type:'bn-product-remove',id:p.id});markStateDirty();
        });

        /* 上移/下移：調整 position 值 */
        var moveWrap=document.createElement('div');moveWrap.className='bn-prod-move';

        var upBtn=document.createElement('button');upBtn.textContent='▲';upBtn.title='往前';
        var downBtn=document.createElement('button');downBtn.textContent='▼';downBtn.title='往後';

        /* 依目前 sorted 裡的順序決定能否移動。
           人物插進清單後，實際上是跟「目前最上層那件商品(sortedIdx===0)」相鄰，
           所以只有這件商品的上/下箭頭需要额外判斷「隔壁是不是人物」；
           其他商品(sortedIdx>0)完全不受人物影響，維持原本商品之間互相交換的邏輯。
           swapKey 是 null 時(沒有人物，或兩個人物都存在時)，就完全不用考慮跟人物交換。 */
        var sortedIdx = zSorted.indexOf(p);
        var isTopmost = sortedIdx === 0;
        var isBottommost = sortedIdx === zSorted.length - 1;
        var swapUpKey = (swapKey && isTopmost && window[swapKey].aboveMain !== false) ? swapKey : null;
        var swapDownKey = (swapKey && isTopmost && window[swapKey].aboveMain === false) ? swapKey : null;

        upBtn.disabled   = isTopmost && !swapUpKey;   /* 最上層商品，且沒有人物擋在前面可以交換，才鎖死 */
        downBtn.disabled = isBottommost && !swapDownKey; /* 最下層商品，且沒有人物擋在後面可以交換，才鎖死 */
        upBtn.style.opacity   = upBtn.disabled   ? '0.3' : '1';
        downBtn.style.opacity = downBtn.disabled ? '0.3' : '1';
        if(swapUpKey) upBtn.title   = '往前（跟'+charSlotLabel(swapUpKey)+'交換，蓋過人物）';
        if(swapDownKey) downBtn.title = '往後（把'+charSlotLabel(swapDownKey)+'換到前面）';

        upBtn.addEventListener('click',(function(pid, si, swapKeyForClick){ return function(){
          if(swapKeyForClick){
            /* 這件商品已經是商品裡最上層，唯一能再往前的對象就是人物——
               直接把該人物切到「退到後面」，效果等同這件商品蓋過人物。 */
            if(!window[swapKeyForClick]) return;
            window[swapKeyForClick].aboveMain = false;
            renderProdList();
            broadcastCharacter(swapKeyForClick);
            markStateDirty();
            return;
          }
          /* 往上 = z-index 升高（蓋在前面） */
          var a = window._bnProducts.find(function(x){return x.id===pid;});
          var b = zSorted[si-1];
          if(!a||!b) return;
          var tmp = a.zOrder; a.zOrder = b.zOrder; b.zOrder = tmp;
          renderProdList();
          broadcastZOrder();
          markStateDirty();
        };})(p.id, sortedIdx, swapUpKey));

        downBtn.addEventListener('click',(function(pid, si, swapKeyForClick){ return function(){
          if(swapKeyForClick){
            /* 人物目前在這件商品後面——把該人物切到「在前面」，
               效果等同這件商品退到人物後面。 */
            if(!window[swapKeyForClick]) return;
            window[swapKeyForClick].aboveMain = true;
            renderProdList();
            broadcastCharacter(swapKeyForClick);
            markStateDirty();
            return;
          }
          /* 往下 = z-index 降低（被蓋在後面） */
          var a = window._bnProducts.find(function(x){return x.id===pid;});
          var b = zSorted[si+1];
          if(!a||!b) return;
          var tmp = a.zOrder; a.zOrder = b.zOrder; b.zOrder = tmp;
          renderProdList();
          broadcastZOrder();
          markStateDirty();
        };})(p.id, sortedIdx, swapDownKey));

        moveWrap.appendChild(upBtn);
        moveWrap.appendChild(downBtn);

        row.appendChild(img);row.appendChild(infoWrap);row.appendChild(moveWrap);row.appendChild(editBtn);row.appendChild(shadowBtn);row.appendChild(rotWrap);row.appendChild(rmBtn);
        return row;
    }

    /* BODA 工單總覽素材橋接：
       BODA 只把「已依 B17／LOGO 欄位檔名配對成功」的 data URL 傳進來，
       這裡再沿用 Shopee 核心原本的 _bnProducts／_bnLogos 狀態與廣播流程。
       沒有收到這則 postMessage 時，Shopee 仍完全照原本的獨立工具運作。 */
    var _bnWorkorderAssetSignature = '';
    var _bnWorkorderAssetApplySeq = 0;
    /* BODA 每批素材會重送好幾次，代言人原圖動輒數 MB；同一張圖的指紋只算一次。 */
    var _bnWorkorderHashCache = new Map();
    function workorderAssetHash(value){
      var text = String(value || '');
      var cached = _bnWorkorderHashCache.get(text);
      if(cached) return cached;
      var hash = 2166136261;
      for(var i=0;i<text.length;i++){
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      var out = (hash >>> 0).toString(16);
      if(text.length > 4096){
        /* 一包素材最多約 8 張（商品 3、LOGO 3、代言人 2），只留最近的 10 張，避免舊圖一直佔記憶體 */
        if(_bnWorkorderHashCache.size >= 10) _bnWorkorderHashCache.delete(_bnWorkorderHashCache.keys().next().value);
        _bnWorkorderHashCache.set(text, out);
      }
      return out;
    }
    function workorderAssetKey(item){
      item = item || {};
      var src = String(item.src || '');
      return String(item.name || '') + '|' + src.length + '|' + workorderAssetHash(src);
    }
    function isWorkorderLogoPlaceholder(item){
      var name = String(item && (item.name || item.fileName || item.filename || '') || '')
        .trim().toLowerCase().replace(/[\s_\-（）()]/g, '');
      /* 空白工單的提示文字不是實際 Logo，不能讓它佔掉 Logo1～3。 */
      return /^(?:xxx|xxx品牌|xxxbrand)$/.test(name);
    }
    function normalizeWorkorderAssets(items, kind){
      return (Array.isArray(items) ? items : []).filter(function(item){
        return item && /^(?:data:image\/|blob:)/i.test(String(item.src || '')) &&
          !(kind === 'logo' && isWorkorderLogoPlaceholder(item));
      });
    }
    function workorderAssetSignature(payload){
      payload = payload || {};
      return JSON.stringify({
        replaceLogos: !!payload.replaceLogos,
        replaceProducts: !!payload.replaceProducts,
        replaceCampaignCard: !!payload.replaceCampaignCard,
        logos: normalizeWorkorderAssets(payload.logos, 'logo').map(workorderAssetKey),
        products: normalizeWorkorderAssets(payload.products, 'product').map(workorderAssetKey),
        campaignCard: {
          product: workorderAssetKey(payload.campaignCard && payload.campaignCard.product),
          logo: workorderAssetKey(payload.campaignCard && payload.campaignCard.logo)
        },
        replaceEndorser: !!payload.replaceEndorser,
        endorsers: normalizeWorkorderAssets(payload.endorsers, 'endorser').map(workorderAssetKey),
        endorserNote: String(payload.endorserNote || '')
      });
    }
    function workorderAssetStateMatches(currentItems, expectedItems, kind){
      var current = Array.isArray(currentItems) ? currentItems : [];
      var expected = normalizeWorkorderAssets(expectedItems, kind);
      if(current.length !== expected.length) return false;
      for(var i=0;i<expected.length;i++){
        var actual = current[i] || {};
        var wanted = expected[i] || {};
        if(String(actual.src || '') !== String(wanted.src || '')) return false;
      }
      return true;
    }
    function workorderCampaignCardStateSignature(card){
      card = card || {};
      return JSON.stringify([
        workorderAssetKey(card.product),
        workorderAssetKey(card.logo)
      ]);
    }
    function workorderAssetRatio(src){
      return loadImg(src).then(function(img){
        return img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
      }).catch(function(){ return 1; });
    }
    function applyBodaWorkorderAssets(payload){
      payload = payload || {};
      var logos = normalizeWorkorderAssets(payload.logos, 'logo');
      var products = normalizeWorkorderAssets(payload.products, 'product');
      var replaceLogos = payload.replaceLogos === true;
      var replaceProducts = payload.replaceProducts === true;
      var replaceCampaignCard = payload.replaceCampaignCard === true;
      var campaignCard = payload.campaignCard || {};
      var campaignCardProduct = normalizeWorkorderAssets([campaignCard.product], 'product')[0] || null;
      var campaignCardLogo = normalizeWorkorderAssets([campaignCard.logo], 'logo')[0] || null;
      /* 代言人照＋簽名檔／代言人小字：只有工單內容變了、或目前沒有時才套用（不覆蓋手動調整） */
      var replaceEndorser = endorserWorkorderNeedsApply(payload);
      var endorserNoteText = endorserWorkorderNoteNeedsApply(payload) ? endorserWorkorderNoteText(payload) : '';
      if(!replaceLogos && !replaceProducts && !replaceCampaignCard && !replaceEndorser && !endorserNoteText) return Promise.resolve(false);

      var seq = ++_bnWorkorderAssetApplySeq;
      /* 影子外掛是按需載入的：工單商品進來時若還沒載入，以前就直接用 BODA 傳來的圖（已烘活動頁影子），
         也沒有 productRect，選取框／移動範圍會變成整張圖（連影子、留白一起框）。先載入再處理。 */
      var shadowReady = replaceProducts && !window._bnGroundShadow
        ? loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body')['catch'](function(err){ console.warn('[bn-editor] 影子外掛載入失敗', err); })
        : Promise.resolve();
      var productJobs = replaceProducts ? shadowReady.then(function(){ return Promise.all(products.map(function(item){
        return workorderAssetRatio(item.src).then(function(ratio){
          /* 工單匯入的商品也自動合成貼地陰影：以 baseSrc（沒有影子的原圖）重新合成，商品本體範圍才正確（失敗就用原圖） */
          if(!window._bnGroundShadow) return { item:item, ratio:ratio };
          var tmp = { src:item.src, baseSrc:item.baseSrc || item.src, ratio:ratio, meta:{} };
          return window._bnGroundShadow.applyToProduct(tmp, window._bnGroundShadow.DEFAULT)
            .then(function(){ return { item:item, ratio:tmp.ratio, src:tmp.src, baseSrc:tmp.baseSrc, meta:tmp.meta }; })
            .catch(function(err){ console.warn('[bn-editor] 工單商品影子合成失敗', err); return { item:item, ratio:ratio }; });
        });
      })); }) : Promise.resolve([]);

      /* LOGO 比例要量實際圖片：BODA 傳來的素材沒有 ratio，若直接用 1 會永遠判成方版。 */
      var logoJobs = replaceLogos ? Promise.all(logos.map(function(item){
        return item.ratio ? Promise.resolve(item.ratio) : workorderAssetRatio(item.src);
      })) : Promise.resolve([]);

      var endorserJob = replaceEndorser ? buildWorkorderEndorserSlots(payload)['catch'](function(err){
        console.warn('[bn-editor] 工單代言人圖讀取失敗', err);
        return null;
      }) : Promise.resolve(null);

      return Promise.all([productJobs, logoJobs, endorserJob]).then(function(jobResults){
        var productResults = jobResults[0];
        var logoRatios = jobResults[1];
        var endorserResult = jobResults[2];
        if(seq !== _bnWorkorderAssetApplySeq) return false;

        if(replaceLogos){
          window._bnLogos = logos.map(function(item, index){
            return {
              id: 'wo_logo_' + Date.now() + '_' + index,
              src: item.src,
              baseSrc: item.baseSrc || item.src,
              name: item.name || '',
              ratio: logoRatios[index] || 1
            };
          });
          window._bnLogoDataUrl = window._bnLogos.length ? window._bnLogos[0].src : null;
          window._bnLogoLayouts = {};
          broadcast({type:'bn-logos', logos:window._bnLogos, logoLayoutById:window._bnLogoLayouts});
          renderLogoList();
          if(typeof syncLogoLayoutSelection === 'function') syncLogoLayoutSelection();
        }

        if(replaceProducts){
          var oldIds = (window._bnProducts || []).map(function(product){ return product && product.id; }).filter(Boolean);
          oldIds.forEach(function(id){ broadcast({type:'bn-product-remove', id:id}); });
          window._bnProducts = productResults.map(function(result, index){
            var item = result.item;
            var prod = {
              id: 'wo_product_' + Date.now() + '_' + index,
              src: result.src || item.src,
              baseSrc: result.baseSrc || item.baseSrc || item.src,
              ratio: result.ratio || 1,
              name: item.name || '',
              sizeScale: 1,
              position: index,
              zOrder: defaultProductZOrder(index, products.length)
            };
            if(result.meta) prod.meta = result.meta;
            return prod;
          });
          window._bnProducts.forEach(function(product, index){
            broadcast({
              type:'bn-product-add', id:product.id, src:product.src, rotate:(product.meta&&product.meta.rotate)||0,
              ratio:product.ratio, name:product.name, index:index,
              sizeScale:product.sizeScale, position:product.position, zOrder:product.zOrder,
              productRect:product.meta && product.meta.productRect
            });
          });
          broadcastZOrder();
          renderProdList();
        }

        if(endorserResult && (endorserResult.photo || endorserResult.sign)){
          window._bnEndorserPhoto = endorserResult.photo;
          window._bnEndorserSign = endorserResult.sign;
          window._bnEndorserClassifyMethod = endorserResult.method;
          endorserNoteState().woSig = endorserResult.sig;
          /* 工單帶入新的代言人圖：小字也回到預設擺法（照片右、小字左上、簽名左下） */
          endorserNoteState().layouts = {};
        }
        if(endorserNoteText){
          endorserNoteState().text = endorserNoteText;
          endorserNoteState().woNote = endorserNoteText;
          var woNoteInp = document.getElementById('bn-endorser-note-inp');
          if(woNoteInp) woNoteInp.value = endorserNoteText;
        }
        if((endorserResult && (endorserResult.photo || endorserResult.sign)) || endorserNoteText){
          renderEndorserUI();
          broadcastAllEndorser();
        }
        if(replaceCampaignCard){
          window._bnCampaignCardAssets = { product:campaignCardProduct, logo:campaignCardLogo };
          broadcast({type:'bn-campaign-card-assets', assets:window._bnCampaignCardAssets});
        }

        markStateDirty();
        return true;
      });
    }


    /* 廣播 z-index 更新 */
    function broadcastZOrder(){
      /* zOrder：依工具列順序，index 0 = 最上層（z-index 最高） */
      var order = window._bnProducts.slice().sort(function(a,b){
        return (a.zOrder||0) - (b.zOrder||0);
      }).map(function(p){ return p.id; });
      broadcast({type:'bn-product-zorder', order: order});
    }
    /* 開啟 editor-plugin 編輯器（裁切/去背/擦除/影子） */
    function openProductEditor(pid){
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p)return;

      /* 確保 editor-plugin.js 已載入 */
      if(!window.HBNProductEditorPlugin){
        loadScriptOnce('js/editor-plugin.js').then(function(){ doOpenEditor(pid); })['catch'](function(){ BnDialog.alert('editor-plugin.js 載入失敗'); });
        return;
      }
      doOpenEditor(pid);
    }

    /* 開啟貼地陰影編輯器（bn-shadow-plugin.js）。套用後 p.src 已換成合成圖，就地更新版位。 */
    function openGroundShadowEditor(pid){
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p)return;
      if(!window._bnGroundShadow){
        loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body').then(function(){ openGroundShadowEditor(pid); })['catch'](function(){ BnDialog.alert('bn-shadow-plugin.js 載入失敗'); });
        return;
      }
      window._bnGroundShadow.openEditor(p, function(){
        markStateDirty();
        renderProdList();
        broadcast({type:'bn-product-update-image', id:p.id, src:p.src, ratio:p.ratio, productRect:p.meta && p.meta.productRect});
      });
    }

    /* ══ 商品旋轉 ══
       角度存在 p.meta.rotate，實際圖片走 bn-shadow-plugin 的管線：
       baseSrc（無影子原圖）→ 旋轉 → 合成影子 → p.src。
       畫布上的旋轉把手（layout-runtime）放開時送 bn-product-rotate，這裡重算後
       用 bn-product-update-image（keepScale）就地換圖，框的大小依新圖外接矩形等比調整。 */
    var _rotateJobs = {};
    var _rotatePromises = {};
    var _rotateCommittedAngles = {};
    function setProductRotation(pid, deg, done, rotationAnchorMode){
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p){ if(done) done(); return Promise.resolve(); }
      if(!window._bnGroundShadow){
        var loadJob = loadScriptOnce('js/bn-shadow-plugin.js?v=20261113-solid-body').then(function(){ return setProductRotation(pid, deg, done, rotationAnchorMode); })['catch'](function(){
          BnDialog.alert('bn-shadow-plugin.js 載入失敗');
          if(done) done();
        });
        _rotatePromises[pid] = loadJob;
        loadJob.then(function(){
          if(_rotatePromises[pid] === loadJob) delete _rotatePromises[pid];
        }, function(){
          if(_rotatePromises[pid] === loadJob) delete _rotatePromises[pid];
        });
        return loadJob;
      }
      var rot = window._bnGroundShadow.normalizeRotate(deg);
      p.meta = p.meta || {};
      if(!p.baseSrc){ p.baseSrc = p.meta.baseSrc || p.src; p.meta.baseSrc = p.baseSrc; }
      if(_rotateCommittedAngles[pid]===undefined)_rotateCommittedAngles[pid]=Number(p.meta.rotate)||0;
      p.meta.rotate = rot;
      var cfg = p.meta.groundShadow || {enabled:false};
      var rotationDraft=JSON.parse(JSON.stringify(p));
      var seq = (_rotateJobs[pid] = (_rotateJobs[pid] || 0) + 1);
      var job = window._bnGroundShadow.applyToProduct(rotationDraft, cfg).then(function(){
        if(_rotateJobs[pid] !== seq) return; /* 舊工作不能改寫正式商品，連續旋轉只套最後一次。 */
        p.src=rotationDraft.src;p.baseSrc=rotationDraft.baseSrc;p.ratio=rotationDraft.ratio;
        p.meta=Object.assign({},p.meta,rotationDraft.meta);
        _rotateCommittedAngles[pid]=rot;
        markStateDirty();
        renderProdList();
        /* 旋轉一律以中心點同步；rotationAnchorMode 保留在訊息格式中，
           讓舊版 iframe 也能收到完整資料，但不再採用 bottom 錨點。 */
        broadcast({type:'bn-product-update-image', id:p.id, src:p.src, ratio:p.ratio, keepScale:true, rotate:p.meta.rotate, rotationAnchorMode:'center', productRect:p.meta && p.meta.productRect});
      })['catch'](function(err){
        if(_rotateJobs[pid]!==seq)return;
        p.meta.rotate=_rotateCommittedAngles[pid]||0;
        console.warn('[bn-editor] 旋轉重算失敗', err);
        /* 失敗時把畫布上暫時的 CSS 旋轉還原 */
        broadcast({type:'bn-product-update-image', id:p.id, src:p.src, ratio:p.ratio, rotate:p.meta.rotate, productRect:p.meta && p.meta.productRect});
      }).then(function(){ if(done) done(); });
      _rotatePromises[pid] = job;
      job.then(function(){
        if(_rotatePromises[pid] === job) delete _rotatePromises[pid];
      }, function(){
        if(_rotatePromises[pid] === job) delete _rotatePromises[pid];
      });
      return job;
    }

    /* 下載前等待旋轉圖片完成合成與廣播，避免父層已經拿到新角度，
       但 iframe 還停在 CSS 即時預覽／舊圖片的中間狀態。 */
    window._bnWaitForProductRotations = function(timeoutMs){
      var jobs=Object.keys(_rotatePromises).map(function(id){return _rotatePromises[id];})
        .concat(Object.keys(_endorserRotatePromises).map(function(k){return _endorserRotatePromises[k];}));
      if(!jobs.length)return Promise.resolve();
      return new Promise(function(resolve,reject){
        var timer=setTimeout(function(){reject(new Error('商品旋轉尚未完成，請稍候再下載。'));},Math.max(1000,Number(timeoutMs)||12000));
        Promise.all(jobs).then(function(){clearTimeout(timer);resolve();},function(error){clearTimeout(timer);reject(error);});
      });
    };
    /* 畫布把手送來的是「這次拖曳的增量」，總角度以 _bnProducts 為準，
       這樣就算 iframe 重新載入、沒拿到目前角度也不會歸零。 */
    window.addEventListener('message', function(ev){
      var d = ev.data || {};
      if(d.type !== 'bn-product-rotate' || !d.id) return;
      if(window._bnExporting) return;
      var p=window._bnProducts.find(function(x){return x.id===d.id;});
      if(!p) return;
      var cur = Number(p.meta && p.meta.rotate) || 0;
      var total = d.absolute ? Number(d.rotate)||0 : cur + (Number(d.delta)||0);
      setProductRotation(d.id, total, null, d.rotationAnchorMode);
    });

    /* 攔截 editor-plugin 舊的「加 / 編輯影子」按鈕：改開新的貼地陰影編輯器。
       capture 階段攔下，editor-plugin 自己的 delegated click 就不會跑到 setShadowMode。 */
    var _editingShadowPid = null;
    document.addEventListener('click', function(e){
      var btn = e.target && e.target.closest ? e.target.closest('.hbn-plugin-modal [data-act="shadow"]') : null;
      if(!btn || !_editingShadowPid) return;
      e.stopPropagation(); e.preventDefault();
      var pid = _editingShadowPid;
      /* 先關掉 editor-plugin（走它的 nudge 關閉路徑，等同取消），再開影子編輯器 */
      var closeBtn = document.querySelector('.hbn-plugin-modal [data-act="pluginNudgeClose"]');
      if(closeBtn) closeBtn.click();
      _editingShadowPid = null;
      openGroundShadowEditor(pid);
    }, true);

    function doOpenEditor(pid){
      if(!window.HBNProductEditorPlugin){ BnDialog.alert('editor-plugin.js 未載入'); return; }
      var p=window._bnProducts.find(function(x){return x.id===pid;});
      if(!p)return;
      _editingShadowPid = pid;

      /* 建一個暫存的 .editor-item 結構讓 plugin 使用 */
      var wrap=document.getElementById('bn-edit-wrap');
      if(!wrap){
        wrap=document.createElement('div');
        wrap.id='bn-edit-wrap';
        wrap.style.cssText='position:fixed;left:-9999px;top:-9999px;width:400px;height:400px;';
        document.body.appendChild(wrap);
      }
      wrap.innerHTML='';
      var box=document.createElement('div');
      box.className='editor-item';
      var editMeta = p.meta || {};
      var shadowMeta = editMeta.shadow || null;
      var baseSrc = p.baseSrc || editMeta.baseSrc || p.src;
      box.dataset.baseSrc = baseSrc;
      if(shadowMeta && shadowMeta.enabled){
        box.dataset.shadowEnabled = '1';
        box.dataset.pluginShadowX = String(shadowMeta.x || 0);
        box.dataset.pluginShadowY = String(shadowMeta.y || 0);
        box.dataset.pluginShadowW = String(shadowMeta.w || 0);
        box.dataset.pluginShadowH = String(shadowMeta.h || 0);
      }
      box.style.cssText='position:relative;width:400px;height:400px;';
      var img=document.createElement('img');
      /* 有貼地陰影或有旋轉時，裁切/去背/擦除要在「沒有影子、沒有旋轉的原圖」上做，
         做完再重新跑 旋轉 → 影子 的管線 */
      var gsCfg = (editMeta.groundShadow && editMeta.groundShadow.enabled) ? editMeta.groundShadow : null;
      var hasRotate = !!(Number(editMeta.rotate) || 0);
      var needRebake = !!(gsCfg || hasRotate);
      var openSrc = needRebake ? baseSrc : p.src;
      img.src=openSrc;
      img.style.cssText='width:100%;height:100%;object-fit:contain;display:block;';
      box.appendChild(img);
      wrap.appendChild(box);

      /* 覆寫 imgRef.src 後同步回 _bnProducts 和 iframe */
      var origOnload=img.onload;
      var observer=new MutationObserver(function(){
        if(img.src && img.src!==openSrc && img.src.startsWith('data:')){
          observer.disconnect();
          _editingShadowPid = null;
          /* 有貼地陰影或旋轉：編輯結果當新的 baseSrc，重新跑 旋轉 → 影子 後再就地更新 */
          if(needRebake && window._bnGroundShadow){
            var newBase = img.src;
            p.baseSrc = newBase;
            p.meta = p.meta || {};
            p.meta.baseSrc = newBase;
            p.meta.shadow = {enabled:false};
            window._bnGroundShadow.applyToProduct(p, gsCfg || {enabled:false})['catch'](function(err){
              console.warn('[bn-editor] 影子重新合成失敗', err);
              p.src = newBase;
              p.ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth/img.naturalHeight : p.ratio;
            }).then(function(){
              markStateDirty();
              renderProdList();
              broadcast({type:'bn-product-update-image', id:p.id, src:p.src, ratio:p.ratio, productRect:p.meta && p.meta.productRect});
            });
            return;
          }
          /* 更新狀態 */
          p.src=img.src;
          p.baseSrc = (box.dataset && box.dataset.baseSrc) ? box.dataset.baseSrc : p.src;
          p.meta = p.meta || {};
          p.meta.baseSrc = p.baseSrc;
          p.meta.productOnlyRatio = box.dataset && box.dataset.productOnlyRatio ? parseFloat(box.dataset.productOnlyRatio) : undefined;
          if(box.dataset && box.dataset.shadowEnabled === '1'){
            p.meta.shadow = {
              enabled:true,
              x:parseFloat(box.dataset.pluginShadowX || '0'),
              y:parseFloat(box.dataset.pluginShadowY || '0'),
              w:parseFloat(box.dataset.pluginShadowW || '0'),
              h:parseFloat(box.dataset.pluginShadowH || '0')
            };
          } else {
            p.meta.shadow = {enabled:false};
          }
          var editedRatio = box.dataset && box.dataset.outputRatio ? parseFloat(box.dataset.outputRatio) : NaN;
          if(isFinite(editedRatio) && editedRatio > 0){
            p.ratio = editedRatio;
          } else if(img.naturalWidth && img.naturalHeight){
            p.ratio = img.naturalWidth / img.naturalHeight;
          }
          /* 保留使用者編輯前調整好的位置/大小（layout/layouts），不要清掉。
             之前這裡會 delete p.layout/p.layouts 並重設 width/height/x/y，
             導致編輯（去背/裁切/擦除/影子）完成回到畫布時，圖片會先閃一下、
             接著跳回「預設三角排版」的位置和放大後的尺寸，使用者原本手動調好的
             位置/大小整個消失，體驗很差。裁切/去背後圖片比例可能改變，但既有的
             box 尺寸用 object-fit:contain 顯示新圖片，畫面頂多留一點內縮空白，
             也遠比整個跳位置、跳大小來得好。 */
          markStateDirty();
          /* 更新左側預覽縮圖 */
          var listImg=document.querySelector('#bn-prod-list .bn-prod-item img[src]');
          document.querySelectorAll('#bn-prod-list .bn-prod-item').forEach(function(row){
            var rowImg=row.querySelector('img');
            /* 找對應的 product */
          });
          renderProdList();
          /* 只換圖片內容，不 remove+re-add——remove 商品會讓其餘商品的三角排版
             跟著重新計算、畫面跳一下，re-add 再套用回原本位置又是一次跳動，
             兩段式的閃爍感很明顯。改成單一則「就地換圖」訊息，完全不影響
             目前的位置/大小/其他商品排版。 */
          broadcast({type:'bn-product-update-image', id:p.id, src:p.src, ratio:p.ratio, productRect:p.meta && p.meta.productRect});
        }
      });
      observer.observe(img,{attributes:true,attributeFilter:['src']});

      window.HBNProductEditorPlugin.open(img);
    }

    /* ══ 下載 ══ */
    function insertDownloadBar(){
      var sidebar=document.getElementById('sidebar');
      if(!sidebar||document.getElementById('bn-download-bar'))return;
      var bar=document.createElement('div');bar.id='bn-download-bar';
      bar.innerHTML='<div class="bn-ms-terms-line"><input type="checkbox" id="bn-ms-terms-check" aria-label="我已閱讀並接受蝦皮資產使用條款"><label for="bn-ms-terms-check">我已閱讀並接受 <a href="#ms-terms-modal" id="bn-ms-terms-link">「蝦皮資產使用條款」</a></label></div><button class="bn-dl-btn" id="bn-dl-all">⬇ 下載全部勾選畫版</button><div class="bn-dl-progress" id="bn-dl-progress"></div>';
      /* 加到 sidebar 最底部（sidebar-scroll 下方）*/
      var scroll=document.getElementById('sidebar-scroll');
      if(scroll && scroll.nextSibling) sidebar.insertBefore(bar, scroll.nextSibling);
      else sidebar.appendChild(bar);
      var check=document.getElementById('bn-ms-terms-check'), link=document.getElementById('bn-ms-terms-link'), button=document.getElementById('bn-dl-all');
      function parentTermsAccepted(){ try { return !!(window.parent && typeof window.parent.msAssetTermsAccepted === 'function' ? window.parent.msAssetTermsAccepted() : true); } catch(_) { return true; } }
      function parentTermsOpen(){ try { if(window.parent && typeof window.parent.msOpenAssetTerms === 'function') window.parent.msOpenAssetTerms(); } catch(_) {} }
      function parentTermsSet(value){ try { if(window.parent && typeof window.parent.msSetAssetTermsAccepted === 'function') window.parent.msSetAssetTermsAccepted(!!value); } catch(_) {} }
      function syncTerms(){ var ok=parentTermsAccepted(); check.checked=ok; button.disabled=!ok; }
      check.addEventListener('click',function(e){ if(!parentTermsAccepted()){ e.preventDefault(); parentTermsOpen(); } });
      check.addEventListener('change',function(){ if(!check.checked){ parentTermsSet(false); syncTerms(); } });
      link.addEventListener('click',function(e){ e.preventDefault(); parentTermsOpen(); });
      window.addEventListener('storage',syncTerms);
      button.addEventListener('click',function(e){ if(!parentTermsAccepted()){ e.preventDefault(); parentTermsOpen(); return; } downloadAll(); });
      syncTerms();
    }

    function _bnClone(obj){
      try { return JSON.parse(JSON.stringify(obj)); }
      catch(_) { return obj; }
    }

    function _bnIsUsableColor(v){
      return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim());
    }

    var BN_DEFAULT_CANVAS_BG = '#6bc0ec';
    function _bnIsDefaultCanvasBg(v){ return _bnIsUsableColor(v) && String(v).toLowerCase() === BN_DEFAULT_CANVAS_BG; }
    function _bnIsUserCanvasBg(v){ return _bnIsUsableColor(v) && (window._bnUserCanvasBgLocked || !_bnIsDefaultCanvasBg(v)); }

    function _bnGetAuthoritativeCanvasBg(){
      /* 關鍵：多圖 ZIP 前，以父層 colorState 的目前值為最高優先。
         舊版會先吃 _bnCanvasBgHardLock/_bnPersistentCanvasBg；若它們仍是初始化預設藍，
         就會把使用者吸色後的背景覆蓋回藍色。 */
      if(window.colorState && _bnIsUserCanvasBg(window.colorState.canvasBg)) return window.colorState.canvasBg;
      if(_bnIsUserCanvasBg(window._bnCanvasBgHardLock)) return window._bnCanvasBgHardLock;
      if(_bnIsUserCanvasBg(window._bnPersistentCanvasBg)) return window._bnPersistentCanvasBg;
      if(window._bnLastUserColorState && _bnIsUserCanvasBg(window._bnLastUserColorState.canvasBg)) return window._bnLastUserColorState.canvasBg;
      if(window.colorState && _bnIsUsableColor(window.colorState.canvasBg)) return window.colorState.canvasBg;
      return null;
    }

    function _bnLockCanvasBg(hex){
      if(!_bnIsUsableColor(hex)) return;
      window._bnCanvasBgHardLock = hex;
      window._bnPersistentCanvasBg = hex;
      window._bnUserCanvasBgLocked = true;
      window._bnBgColorExportGuardUntil = Date.now() + 30000;
      if(window.colorState) window.colorState.canvasBg = hex;
      if(window._bnLastUserColorState) window._bnLastUserColorState.canvasBg = hex;
    }

    function _bnRgbToHex(rgb){
      if(!rgb || rgb === 'transparent') return null;
      var m = String(rgb).match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
      if(!m) return null;
      if(m[4] !== undefined && parseFloat(m[4]) === 0) return null;
      function h(n){ n=Math.max(0,Math.min(255,parseInt(n,10)||0)); return n.toString(16).padStart(2,'0'); }
      return '#'+h(m[1])+h(m[2])+h(m[3]);
    }

    function _bnGetLiveCanvasBgColor(){
      var found = null;
      document.querySelectorAll('.preview-block iframe').forEach(function(ifr){
        if(found) return;
        /* 背景色由版位用 bn-layout-metrics 回報（不直接讀 iframe 內容） */
        var m = bnFrameMetrics(ifr);
        var hex = m && _bnRgbToHex(m.bgColor);
        if(hex) found = hex;
      });
      return found;
    }

    function _bnBuildExportColorData(){
      var data = (typeof window.getColorData === 'function')
        ? window.getColorData()
        : (window.colorState ? _bnClone(window.colorState) : null);
      data = data ? _bnClone(data) : {};

      /* 多張 ZIP 匯出時，iframe 可能還沒同步完而回報預設藍。
         因此背景色一律以父層最後一次使用者設定值為最高優先，
         不再讓 iframe 的 live background 反向覆蓋父層狀態。 */
      var authoritativeBg = _bnGetAuthoritativeCanvasBg();
      if(_bnIsUsableColor(authoritativeBg)) data.canvasBg = authoritativeBg;
      else {
        var liveBg = _bnGetLiveCanvasBgColor();
        if(_bnIsUsableColor(liveBg)) data.canvasBg = liveBg;
      }
      return data;
    }

    function _bnFreezeExportColors(colorData){
      if(!colorData) return;
      var frozen = _bnClone(colorData);
      if(_bnIsUsableColor(frozen.canvasBg)) _bnLockCanvasBg(frozen.canvasBg);
      window._bnFrozenColorData = frozen;
      window._bnLastUserColorState = _bnClone(frozen);
      window._bnBgColorExportGuardUntil = Date.now() + 30000;
      if(window.colorState){ try{ Object.assign(window.colorState, frozen); }catch(_){} }
      if(_bnIsUsableColor(window._bnCanvasBgHardLock) && window.colorState) window.colorState.canvasBg = window._bnCanvasBgHardLock;
      if(typeof window.renderColorPickers === 'function') window.renderColorPickers();
      if(typeof window.broadcastColors === 'function') window.broadcastColors();
    }

    /* ── 主工具（BOD A）回收模式 ──
       「下載工單＋圖片＋暫存檔」要把曝光資源的成品一起放進它的 ZIP（活動頁資料夾）。
       走跟「下載全部勾選畫版」完全相同的截圖／KB 壓縮／SearchICON 84x84 流程，
       只是最後不產生 BN_Export.zip，改把 [{name,dataUrl}] 交回 callback。
       回收期間 _bnSilentHostLoading=true，本頁的下載浮層不再把 start／finish 推給父頁，
       否則父頁自己的 ZIP Loading 會被中途收掉。 */
    var _bnCollectCb = null;
    function _bnSettleCollect(err, files, report){
      var cb = _bnCollectCb;
      if(!cb) return false;
      _bnCollectCb = null;
      window._bnSilentHostLoading = false;
      try{ cb(err || null, files || [], report || null); }catch(_){ }
      return true;
    }
    window._bnCollectExportFiles = function(cb){
      if(typeof cb !== 'function') return false;
      if(window._bnDownloadBusy || _bnCollectCb){ cb(new Error('曝光資源正在下載中，請稍後再試')); return false; }
      _bnCollectCb = cb;
      window._bnSilentHostLoading = true;
      try{ downloadAll(); }
      catch(e){ _bnSettleCollect(e); return false; }
      /* downloadAll 可能在前置檢查就同步結束（例如字數超標）；那種情況 _bnSettleCollect 已經被呼叫。 */
      return true;
    };

    function downloadAll(_layoutSynced){
      if(_layoutSynced!==true&&window._bnDownloadBusy)return;
      if(window.parent && typeof window.parent.msRequireAssetTerms === 'function' && !window.parent.msRequireAssetTerms()){
        _bnSettleCollect(new Error('尚未同意蝦皮資產使用條款'));
        return;
      }
      /* 字數硬擋／內容警語未確認：直接擋在 modal，不呼叫 setProgress，
         避免 setProgress 內的 bnUpdateDownloadOverlay 通知外層 BOD A
         顯示「LOADING · 曝光資源下載」浮層。 */
      if(typeof window.bnCanDownload === 'function' && !window.bnCanDownload()){
        var _el=document.getElementById('bn-dl-progress');
        if(_el){ _el.textContent='文字超出字數上限或內容提醒尚未確認，請修改後再下載'; setTimeout(function(){ if(_el) _el.textContent=''; }, 4000); }
        _bnSettleCollect(new Error('曝光資源文字超出字數上限或內容提醒尚未確認'));
        return;
      }

      /* 版位 iframe 是捲到附近才載入：下載前先把還沒載入的勾選版位都載好，再重新進來。 */
      if(typeof window._bnPendingPreviewCount==='function' && window._bnPendingPreviewCount()>0 &&
         typeof window._bnLoadAllPreviews==='function'){
        if(typeof window.bnShowDownloadOverlay==='function') window.bnShowDownloadOverlay('正在載入其他版位，載完就開始下載…');
        window._bnLoadAllPreviews().then(function(){
          /* 剛載入的版位要等一下才收到商品、LOGO、背景等狀態 */
          setTimeout(function(){ downloadAll(_layoutSynced); }, 800);
        });
        return;
      }
      /* 多圖恢復 ZIP：1 張直接 PNG；2 張以上先逐張截圖，最後打包 ZIP。 */
      var iframes=Array.from(document.querySelectorAll('.preview-block iframe'));
      if(!iframes.length){setProgress('沒有版位可下載');_bnSettleCollect(new Error('曝光資源沒有勾選任何版位'));return;}
      window._bnDownloadBusy=true;

      /* 必須在 _bnExporting / _bnSuppressProductLayoutWrite 鎖定前取回最新位置，
         否則最後一次拖曳可能尚未進入 ZIP 內附的暫存 JSON。 */
      if(_layoutSynced !== true && typeof window._bnSyncLayoutSnapshot === 'function'){
        if(typeof window.bnShowDownloadOverlay==='function')window.bnShowDownloadOverlay('正在同步商品旋轉與最新畫布位置…');
        var syncBtn=document.getElementById('bn-dl-all');
        if(syncBtn) syncBtn.disabled=true;
        setProgress('正在同步最新畫布位置…');
        var waitRotation = (typeof window._bnWaitForProductRotations === 'function')
          ? window._bnWaitForProductRotations(12000)
          : Promise.resolve();
        Promise.resolve(waitRotation).then(function(){
          return window._bnSyncLayoutSnapshot(900);
        }).then(function(){
          if(syncBtn) syncBtn.disabled=false;
          downloadAll(true);
        }).catch(function(error){
          if(syncBtn)syncBtn.disabled=false;
          window._bnDownloadBusy=false;
          if(typeof window.bnHideDownloadOverlay==='function')window.bnHideDownloadOverlay();
          setProgress('尚未開始下載：'+String(error&&error.message||'畫布仍在更新，請稍後再試。'));
          _bnSettleCollect(error || new Error('畫布仍在更新，請稍後再試'));
        });
        return;
      }

      /* 下載＋打包暫存檔現在需要一點時間，跟「剛進來時」的畫布/字體載入
         用同一種毛玻璃浮動提示，讓使用者知道還在跑，不要誤以為卡住。 */
      if(typeof window.bnShowDownloadOverlay === 'function'){
        window.bnShowDownloadOverlay(iframes.length > 1 ? '正在截圖並打包成 ZIP，請稍候，不要關閉分頁。' : '正在截圖，請稍候，不要關閉分頁。');
      }

      var btn=document.getElementById('bn-dl-all');
      btn.disabled=true;

      var total=iframes.length;
      var done=0, ok=0, fail=0;
      var failedNames=[];
      var failedReasons=[];
      var exportFinished=false;
      window._bnLastDownloadReport={started:Date.now(),finished:null,layouts:[]};
      var exportReport=window._bnLastDownloadReport;
      var files=[];
      window._bnExporting = true;
      window._bnSuppressProductLayoutWrite = true;
      var _exportUnlockTimer = null;

      /* 下載前先凍結父層目前狀態，避免截圖期間 iframe 收到舊的 ready/autoload
         或重繪訊息，造成背景色/文字色被還原成預設值。 */
      var exportTextData = (typeof window.getTextData === 'function') ? window.getTextData() : null;
      var exportColorData = _bnBuildExportColorData();
      _bnFreezeExportColors(exportColorData);
      var exportLogos = window._bnLogos ? JSON.parse(JSON.stringify(window._bnLogos)) : [];
      var exportProducts = window._bnProducts ? JSON.parse(JSON.stringify(window._bnProducts)) : [];
      var exportZOrder = exportProducts.slice().sort(function(a,b){ return (a.zOrder||0)-(b.zOrder||0); }).map(function(p){ return p.id; });

      setProgress(total===1 ? '準備下載 1 個版位…' : '準備打包 '+total+' 個版位…');

      function sendToIframe(iframeEl, msg){ return sendFrameMessage(iframeEl, msg); }

      function syncIframeForExport(iframeEl, cb){
        if(!iframeEl){ cb && cb(); return; }
        var id = getIfrBnidForExport(iframeEl);
        if(exportTextData) sendToIframe(iframeEl, {type:'bn-text', data:exportTextData});
        if(exportColorData) sendToIframe(iframeEl, {type:'bn-color', data:(window._bnFrozenColorData || exportColorData)});
        if(exportLogos && exportLogos.length) sendToIframe(iframeEl, {type:'bn-logos', logos:exportLogos,
          logoLayoutById:window._bnLogoLayouts || {}});

        exportProducts.forEach(function(p, idx){
          sendToIframe(iframeEl, {
            type:'bn-product-add', preserveExistingLayout:true,
            id:p.id, src:p.src, baseSrc:p.baseSrc||(p.meta&&p.meta.baseSrc), ratio:p.ratio, name:p.name, rotate:(p.meta&&p.meta.rotate)||0,
            index:idx, sizeScale:p.sizeScale||1, position:p.position||0, zOrder:p.zOrder||0,
            layoutById:p.layouts||null, layout:p.layout||null, productRect:p.meta&&p.meta.productRect
          });
        });
        if(exportZOrder.length) sendToIframe(iframeEl, {type:'bn-product-zorder', order:exportZOrder});

        /* 商品的 preserveExistingLayout 讓 runtime 直接保留已顯示的商品節點，
           只有缺漏商品才補建。不能為了下載刪掉重建，因為 saved layout 的
           CTA／窄版連動邊界會重新 clamp 手動位置，導致三件商品擠在一起。 */
        /* ★ 人物圖也要重新同步給這個 iframe，跟商品/LOGO/文案一樣——之前這裡完全
           沒有送 bn-character-*，下載時商品又是整批用 bn-product-add 重新建立
           （每次都是全新的 DOM 節點，不會留著先前 bn-character-visibility 隱藏
           的 display:none 狀態），等於下載那一刻人物圖的「商品最多顯示幾件」
           限制完全失效，導致例如「1張人物→應該只顯示2件商品」，下載出來卻
           變成3件全開。這裡照著 broadcastCharacter/broadcastCharacterVisibility/
           broadcastCharacterPairOrder 同一套規則，改成只發給這個 iframe。 */
        ['_bnCharacter','_bnCharacter2'].forEach(function(slotKey){
          var slot = window[slotKey];
          if(slot){
            sendToIframe(iframeEl, {type:'bn-character-add', slot:slotKey, id:slot.id, src:slot.src,
              ratio:slot.ratio, layoutById:slot.layouts||null, aboveMain: slot.aboveMain !== false});
          } else {
            sendToIframe(iframeEl, {type:'bn-character-remove', slot:slotKey});
          }
        });
        var exportZSorted = exportProducts.slice().sort(function(a,b){ return (a.zOrder||0)-(b.zOrder||0); });
        var exportMaxVisible = getMaxProductsVisible();
        var exportVisibleIds = exportZSorted.slice(0, exportMaxVisible).map(function(p){ return p.id; });
        sendToIframe(iframeEl, {type:'bn-character-visibility', hasChar: productLimitActive(),
          maxVisible:exportMaxVisible, visibleIds:exportVisibleIds,
          topId: exportVisibleIds.length ? exportVisibleIds[0] : null});
        /* 代言人照／簽名檔／小字：跟人物圖一樣在下載前補送給這個 iframe（放在可見度之後，
           沒有存過位置時才會依「還顯示著的商品」決定預設擺放側）。 */
        sendEndorserStateTo(function(msg){ sendToIframe(iframeEl, msg); }, true);
        var exportActiveCharKeys = ['_bnCharacter','_bnCharacter2'].filter(function(k){ return window[k]; });
        var exportPairFirst = null;
        if(exportActiveCharKeys.length === 2){
          exportPairFirst = (window._bnCharPairFirst && exportActiveCharKeys.indexOf(window._bnCharPairFirst) !== -1)
            ? window._bnCharPairFirst : exportActiveCharKeys[0];
        }
        sendToIframe(iframeEl, {type:'bn-character-pair-order', pairFirst: exportPairFirst});

        /* 背景圖精準同步到目標 iframe。不要用全域刷新，避免下載某一張時
           把其他尚未 ready 的 iframe 背景/底色送成空值。 */
        if(typeof window._bnSendBgToIframe === 'function' && id){
          window._bnSendBgToIframe(iframeEl, id);
        } else if(typeof window._bnRefreshCanvasBackgrounds === 'function') {
          window._bnRefreshCanvasBackgrounds();
        }

        /* 給 iframe 一點時間套用 style / 圖片 / 背景後再截圖。 */
        waitForNoShadowFrameMessages(iframeEl).then(function(){ setTimeout(function(){ cb && cb(); }, 260); });
      }

      function resyncAllAfterExport(){
        document.querySelectorAll('.preview-block iframe').forEach(function(iframeEl){
          var id = getIfrBnidForExport(iframeEl);
          if(exportTextData) sendToIframe(iframeEl, {type:'bn-text', data:exportTextData});
          if(exportColorData) sendToIframe(iframeEl, {type:'bn-color', data:(window._bnFrozenColorData || exportColorData)});
          if(exportLogos && exportLogos.length) sendToIframe(iframeEl, {type:'bn-logos', logos:exportLogos,
            logoLayoutById:window._bnLogoLayouts || {}});
          if(typeof window._bnSendBgToIframe === 'function' && id) window._bnSendBgToIframe(iframeEl, id);
        });
      }

      function getIfrBnidForExport(ifrEl){
        try{
          var qs = (ifrEl.src||'').split('?')[1]||'';
          var id = new URLSearchParams(qs).get('bnid');
          if(id) return String(id);
        }catch(_){ }
        return null;
      }

      function safeName(name){
        return String(name||'layout').trim().replace(/[\/\\:*?"<>|]/g,'_') || 'layout';
      }

      /* JSZip 改由 js/vendor/browser-loader.js 從 cdnjs 載入（版本寫死、附 integrity），
         TP 不允許把函式庫放進包內。 */
      function loadJSZip(cb){
        if(window.JSZip){cb();return;}
        if(!window.BodaVendor){cb(new Error('函式庫載入元件未載入，請確認 js/vendor/browser-loader.js 已一起更新'));return;}
        window.BodaVendor.ensure('jszip').then(function(){
          cb(window.JSZip?null:new Error('JSZip 未正確載入'));
        },function(err){cb(err);});
      }

      function dataUrlToBase64(dataUrl){
        return String(dataUrl||'').split(',')[1] || '';
      }

      /* 下載 JPG KB 限制：依版位名稱自動套用目標大小。
         依現有流程優先調整 JPEG 品質；Coin Page 若仍超過硬上限，才逐步縮圖。 */
      var BN_DOWNLOAD_KB_LIMITS = [
        {keys:['coin_pagebn','coinpagebn'], kb:244, keepSize:false, mustMeetLimit:true},
        {keys:['dd card','ddcard','dd card','dd-card'], kb:245, keepSize:true},
        {keys:['hbn'], kb:145, keepSize:true},
        {keys:['fb','facebook'], kb:450, keepSize:true},
        {keys:['ig','instagram'], kb:450, keepSize:true},
        {keys:['scbn'], kb:60, keepSize:true},
        {keys:['sba'], kb:200, keepSize:true}
      ];

      function getDownloadLimitItemByName(name){
        var n = String(name||'').toLowerCase().replace(/\s+/g,'');
        for(var i=0;i<BN_DOWNLOAD_KB_LIMITS.length;i++){
          var item = BN_DOWNLOAD_KB_LIMITS[i];
          for(var j=0;j<item.keys.length;j++){
            var k = String(item.keys[j]).toLowerCase().replace(/\s+/g,'');
            if(k && n.indexOf(k) !== -1) return item;
          }
        }
        return null;
      }

      function getDownloadKbLimitByName(name){
        var item = getDownloadLimitItemByName(name);
        return item ? item.kb : null;
      }

      function dataUrlByteSize(dataUrl){
        var b64 = String(dataUrl||'').split(',')[1] || '';
        if(!b64) return 0;
        var pad = (b64.slice(-2)==='==' ? 2 : (b64.slice(-1)==='=' ? 1 : 0));
        return Math.max(0, Math.floor(b64.length * 3 / 4) - pad);
      }

      function canvasToJpegDataUrl(canvas, quality){
        try{ return canvas.toDataURL('image/jpeg', Math.max(0.05, Math.min(0.98, quality))); }catch(_){ return null; }
      }

      /* 把截圖縮成固定的正方形尺寸（例如 84x84），給 SearchICON 系列版位
         同時輸出 120x120（原尺寸）與 84x84 兩種尺寸使用。 */
      function resizeDataUrlSquare(dataUrl, size, cb){
        var img = new Image();
        img.onload = function(){
          try{
            var c = document.createElement('canvas');
            c.width = size; c.height = size;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0,0,size,size);
            ctx.drawImage(img, 0, 0, size, size);
            cb(c.toDataURL('image/png'));
          }catch(e){ cb(null); }
        };
        img.onerror = function(){ cb(null); };
        img.src = dataUrl;
      }

      /* ★ 選擇性壓縮（2026-08）：
         layers = {bgUrl, fgUrl}（由 iframe 分層截圖提供，可能為空）。
         策略：先只處理背景層（照片最吃體積），商品圖/logo/文字維持
         原始像素尺寸；只有在原始尺寸、高品質 JPEG 仍塞不進目標 KB 時，
         才逐步降低背景層解析度，最後才退回整張一起壓。
         → 小幅超標時不會先把整張畫布縮小，降低預覽與下載的解析度落差。

         改進（2026-10）：
         - 品質梯度更細致，以線性插值預測逼近目標 KB
         - 背景層品質可降至 0.75，前景保持高質量
      */
      /* JPEG 品質下限：0.75 起，低於這個值畫面會有明顯色塊／馬賽克，寧可小幅超標也不要壓過頭。
         所有版位統一使用，只有 KB 上限與 keepSize 差異。 */
      var BN_JPEG_MIN_QUALITY = 0.75;
      /* 分層壓縮時背景最多軟化到幾成；再低背景就糊得太明顯。 */
      var BN_BG_MIN_SCALE = 0.55;

      /* 用 2 個數據點做線性預測，找出逼近目標 KB 的品質值。 */
      function predictQualityByLinear(point1, point2, targetBytes){
        var q1 = point1.q, s1 = point1.size;
        var q2 = point2.q, s2 = point2.size;
        if(s1 === s2) return (q1 + q2) / 2;
        /* 線性插值：(q - q1) / (q2 - q1) = (targetBytes - s1) / (s2 - s1) */
        var predictQ = q1 + (targetBytes - s1) * (q2 - q1) / (s2 - s1);
        return Math.max(0.1, Math.min(0.99, predictQ));
      }

      function compressSelectiveBgFirst(layers, targetKb, cb){
        var maxBytes = targetKb * 1024;
        var bgImg = new Image(), fgImg = new Image();
        var loaded = 0, failed = false;
        function onFail(){ if(!failed){ failed = true; cb(null); } }
        function onLoad(){
          if(failed || ++loaded < 2) return;
          try{
            var W = bgImg.naturalWidth, H = bgImg.naturalHeight;
            if(!W || !H || fgImg.naturalWidth !== W || fgImg.naturalHeight !== H){ cb(null); return; }
            var BG_SCALES = [1, 0.95, 0.9, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.3]
              .filter(function(s){ return s >= BN_BG_MIN_SCALE; });
            /* 更細致的品質梯度：背景層可降至 0.75，步長 0.02 */
            var QUALITY_STEPS = [];
            for(var q = 0.98; q >= 0.75; q -= 0.02) QUALITY_STEPS.push(Math.round(q * 100) / 100);

            for(var i = 0; i < BG_SCALES.length; i++){
              var sc = BG_SCALES[i];
              var c = document.createElement('canvas');
              c.width = W; c.height = H;
              var ctx = c.getContext('2d');
              ctx.fillStyle = '#fff';
              ctx.fillRect(0, 0, W, H);
              if(sc < 1){
                /* 背景先縮小再放大 = 去掉高頻細節，JPEG 體積大降，視覺只是稍微變軟 */
                var tw = Math.max(1, Math.round(W * sc)), th = Math.max(1, Math.round(H * sc));
                var tmp = document.createElement('canvas');
                tmp.width = tw; tmp.height = th;
                tmp.getContext('2d').drawImage(bgImg, 0, 0, tw, th);
                ctx.imageSmoothingEnabled = true;
                ctx.drawImage(tmp, 0, 0, W, H);
              }else{
                ctx.drawImage(bgImg, 0, 0);
              }
              ctx.drawImage(fgImg, 0, 0); /* 前景原解析度疊上 */

              /* 用線性插值逼近目標 */
              var samplePoints = [];
              for(var q = 0; q < QUALITY_STEPS.length; q++){
                var out = canvasToJpegDataUrl(c, QUALITY_STEPS[q]);
                if(!out) continue;
                var size = dataUrlByteSize(out);
                if(size <= maxBytes){ cb(out, true); return; }
                samplePoints.push({q: QUALITY_STEPS[q], size: size, out: out});
                if(samplePoints.length >= 2){
                  var predictQ = predictQualityByLinear(samplePoints[samplePoints.length - 2], samplePoints[samplePoints.length - 1], maxBytes);
                  var predictOut = canvasToJpegDataUrl(c, predictQ);
                  if(predictOut && dataUrlByteSize(predictOut) <= maxBytes){ cb(predictOut, true); return; }
                }
              }
            }
            cb(null, false); /* 背景壓到底仍超標 → 交回整張壓縮 */
          }catch(e){ cb(null); }
        }
        bgImg.onload = onLoad; bgImg.onerror = onFail;
        fgImg.onload = onLoad; fgImg.onerror = onFail;
        bgImg.src = layers.bgUrl; fgImg.src = layers.fgUrl;
      }

      function compressDataUrlToTargetKb(dataUrl, targetKb, cb, layers, opts){
        targetKb = parseInt(targetKb,10) || 0;
        if(!targetKb || !dataUrl){ cb(dataUrl); return; }
        var maxBytes = targetKb * 1024;
        var keepSize = !!(opts && opts.keepSize);

        /* 原始 PNG 已經符合容量時，完全保留原始輸出，不重新編碼成 JPG。 */
        if(dataUrlByteSize(dataUrl) <= maxBytes){ cb(dataUrl, false); return; }

        if(layers && layers.bgUrl && layers.fgUrl){
          compressSelectiveBgFirst(layers, targetKb, function(selUrl, selCompressed){
            if(selUrl){ cb(selUrl, !!selCompressed); return; }
            compressDataUrlToTargetKb(dataUrl, targetKb, cb, null, opts); /* 退回整張壓縮 */
          });
          return;
        }
        var img = new Image();
        img.onload = function(){
          try{
            var srcW = img.naturalWidth || img.width;
            var srcH = img.naturalHeight || img.height;
            var scale = 1;
            var best = null;

            function drawCanvas(){
              var c = document.createElement('canvas');
              c.width = Math.max(1, Math.round(srcW * scale));
              c.height = Math.max(1, Math.round(srcH * scale));
              var ctx = c.getContext('2d');
              /* JPG 沒有透明度，先補白底避免透明區轉黑。 */
              ctx.fillStyle = '#fff';
              ctx.fillRect(0,0,c.width,c.height);
              ctx.drawImage(img,0,0,c.width,c.height);
              return c;
            }

            function tryQuality(canvas){
              /* 所有版位統一品質下限 0.75 */
              var minQ = BN_JPEG_MIN_QUALITY;
              var low = minQ, high = 0.95;
              var samplePoints = [];
              var localBest = null;

              /* 先試下限 */
              var lowOut = canvasToJpegDataUrl(canvas, low);
              if(lowOut){
                var lowSize = dataUrlByteSize(lowOut);
                if(lowSize <= maxBytes){ best = lowOut; return lowOut; }
                samplePoints.push({q: low, size: lowSize, out: lowOut});
              }

              /* 二分搜尋 + 線性插值預測 */
              for(var i = 0; i < 9; i++){
                var q = (low + high) / 2;
                var out = canvasToJpegDataUrl(canvas, q);
                if(!out){ high = q; continue; }
                var size = dataUrlByteSize(out);
                samplePoints.push({q: q, size: size, out: out});

                if(size <= maxBytes){
                  best = out;
                  localBest = out;
                  low = q;
                  /* 收集了 2+ 個點後，用線性插值預測逼近目標 */
                  if(samplePoints.length >= 2){
                    var idx1 = samplePoints.length - 2, idx2 = samplePoints.length - 1;
                    var predictQ = predictQualityByLinear(samplePoints[idx1], samplePoints[idx2], maxBytes);
                    var predictOut = canvasToJpegDataUrl(canvas, predictQ);
                    if(predictOut){
                      var predictSize = dataUrlByteSize(predictOut);
                      if(predictSize <= maxBytes && predictSize > (localBest ? dataUrlByteSize(localBest) : 0)){
                        best = predictOut;
                        localBest = predictOut;
                      }
                    }
                  }
                }else{
                  high = q;
                }
              }
              return localBest;
            }

            /* 品質不夠時才縮尺寸；每次只降 5%，避免原本 10% 一跳造成
               下載圖尺寸與編輯畫布出現明顯落差。
               keepSize（例如 SBA）：完全不縮圖，只跑一次品質搜尋，維持原始畫素尺寸。 */
            var maxSteps = keepSize ? 1 : 25;
            for(var step=0; step<maxSteps; step++){
              var canvas = drawCanvas();
              var out = tryQuality(canvas);
              if(out && dataUrlByteSize(out) <= maxBytes){ cb(out, true); return; }
              if(!keepSize) scale *= 0.95;
            }

            /* 一般版位到品質下限仍超標時沿用原有回退；Coin Page 有硬上限，
               會再逐步縮圖直到達標，絕不以超標圖片完成下載。 */
            var fallback = best || canvasToJpegDataUrl(drawCanvas(), BN_JPEG_MIN_QUALITY);
            if(opts && opts.mustMeetLimit && (!fallback || dataUrlByteSize(fallback) > maxBytes)){
              for(var hardStep=0; hardStep<240; hardStep++){
                scale *= 0.9;
                var hardW = Math.max(1, Math.round(srcW * scale));
                var hardH = Math.max(1, Math.round(srcH * scale));
                var hardCanvas = drawCanvas();
                var hardOut = canvasToJpegDataUrl(hardCanvas, BN_JPEG_MIN_QUALITY);
                if(hardOut && dataUrlByteSize(hardOut) <= maxBytes){ cb(hardOut, true); return; }
                if(hardW === 1 && hardH === 1) break;
              }
              cb(null, false);
              return;
            }
            cb(fallback || dataUrl, !!fallback);
          }catch(e){ cb(dataUrl, false); }
        };
        img.onerror = function(){ cb(dataUrl, false); };
        img.src = dataUrl;
      }

      function finishExport(){
        if(exportFinished)return;exportFinished=true;
        try{
          var safeColorData=window._bnFrozenColorData||exportColorData;
          if(safeColorData&&window.colorState){
            Object.assign(window.colorState,safeColorData);
            if(_bnIsUsableColor(window._bnCanvasBgHardLock))window.colorState.canvasBg=window._bnCanvasBgHardLock;
            window._bnLastUserColorState=_bnClone(window.colorState);
            window._bnPersistentCanvasBg=window.colorState.canvasBg;
            if(typeof window.renderColorPickers==='function')window.renderColorPickers();
          }
        }catch(err){console.warn('[bn-export] cleanup',err);}
        finally{
          window._bnBgColorExportGuardUntil=Date.now();
          window._bnExporting=false;window._bnSuppressProductLayoutWrite=false;window._bnDownloadBusy=false;
          delete window._bnFrozenColorData;
          clearTimeout(_exportUnlockTimer);
          if(btn)btn.disabled=false;
          window._bnLastDownloadReport.finished=Date.now();
          window._bnLastDownloadReport.success=ok;
          window._bnLastDownloadReport.failed=fail;
          if(typeof window.bnHideDownloadOverlay==='function')window.bnHideDownloadOverlay();
          try{document.dispatchEvent(new CustomEvent('bn-state-dirty'));}catch(_){}
        }
      }

      function makeZip(){
        /* 回收模式：不做 ZIP，把截好的檔案交回主工具。 */
        if(_bnCollectCb){
          btn.disabled=false;
          finishExport();
          var collectReport={ ok:ok, fail:fail, total:total, failedNames:failedNames.slice(), failedReasons:failedReasons.slice() };
          if(!files.length){
            setProgress('沒有版位截圖成功：'+failedNames.join('、'));
            _bnSettleCollect(new Error('沒有任何版位截圖成功（'+(failedReasons[0]||'截圖未完成')+'）'), [], collectReport);
          }else{
            setProgress('已交給主工具打包：成功 '+ok+' / '+total+(fail?'，失敗 '+fail+' 個已跳過（'+failedNames.join('、')+'）':''));
            _bnSettleCollect(null, files, collectReport);
          }
          return;
        }
        if(total===1){
          btn.disabled=false;
          finishExport();
          if(ok){setTimeout(function(){if(window._bnLastDownloadReport===exportReport)setProgress('');},2500);}
          else { setProgress('下載失敗：'+(failedNames[0]||'')+'（'+(failedReasons[0]||'版位截圖未完成，請重試')+'）'); }
          return;
        }

        if(!files.length){
          btn.disabled=false;
          finishExport();
          setProgress('ZIP 未產生：'+failedNames.join('、')+'（'+(failedReasons[0]||'截圖未完成，請重試')+'）');
          return;
        }

        setProgress('正在產生 ZIP（成功 '+ok+'，失敗 '+fail+'）…');

        loadJSZip(function(err){
          if(err || !window.JSZip){
            btn.disabled=false;
            finishExport();
            setProgress('ZIP 失敗：'+(err&&err.message||'JSZip 載入失敗'));
            return;
          }

          try{
            var zip=new JSZip();
            files.forEach(function(f){
              zip.file(f.name, dataUrlToBase64(f.dataUrl), {base64:true});
            });
            /* 把暫存檔（可以重新上傳、繼續編輯用的工單 JSON）一起打包進 ZIP，
               檔名固定叫「原始檔編輯」，跟下載的圖片放在同一包，
               不用另外再按一次「下載暫存」。 */
            try{
              var stateSnapshot = (window._bnStatePlugin && typeof window._bnStatePlugin.collect === 'function')
                ? window._bnStatePlugin.collect() : null;
              if(stateSnapshot){
                zip.file('原始檔編輯.json', JSON.stringify(stateSnapshot, null, 2));
              }
            }catch(_stateErr){
              /* 暫存檔打包失敗不應該擋下圖片本身的下載，忽略即可。 */
            }
            zip.generateAsync({type:'blob'}).then(function(blob){
              triggerBlobDownload(blob,'BN_Export.zip');
              btn.disabled=false;
              finishExport();
              setProgress('ZIP下載完成：成功 '+ok+' / '+total
                +(fail ? '，失敗 '+fail+' 個已跳過（'+failedNames.join('、')+'）' : ''));
            }).catch(function(){
              btn.disabled=false;
              finishExport();
              setProgress('ZIP 產生失敗');
            });
          }catch(e){
            btn.disabled=false;
            finishExport();
            setProgress('ZIP 產生失敗：'+e.message);
          }
        });
      }

      function captureOne(iframeEl,fileName,cb,wantLayers){
        var msgId='dl_'+Date.now()+'_'+Math.random().toString(36).slice(2);
        var settled=false,timer,started=Date.now();
        function settle(res){
          if(settled)return;settled=true;clearTimeout(timer);window.removeEventListener('message',onMsg);
          var result=res||{dataUrl:null,error:{code:'NO_SNAPSHOT',message:'版位沒有回傳截圖，請重新整理後再試。'}};
          window._bnLastDownloadReport.layouts.push({file:fileName,layers:!!wantLayers,elapsed:Date.now()-started,error:result.error||null,report:result.report||null});
          try{cb(result);}catch(err){
            finishExport();setProgress('下載失敗：'+fileName+'（'+String(err.message||err)+'）');
          }
        }
        function onMsg(event){
          if(event.source!==iframeEl.contentWindow||!event.data||event.data.msgId!==msgId)return;
          if(event.data.type==='bn-capture-progress'){
            setProgress('處理 '+fileName.replace(/\.png$/i,'')+'：'+(event.data.message||'正在截圖…'));return;
          }
          if(event.data.type==='bn-snapshot')settle(event.data);
        }
        window.addEventListener('message',onMsg);
        timer=setTimeout(function(){
          try{iframeEl.contentWindow.postMessage({type:'bn-capture-cancel',msgId:msgId},'*');}catch(_){}
          settle({dataUrl:null,error:{code:'IFRAME_TIMEOUT',message:'版位沒有在期限內回應；已取消本次截圖，可重新下載。'}});
        },50000);
        try{iframeEl.contentWindow.postMessage({type:'bn-capture',msgId:msgId,layers:!!wantLayers},'*');}
        catch(error){settle({dataUrl:null,error:{code:'IFRAME_ACCESS',message:'無法連接版位，請重新整理後再試。'}});}
      }

      function next(idx){
        if(idx>=total){
          makeZip();
          return;
        }

        var iframe=iframes[idx];
        var blockEl=iframe.closest('.preview-block');
        var baseName=safeName(blockEl ? ((blockEl.querySelector('.pname')||{}).textContent||'layout') : 'layout');

        var isSearchIcon0 = /SearchICON/i.test(iframe.src || '');
        var limitItem0 = isSearchIcon0 ? null : getDownloadLimitItemByName(baseName);
        var kbLimit0 = limitItem0 ? limitItem0.kb : null;
        var keepSize0 = !!(limitItem0 && limitItem0.keepSize);
        var mustMeetLimit0 = !!(limitItem0 && limitItem0.mustMeetLimit);
        syncIframeForExport(iframe, function(){
          captureOne(iframe, baseName+'.png', function(res){
            var dataUrl = res && res.dataUrl || null;
            done++;

            function afterCompress(outUrl, outName){
              if(outUrl){
                ok++;
                if(total===1 && !_bnCollectCb){
                  triggerDownload(outUrl, outName);
                }else{
                  files.push({name:outName, dataUrl:outUrl});
                }
              }else{
                fail++;
                failedNames.push(baseName);
                failedReasons.push(res&&res.error&&res.error.message||'截圖未完成，請重新下載');
              }

              if(total===1){
                setProgress(outUrl ? '已下載 1 / 1' : '下載失敗：'+baseName+'（'+(failedReasons[failedReasons.length-1]||'截圖未完成')+'）');
              }else{
                setProgress('打包中 '+done+' / '+total+'（成功 '+ok+'，失敗 '+fail+'）'
                  + (failedNames.length ? '　失敗清單：'+failedNames.join('、') : ''));
              }

              /* 稍微讓瀏覽器釋放資源，避免連續截圖卡住 */
              setTimeout(function(){ next(idx+1); },250);
            }

            if(dataUrl){
              var isSearchIcon = isSearchIcon0;
              var kbLimit = kbLimit0;
              var outName = baseName + '.png';

              function afterMainReady(mainUrl, mainName){
                if(!isSearchIcon){ afterCompress(mainUrl, mainName); return; }
                /* SearchICON 系列：不壓縮，維持原畫質；84x84 也是單純縮放，不額外壓縮 */
                resizeDataUrlSquare(dataUrl, 84, function(resized84){
                  if(resized84){
                    var name84 = baseName + '_84x84.png';
                    if(total===1 && !_bnCollectCb){ triggerDownload(resized84, name84); }
                    else { files.push({name:name84, dataUrl:resized84}); }
                  }
                  afterCompress(mainUrl, mainName);
                });
              }

              if(kbLimit){
                var sourceBytes = dataUrlByteSize(dataUrl);
                if(sourceBytes <= kbLimit * 1024){
                  /* 未超過 KB：維持原始 PNG 與原始畫素，不做任何重新編碼。 */
                  afterMainReady(dataUrl, baseName + '.png');
                  return;
                }
                setProgress('壓縮 '+baseName+' 至 '+kbLimit+'KB 以下…');
                compressDataUrlToTargetKb(dataUrl, kbLimit, function(jpgUrl, didCompress){
                  afterMainReady(jpgUrl, baseName + (didCompress ? '.jpg' : '.png'));
                }, {bgUrl: res && res.bgUrl, fgUrl: res && res.fgUrl},
                  {keepSize: keepSize0, mustMeetLimit: mustMeetLimit0});
              }else{
                afterMainReady(dataUrl, outName);
              }
            }else{
              afterCompress(null, baseName+'.png');
            }
          }, !!kbLimit0);
        });
      }

      next(0);
    }
    function setProgress(msg){
      var el=document.getElementById('bn-dl-progress');
      if(el)el.textContent=msg;
      if(typeof window.bnUpdateDownloadOverlay === 'function'){
        var m = /(\d+)\s*\/\s*(\d+)/.exec(msg||'');
        window.bnUpdateDownloadOverlay(msg, m?parseInt(m[1],10):0, m?parseInt(m[2],10):0);
      }
    }
    function triggerDownload(dataUrl,filename){var a=document.createElement('a');a.href=dataUrl;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();},1000);}
    function triggerBlobDownload(blob,filename){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);}

    /* ── iframe ready 推送 ── */
    var origOnReady=window._bnOnIframeReady;
    window._bnOnIframeReady=function(id){
      if(origOnReady)origOnReady(id);
      /* iframe ready 只補送素材，不重新判斷版位；避免覆蓋使用者手動勾選。 */
      setTimeout(function(){
        if(window._bnCampaignCardAssets){
          broadcastTo(id,{type:'bn-campaign-card-assets',assets:window._bnCampaignCardAssets});
        }
        if(window._bnLogos&&window._bnLogos.length){
          broadcastTo(id,{type:'bn-logos',logos:window._bnLogos,
            logoLayoutById:window._bnLogoLayouts || {}});
        } else if(window._bnLogoDataUrl){
          broadcastTo(id,{type:'bn-logo',dataUrl:window._bnLogoDataUrl});
        }
        /* 先送 product-add，再送 zorder */
        window._bnProducts.forEach(function(p,idx){broadcastTo(id,{type:'bn-product-add',id:p.id,src:p.src,ratio:p.ratio,name:p.name,index:idx,sizeScale:p.sizeScale,position:p.position||0,zOrder:p.zOrder||0,layoutById:p.layouts||null,layout:p.layout||null,rotate:(p.meta&&p.meta.rotate)||0,productRect:p.meta&&p.meta.productRect});});
        setTimeout(function(){
          var order=window._bnProducts.slice().sort(function(a,b){return (a.zOrder||0)-(b.zOrder||0);}).map(function(p){return p.id;});
          broadcastTo(id,{type:'bn-product-zorder',order:order});
        },100);
        /* 人物圖：新 iframe 就緒後也要補送，否則新開的版位預覽會看不到人物圖 */
        ['_bnCharacter','_bnCharacter2'].forEach(function(slotKey){
          var slot = window[slotKey];
          if(slot){
            broadcastTo(id,{type:'bn-character-add', slot:slotKey, id:slot.id, src:slot.src,
              ratio:slot.ratio, layoutById:slot.layouts||null,
              aboveMain: slot.aboveMain !== false});
          }
        });
        var zSortedReady = window._bnProducts.slice().sort(function(a,b){return (a.zOrder||0)-(b.zOrder||0);});
        var maxVisibleReady = getMaxProductsVisible();
        var visibleIdsReady = zSortedReady.slice(0, maxVisibleReady).map(function(p){return p.id;});
        broadcastTo(id, {type:'bn-character-visibility', hasChar: productLimitActive(),
          maxVisible: maxVisibleReady, visibleIds: visibleIdsReady,
          topId: visibleIdsReady.length ? visibleIdsReady[0] : null});
        /* 代言人：新 iframe 就緒後也要補送；先把已編輯的大小／位置補進這個 BN。 */
        hydrateEndorserLayoutForReadyFrame(id);
        sendEndorserStateTo(function(msg){ broadcastTo(id, msg); }, false);
        requestEndorserMigrationIfNeeded(id);
        /* 兩個人物的前後順序也要補送給新就緒的 iframe */
        var activeCharKeysReady = ['_bnCharacter','_bnCharacter2'].filter(function(k){ return window[k]; });
        var pairFirstReady = null;
        if(activeCharKeysReady.length === 2){
          pairFirstReady = (window._bnCharPairFirst && activeCharKeysReady.indexOf(window._bnCharPairFirst) !== -1)
            ? window._bnCharPairFirst : activeCharKeysReady[0];
        }
        broadcastTo(id, {type:'bn-character-pair-order', pairFirst: pairFirstReady});
      },200);
    };

    /* ── init ── */
    function init(){
      if(document.getElementById('sidebar-scroll')){insertLogoUI();insertProductUI();insertDownloadBar();}
      else setTimeout(init,200);
    }
    init();

    /* 暴露給 bn-state-plugin 使用 */
    window._bnRenderLogoList = function(){ renderLogoList(); };
    window._bnBroadcastLogos = function(){
      /* 還原／廣播狀態時保留已儲存或使用者手動調整的版位選擇。 */
      if(window._bnLogos && window._bnLogos.length){
        broadcast({type:'bn-logos', logos:window._bnLogos,
          logoLayoutById:window._bnLogoLayouts || {}});
      }
    };
    window._bnSyncLogoLayoutSelection = syncLogoLayoutSelection;
    window._bnRenderProdList = function(){ renderProdList(); };
    window._bnRequestProductLayouts = requestProductLayouts;
    window._bnSyncLayoutSnapshot = syncLayoutSnapshot;
    window._bnApplyWorkorderAssets = function(payload){
      var signature = workorderAssetSignature(payload);
      /* 不能只看上一筆訊息的簽章：使用者可能先清空 LOGO／商品圖，
         再匯入同一份試算表與圖片。此時訊息內容相同，但畫面狀態已不同，
         必須重新建回素材；只有目前狀態真的一致時才略過。 */
      var sameSignature = signature === _bnWorkorderAssetSignature;
      var logoStateSame = !payload || payload.replaceLogos !== true ||
        workorderAssetStateMatches(window._bnLogos, payload.logos, 'logo');
      var productStateSame = !payload || payload.replaceProducts !== true ||
        workorderAssetStateMatches(window._bnProducts, payload.products, 'product');
      var endorserStateSame = !endorserWorkorderNeedsApply(payload) && !endorserWorkorderNoteNeedsApply(payload);
      var campaignCardStateSame = workorderCampaignCardStateSignature(window._bnCampaignCardAssets) ===
        workorderCampaignCardStateSignature(payload && payload.campaignCard);
      if(sameSignature && logoStateSame && productStateSame && endorserStateSame && campaignCardStateSame) return Promise.resolve(false);
      _bnWorkorderAssetSignature = signature;
      return applyBodaWorkorderAssets(payload);
    };
    window._bnRebroadcastProducts = function(){
      var ids = (window._bnProducts||[]).map(function(p){ return p.id; });
      ids.forEach(function(id){ broadcast({type:'bn-product-remove', id:id}); });
      var reordered = (window._bnProducts||[]).slice().sort(function(a,b){
        return (a.position||0)-(b.position||0);
      });
      setTimeout(function(){
        reordered.forEach(function(p, idx){
          broadcast({type:'bn-product-add', id:p.id, src:p.src, ratio:p.ratio, rotate:(p.meta&&p.meta.rotate)||0,
            name:p.name, index:idx, sizeScale:p.sizeScale||1,
            position:p.position||0, zOrder:p.zOrder||0, layoutById:p.layouts||null, layout:p.layout||null, productRect:p.meta&&p.meta.productRect});
        });
        /* z-index */
        var order = (window._bnProducts||[]).slice().sort(function(a,b){
          return (a.zOrder||0)-(b.zOrder||0);
        }).map(function(p){ return p.id; });
        setTimeout(function(){ broadcast({type:'bn-product-zorder', order:order}); }, 100);
      }, 60);
    };
    /* jbpbn.html 可能在外層訊息先到時尚未完成外掛載入，補套用最後一筆暫存訊息。 */
    if(window._bnPendingWorkorderAssets){
      var pendingWorkorderAssets = window._bnPendingWorkorderAssets;
      var pendingWorkorderAssetsMessageId = window._bnPendingWorkorderAssetsMessageId || '';
      delete window._bnPendingWorkorderAssets;
      delete window._bnPendingWorkorderAssetsMessageId;
      setTimeout(function(){
        Promise.resolve(window._bnApplyWorkorderAssets(pendingWorkorderAssets)).then(function(applied){
          if(window._bnAckWorkorderOverviewAssets) window._bnAckWorkorderOverviewAssets(pendingWorkorderAssetsMessageId, true, applied);
        })['catch'](function(err){
          console.warn('工單曝光資源暫存素材訊息處理失敗', err);
          if(window._bnAckWorkorderOverviewAssets) window._bnAckWorkorderOverviewAssets(pendingWorkorderAssetsMessageId, false, false, err && (err.message || err));
        });
      }, 0);
    }
  });
})();
