// ============================================================
// sync.js - 云同步（双后端可切换：GitHub Gist / Supabase）
// ============================================================
// GitHub Gist：免费、单用户、数据存在你自己 GitHub 账号下的私有 Gist（方案 A）
// Supabase：多用户、邮箱密码登录、数据存在开发者 Supabase 项目（按账号隔离）
// 在「设置 → 云同步」面板顶部可切换后端，选哪个就用哪个。

// ===== 后端选择 =====
const CLOUD_BACKEND_KEY = 'aiPhoneSync.backend';
let CLOUD_BACKEND = (function () { try { return localStorage.getItem(CLOUD_BACKEND_KEY) || 'github'; } catch (e) { return 'github'; } })();
function setCloudBackend(b) {
  try { localStorage.setItem(CLOUD_BACKEND_KEY, b); } catch (e) {}
  CLOUD_BACKEND = b;
  if (typeof renderApiSettings === 'function') renderApiSettings();
}

// 同步模式：true = 本地保存即自动推云端；false = 仅手动点「上传」
const AUTO_SYNC = true;

// ---- Supabase 配置（填你自己的）----
const SUPABASE_URL = 'https://hgjhfbwqefcvtgwkwhgy.supabase.co';        // 你的项目网址
const SUPABASE_ANON_KEY = 'sb_publishable_El4xmqAfRH7p4HB_4kcPlg_kQVeLN5n';   // 你的 anon public key
const SB_TABLE = 'user_data';

// ---- GitHub Gist 配置 ----
const GH_FILE = 'aiphone-state.json';
const GH_API = 'https://api.github.com';
const GH_TOKEN_KEY = 'aiPhoneSync.ghToken';
const GH_GIST_KEY = 'aiPhoneSync.gistId';

// ===== 状态 =====
let _sb = null, _sbUser = null, _sbPulled = false;
let _ghToken = '', _ghUser = '';
let _localTs = 0, _pushTimer = null, _sbDisableReason = '';

// ===== 通用工具 =====
function readLocalTs() { try { return parseInt(localStorage.getItem('aiPhoneSync.localTs') || '0', 10) || 0; } catch (e) { return 0; } }
function writeLocalTs(t) { try { localStorage.setItem('aiPhoneSync.localTs', String(t)); } catch (e) {} }

function cloudToast(msg, ok) {
  try { if (typeof showIGToast === 'function') { showIGToast(msg); return; } } catch (e) {}
  try { if (typeof quickNotice === 'function') { quickNotice(msg); return; } } catch (e) {}
  console.log('[云同步] ' + msg);
}

function sbSetStatus(msg, ok) {
  var el = document.getElementById('sbStatus');
  if (!el) return;
  el.style.color = ok ? '#27ae60' : '#c0392b';
  el.textContent = msg;
}

var _defaultSizeCache = 0;
function defaultStateSize() {
  if (!_defaultSizeCache) {
    try { _defaultSizeCache = JSON.stringify(cloneDefaultState()).length; } catch (e) { return 0; }
  }
  return _defaultSizeCache;
}
function isStateTrivial() {
  var cur = 0;
  try { cur = JSON.stringify(state).length; } catch (e) {}
  return defaultStateSize() > 0 && cur <= defaultStateSize() + 200;
}

// 原地应用云端数据：重新从 localStorage 读入 state 并刷新界面，免去整页重载
function applyCloudStateInPlace() {
  try { state = loadState(); } catch (e) {
    setTimeout(function () { window.location.reload(); }, 300);
    return;
  }
  try {
    if (typeof renderChat === 'function') renderChat();
    if (typeof renderEmojiPanel === 'function') renderEmojiPanel();
    if (typeof renderApiSettings === 'function') renderApiSettings();
  } catch (e) {
    setTimeout(function () { window.location.reload(); }, 300);
  }
}

