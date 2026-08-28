// ============================================================
// push.js - 后台消息通知（不依赖 Web Push / FCM）
// 网页开着 / 放后台时，定时拉取服务器生成的角色消息，并用系统通知弹出。
// 国内安卓（无 Google 推送）也能用；代价是 App 必须保持打开（后台）。
// ============================================================

var pushSupported = ('Notification' in window);
var _pollTimer = null;
var _lastPollPending = '';   // 去重：记录上次已处理的待收内容指纹，避免后台标签页被节流后重复弹

function pushEnabled() { try { return localStorage.getItem('pushEnabled') === '1'; } catch (e) { return false; } }
function setPushEnabled(v) { try { localStorage.setItem('pushEnabled', v ? '1' : '0'); } catch (e) {} }

// 显示一条系统通知（页面级 Notification，不依赖 Web Push）
function showNotification(title, body, charId) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var n = new Notification(title || '美乐地', { body: (body || '').slice(0, 200) });
    n.onclick = function () {
      try { window.focus(); if (charId && typeof openChat === 'function') openChat(charId, 'comic'); } catch (e) {}
    };
  } catch (e) {}
}

// 后台轮询：app 在后台活着时，定时拉取服务器生成的待收消息
async function pollPendingOnce() {
  var deviceId = (typeof getDeviceId === 'function') ? getDeviceId() : '';
  if (!deviceId) return;
  try {
    var r = await fetch('push/pending?deviceId=' + encodeURIComponent(deviceId), { credentials: 'same-origin' });
    var j = await r.json();
    if (j && j.pending && j.pending.length) {
      var fp = JSON.stringify(j.pending.map(function (p) { return (p.charId || '') + ':' + (p.text || '').slice(0, 40) + ':' + (p.ts || 0); }));
      if (fp !== _lastPollPending) {
        _lastPollPending = fp;
        var hidden = (typeof document !== 'undefined' && document.visibilityState === 'hidden');
        if (hidden) {
          // 页面在后台隐藏时，直接弹系统通知
          j.pending.forEach(function (p) { showNotification(p.charName || '美乐地', p.text, p.charId); });
        }
        if (typeof drainPendingToChat === 'function') drainPendingToChat(j.pending);
        await fetch('push/drain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ deviceId: deviceId }) });
      }
    } else {
      _lastPollPending = '';
    }
  } catch (e) {}
}
function startPushPolling() {
  if (_pollTimer) return;
  _pollTimer = setInterval(pollPendingOnce, 45000);
  setTimeout(pollPendingOnce, 4000);
}
function stopPushPolling() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

// 切换开关：开启 = 后台消息模式（轮询 + 通知）；关闭 = 停止
async function togglePush() {
  if (pushEnabled()) {
    setPushEnabled(false);
    stopPushPolling();
    refreshPushUI();
    return;
  }
  var perm = null;
  try { perm = await Notification.requestPermission(); } catch (e) {}
  if (perm && perm !== 'granted') { quickNotice('未授予通知权限，无法弹通知'); return; }
  setPushEnabled(true);
  refreshPushUI();
  uploadPushConfig();
  startPushPolling();
}

// 聊天中角色发来消息（页面在后台时）直接弹通知
function notifyCharacterMessage(name, avatar, text, charId) {
  if (!pushEnabled()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'hidden') return;
  showNotification(name, text, charId);
}

// 测试通知：直接弹一条，验证权限与后台通知能力
function testPush() {
  if (!pushEnabled()) { quickNotice('请先开启后台消息'); return; }
  showNotification('美乐地 · 测试', '这是一条测试通知 🔔');
  quickNotice('已发送测试通知（若没看到，请检查系统通知权限）');
}

// 刷新设置页开关 / 提示
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
    if (!pushSupported) hint.textContent = '当前浏览器不支持系统通知';
    else if (on) hint.textContent = '已开启：网页在后台时，角色消息会以系统通知弹出';
    else hint.textContent = '开启后，网页在后台也能收到角色消息通知';
  });
}

// 初始化
async function initPush() {
  if (!pushSupported) { refreshPushUI(); return; }
  if (pushEnabled()) {
    uploadPushConfig();
    startPushPolling();
  }
  fetchPendingMessages();
  refreshPushUI();
}

// 上报配置：把 AI 凭证 + 角色人设 + 计划发给服务器，用于后台生成消息
async function uploadPushConfig() {
  if (!pushEnabled()) return;
  var deviceId = (typeof getDeviceId === 'function') ? getDeviceId() : '';
  if (!deviceId) return;
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
    // 没填 AI 三件套：仍上报（清掉凭证、禁用），避免服务器用旧 key 继续生成
    if (anyOn && typeof quickNotice === 'function') quickNotice('后台主动消息需先在「连接」填好 AI 地址/密钥/模型');
    try { await fetch('push/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ deviceId: deviceId, creds: null, chars: chars, plan: { enabled: false }, checkins: checkins, tz: tz }) }); } catch (e) {}
    return;
  }
  var plan = { enabled: anyOn, intervalMin: Number(s.proactiveInterval) || 180, quiet: s.proactiveQuiet || [23, 7] };
  try {
    await fetch('push/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ deviceId: deviceId, creds: { url: api.url, key: api.key, model: api.model }, chars: chars, plan: plan, checkins: checkins, tz: tz })
    });
  } catch (e) {}
}

// 拉取后台生成的待收消息，写入对应角色聊天（app 打开时调用）
async function fetchPendingMessages() {
  var deviceId = (typeof getDeviceId === 'function') ? getDeviceId() : '';
  if (!deviceId) return;
  try {
    var r = await fetch('push/pending?deviceId=' + encodeURIComponent(deviceId), { credentials: 'same-origin' });
    var j = await r.json();
    if (j && j.pending && j.pending.length) {
      if (typeof drainPendingToChat === 'function') drainPendingToChat(j.pending);
      await fetch('push/drain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ deviceId: deviceId }) });
    }
  } catch (e) {}
}

// 导出
window.togglePush = togglePush;
window.notifyCharacterMessage = notifyCharacterMessage;
window.testPush = testPush;
window.initPush = initPush;
window.uploadPushConfig = uploadPushConfig;
window.fetchPendingMessages = fetchPendingMessages;
window.refreshPushUI = refreshPushUI;
window.pushSupported = pushSupported;
