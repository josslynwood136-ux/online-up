// ============================================================
// push.js - Web Push 订阅 / 发送 / 接收
// 让网页在后台或关闭时，也能把角色消息作为系统通知推到手机
// ============================================================

var pushSupported = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
var _pushPublicKey = null;
var _pushReady = false;

// localStorage 记录用户是否开启推送
function pushEnabled() { try { return localStorage.getItem('pushEnabled') === '1'; } catch (e) { return false; } }
function setPushEnabled(v) { try { localStorage.setItem('pushEnabled', v ? '1' : '0'); } catch (e) {} }

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getVapidPublicKey() {
  if (_pushPublicKey) return _pushPublicKey;
  try {
    var r = await fetch('push/vapid-public-key', { credentials: 'same-origin' });
    var j = await r.json();
    if (j && j.publicKey) { _pushPublicKey = j.publicKey; return _pushPublicKey; }
  } catch (e) {}
  return null;
}

async function getSWReg() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.ready;
}

// 当前是否已有有效订阅
async function getCurrentSub() {
  try {
    var reg = await getSWReg();
    if (!reg || !reg.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch (e) { return null; }
}

// 开启推送：请求权限 → 订阅 → 上报服务器
async function subscribePush() {
  if (!pushSupported) { quickNotice('当前浏览器不支持 Web Push（iOS 需安装到主屏幕且系统 16.4+）'); return false; }
  try {
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') { quickNotice('未授予通知权限，无法开启推送'); setPushEnabled(false); refreshPushUI(); return false; }
    var key = await getVapidPublicKey();
    if (!key) { quickNotice('服务器未返回 VAPID 公钥，推送不可用'); return false; }
    var reg = await getSWReg();
    if (!reg) { quickNotice('Service Worker 未就绪'); return false; }
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
    await fetch('push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ subscription: sub })
    });
    setPushEnabled(true);
    _pushReady = true;
    refreshPushUI();
    quickNotice('已开启推送通知 ✓');
    return true;
  } catch (e) {
    console.error(e);
    quickNotice('订阅失败：' + (e && e.message ? e.message : e));
    setPushEnabled(false);
    refreshPushUI();
    return false;
  }
}

// 关闭推送：取消订阅 → 通知服务器删除
async function unsubscribePush() {
  try {
    var sub = await getCurrentSub();
    if (sub) {
      await fetch('push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: sub })
      });
      await sub.unsubscribe();
    }
  } catch (e) {}
  setPushEnabled(false);
  _pushReady = false;
  refreshPushUI();
  quickNotice('已关闭推送通知');
}

// 切换
async function togglePush() {
  if (pushEnabled()) await unsubscribePush();
  else await subscribePush();
}

// 角色发来消息时调用：后台 / 关闭页面也能收到系统通知
async function notifyCharacterMessage(name, avatar, text, charId) {
  if (!pushEnabled()) return;
  try {
    await fetch('push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        title: name || '美乐地',
        body: (text || '发来一条消息').slice(0, 200),
        avatar: avatar || '',
        charId: charId || '',
        tag: 'msg-' + (charId || 'all'),
        url: '/'
      })
    });
  } catch (e) {}
}

// 手动测试推送（点完可关闭 App，验证关闭后仍收到）
async function testPush() {
  if (!pushEnabled()) { quickNotice('请先开启推送'); return; }
  try {
    var r = await fetch('push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title: '美乐地 · 测试', body: '这是一条推送测试消息 🔔', tag: 'test', url: '/' })
    });
    var j = await r.json();
    quickNotice('已发送：成功 ' + (j.sent || 0) + ' / 失败 ' + (j.failed || 0));
  } catch (e) { quickNotice('发送失败：' + e.message); }
}

// 刷新设置页里的推送开关（全局设置与聊天设置两处都同步）
function refreshPushUI() {
  var on = pushEnabled();
  document.querySelectorAll('.push-switch').forEach(function (sw) {
    sw.classList.toggle('on', on);
    sw.onclick = togglePush;
  });
  document.querySelectorAll('.push-test-btn').forEach(function (b) {
    b.style.display = on ? '' : 'none';
  });
  document.querySelectorAll('.push-hint').forEach(function (hint) {
    if (!pushSupported) hint.textContent = '当前浏览器不支持 Web Push（iOS 需安装到主屏幕且系统 16.4+）';
    else if (on) hint.textContent = '已开启，角色在后台发消息时手机会收到通知';
    else hint.textContent = '开启后，即使网页在后台或关闭，也能收到角色消息通知';
  });
}

// 初始化：监听来自 SW 的点击消息，并恢复已有订阅
async function initPush() {
  if (!pushSupported) { refreshPushUI(); return; }
  // 点击通知后 SW 让页面打开对应聊天
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'push-click') {
        try {
          if (e.data.charId && typeof getCharacter === 'function' && getCharacter(e.data.charId)) {
            openChat(e.data.charId);
          } else if (typeof openApp === 'function') {
            openApp('消息');
          }
        } catch (err) {}
      }
    });
  }
  // 若之前开过，确保订阅仍有效（页面刷新 / 重装后恢复）
  if (pushEnabled()) {
    var sub = await getCurrentSub();
    if (sub) {
      _pushReady = true;
      // 重新上报一次，避免服务端重启后丢失
      fetch('push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subscription: sub })
      }).catch(function () {});
    } else {
      // 订阅丢失（如重装 SW），重新订阅
      await subscribePush();
    }
  }
  refreshPushUI();
}

// 导出
window.subscribePush = subscribePush;
window.unsubscribePush = unsubscribePush;
window.togglePush = togglePush;
window.notifyCharacterMessage = notifyCharacterMessage;
window.testPush = testPush;
window.initPush = initPush;
window.refreshPushUI = refreshPushUI;
window.pushSupported = pushSupported;
