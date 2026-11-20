/* 瀏覽器端函式庫載入器。
   TP 規定函式庫不能複製進包內，一律從 cdnjs 載入：版本寫死，並附 integrity（SRI）與 crossorigin。
   integrity 取自 https://api.cdnjs.com/libraries/<名稱>/<版本>?fields=sri */
(function (root) {
  'use strict';
  if (root.BodaVendor) return;
  var CDNJS = 'https://cdnjs.cloudflare.com/ajax/libs/';
  var pending = Object.create(null), styles = Object.create(null);
  var definitions = {
    sheet: {
      src: CDNJS + 'xlsx/0.18.5/xlsx.full.min.js',
      integrity: 'sha512-r22gChDnGvBylk90+2e/ycr3RVrDi8DIOkIGNhJlKfuyQM4tIRAI062MaV8sfjQKYVGjOBaZBOA87z+IhZE9DA==',
      read: function(){ return root.XLSX && typeof root.XLSX.read === 'function' ? root.XLSX : null; }
    },
    cropper: {
      src: CDNJS + 'cropperjs/1.6.2/cropper.min.js',
      integrity: 'sha512-JyCZjCOZoyeQZSd5+YEAcFgz2fowJ1F1hyJOXgtKu4llIa0KneLcidn5bwfutiehUTiOuK87A986BZJMko0eWQ==',
      css: CDNJS + 'cropperjs/1.6.2/cropper.min.css',
      cssIntegrity: 'sha512-UtLOu9C7NuThQhuXXrGwx9Jb/z9zPQJctuAgNUBK3Z6kkSYT9wJ+2+dh6klS+TDBCV9kNPBbAxbVD+vCcfGPaA==',
      read: function(){ return typeof root.Cropper === 'function' ? root.Cropper : null; }
    },
    jszip: {
      src: CDNJS + 'jszip/3.10.1/jszip.min.js',
      integrity: 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==',
      read: function(){ return typeof root.JSZip === 'function' ? root.JSZip : null; }
    }
  };
  function loadAsset(url, integrity, css, validate) {
    return new Promise(function(resolve, reject) {
      var node = document.createElement(css ? 'link' : 'script'), settled = false;
      var timer = root.setTimeout(function(){ finish(new Error('載入逾時')); }, 15000);
      function finish(error) {
        if (settled) return; settled = true; root.clearTimeout(timer);
        node.onload = node.onerror = null;
        if (error) { node.remove(); reject(error); } else resolve();
      }
      node.integrity = integrity;
      node.crossOrigin = 'anonymous';
      node.referrerPolicy = 'no-referrer';
      if (css) { node.rel = 'stylesheet'; node.href = url; } else { node.async = true; node.src = url; }
      node.onload = function(){ finish(validate && !validate() ? new Error('元件未正確初始化') : null); };
      node.onerror = function(){ finish(new Error('檔案載入失敗')); };
      document.head.appendChild(node);
    });
  }
  function ensure(name) {
    var definition = definitions[name];
    if (!definition) return Promise.reject(new Error('未知的瀏覽器元件：' + name));
    if (pending[name]) return pending[name];
    var tasks = [];
    if (!definition.read()) tasks.push(loadAsset(definition.src, definition.integrity, false, definition.read));
    if (definition.css && !styles[definition.css]) {
      tasks.push(loadAsset(definition.css, definition.cssIntegrity, true).then(function(){ styles[definition.css] = true; }));
    }
    pending[name] = Promise.all(tasks).then(function(){ return definition.read(); }).catch(function(error){
      delete pending[name]; throw new Error('無法載入 ' + name + ' 元件，請確認網路後重試。' + error.message);
    });
    return pending[name];
  }
  root.BodaVendor = { ensure: ensure };
})(window);
