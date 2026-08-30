// ============================================================
// widgets.js - 桌面小组件：天气、倒数日、打卡进度、消息计时
// ============================================================

// ===== 小组件状态 =====
function getWidgetState() {
  if (!state.widgets) state.widgets = {};
  if (!state.widgets.weather) state.widgets.weather = { enabled: true, city: '上海', unit: 'c' };
  if (!state.widgets.countdown) state.widgets.countdown = { enabled: true, events: [] };
  if (!state.widgets.checkin) state.widgets.checkin = { enabled: true };
  if (!state.widgets.timer) state.widgets.timer = { enabled: true };
  if (!state.widgets.nextMsg) state.widgets.nextMsg = { enabled: true };
  return state.widgets;
}

function saveWidgetState() {
  saveState();
}

// ===== 天气小组件 =====
async function fetchWeather(city) {
  city = city || '上海';
  try {
    const res = await fetch('https://restapi.amap.com/v3/weather/weatherInfo?key=4a9b5e0f1c7d8a6b2f3e4d5c6b7a8f9e&city=' + encodeURIComponent(city));
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lives || !data.lives.length) return null;
    return data.lives[0];
  } catch(e) { return null; }
}

async function renderWeatherWidget() {
  const ws = getWidgetState();
  const w = ws.weather;
  if (!w.enabled) return;
  const weather = await fetchWeather(w.city);
  const container = $('widgetWeather');
  if (!container) return;
  if (!weather) {
    container.innerHTML = '<div class="widget-card"><div class="widget-icon">🌤️</div><div class="widget-text">天气加载失败</div></div>';
    return;
  }
  const temp = weather.temperature + (w.unit === 'c' ? '°C' : '°F');
  const f = weather.weather;
  container.innerHTML = `<div class="widget-card widget-weather">
    <div class="widget-icon">${weather.icon}</div>
    <div class="widget-main"><div class="widget-temp">${temp}</div><div class="widget-desc">${f}</div></div>
    <div class="widget-detail"><div>💧 ${weather.humidity}%</div><div>💨 ${weather.wind}</div></div>
    <div class="widget-city">${escapeHTML(w.city)}</div>
  </div>`;
}

function setWeatherCity(city) {
  getWidgetState().weather.city = city;
  saveWidgetState();
  renderWeatherWidget();
}

// ===== 倒数日小组件 =====
function renderCountdownWidget() {
  const ws = getWidgetState();
  const cd = ws.countdown;
  if (!cd.enabled) return;
  const container = $('widgetCountdown');
  if (!container) return;
  const events = cd.events || [];
  if (!events.length) {
    container.innerHTML = '<div class="widget-card"><div class="widget-icon">📅</div><div class="widget-text">暂无倒数日<br><button class="widget-add-btn" onclick="addCountdownEvent()">＋ 添加</button></div></div>';
    return;
  }
  let html = '';
  events.forEach(function(ev, i) {
    const target = new Date(ev.date);
    const diff = Math.max(0, Math.ceil((target - new Date()) / 86400000));
    html += `<div class="widget-card widget-countdown">
      <div class="widget-icon">🎯</div>
      <div class="widget-main">
        <div class="widget-countdown-name">${escapeHTML(ev.name)}</div>
        <div class="widget-countdown-days">${diff} 天</div>
      </div>
      <button class="widget-del-btn" onclick="removeCountdownEvent(${i})">✕</button>
    </div>`;
  });
  html += '<div class="widget-card widget-add-card"><button class="widget-add-btn" onclick="addCountdownEvent()">＋ 添加</button></div>';
  container.innerHTML = html;
}

function addCountdownEvent() {
  const name = prompt('事件名称：');
  if (!name) return;
  const date = prompt('日期（YYYY-MM-DD）：');
  if (!date) return;
  const ws = getWidgetState();
  ws.countdown.events = ws.countdown.events || [];
  ws.countdown.events.push({ name: name, date: date });
  saveWidgetState();
  renderCountdownWidget();
}

function removeCountdownEvent(i) {
  const ws = getWidgetState();
  ws.countdown.events.splice(i, 1);
  saveWidgetState();
  renderCountdownWidget();
}

