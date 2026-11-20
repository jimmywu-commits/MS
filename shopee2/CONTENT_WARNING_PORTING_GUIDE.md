# 可移植指令：回饋／蝦幣非阻擋式內容提醒

將本文件直接提供給另一個編輯器專案的開發工具或程式代理，並要求依目標專案架構完成實作。欄位 ID、畫布 selector 與訊息機制可以配合專案調整，但不得改變下列文案、行為及驗收條件。

## 一、實作目標

在主標／副標輸入及所有版位預覽中加入橘色內容提醒：命中特定關鍵字時提示補充促銷條件。提醒不得阻擋下載，也不得出現在匯出圖片。

## 二、不可改寫的正式文案

```js
const CONTENT_WARNING_COPY = {
  reward: '提醒您回饋若有門檻/上限，需於日期後方補充警語。如「單筆須滿$X,XXX」、「最高折$XXX」(若無上限則可不寫)。',
  coin: '提醒您若蝦幣需領券，可於標題補充「領券」關鍵字，例如「領券享10%蝦幣」。',
  dismiss: '我已了解/已補充▶'
};
```

## 三、觸發邏輯

```js
function getContentWarnings(mainText, subText) {
  const copy = String(mainText || '') + ' ' + String(subText || '');
  const messages = [];

  if (/回饋|滿額/.test(copy)) {
    messages.push(CONTENT_WARNING_COPY.reward);
  }
  if (/蝦幣/.test(copy)) {
    messages.push(CONTENT_WARNING_COPY.coin);
  }

  return messages;
}
```

要求：

- 主標與副標任一欄位命中都要觸發。
- 「回饋」與「滿額」共用回饋提醒，最多顯示一次。
- 同時命中回饋類及蝦幣時，兩則提醒都顯示。
- 文字輸入、畫布直接編輯、暫存上傳還原後都要重新判斷。

## 四、父頁／編輯器狀態

父頁維護下列暫時狀態：

```js
let currentWarningMessages = [];
let dismissedSignature = '';

function contentWarningSignature(mainText, subText) {
  return String(mainText || '') + '\n' + String(subText || '');
}
```

更新流程：

1. 取得目前主標及副標。
2. 呼叫 `getContentWarnings()`。
3. 如果沒有提醒，清空 `dismissedSignature`。
4. 如果目前 signature 等於 `dismissedSignature`，左側與畫布都傳送空陣列。
5. 否則顯示左側提醒，並把完整 messages 廣播到所有版位。

不要把 dismiss 狀態永久寫入使用者資料；主標／副標改變或重新整理後應再次檢查。

## 五、父頁與版位訊息契約

### 5.1 父頁傳給版位

```js
iframe.contentWindow.postMessage({
  type: 'bn-content-warning',
  messages
}, '*');
```

### 5.2 版位按鈕通知父頁

```js
window.parent.postMessage({
  type: 'bn-content-warning-dismiss'
}, '*');
```

父頁收到後必須：

- 將 `dismissedSignature` 設為目前主標＋副標 signature。
- 隱藏左側提醒。
- 向所有版位廣播空 messages，同步隱藏提醒。

### 5.3 版位回報預覽尺寸

```js
window.parent.postMessage({
  type: 'bn-content-warning-bounds',
  id: layoutId,
  w: requiredWidth,
  h: requiredHeight
}, '*');
```

父頁必須依回報尺寸擴張 iframe／預覽容器，讓畫板外下方的提醒列完整可見。

若目標專案不是 iframe 架構，改用既有事件匯流排或共享狀態，但同步結果必須相同。正式環境使用 `postMessage` 時，應依專案來源限制與驗證 `origin`。

## 六、左側工具列 UI

日期輸入列需提供：

```html
<div class="date-field-row">
  <input id="date-input" type="text">
</div>
<div id="content-warning" role="status" aria-live="polite"></div>
```

建議樣式：

```css
.date-field-row.content-warning input {
  border-color: #f59e0b !important;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3) !important;
}

#content-warning {
  display: none;
  margin: 6px 0 2px;
  padding: 7px 9px;
  border: 1px solid rgba(245, 158, 11, 0.72);
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  font-size: 10px;
  line-height: 1.55;
}
```

使用 DOM `textContent` 建立提醒文字，不要直接將使用者輸入拼入 `innerHTML`。

## 七、畫布 UI

### 7.1 日期標示

命中提醒時，在版位的日期元素加上專用 class：

```css
.bn-content-warning-target {
  outline: 3px solid #f59e0b !important;
  background: rgba(245, 158, 11, 0.14) !important;
  border-radius: 2px;
}
```

### 7.2 畫板外下方提醒列

提醒列必須位於畫板下方 `8px`，寬度等於畫板，不可覆蓋畫板內容：

