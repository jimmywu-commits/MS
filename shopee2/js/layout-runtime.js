/*!
 * layout-runtime.js
 * 所有排版版位共用的執行邏輯
 * 由各版位 HTML 載入：<script src="../js/layout-runtime.js"></script>
 */
(function(){

(function () {
  var _bnRuntimeScriptNode=document.currentScript;
  var _bnRuntimeScriptBase=new URL('.',(_bnRuntimeScriptNode&&_bnRuntimeScriptNode.src)||new URL('../js/layout-runtime.js',document.baseURI).href).href;
  var _bnActiveCapture=null;
  var urlId = parseInt(new URLSearchParams(location.search).get('bnid')) || 0;
  var fname = decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/i, ''));

  /* 這個版位（依檔名判斷）只能顯示「目前最上層（z-index最高）」的一張商品圖，
     人物圖完全不顯示——不管人物圖數量或商品可見度規則怎麼變，都要蓋掉。
     統一在這裡（layout-runtime.js）判斷，不用各版位自己攔截商品/人物相關
     訊息，行為才會一致、也才不會漏掉哪個訊息類型沒攔到。 */
  var _bnCampaignCardTemplate = /campaign_card/i.test(fname || '') ||
    !!(document.body && document.body.classList.contains('campaign-card-template'));
  var _bnCampaignCardLogoAsset = null;
  var _bnSingleProductOnlyTemplate = /searchicon_product|campaign_card/i.test(fname || '');
  var _bnSingleLogoTemplate = /^(ar_logo|首頁logo牆|campaign_card)$/i.test(fname || '');
  var _bnHomepageLogoWallTemplate = /^首頁logo牆$/i.test(fname || '');
  var _bnSearchIconLogoTemplate = /^searchicon_logo$/i.test(fname || '');
  var _bnSearchIconProductTemplate = /^searchicon_product$/i.test(fname || '');
  var _bnSingleProductForLogoWallTemplate = /首頁logo牆/i.test(fname || '');
  var _bnDdcardTemplate = /^ddcard/i.test(fname || '');
  /* 這些版位的商品區橫向很寬、但高度較短；若直接把三品填滿整個商品區，
     左中右的百分比位置會比 FB Post 拉得開。只縮「有效商品群」的寬度，
     版位原本的 CSS 寬度、文字、背景與 CTA 位置都不改。 */
  var _bnModerateProductSpacingTemplate = /^(?:Coin_pageBN_APP|HBN_|活動總覽|SBA_|AMS\s*BN-)/i.test(fname || '');
  /* SearchICON／首頁 LOGO 牆都不接受背景圖片；只有首頁 LOGO 牆固定白底（整張）。
     SearchICON_LOGO / PRODUCT / TEXT：圓底（.背景色）跟著父頁選取的背景色，
     但圓底之下的畫布（#canvas）固定白色，不跟著背景色跑。 */
  var _bnNoImageBackgroundTemplate = /^(searchicon_(logo|product|text|120)|首頁logo牆)$/i.test(fname || '');
  /* 首頁 LOGO 牆與 Campaign Card 都固定使用白色畫布底。 */
  var _bnFixedWhiteBackgroundTemplate = _bnHomepageLogoWallTemplate || _bnCampaignCardTemplate;
  var _bnWhiteCanvasUnderCircleTemplate = /^searchicon_(logo|product|text)$/i.test(fname || '');
  var _bnCurrentCanvasBg = '';
  /* 代言人照＋簽名檔＋代言人小字只放在這些版位：ddcard、IG、HBN、LPBN、Coin_pageBN、
     FB_POST、SCBN、活動總覽、SBA、AMS。首頁 LOGO 牆、AR、Search_Image、SearchICON 不放。 */
  var _bnEndorserTemplate = /^(?:ddcard|ig|hbn_|lpbn_|coin_pagebn|fb_post|scbn|活動總覽|sba_|ams\s*bn-)/i.test(fname || '');

  /* IG 下方顏色遮罩暫時隱藏；只隱藏圖層，保留原始設定方便之後恢復。 */
  if(/^IG/i.test(fname||'')){
    var igMaskStyle=document.createElement('style');igMaskStyle.id='bn-ig-bottom-mask-hidden';
    igMaskStyle.textContent='#canvas .漸層下,#canvas .下保護,#canvas .下方保護{display:none!important;}';
    document.head.appendChild(igMaskStyle);
  }
  var selectionStyle=document.createElement('style');selectionStyle.id='bn-object-selection-style';
  selectionStyle.textContent='.bn-prod-box:not([data-bn-selected="1"])>[data-corner],.bn-prod-box:not([data-bn-selected="1"])>[data-rotate-handle],.bn-prod-box:not([data-bn-selected="1"])>[data-rotate-badge],.bn-char-box:not([data-bn-selected="1"])>[data-corner],.bn-char-box:not([data-bn-selected="1"])>[data-rotate-handle],.bn-char-box:not([data-bn-selected="1"])>[data-rotate-badge]{display:none!important;}'
    +'.bn-endorser-note[data-bn-selected="1"]{outline-color:#a855f7!important;}';
  document.head.appendChild(selectionStyle);
  function selectCanvasObject(box){
    document.querySelectorAll('.bn-prod-box[data-bn-selected],.bn-char-box[data-bn-selected],.bn-endorser-note[data-bn-selected]').forEach(function(el){if(el!==box)el.removeAttribute('data-bn-selected');});
    if(box)box.setAttribute('data-bn-selected','1');
  }
  document.addEventListener('pointerdown',function(event){
    var box=event.target.closest&&event.target.closest('.bn-prod-box,.bn-char-box,.bn-endorser-note');
    selectCanvasObject(box||null);
  },true);

  var _bnBgNaturalSizes={};
  function renderBnBackgroundImg(img,src,fit,basis,scale,x,y,mode,container){
    var token=(img._bnBgToken||0)+1;img._bnBgToken=token;
    function place(natural){
      if(img._bnBgToken!==token)return;
      var css=window.getComputedStyle(container),cw=container.clientWidth||parseFloat(css.width)||natural.w,ch=container.clientHeight||parseFloat(css.height)||natural.h;
      var iw,ih,k;
      if(fit==='cover'||fit==='contain'){k=(fit==='cover'?Math.max:Math.min)(cw/natural.w,ch/natural.h);iw=natural.w*k;ih=natural.h*k;}
      else if(fit==='height100'||fit==='auto'&&basis==='height'){ih=ch*scale/100;iw=ih*natural.w/natural.h;}
      else{iw=cw*scale/100;ih=iw*natural.h/natural.w;}
      var left=mode==='center'?cw/2+(x-50)*cw/100-iw/2:(cw-iw)*x/100;
      var top=mode==='center'?ch/2+(y-50)*ch/100-ih/2:(ch-ih)*y/100;
      img.style.position='absolute';img.style.objectFit='fill';img.style.objectPosition='0 0';img.style.transform='';img.style.width=iw+'px';img.style.height=ih+'px';img.style.left=left+'px';img.style.top=top+'px';
    }
    if(_bnBgNaturalSizes[src]){_bnBgNaturalSizes[src].then(place).catch(function(){delete _bnBgNaturalSizes[src];});return;}
    _bnBgNaturalSizes[src]=new Promise(function(resolve,reject){var image=new Image();image.onload=function(){resolve({w:image.naturalWidth||image.width,h:image.naturalHeight||image.height});};image.onerror=reject;image.src=src;});
    _bnBgNaturalSizes[src].then(place).catch(function(){delete _bnBgNaturalSizes[src];});
  }

  /* 可編輯文字不得使用近黑／近白；CTA 底色允許近白，但禁用近黑與灰色。
     父頁會先正規化一次；這裡是版型端最後防線，連寫死在 CSS 的預設色也會攔截。 */
  var _bnRestrictedColorFallbacks={
    brandText:'#2b79c4',mainText:'#2b79c4',subText:'#2540b5',dateText:'#2b79c4',
    ctaBg:'#2540b5',searchImageCtaBg:'#2540b5'
  };
  var _bnCtaBackgroundColorKeys=['ctaBg','searchImageCtaBg'];
  var _bnCtaExtendedGrayColors=['#2d3748','#4a5568','#718096'];
  var _bnRestrictedColorKeys=['brandText','mainText','subText','dateText','ctaBg','searchImageCtaBg'];
  /* 與 index.html 的 BN_PURE_BW_ALLOWED_TEXT_KEYS 同步：主標／品牌字允許純黑、純白（取色工具深底配白主標）。 */
  var _bnPureBwAllowedTextKeys=['brandText','mainText'];
  function _bnRestrictedColorRgb(value){
    var text=String(value||'').trim().toLowerCase();
    if(text==='black') return [0,0,0];
    if(text==='white') return [255,255,255];
    var short=text.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
    if(short) return short.slice(1).map(function(x){return parseInt(x+x,16);});
    var full=text.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    if(full) return full.slice(1).map(function(x){return parseInt(x,16);});
    var rgb=text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if(rgb){
      if(rgb[4]!==undefined&&Number(rgb[4])===0) return null;
      return [Number(rgb[1]),Number(rgb[2]),Number(rgb[3])];
    }
    return null;
  }
  function _bnLum(rgb){
    var f=function(v){v=Math.max(0,Math.min(255,Number(v)||0))/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
    return 0.2126*f(rgb[0])+0.7152*f(rgb[1])+0.0722*f(rgb[2]);
  }
  function _bnContrast(a,b){
    var la=_bnLum(a),lb=_bnLum(b);
    return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);
  }
  function _bnRgbToHex(rgb){
    return '#'+rgb.map(function(v){var n=Math.round(Math.max(0,Math.min(255,v)));return ('0'+n.toString(16)).slice(-2);}).join('');
  }
  /* CTA 字色（比照 color-tool 吃色邏輯）：預設白字；白字對 CTA 底 CR < 3 才改深色字
     （淺底試主標色、深底試底色→主標色，需 CR ≥ 4.5，否則黑字）。 */
  function _bnCtaForegroundForBg(value,mainText,canvasBg){
    var rgb=_bnRestrictedColorRgb(value);
    if(!rgb) return '#ffffff';
    if(_bnContrast([255,255,255],rgb)>=3) return '#ffffff';
    var mainRgb=_bnRestrictedColorRgb(mainText);
    var bgRgb=_bnRestrictedColorRgb(canvasBg);
    var tries=[];
    if(bgRgb&&mainRgb){
      var bgLight=_bnContrast([0,0,0],bgRgb)>=_bnContrast([255,255,255],bgRgb);
      tries=bgLight?[mainRgb]:[bgRgb,mainRgb];
    }else if(mainRgb){ tries=[mainRgb]; }
    for(var i=0;i<tries.length;i++){ if(_bnContrast(tries[i],rgb)>=4.5) return _bnRgbToHex(tries[i]); }
    return '#000000';
  }
  function _bnIsBlackOrWhiteColor(value){
    var rgb=_bnRestrictedColorRgb(value);
    if(!rgb) return false;
    return Math.max.apply(Math,rgb)<=32||Math.min.apply(Math,rgb)>=245;
  }
  function _bnIsGrayColor(value){
    var text=String(value||'').trim().toLowerCase();
    if(_bnCtaExtendedGrayColors.indexOf(text)>=0) return true;
    if(/(?:gray|grey)$/.test(text)||text==='silver'||text==='gainsboro') return true;
    var rgb=_bnRestrictedColorRgb(value);
    if(!rgb) return false;
    return Math.max.apply(Math,rgb)-Math.min.apply(Math,rgb)<=24;
  }
  function _bnIsRestrictedColorForKey(key,value){
    if(_bnPureBwAllowedTextKeys.indexOf(key)>=0) return false;
    if(_bnCtaBackgroundColorKeys.indexOf(key)>=0){
      var rgb=_bnRestrictedColorRgb(value);
      if(rgb&&Math.min.apply(Math,rgb)>=245) return false;
      if(rgb&&Math.max.apply(Math,rgb)<=32) return true;
      return _bnIsGrayColor(value);
    }
    return _bnIsBlackOrWhiteColor(value);
  }
  /* 父層最後一次廣播、已做過禁色與吃色檢查的顏色；禁色替代時優先用它，而不是固定藍。 */
  var _bnLastSafeColors={};
  function _bnFallbackColorFor(key){
    var v=_bnLastSafeColors&&_bnLastSafeColors[key];
    if(v&&_bnRestrictedColorRgb(v)&&!_bnIsRestrictedColorForKey(key,v)) return v;
    return _bnRestrictedColorFallbacks[key];
  }
  function _bnSafeRestrictedColor(key,value){
    return _bnRestrictedColorKeys.indexOf(key)>=0&&_bnIsRestrictedColorForKey(key,value)
      ?_bnFallbackColorFor(key)
      :value;
  }
  function _bnEnforceRestrictedColors(canvas){
    if(!canvas) return;
    function enforce(selector,property,key){
      canvas.querySelectorAll(selector).forEach(function(el){
        var value=window.getComputedStyle(el).getPropertyValue(property);
        if(_bnIsRestrictedColorForKey(key,value)) el.style.setProperty(property,_bnFallbackColorFor(key),'important');
      });
    }
    enforce('.品牌名,.主標,.ICON獨立文案','color','mainText');
    /* 日期原本跟主標共用 mainText 的禁色檢查；主標放行黑白後，日期改用自己的 dateText 規則，仍禁用純黑／純白。 */
    enforce('.日期','color','dateText');
    enforce('.副標,.副標案型七字內,.六字內','color','subText');
    enforce('.逛逛去按鈕,.cta底,.逛逛去底','background-color','ctaBg');
    enforce('.cta圓底','background-color','searchImageCtaBg');
  }
  var _bnRestrictedColorObserver=null,_bnRestrictedColorTimer=0;
  function _bnSetupRestrictedColorGuard(canvas){
    _bnEnforceRestrictedColors(canvas);
    if(!window.MutationObserver||_bnRestrictedColorObserver) return;
    _bnRestrictedColorObserver=new window.MutationObserver(function(){
      clearTimeout(_bnRestrictedColorTimer);
      _bnRestrictedColorTimer=setTimeout(function(){_bnEnforceRestrictedColors(canvas);},0);
    });
    _bnRestrictedColorObserver.observe(canvas,{
      subtree:true,childList:true,attributes:true,attributeFilter:['style','class']
    });
  }

  function loadCSS(href, cb) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    l.onload = cb || function(){};
    l.onerror = function(){ if(cb) cb(); };
    document.head.appendChild(l);
  }
  var loaded = 0;
  function onBothLoaded() {
    loaded++;
    if (loaded < 2) return;
    /* CSS 兩個都載完後，等字型也載完再 init
       document.fonts.ready 在字型下載完成後 resolve，
       保證 scrollWidth / getComputedStyle 拿到的是正確字型的量測值 */
    waitFontsAndInit();
  }

  function waitFontsAndInit() {
    /* 統一入口：CSS 載入完成或 window load fallback 都必須等字型 ready。
       避免慢速電腦先用 fallback 字型完成排版，造成畫布文字位置/寬度錯誤。 */
    function doInit() {
      requestAnimationFrame(function(){ requestAnimationFrame(init); });
    }
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(doInit).catch(doInit);
    } else {
      setTimeout(doInit, 300);
    }
  }

  loadCSS(fname + '.css',        onBothLoaded);
  loadCSS(fname + '.config.css', onBothLoaded);
  window.addEventListener('load', function(){ setTimeout(waitFontsAndInit, 600); });
  var inited = false;

  function renderCampaignCardText(el, value) {
    if(!el) return;
    var text = String(value == null ? '' : value);
    var fragment = document.createDocumentFragment();
    var latin = /[A-Za-z0-9]+/g;
    var match, cursor = 0;
    while((match = latin.exec(text))){
      if(match.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
      var span = document.createElement('span');
      span.className = 'campaign-card-latin';
      span.textContent = match[0];
      fragment.appendChild(span);
      cursor = latin.lastIndex;
    }
    if(cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
    while(el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(fragment);
  }

  function init() {
    if (inited) return;
    inited = true;
    var root = getComputedStyle(document.documentElement);
    var canvas = document.getElementById('canvas');
    var W = parseFloat(root.getPropertyValue('--canvas-w')) || parseFloat(document.body.dataset.fw) || 900;
    var H = parseFloat(root.getPropertyValue('--canvas-h')) || parseFloat(document.body.dataset.fh) || 600;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    var bgRaw = root.getPropertyValue('--bg-img').trim();
    if (bgRaw && bgRaw !== 'none' && bgRaw !== '') {
      var bsrc = bgRaw.replace(/^url\(["']?/,'').replace(/["']?\)$/,'').trim();
      var bimg = document.getElementById('底圖');
      if (bimg) { bimg.src = bsrc; bimg.style.display = 'block'; }
    }

    var ctaRaw = root.getPropertyValue('--cta-classes').trim().replace(/^["']/,'').replace(/["']$/,'');
    var ctaSet = {};
    if (ctaRaw) ctaRaw.split(',').forEach(function(s){ var k=s.trim(); if(k) ctaSet[k]=true; });

    var layersRaw = root.getPropertyValue('--layers').trim().replace(/^["']/,'').replace(/["']$/,'');
    if (layersRaw) {
      layersRaw.split(',').forEach(function(s) {
        s = s.trim(); if (!s) return;
        var parts = s.split('|'), cls = parts[0].trim(), txt = parts.length>1 ? parts[1].trim() : '';
        if (!cls) return;
        var el = document.createElement('div');
        el.className = cls;
        if (ctaSet[cls]) {
          var s1 = document.createElement('span'); s1.className = 'cta-text'; if(txt) s1.textContent = txt;
          var s2 = document.createElement('span'); s2.className = 'cta-arrow';
          el.appendChild(s1); el.appendChild(s2);
        } else { if(txt) { if(cls === 'CampaignCard文案') renderCampaignCardText(el, txt); else el.textContent = txt; } }
        canvas.appendChild(el);
      });

      /* IG logo card：固定壓在背景色/背景圖/保護色塊上方，但低於主要文字與 logo */
      var bgLayer = canvas.querySelector('.bg');
      var isIGLayout = /^IG/i.test(fname);
      if (isIGLayout && bgLayer) {
        var card = document.getElementById('ig-shopee-logo-card');
        if (!card) {
          card = document.createElement('img');
          card.id = 'ig-shopee-logo-card';
          card.alt = '';
          card.src = 'img/ig-shopee-logo-card.png';
        }
        card.style.cssText =
          'position:absolute;left:0;top:0;width:100%;height:100%;' +
          'object-fit:cover;pointer-events:none;z-index:4;';
        bgLayer.insertAdjacentElement('afterend', card);
      }

      /* CTA（色塊／文字／三角標）必須永遠疊在整個版面最上層，不可被商品圖／
         人物圖／LOGO 蓋住。PS 匯出的 CSS z-index 不保證比商品範圍/logo範圍高
         （商品範圍/logo範圍本身的 z-index 常常比 cta底 還高），這裡明確把
         CTA 相關圖層固定拉到最上面，跟商品/人物/logo 的疊放順序完全脫鉤，
         彼此之間的相對前後順序（色塊在下、文字居中、三角在上）維持不變。 */
      var CTA_TOP_CLASSES = [
        'cta底','逛逛去底','cta圓底',                 /* CTA 色塊（背景），這組最底 */
        'cta白線',                                     /* 裝飾線 */
        '放心買_安心退','逛逛去','cta符號',            /* CTA 文字／符號 */
        'cta三角標','cta三角箭頭','逛逛去三角標'        /* 三角標，這組最上面 */
      ];
      CTA_TOP_CLASSES.forEach(function(cls, i){
        canvas.querySelectorAll('.'+cls).forEach(function(el){
          el.style.zIndex = String(9000 + i);
        });
      });
    }

    /* ── 讀 --canvas-bg 套用初始背景色（--layers DOM 建立後才做，.bg/.背景色 已存在）
          init 時就設好，不依賴父層 bn-color；
          避免 iframe reload 後背景色消失，或父層重新同步時閃回預設顏色。
          父層之後發 bn-color 仍可覆蓋（同為 inline style）。── */
    var canvasBgRaw = root.getPropertyValue('--canvas-bg').trim();
    if (canvasBgRaw && canvasBgRaw !== 'none' && canvasBgRaw !== '') {
      var _bgEl = canvas.querySelector('.背景色') || canvas.querySelector('.bg') || canvas.querySelector('.底色');
      if (_bgEl) {
        _bgEl.style.backgroundColor = canvasBgRaw;
      } else {
        canvas.style.background = canvasBgRaw;
      }
    }

    function fit() {
      if (window.parent !== window) {
        canvas.style.transform = 'none';
        var st = document.getElementById('stage');
        if (st) { st.style.width = W+'px'; st.style.height = H+'px'; }
        return;
      }
      var sc = Math.min(window.innerWidth/W, window.innerHeight/H);
      var st = document.getElementById('stage');
      canvas.style.transform = 'scale('+sc+')';
      st.style.width  = (W*sc)+'px';
      st.style.height = (H*sc)+'px';
    }
    window.addEventListener('resize', fit);
    fit();
    if (window.parent !== window && urlId)
      window.parent.postMessage({type:'bn-iframe-ready',id:urlId,w:W,h:H},'*');

    /* 掛標：自動依目前版位檔名讀 html/img/tag/版位名_r 或 _w，預設紅色。
       修正版：同時建立紅/白兩張疊圖，切換時只控制 display，避免 iframe postMessage 時機與瀏覽器快取造成不切換。 */
    var _bnTagColor = 'red';
    var _bnTagWrap = null;
    var _bnTagImgs = { red: null, white: null };
    var _bnTagSrcs = { red: '', white: '' };
    var _bnTagSeq = 0;

    function _bnDecodeSharpU(str){
      return String(str || '').replace(/#U([0-9a-fA-F]{4,6})/g, function(_, hex){
        try { return String.fromCodePoint(parseInt(hex, 16)); } catch(e) { return _; }
      });
    }
    function _bnUnique(arr){
      var out = [];
      arr.forEach(function(v){
        v = String(v || '').trim();
        if(v && out.indexOf(v) === -1) out.push(v);
      });
      return out;
    }
    function _bnNormalizeTagName(str){
      return _bnDecodeSharpU(String(str || ''))
        .toLowerCase()
        .replace(/\.html$/i, '')
        .replace(/[_\-\s]/g, '')
        .replace(/(方logo|橫logo|方式logo|橫式logo|方標|橫標|方版|橫版|排版|logo)/g, '');
    }
    function _bnPushTagBase(arr, v){
      v = String(v || '').trim();
      if(!v) return;
      arr.push(v);
      try { arr.push(_bnDecodeSharpU(v)); } catch(_) {}
      try { arr.push(encodeURIComponent(v)); } catch(_) {}
      try { arr.push(v.replace(/ /g, '%20')); } catch(_) {}
      arr.push(v.toLowerCase());
    }
    function _bnTagBases(){
      var base = fname || '';
      var decodedPath = '';
      try { decodedPath = decodeURIComponent(location.pathname.split('/').pop().replace(/\.html$/i, '')); } catch(_) {}
      var zhBase = _bnDecodeSharpU(base);
      var zhPath = _bnDecodeSharpU(decodedPath || base);
      var norm = _bnNormalizeTagName(zhPath || zhBase || base);

      // 已知的固定命名別名優先嘗試（img/tag 資料夾裡實際存在的檔名多是這種命名），
      // 這樣通常第 1～2 次就能找到圖，不會浪費一堆請求去試不存在的檔名組合。
      var aliases = [];
      if(/coin/i.test(norm)) aliases.push('Coinpage','coinpage','Coin_pageBN_APP','Coin_pageBN');
      if(/ddcard/i.test(norm)) aliases.push('ddcard','DDCard','DD Card');
      if(/hbn/i.test(norm)) aliases.push('HBN','hbn');
      if(/fbpost|facebook|^fb/i.test(norm)) aliases.push('fbpost','FB_POST','FB','facebook');
      if(/ig|instagram/i.test(norm)) aliases.push('IG','ig','instagram');
      if(/lpbnapp/i.test(norm)) aliases.push('LPBN_APP','lpbn_app');
      if(/lpbnpc/i.test(norm)) aliases.push('LPBN_PC','lpbn_pc');
      if(/scbn/i.test(norm)) aliases.push('SCBN_APP','SCBN','scbn');
      if(/sbapc|sba_pc/i.test(norm)) aliases.push('SBA_PC','sba_pc');
      else if(/sba/i.test(norm)) aliases.push('SBA_APP','SBA','sba');
      if(/searchimage1/i.test(norm)) aliases.push('Search_Image1logo','Search_Image1','searchimage1');
      if(/searchimage2/i.test(norm)) aliases.push('Search_Image2logo','Search_Image2','searchimage2');
      if(/searchimage3/i.test(norm)) aliases.push('Search_Image3logo','Search_Image3','searchimage3');

      var arr = [];
      aliases.forEach(function(v){ _bnPushTagBase(arr, v); });
      [base, decodedPath, zhBase, zhPath, norm].forEach(function(v){ _bnPushTagBase(arr, v); });
      return _bnUnique(arr);
    }
    function _bnBuildTagCandidates(color){
      var suffix = color === 'white' ? 'w' : 'r';
      var candidates = [];
      // 只嘗試實際會用到的副檔名（png 為主，jpg/webp 備用），避免每個檔名都要試 6 種副檔名
      // 造成組合爆炸（過多無效請求容易被 GitHub Pages 判定為 429 太多請求）。
      ['png','jpg','webp'].forEach(function(ext){
        _bnTagBases().forEach(function(base){
          candidates.push('img/tag/' + base + '_' + suffix + '.' + ext);
          candidates.push('html/img/tag/' + base + '_' + suffix + '.' + ext);
        });
      });
      // 安全上限：最多只嘗試前 40 個候選網址，找不到就放棄，不繼續往下試。
      return _bnUnique(candidates).slice(0, 40);
    }
    function _bnTagCacheKey(color){
      return 'bnTag:' + (fname || '') + ':' + color;
    }
    function _bnFindFirstImage(srcs, cb){
      var idx = 0;
      function next(){
        if(idx >= srcs.length){ cb(''); return; }
        var src = srcs[idx++];
        var probe = new Image();
        probe.onload = function(){ cb(src); };
        probe.onerror = next;
        // 探測階段不加時間戳記，讓瀏覽器對重複探測的失敗結果保有快取的機會，
        // 避免同一批候選網址在多個 iframe / 多次重新排版時被重複打好幾次。
        probe.src = src;
      }
      next();
    }

    function _bnEnsureTagLayers(){
      if(!_bnTagWrap){
        _bnTagWrap = document.getElementById('bn-auto-tag-wrap');
      }
      if(!_bnTagWrap){
        _bnTagWrap = document.createElement('div');
        _bnTagWrap.id = 'bn-auto-tag-wrap';
      }
      _bnTagWrap.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9998;display:none;';

      ['red','white'].forEach(function(color){
        var img = _bnTagImgs[color] || document.getElementById('bn-auto-tag-' + color);
        if(!img){
          img = document.createElement('img');
          img.id = 'bn-auto-tag-' + color;
          img.alt = '';
        }
        img.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;object-fit:fill;pointer-events:none;display:none;';
        if(img.parentNode !== _bnTagWrap) _bnTagWrap.appendChild(img);
        _bnTagImgs[color] = img;
      });

      if(_bnTagWrap.parentNode !== canvas){
        var bgLayer = canvas.querySelector('.bg') || canvas.querySelector('.背景色') || canvas.querySelector('.底色');
        if(bgLayer && bgLayer.parentNode === canvas) bgLayer.insertAdjacentElement('afterend', _bnTagWrap);
        else canvas.appendChild(_bnTagWrap);
      }
      return _bnTagWrap;
    }
    function _bnRefreshTagVisibility(){
      _bnEnsureTagLayers();
      var visible = false;
      ['red','white'].forEach(function(color){
        var img = _bnTagImgs[color];
        var show = color === _bnTagColor && !!_bnTagSrcs[color];
        if(img) img.style.display = show ? 'block' : 'none';
        if(show) visible = true;
      });
      _bnTagWrap.style.display = visible ? 'block' : 'none';
    }
    function _bnLoadTagLayers(){
      var seq = ++_bnTagSeq;
      _bnEnsureTagLayers();
      ['red','white'].forEach(function(color){
        var cacheKey = _bnTagCacheKey(color);
        var cached = null;
        try { cached = window.sessionStorage.getItem(cacheKey); } catch(_) {}
        if(cached !== null){
          // 曾經探測過的結果（找到的網址，或空字串代表確認找不到），直接沿用，不用再打一輪請求。
          if(seq !== _bnTagSeq) return;
          _bnTagSrcs[color] = cached || '';
          var cimg = _bnTagImgs[color];
          if(cached && cimg){
            cimg.onload = function(){ _bnRefreshTagVisibility(); };
            cimg.onerror = function(){ _bnTagSrcs[color] = ''; _bnRefreshTagVisibility(); };
            cimg.src = cached + (cached.indexOf('?') === -1 ? '?v=' : '&v=') + Date.now();
          }
          _bnRefreshTagVisibility();
          return;
        }
        _bnFindFirstImage(_bnBuildTagCandidates(color), function(src){
          try { window.sessionStorage.setItem(cacheKey, src || ''); } catch(_) {}
          if(seq !== _bnTagSeq) return;
          _bnTagSrcs[color] = src || '';
          var img = _bnTagImgs[color];
          if(src && img){
            img.onload = function(){ _bnRefreshTagVisibility(); };
            img.onerror = function(){ _bnTagSrcs[color] = ''; _bnRefreshTagVisibility(); };
            img.src = src + (src.indexOf('?') === -1 ? '?v=' : '&v=') + Date.now();
          }
          _bnRefreshTagVisibility();
        });
      });
    }
    function _bnSetTagColor(color){
      _bnTagColor = (color === 'white') ? 'white' : 'red';
      _bnRefreshTagVisibility();
      if(!_bnSkipTag && !_bnTagSrcs.red && !_bnTagSrcs.white) _bnLoadTagLayers();
    }
    window._bnSetTagColor = _bnSetTagColor;
    window._bnApplyTag = function(){ if(!_bnSkipTag) _bnLoadTagLayers(); };
    var _bnSkipTag = _bnCampaignCardTemplate;
    if(/ddcard/i.test(fname)){
      try { _bnSkipTag = !/^#ddcard$/i.test(parent.location.hash.trim()); } catch(_){}
    }
    if(!_bnSkipTag) _bnLoadTagLayers();


    /* Search_Image：動態置中 */
    if(fname.toLowerCase().indexOf('search_image') !== -1){
      /* Search_Image2：兩個 logo 各自垂直置中，水平位置由 PS CSS 決定 */
      if(fname.toLowerCase().indexOf('search_image2') !== -1 || fname.toLowerCase().indexOf('search_image3') !== -1){
        var _si23H = H;
        /* 所有 logo 範圍垂直置中 */
        ['logo範圍_左','logo範圍_中','logo範圍_右'].forEach(function(cls){
          var el = canvas.querySelector('.'+cls);
          if(!el) return;
          var elH = parseFloat(window.getComputedStyle(el).height) || 121;
          el.style.top = ((_si23H - elH) / 2) + 'px';
        });
        /* 間隔線垂直置中（支援單名和左右命名）*/
        ['.logo間隔直線','.logo間隔直線_左','.logo間隔直線_右'].forEach(function(sel){
          var el = canvas.querySelector(sel);
          if(!el) return;
          var elH = parseFloat(window.getComputedStyle(el).height) || 55;
          el.style.top = ((_si23H - elH) / 2) + 'px';
        });
        return;
      }
      var _siLogo = canvas.querySelector('.logo範圍');
      var _siText = canvas.querySelector('.副標案型七字內');
      if(_siLogo && _siText){
        var _siCanvasH = H;
        /* 文案區：紅底右邊緣 ~ CTA 左邊緣 */
        var _siRedEl  = canvas.querySelector('.蝦皮商城logo紅底');
        var _siCtaEl  = canvas.querySelector('.cta圓底');
        var _siAreaLeft  = _siRedEl  ?
          parseFloat(window.getComputedStyle(_siRedEl).left) + parseFloat(window.getComputedStyle(_siRedEl).width) : 299;
        var _siAreaRight = _siCtaEl  ?
          parseFloat(window.getComputedStyle(_siCtaEl).left) : 1007;
        var _siAreaCenter = (_siAreaLeft + _siAreaRight) / 2;

        /* logo 固定尺寸（從 CSS 讀，之後不變）*/
        var _siLogoW = parseFloat(window.getComputedStyle(_siLogo).width)  || 120;
        var _siLogoH = parseFloat(window.getComputedStyle(_siLogo).height) || 121;

        function siLayout(){
          /* canvas 縮放比例（用於把 getBoundingClientRect 轉回原始座標）*/
          var m = canvas.style.transform && canvas.style.transform.match(/scale\(([\d.]+)\)/);
          var scale = m ? parseFloat(m[1]) : 1;

          /* 副標實際視覺寬高（原始座標）
             getBoundingClientRect 回傳的是螢幕像素，除以 scale 得原始大小
             但文字有 matrix transform，用 scrollWidth 更準確 */
          var textW = _siText.scrollWidth;
          /* matrix scale 也會影響視覺寬度 */
          var matStyle = window.getComputedStyle(_siText).transform;
          var matM = matStyle && matStyle.match(/matrix\(([^,]+)/);
          var matScale = matM ? parseFloat(matM[1]) : 1;
          var visTextW = textW * matScale;

          var visTextH = parseFloat(window.getComputedStyle(_siText).fontSize) * matScale;

          /* 整體寬度：logo + 26px 間距 + 副標視覺寬 */
          var totalW = _siLogoW + 26 + visTextW;

          /* 左右置中在文案區 */
          var startX = _siAreaCenter - totalW / 2;
          _siLogo.style.left = startX + 'px';
          _siText.style.left = (startX + _siLogoW + 26) + 'px';

          /* 上下置中。
             ★ 2026-08 修正（第二版）：文字改用「墨水實測置中」。
             第一版拿字級當視覺高度 → CJK 墨水偏下，整行低 16px；
             改回 CSS top 又發現那個值是配 PS matrix 調的，現在樣式已被
             覆寫（transform:none / 等效字級），基準對不上 → 偏高 12px。
             不再依賴任何寫死的 top：
             1. 零尺寸探針量出瀏覽器把 baseline 放在元素內的哪個 y
                （負半行距等怪癖全都如實反映）。
             2. measureText 的 actualBoundingBox 量出「這串字」真實墨水
                的上下緣 → 墨水中心相對元素頂端的偏移。
             3. top = 畫布中心 - 墨水中心偏移 → 墨水中心永遠 = 畫布中心。
             改字、改字級、換字型全都自動成立，預覽即所得，
             下載端點陣化畫的是同一個位置，兩邊永遠一致。 */
          _siLogo.style.top = ((_siCanvasH - _siLogoH) / 2) + 'px';
          try {
            var _pb = document.createElement('span');
            _pb.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;';
            _siText.appendChild(_pb);
            var _baseOff = _pb.offsetTop;           /* baseline 在元素內的 y */
            _siText.removeChild(_pb);
            var _tcs = window.getComputedStyle(_siText);
            var _mctx = document.createElement('canvas').getContext('2d');
            _mctx.font = _tcs.fontStyle + ' ' + _tcs.fontWeight + ' ' + parseFloat(_tcs.fontSize) + 'px ' + _tcs.fontFamily;
            var _tm = _mctx.measureText((_siText.textContent || '').trim());
            if(_tm.actualBoundingBoxAscent !== undefined && _baseOff > 0){
              /* 墨水中心（相對元素頂端）= baseline + (descent - ascent)/2，
                 若元素帶 matrix 縮放要等比換算 */
              var _inkMid = (_baseOff + (_tm.actualBoundingBoxDescent - _tm.actualBoundingBoxAscent) / 2) * matScale;
              _siText.style.top = (_siCanvasH / 2 - _inkMid) + 'px';
            } else {
              _siText.style.top = ''; /* 量不到就退回 CSS 預設 */
            }
          } catch(e) {
            _siText.style.top = '';
          }
        }

        /* 等字型載完再算位置，避免 fallback 字型造成 scrollWidth 偏差 */
        window._siRelayout = siLayout;
        function runSiLayout() {
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(function() {
              siLayout();
            });
          } else {
            /* 不支援 document.fonts：延遲兩幀保守等待 */
            requestAnimationFrame(function(){
              requestAnimationFrame(siLayout);
            });
          }
        }
        runSiLayout();
      }
    } /* end search_image */


    /* 啟用畫布文字直接編輯 */
    attachEditableToAll();
    _bnSetupRestrictedColorGuard(canvas);
  }

  /* 主／副標關鍵字的非阻擋式內容提醒：畫布只在編輯預覽顯示橘框與提示，
     messages 由父層獨立傳入，不會改寫 .日期 的實際文字。 */
  function ensureContentWarningStyle(){
    if(document.getElementById('_bn_content_warning_style')) return;
    var st=document.createElement('style');
    st.id='_bn_content_warning_style';
    st.textContent=''
      +'.bn-content-warning-target{outline:3px solid #f59e0b !important;'
      +'background:rgba(245,158,11,.14) !important;border-radius:2px;}'
      +'.bn-content-warning-tip{position:absolute;z-index:20050;box-sizing:border-box;'
      +'padding:7px 9px;border:2px solid #f59e0b;border-radius:6px;'
      +'background:rgba(30,22,4,.94);color:#fbbf24;font-family:Arial,"Noto Sans TC",sans-serif;'
      +'font-weight:700;line-height:1.45;box-shadow:0 4px 14px rgba(0,0,0,.28);'
      +'pointer-events:none;white-space:normal;text-align:left;}'
      +'.bn-content-warning-tip div+div{margin-top:4px;padding-top:4px;'
      +'border-top:1px solid rgba(245,158,11,.35);}';
    (document.head||document.documentElement).appendChild(st);
  }
  function applyContentWarnings(messages){
    messages=Array.isArray(messages)?messages.filter(function(m){return typeof m==='string'&&m;}):[];
    window.__bnContentWarningMessages=messages.slice();
    ensureContentWarningStyle();

    document.querySelectorAll('.bn-content-warning-target').forEach(function(el){
      el.classList.remove('bn-content-warning-target');
    });
    document.querySelectorAll('.bn-content-warning-tip').forEach(function(el){el.remove();});
    if(!messages.length) return;

    var cv=document.getElementById('canvas');
    if(!cv) return;
    var cr=cv.getBoundingClientRect();
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||cr.width||0;
    var ch=cv.offsetHeight||parseFloat(cv.style.height)||cr.height||0;
    document.querySelectorAll('.日期').forEach(function(dateEl){
      if(!cv.contains(dateEl)) return;
      dateEl.classList.add('bn-content-warning-target');
      var tip=document.createElement('div');
      tip.className='bn-content-warning-tip';
      tip.dataset.bnPreviewWarning='1';
      tip.style.maxWidth=Math.max(100,Math.min(460,cw-12))+'px';
      tip.style.fontSize=(cw<300?8:(cw<700?11:14))+'px';
      var copy=document.createElement('div');
      copy.className='bn-content-warning-copy';
      messages.forEach(function(msg){
        var line=document.createElement('div');
        line.className='bn-content-warning-line';
        line.textContent='⚠ '+msg;
        copy.appendChild(line);
      });
      tip.appendChild(copy);
      (document.getElementById('stage')||cv.parentElement||document.body).appendChild(tip);

      var dr=dateEl.getBoundingClientRect();
      var left=dr.left-cr.left;
      var top=dr.bottom-cr.top+6;
      left=Math.max(4,Math.min(left,Math.max(4,cw-tip.offsetWidth-4)));
      if(top+tip.offsetHeight>ch-4) top=dr.top-cr.top-tip.offsetHeight-6;
      top=Math.max(4,Math.min(top,Math.max(4,ch-tip.offsetHeight-4)));
      tip.style.left=left+'px';
      tip.style.top=top+'px';
    });
  }

  /* 橘色提示的「最佳可視最小字」：依父層 iframe 的實際縮放比例反算，
     讓螢幕上看到的字至少約 13px；原始畫布字級本身也不低於 18px。 */
  var BN_CONTENT_WARNING_MIN_VISIBLE_FONT=13;
  var BN_CONTENT_WARNING_MIN_CANVAS_FONT=18;
  var _bnApplyContentWarningsBase=applyContentWarnings;
  applyContentWarnings=function(messages){
    _bnApplyContentWarningsBase(messages);
    var cv=document.getElementById('canvas');
    if(!cv) return;
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||0;
    var ch=cv.offsetHeight||parseFloat(cv.style.height)||0;
    var previewScale=1;
    try{
      var frame=window.frameElement;
      if(frame){
        var layoutWidth=frame.offsetWidth||parseFloat(frame.style.width)||cw;
        var visibleWidth=frame.getBoundingClientRect().width;
        if(layoutWidth>0&&visibleWidth>0) previewScale=visibleWidth/layoutWidth;
      }
    }catch(_){}
    previewScale=Math.max(.1,Math.min(1,previewScale||1));
    var fontPx=Math.max(BN_CONTENT_WARNING_MIN_CANVAS_FONT,
      Math.ceil(BN_CONTENT_WARNING_MIN_VISIBLE_FONT/previewScale));
    fontPx=Math.min(30,fontPx);

    var cr=cv.getBoundingClientRect();
    var targets=Array.prototype.slice.call(cv.querySelectorAll('.bn-content-warning-target'));
    var tips=Array.prototype.slice.call(document.querySelectorAll('.bn-content-warning-tip'));
    tips.forEach(function(tip,index){
      tip.style.setProperty('font-size',fontPx+'px','important');
      var dateEl=targets[index];
      if(!dateEl) return;
      var dr=dateEl.getBoundingClientRect();
      var left=dr.left-cr.left;
      var top=dr.bottom-cr.top+6;
      left=Math.max(4,Math.min(left,Math.max(4,cw-tip.offsetWidth-4)));
      if(top+tip.offsetHeight>ch-4) top=dr.top-cr.top-tip.offsetHeight-6;
      top=Math.max(4,Math.min(top,Math.max(4,ch-tip.offsetHeight-4)));
      tip.style.left=left+'px';
      tip.style.top=top+'px';
    });
  };

  /* 最終定位規則：提示固定在日期／警語下方，不因空間判斷翻到上方，
     避免覆蓋副標；加寬提示框以減少大字級造成的換行高度。 */
  var _bnApplyContentWarningsSizedBase=applyContentWarnings;
  applyContentWarnings=function(messages){
    _bnApplyContentWarningsSizedBase(messages);
    var cv=document.getElementById('canvas');
    if(!cv) return;
    var cr=cv.getBoundingClientRect();
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||0;
    var targets=Array.prototype.slice.call(cv.querySelectorAll('.bn-content-warning-target'));
    var tips=Array.prototype.slice.call(document.querySelectorAll('.bn-content-warning-tip'));
    tips.forEach(function(tip,index){
      var dateEl=targets[index];
      if(!dateEl) return;
      tip.style.maxWidth=Math.max(100,Math.min(720,cw-12))+'px';
      var dr=dateEl.getBoundingClientRect();
      var left=dr.left-cr.left;
      var top=dr.bottom-cr.top+6;
      left=Math.max(4,Math.min(left,Math.max(4,cw-tip.offsetWidth-4)));
      tip.style.left=left+'px';
      tip.style.top=top+'px';
    });
  };

  /* 深色底橘字＋「我已了解/已補充▶」：按鈕只控制編輯預覽，點擊後先在目前畫布
     立即隱藏，再通知父層同步隱藏其他畫布與左側提醒。 */
  function ensureContentWarningActionStyle(){
    if(document.getElementById('_bn_content_warning_action_style')) return;
    var st=document.createElement('style');
    st.id='_bn_content_warning_action_style';
    st.textContent=''
      +'html.bn-content-warning-active,html.bn-content-warning-active body{overflow:visible !important;}'
      +'html.bn-content-warning-active body{align-items:flex-start !important;'
      +'justify-content:flex-start !important;}'
      +'html.bn-content-warning-active #stage{overflow:visible !important;}'
      +'.bn-content-warning-tip{display:inline-block;vertical-align:middle;'
      +'width:max-content;max-width:760px;padding:.5em .65em !important;'
      +'background:rgba(17,24,39,.96) !important;border:2px solid #f59e0b !important;'
      +'border-radius:.45em !important;color:#fbbf24 !important;pointer-events:auto !important;'
      +'box-shadow:0 5px 16px rgba(0,0,0,.34) !important;text-shadow:none;}'
      +'.bn-content-warning-copy{display:inline;}'
      +'.bn-content-warning-line{display:inline;margin:0 !important;padding:0 !important;'
      +'border:0 !important;white-space:normal;word-break:normal;overflow-wrap:break-word;line-break:strict;}'
      +'.bn-content-warning-line+.bn-content-warning-line::before{content:"\\A";white-space:pre;}'
      +'.bn-content-warning-dismiss{display:inline-flex;align-items:center;justify-content:center;'
      +'vertical-align:middle;margin:0 0 0 .5em;padding:.42em .72em;min-height:1.9em;'
      +'border:2px solid #f59e0b;border-radius:999px;background:#f59e0b;color:#241600;'
      +'font:700 .88em/1 Arial,"Noto Sans TC",sans-serif;white-space:nowrap;cursor:pointer;'
      +'pointer-events:auto;box-shadow:0 2px 7px rgba(0,0,0,.18);}'
      +'.bn-content-warning-dismiss:hover{background:#fbbf24;border-color:#fbbf24;}';
    (document.head||document.documentElement).appendChild(st);
  }
  ensureContentWarningActionStyle();
  var _bnApplyContentWarningsActionBase=applyContentWarnings;
  applyContentWarnings=function(messages){
    _bnApplyContentWarningsActionBase(messages);
    var cv=document.getElementById('canvas');
    if(!cv || !Array.isArray(messages) || !messages.length) return;
    var cr=cv.getBoundingClientRect();
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||0;
    var targets=Array.prototype.slice.call(cv.querySelectorAll('.bn-content-warning-target'));
    var tips=Array.prototype.slice.call(document.querySelectorAll('.bn-content-warning-tip'));
    tips.forEach(function(tip,index){
      if(!tip.querySelector('.bn-content-warning-dismiss')){
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='bn-content-warning-dismiss';
        btn.textContent='我已了解/已補充▶';
        btn.addEventListener('click',function(ev){
          ev.preventDefault(); ev.stopPropagation();
          applyContentWarnings([]);
          try{ window.parent.postMessage({type:'bn-content-warning-dismiss'},'*'); }catch(_){}
        });
        tip.appendChild(btn);
      }
      var dateEl=targets[index];
      if(!dateEl) return;
      var dr=dateEl.getBoundingClientRect();
      var left=Math.max(4,Math.min(dr.left-cr.left,Math.max(4,cw-tip.offsetWidth-4)));
      tip.style.left=left+'px';
      tip.style.top=(dr.bottom-cr.top+6)+'px';
    });
  };

  /* 依每個版型的日期、文字、Logo 與圖片區域，自動選擇重疊最少的位置。
     超出版型右側／下方的代價刻意設得很低，寧可延伸預覽範圍，也不遮內容。 */
  function bnContentWarningOverlapArea(a,b){
    var left=Math.max(a.left,b.left), top=Math.max(a.top,b.top);
    var right=Math.min(a.left+a.width,b.left+b.width);
    var bottom=Math.min(a.top+a.height,b.top+b.height);
    return Math.max(0,right-left)*Math.max(0,bottom-top);
  }

  function bnChooseContentWarningPlacement(dateRect,tipSize,canvasSize,obstacles){
    var cw=Math.max(1,canvasSize.width||0), ch=Math.max(1,canvasSize.height||0);
    var tw=Math.max(1,tipSize.width||0), th=Math.max(1,tipSize.height||0);
    var dx=dateRect.left||0, dy=dateRect.top||0;
    var dw=dateRect.width||0, dh=dateRect.height||0;
    var gap=7, candidates=[];
    function add(name,left,top,preference){
      candidates.push({
        name:name,
        left:Math.max(0,Math.round(left)),
        top:Math.max(0,Math.round(top)),
        preference:preference||0
      });
    }

    add('below-left',dx,dy+dh+gap,0);
    add('below-right',dx+dw-tw,dy+dh+gap,1);
    add('right',dx+dw+gap,dy+(dh-th)/2,2);
    add('above-left',dx,dy-th-gap,3);
    add('above-right',dx+dw-tw,dy-th-gap,4);
    add('inside-bottom-left',6,ch-th-6,6);
    add('inside-bottom-right',cw-tw-6,ch-th-6,7);
    add('inside-top-left',6,6,8);
    add('inside-top-right',cw-tw-6,6,9);
    add('outside-bottom',Math.min(Math.max(0,dx),Math.max(0,cw-tw)),ch+gap,10);
    add('outside-right',cw+gap,Math.min(Math.max(0,dy),Math.max(0,ch-th)),11);

    var canvasRect={left:0,top:0,width:cw,height:ch};
    var tipArea=tw*th;
    var anchorX=dx+dw/2, anchorY=dy+dh/2;
    obstacles=Array.isArray(obstacles)?obstacles:[];
    candidates.forEach(function(candidate){
      var rect={left:candidate.left,top:candidate.top,width:tw,height:th};
      var occupied=0;
      obstacles.forEach(function(obstacle){
        occupied+=bnContentWarningOverlapArea(rect,obstacle)*(obstacle.weight||1);
      });
      var inside=bnContentWarningOverlapArea(rect,canvasRect);
      var outside=Math.max(0,tipArea-inside);
      var centerX=rect.left+tw/2, centerY=rect.top+th/2;
      var distance=Math.abs(centerX-anchorX)+Math.abs(centerY-anchorY);
      candidate.score=occupied*16+outside*.06+distance*.08+candidate.preference*30;
    });
    candidates.sort(function(a,b){return a.score-b.score;});
    return candidates[0];
  }
  window.__bnChooseContentWarningPlacement=bnChooseContentWarningPlacement;

  function bnCollectContentWarningObstacles(cv,canvasRect,dateEl){
    var selectors=[
      '.品牌名','.主標','.副標','.日期','.副標案型七字內','.ICON獨立文案',
      '[class*="logo範圍"]','[class*="商品範圍"]','[class*="商品圖範圍"]',
      '[class*="cta"]','[class*="CTA"]','.bn-prod-box','.bn-char-box','img:not(#底圖)'
    ].join(',');
    var cw=cv.offsetWidth||canvasRect.width||0;
    var ch=cv.offsetHeight||canvasRect.height||0;
    var seen=[], obstacles=[];
    cv.querySelectorAll(selectors).forEach(function(el){
      if(seen.indexOf(el)>=0 || el.closest('.bn-content-warning-tip')) return;
      seen.push(el);
      var style=window.getComputedStyle(el);
      if(style.display==='none'||style.visibility==='hidden'||parseFloat(style.opacity||'1')===0) return;
      var r=el.getBoundingClientRect();
      var left=Math.max(0,r.left-canvasRect.left);
      var top=Math.max(0,r.top-canvasRect.top);
      var right=Math.min(cw,r.right-canvasRect.left);
      var bottom=Math.min(ch,r.bottom-canvasRect.top);
      var width=Math.max(0,right-left), height=Math.max(0,bottom-top);
      if(width<2||height<2) return;
      if(width*height>cw*ch*.92 && el!==dateEl) return;
      var isText=el===dateEl||el.matches('.品牌名,.主標,.副標,.日期,.副標案型七字內,.ICON獨立文案');
      obstacles.push({
        left:left,top:top,width:width,height:height,
        weight:el===dateEl?8:(isText?4:2)
      });
    });
    return obstacles;
  }

  function bnPostContentWarningBounds(width,height){
    if(window.parent===window||!urlId) return;
    try{
      window.parent.postMessage({
        type:'bn-content-warning-bounds',id:urlId,
        w:Math.max(1,Math.ceil(width||0)),h:Math.max(1,Math.ceil(height||0))
      },'*');
    }catch(_){}
  }

  var _bnContentWarningRelayoutTimer=0;
  var _bnContentWarningObservedCanvas=null;
  var _bnContentWarningObserver=null;
  function bnScheduleContentWarningRelayout(){
    if(window.__bnContentWarningCaptureActive) return;
    if(!window.__bnContentWarningMessages||!window.__bnContentWarningMessages.length) return;
    clearTimeout(_bnContentWarningRelayoutTimer);
    _bnContentWarningRelayoutTimer=setTimeout(function(){
      applyContentWarnings(window.__bnContentWarningMessages||[]);
    },45);
  }
  function bnEnsureContentWarningRelayoutObserver(cv){
    if(_bnContentWarningObservedCanvas===cv) return;
    _bnContentWarningObservedCanvas=cv;
    if(window.MutationObserver){
      _bnContentWarningObserver=new window.MutationObserver(bnScheduleContentWarningRelayout);
      _bnContentWarningObserver.observe(cv,{
        subtree:true,childList:true,characterData:true,attributes:true,
        attributeFilter:['style','src']
      });
    }
    cv.addEventListener('load',bnScheduleContentWarningRelayout,true);
    window.addEventListener('resize',bnScheduleContentWarningRelayout);
  }

  var _bnApplyContentWarningsAdaptiveBase=applyContentWarnings;
  applyContentWarnings=function(messages){
    _bnApplyContentWarningsAdaptiveBase(messages);
    var cv=document.getElementById('canvas');
    if(!cv) return;
    bnEnsureContentWarningRelayoutObserver(cv);
    var active=Array.isArray(messages)&&messages.length>0;
    document.documentElement.classList.toggle('bn-content-warning-active',active);
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||0;
    var ch=cv.offsetHeight||parseFloat(cv.style.height)||0;
    if(!active){
      bnPostContentWarningBounds(cw,ch);
      return;
    }

    var cr=cv.getBoundingClientRect();
    var targets=Array.prototype.slice.call(cv.querySelectorAll('.bn-content-warning-target'));
    var tips=Array.prototype.slice.call(document.querySelectorAll('.bn-content-warning-tip'));
    var extentW=cw, extentH=ch;
    tips.forEach(function(tip,index){
      var dateEl=targets[index];
      if(!dateEl) return;
      tip.style.width='max-content';
      tip.style.maxWidth='760px';
      tip.style.left='0px';
      tip.style.top='0px';
      var tr=tip.getBoundingClientRect();
      var tw=Math.ceil(tr.width||tip.offsetWidth||1);
      var th=Math.ceil(tr.height||tip.offsetHeight||1);
      var dr=dateEl.getBoundingClientRect();
      var dateRect={
        left:dr.left-cr.left,top:dr.top-cr.top,
        width:dr.width,height:dr.height
      };
      var placement=bnChooseContentWarningPlacement(
        dateRect,{width:tw,height:th},{width:cw,height:ch},
        bnCollectContentWarningObstacles(cv,cr,dateEl)
      );
      tip.style.left=placement.left+'px';
      tip.style.top=placement.top+'px';
      tip.dataset.bnPlacement=placement.name;
      extentW=Math.max(extentW,placement.left+tw+8);
      extentH=Math.max(extentH,placement.top+th+8);
    });
    bnPostContentWarningBounds(extentW,extentH);
  };

  /* 最終呈現統一為畫板外下方的同寬警語列：完全不遮擋版型內容，
     只增加預覽高度；文字與按鈕仍使用行內流動排版。 */
  var _bnApplyContentWarningsBoardBottomBase=applyContentWarnings;
  applyContentWarnings=function(messages){
    _bnApplyContentWarningsBoardBottomBase(messages);
    var cv=document.getElementById('canvas');
    if(!cv||!Array.isArray(messages)||!messages.length) return;
    var cw=cv.offsetWidth||parseFloat(cv.style.width)||0;
    var ch=cv.offsetHeight||parseFloat(cv.style.height)||0;
    var gap=8;
    var extentH=ch;
    document.querySelectorAll('.bn-content-warning-tip').forEach(function(tip){
      tip.style.width=cw+'px';
      tip.style.maxWidth=cw+'px';
      tip.style.left='0px';
      tip.style.top=(ch+gap)+'px';
      tip.dataset.bnPlacement='board-bottom';
      extentH=Math.max(extentH,ch+gap+tip.offsetHeight+8);
    });
    bnPostContentWarningBounds(cw,extentH);
  };

  /* 商品框 = 商品本體（不含影子）的範圍。完整圖片（含影子）以百分比定位放大，
     讓商品本體剛好對齊框；框外的影子因 overflow:visible 仍會顯示，圖片不被裁切。 */
  /* 只依框的寬度算一個倍率，寬高都用同一倍率的像素值，圖片比例永遠不會被拉伸。 */
  function bnLayoutProductImg(img){
    var f = img._bnFit, box = img.parentNode;
    if(!f || !box) return;
    var pw = f.pr.w || f.nw;
    var bw = box.offsetWidth || parseFloat(box.style.width) || 1;
    var k = bw / pw;
    img.style.position = 'absolute';
    img.style.width = (f.nw * k) + 'px';
    img.style.height = (f.nh * k) + 'px';
    img.style.left = (-(f.pr.x || 0) * k) + 'px';
    img.style.top = (-(f.pr.y || 0) * k) + 'px';
    img.style.objectFit = 'fill';
    img.style.clipPath = '';
  }
  function bnFitProductImg(img, pr, nw, nh){
    img._bnFit = {pr: pr, nw: nw, nh: nh};
    bnLayoutProductImg(img);
    var box = img.parentNode;
    if(box && window.ResizeObserver && !box._bnRO){
      box._bnRO = new ResizeObserver(function(){ bnLayoutProductImg(img); });
      box._bnRO.observe(box);
    }
  }
  /* 沒有 productRect 時回到 object-fit:contain 模式 */
  function bnResetProductImg(img){
    img._bnFit = null;
    img.style.position = ''; img.style.left = ''; img.style.top = '';
    img.style.width = '100%'; img.style.height = '100%';
    img.style.objectFit = 'contain'; img.style.clipPath = '';
  }
  /* 圖片載入完成的唯一處理：永遠讀「框上目前的 productRect」，不用閉包鎖住舊值。
     （之前旋轉換圖後，新增時留下的 onload 還拿著舊範圍去算新圖，圖片就爆大。） */
  function bnProductImgLoaded(img){
    var box = img.parentNode; if(!box) return;
    var pr = null;
    try{ pr = JSON.parse(box.dataset.productRect || 'null'); }catch(_){ pr = null; }
    if(pr && pr.w && pr.h){
      bnFitProductImg(img, pr, img.naturalWidth || img.width || 1, img.naturalHeight || img.height || 1);
    }else{
      bnResetProductImg(img);
    }
  }
  /* 框的高度永遠由寬度與商品範圍比例決定；沒有 productRect 時回傳 null（沿用原高）。 */
  function bnBoxHeightFor(box, w){
    var pr = null;
    try{ pr = JSON.parse(box.dataset.productRect || 'null'); }catch(_){ pr = null; }
    if(pr && pr.w && pr.h) return w * pr.h / pr.w;
    return null;
  }
  /* 程式改完框尺寸後立刻重排圖片，不只靠 ResizeObserver（它要等下一次 render，
     畫面被隱藏或緊接著截圖時可能來不及）。 */
  function bnRelayoutProductBox(box){
    var img = box && box.querySelector('img');
    if(img && img._bnFit) bnLayoutProductImg(img);
  }
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (_bnEndorserTemplate && (e.data.type === 'bn-text' || e.data.type === 'bn-text-set' ||
        e.data.type === 'bn-logo' || e.data.type === 'bn-logos')) scheduleEndorserArrange();

    if(e.data.type==='bn-content-warning'){
      applyContentWarnings(e.data.messages||[]);
      return;
    }

    if (e.data.type === 'bn-campaign-card-assets') {
      if (!_bnCampaignCardTemplate || !document.body) return;
      var campaignAssets = e.data.assets || {};
      var campaignProduct = campaignAssets.product && campaignAssets.product.src ? campaignAssets.product : null;
      document.body.dataset.campaignCardProductManaged = campaignProduct ? '1' : '0';
      if (campaignProduct) {
        var savedCampaignProductLayout = campaignProduct.layoutById && campaignProduct.layoutById[getCurrentBnId()];
        window.postMessage({
          type:'bn-product-add', id:'campaign-card-workorder-product', src:campaignProduct.src,
          ratio:campaignProduct.ratio || 1, index:0, position:0, sizeScale:1,
          layoutById:campaignProduct.layoutById || null, layout:campaignProduct.layout || null,
          rotate:savedCampaignProductLayout && savedCampaignProductLayout.rotate !== undefined
            ? savedCampaignProductLayout.rotate : (campaignProduct.rotate || 0)
        }, '*');
      } else {
        window.postMessage({type:'bn-product-remove', id:'campaign-card-workorder-product'}, '*');
      }

      var hadCampaignLogo = !!_bnCampaignCardLogoAsset;
      _bnCampaignCardLogoAsset = campaignAssets.logo && campaignAssets.logo.src ? campaignAssets.logo : null;
      if (_bnCampaignCardLogoAsset) {
        window.postMessage({
          type:'bn-logos', logos:[_bnCampaignCardLogoAsset],
          logoLayoutById:_bnCampaignCardLogoAsset.layoutById || campaignAssets.logoLayoutById || {}
        }, '*');
      } else if (hadCampaignLogo) {
        var campaignLogoZone = document.querySelector('.logo範圍,.LOGO範圍');
        if (campaignLogoZone) campaignLogoZone.querySelectorAll('img.bn-logo-img').forEach(function(img){ img.remove(); });
      }
      return;
    }

    if (e.data.type === 'bn-text') {
      var d = e.data.data||{};
      ['品牌名','主標','副標','日期','CampaignCard文案'].forEach(function(cls) {
        if (d[cls]===undefined) return;
        document.querySelectorAll('.'+cls).forEach(function(el) {
          var ct = el.querySelector('.cta-text');
          if(ct) ct.textContent = d[cls];
          else if(cls === 'CampaignCard文案') renderCampaignCardText(el, d[cls]);
          else if(!el.children.length) el.textContent = d[cls];
        });
        /* Search_Image：副標案型七字內 連動副標（雙向同步）*/
        if(cls === '副標'){
          var siEl = document.querySelector('.副標案型七字內');
          if(siEl && !siEl.children.length) {
            siEl.textContent = d[cls];
            if(typeof window._siRelayout === 'function'){
              if(document.fonts && document.fonts.ready){
                document.fonts.ready.then(function(){ window._siRelayout(); });
              } else {
                setTimeout(window._siRelayout, 150);
              }
            }
          }
        }
        if(cls === '副標案型七字內'){
          var subEl = document.querySelector('.副標');
          /* 副標案型七字內 編輯時不反向同步到其他版位的 .副標，由 bn-text-update 統一處理 */
        }
      });
      /* AR：六字內 優先用側欄「AR文案」（BODA 工單 AR 列勾選的文案）；AR 文案沒填才連動副標。
         使用者在 AR 畫布內手動編輯過後（bnManualText），不再被覆蓋──編輯結果保持獨立。
         以前這裡只看副標，AR 文案欄的值根本沒有用到。 */
      var arEl = document.querySelector('.六字內');
      if(arEl && !arEl.children.length && arEl.dataset.bnManualText !== '1'){
        var arText = typeof d['六字內'] === 'string' ? d['六字內'].trim() : '';
        if(arText === '最多六個字內') arText = '';   /* 側欄預設提示字，不算有填 */
        if(arText) arEl.textContent = arText;
        else if(d['副標'] !== undefined) arEl.textContent = d['副標'];
      }
      setTimeout(function(){ try{ refreshOverflowAll(); }catch(_){} }, 0);
      setTimeout(function(){ applyContentWarnings(window.__bnContentWarningMessages||[]); },0);
    }

    /* 畫布直接編輯完成後，父層轉換好再推回來 */
    if (e.data.type === 'bn-text-set') {
      var cls = e.data.field;
      var val = e.data.value;
      if(!cls) return;
      document.querySelectorAll('.'+cls).forEach(function(el) {
        var ct = el.querySelector('.cta-text');
        /* 編輯中不更新，避免跟 contenteditable 衝突 */
        if(el.contentEditable === 'true') return;
        if(ct) ct.textContent = val;
        else if(cls === 'CampaignCard文案') renderCampaignCardText(el, val);
        else if(!el.children.length) el.textContent = val;
      });
      setTimeout(function(){ try{ refreshOverflowAll(); }catch(_){} }, 0);
      setTimeout(function(){ applyContentWarnings(window.__bnContentWarningMessages||[]); },0);
    }

    if (e.data.type === 'bn-overflow-check') {
      try{ refreshOverflowAll(); }catch(_){}
    }

    if (e.data.type === 'bn-color') {
      var c = Object.assign({},e.data.data||{}), cv = document.getElementById('canvas');
      if((_bnFixedWhiteBackgroundTemplate || _bnWhiteCanvasUnderCircleTemplate) && cv){
        cv.style.setProperty('background', '#fff', 'important');
      }
      _bnRestrictedColorKeys.forEach(function(key){
        if(c[key]!==undefined) c[key]=_bnSafeRestrictedColor(key,c[key]);
      });
      _bnLastSafeColors=Object.assign({},_bnLastSafeColors,c);
      if (c.canvasBg) {
        _bnCurrentCanvasBg = c.canvasBg;
        /* 首頁 LOGO 牆與 Campaign Card 固定白底；SearchICON 的圓底（.背景色）仍吃目前選取的背景色，
           圓底之下的 #canvas 已在上面鎖白，這裡不要再把顏色寫到 #canvas。 */
        var canvasBgForLayout = _bnFixedWhiteBackgroundTemplate ? '#fff' : c.canvasBg;
        /* 支援 .背景色 和 .bg 兩種 class 名稱 */
        var bg = cv.querySelector('.背景色') || cv.querySelector('.bg') || cv.querySelector('.底色');
        if(bg) bg.style.setProperty('background-color', canvasBgForLayout, 'important');
        else if(!_bnWhiteCanvasUnderCircleTemplate) cv.style.setProperty('background', canvasBgForLayout, 'important');
        /* 漸層顏色跟著背景色同步（讀 CSS --grad-dir 變數）*/
        /* 漸層顏色同步：transparent → rgba(r,g,b,0) 避免截圖變黑 */
        function _toRgba0rt(color){
          var m=color.match(/rgb[a]?\((\d+),\s*(\d+),\s*(\d+)/);
          if(m) return 'rgba('+m[1]+','+m[2]+','+m[3]+',0)';
          var h=color.replace('#','');
          if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
          if(h.length===6) return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+',0)';
          return 'rgba(0,0,0,0)';
        }
        var _dirsRt = {'漸層左':'to right','漸層右':'to left','漸層上':'to bottom','漸層下':'to top'};
        ['漸層左','漸層右','漸層上','漸層下'].forEach(function(cls){
          var gel = cv.querySelector('.'+cls);
          if(!gel) return;
          var dir = _dirsRt[cls] || window.getComputedStyle(gel).getPropertyValue('--grad-dir').trim();
          if(dir){
            /* ────────── 漸層 1px 接縫修正 ──────────
               症狀：漸層區塊的「最後 1 像素列/行」會整條變成不透明的畫布底色，
                     在底圖上看起來就是一條橫線／直線。只有部分使用者會遇到。
               主因：background-image 預設 background-repeat: repeat。
                     當漸層 tile 的尺寸換算成裝置像素出現小數（畫布 scale 為
                     任意小數、或 Windows 顯示縮放 125%/150% 使 devicePixelRatio
                     非整數）時，元素最後一列會取樣到「下一塊 tile 的 0%」，
                     也就是完全不透明的底色 → 出現色帶。
                     這裡原本用 background 簡寫，簡寫會把 background-repeat
                     重設回 repeat，就算 CSS 有寫 no-repeat 也會被蓋掉。
               修正 1：改用 backgroundImage，並明確指定 no-repeat。
               修正 2：漸層的 alpha 提早在邊緣前 GRAD_SAFE_PX 就歸零，
                     讓元素邊緣是純透明，抗鋸齒也不會有殘影。
               ──────────────────────────────────── */
            var GRAD_SAFE_PX = 8;
            var _vert = (dir === 'to bottom' || dir === 'to top');
            var _size = _vert ? gel.offsetHeight : gel.offsetWidth;
            var _stop = (_size > GRAD_SAFE_PX)
                        ? (((_size - GRAD_SAFE_PX) / _size) * 100).toFixed(3)
                        : 100;
            var _c0 = _toRgba0rt(canvasBgForLayout);
            gel.style.backgroundColor  = 'transparent';
            gel.style.backgroundImage  = 'linear-gradient(' + dir + ', ' + canvasBgForLayout + ' 0%, '
                                         + _c0 + ' ' + _stop + '%, ' + _c0 + ' 100%)';
            gel.style.backgroundRepeat = 'no-repeat';
            gel.style.backgroundSize   = '100% 100%';
          }
        });
        /* 所有保護色塊跟著背景色同步 */
        ['.文案保護','.右側保護','.左側保護','.上方保護','.下方保護','.上保護','.下保護','.底色'].forEach(function(sel){
          var el = cv.querySelector(sel);
          if(el) el.style.setProperty('background', canvasBgForLayout, 'important');
        });
        /* .bg 純色塊也同步（Coin 等版位） */
        var bgEl2 = cv.querySelector('.bg');
        if(bgEl2 && !cv.querySelector('.背景色')) bgEl2.style.setProperty('background-color', canvasBgForLayout, 'important');
      }
      /* 背景色更新後，人物專用漸層也要重新讀取目前版型的漸層顏色。 */
      syncAllCharGradientOverlays();
      /* 代言人小字的自動黑白字跟著背景色重算 */
      if(c.canvasBg) refreshEndorserNoteColorSoon();
      function ac(cls,col){ if(!col)return; document.querySelectorAll('.'+cls).forEach(function(el){ if(!el.querySelector('.cta-text')) el.style.setProperty('color',col,'important'); }); }
      ac('主標',c.mainText); ac('副標',c.subText); ac('日期',c.dateText); ac('品牌名',c.brandText);
      ac('CampaignCard文案','#990000');
      /* Search_Image：副標案型七字內 顏色跟著副標文字色連動 */
      document.querySelectorAll('.副標案型七字內').forEach(function(el){ if(c.subText) el.style.setProperty('color', c.subText, 'important'); });
      /* AR：六字內 顏色固定跟著副標文字色連動（僅文字內容獨立，顏色仍預設連動） */
      document.querySelectorAll('.六字內').forEach(function(el){ if(c.subText) el.style.setProperty('color', c.subText, 'important'); });
      var normalCtaText = c.ctaTextAuto === false && c.ctaText
        ? c.ctaText
        : _bnCtaForegroundForBg(c.ctaBg, c.mainText, c.canvasBg);
      var searchImageCtaText = c.searchImageCtaText || (c.ctaTextAuto === false && c.ctaText
        ? c.ctaText
        : _bnCtaForegroundForBg(c.searchImageCtaBg, c.mainText, c.canvasBg));
      document.querySelectorAll('.cta-text').forEach(function(el){ el.style.setProperty('color',normalCtaText,'important'); });
      document.querySelectorAll('.cta-arrow').forEach(function(el){ el.style.setProperty('border-left-color',normalCtaText,'important'); });
      /* CTA 底色：.逛逛去按鈕 / .cta底 / .逛逛去底 */
      document.querySelectorAll('.逛逛去按鈕,.cta底,.逛逛去底').forEach(function(el){ if(c.ctaBg) el.style.setProperty('background-color',c.ctaBg,'important'); });
      /* Search Image CTA 底色：只影響 Search_Image 版型的圓形 CTA */
      document.querySelectorAll('.cta圓底').forEach(function(el){ if(c.searchImageCtaBg) el.style.setProperty('background-color', c.searchImageCtaBg, 'important'); });
      if(c.tagColor){
        if(typeof window._bnSetTagColor === 'function') window._bnSetTagColor(c.tagColor);
        else {
          _bnTagColor = (c.tagColor === 'white') ? 'white' : 'red';
          if(typeof window._bnApplyTag === 'function') window._bnApplyTag();
        }
      }
      /* CTA 文字色：.放心買_安心退 / .逛逛去 */
      document.querySelectorAll('.放心買_安心退,.逛逛去,.cta符號').forEach(function(el){ el.style.setProperty('color',normalCtaText,'important'); });
      /* CTA 三角色：.cta三角標 / .逛逛去三角標 */
      document.querySelectorAll('.cta三角標').forEach(function(el){ el.style.setProperty('border-left-color',normalCtaText,'important'); });
      document.querySelectorAll('.逛逛去三角標').forEach(function(el){ el.style.setProperty('border-left-color',normalCtaText,'important'); });
      document.querySelectorAll('.cta三角箭頭').forEach(function(el){ el.style.setProperty('border-left-color',searchImageCtaText,'important'); });
      _bnEnforceRestrictedColors(cv);
    }

    if (e.data.type === 'bn-logo' || e.data.type === 'bn-logos') {
      var zone = null;
      /* Search_Image2：依 logo index 分左右 zone */
      var _fname2 = decodeURIComponent(location.pathname.split('/').pop()).toLowerCase();
      if(_fname2.indexOf('search_image2') !== -1 || _fname2.indexOf('search_image3') !== -1){
        var logos2 = Array.isArray(e.data.logos) ? e.data.logos :
                     (e.data.src ? [e.data] : []);
        var _is3 = _fname2.indexOf('search_image3') !== -1;
        /* 2logo：左/右；3logo：左/中/右 */
        var _zoneNames = _is3
          ? ['logo範圍_左','logo範圍_中','logo範圍_右']
          : ['logo範圍_左','logo範圍_右'];
        function _siPlaceLogo(zn, lg){
          if(!zn||!lg) return;
          Array.from(zn.querySelectorAll('img.bn-logo-img')).forEach(function(i){i.remove();});
          zn.style.background = 'transparent'; zn.style.opacity = '1'; zn.style.overflow = 'hidden';
          zn.style.display = 'flex'; zn.style.alignItems = 'center'; zn.style.justifyContent = 'center';
          var img = new Image(); img.className = 'bn-logo-img';
          img.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;pointer-events:none;display:block;';
          if(lg.round) img.style.borderRadius = '10px';
          img.src = lg.src;
          zn.appendChild(img);
        }
        _zoneNames.forEach(function(cls, i){
          var zn = document.querySelector('.'+cls);
          if(logos2[i]) _siPlaceLogo(zn, logos2[i]);
        });
        return;
      }
      ['logo範圍','LOGO範圍'].forEach(function(n){ if(!zone){ var z=document.querySelector('.'+n); if(z) zone=z; } });
      if (!zone) return;

      Array.from(zone.querySelectorAll('img.bn-logo-img')).forEach(function(i){i.remove();});
      /* 還原 display 避免舊設定殘留 */
      zone.style.display = ''; zone.style.alignItems = '';

      var fn = decodeURIComponent(location.pathname.split('/').pop());
      var fnLow = fn.toLowerCase();
      var _logoZone = document.querySelector('.logo範圍') || document.querySelector('.LOGO範圍');
      var _logoIsWide = _logoZone &&
        (parseFloat(window.getComputedStyle(_logoZone).width) >
         parseFloat(window.getComputedStyle(_logoZone).height) * 1.5);
      /* HBN：檔名含 hbn，或已知左對齊版位 → 左對齊 absolute 並排 */
      var _leftAlignNames = ['hbn','coin','fb_post','lpbn','ams','sba','活動總覽'];
      var _isLeftAlign = _leftAlignNames.some(function(n){ return fnLow.indexOf(n) !== -1; });
      var isHBN = _isLeftAlign;
      /* 多張置中：logo範圍是橫條 且 不是左對齊版位 → flex 置中並排（ddcard橫、IG橫等）*/
      var isMultiCenter = !isHBN && !!_logoIsWide;
      /* IG方/ddcard方/Search_Image/SearchICON 系列：單張 contain 置中。
         SearchICON_LOGO、SearchICON_120 這類小圓形 ICON 版位只有一個小圖示位，
         不管上傳幾張 LOGO，都只能放進第一張，不然多張擠在一起會裁切、看不清楚。 */
      var isIGSquare = !isHBN && !isMultiCenter &&
        (fn.indexOf('方') !== -1 || fnLow.indexOf('search_image') !== -1 || fnLow.indexOf('searchicon') !== -1);
      /* ddcard：檔名含 ddcard */
      var isDDCard = fnLow.indexOf('ddcard') !== -1;
      /* 方 Logo 系列：不依「橫 Logo」文字判斷，而是針對實際上傳圖片比例做 fit。 */
      var isSquareLogoLayout = (fn.indexOf('方') !== -1);

      var logos = [];
      if (e.data.type === 'bn-logos') logos = e.data.logos || [];
      else if (e.data.dataUrl) logos = [{id:'single', src:e.data.dataUrl}];
      if (_bnCampaignCardTemplate && _bnCampaignCardLogoAsset) logos = [_bnCampaignCardLogoAsset];

      if (!logos.length) {
        zone.style.opacity='';
        zone.style.background = (_bnCampaignCardTemplate || _bnSearchIconLogoTemplate) ? '#fff' : '';
        if(_bnCampaignCardTemplate || _bnSearchIconLogoTemplate) zone.style.setProperty('background','#fff','important');
        return;
      }

      /* IG方 / 方 Logo 系列：只取第一張，避免方版 logo 區多張擠壓或裁切。 */
      if (isIGSquare || isSquareLogoLayout) logos = logos.slice(0, 1);
      /* AR_LOGO / 首頁LOGO牆：固定只顯示第一個 LOGO */
      if (_bnSingleLogoTemplate) logos = logos.slice(0, 1);
      /* ddcard橫：isMultiCenter → 多張，不限制；ddcard方（isIGSquare）→ 單張 */

      /* 首頁LOGO牆與 Campaign Card 的 LOGO 範圍是白色圓角卡片，不是上傳前的
         提示色塊，所以放入 LOGO 後仍要維持白底，不能跟其他版位一樣被清成透明。 */
      zone.style.background = (_bnSingleProductForLogoWallTemplate || _bnSearchIconLogoTemplate || _bnCampaignCardTemplate) ? '#fff' : 'transparent';
      if(_bnSearchIconLogoTemplate || _bnCampaignCardTemplate) zone.style.setProperty('background','#fff','important');
      zone.style.opacity    = '1';
      /* 不覆蓋 position，保持 CSS 的 absolute 定位 */
      zone.style.overflow   = 'hidden';

      function _fitHorizontalLogos(logosToPlace, alignMode){
        var gap = 15;
        var zoneW = parseFloat(window.getComputedStyle(zone).width) || 490;
        var zoneH = parseFloat(window.getComputedStyle(zone).height) || 50;
        var logoFitH = _bnCampaignCardTemplate ? Math.min(29, zoneH) : zoneH;
        var maxTotal = Math.min(490, zoneW);
        var imgs = [];
        /* 不要把 CSS 的 position:absolute 覆蓋成 relative。
           ddcard 橫 logo 的 .logo範圍 原本靠 CSS absolute 定位；
           工單匯入後 iframe 會重建並重新套 logo，如果這裡改成 relative，
           logo 區會掉回正常文件流，造成畫布上的 logo 往下偏移。 */
        var _zonePos = window.getComputedStyle(zone).position;
        if(!_zonePos || _zonePos === 'static') zone.style.position = 'relative';
        zone.style.overflow = 'visible';
        zone.style.display = 'block';
        zone.style.alignItems = '';
        zone.style.justifyContent = '';
        zone.style.gap = '';
        zone.style.transformOrigin = '';
        function relayout(){
          var widths = imgs.map(function(img){
            var ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
            return Math.min(_bnCampaignCardTemplate ? 182 : 200, Math.max(1, Math.round(logoFitH * ratio)));
          });
          var total = widths.reduce(function(a,b){ return a + b; }, 0) + gap * Math.max(0, widths.length - 1);
          var scale = total > maxTotal ? (maxTotal - gap * Math.max(0, widths.length - 1)) / Math.max(1, widths.reduce(function(a,b){ return a + b; }, 0)) : 1;
          if(scale < 0) scale = maxTotal / Math.max(1, total);
          widths = widths.map(function(w){ return Math.max(1, Math.floor(w * Math.min(1, scale))); });
          total = widths.reduce(function(a,b){ return a + b; }, 0) + gap * Math.max(0, widths.length - 1);
          var x = alignMode === 'center' ? Math.max(0, (zoneW - total) / 2) : 0;
          imgs.forEach(function(img, i){
            if(img.dataset.manualLayout === '1'){ x += widths[i] + gap; return; }
            img.style.position = 'absolute';
            img.style.left = Math.round(x) + 'px';
            img.style.top = '50%';
            img.style.transform = 'translateY(-50%)';
            img.style.width = widths[i] + 'px';
            img.style.height = 'auto';
            img.style.maxWidth = (_bnCampaignCardTemplate ? 182 : 200) + 'px';
            img.style.maxHeight = _bnCampaignCardTemplate ? (logoFitH + 'px') : '100%';
            img.style.objectFit = 'contain';
            img.style.objectPosition = alignMode === 'center' ? 'center center' : 'left center';
            img.style.pointerEvents = 'none';
            img.style.display = 'block';
            x += widths[i] + gap;
          });
        }
        logosToPlace.forEach(function(lg){
          var img = new Image(); img.className = 'bn-logo-img';
          if(lg.round) img.style.borderRadius = '10px';
          img.onload = relayout;
          img.src = lg.src;
          imgs.push(img);
          zone.appendChild(img);
        });
        relayout();
      }

      /* HBN：absolute 多張；IG方/ddcard方：單張 contain 正方；IG橫/ddcard橫：受限並排 */
      if(isSquareLogoLayout){
        /* 方 Logo 系列：若上傳的是橫向 logo，改以寬度為主、高度 auto，並上下左右置中，避免被裁切。 */
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';
        zone.style.gap = '';
        zone.style.transformOrigin = '';
        var sqLg = logos[0];
        var sqImg = new Image(); sqImg.className = 'bn-logo-img';
        var sqRoundCss = sqLg.round ? 'border-radius:10px;' : '';
        sqImg.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;object-position:center center;pointer-events:none;display:block;flex-shrink:1;'+sqRoundCss;
        sqImg.onload = function(){
          var isWideLogo = sqImg.naturalWidth > sqImg.naturalHeight;
          if(isWideLogo){
            sqImg.style.width = '100%';
            sqImg.style.height = 'auto';
            sqImg.style.maxWidth = '100%';
            sqImg.style.maxHeight = '100%';
          }else{
            sqImg.style.width = 'auto';
            sqImg.style.height = 'auto';
            sqImg.style.maxWidth = '100%';
            sqImg.style.maxHeight = '100%';
          }
          if(typeof window._siRelayout === 'function'){
            if(document.fonts && document.fonts.ready){
              document.fonts.ready.then(function(){ window._siRelayout(); });
            } else {
              setTimeout(window._siRelayout, 150);
            }
          }
        };
        sqImg.src = sqLg.src;
        zone.appendChild(sqImg);
      } else if(isHBN){
        /* 橫式左齊：單張最多 200px；多 LOGO 含 15px 間距總寬最多 490px，且不超過 logo 範圍，避免裁切。 */
        _fitHorizontalLogos(logos, 'left');
      } else if(isMultiCenter){
        /* 橫式置中：單張最多 200px；多 LOGO 含 15px 間距總寬最多 490px，且不超過 logo 範圍，避免裁切。 */
        _fitHorizontalLogos(logos, 'center');
      } else if(isIGSquare){
        /* IG方：單張，依較大邊 contain 縮放，置中不裁切 */
        zone.style.display = 'flex';
        zone.style.alignItems = 'center';
        zone.style.justifyContent = 'center';
        zone.style.transformOrigin = '';
        var lg0 = logos[0];
        var img0 = new Image(); img0.className = 'bn-logo-img';
        var roundCss0 = lg0.round ? 'border-radius:10px;' : '';
        /* max-width/max-height 100% + width/height auto = contain 效果，不裁切 */
        img0.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;pointer-events:none;display:block;'+roundCss0;
        img0.src = lg0.src;
        img0.onload = function(){
          if(typeof window._siRelayout === 'function'){
              if(document.fonts && document.fonts.ready){
                document.fonts.ready.then(function(){ window._siRelayout(); });
              } else {
                setTimeout(window._siRelayout, 150);
              }
            }
        };
        zone.appendChild(img0);
      } else {
        /* 其他橫式：單張最多 200px；多 LOGO 含 15px 間距總寬最多 490px，且不超過 logo 範圍，避免裁切。 */
        _fitHorizontalLogos(logos, 'center');
      }

      if(_bnSingleLogoTemplate){
        /* _fitHorizontalLogos()／isIGSquare 分支都會把 zone.style.overflow
           設回 'visible'（避免初始排版誤裁切），但首頁LOGO牆／AR_LOGO 這類
           單張 LOGO 版位滾輪放大時是靠拿掉 max-width/height 限制、直接放大
           img 尺寸做到「持續放大」，因此這裡要強制蓋回 hidden，讓放大後超出
           logo範圍的部分被遮色裁掉，而不是整張圖片一起放大跑出版位外。 */
        zone.style.overflow = 'hidden';

        /* 滾輪縮放／左鍵拖曳都改成「設計座標」（除掉畫布顯示縮放），並在每次
           調整後把位置大小回報給外層（bn-searchicon-logo-layout-update 是
           外層記錄單張 LOGO 版面的通用訊息）。下載時外層會重送 bn-logos 讓
           iframe 重建，沒有回報＋還原的話，LOGO 就會回到預設大小與位置。 */
        var _logoWallScale = function(){
          var dw = zone.offsetWidth || 1;
          return (zone.getBoundingClientRect().width / dw) || 1;
        };
        var _logoWallTakeOver = function(img){
          if(img.dataset.manualLayout === '1') return;
          var S = _logoWallScale();
          var zr = zone.getBoundingClientRect();
          var ir = img.getBoundingClientRect();
          var w = ir.width / S, h = ir.height / S;
          img.dataset.manualLayout = '1';
          img.dataset.ratio = (w && h) ? w / h : 1;
          img.style.position = 'absolute';
          img.style.transform = 'none';
          img.style.width = w + 'px';
          img.style.height = h + 'px';
          img.style.maxWidth = 'none';
          img.style.maxHeight = 'none';
          img.style.left = ((ir.left - zr.left) / S) + 'px';
          img.style.top = ((ir.top - zr.top) / S) + 'px';
        };
        var _logoWallPostLayout = function(img){
          try{
            window.parent.postMessage({
              type:_bnCampaignCardTemplate && _bnCampaignCardLogoAsset
                ? 'bn-campaign-card-logo-layout-update' : 'bn-searchicon-logo-layout-update',
              bnid:getCurrentBnId(),
              layout:{
                left: parseFloat(img.style.left) || 0, top: parseFloat(img.style.top) || 0,
                width: parseFloat(img.style.width) || 0, height: parseFloat(img.style.height) || 0
              }
            }, '*');
          }catch(_){}
        };

        /* 外層重送 LOGO 時帶回先前存的版面：還原位置與大小。寬度沿用、高度交給
           圖片比例，避免換成不同比例的新 LOGO 時被拉伸。 */
        var _campaignSavedLogoLayout = _bnCampaignCardTemplate && _bnCampaignCardLogoAsset &&
          _bnCampaignCardLogoAsset.layoutById && _bnCampaignCardLogoAsset.layoutById[getCurrentBnId()];
        var _savedLogoLayout = _campaignSavedLogoLayout ||
          (e.data.logoLayoutById && e.data.logoLayoutById[getCurrentBnId()]);
        var _logoImgNow = zone.querySelector('img.bn-logo-img');
        if(_savedLogoLayout && _logoImgNow && _savedLogoLayout.width > 0
           && isFinite(_savedLogoLayout.left) && isFinite(_savedLogoLayout.top)){
          _logoImgNow.dataset.manualLayout = '1';
          _logoImgNow.dataset.ratio = _savedLogoLayout.height > 0 ? _savedLogoLayout.width / _savedLogoLayout.height : 1;
          _logoImgNow.style.position = 'absolute';
          _logoImgNow.style.transform = 'none';
          _logoImgNow.style.width = _savedLogoLayout.width + 'px';
          _logoImgNow.style.height = 'auto';
          _logoImgNow.style.maxWidth = 'none';
          _logoImgNow.style.maxHeight = 'none';
          _logoImgNow.style.left = _savedLogoLayout.left + 'px';
          _logoImgNow.style.top = _savedLogoLayout.top + 'px';
        }

        /* 這個 if 區塊在每次收到 bn-logo／bn-logos 訊息時都會重新執行一次
           （同一個 zone 元素不會被移除重建），如果每次都 addEventListener
           會疊加出多個監聽器，同一次滾輪就會被放大好幾次（越用越暴衝）。
           用 dataset 記一個旗標，確保整個版位存活期間只綁定一次。 */
        if(!zone.dataset.bnWheelBound){
          zone.dataset.bnWheelBound = '1';
          zone.style.cursor = 'move';
          zone.addEventListener('wheel', function(e){
            e.preventDefault();
            var img = zone.querySelector('img.bn-logo-img');
            if(!img) return;
            _logoWallTakeOver(img);
            var sc = e.deltaY < 0 ? 1.08 : .93;
            var r = parseFloat(img.dataset.ratio) || 1;
            var curW = parseFloat(img.style.width) || img.offsetWidth;
            var curH = parseFloat(img.style.height) || img.offsetHeight;
            var w = Math.max(10, curW * sc);
            var ih = w / r;
            /* 以縮放前的中心點為基準，從中心放大／縮小 */
            var cx = (parseFloat(img.style.left) || 0) + curW / 2;
            var cy = (parseFloat(img.style.top) || 0) + curH / 2;
            img.style.width = w + 'px';
            img.style.height = ih + 'px';
            img.style.left = (cx - w/2) + 'px';
            img.style.top = (cy - ih/2) + 'px';
            _logoWallPostLayout(img);
          }, {passive: false});
          zone.addEventListener('mousedown', function(e){
            if(e.button !== 0) return;
            var img = zone.querySelector('img.bn-logo-img');
            if(!img) return;
            e.preventDefault();
            _logoWallTakeOver(img);
            var S = _logoWallScale();
            var startX = e.clientX, startY = e.clientY;
            var startLeft = parseFloat(img.style.left) || 0, startTop = parseFloat(img.style.top) || 0;
            function onMove(ev){
              img.style.left = (startLeft + (ev.clientX - startX) / S) + 'px';
              img.style.top = (startTop + (ev.clientY - startY) / S) + 'px';
            }
            function onUp(){
              window.removeEventListener('mousemove', onMove, true);
              window.removeEventListener('mouseup', onUp, true);
              _logoWallPostLayout(img);
            }
            window.addEventListener('mousemove', onMove, true);
            window.addEventListener('mouseup', onUp, true);
          });
        }
      }
    }

    /* 商品新增 */
    if (e.data.type === 'bn-product-add') {
      if (_bnCampaignCardTemplate && document.body.dataset.campaignCardProductManaged === '1' &&
          e.data.id !== 'campaign-card-workorder-product') return;
      var pzone = getProductZone(); if(!pzone) return;
      var oldBox = pzone.querySelector('.bn-prod-box[data-id="'+e.data.id+'"]');
      /* 下載以畫布當下的排版為準：既有商品不能刪掉後再走 layoutProducts，
         否則手動擺在有效連動範圍之外的商品會被重新 clamp 到窄區域內。
         也保留同一個 img，避免三張商品在下載前一起閃爍。 */
      if(oldBox && e.data.preserveExistingLayout === true){
        bnRelayoutProductBox(oldBox);
        return;
      }
      if(oldBox){
        if(oldBox._bnRO){ try{ oldBox._bnRO.disconnect(); }catch(_){ } }
        oldBox.remove();
      }
      pzone.style.background = 'transparent'; pzone.style.backgroundColor = 'transparent'; pzone.style.opacity = '1';
      if(_bnSearchIconProductTemplate){
        /* 圓形商品圖遮色區維持白底，不透出 SearchICON 的背景色。 */
        pzone.style.setProperty('background-color','#fff','important');
        pzone.style.setProperty('background-image','none','important');
      }
      pzone.style.overflow = 'visible'; pzone.style.position = 'relative';
      var box = document.createElement('div');
      box.className = 'bn-prod-box'; box.dataset.id = e.data.id;
      if (_bnCampaignCardTemplate && e.data.id === 'campaign-card-workorder-product') {
        box.dataset.campaignCardProduct = '1';
      }
      /* 若有 productRect（商品本身不含影子），用它計算框的比例；
         否則建立一個臨時的（與完整圖片相同，稍後 update-image 會更新） */
      var productRect = e.data.productRect;
      var boxRatio = e.data.ratio||1;
      if(productRect){
        boxRatio = productRect.w / Math.max(1, productRect.h);
        box.dataset.productRect = JSON.stringify(productRect);
      }
      box.dataset.ratio = boxRatio;
      box.dataset.imageRatio = e.data.ratio||1; /* 完整圖片的比例（含影子）*/
      box.dataset.sizeScale = e.data.sizeScale||1;
      box.dataset.position  = e.data.position !== undefined ? e.data.position : e.data.index || 0;
      if(e.data.layoutById || e.data.layout){
        var __bnid = getCurrentBnId();
        var __lay = (e.data.layoutById && (__bnid in e.data.layoutById) ? e.data.layoutById[__bnid] : null) || e.data.layout || null;
        /* 首頁LOGO牆：只有在LOGO牆上親手調過（wallManual）的位置才還原，其餘一律重新置中 */
        if(__lay && _bnHomepageLogoWallTemplate && !__lay.wallManual) __lay = null;
        if(__lay){
          box.dataset.savedLayout = JSON.stringify(__lay);
          box.dataset.manualLayout = '1';
          if(_bnHomepageLogoWallTemplate) box.dataset.wallManual = '1';
        }
      }
      /* 先依傳來的 zOrder 給一個暫時的 z-index（zOrder 小 = 上層），讓新加入的商品
         在 bn-product-zorder 送到之前就跟工具列的上下順序一致，不會先以 DOM 順序
         （後加的蓋前面的）閃一下；之後 bn-product-zorder 會再統一覆寫。 */
      if(e.data.zOrder !== undefined && e.data.zOrder !== null){
        box.style.zIndex = String(Math.max(11, 200 - (parseInt(e.data.zOrder, 10) || 0)));
      }
      var pimg = document.createElement('img');
      pimg.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;';
      box.dataset.rotate = String(Number(e.data.rotate) || 0);
      /* 載入後依框上的 productRect 把商品本體對齊框（影子露在框外）；
         之後換圖也走同一個 handler，不會拿到舊範圍。 */
      pimg.onload = function(){
        if (_bnCampaignCardTemplate && box.dataset.campaignCardProduct === '1') {
          var savedRotate = parseFloat(box.dataset.rotate) || 0;
          if (savedRotate) {
            pimg.style.transformOrigin = '50% 50%';
            pimg.style.transform = 'rotate(' + savedRotate + 'deg)';
          }
          if (!productRect && pimg.naturalWidth && pimg.naturalHeight) {
            box.dataset.ratio = String(pimg.naturalWidth / pimg.naturalHeight);
            box.dataset.imageRatio = box.dataset.ratio;
            if (box.dataset.manualLayout !== '1') layoutProducts(pzone);
          }
        }
        bnProductImgLoaded(pimg);
      };
      pimg.src = e.data.src;
      box.appendChild(pimg);
      /* 旋轉把手：框正上方一條短桿接一顆圓鈕，拖曳繞框中心旋轉（Canva／Figma 慣例）。
         角度不在這裡烘進圖片，只做即時 CSS 預覽；放開後把增量送回父頁，由父頁
         走 baseSrc → 旋轉 → 影子 的管線重算，再用 bn-product-update-image 換圖。 */
      var rh = document.createElement('div'); rh.dataset.rotateHandle = '1';
      rh.title = '拖曳旋轉（Shift：每 15°；雙擊：回到 0°）';
      rh.style.cssText = 'position:absolute;left:50%;top:-34px;width:20px;height:34px;margin-left:-10px;z-index:6;cursor:grab;touch-action:none;';
      rh.innerHTML = '<div style="position:absolute;left:50%;top:18px;width:2px;height:16px;margin-left:-1px;background:#4a90e2;"></div>'
        + '<div style="position:absolute;left:50%;top:0;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff;border:2px solid #4a90e2;box-sizing:border-box;color:#4a90e2;font:bold 11px/14px sans-serif;text-align:center;">&#8635;</div>';
      box.appendChild(rh);
      var rb = document.createElement('div'); rb.dataset.rotateBadge = '1';
      rb.style.cssText = 'position:absolute;left:50%;top:-58px;transform:translateX(-50%);display:none;padding:2px 7px;border-radius:10px;background:rgba(20,24,33,.9);color:#fff;font:600 11px/16px sans-serif;white-space:nowrap;pointer-events:none;z-index:7;';
      box.appendChild(rb);
      ['nw','ne','sw','se'].forEach(function(c){
        var h = document.createElement('div'); h.dataset.corner = c;
        h.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#4a90e2;border:2px solid #fff;z-index:5;'
          +(c==='nw'?'left:-7px;top:-7px;cursor:nwse-resize;':'')
          +(c==='ne'?'right:-7px;top:-7px;cursor:nesw-resize;':'')
          +(c==='sw'?'left:-7px;bottom:-7px;cursor:nesw-resize;':'')
          +(c==='se'?'right:-7px;bottom:-7px;cursor:nwse-resize;':'');
        box.appendChild(h);
      });
      pzone.appendChild(box);
      setupProdDrag(box, pzone);
      layoutProducts(pzone);
      applyCharacterZ();
      applySingleProductOnlyIfNeeded(pzone);
    }

    if (e.data.type === 'bn-product-remove') {
      var pzone = getProductZone(); if(!pzone) return;
      var el = pzone.querySelector('.bn-prod-box[data-id="'+e.data.id+'"]');
      if(el){ if(el._bnRO){ try{ el._bnRO.disconnect(); }catch(_){ } } el.remove(); }
      var remaining = pzone.querySelectorAll('.bn-prod-box');
      /* 商品全部移除時，只有「人物圖也沒有」才把提示色還原成預設淡紅；
         如果還有人物圖存在，代表這個範圍其實還有內容，不能還原成淡紅提示色。 */
      if(!remaining.length && !pzone.querySelector('.bn-char-box')) { pzone.style.background=''; pzone.style.opacity=''; }
      else if(remaining.length) layoutProducts(pzone);
      if(_bnSearchIconProductTemplate){
        pzone.style.setProperty('background-color','#fff','important');
        pzone.style.setProperty('background-image','none','important');
      }
      applyCharacterZ();
      applySingleProductOnlyIfNeeded(pzone);
    }

    /* 只換圖片內容（去背/裁切/擦除/影子外掛編輯器完成後用），完全不動商品目前的
       位置/大小/上下層——跟 bn-character-update-image 是同一套邏輯，避免像
       bn-product-remove+bn-product-add 那樣整個重建造成畫面閃跳、跳回預設位置。
       ★ 這是修補「編輯去背/影子後，畫面沒有變、下載卻是對的」這個問題的關鍵：
       bn-editor-plugin.js 編輯完成後只會發這則訊息，過去這裡完全沒有處理，
       畫面上的圖片永遠不會更新，只有下載時透過 bn-product-add 重新整批送一次
       商品資料，才會不小心把正確結果帶出來。 */
    if (e.data.type === 'bn-product-update-image') {
      var pzoneU = getProductZone(); if(!pzoneU) return;
      var boxU = pzoneU.querySelector('.bn-prod-box[data-id="'+e.data.id+'"]');
      if(boxU){
        if(e.data.rotate !== undefined && e.data.rotate !== null) boxU.dataset.rotate = String(Number(e.data.rotate) || 0);
        /* 先保存舊的商品範圍，用來換算目前的顯示倍率（覆寫前要先取） */
        var oldPRU = null;
        try{ oldPRU = JSON.parse(boxU.dataset.productRect || 'null'); }catch(_){ oldPRU = null; }
        var prectU0 = e.data.productRect || null;
        /* 更新 productRect（商品範圍不含影子）和 imageRatio（完整圖片含影子）。
           preserveFrame 只代表外框 left/top/width/height 不可動；新影子圖仍須使用
           自己的 productRect，才能把新圖裡的商品本體精準對齊原外框。 */
        if(e.data.productRect){
          boxU.dataset.productRect = JSON.stringify(e.data.productRect);
          boxU.dataset.ratio = String(e.data.productRect.w / Math.max(1, e.data.productRect.h));
        }
        if(e.data.ratio !== undefined) boxU.dataset.imageRatio = String(e.data.ratio);
        var imgU = boxU.querySelector('img');
        if(imgU && e.data.src){
          if(e.data.preserveFrame){
            /* 換背景後重烘商品影子只會改圖片像素，不是一次新的商品編輯。
               先保存外框的完整 inline 狀態；圖片載入後只更新框內圖像對齊，再把
               外框狀態原樣放回，避免任何非同步 onload／ResizeObserver 路徑改到
               使用者已編輯的位置、大小、旋轉、層級或手動排版旗標。 */
            var frameStyleU = boxU.getAttribute('style');
            var frameClassU = boxU.className;
            var manualLayoutU = boxU.dataset.manualLayout;
            imgU.onload = function(){
              bnProductImgLoaded(imgU);
              if(frameStyleU === null) boxU.removeAttribute('style'); else boxU.setAttribute('style', frameStyleU);
              boxU.className = frameClassU;
              if(manualLayoutU === undefined) delete boxU.dataset.manualLayout;
              else boxU.dataset.manualLayout = manualLayoutU;
              if(imgU._bnFit) bnLayoutProductImg(imgU);
            };
            imgU.src = e.data.src;
          }else if(e.data.keepScale && imgU.naturalWidth && imgU.naturalHeight){
            /* 旋轉後換圖：新圖外接矩形變大，若框維持原尺寸、object-fit:contain 會把商品
               看起來縮小。這裡以「舊圖實際顯示倍率」等比換算新框，並以原中心點定位，
               商品視覺大小不變，只是框跟著外接矩形長大／縮小。 */
            var owU = imgU.naturalWidth, ohU = imgU.naturalHeight;
            var bwU = parseFloat(boxU.style.width) || boxU.offsetWidth || 1;
            var bhU = parseFloat(boxU.style.height) || boxU.offsetHeight || 1;
            var blU = parseFloat(boxU.style.left) || 0, btU = parseFloat(boxU.style.top) || 0;
            /* 目前的顯示倍率（畫面 px ÷ 圖片 px）：
               框 = 商品本體時，框寬 = 舊商品寬 × 倍率，所以倍率 = 框寬 ÷ 舊商品寬；
               舊商品寬取「圖片目前實際套用的範圍」，不受 dataset 更新時序影響。
               沒有 productRect（contain 模式）才退回 min(框/圖)。 */
            var fitOld = imgU._bnFit && imgU._bnFit.pr;
            var prOldW = (fitOld && fitOld.w) || (oldPRU && oldPRU.w) || 0;
            var sU = (imgU._bnFit && prOldW > 0) ? bwU / prOldW : Math.min(bwU/owU, bhU/ohU);
            /* 旋轉只繞商品中心；不沿用舊版的 bottom 錨點，避免外接框高度
               改變時整張商品在放開滑鼠的瞬間往上／往下跳。 */
            var anchorXU = blU + bwU / 2;
            var anchorYU = btU + bhU / 2;
            var newSrcU = e.data.src;
            var tmpU = new Image();
            tmpU.onload = function(){
              var prNew = e.data.productRect;
              var nw = prNew ? prNew.w * sU : tmpU.naturalWidth * sU;
              var nh = prNew ? prNew.h * sU : tmpU.naturalHeight * sU;
              /* 先預載新圖，再把框尺寸、圖片 fit、圖片來源與 CSS 預覽旋轉
                 放在同一個畫面更新中。這樣不會先看到「舊圖＋新框」或「新圖＋
                 舊旋轉」的一幀，放開滑鼠時就不會閃跳。 */
              var applyRotatedFrame = function(){
                if(nw > 0 && nh > 0){
                  var csU = window.getComputedStyle(pzoneU);
                  var zwU = parseFloat(csU.width) || pzoneU.offsetWidth || 1;
                  var zhU = parseFloat(csU.height) || pzoneU.offsetHeight || 1;
                  var rN = nw / nh;
                  if(nw > zwU){ nw = zwU; nh = nw / rN; }
                  if(nh > zhU){ nh = zhU; nw = nh * rN; }
                  var lU = Math.max(0, Math.min(zwU - nw, anchorXU - nw/2));
                  var tU = Math.max(0, Math.min(zhU - nh, anchorYU - nh/2));
                  boxU.dataset.manualLayout = '1';
                  boxU.style.left = lU + 'px'; boxU.style.top = tU + 'px';
                  boxU.style.width = nw + 'px'; boxU.style.height = nh + 'px';
                  boxU.dataset.ratio = String(rN);
                }else if(e.data.ratio && !prNew){ boxU.dataset.ratio = e.data.ratio; }
                /* 有 productRect 時，先用新圖尺寸把商品本體對齊框；
                   沒有就回到 contain 模式。onload 一定要換成讀取目前範圍的版本，
                   否則新增時留下的舊 onload 會用舊範圍重算新圖。 */
                var prectU = e.data.productRect;
                if(prectU && tmpU.naturalWidth && tmpU.naturalHeight){
                  bnFitProductImg(imgU, prectU, tmpU.naturalWidth, tmpU.naturalHeight);
                }else{
                  bnResetProductImg(imgU);
                }
                imgU.onload = function(){ bnProductImgLoaded(imgU); };
                imgU.src = newSrcU;
                /* 最後才清掉 CSS 增量旋轉；所有前面的 style 已在同一個 task
                   寫入，瀏覽器不會把中間狀態畫出來。 */
                imgU.style.transform = '';
                postProductLayout(boxU);
              };
              if(window.requestAnimationFrame) window.requestAnimationFrame(applyRotatedFrame);
              else applyRotatedFrame();
            };
            tmpU.onerror = function(){
              imgU.onload = function(){ bnProductImgLoaded(imgU); };
              imgU.src = newSrcU;
              imgU.style.transform = '';
            };
            tmpU.src = newSrcU;
          }else{
            /* 框比例以商品範圍為準（上面已設）；只有沒有 productRect 時才退回完整圖片比例，
               否則角落縮放／滾輪會用含影子的比例算框高，框比商品高、下方空一截。 */
            if(e.data.ratio && !prectU0) boxU.dataset.ratio = e.data.ratio;
            /* 商品範圍比例變了（例如去背後），框寬不動、高度依新比例重算，避免圖片變形 */
            if(prectU0 && prectU0.w && prectU0.h){
              var bwK = parseFloat(boxU.style.width) || boxU.offsetWidth || 1;
              boxU.style.height = (bwK * prectU0.h / prectU0.w) + 'px';
            }
            imgU.style.transform = '';
            /* 設定新圖片時，依 productRect 對齊商品本體 */
            imgU.onload = function(){ bnProductImgLoaded(imgU); };
            imgU.src = e.data.src;
          }
        }
      }
    }

    /* z-index 順序更新：order[0] = 最上層（z 最高） */
    if (e.data.type === 'bn-product-zorder') {
      var pzone = getProductZone(); if(!pzone) return;
      var order = e.data.order || [];
      var total = order.length;
      order.forEach(function(id, i){
        var box = pzone.querySelector('.bn-prod-box[data-id="'+id+'"]');
        if(box) box.style.zIndex = String(total - i + 10);
      });
      applyCharacterZ();
      applySingleProductOnlyIfNeeded(pzone);
    }

    /* ════════════════════════════════════════════════════
       人物圖（bn-character-*）：
       跟商品共用同一個 .商品範圍/.商品圖範圍 zone，但每個人物是獨立、
       可以超出商品範圍甚至超出畫布的單張圖（不受 zone 的 overflow 影響），
       用 .bn-char-box + data-slot（'_bnCharacter' 人物1 / '_bnCharacter2' 人物2）
       跟商品的 .bn-prod-box 區分。
       z-index 規則（詳見 applyCharacterZ()）：
       - 只有 0~1 個人物：該人物跟「目前最上層的商品」比前後，由人物自己的
         aboveMain 決定（true=蓋住商品，false=被商品蓋住）。
       - 2 個人物都存在：商品此時已被 bn-character-visibility 隱藏，兩個人物
         改成只跟彼此比前後，由 bn-character-pair-order 的 pairFirst 決定。
       ★ _bnSingleProductOnlyTemplate（例如 SearchICON_PRODUCT）與首頁 LOGO 牆
       都完全不顯示人物圖，不管全域人物圖狀態如何，一律忽略 bn-character-add。 ════════════════════════════════════════════════════ */
    if (e.data.type === 'bn-character-add') {
      if(_bnSingleProductOnlyTemplate || _bnHomepageLogoWallTemplate){
        var ignoredCharZone = getProductZone();
        if(ignoredCharZone) applySingleProductOnlyIfNeeded(ignoredCharZone);
        return; /* SearchICON_PRODUCT／首頁 LOGO 牆固定不顯示人物圖 */
      }
      var czone = getProductZone(); if(!czone) return;
      var slotKey = e.data.slot;
      if(slotKey !== '_bnCharacter' && slotKey !== '_bnCharacter2') return;
      czone.style.background = 'transparent'; czone.style.opacity = '1';
      if(!czone.style.position) czone.style.position = 'relative';
      var cbox = createCharBox(slotKey, e.data, czone);
      var appliedSaved = false;
      if(e.data.layoutById){
        var __cbnid = getCurrentBnId();
        var __clay = (__cbnid in e.data.layoutById) ? e.data.layoutById[__cbnid] : null;
        if(__clay) appliedSaved = applySavedCharLayout(cbox, czone, __clay);
      }
      if(appliedSaved) cbox.dataset.manualLayout = '1';
      else applyDefaultCharLayout(cbox, czone);
      syncCharGradientOverlay(cbox);
      setupCharDrag(cbox, czone);
      applyCharacterZ();
      setTimeout(function(){ postCharacterLayout(cbox,{snapshotOnly:true}); }, 0);
      return;
    }

    if (e.data.type === 'bn-character-remove') {
      var czone2 = getProductZone(); if(!czone2) return;
      var existing2 = czone2.querySelector('.bn-char-box[data-slot="'+e.data.slot+'"]');
      if(existing2) existing2.remove();
      if(!czone2.querySelector('.bn-char-box') && !czone2.querySelector('.bn-prod-box')){
        czone2.style.background=''; czone2.style.opacity='';
      }
      applyCharacterZ();
      return;
    }

    /* 只換圖片內容（去背/裁切/擦除/影子編輯完成後），完全不動人物圖目前的位置/大小。 */
    if (e.data.type === 'bn-character-update-image') {
      var czone3 = getProductZone(); if(!czone3) return;
      var box3 = czone3.querySelector('.bn-char-box[data-slot="'+e.data.slot+'"]');
      if(box3){
        if(e.data.ratio) box3.dataset.ratio = e.data.ratio;
        var img3 = box3.querySelector('img');
        if(img3 && e.data.src){
          img3.src = e.data.src;
          img3.addEventListener('load', function(){ syncCharGradientOverlay(box3); }, {once:true});
          syncCharGradientOverlay(box3);
        }
      }
      return;
    }

    /* 有人物圖時，商品最多只顯示「目前最上層」的幾件，其餘隱藏（不是移除，
       只是 display:none，移除人物圖後可以直接復原，不用重新排版）。
       _bnSingleProductOnlyTemplate／首頁 LOGO 牆的版位無視這則訊息帶來的可見度規則，
       固定套用自己的「只留指定商品、人物圖完全不顯示」規則。 */
    if (e.data.type === 'bn-character-visibility') {
      var czone4 = getProductZone(); if(!czone4) return;
      if(_bnSingleProductOnlyTemplate || _bnHomepageLogoWallTemplate){ applySingleProductOnlyIfNeeded(czone4); return; }
      var visibleIds = e.data.visibleIds;
      var hasChar = !!e.data.hasChar;
      czone4.querySelectorAll('.bn-prod-box').forEach(function(b){
        if(!hasChar || !visibleIds){ b.style.display = ''; return; }
        b.style.display = (visibleIds.indexOf(b.dataset.id) !== -1) ? '' : 'none';
      });
      /* 誰是「目前最上層可見商品」可能因這次可見度變化而改變，
         人物的 z-index 要重新算一次，不然會停留在舊的最上層商品基準上。 */
      applyCharacterZ();
      return;
    }

    /* 兩個人物都存在時，誰蓋住誰。 */
    if (e.data.type === 'bn-character-pair-order') {
      var czone5 = getProductZone(); if(!czone5) return;
      czone5.dataset.charPairFirst = e.data.pairFirst || '_bnCharacter';
      applyCharacterZ();
      return;
    }

    /* 方/橫配對版位同步人物圖位置——跟商品的 bn-product-layout-apply 一樣，
       唯一差異是「不做邊界 clamp」，因為人物圖本來就可以超出範圍/畫布。 */
    if (e.data.type === 'bn-character-layout-apply') {
      var czone6 = getProductZone(); if(!czone6) return;
      var box6 = czone6.querySelector('.bn-char-box[data-id="'+e.data.id+'"]');
      if(box6 && e.data.layout){
        if(box6.classList.contains('bn-endorser-box')){
          applyEndorserBoxLayout(box6, czone6, e.data.layout);
          box6.dataset.manualLayout = '1';
          arrangeEndorser();
        } else {
          applySavedCharLayout(box6, czone6, e.data.layout);
          box6.dataset.manualLayout = '1';
          syncCharGradientOverlay(box6);
        }
      }
      return;
    }

    /* ════════════════════════════════════════════════════
       代言人（bn-endorser-*）：代言人照、簽名檔、代言人小字。
       照片／簽名檔沿用人物圖的 .bn-char-box（拖曳、縮放、下載截圖、方橫連動、
       版位位置回報都共用），另外加 .bn-endorser-box 與旋轉把手。
       只有 _bnEndorserTemplate 的版位會顯示。 ════════════════════════════════════════════════════ */
    if (e.data.type === 'bn-endorser-add') {
      if(!_bnEndorserTemplate) return;
      var ezone = getProductZone(); if(!ezone) return;
      var eslot = e.data.slot;
      if(eslot !== '_bnEndorserPhoto' && eslot !== '_bnEndorserSign') return;
      ezone.style.background = 'transparent'; ezone.style.opacity = '1';
      ezone.style.overflow = 'visible';
      if(!ezone.style.position) ezone.style.position = 'relative';
      var ebox = createEndorserBox(eslot, e.data, ezone);
      var eApplied = false;
      if(e.data.layoutById){
        var ebnid = getCurrentBnId();
        var elay = (ebnid in e.data.layoutById) ? e.data.layoutById[ebnid] : null;
        if(elay) eApplied = applyEndorserBoxLayout(ebox, ezone, elay);
      }
      if(eApplied) ebox.dataset.manualLayout = '1';
      else {
        applyDefaultEndorserLayout(ebox, ezone);
        endorserSetDefaultBase(ebox, ezone);
        /* 照片比簽名晚到時，還沒被手動調過的簽名要跟著照片重新排一次。 */
        var esign = getEndorserBox('_bnEndorserSign');
        if(eslot === '_bnEndorserPhoto' && esign && esign.dataset.manualLayout !== '1'){
          applyDefaultEndorserLayout(esign, ezone);
          endorserSetDefaultBase(esign, ezone);
          setTimeout(function(){ postCharacterLayout(esign,{snapshotOnly:true}); }, 0);
        }
      }
      syncCharGradientOverlay(ebox);
      applyCharacterZ();
      arrangeEndorser();
      setTimeout(function(){ postCharacterLayout(ebox,{snapshotOnly:true}); }, 0);
      return;
    }

    if (e.data.type === 'bn-endorser-remove') {
      var ezone2 = getProductZone(); if(!ezone2) return;
      var eold = ezone2.querySelector('.bn-endorser-box[data-slot="'+e.data.slot+'"]');
      if(eold) eold.remove();
      if(!ezone2.querySelector('.bn-char-box') && !ezone2.querySelector('.bn-prod-box')){
        ezone2.style.background=''; ezone2.style.opacity='';
      }
      if(!ezone2.querySelector('.bn-endorser-box') && !_bnEndorserNoteState.text) delete ezone2.dataset.endorserAuto;
      applyCharacterZ();
      arrangeEndorser();
      return;
    }

    /* 父頁要求用新規則重新回報一次（舊版暫存轉換）：只在 HBN／LPBN 收到，其他版位會跟著自動配合 */
    if (e.data.type === 'bn-endorser-repost') {
      if(!_bnEndorserTemplate) return;
      var rpPhoto = getEndorserBox('_bnEndorserPhoto');
      var rpSign = getEndorserBox('_bnEndorserSign');
      var rpNote = getEndorserNoteEl(false);
      /* 這個版位用的是預設位置（沒讀到存過的位置）就不轉換，避免把預設值推給其他版位 */
      if(rpPhoto && rpPhoto._bnLayoutSrc === 'default') return;
      if(rpPhoto) postCharacterLayout(rpPhoto, {migrate:true});
      if(rpSign) postCharacterLayout(rpSign, {migrate:true});
      if(rpNote && rpNote.style.display !== 'none' && _bnEndorserNoteState.text && rpNote._bnLayout){
        markEndorserNoteManual(rpNote);
        postEndorserNoteLayout(rpNote, {migrate:true});
      }
      return;
    }

    /* 編輯（裁切／去背／擦除）或旋轉完成後只換圖片內容；旋轉時 keepScale 讓看起來的大小不變。 */
    if (e.data.type === 'bn-endorser-update-image') {
      var ezone3 = getProductZone(); if(!ezone3) return;
      var ebox3 = ezone3.querySelector('.bn-endorser-box[data-slot="'+e.data.slot+'"]');
      if(ebox3) updateEndorserImage(ebox3, e.data);
      return;
    }

    if (e.data.type === 'bn-endorser-note') {
      if(!_bnEndorserTemplate) return;
      applyEndorserNoteMessage(e.data);
      return;
    }

    /* 代言人照在商品前面／後面（左側清單的 ▲▼） */
    if (e.data.type === 'bn-endorser-order') {
      var ezone4 = getProductZone(); if(!ezone4) return;
      var ephoto = ezone4.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
      if(ephoto) ephoto.dataset.aboveMain = e.data.aboveMain ? '1' : '0';
      applyCharacterZ();
      return;
    }

    if (e.data.type === 'bn-endorser-note-layout-apply') {
      if(!_bnEndorserTemplate) return;
      var enote = getEndorserNoteEl(false);
      if(enote){
        enote._bnLayout = e.data.layout ? JSON.parse(JSON.stringify(e.data.layout)) : null;
        var nzone = getProductZone();
        if(e.data.layout && nzone){
          var ninfo = endorserSrcInfo(e.data.layout);
          enote._bnLayoutSrc = ninfo.src;
          nzone.dataset.endorserAuto = ninfo.auto ? '1' : '0';
        }
        arrangeEndorser();
      }
      return;
    }

    /* 背景圖：放到 .背景色（如有）或畫布底層 */
    if (e.data.type === 'bn-bg') {
      /* 若之前套用過 SLAB 底圖，改套一般背景時要還原商品範圍的提示色塊 */
      _bnMarkSlabZone(getProductZone(), false);
      /* 支援 .背景色 和 .bg 兩種 class 名稱 */
      var bgContainer = document.querySelector('.背景色') || document.querySelector('.bg');
      var bimg2 = document.getElementById('底圖');
      var bgSrc   = e.data.src   || null;
      var bgFit   = e.data.fit   || 'auto';
      var bgBasis = e.data.sizeBasis || 'width';
      var bgPositionMode = e.data.positionMode || 'legacy';
      var bgScale = e.data.scale !== undefined ? e.data.scale : 100;
      var bgX     = e.data.x     !== undefined ? e.data.x     : 50;
      var bgY     = e.data.y     !== undefined ? e.data.y     : 50;

      /* SearchICON_LOGO / PRODUCT / TEXT 與首頁 LOGO 牆都不接受背景圖片；
         SearchICON 的圓底跟著目前選取的背景色、圓底之下的畫布固定白色，
         首頁 LOGO 牆則整張固定白色。 */
      if(_bnNoImageBackgroundTemplate){
        var cvSearchIcon = document.getElementById('canvas');
        var noImageBg = _bnFixedWhiteBackgroundTemplate ? '#fff' : _bnCurrentCanvasBg;
        if(!noImageBg){
          noImageBg = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#fff';
        }
        if(cvSearchIcon) cvSearchIcon.style.setProperty('background', _bnWhiteCanvasUnderCircleTemplate ? '#fff' : noImageBg, 'important');
        if(bgContainer){
          bgContainer.style.setProperty('background-color', noImageBg, 'important');
          bgContainer.style.setProperty('background-image', 'none', 'important');
        }
        if(bimg2){ bimg2.src=''; bimg2.style.display='none'; bimg2.style.transform=''; }
        return;
      }

      /* background-size 根據模式計算 */
      var bgSize, bgPos;
      if(bgFit === 'cover'){
        bgSize = 'cover';
        bgPos  = bgX + '% ' + bgY + '%';
      } else if(bgFit === 'contain'){
        bgSize = 'contain';
        bgPos  = bgX + '% ' + bgY + '%';
      } else if(bgFit === 'height100'){
        /* 橫版畫布預設：背景圖高度放滿，寬度等比例 auto */
        bgSize = 'auto ' + bgScale + '%';
        var offsetXH = bgX - 50;
        var offsetYH = bgY - 50;
        bgPos = 'calc(50% + ' + offsetXH + '%) calc(50% + ' + offsetYH + '%)';
      } else if(bgFit === 'width100'){
        /* 直版/方版畫布預設：背景圖寬度放滿，高度等比例 auto */
        bgSize = bgScale + '% auto';
        var offsetXW = bgX - 50;
        var offsetYW = bgY - 50;
        bgPos = 'calc(50% + ' + offsetXW + '%) calc(50% + ' + offsetYW + '%)';
      } else {
        /* 原尺寸（auto）：用 background-size 百分比，從中心縮放
           技巧：position 設 50% 50%，size 設 scale%，
           這樣圖片中心固定在容器中心，往外放大 */
        bgSize = bgBasis==='height'?'auto '+bgScale+'%':bgScale+'% auto';
        /* 以中心為基準：position 固定在 50% 50%，
           再用 background-position-x/y 微調偏移 */
        var offsetX = bgX - 50;  /* -50~+50 */
        var offsetY = bgY - 50;
        bgPos = 'calc(50% + ' + offsetX + '%) calc(50% + ' + offsetY + '%)';
      }

      /* 新位移為容器寬高的固定百分比，不是剩餘空間百分比。
         scale 改變時，圖片中心仍固定在 50% + 位移，不會往四邊漂移。 */
      if(bgPositionMode==='center'){
        var bgArea=bgContainer||document.getElementById('canvas')||document.body;
        var bgCss=window.getComputedStyle(bgArea),bgW=bgArea.clientWidth||parseFloat(bgCss.width)||1,bgH=bgArea.clientHeight||parseFloat(bgCss.height)||1;
        bgPos='calc(50% + '+((bgX-50)*bgW/100)+'px) calc(50% + '+((bgY-50)*bgH/100)+'px)';
      }

      if(bgSrc){
        if(bgContainer){
          bgContainer.style.backgroundImage    = 'url(' + bgSrc + ')';
          bgContainer.style.backgroundSize     = bgSize;
          bgContainer.style.backgroundPosition = bgPos;
          bgContainer.style.backgroundRepeat   = 'no-repeat';
        } else {
          if(bimg2){
            bimg2.src = bgSrc;
            bimg2.style.display = 'block';
            renderBnBackgroundImg(bimg2,bgSrc,bgFit,bgBasis,bgScale,bgX,bgY,bgPositionMode,document.getElementById('canvas')||document.body);
          }
        }
      } else {
        if(bgContainer) bgContainer.style.backgroundImage = '';
        if(bimg2){ bimg2._bnBgToken=(bimg2._bnBgToken||0)+1;bimg2.src=''; bimg2.style.display='none'; bimg2.style.transform=''; }
      }
      /* 代言人小字自動黑白字要看背景圖實際畫在哪裡 */
      _bnBgSampleState = bgSrc ? {src:bgSrc, fit:bgFit, basis:bgBasis, scale:Number(bgScale)||100,
        x:Number(bgX), y:Number(bgY), mode:bgPositionMode, target:bgContainer ? 'container' : 'img'} : null;
      refreshEndorserNoteColorSoon();
      return;
    }

    /* SLAB 底圖：以「建議範圍框.PNG」(1200x1200) 內的紅框 DRED 為基準，
       將上傳圖片依本版位「商品範圍/商品圖範圍」高度等比縮放、置中對齊，
       套用後商品範圍原本的 40% 提示色塊改成同色的 40% 線框。 */
    if (e.data.type === 'bn-bg-slab') {
      var slabImage=document.getElementById('底圖');if(slabImage)slabImage._bnBgToken=(slabImage._bnBgToken||0)+1;
      if(!_bnNoImageBackgroundTemplate){
        applyBnBgSlab(e.data.src || null, {scale:e.data.scale, x:e.data.x, y:e.data.y});
      }
      return;
    }

    /* 中文數字豁免旗標由左側輸入框右鍵切換時，同步到畫布上對應欄位，
       這樣之後在畫布上編輯文字回傳給父層時才不會把豁免狀態洗掉。 */
    if (e.data.type === 'bn-numeral-exempt') {
      var neClasses = e.data.field ? [e.data.field] : EDITABLE_CLASSES;
      neClasses.forEach(function(cls){
        document.querySelectorAll('.' + cls).forEach(function(el){
          _setNumeralExempt(el, !!e.data.on);
        });
      });
      return;
    }

    /* 底圖核對：疊加半透明底圖 */
    if (e.data.type === 'bn-bg-overlay') {
      var overlay = document.getElementById('_bn_bg_overlay');
      if(!overlay){
        overlay = document.createElement('img');
        overlay.id = '_bn_bg_overlay';
        overlay.style.cssText = [
          'position:absolute;top:0;left:0;',
          'width:100%;height:100%;',
          'object-fit:contain;object-position:top left;',
          'z-index:9999;pointer-events:none;',
          'opacity:0.5;',
        ].join('');
        document.getElementById('canvas').appendChild(overlay);
      }
      if(e.data.src){
        overlay.style.display = 'none'; /* 先隱藏，load 成功再顯示 */
        overlay.onerror = function(){ overlay.style.display = 'none'; };
        overlay.onload  = function(){ overlay.style.display = 'block'; };
        overlay.src = e.data.src;
      } else {
        overlay.style.display = 'none';
        overlay.src = '';
      }
      return;
    }

    if (e.data.type === 'bn-layout-snapshot-request') {
      postAllProductLayouts({snapshotOnly:true, requestId:e.data.requestId});
      postAllCharacterLayouts({snapshotOnly:true,requestId:e.data.requestId});
      /* 讓同一頁其他專用 listener（例如 SearchICON_LOGO）先回傳自己的位置，
         再通知父層此 iframe 已完成快照。 */
      setTimeout(function(){
        try{
          window.parent && window.parent.postMessage({
            type:'bn-layout-snapshot-complete',
            requestId:e.data.requestId,
            bnid:getCurrentBnId()
          }, '*');
        }catch(_){ }
      }, 0);
    }

    if (e.data.type === 'bn-product-layout-request') {
      postAllProductLayouts({snapshotOnly:true});
    }

    if (e.data.type === 'bn-product-layout-apply') {
      /* Campaign Card 商品獨立編輯，不接收一般版位傳來的連動位置。 */
      if(_bnCampaignCardTemplate) return;
      /* 首頁LOGO牆不吃其他版位連動送來的位置（只有它自己手動調過的才算） */
      if(_bnHomepageLogoWallTemplate && !(e.data.layout && e.data.layout.wallManual)) return;
      var pzoneApply = getProductZone(); if(!pzoneApply) return;
      var boxApply = pzoneApply.querySelector('.bn-prod-box[data-id="'+e.data.id+'"]');
      var lay = e.data.layout || {};
      if(boxApply){
        var csApply = window.getComputedStyle(pzoneApply);
        var zwApply = parseFloat(csApply.width) || pzoneApply.offsetWidth || 1;
        var zhApply = parseFloat(csApply.height) || pzoneApply.offsetHeight || 1;
        var applyArea = (lay.syncAreaMode === 'cta-safe' && !isProductLayoutSyncExcluded())
          ? getProductSyncArea(pzoneApply)
          : {left:0, top:0, width:zwApply, height:zhApply};
        var l = lay.leftPct !== undefined ? applyArea.left + lay.leftPct * applyArea.width : lay.left;
        var t = lay.topPct !== undefined ? applyArea.top + lay.topPct * applyArea.height : lay.top;
        var w = lay.widthPct !== undefined ? lay.widthPct * applyArea.width : lay.width;
        var h = lay.heightPct !== undefined ? lay.heightPct * applyArea.height : lay.height;
        if(isFinite(l) && isFinite(t) && isFinite(w) && isFinite(h) && w > 0 && h > 0){
          w = Math.max(1, Math.min(w, applyArea.width));
          /* 框高由框寬 × 商品範圍比例決定（同 layoutProducts） */
          var hFit = bnBoxHeightFor(boxApply, w);
          if(hFit){
            h = hFit;
            if(h > applyArea.height){ w = Math.max(1, w * applyArea.height / h); h = applyArea.height; }
          }else{
            h = Math.max(1, Math.min(h, applyArea.height));
          }
          var minApplyL = applyArea.left;
          var maxApplyL = applyArea.left + applyArea.width - w;
          var minApplyT = applyArea.top;
          var maxApplyT = applyArea.top + applyArea.height - h;
          if(maxApplyL < minApplyL) maxApplyL = minApplyL;
          if(maxApplyT < minApplyT) maxApplyT = minApplyT;
          l = Math.max(0, Math.min(zwApply - w, Math.max(minApplyL, Math.min(maxApplyL, l))));
          t = Math.max(0, Math.min(zhApply - h, Math.max(minApplyT, Math.min(maxApplyT, t))));
          boxApply.dataset.manualLayout = '1';
          boxApply.style.left = l + 'px';
          boxApply.style.top = t + 'px';
          boxApply.style.width = w + 'px';
          boxApply.style.height = h + 'px';
          bnRelayoutProductBox(boxApply);
        }
      }
      return;
    }

    if(e.data.type==='bn-capture-cancel'){
      if(_bnActiveCapture&&_bnActiveCapture.msgId===e.data.msgId){
        _bnActiveCapture.finish(null,null,null,bnCaptureError('CANCELLED','下載已取消；畫布已還原。','cancel'));
      }
      return;
    }
    if (e.data.type === 'bn-capture') {
      if(_bnActiveCapture){
        try{(e.source||window.parent).postMessage({type:'bn-snapshot',msgId:e.data.msgId,dataUrl:null,error:{code:'CAPTURE_BUSY',message:'此版位仍在截圖，請稍後重試。'}},'*');}catch(_){}
        return;
      }
      var _cv=document.getElementById('canvas');
      var captureContext={msgId:e.data.msgId,source:e.source||window.parent,started:Date.now(),deadline:Date.now()+45000,stage:'prepare',done:false,mainUrl:null,assets:Object.create(null)};
      var _overEls,_contentWarningCaptureEls,_editEls,_captureAdjustEls,_transformAdjustEls,_iconRasterEls,_gradRasterEls,_emptyZoneEls,_objectFitAdjustEls,_logoWallCaptureEls;
      var captureStyles=[],captureContainers=Array.prototype.slice.call(document.querySelectorAll('iframe.html2canvas-container'));
      var captureOldWarning=window.__bnContentWarningCaptureActive;
      var captureOldShadows=window.__bnLogoWallShadowSpecs;
      var captureTimer=setTimeout(function(){captureFinish(captureContext.mainUrl,null,null,captureContext.mainUrl?null:bnCaptureError('CAPTURE_TIMEOUT','版位截圖逾時，畫布已還原，可重新下載。',captureContext.stage));},45000);
      _bnActiveCapture=captureContext;captureContext.finish=captureFinish;
      function captureFinish(dataUrl,bgUrl,fgUrl,error){
        if(captureContext.done)return;captureContext.done=true;clearTimeout(captureTimer);
        if(_bnActiveCapture===captureContext)_bnActiveCapture=null;
        [_iconRasterEls||[],_gradRasterEls||[]].forEach(function(list){list.forEach(function(o){try{if(o.cnv&&o.cnv.parentNode)o.cnv.remove();}catch(_){}});});
        captureStyles.forEach(function(o){
          if(!o.el||!o.el.isConnected)return;
          try{o.style===null?o.el.removeAttribute('style'):o.el.setAttribute('style',o.style);o.cls===null?o.el.removeAttribute('class'):o.el.setAttribute('class',o.cls);}catch(_){}
        });
        window.__bnContentWarningCaptureActive=!!captureOldWarning;window.__bnLogoWallShadowSpecs=captureOldShadows;
        document.querySelectorAll('iframe.html2canvas-container').forEach(function(frame){if(captureContainers.indexOf(frame)<0)frame.remove();});
        var failure=error?{code:error.code||'CAPTURE_FAILED',message:String(error.message||'截圖失敗，請重試。').slice(0,300),stage:error.stage||captureContext.stage}:null;
        window._bnLastCaptureReport={msgId:captureContext.msgId,stage:captureContext.stage,elapsed:Date.now()-captureContext.started,error:failure,warning:captureContext.layerWarning||null};
        try{captureContext.source.postMessage({type:'bn-snapshot',msgId:captureContext.msgId,dataUrl:dataUrl||null,bgUrl:bgUrl||null,fgUrl:fgUrl||null,error:failure,report:window._bnLastCaptureReport},'*');}catch(_){}
      }
      bnPrepareCaptureAssets(captureContext).then(function(){
        if(captureContext.done)return;
        if(!_cv)throw bnCaptureError('NO_CANVAS','找不到版位畫布。','prepare');
        captureStyles=[_cv].concat(Array.prototype.slice.call(_cv.querySelectorAll('*'))).map(function(el){return {el:el,style:el.getAttribute('style'),cls:el.getAttribute('class')};});
        document.querySelectorAll('.bn-content-warning-tip').forEach(function(el){if(!_cv.contains(el))captureStyles.push({el:el,style:el.getAttribute('style'),cls:el.getAttribute('class')});});
        try{
      /* 保險：截圖前先拿掉超字紅框，避免紅框被畫進圖裡 */
      _overEls = [];
      if(_cv){
        _cv.querySelectorAll('.bn-over-limit').forEach(function(el){
          _overEls.push(el); el.classList.remove('bn-over-limit');
        });
      }

      /* 橘色內容提醒只屬於編輯預覽：截圖期間移除框線並隱藏提示文字。 */
      window.__bnContentWarningCaptureActive=true;
      var _contentWarningCaptureEls=[];
      if(_cv){
        _cv.querySelectorAll('.bn-content-warning-target').forEach(function(el){
          _contentWarningCaptureEls.push({el:el,target:true});
          el.classList.remove('bn-content-warning-target');
        });
        document.querySelectorAll('.bn-content-warning-tip').forEach(function(el){
          _contentWarningCaptureEls.push({el:el,target:false,display:el.style.display});
          el.style.display='none';
        });
      }

      /* 隱藏所有編輯用控制元素（縮放點等），截完再還原 */
      _editEls = [];
      if(_cv){
        _cv.querySelectorAll('[data-corner],[data-rotate-handle],[data-rotate-badge]').forEach(function(h){
          _editEls.push({el:h, disp:h.style.display});
          h.style.display = 'none';
        });
      }

      /* Search_Image1 下載補償：
         只保留副標下載補償。左側紅底共用區（官方旗艦店/橫線/商城logo）
         改為完全所見即所得，不再於下載時針對 1/2/3 做不同位移。
      */
      /* ★ 2026-08：+14px 補償已停用（設為 0）。
         副標位置改由下方「文字點陣化」機制鎖死（跟 SearchICON_TEXT 同一套），
         下載 = 預覽，不再需要用固定位移去猜 html2canvas 的誤差；
         繼續留著 +14 反而會讓下載結果偏下（使用者回報的「有時往下掉」）。 */
      var SEARCH_IMAGE1_SUBTITLE_OFFSET = 0;
      _captureAdjustEls = [];
      var _fnameLower = (fname || '').toLowerCase();
      var _isSearchImage1 = _fnameLower.indexOf('search_image1') !== -1;

      if(SEARCH_IMAGE1_SUBTITLE_OFFSET && _isSearchImage1 && _cv){
        _cv.querySelectorAll('.副標案型七字內').forEach(function(el){
          var oldTop = el.style.top || '';
          var oldPriority = el.style.getPropertyPriority('top') || '';
          var currentTop = parseFloat(window.getComputedStyle(el).top) || 0;
          _captureAdjustEls.push({el:el, top:oldTop, priority:oldPriority});
          el.style.setProperty('top', (currentTop + SEARCH_IMAGE1_SUBTITLE_OFFSET) + 'px', 'important');
        });
      }

      /* CTA 文字（放心買_安心退／逛逛去）下載補償：
         這兩個文字都是「position:absolute + line-height:1」直接定位，沒有用
         flex 或固定高度置中，html2canvas 計算文字行框內上下留白比例，跟瀏覽器
         即時渲染不一致，導致下載出來文字位置偏移、看起來不是上下置中。

         ★ 這個係數是「用系統預設字型」量出來的估計值。實際字型（ShopeeNotoSans）
         的行高/基準線量測方式跟預設字型不一定一樣，所以下面這個數字很可能還
         需要再微調——如果下載出來文字還是偏下，把 CTA_TEXT_OFFSET_RATIO 調大；
         如果變成偏上（跑過頭），把它調小；抓到剛好置中為止。抓到之後同一個
         數字對其他版位、其他字級應該都適用（是按字級比例算的，不是固定px）。
         暫時先給一個保守的小值，避免像剛才 0.10 那樣跑過頭。 */
      /* ★ 2026-08 修正：此補償已停用（設為 0）。
         原因：這個係數當初是「用系統預設字型」估出來的，實際字型
         ShopeeNotoSans 載入後 html2canvas 的基準線算法並不需要補償，
         繼續套用等於平白把 CTA 文字往上推 fontSize×3%（SCBN_APP、
         Coin_pageBN、HBN 的「逛逛去」下載後偏上就是這個造成的）。
         若日後真的又出現偏移，再調整這個數字即可：偏下調大、偏上調小；
         設為 0 時完全不會動到 top，畫布與下載結果一致。 */
      var CTA_TEXT_OFFSET_RATIO = 0;
      if(_cv && CTA_TEXT_OFFSET_RATIO){
        _cv.querySelectorAll('.放心買_安心退, .逛逛去').forEach(function(el){
          var oldTop = el.style.top || '';
          var oldPriority = el.style.getPropertyPriority('top') || '';
          var cs = window.getComputedStyle(el);
          var currentTop = parseFloat(cs.top) || 0;
          var fontSize = parseFloat(cs.fontSize) || 0;
          if(!fontSize) return;
          _captureAdjustEls.push({el:el, top:oldTop, priority:oldPriority});
          el.style.setProperty('top', (currentTop - fontSize * CTA_TEXT_OFFSET_RATIO) + 'px', 'important');
        });
      }

      /* SearchICON_TEXT（.ICON獨立文案）下載補償：
         這裡用 line-height（固定90px，見 .css 註解）置中，不是絕對 top 定位，
         所以補償方式改用 transform:translateY，不影響原本的置中計算。
         實測（使用者真實環境截圖量出來）：往上偏移約字級的 22%，這裡用同樣
         比例往下位移抵銷。這組是照真實下載結果量的，理論上比 CTA 文字那組
         （只能先用系統字型估）準；如果實際測試後還有落差，調整
         ICON_TEXT_OFFSET_RATIO 這個數字即可：往上跑就調大、往下跑過頭就調小。 */
      /* ★ 2026-08 修正：此補償已停用（設為 0）。
         .ICON獨立文案 是用 line-height:90px 做垂直置中，畫布上本來就是正的；
         這裡再往下推 fontSize×22%（字級 50px → 11px），下載出來就會整段偏下。
         實測 120x120 的輸出，文字中心比畫布中心低約 13px，量級與此補償相符。
         設為 0 時完全不會寫入 transform，也不會蓋掉 config.css 的
         transform:none !important。 */
      var ICON_TEXT_OFFSET_RATIO = 0;
      _transformAdjustEls = [];
      if(_cv && ICON_TEXT_OFFSET_RATIO){
        _cv.querySelectorAll('.ICON獨立文案').forEach(function(el){
          var oldTransform = el.style.transform || '';
          var oldPriority = el.style.getPropertyPriority('transform') || '';
          var cs = window.getComputedStyle(el);
          var fontSize = parseFloat(cs.fontSize) || 0;
          if(!fontSize) return;
          _transformAdjustEls.push({el:el, transform:oldTransform, priority:oldPriority});
          el.style.setProperty('transform', 'translateY(' + (fontSize * ICON_TEXT_OFFSET_RATIO) + 'px)', 'important');
        });
      }

      /* ★ 文字位置寫死（2026-08）：SearchICON_TEXT、Search_Image 副標
         不再用「猜偏移量」補償 html2canvas 的文字基準線誤差——那個誤差跟
         字型載入狀態、版本、字級都有關，怎麼調都會在環境間漂移。
         改成截圖前把文字「畫成 canvas 點陣圖」蓋在原文字上：
         1. 先用「零尺寸 inline-block 探針」量出瀏覽器實際把基準線放在
            元素內的哪個 y（探針底部貼齊 baseline，offsetTop 就是答案），
            所以畫出來的位置 = 螢幕預覽位置，所見即所得。
         2. 用同字型同字級畫進 2x canvas（防糊），原文字暫設 color:transparent。
         3. html2canvas 對 canvas 是像素複製，沒有字型/基準線計算空間
            → 下載結果永遠等於預覽。
         4. 截圖完成後移除 canvas、還原文字色，畫布預覽不受影響。 */
      _iconRasterEls = [];
      if(_cv){
        /* .官方旗艦店（2026-08 加入）：字級 29.63px 配 line-height 30px，
           字型內容高度 43.85px > 行框 → 負半行距約 -7px。html2canvas 處理
           負半行距的行為不穩定，實測下載會整行往上跳 8px（預覽正常），
           造成跟左右橫白線對不齊。納入點陣化後下載 = 預覽，橫線本身是
           靜態色塊本來就不會漂，兩者就永遠對齊。 */
        _cv.querySelectorAll('.ICON獨立文案, .副標案型七字內, .官方旗艦店').forEach(function(el){
          var txt = (el.textContent || '').trim();
          if(!txt) return;
          var w = el.offsetWidth, h = el.offsetHeight;
          if(!w || !h) return;
          var cs = window.getComputedStyle(el);
          var fontSize = parseFloat(cs.fontSize) || 50;

          /* 基準線探針：inline-block 的下緣對齊文字 baseline */
          var probe = document.createElement('span');
          probe.style.cssText = 'display:inline-block;width:0;height:0;padding:0;margin:0;border:0;';
          el.appendChild(probe);
          var baseY = probe.offsetTop;
          el.removeChild(probe);
          if(!baseY || baseY <= 0 || baseY > h * 2){
            /* 探針失敗就退回字型比例估算，不中斷截圖 */
            baseY = h / 2 + fontSize * 0.38;
          }

          var RES = 2;
          var cnv = document.createElement('canvas');
          cnv.width = w * RES; cnv.height = h * RES;
          cnv.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;pointer-events:none;';
          var ctx = cnv.getContext('2d');
          ctx.scale(RES, RES);
          ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fontSize + 'px ' + cs.fontFamily;
          if(cs.letterSpacing && cs.letterSpacing !== 'normal' && 'letterSpacing' in ctx){
            ctx.letterSpacing = cs.letterSpacing;
          }
          ctx.fillStyle = cs.color;
          ctx.textBaseline = 'alphabetic';
          var padL = parseFloat(cs.paddingLeft) || 0;
          var padR = parseFloat(cs.paddingRight) || 0;
          if(cs.textAlign === 'center'){
            ctx.textAlign = 'center';
            ctx.fillText(txt, padL + (w - padL - padR) / 2, baseY);
          } else if(cs.textAlign === 'right' || cs.textAlign === 'end'){
            ctx.textAlign = 'right';
            ctx.fillText(txt, w - padR, baseY);
          } else {
            ctx.textAlign = 'left';
            ctx.fillText(txt, padL, baseY);
          }
          _iconRasterEls.push({el: el, color: el.style.color || '', priority: el.style.getPropertyPriority('color') || '', cnv: cnv});
          el.style.setProperty('color', 'transparent', 'important');
          el.appendChild(cnv);
        });
      }

      /* ★ 漸層點陣化（2026-08）：漸層藍線的最終解。
         歷程：某些使用者下載的圖，在漸層元素上會多一條藍/暗線。
         第一輪：background-repeat 預設 repeat，元素尺寸換算成裝置像素有
                 小數時，最後 1px 會取樣到下一塊 tile 的不透明起始色
                 → 加 no-repeat 解掉「元素邊緣」的線。
         第二輪：線移到了「alpha 歸零的停點」（實測 x=680 = 611+70）。
                 原因：CSS 關鍵字 transparent 的計算值是 rgba(0,0,0,0)
                 「透明黑」。瀏覽器預覽用 premultiplied 插值看不出來，
                 但 html2canvas 自己重畫漸層時往黑色插值，在停點處硬切，
                 亮底（氣球）上就是一條明顯的暗線 → 預覽正常、下載有線。
         治本：跟文字一樣，不讓 html2canvas 畫漸層。截圖前用 2D canvas
         把漸層畫成點陣圖蓋上去（我們控制色標：透明端用同 RGB 的
         rgba(r,g,b,0)，插值路徑顏色恆定），html2canvas 只能像素複製。
         截圖完成後移除、還原，預覽不受影響。 */
      _gradRasterEls = [];
      if(_cv){
        _cv.querySelectorAll('.漸層左, .漸層右, .漸層上, .漸層下').forEach(function(gel){
          var w = gel.offsetWidth, h = gel.offsetHeight;
          if(!w || !h) return; /* display:none（未使用的漸層）直接跳過 */
          var cs = window.getComputedStyle(gel);
          if(cs.display === 'none' || cs.visibility === 'hidden') return;
          var bgi = cs.backgroundImage || '';
          if(bgi.indexOf('linear-gradient') === -1) return;

          /* 從計算樣式抓「第一個不透明色」與「alpha 歸零停點」 */
          var colorM = bgi.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)\s*0%/);
          if(!colorM) colorM = bgi.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if(!colorM) return;
          var r = colorM[1], g = colorM[2], b = colorM[3];
          var stopM = bgi.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\)\s*([\d.]+)%/);
          var stop = stopM ? parseFloat(stopM[1]) / 100 : 1;

          var dir = (window.getComputedStyle(gel).getPropertyValue('--grad-dir') || '').trim();
          if(!dir){
            var _dirs = {'漸層左':'to right','漸層右':'to left','漸層上':'to bottom','漸層下':'to top'};
            for(var cls in _dirs){ if(gel.classList.contains(cls)){ dir = _dirs[cls]; break; } }
          }
          if(!dir) dir = 'to right';

          var cnv = document.createElement('canvas');
          cnv.width = w; cnv.height = h; /* 漸層平滑，1x 就夠、也最不會有縮放取樣差 */
          cnv.style.cssText = 'position:absolute;left:0;top:0;width:' + w + 'px;height:' + h + 'px;pointer-events:none;';
          var ctx = cnv.getContext('2d');
          var coords = {'to right':[0,0,w,0],'to left':[w,0,0,0],'to bottom':[0,0,0,h],'to top':[0,h,0,0]}[dir];
          var grad = ctx.createLinearGradient(coords[0], coords[1], coords[2], coords[3]);
          var solid = 'rgb(' + r + ',' + g + ',' + b + ')';
          var clear = 'rgba(' + r + ',' + g + ',' + b + ',0)';
          grad.addColorStop(0, solid);
          grad.addColorStop(Math.min(1, stop), clear);
          grad.addColorStop(1, clear);
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          _gradRasterEls.push({el: gel, background: gel.style.background || '', priority: gel.style.getPropertyPriority('background') || '', cnv: cnv});
          gel.style.setProperty('background', 'none', 'important');
          gel.appendChild(cnv);
        });
      }

      /* LOGO / 商品範圍：若尚未上傳任何圖片，畫布上會顯示淡紅色提示範圍（方便編輯時定位）。
         下載截圖時，若該範圍仍是空的（沒有 logo 圖 / 沒有商品圖），
         暫時把提示色改成透明再截圖，讓下載出來的圖片不會帶有這塊淡紅色；
         截圖完成後立刻還原，畫面上的編輯提示不受影響。
         LOGO 範圍與商品範圍套用同一套邏輯，行為一致。 */
      _emptyZoneEls = [];
      function _bnHideEmptyPlaceholder(selector, hasContentSelector){
        document.querySelectorAll(selector).forEach(function(zn){
          if(!zn) return;
          var hasContent = zn.querySelector(hasContentSelector);
          if(!hasContent){
            _emptyZoneEls.push({el:zn, bg:zn.style.background, op:zn.style.opacity, bd:zn.style.border});
            zn.style.background = 'transparent';
            zn.style.opacity = '1';
            zn.style.border = 'none';
          }
        });
      }
      _bnHideEmptyPlaceholder('.logo範圍, .LOGO範圍, .logo範圍_左, .logo範圍_中, .logo範圍_右', 'img.bn-logo-img');
      _bnHideEmptyPlaceholder('.商品範圍, .商品圖範圍', '.bn-prod-box, .bn-char-box');

      /* object-fit:contain 下載補償：
         html2canvas 不支援 <img> 的 object-fit:contain——不管圖片比例跟外框
         比例是否一致，畫面上瀏覽器會正確「等比縮小、置中、露出底色」，
         但 html2canvas 會整張圖硬拉伸去塞滿外框，造成圖片變形、被拉滿。
         最常見的情況：使用者換了一張比例不同的圖，但外框沿用了「上一張圖」
         儲存下來的大小（LOGO / 商品圖 都有「記住使用者上次調整過的大小」
         這個機制），外框比例就會跟新圖片對不上，露餡在下載這一刻。
         修法：截圖前，用「圖片真實比例＋目前外框大小」手動算出等比縮放後
         應該有的實際寬高與置中位置，直接把這個結果寫死成 <img> 的
         width/height/position/left/top（不再依賴 object-fit)，
         html2canvas 就只是照著這組已經算好的絕對數字截圖，不會拉伸。
         截圖完成後全部還原，畫面上的即時編輯行為完全不受影響。 */
      _objectFitAdjustEls = [];
      function _bnFixObjectFitForCapture(selector){
        document.querySelectorAll(selector).forEach(function(img){
          if(!img || img.tagName !== 'IMG') return;
          /* 已手動移動／縮放的 LOGO 有自己的等比例寬高；保留位置與大小，
             不要在匯出時再按整個 logo 範圍重新置中。 */
          if(img.classList.contains('bn-logo-img') && img.dataset.manualLayout === '1') return;
          /* 商品圖已用 productRect 以絕對 px 定位（影子露在框外），不是 contain 模式；
             這裡若再按 contain 重算，會把含影子的整張圖縮回框內，下載的商品就變小。
             只確保定位是最新的，然後跳過。 */
          if(img._bnFit){ bnLayoutProductImg(img); return; }
          var box = img.parentElement;
          if(!box) return;
          var bw = box.clientWidth, bh = box.clientHeight;
          var nw = img.naturalWidth, nh = img.naturalHeight;
          if(!bw || !bh || !nw || !nh) return;
          var fitH = _bnCampaignCardTemplate && img.classList.contains('bn-logo-img') ? Math.min(29, bh) : bh;
          var boxRatio = bw / fitH, imgRatio = nw / nh;
          var dispW, dispH;
          if(imgRatio > boxRatio){ dispW = bw; dispH = bw / imgRatio; }
          else { dispH = fitH; dispW = fitH * imgRatio; }
          /* 比例已經吻合（差距在1px內），不用特別處理，減少不必要的 style 改動 */
          if(Math.abs(dispW - bw) < 1 && Math.abs(dispH - bh) < 1) return;
          _objectFitAdjustEls.push({
            el: img, width: img.style.width, height: img.style.height,
            left: img.style.left, top: img.style.top, position: img.style.position,
            maxWidth: img.style.maxWidth, maxHeight: img.style.maxHeight
          });
          img.style.position = 'absolute';
          img.style.width  = dispW + 'px';
          img.style.height = dispH + 'px';
          img.style.maxWidth  = 'none';
          img.style.maxHeight = 'none';
          img.style.left = Math.round((bw - dispW) / 2) + 'px';
          img.style.top  = Math.round((bh - dispH) / 2) + 'px';
        });
      }
      var logoCaptureSelector = '.bn-logo-box img, .bn-prod-box img, .bn-char-box img, .logo範圍_左 img.bn-logo-img, .logo範圍_中 img.bn-logo-img, .logo範圍_右 img.bn-logo-img';
      if(_bnCampaignCardTemplate) logoCaptureSelector += ',.logo範圍 img.bn-logo-img';
      _bnFixObjectFitForCapture(logoCaptureSelector);

      /* 首頁LOGO牆／Campaign Card 膠囊截圖補償：html2canvas 1.4.1 會把圓角元素的外陰影
         （box-shadow rgba(0,0,0,.14)）誤畫在元素內部，白色膠囊疊上去就變成
         #dbdbdb 灰底（實測：拿掉陰影即純白）。截圖時暫時移除陰影並鎖定白底。 */
      _logoWallCaptureEls = [];
      window.__bnLogoWallShadowSpecs = [];
      if(_bnFixedWhiteBackgroundTemplate){
        document.querySelectorAll('.logo範圍').forEach(function(zn){
          var _cs = window.getComputedStyle(zn);
          if(_cs.boxShadow && _cs.boxShadow !== 'none'){
            window.__bnLogoWallShadowSpecs.push({el:zn, shadow:_cs.boxShadow, radius:_cs.borderTopLeftRadius});
          }
          _logoWallCaptureEls.push({el:zn,
            prevBg: zn.style.getPropertyValue('background-color'),
            prevBgPri: zn.style.getPropertyPriority('background-color'),
            prevShadow: zn.style.getPropertyValue('box-shadow'),
            prevShadowPri: zn.style.getPropertyPriority('box-shadow')});
          zn.style.setProperty('background-color','#ffffff','important');
          zn.style.setProperty('box-shadow','none','important');
        });
      }


          captureCanvas(captureFinish,!!e.data.layers,captureContext);
        }catch(error){captureFinish(null,null,null,error);}
      }).catch(function(error){captureFinish(null,null,null,error);});
    }
  });

  function getCurrentBnId(){
    try{ return String(new URLSearchParams(location.search||'').get('bnid') || ''); }
    catch(_){ return ''; }
  }

  function postProductLayout(box, options){
    try{
      var zone = getProductZone(); if(!zone || !box) return;
      var zr = zone.getBoundingClientRect();
      var br = box.getBoundingClientRect();
      /* getBoundingClientRect() 取到的是目前畫面上的顯示像素；如果畫布／
         iframe 正在縮放，直接把這些值存回父頁，下載重建時就會用另一套
         原始設計尺寸而偏位。先除以 zone 的顯示倍率，統一回到版型設計座標。 */
      var zcs = window.getComputedStyle(zone);
      var zw = parseFloat(zcs.width) || zone.offsetWidth || zr.width || 1;
      var zh = parseFloat(zcs.height) || zone.offsetHeight || zr.height || 1;
      var scaleX = zr.width > 0 && zw > 0 ? zr.width / zw : 1;
      var scaleY = zr.height > 0 && zh > 0 ? zr.height / zh : 1;
      if(!isFinite(scaleX) || scaleX <= 0) scaleX = 1;
      if(!isFinite(scaleY) || scaleY <= 0) scaleY = 1;
      var syncArea = getProductSyncArea(zone);
      var left = (br.left - zr.left) / scaleX;
      var top = (br.top - zr.top) / scaleY;
      var width = br.width / scaleX;
      var height = br.height / scaleY;
      var data = {
        type:box.dataset.campaignCardProduct === '1'
          ? 'bn-campaign-card-product-layout-update' : 'bn-product-layout-update',
        bnid:getCurrentBnId(),
        id:box.dataset.id,
        snapshotOnly:!!(options && options.snapshotOnly),
        requestId:options && options.requestId,
        layout:{
          left: left,
          top: top,
          width: width,
          height: height,
          /* 連動用座標以「有效商品區」為基準；一般版位會扣除 CTA
             下方安全區，SBA_PC 另使用置中的窄版有效寬度。 */
          leftPct: (left - syncArea.left) / syncArea.width,
          topPct: (top - syncArea.top) / syncArea.height,
          widthPct: width / syncArea.width,
          heightPct: height / syncArea.height,
          syncAreaMode: syncArea.mode,
          wallManual: !!(_bnHomepageLogoWallTemplate && box.dataset.wallManual === '1')
        }
      };
      if(box.dataset.campaignCardProduct === '1') data.layout.rotate = parseFloat(box.dataset.rotate) || 0;
      window.parent && window.parent.postMessage(data, '*');
    }catch(_){ }
  }

  function postAllProductLayouts(options){
    try{
      var zone = getProductZone(); if(!zone) return;
      Array.from(zone.querySelectorAll('.bn-prod-box')).forEach(function(box){
        postProductLayout(box, options);
      });
    }catch(_){ }
  }

  function postAllCharacterLayouts(options){
    try{
      var zone = getProductZone(); if(!zone) return;
      Array.from(zone.querySelectorAll('.bn-char-box')).forEach(function(box){postCharacterLayout(box,options);});
    }catch(_){ }
  }

  /* SearchICON_PRODUCT 的單品預設：置中，最長邊只佔商品範圍 80%，
     讓白色圓底四周保留一圈內縮空間。已經有儲存／手動版面的商品不覆蓋。 */
  function applySearchIconProductDefault(box, zone){
    if(!_bnSearchIconProductTemplate || !box || !zone) return false;
    var zw = zone.clientWidth || parseFloat(window.getComputedStyle(zone).width) || 120;
    var zh = zone.clientHeight || parseFloat(window.getComputedStyle(zone).height) || 120;
    var target = Math.round(Math.min(zw, zh) * 0.8);
    var ratio = parseFloat(box.dataset.ratio) || 1;
    var w = target, h = target;
    if(ratio >= 1) h = Math.round(target / ratio);
    else w = Math.round(target * ratio);
    box.style.position = 'absolute';
    box.style.cursor = 'move';
    box.style.boxSizing = 'border-box';
    box.style.outline = '2px solid transparent';
    box.style.width = w + 'px';
    box.style.height = h + 'px';
    box.style.left = Math.round((zw - w) / 2) + 'px';
    box.style.top = Math.round((zh - h) / 2) + 'px';
    box.dataset.manualLayout = '1';
    bnRelayoutProductBox(box);
    return true;
  }

  /* 正三角排品（仿 freelyapp 邏輯）
     主品（第0張）居中最大，左配品（第1張）次之，右配品（第2張）最小
     底部對齊，所有尺寸以商品範圍 px 為單位，不超出邊界 */
  function layoutProducts(pzone) {
    var allBoxes = Array.from(pzone.querySelectorAll('.bn-prod-box'));
    var n = allBoxes.length; if(!n) return;
    /* 2026-11-14：首頁LOGO牆只顯示第 1 張商品，而且固定以「單品」方式置中，
       不跟著其他版位的三品排法；只有使用者在LOGO牆本身拖曳／縮放過才照手動位置。 */
    if(_bnHomepageLogoWallTemplate){ allBoxes = allBoxes.slice(0, 1); n = 1; }

    /* 依 position 排序：0=主品，1=左配，2=右配 */
    var boxes = allBoxes.slice().sort(function(a,b){
      return (parseInt(a.dataset.position)||0) - (parseInt(b.dataset.position)||0);
    });

    /* 從 CSS 直接讀取 zone 的 width/height（不受 iframe 縮放影響） */
    var cs   = window.getComputedStyle(pzone);
    var zw   = parseFloat(cs.width)  || pzone.offsetWidth  || 400;
    var zh   = parseFloat(cs.height) || pzone.offsetHeight || 300;

    /* SearchICON_PRODUCT 不是三角排版：它只顯示主品，而且主品要在圓底正中央。
       這裡直接在通用排版入口鎖定預設尺寸，避免被後續的三角公式或非同步圖片
       載入順序改回滿版。手動調過／已有儲存版面的商品則照原位置保留。 */
    if(_bnSearchIconProductTemplate && n === 1 && !allBoxes[0].dataset.savedLayout){
      if(allBoxes[0].dataset.manualLayout !== '1') applySearchIconProductDefault(allBoxes[0], pzone);
      setTimeout(function(){ postAllProductLayouts({snapshotOnly:true}); }, 0);
      return;
    }

    var syncArea = getProductSyncArea(pzone);
    /* 自動排版也使用同一個有效商品區，避免只有跨版位連動時安全、
       第一次上傳時卻又把商品排回 CTA 下方。 */
    var layoutLeft = syncArea.left;
    var layoutTop = syncArea.top;
    var layoutW = syncArea.width;
    var layoutH = syncArea.height;
    var PAD = _bnCampaignCardTemplate ? 0 : 6;

    /* 寬高比 */
    var ratios = boxes.map(function(b){ return Math.max(0.1, parseFloat(b.dataset.ratio)||0.75); });

    /* 大小比例：主品1.0，左0.85，右0.72 */
    var wsMap = [1.0, 0.85, 0.72];
    var ov = 0;   /* 不重疊 */

    var r0 = ratios[0];
    var r1 = n>=2 ? ratios[1] : 0;
    var r2 = n>=3 ? ratios[2] : 0;
    var ws1 = n>=2 ? wsMap[1] : 0;
    var ws2 = n>=3 ? wsMap[2] : 0;

    /* 主品最大高度：預設 88%，若版位有 .cta底 則不超過 CTA 頂部 */
    var maxH0 = Math.floor(layoutH * (_bnCampaignCardTemplate ? 1 : 0.88));
    var ctaEl = document.querySelector('.cta底');
    if(ctaEl){
      var ctaTop    = parseFloat(window.getComputedStyle(ctaEl).top)   || 0;
      var pzoneTop  = parseFloat(window.getComputedStyle(pzone).top)   || 0;
      var ctaRelTop = ctaTop - pzoneTop - 8; /* 8px 間距 */
      if(ctaRelTop > 0 && ctaRelTop < zh){
        maxH0 = Math.min(maxH0, Math.floor(ctaRelTop * 0.96));
      }
    }

    /* 算主品寬度：讓三張總寬不超出可用寬（留 PAD*2） */
    /* 主品寬 w0，左品寬 w1=ws1*h0*r1，右品寬 w2=ws2*h0*r2 */
    /* h0 = w0/r0；總寬 = w0 + w1 + w2 = w0(1 + ws1*r1/r0 + ws2*r2/r0) */
    var spanFactor = 1 + ws1*r1/r0 + ws2*r2/r0;
    var GAP = n > 1 ? 8 : 0;
    var avail = layoutW - PAD*2 - GAP*(n-1);
    var w0 = Math.min(avail / spanFactor, maxH0 * r0);
    var h0 = w0 / r0;
    /* 再檢查高度上限 */
    if(h0 > maxH0){ h0 = maxH0; w0 = h0 * r0; }

    var w1 = n>=2 ? Math.round(ws1*h0*r1) : 0;
    var h1 = n>=2 ? Math.round(ws1*h0)    : 0;
    var w2 = n>=3 ? Math.round(ws2*h0*r2) : 0;
    var h2 = n>=3 ? Math.round(ws2*h0)    : 0;

    w0 = Math.round(w0); h0 = Math.round(h0);

    /* 底部 y 位置：優先使用 CTA 頂部上方，否則用 zone 底部 */
    var _productInset = _bnCampaignCardTemplate ? 0 : 4;
    var zoneBottom = layoutTop + layoutH - _productInset;
    if(ctaEl){
      var ctaTop2   = parseFloat(window.getComputedStyle(ctaEl).top)  || 0;
      var pzoneTop2 = parseFloat(window.getComputedStyle(pzone).top)  || 0;
      var ctaRel2   = ctaTop2 - pzoneTop2 - 8;
      if(ctaRel2 > 0 && ctaRel2 < zh) zoneBottom = ctaRel2;
    }

    /* 垂直置中：讓最高的商品（主品 h0）在商品範圍垂直置中
       配品底部跟主品底部對齊（維持底部齊） */
    var zoneTop = layoutTop + _productInset; /* 上邊界留 4px */
    var zoneH   = zoneBottom - zoneTop;
    /* 主品置中後的底部位置 */
    var centeredBot = zoneTop + Math.floor((zoneH + h0) / 2);
    /* 不超出 zoneBottom */
    var bot0 = Math.min(centeredBot, zoneBottom);
    var bot1 = bot0;
    var bot2 = bot0;

    /* 水平：主品居中，左品在左，右品在右 */
    var totalW = w0 + (n>=2 ? w1+GAP : 0) + (n>=3 ? w2+GAP : 0);
    var startX = layoutLeft + Math.max(PAD, Math.floor((layoutW - totalW) / 2));

    /* 排列順序：左品、主品、右品（視覺上中間最大） */
    var positions = [];
    if(n===1){
      positions = [{box:boxes[0], x:startX, y:bot0-h0, w:w0, h:h0}];
    } else if(n===2){
      /* 左=小，右=主 or 左=主，右=小 → 左配+主 */
      positions = [
        {box:boxes[1], x:startX,          y:bot1-h1, w:w1, h:h1},  /* 左：第1張 */
        {box:boxes[0], x:startX+w1+GAP,   y:bot0-h0, w:w0, h:h0},  /* 右：主品 */
      ];
    } else {
      positions = [
        {box:boxes[1], x:startX,              y:bot1-h1, w:w1, h:h1},  /* 左 */
        {box:boxes[0], x:startX+w1+GAP,       y:bot0-h0, w:w0, h:h0},  /* 中（主品） */
        {box:boxes[2], x:startX+w1+GAP+w0+GAP, y:bot2-h2, w:w2, h:h2},  /* 右 */
      ];
    }

    positions.forEach(function(p, i){
      var saved = null;
      if(p.box.dataset.savedLayout){
        try{ saved = JSON.parse(p.box.dataset.savedLayout); }catch(_){ saved = null; }
        delete p.box.dataset.savedLayout;
      } else if(p.box.dataset.manualLayout === '1') {
        /* 已套用過手動/暫存位置的商品，後續新增其他商品時不可再被自動排版覆蓋。 */
        var curL = parseFloat(p.box.style.left);
        var curT = parseFloat(p.box.style.top);
        var curW = parseFloat(p.box.style.width);
        var curH = parseFloat(p.box.style.height);
        if(isFinite(curL) && isFinite(curT) && isFinite(curW) && isFinite(curH) && curW > 0 && curH > 0){
          saved = {left:curL, top:curT, width:curW, height:curH};
        }
      }
      if(saved){
        var savedArea = saved.syncAreaMode === 'cta-safe'
          ? syncArea : {left:0, top:0, width:zw, height:zh};
        var sx = saved.leftPct !== undefined ? savedArea.left + saved.leftPct * savedArea.width : saved.left;
        var sy = saved.topPct !== undefined ? savedArea.top + saved.topPct * savedArea.height : saved.top;
        var sw = saved.widthPct !== undefined ? saved.widthPct * savedArea.width : saved.width;
        var sh = saved.heightPct !== undefined ? saved.heightPct * savedArea.height : saved.height;
        if(isFinite(sx) && isFinite(sy) && isFinite(sw) && isFinite(sh) && sw > 0 && sh > 0){
          /* 框高一律由框寬 × 商品範圍比例決定；舊版儲存的高度（含影子的框）不再沿用，
             否則框會比商品高。 */
          var maxSavedW = saved.syncAreaMode === 'cta-safe' ? syncArea.width : zw;
          var maxSavedH = saved.syncAreaMode === 'cta-safe' ? syncArea.height : zh;
          if(sw > maxSavedW){ sw = maxSavedW; }
          var shFit = bnBoxHeightFor(p.box, sw);
          if(shFit){
            sh = shFit;
            if(sh > maxSavedH){ sw = sw * maxSavedH / sh; sh = maxSavedH; }
          }else if(sh > maxSavedH){
            sh = maxSavedH;
          }
          var minSavedX = saved.syncAreaMode === 'cta-safe' ? syncArea.left : 0;
          var maxSavedX = saved.syncAreaMode === 'cta-safe' ? syncArea.left + syncArea.width - sw : zw - sw;
          var minSavedY = saved.syncAreaMode === 'cta-safe' ? syncArea.top : 0;
          var maxSavedY = saved.syncAreaMode === 'cta-safe' ? syncArea.top + syncArea.height - sh : zh - sh;
          if(maxSavedX < minSavedX) maxSavedX = minSavedX;
          if(maxSavedY < minSavedY) maxSavedY = minSavedY;
          p.x = Math.max(0, Math.min(zw - sw, Math.max(minSavedX, Math.min(maxSavedX, sx))));
          p.y = Math.max(0, Math.min(zh - sh, Math.max(minSavedY, Math.min(maxSavedY, sy))));
          p.w = Math.max(1, sw);
          p.h = Math.max(1, sh);
          p.box.dataset.manualLayout = '1';
        }
      }
      p.box.style.cssText = [
        'position:absolute;',
        'left:'+p.x+'px;top:'+p.y+'px;',
        'width:'+p.w+'px;height:'+p.h+'px;',
        'cursor:move;box-sizing:border-box;',
        'outline:2px solid transparent;',
        'z-index:'+(15-i)+';',
      ].join('');
      bnRelayoutProductBox(p.box);
    });
    /* 2026-11-16：自動排版的結果只回報「快照」（存這張自己的位置），不當成連動來源。
       懶載入的版位捲到時才自動排版，如果當成使用者拖曳，會把已排好的其他連動版位（例如 HBN）擠偏。 */
    setTimeout(function(){ postAllProductLayouts({snapshotOnly:true}); }, 0);
  }

  function getProductZone(){
    var names=['商品範圍','商品圖範圍'];
    for(var i=0;i<names.length;i++){ var z=document.querySelector('.'+names[i]); if(z)return z; }
    return null;
  }

  function isProductLayoutSyncExcluded(){
    return !!(_bnHomepageLogoWallTemplate || _bnSearchIconProductTemplate || _bnCampaignCardTemplate);
  }

  /* 商品連動用的有效範圍：
     - 一般版位：若 CTA 壓在商品區下方，扣除 CTA 上緣與 8px 安全距離。
     - Coin／HBN／活動總覽／SBA／AMS：再把有效商品群限制在約 1.55:1，
       置中保留左右空白，讓三品距離接近 FB Post；SBA_PC 也沿用同一套規則。
     - 首頁 LOGO 牆／SearchICON_PRODUCT／Campaign Card：完全不參與連動，各自使用原商品區。 */
  function getProductSyncArea(zone){
    var cs = zone ? window.getComputedStyle(zone) : null;
    var zw = (cs && parseFloat(cs.width)) || (zone && zone.offsetWidth) || 1;
    var zh = (cs && parseFloat(cs.height)) || (zone && zone.offsetHeight) || 1;
    var area = {left:0, top:0, width:zw, height:zh, mode:'full'};
    if(!zone || isProductLayoutSyncExcluded()) return area;

    var zr = zone.getBoundingClientRect();
    var scaleX = zw > 0 ? (zr.width || zw) / zw : 1;
    var scaleY = zh > 0 ? (zr.height || zh) / zh : 1;
    var ctaTop = Infinity;
    var ctaEls = document.querySelectorAll('.cta底,.逛逛去底,.cta圓底');
    Array.prototype.forEach.call(ctaEls, function(el){
      var cr = el.getBoundingClientRect();
      if(!cr.width || !cr.height) return;
      var overlapX = Math.min(cr.right, zr.right) - Math.max(cr.left, zr.left);
      if(overlapX <= 0) return;
      var relTop = (cr.top - zr.top) / Math.max(scaleY, 0.0001);
      var relBottom = (cr.bottom - zr.top) / Math.max(scaleY, 0.0001);
      /* 只把下半部的 CTA 視為商品區底部保護區，避免誤扣中間裝飾。 */
      if(relBottom > 0 && relTop < zh && relTop > zh * 0.45){
        ctaTop = Math.min(ctaTop, relTop);
      }
    });
    if(isFinite(ctaTop)){
      area.height = Math.max(1, Math.min(zh, ctaTop - 8));
    }

    if(_bnModerateProductSpacingTemplate){
      /* 1.55 是針對這批寬版商品區的折衷比例：比 FB Post 的視覺群組寬一些，
         但不會讓 Coin／HBN／活動總覽／SBA／AMS 的三品被拉到左右兩端。 */
      var moderateAspect = 1.55;
      var narrowW = Math.min(area.width, area.height * moderateAspect);
      area.left = area.left + Math.max(0, (area.width - narrowW) / 2);
      area.width = Math.max(1, narrowW);
    }
    area.mode = 'cta-safe';
    return area;
  }

  /* SLAB 底圖：DRED = 建議範圍框.PNG（1200x1200）內紅框的像素範圍，
     由 Python 對該 PNG 逐 pixel 分析 alpha 通道量測得出（無反鋸齒，
     alpha 只有 0 或 128 兩種值），非目測估計。 */
  var _BN_DRED_REF = {imgSize:1200, left:324, top:372, width:550, height:457};
  function _bnMarkSlabZone(zone, on){
    if(!zone) return;
    if(on){
      zone.style.background = 'transparent';
      zone.style.opacity = '1';
      /* outline 不參與盒模型；用 border 會讓 SLAB／一般背景互切時改變商品區
         的內容尺寸與絕對定位原點，既有商品即使沒重排也會視覺位移。 */
      zone.style.outline = '2px solid rgba(235,104,119,0.4)';
      zone.style.outlineOffset = '-2px';
      /* 清掉舊版 runtime 曾留下的 inline border。 */
      zone.style.border = '';
      zone.style.boxSizing = '';
      zone.dataset.bnSlabApplied = '1';
    } else if(zone.dataset.bnSlabApplied){
      zone.style.background = '';
      zone.style.opacity = '';
      zone.style.outline = '';
      zone.style.outlineOffset = '';
      /* 向下相容：若狀態是在舊版 runtime 套上的，移除其盒模型樣式。 */
      zone.style.border = '';
      zone.style.boxSizing = '';
      zone.dataset.bnSlabApplied = '';
    }
  }
  /* SLAB 底圖對齊用的「有效商品範圍」：
     有些版位的 .商品範圍 並不是整段都能真的擺商品，DRED 紅框要對齊的是
     實際可用的那一段，不然 SLAB 商品會超出底色或被其他圖層蓋住。
     一律用實際量到的 rect 動態計算，不寫死像素值。

     SCBN_APP：商品範圍（top:15,height:175）比背景色色塊（top:46,height:154）
       更早開始，上緣那一小段（15~46）其實是露在背景色之外的透明區。取兩者
       交集（46~190）當基準，SLAB 才不會超出底色，下緣也不會被裁掉。
     HBN_*、活動總覽_*：CTA 色塊（.cta底 top:290,height:44）正好壓在商品範圍
       （34~334）的下緣，兩者座標完全相同（同一套 PS 模板衍生出來的版位）。
       把 CTA 高度扣掉（34~290），SLAB 的商品範圍才不會被 CTA 蓋住。 */
  function _bnEffectiveSlabZoneRect(zone){
    var zRect = zone.getBoundingClientRect();
    var top = zRect.top, bottom = zRect.bottom;

    if(/^SCBN_APP$/i.test(fname || '')){
      var bgEl = document.querySelector('.背景色') || document.querySelector('.bg');
      var bgRect = bgEl && bgEl.getBoundingClientRect();
      if(bgRect && bgRect.height > 0){
        top = Math.max(top, bgRect.top);
        bottom = Math.min(bottom, bgRect.bottom);
      }
    }

    if(/^HBN_/i.test(fname || '') || /^活動總覽_/i.test(fname || '')){
      var ctaEl = document.querySelector('.cta底') || document.querySelector('.逛逛去底') || document.querySelector('.cta圓底');
      var ctaRect = ctaEl && ctaEl.getBoundingClientRect();
      if(ctaRect && ctaRect.height > 0 && ctaRect.top > top && ctaRect.top < bottom){
        bottom = ctaRect.top;
      }
    }

    /* 交集算出來不合理（量不到／被蓋光）就退回原本的商品範圍 */
    if(!(bottom - top > 1)) return zRect;

    return {left:zRect.left, top:top, right:zRect.right, bottom:bottom,
      width:zRect.width, height:bottom - top};
  }
  /* 記住上一張 SLAB 圖的原始尺寸：拖「背景圖調整」滑桿時會連續重送，
     同一張圖不需要每次都重新等 Image onload。 */
  var _slabNaturalCache = {src:'', w:0, h:0};

  /* opts = {scale, x, y}：對應「背景圖調整」面板。
     scale=100 / x=50 / y=50 就是純 DRED 對齊的基準位置；
     縮放以 DRED（也就是商品範圍）中心為軸，位移單位是畫布寬高的百分比。 */
  function applyBnBgSlab(src, opts){
    var zone = getProductZone(); if(!zone || !src) return;
    var canvasEl = document.getElementById('canvas'); if(!canvasEl) return;
    var bgContainer = document.querySelector('.背景色') || document.querySelector('.bg');
    var bimg2 = document.getElementById('底圖');
    if(!bgContainer && !bimg2) return;

    function place(nw, nh){
      if(!nw || !nh) return;
      var ref = _BN_DRED_REF;
      var dredLeftPx = ref.left/ref.imgSize*nw, dredTopPx = ref.top/ref.imgSize*nh;
      var dredWPx = ref.width/ref.imgSize*nw, dredHPx = ref.height/ref.imgSize*nh;
      var cRect = canvasEl.getBoundingClientRect(), zRect = _bnEffectiveSlabZoneRect(zone);
      var zoneW = zRect.width || 1, zoneH = zRect.height || 1;
      var scale = zoneH / dredHPx;
      var scaledDredLeft = dredLeftPx*scale, scaledDredTop = dredTopPx*scale;
      var scaledDredW = dredWPx*scale, scaledDredH = dredHPx*scale;
      var zoneLeftRel = zRect.left - cRect.left, zoneTopRel = zRect.top - cRect.top;
      /* DRED 貼齊有效商品範圍後的基準位置 */
      var baseLeft = zoneLeftRel + zoneW/2 - (scaledDredLeft + scaledDredW/2);
      var baseTop  = zoneTopRel - scaledDredTop;
      /* DRED 中心（縮放軸心）*/
      var anchorX = baseLeft + scaledDredLeft + scaledDredW/2;
      var anchorY = baseTop  + scaledDredTop  + scaledDredH/2;

      var z = (opts && isFinite(opts.scale) ? Number(opts.scale) : 100) / 100;
      if(!(z > 0)) z = 1;
      var offX = ((opts && isFinite(opts.x) ? Number(opts.x) : 50) - 50) / 100;
      var offY = ((opts && isFinite(opts.y) ? Number(opts.y) : 50) - 50) / 100;

      /* 這裡以前是 zMax = Math.min(1, zMaxW)，也就是「紅框不得超出曝品範圍」，
         等於把每個版位都夾在 100%。但各版位的預設構圖（SCBN 127%、其餘 120%）
         本來就是刻意讓商品比曝品範圍再大一點、是手拉量出來的值，被這個上限
         夾掉之後 100% 以上的預設全部失效（面板顯示 127% 但畫面其實是 100%）。
         現在只保留上面那行「z 必須為正」，放大與否交給預設值和滑桿決定。 */

      var newW = nw*scale*z, newH = nh*scale*z;
      var imgLeft = anchorX - (scaledDredLeft + scaledDredW/2)*z + offX*(cRect.width || 1);
      var imgTop  = anchorY - (scaledDredTop  + scaledDredH/2)*z + offY*(cRect.height || 1);

      /* 位移夾限：把飄出曝品範圍的紅框推回來。
         但這只有在紅框「塞得進」該軸時才成立——z > 100% 時紅框本來就比曝品
         範圍大，兩邊同時超出，上下都夾的結果會變成硬貼齊某一邊，把預設的
         x/y（例如 SCBN 的 47/29）整個蓋掉。所以改成逐軸判斷：塞得進的軸才夾，
         塞不進的軸就尊重預設／滑桿給的位移。 */
      var dredL = imgLeft + scaledDredLeft*z, dredT = imgTop + scaledDredTop*z;
      var dredW = scaledDredW*z, dredH = scaledDredH*z;
      var zoneL = zoneLeftRel, zoneT = zoneTopRel;
      if(dredW <= zoneW + 0.5){
        if(dredL < zoneL) imgLeft += zoneL - dredL;
        else if(dredL + dredW > zoneL + zoneW) imgLeft -= (dredL + dredW) - (zoneL + zoneW);
      }
      if(dredH <= zoneH + 0.5){
        if(dredT < zoneT) imgTop += zoneT - dredT;
        else if(dredT + dredH > zoneT + zoneH) imgTop -= (dredT + dredH) - (zoneT + zoneH);
      }

      if(bgContainer){
        bgContainer.style.backgroundImage = 'url(' + src + ')';
        bgContainer.style.backgroundRepeat = 'no-repeat';
        bgContainer.style.backgroundSize = newW + 'px ' + newH + 'px';
        bgContainer.style.backgroundPosition = imgLeft + 'px ' + imgTop + 'px';
      } else if(bimg2){
        bimg2.src = src;
        bimg2.style.display = 'block';
        bimg2.style.position = 'absolute';
        bimg2.style.objectFit = 'none';
        bimg2.style.objectPosition = '0 0';
        bimg2.style.transform = '';
        bimg2.style.width = newW + 'px';
        bimg2.style.height = newH + 'px';
        bimg2.style.left = imgLeft + 'px';
        bimg2.style.top = imgTop + 'px';
      }
      _bnMarkSlabZone(zone, true);
    }

    if(_slabNaturalCache.src === src && _slabNaturalCache.w){
      place(_slabNaturalCache.w, _slabNaturalCache.h);
      return;
    }
    var img = new Image();
    img.onload = function(){
      _slabNaturalCache = {src:src, w:img.naturalWidth, h:img.naturalHeight};
      place(img.naturalWidth, img.naturalHeight);
    };
    img.src = src;
  }

  function scheduleProductLayoutPost(box){
    if(!box) return;
    if(box._bnPostTimer) cancelAnimationFrame(box._bnPostTimer);
    box._bnPostTimer = requestAnimationFrame(function(){
      box._bnPostTimer = null;
      postProductLayout(box);
    });
  }

  /* 旋轉換圖時永遠保留商品框的中心點。
     旋轉是繞商品本身的中心進行，不能因為某個版位剛好靠近 CTA／底邊，
     就改用底部對齊；否則旋轉後外接框的高度一變，商品會在放開滑鼠時
     產生可見的上下微跳。保留參數只是相容舊呼叫端，實際錨點固定為 center。 */
  function productRotationAnchorMode(box, zone){
    return 'center';
  }

  function setupProdDrag(box,zone){
    var drag=null;
    function finishDrag(){if(drag&&drag.changed)postProductLayout(box);drag=null;box.style.outline='2px solid transparent';}
    var rotHandle = box.querySelector('[data-rotate-handle]');
    var rotBadge = box.querySelector('[data-rotate-badge]');
    if(rotHandle){
      var rot = null;
      function fmtDeg(d){ return (Math.round(d*10)/10).toFixed(d % 1 ? 1 : 0).replace(/\.0$/,'') + '°'; }
      function normDeg(d){ d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; }
      rotHandle.addEventListener('pointerdown', function(e){
        if(e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();
        var br = box.getBoundingClientRect();
        var cx = br.left + br.width/2, cy = br.top + br.height/2;
        rot = {
          cx:cx, cy:cy,
          start: Math.atan2(e.clientY - cy, e.clientX - cx),
          base: parseFloat(box.dataset.rotate) || 0,
          delta: 0
        };
        rotHandle.setPointerCapture(e.pointerId);
        rotHandle.style.cursor = 'grabbing';
        box.style.outline = '2px solid #4a90e2';
        if(rotBadge){ rotBadge.textContent = fmtDeg(rot.base); rotBadge.style.display = 'block'; }
      });
      rotHandle.addEventListener('pointermove', function(e){
        if(!rot) return;
        var a = Math.atan2(e.clientY - rot.cy, e.clientX - rot.cx);
        var delta = (a - rot.start) * 180 / Math.PI;
        var total = normDeg(rot.base + delta);
        if(e.shiftKey){ total = Math.round(total / 15) * 15; }
        else{
          /* 接近 0／90／180／270 時自動吸附，方便擺正 */
          var near = Math.round(total / 90) * 90;
          if(Math.abs(total - near) < 3) total = near;
        }
        total = normDeg(total);
        rot.delta = normDeg(total - rot.base);
        var img = box.querySelector('img');
        /* 旋轉中心 = 商品框中心（框即商品本體）。圖片含影子時比框大，要換算成圖片內的座標 */
        if(img){
          /* offsetLeft/offsetTop 會四捨五入；商品影子或縮放造成的負座標若被
             四捨五入，拖曳第一幀就會看到圖片繞錯一點點。改用實際 inline
             left/top 的小數值，讓預覽旋轉中心與最終換圖的框中心完全一致。 */
          var imgLeft = parseFloat(img.style.left);
          var imgTop = parseFloat(img.style.top);
          if(!isFinite(imgLeft)) imgLeft = img.offsetLeft || 0;
          if(!isFinite(imgTop)) imgTop = img.offsetTop || 0;
          var boxW = box.clientWidth || box.offsetWidth || 1;
          var boxH = box.clientHeight || box.offsetHeight || 1;
          img.style.transformOrigin = (boxW/2 - imgLeft) + 'px ' + (boxH/2 - imgTop) + 'px';
          img.style.transform = 'rotate(' + rot.delta + 'deg)';
        }
        if(rotBadge) rotBadge.textContent = fmtDeg(total);
      });
      function rotEnd(){
        if(!rot) return;
        var delta = rot.delta; rot = null;
        var anchorMode = productRotationAnchorMode(box, zone);
        rotHandle.style.cursor = 'grab';
        box.style.outline = '2px solid transparent';
        if(rotBadge) rotBadge.style.display = 'none';
        var img = box.querySelector('img');
        if(box.dataset.campaignCardProduct === '1'){
          var finalRotate = normDeg(rot.base + delta);
          box.dataset.rotate = String(finalRotate);
          if(img){
            img.style.transformOrigin = '50% 50%';
            img.style.transform = 'rotate(' + finalRotate + 'deg)';
          }
          postProductLayout(box);
          return;
        }
        if(Math.abs(delta) < 0.5){ if(img) img.style.transform = ''; return; }
        /* CSS 預覽先留著，等父頁重算完以 bn-product-update-image 換圖時一併清掉，畫面不會閃回 */
        try{
          window.parent && window.parent.postMessage({type:'bn-product-rotate', bnid:getCurrentBnId(), id:box.dataset.id, delta:delta, rotationAnchorMode:anchorMode}, '*');
        }catch(_){ if(img) img.style.transform = ''; }
      }
      rotHandle.addEventListener('pointerup', rotEnd);
      rotHandle.addEventListener('pointercancel', rotEnd);
      rotHandle.addEventListener('lostpointercapture', rotEnd);
      rotHandle.addEventListener('dblclick', function(e){
        e.stopPropagation(); e.preventDefault();
        if(!(parseFloat(box.dataset.rotate) || 0)) return;
        try{ window.parent && window.parent.postMessage({type:'bn-product-rotate', bnid:getCurrentBnId(), id:box.dataset.id, rotate:0, absolute:true, rotationAnchorMode:productRotationAnchorMode(box, zone)}, '*'); }catch(_){ }
      });
    }
    box.addEventListener('pointerdown',function(e){
      if(e.target.dataset.corner) return;
      if(e.target.closest && e.target.closest('[data-rotate-handle]')) return;
      e.stopPropagation();
      var zr=zone.getBoundingClientRect(),br=box.getBoundingClientRect();
      drag={type:'move',sx:e.clientX,sy:e.clientY,l:br.left-zr.left,t:br.top-zr.top,w:br.width,h:br.height,zw:zr.width,zh:zr.height};
      box.setPointerCapture(e.pointerId); box.style.outline='2px solid #4a90e2';
    });
    box.querySelectorAll('[data-corner]').forEach(function(h){
      h.addEventListener('pointerdown',function(e){
        e.stopPropagation();
        var zr=zone.getBoundingClientRect(),br=box.getBoundingClientRect();
        drag={type:'resize',corner:h.dataset.corner,sx:e.clientX,sy:e.clientY,l:br.left-zr.left,t:br.top-zr.top,w:br.width,h:br.height,zw:zr.width,zh:zr.height,ratio:parseFloat(box.dataset.ratio)||1};
        h.setPointerCapture(e.pointerId); box.style.outline='2px solid #4a90e2'; e.preventDefault();
      });
      h.addEventListener('pointermove',function(e){
        if(!drag||drag.type!=='resize') return;
        var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy,c=drag.corner,r=drag.ratio;
        if(dx===0&&dy===0)return;drag.changed=true;
        var sX=c.includes('w')?-1:1,sY=c.includes('n')?-1:1;
        var delta=Math.abs(dx)>Math.abs(dy)?dx*sX:dy*sY*r;
        var w=Math.max(40,drag.w+delta),bh=w/r;
        if(bh<30){bh=30;w=bh*r;}
        var l=drag.l,t=drag.t;
        if(c.includes('w')) l=drag.l+(drag.w-w);
        if(c.includes('n')) t=drag.t+(drag.h-bh);
        l=Math.max(0,Math.min(drag.zw-w,l)); t=Math.max(0,Math.min(drag.zh-bh,t));
        box.dataset.manualLayout = '1';
        if(_bnHomepageLogoWallTemplate) box.dataset.wallManual = '1';
        box.style.left=l+'px'; box.style.top=t+'px'; box.style.width=w+'px'; box.style.height=bh+'px';
        bnRelayoutProductBox(box);
        scheduleProductLayoutPost(box);
      });
      h.addEventListener('pointerup',finishDrag);
      h.addEventListener('pointercancel',finishDrag);
      h.addEventListener('lostpointercapture',finishDrag);
    });
    box.addEventListener('pointermove',function(e){
      if(!drag||drag.type!=='move') return;
      if(e.clientX===drag.sx&&e.clientY===drag.sy)return;drag.changed=true;
      box.dataset.manualLayout = '1';
      if(_bnHomepageLogoWallTemplate && box.classList.contains('bn-prod-box')) box.dataset.wallManual = '1';
      box.style.left=Math.max(0,Math.min(drag.zw-drag.w,drag.l+e.clientX-drag.sx))+'px';
      box.style.top =Math.max(0,Math.min(drag.zh-drag.h,drag.t+e.clientY-drag.sy))+'px';
      scheduleProductLayoutPost(box);
    });
    box.addEventListener('pointerup',finishDrag);
    box.addEventListener('pointercancel',finishDrag);
    box.addEventListener('lostpointercapture',finishDrag);
    box.addEventListener('wheel',function(e){
      e.preventDefault();
      var zr=zone.getBoundingClientRect(),br=box.getBoundingClientRect();
      var sc=e.deltaY<0?1.08:.93,r=parseFloat(box.dataset.ratio)||1;
      var w=Math.max(40,Math.min(br.width*sc,zr.width*.95)),bh=w/r;
      if(bh<30){bh=30;w=bh*r;} if(bh>zr.height*.95){bh=zr.height*.95;w=bh*r;}
      var cx=(br.left-zr.left)+br.width/2,cy=(br.top-zr.top)+br.height/2;
      box.dataset.manualLayout = '1';
      box.style.left=Math.max(0,Math.min(cx-w/2,zr.width-w))+'px';
      box.style.top =Math.max(0,Math.min(cy-bh/2,zr.height-bh))+'px';
      box.style.width=w+'px'; box.style.height=bh+'px';
      bnRelayoutProductBox(box);
      postProductLayout(box);
    },{passive:false});
  }

  /* ════════════════════════════════════════════════════
     人物圖（.bn-char-box）輔助函式，跟商品的 .bn-prod-box 共用同一個 zone，
     但不參與 layoutProducts() 的三角排版計算，也不受它的邊界 clamp 限制。
     ════════════════════════════════════════════════════ */
  var CHAR_Z_BASE = 400; /* 人物 z-index 基準，跟商品(11~一百多內)清楚分層，不會互相打架 */

  var CHAR_GRADIENT_CLASSES = ['漸層左','漸層右','漸層上','漸層下'];
  var CHAR_DDCARD_PROTECTION_CLASSES = ['下保護'];

  /* 人物專用漸層：原本的漸層仍留在畫布原本的位置與 z-index；
     這裡複製目前版型已啟用的漸層樣式，放進人物 box 內，並用人物
     原圖的 alpha 當 mask。人物仍維持原本跟商品的前後關係，漸層只會
     壓在人物本身。首頁 LOGO 牆目前沒有漸層 class，因此不會憑空新增
     未定義的首頁漸層。 */
  function getCharGradientSources(){
    var canvas = document.getElementById('canvas');
    if(!canvas) return [];
    /* 2026-11-14：人物（含代言人照）上方不刷淡，只保留下方／左右的漸層；頭部超出時照原樣直接被畫布邊界切掉。 */
    var sourceClasses = CHAR_GRADIENT_CLASSES.filter(function(cls){ return cls !== '漸層上'; });
    if(_bnDdcardTemplate) sourceClasses = sourceClasses.concat(CHAR_DDCARD_PROTECTION_CLASSES);
    return sourceClasses.map(function(cls){
      return canvas.querySelector('.' + cls);
    }).filter(function(el){
      if(!el) return false;
      var cs = window.getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0;
    });
  }

  function ensureCharGradientMask(box){
    if(!box) return null;
    var mask = box.querySelector('.bn-char-gradient-mask');
    if(mask) return mask;
    mask = document.createElement('canvas');
    mask.className = 'bn-char-gradient-mask';
    mask.style.cssText = [
      'position:absolute;left:0;top:0;width:100%;height:100%;',
      'pointer-events:none;z-index:2;display:none;'
    ].join('');
    var img = box.querySelector('img');
    if(img) img.insertAdjacentElement('afterend', mask);
    else box.insertBefore(mask, box.firstChild || null);
    return mask;
  }

  function parseCharGradient(ctx, backgroundImage, direction, width, height){
    var text = String(backgroundImage || '');
    if(text.indexOf('linear-gradient') === -1) return null;
    var colorM = text.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)\s*0%/i);
    if(!colorM) colorM = text.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
    if(!colorM) return null;
    var stopM = text.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)\s*([\d.]+)%/i);
    var stop = stopM ? Math.min(1, parseFloat(stopM[1]) / 100) : 1;
    var dir = String(direction || 'to right').trim().toLowerCase();
    var coords = {
      'to right':[0,0,width,0],
      'to left':[width,0,0,0],
      'to bottom':[0,0,0,height],
      'to top':[0,height,0,0]
    }[dir] || [0,0,width,0];
    var grad = ctx.createLinearGradient(coords[0], coords[1], coords[2], coords[3]);
    var solid = 'rgb(' + colorM[1] + ',' + colorM[2] + ',' + colorM[3] + ')';
    var clear = 'rgba(' + colorM[1] + ',' + colorM[2] + ',' + colorM[3] + ',0)';
    grad.addColorStop(0, solid);
    grad.addColorStop(stop, clear);
    grad.addColorStop(1, clear);
    return grad;
  }

  /* 2026-11-14：人物（人物圖、代言人照）上緣不能超過商品範圍（作圖區）上緣，跟商品一樣；
     下方、左右維持原本可出血的規則。拖曳、縮放、自動排版、還原存檔後都會經過這裡。 */
  function clampPersonTop(box){
    if(!box || !box.style) return;
    var isPerson = box.classList.contains('bn-char-box') || (box.dataset && box.dataset.endorser === 'photo');
    if(!isPerson) return;
    var t = parseFloat(box.style.top);
    if(isFinite(t) && t < 0) box.style.top = '0px';
  }
  function syncCharGradientOverlay(box){
    if(!box) return;
    clampPersonTop(box);
    /* 簽名檔是細筆畫的透明圖，不套人物專用漸層，避免筆畫被染成背景色。 */
    if(box.dataset && box.dataset.noGradient === '1'){
      var noMask = box.querySelector('.bn-char-gradient-mask');
      if(noMask) noMask.style.display = 'none';
      return;
    }
    var mask = ensureCharGradientMask(box);
    var img = box.querySelector('img');
    var canvas = document.getElementById('canvas');
    if(!mask || !img || !canvas) return;
    var boxWidth = box.offsetWidth || parseFloat(window.getComputedStyle(box).width) || 0;
    var boxHeight = box.offsetHeight || parseFloat(window.getComputedStyle(box).height) || 0;
    var naturalW = img.naturalWidth || 0;
    var naturalH = img.naturalHeight || 0;
    if(!boxWidth || !boxHeight || !naturalW || !naturalH){
      mask.style.display = 'none';
      return;
    }

    mask.width = Math.max(1, Math.round(boxWidth));
    mask.height = Math.max(1, Math.round(boxHeight));
    mask.style.display = '';
    var ctx = mask.getContext('2d');
    if(!ctx) return;
    ctx.clearRect(0, 0, mask.width, mask.height);

    var boxRect = box.getBoundingClientRect();
    var canvasRect = canvas.getBoundingClientRect();
    var canvasCssW = canvas.offsetWidth || parseFloat(window.getComputedStyle(canvas).width) || canvasRect.width || 1;
    var canvasScale = (canvasRect.width || canvasCssW) / canvasCssW || 1;
    var sources = getCharGradientSources();
    if(!sources.length){
      ctx.clearRect(0, 0, mask.width, mask.height);
      mask.style.display = 'none';
      return;
    }

    var fullProtectionSources = [];
    sources.forEach(function(source){
      var sourceRect = source.getBoundingClientRect();
      var cs = window.getComputedStyle(source);
      var direction = cs.getPropertyValue('--grad-dir').trim();
      if(!direction){
        for(var i=0;i<CHAR_GRADIENT_CLASSES.length;i++){
          if(source.classList.contains(CHAR_GRADIENT_CLASSES[i])){
            direction = ({'漸層左':'to right','漸層右':'to left','漸層上':'to bottom','漸層下':'to top'})[CHAR_GRADIENT_CLASSES[i]];
            break;
          }
        }
      }
      var left = (sourceRect.left - boxRect.left) / canvasScale;
      var top = (sourceRect.top - boxRect.top) / canvasScale;
      var width = sourceRect.width / canvasScale;
      var height = sourceRect.height / canvasScale;
      var grad = parseCharGradient(ctx, cs.backgroundImage, direction, width, height);
      var solid = (!grad && cs.backgroundImage === 'none' && cs.backgroundColor && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)')
        ? cs.backgroundColor : null;
      if((!grad && !solid) || width <= 0 || height <= 0) return;
      if(_bnDdcardTemplate && source.classList.contains('下保護') && solid){
        fullProtectionSources.push({left:left, top:top, width:width, height:height, color:solid});
      }
      ctx.save();
      ctx.translate(left, top);
      ctx.fillStyle = grad || solid;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    });

    /* 以人物圖的實際 alpha 遮罩漸層，讓透明背景區不會被染色。 */
    var imageRatio = naturalW / naturalH;
    var drawW = boxWidth, drawH = boxWidth / imageRatio;
    if(drawH > boxHeight){ drawH = boxHeight; drawW = boxHeight * imageRatio; }
    var drawX = (boxWidth - drawW) / 2;
    var drawY = (boxHeight - drawH) / 2;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.globalCompositeOperation = 'source-over';

    /* ddcard 的最下方「下保護」是背景色實體色塊，不應再受人物 alpha
       鏤空影響；最後用完整矩形壓上，才能把人物外框完全蓋住。 */
    fullProtectionSources.forEach(function(protection){
      ctx.fillStyle = protection.color;
      ctx.fillRect(protection.left, protection.top, protection.width, protection.height);
    });
  }

  function syncAllCharGradientOverlays(){
    var canvas = document.getElementById('canvas');
    if(!canvas) return;
    canvas.querySelectorAll('.bn-char-box').forEach(syncCharGradientOverlay);
  }

  function createCharBox(slotKey, data, zone){
    var old = zone.querySelector('.bn-char-box[data-slot="'+slotKey+'"]');
    if(old) old.remove();
    var box = document.createElement('div');
    box.className = 'bn-char-box';
    box.dataset.slot = slotKey;
    box.dataset.id = data.id;
    box.dataset.ratio = data.ratio || 1;
    box.dataset.aboveMain = (data.aboveMain !== false) ? '1' : '0';
    var img = document.createElement('img');
    img.src = data.src;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;display:block;';
    img.addEventListener('load', function(){ syncCharGradientOverlay(box); });
    box.appendChild(img);
    ['nw','ne','sw','se'].forEach(function(c){
      var h = document.createElement('div'); h.dataset.corner = c;
      h.style.cssText = 'position:absolute;width:14px;height:14px;border-radius:50%;background:#e2874a;border:2px solid #fff;z-index:5;'
        +(c==='nw'?'left:-7px;top:-7px;cursor:nwse-resize;':'')
        +(c==='ne'?'right:-7px;top:-7px;cursor:nesw-resize;':'')
        +(c==='sw'?'left:-7px;bottom:-7px;cursor:nesw-resize;':'')
        +(c==='se'?'right:-7px;bottom:-7px;cursor:nwse-resize;':'');
      box.appendChild(h);
    });
    box.style.position = 'absolute';
    box.style.cursor = 'move';
    box.style.boxSizing = 'border-box';
    box.style.outline = '2px solid transparent';
    zone.appendChild(box);
    return box;
  }

  /* 新上傳、沒有已存位置可還原時的預設大小：置中、約 zone 較短邊的 90%，維持原比例。 */
  function applyDefaultCharLayout(box, zone){
    var cs = window.getComputedStyle(zone);
    var zw = parseFloat(cs.width)  || zone.offsetWidth  || 300;
    var zh = parseFloat(cs.height) || zone.offsetHeight || 300;
    var ratio = Math.max(0.1, parseFloat(box.dataset.ratio) || 0.75);
    var target = Math.floor(Math.min(zw, zh) * 0.9);
    var w, h;
    if(ratio >= 1){ w = target; h = Math.round(target / ratio); }
    else { h = target; w = Math.round(target * ratio); }
    box.style.left = Math.round((zw - w) / 2) + 'px';
    box.style.top  = Math.round((zh - h) / 2) + 'px';
    box.style.width  = w + 'px';
    box.style.height = h + 'px';
  }

  /* 套用已存的位置/大小（暫存還原、方橫配對同步）。刻意不做邊界 clamp——
     人物圖本來就可以超出商品範圍，甚至超出畫布邊緣。 */
  function applySavedCharLayout(box, zone, layout){
    if(!layout) return false;
    var cs = window.getComputedStyle(zone);
    var zw = parseFloat(cs.width)  || zone.offsetWidth  || 1;
    var zh = parseFloat(cs.height) || zone.offsetHeight || 1;
    var area=layout.syncAreaMode?getProductSyncArea(zone):{left:0,top:0,width:zw,height:zh};
    var l = layout.leftPct   !== undefined ? area.left+layout.leftPct   * area.width : layout.left;
    var t = layout.topPct    !== undefined ? area.top+layout.topPct    * area.height : layout.top;
    var w = layout.widthPct  !== undefined ? layout.widthPct  * area.width : layout.width;
    var h = layout.heightPct !== undefined ? layout.heightPct * area.height : layout.height;
    if(!isFinite(l) || !isFinite(t) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return false;
    box.style.left = l + 'px'; box.style.top = t + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
    return true;
  }

  function postCharacterLayout(box,options){
    try{
      var zone = getProductZone(); if(!zone || !box) return;
      var zr = zone.getBoundingClientRect();
      var br = box.getBoundingClientRect();
      var css=window.getComputedStyle(zone),zw=parseFloat(css.width)||zone.offsetWidth||zr.width||1,zh=parseFloat(css.height)||zone.offsetHeight||zr.height||1;
      var sx=zr.width/zw||1,sy=zr.height/zh||1,area=getProductSyncArea(zone);
      var left=(br.left-zr.left)/sx,top=(br.top-zr.top)/sy,width=br.width/sx,height=br.height/sy;
      var data = {
        type:'bn-character-layout-update',
        bnid:getCurrentBnId(),
        id:box.dataset.id,
        snapshotOnly:!!(options&&options.snapshotOnly),requestId:options&&options.requestId,
        layout:{
          left:left,top:top,width:width,height:height,
          leftPct:(left-area.left)/area.width,topPct:(top-area.top)/area.height,
          widthPct:width/area.width,heightPct:height/area.height,syncAreaMode:area.mode
        }
      };
      /* 代言人：照片另記新規則位置（efr），簽名檔另記文字塊關係（textRel，字級為單位）；
         src＝位置是在哪個版位調的，其他版位據此判斷要不要自動配合。
         photoRel 是舊版欄位，保留給舊暫存相容。 */
      if(box.classList.contains('bn-endorser-box')){
        var eg = endorserGeom(zone), ebr = endorserBoxRect(box);
        data.layout.src = box._bnLayoutSrc || getCurrentBnId();
        if(box.dataset.endorser === 'photo'){
          data.layout.efr = endorserFrameFromRect(ebr, eg);
        } else {
          var ephoto = zone.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
          if(ephoto){
            var epr = endorserBoxRect(ephoto), eunit = epr.height || 1;
            data.layout.photoRel = {x:(ebr.left - epr.left) / eunit, y:(ebr.top - epr.top) / eunit, w:ebr.width / eunit};
            data.layout.textRel = endorserSignRelFromRects(ebr, epr, eg.em);
          }
        }
      }
      if(options && options.migrate) data.migrate = true;
      window.parent && window.parent.postMessage(data, '*');
    }catch(_){ }
  }

  function scheduleCharLayoutPost(box){
    if(!box) return;
    if(box._bnPostTimer) cancelAnimationFrame(box._bnPostTimer);
    box._bnPostTimer = requestAnimationFrame(function(){
      box._bnPostTimer = null;
      postCharacterLayout(box);
    });
  }

  /* 跟 setupProdDrag 幾乎一樣，唯一差異：完全不做邊界 clamp，
     人物圖可以自由拖到商品範圍外、甚至畫布外。 */
  function setupCharDrag(box, zone){
    var drag = null;
    function finishDrag(){if(drag&&drag.changed)postCharacterLayout(box);drag=null;box.style.outline='2px solid transparent';}
    box.addEventListener('pointerdown', function(e){
      if(e.target.dataset.corner) return;
      e.stopPropagation();
      drag = {type:'move', sx:e.clientX, sy:e.clientY, l:box.offsetLeft, t:box.offsetTop};
      box.setPointerCapture(e.pointerId); box.style.outline = '2px solid #e2874a';
    });
    box.querySelectorAll('[data-corner]').forEach(function(h){
      h.addEventListener('pointerdown', function(e){
        e.stopPropagation();
        var br = box.getBoundingClientRect();
        drag = {type:'resize', corner:h.dataset.corner, sx:e.clientX, sy:e.clientY,
          l:box.offsetLeft, t:box.offsetTop, w:br.width, h:br.height, ratio:parseFloat(box.dataset.ratio)||1};
        h.setPointerCapture(e.pointerId); box.style.outline = '2px solid #e2874a'; e.preventDefault();
      });
      h.addEventListener('pointermove', function(e){
        if(!drag || drag.type !== 'resize') return;
        var dx=e.clientX-drag.sx, dy=e.clientY-drag.sy, c=drag.corner, r=drag.ratio;
        if(dx===0&&dy===0)return;drag.changed=true;
        var sX = c.indexOf('w')!==-1 ? -1 : 1, sY = c.indexOf('n')!==-1 ? -1 : 1;
        var delta = Math.abs(dx) > Math.abs(dy) ? dx*sX : dy*sY*r;
        var w = Math.max(30, drag.w+delta), bh = w/r;
        if(bh < 24){ bh = 24; w = bh*r; }
        var l = drag.l, t = drag.t;
        if(c.indexOf('w') !== -1) l = drag.l + (drag.w - w);
        if(c.indexOf('n') !== -1) t = drag.t + (drag.h - bh);
        box.dataset.manualLayout = '1';
        box.style.left=l+'px'; box.style.top=t+'px'; box.style.width=w+'px'; box.style.height=bh+'px';
        syncCharGradientOverlay(box);
        scheduleCharLayoutPost(box);
      });
      h.addEventListener('pointerup', finishDrag);
      h.addEventListener('pointercancel', finishDrag);
      h.addEventListener('lostpointercapture', finishDrag);
    });
    box.addEventListener('pointermove', function(e){
      if(!drag || drag.type !== 'move') return;
      if(e.clientX===drag.sx&&e.clientY===drag.sy)return;drag.changed=true;
      box.dataset.manualLayout = '1';
      box.style.left = (drag.l + e.clientX - drag.sx) + 'px';
      box.style.top  = (drag.t + e.clientY - drag.sy) + 'px';
      syncCharGradientOverlay(box);
      scheduleCharLayoutPost(box);
    });
    box.addEventListener('pointerup', finishDrag);
    box.addEventListener('pointercancel', finishDrag);
    box.addEventListener('lostpointercapture', finishDrag);
    box.addEventListener('wheel', function(e){
      e.preventDefault();
      var br = box.getBoundingClientRect();
      var sc = e.deltaY < 0 ? 1.08 : .93, r = parseFloat(box.dataset.ratio) || 1;
      var w = Math.max(30, br.width*sc), bh = w/r;
      if(bh < 24){ bh = 24; w = bh*r; }
      var cx = box.offsetLeft + br.width/2, cy = box.offsetTop + br.height/2;
      box.dataset.manualLayout = '1';
      box.style.left = (cx - w/2) + 'px'; box.style.top = (cy - bh/2) + 'px';
      box.style.width = w + 'px'; box.style.height = bh + 'px';
      syncCharGradientOverlay(box);
      postCharacterLayout(box);
    }, {passive:false});
  }

  /* 取得目前畫面上「還顯示著」的商品裡，z-index 最大的那個(=最上層)。
     bn-character-visibility 隱藏掉的商品(display:none)不列入計算。 */
  function getTopVisibleProductZ(zone){
    var boxes = Array.prototype.slice.call(zone.querySelectorAll('.bn-prod-box')).filter(function(b){
      return b.style.display !== 'none';
    });
    var maxZ = 10;
    boxes.forEach(function(b){
      var z = parseInt(b.style.zIndex, 10) || 0;
      if(z > maxZ) maxZ = z;
    });
    return maxZ;
  }

  /* 重新計算並套用兩個人物欄位的 z-index：
     - 兩個人物都存在 → 商品此時已完全隱藏，兩個人物只跟彼此比前後
       （由 bn-character-pair-order 廣播的 pairFirst 決定，存在 zone.dataset.charPairFirst）。
     - 0~1 個人物 → 每個人物依自己的 aboveMain，跟「目前最上層商品」比前後。 */
  function applyCharacterZ(){
    var zone = getProductZone(); if(!zone) return;
    var box1 = zone.querySelector('.bn-char-box[data-slot="_bnCharacter"]');
    var box2 = zone.querySelector('.bn-char-box[data-slot="_bnCharacter2"]');
    if(box1 && box2){
      var pairFirst = zone.dataset.charPairFirst || '_bnCharacter';
      if(pairFirst === '_bnCharacter'){ box1.style.zIndex = String(CHAR_Z_BASE+2); box2.style.zIndex = String(CHAR_Z_BASE+1); }
      else { box2.style.zIndex = String(CHAR_Z_BASE+2); box1.style.zIndex = String(CHAR_Z_BASE+1); }
      applyEndorserZ(zone, CHAR_Z_BASE+2);
      return;
    }
    var topZ = getTopVisibleProductZ(zone);
    [box1, box2].forEach(function(box){
      if(!box) return;
      var above = box.dataset.aboveMain !== '0';
      box.style.zIndex = above ? String(topZ + 5) : String(Math.max(1, topZ - 5));
    });
    applyEndorserZ(zone, topZ);
  }

  /* 代言人的前後順序（跟 MSBN 一樣）：
     - 代言人照依 aboveMain 跟「目前最上層商品」比前後（預設在商品後面）。
     - 簽名檔永遠蓋在代言人照與商品上面；代言人小字再蓋在簽名檔上面。 */
  function applyEndorserZ(zone, refZ){
    if(!zone) return;
    var photo = zone.querySelector('.bn-endorser-box[data-slot="_bnEndorserPhoto"]');
    var sign = zone.querySelector('.bn-endorser-box[data-slot="_bnEndorserSign"]');
    var note = zone.querySelector('.bn-endorser-note');
    var photoZ = refZ;
    if(photo){
      photoZ = photo.dataset.aboveMain === '1' ? refZ + 6 : Math.max(1, refZ - 4);
      photo.style.zIndex = String(photoZ);
    }
    var signZ = Math.max(refZ, photoZ) + 8;
    if(sign) sign.style.zIndex = String(signZ);
    if(note) note.style.zIndex = String(signZ + 1);
  }

  /* 部分版位（目前是 SearchICON_PRODUCT，依檔名判斷，見 _bnSingleProductOnlyTemplate）
     不管全域人物圖/商品狀態如何，固定套用「人物圖完全不顯示、商品只顯示『主品』
     （position===0，主品（中），跟左配品/右配品區分）那一張」的規則。
     用 display:none 隱藏，不用 remove() 整個刪掉——之後如果使用者把主品換掉、
     或重新上傳，隱藏的商品可以立刻恢復，不會憑空消失。
     如果目前根本沒有主品（例如只上傳了左配品/右配品，或主品被移除），
     這個版位就固定不顯示任何商品，不會拿配品頂替。 */
  function applySingleProductOnlyIfNeeded(zone){
    if(!zone) return;
    var boxes = Array.prototype.slice.call(zone.querySelectorAll('.bn-prod-box'));
    if(_bnHomepageLogoWallTemplate){
      /* 首頁 LOGO 牆：只允許商品圖第 1 張，人物圖與其他商品全部隱藏。 */
      zone.querySelectorAll('.bn-char-box').forEach(function(b){ b.style.display = 'none'; });
      boxes.forEach(function(b, i){ b.style.display = (i === 0) ? '' : 'none'; });
      return;
    }
    if(!boxes.length) return;

    if(_bnSingleProductOnlyTemplate){
      zone.querySelectorAll('.bn-char-box').forEach(function(b){ b.style.display = 'none'; });
      var main = boxes.filter(function(b){ return (b.dataset.position || '0') === '0'; })[0] || null;
      boxes.forEach(function(b){ b.style.display = (b === main) ? '' : 'none'; });
    }
  }

  /* ════════════════════════════════════════════════════
     代言人照／簽名檔／代言人小字 輔助函式
     ════════════════════════════════════════════════════ */
  var ENDORSER_COLOR = '#a855f7';
  var ENDORSER_NOTE_DARK = '#111827';
  var ENDORSER_NOTE_LIGHT = '#ffffff';
  /* MSBN 代言人小字是 1200px 寬的版位用 24px。各版位在 App 上一樣是滿版寬顯示，
     所以照畫布寬度等比換算，手機上看起來就跟 MSBN 一樣大；ddcard 是兩欄小卡（約半個螢幕寬），
     以 600px 當基準。 */
  var ENDORSER_NOTE_FONT_PX = 24;
  var ENDORSER_NOTE_REF_WIDTH = _bnDdcardTemplate ? 600 : 1200;
  var _bnEndorserNoteState = {text:'', color:''};
  var _bnBgSampleState = null; /* 最後一次 bn-bg 的參數，代言人小字取樣背景亮度用 */

  function getEndorserBox(slot){
    var zone = getProductZone();
    return zone ? zone.querySelector('.bn-endorser-box[data-slot="'+slot+'"]') : null;
  }
  function endorserBoxRect(box){
    return {
      left: parseFloat(box.style.left) || 0,
      top: parseFloat(box.style.top) || 0,
      width: parseFloat(box.style.width) || box.offsetWidth || 0,
      height: parseFloat(box.style.height) || box.offsetHeight || 0
    };
  }
  function setEndorserBoxRect(box, l, t, w, h){
    box.style.left = l + 'px'; box.style.top = t + 'px';
    box.style.width = w + 'px'; box.style.height = h + 'px';
  }

  /* 預設擺法（匯入時、還沒有存過位置）：
     - 代言人照：放右邊；有效商品區高度 94%、寬度不超過一半，底部對齊。
     - 照片左邊：上面是代言人小字、下面是簽名檔，跟照片不重疊、只隔一點點；
       小字＋簽名整組的垂直中心大約在照片高度的一半。間距與簽名大小都用小字字級（em）算，
       每個版位看起來一樣近。 */
  var ENDORSER_DEFAULT_GAP_X = 0.5;   /* 文字塊與照片的距離（em） */
  var ENDORSER_DEFAULT_GAP_Y = 0.35;  /* 小字與簽名檔的距離（em） */
  var ENDORSER_DEFAULT_SIGN_W = 5;    /* 預設簽名檔寬度（em），跟一排 5 字的小字一樣寬 */
  function endorserDefaultTextBlock(P, em, signRatio, nm, hasSign){
    var gapX = em * ENDORSER_DEFAULT_GAP_X, gapY = em * ENDORSER_DEFAULT_GAP_Y;
    var hasNote = !!(nm && nm.w > 0 && nm.h > 0);
    var sw = hasSign ? em * ENDORSER_DEFAULT_SIGN_W : 0;
    var sh = hasSign ? sw / Math.max(0.05, signRatio || 2) : 0;
    var blockW = Math.max(sw, hasNote ? nm.w : 0);
    var blockH = sh + (hasNote ? nm.h : 0) + (hasNote && hasSign ? gapY : 0);
    var left = P.left - gapX - blockW;
    var top = P.top + P.height / 2 - blockH / 2;
    return {
      N: hasNote ? {left:left, top:top, width:nm.w, height:nm.h} : null,
      S: hasSign ? {left:left, top:top + (hasNote ? nm.h + gapY : 0), width:sw, height:sh} : null
    };
  }
  function applyDefaultEndorserLayout(box, zone){
    var area = getProductSyncArea(zone);
    var ratio = Math.max(0.1, parseFloat(box.dataset.ratio) || 0.75);
    if(box.dataset.endorser !== 'sign'){
      var h = area.height * 0.94, w = h * ratio;
      var maxW = area.width * 0.5;
      if(w > maxW){ w = maxW; h = w / ratio; }
      setEndorserBoxRect(box, area.left + area.width - w, area.top + area.height - h, w, h);
      return;
    }
    /* 簽名檔先單獨排在照片左邊、垂直置中；小字出現後 arrangeEndorser 會把兩者當一組重排 */
    var photo = getEndorserBox('_bnEndorserPhoto');
    var P = photo ? endorserBoxRect(photo)
      : {left: area.left + area.width, top: area.top, width: 0, height: area.height};
    var blk = endorserDefaultTextBlock(P, endorserNoteBaseFontSize(), ratio, null, true);
    setEndorserBoxRect(box, blk.S.left, blk.S.top, blk.S.width, blk.S.height);
  }

  /* ════ 代言人：各版位自動配合 ════
     HBN（主要指標）與 LPBN（第二指標）是編輯代言人的版位，其他版位照下面的規則自動配合：
     - 代言人照：橫式版位照「畫面高度」換算大小與頭頂留白，靠邊的距離從商品區邊緣算；
       直式版位（ddcard、IG）照商品區高度換算。照片框永遠跟圖片同比例，不會被拉長。
     - 簽名檔＋小字：一組文字塊，大小跟小字的 24px 規則（字級，em）一起換算；
       離照片的左右距離用字級當單位，上下跟著照片的身體位置。
     - 自動配合時：人像左右與上方不出框（下方可以出血），三者避開文字區
       （主標、副標、日期、品牌名、LOGO），簽名＋小字整塊不出框。
       在這個版位手動拖曳過，就尊重手動位置，不再自動調整。 */
  var ENDORSER_TEXT_SELECTOR = '.主標,.副標,.日期,.品牌名,.ICON獨立文案,.副標案型七字內,.六字內';
  var ENDORSER_CTA_SELECTOR = '.cta底,.逛逛去底,.cta圓底';
  var _bnEndorserMasterTemplate = /^(?:hbn_|lpbn_)/i.test(fname || '');

  function endorserGeom(zone){
    var cv = document.getElementById('canvas');
    var root = window.getComputedStyle(document.documentElement);
    var CW = parseFloat(root.getPropertyValue('--canvas-w')) || (cv && cv.offsetWidth) || 1200;
    var CH = parseFloat(root.getPropertyValue('--canvas-h')) || (cv && cv.offsetHeight) || 400;
    var cs = window.getComputedStyle(zone);
    var ZW = parseFloat(cs.width) || zone.offsetWidth || 1;
    var ZH = parseFloat(cs.height) || zone.offsetHeight || 1;
    var zr = zone.getBoundingClientRect();
    var cr = cv ? cv.getBoundingClientRect() : zr;
    var sc = cr.width > 0 ? cr.width / CW : 1;
    if(!(sc > 0) || !isFinite(sc)) sc = 1;
    return {CW:CW, CH:CH, ZW:ZW, ZH:ZH, ZX:(zr.left - cr.left) / sc, ZY:(zr.top - cr.top) / sc,
      sc:sc, portrait:CH > CW, em:endorserNoteBaseFontSize()};
  }
  function endorserImgRatio(box){ return Math.max(0.05, parseFloat(box && box.dataset.ratio) || 0.75); }
  /* 代言人照的位置（efr）：同時記「畫面高度」與「商品區高度」兩種單位，套用時依版位方向選一種 */
  function endorserFrameFromRect(r, g){
    var side = (r.left + r.width / 2) >= g.ZW / 2 ? 'right' : 'left';
    var edge = side === 'right' ? g.ZW - (r.left + r.width) : r.left;
    return {v:1, side:side, portrait:g.portrait,
      hC:r.height / g.CH, topC:(g.ZY + r.top) / g.CH, edgeC:edge / g.CH,
      hZ:r.height / g.ZH, topZ:r.top / g.ZH, edgeZ:edge / g.ZH};
  }
  function endorserRectFromFrame(f, g, ratio){
    if(!f) return null;
    var useCanvas = !g.portrait && !f.portrait;
    var unit = useCanvas ? g.CH : g.ZH;
    var h = (useCanvas ? f.hC : f.hZ) * unit;
    var edge = (useCanvas ? f.edgeC : f.edgeZ) * unit;
    var top = useCanvas ? f.topC * g.CH - g.ZY : f.topZ * g.ZH;
    if(!(h > 0) || !isFinite(h) || !isFinite(edge) || !isFinite(top)) return null;
    var w = h * ratio;
    var left = f.side === 'left' ? edge : g.ZW - edge - w;
    return {left:left, top:top, width:w, height:h};
  }
  /* 文字型元素相對照片：靠照片哪一側、離照片邊多少字級（em）、垂直中心在照片高度的哪裡 */
  function endorserRelToPhoto(r, P, em){
    var side = (r.left + r.width / 2) <= (P.left + P.width / 2) ? 'L' : 'R';
    return {side:side,
      dx: side === 'L' ? (r.left + r.width - P.left) / em : (r.left - (P.left + P.width)) / em,
      cy: (r.top + r.height / 2 - P.top) / (P.height || 1)};
  }
  function endorserPlaceByPhotoRel(rel, P, em, w, h){
    var left = rel.side === 'R' ? P.left + P.width + rel.dx * em : P.left + rel.dx * em - w;
    return {left:left, top:P.top + rel.cy * P.height - h / 2, width:w, height:h};
  }
  function endorserSignRelFromRects(S, P, em){
    var t = endorserRelToPhoto(S, P, em);
    t.w = S.width / em;
    return t;
  }
  function endorserNoteRelFromRect(N, S, P, em){
    if(S) return {to:'sign', x:(N.left - S.left) / em, y:(N.top - S.top) / em};
    if(P){ var t = endorserRelToPhoto(N, P, em); t.to = 'photo'; return t; }
    return null;
  }
  /* 位置是從哪個版位來的：別的版位連動過來（或舊資料在一般版位）就自動配合；
     這個版位自己手動調的（或舊資料在 HBN／LPBN）就照原樣。 */
  function endorserSrcInfo(layout){
    var own = getCurrentBnId();
    if(layout && layout.src) return {src:String(layout.src), auto:String(layout.src) !== own};
    return {src:_bnEndorserMasterTemplate ? own : 'legacy', auto:!_bnEndorserMasterTemplate};
  }
  function endorserBasePhotoRect(photo, g){
    if(photo._bnFrame){
      var r = endorserRectFromFrame(photo._bnFrame, g, endorserImgRatio(photo));
      if(r) return r;
    }
    return endorserBoxRect(photo);
  }
  function applyEndorserBoxLayout(box, zone, layout){
    if(!layout) return false;
    var g = endorserGeom(zone), info = endorserSrcInfo(layout);
    if(box.dataset.endorser === 'photo'){
      var f = layout.efr && layout.efr.v ? JSON.parse(JSON.stringify(layout.efr)) : null;
      if(!f){
        /* 舊資料：照百分比換出的框可能被拉長，先收成圖片比例（置中）再換成新規則 */
        var area = layout.syncAreaMode ? getProductSyncArea(zone) : {left:0, top:0, width:g.ZW, height:g.ZH};
        var l = layout.leftPct !== undefined ? area.left + layout.leftPct * area.width : layout.left;
        var t = layout.topPct !== undefined ? area.top + layout.topPct * area.height : layout.top;
        var w = layout.widthPct !== undefined ? layout.widthPct * area.width : layout.width;
        var h = layout.heightPct !== undefined ? layout.heightPct * area.height : layout.height;
        if(!isFinite(l) || !isFinite(t) || !(w > 0) || !(h > 0)) return false;
        var ratio = endorserImgRatio(box), vw = w, vh = h;
        if(w / h > ratio) vw = h * ratio; else vh = w / ratio;
        f = endorserFrameFromRect({left:l + (w - vw) / 2, top:t + (h - vh) / 2, width:vw, height:vh}, g);
      }
      box._bnFrame = f;
      var pr = endorserRectFromFrame(f, g, endorserImgRatio(box));
      if(pr) setEndorserBoxRect(box, pr.left, pr.top, pr.width, pr.height);
    } else {
      var tr = layout.textRel;
      if(tr && isFinite(tr.dx) && isFinite(tr.cy) && tr.w > 0){
        box._bnTextRel = {side:tr.side === 'R' ? 'R' : 'L', dx:Number(tr.dx), cy:Number(tr.cy), w:Number(tr.w)};
      } else {
        /* 舊資料：photoRel（單位＝照片高）或百分比，先擺出來再換成文字塊關係 */
        var photo = getEndorserBox('_bnEndorserPhoto');
        var rel = layout.photoRel, rect = null;
        if(photo && rel && isFinite(rel.x) && isFinite(rel.y) && rel.w > 0){
          var P = endorserBasePhotoRect(photo, g), u = P.height || 1;
          var sw = rel.w * u;
          rect = {left:P.left + rel.x * u, top:P.top + rel.y * u, width:sw, height:sw / endorserImgRatio(box)};
        } else if(applySavedCharLayout(box, zone, layout)){
          rect = endorserBoxRect(box);
        }
        if(!rect) return false;
        setEndorserBoxRect(box, rect.left, rect.top, rect.width, rect.height);
        box._bnTextRel = photo ? endorserSignRelFromRects(rect, endorserBasePhotoRect(photo, g), g.em) : null;
      }
    }
    box._bnLayoutSrc = info.src;
    zone.dataset.endorserAuto = info.auto ? '1' : '0';
    return true;
  }
  /* 依畫面上目前的位置，重算這個版位的基準（照片 efr、簽名檔／小字的相對關係） */
  function endorserRefreshBases(zone, which){
    var g = endorserGeom(zone);
    var photo = getEndorserBox('_bnEndorserPhoto'), sign = getEndorserBox('_bnEndorserSign');
    var note = getEndorserNoteEl(false);
    var P = photo ? endorserBoxRect(photo) : null, S = sign ? endorserBoxRect(sign) : null;
    if(photo && (!which || which.photo)) photo._bnFrame = endorserFrameFromRect(P, g);
    if(sign && (!which || which.sign)) sign._bnTextRel = P ? endorserSignRelFromRects(S, P, g.em) : null;
    if(note && note.style.display !== 'none' && _bnEndorserNoteState.text && (!which || which.note)){
      var N = {left:parseFloat(note.style.left) || 0, top:parseFloat(note.style.top) || 0,
        width:note.offsetWidth || 0, height:note.offsetHeight || 0};
      var lay = note._bnLayout || (note._bnLayout = {});
      lay.manual = true;
      lay.noteRel = endorserNoteRelFromRect(N, S, P, g.em);
    }
  }
  /* 沒有存過位置時的預設擺法，記成這個版位的基準並標成自動配合 */
  function endorserSetDefaultBase(box, zone){
    var isPhoto = box.dataset.endorser === 'photo';
    endorserRefreshBases(zone, {photo:isPhoto, sign:!isPhoto});
    box._bnLayoutSrc = 'default';
    if(zone.dataset.endorserAuto == null) zone.dataset.endorserAuto = '1';
  }
  /* 在這個版位手動拖曳／縮放：三者都記成這個版位自己的位置，之後不再自動調整 */
  function endorserMarkManual(){
    var zone = getProductZone(); if(!zone) return;
    zone.dataset.endorserAuto = '0';
    var own = getCurrentBnId();
    ['_bnEndorserPhoto', '_bnEndorserSign'].forEach(function(slot){
      var b = getEndorserBox(slot); if(b) b._bnLayoutSrc = own;
    });
    var note = getEndorserNoteEl(false);
    if(note) note._bnLayoutSrc = own;
    endorserRefreshBases(zone);
  }
  /* 代言人照移動／縮放後，簽名檔與小字留在原地，但相對照片的位置變了：重新回報。 */
  function repostEndorserCompanions(options){
    var sign = getEndorserBox('_bnEndorserSign');
    if(sign) postCharacterLayout(sign, options);
    repostEndorserNote(options);
  }
  /* 簽名檔動了、小字沒動：小字相對簽名檔的位置變了，也要重新回報 */
  function repostEndorserNote(options){
    var note = getEndorserNoteEl(false);
    if(note && note.style.display !== 'none' && _bnEndorserNoteState.text && note._bnLayout && note._bnLayout.manual){
      markEndorserNoteManual(note);
      postEndorserNoteLayout(note, options);
    }
  }

  function createEndorserBox(slot, data, zone){
    var box = createCharBox(slot, data, zone);
    box.classList.add('bn-endorser-box');
    box.dataset.endorser = slot === '_bnEndorserSign' ? 'sign' : 'photo';
    box.dataset.rotate = String(Number(data.rotate) || 0);
    if(slot === '_bnEndorserSign') box.dataset.noGradient = '1';
    box.title = slot === '_bnEndorserSign' ? '簽名檔' : '代言人照';
    box.querySelectorAll('[data-corner]').forEach(function(h){ h.style.background = ENDORSER_COLOR; });
    var img = box.querySelector('img');
    if(img) img.addEventListener('load', function(){ refreshEndorserNoteColorSoon(); });
    /* 旋轉把手：跟商品一樣，拖曳時只做 CSS 預覽，放開後把增量送回父頁烘進圖片（不加影子）。 */
    var rh = document.createElement('div'); rh.dataset.rotateHandle = '1';
    rh.title = '拖曳旋轉（Shift：每 15°；雙擊：回到 0°）';
    rh.style.cssText = 'position:absolute;left:50%;top:-34px;width:20px;height:34px;margin-left:-10px;z-index:6;cursor:grab;touch-action:none;';
    rh.innerHTML = '<div style="position:absolute;left:50%;top:18px;width:2px;height:16px;margin-left:-1px;background:'+ENDORSER_COLOR+';"></div>'
      + '<div style="position:absolute;left:50%;top:0;width:18px;height:18px;margin-left:-9px;border-radius:50%;background:#fff;border:2px solid '+ENDORSER_COLOR+';box-sizing:border-box;color:'+ENDORSER_COLOR+';font:bold 11px/14px sans-serif;text-align:center;">&#8635;</div>';
    box.appendChild(rh);
    var rb = document.createElement('div'); rb.dataset.rotateBadge = '1';
    rb.style.cssText = 'position:absolute;left:50%;top:-58px;transform:translateX(-50%);display:none;padding:2px 7px;border-radius:10px;background:rgba(20,24,33,.9);color:#fff;font:600 11px/16px sans-serif;white-space:nowrap;pointer-events:none;z-index:7;';
    box.appendChild(rb);
    setupEndorserDrag(box, zone);
    return box;
  }

  /* 跟人物圖一樣不做邊界 clamp（可以超出商品範圍／畫布）。
     代言人照、簽名檔、小字各自獨立：拖哪個只動哪個，不會連帶拉動另外兩個。
     簽名檔與小字的位置以「相對代言人照」記錄（photoRel），連動到其他版位時
     照各版位自己的代言人照擺放，三者在每個版位都一樣靠近，不會因版位比例被拉開。 */
  function setupEndorserDrag(box, zone){
    var drag = null;
    var rot = null;
    var rotHandle = box.querySelector('[data-rotate-handle]');
    var rotBadge = box.querySelector('[data-rotate-badge]');
    function afterChange(){
      syncCharGradientOverlay(box);
    }
    function finishDrag(){
      if(drag && drag.changed){
        endorserMarkManual();
        postCharacterLayout(box);
        /* 代言人照動了、簽名檔與小字沒動：兩者相對照片的位置變了，重新回報，
           連動的版位才會排成一樣的相對位置。簽名檔動了則重報小字。 */
        if(box.dataset.endorser === 'photo') repostEndorserCompanions();
        else repostEndorserNote();
      }
      drag = null;
      box.style.outline = '2px solid transparent';
    }
    box.addEventListener('pointerdown', function(e){
      if(e.button !== undefined && e.button !== 0) return;
      if(e.target.dataset && e.target.dataset.corner) return;
      if(e.target.closest && e.target.closest('[data-rotate-handle]')) return;
      e.stopPropagation();
      drag = {type:'move', sx:e.clientX, sy:e.clientY, l:parseFloat(box.style.left)||0, t:parseFloat(box.style.top)||0};
      box.setPointerCapture(e.pointerId); box.style.outline = '2px solid '+ENDORSER_COLOR;
    });
    box.addEventListener('pointermove', function(e){
      if(!drag || drag.type !== 'move') return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if(!dx && !dy) return;
      drag.changed = true;
      box.dataset.manualLayout = '1';
      box.style.left = (drag.l + dx) + 'px';
      box.style.top  = (drag.t + dy) + 'px';
      afterChange();
    });
    box.addEventListener('pointerup', finishDrag);
    box.addEventListener('pointercancel', finishDrag);
    box.addEventListener('lostpointercapture', finishDrag);

    box.querySelectorAll('[data-corner]').forEach(function(h){
      h.addEventListener('pointerdown', function(e){
        e.stopPropagation(); e.preventDefault();
        var r = endorserBoxRect(box);
        drag = {type:'resize', corner:h.dataset.corner, sx:e.clientX, sy:e.clientY,
          l:r.left, t:r.top, w:r.width, h:r.height, ratio:parseFloat(box.dataset.ratio)||1};
        h.setPointerCapture(e.pointerId); box.style.outline = '2px solid '+ENDORSER_COLOR;
      });
      h.addEventListener('pointermove', function(e){
        if(!drag || drag.type !== 'resize') return;
        var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy, c = drag.corner, r = drag.ratio;
        if(!dx && !dy) return;
        drag.changed = true;
        var sX = c.indexOf('w') !== -1 ? -1 : 1, sY = c.indexOf('n') !== -1 ? -1 : 1;
        var delta = Math.abs(dx) > Math.abs(dy) ? dx * sX : dy * sY * r;
        var w = Math.max(20, drag.w + delta), bh = w / r;
        if(bh < 16){ bh = 16; w = bh * r; }
        var l = drag.l, t = drag.t;
        if(c.indexOf('w') !== -1) l = drag.l + (drag.w - w);
        if(c.indexOf('n') !== -1) t = drag.t + (drag.h - bh);
        box.dataset.manualLayout = '1';
        setEndorserBoxRect(box, l, t, w, bh);
        afterChange();
      });
      h.addEventListener('pointerup', finishDrag);
      h.addEventListener('pointercancel', finishDrag);
      h.addEventListener('lostpointercapture', finishDrag);
    });

    box.addEventListener('wheel', function(e){
      e.preventDefault();
      var r = endorserBoxRect(box);
      var sc = e.deltaY < 0 ? 1.08 : .93, ratio = parseFloat(box.dataset.ratio) || 1;
      var w = Math.max(20, r.width * sc), bh = w / ratio;
      if(bh < 16){ bh = 16; w = bh * ratio; }
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      box.dataset.manualLayout = '1';
      setEndorserBoxRect(box, cx - w / 2, cy - bh / 2, w, bh);
      afterChange();
      endorserMarkManual();
      postCharacterLayout(box);
      if(box.dataset.endorser === 'photo') repostEndorserCompanions();
      else repostEndorserNote();
    }, {passive:false});

    if(!rotHandle) return;
    function fmtDeg(d){ return (Math.round(d*10)/10).toFixed(d % 1 ? 1 : 0).replace(/\.0$/,'') + '°'; }
    function normDeg(d){ d = ((d % 360) + 360) % 360; return d > 180 ? d - 360 : d; }
    function postRotate(payload){
      try{
        window.parent && window.parent.postMessage(Object.assign({type:'bn-endorser-rotate', bnid:getCurrentBnId(), slot:box.dataset.slot, id:box.dataset.id}, payload), '*');
        return true;
      }catch(_){ return false; }
    }
    rotHandle.addEventListener('pointerdown', function(e){
      if(e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      var br = box.getBoundingClientRect();
      var cx = br.left + br.width/2, cy = br.top + br.height/2;
      rot = {cx:cx, cy:cy, start:Math.atan2(e.clientY - cy, e.clientX - cx), base:parseFloat(box.dataset.rotate) || 0, delta:0};
      rotHandle.setPointerCapture(e.pointerId);
      rotHandle.style.cursor = 'grabbing';
      box.style.outline = '2px solid '+ENDORSER_COLOR;
      if(rotBadge){ rotBadge.textContent = fmtDeg(rot.base); rotBadge.style.display = 'block'; }
    });
    rotHandle.addEventListener('pointermove', function(e){
      if(!rot) return;
      var a = Math.atan2(e.clientY - rot.cy, e.clientX - rot.cx);
      var total = normDeg(rot.base + (a - rot.start) * 180 / Math.PI);
      if(e.shiftKey) total = Math.round(total / 15) * 15;
      else {
        var near = Math.round(total / 90) * 90;
        if(Math.abs(total - near) < 3) total = near;
      }
      total = normDeg(total);
      rot.delta = normDeg(total - rot.base);
      var img = box.querySelector('img');
      if(img){ img.style.transformOrigin = '50% 50%'; img.style.transform = 'rotate(' + rot.delta + 'deg)'; }
      if(rotBadge) rotBadge.textContent = fmtDeg(total);
    });
    function rotEnd(){
      if(!rot) return;
      var delta = rot.delta; rot = null;
      rotHandle.style.cursor = 'grab';
      box.style.outline = '2px solid transparent';
      if(rotBadge) rotBadge.style.display = 'none';
      var img = box.querySelector('img');
      if(Math.abs(delta) < 0.5){ if(img) img.style.transform = ''; return; }
      /* CSS 預覽先留著，父頁烘好新圖送 bn-endorser-update-image 時一併清掉 */
      if(!postRotate({delta:delta}) && img) img.style.transform = '';
    }
    rotHandle.addEventListener('pointerup', rotEnd);
    rotHandle.addEventListener('pointercancel', rotEnd);
    rotHandle.addEventListener('lostpointercapture', rotEnd);
    rotHandle.addEventListener('dblclick', function(e){
      e.stopPropagation(); e.preventDefault();
      if(!(parseFloat(box.dataset.rotate) || 0)) return;
      postRotate({rotate:0, absolute:true});
    });
  }

  function updateEndorserImage(box, data){
    var img = box.querySelector('img'); if(!img) return;
    if(data.rotate !== undefined && data.rotate !== null) box.dataset.rotate = String(Number(data.rotate) || 0);
    if(!data.src){ img.style.transform = ''; return; }
    var oldW = img.naturalWidth, oldH = img.naturalHeight;
    var r = endorserBoxRect(box);
    var tmp = new Image();
    function apply(){
      var nw = tmp.naturalWidth, nh = tmp.naturalHeight;
      if(nw && nh){
        if(data.keepScale && oldW && oldH && r.width && r.height){
          /* 旋轉後外接矩形變大：用舊圖目前的顯示倍率換算新框，中心點不動，看起來大小不變 */
          var s = Math.min(r.width / oldW, r.height / oldH);
          var bw = nw * s, bh = nh * s;
          setEndorserBoxRect(box, r.left + r.width / 2 - bw / 2, r.top + r.height / 2 - bh / 2, bw, bh);
          box.dataset.manualLayout = '1';
        } else if(r.width){
          /* 裁切／去背後比例變了：框寬不動、高度依新比例，底部對齊 */
          var hh = r.width * nh / nw;
          setEndorserBoxRect(box, r.left, r.top + r.height - hh, r.width, hh);
        }
        box.dataset.ratio = String(nw / nh);
      } else if(data.ratio){
        box.dataset.ratio = String(data.ratio);
      }
      img.src = data.src;
      img.style.transform = '';
      syncCharGradientOverlay(box);
      /* 每個版位都會各自收到同一張新圖並自己換算框，只回報位置、不觸發方橫連動，
         否則幾個版位同時回報會互相覆蓋。簽名檔／小字不跟著照片移動，只更新相對位置。 */
      var uzone = getProductZone();
      if(uzone){
        endorserRefreshBases(uzone, box.dataset.endorser === 'photo' ? null : {sign:true, note:true});
        arrangeEndorser();
      }
      postCharacterLayout(box, {snapshotOnly:true});
      if(box.dataset.endorser === 'photo') repostEndorserCompanions({snapshotOnly:true});
      else repostEndorserNote({snapshotOnly:true});
    }
    tmp.onload = function(){
      if(window.requestAnimationFrame) window.requestAnimationFrame(apply); else apply();
    };
    tmp.onerror = function(){ img.src = data.src; img.style.transform = ''; };
    tmp.src = data.src;
  }

  /* ── 代言人小字 ── */
  function getEndorserNoteEl(create){
    var zone = getProductZone(); if(!zone) return null;
    var el = zone.querySelector('.bn-endorser-note');
    if(!el && create){
      el = document.createElement('div');
      el.className = 'bn-endorser-note';
      /* 字型、行距、靠左都照 MSBN 代言人小字；BODA 的 400 是 Regular 字重，
         這裡的 @font-face 把 Regular 掛在 300。 */
      el.style.cssText = 'position:absolute;left:0;top:0;white-space:pre;cursor:move;'
        + 'font-family:"ShopeeNotoSans (content)";font-weight:300;line-height:1.15;text-align:left;'
        + 'letter-spacing:0;color:' + ENDORSER_NOTE_DARK + ';user-select:none;-webkit-user-select:none;'
        + 'touch-action:none;outline:1px dashed transparent;outline-offset:2px;';
      el.title = '代言人小字：拖曳移動';
      zone.appendChild(el);
      setupEndorserNoteDrag(el);
    }
    return el;
  }
  function endorserNoteBaseFontSize(){
    var cv = document.getElementById('canvas');
    var w = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--canvas-w')) ||
      (cv && cv.offsetWidth) || parseFloat(document.body && document.body.getAttribute('data-fw')) || 1200;
    return Math.max(12, Math.min(40, Math.round(ENDORSER_NOTE_FONT_PX * w / ENDORSER_NOTE_REF_WIDTH)));
  }
  function endorserLayoutArea(zone, layout){
    if(layout && layout.syncAreaMode) return getProductSyncArea(zone);
    var cs = window.getComputedStyle(zone);
    return {left:0, top:0, width:parseFloat(cs.width) || zone.offsetWidth || 1, height:parseFloat(cs.height) || zone.offsetHeight || 1};
  }
  /* 小字的備用預設（簽名檔是手動位置時）：在簽名檔上方、靠左對齊、不重疊；
     沒有簽名就放在照片左邊、垂直置中。兩者都還是預設時由 arrangeEndorser 當一組排。 */
  function endorserDefaultNoteRect(nm, S, P, zone){
    var em = endorserNoteBaseFontSize();
    if(S) return {left:S.left, top:S.top - em * ENDORSER_DEFAULT_GAP_Y - nm.h, width:nm.w, height:nm.h};
    if(P) return endorserDefaultTextBlock(P, em, 2, nm, false).N;
    var area = getProductSyncArea(zone);
    return {left:area.left + 4, top:area.top + area.height - nm.h - 4, width:nm.w, height:nm.h};
  }
  /* 小字已存的位置：新規則相對簽名檔（字級為單位），沒有簽名檔才相對照片；
     舊資料（相對照片、單位＝照片高，或有效商品區百分比）也讀得懂。 */
  function endorserNoteRectFromLayout(layout, nm, S, P, em, zone){
    if(!layout || !layout.manual) return null;
    var rel = layout.noteRel;
    if(rel && rel.to === 'sign' && S && isFinite(rel.x) && isFinite(rel.y))
      return {left:S.left + rel.x * em, top:S.top + rel.y * em, width:nm.w, height:nm.h};
    if(rel && rel.to === 'photo' && P && isFinite(rel.dx) && isFinite(rel.cy))
      return endorserPlaceByPhotoRel(rel, P, em, nm.w, nm.h);
    var old = layout.photoRel;
    if(old && P && isFinite(old.x) && isFinite(old.y))
      return {left:P.left + old.x * P.height, top:P.top + old.y * P.height, width:nm.w, height:nm.h};
    if(isFinite(layout.leftPct) && isFinite(layout.topPct)){
      var la = endorserLayoutArea(zone, layout);
      return {left:la.left + layout.leftPct * la.width, top:la.top + layout.topPct * la.height, width:nm.w, height:nm.h};
    }
    return null;
  }
  /* 文字區（自動配合時代言人不能壓到）：主標、副標、日期、品牌名、LOGO。
     CTA 另外標記：人像可以在 CTA 後面，簽名檔與小字不行。 */
  function endorserTextObstacles(g){
    var cv = document.getElementById('canvas'); if(!cv) return [];
    var cr = cv.getBoundingClientRect(), sc = g.sc || 1, out = [];
    function add(rect, kind){
      if(!rect || !(rect.width > 1) || !(rect.height > 1)) return;
      out.push({l:(rect.left - cr.left) / sc, t:(rect.top - cr.top) / sc,
        r:(rect.right - cr.left) / sc, b:(rect.bottom - cr.top) / sc, kind:kind});
    }
    function visible(el){
      var cs = window.getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
    }
    Array.prototype.forEach.call(cv.querySelectorAll(ENDORSER_TEXT_SELECTOR), function(el){
      if(!el.textContent || !el.textContent.trim() || !visible(el)) return;
      var rect = null;
      try{ var range = document.createRange(); range.selectNodeContents(el); rect = range.getBoundingClientRect(); }
      catch(_){ rect = null; }
      add(rect && rect.width > 1 ? rect : el.getBoundingClientRect(), 'text');
    });
    Array.prototype.forEach.call(cv.querySelectorAll('.logo範圍 img'), function(img){
      if(!img.getAttribute('src') || !visible(img)) return;
      add(img.getBoundingClientRect(), 'text');
    });
    Array.prototype.forEach.call(cv.querySelectorAll(ENDORSER_CTA_SELECTOR), function(el){
      if(visible(el)) add(el.getBoundingClientRect(), 'cta');
    });
    return out;
  }
  /* 自動配合：先保證人像左右、上方不出框，簽名＋小字整塊不出框；
     壓到文字區時，依序試「往人像那側移」→「往下移（下方可出血）」→「整組等比縮小」，
     找到不壓字、縮得最少的擺法。簽名檔與小字跟著照片一起移動／縮放（距離用字級，大小不變）。 */
  function fitEndorser(g, photo, sign, note, nm){
    var em = g.em;
    var margin = Math.max(4, Math.round(em * 0.4));
    var gap = Math.max(8, Math.round(em * 0.6));
    var found0 = endorserTextObstacles(g);
    /* 文字區是硬限制（留一點間距）；CTA 是軟限制：只有簽名／小字被蓋住一成以上才挪文字塊，不縮人像 */
    var obstacles = found0.filter(function(o){ return o.kind !== 'cta'; }).map(function(o){
      return {l:o.l - gap, t:o.t - gap, r:o.r + gap, b:o.b + gap, kind:o.kind};
    });
    var softs = found0.filter(function(o){ return o.kind === 'cta'; });
    var P0 = photo ? endorserBoxRect(photo) : null;
    var S0 = sign ? endorserBoxRect(sign) : null;
    var N0 = note ? {left:parseFloat(note.style.left) || 0, top:parseFloat(note.style.top) || 0,
      width:nm ? nm.w : note.offsetWidth, height:nm ? nm.h : note.offsetHeight} : null;
    var signRel = (S0 && P0) ? endorserSignRelFromRects(S0, P0, em) : null;
    var noteToSign = (N0 && S0) ? {x:N0.left - S0.left, y:N0.top - S0.top} : null;
    var noteRelP = (N0 && !S0 && P0) ? endorserRelToPhoto(N0, P0, em) : null;
    var sideRight = P0 ? (photo._bnFrame ? photo._bnFrame.side !== 'left' : (P0.left + P0.width / 2) >= g.ZW / 2) : true;
    function C(r){ return {l:r.left + g.ZX, t:r.top + g.ZY, r:r.left + g.ZX + r.width, b:r.top + g.ZY + r.height}; }
    function hitArea(a, o){
      var w = Math.min(a.r, o.r) - Math.max(a.l, o.l), h = Math.min(a.b, o.b) - Math.max(a.t, o.t);
      return (w > 0 && h > 0) ? w * h : 0;
    }
    function layoutAt(s, dx, dy, bottomAnchor){
      var P = null, S = null, N = null;
      if(P0){
        var w = P0.width * s, h = P0.height * s;
        var ax = sideRight ? P0.left + P0.width : P0.left;
        var ay = bottomAnchor ? P0.top + P0.height : P0.top;
        P = {left:(sideRight ? ax - w : ax) + dx, top:(bottomAnchor ? ay - h : ay) + dy, width:w, height:h};
        var pl = P.left + g.ZX;
        if(P.width <= g.CW){
          if(pl < 0) P.left -= pl;
          else if(pl + P.width > g.CW) P.left -= (pl + P.width - g.CW);
        } else P.left = (g.CW - P.width) / 2 - g.ZX;
        if(P.top + g.ZY < 0) P.top = -g.ZY;
      }
      if(S0) S = (P && signRel) ? endorserPlaceByPhotoRel(signRel, P, em, S0.width, S0.height)
        : {left:S0.left + dx, top:S0.top + dy, width:S0.width, height:S0.height};
      if(N0){
        if(S && noteToSign) N = {left:S.left + noteToSign.x, top:S.top + noteToSign.y, width:N0.width, height:N0.height};
        else if(P && noteRelP) N = endorserPlaceByPhotoRel(noteRelP, P, em, N0.width, N0.height);
        else N = {left:N0.left + dx, top:N0.top + dy, width:N0.width, height:N0.height};
      }
      var parts = [S, N].filter(Boolean);
      if(parts.length){
        var tl = Infinity, tt = Infinity, tr = -Infinity, tb = -Infinity;
        parts.forEach(function(r){ var c = C(r); tl = Math.min(tl, c.l); tt = Math.min(tt, c.t); tr = Math.max(tr, c.r); tb = Math.max(tb, c.b); });
        var mx = 0, my = 0;
        if(tl < margin) mx = margin - tl; else if(tr > g.CW - margin) mx = (g.CW - margin) - tr;
        if(tt < margin) my = margin - tt; else if(tb > g.CH - margin) my = (g.CH - margin) - tb;
        if(mx || my) parts.forEach(function(r){ r.left += mx; r.top += my; });
      }
      var hits = 0;
      obstacles.forEach(function(o){
        if(P) hits += hitArea(C(P), o);
        if(S) hits += hitArea(C(S), o);
        if(N) hits += hitArea(C(N), o);
      });
      return {P:P, S:S, N:N, hits:hits, s:s};
    }
    function hardHits(r){
      var c = C(r), sum = 0;
      obstacles.forEach(function(o){ sum += hitArea(c, o); });
      return sum;
    }
    function ctaCover(r){
      var c = C(r), a = Math.max(1, (c.r - c.l) * (c.b - c.t)), m = 0;
      softs.forEach(function(o){ m = Math.max(m, hitArea(c, o) / a); });
      return m;
    }
    /* 簽名／小字被 CTA 蓋住超過 12%：由近到遠試著挪開整個文字塊（不出框、不壓文字區） */
    function nudgeFromCta(res){
      var parts = [res.S, res.N].filter(Boolean);
      if(!parts.length || !softs.length) return;
      var limit = 0.12;
      if(Math.max.apply(null, parts.map(ctaCover)) <= limit) return;
      var maxR = Math.round(em * 3), step = Math.max(2, Math.round(em / 4));
      for(var rr = step; rr <= maxR; rr += step){
        var cands = [[0, -rr], [-rr, 0], [0, rr], [rr, 0], [-rr, -rr], [rr, -rr], [-rr, rr], [rr, rr]];
        for(var k = 0; k < cands.length; k++){
          var mx = cands[k][0], my = cands[k][1];
          var moved = parts.map(function(r){ return {left:r.left + mx, top:r.top + my, width:r.width, height:r.height}; });
          var ok = moved.every(function(r){
            var c = C(r);
            return c.l >= margin && c.t >= margin && c.r <= g.CW - margin && c.b <= g.CH - margin && hardHits(r) <= 0;
          }) && Math.max.apply(null, moved.map(ctaCover)) <= limit;
          if(ok){ parts.forEach(function(r){ r.left += mx; r.top += my; }); return; }
        }
      }
    }
    var best = layoutAt(1, 0, 0, false);
    if(best.hits > 0 && P0){
      var room = Math.max(0, sideRight ? g.CW - (P0.left + g.ZX + P0.width) : P0.left + g.ZX);
      var dir = sideRight ? 1 : -1;
      var maxDy = Math.round(g.CH * 0.15);
      var dxStep = Math.max(2, room / 40), dyStep = Math.max(2, maxDy / 10);
      var found = null;
      [false, true].forEach(function(bottomAnchor){
        if(found && found.s >= 0.999) return;
        search:
        for(var s = 1; s >= 0.5 - 1e-6; s -= 0.025){
          if(found && s <= found.s + 1e-6) break;
          for(var dy = 0; dy <= maxDy + 1e-6; dy += dyStep){
            for(var dxs = 0; dxs <= room + 1e-6; dxs += dxStep){
              var c = layoutAt(s, dir * dxs, dy, bottomAnchor);
              if(c.hits <= 0){ found = c; break search; }
              if(c.hits < best.hits) best = c;
            }
          }
        }
      });
      if(found) best = found;
    }
    nudgeFromCta(best);
    if(photo && best.P) setEndorserBoxRect(photo, best.P.left, best.P.top, best.P.width, best.P.height);
    if(sign && best.S) setEndorserBoxRect(sign, best.S.left, best.S.top, best.S.width, best.S.height);
    if(note && best.N){ note.style.left = best.N.left + 'px'; note.style.top = best.N.top + 'px'; }
  }
  /* 依基準擺好代言人照、簽名檔、小字；自動配合的版位再做不出框／避開文字區。 */
  function arrangeEndorser(){
    if(!_bnEndorserTemplate) return;
    var zone = getProductZone(); if(!zone) return;
    var photo = getEndorserBox('_bnEndorserPhoto');
    var sign = getEndorserBox('_bnEndorserSign');
    var note = getEndorserNoteEl(false);
    var text = _bnEndorserNoteState.text || '';
    if(note){
      if(note.textContent !== text) note.textContent = text;
      note.style.display = text ? '' : 'none';
    }
    var noteOn = !!(note && text);
    if(!photo && !sign && !noteOn) return;
    var g = endorserGeom(zone), em = g.em;
    var P = null, S = null, nm = null, defBlock = null, signSnapshot = false;
    if(photo){
      if(photo._bnFrame){
        var pr = endorserRectFromFrame(photo._bnFrame, g, endorserImgRatio(photo));
        if(pr) setEndorserBoxRect(photo, pr.left, pr.top, pr.width, pr.height);
      }
      P = endorserBoxRect(photo);
    }
    if(noteOn){
      note.style.fontSize = em + 'px';
      nm = {w:note.offsetWidth || 0, h:note.offsetHeight || 0};
    }
    /* 還在預設位置（沒拖過、也不是別的版位連動來的）的簽名檔／小字：
       照片左邊，小字在上、簽名在下，整組垂直置中在照片高度的一半（每次都照同一規則算） */
    var signDefault = !!(sign && sign._bnLayoutSrc === 'default');
    var noteDefault = !!(noteOn && (!note._bnLayout || !note._bnLayout.manual || note._bnLayoutSrc === 'default'));
    if(sign){
      if(P && signDefault){
        defBlock = endorserDefaultTextBlock(P, em, endorserImgRatio(sign), noteDefault ? nm : null, true);
        setEndorserBoxRect(sign, defBlock.S.left, defBlock.S.top, defBlock.S.width, defBlock.S.height);
        var newSignRel = endorserSignRelFromRects(defBlock.S, P, em), oldSignRel = sign._bnTextRel;
        if(!oldSignRel || Math.abs(oldSignRel.dx - newSignRel.dx) > 0.01 || Math.abs(oldSignRel.cy - newSignRel.cy) > 0.002 ||
           Math.abs(oldSignRel.w - newSignRel.w) > 0.01 || oldSignRel.side !== newSignRel.side) signSnapshot = true;
        sign._bnTextRel = newSignRel;
      } else {
        if(P && !sign._bnTextRel) sign._bnTextRel = endorserSignRelFromRects(endorserBoxRect(sign), P, em);
        if(P && sign._bnTextRel){
          var sw = sign._bnTextRel.w * em;
          var sr = endorserPlaceByPhotoRel(sign._bnTextRel, P, em, sw, sw / endorserImgRatio(sign));
          setEndorserBoxRect(sign, sr.left, sr.top, sr.width, sr.height);
        }
      }
      S = endorserBoxRect(sign);
    }
    var noteSnapshot = false;
    if(noteOn){
      var nr = null;
      if(noteDefault){
        if(defBlock && defBlock.N) nr = defBlock.N;
        else if(S) nr = {left:S.left, top:S.top - em * ENDORSER_DEFAULT_GAP_Y - nm.h, width:nm.w, height:nm.h};
        else if(P) nr = endorserDefaultTextBlock(P, em, 2, nm, false).N;
        else nr = endorserDefaultNoteRect(nm, null, null, zone);
        note._bnLayout = note._bnLayout || {};
        note._bnLayoutSrc = 'default';
        if(zone.dataset.endorserAuto == null) zone.dataset.endorserAuto = '1';
        var newNoteRel = endorserNoteRelFromRect(nr, S, P, em), oldNoteRel = note._bnLayout.noteRel;
        var relKey = function(r){ return r ? [r.to, r.side, r.x, r.y, r.dx, r.cy].map(function(v){ return typeof v === 'number' ? Math.round(v * 100) : v; }).join('|') : ''; };
        if(!note._bnLayout.manual || relKey(oldNoteRel) !== relKey(newNoteRel)) noteSnapshot = true;
        note._bnLayout.manual = true;
        note._bnLayout.noteRel = newNoteRel;
      } else {
        nr = endorserNoteRectFromLayout(note._bnLayout, nm, S, P, em, zone);
        if(!nr){
          nr = endorserDefaultNoteRect(nm, S, P, zone);
          noteSnapshot = true;
        } else if(!note._bnLayout.noteRel){
          noteSnapshot = true; /* 舊資料：換成新規則記下來 */
        }
        if(noteSnapshot){
          note._bnLayout.manual = true;
          note._bnLayout.noteRel = endorserNoteRelFromRect(nr, S, P, em);
        }
      }
      note.style.left = nr.left + 'px';
      note.style.top = nr.top + 'px';
    }
    if(zone.dataset.endorserAuto !== '0') fitEndorser(g, photo, sign, noteOn ? note : null, nm);
    if(photo) syncCharGradientOverlay(photo);
    if(sign){
      syncCharGradientOverlay(sign);
      if(signSnapshot) setTimeout(function(){ postCharacterLayout(sign, {snapshotOnly:true}); }, 0);
    }
    if(noteOn){
      refreshEndorserNoteColor();
      if(noteSnapshot){ markEndorserNoteManual(note); postEndorserNoteLayout(note, {snapshotOnly:true}); }
    }
  }
  function positionEndorserNote(){ arrangeEndorser(); }
  /* 主標、副標、LOGO 改了之後，自動配合的版位要重新避開文字區（LOGO 圖載入較慢，晚一點再排一次） */
  var _bnEndorserArrangeTimers = [];
  function scheduleEndorserArrange(){
    _bnEndorserArrangeTimers.forEach(clearTimeout);
    _bnEndorserArrangeTimers = [80, 700].map(function(ms){
      return setTimeout(function(){
        var z = getProductZone();
        if(z && z.dataset.endorserAuto === '1') arrangeEndorser();
      }, ms);
    });
  }
  function markEndorserNoteManual(el){
    var zone = getProductZone(); if(!zone || !el) return;
    var g = endorserGeom(zone);
    var area = getProductSyncArea(zone);
    var layout = el._bnLayout || (el._bnLayout = {});
    var l = parseFloat(el.style.left) || 0, t = parseFloat(el.style.top) || 0;
    layout.manual = true;
    layout.leftPct = (l - area.left) / area.width;
    layout.topPct = (t - area.top) / area.height;
    layout.syncAreaMode = area.mode;
    var photo = getEndorserBox('_bnEndorserPhoto'), sign = getEndorserBox('_bnEndorserSign');
    var P = photo ? endorserBoxRect(photo) : null, S = sign ? endorserBoxRect(sign) : null;
    if(P){
      var unit = P.height || 1;
      layout.photoRel = {x:(l - P.left) / unit, y:(t - P.top) / unit};
    } else {
      delete layout.photoRel;
    }
    layout.noteRel = endorserNoteRelFromRect({left:l, top:t, width:el.offsetWidth || 0, height:el.offsetHeight || 0}, S, P, g.em);
  }
  function postEndorserNoteLayout(el, options){
    try{
      var layout = el && el._bnLayout ? JSON.parse(JSON.stringify(el._bnLayout)) : null;
      if(layout) layout.src = el._bnLayoutSrc || getCurrentBnId();
      var msg = {type:'bn-endorser-note-layout-update', bnid:getCurrentBnId(), layout:layout,
        snapshotOnly:!!(options && options.snapshotOnly)};
      if(options && options.migrate) msg.migrate = true;
      window.parent && window.parent.postMessage(msg, '*');
    }catch(_){ }
  }
  function setupEndorserNoteDrag(el){
    var drag = null;
    el.addEventListener('pointerdown', function(e){
      if(e.button !== undefined && e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      drag = {sx:e.clientX, sy:e.clientY, l:parseFloat(el.style.left)||0, t:parseFloat(el.style.top)||0, changed:false};
      el.setPointerCapture(e.pointerId);
      el.style.outlineColor = ENDORSER_COLOR;
    });
    el.addEventListener('pointermove', function(e){
      if(!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if(!dx && !dy) return;
      drag.changed = true;
      el.style.left = (drag.l + dx) + 'px';
      el.style.top = (drag.t + dy) + 'px';
    });
    function end(){
      if(!drag) return;
      var changed = drag.changed; drag = null;
      el.style.outlineColor = '';
      if(changed){ endorserMarkManual(); markEndorserNoteManual(el); postEndorserNoteLayout(el); refreshEndorserNoteColor(); }
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
  }
  function applyEndorserNoteMessage(data){
    _bnEndorserNoteState.text = String(data.text == null ? '' : data.text).replace(/\r\n?/g, '\n');
    _bnEndorserNoteState.color = /^#[0-9a-f]{6}$/i.test(String(data.color || '')) ? String(data.color) : '';
    var el = getEndorserNoteEl(!!_bnEndorserNoteState.text);
    if(!el) return;
    var zone = getProductZone();
    if(data.layoutById && typeof data.layoutById === 'object'){
      var lay = data.layoutById[getCurrentBnId()];
      el._bnLayout = lay ? JSON.parse(JSON.stringify(lay)) : null;
      if(lay && zone){
        var info = endorserSrcInfo(lay);
        el._bnLayoutSrc = info.src;
        zone.dataset.endorserAuto = info.auto ? '1' : '0';
      }
    }
    if(zone && _bnEndorserNoteState.text){
      zone.style.overflow = 'visible';
      if(!zone.style.position) zone.style.position = 'relative';
    }
    arrangeEndorser();
    applyCharacterZ();
  }

  /* 代言人小字自動黑白字（MSBN 規則）：沒有手動選色時，取小字底下實際看到的顏色——
     背景色 → 背景圖 → 代言人照（透明處透出底下），平均亮度 < 0.48 用白字，否則 #111827。 */
  function endorserParseColorLuma(value){
    var s = String(value || '').trim(), r, g, b, m;
    if((m = /^#([0-9a-f]{3})$/i.exec(s))){ r = parseInt(m[1][0]+m[1][0],16); g = parseInt(m[1][1]+m[1][1],16); b = parseInt(m[1][2]+m[1][2],16); }
    else if((m = /^#([0-9a-f]{6})/i.exec(s))){ r = parseInt(m[1].slice(0,2),16); g = parseInt(m[1].slice(2,4),16); b = parseInt(m[1].slice(4,6),16); }
    else if((m = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i.exec(s))){
      if(m[4] !== undefined && parseFloat(m[4]) < 0.05) return null;
      r = +m[1]; g = +m[2]; b = +m[3];
    } else return null;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  function endorserBackgroundColorLuma(){
    var luma = endorserParseColorLuma(_bnCurrentCanvasBg);
    if(luma != null) return luma;
    var cv = document.getElementById('canvas');
    var bgEl = cv && (cv.querySelector('.背景色') || cv.querySelector('.bg') || cv.querySelector('.底色'));
    var candidates = [bgEl, cv];
    for(var i = 0; i < candidates.length; i++){
      if(!candidates[i]) continue;
      luma = endorserParseColorLuma(window.getComputedStyle(candidates[i]).backgroundColor);
      if(luma != null) return luma;
    }
    return 1;
  }
  /* 在 img（或背景圖）上取 rect 範圍的平均亮度，回傳 {luma, alpha}；
     drawRect 是圖片在畫面上實際畫出的範圍（viewport 座標）。 */
  function endorserSampleImage(img, drawRect, rect){
    if(!img || !img.complete || !img.naturalWidth || !img.naturalHeight || !drawRect.width || !drawRect.height) return null;
    var l = Math.max(rect.left, drawRect.left), r = Math.min(rect.right, drawRect.left + drawRect.width);
    var t = Math.max(rect.top, drawRect.top), b = Math.min(rect.bottom, drawRect.top + drawRect.height);
    if(r - l < 1 || b - t < 1) return null;
    var nw = img.naturalWidth, nh = img.naturalHeight;
    var sx = (l - drawRect.left) / drawRect.width * nw, sy = (t - drawRect.top) / drawRect.height * nh;
    var sw = Math.max(1, (r - l) / drawRect.width * nw), sh = Math.max(1, (b - t) / drawRect.height * nh);
    var c = document.createElement('canvas'); c.width = 16; c.height = 16;
    var ctx = c.getContext('2d', {willReadFrequently:true});
    if(!ctx) return null;
    try{
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 16, 16);
      var d = ctx.getImageData(0, 0, 16, 16).data, lumSum = 0, alphaSum = 0;
      for(var i = 0; i < d.length; i += 4){
        var a = d[i+3] / 255;
        lumSum += a * (0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2]) / 255;
        alphaSum += a;
      }
      var covered = (r - l) * (b - t) / Math.max(1, (rect.right - rect.left) * (rect.bottom - rect.top));
      return {luma: alphaSum ? lumSum / alphaSum : 0, alpha: alphaSum / 256 * covered};
    }catch(_){ return null; }
  }
  var _bnEndorserBgImgCache = {};
  function endorserBgImageFor(src){
    if(!src) return null;
    var img = _bnEndorserBgImgCache[src];
    if(!img){
      img = new Image();
      img.onload = function(){ refreshEndorserNoteColorSoon(); };
      img.src = src;
      _bnEndorserBgImgCache = {}; _bnEndorserBgImgCache[src] = img;
    }
    return img;
  }
  /* 背景圖畫在哪裡：#底圖 直接量；放在 .背景色/.bg 的 CSS 背景則照 bn-bg 的參數重算（同 renderBnBackgroundImg）。 */
  function endorserBgDrawRect(img){
    var st = _bnBgSampleState;
    if(!st || !st.src || !img || !img.naturalWidth) return null;
    if(st.target === 'img'){
      var bimg = document.getElementById('底圖');
      if(!bimg || bimg.style.display === 'none') return null;
      var br = bimg.getBoundingClientRect();
      return {left:br.left, top:br.top, width:br.width, height:br.height};
    }
    var cont = document.querySelector('.背景色') || document.querySelector('.bg');
    if(!cont) return null;
    var cr = cont.getBoundingClientRect();
    var cw = cont.clientWidth || cr.width, ch = cont.clientHeight || cr.height;
    if(!cw || !ch) return null;
    var k = cr.width / cw || 1;
    var nw = img.naturalWidth, nh = img.naturalHeight, iw, ih;
    if(st.fit === 'cover' || st.fit === 'contain'){ var f = (st.fit === 'cover' ? Math.max : Math.min)(cw / nw, ch / nh); iw = nw * f; ih = nh * f; }
    else if(st.fit === 'height100' || (st.fit === 'auto' && st.basis === 'height')){ ih = ch * st.scale / 100; iw = ih * nw / nh; }
    else { iw = cw * st.scale / 100; ih = iw * nh / nw; }
    var left, top;
    if(st.fit === 'cover' || st.fit === 'contain'){ left = (cw - iw) * st.x / 100; top = (ch - ih) * st.y / 100; }
    else if(st.mode === 'center'){ left = cw / 2 + (st.x - 50) * cw / 100 - iw / 2; top = ch / 2 + (st.y - 50) * ch / 100 - ih / 2; }
    else { left = (cw - iw) * st.x / 100; top = (ch - ih) * st.y / 100; }
    return {left: cr.left + left * k, top: cr.top + top * k, width: iw * k, height: ih * k};
  }
  function endorserNoteBackdropLuma(el){
    var rect = el.getBoundingClientRect();
    if(!rect.width || !rect.height) return null;
    var luma = endorserBackgroundColorLuma();
    if(_bnBgSampleState && _bnBgSampleState.src){
      var bgImg = endorserBgImageFor(_bnBgSampleState.src);
      var bgRect = endorserBgDrawRect(bgImg);
      var bgSample = bgRect ? endorserSampleImage(bgImg, bgRect, rect) : null;
      if(bgSample) luma = bgSample.luma * Math.min(1, bgSample.alpha) + luma * (1 - Math.min(1, bgSample.alpha));
    }
    var photo = getEndorserBox('_bnEndorserPhoto');
    var pimg = photo && photo.style.display !== 'none' ? photo.querySelector('img') : null;
    if(pimg && pimg.naturalWidth){
      var pr = pimg.getBoundingClientRect();
      var k = Math.min(pr.width / pimg.naturalWidth, pr.height / pimg.naturalHeight);
      var dw = pimg.naturalWidth * k, dh = pimg.naturalHeight * k;
      var photoSample = endorserSampleImage(pimg, {left:pr.left + (pr.width - dw) / 2, top:pr.top + (pr.height - dh) / 2, width:dw, height:dh}, rect);
      if(photoSample) luma = photoSample.luma * Math.min(1, photoSample.alpha) + luma * (1 - Math.min(1, photoSample.alpha));
    }
    return luma;
  }
  function refreshEndorserNoteColor(){
    var el = getEndorserNoteEl(false); if(!el || el.style.display === 'none') return;
    if(_bnEndorserNoteState.color){
      el.style.color = _bnEndorserNoteState.color;
      el.removeAttribute('data-auto-text-color');
      return;
    }
    var luma = endorserNoteBackdropLuma(el);
    var color = luma != null && luma < 0.48 ? ENDORSER_NOTE_LIGHT : ENDORSER_NOTE_DARK;
    el.style.color = color;
    el.setAttribute('data-auto-text-color', color);
  }
  var _bnEndorserNoteColorTimer = null;
  function refreshEndorserNoteColorSoon(){
    clearTimeout(_bnEndorserNoteColorTimer);
    _bnEndorserNoteColorTimer = setTimeout(refreshEndorserNoteColor, 40);
  }

  /* ── 畫布文字直接點擊編輯 ── */
  var EDITABLE_CLASSES = ['主標','副標','副標案型七字內','日期','品牌名','ICON獨立文案','CampaignCard文案','六字內'];
  var _dollarExemptSet = {};   /* {className: true} */

  /* ── 字數計算（中文1字，英數0.5字） ── */
  var CHAR_LIMITS = { '品牌名':9, '主標':8, '副標':7, '日期':14, 'ICON獨立文案':2, 'CampaignCard文案':5 };

  function calcUnits(text){
    var units = 0;
    for(var i=0; i<text.length; i++){
      var c = text.charCodeAt(i);
      /* 中文、全形等 CJK 算 1，其餘算 0.5 */
      units += (c > 0x2E7F) ? 1 : 0.5;
    }
    return Math.round(units * 10) / 10;
  }

  function updateCharCounter(el, cls){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return;
    var counter = document.getElementById('_bn_counter_'+cls);
    if(!counter) return;
    var text = el.textContent;
    var used = calcUnits(text);
    counter.textContent = used.toFixed(1) + ' / ' + limit + ' 字';
    counter.style.color = used > limit ? '#ef4444' : used > limit * 0.85 ? '#f59e0b' : '#687090';
  }

  function ensureCounter(el, cls){ /* 字數提示已移至左側工具列，此處為空 */ }

  function showCounter(el, cls){
    /* 通知父層（BN編輯器）更新字數顯示 */
    if(window.parent !== window){
      var limit = CHAR_LIMITS[cls] || 0;
      var used  = calcUnits(el.textContent);
      window.parent.postMessage({
        type:'bn-char-count', field:cls, used:used, limit:limit
      }, '*');
    }
  }

  function hideCounter(cls){
    if(window.parent !== window){
      window.parent.postMessage({type:'bn-char-count', field:cls, used:null}, '*');
    }
  }

  function trimToLimit(text, limit){
    var out = '';
    var sum = 0;
    text = String(text || '');
    for(var i=0; i<text.length; i++){
      var c = text.charCodeAt(i);
      var w = (c > 0x2E7F) ? 1 : 0.5;
      if(sum + w > limit) break;
      out += text[i];
      sum += w;
    }
    return out;
  }

  function enforceLimit(el, cls){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return;
    if(el.__fmtOver) return;   /* 系統補 $／千分位造成的超字：保留原文 */
    var text = el.textContent;
    var units = calcUnits(text);
    if(units <= limit) return;
    var out = trimToLimit(text, limit);
    var sel = window.getSelection();
    el.textContent = out;
    var r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function getEditableSelectionOffsets(el){
    var sel = window.getSelection();
    var len = el.textContent.length;
    if(!sel || sel.rangeCount === 0) return {start:len,end:len};
    var range = sel.getRangeAt(0);
    if(!el.contains(range.startContainer) || !el.contains(range.endContainer)) return {start:len,end:len};
    var pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    var start = pre.toString().length;
    var preEnd = document.createRange();
    preEnd.selectNodeContents(el);
    preEnd.setEnd(range.endContainer, range.endOffset);
    var end = preEnd.toString().length;
    if(start > end){ var t=start; start=end; end=t; }
    return {start:start,end:end};
  }

  function wouldExceedLimit(el, cls, insertText){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return false;
    var text = el.textContent || '';
    var pos = getEditableSelectionOffsets(el);
    var next = text.slice(0,pos.start) + String(insertText || '') + text.slice(pos.end);
    return calcUnits(next) > limit;
  }

  /* ── 系統補 $／千分位造成的超字：不截斷，改用紅框常駐 ── */
  function ensureOverflowStyle(){
    if(document.getElementById('_bn_overflow_style')) return;
    var st=document.createElement('style');
    st.id='_bn_overflow_style';
    st.textContent='.bn-over-limit{outline:3px solid #ff4d4f !important;'
      +'background:rgba(255,77,79,.14) !important;border-radius:2px;}';
    (document.head||document.documentElement).appendChild(st);
  }
  function isOverLimit(el, cls){
    var limit = CHAR_LIMITS[cls];
    if(!limit) return false;
    return calcUnits(el.textContent) > limit + 0.001;
  }
  function markOverflow(el, cls){
    if(!CHAR_LIMITS[cls]) return false;
    ensureOverflowStyle();
    var over = isOverLimit(el, cls);
    el.classList.toggle('bn-over-limit', over);
    if(!over) el.__fmtOver = false;
    return over;
  }
  /* 父層把格式化後的文字推回畫布時呼叫：標記成「系統造成的超字」 */
  function refreshOverflowAll(){
    EDITABLE_CLASSES.forEach(function(cls){
      if(!CHAR_LIMITS[cls]) return;
      document.querySelectorAll('.'+cls).forEach(function(el){
        if(el.children.length && cls !== 'CampaignCard文案') return;
        if(markOverflow(el, cls)) el.__fmtOver = true;
      });
    });
  }
  window.__bnRefreshOverflow = refreshOverflowAll;

  function flashEditLimit(el){
    el.style.outline = '1.5px solid #ef4444';
    clearTimeout(el._bnLimitTimer);
    el._bnLimitTimer = setTimeout(function(){
      el.style.outline = '1.5px solid rgba(74,144,226,.55)';
    }, 400);
  }

  /* ── makeEditable ── */
  function makeEditable(el, cls){
    if(el.dataset.bnEditBound === '1') return;
    el.dataset.bnEditBound = '1';
    el.style.cursor = 'text';

    var _editing = false;
    var _rightClickPending = false;  /* 右鍵選單開啟中，阻止 blur 關閉編輯 */

    function startEditing(clientX, clientY){
      if(_editing) return;
      _editing = true;
      el.contentEditable = 'true';
      el.style.outline = '1.5px solid rgba(74,144,226,.55)';
      el.style.borderRadius = '2px';
      requestAnimationFrame(function(){
        if(typeof clientX === 'number' && document.caretRangeFromPoint){
          var rng = document.caretRangeFromPoint(clientX, clientY);
          if(rng){ var s=window.getSelection(); s.removeAllRanges(); s.addRange(rng); }
        }
        showCounter(el, cls);
      });
    }

    function commitEdit(){
      _editing = false;
      el.contentEditable = 'false';
      el.style.outline = 'none';
      hideCounter(cls);
      markOverflow(el, cls);
      /* AR：六字內 一旦在畫布內手動編輯過，標記獨立，之後副標變更不再覆蓋 */
      if(cls === '六字內') el.dataset.bnManualText = '1';
      if(cls === 'CampaignCard文案') renderCampaignCardText(el, el.textContent.trim());
      _sendUpdate(el, cls);
    }

    el.addEventListener('mousedown', function(e){
      if(e.button === 2) return; /* 右鍵由 contextmenu 處理 */
      e.stopPropagation();
      startEditing(e.clientX, e.clientY);
    });

    el.addEventListener('beforeinput', function(e){
      if(e.inputType && e.inputType.indexOf('delete') === 0) return;
      if(e.isComposing) return;
      var insert = e.data || '';
      if(!insert && e.inputType !== 'insertText') return;
      if(wouldExceedLimit(el, cls, insert)){
        e.preventDefault();
        flashEditLimit(el);
        showCounter(el, cls);
      }
    });

    el.addEventListener('paste', function(e){
      var text = (e.clipboardData || window.clipboardData).getData('text') || '';
      if(!wouldExceedLimit(el, cls, text)) return;
      /* 貼上後會超過上限：整段擋掉，不做截斷 */
      e.preventDefault();
      flashEditLimit(el);
      updateCharCounter(el, cls);
      showCounter(el, cls);
    });

    el.addEventListener('input', function(){
      updateCharCounter(el, cls);
      /* 不截斷文字：超過上限一律保留原文，改用紅框常駐＋擋下載 */
      var over = markOverflow(el, cls);
      if(over) el.style.outline = '2px solid #ef4444';
      else if(_editing) el.style.outline = '1.5px solid rgba(74,144,226,.55)';
      showCounter(el, cls);
    });

    el.addEventListener('blur', function(){
      if(_rightClickPending) return; /* 右鍵選單開啟中，不關閉編輯 */
      if(_editing) commitEdit();
    });

    el.addEventListener('keydown', function(e){
      if(e.key === 'Enter'){ e.preventDefault(); commitEdit(); }
      if(e.key === 'Escape'){
        _editing = false;
        el.contentEditable = 'false';
        el.style.outline = 'none';
        hideCounter(cls);
        if(window.parent !== window){
          window.parent.postMessage({type:'bn-text-cancel', field:cls}, '*');
        }
      }
    });

    el.addEventListener('contextmenu', function(e){
      e.preventDefault(); e.stopPropagation();

      /* 確保進入編輯模式 */
      if(!_editing) startEditing(e.clientX, e.clientY);

      /* 立刻把選取的文字和位置存下來 */
      var savedSelText = '';
      var savedStart = -1;
      var savedEnd   = -1;
      var sel = window.getSelection();
      if(sel && sel.rangeCount > 0 && !sel.isCollapsed){
        savedSelText = sel.toString();
        var range = sel.getRangeAt(0);
        var preRange = document.createRange();
        preRange.selectNodeContents(el);
        preRange.setEnd(range.startContainer, range.startOffset);
        savedStart = preRange.toString().length;
        savedEnd   = savedStart + savedSelText.length;
      }

      _rightClickPending = true;
      showCanvasTextMenu(e, el, cls, savedSelText, savedStart, savedEnd, function onMenuClose(){
        _rightClickPending = false;
      });
    });
  }

  /* sba.html 同款：工具函式 */
  function _cleanNum(t){ return t.replace(/[$,]/g,'').trim(); }
  function _isNumeric(t){ var c=_cleanNum(t); return /^\d+$/.test(c) && c.length>0; }
  function _addThousands(d){ return String(d).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
  function _fmtDollar(n){ return '$'+(n.length>=4?_addThousands(n):n); }
  function _getExempt(el){ try{ return JSON.parse(el.dataset.dollarExempt||'[]'); }catch(_){ return []; } }
  function _setExempt(el, list){
    if(list.length) el.dataset.dollarExempt = JSON.stringify(list);
    else el.removeAttribute('data-dollar-exempt');
  }
  /* 中文數字（一～十）豁免：banwords.xlsx 有「一→1」…「十→10」這幾條
     自動改字規則，勾了豁免就跟著 $／千分位一起跳過。旗標存在元素上，
     每次 _sendUpdate 都會帶給父層，否則下一次編輯又會被改回阿拉伯數字。 */
  /* 阿拉伯數字 ⇄ 中文數字：逐字對應 0～9。
     轉中文時會一併去掉 $ 與千分位逗號（「$5」→「五」）。
     多位數是逐字轉（「50」→「五零」），不會轉成「五十」這種讀法。 */
  var _CN_DIGITS = ['零','一','二','三','四','五','六','七','八','九'];
  function _digitsToCn(t){
    return String(t || '')
      .replace(/\$/g, '')
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1')
      .replace(/[0-9]/g, function(d){ return _CN_DIGITS[Number(d)]; });
  }
  function _cnToDigits(t){
    return String(t || '').replace(/[零一二三四五六七八九]/g, function(c){
      return String(_CN_DIGITS.indexOf(c));
    });
  }
  function _getNumeralExempt(el){ return el.dataset.numeralExempt === '1'; }
  function _setNumeralExempt(el, on){
    if(on) el.dataset.numeralExempt = '1';
    else el.removeAttribute('data-numeral-exempt');
  }
  function _replaceSelText(savedRange, text){
    var sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(savedRange);
    try{ document.execCommand('insertText', false, text); }
    catch(_){
      savedRange.deleteContents();
      var node = document.createTextNode(text);
      savedRange.insertNode(node);
      sel.removeAllRanges(); sel.collapse(node, node.length);
    }
  }

  function _sendUpdate(el, cls){
    var text = el.textContent.trim();
    /* 把豁免清單一起送出，父層用這個清單跳過對應數字的 $ 格式化 */
    var exemptList = _getExempt(el);
    if(window.parent !== window){
      window.parent.postMessage({
        type:'bn-text-update', field:cls, value:text,
        dollarExempt: exemptList.length > 0 ? exemptList : false,
        numeralExempt: _getNumeralExempt(el)
      }, '*');
    }
  }

  function showCanvasTextMenu(e, el, cls, savedSelText, savedStart, savedEnd, onMenuClose){
    var existing = document.getElementById('_bn_canvas_ctx');
    if(existing) existing.remove();

    /* 只有選取的是純數字才顯示選單（同 sba.html） */
    var savedRange = null;
    var sel = window.getSelection();
    if(sel && sel.rangeCount > 0 && !sel.isCollapsed){
      savedRange = sel.getRangeAt(0).cloneRange();
    }

    var cleanSel  = _cleanNum(savedSelText);
    var isNumSel  = _isNumeric(savedSelText);
    var hasDollar = savedSelText.indexOf('$') !== -1;
    var exemptList = _getExempt(el);
    var alreadyExempt = exemptList.indexOf(cleanSel) !== -1;

    /* 如果沒有選取數字，不顯示選單 */
    if(!savedSelText){ return; }

    var menu = document.createElement('div');
    menu.id = '_bn_canvas_ctx';
    menu.style.cssText=[
      'position:fixed;z-index:999999;',
      'background:#1a1d2a;border:1px solid #2e3347;',
      'border-radius:10px;padding:8px;',
      'box-shadow:0 8px 24px rgba(0,0,0,.5);',
      'min-width:200px;font-size:13px;',
    ].join('');

    /* 選項改成按鈕造型（獨立圓角色塊＋邊框），字級 13px→20px，
       方便在畫布上快速辨識、點擊。 */
    function menuBtn(label, handler){
      var btn = document.createElement('div');
      btn.textContent = label;
      btn.style.cssText = 'margin:0 0 6px;padding:9px 16px;border:1px solid #3a4160;border-radius:8px;background:#242942;cursor:pointer;color:#dde3f0;white-space:nowrap;font-size:20px;font-weight:600;text-align:center;transition:background .15s,border-color .15s;';
      btn.addEventListener('mouseenter', function(){ btn.style.background='#333b5c'; btn.style.borderColor='#4a5480'; });
      btn.addEventListener('mouseleave', function(){ btn.style.background='#242942'; btn.style.borderColor='#3a4160'; });
      btn.addEventListener('mousedown', function(ev){
        ev.preventDefault();
        menu.remove();
        if(typeof onMenuClose === 'function') onMenuClose();
        handler();
        setTimeout(function(){ el.focus(); }, 0);
      });
      menu.appendChild(btn);
    }

    /* 按鈕1：$／千分位豁免。同一顆按鈕依目前狀態切換打勾，
       不再另外多開一顆「恢復」按鈕。 */
    if(isNumSel){
      if(alreadyExempt || !hasDollar){
        menuBtn('✓ 恢復加$和千分位符號', function(){
          var list = _getExempt(el).filter(function(n){ return n !== cleanSel; });
          _setExempt(el, list);
          if(savedRange) _replaceSelText(savedRange, _fmtDollar(cleanSel));
          _sendUpdate(el, cls);
        });
      } else {
        menuBtn('暫時不加$和千分位符號', function(){
          var list = _getExempt(el);
          if(list.indexOf(cleanSel) === -1) list.push(cleanSel);
          _setExempt(el, list);
          if(savedRange) _replaceSelText(savedRange, cleanSel);
          _sendUpdate(el, cls);
        });
      }
    } else {
      var dollarAlreadyExempt = exemptList.length > 0;
      if(dollarAlreadyExempt){
        menuBtn('✓ 恢復加$和千分位符號', function(){
          _setExempt(el, []);
          _sendUpdate(el, cls);
        });
      } else {
        menuBtn('暫時不加$和千分位符號', function(){
          var nums = savedSelText.match(/\d+/g) || [];
          var list = _getExempt(el);
          nums.forEach(function(n){ if(list.indexOf(n)===-1) list.push(n); });
          _setExempt(el, list);
          var cleaned = savedSelText.replace(/\$/g,'').replace(/(\d),(\d{3})(?!\d)/g,'$1$2');
          if(savedRange) _replaceSelText(savedRange, cleaned);
          _sendUpdate(el, cls);
        });
      }
    }

    /* 按鈕2：中文數字／阿拉伯數字豁免。跟按鈕1各自獨立，同樣是
       同一顆按鈕依 numeralExempt 狀態切換打勾。 */
    if(_getNumeralExempt(el)){
      menuBtn('✓ 恢復強制變阿拉伯數字', function(){
        _setNumeralExempt(el, false);
        if(savedRange && /[零一二三四五六七八九]/.test(savedSelText)) _replaceSelText(savedRange, _cnToDigits(savedSelText));
        _sendUpdate(el, cls);
      });
    } else {
      menuBtn('不強制變阿拉伯數字', function(){
        _setNumeralExempt(el, true);
        if(savedRange && /[0-9]/.test(savedSelText)) _replaceSelText(savedRange, _digitsToCn(savedSelText));
        _sendUpdate(el, cls);
      });
    }

    menu.style.left = Math.min(e.clientX, window.innerWidth  - 230) + 'px';
    menu.style.top  = Math.min(e.clientY, window.innerHeight - 80)  + 'px';
    document.body.appendChild(menu);
    menu.tabIndex = -1;

    document.addEventListener('mousedown', function rm(ev){
      if(!menu.contains(ev.target)){
        menu.remove();
        document.removeEventListener('mousedown', rm);
        if(typeof onMenuClose === 'function') onMenuClose();
      }
    });
  }
  function attachEditableToAll(){
    EDITABLE_CLASSES.forEach(function(cls){
      document.querySelectorAll('.'+cls).forEach(function(el){
        makeEditable(el, cls);
      });
    });
  }

  /* 2026-10-30: bounded, origin-clean capture shared by every layout. */
  var _bnCaptureRendererPromise = null;
  function bnCaptureError(code, message, stage){
    var err = new Error(message); err.code = code; err.stage = stage || ''; return err;
  }
  function bnCaptureProgress(context, stage, message){
    if(context.done) return;
    context.stage = stage;
    try{ (context.source || window.parent).postMessage({type:'bn-capture-progress',msgId:context.msgId,stage:stage,message:message},'*'); }catch(_){}
  }
  function bnCaptureWait(promise, ms, error, context){
    return new Promise(function(resolve,reject){
      var settled=false, remaining=context ? context.deadline-Date.now() : ms;
      var timer=setTimeout(function(){ finish(error); }, Math.max(1,Math.min(ms,remaining)));
      function finish(err,value){ if(settled)return; settled=true;clearTimeout(timer);err?reject(err):resolve(value); }
      Promise.resolve(promise).then(function(value){finish(null,value);},function(err){finish(err);});
    });
  }
  function bnCapturePaintTick(){
    return new Promise(function(resolve){
      var done=false,timer=setTimeout(finish,100);
      function finish(){if(done)return;done=true;clearTimeout(timer);resolve();}
      requestAnimationFrame(function(){requestAnimationFrame(finish);});
    });
  }
  function bnCaptureVisible(el,root){
    for(var node=el;node&&node.nodeType===1;node=node.parentElement){
      var cs=window.getComputedStyle(node);
      if(cs.display==='none'||cs.visibility==='hidden'||cs.visibility==='collapse'||Number(cs.opacity)===0) return false;
      if(node===root)break;
    }
    return true;
  }
  function bnCaptureAbs(src){try{return new URL(src,document.baseURI).href;}catch(_){return src;}}
  function bnCaptureImage(img,label,context){
    return new Promise(function(resolve,reject){
      var done=false;
      var timer=setTimeout(function(){finish(bnCaptureError('IMAGE_TIMEOUT',label+'尚未載入完成，請稍後重試。','images'));},Math.max(1,Math.min(18000,context.deadline-Date.now())));
      function finish(err){
        if(done)return;done=true;clearTimeout(timer);img.removeEventListener('load',loaded);img.removeEventListener('error',failed);
        err?reject(err):resolve(img);
      }
      function failed(){finish(bnCaptureError('IMAGE_LOAD',label+'載入失敗；請重新上傳圖片或確認圖片網址可讀取。','images'));}
      function loaded(){
        if(!img.naturalWidth||!img.naturalHeight){failed();return;}
        var decoded=typeof img.decode==='function'?img.decode():Promise.resolve();
        bnCaptureWait(decoded,5000,bnCaptureError('IMAGE_DECODE',label+'解碼逾時，請重新上傳圖片。','images'),context).then(function(){finish();},failed);
      }
      img.addEventListener('load',loaded);img.addEventListener('error',failed);
      if(img.complete){if(img.naturalWidth)loaded();else failed();}
    });
  }
  function bnCaptureAssetLabel(el){
    if(el.id==='底圖'||el.matches('.bg,.背景色,.底色'))return '背景圖片';
    if(el.closest('.bn-prod-box'))return '商品圖片';
    if(el.closest('.bn-char-box'))return '人物圖片';
    if(el.classList.contains('bn-logo-img')||el.closest('.bn-logo-box,[class*="logo範圍"],[class*="LOGO範圍"]'))return 'LOGO 圖片';
    return '版位圖片';
  }
  function bnCaptureCSSUrls(value){
    var urls=[],re=/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g,m;
    while((m=re.exec(value||''))){var src=(m[1]!==undefined?m[1]:m[2]!==undefined?m[2]:m[3]).trim();if(src)urls.push(src);}
    return urls;
  }
  function bnPrepareCaptureAssets(context){
    var root=document.getElementById('canvas');
    if(!root)return Promise.reject(bnCaptureError('NO_CANVAS','找不到版位畫布，請重新整理後再試。','prepare'));
    bnCaptureProgress(context,'images','正在確認商品、背景、LOGO 與人物圖片…');
    var jobs=[],sourceJobs=Object.create(null);context.assets=Object.create(null);context.assetSizes=Object.create(null);
    function cacheSource(src,label,originalImage){
      var absolute=bnCaptureAbs(src);if(sourceJobs[absolute])return sourceJobs[absolute];
      var job=Promise.resolve().then(function(){
        if(context.done)throw bnCaptureError('CANCELLED','截圖已結束。','images');
        if(/^data:image\//i.test(absolute)&&originalImage)return bnCaptureImage(originalImage,label,context);
        var image=new Image();
        if(/^https?:/i.test(absolute))image.crossOrigin='anonymous';
        image.src=absolute;return bnCaptureImage(image,label,context);
      }).then(function(image){
        if(context.done)throw bnCaptureError('CANCELLED','截圖已結束。','images');
        context.assetSizes[absolute]={w:image.naturalWidth,h:image.naturalHeight};
        if(/^data:image\//i.test(absolute)){context.assets[absolute]=absolute;return;}
        try{
          var c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
          c.getContext('2d').drawImage(image,0,0);context.assets[absolute]=c.toDataURL('image/png');
        }catch(_){throw bnCaptureError('IMAGE_ORIGIN',label+'不允許匯出；請下載該圖片後，以本機檔案重新上傳。','images');}
      });
      sourceJobs[absolute]=job;return job;
    }
    root.querySelectorAll('img').forEach(function(img){
      if(!bnCaptureVisible(img,root))return;
      var src=img.currentSrc||img.getAttribute('src');if(!src)return;
      var label=bnCaptureAssetLabel(img);
      jobs.push(bnCaptureImage(img,label,context).then(function(){
        if(img.closest('.bn-prod-box')){if(img._bnFit)bnLayoutProductImg(img);else bnProductImgLoaded(img);}
        return cacheSource(src,label,img);
      }).then(function(){
        if(img.src&&context.assets[bnCaptureAbs(src)])context.assets[bnCaptureAbs(img.src)]=context.assets[bnCaptureAbs(src)];
      }));
    });
    [root].concat(Array.prototype.slice.call(root.querySelectorAll('*'))).forEach(function(el){
      if(!bnCaptureVisible(el,root))return;
      bnCaptureCSSUrls(window.getComputedStyle(el).backgroundImage).forEach(function(src){jobs.push(cacheSource(src,bnCaptureAssetLabel(el)));});
    });
    return Promise.all(jobs).then(function(){
      bnCaptureProgress(context,'fonts','正在確認字型與畫布位置…');
      var ready=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();
      return bnCaptureWait(ready,8000,bnCaptureError('FONT_TIMEOUT','字型仍在載入，請稍後重試；未變更目前作品。','fonts'),context);
    }).then(bnCapturePaintTick);
  }
  /* 截圖引擎：html-to-image 1.11.11。
     TP 擋 html2canvas（會報 Blocked a frame with origin "null"），且函式庫不能放進包內，
     所以從 cdnjs 載入，版本寫死並附 integrity（取自 api.cdnjs.com 的 sri）。 */
  var BN_HTML_TO_IMAGE_SRC='https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js';
  var BN_HTML_TO_IMAGE_SRI='sha512-7tWCgq9tTYS/QkGVyKrtLpqAoMV9XIUxoou+sPUypsaZx56cYR/qio84fPK9EvJJtKvJEwt7vkn6je5UVzGevw==';
  function bnLoadCaptureRenderer(context){
    if(window.htmlToImage)return Promise.resolve();
    if(_bnCaptureRendererPromise)return _bnCaptureRendererPromise;
    bnCaptureProgress(context,'renderer','正在載入截圖引擎…');
    _bnCaptureRendererPromise=new Promise(function(resolve,reject){
      var script=document.createElement('script'),done=false;
      var timer=setTimeout(function(){finish(bnCaptureError('RENDERER_TIMEOUT','截圖引擎載入逾時，請確認網路後重試。','renderer'));},15000);
      function finish(error){if(done)return;done=true;clearTimeout(timer);script.onload=script.onerror=null;if(error){script.remove();_bnCaptureRendererPromise=null;reject(error);}else resolve();}
      script.onload=function(){window.htmlToImage?finish():finish(bnCaptureError('RENDERER_MISSING','截圖引擎未正確載入。','renderer'));};
      script.onerror=function(){finish(bnCaptureError('RENDERER_LOAD','截圖引擎載入失敗，請確認網路後重試。','renderer'));};
      script.integrity=BN_HTML_TO_IMAGE_SRI;
      script.crossOrigin='anonymous';
      script.referrerPolicy='no-referrer';
      script.src=BN_HTML_TO_IMAGE_SRC;
      document.head.appendChild(script);
    });
    return _bnCaptureRendererPromise;
  }
  function captureCanvas(cb,wantLayers,context){
    bnLoadCaptureRenderer(context).then(function(){if(!context.done)doCapture(cb,wantLayers,context);}).catch(function(error){cb(null,null,null,error);});
  }

  /* html2canvas 會把圓角元素的 box-shadow 畫進元素內部（首頁LOGO牆膠囊變灰底），
     所以截圖時先移除陰影，截完後用 canvas 原生 shadow 只補畫在元素外側。 */
  function _bnPaintLogoWallShadows(ctx, cv, scale, W, H){
    var specs = window.__bnLogoWallShadowSpecs;
    if(!specs || !specs.length) return;
    var cr = cv.getBoundingClientRect();
    function rr(x, y, w, h, r){
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    specs.forEach(function(s){
      var m = /(rgba?\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/.exec(s.shadow || '');
      if(!m || !s.el) return;
      var r = s.el.getBoundingClientRect();
      var x = (r.left - cr.left) / scale, y = (r.top - cr.top) / scale;
      var w = r.width / scale, h = r.height / scale;
      var rad = Math.min(parseFloat(s.radius) || 0, w / 2, h / 2);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); rr(x, y, w, h, rad);
      ctx.clip('evenodd');
      ctx.shadowColor = m[1]; ctx.shadowOffsetX = parseFloat(m[2]); ctx.shadowOffsetY = parseFloat(m[3]); ctx.shadowBlur = parseFloat(m[4]);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); rr(x, y, w, h, rad); ctx.fill();
      ctx.restore();
    });
  }
  function doCapture(cb,wantLayers,context){
    var cv=document.getElementById('canvas');
    var W=cv&&(parseFloat(cv.style.width)||cv.offsetWidth),H=cv&&(parseFloat(cv.style.height)||cv.offsetHeight);
    if(!cv||!W||!H){cb(null,null,null,bnCaptureError('CANVAS_SIZE','畫布尺寸尚未就緒，請稍後重試。','render'));return;}
    W=Math.round(W);H=Math.round(H);
    if(W<1||H<1||W>32767||H>32767||W*H>64000000){cb(null,null,null,bnCaptureError('CANVAS_SIZE','畫布尺寸超出匯出範圍。','render'));return;}
    var BG_SET={'背景色':1,'bg':1,'底色':1,'上保護':1,'下保護':1,'左側保護':1,'右側保護':1,'上方保護':1,'下方保護':1,'文案保護':1,'漸層左':1,'漸層右':1,'漸層上':1,'漸層下':1};
    var scale=cv.getBoundingClientRect().width/Math.max(1,cv.offsetWidth)||1;
    function isBg(el){if(el.id==='底圖')return true;for(var key in BG_SET)if(el.classList&&el.classList.contains(key))return true;return false;}
    /* 下載鋸齒：用 2 倍超取樣＋高品質縮放，再縮回原尺寸；畫布太大時退回 1 倍避免記憶體不足。 */
    var captureScale=(W*H<=4000000)?2:1;
    /* 截圖期間新建的 2D 畫布一律用高品質縮放（截圖引擎自己的畫布不會設定），結束後還原。 */
    function bnWithHighQualitySmoothing(run){
      var proto=HTMLCanvasElement.prototype,orig=proto.getContext;
      proto.getContext=function(type){
        var c=orig.apply(this,arguments);
        if(c&&String(type)==='2d'){try{c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';}catch(_){}}
        return c;
      };
      function restore(){proto.getContext=orig;}
      var p;
      try{p=Promise.resolve(run());}catch(e){restore();return Promise.reject(e);}
      return p.then(function(v){restore();return v;},function(e){restore();throw e;});
    }
    /* 原本 html2canvas 的 onclone 做的事，改用 html-to-image 的參數：
       - style：只套在複製出來的畫布根節點，拿掉預覽縮放、固定成設計尺寸
       - filter：藏掉縮放點、旋轉把手、提醒框、背景遮罩；分層下載時藏掉另一層
       html-to-image 由瀏覽器自己畫（SVG foreignObject），calc() 背景位置、object-fit
       都能正確處理，不再需要 html2canvas 時代的背景像素換算與圖片網址替換。 */
    var HIDE_SELECTOR='[data-corner],[data-rotate-handle],[data-rotate-badge],.bn-content-warning-tip,#_bn_bg_overlay';
    function captureFilter(layer){
      return function(node){
        if(node.nodeType!==1)return true;
        if(node.matches&&node.matches(HIDE_SELECTOR))return false;
        /* 沒設 src 的 <img>（例如還沒放底圖的 #底圖）會被 html-to-image 當成目前頁面去抓，
           整張截圖失敗；看不到的節點本來就不會畫出來，一起略過。 */
        if(node.tagName==='IMG'&&!node.getAttribute('src'))return false;
        if(window.getComputedStyle(node).display==='none')return false;
        if(layer!=='main'&&node.parentElement===cv){
          return layer==='background'?isBg(node):!isBg(node);
        }
        return true;
      };
    }
    function options(layer){
      var opts={
        width:W,height:H,canvasWidth:W,canvasHeight:H,pixelRatio:captureScale,
        cacheBust:false,includeQueryParams:true,
        backgroundColor:layer==='foreground'?undefined:(_bnFixedWhiteBackgroundTemplate||_bnWhiteCanvasUnderCircleTemplate?'#ffffff':undefined),
        style:{transform:'none',transformOrigin:'0 0',width:W+'px',height:H+'px',margin:'0',left:'0',top:'0'},
        filter:captureFilter(layer)
      };
      if(layer==='foreground')opts.style.background='transparent';
      /* 字型只內嵌一次：各層共用同一份 fontEmbedCSS，背景層沒有文字就不嵌字型，避免 15 秒逾時。 */
      if(layer==='background')opts.skipFonts=true;
      else if(context.fontEmbedCSS)opts.fontEmbedCSS=context.fontEmbedCSS;
      return opts;
    }
    function fontCSS(){
      if(context.fontEmbedCSS!==undefined)return Promise.resolve();
      /* 版位的 @font-face 同時列 WOFF2 與 TTF 備援，html-to-image 會兩種都內嵌（約 105 MB）。
         瀏覽器一定用 WOFF2，所以把 TTF 從內嵌 CSS 拿掉：輸出一樣，截圖時間約減半。 */
      return window.htmlToImage.getFontEmbedCSS(cv).then(function(css){
        context.fontEmbedCSS=String(css||'').replace(/,\s*url\(\s*["']?data:[^)]*\)\s*format\(\s*["']?truetype["']?\s*\)/gi,'');
      },function(){context.fontEmbedCSS='';});
    }
    function renderLayer(layer){
      if(context.done)return Promise.reject(bnCaptureError('CANCELLED','截圖已結束。','render'));
      bnCaptureProgress(context,'render-'+layer,layer==='main'?'正在截圖…':layer==='background'?'正在整理背景層…':'正在整理商品與文字層…');
      var job=(layer==='background'?Promise.resolve():fontCSS()).then(function(){
        if(context.done)throw bnCaptureError('CANCELLED','截圖已結束。','render');
        return bnWithHighQualitySmoothing(function(){return window.htmlToImage.toCanvas(cv,options(layer));});
      });
      return bnCaptureWait(job,layer==='main'?15000:7000,bnCaptureError('RENDER_TIMEOUT','截圖引擎處理逾時，請稍後再試。','render-'+layer),context).then(function(rendered){
        if(context.done)throw bnCaptureError('CANCELLED','截圖已結束。','render');
        var out=document.createElement('canvas');out.width=W;out.height=H;
        var ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(rendered,0,0,W,H);
        if(rendered&&rendered!==out){try{rendered.width=rendered.height=0;}catch(_){}}
        if(layer!=='background')_bnPaintLogoWallShadows(ctx,cv,scale,W,H);
        try{
          var src=out.toDataURL('image/png');if(!src||src==='data:,')throw new Error('empty');return src;
        }catch(error){throw bnCaptureError('CANVAS_READ','圖片無法匯出；請確認圖片來源允許讀取，或改用本機檔案上傳。','render');}
      });
    }
    renderLayer('main').then(function(mainUrl){
      context.mainUrl=mainUrl;
      if(!wantLayers){cb(mainUrl);return;}
      return renderLayer('background').then(function(bg){
        return renderLayer('foreground').then(function(fg){cb(mainUrl,bg,fg);});
      }).catch(function(error){
        context.layerWarning={code:error.code||'LAYER_FAILED',message:error.message};
        if(!context.done)cb(mainUrl);
      });
    }).catch(function(error){if(!context.done)cb(null,null,null,error);});
  }

  function applyColor(cls,color){
    if(!color)return;
    document.querySelectorAll('.'+cls).forEach(function(el){
      if(!el.querySelector('.cta-text')) el.style.color=color;
    });
  }
})();

})();

/* BN_FORCE_CTA_REGULAR_20260701 */
(function(){
  try {
    var css = '.放心買_安心退,.逛逛去,.cta-text{font-family:"ShopeeNotoSans (content)" !important;font-weight:300 !important;font-style:normal !important;}';
    var style = document.createElement('style');
    style.setAttribute('data-bn-cta-regular','1');
    style.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(style);
  } catch(e) {}
})();