// 给云端请求加超时：国内直连海外服务器经常很慢，超时就明确报错而不是一直转圈
function withTimeout(promise, ms, label) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () {
      reject(new Error((label || '云端请求') + '超时（' + Math.round(ms / 1000) + 's），可能是网络不通或被墙'));
    }, ms);
    promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
  });
}

function cloudOnSave() {
  if (AUTO_SYNC) {
    if (!cloudLogged()) return;
    _localTs = Date.now();
    writeLocalTs(_localTs);
    schedulePush();
  }
  // 仅手动模式：本地保存不再自动推云端，需用户主动点「上传」
}

function schedulePush() {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushCloud, 1500);
}

// ============================================================
// Supabase 适配器
// ============================================================
function _sbReadyConfig() {
  if (!SUPABASE_URL || !/^https:\/\//.test(String(SUPABASE_URL))) return 'js/sync.js 里的 SUPABASE_URL 没填对（应以 https:// 开头，且不是占位符）';
  if (!SUPABASE_ANON_KEY || String(SUPABASE_ANON_KEY).indexOf('YOUR-') >= 0) return 'js/sync.js 里的 SUPABASE_ANON_KEY 还是占位符，没填你的 anon public key';
  return '';
}
function initSbSupabase() {
  if (_sb) return true;
  var reason = _sbReadyConfig();
  if (reason) { _sbDisableReason = reason; return false; }
  if (!window.supabase) return false;
  try {
    _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    _sb.auth.onAuthStateChange(function (_event, session) {
      _sbUser = session ? session.user : null;
      _sbPulled = true;
      if (AUTO_SYNC && _sbUser) setTimeout(pullCloud, 0);
    });
    _sbDisableReason = '';
    return true;
  } catch (e) {
    _sbDisableReason = '初始化出错：' + (e && e.message || e);
    return false;
  }
}
// 等 CDN 库加载（含备用 CDN），最多等 6 秒
(function waitSbSupabase() {
  if (initSbSupabase()) return;
  var tries = window.__sbWaitTries = (window.__sbWaitTries || 0) + 1;
  if (tries <= 12) { setTimeout(waitSbSupabase, 500); return; }
  if (!_sbDisableReason) {
    if (!window.supabase) _sbDisableReason = 'Supabase 库没加载成功（CDN 被墙或未联网）。请刷新重试，或在 index.html 里换备用 CDN。';
    else _sbDisableReason = '初始化失败，请打开浏览器控制台看报错。';
  }
})();

async function sbAuthImpl() {
  var email = document.getElementById('sbEmail');
  var pass = document.getElementById('sbPass');
  if (!email || !pass) return;
  var em = email.value.trim();
  var pw = pass.value;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { sbSetStatus('邮箱格式不对', false); return; }
  if (pw.length < 6) { sbSetStatus('密码至少 6 位', false); return; }
  sbSetStatus('正在登录…', true);
  try {
    var r1 = await _sb.auth.signInWithPassword({ email: em, password: pw });
    if (r1.error) {
      if (r1.error.message && /invalid login/i.test(r1.error.message)) {
        var r2 = await _sb.auth.signUp({ email: em, password: pw });
        if (r2.error) throw r2.error;
        sbSetStatus('注册成功！去邮箱点确认链接后再登录（或在 Supabase 关闭邮箱确认，可直接登录）。', true);
        return;
      }
      throw r1.error;
    }
    sbSetStatus('登录成功，正在拉取云端数据…', true);
    setTimeout(function () { pullCloud(); }, 300);
  } catch (e) {
    sbSetStatus('登录失败：' + (e.message || e), false);
  }
}

async function sbLogoutImpl() {
  try { if (_sb) await _sb.auth.signOut(); } catch (e) {}
  _sbUser = null;
  renderApiSettings();
}

async function sbPushImpl() {
  _pushTimer = null;
  if (!cloudLogged()) return;
  if (!_sbPulled) return; // 首次拉取完成前不推送
  try {
    // 安全护栏：云端已有数据，但本机是默认/空数据时，绝不覆盖云端
    var probe = await withTimeout(
      _sb.from(SB_TABLE).select('updated_at').eq('id', _sbUser.id).maybeSingle(),
      15000, '云端探测'
    );
    if (probe && probe.data && isStateTrivial()) {
      sbSetStatus('本机数据为空，已保留云端数据，未覆盖', false);
      return;
    }
    var ts = _localTs || readLocalTs() || Date.now();
    var payload = { id: _sbUser.id, data: state, updated_at: new Date(ts).toISOString() };
    var res = await withTimeout(_sb.from(SB_TABLE).upsert(payload), 15000, '云端上传');
    if (res.error) throw res.error;
    writeLocalTs(ts);
    sbSetStatus('已同步 ' + new Date().toLocaleTimeString() + '（' + estimateStateSize() + 'KB · 已上传云端）', true);
  } catch (e) {
    var msg = e && e.message;
    if (msg && /too large|payload|413|maximum/i.test(msg)) {
      cloudToast('云同步失败：数据超过云端限制（约1MB），建议清理较大的聊天图片后重试', false);
    } else {
      cloudToast('云同步失败：' + (msg || e), false);
    }
    console.warn('sbPushImpl error:', e);
  }
}

async function sbPullImpl(forceArg) {
  if (!cloudLogged() || !_sb) return;
  sbSetStatus('正在从云端拉取…', true);
  try {
    var res = await withTimeout(
      _sb.from(SB_TABLE).select('data, updated_at').eq('id', _sbUser.id).maybeSingle(),
      15000, '云端拉取'
    );
    _sbPulled = true;
    if (res.error) {
      console.warn('sbPullImpl error:', res.error);
      sbSetStatus('同步拉取出错：' + (res.error.message || res.error), false);
      return;
    }
    var row = res.data;
    if (!row || !row.data) {
      if (AUTO_SYNC) schedulePush();
      sbSetStatus(AUTO_SYNC ? ('云端暂无该账号数据，已把本机数据上传（约 ' + estimateStateSize() + 'KB）') : '云端暂无该账号数据，请点「上传」把本机数据备份到云端', true);
      return;
    }
    var remote = new Date(row.updated_at || 0).getTime() || 0;
    var local = readLocalTs();
    var force = forceArg === true || !window.__sbAppliedOnce;
    if (force) window.__sbAppliedOnce = true;
    var sizeKB = 0;
    try { sizeKB = Math.round(JSON.stringify(row.data).length / 1024); } catch (e) {}
    if (force || remote > local) {
      try { localStorage.setItem('aiPhoneSync.backup', localStorage.getItem(STORAGE_KEY) || ''); } catch (e) {}
      writeLocalTs(remote);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(row.data)); } catch (e) {}
      sbSetStatus('已从云端下载数据（约 ' + sizeKB + ' KB · 更新于 ' + new Date(remote).toLocaleString() + '）', true);
      cloudToast('已从云端恢复最新数据', true);
      applyCloudStateInPlace();
    } else if (local > remote) {
      if (AUTO_SYNC) schedulePush();
      else sbSetStatus('本机数据比云端新，如需备份请点「上传」', true);
    } else {
      sbSetStatus('云端与本机一致，已是最新', true);
    }
  } catch (e) {
    _sbPulled = true;
    console.warn('sbPullImpl catch:', e);
    sbSetStatus('同步拉取异常：' + (e && e.message || e), false);
  }
}

