/*
 * 專案指定字體 ShopeeNotoSans(content) 的非同步預載。
 *
 * 規範鐵律：Canvas 渲染文字前必須確保字體 100% 載入成功，嚴禁字體閃爍（FOUT）或預設字體替代。
 * 因此本模組回傳一個 Promise，app.js 會等它 resolve 之後才驅動畫布繪製；
 * 匯出前也會再檢查一次（見 export/exportBatch.js），避免產出用錯字體的圖。
 *
 * 為什麼自己用 FontFace 建構子而不是 CSS @font-face：
 *  1. 用 FontFace 指定乾淨的家族名（ShopeeNotoSansContent），避免依賴每頁的 CSS @font-face 宣告。
 *  2. 可以明確 await 載入結果、明確捕捉失敗，符合「確認字體載入成功」的要求。
 *
 * 載入兩個字重：
 *  - Medium (500)：每顆下方那行說明文字，依規範屬於「主標」。
 *  - Bold (700)：用文字代替 icon 時的檔期數字（9.9 / 10.10），依規範屬於「副標」。
 *
 * 使用與主程式相同的 WOFF2 字體檔；這兩個字重各約 4MB，取代原本約 18MB 的 TTF。
 * 兩個都放進同一個 Promise.all，所以任一個載入失敗都會停在錯誤畫面——這是刻意的，
 * 「字重不對的圖」和「字體錯的圖」一樣是不能交出去的成品。
 */
(function () {
  var FONT_FAMILY = "ShopeeNotoSansContent";
  /* 字體來源依序嘗試：先用 MS repo 自己的 ../fonts/woff2/，失敗才改抓 GitHub Pages 的同一份 WOFF2。
     不下載 18MB 級 TTF，減少弱網路使用者的首次載入量；
     主工具最左側「整包下載」就會拿不到任何吸底圖片。 */
  var BASE_URLS = [
    "../fonts/woff2/",
    "https://jimmywu-commits.github.io/MS/fonts/woff2/",
  ];

  var FACES = [
    { file: "ShopeeNotoSans-500.woff2", weight: "500" },
    { file: "ShopeeNotoSans-700.woff2", weight: "700" },
  ];

  var state = { status: "loading", error: null };
  var listeners = [];

  function setState(next) {
    state = next;
    listeners.slice().forEach(function (fn) {
      fn(state);
    });
  }

  function fontShorthand(weight) {
    return weight + " " + window.LAYOUT.fontSize + "px " + FONT_FAMILY;
  }

  function load() {
    if (typeof window.FontFace === "undefined" || !document.fonts) {
      var msg = "這個瀏覽器不支援 FontFace API，無法保證字體正確，請改用 Chrome / Edge。";
      setState({ status: "failed", error: msg });
      return Promise.reject(new Error(msg));
    }

    setState({ status: "loading", error: null });

    function loadFrom(baseUrl) {
      var loads = FACES.map(function (face) {
        var descriptor = { weight: face.weight };
        var source = 'url("' + baseUrl + face.file + '")';
        return new window.FontFace(FONT_FAMILY, source, descriptor).load();
      });
      return Promise.all(loads).then(function (faces) {
        faces.forEach(function (loaded) { document.fonts.add(loaded); });
        return faces;
      });
    }
    function loadFromAny(index, lastError) {
      if (index >= BASE_URLS.length) return Promise.reject(lastError || new Error("字體載入失敗"));
      return loadFrom(BASE_URLS[index]).catch(function (err) {
        return loadFromAny(index + 1, err);
      });
    }

    return loadFromAny(0, null)
      .then(function () {
        // 再走一次 document.fonts.load，確保該字級/字重真的可用（而不是只有「檔案下載完」）
        return Promise.all(
          FACES.map(function (face) {
            return document.fonts.load(fontShorthand(face.weight));
          })
        );
      })
      .then(function () {
        var allReady = FACES.every(function (face) {
          return document.fonts.check(fontShorthand(face.weight));
        });
        if (!allReady) throw new Error("字體檔已下載，但瀏覽器回報無法使用該字重");
        setState({ status: "ready", error: null });
      })
      .catch(function (err) {
        setState({ status: "failed", error: err.message || String(err) });
        throw err;
      });
  }

  window.FontLoader = {
    FONT_FAMILY: FONT_FAMILY,
    load: load,
    getState: function () { return state; },
    isReady: function () { return state.status === "ready"; },
    subscribe: function (fn) { listeners.push(fn); },
  };
})();
