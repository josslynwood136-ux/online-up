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
    uploadPushConfig();
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
           if (e.data.openApp && typeof openApp === 'function') {
             openApp(e.data.openApp);
           } else if (e.data.charId && typeof getCharacter === 'function' && getCharacter(e.data.charId)) {
             openChat(e.data.charId, 'comic');
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
      // 拉取后台生成的待收消息，补进聊天；并刷新主动推送配置（角色可能变过）
      fetchPendingMessages();
      uploadPushConfig();
    } else {
      // 订阅丢失（如重装 SW），重新订阅
      await subscribePush();
    }
  }
  // 不论是否开启推送，都尝试拉取一次后台生成的待收消息（用 deviceId 暂存，无需订阅）
  fetchPendingMessages();
  refreshPushUI();
}

// 上报主动推送配置：把 AI 凭证 + 角色人设 + 计划发给服务器，由服务器后台生成消息
async function uploadPushConfig() {
  if (!pushEnabled()) return;
  var sub = await getCurrentSub();
  if (!sub) return;
  var s = (typeof state !== 'undefined' && state.settings) || {};
  var api = (typeof state !== 'undefined' && state.api) || {};
  var chars = (state.roles || []).map(function (r) {
    return { id: r.id, name: r.name, persona: r.persona || '', relation: r.relation || '', style: r.style || '', lang: r.lang || '中文', mode: r.mode || 'offline', proactive: !!(r.proactivePush) };
  });
  // 打卡提醒需要上报：只传设了催促时间的项目，含判断"今天是否该打"所需的字段
  var checkins = (state.checkins || []).filter(function (c) { return c.remindTime; }).map(function (c) {
    return { id: c.id, name: c.name, start: c.start, end: c.end, totalDays: c.totalDays, doneDays: c.doneDays, doneDates: c.doneDates || [], remindTime: c.remindTime, status: c.status };
  });
  // 上报用户时区，让服务器按用户本地时间判断"今天/现在"（Render 默认 UTC）
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var anyOn = chars.some(function (c) { return c.proactive; });
  if (!api.url || !api.key || !api.model) {
    // 没填 AI 三件套：仍上报（清掉凭证、禁用），避免服务器用旧 key 继续生成。
    // 仅当有角色开启了后台主动发消息时才提醒填密钥；打卡提醒不需要 AI，静默上报即可。
    if (anyOn && typeof quickNotice === 'function') quickNotice('主动推送需先在「连接」填好 AI 地址/密钥/模型');
    try { await fetch('push/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ subscription: sub, creds: null, chars: chars, plan: { enabled: false }, checkins: checkins, tz: tz }) }); } catch (e) {}
    return;
  }
  var plan = { enabled: anyOn, intervalMin: Number(s.proactiveInterval) || 180, quiet: s.proactiveQuiet || [23, 7] };
  try {
    await fetch('push/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ subscription: sub, creds: { url: api.url, key: api.key, model: api.model }, chars: chars, plan: plan, checkins: checkins, tz: tz })
    });
  } catch (e) {}
}

// 拉取后台生成的待收消息，写入对应角色聊天（服务器生成时已推过通知）
async function fetchPendingMessages() {
  var sub = null;
  if (typeof getCurrentSub === 'function') { try { sub = await getCurrentSub(); } catch (e) {} }
  var endpoint = sub ? sub.endpoint : '';
  var deviceId = (typeof getDeviceId === 'function') ? getDeviceId() : '';
  var q = endpoint ? ('endpoint=' + encodeURIComponent(endpoint)) : ('deviceId=' + encodeURIComponent(deviceId));
  try {
    var r = await fetch('push/pending?' + q, { credentials: 'same-origin' });
    var j = await r.json();
    if (j && j.pending && j.pending.length) {
      if (typeof drainPendingToChat === 'function') drainPendingToChat(j.pending);
      await fetch('push/drain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ endpoint: endpoint || undefined, deviceId: deviceId }) });
    }
  } catch (e) {}
}

// 导出
window.subscribePush = subscribePush;
window.unsubscribePush = unsubscribePush;
window.togglePush = togglePush;
window.notifyCharacterMessage = notifyCharacterMessage;
window.testPush = testPush;
window.initPush = initPush;
window.uploadPushConfig = uploadPushConfig;
window.fetchPendingMessages = fetchPendingMessages;
window.refreshPushUI = refreshPushUI;
window.pushSupported = pushSupported;