// ===== 打卡进度小组件 =====
function renderCheckinWidget() {
  const ws = getWidgetState();
  if (!ws.checkin.enabled) return;
  const container = $('widgetCheckin');
  if (!container) return;
  const checkins = state.checkins || [];
  const today = todayStr();
  const done = checkins.filter(function(c) { return c.status === 'done' && c.lastDoneDate === today; }).length;
  const total = checkins.length || 1;
  const pct = Math.round((done / total) * 100);
  container.innerHTML = `<div class="widget-card widget-checkin">
    <div class="widget-icon">✅</div>
    <div class="widget-main">
      <div class="widget-checkin-title">今日打卡</div>
      <div class="widget-checkin-bar"><div class="widget-checkin-fill" style="width:${pct}%"></div></div>
      <div class="widget-checkin-text">${done}/${total} · ${pct}%</div>
    </div>
    <button class="ghost-btn widget-btn" onclick="switchTab('msg', document.querySelectorAll('.tab-item')[0])">查看全部</button>
  </div>`;
}

// ===== 下一条消息计时器 =====
function renderNextMsgWidget() {
  const ws = getWidgetState();
  if (!ws.nextMsg.enabled) return;
  const container = $('widgetNextMsg');
  if (!container) return;
  const chars = state.roles || [];
  const enabledChars = chars.filter(function(c) { return c.proactivePush; });
  if (!enabledChars.length) {
    container.innerHTML = '<div class="widget-card"><div class="widget-icon">⏰</div><div class="widget-text">无主动消息角色</div></div>';
    return;
  }
  const interval = (state.settings && state.settings.proactiveInterval) || 180;
  const nextIn = Math.max(0, interval * 60 - Math.floor((Date.now() - (state.lastActiveTime || Date.now())) / 1000));
  const min = Math.floor(nextIn / 60);
  const sec = nextIn % 60;
  container.innerHTML = `<div class="widget-card widget-timer">
    <div class="widget-icon">💬</div>
    <div class="widget-main">
      <div class="widget-timer-title">下一条消息</div>
      <div class="widget-timer-time">${min}:${String(sec).padStart(2, '0')}</div>
      <div class="widget-timer-sub">${enabledChars.length} 个角色待主动</div>
    </div>
  </div>`;
}

// ===== 小组件总渲染 =====
function renderWidgets() {
  renderWeatherWidget();
  renderCountdownWidget();
  renderCheckinWidget();
  renderNextMsgWidget();
}

// ===== 小组件面板 =====
function renderWidgetsPanel() {
  const panel = $('widgetsPanel');
  if (!panel) {
    const el = document.createElement('div');
    el.id = 'widgetsPanel';
    el.className = 'widgets-panel';
    el.style.cssText = 'display:none';
    document.body.appendChild(el);
  }
  const ws = getWidgetState();
  $('widgetsPanel').innerHTML = `
    <div class="widgets-panel-sheet">
      <div class="widgets-header">
        <h3>📱 桌面小组件</h3>
        <button class="group-close-btn" onclick="$('widgetsPanel').style.display='none'">✕</button>
      </div>
      <div class="widgets-grid">
        <div class="widget-toggle-card">
          <span>🌤️ 天气</span>
          <label class="switch${ws.weather.enabled ? ' on' : ''}" onclick="toggleWidget('weather')"></label>
        </div>
        <div class="widget-toggle-card">
          <span>📅 倒数日</span>
          <label class="switch${ws.countdown.enabled ? ' on' : ''}" onclick="toggleWidget('countdown')"></label>
        </div>
        <div class="widget-toggle-card">
          <span>✅ 打卡</span>
          <label class="switch${ws.checkin.enabled ? ' on' : ''}" onclick="toggleWidget('checkin')"></label>
        </div>
        <div class="widget-toggle-card">
          <span>💬 消息计时</span>
          <label class="switch${ws.nextMsg.enabled ? ' on' : ''}" onclick="toggleWidget('nextMsg')"></label>
        </div>
      </div>
      <div class="widgets-display">
        <div id="widgetWeather"></div>
        <div id="widgetCountdown"></div>
        <div id="widgetCheckin"></div>
        <div id="widgetNextMsg"></div>
      </div>
    </div>
  `;
  $('widgetsPanel').style.display = 'flex';
  renderWidgets();
}

function toggleWidget(name) {
  const ws = getWidgetState();
  if (ws[name]) ws[name].enabled = !ws[name].enabled;
  saveWidgetState();
  renderWidgetsPanel();
  renderWidgets();
}

// ===== 定时刷新 =====
setInterval(function() {
  if ($('widgetWeather')) renderWeatherWidget();
  if ($('widgetCountdown')) renderCountdownWidget();
  if ($('widgetNextMsg')) renderNextMsgWidget();
}, 60000);

window.renderWidgetsPanel = renderWidgetsPanel;
window.toggleWidget = toggleWidget;
window.setWeatherCity = setWeatherCity;
window.addCountdownEvent = addCountdownEvent;
window.removeCountdownEvent = removeCountdownEvent;