(function () {
  'use strict';
  if (window.ShopeeTour) return;
  var VERSION = '20261029-7';
    var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 8.5a2.5 2.5 0 0 1 4.7 1.2c0 1.8-2.5 2-2.5 3.8M12 17h.01"/></svg>';
  var POINTER = '<svg viewBox="0 0 22 28" fill="currentColor" stroke="#111111" stroke-width="1" aria-hidden="true"><path d="m3 2 16 14-8 1-4 8z"/></svg>';
  var FILE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6"/></svg>';
  var IMAGE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></svg>';
  function selection(){return '<span class="spt-selection"><i></i><i></i><i></i><i></i></span>';}
  function product(rotate){return '<div class="spt-product">'+selection()+(rotate?'<i class="spt-rotate-handle">↻</i>':'')+'</div>';}
  function demo(type){
    var caption='<span class="spt-demo-caption">操作示意 · 不影響目前內容</span>',body='';
    if(type==='upload'||type==='folder'||type==='restore'){
      var label=type==='folder'?'商品圖片':type==='restore'?'編輯暫存.json':'工單.xlsx';
      body='<div class="spt-demo-zone">拖曳到對應區域<small>放開即可讀取</small></div><div class="spt-demo-file">'+label+'</div><div class="spt-demo-cursor spt-cursor-drag">'+POINTER+'</div><span class="spt-demo-badge">✓ 已讀取</span>';
    }else if(type==='layout'){
      body='<div class="spt-demo-zone"><i></i><i></i></div><div class="spt-demo-file">MSBN</div><div class="spt-demo-cursor spt-cursor-drag">'+POINTER+'</div>';
    }else if(type==='matching'){
      body='<div class="spt-match-source"><small>工單圖片欄位</small><strong>A<b>,</b>B<b>,</b>C</strong></div>'+
        '<div class="spt-match-rule">↓ 用逗號分開，獨立尋找 3 張圖片</div>'+
        '<div class="spt-match-files"><span>'+IMAGE_ICON+'<b>A</b></span><span>'+IMAGE_ICON+'<b>B</b></span><span>'+IMAGE_ICON+'<b>C</b></span></div>';
    }else if(type==='shadow'){
      body='<div class="spt-demo-board"><span class="spt-product-shadow"></span>'+product(false)+'</div>'+
        '<div class="spt-shadow-directions"><span>影子向右</span><span>影子置中</span><span>影子向左</span></div>';
    }else if(type==='resize'||type==='rotate'){
      body='<div class="spt-demo-board"><span class="spt-product-shadow"></span>'+product(type==='rotate')+'</div>';
    }else if(type==='assets'){
      body='<div class="spt-asset-kinds">'+['LOGO 圖','商品圖','人物圖 1','人物圖 2'].map(function(label){return '<span>'+IMAGE_ICON+'<small>'+label+'</small></span>';}).join('')+'</div>'+
        '<div class="spt-asset-actions"><span>編輯</span><span>影子</span><span>前後</span><span>刪除</span></div><div class="spt-demo-cursor">'+POINTER+'</div>';
    }else if(type==='backgrounds'){
      body='<div class="spt-bg-thumbs"><span class="spt-bg-option spt-bg-theme-1"><small>背景 1</small></span><span class="spt-bg-option spt-bg-theme-2"><small>背景 2</small></span><span class="spt-bg-option spt-bg-theme-3"><small>背景 3</small></span></div>'+
        '<div class="spt-bg-preview"><i class="spt-bg-layer spt-bg-theme-1"></i><i class="spt-bg-layer spt-bg-theme-2"></i><i class="spt-bg-layer spt-bg-theme-3"></i><small class="spt-bg-preview-label">背景圖預覽</small><div class="spt-product spt-bg-product"></div></div>'+
        '<div class="spt-demo-cursor">'+POINTER+'</div>';
    }else if(type==='colors'){
      body='<div class="spt-mini-palette"><small>左側：點選色票</small><span><i></i>對應色票</span><b>開啟色盤修改</b></div><span class="spt-mini-link">→</span>'+
        '<div class="spt-mini-canvas"><small>右側畫布｜同步預覽</small><span aria-label="可換色的空白色塊"></span><i class="spt-mini-pointer">'+POINTER+'</i></div>';
    }else if(type==='color-reference'){
      body='<div class="spt-reference-price"><small>配色參考－價格</small><div><s>$999</s><b>活動價 $699</b></div><span><i></i><i></i><i></i></span></div>'+
        '<div class="spt-reference-menu"><small>配色參考－選單</small><div><span>一般</span><span>滑過</span><span>按下</span></div><span class="spt-reference-swatches"><i></i><i></i><i></i></span></div>'+
        '<div class="spt-reference-csv">選用色碼 → 色票_取色工具.csv</div>';
    }else if(type==='level'){
      body='<span class="spt-level-pill">A / B+</span><span>→</span><span class="spt-level-pill">依等級顯示版位</span>';
    }else if(type==='text'){
      body='<div class="spt-demo-board"><div class="spt-text-line">限時優惠開跑</div><small>在左側欄位編輯文案</small></div>';
    }else if(type==='bottom'){
      body='<span class="spt-bottom-slot">主會場</span><span class="spt-bottom-slot">品牌優惠</span><span class="spt-bottom-slot">限時精選</span>';
    }else if(type==='download'){
      body='<span class="spt-download-file">ZIP<br>多版位圖</span><span class="spt-download-file">PNG<br>單張圖片</span><span class="spt-download-file">JSON<br>暫存檔</span>';
    }else if(type==='arrange'){
      body='<span class="spt-arrange-item">左配品</span><span class="spt-arrange-item">中間主品<small>預設在後層</small></span><span class="spt-arrange-item">右配品</span>';
    }else if(type==='linked'){
      body='<div class="spt-link-card"><small>🔗 連動</small>'+product(false)+'</div><div class="spt-link-card"><small>🔗 連動</small>'+product(false)+'</div><div class="spt-link-card"><small>單張解鎖</small>'+product(false)+'</div>';
    }else if(type==='background-fit'){
      body='<div class="spt-demo-board"><small>縮放・水平・垂直位置</small></div>';
    }else{
      body='<span class="spt-exposure-tile">LOGO</span><span class="spt-exposure-tile">BN 預覽</span><span class="spt-exposure-tile">DDCARD</span>';
      type='exposure';
    }
    return '<div class="spt-demo spt-demo-'+type+'" aria-hidden="true">'+caption+body+'</div>';
  }



  var STEPS = [
    {id:'layouts',group:'選擇版位',target:['#layout-checks'],title:'先選擇這次要製作的版位',
      text:'在左側<b>排版選擇</b>勾選所需版位，右側就會出現對應畫布。也可使用「全選／全消」，一次調整目前入口允許選擇的版位。',
      tip:'網址後的 # 可能限制可用版位；教學不會改網址，也不會替你變更勾選。',demo:'exposure'},
    {id:'logos',group:'上傳素材',target:['#bn-logo-drop','#bn-logo-list'],fallback:['#sidebar'],title:'先上傳 LOGO',
      text:'透過<b>Logo 上傳</b>加入品牌 LOGO，最多三張，再調整大小與位置。',
      tip:'導覽不會選檔、替換圖片或改動既有版位。',demo:'assets'},
    {id:'products',group:'上傳素材',target:['#bn-prod-open-btn','#bn-prod-list'],fallback:['#sidebar'],title:'商品圖片：選圖、排大小、再套用',
      text:'使用<b>上傳商品圖</b>加入素材，依上傳視窗確認圖片、相對大小與排列，再按確認套用到畫布。',
      tip:'操作前先確認商品圖與 LOGO 分別上傳到正確欄位。動畫是示意圖片，不會取代你的商品。',demo:'folder'},
    {id:'arrange',group:'上傳素材',liveOptions:true,target:['#bn-prod-open-btn','#bn-prod-list'],fallback:['#sidebar'],title:'確認左、中、右與前後順序',
      text:'試著用滑鼠<b>拖曳三張示範商品互換位置</b>。中間固定是<b>較大的主品</b>、位於後層；商品換到中間時，會自動以主品比例放大。也可以用左右箭頭換位。',
      tip:'此步只操作獨立示範圖；不論是否已上傳商品，都會有三張示範圖。離開時關閉，不會改動正式商品或確認套用。'},
    {id:'text',group:'文案與背景',target:['#field-main','#section-text'],title:'在左側編輯文案，右側即時預覽',
      text:'修改品牌名、主標、副標、日期等文字，各版位會依自己的規則呈現。欄位旁會提示字數；看到紅框或橘色內容提醒，請先處理再下載。',
      tip:'不同版位的字數／欄位不同；請依目前顯示的提示，不要為了排版自行加入不支援的換行。',demo:'text'},
    {id:'colors',group:'文案與背景',target:['#color-rows','#dot-mainText'],title:'點色票，統一調整整組配色',
      text:'點選左側圓形色票，可調整<b>文字、背景、CTA 等顏色</b>，也能輸入色碼。實際可用色與自動配色，會依各版位的規則處理。',
      tip:'這裡的滑鼠與色盤只是示意，不會開啟真實色盤，也不會寫入你的配色。',demo:'colors'},
    {id:'backgrounds',group:'文案與背景',liveScreen:'backgrounds',target:['#bn-bg-open-btn','#bg-upload-btn'],findHeading:'背景圖',fallback:['#sidebar'],title:'透過背景圖庫選擇合適的背景',
      text:'按<b>上傳背景圖</b>開啟圖庫，再選圖並套用。包含四大類別：<b>EL、Fashion、FMCG、Lifestyle</b>',
      tip:'這裡直接展示真正的背景搜尋圖庫；篩選條件依目前入口與等級顯示，教學不會選圖、套用或放寬圖庫資格。'},
    {id:'preview',group:'畫布編輯',target:['.preview-block','#preview-area'],title:'在右側逐張確認實際成品',
      text:'右側每個區塊是一張獨立版位，上方顯示尺寸與預覽比例。捲動畫布逐張檢查<b>文案、商品、LOGO、背景與 CTA</b>，不要只看第一張。',
      tip:'沒有勾選版位時會顯示空白提示；教學不會自動勾選或灌入測試素材。',demo:'exposure'},
    {id:'transform',group:'畫布編輯',liveScreen:'canvas-transform',target:['#preview-area'],title:'直接在畫布中央縮放與旋轉商品',
      text:'不用開啟浮動編輯視窗。先<b>點選畫布中央的示範商品</b>，才會出現四角縮放點與旋轉圖示。拖商品可移動，拖四角可等比例縮放，拖上方把手可原地旋轉；點空白處則收起圖示。',
      tip:'這裡框亮的是畫布上的商品與操作把手，不是圖片編輯視窗。示範圖不會加入正式商品，也不會改動原本的位置、大小或角度。'},
    {id:'linked',group:'畫布編輯',target:['.bn-layout-lock','.preview-block-head'],fallback:['#preview-area'],title:'用畫布右上角的鎖鏈控制連動',
      text:'<b>鎖定時</b>，商品與人物的位置、大小會依各版位的有效商品區連動；<b>單張解鎖</b>後，可獨立調整這張，再按一次可重新加入連動。',
      tip:'首頁 LOGO 牆、SearchICON_PRODUCT 維持各自規則，不加入這套商品位置連動。教學不會替你切換鎖定。',demo:'linked'},
    {id:'shadow',group:'畫布編輯',liveScreen:'shadow-editor',entryPoint:true,target:['#preview-area'],fallback:['#sidebar'],title:'商品陰影也可以獨立微調',
      text:'從左側商品清單按<b>影子</b>，或按<b>編輯 → 加 / 編輯影子</b>，即可進入右側示範的影子畫面。可調整光源方向、陰影位移、寬度、長度與顏色。',
      tip:'此處展示已帶入示範商品的真實影子介面；示範與正式作品隔離，不會合成或套用到你的商品圖。'},
    {id:'download',group:'下載與暫存',target:['#bn-dl-all','#bn-download-bar'],findText:'下載全部勾選畫版|下載全部',fallback:['#sidebar'],title:'檢查完成，再下載勾選的畫版',
      text:'按<b>下載全部勾選畫版</b>輸出目前成品。多版位會打包成 ZIP；下載前請確認字數、內容提醒與圖片都已處理完成。',
      tip:'打包期間請等待完成，不要關閉分頁。導覽只標示按鈕，不會觸發下載。',demo:'download'},
    {id:'restore',group:'下載與暫存',target:['#bn-state-upload','#bn-state-bar'],findText:'上傳暫存|還原暫存|載入暫存|下載暫存',fallback:['#bn-download-bar','#sidebar'],title:'保存暫存檔，下次可以接著做',
      text:'保留工具提供的 <b>JSON 暫存檔</b>；下次從上傳／還原暫存入口載回，即可繼續編輯。同一瀏覽器的本機暫存，不能取代跨電腦的備份檔。',
      tip:'清除暫存可能重設內容，請先備份。完成教學後會回到開始前的捲動位置。',demo:'restore'}
  ];
  var ROUTES = {
    full:{label:'完整導覽 · '+STEPS.length+' 步',ids:STEPS.map(function(s){return s.id;})},
    assets:{label:'只看素材與畫布 · 8 步',ids:['layouts','logos','products','arrange','preview','transform','linked','shadow']},
    delivery:{label:'只看文案背景與交付 · 5 步',ids:['text','colors','backgrounds','download','restore']}
  };
  var root,card,focus,dim,entryFocus,entryDim,entryHint,snapshot,currentTarget,steps=[],route='full',index=-1,active=false,paused=false;
  var frameRaf=0,restoreRaf=0,mutationObserver=null,resizeObserver=null,frameObserver=null,observedFrameDoc=null;
  var pendingRoute='',waitingElement=null,waitingFocus=null,waitingTimer=0,idleTimer=0,launchObserver=null;
  var optionsPreview=null,optionsTimer=0;
  var livePreview=null,screenSources={},entryPreview=null;
    /* 背景圖庫使用原介面；畫布直接示範商品把手，影子使用隔離 frame 與原外掛。
     隔離示範只有內建商品，不會寫入作品、字型、帳號或暫存資料。 */
  function liveScreenTarget(){
    return livePreview&&livePreview.panel&&visible(livePreview.panel)?livePreview.panel:null;
  }
  function updateScreenNotice(){
    var note=root&&root.querySelector('.spt-screen-status');if(!note||!livePreview)return;
    var state=livePreview.state;if(note.dataset.status===state)return;note.dataset.status=state;
    if(state==='ready')note.textContent=livePreview.kind==='backgrounds'?'已開啟真正的背景搜尋圖庫；教學不會選圖或套用。':livePreview.kind==='canvas-transform'?'可直接拖拉示範商品、四角縮放與上方旋轉把手；不會開啟浮動編輯器或修改作品。':'這是正式工具相同的真實編輯介面，已帶入獨立示範商品，不會影響你的作品。';
    else if(state==='error')note.innerHTML=html(livePreview.error||'無法載入實際介面，請確認外掛檔案存在並使用網頁伺服器開啟工具。')+'<br><button type="button" class="spt-secondary" data-action="screen">重新載入實際介面</button>';
    else note.textContent='正在載入實際介面與示範商品…';
  }
  function saveScreenAttrs(el){
    return {el:el,attrs:['style','inert','aria-hidden','data-spt-screen'].map(function(name){return {name:name,value:el.getAttribute(name)};})};
  }
  function restoreScreenAttrs(saved){
    saved.attrs.forEach(function(attr){if(attr.value===null)saved.el.removeAttribute(attr.name);else saved.el.setAttribute(attr.name,attr.value);});
  }
  function closeLiveScreen(){
    var session=livePreview;if(!session)return;livePreview=null;session.closed=true;
    clearTimeout(session.timer);clearTimeout(session.timeout);
    if(session.listener)window.removeEventListener('message',session.listener);
    if(session.dispose)session.dispose();
    if(session.kind==='backgrounds'&&session.element){
      try{if(window.BNBgLibrary&&typeof window.BNBgLibrary.close==='function')window.BNBgLibrary.close();}catch(_){}
      if(session.attributes)session.attributes.forEach(restoreScreenAttrs);
      session.element.classList.remove('open');
      if(session.scrolls)session.scrolls.forEach(function(s){s.el.scrollTop=s.top;s.el.scrollLeft=s.left;});
    }
    if(session.mount)session.mount.remove();
  }
  function entryPointControls(){
    var list=document.getElementById('bn-prod-list'),found=[];if(!list)return found;
    $$('.bn-prod-item',list).some(function(row){
      var buttons=$$('button',row).filter(function(button){return visible(button)&&/^(編輯|影子)$/.test(button.textContent.trim());});
      if(buttons.some(function(button){return button.textContent.trim()==='影子';})){found=buttons;return true;}return false;
    });return found;
  }
  function showEntryPreview(){
    if(entryPreview||entryPointControls().length)return;
    var list=document.getElementById('bn-prod-list');if(!list)return;
    var row=document.createElement('div');row.className='bn-prod-item spt-shadow-entry-example';row.setAttribute('data-spt-demo-entry','');row.setAttribute('aria-hidden','true');row.setAttribute('inert','');
    row.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:6px;border:1px dashed #ee4d2d;border-radius:6px';
    var img=document.createElement('img');img.src=screenSampleSource();img.alt='';img.style.cssText='width:30px;height:36px;object-fit:contain';row.appendChild(img);
    var name=document.createElement('span');name.textContent='教學示範商品';name.style.cssText='flex:1;font-size:10px';row.appendChild(name);
    ['編輯','影子'].forEach(function(text){var button=document.createElement('button');button.type='button';button.tabIndex=-1;button.textContent=text;row.appendChild(button);});
    var note=document.createElement('small');note.textContent='僅教學示意，不會加入作品';note.style.cssText='flex-basis:100%;font-size:9px;color:#9a9aa4';row.appendChild(note);
    list.appendChild(row);entryPreview=row;
  }
  function hideEntryPreview(){if(entryPreview){entryPreview.remove();entryPreview=null;}}
  function scrollEntryPoint(){
    var controls=entryPointControls();if(!controls.length)return;
    try{controls[0].closest('.bn-prod-item').scrollIntoView({behavior:'instant',block:'start',inline:'nearest'});}catch(_){}
  }
  function entryPointRect(){
    var result=null;
    entryPointControls().forEach(function(el){var r=targetRect({el:el});if(!r)return;
      result=result?{left:Math.min(result.left,r.left),top:Math.min(result.top,r.top),right:Math.max(result.right,r.right),bottom:Math.max(result.bottom,r.bottom)}:r;
    });if(result){result.width=result.right-result.left;result.height=result.bottom-result.top;}return result;
  }
  function screenError(session,message){
    if(session.closed||livePreview!==session)return;
    session.state='error';session.error=message;clearTimeout(session.timeout);updateScreenNotice();scheduleLayout();
    var loading=session.mount&&session.mount.querySelector('.spt-real-loading');if(loading)loading.textContent=message;
  }
  function loadScreenSource(file){
    if(!screenSources[file]){
      screenSources[file]=Promise.resolve().then(function(){
        return window.fetch(new URL('js/'+file,document.baseURI).href+'?tour='+VERSION,{credentials:'same-origin',cache:'no-cache'});
      }).then(function(response){if(!response.ok)throw new Error('缺少 js/'+file);return response.text();}).catch(function(error){delete screenSources[file];throw error;});
    }
    return screenSources[file];
  }
  function screenSampleSource(){
    return 'data:image/svg+xml;base64,'+window.btoa('<svg xmlns="http://www.w3.org/2000/svg" width="460" height="500" viewBox="0 0 460 500"><defs><linearGradient id="body" x1="0" x2="1"><stop stop-color="#94a7ba"/><stop offset=".23" stop-color="#e6eef5"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#9cafc1"/></linearGradient><linearGradient id="top" x2="0" y2="1"><stop stop-color="#e9f1f7"/><stop offset="1" stop-color="#778da5"/></linearGradient><pattern id="mesh" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.35" fill="#74879b"/></pattern></defs><path d="M155 109v-28c0-45 150-45 150 0v28" fill="none" stroke="#899fb4" stroke-width="15"/><rect x="115" y="95" width="230" height="335" rx="55" fill="url(#body)" stroke="#71879b" stroke-width="2"/><ellipse cx="230" cy="110" rx="98" ry="22" fill="url(#top)"/><path d="M132 158q98-19 196 0v195q-98 28-196 0z" fill="#bdcbd8"/><path d="M132 158q98-19 196 0v195q-98 28-196 0z" fill="url(#mesh)"/><ellipse cx="230" cy="375" rx="86" ry="12" fill="#9bafc2"/><rect x="211" y="391" width="38" height="7" rx="3.5" fill="#263c50"/><circle cx="230" cy="123" r="5" fill="#ee4d2d"/><path d="M153 143v202" stroke="#fff" stroke-width="8" opacity=".34" stroke-linecap="round"/></svg>');
  }
  /* 畫布操作只放一個暫時的商品／把手在原畫布區，不開任何編輯浮窗。
     位置、比例、角度皆存在此 session，沒有商品廣播或暫存寫入。 */
  function showCanvasTransform(session){
    var mount=document.createElement('div');mount.className='spt-canvas-demo';
    mount.innerHTML='<div class="spt-canvas-caption">畫布操作示範 · 不會修改作品 <span data-demo-angle>0°</span></div>'+
      '<div class="spt-canvas-target" aria-hidden="true"></div><div class="spt-canvas-product" role="group" aria-label="可拖拉、縮放與旋轉的教學示範商品">'+
      '<img alt="教學示範商品" draggable="false"><button type="button" data-demo-resize="nw" aria-label="拖曳左上角等比例縮放"></button><button type="button" data-demo-resize="ne" aria-label="拖曳右上角等比例縮放"></button>'+
      '<button type="button" data-demo-resize="sw" aria-label="拖曳左下角等比例縮放"></button><button type="button" data-demo-resize="se" aria-label="拖曳右下角等比例縮放"></button>'+
      '<i class="spt-canvas-stem" aria-hidden="true"></i><button type="button" data-demo-rotate aria-label="拖曳把手原地旋轉">↻</button></div>';
    mount.querySelector('img').src=screenSampleSource();root.appendChild(mount);
    session.mount=mount;session.panel=mount.querySelector('.spt-canvas-target');session.product=mount.querySelector('.spt-canvas-product');
    session.value={x:.5,y:.55,scale:1,angle:0};session.gesture=null;session.state='ready';
    session.product.dataset.selected='false';
    var anchor=firstVisible(['.preview-block iframe','.preview-block-body','#preview-area']);
    if(anchor){try{anchor.scrollIntoView({behavior:'instant',block:'nearest',inline:'nearest'});}catch(_){}}
    function start(event){
      if(session.closed||event.button!==undefined&&event.button!==0)return;
      session.product.dataset.selected='true';paintCanvasTransform(session);scheduleLayout();
      var resize=event.target.closest('[data-demo-resize]'),rotate=event.target.closest('[data-demo-rotate]');
      var area=session.area,value=session.value,cx=area.left+value.x*area.width,cy=area.top+value.y*area.height;
      session.gesture={id:event.pointerId,mode:resize?'scale':rotate?'rotate':'move',x:event.clientX,y:event.clientY,cx:cx,cy:cy,value:{x:value.x,y:value.y,scale:value.scale,angle:value.angle},distance:Math.hypot(event.clientX-cx,event.clientY-cy)||1,angle:Math.atan2(event.clientY-cy,event.clientX-cx)};
      try{session.product.setPointerCapture(event.pointerId);}catch(_){}
      event.preventDefault();event.stopPropagation();
    }
    function move(event){
      var drag=session.gesture;if(!drag||session.closed||event.pointerId!==drag.id)return;
      var value=session.value,area=session.area;
      if(drag.mode==='move'){
        value.x=clamp(drag.value.x+(event.clientX-drag.x)/area.width,.1,.9);value.y=clamp(drag.value.y+(event.clientY-drag.y)/area.height,.15,.85);
      }else if(drag.mode==='scale')value.scale=clamp(drag.value.scale*Math.hypot(event.clientX-drag.cx,event.clientY-drag.cy)/drag.distance,.5,1.8);
      else{
        var delta=(Math.atan2(event.clientY-drag.cy,event.clientX-drag.cx)-drag.angle)*180/Math.PI;
        if(delta>180)delta-=360;if(delta< -180)delta+=360;
        value.angle=drag.value.angle+delta;if(event.shiftKey)value.angle=Math.round(value.angle/15)*15;
      }
      paintCanvasTransform(session);scheduleLayout();event.preventDefault();event.stopPropagation();
    }
    function end(event){
      if(!session.gesture||event.pointerId!==session.gesture.id)return;
      session.gesture=null;try{session.product.releasePointerCapture(event.pointerId);}catch(_){}
      /* 放開時不重新計算座標，保持同一中心點，避免旋轉／縮放彈跳。 */
      event.preventDefault();event.stopPropagation();
    }
    session.product.addEventListener('pointerdown',start);
    function deselect(event){if(!session.product.contains(event.target)){session.product.dataset.selected='false';paintCanvasTransform(session);scheduleLayout();}}
    window.addEventListener('pointerdown',deselect,true);
    window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',end,true);
    session.dispose=function(){session.gesture=null;session.product.removeEventListener('pointerdown',start);window.removeEventListener('pointerdown',deselect,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);};
    placeCanvasTransform(session);updateScreenNotice();scheduleLayout();
  }
  function placeCanvasTransform(session){
    if(session.closed||!session.mount)return;
    var w=window.innerWidth,h=window.innerHeight,anchor=firstVisible(['.preview-block iframe','.preview-block-body']);
    var area=anchor&&intersect(anchor.getBoundingClientRect(),{left:14,top:76,right:w-14,bottom:h-18});
    if(!area||area.width<100||area.height<100){
      var preview=document.getElementById('preview-area'),rect=preview&&preview.getBoundingClientRect();
      var left=rect&&rect.left>0?rect.left+14:w>=900?402:14;
      area={left:left,top:86,width:Math.max(100,w-left-18),height:Math.max(160,Math.min(h-130,w<900?250:430))};
      session.mount.dataset.emptyCanvas='true';
    }else session.mount.removeAttribute('data-empty-canvas');
    session.area=area;
    session.mount.style.left=area.left+'px';session.mount.style.top=area.top+'px';session.mount.style.width=area.width+'px';session.mount.style.height=area.height+'px';
    paintCanvasTransform(session);
  }
  function paintCanvasTransform(session){
    var area=session.area;if(!area)return;
    var value=session.value,height=Math.min(240,area.height*.48,area.width*.42)*value.scale,width=height*460/500;
    var x=area.width*value.x,y=area.height*value.y,angle=value.angle*Math.PI/180;
    var box=session.product;box.style.left=x+'px';box.style.top=y+'px';box.style.width=width+'px';box.style.height=height+'px';box.style.transform='translate(-50%,-50%) rotate('+value.angle+'deg)';
    box.dataset.angle=String(value.angle);box.dataset.scale=String(value.scale);session.mount.querySelector('[data-demo-angle]').textContent=Math.round(value.angle)+'°';
    var corners=[[-width/2,-height/2],[width/2,-height/2],[-width/2,height/2],[width/2,height/2]];
    if(box.dataset.selected==='true')corners.push([0,-height/2-32]);
    var points=corners.map(function(p){return {x:x+p[0]*Math.cos(angle)-p[1]*Math.sin(angle),y:y+p[0]*Math.sin(angle)+p[1]*Math.cos(angle)};});
    var left=Math.min.apply(null,points.map(function(p){return p.x;}))-12,top=Math.min.apply(null,points.map(function(p){return p.y;}))-12;
    var right=Math.max.apply(null,points.map(function(p){return p.x;}))+12,bottom=Math.max.apply(null,points.map(function(p){return p.y;}))+12;
    session.panel.style.left=left+'px';session.panel.style.top=top+'px';session.panel.style.width=(right-left)+'px';session.panel.style.height=(bottom-top)+'px';
  }
  function screenFrameBootstrap(config){
    'use strict';
    var sent=false,started=Date.now();
    function send(type,message){window.parent.postMessage({channel:'shopee-tour-screen',token:config.token,type:type,message:message||''},'*');}
    window.addEventListener('error',function(){if(!sent)send('error','實際介面載入失敗，請重新載入教學。');});
    window.alert=function(message){send('error',String(message));};
    window.open=function(){return null;};
    window.fetch=function(){return Promise.reject(new Error('教學示範不傳送資料'));};
    var box=document.createElement('div');box.className='editor-item';box.dataset.baseSrc=config.sample;
    box.style.cssText='position:fixed;left:-10000px;top:0;width:460px;height:500px';
    var image=document.createElement('img');image.src=config.sample;box.appendChild(image);document.body.appendChild(box);
    if(config.kind==='image-editor')window.HBNProductEditorPlugin.open(image);
    else window._bnGroundShadow.openEditor({id:'shopee-tour-example',name:'教學示範商品',src:config.sample,baseSrc:config.sample,ratio:460/500,meta:{groundShadow:{enabled:true,angle:'left',offsetX:0,offsetY:0,scaleX:1,scaleY:1,color:'#5a5a5a'}}},function(){});
    function check(){
      var canvas=document.querySelector(config.kind==='image-editor'?'.hbn-plugin-workspace canvas':'.bn-shadow-preview canvas');
      var status=document.querySelector('.hbn-plugin-status [data-role="status"]');
      var busy=document.querySelector('.bn-shadow-preview.busy');
      var ready=canvas&&canvas.width>2&&canvas.height>2&&(config.kind==='image-editor'?status&&/已開啟/.test(status.textContent):!busy);
      if(ready){sent=true;send('ready');return;}
      if(Date.now()-started>12000){send('error','示範圖片尚未完成載入，請重試。');return;}
      setTimeout(check,60);
    }
    check();
    ['click','pointerdown','change','input','dragstart','drop'].forEach(function(type){
      document.addEventListener(type,function(event){event.preventDefault();event.stopImmediatePropagation();},true);
    });
  }
  function makeScreenDocument(kind,token,sources){
    var policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; font-src 'none'; form-action 'none'";
    var style='html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111827;font-family:Arial,sans-serif}*{box-sizing:border-box}.hbn-plugin-modal,#bn-shadow-modal{background:transparent!important;backdrop-filter:none!important}.hbn-plugin-panel{width:100%!important;height:100%!important;border-radius:0!important}.bn-shadow-box{width:100%!important;max-height:100%!important;border-radius:0!important}.bn-shadow-body{gap:12px;padding:12px}.bn-shadow-preview{min-height:300px}.bn-shadow-ctrl{width:220px}.hbn-plugin-nudge{display:none!important}.hbn-plugin-panel button,.bn-shadow-box button{pointer-events:none}';
    function script(value){return '<scr'+'ipt>'+value.replace(/<\/script/gi,'<\\/script')+'<\/scr'+'ipt>';}
    var boot='('+screenFrameBootstrap.toString()+')('+JSON.stringify({kind:kind,token:token,sample:screenSampleSource()})+');';
    return '<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+html(policy)+'"><style>'+style+'</style></head><body>'+sources.map(script).join('')+script(boot)+'</body></html>';
  }
  function showLiveScreen(kind){
    if(!kind||livePreview)return;
    var session=livePreview={kind:kind,state:'loading',closed:false,panel:null,element:null,mount:null,iframe:null,attributes:null};
    if(kind==='canvas-transform'){showCanvasTransform(session);return;}
    if(kind==='backgrounds'){
      var tries=0;
      function openBackground(){
        if(session.closed||livePreview!==session)return;
        if(!window.BNBgLibrary||typeof window.BNBgLibrary.open!=='function'){
          if(++tries<25){session.timer=setTimeout(openBackground,100);return;}
          screenError(session,'背景圖庫外掛尚未載入，請確認 js/bn-bg-library-plugin.js 存在。');return;
        }
        var existing=document.getElementById('bnBgLibModal');
        if(existing&&existing.classList.contains('open')){screenError(session,'請先關閉目前的背景圖庫，再重新載入此步教學。');return;}
        try{
          window.BNBgLibrary.open();
          session.element=document.getElementById('bnBgLibModal');session.panel=session.element&&session.element.querySelector('.bn-bglib-modal');
          if(!session.panel)throw new Error('找不到背景圖庫介面');
          session.attributes=[saveScreenAttrs(session.element),saveScreenAttrs(session.panel)];
          session.scrolls=$$('.bn-bglib-body',session.element).map(function(el){return {el:el,top:el.scrollTop,left:el.scrollLeft};});
          session.element.setAttribute('inert','');session.element.setAttribute('aria-hidden','true');session.element.setAttribute('data-spt-screen','backgrounds');
          session.state='ready';placeLiveScreen();updateScreenNotice();scheduleLayout();
        }catch(error){
          var failed=document.getElementById('bnBgLibModal');
          if(failed&&failed.classList.contains('open')&&window.BNBgLibrary&&typeof window.BNBgLibrary.close==='function')window.BNBgLibrary.close();
          console.warn('[Shopee教學] 背景圖庫無法開啟',error);screenError(session,'無法開啟真正的背景搜尋圖庫，請重新載入此步教學。');
        }
      }
      openBackground();return;
    }
    var mount=document.createElement('section');mount.className='spt-real-screen';mount.setAttribute('role','img');mount.setAttribute('aria-label',kind==='image-editor'?'真實圖片編輯器，已帶入教學示範商品':'真實陰影編輯器，已帶入教學示範商品');
    mount.innerHTML='<div class="spt-real-caption">'+(kind==='image-editor'?'圖片編輯器':'影子編輯器')+' · 教學示範，不會加入作品</div><div class="spt-real-viewport"><div class="spt-real-loading">正在載入實際介面與示範圖…</div></div>';
    root.appendChild(mount);session.mount=session.panel=mount;placeLiveScreen();
    var files=kind==='image-editor'?['editor-plugin.js']:['shadow-plugin.js','bn-shadow-plugin.js'];
    Promise.all(files.map(loadScreenSource)).then(function(sources){
      if(session.closed||livePreview!==session)return;
      var iframe=document.createElement('iframe');session.iframe=iframe;
      iframe.title=kind==='image-editor'?'教學用真實圖片編輯器':'教學用真實影子編輯器';iframe.setAttribute('sandbox','allow-scripts');iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');iframe.setAttribute('referrerpolicy','no-referrer');
      var token='spt-'+Date.now()+'-'+Math.random().toString(36).slice(2);
      session.listener=function(event){
        var data=event.data;
        if(session.closed||livePreview!==session||event.source!==iframe.contentWindow||!data||data.channel!=='shopee-tour-screen'||data.token!==token)return;
        if(data.type==='ready'){
          session.state='ready';clearTimeout(session.timeout);mount.dataset.ready='true';
          var loading=mount.querySelector('.spt-real-loading');if(loading)loading.remove();
          updateScreenNotice();scheduleLayout();
        }else if(data.type==='error')screenError(session,data.message||'實際編輯介面載入失敗。');
      };
      window.addEventListener('message',session.listener);iframe.srcdoc=makeScreenDocument(kind,token,sources);mount.querySelector('.spt-real-viewport').appendChild(iframe);
      session.timeout=setTimeout(function(){screenError(session,'實際編輯介面載入逾時；請確認外掛檔案後再重試。');},15000);
      placeLiveScreen();scheduleLayout();
    }).catch(function(error){screenError(session,(error&&error.message?error.message+'。':'')+'請使用網頁伺服器開啟工具，並確認 js 資料夾檔案完整。');});
  }
  function placeLiveScreen(){
    var session=livePreview;if(!session||!session.panel)return;
    if(session.kind==='canvas-transform'){placeCanvasTransform(session);return;}
    var w=window.innerWidth,h=window.innerHeight,m=14,desktop=w>=900;
    if(session.kind==='backgrounds'){
      session.element.style.boxSizing='border-box';session.element.style.padding=desktop?'72px 16px 16px 402px':'72px 14px '+Math.min(330,Math.round(h*.47))+'px';
      session.panel.style.width='100%';session.panel.style.height='100%';session.panel.style.maxHeight='100%';return;
    }
    var entry=!desktop&&index>=0&&steps[index].entryPoint?entryPointRect():null;
    var mobileTop=entry?Math.max(76,entry.bottom+44):76;
    var available=desktop?{left:402,top:86,width:w-418,height:h-110}:{left:m,top:mobileTop,width:w-2*m,height:Math.max(100,Math.min(h*.43,h-mobileTop-250))};
    var naturalW=900,naturalH=session.kind==='image-editor'?650:560;
    var scale=Math.min(1,available.width/naturalW,Math.max(80,available.height-30)/naturalH);
    var width=Math.round(naturalW*scale),height=Math.round(naturalH*scale)+30;
    session.mount.style.width=width+'px';session.mount.style.height=height+'px';
    session.mount.style.left=(available.left+Math.max(0,(available.width-width)/2))+'px';session.mount.style.top=(available.top+Math.max(0,(available.height-height)/2))+'px';
    if(session.iframe){session.iframe.style.width=naturalW+'px';session.iframe.style.height=naturalH+'px';session.iframe.style.transform='scale('+scale+')';}
  }


  function html(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function $$(selector,doc){return Array.prototype.slice.call((doc||document).querySelectorAll(selector));}
  function visible(el){
    if(!el||!el.isConnected)return false;
    var r=el.getBoundingClientRect(),s=el.ownerDocument.defaultView.getComputedStyle(el);
    return r.width>2&&r.height>2&&s.visibility!=='hidden'&&s.display!=='none';
  }
  function safeFocus(el){if(el&&el.focus){try{el.focus({preventScroll:true});}catch(_){el.focus();}}}
  function clamp(value,min,max){return Math.max(min,Math.min(Math.max(min,max),value));}
  function productOptionsTarget(){
    var session=optionsPreview&&optionsPreview.session;
    return session&&visible(session.element)&&visible(session.panel)?session.panel:null;
  }
  function updateOptionsNotice(){
    var note=root&&root.querySelector('.spt-options-status');if(!note)return;
    var shown=!!productOptionsTarget(),status=shown?'shown':optionsPreview&&optionsPreview.opening?'opening':'unavailable';
    if(note.dataset.status===status)return;
    note.dataset.status=status;
    note.innerHTML=shown?(optionsPreview.session.interactive?'三張示範圖可直接拖拉換位；中間為較大的主品。操作不會套用到正式作品。':optionsPreview.session.count?'已開啟實際的「② 確認大小比例」選項視窗（教學展示，不會套用）。':'這是實際的「② 確認大小比例」選項視窗。尚未上傳商品，因此暫時沒有商品縮圖。'):
      status==='opening'?'正在開啟實際商品選項視窗…':
      '目前無法開啟商品選項，請確認已一併更新商品編輯外掛，並先完成其他編輯視窗。<br><button type="button" class="spt-secondary" data-action="options">重新開啟商品選項</button>';
  }
  function showProductOptions(){
    if(optionsPreview)return;
    optionsPreview={session:null,opening:true};
    var attempt=0;
    function check(){
      optionsTimer=0;if(!active||!optionsPreview||index<0||!steps[index].liveOptions)return;
      var api=window.BNProductOptionsTour;
      if(!optionsPreview.session&&api&&typeof api.open==='function'){
        try{optionsPreview.session=api.open({interactiveDemo:true,host:root});}catch(_){optionsPreview.opening=false;}
      }
      updateOptionsNotice();scheduleLayout();
      if(productOptionsTarget())return;
      if(++attempt<20&&optionsPreview.opening)optionsTimer=setTimeout(check,100);
      else{optionsPreview.opening=false;updateOptionsNotice();}
    }
    check();
  }
  function hideProductOptions(){
    clearTimeout(optionsTimer);optionsTimer=0;
    if(!optionsPreview)return;var saved=optionsPreview;optionsPreview=null;
    if(saved.session&&typeof saved.session.close==='function')saved.session.close();
  }
  function isBusy(){
    if(window._bnExporting||window._bnStateDownloading)return true;
    return $$('#bn-loading-overlay.show,#bn-download-overlay.show,#manual-modal.show,#bn-prod-modal.show,#bn-bg-modal.show,#bnBgLibModal.open,#bn-shadow-modal.show,.hbn-plugin-modal.open,.hbn-plugin-modal.show,#bnSlabFitModal.open').some(visible);
  }
  function clearPending(){
    pendingRoute='';clearTimeout(waitingTimer);clearTimeout(idleTimer);waitingTimer=idleTimer=0;
    if(waitingElement){waitingElement.remove();waitingElement=null;}
    var launch=document.getElementById('shopee-tour-launch');if(launch)launch.removeAttribute('aria-busy');
    window.removeEventListener('keydown',onWaitingKey,true);
    window.removeEventListener('hashchange',cancelPending,true);
    window.removeEventListener('popstate',cancelPending,true);
  }
  function cancelPending(){var old=waitingFocus;clearPending();waitingFocus=null;if(visible(old))safeFocus(old);}
  function onWaitingKey(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();cancelPending();}}
  function checkPending(){
    if(!pendingRoute)return;
    if(!isBusy()&&document.visibilityState!=='hidden'){
      if(!idleTimer)idleTimer=setTimeout(function(){
        idleTimer=0;if(!pendingRoute||isBusy()||document.visibilityState==='hidden')return;
        var key=pendingRoute,old=waitingFocus;clearPending();waitingFocus=null;begin(key,old);
      },220);
    }else{clearTimeout(idleTimer);idleTimer=0;}
    waitingTimer=setTimeout(checkPending,250);
  }
  function queueStart(key){
    pendingRoute=key;
    if(!waitingElement){
      waitingFocus=document.activeElement;
      waitingElement=document.createElement('div');waitingElement.id='shopee-tour-waiting';waitingElement.setAttribute('role','status');
      waitingElement.innerHTML='<span class="spt-wait-spinner" aria-hidden="true"></span><div class="spt-wait-copy"><b>已預約開始教學</b><span>請先完成目前的編輯或等待處理結束，導覽會自動開啟。</span></div><button type="button">取消等候</button>';
      document.body.appendChild(waitingElement);waitingElement.querySelector('button').addEventListener('click',cancelPending);
      var launch=document.getElementById('shopee-tour-launch');if(launch)launch.setAttribute('aria-busy','true');
      window.addEventListener('keydown',onWaitingKey,true);
      window.addEventListener('hashchange',cancelPending,true);window.addEventListener('popstate',cancelPending,true);
      checkPending();
    }
    return true;
  }
  function takeSnapshot(){
    var scrolls=$$('#sidebar-scroll,#preview-area').map(function(el){return {el:el,x:el.scrollLeft,y:el.scrollTop};});
    var frames=[];
    $$('.preview-block iframe').forEach(function(frame){try{
      if(frame.contentDocument)frames.push({win:frame.contentWindow,x:frame.contentWindow.scrollX,y:frame.contentWindow.scrollY});
    }catch(_){}});
    return {focus:document.activeElement,x:window.scrollX,y:window.scrollY,scrolls:scrolls,frames:frames,background:[]};
  }
  function isolateBackground(){
    Array.prototype.slice.call(document.body.children).forEach(function(el){
      if(el===root||/^(SCRIPT|STYLE|LINK)$/.test(el.tagName))return;
      snapshot.background.push({el:el,inert:el.getAttribute('inert'),aria:el.getAttribute('aria-hidden')});
      el.setAttribute('inert','');el.setAttribute('aria-hidden','true');
    });
  }
  function restore(){
    if(!snapshot)return;var saved=snapshot;snapshot=null;
    saved.background.forEach(function(s){
      if(!s.el.isConnected)return;
      if(s.inert===null)s.el.removeAttribute('inert');else s.el.setAttribute('inert',s.inert);
      if(s.aria===null)s.el.removeAttribute('aria-hidden');else s.el.setAttribute('aria-hidden',s.aria);
    });
    function scrollBack(){
      saved.scrolls.forEach(function(s){if(s.el.isConnected){s.el.scrollLeft=s.x;s.el.scrollTop=s.y;}});
      saved.frames.forEach(function(s){try{s.win.scrollTo(s.x,s.y);}catch(_){}});
      if(window.scrollX!==saved.x||window.scrollY!==saved.y)window.scrollTo(saved.x,saved.y);
    }
    scrollBack();restoreRaf=requestAnimationFrame(function(){restoreRaf=0;if(!active){scrollBack();if(visible(saved.focus))safeFocus(saved.focus);}});
  }
  function firstVisible(selectors,doc){
    var found=null;
    (selectors||[]).some(function(selector){return $$(selector,doc).some(function(el){if(visible(el)){found=el;return true;}return false;});});
    return found;
  }
  function findText(pattern){
    var re=new RegExp(pattern),found=null;
    $$('button,label,a,[role="button"]').some(function(el){
      if(root&&root.contains(el)||el.closest('#manual-modal,#shopee-tour-waiting'))return false;
      var text=String(el.textContent||el.title||'').trim();
      if(text.length<90&&re.test(text)&&visible(el)){found=el;return true;}return false;
    });return found;
  }
  function resolve(step){
    var el=null,frame=null,fallback=false;
    if(step.liveScreen){el=liveScreenTarget();if(el)return {el:el,frame:null,fallback:false};}
    if(step.liveOptions){el=productOptionsTarget();if(el)return {el:el,frame:null,fallback:false};}
    if(step.frameTargets){
      $$('.preview-block iframe').some(function(f){
        if(!visible(f))return false;
        try{el=firstVisible(step.frameTargets,f.contentDocument);if(el){frame=f;return true;}}catch(_){}
        return false;
      });
    }
    if(!el)el=firstVisible(step.target);
    if(!el&&step.findHeading){
      $$('#sidebar .s-section').some(function(heading){if(visible(heading)&&heading.textContent.replace(/\s/g,'')===step.findHeading){el=heading;return true;}return false;});
    }
    if(!el&&step.findText)el=findText(step.findText);
    if(!el){el=firstVisible(step.fallback);fallback=true;}
    if(step.frameTargets&&!frame)fallback=true;
    return {el:el,frame:frame,fallback:fallback};
  }
  function scrollTarget(target){
    if(!target||!target.el)return;
    try{target.el.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});}catch(_){}
    if(target.frame){try{target.frame.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});}catch(_){}}
  }
  function clearFrameObserver(){
    if(frameObserver){frameObserver.disconnect();frameObserver=null;}
    if(observedFrameDoc)observedFrameDoc.removeEventListener('scroll',scheduleLayout,true);
    observedFrameDoc=null;
  }
  function watchFrame(){
    var doc=null;try{doc=currentTarget&&currentTarget.frame&&currentTarget.frame.contentDocument;}catch(_){}
    if(doc===observedFrameDoc)return;
    clearFrameObserver();observedFrameDoc=doc;
    if(doc){
      doc.addEventListener('scroll',scheduleLayout,true);
      if(window.MutationObserver&&doc.body){frameObserver=new MutationObserver(scheduleLayout);frameObserver.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']});}
    }
  }
  function buildRoot(){
    root=document.createElement('div');root.id='shopee-tour-root';root.hidden=true;root.tabIndex=-1;
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','shopee-tour-title');
    root.innerHTML='<div class="spt-dimmer" aria-hidden="true"></div><svg class="spt-dual-dimmer" aria-hidden="true" hidden><path fill="var(--spt-dim)" fill-rule="evenodd"></path></svg><div class="spt-focus" aria-hidden="true" hidden></div>'+
      '<div class="spt-focus spt-entry-focus" aria-hidden="true" hidden></div><div class="spt-entry-hint" aria-hidden="true" hidden>左側商品清單：編輯／影子</div>'+
      '<div class="spt-hud"><strong>SHOPEE 使用教學</strong><span class="spt-hud-note">教學模式 · 不會變更你的內容</span>'+
      '<button type="button" class="spt-pause" data-action="pause" aria-pressed="false">暫停動畫</button>'+
      '<button type="button" class="spt-icon-button" data-action="close" aria-label="關閉使用教學">×</button></div><div class="spt-host"></div>';
    document.body.appendChild(root);focus=root.querySelector('.spt-focus');dim=root.querySelector('.spt-dimmer');entryFocus=root.querySelector('.spt-entry-focus');entryDim=root.querySelector('.spt-dual-dimmer');entryHint=root.querySelector('.spt-entry-hint');
    root.addEventListener('click',function(event){
      var button=event.target.closest('[data-action]');if(!button||button.disabled)return;
      var action=button.getAttribute('data-action');
      if(action==='close')stop();
      else if(action==='start'){chooseRoute(root.querySelector('.spt-route-select').value);go(0);}
      else if(action==='next'){if(index===steps.length-1)stop();else go(index+1);}
      else if(action==='prev')go(index-1);
      else if(action==='options'){hideProductOptions();showProductOptions();updateOptionsNotice();scheduleLayout();}
      else if(action==='screen'){closeLiveScreen();showLiveScreen(steps[index].liveScreen);updateScreenNotice();scheduleLayout();}
      else if(action==='pause'){
        paused=!paused;root.dataset.paused=String(paused);button.setAttribute('aria-pressed',String(paused));button.textContent=paused?'播放動畫':'暫停動畫';
      }
    });
    root.addEventListener('change',function(event){if(event.target.classList.contains('spt-jump'))go(Number(event.target.value));});
    function preventBackgroundScroll(event){if(!event.target.closest('.spt-card,.spt-welcome'))event.preventDefault();}
    root.addEventListener('wheel',preventBackgroundScroll,{passive:false});root.addEventListener('touchmove',preventBackgroundScroll,{passive:false});
  }
  function chooseRoute(key){
    route=ROUTES[key]?key:'full';steps=ROUTES[route].ids.map(function(id){return STEPS.filter(function(s){return s.id===id;})[0];});
    root.dataset.route=route;root.dataset.total=String(steps.length);
  }
  function welcome(){
    index=-1;card=null;currentTarget=null;focus.hidden=true;dim.hidden=false;entryFocus.hidden=entryHint.hidden=true;entryDim.setAttribute('hidden','');root.dataset.dualFocus='false';
    root.dataset.screen='welcome';root.dataset.step='welcome';
    root.querySelector('.spt-host').innerHTML='<section class="spt-welcome"><div class="spt-eyebrow">SHOPEE / 互動操作導覽</div>'+
      '<h2 id="shopee-tour-title">從素材，到整組成品。</h2><p class="spt-welcome-lead">跟著重點框選與操作動畫，認識 BN 編輯器。<br>第一次使用，先看一遍就有方向。</p>'+
      '<div class="spt-welcome-path" aria-hidden="true"><div><b>1</b>勾選版位與素材</div><span>→</span><div><b>2</b>編輯文案與畫布</div><span>→</span><div><b>3</b>下載與備份</div></div>'+
      '<div class="spt-welcome-foot"><button type="button" class="spt-secondary" data-action="close">先不用，結束導覽</button><button type="button" class="spt-primary" data-action="start">開始導覽 →</button></div>'+
      '<div class="spt-route-box"><label class="spt-route-label" for="shopee-tour-route">想先了解哪一段？</label><select class="spt-route-select" id="shopee-tour-route">'+
      Object.keys(ROUTES).map(function(k){return '<option value="'+k+'"'+(route===k?' selected':'')+'>'+html(ROUTES[k].label)+'</option>';}).join('')+'</select></div>'+
      '<p class="spt-safe"><b>放心看，不會替你修改作品。</b>教學會展示真正的商品排序與背景圖庫；圖片及影子介面使用獨立示範圖，離開步驟時關閉。教學不會確認套用、改文字、配色、素材、版位勾選、鎖定或暫存，也不會上傳、下載。下次可從右下角「使用教學」再次播放。</p></section>';
    safeFocus(root.querySelector('[data-action="start"]'));
  }
  function go(position){
    if(!active||position<0||position>=steps.length)return;
    var step=steps[position];if(!step.liveOptions)hideProductOptions();
    if(!step.liveScreen||!livePreview||livePreview.kind!==step.liveScreen)closeLiveScreen();
    if(!step.entryPoint)hideEntryPreview();
    clearFrameObserver();index=position;if(step.entryPoint){showEntryPreview();scrollEntryPoint();}if(step.liveOptions)showProductOptions();if(step.liveScreen)showLiveScreen(step.liveScreen);currentTarget=resolve(step);scrollTarget(currentTarget);
    root.dataset.screen='step';root.dataset.step=step.id;root.dataset.index=String(index+1);
    var fallback=!step.liveOptions&&!step.liveScreen&&(currentTarget.fallback||!currentTarget.el)?'<p class="spt-fallback">目前尚未顯示此操作區或素材，先看動畫示意；可以繼續下一步。</p>':'';
    root.querySelector('.spt-host').innerHTML='<section class="spt-card"><div class="spt-card-content">'+
      '<div class="spt-step-meta"><span>'+String(index+1).padStart(2,'0')+' / '+steps.length+'</span><span class="spt-group">'+html(step.group)+'</span></div>'+
      '<h2 id="shopee-tour-title">'+html(step.title)+'</h2><p class="spt-description">'+step.text+'</p>'+(step.liveOptions?'<p class="spt-fallback spt-options-status" role="status"></p>':step.liveScreen?'<p class="spt-fallback spt-screen-status" role="status"></p>':demo(step.demo))+'<p class="spt-tip">'+step.tip+'</p>'+fallback+
      '<div class="spt-progress" role="progressbar" aria-label="導覽進度" aria-valuemin="0" aria-valuemax="'+steps.length+'" aria-valuenow="'+(index+1)+'"><span style="width:'+((index+1)/steps.length*100)+'%"></span></div>'+
      '<div class="spt-controls"><button type="button" class="spt-skip" data-action="close">跳過導覽</button><div class="spt-controls-right">'+
      '<button type="button" class="spt-secondary" data-action="prev"'+(index===0?' disabled':'')+'>上一步</button><button type="button" class="spt-primary" data-action="next">'+(index===steps.length-1?'完成教學 ✓':'下一步 →')+'</button></div></div>'+
      '<select class="spt-jump" aria-label="跳至教學步驟">'+steps.map(function(s,i){return '<option value="'+i+'"'+(i===index?' selected':'')+'>'+(i+1)+'. '+html(s.title)+'</option>';}).join('')+'</select></div></section>';
    card=root.querySelector('.spt-card');if(step.liveOptions)updateOptionsNotice();if(step.liveScreen)updateScreenNotice();layout();watchFrame();safeFocus(card.querySelector('[data-action="next"]'));scheduleLayout();
  }
  function intersect(a,b){
    var l=Math.max(a.left,b.left),t=Math.max(a.top,b.top),r=Math.min(a.right,b.right),d=Math.min(a.bottom,b.bottom);
    return r>l&&d>t?{left:l,top:t,right:r,bottom:d,width:r-l,height:d-t}:null;
  }
  function targetRect(target){
    target=target||currentTarget;
    if(!target||!visible(target.el))return null;
    var r=target.el.getBoundingClientRect(),frame=target.frame;
    if(frame){
      var f=frame.getBoundingClientRect(),sx=f.width/(frame.offsetWidth||f.width),sy=f.height/(frame.offsetHeight||f.height);
      r={left:f.left+r.left*sx,top:f.top+r.top*sy,right:f.left+r.right*sx,bottom:f.top+r.bottom*sy};
      r=intersect(r,f);if(!r)return null;
    }
    var parent=(frame||target.el).parentElement;
    while(parent&&parent!==document.body){
      var cs=window.getComputedStyle(parent);
      if(/auto|scroll|hidden|clip/.test(cs.overflow+cs.overflowY+cs.overflowX)){r=intersect(r,parent.getBoundingClientRect());if(!r)return null;}
      parent=parent.parentElement;
    }
    return intersect({left:r.left-6,top:r.top-6,right:r.right+6,bottom:r.bottom+6},{left:8,top:62,right:window.innerWidth-8,bottom:window.innerHeight-8});
  }
  function positionEntryFocus(main,entry){
    var dual=!!(main&&entry&&!intersect(main,entry));root.dataset.dualFocus=String(dual);
    entryFocus.hidden=entryHint.hidden=!dual;
    if(dual)entryDim.removeAttribute('hidden');else entryDim.setAttribute('hidden','');
    if(!dual)return;
    function box(r){return 'M'+r.left+' '+r.top+'H'+r.right+'V'+r.bottom+'H'+r.left+'Z';}
    entryDim.setAttribute('viewBox','0 0 '+window.innerWidth+' '+window.innerHeight);
    entryDim.querySelector('path').setAttribute('d',box({left:0,top:0,right:window.innerWidth,bottom:window.innerHeight})+box(main)+box(entry));
    entryFocus.style.left=entry.left+'px';entryFocus.style.top=entry.top+'px';entryFocus.style.width=entry.width+'px';entryFocus.style.height=entry.height+'px';
    entryHint.style.left=entry.left+'px';entryHint.style.top=(entry.bottom+8)+'px';
  }
  function layout(){
    if(!active||index<0||!card)return;
    if(steps[index].liveOptions)updateOptionsNotice();
    if(steps[index].liveScreen){placeLiveScreen();updateScreenNotice();}
    var next=resolve(steps[index]);
    if(!currentTarget||next.el!==currentTarget.el||next.frame!==currentTarget.frame){currentTarget=next;scrollTarget(next);watchFrame();}
    var r=targetRect(),entry=steps[index].entryPoint?entryPointRect():null,w=window.innerWidth,h=window.innerHeight,m=14,g=18,cw=Math.max(180,Math.min(364,w-2*m));
    card.style.width=cw+'px';var ch=card.offsetHeight||420;
    dim.hidden=!!r;focus.hidden=!r;
    positionEntryFocus(r,entry);
    if(r){focus.style.left=r.left+'px';focus.style.top=r.top+'px';focus.style.width=r.width+'px';focus.style.height=r.height+'px';}
    if(steps[index].liveScreen&&w<900&&r){
      var below=Math.min(h-115,r.bottom+14);card.style.left=m+'px';card.style.top=below+'px';card.style.width=(w-2*m)+'px';card.style.maxHeight=Math.max(90,h-below-m)+'px';return;
    }
    var options=r?[{x:r.right+g,y:r.top},{x:r.left-cw-g,y:r.top},{x:r.left+(r.width-cw)/2,y:r.bottom+g},{x:r.left+(r.width-cw)/2,y:r.top-ch-g}]:[{x:(w-cw)/2,y:(h-ch)/2}];
    if(entry)options.unshift({x:m,y:entry.bottom+44},{x:m,y:entry.top-ch-g});
    var best=null,score=Infinity;
    options.forEach(function(p){
      var x=clamp(p.x,m,w-cw-m),y=clamp(p.y,66,h-ch-m);
      var overlap=r?Math.max(0,Math.min(x+cw,r.right)-Math.max(x,r.left))*Math.max(0,Math.min(y+ch,r.bottom)-Math.max(y,r.top)):0;
      var entryOverlap=entry?Math.max(0,Math.min(x+cw,entry.right)-Math.max(x,entry.left))*Math.max(0,Math.min(y+ch,entry.bottom+36)-Math.max(y,entry.top)):0;
      var value=overlap*10+entryOverlap*25+Math.abs(x-p.x)+Math.abs(y-p.y);if(value<score){score=value;best={x:x,y:y};}
    });
    card.style.left=best.x+'px';card.style.top=best.y+'px';
  }
  function scheduleLayout(){if(active&&!frameRaf)frameRaf=requestAnimationFrame(function(){frameRaf=0;layout();});}
  function onKey(event){
    if(!active)return;event.stopImmediatePropagation();
    if(event.key==='Escape'){event.preventDefault();stop();return;}
    if(event.target.tagName!=='SELECT'&&index>=0&&!event.ctrlKey&&!event.altKey&&!event.metaKey){
      if(event.key==='ArrowRight'){event.preventDefault();if(index===steps.length-1)stop();else go(index+1);return;}
      if(event.key==='ArrowLeft'){event.preventDefault();if(index>0)go(index-1);return;}
    }
    if(event.key==='Tab'){
      var controls=$$('button:not(:disabled),select',root).filter(visible),first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&(document.activeElement===first||!root.contains(document.activeElement))){event.preventDefault();safeFocus(last);}
      else if(!event.shiftKey&&(document.activeElement===last||!root.contains(document.activeElement))){event.preventDefault();safeFocus(first);}
    }
  }
  function onFocus(event){if(active&&!root.contains(event.target))safeFocus(root.querySelector('[data-action="next"],[data-action="start"]'));}
  function onLocation(){if(active)stop();}
  function start(key){
    if(active)return false;key=ROUTES[key]?key:'full';
    if(isBusy())return queueStart(key);clearPending();return begin(key);
  }
  function begin(key,returnFocus){
    if(active)return false;
    if(restoreRaf){cancelAnimationFrame(restoreRaf);restoreRaf=0;}
    if(!root)buildRoot();snapshot=takeSnapshot();active=true;paused=false;root.dataset.paused='false';
    if(visible(returnFocus))snapshot.focus=returnFocus;
    var pause=root.querySelector('[data-action="pause"]');pause.setAttribute('aria-pressed','false');pause.textContent='暫停動畫';
    chooseRoute(key);root.hidden=false;safeFocus(root);isolateBackground();welcome();
    window.addEventListener('keydown',onKey,true);window.addEventListener('focusin',onFocus,true);
    window.addEventListener('resize',scheduleLayout);window.addEventListener('scroll',scheduleLayout,true);
    window.addEventListener('hashchange',onLocation,true);window.addEventListener('popstate',onLocation,true);
    document.addEventListener('load',scheduleLayout,true);
    if(window.MutationObserver){
      mutationObserver=new MutationObserver(scheduleLayout);
      ['sidebar','preview-area'].forEach(function(id){var el=document.getElementById(id);if(el)mutationObserver.observe(el,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});});
    }
    if(window.ResizeObserver){resizeObserver=new ResizeObserver(scheduleLayout);resizeObserver.observe(document.documentElement);}
    return true;
  }
  function stop(){
    if(pendingRoute)cancelPending();if(!active)return;active=false;
    hideProductOptions();
    closeLiveScreen();
    hideEntryPreview();
    clearFrameObserver();if(frameRaf){cancelAnimationFrame(frameRaf);frameRaf=0;}
    if(mutationObserver){mutationObserver.disconnect();mutationObserver=null;}
    if(resizeObserver){resizeObserver.disconnect();resizeObserver=null;}
    window.removeEventListener('keydown',onKey,true);window.removeEventListener('focusin',onFocus,true);
    window.removeEventListener('resize',scheduleLayout);window.removeEventListener('scroll',scheduleLayout,true);
    window.removeEventListener('hashchange',onLocation,true);window.removeEventListener('popstate',onLocation,true);
    document.removeEventListener('load',scheduleLayout,true);
    root.hidden=true;root.querySelector('.spt-host').innerHTML='';currentTarget=card=null;index=-1;restore();
  }
  function positionLaunch(){
    var button=document.getElementById('shopee-tour-launch'),manual=document.getElementById('manual-btn');
    if(!button||!visible(manual))return;
    var r=manual.getBoundingClientRect();
    button.style.right=Math.max(8,window.innerWidth-r.right)+'px';button.style.bottom=Math.max(18,window.innerHeight-r.top+10)+'px';button.style.width=r.width+'px';
  }
  function mount(){
    var button=document.getElementById('shopee-tour-launch');if(!button)return;
    button.innerHTML=ICON+'<span>使用教學</span>';button.addEventListener('click',function(){start('full');});
    positionLaunch();window.addEventListener('resize',positionLaunch);
    var manual=document.getElementById('manual-btn');
    if(window.ResizeObserver&&manual){launchObserver=new ResizeObserver(positionLaunch);launchObserver.observe(manual);}
  }
  window.ShopeeTour={version:VERSION,start:start,stop:stop,isActive:function(){return active;},isPending:function(){return !!pendingRoute;}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
