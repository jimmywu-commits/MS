# 編輯器暫存、跨環境位置還原與版位勾選移植規格

> 用途：將目前曝光資源編輯器的暫存修正，移植到其他編輯器專案。
>
> 目標不是直接複製特定檔案，而是完整複製資料格式、還原優先順序、下載前同步和版型載入時序。

## 一、要解決的問題

舊版編輯器以瀏覽器本機產生的數字版位 ID 作為位置與勾選狀態的 key，例如：

```json
{
  "products": [
    {
      "layouts": {
        "1723456789001": {
          "leftPct": 0.1,
          "topPct": 0.2,
          "widthPct": 0.4,
          "heightPct": 0.5
        }
      }
    }
  ]
}
```

數字 ID 只在產生它的瀏覽器環境中有效。下列情境會得到另一組 ID：

- 換電腦。
- 使用無痕模式。
- 清除網站資料或 localStorage。
- 使用不同網域、子網域、protocol 或連接埠。
- 重新建立版型清單。

結果是圖片本體能還原，但商品、人物、LOGO 或背景位置找不到目前版位，最後退回置中預設值；版位勾選也可能退回全選。

另一個競態是：使用者上傳暫存時，版型清單可能仍在非同步掃描。此時即使 JSON 已有正確的勾選內容，畫面上還沒有目前版位 ID，舊流程無法套用，掃描完成後便使用預設全選。

## 二、核心設計

### 2.1 雙軌保存

新格式同時保存：

1. 舊數字 ID key：維持舊版相容。
2. 正規化版型檔名 key：跨電腦、跨 origin 使用。
3. 下載當時的 `layoutManifest`：讓舊 ID map 能被重新映射，又不必重複大型圖片資料。

還原優先順序：

1. 版型檔名資料。
2. 透過 `layoutManifest` 將下載端舊 ID 映射成目前 ID。
3. 目前環境可直接對上的舊 ID。
4. 單一版位的 legacy `layout` 備援。
5. 全部沒有時才使用預設置中排版。

### 2.2 版型檔名正規化

所有輸出與匯入必須使用同一支正規化函式：

```js
function normalizeLayoutFile(file) {
  let value = String(file || '').trim().replace(/\\/g, '/');
  try {
    value = decodeURIComponent(value);
  } catch (_) {}
  value = value
    .split('?')[0]
    .split('#')[0]
    .replace(/^.*\//, '');
  return value.toLowerCase();
}
```

必要行為：

- Windows 反斜線轉成斜線。
- URL encoded 中文檔名要 decode。
- 移除 query string 與 hash。
- 只保留 basename。
- 轉小寫，避免不同環境大小寫差異。

版型檔名必須唯一；如果同目錄允許同名檔案，應改用相對路徑作為 canonical key，不可只取 basename。

## 三、暫存 JSON 格式

維持既有 `version: 1`，新增 `portableVersion: 1`，避免舊讀取器直接拒絕。

```json
{
  "version": 1,
  "portableVersion": 1,
  "ts": 1780000000000,
  "layoutManifest": [
    {
      "id": "1723456789001",
      "file": "hbn_方logo.html",
      "name": "HBN_方LOGO"
    },
    {
      "id": "1723456789002",
      "file": "hbn_橫式logo.html",
      "name": "HBN_橫式LOGO"
    }
  ],
  "texts": {
    "brand": "品牌",
    "main": "主標",
    "sub": "副標",
    "date": "日期",
    "icon": "ICON文案"
  },
  "colors": {},
  "logos": [],
  "logoLayouts": {
    "1723456789003": {
      "left": -5,
      "top": 8,
      "width": 96,
      "height": 40
    }
  },
  "logoLayoutsByFile": {
    "searchicon_logo.html": {
      "left": -5,
      "top": 8,
      "width": 96,
      "height": 40
    }
  },
  "products": [
    {
      "id": "product_1",
      "src": "data:image/png;base64,...",
      "layout": {
        "left": 20,
        "top": 30,
        "width": 200,
        "height": 180
      },
      "layouts": {
        "1723456789001": {
          "leftPct": 0.1,
          "topPct": 0.2,
          "widthPct": 0.4,
          "heightPct": 0.5
        }
      },
      "layoutsByFile": {
        "hbn_方logo.html": {
          "leftPct": 0.1,
          "topPct": 0.2,
          "widthPct": 0.4,
          "heightPct": 0.5
        }
      }
    }
  ],
  "character": {
    "id": "character_1",
    "src": "data:image/png;base64,...",
    "layouts": {},
    "layoutsByFile": {}
  },
  "character2": null,
  "background": {
    "activeId": "1723456789001",
    "activeFile": "hbn_方logo.html",
    "states": {
      "1723456789001": {
        "src": "data:image/png;base64,...",
        "fit": "cover",
        "scale": 100,
        "x": 50,
        "y": 50
      }
    },
    "statesByFile": {
      "hbn_方logo.html": {
        "fit": "cover",
        "scale": 100,
        "x": 50,
        "y": 50
      }
    }
  },
  "checked": {
    "1723456789001": true,
    "1723456789002": false
  },
  "checkedByFile": {
    "hbn_方logo.html": true,
    "hbn_橫式logo.html": false
  }
}
```

