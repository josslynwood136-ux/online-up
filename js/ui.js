// ============================================================
// ui.js - 统一美观弹窗（替换原生 alert / confirm / prompt）
// 暴露: uiToast / uiAlert / uiConfirm / uiPrompt
// ============================================================
(function () {
  var uid = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Toast 轻提示 ----------
  var toastEl = null;
  var toastTimer = null;
  function uiToast(msg) {
    var body = document.body;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ui-toast';
      toastEl.setAttribute('role', 'alert');
      body.appendChild(toastEl);
    }
    toastEl.innerHTML = esc(msg);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  // ---------- 对话框（alert / confirm / prompt） ----------
  function showDialog(opts) {
    var overlay = document.createElement('div');
    overlay.className = 'ui-dialog-overlay';
    overlay.tabIndex = -1;

    var box = document.createElement('div');
    box.className = 'ui-dialog';

    if (opts.title) {
      var hd = document.createElement('div');
      hd.className = 'ui-dialog-title';
      hd.innerHTML = esc(opts.title);
      box.appendChild(hd);
    }

    var content = document.createElement('div');
    content.className = 'ui-dialog-content';
    content.innerHTML = esc(opts.message);
    box.appendChild(content);

    var input = null;
    if (opts.type === 'prompt') {
      input = document.createElement('input');
      input.className = 'ui-dialog-input';
      input.value = opts.defaultValue || '';
      box.appendChild(input);
      setTimeout(function () { input.focus(); }, 30);
    }

    var btns = document.createElement('div');
    btns.className = 'ui-dialog-buttons';
    if (opts.type !== 'alert') {
      var cancel = document.createElement('button');
      cancel.className = 'ui-btn ui-btn-cancel';
      cancel.textContent = opts.cancelText || '取消';
      cancel.onclick = function () { finish(null); };
      btns.appendChild(cancel);
    }
    var ok = document.createElement('button');
    ok.className = 'ui-btn ui-btn-primary' + (opts.type === 'alert' ? ' ui-btn-single' : '');
    ok.textContent = opts.okText || (opts.type === 'alert' ? '知道了' : '确定');
    ok.onclick = function () { finish(input ? input.value : true); };
    btns.appendChild(ok);
    box.appendChild(btns);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('open'); });
    overlay.focus();

    function removeOverlay() {
      if (document.body.contains(overlay)) document.body.removeChild(overlay);
    }
    function finish(value) {
      removeOverlay();
      opts.callback(value);
    }

    overlay.addEventListener('click', function (e) {
      if (e.target !== overlay) return;
      if (opts.type === 'prompt') return;
      finish(null);
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { if (input) input.blur(); ok.click(); }
      else if (e.key === 'Escape') { finish(null); }
    });
  }

  function uiAlert(message, opts) {
    return new Promise(function (resolve) {
      showDialog(Object.assign({ type: 'alert', message: message, callback: resolve }, opts || {}));
    });
  }
  function uiConfirm(message, opts) {
    return new Promise(function (resolve) {
      showDialog(Object.assign({
        type: 'confirm', message: message,
        callback: function (v) { resolve(v === true); }
      }, opts || {}));
    });
  }
  function uiPrompt(message, defaultValue, opts) {
    return new Promise(function (resolve) {
      showDialog(Object.assign({
        type: 'prompt', message: message,
        defaultValue: defaultValue == null ? '' : String(defaultValue),
        callback: resolve
      }, opts || {}));
    });
  }

  // ---------- 暴露全局 ----------
  window.uiToast = uiToast;
  window.uiAlert = uiAlert;
  window.uiConfirm = uiConfirm;
  window.uiPrompt = uiPrompt;

  // ---------- 检查更新 ----------
  window.checkForUpdate = async function () {
    try {
      uiToast('正在检查更新…');
      if (navigator.serviceWorker) {
        try {
          var reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.update) await reg.update();
        } catch (e) {}
      }
      var res = await fetch('index.html?_chk=' + Date.now(), { cache: 'no-store' });
      var txt = await res.text();
      var m = txt.match(/app-build" content="([^"]+)"/);
      var remote = m ? m[1] : '';
      var meta = document.querySelector('meta[name="app-build"]');
      var local = meta ? meta.getAttribute('content') : '';
      if (remote && local && remote !== local) {
        if (window.caches) {
          try {
            var keys = await caches.keys();
            await Promise.all(keys.map(function (k) { return caches.delete(k); }));
          } catch (e) {}
        }
        uiToast('发现新版本 ' + remote + '，正在更新…');
        setTimeout(function () { location.reload(); }, 600);
      } else if (!remote) {
        uiAlert('无法获取版本信息，请稍后再试');
      } else {
        uiToast('已是最新版本 ' + remote);
      }
    } catch (e) {
      uiAlert('检查更新失败：' + ((e && e.message) || e));
    }
  };

  // ---------- 覆盖原生（保持向后兼容） ----------
  window.alert = function (msg) {
    var s = String(msg == null ? '' : msg);
    if (s.length > 80 || s.indexOf('\n') !== -1) { uiAlert(s); return; }
    uiToast(s);
  };
  window.confirm = function (msg) {
    return uiConfirm(String(msg == null ? '' : msg));
  };
  window.prompt = function (msg, def) {
    return uiPrompt(String(msg == null ? '' : msg), def == null ? '' : String(def));
  };
})();
