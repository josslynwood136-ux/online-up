// 最小 Service Worker：仅用于让 Chrome 把站点当成可安装 PWA（从而按 manifest 全屏启动）
// 同源静态资源走缓存；跨域（Supabase / 字体 / 翻译等）一律放行到网络，不做缓存，避免弄坏动态功能。
const CACHE = 'aiphone-shell-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL);
  }).catch(function () {}));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return; // POST/PUT（如 Supabase 写入）直接走网络
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域资源不拦截，直接网络

  if (req.mode === 'navigate') {
    // 页面导航：网络优先，断网时回退缓存的 index.html
    e.respondWith(fetch(req).catch(function () { return caches.match('index.html'); }));
    return;
  }

  // 同源资源：网络优先，断网时回退缓存（保证部署后立刻生效，离线也能开）
  e.respondWith(fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();           // 必须先 clone 再返回，否则会和原响应抢 body 导致缓存失败
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req);
  }));
});

// ===== Web Push：后台 / 关闭页面时也能收到系统通知 =====
self.addEventListener('push', function (e) {
  var data = { title: '美乐地', body: '你有一条新消息', url: '/', tag: 'msg' };
  try { if (e.data) data = Object.assign(data, e.data.json()); } catch (err) {}
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      // 如果页面正打开且可见，就不弹系统通知（应用内已有提示），避免重复
      for (var i = 0; i < list.length; i++) {
        if (list[i].visibilityState === 'visible' || list[i].focused) return;
      }
      var options = {
        body: data.body,
        tag: data.tag,
        renotify: false,
        data: { url: data.url, charId: data.charId },
        requireInteraction: false
      };
      if (data.avatar) options.icon = data.avatar;
      return self.registration.showNotification(data.title, options);
    })
  );
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var target = (e.notification && e.notification.data && e.notification.data.url) || '/';
  var charId = (e.notification && e.notification.data && e.notification.data.charId) || '';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // 已打开的窗口：聚焦并跳转
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if ('focus' in c) {
          c.postMessage({ type: 'push-click', url: target, charId: charId });
          return c.focus();
        }
      }
      // 没打开就新开
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