function sbBlockImpl() {
  if (!_sb) {
    return '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-size:13px;font-weight:600;color:#4a3f35">云同步</div>' +
      '<div style="font-size:11px;color:#c0392b">未启用：' + escapeHTML(_sbDisableReason || '初始化中，请稍候或刷新…') + '</div></div>';
  }
  if (cloudLogged()) {
    var em = escapeHTML(cloudUserEmail());
    return '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<div style="font-size:13px;font-weight:600;color:#4a3f35">云同步</div>' +
      '<span style="font-size:11px;color:#27ae60">✓ 已登录 ' + em + '</span></div>' +
      '<div style="font-size:11px;color:#b8a99a;line-height:1.6">「上传」把当前设备数据存到云端；在任何设备点「加载」，都会取回最后上传的那一份。建议：先在 A 设备上传，再到 B 设备加载。</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
      '<button class="ghost-btn" onclick="sbUpload()" style="justify-content:center">⬆️ 上传</button>' +
      '<button class="ghost-btn" onclick="sbDownload()" style="justify-content:center">⬇️ 加载</button></div>' +
      '<button class="ghost-btn" onclick="sbCloudLogout()" style="justify-content:center;color:#c0392b">退出登录</button>' +
      '<div id="sbStatus" style="font-size:11px;color:#27ae60"></div></div>';
  }
  return '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">' +
    '<div style="font-size:13px;font-weight:600;color:#4a3f35">云同步（登录后换设备无缝衔接）</div>' +
    '<div style="font-size:11px;color:#b8a99a;line-height:1.6">每个用户一个独立账号。当前为手动同步：登录后请主动点「上传」把本机数据备份到云端，换设备后点「加载」取回最后上传的那一份（不会自动同步）。</div>' +
    '<input class="field" id="sbEmail" type="email" placeholder="邮箱">' +
    '<input class="field" id="sbPass" type="password" placeholder="密码（至少 6 位）">' +
    '<button class="primary-btn" onclick="sbCloudAuth()" style="justify-content:center">登录 / 注册</button>' +
    '<div id="sbStatus" style="font-size:11px;color:#b8a99a">没注册过的话，直接点上面的按钮会自动帮你注册。</div></div>';
}

