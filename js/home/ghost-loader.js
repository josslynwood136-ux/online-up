/* ============================================================
 * js/home/ghost-loader.js — Ghost 模型加载进度条
 * ============================================================ */
(function (global) {
  'use strict';

  var overlay = null;
  var progressBar = null;
  var progressText = null;
  var statusText = null;

  function ensureOverlay() {
    if (overlay) return overlay;

    // 创建遮罩层
    overlay = document.createElement('div');
    overlay.id = 'ghostLoaderOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;opacity:0;transition:opacity .3s;pointer-events:none;';

    // 标题
    var title = document.createElement('div');
    title.textContent = '正在加载 Ghost 模型';
    title.style.cssText = 'color:#fff;font-size:18px;font-weight:700;';
    overlay.appendChild(title);

    // 进度条容器
    var barContainer = document.createElement('div');
    barContainer.style.cssText = 'width:280px;height:8px;background:rgba(255,255,255,.2);border-radius:4px;overflow:hidden;';

    // 进度条
    progressBar = document.createElement('div');
    progressBar.style.cssText = 'width:0%;height:100%;background:linear-gradient(90deg,#b8a99a,#d4c5b5);border-radius:4px;transition:width .2s;';
    barContainer.appendChild(progressBar);
    overlay.appendChild(barContainer);

    // 进度文字
    progressText = document.createElement('div');
    progressText.textContent = '0%';
    progressText.style.cssText = 'color:#fff;font-size:14px;font-weight:600;';
    overlay.appendChild(progressText);

    // 状态文字
    statusText = document.createElement('div');
    statusText.textContent = '准备中...';
    statusText.style.cssText = 'color:rgba(255,255,255,.6);font-size:12px;';
    overlay.appendChild(statusText);

    document.body.appendChild(overlay);
    return overlay;
  }

  function show() {
    var ov = ensureOverlay();
    ov.style.opacity = '1';
    ov.style.pointerEvents = 'auto';
  }

  function hide() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  }

  function update(percent, status) {
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = Math.round(percent) + '%';
    if (status && statusText) statusText.textContent = status;
  }

  function setProgress(loaded, total) {
    if (!total) return;
    var percent = Math.min(100, (loaded / total) * 100);
    var mb = (loaded / 1024 / 1024).toFixed(1);
    var totalMb = (total / 1024 / 1024).toFixed(1);
    update(percent, mb + ' MB / ' + totalMb + ' MB');
  }

  // 拦截 GLTFLoader 的加载进度
  function hookLoader() {
    if (!global.GLTFLoader) return;

    var OriginalLoader = global.GLTFLoader;
    global.GLTFLoader = function () {
      var loader = new OriginalLoader();
      var originalLoad = loader.load.bind(loader);

      loader.load = function (url, onLoad, onProgress, onError) {
        show();
        update(0, '开始下载...');

        return originalLoad(url, function (gltf) {
          hide();
          if (onLoad) onLoad(gltf);
        }, function (event) {
          if (event.total > 0) {
            setProgress(event.loaded, event.total);
          } else {
            var mb = (event.loaded / 1024 / 1024).toFixed(1);
            update(0, '已下载 ' + mb + ' MB');
          }
          if (onProgress) onProgress(event);
        }, onError);
      };

      return loader;
    };
  }

  // 页面加载完成后自动 hook
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookLoader);
  } else {
    hookLoader();
  }

  // 暴露全局方法
  global.GhostLoader = {
    show: show,
    hide: hide,
    update: update,
    setProgress: setProgress
  };
})(typeof window !== 'undefined' ? window : this);