### 3.1 為何背景 `statesByFile` 不放 `src`

背景 data URL 通常很大。如果 `states` 和 `statesByFile` 都存一份 `src`，暫存檔會接近兩倍大小。

正確策略：

- 圖片本體只存在 legacy `background.states[id].src`。
- `statesByFile[file]` 只放 fit、scale、x、y 等小型參數。
- 匯入時先用 `layoutManifest` 把舊 ID 的完整背景 state 搬到目前 ID。
- 再用 `statesByFile` 覆蓋位置參數。

## 四、匯出端實作

### 4.1 建立目前版型索引

```js
function getLayoutIndex(layouts) {
  const byId = {};
  const byFile = {};
  const manifest = [];

  layouts.forEach(layout => {
    const id = String(layout.id);
    const file = normalizeLayoutFile(layout.file || layout.name);
    if (!id || !file) return;
    byId[id] = file;
    byFile[file] = id;
    manifest.push({ id, file, name: String(layout.name || '') });
  });

  return { byId, byFile, manifest };
}
```

### 4.2 將 ID map 轉成檔名 map

```js
function idMapToFileMap(values, index) {
  const out = {};
  Object.keys(values || {}).forEach(id => {
    const file = index.byId[String(id)];
    if (file) out[file] = structuredClone(values[id]);
  });
  return out;
}
```

下列資料都必須產生檔名 map：

- `products[].layoutsByFile`
- `character.layoutsByFile`
- `character2.layoutsByFile`
- `logoLayoutsByFile`
- `background.statesByFile`
- `background.activeFile`
- `checkedByFile`

### 4.3 顏色與文字必須讀目前畫面權威狀態

不要只讀舊 snapshot。下載暫存時應依序合併：

1. 舊 snapshot，僅作備援。
2. `getColorData()`。
3. 畫面目前的 `colorState`，最後覆蓋。
4. 執行顏色限制的 sanitizer。

文字需包含所有實際欄位，包括獨立的 SearchICON 文案：

```js
texts: {
  brand,
  main,
  sub,
  date,
  icon
}
```

明確上傳暫存時，暫存內顏色必須具有最高優先權，不可再被 ZIP 匯出期間的 frozen color 或 guard 覆蓋。

### 4.4 CTA 底色規則 01

- CTA 底色允許白色與近白色；禁止黑色、近黑色與廣義灰色。
- 灰色包含 RGB 最大值與最小值差距不超過 24 的低彩度顏色，但近白色優先視為可用。
- 「文字常用」色票中的 `#2d3748`、`#4a5568`、`#718096` 也明確視為 CTA 灰色禁色。
- 一般 CTA 與 Search Image CTA 都套用同一規則。
- 選到黑色或灰色禁色、輸入禁色色碼、載入暫存禁色或版型 CSS 寫死禁色時，統一回退深藍 `#2540b5`。
- CTA 文字色不套用這條底色規則，黑色與白色仍可使用。

### 4.5 CTA 文字與三角形對比規則

- CTA 文字與三角形採「白色優先」：一般色彩皆使用白色，只有底色非常接近白色時才切換黑色。
- 接近白色的判斷採 HSL lightness 概念，門檻為 85%；亮黃色、橘色等高亮度彩色仍維持白色。
- 一般 CTA 依 `ctaBg` 判斷；Search Image 的圓形 CTA 依 `searchImageCtaBg` 獨立判斷。
- `ctaTextAuto` 預設為 `true`；使用者明確選擇 CTA 文字色後改為 `false`，保留黑／白手動覆寫能力。
- `ctaTextAuto` 必須隨暫存下載／上傳；舊暫存沒有此欄位時視為自動模式。
- 預覽、單獨暫存還原、ZIP 匯出圖片都必須套用相同結果。

## 五、下載前同步最新畫布位置