// ============================================================
// GitHub Gist 适配器
// ============================================================
function initSbGithub() {
  try { _ghToken = (localStorage.getItem(GH_TOKEN_KEY) || '').trim(); } catch (e) { _ghToken = ''; }
  if (!_ghToken) { _sbDisableReason = '还没有 GitHub Token：到 GitHub → Settings → Developer settings → Personal access tokens 生成一个（勾选 gist 权限），粘贴到下方。'; return false; }
  _sbDisableReason = '';
  fetchGH('/user').then(function (res) {
    if (res.ok) return res.json();
    return null;
  }).then(function (u) {
    if (u && u.login) { _ghUser = u.login; }
  }).catch(function () {});
  return true;
}
(function () { initSbGithub(); })();

function fetchGH(path, opts) {
  opts = opts || {};
  var headers = {
    'Authorization': 'Bearer ' + _ghToken,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json'
  };
  if (opts.headers) { for (var k in opts.headers) headers[k] = opts.headers[k]; }
  var init = {};
  for (var p in opts) if (p !== 'headers') init[p] = opts[p];
  init.headers = headers;
  return withTimeout(fetch(GH_API + path, init), 20000, 'GitHub 请求');
}

function ghErr(res, fallback) {
  if (res && res.status === 401) return 'Token 无效或已失效，请重新生成并粘贴。';
  if (res && res.status === 403) return 'GitHub 拒绝（可能 token 无 gist 权限，或触发了 API 限流）。';
  if (res && res.status === 404) return 'Gist 不存在或无权访问（换设备请使用同一 token）。';
  return fallback || ('GitHub 错误 ' + (res ? res.status : '?'));
}

// 按固定描述在用户所有 gist 里找出存档 gist（换设备 / 重装后本机没有 gistId 时也能定位）
async function findGistId() {
  try {
    var res = await fetchGH('/gists?per_page=100');
    if (!res.ok) return '';
    var list = await res.json();
    if (!Array.isArray(list)) return '';
    for (var i = 0; i < list.length; i++) {
      if (list[i].description === 'aiPhone 仿真小手机存档') return list[i].id;
    }
  } catch (e) {}
  return '';
}

