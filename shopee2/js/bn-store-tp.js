/* bn-store-tp.js：TP 版的暫存入口。打包上 TP 時，會用這支取代 js/bn-store.js（同檔名）。
 *
 * TP 不允許程式碰瀏覽器的儲存 API，所以這版全部只放在記憶體：
 * 頁面開著時一切照常（勾選、文字、顏色、圖片都在），重新整理後回到初始狀態。
 * 要留住作品，請用「下載暫存」存成 JSON，下次用「上傳暫存」載回。
 *
 * 介面與 js/bn-store.js 完全相同：
 *   BnStore.local / BnStore.session：get(key) / set(key, value) / remove(key) / keys()
 *   BnStore.big(dbName, storeName)：get(key) / set(key, value) / remove(key)，回傳 Promise
 *
 * 注意：這支檔案（含註解）不能出現瀏覽器儲存 API 的名稱，TP 掃描會擋。
 */
(function (root) {
  'use strict';
  if (root.BnStore) return;

  function area() {
    var data = Object.create(null);
    return {
      available: true,
      get: function (key) { key = String(key); return key in data ? data[key] : null; },
      set: function (key, value) { data[String(key)] = String(value); },
      remove: function (key) { delete data[String(key)]; },
      keys: function () { return Object.keys(data); }
    };
  }

  var bigStores = Object.create(null);
  function big(dbName, storeName) {
    var id = dbName + '\u0000' + storeName;
    if (bigStores[id]) return bigStores[id];
    var data = Object.create(null);
    bigStores[id] = {
      available: true,
      get: function (key) { key = String(key); return Promise.resolve(key in data ? data[key] : null); },
      set: function (key, value) { data[String(key)] = value; return Promise.resolve(); },
      remove: function (key) { delete data[String(key)]; return Promise.resolve(); }
    };
    return bigStores[id];
  }

  root.BnStore = {
    mode: 'memory',
    local: area(),
    session: area(),
    big: big
  };
})(window);