只依賴拖曳過程的即時回寫仍可能漏掉最後一個 animation frame，因此兩種下載都必須先做 layout snapshot：

- 單獨「下載暫存」。
- 「下載全部勾選畫版」產生圖片／ZIP，且 ZIP 內附編輯暫存。

同步必須發生在設定 `_exporting` 或 `_suppressLayoutWrite` 之前。

### 5.1 父層送出

```js
{
  "type": "bn-layout-snapshot-request",
  "requestId": "layout_..."
}
```

父層記錄目前所有 iframe 的版位 ID，等待各 iframe 完成；建議 timeout 900ms。逾時不阻擋下載，使用既有即時資料作為備援。

### 5.2 iframe 收到後

iframe 必須依序回傳：

- 所有商品位置：既有 `bn-product-layout-update`。
- 所有人物位置：既有 `bn-character-layout-update`。
- SearchICON_LOGO 專用位置：`bn-searchicon-logo-layout-update`。

最後送：

```js
{
  type: 'bn-layout-snapshot-complete',
  requestId,
  bnid: currentLayoutId
}
```

完成訊息建議放在 `setTimeout(..., 0)`，讓同頁其他專用 listener 先送完位置更新。

### 5.3 click 事件陷阱

若使用：

```js
button.addEventListener('click', downloadAll);
```

`downloadAll` 第一個參數會收到 Event，不可用一般 truthy 判斷是否已同步。

應使用：

```js
function downloadAll(layoutSynced) {
  if (layoutSynced !== true) {
    return syncLayouts().finally(() => downloadAll(true));
  }
  // 真正下載
}
```

## 六、匯入端映射

### 6.1 ID map 還原演算法

```js
function restoreIdMap(legacyValues, portableValues, currentIndex, savedManifest) {
  const out = structuredClone(legacyValues || {});

  // 1. 用下載端 manifest 將舊 ID 搬到目前 ID
  (savedManifest || []).forEach(saved => {
    const oldId = String(saved.id);
    const currentId =
      currentIndex.byFile[normalizeLayoutFile(saved.file || saved.name)];
    if (currentId && Object.prototype.hasOwnProperty.call(out, oldId)) {
      out[currentId] = structuredClone(out[oldId]);
    }
  });

  // 2. 檔名 map 為最高優先
  Object.keys(portableValues || {}).forEach(file => {
    const currentId = currentIndex.byFile[normalizeLayoutFile(file)];
    if (!currentId) return;

    const portable = structuredClone(portableValues[file]);
    if (
      out[currentId] &&
      portable &&
      typeof out[currentId] === 'object' &&
      typeof portable === 'object' &&
      !Array.isArray(out[currentId]) &&
      !Array.isArray(portable)
    ) {
      out[currentId] = { ...out[currentId], ...portable };
    } else {
      out[currentId] = portable;
    }
  });

  return out;
}
```

### 6.2 套用順序

建議順序：

1. 建立目前版型 `byId/byFile` 索引。
2. 還原 SearchICON_LOGO layouts。
3. 還原文字與顏色。
4. 還原 LOGO 圖片。
5. 還原商品，每個商品先完成 `layoutsByFile → layouts[currentId]`。
6. 還原人物一、人物二。
7. 還原版位勾選。
8. 依勾選狀態建立／移除 iframe。
9. 還原背景。
10. 重送文字、顏色、素材和背景到新 iframe。

如果版型清單尚未掃描完成，不可丟掉檔名式勾選資料；詳見下一節。

## 七、版位勾選狀態

### 7.1 必須保存 true 與 false

不可寫：

```js
if (checked[file]) {
  // ...
}
```

因為 `false` 是有效的「反勾選」，不是缺少資料。

必須用：

```js
if (file in checkedByFile) {
  value = checkedByFile[file];
}
```

### 7.2 頁面需同時維護兩份記憶狀態

```js
let checked = {};       // { currentLayoutId: boolean }
let checkedByFile = {}; // { normalizedFile: boolean }
```

畫面判斷優先順序：

```js
function getLayoutCheckedValue(layout) {
  const file = normalizeLayoutFile(layout.file || layout.name);
  const defaultChecked = !/^LPBN_/i.test(layout.file || '');

  if (layout.id in checked) return !!checked[layout.id];
  if (file in checkedByFile) return !!checkedByFile[file];
  if (layout.checked !== undefined) return !!layout.checked;
  return defaultChecked;
}
```

### 7.3 上傳時版型尚未掃描完成

匯入 `checkedByFile` 時：