async function ghAuthImpl() {
  var el = document.getElementById('sbToken');
  if (!el) return;
  var tk = (el.value || '').trim();
  if (!tk) { sbSetStatus('请先粘贴 GitHub Token', false); return; }
  try { localStorage.setItem(GH_TOKEN_KEY, tk); } catch (e) {}
  _ghToken = tk;
  sbSetStatus('正在连接 GitHub…', true);
  try {
    var r = await fetchGH('/user');
    if (r.ok) { var u = await r.json(); if (u && u.login) _ghUser = u.login; }
  } catch (e) {}
  try {
    var found = await findGistId();
    if (found) { try { localStorage.setItem(GH_GIST_KEY, found); } catch (e) {} }
  } catch (e) {}
  sbSetStatus('已连接' + (_ghUser ? '（@' + _ghUser + '）' : '') + '，正在拉取云端数据…', true);
  setTimeout(function () { pullCloud(); }, 200);
}

async function ghLogoutImpl() {
  try { localStorage.removeItem(GH_TOKEN_KEY); localStorage.removeItem(GH_GIST_KEY); } catch (e) {}
  _ghToken = '';
  _ghUser = '';
  renderApiSettings();
}

async function ghPushImpl() {
  if (!cloudLogged()) return;
  try {
    // 护栏：本机是空/默认数据时，不创建空备份、也不覆盖云端已有的真实数据
    if (isStateTrivial()) {
      var _gid = '';
      try { _gid = (localStorage.getItem(GH_GIST_KEY) || '').trim(); } catch (e) {}
      if (_gid) sbSetStatus('本机数据为空，已保留云端数据，未覆盖', false);
      else sbSetStatus('本机还是默认数据，未创建空备份', false);
      return;
    }
    var json = JSON.stringify(state);
    if (json.length > 9 * 1024 * 1024) {
      cloudToast('云同步失败：数据超过约 9MB，Gist 可能拒绝。建议清理较大的聊天图片后重试。', false);
      return;
    }
    var gistId = '';
    try { gistId = (localStorage.getItem(GH_GIST_KEY) || '').trim(); } catch (e) {}
    if (!gistId) {
      gistId = await findGistId();
      if (gistId) { try { localStorage.setItem(GH_GIST_KEY, gistId); } catch (e) {} }
    }
    var res, data;
    if (!gistId) {
      sbSetStatus('正在创建 Gist…', true);
      res = await fetchGH('/gists', {
        method: 'POST',
        body: JSON.stringify({ description: 'aiPhone 仿真小手机存档', public: false, files: { [GH_FILE]: { content: json } } })
      });
      if (!res.ok) throw new Error(ghErr(res, '创建 Gist 失败'));
      data = await res.json();
      gistId = data.id;
      try { localStorage.setItem(GH_GIST_KEY, gistId); } catch (e) {}
    } else {
      sbSetStatus('正在上传到云端…', true);
      res = await fetchGH('/gists/' + gistId, {
        method: 'PATCH',
        body: JSON.stringify({ files: { [GH_FILE]: { content: json } } })
      });
      if (!res.ok) throw new Error(ghErr(res, '上传失败'));
    }
    var ts = Date.now();
    _localTs = ts;
    writeLocalTs(ts);
    sbSetStatus('已同步 ' + new Date().toLocaleTimeString() + '（' + estimateStateSize() + 'KB · 已上传 GitHub Gist）', true);
  } catch (e) {
    cloudToast('云同步失败：' + (e && e.message || e), false);
    console.warn('ghPushImpl error:', e);
  }
}

