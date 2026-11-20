# bned 上 TP 修改說明（SBA 版）

給 AI 照著改 bned（GitLab `tw/mkt/gd/bned` main `1db4035`），讓編輯器能發佈到 TP。這次只做 SBA 三個版位，SBA_APP方LOGO、SBA_APP橫LOGO、SBA_PC，其他版位與 BODA 不動。暫存的做法還在跟 TP 討論，這次先不處理。

## TP 發佈規則

TP 發佈前會自動掃程式，碰到下面這些寫法就不讓上架。


2. 不能用 window.open，外部連結要用 `<a target="_blank" rel="noopener">`，而且只有最上層頁面的連結點得開
3. fetch 的網址要是寫死的字串，不能用變數、組字串或加 `?t=時間`
4. 函式庫不能複製進包內，要從 cdnjs 載入，版本寫死，附 integrity 和 crossorigin
5. html2canvas 在 TP 不能用，會報 `Blocked a frame with origin "null"`，TP 實測 html-to-image 1.11.11（cdnjs）可以截圖、JSZip 打包、下載
6. 不能用 eval、new Function、Web Worker、type=module
7. 子 iframe 跟父頁互相讀不到，只能用 postMessage
8. 圖片畫進 canvas 前要先設 `crossOrigin = 'anonymous'` 再設 src，不然 canvas 會被鎖住
9. 平台不收 xlsx 檔

## 要改的地方

2. **事件屬性 18 處**　index.html 寫死的 15 處（714 到 917 行），加上用字串組的 3 處（1151、1307、1598 行），全部改成 addEventListener 綁定
3. **window.open 2 處**　index.html 4151 行的填寫回饋、js/editor-plugin.js 618 行的 photoroom 去背，改成連結
4. **fetch 5 處**
   - index.html 1085 讀版位 CSS 拿畫布尺寸，SBA 尺寸固定，直接寫死 1200×400、1200×400、992×165
   - js/bn-bg-library-plugin.js 586、587 讀底圖清單，改成寫死 `bgimg/index.json`、`bgimg/brand.json`
   - js/bn-bg-library-plugin.js 920 選底圖轉 dataURL，改成 Image 畫進 canvas 再取 dataURL（記得規則 8）
   - js/bn-whatsnew-plugin.js 114 改成寫死 `js/changelog.json`
   - js/shopee-tour.js 183 新手導覽，這次不放，index.html 拿掉載入它的 script
5. **禁用詞改讀 json**　js/bn-state-plugin.js 579 的 loadBanwordsExcel 會讀根目錄 banwords.xlsx，這是自動改字的來源，漏了文案規則會整個失效而且不會報錯。把 xlsx「禁用語」分頁轉成 banwords.json（第一列當欄名，每列一個物件），程式改讀 json 再交給引擎的 convertExcelRowsToRules
6. **函式庫改 cdnjs**　js/vendor/browser-loader.js（xlsx、cropper）、js/bn-editor-plugin.js 4287（JSZip）改從 cdnjs 載入，版本照現在包內用的
7. **截圖換 html-to-image**　js/layout-runtime.js 5371 到 5380 載入、5485 呼叫的 html2canvas 換成 html-to-image。原本 onclone（5456 行起）做的事要改用 html-to-image 的 style 與 filter 參數，藏掉縮放點、旋轉把手、提醒框、背景遮罩

## 改完要注意

- **下載圖跟預覽要比對**。程式裡有很多為 html2canvas 寫的補償，像文字點陣化、漸層點陣化、object-fit 手算、LOGO 陰影補畫，換引擎後可能讓位置偏掉，三個版位各下載一張跟預覽疊起來看
- 字型嵌進圖裡可能讓截圖變慢，碰到 15 秒逾時
- 下載後的 KB 上限壓縮要確認還在上限內
- 主頁直接讀 iframe 的地方（index.html 3206 起、bn-editor-plugin 2219、2426、2632、4033）都有 try 和備案，本機測不出來，上 TP 後要切一次掛標顏色和背景色
- bn-state-plugin 1473 的 confirm 在 TP 會直接回 false

## 驗收

1. 開 index.html#sba 只出現 SBA 三個版位，尺寸正確
2. 改文字三個預覽同步
3. 主標輸入「購物金」，離開欄位自動變「優惠券」
4. 上傳商品圖、LOGO、選底圖都正常
5. 下載圖片尺寸正確，跟預覽一致
6. 填寫回饋、photoroom 點得開
7. Console 沒有紅字
8. 程式裡搜不到 onclick 這類屬性、window.open、html2canvas、組字串的 fetch