1. 先把整份檔名 map 放進記憶體。
2. 清除頁面初始化產生的預設全選 ID map。
3. 如果版型已存在，立即映射到目前 ID。
4. 如果版型尚不存在，保留檔名 map。
5. `renderChecks()` 和 `renderPreviews()` 每次都必須查 `checkedByFile`。

這可避免上傳後短暫正確，接著被非同步版型掃描重新全選。

### 7.4 重建版型清單時保留 checked

掃描 index 並重建 layout object 時，不可只保留 id、w、h、enabled，也要保留：

```js
checked: old && old.checked !== undefined
  ? !!old.checked
  : undefined
```

手動單選、全選／全不選、LOGO 方橫版自動選擇，都必須同時更新 `checked` 與 `checkedByFile`。

## 八、SearchICON_LOGO 位置

SearchICON_LOGO 原本只寫入：

```js
sessionStorage['bn_searchicon_logo_layout_' + bnid]
```

sessionStorage 無法跨電腦，也無法跨 origin，因此必須同步回父層：

```js
window.parent.postMessage({
  type: 'bn-searchicon-logo-layout-update',
  bnid,
  layout: {
    left,
    top,
    width,
    height
  }
}, '*');
```

父層存入 `logoLayouts[bnid]`，下載時產生 `logoLayoutsByFile`。

匯入後父層送 LOGO 給 iframe 時，需附上：

```js
{
  type: 'bn-logos',
  logos,
  logoLayoutById
}
```

iframe 以目前 `bnid` 取出位置。若訊息明確帶有 `logoLayoutById`，但目前版位沒有資料，應清除舊 sessionStorage，避免上一份工單的位置污染新工單。

sessionStorage 可以保留作同一分頁內的相容備援，但不能再當唯一資料來源。

## 九、SearchICON 背景隔離

以下三個版位的 120×120 外層底固定白色，不接受任何背景圖片：

- `SearchICON_LOGO`
- `SearchICON_PRODUCT`
- `SearchICON_TEXT`

需在三層都設防：

1. 父層背景狀態收集：這三個版位的 `src` 輸出為 null。
2. 父層背景廣播／背景圖庫套用：跳過這三個版位。
3. iframe runtime：收到 `bn-bg` 時再次清除背景圖並強制 canvas 白底。

不要只在 CSS 設白底；如果父層仍保存和廣播背景圖，重新載入、匯出或匯入時仍可能被吃到。

## 十、本機輕量暫存

完整圖片建議放 IndexedDB；localStorage 只放輕量摘要。

輕量摘要中的圖片欄位用 `__BN_IDB__` 佔位，套用時不可把它當成真正圖片或 null，否則會清掉完整 state 的圖片。

新增的可攜欄位也必須參與「完整 state + 輕量 state」合併：

- `portableVersion`
- `layoutManifest`
- `checkedByFile`
- `logoLayouts`
- `logoLayoutsByFile`
- `products[].layoutsByFile`
- `character.layoutsByFile`
- `character2.layoutsByFile`
- `background.activeFile`
- `background.statesByFile`

若輕量背景 map 意外包含 `src`，也要改成 `__BN_IDB__` 或直接移除，避免 localStorage 超量。

## 十一、舊格式相容

必須保留：

- `version: 1`。
- 原本的數字 ID map。
- 商品單一 `layout` 備援。
- 原本圖片與背景欄位。

建議匯入規則：

- 有檔名 map：檔名 map 優先。
- 有 manifest、沒有檔名 map：用 manifest remap 舊 ID。
- 沒有 manifest：保留舊 ID 直接對應。
- 舊 ID 與目前 ID 不同，且舊檔沒有 manifest／檔名 map：無法回推原版型，只能使用 legacy layout 或預設位置。

不要因為加入 `portableVersion` 就把舊 `version: 1` 檔案判定為錯誤。

## 十二、需要修改的模組責任

| 模組 | 必做事項 |
|---|---|
| 主頁／版型管理 | 維護 `checked`、`checkedByFile`；掃描版型時保留 checked；render 時以檔名狀態為備援 |
| 狀態／暫存模組 | 建立 manifest、雙軌 map、顏色與 icon 文字收集、匯入映射、舊格式相容 |
| 父層素材管理 | 接收商品、人物、SearchICON_LOGO layout update；提供下載前 snapshot Promise |
| iframe runtime | 回傳商品／人物 layout；處理 snapshot request／complete；背景最後防線 |
| SearchICON_LOGO 版型 | 把拖曳／縮放位置 postMessage 給父層；接受父層還原位置 |
| 背景管理／背景圖庫 | SearchICON 三版位禁止背景圖片；state、broadcast、manual/library flow 全部跳過 |
| ZIP／圖片下載 | 在 export lock 前等待 snapshot；ZIP 內附的 JSON 使用同一個 collectState |