async function ghPullImpl(forceArg) {
  if (!cloudLogged()) return;
  var gistId = '';
  try { gistId = (localStorage.getItem(GH_GIST_KEY) || '').trim(); } catch (e) {}
  if (!gistId) {
    gistId = await findGistId();
    if (gistId) { try { localStorage.setItem(GH_GIST_KEY, gistId); } catch (e) {} }
  }
  if (!gistId) {
    sbSetStatus('云端暂无备份，请点「上传」把本机数据存到 GitHub', true);
    return;
  }
  sbSetStatus('正在从云端拉取…', true);
  try {
    var res = await fetchGH('/gists/' + gistId);
    if (!res.ok) throw new Error(ghErr(res, '拉取失败'));
    var gist = await res.json();
    var file = gist.files && gist.files[GH_FILE];
    if (!file || !file.content) {
      sbSetStatus('该 Gist 没有存档文件，请先「上传」', false);
      return;
    }
    var remote = new Date(gist.updated_at || 0).getTime() || 0;
    var local = readLocalTs();
    var force = forceArg === true || !window.__sbAppliedOnce;
    if (force) window.__sbAppliedOnce = true;
    var data;
    try { data = JSON.parse(file.content); } catch (e2) {
      sbSetStatus('云端数据解析失败（可能不是有效 JSON）', false);
      return;
    }
    if (force || remote > local) {
      try { localStorage.setItem('aiPhoneSync.backup', localStorage.getItem(STORAGE_KEY) || ''); } catch (e) {}
      writeLocalTs(remote);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
      sbSetStatus('已从云端下载数据（更新于 ' + new Date(remote).toLocaleString() + '）', true);
      cloudToast('已从云端恢复最新数据', true);
      applyCloudStateInPlace();
    } else if (local > remote) {
      sbSetStatus('本机数据比云端新，如需备份请点「上传」', true);
    } else {
      sbSetStatus('云端与本机一致，已是最新', true);
    }
  } catch (e) {
    console.warn('ghPullImpl catch:', e);
    sbSetStatus('同步拉取异常：' + (e && e.message || e), false);
  }
}

function ghBlockImpl() {
  if (!_ghToken) {
    return '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:8px">' +
      '<div style="font-size:13px;font-weight:600;color:#4a3f35">云同步（GitHub Gist · 免费）</div>' +
      '<div style="font-size:11px;color:#b8a99a;line-height:1.6">把整个手机数据存到一个你名下的私有 Gist。到 GitHub → Settings → Developer settings → Personal access tokens 生成一个（只勾 gist 权限），粘贴到下面即可。</div>' +
      '<input class="field" id="sbToken" type="password" placeholder="粘贴 GitHub Personal Access Token" style="font-family:monospace">' +
      '<button class="primary-btn" onclick="sbCloudAuth()" style="justify-content:center">连接 GitHub</button>' +
      '<div id="sbStatus" style="font-size:11px;color:#b8a99a">' + escapeHTML(_sbDisableReason || '还没连接') + '</div></div>';
  }
  var em = escapeHTML(cloudUserEmail());
  var gid = '';
  try { gid = localStorage.getItem(GH_GIST_KEY) || ''; } catch (e) {}
  return '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<div style="font-size:13px;font-weight:600;color:#4a3f35">云同步</div>' +
    '<span style="font-size:11px;color:#27ae60">✓ 已连接 ' + em + '</span></div>' +
    (gid ? '<div style="font-size:11px;color:#b8a99a">Gist: ' + escapeHTML(gid.slice(0, 8)) + '…（私有）</div>' : '<div style="font-size:11px;color:#b8a99a">尚未创建备份</div>') +
    '<div style="font-size:11px;color:#b8a99a;line-height:1.6">「上传」把当前设备数据存到云端；换设备后用同一 token 点「加载」取回最后上传的那一份。</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
    '<button class="ghost-btn" onclick="sbUpload()" style="justify-content:center">⬆️ 上传</button>' +
    '<button class="ghost-btn" onclick="sbDownload()" style="justify-content:center">⬇️ 加载</button></div>' +
    '<button class="ghost-btn" onclick="sbCloudLogout()" style="justify-content:center;color:#c0392b">退出 / 清除 Token</button>' +
    '<div id="sbStatus" style="font-size:11px;color:#27ae60"></div></div>';
}