```css
.bn-content-warning-tip {
  position: absolute;
  box-sizing: border-box;
  z-index: 20050;
  padding: 0.5em 0.65em;
  border: 2px solid #f59e0b;
  border-radius: 0.45em;
  background: rgba(17, 24, 39, 0.96);
  color: #fbbf24;
  font-family: Arial, "Noto Sans TC", sans-serif;
  font-weight: 700;
  line-height: 1.45;
  white-space: normal;
  text-align: left;
  overflow-wrap: break-word;
  pointer-events: auto;
}

.bn-content-warning-copy,
.bn-content-warning-line {
  display: inline;
}

.bn-content-warning-line + .bn-content-warning-line::before {
  content: "\A";
  white-space: pre;
}

.bn-content-warning-dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  margin-left: 0.5em;
  padding: 0.42em 0.72em;
  min-height: 1.9em;
  border: 2px solid #f59e0b;
  border-radius: 999px;
  background: #f59e0b;
  color: #241600;
  font: 700 0.88em/1 Arial, "Noto Sans TC", sans-serif;
  white-space: nowrap;
  cursor: pointer;
}
```

定位原則：

```js
tip.style.left = '0px';
tip.style.top = canvasHeight + 8 + 'px';
tip.style.width = canvasWidth + 'px';
tip.style.maxWidth = canvasWidth + 'px';
```

提醒文字與按鈕必須採行內流動排版。按鈕放在 copy 節點之後，緊接最後一個字，不要使用 `justify-content: space-between`，也不要固定在最右側。

### 7.3 最小可視字級

```js
const MIN_VISIBLE_FONT = 13;
const MIN_CANVAS_FONT = 18;

const previewScale = Math.max(0.1, Math.min(1, visibleWidth / layoutWidth));
const fontSize = Math.min(
  30,
  Math.max(MIN_CANVAS_FONT, Math.ceil(MIN_VISIBLE_FONT / previewScale))
);
```

套用後，縮小預覽中的實際可視字級不可低於約 `13px`。

## 八、版位端渲染流程

每次收到 messages 時：

1. 移除舊的日期橘框及舊提醒列。
2. messages 為空時結束，並回報原畫板尺寸。
3. 找到畫板中的日期元素並加上 `.bn-content-warning-target`。
4. 用 `textContent` 建立每一則提醒，前綴 `⚠ `。
5. 在所有提醒文字之後加入唯一一顆按鈕，文字為「我已了解/已補充▶」。
6. 將提醒列放在畫板外下方，寬度等於畫板。
7. 依縮放比例套用最小可視字級。
8. 回報包含提醒列高度的完整 bounds。

新建版位、版位 reload、文字更新、圖片或版型尺寸改變後，都要重新排版提醒列。

## 九、下載與截圖隔離

此項為必要條件，不可只用 CSS 猜測截圖工具會忽略提示。

截圖前：

```js
const warningTargets = [...document.querySelectorAll('.bn-content-warning-target')];
const warningTips = [...document.querySelectorAll('.bn-content-warning-tip')];

warningTargets.forEach(el => el.classList.remove('bn-content-warning-target'));
warningTips.forEach(el => {
  el.dataset.previousDisplay = el.style.display;
  el.style.display = 'none';
});
```

截圖 callback／Promise 完成或失敗時，都必須在 `finally` 邏輯中恢復原狀：

```js
warningTargets.forEach(el => el.classList.add('bn-content-warning-target'));
warningTips.forEach(el => {
  el.style.display = el.dataset.previousDisplay || '';
  delete el.dataset.previousDisplay;
});
```

另外確認：

- 提醒不加入 `canDownload()`、表單 validation 或硬擋 modal。
- 提醒文案不寫入日期欄位。
- PNG、JPG、WebP、分層圖片及 ZIP 中的所有圖片都不含提醒 UI。

## 十、驗收清單

- [ ] 主標含「回饋」會顯示指定回饋文案。
- [ ] 副標含「滿額」會顯示同一則回饋文案。
- [ ] 主標或副標含「蝦幣」會顯示指定蝦幣文案。
- [ ] 同時命中兩類時顯示兩則提醒，但只有一顆按鈕。
- [ ] 按鈕文字完全等於「我已了解/已補充▶」。
- [ ] 按鈕緊接最後一則文字，不固定靠右。
- [ ] 提醒列位於畫板外下方且與畫板同寬。
- [ ] 小版位的實際可視字級不低於約 `13px`。
- [ ] 提醒列不遮擋版型，也不被 iframe 或容器裁切。
- [ ] 點擊按鈕會同步隱藏左側與所有版位提醒。
- [ ] 修改主標或副標後，提醒會依新內容重新出現。
- [ ] 提醒存在時仍可下載。
- [ ] 所有下載圖片均不包含橘框、提醒文字與按鈕。
- [ ] 原本的紅色超字阻擋規則不受影響。

## 十一、交付要求

完成移植後請回報：

1. 修改的檔案與關鍵函式。
2. 父頁與版位間採用的同步方式。
3. 截圖／下載前如何移除提醒 UI。
4. 上述驗收清單的測試結果。

