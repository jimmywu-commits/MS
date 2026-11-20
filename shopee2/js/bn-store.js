/* bn-store.js：曝光資源編輯器所有本機暫存的唯一入口（GitLab／MS 版）。
 *
 * 其他程式一律透過 window.BnStore 讀寫，不直接碰瀏覽器的儲存 API。
 * 原因：TP 發佈前會掃程式，只要出現 localStorage、sessionStorage、indexedDB
 * 這些字（連註解、只讀取都算）就不讓上架。所以上 TP 時，打包腳本會把
 * js/bn-store-tp.js 換成這支檔案（同檔名），其他程式完全不用改。
 *
 *   BnStore.local    同 localStorage：get(key) / set(key, value) / remove(key) / keys()
 *   BnStore.session  同 sessionStorage，方法同上
 *   BnStore.big(dbName, storeName)
 *                    存大型資料（圖片 dataURL），回傳 Promise：get(key) / set(key, value) / remove(key)
 *                    這版用 IndexedDB，資料庫名稱與舊版相同，舊暫存可直接讀到。
 *
 * set() 在無法寫入（容量滿、瀏覽器停用暫存）時會丟出錯誤，跟原本 setItem 一樣，
 * 呼叫端原有的 try/catch 照常運作。
 */
(function (root) {
  'use strict';
  if (root.BnStore) return;

  function pick(name) {
    try { return root[name] || null; } catch (_) { return null; }
  }

  function area(storage) {
    return {
      available: !!storage,
      get: function (key) {
        if (!storage) return null;
        try { return storage.getItem(key); } catch (_) { return null; }
      },
      set: function (key, value) {
        if (!storage) throw new Error('本機暫存無法使用');
        storage.setItem(key, String(value));
      },
      remove: function (key) {
        if (!storage) return;
        try { storage.removeItem(key); } catch (_) {}
      },
      keys: function () {
        if (!storage) return [];
        try { return Object.keys(storage); } catch (_) { return []; }
      }
    };
  }

  var bigStores = Object.create(null);
  function big(dbName, storeName) {
    var id = dbName + '\u0000' + storeName;
    if (bigStores[id]) return bigStores[id];
    var factory = pick('indexedDB');

    function open() {
      return new Promise(function (resolve, reject) {
        if (!factory) { reject(new Error('IndexedDB not supported')); return; }
        var req = factory.open(dbName, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error || new Error('IndexedDB open failed')); };
      });
    }
    function write(fn, label) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(storeName, 'readwrite');
          fn(tx.objectStore(storeName));
          tx.oncomplete = function () { db.close(); resolve(); };
          tx.onerror = function () { var err = tx.error; try { db.close(); } catch (_) {} reject(err || new Error('IndexedDB ' + label + ' failed')); };
        });
      });
    }

    bigStores[id] = {
      available: !!factory,
      get: function (key) {
        return open().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(storeName, 'readonly');
            var req = tx.objectStore(storeName).get(key);
            req.onsuccess = function () { resolve(req.result === undefined ? null : req.result); };
            req.onerror = function () { reject(req.error || new Error('IndexedDB read failed')); };
            tx.oncomplete = function () { try { db.close(); } catch (_) {} };
          });
        });
      },
      set: function (key, value) {
        return write(function (store) { store.put(value, key); }, 'write');
      },
      remove: function (key) {
        return write(function (store) { store.delete(key); }, 'delete');
      }
    };
    return bigStores[id];
  }

  root.BnStore = {
    mode: 'browser',
    local: area(pick('localStorage')),
    session: area(pick('sessionStorage')),
    big: big
  };
})(window);