// ============================================================
// 统一分派层（对外函数，按当前后端走对应适配器）
// ============================================================
function cloudLogged() {
  if (CLOUD_BACKEND === 'supabase') return !!_sb && !!_sbUser;
  return !!_ghToken;
}
function cloudUserEmail() {
  if (CLOUD_BACKEND === 'supabase') return _sbUser ? (_sbUser.email || '') : '';
  return _ghUser || 'GitHub';
}

async function pushCloud() {
  if (CLOUD_BACKEND === 'supabase') return sbPushImpl();
  return ghPushImpl();
}
async function pullCloud(forceArg) {
  if (CLOUD_BACKEND === 'supabase') return sbPullImpl(forceArg);
  return ghPullImpl(forceArg);
}
async function sbCloudAuth() {
  if (CLOUD_BACKEND === 'supabase') return sbAuthImpl();
  return ghAuthImpl();
}
async function sbCloudLogout() {
  if (CLOUD_BACKEND === 'supabase') return sbLogoutImpl();
  return ghLogoutImpl();
}
function sbSyncNow() {
  if (!cloudLogged()) { sbSetStatus('请先登录 / 连接', false); return; }
  sbSetStatus('正在同步…', true);
  pullCloud();
  _localTs = Date.now();
  writeLocalTs(_localTs);
  schedulePush();
  setTimeout(function () { sbSetStatus('已开始同步（先拉取云端，再上传本地）', true); }, 1500);
}
async function sbUpload() {
  if (!cloudLogged()) { sbSetStatus('请先登录 / 连接', false); return; }
  sbSetStatus('正在上传到云端…', true);
  _localTs = Date.now();
  writeLocalTs(_localTs);
  await pushCloud();
}
async function sbDownload() {
  if (!cloudLogged()) { sbSetStatus('请先登录 / 连接', false); return; }
  sbSetStatus('正在从云端加载…', true);
  await pullCloud(true);
}

function sbCloudBlock() {
  var ghCls = CLOUD_BACKEND === 'github' ? 'primary-btn' : 'ghost-btn';
  var sbCls = CLOUD_BACKEND === 'supabase' ? 'primary-btn' : 'ghost-btn';
  var sw = '<div style="display:flex;flex-direction:column;gap:8px">' +
    '<div style="font-size:12px;color:#b8a99a">选择云同步后端：</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
    '<button class="' + ghCls + '" onclick="setCloudBackend(\'github\')" style="justify-content:center">GitHub Gist</button>' +
    '<button class="' + sbCls + '" onclick="setCloudBackend(\'supabase\')" style="justify-content:center">Supabase</button>' +
    '</div></div>';
  if (CLOUD_BACKEND === 'supabase') return sw + sbBlockImpl();
  return sw + ghBlockImpl();
}

// window 导出（供内联 onclick 使用）
window.setCloudBackend = setCloudBackend;
window.sbCloudAuth = sbCloudAuth;
window.sbCloudLogout = sbCloudLogout;
window.sbSyncNow = sbSyncNow;
window.sbUpload = sbUpload;
window.sbDownload = sbDownload;

/*
============ Supabase 建表 SQL（控制台 -> SQL Editor 里运行）============
create table if not exists public.user_data (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb,
  updated_at timestamptz default now()
);
alter table public.user_data enable row level security;

create policy "owner_select" on public.user_data for select using (auth.uid() = id);
create policy "owner_insert" on public.user_data for insert with check (auth.uid() = id);
create policy "owner_update" on public.user_data for update using (auth.uid() = id);
create policy "owner_delete" on public.user_data for delete using (auth.uid() = id);
=========================================================================
*/