## 十三、禁止的實作方式

- 只以 localStorage 數字 ID 當永久版型 key。
- 將 `false` 當成沒有勾選資料。
- 上傳時版型尚未載入就直接丟掉 checked 狀態。
- 下載前先設定 suppress／export lock，再要求 iframe 回傳位置。
- 只讓「下載暫存」同步位置，但 ZIP 內附 JSON 使用另一條未同步流程。
- 把大型背景 data URL 同時複製到 ID map 與檔名 map。
- SearchICON 只靠白色 CSS 遮住背景，卻仍讓 state 保存或父層廣播背景圖片。
- 明確上傳暫存時，仍讓目前頁面的 frozen color 覆蓋暫存顏色。
- 清除使用者暫存時連版型註冊表一起刪除，除非已完整採用檔名式映射且確認所有舊檔相容。

## 十四、驗收測試

### 14.1 跨 ID 還原

模擬：

- 匯出端：HBN 方版 ID = `101`。
- 匯入端：同一檔案 HBN 方版 ID = `9001`。

應確認：

- 商品位置進入 `layouts["9001"]`。
- 人物位置進入 `layouts["9001"]`。
- SearchICON_LOGO 位置進入目前 ID。
- 背景圖片與 x/y/scale 正確。
- active background 指向目前 ID。
- checked true/false 正確。

### 14.2 版位勾選

至少測試：

1. 部分勾選。
2. 全部勾選。
3. 全部反勾選。
4. 上傳時 layout list 為空，稍後才掃描完成。
5. 上傳後觸發 renderChecks 多次，狀態仍不變。
6. LOGO 方橫自動選擇後手動反勾選，下載／上傳仍尊重手動選擇。

### 14.3 兩種下載

至少測試：

1. 拖曳商品後立刻按「下載暫存」。
2. 拖曳人物後立刻按「下載全部」。
3. 調整 SearchICON_LOGO 後立刻下載 ZIP。
4. ZIP 內附 JSON 與單獨下載 JSON 的位置、文字、顏色、勾選一致。

### 14.4 環境切換

用同一份新格式 JSON 測試：

- 另一台電腦。
- 無痕模式。
- 清除網站資料後。
- 不同 domain／port。

### 14.5 SearchICON 背景

上傳單張、橫版、直版背景以及匯入帶背景的舊工單，三個 SearchICON 版位都必須維持白色外底且不顯示背景圖。

### 14.6 舊暫存

測試沒有下列欄位的舊 `version: 1` JSON：

- `portableVersion`
- `layoutManifest`
- `layoutsByFile`
- `checkedByFile`

同 ID 環境仍應正常還原，不得因新欄位缺少而拒絕匯入。

## 十五、目前專案對應檔案

- `jbpbn.html`
  - 版型掃描。
  - checked／checkedByFile。
  - renderChecks／renderPreviews。
  - saveChecked／saveCheckedByFile。
- `js/bn-state-plugin.js`
  - collectState／applyState。
  - manifest 與檔名映射。
  - 單獨下載／上傳暫存。
  - 顏色、ICON 文案、本機輕量暫存。
- `js/bn-editor-plugin.js`
  - iframe snapshot 協調。
  - SearchICON_LOGO 位置回寫。
  - ZIP 下載前同步。
  - 背景狀態與 SearchICON 隔離。
- `js/layout-runtime.js`
  - 商品、人物位置快照。
  - snapshot complete。
  - SearchICON 背景最後防線。
- `html/SearchICON_LOGO.html`
  - LOGO 拖曳／縮放位置同步與還原。
- `js/bn-bg-library-plugin.js`
  - 背景圖庫套用時排除 SearchICON 三版位。

## 十六、交付完成條件

其他編輯器專案完成移植後，必須同時滿足：

- 新下載 JSON 具備 `portableVersion`、`layoutManifest` 與各類檔名 map。
- 單獨下載與 ZIP 內附 JSON 使用同一份最新 state。
- 換 ID 後仍能還原商品、人物、LOGO、背景位置。
- 上傳時版型尚未載入，也不會回到預設全選。
- true／false 勾選全部被明確保存。
- SearchICON 三版位完全不吃背景圖片。
- 舊 `version: 1` 暫存仍可讀取。
