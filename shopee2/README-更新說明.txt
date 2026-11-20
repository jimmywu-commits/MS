Shopee 下載修正包：恢復原規則版（2026-10-30）

這包取代先前的 shopee-download-fix-20261030.zip。
依你的要求，壓縮規則已回到 10/29 原始碼：包含品質預測、背景／前景壓縮函式、壓縮呼叫方式與分層請求時機。
仍保留背景定位造成下載失敗的修正，以及等待、錯誤還原和重試等處理。

【安裝】
將本 ZIP 的 index.html 與 js 資料夾，覆蓋／合併到原本 Shopee 工具的 index.html 所在資料夾。
必須包含新增的 js/vendor；保留原本其他 JS、html、fonts 與素材。
重新開啟工具，按 Ctrl＋F5。
本包是異動檔，不是完整工具。

5 個程式檔：
index.html
js/bn-editor-plugin.js
js/layout-runtime.js
js/vendor/html2canvas.min.js
js/vendor/jszip.min.js
另附授權與說明文件。

【原規則】
詳見 原下載規則-20261029.txt。
壓縮核心已與 10/29 已交付 ZIP 的 JS 逐字核對相同，不將此次下載失敗修正擴大成畫質策略調整。
