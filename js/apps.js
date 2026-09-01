// ============================================================
// apps.js - 所有小应用
// ============================================================

// ---------- 应用管理 ----------
function openApp(name) {
  try {
    $('appModal').classList.add('active');
    $('slider').style.pointerEvents = 'none';
    $('slider').style.overflowX = 'hidden';
    $('slider').style.cursor = 'default';
    const dbg = document.querySelector('.debug-btn');
    if (dbg) dbg.style.display = 'none';
    hidePanels();
    closeSettings();
    if (name !== '许愿柳' && name !== '许愿流') { const mc0 = c(); if (mc0) mc0.classList.remove('willow-fit'); }
    window._openAppName = name;
    setTitle(name === 'QQ' ? '' : name);
    const ah = document.querySelector('.app-header');
    if (ah) {
      ah.style.display = (name === 'QQ') ? 'none' : '';
      ah.style.gridTemplateColumns = '1fr 50px 1fr';
      ah.style.height = '44px';
      ah.style.flex = '0 0 44px';
      ah.style.alignItems = 'center';
      ah.style.padding = '0 15px';
    }
    var hp = document.querySelector('.header-pill');
    if (hp) hp.style.display = 'none';
    if (name !== 'QQ') {
      c().style.background = '#f0ede8';
      var ha = document.querySelector('.app-header');
      if (ha) ha.style.background = '#f0ede8';
    }
    const map = {
      '设置': renderApiSettings, '打卡': renderCheckins,
      '家园': renderHome, '日记': renderDiary, '自习': renderStudy, '自习室': renderStudy,
      '养多肉': renderPlant, '多肉': renderPlant, '账本': renderLedger, '涂鸦': renderDoodle,
      '音乐': renderMusic, '啵啵': renderLiveHall, '啵啵间': renderLiveHall, '线下': renderOffline, '相册': renderAlbum, '表情包': renderStickerManager,
      '许愿柳': renderWillow, '许愿流': renderWillow, '游戏': renderGame, '游戏房': renderGame,
      'QQ': renderIGProfile,
      'IG': renderIGProfile,
      '直播间': renderLiveHall
    };
    if (map[name]) { map[name](); musicAppOpen = (name === '音乐'); if (name === '音乐') { ncmProbedAt = 0; maybeProbeNcm(); } updateMiniPlayer(); return; }
    c().innerHTML = '<div class="card subtle">未找到「' + escapeHTML(name) + '」对应的应用。</div>';
  } catch (err) {
    console.error('openApp error:', err);
    c().innerHTML = '<div class="card" style="color:#e53935">打开失败：' + escapeHTML(err.message) + '</div>';
  }
}

function closeApp() {
  if (window._openAppName === '游戏' || window._openAppName === '游戏房' || window._openAppName === '游戏游戏') {
    if (gameMode !== 'list') { gameMode = 'list'; renderGame(); return; }
  }
  _willowFogShown = false;
  if (spaceFxTimer) { clearInterval(spaceFxTimer); spaceFxTimer = null; }
  var hc = $('homeCouple'); if (hc) hc.style.display = 'none';
  window._spaceTarget = 'app';
  if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; }
  if (_liveBagTimer) { clearInterval(_liveBagTimer); _liveBagTimer = null; }
  studySoundStop();
  const m = $('appModal');
  if (m) { m.style.transition = ''; m.style.top = ''; }
  const mc = c();
  if (mc) { mc.classList.remove('willow-fit'); mc.style.padding = ''; mc.style.height = ''; mc.style.overflow = ''; mc.style.display = ''; mc.style.flexDirection = ''; mc.style.background = ''; mc.style.filter = ''; mc.style.opacity = ''; mc.style.transition = ''; }
  const ah = document.querySelector('.app-header');
  if (ah) { ah.style.background = ''; ah.style.gridTemplateColumns = ''; ah.style.height = ''; ah.style.flex = ''; ah.style.alignItems = ''; ah.style.padding = ''; ah.style.borderBottom = ''; }
  const mtit = document.getElementById('m-tit');
  if (mtit) mtit.style.color = '';
  const ha = document.querySelector('.header-action');
  if (ha) ha.style.color = '';
  const hp = document.querySelector('.header-pill');
  if (hp && hp.style.display) hp.style.display = '';
  const hdr = document.querySelector('.app-header');
  if (hdr) hdr.classList.remove('hidden');
  const amd = $('appModal');
  if (amd) amd.classList.remove('tarot-gothic');
  $('appModal').classList.remove('active');
  musicAppOpen = false;
  updateMiniPlayer();
  $('slider').style.pointerEvents = '';
  $('slider').style.overflowX = 'auto';
  $('slider').style.cursor = 'grab';
  const dbg = document.querySelector('.debug-btn');
  if (dbg) dbg.style.display = 'block';
  closeChat();
  closeSettings();
  stopGame();
}

// ---------- 底部标签栏 ----------
function switchTab(t, el) {
  closeChat();
  closeSettings();
  document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const title = t === 'msg' ? '消息' : '我的';
  setTitle(title);
  if (t === 'msg') renderMessageList();
  if (t === 'me') renderMyProfile();
}

// ---------- 设置 ----------
function renderApiSettings() {
  var profiles = state.apiProfiles || [];
  var activeId = state.activeApiProfile || '';
  var activeProfile = profiles.find(function(p) { return p.id === activeId; });
  var key = activeProfile ? activeProfile.key : state.api.key;
  var url = activeProfile ? activeProfile.url : state.api.url;
  var model = activeProfile ? activeProfile.model : state.api.model;
  var cfgDone = key && url && model;
  var d = activeProfile || state.api;

  var h = '';
  h += '<div class="stack">';
  h += '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-radius:10px;">';
  h += '<span style="width:8px;height:8px;border-radius:50%;background:' + (cfgDone ? '#7aab7a' : '#c0b0a0') + ';flex:0 0 auto"></span>';
  h += '<div style="flex:1;min-width:0"><div style="font-weight:500;font-size:13px;color:#4a3f35">' + (cfgDone ? '已连接' : '未连接') + '</div>';
  h += '<div style="font-size:11px;color:#b8a99a;margin-top:1px">' + (cfgDone ? 'API 已配置' : '选择或新建一个配置') + '</div></div></div>';

  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:14px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">配置</div>';
  h += '<div id="apiProfileList" style="display:flex;flex-wrap:wrap;gap:6px">';
  profiles.forEach(function(p) {
    h += '<span class="api-prof' + (p.id === activeId ? ' active' : '') + '" data-pid="' + p.id.replace(/"/g,'&quot;') + '">' + escapeHTML(p.name) + '</span>';
  });
  h += '<span class="api-prof-add">+ 新建</span>';
  if (profiles.length) h += '<span class="api-prof-del" style="color:#c0392b">删除</span>';
  h += '</div>';

  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">配置名称</div><input class="field" id="apiProfileName" placeholder="例如：OpenAI、中转1、Claude" value="' + escapeHTML(activeProfile ? activeProfile.name : '') + '"></div>';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">API Key</div><input class="field" type="password" id="apiKeyInput" placeholder="sk-..." value="' + escapeHTML(key) + '"></div>';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">Base URL</div><input class="field" id="apiUrlInput" placeholder="https://api.openai.com/v1" value="' + escapeHTML(url) + '"></div>';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">模型</div><div style="display:flex;gap:6px"><input class="field" id="apiModelInput" placeholder="gpt-4.1-mini" value="' + escapeHTML(model) + '" style="flex:1" autocomplete="off" oninput="filterModelSuggestions()" onfocus="showAllModels()"><button class="ghost-btn" onclick="fetchModels()" style="padding:6px 10px;font-size:11px;white-space:nowrap">获取列表</button></div><div id="apiModelList" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px;max-height:160px;overflow:auto"></div></div>';

  // 高级参数
  h += '<div style="border-top:1px solid #f0ede8;padding-top:10px">';
  h += '<div style="font-size:11px;font-weight:500;color:#c0b0a0;margin-bottom:6px;letter-spacing:.5px">PARAMETERS</div>';
  var params = [
    ['Temperature','apiTemp','vTemp',d.temp??0.75,0,2,0.05,2,'越小越保守，越大越发散'],
    ['Top P','apiTopP','vTopP',d.topP??0.9,0,1,0.05,2,'和 temp 类似，通常保持 0.9 不动'],
    ['Max Tokens','apiMaxTokens','vMT',d.maxTokens??500,64,8192,64,0,'AI 每次回复的最大字数'],
    ['Presence Penalty','apiPresenceP','vPP',d.presencePenalty??0.6,-2,2,0.1,1,'越高越少重复已聊话题'],
    ['Frequency Penalty','apiFreqP','vFP',d.frequencyPenalty??0.4,-2,2,0.1,1,'越高用词越不重复']
  ];
  params.forEach(function(p) {
    var val = p[3];
    var display = typeof val === 'number' ? val.toFixed(p[7]) : val;
    h += '<div style="margin-bottom:6px">';
    h += '<div style="display:flex;justify-content:space-between;font-size:10px;color:#b8a99a;margin-bottom:1px">';
    h += '<span>' + p[0] + ' <span style="font-size:8px;color:#d0c8bc">' + p[8] + '</span></span><span id="' + p[2] + '" style="font-variant-numeric:tabular-nums">' + display + '</span></div>';
    h += '<input type="range" min="' + p[4] + '" max="' + p[5] + '" step="' + p[6] + '" id="' + p[1] + '" value="' + val + '" oninput="document.getElementById(\'' + p[2] + '\').textContent=Number(this.value).toFixed(' + p[7] + ')">';
    h += '</div>';
  });
  h += '</div>';

  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<button class="ghost-btn" onclick="testConnection()" style="justify-content:center">测试连接</button>';
  h += '<button class="primary-btn" onclick="saveApiConfig()" style="justify-content:center">保存配置</button></div>';
  h += '<div id="apiTestResult" style="font-size:12px;min-height:16px;color:#b8a99a"></div></div>';

  // 副 API（记忆总结 / 空间回复）
  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">副 API（记忆总结）</div>';
  h += '<div style="font-size:11px;color:#b8a99a;line-height:1.5">用差一点的模型做「总结记忆库」这类轻活，把好一点的主 API 留给正式聊天。选「与主 API 相同」则不单独分流。</div>';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">副 API 配置</div><select class="field" id="secondaryApiSelect" onchange="setSecondaryApi(this.value)">';
  var _secId = state.secondaryApiProfile || '';
  h += '<option value=""' + (_secId === '' ? ' selected' : '') + '>与主 API 相同（不分）</option>';
  profiles.forEach(function(p) {
    h += '<option value="' + escapeHTML(p.id) + '"' + (p.id === _secId ? ' selected' : '') + '>' + escapeHTML(p.name) + '</option>';
  });
  h += '</select></div></div>';

  // 转发代理（GitHub Pages 等纯静态托管时用于规避跨域）
  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">转发代理（跨域）</div>';
  h += '<div style="font-size:11px;color:#b8a99a;line-height:1.5">GitHub Pages 等纯静态托管没有 /relay 后端，AI 请求会被浏览器跨域拦截。把本项目 <b>sever/</b> 部署到免费的 Node 托管（Render / Railway / Glitch 等），把得到的网址填在这里，所有 AI 与翻译请求就会走它转发，规避跨域。</div>';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">转发代理地址</div><input class="field" id="relayUrlInput" placeholder="https://你的代理域名" value="' + escapeHTML(state.settings && state.settings.relayUrl || '') + '"></div>';
  h += '<button class="ghost-btn" onclick="saveRelayUrl()" style="justify-content:center">保存代理地址</button>';
  h += '<div style="font-size:11px;color:#c0b0a0">填了之后会自动检测 ' + (relayBase() || 'https://代理域名') + '/relay-probe 是否可用；留空则走默认（有 /relay 的站点用同源，纯静态则直连）。</div>';
  h += '</div>';

  h += sbCloudBlock();

  // 后台消息通知（页面级 Notification，不依赖 Web Push / FCM）
  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">后台消息通知</div>';
  h += '<div style="display:flex;align-items:center;gap:10px">';
  h += '<div style="flex:1;min-width:0"><div style="font-size:12px;color:#4a3f35">后台消息通知</div><div class="push-hint" style="font-size:11px;color:#b8a99a;margin-top:2px;line-height:1.4">开启后，网页在后台时也能收到角色消息通知</div></div>';
  h += '<div class="switch push-switch"></div></div>';
  h += '<button class="ghost-btn push-test-btn" onclick="testPush()" style="justify-content:center;display:none">发送测试通知</button>';
  h += '<div style="font-size:11px;color:#c0b0a0;line-height:1.5">提示：需保持本页打开（放后台即可），关闭 App 后不会收到；安卓 / iOS 浏览器均支持系统通知。</div>';
  h += '</div>';

  // 角色语音（全局：开关 + 默认平台 + 三平台独立密钥）
  var _ttsS = (state.settings || {});
  var _ttsP = ['minimax', 'mimo', 'elevenlabs'].indexOf(_ttsS.ttsProvider) >= 0 ? _ttsS.ttsProvider : 'minimax';
  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">角色语音</div>';
  h += '<div style="display:flex;align-items:center;gap:10px">';
  h += '<div style="flex:1;min-width:0"><div style="font-size:12px;color:#4a3f35">自动朗读回复</div><div style="font-size:11px;color:#b8a99a;margin-top:2px;line-height:1.4">开启后 TA 的消息会自动读出来，点聊天里消息旁的 🔈 可重听</div></div>';
  h += '<div class="switch" id="autoVoiceSwitch" onclick="toggleAutoVoice()"></div></div>';
  h += '<div id="ttsBody" style="display:flex;flex-direction:column;gap:12px">';
  h += '<div><div style="font-size:11px;color:#b8a99a;margin-bottom:4px">默认发音平台（单个角色可在「聊天设置」里覆盖）</div><select class="field" id="ttsProviderSelect" onchange="setTtsProvider(this.value)"><option value="minimax"' + (_ttsP === 'minimax' ? ' selected' : '') + '>MiniMax 海螺</option><option value="mimo"' + (_ttsP === 'mimo' ? ' selected' : '') + '>小米 MiMo</option><option value="elevenlabs"' + (_ttsP === 'elevenlabs' ? ' selected' : '') + '>ElevenLabs</option></select></div>';
  h += '<div id="ttsChannelBox"></div>';
  h += '</div></div>';

  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">数据</div>';
  h += '<div style="font-size:11px;color:#b8a99a">导出备份包含全部角色、聊天记录和 API 配置</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
  h += '<button class="ghost-btn" onclick="exportAllData()" style="justify-content:center">导出全部</button>';
  h += '<button class="primary-btn" onclick="document.getElementById(\'importDataFile\').click()" style="justify-content:center">导入备份</button></div>';
  h += '<input id="importDataFile" type="file" accept="application/json,.json" style="display:none" onchange="importAllData(event)">';
  h += '<button class="danger-btn" style="width:100%;justify-content:center;margin-top:2px" onclick="resetAllData()">清空全部数据</button></div>';

  h += '<div style="background:#fff;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">';
  h += '<div style="font-size:13px;font-weight:600;color:#4a3f35;padding-bottom:2px;border-bottom:1px solid #f0ede8">显示</div>';
  h += '<div style="font-size:11px;color:#c0b0a0;line-height:1.5;padding:0 4px">如果直接用浏览器打开 HTML，部分接口可能因跨域策略被拦截。能用的中转接口或允许跨域的 API 可直接聊天。</div></div>';

  c().innerHTML = h;
  initApiSettings();
  if (typeof refreshPushUI === 'function') refreshPushUI();
  if (typeof syncTtsOptions === 'function') syncTtsOptions();
}

function setSecondaryApi(v) {
  state.secondaryApiProfile = v || '';
  saveState();
}

// 只显示当前默认平台那家的密钥/地址，切换平台即切换显示（三家密钥分别保存在 state.settings.ttsKeys）
function syncTtsChannel() {
  var box = $('ttsChannelBox');
  if (!box) return;
  var s = state.settings || {};
  var p = TTS_PRESETS[s.ttsProvider] ? s.ttsProvider : 'minimax';
  var pr = TTS_PRESETS[p];
  var key = (s.ttsKeys && s.ttsKeys[p]) || '';
  var url = (s.ttsUrls && s.ttsUrls[p]) || pr.url;
  var group = (s.ttsGroups && s.ttsGroups[p]) || '';
  var html = '';
  html += '<div style="border-top:1px solid #f0ede8;padding-top:10px">';
  html += '<div style="font-size:12px;color:#4a3f35;margin-bottom:4px">' + pr.name + ' 密钥</div>';
  html += '<input class="field" type="password" id="ttsKey_' + p + '" value="' + escapeHTML(key) + '" onchange="setTtsKey(\'' + p + '\', this.value)">';
  html += '<div style="font-size:11px;color:#b8a99a;margin-top:8px;margin-bottom:3px">接口地址（用中转可改）</div>';
  html += '<input class="field" id="ttsUrl_' + p + '" value="' + escapeHTML(url) + '" onchange="setTtsUrl(\'' + p + '\', this.value)">';
  if (p === 'minimax') {
    html += '<div style="font-size:11px;color:#b8a99a;margin-top:8px;margin-bottom:3px">GroupId（中国站 platform.minimaxi.com 必填；国际站 api.minimax.io 留空）</div>';
    html += '<input class="field" id="ttsGroup_' + p + '" value="' + escapeHTML(group) + '" onchange="setTtsGroupId(\'' + p + '\', this.value)">';
  }
  var models = pr.models || [pr.model];
  var curModel = (s.ttsModels && s.ttsModels[p]) || pr.model;
  var mhtml = '';
  models.forEach(function(m) { mhtml += '<option value="' + escapeHTML(m) + '"' + (m === curModel ? ' selected' : '') + '>' + escapeHTML(m) + '</option>'; });
  html += '<div style="font-size:11px;color:#b8a99a;margin-top:8px;margin-bottom:3px">模型</div>';
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<select class="field" id="ttsModel_' + p + '" onchange="setTtsModel(\'' + p + '\', this.value)" style="flex:1">' + mhtml + '</select>';
  html += '<button class="ghost-btn" onclick="testTtsConnection()" style="white-space:nowrap;flex:0 0 auto">测试连接</button>';
  html += '</div>';
  html += '<div id="ttsTestResult" style="font-size:12px;min-height:14px;margin-top:6px;color:#b8a99a"></div>';
  html += '</div>';
  // 克隆/模仿走 MiMo：只有当确实有角色启用了「克隆音色」时才显示 MiMo 密钥框，
  // 平时用 MiniMax/ElevenLabs 的用户不会看到多余的小米密钥输入
  var _needsMimo = false;
  try { _needsMimo = (state.roles || []).some(function(r) { return !!r.ttsClone; }); } catch (e) {}
  if (p !== 'mimo' && _needsMimo) {
    var mkey = (s.ttsKeys && s.ttsKeys.mimo) || '';
    html += '<div style="border-top:1px solid #f0ede8;padding-top:10px">';
    html += '<div style="font-size:12px;color:#4a3f35;margin-bottom:4px">小米 MiMo 密钥</div>';
    html += '<input class="field" type="password" id="ttsKey_mimo" value="' + escapeHTML(mkey) + '" onchange="setTtsKey(\'mimo\', this.value)">';
    html += '</div>';
  }
  box.innerHTML = html;
}

function saveApiConfig() {
  var name = $('apiProfileName').value.trim() || '未命名配置';
  var key = $('apiKeyInput').value.trim();
  var url = $('apiUrlInput').value.trim() || defaultState.api.url;
  var model = $('apiModelInput').value.trim() || defaultState.api.model;
  var temp = parseFloat($('apiTemp').value) || 0.75;
  var topP = parseFloat($('apiTopP').value) || 0.9;
  var maxT = parseInt($('apiMaxTokens').value) || 500;
  var pp = parseFloat($('apiPresenceP').value);
  if (isNaN(pp)) pp = 0.6;
  var fp = parseFloat($('apiFreqP').value);
  if (isNaN(fp)) fp = 0.4;
  var profiles = state.apiProfiles || [];
  var activeId = state.activeApiProfile || '';
  var existing = profiles.findIndex(function(p) { return p.id === activeId; });
  var profile;
  if (existing >= 0) {
    profile = profiles[existing];
    profile.name = name; profile.key = key; profile.url = url;
    profile.model = model; profile.temp = temp; profile.topP = topP;
    profile.maxTokens = maxT; profile.presencePenalty = pp; profile.frequencyPenalty = fp;
  } else {
    profile = { id: 'api-' + Date.now(), name: name, key: key, url: url, model: model, preset: '',
      temp: temp, topP: topP, maxTokens: maxT, presencePenalty: pp, frequencyPenalty: fp };
    profiles.push(profile);
    state.activeApiProfile = profile.id;
  }
  state.apiProfiles = profiles;
  state.api.key = key; state.api.url = url; state.api.model = model; state.api.preset = '';
  state.api.temp = temp; state.api.topP = topP; state.api.maxTokens = maxT;
  state.api.presencePenalty = pp; state.api.frequencyPenalty = fp;
  saveState();
  var btn = $('saveApiBtn');
  if (btn) { btn.innerText = '已保存 ✓'; setTimeout(function() { btn.innerText = '保存配置'; }, 1500); }
  renderApiSettings();
}

function saveRelayUrl() {
  var v = $('relayUrlInput').value.trim();
  if (v && !/^https?:\/\//i.test(v)) { alert('请输入完整的 http(s) 地址，例如 https://xxxx.onrender.com'); return; }
  if (!state.settings) state.settings = {};
  state.settings.relayUrl = v;
  __relayProbe = null;
  saveState();
  alert(v ? '代理地址已保存：' + v : '已清空代理地址');
  renderApiSettings();
}

async function testConnection() {
  var key = $('apiKeyInput').value.trim();
  var url = $('apiUrlInput').value.trim();
  var model = $('apiModelInput').value.trim();
  const box = $('apiTestResult');
  if (!key || !url || !model) {
    if (box) box.innerHTML = '<span style="color:#c0392b">请先填好 Key、URL 和模型</span>';
    return;
  }
  if (box) box.innerHTML = '连接测试中…';
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 12000);
  try {
    var resp = await aiRequest(joinUrl(url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({ model: model, messages: [{ role: 'user', content: '回复"连接成功"四个字' }], max_tokens: 20 }),
      signal: controller.signal
    });
    var data = await resp.json().catch(function() { return {}; });
    if (!resp.ok) throw new Error(data.error && data.error.message || resp.status);
    var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (box) box.innerHTML = '<span style="color:#7aab7a">✓ 连接成功：' + escapeHTML((text || 'ok').trim()) + '</span>';
  } catch (err) {
    if (box) box.innerHTML = '<span style="color:#c0392b">✗ 连接失败：' + escapeHTML(err.message) + '</span>';
  } finally {
    clearTimeout(timer);
  }
}

var _cachedModels = [];

function renderModelTags(ids) {
  var box = $('apiModelList');
  if (!box) return;
  if (!ids.length) { box.innerHTML = '<span style="font-size:11px;color:#b8a99a">无匹配模型</span>'; return; }
  box.innerHTML = ids.map(function (id) {
    return '<span class="model-tag" data-model="' + id.replace(/"/g, '&quot;') + '">' + escapeHTML(id) + '</span>';
  }).join('');
}

// 聚焦时显示全部已获取模型（不按输入框已有内容过滤，方便重选）
function showAllModels() {
  if (!_cachedModels.length) return;
  renderModelTags(_cachedModels);
}

// 输入时实时筛选（输入框为空则显示全部）
function filterModelSuggestions() {
  if (!_cachedModels.length) return; // 还没点过「获取列表」，无数据可筛
  var q = ($('apiModelInput').value || '').trim().toLowerCase();
  if (!q) { showAllModels(); return; }
  renderModelTags(_cachedModels.filter(function (id) { return id.toLowerCase().indexOf(q) >= 0; }));
}

async function fetchModels() {
  var key = $('apiKeyInput').value.trim();
  var url = $('apiUrlInput').value.trim();
  if (!key || !url) { alert('请先填写 Key 和 Base URL'); return; }
  var box = $('apiModelList');
  box.innerHTML = '<span style="font-size:11px;color:#b8a99a">获取中…</span>';
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 12000);
  try {
    const response = await aiRequest(joinUrl(url, 'models'), { headers: { Authorization: 'Bearer ' + key }, signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error && data.error.message || response.status);
    var models = data.data || [];
    _cachedModels = models.map(function (m) { return m.id; });
    if (!models.length) { box.innerHTML = '<span style="font-size:11px;color:#b8a99a">暂无可用模型</span>'; return; }
    showAllModels(); // 拉取后显示完整列表，不按已有输入过滤
  } catch (err) {
    box.innerHTML = '<span style="font-size:11px;color:#c0392b">获取失败：' + escapeHTML(err.message) + '</span>';
  } finally {
    clearTimeout(timer);
  }
}

function initApiSettings() {
  var list = $('apiModelList');
  if (list) list.onclick = function(e) {
    var tag = e.target.closest('.model-tag');
    if (tag) { $('apiModelInput').value = tag.textContent; list.innerHTML = ''; }
  };
  var plist = $('apiProfileList');
  if (plist) plist.onclick = function(e) {
    var t = e.target;
    if (t.classList.contains('api-prof-add')) {
      state.activeApiProfile = '';
      renderApiSettings();
      $('apiProfileName').focus();
    } else if (t.classList.contains('api-prof-del')) {
      var activeId = state.activeApiProfile;
      if (!activeId) return;
      state.apiProfiles = (state.apiProfiles || []).filter(function(p) { return p.id !== activeId; });
      state.activeApiProfile = '';
      saveState();
      renderApiSettings();
    } else if (t.classList.contains('api-prof')) {
      var pid = t.getAttribute('data-pid');
      if (pid && pid !== state.activeApiProfile) {
        state.activeApiProfile = pid;
        saveState();
        renderApiSettings();
      }
    }
  };
}

function exportAllData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-phone-backup-' + todayKey() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importAllData(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = ensureStateShape(mergeDeep(cloneDefaultState(), imported), imported);
      saveState();
      alert('导入成功');
      renderApiSettings();
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
  event.target.value = '';
}

async function resetAllData() {
  if (!await uiConfirm('确定清空全部角色、聊天、记忆和设置？')) return;
  state = cloneDefaultState();
  saveState();
  renderApiSettings();
}

// ---------- 消息列表 ----------
function renderMessageList() {
  setTitle('消息');
  const chars = state.roles.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  c().innerHTML = `
    <div class="stack msg-list-page">
      <input class="search-field glass-input" id="msgSearch" placeholder="🔍 搜索角色 / 消息" oninput="filterMsgList()">
      <div id="msgListWrap">
       ${(chars.length ? chars : [{ id: '', name: '', avatar: '', relation: '', chat: [], unread: 0, online: false }]).map(char => {
        if (!char.id) return '<div class="glass-empty">还没有和任何角色聊过，去「联系人」认识他们吧。</div>';
        const last = (char.chat || [])[char.chat.length - 1];
        const time = last && last.time ? last.time.slice(11, 16) : '';
        const rel = char.relation ? `<span class="tag glass-tag">${escapeHTML(char.relation)}</span>` : '';
        const dot = char.online ? '<span class="online-dot"></span>' : '<span class="offline-dot"></span>';
        return `
        <div class="list-card glass-card${char.pinned ? ' msg-pinned' : ''}" onclick="openChat('${char.id}', 'comic')">
          <div class="avatar" style="position:relative">${renderAvatar(char.avatar, char.name)}${dot}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px"><b>${escapeHTML(char.name)}</b>${rel}</div>
            <div class="subtle msg-preview">${escapeHTML(lastChatPreview(char))}</div>
          </div>
          <div style="text-align:right;min-width:42px">
            <div class="subtle-time">${time}</div>
            ${char.unread > 0 ? `<div class="badge glass-badge">${char.unread > 99 ? '99+' : char.unread}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
      </div>
    </div>`;
}

function filterMsgList() {
  const q = ($('msgSearch').value || '').toLowerCase();
  document.querySelectorAll('#msgListWrap .list-card').forEach((el, i) => {
    const char = state.roles[i];
    const hit = char && (char.name.toLowerCase().includes(q) || lastChatPreview(char).toLowerCase().includes(q));
    el.style.display = (!q || hit) ? '' : 'none';
  });
}

// ---------- 角色编辑器 ----------
function renderCharacterEditor(id) {
  const isNew = id === 'new';
  const char = isNew ? { id: 'char-' + Date.now(), memories: [], chat: [], unread: 0, read: true, name: '', avatar: '', aliases: '', relation: '', personality: '', style: '', background: '', prompt: '', examples: '', greeting: '' } : getCharacter(id);
  const deleteButton = isNew ? '' : `<button class="danger-btn" style="width:100%;margin-top:10px" onclick="deleteCharacter('${char.id}')">删除角色</button>`;
  setTitle(isNew ? '新建角色' : '编辑角色');
  c().innerHTML = `
    <div class="stack">
      <div class="card">
        <label class="label">头像图片</label>
        <div class="avatar-upload">
          <div class="avatar-preview" id="charAvatarPreview">${renderAvatar(char.avatar, char.name)}</div>
          <div>
            <button class="ghost-btn" type="button" onclick="$('charAvatarFile').click()">选择图片</button>
            <div class="subtle" style="margin-top:6px">会自动压缩保存，避免头像丢失。</div>
          </div>
        </div>
        <input id="charAvatar" type="hidden" value="${escapeHTML(char.avatar)}">
        <input id="charAvatarFile" type="file" accept="image/*" style="display:none" onchange="uploadAvatar(event, 'charAvatar', 'charAvatarPreview')">
        <label class="label">角色名称</label>
        <input class="field" id="charName" value="${escapeHTML(char.name)}" placeholder="角色名字">
        <label class="label">角色别名 / 小名</label>
        <input class="field" id="charAliases" value="${escapeHTML(char.aliases)}" placeholder="多个别名用逗号隔开">
        <label class="label">关系设定</label>
        <input class="field" id="charRelation" value="${escapeHTML(char.relation)}" placeholder="朋友 / 恋人 / 搭档 / 自定义">
        <label class="label">性格标签</label>
        <textarea class="textarea" id="charPersonality" placeholder="冷静、温柔、占有欲、毒舌...">${escapeHTML(char.personality)}</textarea>
        <label class="label">说话风格</label>
        <textarea class="textarea" id="charStyle" placeholder="短句、口语、会撒娇、少用感叹号...">${escapeHTML(char.style)}</textarea>
        <label class="label">背景故事</label>
        <textarea class="textarea" id="charBackground" placeholder="角色经历、身份、世界观...">${escapeHTML(char.background)}</textarea>
        <label class="label">高级 Prompt</label>
        <textarea class="textarea" id="charPrompt" placeholder="额外规则、禁止崩人设、互动边界...">${escapeHTML(char.prompt)}</textarea>
        <label class="label">示例对话</label>
        <textarea class="textarea" id="charExamples" placeholder="写 3~5 段你和角色过去的对话示范，AI 会模仿这种说话方式（比规则更管用）。每段用「用户：… / 角色：…」表示，段与段之间空一行：
用户：今天好冷
角色：冷你不会早点说，多穿点会死啊

用户：想你了
角色：啧，这会儿想起我来了？" style="min-height:130px">${escapeHTML(char.examples || '')}</textarea>
        <label class="label">开场白</label>
        <textarea class="textarea" id="charGreeting" placeholder="第一次聊天时角色说的话">${escapeHTML(char.greeting)}</textarea>
        <div class="grid2" style="margin-top:10px">
          <button class="ghost-btn" onclick="switchTab('msg', document.querySelectorAll('.tab-item')[0])">返回</button>
          <button class="primary-btn" onclick="saveCharacter('${isNew ? 'new' : char.id}')">保存角色</button>
        </div>
        ${deleteButton}
      </div>
      ${isNew ? '' : renderMemoryEditor(char)}
    </div>`;
}

function renderMemoryEditor(char) {
  window._memRerender = function() { renderCharacterEditor(char.id); };
  return `
    <div class="card">
      <h2 class="section-title">记忆库 <span style="font-size:11px;color:#b8a99a;font-weight:400">分层·权重·标签·关联·会遗忘</span></h2>
      <input class="field" id="memoryTitle" placeholder="标题 / 类别（如 喜好、秘密、禁忌、梗）">
      <textarea class="textarea" id="memoryText" placeholder="这个角色需要记住什么？" style="margin-top:8px"></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <select class="field" id="memoryLayer" style="flex:1">
          <option value="long">长期</option>
          <option value="short">短期</option>
          <option value="core">核心</option>
        </select>
        <select class="field" id="memoryWeight" style="flex:1">
          <option value="3" selected>重要度 3</option>
          <option value="1">重要度 1</option>
          <option value="2">重要度 2</option>
          <option value="4">重要度 4</option>
          <option value="5">重要度 5</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <input class="field" id="memoryTags" placeholder="标签（空格分隔）" style="flex:1">
        <input class="field" id="memoryEmotion" placeholder="情绪（可选）" style="flex:1">
      </div>
      <button class="primary-btn" style="width:100%;margin-top:8px" onclick="addMemory('${char.id}')">加入记忆</button>
    </div>
    <div id="memoryListBox">
      ${(char.memories || []).map(function(mem) { return memoryCardHtml(normalizeMemory(mem), char.id, "deleteMemory('" + char.id + "','" + mem.id + "')"); }).join('') || '<div class="card subtle">这个角色还没有记忆。</div>'}
    </div>`;
}

function saveCharacter(id) {
  const isNew = id === 'new';
  const char = isNew ? { id: 'char-' + Date.now(), memories: [], chat: [], unread: 0, read: true } : getCharacter(id);
  char.avatar = $('charAvatar').value.trim();
  char.name = $('charName').value.trim() || '未命名角色';
  char.aliases = $('charAliases').value.trim();
  char.relation = $('charRelation').value.trim();
  char.personality = $('charPersonality').value.trim();
  char.style = $('charStyle').value.trim();
  char.background = $('charBackground').value.trim();
  char.prompt = $('charPrompt').value.trim();
  char.examples = $('charExamples').value.trim();
  char.greeting = $('charGreeting').value.trim() || '你好，我在。';
  if (!char.chat.length) char.chat = [{ role: 'assistant', content: char.greeting }];
  if (isNew) {
    state.roles.push(char);
    state.activeRoleId = char.id;
  }
  saveState();
  renderMessageList();
}

async function uploadAvatar(event, inputId, previewId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('请选择图片文件');
  try {
    const dataUrl = await compressAvatar(file);
    $(inputId).value = dataUrl;
    $(previewId).innerHTML = renderAvatar(dataUrl, '头像');
  } catch (err) {
    alert('头像读取失败：' + err.message);
  } finally {
    event.target.value = '';
  }
}

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取图片'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式无法识别'));
      img.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(type, 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function deleteCharacter(id) {
  if (state.roles.length <= 1) return alert('至少保留一个角色');
  if (!await uiConfirm('删除这个角色卡和它的聊天记录？')) return;
  state.roles = state.roles.filter(char => char.id !== id);
  if (state.activeRoleId === id) state.activeRoleId = state.roles[0].id;
  saveState();
  renderMessageList();
}

function addMemory(charId) {
  const char = getCharacter(charId);
  const text = $('memoryText').value.trim();
  if (!text) return alert('先写记忆内容');
  const title = $('memoryTitle').value.trim();
  const layer = ($('memoryLayer') && $('memoryLayer').value) || 'long';
  const weight = ($('memoryWeight') && parseInt($('memoryWeight').value, 10)) || 3;
  const tagsInput = ($('memoryTags') && $('memoryTags').value.trim()) || '';
  const emotion = ($('memoryEmotion') && $('memoryEmotion').value.trim()) || '';
  const tags = [];
  if (title && title !== '记忆') tags.push(title);
  tagsInput.split(/[,，\s]+/).filter(Boolean).forEach(function(t) { if (tags.indexOf(t) < 0) tags.push(t); });
  pushMemory(char, { title: title || '记忆', text: text, layer: layer, weight: weight, emotion: emotion, tags: tags });
  if (typeof autoLinkMemories === 'function') autoLinkMemories(char);
  saveState();
  renderCharacterEditor(charId);
}

function deleteMemory(charId, memoryId) {
  const char = getCharacter(charId);
  char.memories = char.memories.filter(mem => mem.id !== memoryId);
  saveState();
  renderCharacterEditor(charId);
}

// ---------- 我的 ----------
function renderMyProfile() {
  setTitle('我的');
  const cur = activeProfile();
  const charCount = state.roles.length;
  const chatCount = state.roles.reduce((s, c) => s + (c.chat ? c.chat.length : 0), 0);
  const tomatoCount = state.study.round || 0;
  c().innerHTML = `
    <div class="stack">
      <div class="profile-hero" style="background:var(--qq-grad)">
        <div class="avatar">${renderAvatar(cur.avatar, cur.name)}</div>
        <h2 style="margin:6px 0 2px">${escapeHTML(cur.name || '我')}</h2>
        <div class="subtle" style="color:rgba(255,255,255,.85)">${escapeHTML((cur.persona || '').slice(0, 24) || '这套人设还没写简介')}</div>
        <div class="wallet-pill">💰 钱包 ${state.profile.wallet} 元</div>
      </div>
      <div class="grid3" style="margin:2px 0">
        <div class="metric"><span class="subtle">角色</span><b>${charCount}</b></div>
        <div class="metric"><span class="subtle">聊天</span><b>${chatCount}</b></div>
        <div class="metric"><span class="subtle">番茄</span><b>${tomatoCount}</b></div>
      </div>
      <div class="card">
        <h2 class="section-title">我的人设</h2>
        <label class="label">我的头像图片</label>
        <div class="avatar-upload">
          <div class="avatar-preview" id="profileAvatarPreview">${renderAvatar(cur.avatar, cur.name)}</div>
          <div>
            <button class="ghost-btn" type="button" onclick="$('profileAvatarFile').click()">选择图片</button>
            <div class="subtle" style="margin-top:6px">会自动压缩保存，避免头像丢失。</div>
          </div>
        </div>
        <input id="profileAvatar" type="hidden" value="${escapeHTML(cur.avatar)}">
        <input id="profileAvatarFile" type="file" accept="image/*" style="display:none" onchange="uploadAvatar(event, 'profileAvatar', 'profileAvatarPreview')">
        <label class="label">昵称</label>
        <input class="field" id="profileName" value="${escapeHTML(cur.name)}">
        <label class="label">我是谁</label>
        <textarea class="textarea" id="profilePersona" placeholder="你的身份、性格、希望角色知道的背景">${escapeHTML(cur.persona)}</textarea>
        <label class="label">喜好</label>
        <textarea class="textarea" id="profileLikes" placeholder="喜欢什么、习惯、偏好的互动">${escapeHTML(cur.likes)}</textarea>
        <label class="label">边界 / 雷点</label>
        <textarea class="textarea" id="profileBoundaries" placeholder="不喜欢什么、不要怎么说话">${escapeHTML(cur.boundaries)}</textarea>
        <label class="label">我的说话方式</label>
        <textarea class="textarea" id="profileSpeaking" placeholder="例如：短句、撒娇、认真、口语化">${escapeHTML(cur.speaking)}</textarea>
        <div class="grid2" style="margin-top:10px">
          <button class="ghost-btn" onclick="renderMyProfile()">取消</button>
          <button class="primary-btn" onclick="saveMyProfile()">保存我的人设</button>
        </div>
      </div>
      <div class="card">
        <h2 class="section-title">全部人设</h2>
        <button class="primary-btn" style="width:100%;margin-bottom:10px" onclick="newProfile()">＋ 新建人设</button>
        ${state.profiles.map(p => `
          <div class="list-card" onclick="editProfile('${p.id}')">
            <div class="avatar">${renderAvatar(p.avatar, p.name)}</div>
            <div style="flex:1;min-width:0">
              <b>${escapeHTML(p.name || '我')}</b>
              <div class="subtle">${p.id === state.activeProfileId ? '使用中 · ' : ''}${escapeHTML((p.persona || '').slice(0, 20) || '未填写人设')}</div>
            </div>
            ${p.id === state.activeProfileId ? '<span class="subtle">当前</span>' : '<span class="subtle">点开</span>'}
          </div>`).join('')}
      </div>
    </div>`;
}

function newProfile() {
  const prof = { id: 'prof-' + Date.now(), name: '', avatar: '', persona: '', likes: '', boundaries: '', speaking: '' };
  state.profiles.push(prof);
  state.activeProfileId = prof.id;
  saveState();
  renderMyProfile();
}
function editProfile(id) {
  if (id !== state.activeProfileId) { state.activeProfileId = id; saveState(); }
  renderMyProfile();
}
function saveMyProfile() {
  const cur = activeProfile();
  cur.avatar = $('profileAvatar').value.trim();
  cur.name = $('profileName').value.trim() || '我';
  cur.persona = $('profilePersona').value.trim();
  cur.likes = $('profileLikes').value.trim();
  cur.boundaries = $('profileBoundaries').value.trim();
  cur.speaking = $('profileSpeaking').value.trim();
  saveState();
  renderMyProfile();
}

// ---------- 打卡 ----------
let checkinTab = 'doing';
let checkinForm = null;

function todayStr() {
  var d = new Date();
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function isCheckinDueToday(ck) {
  if (!ck || ck.status === 'done') return false;
  return (ck.doneDates || []).indexOf(todayStr()) < 0;
}
function checkinCharName(charId) {
  var r = (state.roles || []).find(function (x) { return x.id === charId; });
  return r ? r.name : 'TA';
}
function checkinCharAvatar(charId) {
  var r = (state.roles || []).find(function (x) { return x.id === charId; });
  if (!r) return '';
  var a = r.avatar || '';
  if (a && (a.indexOf('http') === 0 || a.indexOf('data:') === 0)) return '<img src="' + escapeHTML(a) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  return escapeHTML(a || '👤');
}
function checkinCharOptions(selectedId) {
  var roles = state.roles || [];
  var h = '<select class="field" id="ck-char"><option value="">（不关联角色）</option>';
  roles.forEach(function (r) {
    h += '<option value="' + escapeHTML(r.id) + '"' + (r.id === selectedId ? ' selected' : '') + '>' + escapeHTML(r.name) + '</option>';
  });
  return h + '</select>';
}

function fallbackCheckinNag(char, ck) {
  var rel = char.relation || '';
  var pool;
  if (rel.indexOf('恋') >= 0) pool = ['今天还没打卡「' + ck.name + '」哦，快去，不然我要生气了😤', '乖，先把「' + ck.name + '」打了，不打我要罚你💕', '「' + ck.name + '」今天还没打卡呢，我可都记着呢~'];
  else if (rel.indexOf('友') >= 0 || rel.indexOf('朋') >= 0) pool = ['喂，「' + ck.name + '」今天还没打卡，赶紧的！', '你今天「' + ck.name + '」打了吗？别偷懒啊😏', '记得去打「' + ck.name + '」哦，加油'];
  else pool = ['记得今天打卡「' + ck.name + '」呀~', '「' + ck.name + '」还没打卡，抽空弄一下哦'];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function genCheckinNag(char, ck) {
  var cfg = resolveApiConfig(true);
  if (!cfg || !cfg.key || !cfg.url || !cfg.model) return null;
  var persona = [char.name, char.relation, char.personality, char.style].filter(Boolean).join('；');
  var prompt = '你是角色【' + (char.name || 'TA') + '】。人设：' + persona +
    '\n用户正在坚持一个叫「' + ck.name + '」的打卡习惯（周期 ' + (ck.start || '') + ' 到 ' + (ck.end || '') + '，目标 ' + (ck.totalDays || 0) + ' 次，已打卡 ' + ((ck.doneDates || []).length || ck.doneDays || 0) + ' 次）。' +
    '\n现在用户今天还没打卡「' + ck.name + '」。请用你的口吻发一句话，温柔/撒娇/傲娇地催 TA 去打卡，带一点关心，顺带提一下这个习惯的名字。只输出一句话，可带一个 emoji，不要解释、不要引号。';
  try {
    var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 60, temperature: 0.9 })
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function () { return {}; });
    var t = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    t = t.replace(/^["'「『]+|["'」』]+$/g, '').trim();
    return t || null;
  } catch (e) { return null; }
}

async function nudgeCheckin(charId, force) {
  var char = (typeof getCharacter === 'function') ? getCharacter(charId) : null;
  if (!char) return;
  var cks = (state.checkins || []).filter(function (c) { return c.charId === charId; });
  if (!cks.length) { if (force) alert('这个角色没有在监督你的打卡哦'); return; }
  var dueFresh = cks.filter(function (c) { return isCheckinDueToday(c) && c.lastNagDate !== todayStr(); });
  var dueAny = cks.filter(isCheckinDueToday);
  var ck = force ? (dueAny[0] || cks[0]) : dueFresh[0];
  if (!ck) return;
  var txt = await genCheckinNag(char, ck);
  if (!txt) txt = fallbackCheckinNag(char, ck);
  if (!char.chat) char.chat = [];
  char.chat.push({ role: 'assistant', content: txt, time: new Date().toLocaleString(), ts: Date.now() });
  char.unread = (char.unread || 0) + 1;
  char.read = true;
  ck.lastNagDate = todayStr();
  saveState();
  if (state.activeRoleId === char.id) { if (typeof renderChat === 'function') renderChat(); }
  else if (typeof showMsgNote === 'function') showMsgNote(char.id, char.name, char.avatar, txt);
}
function renderCheckins() {
  const totalDone = state.checkins.reduce((s, x) => s + (x.doneDays || 0), 0);
  const filtered = state.checkins.filter(x => (checkinTab === 'doing' && x.status !== 'done') || (checkinTab === 'done' && x.status === 'done') || (checkinTab === 'undone' && x.status === 'undone'));
  const list = filtered.length ? filtered.map(x => {
    const rate = x.totalDays ? Math.min(100, Math.round((x.doneDays || 0) / x.totalDays * 100)) : 0;
    const editing = checkinForm && checkinForm.mode === 'edit' && checkinForm.id === x.id;
    if (editing) {
      return `<div class="card">
        <div class="label">项目名称</div>
        <input class="field" id="ck-name" value="${escapeHTML(x.name)}">
        <div class="label" style="margin-top:8px">催促时间（到点弹窗/关 App 也提醒）</div>
        <input class="field" id="ck-remind" type="time" value="${escapeHTML(x.remindTime || '')}">
        <div class="label" style="margin-top:8px">监督角色（TA 会催你打卡）</div>
        ${checkinCharOptions(x.charId)}
        <div class="grid2">
          <div><div class="label">开始</div><input class="field" id="ck-start" oninput="syncDaysToEnd()" value="${escapeHTML(x.start)}"></div>
          <div><div class="label">结束</div><input class="field" id="ck-end" oninput="syncEndToDays()" value="${escapeHTML(x.end)}"></div>
        </div>
        <div class="label">目标次数</div>
        <input class="field" id="ck-total" type="number" oninput="syncDaysToEnd()" value="${x.totalDays}">
        <div class="grid2" style="margin-top:10px">
          <button class="primary-btn" onclick="submitEditCheckin('${x.id}')">保存</button>
          <button class="ghost-btn" onclick="checkinForm=null;renderCheckins()">取消</button>
        </div>
      </div>`;
    }
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:16px">${escapeHTML(x.name)}</b>
        <span class="tag">${x.status === 'done' ? '已完成' : (x.status === 'undone' ? '未完成' : '进行中')}</span>
      </div>
       ${x.charId ? `<div class="subtle" style="margin:6px 0;display:flex;align-items:center;gap:6px"><span style="width:18px;height:18px;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;font-size:11px;background:#eee">${checkinCharAvatar(x.charId)}</span>由 ${escapeHTML(checkinCharName(x.charId))} 监督</div>` : ''}
       <div class="subtle" style="margin:6px 0">${escapeHTML(x.start)} - ${escapeHTML(x.end)}　目标 ${x.totalDays} 次</div>
      <div style="position:relative;height:24px;background:#e8e3db;border-radius:12px;margin:10px 0 2px;box-shadow:inset 0 1px 3px rgba(0,0,0,.06)">
        <div style="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;padding:0 20px;pointer-events:none">
          ${[25,50,75,100].map(function(m) {
            if (rate >= m) return '';
            var pct = m;
            return '<div style="position:absolute;left:' + pct + '%;width:6px;height:6px;background:#d4c9bc;border-radius:50%;transform:translate(-50%,0)"></div>';
          }).join('')}
        </div>
        <div style="height:100%;width:${rate}%;background:linear-gradient(90deg,#c4b5a5,#b8a99a,#c9bbad);border-radius:12px;transition:width .5s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden">
          <div style="position:absolute;top:2px;bottom:2px;left:4px;right:4px;background:linear-gradient(90deg,rgba(255,255,255,.2),rgba(255,255,255,.05));border-radius:10px"></div>
          ${rate > 0 && rate < 100 ? '<div style="position:absolute;top:50%;right:-1px;transform:translate(0,-50%);font-size:16px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.15))">🐰</div>' : ''}
          ${rate >= 100 ? '<div style="position:absolute;top:50%;right:4px;transform:translate(0,-50%);font-size:18px;line-height:1;animation:bounce .5s ease">🎉</div>' : ''}
        </div>
        ${[25,50,75,100].map(function(m) {
          if (rate >= m) return '';
          return '<div style="position:absolute;top:0;left:' + m + '%;width:1px;height:100%;background:rgba(0,0,0,.04)"></div>';
        }).join('')}
        
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">
        <span>已打卡 ${x.doneDays || 0} 次</span>
        <span>${x.remindTime ? ('⏰ ' + x.remindTime) : ('完成率 ' + rate + '%')}</span>
      </div>
       ${x.status !== 'done' ? `<button class="primary-btn" style="width:100%;margin-top:10px" onclick="doCheckin('${x.id}')">立即打卡</button>` : `<div class="subtle" style="text-align:center;margin-top:10px">🎉 已达成</div>`}
       ${x.charId && x.status !== 'done' ? `<button class="ghost-btn" style="width:100%;margin-top:8px" onclick="openChat('${x.charId}', 'comic');nudgeCheckin('${x.charId}', true)">💬 让 ${escapeHTML(checkinCharName(x.charId))} 催我</button>` : ''}
       <div style="display:flex;gap:10px;margin-top:8px">
        <button class="ghost-btn" style="flex:1" onclick="checkinForm={mode:'edit',id:'${x.id}'};renderCheckins()">编辑</button>
        <button class="danger-btn" style="flex:1" onclick="deleteCheckin('${x.id}')">删除</button>
      </div>
    </div>`;
  }).join('') : '<div class="card subtle">暂无打卡项目。</div>';

  let formHtml = '';
  if (checkinForm && checkinForm.mode === 'new') {
    formHtml = `<div class="card">
      <div class="label">项目名称</div>
       <input class="field" id="ck-name" placeholder="如 考研学习">
       <div class="label" style="margin-top:8px">催促时间（到点弹窗/关 App 也提醒）</div>
       <input class="field" id="ck-remind" type="time" value="">
       <div class="label" style="margin-top:8px">监督角色（TA 会催你打卡）</div>
       ${checkinCharOptions('')}
       <div class="grid2">
         <div><div class="label">开始</div><input class="field" id="ck-start" oninput="syncDaysToEnd()" value="2026/1/1"></div>
        <div><div class="label">结束</div><input class="field" id="ck-end" oninput="syncEndToDays()" value="2026/6/1"></div>
      </div>
      <div class="label">目标次数</div>
      <input class="field" id="ck-total" type="number" oninput="syncDaysToEnd()" value="150">
      <div class="grid2" style="margin-top:10px">
        <button class="primary-btn" onclick="submitNewCheckin()">创建</button>
        <button class="ghost-btn" onclick="checkinForm=null;renderCheckins()">取消</button>
      </div>
    </div>`;
  }

  c().innerHTML = `
    <div class="stack">
      <div class="card" style="text-align:center;padding:12px 14px">
        <div style="font-size:14px;color:#7a6b5c;font-weight:700">📋 打卡</div>
        <div style="font-size:12px;color:#9c9488;margin-top:2px">已打卡 ${totalDone} 次</div>
      </div>
      <div class="pill-row" style="justify-content:center;margin:2px 0">
        <span class="choice ${checkinTab==='doing'?'active':''}" onclick="checkinTab='doing';renderCheckins()">进行中</span>
        <span class="choice ${checkinTab==='done'?'active':''}" onclick="checkinTab='done';renderCheckins()">已完成</span>
        <span class="choice ${checkinTab==='undone'?'active':''}" onclick="checkinTab='undone';renderCheckins()">未完成</span>
      </div>
      ${list}${formHtml}
      ${checkinForm && checkinForm.mode === 'new' ? '' : `<button class="ghost-btn" style="width:100%" onclick="checkinForm={mode:'new'};renderCheckins()">＋ 新建打卡</button>`}
    </div>`;
}

function doCheckin(id) {
  const x = state.checkins.find(c => c.id === id);
  if (!x || x.status === 'done') return;
  if (!x.doneDates) x.doneDates = [];
  const t = todayStr();
  x.doneDates.push(t);
  x.doneDays = (x.doneDates || []).length;
  if (x.doneDays >= x.totalDays) {
    x.status = 'done';
    saveState();
    if (typeof uploadPushConfig === 'function') uploadPushConfig();
    renderCheckins();
    showCheckinCelebration(x.name);
    return;
  }
  saveState();
  if (typeof uploadPushConfig === 'function') uploadPushConfig();
  renderCheckins();
}
function showCheckinCelebration(name) {
  var el = document.createElement('div');
  el.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(240,237,232,.92);z-index:999;animation:fadeIn .3s ease';
  el.innerHTML = '<div style="font-size:64px;margin-bottom:8px;animation:bounce .6s ease">🎉</div><div style="font-size:18px;color:#7a6b5c;font-weight:700">「' + escapeHTML(name) + '」</div><div style="font-size:14px;color:#9c9488;margin-top:4px">打卡完成，太棒了！</div>';
  var appModal = $('appModal');
  appModal.appendChild(el);
  setTimeout(function() {
    el.style.transition = 'opacity .4s ease';
    el.style.opacity = '0';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
  }, 2000);
}

function isCheckinActiveToday(ck) {
  var t = parseCkDate(todayStr());
  var s = ck.start ? parseCkDate(ck.start) : null;
  var e = ck.end ? parseCkDate(ck.end) : null;
  if (s && !isNaN(s.getTime()) && t < s) return false;
  if (e && !isNaN(e.getTime()) && t > e) return false;
  return true;
}

function checkinReminderTick() {
  if (!state.checkins || !state.checkins.length) return;
  var now = new Date();
  var cur = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2);
  var curMin = parseInt(cur.slice(0, 2), 10) * 60 + parseInt(cur.slice(3, 5), 10);
  var t = todayStr();
  state.checkins.forEach(function (ck) {
    if (ck.status === 'done' || !ck.remindTime) return;
    var p = ck.remindTime.split(':');
    var rm = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    var diff = curMin - rm;
    if (diff < 0 || diff > 15) return;
    if (!isCheckinActiveToday(ck) || !isCheckinDueToday(ck)) return;
    if (ck.lastRemindDate === t) return;
    ck.lastRemindDate = t;
    saveState();
    showCheckinReminder(ck);
  });
}

function showCheckinReminder(ck) {
  var exist = document.getElementById('checkinReminder');
  if (exist) exist.remove();
  var avatarHtml = '⏰';
  var whoName = '打卡提醒';
  var el = document.createElement('div');
  el.id = 'checkinReminder';
  el.style.cssText = 'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(60,50,40,.4);animation:fadeIn .25s ease';
  el.innerHTML = '<div style="width:78%;max-width:300px;background:#fdfaf6;border-radius:20px;padding:22px 20px 16px;text-align:center;box-shadow:0 12px 40px rgba(120,100,80,.28),0 0 0 1px rgba(200,185,165,.2);animation:msgNoteIn .3s ease">'
    + '<div style="width:54px;height:54px;border-radius:50%;overflow:hidden;margin:0 auto 10px;background:#ede4d8;font-size:26px;display:flex;align-items:center;justify-content:center">' + avatarHtml + '</div>'
    + '<div style="font-size:13px;color:#a09588">' + escapeHTML(whoName) + ' 提醒你</div>'
    + '<div style="font-size:20px;color:#5a5045;font-weight:700;margin-top:2px">⏰ 「' + escapeHTML(ck.name) + '」该打卡啦</div>'
    + '<div style="font-size:12px;color:#9c9488;margin-top:6px">今天还没打哦，' + (ck.totalDays ? '目标 ' + ck.totalDays + ' 次，已打 ' + (ck.doneDays || 0) + ' 次' : '别断签啦') + '</div>'
    + '<div style="display:flex;gap:10px;margin-top:18px">'
    + '<button class="ghost-btn" style="flex:1" id="crLater">知道了</button>'
    + '<button class="primary-btn" style="flex:1" id="crGo">去打卡</button>'
    + '</div></div>';
  el.addEventListener('click', function (ev) { if (ev.target === el) el.remove(); });
  document.body.appendChild(el);
  el.querySelector('#crLater').onclick = function () { el.remove(); };
  el.querySelector('#crGo').onclick = function () { el.remove(); if (typeof openApp === 'function') openApp('打卡'); };
}

function parseCkDate(str) {
  var p = str.split('/');
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}
function fmtCkDate(d) {
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}
function syncDaysToEnd() {
  var start = document.getElementById('ck-start');
  var total = document.getElementById('ck-total');
  var end = document.getElementById('ck-end');
  if (!start || !total || !end) return;
  var s = parseCkDate(start.value);
  if (isNaN(s.getTime())) return;
  var days = parseInt(total.value, 10);
  if (!days || days < 1) return;
  var e = new Date(s);
  e.setDate(e.getDate() + days - 1);
  end.value = fmtCkDate(e);
}
function syncEndToDays() {
  var start = document.getElementById('ck-start');
  var end = document.getElementById('ck-end');
  var total = document.getElementById('ck-total');
  if (!start || !end || !total) return;
  var s = parseCkDate(start.value);
  var e = parseCkDate(end.value);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return;
  var diff = Math.round((e - s) / 86400000) + 1;
  if (diff > 0) total.value = diff;
}

async function deleteCheckin(id) {
  if (!await uiConfirm('删除该打卡项目？')) return;
  state.checkins = state.checkins.filter(c => c.id !== id);
  saveState();
  renderCheckins();
}
function submitNewCheckin() {
  const name = document.getElementById('ck-name').value.trim();
  const start = document.getElementById('ck-start').value.trim();
  const end = document.getElementById('ck-end').value.trim();
  const total = parseInt(document.getElementById('ck-total').value, 10) || 1;
  const charId = document.getElementById('ck-char') ? document.getElementById('ck-char').value : '';
  const remindTime = document.getElementById('ck-remind') ? document.getElementById('ck-remind').value : '';
  if (!name) { alert('请填写名称'); return; }
  state.checkins.push({ id: 'ck-' + Date.now(), name, start, end, totalDays: total, doneDays: 0, doneDates: [], charId: charId, remindTime: remindTime, status: 'doing' });
  checkinForm = null;
  saveState();
  if (typeof uploadPushConfig === 'function') uploadPushConfig();
  renderCheckins();
}
function submitEditCheckin(id) {
  const x = state.checkins.find(c => c.id === id);
  if (!x) return;
  const name = document.getElementById('ck-name').value.trim();
  const start = document.getElementById('ck-start').value.trim();
  const end = document.getElementById('ck-end').value.trim();
  const total = parseInt(document.getElementById('ck-total').value, 10) || 1;
  const charId = document.getElementById('ck-char') ? document.getElementById('ck-char').value : '';
  const remindTime = document.getElementById('ck-remind') ? document.getElementById('ck-remind').value : '';
  if (!name) { alert('请填写名称'); return; }
  x.name = name; x.start = start; x.end = end; x.totalDays = total; x.charId = charId; x.remindTime = remindTime;
  if (x.doneDays >= total) x.status = 'done'; else if (x.status === 'done') x.status = 'doing';
  checkinForm = null;
  saveState();
  if (typeof uploadPushConfig === 'function') uploadPushConfig();
  renderCheckins();
}

function toggleHabit(id) {
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  const t = todayKey();
  if (h.done[t]) delete h.done[t];
  else h.done[t] = true;
  saveState();
  renderCheckins();
}
async function addHabit() {
  const name = await uiPrompt('新习惯名称：', '新习惯');
  if (!name) return;
  state.habits.push({ id: 'h' + Date.now(), name: name.trim(), icon: '🎯', done: {} });
  saveState();
  renderCheckins();
}
async function delHabit(id) {
  if (!await uiConfirm('删除这个习惯？历史记录会一起清掉。')) return;
  state.habits = state.habits.filter(x => x.id !== id);
  saveState();
  renderCheckins();
}

// ---------- 家园 ----------
// ---------- 家园 · 院子（种植养成） ----------
const YARD_CROPS = {
  radish:  { name: '樱桃萝卜', icon: '🥕', sec: 40,  min: '约40秒' },
  tomato:  { name: '番茄',     icon: '🍅', sec: 110, min: '约2分钟' },
  pumpkin: { name: '南瓜',     icon: '🎃', sec: 240, min: '约4分钟' }
};
const YARD_DEFAULT = {
  name: '庭院',
  bg: '',
  person: 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg',
  personPos: { x: 50, y: 88 },
  furniture: [
    { id: 'fur-swing', name: '秋千', img: '', x: 2, y: 44, w: 22, h: 24, actions: [
      { label: '坐上去', result: '小人坐到秋千上，脚尖点着地面，慢慢地荡了起来。' },
      { label: '把它推高', result: '小人把秋千荡得老高，笑声顺着风传开。' },
      { label: '躺着看云', result: '小人躺在秋千上，看着云朵慢慢挪窝。' },
      { cid: 'couple', label: '和 TA 一起荡秋千', result: '小人拉着 TA 坐上秋千，脚尖点地，风把两个人的头发都吹得乱乱的。', kiss: true }
    ]},
    { id: 'fur-pond', name: '水池', img: '', x: 34, y: 60, w: 14, h: 14, actions: [
      { label: '捞月亮', result: '小人伸手去捞池里的月亮倒影，涟漪一圈圈荡开，月亮碎成了光点。' },
      { label: '丢石子', result: '扑通——石子沉底，水花溅起来打湿了裤脚。' },
      { label: '喂锦鲤', result: '几条锦鲤围过来，嘴巴一张一合地讨吃的。' }
    ]},
    { id: 'fur-well', name: '水井', img: '', x: 72, y: 44, w: 12, h: 16, actions: [
      { label: '打桶水', result: '吱呀——轱辘摇上来一桶清亮亮的井水，凉丝丝的。' },
      { label: '朝井里喊', result: '小人对着井口大喊：「喂——」井里传回一声「喂——」，拖得很长。' }
    ]},
    { id: 'fur-bench', name: '长椅', img: '', x: 30, y: 44, w: 24, h: 15, actions: [
      { label: '坐一会儿', result: '小人坐在长椅上，双腿晃荡，望着远处发呆。' },
      { label: '拍张照', result: '小人把下巴搁在椅背上，让你帮它拍了张照。' }
    ]},
    { id: 'fur-flowerbed', name: '花圃', img: '', x: 40, y: 72, w: 13, h: 10, actions: [
      { label: '浇花', result: '小人拎着小水壶给花浇了水，花瓣轻轻抖了抖。' },
      { label: '闻一闻', result: '小人凑近闻了闻花香，眼睛弯成了月牙。' }
    ]},
    { id: 'fur-lantern', name: '石灯笼', img: '', x: 88, y: 50, w: 9, h: 15, actions: [
      { label: '点亮', result: '小人踮起脚把灯笼点亮，暖黄的光晕开一小圈。' },
      { label: '看光晕', result: '小人盯着灯芯出神，影子被拉得长长的。' }
    ]}
  ],
  plots: [null, null, null, null],
  seeds: { radish: 5, tomato: 4, pumpkin: 2 },
  harvest: { radish: 0, tomato: 0, pumpkin: 0 }
};

// 庭院图片素材：把下面的空字符串换成你的精致插画 URL（秋千/水池/水井，以及三种作物图标）
// 留空则使用下方手绘 SVG 插画（yardFurArt / yardCropArt）
var YARD_FUR_IMG = { 'fur-swing': '', 'fur-pond': '', 'fur-well': '', 'fur-bench': '', 'fur-flowerbed': '', 'fur-lantern': '' };
var YARD_CROP_IMG = { radish: '', tomato: '', pumpkin: '' };

function yardFurArt(id) {
  if (id === 'fur-swing') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <line x1="24" y1="90" x2="40" y2="28" stroke="#caa46f" stroke-width="5" stroke-linecap="round"/>
      <line x1="76" y1="90" x2="60" y2="28" stroke="#caa46f" stroke-width="5" stroke-linecap="round"/>
      <line x1="40" y1="28" x2="60" y2="28" stroke="#caa46f" stroke-width="5" stroke-linecap="round"/>
      <line x1="45" y1="32" x2="45" y2="66" stroke="#b98b5a" stroke-width="2.4"/>
      <line x1="55" y1="32" x2="55" y2="66" stroke="#b98b5a" stroke-width="2.4"/>
      <rect x="39" y="66" width="22" height="7" rx="3.5" fill="#e0a96d"/>
    </svg>`;
  }
  if (id === 'fur-pond') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <ellipse cx="50" cy="60" rx="40" ry="25" fill="#bfe3ef"/>
      <ellipse cx="50" cy="60" rx="40" ry="25" fill="none" stroke="#9fd0e0" stroke-width="2"/>
      <path d="M28 60 q9 -6 18 0 t18 0" stroke="#ffffff" stroke-width="2" fill="none" opacity=".7"/>
      <ellipse cx="36" cy="52" rx="14" ry="8" fill="#8fc97a"/>
      <circle cx="36" cy="48" r="3" fill="#ffd3e0"/>
      <circle cx="36" cy="43" r="3.4" fill="#ffb3c8"/>
      <circle cx="41" cy="45.5" r="3.4" fill="#ffb3c8"/>
      <circle cx="31" cy="45.5" r="3.4" fill="#ffb3c8"/>
      <circle cx="39" cy="50" r="3.4" fill="#ffb3c8"/>
      <circle cx="33" cy="50" r="3.4" fill="#ffb3c8"/>
    </svg>`;
  }
  if (id === 'fur-well') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <rect x="30" y="52" width="40" height="34" rx="6" fill="#c9b79b"/>
      <rect x="30" y="52" width="40" height="34" rx="6" fill="none" stroke="#a8916f" stroke-width="2"/>
      <line x1="30" y1="67" x2="70" y2="67" stroke="#a8916f" stroke-width="2" opacity=".5"/>
      <line x1="30" y1="81" x2="70" y2="81" stroke="#a8916f" stroke-width="2" opacity=".5"/>
      <line x1="35" y1="52" x2="35" y2="24" stroke="#caa46f" stroke-width="4" stroke-linecap="round"/>
      <line x1="65" y1="52" x2="65" y2="24" stroke="#caa46f" stroke-width="4" stroke-linecap="round"/>
      <path d="M27 27 L50 12 L73 27 Z" fill="#e08a6a"/>
      <rect x="44" y="40" width="12" height="13" rx="3" fill="#9aa0a6"/>
    </svg>`;
  }
  if (id === 'fur-bench') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <rect x="22" y="40" width="56" height="6" rx="3" fill="#c89b6a"/>
      <rect x="22" y="52" width="56" height="6" rx="3" fill="#c89b6a"/>
      <rect x="20" y="62" width="60" height="7" rx="3.5" fill="#ddb27e"/>
      <rect x="26" y="69" width="6" height="18" rx="2" fill="#b98b5a"/>
      <rect x="68" y="69" width="6" height="18" rx="2" fill="#b98b5a"/>
    </svg>`;
  }
  if (id === 'fur-flowerbed') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <ellipse cx="50" cy="80" rx="38" ry="13" fill="#caa46f"/>
      <ellipse cx="50" cy="80" rx="38" ry="13" fill="none" stroke="#a8916f" stroke-width="2"/>
      <line x1="34" y1="80" x2="34" y2="58" stroke="#6fb85c" stroke-width="3"/>
      <circle cx="34" cy="53" r="6" fill="#ff9bbf"/>
      <line x1="50" y1="80" x2="50" y2="50" stroke="#6fb85c" stroke-width="3"/>
      <circle cx="50" cy="45" r="6.5" fill="#ffd36e"/>
      <line x1="66" y1="80" x2="66" y2="58" stroke="#6fb85c" stroke-width="3"/>
      <circle cx="66" cy="53" r="6" fill="#b89bff"/>
    </svg>`;
  }
  if (id === 'fur-lantern') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <rect x="40" y="82" width="20" height="8" rx="3" fill="#b9b2a6"/>
      <rect x="45" y="58" width="10" height="24" rx="2" fill="#cfc8bb"/>
      <rect x="38" y="52" width="24" height="8" rx="3" fill="#b9b2a6"/>
      <rect x="40" y="34" width="20" height="20" rx="4" fill="#e2dccf"/>
      <rect x="46" y="40" width="8" height="10" rx="2" fill="#ffe9a8"/>
      <path d="M34 34 L50 20 L66 34 Z" fill="#a89e8c"/>
      <circle cx="50" cy="18" r="3" fill="#8a8170"/>
    </svg>`;
  }
  return '';
}

function yardCropArt(k) {
  if (k === 'radish') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <path d="M50 42 C40 20 30 24 39 40 Z" fill="#7cc36a"/>
      <path d="M50 42 C60 20 70 24 61 40 Z" fill="#8fd07a"/>
      <path d="M50 42 C48 18 52 18 50 42 Z" fill="#6fb85c"/>
      <path d="M38 42 Q50 38 62 42 Q58 80 50 86 Q42 80 38 42 Z" fill="#ffd7df"/>
      <path d="M38 42 Q50 38 62 42 Q58 80 50 86 Q42 80 38 42 Z" fill="none" stroke="#f4a9bb" stroke-width="2"/>
    </svg>`;
  }
  if (k === 'tomato') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <path d="M50 32 l-9 -9 M50 32 l9 -9 M50 32 l0 -11" stroke="#5fa64e" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="50" cy="28" r="4" fill="#6fb85c"/>
      <circle cx="50" cy="60" r="27" fill="#ef5b4c"/>
      <ellipse cx="41" cy="51" rx="8" ry="5" fill="#ffffff" opacity=".28"/>
    </svg>`;
  }
  if (k === 'pumpkin') {
    return `<svg viewBox="0 0 100 100" class="yard-art-svg">
      <ellipse cx="50" cy="60" rx="30" ry="23" fill="#f0a23c"/>
      <path d="M50 37 Q41 60 50 83" stroke="#d9852a" stroke-width="2" fill="none"/>
      <path d="M50 37 Q59 60 50 83" stroke="#d9852a" stroke-width="2" fill="none"/>
      <path d="M38 39 Q30 60 38 81" stroke="#d9852a" stroke-width="2" fill="none" opacity=".55"/>
      <path d="M62 39 Q70 60 62 81" stroke="#d9852a" stroke-width="2" fill="none" opacity=".55"/>
      <rect x="46" y="22" width="8" height="13" rx="3" fill="#6fa84e"/>
    </svg>`;
  }
  return '';
}

function yardState() {
  var h = state.home;
  if (!h) return null;
  if (!h.rooms) h.rooms = {};
  if (!h.rooms.yard) {
    h.rooms.yard = JSON.parse(JSON.stringify(YARD_DEFAULT));
  } else {
    var def = YARD_DEFAULT.furniture || [];
    h.rooms.yard.furniture = h.rooms.yard.furniture || [];
    var added = false;
    def.forEach(function (d) {
      if (!h.rooms.yard.furniture.some(function (f) { return f.id === d.id; })) {
        h.rooms.yard.furniture.push(JSON.parse(JSON.stringify(d)));
        added = true;
      }
    });
    if (added) saveState();
  }
  h.rooms.yard.bg = '';
  return h.rooms.yard;
}

function yardProgress(p) {
  var crop = YARD_CROPS[p.k]; if (!crop) return { progress: 0, bugged: false, matured: false, boosted: false };
  var now = Date.now();
  var boosted = !!p.w && (now - p.w) < 90000;
  var speed = boosted ? 3 : 1;
  var elapsedSec = ((now - p.t) / 1000) * speed;
  var progress = Math.min(1, elapsedSec / crop.sec);
  if (!p.bugged && !p._bugChecked) {
    p._bugChecked = true;
    if (progress >= 0.45 && Math.random() < 0.35) { p.bugged = true; saveState(); }
  }
  var matured = !p.bugged && progress >= 1;
  return { progress: matured ? 1 : progress, bugged: !!p.bugged, matured: matured, boosted: boosted };
}

function yardBgArt() {
  var u = 'y' + Math.random().toString(36).slice(2, 7);
  return '<svg class="yard-bg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<defs>' +
      '<linearGradient id="' + u + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaf4fb"/><stop offset="0.5" stop-color="#f4f9f5"/><stop offset="1" stop-color="#eef6ea"/></linearGradient>' +
      '<linearGradient id="' + u + 'lawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8edc2"/><stop offset="0.5" stop-color="#c4e2a6"/><stop offset="1" stop-color="#b0d894"/></linearGradient>' +
      '<linearGradient id="' + u + 'path" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ecd6"/><stop offset="1" stop-color="#e7d8b8"/></linearGradient>' +
      '<radialGradient id="' + u + 'sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff7da" stop-opacity="0.95"/><stop offset="0.4" stop-color="#ffe9a8" stop-opacity="0.65"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient>' +
      '<filter id="' + u + 'wc" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.02" numOctaves="2" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="0.8"/></filter>' +
      '<filter id="' + u + 'soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>' +
      '<filter id="' + u + 'grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>' +
    '</defs>' +
    '<rect x="0" y="0" width="1000" height="700" fill="url(#' + u + 'sky)"/>' +
    '<circle cx="838" cy="116" r="130" fill="url(#' + u + 'sun)"/>' +
    '<circle cx="838" cy="116" r="40" fill="#fff3cf" opacity="0.9" filter="url(#' + u + 'soft)"/>' +
    '<g fill="#ffffff" opacity="0.82" filter="url(#' + u + 'soft)">' +
      '<ellipse cx="210" cy="118" rx="86" ry="36"/><ellipse cx="300" cy="134" rx="60" ry="28"/><ellipse cx="560" cy="86" rx="74" ry="30"/><ellipse cx="628" cy="104" rx="52" ry="22"/><ellipse cx="120" cy="170" rx="50" ry="20"/>' +
    '</g>' +
    '<g filter="url(#' + u + 'wc)">' +
      '<path fill="url(#' + u + 'lawn)" d="M0,358 C150,330 260,392 430,364 C560,342 690,402 850,372 C922,358 972,380 1000,366 L1000,700 L0,700 Z"/>' +
      '<path fill="#b6db95" opacity="0.5" d="M0,358 C150,330 260,392 430,364 C560,342 690,402 850,372 C922,358 972,380 1000,366 L1000,384 C972,398 922,376 850,390 C690,420 560,360 430,380 C260,408 150,346 0,376 Z"/>' +
      '<path fill="url(#' + u + 'path)" opacity="0.92" d="M468,360 C480,430 436,500 474,560 C504,608 474,656 502,700 L556,700 C536,654 560,604 540,556 C516,506 556,432 544,360 Z"/>' +
      '<g opacity="0.2" fill="#eef8da"><ellipse cx="220" cy="520" rx="170" ry="60"/><ellipse cx="720" cy="610" rx="210" ry="70"/></g>' +
      '<ellipse cx="120" cy="350" rx="72" ry="84" fill="#aed492"/><ellipse cx="120" cy="350" rx="50" ry="60" fill="#c6e4a8"/>' +
      '<ellipse cx="906" cy="346" rx="64" ry="76" fill="#aed492"/><ellipse cx="906" cy="346" rx="44" ry="54" fill="#c6e4a8"/>' +
    '</g>' +
    '<rect x="0" y="0" width="1000" height="700" filter="url(#' + u + 'grain)" opacity="0.05"/>' +
  '</svg>';
}

function renderYardPlots(room) {
  var plots = room.plots || [];
  var spots = [
    { l: 26, t: 60, w: 11, s: 0.72 },
    { l: 56, t: 58, w: 10, s: 0.68 },
    { l: 12, t: 73, w: 13, s: 0.96 },
    { l: 66, t: 75, w: 14, s: 1.0 }
  ];
  var out = '';
  out += yardBgArt();
  out += '<span class="yard-butterfly b1"></span><span class="yard-butterfly b2"></span>';
  plots.forEach(function (p, idx) {
    var sp = spots[idx] || spots[0];
    out += '<div class="yard-plot" data-idx="' + idx + '" style="left:' + sp.l + '%;top:' + sp.t + '%;width:' + sp.w + '%;height:' + (sp.w * 0.92).toFixed(1) + '%;transform:scale(' + sp.s + ')">' +
      '<div class="yard-soil' + (p ? '' : ' empty') + '">' + renderPlotInner(p) + '</div></div>';
  });
  out += '<div class="yard-harvest" onclick="openYardHarvest()">收获 <b>' + yardHarvestTotal(room) + '</b></div>';
  return out;
}

function renderPlotInner(p) {
  if (!p) return '<div class="yard-empty"><span class="yard-plant-hint">＋</span><span class="yard-plot-tag">空地</span></div>';
  var info = yardProgress(p);
  var icon = YARD_CROPS[p.k].icon;
  var img = YARD_CROP_IMG[p.k] || '';
  var plant = img ? '<img class="yard-crop-img" src="' + escapeHTML(img) + '" alt="' + escapeHTML(icon) + '">' : yardCropArt(p.k);
  var scale = 0.45 + info.progress * 0.75;
  var label = info.matured ? '熟了' : (info.bugged ? '有虫' : Math.round(info.progress * 100) + '%');
  var cls = info.matured ? ' ready' : (info.bugged ? ' bugged' : '');
  return '<div class="yard-sprout-wrap' + cls + '"><div class="yard-sprout" style="transform:scale(' + scale.toFixed(2) + ')">' + plant + '</div><span class="yard-plot-tag">' + label + '</span></div>';
}

function yardHarvestTotal(room) {
  var hv = room.harvest || {};
  return Object.keys(hv).reduce(function (s, k) { return s + (hv[k] || 0); }, 0);
}

function homeLog(msg) {
  var h = state.home;
  h.logs = h.logs || [];
  h.logs.unshift(new Date().toLocaleString() + ' · ' + msg);
  if (h.logs.length > 50) h.logs.length = 50;
  saveState();
}

function openYardPlot(i) {
  var yd = yardState(); if (!yd) return;
  var pop = $('yardPop'); if (!pop) return;
  var plot = yd.plots[i];
  var html = '';
  if (!plot) {
    html = '<div class="yard-pop-title">🌱 种点什么？</div>';
    Object.keys(YARD_CROPS).forEach(function (k) {
      var c = YARD_CROPS[k];
      var n = yd.seeds[k] || 0;
      html += '<button class="yard-seed-btn" onclick="yardPlant(' + i + ',\'' + k + '\')">' + c.icon + ' ' + c.name + ' <span>' + c.min + (n > 0 ? ' ×' + n : ' · 售罄') + '</span></button>';
    });
    html += '<div class="yard-seed-note">一块地只能种一株，成熟收完才能腾地再种。</div>';
  } else {
    var info = yardProgress(plot);
    var c = YARD_CROPS[plot.k];
    var pct = Math.round(info.progress * 100);
    html = '<div class="yard-pop-title">' + c.icon + ' ' + c.name + '</div>';
    html += '<div class="yard-bar"><div class="yard-bar-fill" style="width:' + pct + '%"></div></div>';
    var status = [];
    if (info.matured) status.push('🎉 熟了，可以收！');
    if (info.bugged) status.push('🐛 有虫在啃，长得慢了');
    if (info.boosted) status.push('💦 刚浇过水，长得飞快');
    if (!info.matured && !info.bugged) status.push('⏳ 正在慢慢长大…');
    html += '<div class="yard-pop-status">' + (status.join('　') || '…') + '</div>';
    html += '<div class="yard-pop-actions">';
    if (!info.matured && !info.bugged) html += '<button class="yard-act" onclick="yardWater(' + i + ')">💦 浇水</button>';
    if (info.bugged) html += '<button class="yard-act warn" onclick="yardBug(' + i + ')">🪲 除虫</button>';
    if (info.matured) html += '<button class="yard-act ready" onclick="yardHarvest(' + i + ')">🧺 收获</button>';
    html += '</div>';
  }
  html += '<button class="yard-pop-close" onclick="closeYardPop()">收起</button>';
  pop.innerHTML = html;
  pop.style.display = 'block';
}

function closeYardPop() { var p = $('yardPop'); if (p) p.style.display = 'none'; }

function openYardHarvest() {
  var yd = yardState(); if (!yd) return;
  var hv = yd.harvest || {};
  var lines = Object.keys(YARD_CROPS).map(function (k) {
    return YARD_CROPS[k].icon + ' ' + YARD_CROPS[k].name + ' ×' + (hv[k] || 0);
  }).join('<br>');
  var pop = $('yardPop');
  if (!pop) return;
  pop.innerHTML = '<div class="yard-pop-title">🧺 收成</div><div class="yard-pop-status">' + lines + '</div><button class="yard-pop-close" onclick="closeYardPop()">收起</button>';
  pop.style.display = 'block';
}

function yardPlant(i, k) {
  var yd = yardState(); if (!yd || yd.plots[i]) return;
  if ((yd.seeds[k] || 0) <= 0) { closeYardPop(); return; }
  yd.seeds[k]--;
  yd.plots[i] = { k: k, t: Date.now(), w: null, bugged: false };
  homeLog('在庭院里种下了' + YARD_CROPS[k].name);
  closeYardPop();
  renderHome();
}

function yardWater(i) {
  var yd = yardState(); var p = yd.plots[i]; if (!p) return;
  p.w = Date.now();
  homeLog('给' + YARD_CROPS[p.k].name + '浇了水');
  yardSplash(i);
  saveState();
  setTimeout(function () { renderHome(); }, 300);
}

function yardSplash(i) {
  var el = document.querySelector('.yard-plot[data-idx="' + i + '"]');
  if (!el) return;
  for (var s = 0; s < 6; s++) {
    var d = document.createElement('span');
    d.className = 'yard-drop';
    d.style.left = (30 + Math.random() * 40) + '%';
    d.style.animationDelay = (Math.random() * 0.3) + 's';
    el.appendChild(d);
    setTimeout(function (e) { e.remove(); }, 900, d);
  }
}

function yardBug(i) {
  var yd = yardState(); var p = yd.plots[i]; if (!p) return;
  p.bugged = false;
  homeLog('除掉了' + YARD_CROPS[p.k].name + '上的虫子');
  saveState();
  renderHome();
}

function yardHarvest(i) {
  var yd = yardState(); var p = yd.plots[i]; if (!p) return;
  var info = yardProgress(p); if (!info.matured) return;
  yd.harvest = yd.harvest || {};
  yd.harvest[p.k] = (yd.harvest[p.k] || 0) + 1;
  var name = YARD_CROPS[p.k].name;
  yd.plots[i] = null;
  homeLog('收获了一个' + name);
  saveState();
  renderHome();
}

function renderHome() {
  const mc = c();
  if (mc) { mc.style.padding = '0'; mc.style.height = '100%'; mc.style.overflow = 'hidden'; }
  const hdr = document.querySelector('.app-header');
  if (hdr) hdr.classList.add('hidden');
  const DEFAULT_PERSON = 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg';
  var h = state.home;
  if (!h || !h.rooms) { state.home = JSON.parse(JSON.stringify(defaultState.home)); h = state.home; saveState(); }
  var activeId = h.activeRoom || 'living';
  var room = h.rooms[activeId];
  if (!room) { activeId = 'living'; room = h.rooms.living; h.activeRoom = 'living'; saveState(); }
  var yd = yardState();
  var plotHtml = (activeId === 'yard' && yd) ? renderYardPlots(yd) : '';
  var bathHtml = '';
  var sceneHtml = (activeId === 'living' || activeId === 'bathroom') ? livingRoomArt() : '';
  var isBath = (activeId === 'bathroom');
  var furHtml = (room.furniture || []).map(function (f) {
    var isYard = (activeId === 'yard');
    var imgUrl = isYard ? (f.img || YARD_FUR_IMG[f.id] || '') : (f.img || '');
    if (f.id === 'fur-plant') imgUrl = '';
    var inner = '';
    if (isYard) {
      inner = imgUrl ? '<img class="yard-fur-img" src="' + escapeHTML(imgUrl) + '" alt="' + escapeHTML(f.id) + '">' : yardFurArt(f.id);
    } else if (imgUrl) {
      inner = '';
    } else {
      inner = furArt(f.id);
    }
    var hasArt = (!isYard && !imgUrl && inner) ? ' art' : '';
    var depthStyle = '';
    if (activeId === 'living' || isBath) {
      var d = Math.max(0, Math.min(100, f.y)) / 100;
      depthStyle = ';transform:scale(' + (0.6 + d * 0.8).toFixed(3) + ');transform-origin:50% 100%;z-index:' + Math.round(20 + f.y);
    }
    return '<div class="home-fur' + hasArt + '" data-fid="' + f.id + '" style="left:' + f.x + '%;top:' + f.y + '%;width:' + f.w + '%;height:' + f.h + '%;background-image:' + (imgUrl && !isYard ? ('url(\'' + escapeHTML(imgUrl) + '\')') : 'none') + depthStyle + '">' + (inner ? '<div class="' + (isYard ? 'yard-fur-art' : 'fur-art') + '">' + inner + '</div>' : '') + '<span class="home-fur-name">' + escapeHTML(f.name) + '</span></div>';
  }).join('');
  var roomTabs = Object.keys(h.rooms).map(function(rid) {
    var r = h.rooms[rid];
    return '<div class="home-tab' + (rid === activeId ? ' active' : '') + '" onclick="switchRoom(\'' + rid + '\')">' + escapeHTML(r.name) + '</div>';
  }).join('');
  var pp = room.personPos || { x: 50, y: 72 };
  var mePersonHtml = homePersonHtml('homePerson', 'me', pp);
  var partnerHtml = '';
  var partner = activeRole();
  if (partner) {
    var pPos = h.partnerPos || { x: Math.min(94, pp.x + 16), y: pp.y };
    partnerHtml = homePersonHtml('homePartner', 'ta', pPos);
  }
  ensureHomeCoupleActions();
  c().innerHTML = `
    <div class="stack" style="height:100%;margin:0;padding:0;position:relative">
      <div class="home-room${activeId === 'yard' ? ' yard' : ''}">
        <div class="home-bg"${room.bg ? ` style="background-image:url('${escapeHTML(room.bg)}')"` : ''}></div>
        ${sceneHtml}
        <div class="home-exit" onclick="closeApp()" title="退出">✕</div>
        <div class="home-log-btn" onclick="toggleHomeLog()" title="查看记录">📜</div>
        <div class="home-char-btn" onclick="openHomeCharEdit('me')" title="换小人形象"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/></svg></div>
        ${bathHtml}
        ${plotHtml}
        ${furHtml}
        ${mePersonHtml}
        ${partnerHtml}
        <div id="homeEffects" style="position:absolute;inset:0;pointer-events:none;z-index:6"></div>
        <div id="yardPop" class="yard-pop" style="display:none"></div>
<div id="homePanel" class="home-panel" style="display:none">
            <div class="home-panel-head"><b id="homePanelTitle"></b><button class="home-panel-close" onclick="closeHomePanel()" aria-label="关闭">✕</button></div>
            <div id="homePanelActions" class="home-panel-actions"></div>
            <div id="homePanelResult" class="home-panel-result"></div>
        </div>
        <div id="homeLogView" class="home-log-view">
          <div class="home-log-close" onclick="toggleHomeLog()">✕</div>
          <h2 class="section-title">📜 互动记录</h2>
          ${h.logs && h.logs.length ? h.logs.map(l => `<div class="card subtle" style="margin-bottom:8px;padding:10px 12px">· ${escapeHTML(l)}</div>`).join('') : '<div class="card subtle">还没有互动记录，点家具试试吧。</div>'}
        </div>
        <div id="homeCouple" class="home-couple" style="display:none">
          <div class="home-couple-close" onclick="closeHomeCouple()">✕</div>
        </div>
        <div id="homeCharEdit" class="home-char-edit" style="display:none" onclick="if(event.target===this)closeHomeCharEdit()"></div>
      </div>
      <div class="home-tabs">${roomTabs}</div>
    </div>`;
  const roomEl = document.querySelector('.home-room');
  if (roomEl) {
    roomEl.onclick = function(ev) {
      const bubEl = ev.target.closest('.bath-bubble');
      if (bubEl) { doFurnitureAction(bubEl.dataset.fid, parseInt(bubEl.dataset.idx)); return; }
      const partnerEl = ev.target.closest('.home-partner');
      if (partnerEl) { openHomeCouple(); return; }
      const furEl = ev.target.closest('.home-fur');
      if (furEl) { const fid = furEl.dataset.fid; if (fid) { openFurniture(fid); return; } }
      const plotEl = ev.target.closest('.yard-plot');
      if (plotEl) { openYardPlot(parseInt(plotEl.dataset.idx)); return; }
      if (ev.target === roomEl || ev.target.classList.contains('home-bg')) {
        closeYardPop();
        const box = roomEl.querySelector('.tv-watch-box');
        if (box) box.remove();
        var bubbles = document.querySelectorAll('.bath-bubble');
        bubbles.forEach(function(b) { b.remove(); });
      }
    };
  }
}

function switchRoom(id) {
  var h = state.home;
  if (!h || !h.rooms || !h.rooms[id]) return;
  h.activeRoom = id;
  saveState();
  renderHome();
}

function toggleHomeLog() {
  const v = document.getElementById('homeLogView');
  if (v) v.classList.toggle('show');
}

function curRoomFur() {
  var h = state.home; if (!h || !h.rooms) return [];
  var room = h.rooms[h.activeRoom || 'living'];
  return room ? (room.furniture || []) : [];
}

function openFurniture(id) {
  const h = state.home; if (!h) return;
  var furn = curRoomFur();
  const f = furn.find(x => x.id === id); if (!f) return;
  var room = h.rooms[h.activeRoom || 'living'];
  if (!room) return;
  const panel = $('homePanel'); if (!panel) return;
  if (id === 'fur-tvcabinet' || id === 'fur-table' || id === 'fur-painting') return;
    if (room.personPos) {
      room.personPos.x = Math.min(92, Math.max(4, f.x + (f.w / 2) - 6));
      room.personPos.y = Math.min(82, Math.max(4, f.y + f.h - 12));
      const p = $('homePerson');
      if (p) { p.style.left = room.personPos.x + '%'; p.style.top = room.personPos.y + '%'; }
    }
  /* 厕所：泡泡选项漂浮在家具周围 */
  if (document.querySelector('.home-room.bathroom')) {
    panel.style.display = 'none';
    var acts = f.actions || [];
    if (!acts.length) return;
    /* 移除旧泡泡 */
    var oldBubbles = document.querySelectorAll('.bath-bubble');
    oldBubbles.forEach(function(b) { b.remove(); });
    /* 在家具周围创建泡泡选项 */
    var furEl = document.querySelector('.home-room.bathroom [data-fid="' + id + '"]');
    if (furEl) {
      var fr = furEl.getBoundingClientRect();
      var pr = furEl.parentElement.getBoundingClientRect();
      acts.forEach(function(a, i) {
        var bub = document.createElement('div');
        bub.className = 'bath-bubble';
        bub.innerText = a.label;
        var angle = -40 + i * (80 / (acts.length - 1 || 1));
        var dist = 36 + Math.random() * 8;
        var rad = angle * Math.PI / 180;
        bub.style.left = (fr.left - pr.left + fr.width / 2 + Math.cos(rad) * dist - 30) + 'px';
        bub.style.top = (fr.top - pr.top + Math.cos(rad) * dist * 0.5 - 8) + 'px';
        bub.dataset.fid = f.id;
        bub.dataset.idx = i;
        furEl.parentElement.appendChild(bub);
        /* 延迟触发动画 */
        setTimeout(function() { bub.classList.add('show'); }, i * 60);
      });
    }
    return;
  }
  /* 庭院：浮动泡泡选项，贴近家具，不外弹大窗 */
  if (h.activeRoom === 'yard') {
    panel.style.display = 'none';
    var yacts = f.actions || [];
    if (!yacts.length) return;
    var yold = document.querySelectorAll('.bath-bubble');
    yold.forEach(function(b) { b.remove(); });
    var yfur = document.querySelector('.home-room.yard [data-fid="' + id + '"]');
    if (yfur) {
      var yfr = yfur.getBoundingClientRect();
      var ypr = yfur.parentElement.getBoundingClientRect();
      var yartEl = yfur.querySelector('.yard-fur-art');
      var yref = yartEl ? yartEl.getBoundingClientRect() : yfr;
      yacts.forEach(function(a, i) {
        var yb = document.createElement('div');
        yb.className = 'bath-bubble';
        yb.innerText = a.label;
        var ycx = yref.left - ypr.left + yref.width / 2;
        var ytop = yref.top - ypr.top;
        yb.style.left = (ycx - 30) + 'px';
        yb.style.top = (ytop - 10 - i * 20) + 'px';
        yb.dataset.fid = f.id;
        yb.dataset.idx = i;
        yb.onclick = function(ev) { ev.stopPropagation(); doFurnitureAction(f.id, i); };
        yfur.parentElement.appendChild(yb);
        setTimeout(function() { yb.classList.add('show'); }, i * 60);
      });
      setTimeout(function() { document.querySelectorAll('.bath-bubble').forEach(function(b) { b.remove(); }); }, 5000);
    }
    return;
  }
  if (id === 'fur-tv') {
    closeHomePanel();
    const room = document.querySelector('.home-room');
    if (room) {
      const old = room.querySelector('.tv-watch-box');
      if (old) old.remove();
      const box = document.createElement('div');
      box.className = 'tv-watch-box';
      box.innerText = '📺 看电视';
      box.onclick = function(ev) { ev.stopPropagation(); box.remove(); };
      box.style.left = Math.max(1, f.x - 11) + '%';
      box.style.top = (f.y + f.h / 2 - 2) + '%';
      room.appendChild(box);
    }
    return;
  }
  if (id === 'fur-plant') {
    closeHomePanel();
    const room = document.querySelector('.home-room');
    if (room) {
      const old = room.querySelector('.tv-watch-box');
      if (old) old.remove();
      const box = document.createElement('div');
      box.className = 'tv-watch-box';
      box.innerText = '🪴 浇水';
      box.onclick = function(ev) { ev.stopPropagation(); plantWater(); };
      box.style.left = Math.max(1, f.x - 11) + '%';
      box.style.top = (f.y + f.h / 2 - 2) + '%';
      room.appendChild(box);
    }
    return;
  }
  $('homePanelTitle').innerText = f.name;
  $('homePanelResult').innerText = '';
  $('homePanelActions').innerHTML = (f.actions || []).map((a, i) =>
    `<button class="primary-btn" style="width:100%;margin-top:8px" onclick="doFurnitureAction('${f.id}', ${i})">${escapeHTML(a.label)}</button>`
  ).join('') || '<div class="subtle">这个家具还没有互动选项。</div>';
  panel.style.display = 'block';
}

function closeHomePanel() { const p = $('homePanel'); if (p) p.style.display = 'none'; }

function plantWater() {
  const room = document.querySelector('.home-room');
  if (room) { const b = room.querySelector('.tv-watch-box'); if (b) b.remove(); }
  doFurnitureAction('fur-plant', 0);
}

function doFurnitureAction(furnitureId, idx) {
  const h = state.home; if (!h) return;
  var furn = curRoomFur();
  const f = furn.find(x => x.id === furnitureId); if (!f) return;
  const act = (f.actions || [])[idx]; if (!act) return;
  $('homePanelResult').innerText = act.result;
  if (act.effect) spawnRoomEffect(furnitureId, act.effect);
  if (act.cid === 'couple' || act.kiss) {
    var p = activeRole();
    if (p) {
      var sp = spaceFor(p.id);
      sp.intimacy += 2;
      sp.kisses += 1;
      saveState();
      homePartnerWalkTo(f);
      homeCoupleFx();
      showIGToast((SPACE_KISS_LINES[Math.floor(Math.random() * SPACE_KISS_LINES.length)]) + ' · 亲密度 +2');
    }
  }
  const time = new Date().toLocaleString();
  h.logs = h.logs || [];
  h.logs.unshift(time + ' · ' + f.name + '：' + act.label);
  if (h.logs.length > 50) h.logs.length = 50;
  saveState();
  /* 庭院/厕所：清除泡泡，在相同位置显示浮动结果 */
  var bubbles = document.querySelectorAll('.bath-bubble');
  var lastPos = null;
  if (bubbles.length) {
    var lastBubble = bubbles[0];
    lastPos = { left: lastBubble.style.left, top: lastBubble.style.top };
  }
  bubbles.forEach(function(b) { b.remove(); });
  if (h.activeRoom === 'yard' || document.querySelector('.home-room.bathroom')) {
    var furEl = document.querySelector('.home-room [data-fid="' + furnitureId + '"]');
    if (furEl) {
      var old = furEl.parentElement.querySelector('.home-panel-result');
      if (old) old.remove();
      var res = document.createElement('div');
      res.className = 'home-panel-result';
      res.innerText = act.result;
      if (lastPos) {
        res.style.left = lastPos.left;
        res.style.top = lastPos.top;
      } else if (furEl) {
        var fr = furEl.getBoundingClientRect();
        var pr = furEl.parentElement.getBoundingClientRect();
        res.style.left = (fr.left - pr.left + fr.width / 2 - 60) + 'px';
        res.style.top = (fr.top - pr.top - 8) + 'px';
      }
      furEl.parentElement.appendChild(res);
      setTimeout(function() { if (res.parentNode) res.remove(); }, 3000);
    }
  }
}

function spawnRoomEffect(fid, type) {
  var h = state.home; if (!h) return;
  var room = h.rooms[h.activeRoom || 'living']; if (!room) return;
  var f = (room.furniture || []).find(function(x) { return x.id === fid; }); if (!f) return;
  var container = $('homeEffects'); if (!container) return;
  var cx = f.x + f.w / 2;
  var cy = f.y + 10;
  if (type === 'steam') {
    for (var si = 0; si < 8; si++) {
      var el = document.createElement('div');
      el.className = 'steam-particle';
      el.style.left = (cx + (Math.random() - .5) * f.w * .6) + '%';
      el.style.bottom = (100 - cy + Math.random() * 8) + '%';
      el.style.animationDelay = (Math.random() * 2) + 's';
      el.style.animationDuration = (2.5 + Math.random()) + 's';
      container.appendChild(el);
      setTimeout(function(e) { e.remove(); }, 4000, el);
    }
  } else if (type === 'bubble') {
    for (var bi = 0; bi < 12; bi++) {
      var el2 = document.createElement('div');
      el2.className = 'bubble-particle';
      el2.style.left = (cx + (Math.random() - .5) * f.w * .5) + '%';
      el2.style.bottom = (100 - cy + Math.random() * 10) + '%';
      el2.style.width = (8 + Math.random() * 10) + 'px';
      el2.style.height = el2.style.width;
      el2.style.animationDelay = (Math.random() * 3) + 's';
      el2.style.animationDuration = (3 + Math.random() * 2) + 's';
      container.appendChild(el2);
      setTimeout(function(e) { e.remove(); }, 5000, el2);
    }
  } else if (type === 'candle') {
    var glow = document.createElement('div');
    glow.className = 'candle-glow';
    glow.style.left = (f.x + f.w / 2 - 3) + '%';
    glow.style.top = (f.y - 2) + '%';
    container.appendChild(glow);
    setTimeout(function(e) { e.remove(); }, 5000, glow);
  }
}

// ---------- 日记 ----------
function renderDiary() {
  c().innerHTML = `
    <div class="stack">
      <div class="card">
        <h2 class="section-title">恋爱日记</h2>
        <input class="field" id="diaryTitle" placeholder="标题">
        <textarea class="textarea" id="diaryText" placeholder="今天发生了什么？" style="margin-top:8px"></textarea>
        <button class="primary-btn" style="width:100%;margin-top:8px" onclick="addDiary()">保存日记</button>
      </div>
      ${state.diary.map(d => `<div class="card"><b>${escapeHTML(d.title || '未命名')}</b><p>${escapeHTML(d.text)}</p><div class="subtle">${d.date}</div></div>`).join('') || '<div class="card subtle">还没有日记。</div>'}
    </div>`;
}
function addDiary() {
  const title = $('diaryTitle').value.trim();
  const text = $('diaryText').value.trim();
  if (!text) return alert('先写一点内容吧');
  state.diary.unshift({ id: Date.now(), title, text, date: new Date().toLocaleString() });
  saveState();
  renderDiary();
}

// ---------- 自习室 ----------
const COMPANION_LINES = {
  focusStart: ['我陪你一起专注，开始吧～', '加油，我就在这儿。', '这段时间交给我守着，你只管学。', '深呼吸，我们开始吧。'],
  focusDone: ['完成一个番茄啦，很棒！', '你看，坚持下来了吧～', '一个小目标达成，休息一下。', '我为你骄傲，真的。'],
  breakStart: ['休息一下，别盯着屏幕啦。', '去倒杯水，我帮你记着时间。', '伸个懒腰，我也陪你发呆。', '休息也是努力的一部分。'],
  idle: ['想学点什么？我陪你。', '今天也要好好对待自己哦。', '随时可以开始，我不催你。', '我在呢，放心。'],
  remind: ['第几个番茄了？我帮你看着时间。', '呼吸放慢，专注手里的书。', '距离目标又近了一步。', '别分心，我守着你。', '喝水，然后继续。']
};

const STUDY_SOUNDS = [
  { id: 'rain', name: '雨声', icon: '🌧️' },
  { id: 'cafe', name: '咖啡店', icon: '☕' },
  { id: 'forest', name: '森林', icon: '🌲' }
];

let studyTimer = null;
let studyAudio = null;

function studyCompanion() {
  if (state.study.companionRoleId) {
    const r = state.roles.find(x => x.id === state.study.companionRoleId);
    if (r) return r;
  }
  return activeRole();
}
function switchStudyCompanion() {
  const roles = state.roles;
  if (!roles.length) return;
  const idx = Math.max(0, roles.findIndex(r => r.id === state.study.companionRoleId));
  const next = roles[(idx + 1) % roles.length];
  state.study.companion = true;
  state.study.companionRoleId = next.id;
  state.study.companionMsg = '';
  companionSay('idle');
  saveState();
  renderStudy();
}
function ensureStudyDay() {
  const k = localDateKey(new Date());
  if (state.study.dailyDate !== k) {
    state.study.dailyDate = k;
    state.study.dailyMin = 0;
  }
}
function studyGain(min) {
  ensureStudyDay();
  state.study.dailyMin += Math.max(1, Math.round(min));
}
function studySoundStart(id) {
  studySoundStop();
  if (!id) { state.study.sound = ''; saveState(); renderStudy(); return; }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
    const len = Math.floor(ctx.sampleRate * 2);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b = (b + 0.02 * w) / 1.02;
      data[i] = (id === 'cafe') ? w * 0.28 + b * 2.2 : b * 3.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    if (id === 'rain') { f.type = 'lowpass'; f.frequency.value = 800; }
    else if (id === 'cafe') { f.type = 'bandpass'; f.frequency.value = 1000; f.Q.value = 0.4; }
    else { f.type = 'lowpass'; f.frequency.value = 1400; }
    src.connect(f);
    f.connect(master);
    src.start();
    studyAudio = ctx;
    state.study.sound = id;
  } catch (err) {
    console.error('sound error', err);
  }
  saveState();
  renderStudy();
}
function studySoundStop() {
  if (studyAudio) { try { studyAudio.close(); } catch (e) {} studyAudio = null; }
}
function toggleStudySound(id) {
  if (state.study.sound === id) studySoundStart('');
  else studySoundStart(id);
}
function studySky() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return { top: '#ffdfb0', bottom: '#ffeede' };
  if (h >= 11 && h < 17) return { top: '#a5d6f7', bottom: '#e6f4fb' };
  if (h >= 17 && h < 21) return { top: '#ffb98a', bottom: '#ffdbb8' };
  return { top: '#1f2b4d', bottom: '#33406e' };
}
function studyRoomHTML() {
  const st = state.study;
  const char = studyCompanion();
  const avatarSrc = String(char.avatar || '');
  const isImg = avatarSrc.startsWith('data:image/');
  const name = (char.name || '未命名角色').trim();
  const dateStr = new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  const note = (char.relation || 'Luv u ♡').trim().slice(0, 18);
  return `
  <div class="study-room study-window-scene study-polaroid">
    <svg viewBox="0 0 560 250" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
      <defs>
        <!-- 软木板 -->
        <pattern id="pl-cork" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#c39a72"/>
          <circle cx="4" cy="6" r="1" fill="rgba(120,85,55,.35)"/>
          <circle cx="15" cy="14" r="1.2" fill="rgba(120,85,55,.3)"/>
          <circle cx="9" cy="17" r=".8" fill="rgba(255,255,255,.25)"/>
          <circle cx="17" cy="4" r=".8" fill="rgba(120,85,55,.28)"/>
        </pattern>
        <!-- 相纸渐变 -->
        <linearGradient id="pl-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="60%" stop-color="#fffefb"/>
          <stop offset="100%" stop-color="#f8f2e9"/>
        </linearGradient>
        <!-- 照片淡黄滤镜 -->
        <linearGradient id="pl-img-tint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,190,120,.14)"/>
          <stop offset="100%" stop-color="rgba(160,110,70,.18)"/>
        </linearGradient>
      </defs>

      <!-- 软木板底 -->
      <rect x="0" y="0" width="560" height="250" fill="url(#pl-cork)"/>
      <rect x="0" y="0" width="560" height="250" fill="rgba(60,40,25,.08)"/>

      <!-- 相纸 -->
      <g transform="rotate(-1.2 280 130)">
        <rect x="46" y="22" width="468" height="206" rx="10" fill="url(#pl-paper)"/>
        <rect x="46" y="22" width="468" height="206" rx="10" fill="none" stroke="rgba(120,95,75,.18)"/>

        <!-- 照片影像 -->
        <rect x="64" y="38" width="432" height="150" rx="4" fill="#f5efe6"/>
        <clipPath id="pl-ph-clip"><rect x="64" y="38" width="432" height="150" rx="4"/></clipPath>
        <g clip-path="url(#pl-ph-clip)">
          ${isImg
            ? `<image href="${avatarSrc}" x="64" y="38" width="432" height="150" preserveAspectRatio="xMidYMid slice"/>`
            : `<text x="280" y="128" text-anchor="middle" font-size="76">${escapeHTML(avatarSrc || name.slice(0, 1))}</text>`}
          <!-- 柔焦 + 复古色调 -->
          <rect x="64" y="38" width="432" height="150" fill="url(#pl-img-tint)"/>
          <rect x="64" y="38" width="432" height="150" fill="#fff" opacity=".05"/>
        </g>

        <!-- 手写注记（底部白边） -->
        <text x="80" y="210" font-family="Pacifico, cursive" font-size="16" fill="#7a6a5c">${escapeHTML(name)}</text>
        <text x="498" y="210" text-anchor="end" font-family="Pacifico, cursive" font-size="13" fill="#b49c8a">${dateStr}</text>
        <path d="M92 216 Q104 222 100 212 Q97 204 108 216" stroke="#d99a6c" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        <text x="282" y="212" text-anchor="middle" font-family="Pacifico, cursive" font-size="12" fill="#c8957a">${escapeHTML(note)}</text>
      </g>

      <!-- 胶带 -->
      <g>
        <rect x="-6" y="40" width="80" height="24" rx="2" fill="rgba(240,234,218,.88)" transform="rotate(-26 34 52)"/>
        <rect x="-6" y="40" width="80" height="24" rx="2" fill="none" stroke="rgba(160,140,120,.15)" transform="rotate(-26 34 52)"/>
        <rect x="490" y="150" width="80" height="24" rx="2" fill="rgba(236,222,238,.85)" transform="rotate(20 530 162)"/>
      </g>

      <!-- 贴纸 -->
      <g>
        <circle cx="470" cy="46" r="15" fill="rgba(255,255,255,.75)" transform="rotate(-8 470 46)"/>
        <text x="470" y="52" text-anchor="middle" font-size="17" fill="#d98b9e">♡</text>
        <circle cx="66" cy="176" r="12" fill="rgba(255,255,255,.72)" transform="rotate(10 66 176)"/>
        <text x="66" y="181" text-anchor="middle" font-size="12" fill="#b08bd9">✦</text>
      </g>

      <!-- 顶部图钉 -->
      <circle cx="280" cy="22" r="7" fill="#e86b80" stroke="#c95468"/>
      <circle cx="277.5" cy="19.5" r="2.2" fill="rgba(255,255,255,.7)"/>
    </svg>
  </div>`;
}

function renderStudy() {
  ensureStudyDay();
  const st = state.study;
  st.companion = true;
  const cp = studyCompanion();
  const m = Math.floor(st.seconds / 60).toString().padStart(2, '0');
  const s = (st.seconds % 60).toString().padStart(2, '0');
  const isFocus = st.mode === 'focus';
  const recs = st.records.slice(0, 6);
  const recordsHtml = recs.length === 0
    ? '<div style="color:#d0c5b8;font-size:12px;padding:4px 2px 2px">还没有学习记录，开始第一个番茄吧～</div>'
    : recs.map(r => `<div class="study-record-row">
        <span class="study-record-sub">${escapeHTML(r.subject)}</span>
        <span class="study-record-min">${r.minutes}分</span>
        <span class="study-record-date">${escapeHTML(r.date)}</span>
      </div>`).join('')
      + '<div style="text-align:right;padding:6px 0 0"><button onclick="clearStudyRecords()" style="background:none;border:none;color:#c9bcad;font-size:12px;cursor:pointer">清空记录</button></div>';
  const soundHtml = STUDY_SOUNDS.map(sd =>
    `<button class="study-pill-btn${st.sound === sd.id ? ' on' : ''}" onclick="toggleStudySound('${sd.id}')">${sd.icon} ${sd.name}</button>`).join('')
    + `<button class="study-pill-btn${!st.sound ? ' on' : ''}" onclick="toggleStudySound('')">🔇 关</button>`;
  const extras = `
    <div class="study-sub-card">
      <div class="study-sub-title">🎵 环境音</div>
      <div style="display:flex;gap:8px">${soundHtml}</div>
    </div>`;
  const el = c();
  el.style.background = '#f0ede8';
  el.innerHTML = `
    <div class="stack" style="max-width:560px;margin:0 auto">
      ${studyRoomHTML()}
      <div class="study-timer-card">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12px;color:#b8a99a">${isFocus ? '🍅 专注中' : '☕ 休息中'} · 第 ${st.round} 个番茄</span>
        </div>
        <div class="study-timer-num">${m}:${s}</div>
        ${isFocus
          ? `<input class="field" id="studySubject" value="${escapeHTML(st.subject)}" placeholder="学习科目" style="border-color:#e8ddd0;background:#faf6f0;color:#5c4f42;text-align:center">`
          : '<div style="font-size:13px;color:#b8a99a;padding:2px 0;text-align:center">喝口水，伸个懒腰～</div>'}
        <div class="grid3" style="margin-top:8px;gap:6px">
          ${isFocus
            ? `<button class="study-dur-btn" onclick="setStudyMinutes(25)">25分</button><button class="study-dur-btn" onclick="setStudyMinutes(45)">45分</button><button class="study-dur-btn" onclick="setStudyMinutes(15)">15分</button>`
            : `<button class="study-dur-btn" onclick="setBreak(5)">5分</button><button class="study-dur-btn" onclick="setBreak(10)">10分</button><button class="study-dur-btn" onclick="setBreak(15)">15分</button>`}
        </div>
        <div class="grid2" style="margin-top:10px;gap:8px">
          <button class="study-main-btn" onclick="toggleStudy()">${st.running ? '暂停' : '开始'}</button>
          <button class="study-end-btn" onclick="finishStudy(true)">结束</button>
        </div>
      </div>
      ${extras}
      <div class="study-mate-card">
        <div class="study-mate-head">
          <div class="study-mate-chip">${renderAvatar(cp.avatar, cp.name)}</div>
          <div style="flex:1;min-width:0">
            <div class="study-mate-name">${escapeHTML(cp.name)}</div>
            <div class="study-mate-sub">${escapeHTML(cp.persona || '正在陪你学习')}</div>
          </div>
          <button class="study-mate-swap" onclick="switchStudyCompanion()">换人</button>
        </div>
        <div class="study-mate-stats">
          <div class="study-mate-stat"><span>今日专注</span><b>${st.dailyMin}分</b></div>
          <div class="study-mate-stat"><span>累计番茄</span><b>${st.round}个</b></div>
        </div>
        <div class="study-mate-divider"><span>📋 学习记录</span></div>
        <div style="max-height:190px;overflow:auto">${recordsHtml}</div>
      </div>
    </div>`;
}

function setStudyMinutes(min) {
  state.study.running = false;
  clearInterval(studyTimer);
  state.study.mode = 'focus';
  state.study.focusMin = min;
  state.study.target = min * 60;
  state.study.seconds = min * 60;
  saveState();
  renderStudy();
}
function setBreak(min) {
  state.study.running = false;
  clearInterval(studyTimer);
  state.study.mode = 'break';
  state.study.breakMin = min;
  state.study.target = min * 60;
  state.study.seconds = min * 60;
  saveState();
  renderStudy();
}
function toggleStudy() {
  if (state.study.mode === 'focus') state.study.subject = $('studySubject').value.trim() || '自习';
  state.study.running = !state.study.running;
  if (state.study.running) companionSay(state.study.mode === 'focus' ? 'focusStart' : 'breakStart');
  saveState();
  if (state.study.running) {
    clearInterval(studyTimer);
    studyTimer = setInterval(() => {
      state.study.seconds -= 1;
      if (state.study.seconds <= 0) {
        if (state.study.mode === 'focus') {
          state.study.records.unshift({ subject: state.study.subject, minutes: Math.round(state.study.target / 60), date: new Date().toLocaleString() });
          state.study.round += 1;
          studyGain(Math.round(state.study.target / 60));
          state.study.mode = 'break';
          state.study.target = state.study.breakMin * 60;
          state.study.seconds = state.study.breakMin * 60;
          companionSay('focusDone');
          saveState();
          renderStudy();
        } else {
          clearInterval(studyTimer);
          state.study.running = false;
          state.study.mode = 'focus';
          state.study.target = state.study.focusMin * 60;
          state.study.seconds = state.study.focusMin * 60;
          companionSay('breakStart');
          saveState();
          renderStudy();
        }
      } else {
        if (state.study.mode === 'focus' && state.study.seconds % 600 === 0) companionSay('remind');
        renderStudy();
      }
    }, 1000);
  } else {
    clearInterval(studyTimer);
  }
  renderStudy();
}
function finishStudy(manual) {
  clearInterval(studyTimer);
  if (state.study.mode === 'focus') {
    const used = Math.max(1, Math.round((state.study.target - state.study.seconds) / 60));
    state.study.records.unshift({ subject: state.study.subject, minutes: manual ? used : Math.round(state.study.target / 60), date: new Date().toLocaleString() });
    studyGain(used);
  }
  state.study.running = false;
  state.study.mode = 'focus';
  state.study.seconds = state.study.target = state.study.focusMin * 60;
  saveState();
  renderStudy();
}
async function clearStudyRecords() {
  if (!state.study.records.length) return;
  if (!await uiConfirm('确定要清空所有学习记录吗？')) return;
  state.study.records = [];
  saveState();
  renderStudy();
}
function companionSay(type) {
  if (!state.study.companion) return;
  const pool = COMPANION_LINES[type] || COMPANION_LINES.idle;
  const char = studyCompanion();
  const prefix = char && char.name && char.name !== '未命名角色' ? char.name + '：' : '';
  state.study.companionMsg = prefix + pool[Math.floor(Math.random() * pool.length)];
  saveState();
}
function refreshCompanion() {
  companionSay(state.study.running ? (state.study.mode === 'focus' ? 'focusStart' : 'breakStart') : 'idle');
  renderStudy();
}

// ---------- 养多肉 ----------
function plantMood(p) {
  const score = p.water + p.love;
  if (score < 40) return { icon: '🥀', text: '有点蔫了' };
  if (score < 80) return { icon: '🌿', text: '正在慢慢长' };
  if (score < 140) return { icon: '😊', text: '叶片胖乎乎的' };
  return { icon: '🌟', text: '爆棚状态' };
}
function stageEmoji(p) {
  if (p.level >= 6) return '🌳';
  if (p.level >= 4) return '🌵';
  if (p.level >= 2) return '🪴';
  return '🌱';
}
function renderPlant() {
  const p = state.plant;
  const mood = plantMood(p);
  const emoji = stageEmoji(p);
  const careToday = p.lastCare === todayKey();
  const wPct = Math.min(100, p.water);
  const lPct = Math.min(100, p.love);
  const logDots = { '💧': 'blue', '🤚': 'pink', '🌟': 'gold' };
  c().innerHTML = `
    <div class="stack">
      <div class="plant-card">
        <div class="plant-display">
          <div class="emoji" id="plantEmoji">${emoji}</div>
          <div class="plant-level">Lv.${p.level}</div>
          <div class="plant-mood">${mood.icon} ${mood.text}</div>
          ${p.streak > 0 ? `<div class="plant-streak">🔥 ${p.streak} 天</div>` : ''}
          <div class="plant-care-status">${careToday ? '✓ 已照顾' : '今天还没照顾'}</div>
        </div>
      </div>
      <div class="plant-card">
        <div class="plant-bar-group">
          <div class="plant-bar">
            <span class="icon">💧</span>
            <div class="track"><div class="fill" style="width:${wPct}%;background:#5ba3e6"></div></div>
            <span class="val">${Math.round(wPct)}%</span>
          </div>
          <div class="plant-bar">
            <span class="icon">💗</span>
            <div class="track"><div class="fill" style="width:${lPct}%;background:#e65a7a"></div></div>
            <span class="val">${Math.round(lPct)}</span>
          </div>
        </div>
      </div>
      <div class="plant-card">
        <div class="plant-actions">
          <button class="btn" onclick="waterPlant()"><span class="icon">💧</span>浇水</button>
          <button class="btn" onclick="touchPlant()"><span class="icon">🤚</span>摸摸</button>
          <button class="btn" onclick="fertilizePlant()"><span class="icon">🌟</span>施肥</button>
        </div>
      </div>
      ${p.logs.length ? `<div class="plant-card"><div style="font-size:13px;font-weight:600;color:#555;margin-bottom:8px">📜 手账</div><div class="plant-log" style="max-height:192px;overflow-y:auto">${p.logs.map(l => {
        const dot = logDots[l.act.slice(0, 1)] || '';
        return `<div class="item"><span class="dot ${dot}"></span><span>${escapeHTML(l.act)}</span><span class="date">${escapeHTML(l.date)}</span></div>`;
      }).join('')}</div></div>` : '<div class="plant-card" style="text-align:center;color:#bbb;font-size:13px;padding:24px">还没有互动记录</div>'}
    </div>`;
}
function bumpStreak() {
  const today = todayKey();
  const p = state.plant;
  if (p.lastCare === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  p.streak = (p.lastCare === yKey) ? (p.streak + 1) : 1;
  p.lastCare = today;
}
function pushLog(act) {
  state.plant.logs.unshift({ act, date: new Date().toLocaleString() });
  if (state.plant.logs.length > 50) state.plant.logs.length = 50;
}
function plantBubble(text) {
  const el = $('plantEmoji');
  if (!el) return;
  const bub = document.createElement('div');
  bub.className = 'plant-bubble';
  bub.textContent = text;
  bub.style.left = (Math.random() * 60 + 20) + '%';
  bub.style.top = (Math.random() * 20 + 10) + '%';
  el.parentElement.appendChild(bub);
  setTimeout(() => bub.remove(), 2000);
  el.classList.remove('plant-shake');
  void el.offsetWidth;
  el.classList.add('plant-shake');
}
function waterPlant() {
  const today = todayKey();
  const p = state.plant;
  const bonus = p.lastWater === today ? 10 : 28;
  p.water = Math.min(100, p.water + bonus);
  p.lastWater = today;
  p.love += 2;
  bumpStreak();
  pushLog('💧 浇了水');
  growPlant();
  saveState();
  renderPlant();
  setTimeout(() => plantBubble(bonus === 28 ? '咕嘟咕嘟～💧' : '+10 💧'), 30);
}
function touchPlant() {
  state.plant.love += 3;
  bumpStreak();
  pushLog('🤚 摸了摸');
  growPlant();
  saveState();
  renderPlant();
  setTimeout(() => plantBubble('好舒服～💗'), 30);
}
function fertilizePlant() {
  const today = todayKey();
  const p = state.plant;
  if (p.fertilizedDate === today) { alert('今天已经施过肥啦，明天再来～'); return; }
  p.fertilizedDate = today;
  p.love += 8;
  bumpStreak();
  pushLog('🌟 施了肥');
  growPlant();
  saveState();
  renderPlant();
  setTimeout(() => plantBubble('营养满满！🌟'), 30);
}
function growPlant() {
  state.plant.level = Math.max(state.plant.level, Math.floor((state.plant.water + state.plant.love) / 45));
}

// ---------- 账本 ----------
let ledgerMonth = todayKey().slice(0, 7);
let ledgerFilter = '';
const LEDGER_CATS = ['餐饮','交通','购物','居住','娱乐','工资','其他'];
const LEDGER_ICONS = { '餐饮':'🍜','交通':'🚌','购物':'🛍','居住':'🏠','娱乐':'🎮','工资':'💰','其他':'📌' };

function renderLedger() {
  const monthItems = state.ledger.filter(x => (x.date || '').slice(0, 7) === ledgerMonth);
  const filtered = ledgerFilter
    ? monthItems.filter(x => (x.note || '').includes(ledgerFilter) || (x.category || '其他').includes(ledgerFilter))
    : monthItems;
  const income = monthItems.filter(x => x.amount >= 0).reduce((s, x) => s + Number(x.amount), 0);
  const expense = monthItems.filter(x => x.amount < 0).reduce((s, x) => s + Number(x.amount), 0);
  const total = state.ledger.reduce((sum, x) => sum + Number(x.amount), 0);
  c().innerHTML = `
    <div class="stack">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <h2 class="section-title" style="margin:0">账本</h2>
          <div>
            <button class="icon-btn" onclick="changeLedgerMonth(-1)">◀</button>
            <span class="subtle">${ledgerMonth}</span>
            <button class="icon-btn" onclick="changeLedgerMonth(1)">▶</button>
          </div>
        </div>
        <div class="grid2" style="margin-top:10px">
          <div><div class="subtle">收入</div><b style="color:#18a058">￥${yuan(income)}</b></div>
          <div><div class="subtle">支出</div><b style="color:#e53935">￥${yuan(expense)}</b></div>
        </div>
        <div class="metric" style="margin-top:8px"><span class="subtle">本月结余</span><b>￥${yuan(income + expense)}</b></div>
        <div class="metric"><span class="subtle">累计总额</span><b>￥${yuan(total)}</b></div>
      </div>
      <div class="card">
        <div class="grid2">
          <input class="field" id="ledgerAmount" type="number" placeholder="金额">
          <input class="field" id="ledgerNote" placeholder="备注">
        </div>
        <select id="ledgerCat" class="field" style="margin-top:8px">
          ${LEDGER_CATS.map(c => `<option value="${c}">${LEDGER_ICONS[c]} ${c}</option>`).join('')}
        </select>
        <div class="grid2" style="margin-top:8px">
          <button class="ghost-btn" onclick="addLedger(false)">支出</button>
          <button class="primary-btn" onclick="addLedger(true)">收入</button>
        </div>
      </div>
      <input class="field" style="margin-top:8px" placeholder="搜索备注或分类" value="${escapeHTML(ledgerFilter)}" oninput="ledgerFilter=this.value;renderLedger()">
      ${filtered.map(x => `<div class="list-card">
        <b style="color:${x.amount >= 0 ? '#18a058' : '#e53935'}">${x.amount >= 0 ? '+' : ''}${yuan(x.amount)}</b>
        <div style="flex:1;min-width:0" onclick="editLedger('${x.id}')">
          <b>${escapeHTML(x.note || '未备注')}</b>
          <div class="subtle">${LEDGER_ICONS[x.category] || '📌'} ${escapeHTML(x.category || '其他')} · ${x.date}</div>
        </div>
        <button class="icon-btn" style="font-size:12px" onclick="deleteLedger('${x.id}')">✕</button>
      </div>`).join('') || '<div class="card subtle">本月暂无账目。</div>'}
    </div>`;
}
function changeLedgerMonth(diff) {
  let [y, m] = ledgerMonth.split('-').map(Number);
  m += diff;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  ledgerMonth = `${y}-${String(m).padStart(2, '0')}`;
  renderLedger();
}
function addLedger(isIncome, note, cat, date) {
  let amount = Math.abs(Number($('ledgerAmount').value || 0));
  if (!isIncome && note === undefined && cat === undefined) {
  if (!amount) return alert('请输入金额');
  }
  const useAmount = (note !== undefined) ? (isIncome ? amount : -amount) : (isIncome ? amount : -amount);
  const useNote = note !== undefined ? note : ($('ledgerNote').value.trim() || '未备注');
  const useCat = cat !== undefined ? cat : ($('ledgerCat').value || '其他');
  state.ledger.unshift({ id: 'l' + Date.now(), amount: useAmount, note: useNote, category: useCat, date: date || todayKey() });
  state.profile.wallet += useAmount;
  saveState();
  renderLedger();
  return { amount: useAmount };
}
function addLedgerQuick(amount, note, notice) {
  if (notice !== false) notice = true;
  const cat = amount >= 0 ? '工资' : '其他';
  state.ledger.unshift({ id: 'lq' + Date.now(), amount, note: note || '', category: cat, date: todayKey() });
  state.profile.wallet += amount;
  saveState();
  if (notice) quickNotice('已记到账本：' + note);
}
async function deleteLedger(id) {
  if (!await uiConfirm('删除这笔账目？')) return;
  const item = state.ledger.find(x => x.id === id);
  if (item) state.profile.wallet -= Number(item.amount);
  state.ledger = state.ledger.filter(x => x.id !== id);
  saveState();
  renderLedger();
}
async function editLedger(id) {
  const item = state.ledger.find(x => x.id === id);
  if (!item) return;
  const note = await uiPrompt('备注：', item.note);
  if (note === null) return;
  const cat = await uiPrompt('分类（餐饮/交通/购物/居住/娱乐/工资/其他）：', item.category || '其他');
  if (cat !== null) { item.note = note.trim(); item.category = cat.trim() || '其他'; saveState(); renderLedger(); }
}

// ---------- 涂鸦 ----------
let doodleBg = null;
let doodleHistory = [];
let doodleHistoryIndex = -1;
let doodleTool = 'pen';
const DOODLE_MAX_HISTORY = 30;

function renderDoodle() {
  doodleBg = null;
  doodleHistory = [];
  doodleHistoryIndex = -1;
  doodleTool = 'pen';
  c().innerHTML =
  '<div class="doodle-panel">' +
    '<div class="doodle-tools">' +
      '<div class="doodle-row1">' +
        '<div class="doodle-buttons">' +
          '<button type="button" class="doodle-mode is-on" id="doodlePenBtn" onclick="setDoodleTool(\'pen\')">🖌 画笔</button>' +
          '<button type="button" class="doodle-mode" id="doodleEraserBtn" onclick="setDoodleTool(\'eraser\')">🧽 橡皮</button>' +
        '</div>' +
        '<div class="doodle-actions">' +
          '<button type="button" class="ghost-btn" onclick="undoDoodle()">↩ 撤销</button>' +
          '<button type="button" class="ghost-btn" onclick="clearCanvas()">🗑 清空</button>' +
        '</div>' +
      '</div>' +
      '<div class="doodle-slatebar">' +
        '<span class="doodle-slate-label">颜色</span>' +
        '<div class="doodle-swatches">' + doodleSwatchesHTML() + '</div>' +
      '</div>' +
      '<div class="doodle-sizebar">' +
        '<span class="doodle-size-label">粗细</span>' +
        '<input type="range" id="drawSize" min="2" max="24" value="6" oninput="doodleSizeOut()">' +
        '<output id="doodleSizeOut" class="doodle-size-out"></output>' +
      '</div>' +
    '</div>' +
    '<canvas id="drawCanvas" width="720" height="760"></canvas>' +
    '<div class="doodle-subbar">' +
      '<div class="subtle">已保存 ' + (state.doodles || []).length + ' 张 · 自动存入相册「涂鸦板」</div>' +
      '<div class="doodle-actions">' +
        '<button type="button" class="ghost-btn" onclick="$(\'doodleBgFile\').click()">🖼 底图</button>' +
        '<button type="button" class="primary-btn" onclick="saveDoodle()">💾 保存</button>' +
      '</div>' +
    '</div>' +
    '<input type="file" id="doodleBgFile" accept="image/*" style="display:none" onchange="uploadDoodleBg(event)">' +
    '<input type="color" id="drawColor" value="#4f4f4f" style="position:absolute;visibility:hidden">' +
    '<div id="doodleGalleryWrap">' + doodleGalleryHTML() + '</div>' +
  '</div>';
  doodleSizeOut();
  initCanvas();
}

function doodleSwatchesHTML() {
  const pal = ['#4f4f4f', '#9aa0a6', '#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207', '#e2e8f0'];
  return pal.map(function(c, i) {
    return '<button type="button" class="doodle-swatch' + (i === 0 ? ' is-on' : '') + '" data-c="' + c + '" style="background:' + c + '" onclick="setDoodleColor(this,\'' + c + '\')" title="' + c + '"></button>';
  }).join('');
}

function doodleGalleryHTML() {
  const list = state.doodles || [];
  if (!list.length) return '';
  const tiles = list.slice(0, 9).map(function(d, i) {
    return '<div class="doodle-tile" onclick="openSavedDoodle(' + i + ')"><img src="' + d + '" alt="涂鸦"></div>';
  }).join('');
  return '<div class="doodle-gallery-title">最近涂鸦</div><div class="doodle-gallery">' + tiles + '</div>';
}

function refreshDoodleGallery() {
  const w = $('doodleGalleryWrap');
  if (w) w.innerHTML = doodleGalleryHTML();
}

function setDoodleTool(tool) {
  doodleTool = tool;
  const pb = $('doodlePenBtn'), eb = $('doodleEraserBtn');
  if (pb) pb.classList.toggle('is-on', tool === 'pen');
  if (eb) eb.classList.toggle('is-on', tool === 'eraser');
}

function setDoodleColor(btn, hex) {
  const cc = $('drawColor'); if (cc) cc.value = hex;
  const all = document.querySelectorAll('.doodle-swatch');
  for (var k = 0; k < all.length; k++) all[k].classList.remove('is-on');
  if (btn) btn.classList.add('is-on');
  if (doodleTool !== 'pen') setDoodleTool('pen');
}

function doodleSizeOut() {
  const s = $('drawSize'), o = $('doodleSizeOut');
  if (s && o) o.textContent = s.value;
}

function openSavedDoodle(i) {
  const list = state.doodles || [];
  if (!list[i]) return;
  const ov = document.createElement('div');
  ov.className = 'doodle-viewer';
  ov.innerHTML = '<img src="' + list[i] + '" alt="涂鸦">';
  ov.onclick = function() { ov.remove(); };
  document.body.appendChild(ov);
}
function uploadDoodleBg(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  compressPhoto(file).then(d => { doodleBg = d; initCanvas(); }).catch(err => alert('读取失败：' + err.message));
  event.target.value = '';
}
function initCanvas() {
  const canvas = $('drawCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';
  if (doodleBg) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); saveDoodleHistory(); };
    img.src = doodleBg;
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveDoodleHistory();
  }
  let drawing = false;
  let lastX = 0, lastY = 0;
  const pos = e => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: (p.clientX - r.left) * canvas.width / r.width, y: (p.clientY - r.top) * canvas.height / r.height };
  };
  const start = e => {
    drawing = true;
    const p = pos(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = doodleTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = doodleTool === 'eraser' ? '#ffffff' : $('drawColor').value;
    ctx.lineWidth = $('drawSize').value;
    e.preventDefault();
  };
  const move = e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(p.x, p.y);
    ctx.globalCompositeOperation = doodleTool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = doodleTool === 'eraser' ? '#ffffff' : $('drawColor').value;
    ctx.lineWidth = $('drawSize').value;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
    lastX = p.x; lastY = p.y;
    e.preventDefault();
  };
  const end = () => {
    if (drawing) { drawing = false; saveDoodleHistory(); }
  };
  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}
function saveDoodleHistory() {
  const canvas = $('drawCanvas');
  if (!canvas) return;
  const data = canvas.toDataURL('image/png');
  doodleHistoryIndex++;
  doodleHistory = doodleHistory.slice(0, doodleHistoryIndex);
  doodleHistory.push(data);
  if (doodleHistory.length > DOODLE_MAX_HISTORY) { doodleHistory.shift(); doodleHistoryIndex--; }
}
function undoDoodle() {
  if (doodleHistoryIndex > 0) {
    doodleHistoryIndex--;
    const canvas = $('drawCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => { ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
    img.src = doodleHistory[doodleHistoryIndex];
  } else if (doodleHistoryIndex === 0) {
    doodleHistoryIndex = -1;
    const canvas = $('drawCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
function clearCanvas() {
  doodleBg = null;
  const canvas = $('drawCanvas');
  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveDoodleHistory();
}
function saveDoodle() {
  try {
    const data = $('drawCanvas').toDataURL('image/png');
    state.doodles.unshift(data);
    let folder = state.albums.find(a => a.name === '涂鸦板');
    if (!folder) { folder = { id: 'a_doodle', name: '涂鸦板', photos: [] }; state.albums.push(folder); }
    folder.photos.unshift({ id: 'p' + Date.now(), url: data, caption: '涂鸦 ' + new Date().toLocaleDateString(), date: new Date().toLocaleDateString() });
    saveState();
    refreshDoodleGallery();
    alert('涂鸦已保存，并存入相册「涂鸦板」。');
  } catch (err) {
    alert('保存失败：画布可能包含跨域图片，请重试或清空后保存。');
  }
}

// ---------- 音乐 ----------
const MUS_EMOJIS = ['🎧', '🎹', '🎸', '🎷', '🥁', '🎻', '🪕', '🎺', '🎤', '💿', '📻', '🎼'];
const MUS_GRADS = [['#f953c6', '#b91d73'], ['#4facfe', '#00f2fe'], ['#f6d365', '#fda085'], ['#f5576c', '#f093fb'], ['#5b86e5', '#36d1dc'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#30cfd0', '#330867']];
const MUS_ICO = {
  prev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 6h2v12H6zM20 18l-8.5-6L20 6v12z"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6v12z"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
  loop: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
  single: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
  heartO: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-7.5-10a4.4 4.4 0 018-2.6 4.4 4.4 0 018 2.6c0 5.4-7.5 10-7.5 10z"/></svg>',
  heartF: '<svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M12 20.5s-7.5-4.6-7.5-10a4.4 4.4 0 018-2.6 4.4 4.4 0 018 2.6c0 5.4-7.5 10-7.5 10z"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};
let audioEl = null;
let currentSong = null;
let currentList = [];
let playing = false;
let playMode = 'loop';
let tickTimer = null;
let elapsed = 0;
let favView = false;
let musicAppOpen = false;
let onlineResults = [];
let searchKeyword = '';
let searching = false;
const NCM_BASE = 'https://yin-le-bu-shu.onrender.com';
let ncmUp = false;
let ncmProbedAt = 0;
let ncmCookie = '';
let ncmNick = '';
let ncmQrTimer = null;

const QQ_BASE = 'https://yin-le-bu-shu.onrender.com/qq';
let qqUp = false;
let qqCookie = '';
let qqNick = '';
let qqQrTimer = null;
let searchSrc = 'ncm';

function loadNcmState() {
  ncmCookie = state.settings.ncmCookie || '';
  ncmNick = state.settings.ncmNick || '';
}
function loadQqState() {
  qqCookie = state.settings.qqCookie || '';
  qqNick = state.settings.qqNick || '';
}
function maybeProbeNcm() {
  if (Date.now() - ncmProbedAt < 20000) return Promise.resolve(ncmUp);
  ncmProbedAt = Date.now();
  return fetch(NCM_BASE + '/banner?type=2', { signal: AbortSignal.timeout(3000) })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      ncmUp = !!(d && d.banners);
      if (musicAppOpen) renderMusic();
      return ncmUp;
    })
    .catch(function() {
      ncmUp = false;
      if (musicAppOpen) renderMusic();
      return false;
    });
}
function ncmSearch(kw) {
  return fetch(NCM_BASE + '/search?keywords=' + encodeURIComponent(kw) + '&limit=25&type=1', { signal: AbortSignal.timeout(8000) })
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(d) {
      const songs = (d.result && d.result.songs) || [];
      if (!songs.length) throw new Error('empty');
      return songs.map(function(s) {
        return {
          id: 'ncm-' + s.id,
          name: s.name || '',
          artist: (s.artists || []).map(function(a) { return a.name; }).join('/'),
          album: (s.album && s.album.name) || '',
          cover: '',
          ncmId: s.id,
          colors: MUS_GRADS[Math.floor(Math.random() * MUS_GRADS.length)],
          duration: Math.round((s.duration || 0) / 1000),
          online: true
        };
      }).filter(function(x) { return x.ncmId; });
    });
}
function ncmCovers(songs) {
  const ids = songs.map(function(s) { return s.ncmId; }).join(',');
  if (!ids) return Promise.resolve(songs);
  return fetch(NCM_BASE + '/song/detail?ids=' + ids, { signal: AbortSignal.timeout(8000) })
    .then(function(res) { return res.json(); })
    .then(function(d) {
      const map = {};
      (d.songs || []).forEach(function(s) {
        if (s.al && s.al.picUrl) {
          const p = s.al.picUrl;
          map[s.id] = p.indexOf('?param=') >= 0 ? p.replace(/=\d+y\d+/, '=500y500') : p + '?param=500y500';
        }
      });
      songs.forEach(function(s) { if (map[s.ncmId]) s.cover = map[s.ncmId]; });
      return songs;
    })
    .catch(function() { return songs; });
}
function ncmUrl(id) {
  const u = NCM_BASE + '/song/url/v1?id=' + id + '&level=exhigh' + (ncmCookie ? '&cookie=' + encodeURIComponent(ncmCookie) : '');
  return fetch(u, { signal: AbortSignal.timeout(15000) })
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(d) {
      const data = (d.data || [])[0] || {};
      if (!data.url || d.code !== 200) throw new Error('no-url');
      return data.url;
    });
}

let qqProbedAt = 0;
function maybeProbeQq() {
  if (Date.now() - qqProbedAt < 20000) return Promise.resolve(qqUp);
  qqProbedAt = Date.now();
  return fetch(QQ_BASE + '/qr?t=' + Date.now(), { signal: AbortSignal.timeout(8000) })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      qqUp = !!(d && d.result === 100 && d.img);
      if (musicAppOpen) renderMusic();
      return qqUp;
    })
    .catch(function() {
      qqUp = false;
      return false;
    });
}
function qqSearch(kw) {
  return fetch(QQ_BASE + '/search?key=' + encodeURIComponent(kw), { signal: AbortSignal.timeout(10000) })
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(d) {
      if (d.result !== 100 || !d.data || !d.data.length) throw new Error('empty');
      return d.data.map(function(s) {
        return {
          id: 'qq-' + s.songmid,
          name: s.name,
          artist: s.singer || '',
          album: s.album || '',
          cover: s.albummid ? 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + s.albummid + '.jpg' : '',
          qqmid: s.songmid,
          colors: MUS_GRADS[Math.floor(Math.random() * MUS_GRADS.length)],
          duration: s.interval || 0,
          online: true
        };
      });
    });
}
function qqUrl(song) {
  const u = QQ_BASE + '/url?id=' + song.qqmid + (qqCookie ? '&cookie=' + encodeURIComponent(qqCookie) : '');
  return fetch(u, { signal: AbortSignal.timeout(15000) })
    .then(function(res) {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(function(d) {
      if (d.result !== 100 || !d.data) throw new Error('no-url');
      return d.data;
    });
}

function songCoverHtml(s) {
  if (s && s.cover) return `<img src="${escapeHTML(s.cover)}" alt="">`;
  return escapeHTML((s && s.emoji) || '🎵');
}

function normSong(m) {
  if (!m.emoji) m.emoji = MUS_EMOJIS[Math.floor(Math.random() * MUS_EMOJIS.length)];
  if (!m.colors) m.colors = MUS_GRADS[Math.floor(Math.random() * MUS_GRADS.length)];
  m.artist = m.artist || '本地音乐';
  m.fav = !!m.fav;
  return m;
}
function getQueue() { return (state.music || []).map(normSong); }
function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function renderMusic() {
  if (!state.settings.musicMode) state.settings.musicMode = 'loop';
  playMode = state.settings.musicMode;
  maybeProbeNcm();
  maybeProbeQq();
  updateMiniPlayer();
  const q = getQueue();
  const list = favView ? q.filter(s => s.fav) : q;
  const cur = currentSong || q[0] || null;
  const playingThis = cur && currentSong && cur.id === currentSong.id && playing;
  const grad = cur ? `linear-gradient(135deg, ${cur.colors[0]}, ${cur.colors[1]})` : 'linear-gradient(135deg,#ffd9e8,#c9dcff)';
  const modeText = playMode === 'single' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环';
  const curDur = cur ? (cur.duration || 0) : 0;
  const pct = curDur ? Math.min(100, elapsed / curDur * 100) : 0;
  const curInQueue = cur && q.some(s => s.id === cur.id);
  const _mBg = 'linear-gradient(180deg,#f6efe2 0%,#f0e6d2 100%)';
  c().style.background = _mBg;
  const _mh = document.querySelector('.app-header');
  if (_mh) _mh.style.background = _mBg;
  const _mt = document.getElementById('m-tit');
  if (_mt) _mt.style.color = '#3f3a32';
  const _ma = document.querySelector('.header-action');
  if (_ma) _ma.style.color = '#6c7f57';
  c().innerHTML = `
    <div class="music-page">
      <div class="music-hero">
        <div class="m-hero-art" style="background:${grad}">${songCoverHtml(cur)}</div>
        <div class="m-hero-eyebrow"><span class="m-eq${playingThis ? '' : ' off'}"><span></span><span></span><span></span></span>${playingThis ? '正在播放' : (cur ? '待播放' : '音乐')}</div>
        <div class="m-hero-title">${cur ? escapeHTML(cur.name) : '还没有歌曲'}</div>
        <div class="m-hero-sub">${cur ? escapeHTML(cur.artist) + (cur.album ? ' · ' + escapeHTML(cur.album) : '') : (searchKeyword ? '输入关键词搜索全网歌曲' : '上传一首本地音乐，或搜索全网歌曲')}</div>
        <div class="progress-wrap">
          <div class="progress-track" id="musicTrack">
            <div class="progress-fill" id="musicProgressFill" style="width:${pct}%"></div>
            <div class="progress-dot" id="musicProgressDot" style="left:${pct}%"></div>
          </div>
          <div class="progress-time">
            <span id="musicElapsed">${fmtTime(elapsed)}</span>
            <span id="musicDuration">${fmtTime(curDur)}</span>
          </div>
        </div>
        <div class="music-controls">
          <button class="mus-mode" onclick="cycleMode()" title="${modeText}">${playMode === 'single' ? MUS_ICO.single : playMode === 'shuffle' ? MUS_ICO.shuffle : MUS_ICO.loop}<span>${modeText}</span></button>
          <button class="icon-btn mus-ctl" onclick="prevSong()" title="上一首">${MUS_ICO.prev}</button>
          <button class="mus-play" onclick="togglePlay()" title="播放/暂停">${playingThis ? MUS_ICO.pause : MUS_ICO.play}</button>
          <button class="icon-btn mus-ctl" onclick="nextSong(false)" title="下一首">${MUS_ICO.next}</button>
          ${curInQueue ? `<button class="icon-btn mus-fav ${cur.fav ? 'on' : ''}" onclick="toggleFav('${cur.id}')" title="收藏">${cur.fav ? MUS_ICO.heartF : MUS_ICO.heartO}</button>` : ''}
        </div>
      </div>
      ${searchSrc === 'qq' ? (qqUp ? (qqNick ? `<div class="ncm-pill" onclick="openQqLogin()">🎧 QQ音乐 ${escapeHTML(qqNick)} · 点此退出</div>` : `<div class="ncm-pill" onclick="openQqLogin()">🔑 登录 QQ音乐 · 解锁 VIP</div>`) : '') : (ncmUp ? (ncmNick ? `<div class="ncm-pill" onclick="openNcmLogin()">🎧 网易云 ${escapeHTML(ncmNick)} · 点此退出</div>` : `<div class="ncm-pill" onclick="openNcmLogin()">🔑 登录网易云 · 解锁 VIP 完整播放</div>`) : '')}
      <div class="mus-sheet">
        <div class="mus-tabs">
          <button class="mus-tab ${!favView && !searchKeyword ? 'on' : ''}" onclick="setFavView(false)">播放列表<span class="mus-cnt"> ${q.length}</span></button>
          <button class="mus-tab ${favView && !searchKeyword ? 'on' : ''}" onclick="setFavView(true)">我的收藏<span class="mus-cnt"> ${q.filter(s => s.fav).length}</span></button>
        </div>
        <div class="mus-searchbar">
          <input id="musicSearchInput" class="music-search" value="${escapeHTML(searchKeyword)}" placeholder="搜歌名 / 歌手" onkeydown="if(event.key==='Enter')searchMusic()">
          <button class="mus-search-go" onclick="searchMusic()">搜索</button>
          <div class="mus-srcswitch">
            <button class="mus-src ${searchSrc === 'ncm' ? 'on' : ''}" onclick="setSearchSrc('ncm')" title="网易云搜索">网易云</button>
            <button class="mus-src ${searchSrc === 'qq' ? 'on' : ''}" onclick="setSearchSrc('qq')" title="QQ音乐搜索">QQ</button>
          </div>
        </div>
        <div class="mus-toolrow">
          <span class="mus-listlabel">${searchKeyword ? '搜索结果' : (favView ? '我的收藏' : '全部歌曲')}</span>
          <span class="mus-listcount">${searchKeyword ? (searching ? '搜索中…' : onlineResults.length + ' 首') : list.length + ' 首'}</span>
          <input type="file" id="musicFile" accept="audio/*" style="display:none" onchange="uploadMusic(event)">
          <button class="music-upload" onclick="$('musicFile').click()">＋ 上传</button>
          ${searchKeyword ? '<button class="mus-clearsearch" onclick="clearSearch()">✕ 退出搜索</button>' : ''}
        </div>
        <div class="music-list">
          ${searchKeyword ? renderSearchList() : (list.length ? list.map(s => {
            const isCur = currentSong && currentSong.id === s.id;
            return `<div class="music-row ${isCur ? 'cur' : ''}" onclick="playSong(${getQueue().indexOf(s)})">
              <div class="music-mini" style="background:linear-gradient(135deg,${s.colors[0]},${s.colors[1]})">${songCoverHtml(s)}</div>
              <div class="music-info">
                <b>${escapeHTML(s.name)}</b>
                <span>${escapeHTML(s.artist)}${s.album ? ' · ' + escapeHTML(s.album) : ''}</span>
              </div>
              ${isCur && playing ? '<div class="eq"><span></span><span></span><span></span></div>' : ''}
              <button class="fav-heart ${s.fav ? 'on' : ''}" onclick="event.stopPropagation();toggleFav('${s.id}')">${s.fav ? MUS_ICO.heartF : MUS_ICO.heartO}</button>
            </div>`;
          }).join('') : '<div class="music-empty"><span class="empty-ico">🎵</span>' + (favView ? '还没有收藏的歌，去收藏几首吧' : '歌单还是空的，点「＋ 上传」或搜索全网歌曲') + '</div>')}
        </div>
      </div>
    </div>
    <div style="height:10px"></div>`;
  (function() {
    const t = $('musicTrack');
    if (!t) return;
    let dragging = false;
    t.addEventListener('pointerdown', function(e) { dragging = true; seekLive(e); try { t.setPointerCapture(e.pointerId); } catch (err) {} });
    t.addEventListener('pointermove', function(e) { if (dragging) seekLive(e); });
    t.addEventListener('pointerup', function(e) { if (!dragging) return; dragging = false; seekCommit(e); });
    t.addEventListener('pointercancel', function() { dragging = false; });
  })();
  updateProgress();
}

function renderSearchList() {
  if (searching) return '<div class="music-empty">正在搜索“' + escapeHTML(searchKeyword) + '”…</div>';
  if (!onlineResults.length) return '<div class="music-empty">搜“' + escapeHTML(searchKeyword) + '”没找到，换个关键词试试</div>';
  return onlineResults.map((s, i) => {
    const isCur = currentSong && currentSong.id === s.id;
    return `<div class="music-row ${isCur ? 'cur' : ''}" onclick="playSearch(${i})">
      <div class="music-mini" style="background:linear-gradient(135deg,${s.colors[0]},${s.colors[1]})">${songCoverHtml(s)}</div>
      <div class="music-info">
        <b>${escapeHTML(s.name)}</b>
        <span>${escapeHTML(s.artist)}${s.album ? ' · ' + escapeHTML(s.album) : ''} · ${(s.ncmId || s.qqmid) ? '全曲' : '预览30s'}</span>
      </div>
      ${isCur && playing ? '<div class="eq"><span></span><span></span><span></span></div>' : ''}
    </div>`;
  }).join('');
}

async function searchMusic() {
  const inp = $('musicSearchInput');
  const kw = inp ? inp.value.trim() : '';
  if (!kw) { searchKeyword = ''; onlineResults = []; renderMusic(); return; }
  searchKeyword = kw;
  onlineResults = [];
  searching = true;
  renderMusic();
  let tracks = [];
  try {
    if (searchSrc === 'qq') {
      try {
        tracks = await qqSearch(kw);
        qqUp = true;
      } catch (e) {
        qqUp = false;
        tracks = [];
      }
    } else {
      try {
        tracks = await ncmSearch(kw);
        ncmUp = true;
        await ncmCovers(tracks);
      } catch (e) {
        ncmUp = false;
        tracks = [];
      }
      if (!tracks.length) {
        try {
          tracks = await qqSearch(kw);
          qqUp = true;
        } catch (e) {
          tracks = [];
        }
      }
    }
    if (!tracks.length) {
      try {
        const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(kw) + '&entity=song&country=cn&limit=25';
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(res.status);
        const data = await res.json();
        tracks = (data.results || []).filter(t => t.previewUrl).map(t => ({
          id: 'ol-' + t.trackId,
          name: t.trackName,
          artist: t.artistName,
          album: t.collectionName,
          cover: (t.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
          previewUrl: t.previewUrl,
          colors: MUS_GRADS[Math.floor(Math.random() * MUS_GRADS.length)],
          duration: 30,
          online: true
        }));
      } catch (e) {
        tracks = [];
      }
    }
  } finally {
    searching = false;
    onlineResults = tracks;
    renderMusic();
  }
  if (!onlineResults.length) alert('搜索失败，请检查网络连接后重试。');
}

function clearSearch() {
  searchKeyword = '';
  onlineResults = [];
  searching = false;
  if (currentSong && currentSong.online) stopMusic(); else renderMusic();
}

async function openNcmLogin() {
  if (!ncmUp) {
    alert('本机网易云助手未启动。\n\n请双击打开 server 文件夹里的「启动网易云音乐助手.bat」，等出现「已启动」后，再点这里登录。');
    return;
  }
  if (ncmNick) {
    if (!await uiConfirm('已登录网易云：' + ncmNick + '。要退出登录吗？')) return;
    ncmCookie = ''; ncmNick = '';
    state.settings.ncmCookie = ''; state.settings.ncmNick = '';
    saveState();
    renderMusic(); updateMiniPlayer();
    return;
  }
  const phone = document.querySelector('.phone') || document.body;
  if ($('ncmLoginMask')) $('ncmLoginMask').remove();
  if ($('qqLoginMask')) $('qqLoginMask').remove();
  if (ncmQrTimer) { clearTimeout(ncmQrTimer); ncmQrTimer = null; }
  if (qqQrTimer) { clearTimeout(qqQrTimer); qqQrTimer = null; }
  const mask = document.createElement('div');
  mask.className = 'ncm-login-mask';
  mask.id = 'ncmLoginMask';
  mask.innerHTML = `
    <div class="ncm-login-box">
      <b>登录网易云</b>
      <div class="ncm-qr" id="ncmQr">正在获取二维码…</div>
      <p class="ncm-qr-status" id="ncmQrStatus">用手机网易云 App 扫码并点击确认</p>
      <button class="music-tab" onclick="closeNcmLogin()">关闭</button>
    </div>`;
  phone.appendChild(mask);
  ncmQrStep();
}

function closeNcmLogin() {
  const m = $('ncmLoginMask');
  if (m) m.remove();
  if (ncmQrTimer) { clearTimeout(ncmQrTimer); ncmQrTimer = null; }
}

async function ncmQrStep() {
  try {
    const keyRes = await fetch(NCM_BASE + '/login/qr/key?timestamp=' + Date.now(), { signal: AbortSignal.timeout(10000) });
    const keyData = await keyRes.json();
    const key = keyData && keyData.data && keyData.data.unikey;
    if (!key) throw new Error('no-key');
    const crRes = await fetch(NCM_BASE + '/login/qr/create?key=' + encodeURIComponent(key) + '&qrimg=1&timestamp=' + Date.now(), { signal: AbortSignal.timeout(10000) });
    const crData = await crRes.json();
    const qr = crData && crData.data && crData.data.qrimg;
    const qrEl = $('ncmQr');
    if (qr && qrEl) {
      qrEl.innerHTML = '<img src="' + qr + '" alt="二维码">';
    } else {
      const st = $('ncmQrStatus');
      if (st) st.textContent = '二维码获取失败，请重试';
      return;
    }
    ncmQrPoll(key);
  } catch (e) {
    const st = $('ncmQrStatus');
    if (st) st.textContent = '获取二维码失败：请确认本机助手已启动';
  }
}

function ncmQrPoll(key) {
  if (!$('ncmLoginMask')) return;
  ncmQrTimer = null;
  fetch(NCM_BASE + '/login/qr/check?key=' + encodeURIComponent(key) + '&t=' + Date.now(), { signal: AbortSignal.timeout(10000) })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!$('ncmLoginMask')) return;
      const st = $('ncmQrStatus');
      if (d.code === 800) { if (st) st.textContent = '二维码已过期，请关闭后重试'; return; }
      if (d.code === 801) { if (st) st.textContent = '等待扫码…'; ncmQrTimer = setTimeout(function() { ncmQrPoll(key); }, 1500); return; }
      if (d.code === 802) { if (st) st.textContent = '已扫码，请在手机上点击确认'; ncmQrTimer = setTimeout(function() { ncmQrPoll(key); }, 1500); return; }
      if (d.code === 803) {
        ncmCookie = d.cookie || ncmCookie;
        ncmNick = d.nickname || '';
        if (ncmNick) { finishNcmLogin(); return; }
        return fetch(NCM_BASE + '/user/account?cookie=' + encodeURIComponent(ncmCookie), { signal: AbortSignal.timeout(10000) })
          .then(function(r) { return r.json(); })
          .then(function(ac) { ncmNick = (ac.profile && ac.profile.nickname) || '网易云用户'; finishNcmLogin(); })
          .catch(function() { ncmNick = '网易云用户'; finishNcmLogin(); });
      }
      if (st) st.textContent = '登录状态未知，请重试';
    })
    .catch(function() {
      if (!$('ncmLoginMask')) return;
      const st = $('ncmQrStatus');
      if (st) st.textContent = '网络错误：请确认本机助手已启动';
    });
}

function finishNcmLogin() {
  state.settings.ncmCookie = ncmCookie;
  state.settings.ncmNick = ncmNick || '网易云用户';
  saveState();
  closeNcmLogin();
  renderMusic();
  updateMiniPlayer();
  alert('登录成功：' + (ncmNick || '网易云用户') + '\nVIP 歌曲现在可以完整播放了');
}

function setSearchSrc(s) {
  searchSrc = s === 'qq' ? 'qq' : 'ncm';
  if (searchKeyword) searchMusic(); else renderMusic();
}

async function openQqLogin() {
  if (qqNick) {
    if (!await uiConfirm('已登录QQ音乐：' + qqNick + '。要退出登录吗？')) return;
    qqCookie = ''; qqNick = '';
    state.settings.qqCookie = ''; state.settings.qqNick = '';
    saveState();
    renderMusic(); updateMiniPlayer();
    return;
  }
  const phone = document.querySelector('.phone') || document.body;
  if ($('ncmLoginMask')) $('ncmLoginMask').remove();
  if ($('qqLoginMask')) $('qqLoginMask').remove();
  if (ncmQrTimer) { clearTimeout(ncmQrTimer); ncmQrTimer = null; }
  if (qqQrTimer) { clearTimeout(qqQrTimer); qqQrTimer = null; }
  const mask = document.createElement('div');
  mask.className = 'ncm-login-mask';
  mask.id = 'qqLoginMask';
  mask.innerHTML = `
    <div class="ncm-login-box">
      <b>登录QQ音乐</b>
      <div class="ncm-qr" id="qqQr">正在获取二维码…</div>
      <p class="ncm-qr-status" id="qqQrStatus">请用<strong>手机 QQ</strong> 扫（不要用 QQ音乐 App / 微信 / 相机，否则会跳到下载页）</p>
      <button class="music-tab" onclick="closeQqLogin()">关闭</button>
    </div>`;
  phone.appendChild(mask);
  qqQrStep();
}

function closeQqLogin() {
  const m = $('qqLoginMask');
  if (m) m.remove();
  if (qqQrTimer) { clearTimeout(qqQrTimer); qqQrTimer = null; }
}

async function qqQrStep() {
  try {
    const res = await fetch(QQ_BASE + '/qr?t=' + Date.now(), { signal: AbortSignal.timeout(15000) });
    const d = await res.json();
    if (d.result !== 100 || !d.qrsig || !d.img) throw new Error('no-qr');
    const qrEl = $('qqQr');
    if (qrEl) qrEl.innerHTML = '<img src="' + d.img + '" alt="二维码">';
    qqQrPoll(d.qrsig, d.ptqrtoken);
  } catch (e) {
    const st = $('qqQrStatus');
    if (st) st.textContent = '获取二维码失败，请重试';
  }
}

function qqQrPoll(qrsig, ptqrtoken) {
  if (!$('qqLoginMask')) return;
  qqQrTimer = null;
  fetch(QQ_BASE + '/check?qrsig=' + encodeURIComponent(qrsig) + '&ptqrtoken=' + encodeURIComponent(ptqrtoken) + '&t=' + Date.now(), { signal: AbortSignal.timeout(15000) })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!$('qqLoginMask')) return;
      const st = $('qqQrStatus');
      if (d.result !== 100) { if (st) st.textContent = '登录请求失败，请重试'; return; }
      if (!d.isOk) {
        if (d.refresh) { if (st) st.textContent = '二维码已失效，请关闭后重试'; return; }
        if (st) st.textContent = d.message || '等待扫码…';
        qqQrTimer = setTimeout(function() { qqQrPoll(qrsig, ptqrtoken); }, 1500);
        return;
      }
      qqCookie = d.cookie || qqCookie;
      qqNick = d.nick || 'QQ音乐用户';
      finishQqLogin();
    })
    .catch(function() {
      if (!$('qqLoginMask')) return;
      const st = $('qqQrStatus');
      if (st) st.textContent = '网络错误，请重试';
    });
}

function finishQqLogin() {
  state.settings.qqCookie = qqCookie;
  state.settings.qqNick = qqNick || 'QQ音乐用户';
  saveState();
  closeQqLogin();
  renderMusic();
  updateMiniPlayer();
  alert('登录成功：' + (qqNick || 'QQ音乐用户') + '\nVIP 歌曲现在可以完整播放了');
}

function updateProgress() {
  const cur = currentSong;
  if (!cur) return;
  const dur = cur.duration || 0;
  const pct = dur ? Math.min(100, elapsed / dur * 100) : 0;
  const fill = $('musicProgressFill'); if (fill) fill.style.width = pct + '%';
  const dot = $('musicProgressDot'); if (dot) dot.style.left = pct + '%';
  const el = $('musicElapsed'); if (el) el.textContent = fmtTime(elapsed);
  const du = $('musicDuration'); if (du) du.textContent = fmtTime(dur);
}
function trackRatio(e) {
  const t = $('musicTrack');
  if (!t) return 0;
  const r = t.getBoundingClientRect();
  return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
}
function seekLive(e) {
  if (!currentSong) return;
  const dur = currentSong.duration || 0;
  elapsed = trackRatio(e) * dur;
  updateProgress();
}
function seekCommit(e) {
  if (!currentSong) return;
  if (audioEl && isFinite(audioEl.duration)) {
    audioEl.currentTime = trackRatio(e) * audioEl.duration;
    elapsed = audioEl.currentTime;
  }
  updateProgress();
}
function setFavView(v) { favView = !!v; renderMusic(); }
function toggleFav(id) {
  const s = getQueue().find(x => x.id === id);
  if (!s) return;
  s.fav = !s.fav;
  saveState();
  renderMusic();
  updateMiniPlayer();
}
function cycleMode() {
  playMode = playMode === 'loop' ? 'single' : playMode === 'single' ? 'shuffle' : 'loop';
  state.settings.musicMode = playMode;
  saveState();
  renderMusic();
}
function playSong(index) {
  const q = getQueue();
  if (!q.length) return;
  index = ((index % q.length) + q.length) % q.length;
  playTrack(q[index], q);
}
function playSearch(index) {
  const list = onlineResults;
  if (!list.length || !list[index]) return;
  playTrack(list[index], list);
}
function playTrack(song, list) {
  if (!song) return;
  if (currentSong && currentSong.id === song.id) { if (!playing) resumeSong(); return; }
  stopAudio();
  currentSong = song;
  currentList = list;
  elapsed = 0;
  playing = true;
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.onended = function() { nextSong(true); };
    document.querySelector('.phone').appendChild(audioEl);
  }
  audioEl.onloadedmetadata = function() { song.duration = audioEl.duration || (song.online ? 30 : 0); updateProgress(); };
  applySource(song).then(function() {
    audioEl.currentTime = 0;
    audioEl.play().catch(function() { playing = false; updateMiniPlayer(); alert('播放失败：网络歌曲可能无法播放，换个试试'); });
    startTick();
    renderMusic();
    updateMiniPlayer();
  }).catch(function() {
    playing = false;
    renderMusic();
    updateMiniPlayer();
    alert('无法获取这首歌曲的音频。');
  });
}
function applySource(song) {
  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.onended = function() { nextSong(true); };
    document.querySelector('.phone').appendChild(audioEl);
  }
  if (song.online) {
    if (song.ncmId) {
      return ncmUrl(song.ncmId).then(function(url) {
        song.playUrl = url;
        audioEl.src = url;
      });
    }
    if (song.qqmid) {
      return qqUrl(song).then(function(url) {
        song.playUrl = url;
        audioEl.src = url;
      });
    }
    audioEl.src = song.previewUrl;
    return Promise.resolve();
  }
  return getMusicBlob(song.id).then(function(url) {
    if (!url) throw new Error('no-blob');
    audioEl.src = url;
  });
}
function togglePlay() {
  if (!currentSong) { const q = getQueue(); if (q.length) playSong(0); return; }
  if (playing) pauseSong(); else resumeSong();
}
function pauseSong() {
  playing = false;
  stopTick();
  if (audioEl) audioEl.pause();
  renderMusic(); updateMiniPlayer();
}
function resumeSong() {
  playing = true;
  if (audioEl) { audioEl.play().catch(function() {}); }
  startTick();
  renderMusic(); updateMiniPlayer();
}
function stopAudio() {
  stopTick();
  if (audioEl) { audioEl.pause(); audioEl.src = ''; }
  playing = false;
}
function stopMusic() {
  stopAudio();
  currentSong = null;
  currentList = [];
  elapsed = 0;
  renderMusic();
  updateMiniPlayer();
}
function startTick() {
  stopTick();
  tickTimer = setInterval(tick, 250);
}
function stopTick() { if (tickTimer) { clearInterval(tickTimer); tickTimer = null; } }
function tick() {
  const song = currentSong;
  if (!song || !playing) return;
  if (audioEl && isFinite(audioEl.duration)) {
    elapsed = audioEl.currentTime;
  }
  updateProgress();
}
function nextSong(auto) {
  const list = currentList.length ? currentList : getQueue();
  if (!list.length) return;
  if (playMode === 'single' && auto) { restartCurrent(); return; }
  let i = currentSong ? list.findIndex(s => s.id === currentSong.id) : 0;
  if (i < 0) i = 0;
  let ni;
  if (playMode === 'shuffle') { ni = Math.floor(Math.random() * list.length); if (list.length > 1) while (ni === i) ni = Math.floor(Math.random() * list.length); }
  else ni = (i + 1) % list.length;
  playTrack(list[ni], list);
}
function restartCurrent() {
  if (!currentSong) return;
  stopTick();
  playing = true;
  if (audioEl && audioEl.src) {
    elapsed = 0;
    audioEl.currentTime = 0;
    audioEl.play().catch(function() {});
  } else {
    applySource(currentSong).then(function() {
      audioEl.currentTime = 0;
      audioEl.play().catch(function() {});
    }).catch(function() {});
  }
  startTick();
  renderMusic(); updateMiniPlayer();
}
function prevSong() {
  const list = currentList.length ? currentList : getQueue();
  if (!list.length) return;
  let i = currentSong ? list.findIndex(s => s.id === currentSong.id) : 0;
  if (i < 0) i = 0;
  playTrack(list[(i - 1 + list.length) % list.length], list);
}
function uploadMusic(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('audio/')) return alert('请选择音频文件');
  const reader = new FileReader();
  reader.onload = async () => {
    const name = await uiPrompt('歌曲命名：', file.name.replace(/\.[^.]+$/, ''));
    if (name === null) return;
    const id = 'm' + Date.now();
    putMusicBlob(id, reader.result).then(() => {
      state.music.unshift({ id, name: name.trim() || file.name, artist: '本地音乐', emoji: MUS_EMOJIS[Math.floor(Math.random() * MUS_EMOJIS.length)], colors: MUS_GRADS[Math.floor(Math.random() * MUS_GRADS.length)], fav: false, date: new Date().toLocaleDateString() });
      saveState(); renderMusic(); updateMiniPlayer();
    }).catch(() => alert('音频存储失败（IndexedDB 不可用）'));
  };
  reader.onerror = () => alert('读取失败');
  reader.readAsDataURL(file);
  event.target.value = '';
}
async function renameMusic(id) {
  const m = state.music.find(x => x.id === id);
  if (!m) return;
  const name = await uiPrompt('歌曲命名：', m.name);
  if (name) { m.name = name.trim(); saveState(); renderMusic(); updateMiniPlayer(); }
}
async function deleteMusic(id) {
  if (!await uiConfirm('删除这首音乐？')) return;
  state.music = state.music.filter(x => x.id !== id);
  await deleteMusicBlob(id);
  if (currentSong && currentSong.id === id) { stopAudio(); currentSong = null; elapsed = 0; }
  saveState(); renderMusic(); updateMiniPlayer();
}
function ensureMiniPlayer() {
  let mp = $('globalMiniPlayer');
  if (mp) return mp;
  mp = document.createElement('div');
  mp.id = 'globalMiniPlayer';
  mp.innerHTML = `
    <div class="gmp-cover" id="gmpCover">🎵</div>
    <div class="gmp-info" onclick="openApp('音乐')">
      <b id="gmpName"></b>
      <span id="gmpArtist"></span>
    </div>
    <button class="gmp-btn" onclick="prevSong()" title="上一首">${MUS_ICO.prev}</button>
    <button class="gmp-btn gmp-play" id="gmpPlay" onclick="togglePlay()">${MUS_ICO.play}</button>
    <button class="gmp-btn" onclick="nextSong(false)" title="下一首">${MUS_ICO.next}</button>
    <button class="gmp-close" onclick="stopMusic()" title="关闭">${MUS_ICO.close}</button>`;
  const phone = document.querySelector('.phone') || document.body;
  phone.appendChild(mp);
  return mp;
}
function updateMiniPlayer() {
  const mp = ensureMiniPlayer();
  const show = !!(currentSong && !musicAppOpen);
  mp.style.display = show ? 'flex' : 'none';
  if (!currentSong) return;
  $('gmpCover').innerHTML = songCoverHtml(currentSong);
  $('gmpCover').style.background = 'linear-gradient(135deg,' + currentSong.colors[0] + ',' + currentSong.colors[1] + ')';
  $('gmpName').textContent = currentSong.name;
  $('gmpArtist').textContent = currentSong.artist + (currentSong.online ? ' · ' + ((currentSong.ncmId || currentSong.qqmid) ? '全曲' : '预览') : '');
  $('gmpPlay').innerHTML = playing ? MUS_ICO.pause : MUS_ICO.play;
}


// ---------- 相册 ----------
let currentAlbumId = null;

function renderAlbum() {
  if (currentAlbumId) return renderAlbumPhotos(currentAlbumId);
  const albums = state.albums;
  c().innerHTML = `
    <div class="stack">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <h2 class="section-title" style="margin:0">🖼 相册（${albums.length}）</h2>
        <button class="icon-btn" style="width:34px;height:34px;font-size:20px;background:var(--qq-grad);color:#fff;border-radius:50%" onclick="newAlbum()">＋</button>
      </div>
      <div class="album-grid">
        ${albums.map(a => `
          <div class="photo-tile" onclick="openAlbum('${a.id}')">
            ${a.photos.length ? `<img src="${escapeHTML(a.photos[0].url)}" alt="">` : `<div style="height:100%;display:grid;place-items:center;font-size:40px;background:rgba(0,0,0,.05)">📁</div>`}
            <button class="icon-btn" style="position:absolute;top:6px;right:6px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();renameAlbum('${a.id}')">✎</button>
            <button class="icon-btn" style="position:absolute;top:6px;right:38px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();delAlbum('${a.id}')">✕</button>
            <p>${escapeHTML(a.name)}<br><span class="subtle">${a.photos.length} 张</span></p>
          </div>`).join('')}
      </div>
      ${albums.length === 0 ? `<div class="card subtle" style="text-align:center">还没有相册夹，点右上角 ＋ 新建</div>` : ''}
    </div>`;
}
function openAlbum(id) { currentAlbumId = id; renderAlbum(); }
async function newAlbum() {
  const name = await uiPrompt('相册夹名称：');
  if (!name) return;
  state.albums.push({ id: 'a' + Date.now(), name: name.trim(), photos: [] });
  saveState(); renderAlbum();
}
async function renameAlbum(id) {
  const a = state.albums.find(x => x.id === id); if (!a) return;
  const name = await uiPrompt('重命名相册夹：', a.name);
  if (name) { a.name = name.trim(); saveState(); renderAlbum(); }
}
async function delAlbum(id) {
  if (!await uiConfirm('删除该相册夹及其所有照片？')) return;
  state.albums = state.albums.filter(x => x.id !== id);
  if (currentAlbumId === id) currentAlbumId = null;
  saveState(); renderAlbum();
}
function renderAlbumPhotos(id) {
  const a = state.albums.find(x => x.id === id); if (!a) return;
  c().innerHTML = `
    <div class="stack">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <button class="ghost-btn" onclick="currentAlbumId=null;renderAlbum()">← 返回</button>
        <h2 class="section-title" style="margin:0">${escapeHTML(a.name)}（${a.photos.length}）</h2>
        <button class="icon-btn" style="width:34px;height:34px;font-size:20px;background:var(--qq-grad);color:#fff;border-radius:50%" onclick="toggleAlbumUpload()">＋</button>
      </div>
      <div id="albumUpload" style="display:none" class="card">
        <input class="field" id="photoUrl" placeholder="图片 URL（可选）">
        <input class="field" id="photoCaption" placeholder="照片命名（可选）" style="margin-top:8px">
        <input type="file" id="photoFile" accept="image/*" style="display:none" onchange="uploadPhoto(event)">
        <div class="grid2" style="margin-top:8px">
          <button class="ghost-btn" onclick="$('photoFile').click()">📁 本地选图</button>
          <button class="ghost-btn" onclick="capturePhoto()">📷 拍照</button>
          <button class="primary-btn" onclick="addPhoto()">添加</button>
        </div>
      </div>
      <div class="album-grid">
        ${a.photos.map((p, i) => `
          <div class="photo-tile">
            <img src="${escapeHTML(p.url)}" alt="" onclick="viewPhoto('${encodeURIComponent(p.url)}')">
            <button class="icon-btn" style="position:absolute;top:6px;right:6px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();renamePhoto('${a.id}',${i})">✎</button>
            <button class="icon-btn" style="position:absolute;top:6px;right:38px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();copyPhoto('${a.id}',${i})">⧉</button>
            <button class="icon-btn" style="position:absolute;top:6px;right:70px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();movePhoto('${a.id}',${i})">➡</button>
            <button class="icon-btn" style="position:absolute;top:6px;right:102px;width:26px;height:26px;font-size:12px;background:rgba(255,255,255,.85)" onclick="event.stopPropagation();deletePhoto('${a.id}',${i})">✕</button>
            <p>${escapeHTML(p.caption || '照片')}${p.date ? `<br><span class="subtle">${p.date}</span>` : ''}</p>
          </div>`).join('')}
      </div>
      ${a.photos.length === 0 ? `<div class="card subtle" style="text-align:center">还没有照片，点右上角 ＋ 添加或拍照</div>` : ''}
    </div>
    <div id="photoOverlay" onclick="this.style.display='none'" style="display:none;position:absolute;inset:0;background:rgba(0,0,0,.82);z-index:2000;place-items:center;padding:20px">
      <img id="photoOverlayImg" src="" style="max-width:100%;max-height:80%;border-radius:14px">
    </div>`;
}
function toggleAlbumUpload() {
  const box = $('albumUpload');
  if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
}
function addPhoto() {
  const url = $('photoUrl').value.trim();
  if (!url) return alert('请先粘贴图片 URL，或点「本地选图 / 拍照」');
  const a = state.albums.find(x => x.id === currentAlbumId);
  a.photos.unshift({ id: 'p' + Date.now(), url, caption: $('photoCaption').value.trim(), date: new Date().toLocaleDateString() });
  saveState(); renderAlbum();
}
function uploadPhoto(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return alert('请选择图片文件');
  compressPhoto(file).then(dataUrl => {
    const a = state.albums.find(x => x.id === currentAlbumId);
    a.photos.unshift({ id: 'p' + Date.now(), url: dataUrl, caption: $('photoCaption').value.trim(), date: new Date().toLocaleDateString() });
    saveState(); renderAlbum();
  }).catch(err => alert('读取失败：' + err.message));
  event.target.value = '';
}
function capturePhoto() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    compressPhoto(f).then(d => {
      const a = state.albums.find(x => x.id === currentAlbumId);
      a.photos.unshift({ id: 'p' + Date.now(), url: d, caption: $('photoCaption').value.trim(), date: new Date().toLocaleDateString() });
      saveState(); renderAlbum();
    }).catch(err => alert('读取失败：' + err.message));
  };
  inp.click();
}
function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('无法读取'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片格式不支持'));
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function deletePhoto(albumId, idx) {
  const a = state.albums.find(x => x.id === albumId); if (!a || !a.photos[idx]) return;
  if (!await uiConfirm('删除这张照片？')) return;
  a.photos.splice(idx, 1);
  saveState(); renderAlbum();
}
async function renamePhoto(albumId, idx) {
  const a = state.albums.find(x => x.id === albumId); if (!a || !a.photos[idx]) return;
  const name = await uiPrompt('照片命名：', a.photos[idx].caption);
  if (name !== null) { a.photos[idx].caption = name.trim(); saveState(); renderAlbum(); }
}
async function copyPhoto(albumId, idx) {
  const a = state.albums.find(x => x.id === albumId); if (!a || !a.photos[idx]) return;
  const target = await uiPrompt('复制到哪个相册夹？（输入名称，不存在将新建）', a.name);
  if (!target) return;
  let t = state.albums.find(x => x.name === target.trim());
  if (!t) { t = { id: 'a' + Date.now(), name: target.trim(), photos: [] }; state.albums.push(t); }
  t.photos.unshift(Object.assign({}, a.photos[idx], { id: 'p' + Date.now() }));
  saveState(); renderAlbum();
}
async function movePhoto(albumId, idx) {
  const a = state.albums.find(x => x.id === albumId); if (!a || !a.photos[idx]) return;
  const target = await uiPrompt('移动到哪个相册夹？（输入名称）', a.name);
  if (!target) return;
  let t = state.albums.find(x => x.name === target.trim());
  if (!t) { t = { id: 'a' + Date.now(), name: target.trim(), photos: [] }; state.albums.push(t); }
  t.photos.unshift(a.photos.splice(idx, 1)[0]);
  saveState(); renderAlbum();
}
function viewPhoto(enc) {
  const overlay = $('photoOverlay');
  if (!overlay) return;
  $('photoOverlayImg').src = decodeURIComponent(enc);
  overlay.style.display = 'grid';
}

// ---------- 许愿柳 · 开屏动画（塔罗占卜内容已移除，仅保留雾化扭曲转场） ----------

var _willowFogShown = false;
function showWillowPortal() {
  // 柳枝 + 金色裂缝
  var branchSvg = '<svg viewBox="0 0 160 220" width="150" height="206">' +
    '<defs><radialGradient id="crackGlow" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="#ffe9a8"/><stop offset="60%" stop-color="#ffc95e" stop-opacity=".55"/><stop offset="100%" stop-color="#ffc95e" stop-opacity="0"/>' +
    '</radialGradient></defs>' +
    '<g stroke="#7c5326" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M80 6 Q 77 70 80 120 Q 84 180 74 214" stroke-width="11"/>' +
      '<path d="M80 88 Q 68 76 54 70" stroke-width="5"/>' +
      '<path d="M81 132 Q 96 118 114 112" stroke-width="5"/>' +
      '<path d="M79 62 Q 90 52 104 54" stroke-width="4"/>' +
    '</g>' +
    '<g id="leafG" fill="#6f8f3f">' +
      '<ellipse cx="103" cy="110" rx="9" ry="4.5" transform="rotate(-20 103 110)"/>' +
      '<ellipse cx="117" cy="110" rx="8" ry="4" transform="rotate(-34 117 110)"/>' +
      '<ellipse cx="54" cy="67" rx="8" ry="4" transform="rotate(24 54 67)"/>' +
      '<ellipse cx="78" cy="52" rx="8" ry="4" transform="rotate(-8 78 52)"/>' +
      '<ellipse cx="106" cy="53" rx="7" ry="3.6" transform="rotate(-30 106 53)"/>' +
    '</g>' +
    '<g id="crackWrap" opacity="0" transform="translate(80 148) scale(0)">' +
      '<circle cx="0" cy="0" r="40" fill="url(#crackGlow)"/>' +
      '<path d="M-40 0 L-18 -12 L-4 2 L18 -14 L42 0" stroke="#ffd06b" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M-18 -12 l-5 -12" stroke="#ffd06b" stroke-width="2"/>' +
      '<path d="M-4 2 l4 10" stroke="#ffd06b" stroke-width="2"/>' +
      '<path d="M18 -14 l9 -11" stroke="#ffd06b" stroke-width="2"/>' +
      '<path d="M-28 -2 l6 -5" stroke="#ffd06b" stroke-width="1.5"/>' +
    '</g>' +
    '</svg>';

  var d = document.createElement('div');
  d.id = 'willowPortal';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none';
  var particles = '';
  for (var i = 0; i < 14; i++) {
    var e = ['✨','·','✦','🌫️'][i % 4];
    particles += '<span class="wp-spark" style="left:' + (Math.random() * 94 + 3).toFixed(0) + '%;top:' + (Math.random() * 90 + 5).toFixed(0) + '%;animation-delay:' + (0.2 + Math.random() * 0.9).toFixed(2) + 's">' + e + '</span>';
  }
  d.innerHTML =
    '<div class="wp-fog" id="wpFog"></div>' +
    '<div class="wp-mist wp-mist1"></div>' +
    '<div class="wp-mist wp-mist2"></div>' +
    '<div class="wp-mist wp-mist3"></div>' +
    '<div class="wp-glow"><span class="wp-glow-pulse"></span></div>' +
    '<div class="wp-warm" id="wpWarm"></div>' +
    '<div class="wp-sparks">' + particles + '</div>' +
    '<div class="wp-branch" id="wpBranch">' + branchSvg + '</div>' +
    '<div class="wp-text" id="wpText">折断 · 许一个愿</div>' +
    '<div class="wp-burst" id="wpBurst"></div>';
  document.body.appendChild(d);

  // 折断迸散的金屑
  var burstEl = d.querySelector('#wpBurst');
  var burstParts = [];
  for (var bi0 = 0; bi0 < 12; bi0++) {
    var bp = document.createElement('span');
    bp.className = 'wp-bpart';
    bp.style.left = '50%';
    bp.style.top = '46%';
    bp.style.background = (bi0 % 2 === 0) ? '#ffd06b' : '#9ab459';
    burstEl.appendChild(bp);
    burstParts.push({ el: bp, ang: (bi0 / 12) * Math.PI * 2 + Math.random() * 0.6, sp: 42 + Math.random() * 58, size: 3 + Math.random() * 4 });
  }

  var step = 0;
  var appOpened = false;
  var snapped = false;
  var leafData = null;
  var timer = setInterval(function () {
    step++;
    if (step >= 48) { clearInterval(timer); cleanup(); return; }

    var branch = $('wpBranch');
    var fog = $('wpFog');
    var text = $('wpText');
    var warm = $('wpWarm');
    var crack = d.querySelector('#crackWrap');
    var leafG = d.querySelector('#leafG');
    var portal = d;
    var k, t2, p3;

    if (step <= 10) {
      // 入场：柳枝自雾中浮现，薄雾缓动
      k = step / 10;
      if (branch) { branch.style.opacity = k; branch.style.transform = 'translateY(' + ((1 - k) * 12) + 'px) scale(' + (0.7 + k * 0.3) + ') rotate(' + ((-3 + k * 2) + Math.sin(step * 0.7) * 1.6) + 'deg)'; }
      if (fog) fog.style.opacity = k;
    } else if (step <= 26) {
      // 裂缝凝聚 · 金色裂纹爬满枝干
      t2 = (step - 10) / 16;
      var scaleC = Math.min(1, t2 * 1.4);
      if (crack) { crack.setAttribute('opacity', t2); crack.setAttribute('transform', 'translate(80 148) scale(' + scaleC + ')'); }
      if (branch) branch.style.transform = 'rotate(' + (Math.sin(step * 0.3) * 1.5 + t2 * 2 - 1) + 'deg)';
      if (text) text.style.opacity = Math.min(1, t2);
    } else if (step <= 32) {
      // 张力：裂纹急促脉动、枝条发颤
      var pu = 1 + Math.sin(step * 1.3) * 0.07;
      if (crack) { crack.setAttribute('opacity', 0.95); crack.setAttribute('transform', 'translate(80 148) scale(' + pu + ')'); }
      if (branch) branch.style.transform = 'rotate(' + (Math.sin(step * 1.7) * 2.4) + 'deg)';
      if (text) text.style.opacity = 1;
    } else if (step <= 40) {
      // 折断：叶簇迸散、金环炸开，同时页面开始淡入（交叉过渡）
      if (!snapped) {
        snapped = true;
        leafData = { sx: (Math.random() * 2 - 1) * 80, sy: -55 - Math.random() * 25 };
        if (!appOpened) {
          appOpened = true;
          _willowFogShown = true;
          var m0 = $('appModal');
          // 不走“下往上弹”，直接原位就位（随后被奶油色盖住，撤层时无缝显现）
          if (m0) { m0.style.transition = 'none'; m0.style.top = '0'; m0.style.opacity = '1'; }
          openApp('许愿柳');
          var tc0 = $('m-content');
          if (tc0) { tc0.style.opacity = '1'; }
          if (m0) setTimeout(function () { m0.style.transition = ''; }, 120);
        }
      }
      p3 = (step - 32) / 9;
      if (leafG) {
        leafG.setAttribute('transform', 'translate(' + (leafData.sx * p3) + ' ' + (leafData.sy * p3) + ') rotate(' + (leafData.sx * 0.35 * p3) + ')');
        leafG.setAttribute('opacity', Math.max(0, 1 - p3 * 1.15));
      }
      if (branch) branch.style.transform = 'rotate(' + (-7 + Math.sin(step * 1.4) * 1.5) + 'deg)';
      if (crack) { crack.setAttribute('transform', 'translate(80 148) scale(' + (1 + 3.2 * p3) + ')'); crack.setAttribute('opacity', Math.max(0, 1 - p3)); }
      for (var bi = 0; bi < burstParts.length; bi++) {
        var bpart = burstParts[bi];
        var dx = Math.cos(bpart.ang) * bpart.sp * p3;
        var dy = Math.sin(bpart.ang) * bpart.sp * p3 + 24 * p3 * p3;
        bpart.el.style.transform = 'translate(calc(-50% + ' + dx + 'px) calc(-50% + ' + dy + 'px))';
        bpart.el.style.opacity = Math.max(0, 1 - p3);
      }
      // 过渡：破裂、叶簇散开的同时，奶油色从内铺满整个画面，化进同色系的许愿柳页面
      if (warm) warm.style.opacity = Math.min(1, p3 * 1.3);
      var mF = $('appModal');
      if (mF) mF.style.opacity = 1;
      var tcF = $('m-content');
      if (tcF) tcF.style.opacity = 1;
      if (step >= 40) { clearInterval(timer); cleanup(); return; }
    }
  }, 20);

  function cleanup() {
    var el = document.getElementById('willowPortal');
    if (el) el.remove();
    var m = $('appModal');
    if (m) { m.style.filter = ''; m.style.opacity = ''; }
    var tc = $('m-content');
    if (tc) { tc.style.filter = ''; tc.style.opacity = ''; }
  }
}
function makeWish() {
  const ta = $('willowWishInput');
  const text = ta ? ta.value.trim() : '';
  if (!text) { alert('先说说你想许什么愿。'); return; }
  const today = localDateKey(new Date());
  if (state.willow && state.willow.date === today) { alert('今天的愿望已经许过了，等明天再来吧。'); return; }
  const BAN = /(暴富|发财|中奖|彩票|长生不老|永生|复活|起死回生|穿越|时空|世界和平|统治世界|亿万富翁|一夜暴富|很多钱|有钱人)/;
  if (BAN.test(text)) { alert('这种愿望许愿柳管不了，换个和角色有关的试试。'); return; }
  const btn = $('willowWishSubmit');
  if (btn) { btn.textContent = '🌿 柳枝轻响…'; btn.disabled = true; }
  willowParseRule(text).then(function(rule) {
    state.willow = { date: today, text: text, rule: rule || text };
    saveState();
    renderWillow();
    const shown = (rule && rule !== text) ? text + '（规则：' + rule + '）' : text;
    alert('愿望已生效：\n「' + shown + '」\n\n所有角色都知道你手里有一根许愿柳，今天会照这条规则行事。明天零点愿望自动失效。');
  });
}

// 用 AI 把愿望原文翻译成一条明确、可执行的行为规则（存底）
function willowParseRule(text) {
  var ap = state.apiProfiles && state.activeApiProfile
    ? state.apiProfiles.find(function (p) { return p.id === state.activeApiProfile; }) : null;
  var cfg = ap || state.api;
  if (!cfg || !cfg.key || !cfg.url || !cfg.model) return Promise.resolve(text);
  var ctrl = new AbortController();
  var tmr = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, 15000);
  var prompt = '你是"许愿柳"的愿望翻译器。用户折断柳枝许了一个愿望，请把它翻译成一条明确、可执行、直接对角色下达的行为规则（一句话，用第二人称"你"，不要说"用户希望"这类转述，不要解释，不要引号）。\n\n用户愿望：' + text;
  return aiRequest(joinUrl(cfg.url, 'chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
    signal: ctrl.signal,
    body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 120, temperature: 0.3 })
  }).then(function (res) { return res.json().catch(function () { return {}; }); }).then(function (data) {
    if (!data.choices || !data.choices[0] || !data.choices[0].message) return text;
    var out = (data.choices[0].message.content || '').trim().replace(/^["'「」“”]+|["'「」””]+$/g, '');
    return out || text;
  }).catch(function () { return text; }).finally(function () { clearTimeout(tmr); });
}
async function clearWishToday() {
  if (!await uiConfirm('撕掉今天的愿望？撕掉后许愿柳会记住今天已经用过一次。')) return;
  state.willow = { date: localDateKey(new Date()), text: '', rule: '' };
  saveState();
  renderWillow();
  alert('愿望已被撕掉。今天许愿柳不再受理新愿望。');
}
function renderWillow() {
  c().classList.add('willow-fit');
  c().style.background = 'radial-gradient(120% 100% at 50% 18%, #f8eed8 0%, #eaddc0 45%, #d4bd97 100%)';
  const hdr = document.querySelector('.app-header');
  if (hdr) { hdr.style.background = 'linear-gradient(180deg,#f5e7c9 0%,#e9d6ae 100%)'; hdr.style.borderBottom = '1px solid #d9c199'; }
  const tit = document.getElementById('m-tit');
  if (tit) tit.style.color = '#7a3a28';
  const bak = document.querySelector('.app-header .header-action');
  if (bak) bak.style.color = '#8a4a2a';
  const wish = currentWillowWish();
  const hasWish = !!wish;
  const stickSvg = '<svg class="wl-stick" viewBox="0 0 140 100" aria-hidden="true">' +
    '<g stroke="#8a5a32" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M16 78 Q 52 60 74 58 Q 108 56 124 70" stroke-width="9"/>' +
      '<path d="M16 80 Q 50 74 72 72" stroke-width="4"/>' +
      '<path d="M66 58 Q 64 42 70 30" stroke-width="5"/>' +
      '<path d="M84 60 Q 92 48 106 42" stroke-width="4"/>' +
    '</g>' +
    '<g fill="none" stroke="#9c6f52">' +
      '<path d="M86 56 l6 -5 5 6 -8 3 z" stroke-width="2"/>' +
      '<path d="M52 60 l-7 -6 2 -8 8 -1 z" stroke-width="2"/>' +
      '<path d="M100 46 l7 -2 3 6 -5 4 z" stroke-width="2"/>' +
    '</g>' +
    '<g fill="#7f9a44" stroke="#5f7b2f" stroke-width="1.5">' +
      '<ellipse cx="104" cy="40" rx="9" ry="5" transform="rotate(-30 104 40)"/>' +
      '<ellipse cx="90" cy="30" rx="8" ry="4.5" transform="rotate(-15 90 30)"/>' +
      '<ellipse cx="30" cy="54" rx="8" ry="4.5" transform="rotate(18 30 54)"/>' +
    '</g>' +
    '<path d="M76 55 l7 1 l-3 7 z" fill="#e3c38b" stroke="#a87a3a" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<path d="M80 58 l6 -2 l-1 6 z" fill="#e3c38b" stroke="#a87a3a" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<g fill="#ffd84d">' +
      '<path d="M20 22 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 z"/>' +
      '<path d="M122 20 l1.8 4 4 1.8 -4 1.8 -1.8 4 -1.8 -4 -4 -1.8 4 -1.8 z" opacity=".7"/>' +
    '</g>' +
    '<text x="68" y="92" font-size="9" fill="#b5402c" text-anchor="middle" font-family="Cinzel,serif" letter-spacing="2">wish</text>' +
    '</svg>';

  let h = '';
  h += '<div class="wl-wrap">';

  // ---- 复古产品盒 ----
  h += '<div class="wl-box">';
  h += '<div class="wl-starburst">WISH</div>';
  h += '<span class="wl-banner">TABI CAT · Curiosities™</span>';
  h += '<div class="wl-title"><span class="zh">许愿柳</span><span class="en">ONE&nbsp;WISH&nbsp;WILLOW</span></div>';
  h += '<div class="wl-dots"><span class="wl-count">#' + (hasWish ? '已折断' : '未使用') + '</span>' + stickSvg + '</div>';
  h += '<div class="wl-slogan">AMAZE&nbsp;YOUR&nbsp;FRIENDS!</div>';
  h += '<div class="wl-arch">折断一截柳枝 · 获得一个愿望</div>';
  h += '<div class="wl-fine">One wish · Single use only · No returns.<br>Cannot grant wealth, immortality or time travel.</div>';
  h += '<div class="wl-stamp">' + (hasWish ? 'SOLD&nbsp;OUT' : 'FOR&nbsp;FRIENDS&nbsp;ONLY') + '</div>';
  h += '</div>';

  // ---- 愿望面板 ----
  if (hasWish) {
    const rule = currentWillowRule();
    const ruleHtml = (rule && rule !== wish) ? '<div style="margin-top:8px;font-size:12px;opacity:.9">已生效规则：' + escapeHTML(rule) + '</div>' : '';
    h += '<div class="wl-body">';
    h += '<div class="label2">今日生效的愿望 — 角色都知道</div>';
    h += '<div class="wl-wish-shown"><div class="wl-wish-day">今天 · 愿望生效中</div><div class="wl-wish-text">' + escapeHTML(wish) + ruleHtml + '</div></div>';
    h += '<button class="danger-btn" style="width:100%;border:none;cursor:pointer;margin-top:12px;background:#f3e0d6;color:#a83a2a" onclick="clearWishToday()">✂️ 撕掉今日愿望</button>';
    h += '<div class="wl-hint">撕掉后许愿柳今天不再受理新愿望，明天自动归零。</div>';
    h += '</div>';
  } else {
    h += '<div class="wl-body">';
    h += '<div class="label2">折断柳枝 · 说出愿望</div>';
    h += '<textarea id="willowWishInput" class="textarea" placeholder=""></textarea>';
    h += '<button class="wl-submit" id="willowWishSubmit" onclick="makeWish()">🌿&nbsp;折断许愿</button>';
    h += '<div class="wl-hint">许愿柳只收与角色有关的心愿。许下后，它会把你的话译成一条规则，角色今天照此行事。至于一夜暴富、长生不老——柳枝轻蔑地抖了抖，表示不在管辖范围。</div>';
    h += '</div>';
  }

  h += '<div class="wl-bubbles">✦ ✦ ✦ &nbsp;Be careful what you wish for&nbsp; ✦ ✦ ✦</div>';
  h += '</div>';

  c().innerHTML = h;
}

// ---------- 游戏 ----------
let gameMode = 'list';
let gameTimer = null;

function renderGame() {
  stopGame();
  if (gameMode === 'list') {
    c().innerHTML = `
      <div class="stack">
        <div class="card">
          <h2 class="section-title" style="text-align:center">🎮 游戏房</h2>
          <p class="subtle" style="text-align:center">选一个游戏开始玩</p>
          <div style="margin-top:10px">
            <div onclick="gameMode='target';renderGame()" style="display:flex;justify-content:space-between;align-items:center;padding:11px 2px;border-bottom:1px solid rgba(0,0,0,.06);cursor:pointer">
              <b>⭐ 打靶</b><span class="subtle">30秒点击得分挑战</span></div>
            <div onclick="gameMode='guess';renderGame()" style="display:flex;justify-content:space-between;align-items:center;padding:11px 2px;border-bottom:1px solid rgba(0,0,0,.06);cursor:pointer">
              <b>🧠 猜数字</b><span class="subtle">1-100 猜中它</span></div>
            <div onclick="gameMode='snake';renderGame()" style="display:flex;justify-content:space-between;align-items:center;padding:11px 2px;border-bottom:1px solid rgba(0,0,0,.06);cursor:pointer">
              <b>🐍 贪吃蛇</b><span class="subtle">方向键或滑动控制</span></div>
            <div onclick="gameMode='cake';renderGame()" style="display:flex;justify-content:space-between;align-items:center;padding:11px 2px;cursor:pointer">
              <b>🍰 阿Sue做蛋糕</b><span class="subtle">按订单装饰蛋糕</span></div>
            <div onclick="gameMode='puzzle';renderGame()" style="display:flex;justify-content:space-between;align-items:center;padding:11px 2px;cursor:pointer">
              <b>🧩 拼图</b><span class="subtle">用你们的合照拼</span></div>
         </div>
       </div>
     </div>`;
    return;
  }
  c().innerHTML = `
    <div class="stack">
      ${gameMode==='target' ? renderGameTarget() : ''}
      ${gameMode==='guess' ? renderGameGuess() : ''}
      ${gameMode==='snake' ? renderGameSnake() : ''}
      ${gameMode==='cake' ? renderGameCake() : ''}
      ${gameMode==='puzzle' ? renderGamePuzzle() : ''}
    </div>`;
  if (gameMode==='snake') setTimeout(initSnake, 50);
}
function stopGame() { clearInterval(gameTimer); clearInterval(snakeTimer); }

// -- 打靶 --
function renderGameTarget() {
  return `
    <div class="grid2">
      <div class="metric"><span class="subtle">得分</span><b id="gameScore">${state.game.score}</b></div>
      <div class="metric"><span class="subtle">最高</span><b>${state.game.best}</b></div>
    </div>
    <div class="game-pad" id="gamePad" style="position:relative;height:300px;background:rgba(0,0,0,.04);border-radius:14px;overflow:hidden;margin-top:10px"></div>
    <button class="primary-btn" style="margin-top:10px" onclick="startGame()">开始（30秒）</button>`;
}
function startGame() {
  state.game.score = 0;
  let time = 30;
  spawnTarget();
  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    time--;
    if (time <= 0) { clearInterval(gameTimer); alert('时间到！得分 ' + state.game.score); }
    else spawnTarget();
  }, 950);
}
function spawnTarget() {
  const pad = $('gamePad');
  if (!pad) return;
  const x = Math.random() * (pad.clientWidth - 50);
  const y = Math.random() * (pad.clientHeight - 50);
  pad.innerHTML = `<div class="target" style="position:absolute;left:${x}px;top:${y}px;width:44px;height:44px;line-height:44px;text-align:center;font-size:26px;cursor:pointer" onclick="hitTarget()">⭐</div>`;
}
function hitTarget() {
  state.game.score++;
  state.game.best = Math.max(state.game.best, state.game.score);
  saveState();
  const el = $('gameScore'); if (el) el.innerText = state.game.score;
  spawnTarget();
}

// -- 猜数字 --
function renderGameGuess() {
  if (!state.game.guessNum) state.game.guessNum = Math.floor(Math.random()*100)+1;
  return `<div class="card">
    <h3 style="margin:0 0 6px">猜数字（1-100）</h3>
    <div class="subtle">已猜 ${state.game.guessCount||0} 次</div>
    <div class="grid2" style="margin-top:8px">
      <input class="field" id="guessInput" type="number" placeholder="你的猜测">
      <button class="primary-btn" onclick="submitGuess()">猜</button>
    </div>
    <div id="guessMsg" class="subtle" style="margin-top:8px">${state.game.guessMsg||'我想了一个数，来猜吧'}</div>
    <button class="ghost-btn" style="margin-top:8px" onclick="resetGuess()">重开一局</button>
  </div>`;
}
function submitGuess() {
  const v = Number($('guessInput').value);
  if (!v) return;
  state.game.guessCount = (state.game.guessCount||0) + 1;
  if (v === state.game.guessNum) { state.game.guessMsg = `🎉 猜对了！用了 ${state.game.guessCount} 次`; }
  else if (v < state.game.guessNum) state.game.guessMsg = '太小了，往大猜';
  else state.game.guessMsg = '太大了，往小猜';
  saveState(); renderGame();
}
function resetGuess() {
  state.game.guessNum = Math.floor(Math.random()*100)+1;
  state.game.guessCount = 0; state.game.guessMsg = '';
  saveState(); renderGame();
}

// -- 贪吃蛇 --
let snake = null, snakeTimer = null;
function renderGameSnake() {
  return `<div class="metric"><span class="subtle">长度</span><b id="snakeLen">${state.game.snakeBest||0}</b></div>
    <canvas id="snakeCanvas" width="300" height="300" style="background:rgba(0,0,0,.04);border-radius:14px;margin-top:10px;touch-action:none"></canvas>
    <div class="subtle" style="margin-top:8px">方向键或上下左右滑动控制</div>
    <button class="ghost-btn" style="margin-top:8px" onclick="initSnake()">重新开始</button>`;
}
function initSnake() {
  clearInterval(snakeTimer);
  const c = $('snakeCanvas'); if (!c) return;
  const ctx = c.getContext('2d');
  const grid = 15, w = c.width/grid;
  snake = { body: [{x:7,y:7}], dir: {x:1,y:0}, food: {x:3,y:3}, score: 0 };
  const step = () => {
    const head = { x: snake.body[0].x + snake.dir.x, y: snake.body[0].y + snake.dir.y };
    if (head.x<0||head.y<0||head.x>=w||head.y>=w) return gameOverSnake();
    if (snake.body.some(p=>p.x===head.x&&p.y===head.y)) return gameOverSnake();
    snake.body.unshift(head);
    if (head.x===snake.food.x && head.y===snake.food.y) {
      snake.food = { x: Math.floor(Math.random()*w), y: Math.floor(Math.random()*w) };
    } else snake.body.pop();
    ctx.clearRect(0,0,c.width,c.height);
    ctx.fillStyle = '#18a058';
    snake.body.forEach(p => ctx.fillRect(p.x*grid, p.y*grid, grid-1, grid-1));
    ctx.fillStyle = '#e53935';
    ctx.fillRect(snake.food.x*grid, snake.food.y*grid, grid-1, grid-1);
    const el = $('snakeLen'); if (el) el.innerText = snake.body.length;
    state.game.snakeBest = Math.max(state.game.snakeBest||0, snake.body.length);
  };
  snakeTimer = setInterval(step, 160);
  const key = e => {
    const k = e.key;
    if (k==='ArrowUp') snake.dir={x:0,y:-1};
    if (k==='ArrowDown') snake.dir={x:0,y:1};
    if (k==='ArrowLeft') snake.dir={x:-1,y:0};
    if (k==='ArrowRight') snake.dir={x:1,y:0};
  };
  window.onkeydown = key;
  c.ontouchstart = e => {
    const t = e.touches[0]; const sx = t.clientX, sy = t.clientY;
    c.ontouchend = ev => {
      const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy;
      if (Math.abs(dx)>Math.abs(dy)) snake.dir = dx>0?{x:1,y:0}:{x:-1,y:0};
      else snake.dir = dy>0?{x:0,y:1}:{x:0,y:-1};
    };
    e.preventDefault();
  };
}
function gameOverSnake() {
  clearInterval(snakeTimer);
  saveState();
  alert('游戏结束，蛇长 ' + snake.body.length);
}

// -- 阿Sue做蛋糕（精进版） --
const CAKE_BASES = [
  { name: '原味', color: '#f3e2c0', emoji: '🥚', desc: '香软经典' },
  { name: '巧克力', color: '#6b3a2a', emoji: '🍫', desc: '浓郁丝滑' },
  { name: '抹茶', color: '#8fbc8f', emoji: '🍵', desc: '清新回甘' },
  { name: '红丝绒', color: '#c23b22', emoji: '🔴', desc: '浪漫绵密' }
];
const CAKE_FILLINGS = [
  { name: '新鲜水果', emoji: '🍓', desc: '酸甜多汁' },
  { name: '果酱', emoji: '🍊', desc: '甜蜜夹心' },
  { name: '坚果碎', emoji: '🥜', desc: '酥脆口感' },
  { name: '无夹心', emoji: '—', desc: '纯粹糕体' }
];
const CAKE_CREAMS = [
  { name: '淡奶油', color: '#fff7fb', emoji: '🥛', desc: '轻盈不腻' },
  { name: '巧克力甘纳许', color: '#5b3a29', emoji: '🍫', desc: '浓郁丝滑' },
  { name: '奶油奶酪', color: '#fef5e7', emoji: '🧀', desc: '微酸醇厚' },
  { name: '草莓奶油', color: '#fddde6', emoji: '🍓', desc: '果香清甜' }
];
const CAKE_TOPPINGS = [
  { name: '新鲜水果', emoji: '🍓', desc: '色彩缤纷' },
  { name: '糖珠', emoji: '✨', desc: '闪闪可爱' },
  { name: '巧克力刨花', emoji: '🍫', desc: '精致卷花' },
  { name: '坚果碎', emoji: '🥜', desc: '香脆点缀' }
];
const CAKE_DECOS = [
  { name: '蜡烛', emoji: '🕯️', desc: '许个愿吧' },
  { name: '糖花', emoji: '🌹', desc: '浪漫加分' },
  { name: '马卡龙', emoji: '🥠', desc: '法式精致' },
  { name: '淋面酱', emoji: '🍯', desc: '丝滑流下' }
];

const CAKE_ORDERS = [
  { base: '巧克力', cream: '巧克力甘纳许', filling: '坚果碎', topping: '巧克力刨花', deco: ['蜡烛', '淋面酱'], desc: '重度巧克力控，要浓郁到底！' },
  { base: '原味', cream: '淡奶油', filling: '新鲜水果', topping: '新鲜水果', deco: ['糖花', '马卡龙'], desc: '清爽水果风，适合下午茶~' },
  { base: '抹茶', cream: '奶油奶酪', filling: '无夹心', topping: '坚果碎', deco: ['糖花', '蜡烛'], desc: '日式简约，微苦回甘' },
  { base: '红丝绒', cream: '奶油奶酪', filling: '果酱', topping: '糖珠', deco: ['马卡龙', '淋面酱'], desc: '经典红丝绒，颜值即正义' },
  { base: '巧克力', cream: '草莓奶油', filling: '新鲜水果', topping: '巧克力刨花', deco: ['糖花', '淋面酱'], desc: '巧克力+草莓，恋人必选' },
  { base: '原味', cream: '巧克力甘纳许', filling: '坚果碎', topping: '糖珠', deco: ['蜡烛', '马卡龙'], desc: '送给孩子的生日惊喜' }
];

let cakeOrder = null, cakeStepIdx = 0, cakeChoices = {}, cakeDone = false;
const cakeSteps = ['base', 'cream', 'filling', 'topping', 'deco'];

function renderGameCake() {
  return `<div class="card" id="cakeWrap" style="position:relative;background:linear-gradient(145deg,#fef6fb,#fce4ec);border:2px solid #f8bbd0;border-radius:20px;overflow:hidden">
    <div style="text-align:center;padding:16px 0 8px;background:linear-gradient(135deg,#f06292,#ec407a);color:#fff;margin:-2px -2px 0;border-radius:20px 20px 0 0">
      <div style="font-size:20px;font-weight:800;letter-spacing:1px">🧁 阿Sue的蛋糕店</div>
      <div style="font-size:12px;opacity:.85;margin-top:2px">今天也要做出完美的蛋糕哦</div>
    </div>
    <div id="cakeSelect" style="display:block;padding:20px 16px;text-align:center">
      <div style="font-size:48px;margin-bottom:6px">🧑‍🍳</div>
      <div style="font-size:15px;color:#555;margin-bottom:14px">有新的顾客订单，快来接单吧！</div>
      <button class="primary-btn" style="width:100%;background:linear-gradient(135deg,#f06292,#ec407a);border:none;font-size:16px;padding:14px" onclick="cakeNewOrder()">📋 接新订单</button>
    </div>
    <div id="cakePlay" style="display:none;padding:12px 14px">
      <div id="cakeOrderBanner" style="font-size:13px;color:#6a1b2a;font-weight:600;background:#fff0f6;padding:10px 14px;border-radius:12px;margin-bottom:10px;border-left:4px solid #ec407a"></div>
      <div id="cakeStage" style="position:relative;min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;margin:6px 0 10px;padding:10px;background:#fefefe;border-radius:16px;box-shadow:inset 0 2px 8px rgba(0,0,0,.04)"></div>
      <div id="cakeChooser" style="margin-top:4px"></div>
      <div id="cakeTip" style="text-align:center;min-height:22px;font-size:13px;color:#888;margin-top:8px;padding:4px 0"></div>
      <div style="text-align:center;margin-top:6px"><button class="ghost-btn" style="color:#999;font-size:12px" onclick="cakeRestart()">↺ 重新接单</button></div>
    </div>
  </div>`;
}

function cakeNewOrder() {
  cakeOrder = CAKE_ORDERS[Math.floor(Math.random() * CAKE_ORDERS.length)];
  cakeStepIdx = 0; cakeChoices = {}; cakeDone = false;
  document.getElementById('cakeSelect').style.display = 'none';
  document.getElementById('cakePlay').style.display = 'block';
  const banner = document.getElementById('cakeOrderBanner');
  banner.innerHTML = `📋 新订单：${cakeOrder.desc}`;
  cakeRenderStep();
  cakeRenderStage();
}

function cakeRenderStep() {
  if (cakeDone) return;
  const chooser = document.getElementById('cakeChooser');
  const tip = document.getElementById('cakeTip');
  if (!chooser) return;
  const step = cakeSteps[cakeStepIdx];
  const stepInfo = { base: ['选择蛋糕胚', '🥚'], cream: ['涂抹奶油', '🥛'], filling: ['添加夹心', '🍓'], topping: ['撒顶饰', '✨'], deco: ['选2种装饰', '🎀'] };
  const [label, icon] = stepInfo[step] || ['', ''];
  let items;
  if (step === 'base') items = CAKE_BASES;
  else if (step === 'cream') items = CAKE_CREAMS;
  else if (step === 'filling') items = CAKE_FILLINGS;
  else if (step === 'topping') items = CAKE_TOPPINGS;
  else if (step === 'deco') items = CAKE_DECOS;
  if (!items) return;

  const stepNum = cakeStepIdx + 1;
  let html = `<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
    <span style="background:#ec407a;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${stepNum}</span>
    <span style="font-weight:700;font-size:14px;color:#444">${icon} ${label}</span>
    <span style="margin-left:auto;font-size:11px;color:#aaa">${stepNum}/5</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">`;
  html += items.map(item => {
    const isDeco = step === 'deco';
    const selected = isDeco ? (cakeChoices.deco || []).includes(item.name) : cakeChoices[step] === item.name;
    const maxed = isDeco && (cakeChoices.deco || []).length >= 2 && !selected;
    return `<button style="padding:12px 10px;text-align:left;display:flex;align-items:center;gap:10px;background:${selected ? '#fce4ec' : '#fff'};border:${selected ? '2px solid #ec407a' : '1.5px solid #f0e0e6'};border-radius:14px;cursor:pointer;font-family:inherit;transition:all .15s;box-shadow:0 2px 8px rgba(236,64,122,.08);${maxed ? 'opacity:.35' : ''}"
      onclick="cakePick('${step}','${item.name}')" ${maxed ? 'disabled' : ''}>
      <span style="font-size:22px">${item.emoji}</span>
      <div><div style="font-weight:600;font-size:13px;color:#333">${item.name}</div><div style="font-size:11px;color:#999">${item.desc}</div></div>
      ${selected ? '<span style="margin-left:auto;color:#ec407a;font-size:14px">✓</span>' : ''}
    </button>`;
  }).join('');
  html += `</div>`;

  const isLast = cakeStepIdx === cakeSteps.length - 1;
  const canFinish = !isLast || (cakeChoices.deco || []).length === 2;
  const nextBtn = isLast
    ? `<button class="primary-btn" style="background:#ec407a;border:none;padding:12px 20px;font-size:14px" ${canFinish ? '' : 'disabled'} onclick="cakeFinishCake()">🎂 完成蛋糕</button>`
    : `<button class="primary-btn" style="background:#ec407a;border:none;padding:12px 20px;font-size:14px" onclick="cakeNextStep()">下一步 →</button>`;
  html += `<div style="display:flex;gap:8px;margin-top:12px">
    <button class="ghost-btn" style="${cakeStepIdx === 0 ? 'opacity:.4' : ''}" ${cakeStepIdx === 0 ? 'disabled' : ''} onclick="cakePrevStep()">← 上一步</button>
    ${nextBtn}
  </div>`;
  chooser.innerHTML = html;

  if (tip) {
    const hints = { base:'选一个蛋糕胚作为基底', cream:'选择奶油涂抹在蛋糕上', filling:'在中间加一层夹心', topping:'在表面撒上装饰', deco:(cakeChoices.deco || []).length >= 2 ? '已选好2种装饰，可以完成了' : '选2种装饰点缀蛋糕' };
    tip.innerText = hints[step] || '';
  }
}

function cakePick(step, name) {
  if (cakeDone) return;
  if (step === 'deco') {
    if (!cakeChoices.deco) cakeChoices.deco = [];
    if (cakeChoices.deco.includes(name)) {
      cakeChoices.deco = cakeChoices.deco.filter(d => d !== name);
    } else if (cakeChoices.deco.length < 2) {
      cakeChoices.deco.push(name);
    }
    cakeRenderStep();
    cakeRenderStage();
    return;
  }
  cakeChoices[step] = name;
  cakeRenderStep();
  cakeRenderStage();
}

function cakeNextStep() {
  if (cakeStepIdx < cakeSteps.length - 1) { cakeStepIdx++; cakeRenderStep(); }
  else cakeFinishCake();
}

function cakePrevStep() {
  if (cakeStepIdx > 0) { cakeStepIdx--; cakeRenderStep(); }
}

function cakeRenderStage() {
  const pad = document.getElementById('cakeStage'); if (!pad) return;
  const base = cakeChoices.base ? CAKE_BASES.find(b => b.name === cakeChoices.base) : null;
  const cream = cakeChoices.cream ? CAKE_CREAMS.find(c => c.name === cakeChoices.cream) : null;
  const filling = cakeChoices.filling ? CAKE_FILLINGS.find(f => f.name === cakeChoices.filling) : null;
  const topping = cakeChoices.topping ? CAKE_TOPPINGS.find(t => t.name === cakeChoices.topping) : null;
  const decos = (cakeChoices.deco || []).map(d => CAKE_DECOS.find(dc => dc.name === d)).filter(Boolean);
  if (!(base || cream || filling || topping || decos.length)) {
    pad.innerHTML = '<div style="font-size:48px;opacity:.25">🍰</div>';
    pad.style.background = 'radial-gradient(circle at 50% 35%, #fff, #faf3f7)';
    return;
  }
  const creamColor = cream ? cream.color : '#fffafc';
  const baseColor = base ? base.color : '#f0e0e6';
  let html = '<div style="position:relative;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:4px">';
  if (decos.length) html += '<div style="font-size:20px;margin-bottom:4px;letter-spacing:3px;filter:drop-shadow(0 2px 2px rgba(120,80,100,.25))">' + decos.map(function (d) { return d.emoji; }).join(' ') + '</div>';
  if (topping) html += '<div style="font-size:26px;margin-bottom:-6px;z-index:3;filter:drop-shadow(0 2px 2px rgba(120,80,100,.25))">' + topping.emoji + '</div>';
  html += '<div style="position:relative;width:160px;height:72px;border-radius:18px 18px 14px 14px;background:linear-gradient(180deg, rgba(255,255,255,.55), rgba(0,0,0,.05)), ' + creamColor + ';box-shadow:0 8px 18px rgba(80,40,60,.2), inset 0 -6px 10px rgba(0,0,0,.06);border:3px solid ' + baseColor + ';overflow:hidden">';
  html += '<div style="position:absolute;top:0;left:0;right:0;height:24px;background:linear-gradient(180deg,#ffffff,' + creamColor + ');border-radius:18px 18px 45% 45%/18px 18px 22px 22px;box-shadow:inset 0 -3px 6px rgba(0,0,0,.05)"></div>';
  html += '<div style="position:absolute;top:20px;left:20%;width:11px;height:15px;background:' + creamColor + ';border-radius:0 0 9px 9px"></div>';
  html += '<div style="position:absolute;top:22px;left:56%;width:9px;height:13px;background:' + creamColor + ';border-radius:0 0 9px 9px"></div>';
  if (filling && filling.name !== '无夹心') html += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px;z-index:2">' + filling.emoji + '</div>';
  html += '</div>';
  html += '<div style="width:192px;height:14px;margin-top:2px;background:linear-gradient(180deg,#ffffff,#e9dccb);border-radius:50%;box-shadow:0 6px 10px rgba(0,0,0,.12)"></div>';
  html += '</div>';
  pad.innerHTML = html;
  pad.style.background = 'radial-gradient(circle at 50% 30%, #ffffff, #faf3f7)';
}

function cakeFinishCake() {
  cakeDone = true;
  const tip = document.getElementById('cakeTip');
  const score = cakeOrder ? (cakeChoices.base === cakeOrder.base ? 1 : 0) + (cakeChoices.cream === cakeOrder.cream ? 1 : 0) +
    (cakeChoices.filling === cakeOrder.filling ? 1 : 0) + (cakeChoices.topping === cakeOrder.topping ? 1 : 0) +
    Math.min(2, (cakeChoices.deco || []).filter(d => (cakeOrder.deco || []).includes(d)).length) : 0;
  const maxScore = 6;
  const pct = Math.round(score / maxScore * 100);
  const starCount = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const stars = '⭐'.repeat(starCount) + '☆'.repeat(5 - starCount);
  const comment = pct >= 90 ? '完美！顾客超满意！' : pct >= 70 ? '很好吃，顾客很开心~' : pct >= 50 ? '还可以，但不太对订单哦' : '顾客有点失望…再接再厉';

  const st2 = document.getElementById('cakeStage');
  if (st2) st2.insertAdjacentHTML('beforeend', `<div style="margin-top:12px;text-align:center;background:linear-gradient(135deg,#fce4ec,#fff0f6);padding:12px;border-radius:14px;width:100%">
    <div style="font-size:20px;letter-spacing:2px">${stars}</div>
    <div style="font-weight:700;color:#c62828;font-size:15px;margin-top:4px">${comment}</div>
    <div style="font-size:12px;color:#999;margin-top:3px">订单匹配度 ${score}/${maxScore}</div>
  </div>`);

  if (tip) tip.innerText = '🎉 蛋糕完成！';
  const chooser = document.getElementById('cakeChooser');
  if (chooser) chooser.innerHTML = '';
  const wrap = document.getElementById('cakeWrap');
  if (wrap) { const f = document.createElement('div'); f.innerText = '🎉🧁✨'; f.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:40px;pointer-events:none;animation:cakePop .8s ease;z-index:10'; wrap.appendChild(f); setTimeout(() => f.remove(), 1500); }
}

function cakeRestart() {
  cakeOrder = null; cakeStepIdx = 0; cakeChoices = {}; cakeDone = false;
  document.getElementById('cakeSelect').style.display = 'block';
  document.getElementById('cakePlay').style.display = 'none';
  const wrap = document.getElementById('cakeWrap');
  if (wrap) { const f = wrap.querySelector('div:last-child'); if (f && f.style.animation) f.remove(); }
}

// -- 拼图（真正的拼块拼图）--
function makeDefaultPuzzleImg() {
  try {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 300;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 300, 300);
    g.addColorStop(0, '#ffd1e8'); g.addColorStop(1, '#b8a99a');
    x.fillStyle = g; x.fillRect(0, 0, 300, 300);
    x.font = '120px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('💞', 150, 145);
    x.fillStyle = '#fff'; x.font = '20px sans-serif';
    x.fillText('选张合照来拼图', 150, 255);
    return cv.toDataURL();
  } catch (e) { return ''; }
}
let puzzle = null;

function getPuzzleImages() {
  const imgs = [];
  (state.albums || []).forEach(a => (a.photos || []).forEach(p => { if (p.url) imgs.push(p.url); }));
  return imgs;
}

function buildPuzzle(img, n) {
  const pieces = []; for (let i = 0; i < n * n; i++) pieces.push(i);
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pieces[i]; pieces[i] = pieces[j]; pieces[j] = t;
  }
  const placed = []; for (let i = 0; i < n * n; i++) placed.push(null);
  puzzle = { n, img, placed, tray: pieces, selected: null, moves: 0, feedback: '', feedbackOk: true, lastIdx: -1 };
}

function startPuzzle(img, n) {
  buildPuzzle(img, n);
  renderGame();
}

function shufflePuzzle() { if (puzzle) startPuzzle(puzzle.img, puzzle.n); }

function puzzlePieceStyle(pid) {
  const n = puzzle.n, pr = Math.floor(pid / n), pc = pid % n;
  const x = n > 1 ? (pc / (n - 1) * 100) : 0, y = n > 1 ? (pr / (n - 1) * 100) : 0;
  return `background-image:url('${puzzle.img}');background-size:${n * 100}% ${n * 100}%;background-position:${x}% ${y}%;`;
}

function puzzleBoardHtml() {
  const n = puzzle.n, img = puzzle.img, total = n * n;
  const correct = puzzle.placed.filter((v, i) => v === i).length;
  const ts = Math.max(48, Math.floor(300 / n));
  const imgs = getPuzzleImages();
  const picker = imgs.length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">` +
    imgs.slice(0, 8).map(u => `<img src="${u}" onclick="startPuzzle('${u}',${n})" style="width:38px;height:38px;object-fit:cover;border-radius:8px;cursor:pointer;border:2px solid ${u === img ? '#ec407a' : 'transparent'}">`).join('') + `</div>` : '';
  let slots = '';
  for (let i = 0; i < total; i++) {
    const pid = puzzle.placed[i];
    if (pid === null) {
      const isHome = puzzle.selected !== null && puzzle.selected === i;
      slots += `<div data-drop="slot" data-index="${i}" onclick="tapSlot(${i})" style="border:${isHome ? '2px solid #18a058' : '2px dashed rgba(0,0,0,.18)'};border-radius:8px;background:rgba(0,0,0,.03);cursor:pointer"></div>`;
    } else {
      const isHome = pid === i;
      slots += `<div data-drop="slot" data-index="${i}" onpointerdown="puzzlePointerDown(event,'slot',${pid},${i})" style="${puzzlePieceStyle(pid)}border-radius:8px;cursor:grab;touch-action:none;box-shadow:0 1px 3px rgba(0,0,0,.15)${isHome ? '' : ';outline:2px solid #ffb300'}"></div>`;
    }
  }
  const tray = puzzle.tray.length ? puzzle.tray.map(pid =>
    `<div onpointerdown="puzzlePointerDown(event,'tray',${pid},-1)" style="${puzzlePieceStyle(pid)}width:${ts}px;height:${ts}px;border-radius:8px;cursor:grab;touch-action:none;box-shadow:0 1px 3px rgba(0,0,0,.2)${puzzle.selected === pid ? ';outline:3px solid #ec407a' : ''}"></div>`
  ).join('') : `<span class="subtle">全部拼完啦 🎉</span>`;
  return `
    <div class="metric"><span class="subtle">已拼</span><b>${correct} / ${total}</b></div>
    <div id="puzzleHint" style="min-height:18px;margin-top:6px;font-size:13px;font-weight:600;color:${puzzle.feedbackOk ? '#18a058' : '#e53935'}">${puzzle.feedback || ''}</div>
    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="subtle">难度</span>
      ${[2, 3, 4].map(k => `<button class="ghost-btn" style="padding:6px 12px;${puzzle.n === k ? 'background:#ec407a;color:#fff;border-color:#ec407a' : ''}" onclick="startPuzzle('${img}',${k})">${k}×${k}</button>`).join('')}
      <button class="ghost-btn" style="padding:6px 12px" onclick="shufflePuzzle()">🔀 重排</button>
    </div>
    <div style="margin-top:10px;display:flex;gap:10px;align-items:center">
      <img src="${img}" style="width:54px;height:54px;object-fit:cover;border-radius:10px;border:1px solid rgba(0,0,0,.1)" alt="原图">
      <span class="subtle">↑ 要拼回的原图</span>
    </div>
    <div style="margin-top:10px;width:100%;max-width:320px;aspect-ratio:1;display:grid;grid-template-columns:repeat(${n},1fr);grid-template-rows:repeat(${n},1fr);gap:3px;background:rgba(0,0,0,.05);padding:3px;border-radius:12px">${slots}</div>
    ${picker}
    <div class="subtle" style="margin-top:10px">下方是打乱的拼图块：点一块选中（粉框），再点棋盘上的空位放上去。放错会有橙框，点它可拿起来重放。</div>
    <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;align-items:center"><span class="subtle">拼图块：</span>${tray}</div>`;
}

function renderGamePuzzle() {
  if (!puzzle) {
    const imgs = getPuzzleImages();
    buildPuzzle(imgs.length ? imgs[0] : makeDefaultPuzzleImg(), 3);
  }
  return puzzleBoardHtml();
}

function puzzleAnimateLast() {
  if (!puzzle || puzzle.lastIdx < 0) return;
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-drop="slot"][data-index="' + puzzle.lastIdx + '"]');
    if (!el || !el.animate) return;
    el.animate(
      puzzle.feedbackOk
        ? [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }]
        : [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: puzzle.feedbackOk ? 250 : 320 }
    );
  });
}

function tapSlot(i) {
  if (!puzzle) return;
  const pid = puzzle.placed[i];
  if (pid !== null) {
    puzzle.placed[i] = null;
    puzzle.tray.push(pid);
    puzzle.selected = pid;
    puzzle.feedbackOk = true;
    puzzle.feedback = '🤔 拿起来啦，换个位置试试';
    puzzle.lastIdx = i;
    renderGame();
    puzzleAnimateLast();
    return;
  }
  if (puzzle.selected === null) return;
  const sel = puzzle.selected;
  const isCorrect = sel === i;
  puzzle.placed[i] = sel;
  puzzle.tray = puzzle.tray.filter(x => x !== sel);
  puzzle.selected = null;
  puzzle.moves++;
  const total = puzzle.n * puzzle.n;
  let win = true; for (let k = 0; k < total; k++) if (puzzle.placed[k] !== k) { win = false; break; }
  puzzle.lastIdx = i;
  if (win) { puzzle.feedbackOk = true; puzzle.feedback = '🎉 全部拼好啦！'; }
  else { puzzle.feedbackOk = isCorrect; puzzle.feedback = isCorrect ? '✅ 放对啦！' : '❌ 放错咯，对照原图再看看'; }
  renderGame();
  puzzleAnimateLast();
  if (win) setTimeout(() => alert('🎉 拼好啦！用了 ' + puzzle.moves + ' 步'), 50);
}

function tapTray(pid) {
  if (!puzzle) return;
  puzzle.selected = (puzzle.selected === pid) ? null : pid;
  renderGame();
}

// ---- 拖动拼图块（触摸 + 鼠标通用）----
let puzzleDrag = null;
function puzzlePointerDown(e, source, pid, slotIndex) {
  if (!puzzle) return;
  e.preventDefault();
  puzzleDrag = { source, pid, slotIndex, startX: e.clientX, startY: e.clientY, moved: false, ghost: null, el: e.currentTarget };
}
function puzzlePointerMove(e) {
  if (!puzzleDrag) return;
  const dx = e.clientX - puzzleDrag.startX, dy = e.clientY - puzzleDrag.startY;
  if (!puzzleDrag.moved && Math.hypot(dx, dy) > 6) {
    puzzleDrag.moved = true;
    const ts = Math.max(48, Math.floor(300 / puzzle.n));
    const g = document.createElement('div');
    g.style.cssText = `${puzzlePieceStyle(puzzleDrag.pid)}width:${ts}px;height:${ts}px;border-radius:8px;position:fixed;pointer-events:none;z-index:9999;box-shadow:0 6px 16px rgba(0,0,0,.3);opacity:.92`;
    document.body.appendChild(g);
    puzzleDrag.ghost = g;
    if (puzzleDrag.el) puzzleDrag.el.style.opacity = '.3';
  }
  if (puzzleDrag.moved && puzzleDrag.ghost) {
    puzzleDrag.ghost.style.left = (e.clientX - puzzleDrag.ghost.offsetWidth / 2) + 'px';
    puzzleDrag.ghost.style.top = (e.clientY - puzzleDrag.ghost.offsetHeight / 2) + 'px';
  }
}
function puzzlePointerUp(e) {
  if (!puzzleDrag) return;
  const d = puzzleDrag; puzzleDrag = null;
  if (d.ghost) d.ghost.remove();
  if (d.el) d.el.style.opacity = '';
  if (!d.moved) {
    if (d.source === 'tray') tapTray(d.pid);
    else if (d.source === 'slot') tapSlot(d.slotIndex);
    return;
  }
  const tgt = document.elementFromPoint(e.clientX, e.clientY);
  const slotEl = tgt && tgt.closest ? tgt.closest('[data-drop="slot"]') : null;
  if (!slotEl) { renderGame(); return; }
  const ti = parseInt(slotEl.getAttribute('data-index'), 10);
  const n = puzzle.n, total = n * n;
  if (d.source === 'tray') {
    const occupant = puzzle.placed[ti];
    puzzle.placed[ti] = d.pid;
    puzzle.tray = puzzle.tray.filter(x => x !== d.pid);
    if (occupant !== null) puzzle.tray.push(occupant);
  } else {
    if (ti === d.slotIndex) { renderGame(); return; }
    const occupant = puzzle.placed[ti];
    puzzle.placed[ti] = d.pid;
    puzzle.placed[d.slotIndex] = occupant;
  }
  puzzle.selected = null; puzzle.moves++;
  const isCorrect = d.pid === ti;
  let win = true; for (let k = 0; k < total; k++) if (puzzle.placed[k] !== k) { win = false; break; }
  puzzle.lastIdx = ti;
  if (win) { puzzle.feedbackOk = true; puzzle.feedback = '🎉 全部拼好啦！'; }
  else { puzzle.feedbackOk = isCorrect; puzzle.feedback = isCorrect ? '✅ 放对啦！' : '❌ 放错咯，对照原图再看看'; }
  renderGame();
  puzzleAnimateLast();
  if (win) setTimeout(() => alert('🎉 拼好啦！用了 ' + puzzle.moves + ' 步'), 50);
}
document.addEventListener('pointermove', puzzlePointerMove, { passive: false });
document.addEventListener('pointerup', puzzlePointerUp);
document.addEventListener('pointercancel', puzzlePointerUp);

// ---------- 情侣空间 ----------
const SPACE_TASKS = [
  { id: 'morning', icon: '☀️', name: '早安问候' },
  { id: 'hug', icon: '🤗', name: '抱一下' },
  { id: 'photo', icon: '📸', name: '拍张照片' },
  { id: 'diary', icon: '📝', name: '写篇日记' },
  { id: 'goodnight', icon: '🌙', name: '晚安吻' }
];
const SPACE_REWARD = 5;
let spaceFxTimer = null;
const SPACE_KISS_LINES = [
  '· 心跳被你偷走了 ·',
  '· 脸颊有点烫 ·',
  '· 这一下，我要记很久 ·',
  '· 还、还想再来一次吗 ·',
  '· 你认真的样子好甜 ·',
  '· 耳朵红到发烫了啦 ·',
  '· 你把我的心掳走了 ·'
];
const SPACE_LINES = [
  '遇见你之后，连风都变得软软的。',
  '今天也想赖在你身边，哪里都不去。',
  '我把月亮摘下来，别在你耳边啦。',
  '你是我心里最软的那一块。',
  '想和你把以后的每一次日落都看完。',
  '你的名字，是我写过最甜的情书。',
  '被你牵着手的时候，路再远都不怕。',
  '想把我的糖分都给你，甜到你心坎里。',
  '心跳扑通扑通，都是因为你。',
  '晚安吻要放在眉心，梦才够甜。',
  '你一来，花就全开了。',
  '抱一下嘛，充电五分钟，甜一整天。'
];
function spaceLevelIndex(int) {
  if (int >= 500) return 4;
  if (int >= 300) return 3;
  if (int >= 150) return 2;
  if (int >= 60) return 1;
  return 0;
}
function spaceLevel(int) {
  if (int >= 500) return { name: '灵魂伴侣', icon: 'Ⅴ', need: 500 };
  if (int >= 300) return { name: '心有灵犀', icon: 'Ⅳ', need: 300 };
  if (int >= 150) return { name: '如胶似漆', icon: 'Ⅲ', need: 150 };
  if (int >= 60) return { name: '甜蜜热恋', icon: 'Ⅱ', need: 60 };
  return { name: '心动初识', icon: 'Ⅰ', need: 0 };
}
function spaceNext(int) {
  const lv = spaceLevel(int);
  const order = [0, 60, 150, 300, 500];
  let next = order.find(n => n > lv.need && int < n);
  if (int >= 500) return null;
  return { level: lv, need: next };
}
function spaceFor(roleId) {
  const rid = roleId || (activeRole() && activeRole().id);
  if (!rid) return state.space.default;
  if (!state.space.byRole[rid]) state.space.byRole[rid] = JSON.parse(JSON.stringify(state.space.default));
  const sp = state.space.byRole[rid];
  if (!sp.startDate) { sp.startDate = localDateKey(new Date()); saveState(); }
  return sp;
}
function spaceDays(sp) {
  sp = sp || state.space.default;
  if (!sp.startDate) return 0;
  return Math.max(1, Math.floor((new Date() - new Date(sp.startDate)) / 86400000));
}
function spaceDailyKey() { return localDateKey(new Date()); }
function spaceCurrDaily() {
  const sp = spaceFor(activeRole().id);
  const k = spaceDailyKey();
  if (!sp.daily[k]) sp.daily[k] = {};
  return sp.daily[k];
}
function spaceInnerHtml() {
  const role = activeRole();
  const sp = spaceFor(role.id);
  const days = spaceDays(sp);
  const int = sp.intimacy;
  const lv = spaceLevel(int);
  const lvIdx = spaceLevelIndex(int);
  const nxt = spaceNext(int);
  const pct = nxt ? Math.min(100, Math.round(((int - lv.need) / (nxt.need - lv.need)) * 100)) : 100;
  const day = sp.daily[spaceDailyKey()] || {};
  const done = SPACE_TASKS.filter(t => day[t.id]).length;
  const lover = sp.loverName ? ' · ' + escapeHTML(sp.loverName) : '';
  const meAv = renderAvatar(state.myProfile && (state.myProfile.avatarImage || state.myProfile.avatar) || activeProfile().avatar, '我');
  const roleAv = renderAvatar(role.avatar, role.name);
  return `
    <div class="space-wrap">
      <div class="space-hero2">
        <div class="space-hero2-glow"></div>
        <div class="space-hero2-top">
          <button class="space-switch" onclick="spaceSwitchRole()" title="更换伴侣">⇄</button>
        </div>
        <div class="space-h2-couple">
          <figure><span class="space-h2-av">${meAv}</span><figcaption>我</figcaption></figure>
          <div class="space-h2-heart" id="spaceBeat" onclick="spaceKiss()">❤</div>
          <figure><span class="space-h2-av">${roleAv}</span><figcaption>${escapeHTML(role.name)}</figcaption></figure>
        </div>
        <div class="space-h2-num">${days}<small>DAYS</small></div>
        <div class="space-h2-sub">和 ${escapeHTML(role.name)} 在一起 · 第 ${days} 天${lover}</div>
        <div class="space-h2-lv">
          <span class="space-h2-lvname">${lv.icon} ${lv.name}</span>
          <div class="space-h2-bar"><i style="width:${pct}%"></i></div>
          <span class="space-h2-int">${int}</span>
        </div>
        <div class="space-kiss-reply" id="spaceKissReply"></div>
      </div>

      <div class="space-quote" id="spaceLineBox">${SPACE_LINES[Math.floor(Math.random() * SPACE_LINES.length)]}</div>
      <button class="space-quote-btn" onclick="spaceLoveLine()">再听一句 · +1</button>

      <div class="space-tasks">
        <div class="space-tasks-head"><span>今日小事</span><span class="space-task-counter">${done}/${SPACE_TASKS.length}</span></div>
        ${SPACE_TASKS.map(t => `
          <div class="space-task${day[t.id] ? ' on' : ''}" onclick="spaceTask('${t.id}', this)">
            <span class="space-task-dot${day[t.id] ? ' on' : ''}"></span>
            <span class="space-task-name">${t.icon} ${t.name}</span>
            <span class="space-task-pts">${day[t.id] ? '+' + SPACE_REWARD : ''}</span>
          </div>`).join('')}
      </div>

      <div class="space-notes2">
        <div class="space-notes-head"><span>悄悄话</span><span>${(sp.notes || []).length}</span></div>
        <textarea class="textarea" id="spaceMemo" placeholder="写一句悄悄话，寄给 TA...">${escapeHTML(sp.memo)}</textarea>
        <button class="space-btn" onclick="saveSpace()">寄出</button>
        ${(sp.notes || []).length ? `<div class="space-note-list">${sp.notes.slice(0, 6).map(n => `<div class="space-note"><p>${escapeHTML(n.text)}</p><time>${escapeHTML(n.date || '')}</time></div>`).join('')}</div>` : ''}
      </div>
    </div>`;
}
function renderSpace() {
  window._spaceTarget = 'app';
  c().innerHTML = spaceInnerHtml();
  c().style.background = '#fdf6f7';
  const ah = document.querySelector('.app-header');
  if (ah) ah.style.background = '#fdf6f7';
  const ha = document.querySelector('.header-action');
  if (ha) ha.style.color = '#c2507d';
  clearInterval(spaceFxTimer);
  spaceFxTimer = setInterval(function () { spawnSpaceHearts(1 + (Math.random() < 0.5 ? 1 : 0)); }, 480);
}
function refreshSpaceView() {
  if (window._spaceTarget === 'home') renderHomeCouple();
  else renderSpace();
}
function openHomeCouple() {
  var role = activeRole();
  if (!role) { showIGToast('还没有伴侣可以互动哦'); return; }
  window._spaceTarget = 'home';
  renderHomeCouple();
}
function closeHomeCouple() {
  var el = $('homeCouple');
  if (el) el.style.display = 'none';
  if (spaceFxTimer) { clearInterval(spaceFxTimer); spaceFxTimer = null; }
  window._spaceTarget = 'app';
}
function renderHomeCouple() {
  var el = $('homeCouple');
  if (!el) return;
  el.innerHTML = spaceInnerHtml();
  el.style.display = 'block';
  el.style.background = '#fdf6f7';
  clearInterval(spaceFxTimer);
  spaceFxTimer = setInterval(function () { spawnSpaceHearts(1 + (Math.random() < 0.5 ? 1 : 0)); }, 480);
}

// ===== 家园 · 换小人形象 / 装修 =====
function homeCharDisplay(who) {
  var h = state.home;
  return (who === 'ta') ? (h.partnerChar || { type: '', value: '' }) : (h.char || { type: '', value: '' });
}
var HOME_DEFAULT_PERSON = 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg';
function resolveHomeChar(who) {
  var f = homeCharDisplay(who);
  if (f.type === 'image' && f.value) return { url: f.value };
  if (f.type === 'emoji' && f.value) return { emoji: f.value };
  if (f.type === 'avatar') {
    var av = who === 'ta'
      ? (activeRole() && activeRole().avatar)
      : ((state.myProfile && (state.myProfile.avatarImage || state.myProfile.avatar)) || (activeProfile() && activeProfile().avatar));
    if (typeof av === 'string' && /^(https?:|data:|\/)/.test(av)) return { url: av };
    return { url: HOME_DEFAULT_PERSON };
  }
  if (who === 'ta') {
    var rp = activeRole();
    if (rp && rp.avatar && typeof rp.avatar === 'string' && /^(https?:|data:|\/)/.test(rp.avatar)) return { url: rp.avatar };
  }
  return { url: HOME_DEFAULT_PERSON };
}
function homeCharSize(who) { return who === 'ta' ? (state.home.taSize || 11) : (state.home.mySize || 11); }
function homePersonHtml(id, who, pos) {
  var face = resolveHomeChar(who);
  var size = homeCharSize(who);
  var bg = face.url ? "background-image:url('" + escapeHTML(face.url) + "')" : '';
  var inner = face.emoji ? '<span class="home-person-emoji">' + escapeHTML(face.emoji) + '</span>' : '';
  var tag = (who === 'ta') ? '<span class="home-partner-tag">❤ ' + escapeHTML((activeRole() && activeRole().name) || 'TA') + '</span>' : '';
  var title = (who === 'ta') ? ' title="和 ' + escapeHTML((activeRole() && activeRole().name) || 'TA') + ' 互动"' : '';
  var depthStyle = '';
  if (state.home && state.home.activeRoom === 'living') {
    var pd = Math.max(0, Math.min(100, pos.y)) / 100;
    depthStyle = ';transform:translate(-50%,-100%) scale(' + (0.6 + pd * 0.8).toFixed(3) + ');transform-origin:50% 100%;animation:none;z-index:' + Math.round(20 + pos.y);
  }
  return '<div id="' + id + '" class="' + (who === 'ta' ? 'home-partner' : 'home-person') + '" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + size + '%;' + bg + depthStyle + '"' + title + '>' + inner + tag + '</div>';
}
function openHomeCharEdit(tab) {
  window._homeCharTab = (tab === 'ta') ? 'ta' : 'me';
  renderHomeCharPanel();
}
function closeHomeCharEdit() { var el = $('homeCharEdit'); if (el) el.style.display = 'none'; }
function switchHomeCharTab(tab) { window._homeCharTab = tab; renderHomeCharPanel(); }
function applyHomeCharToPerson(who) {
  var el = $(who === 'ta' ? 'homePartner' : 'homePerson');
  if (!el) return;
  var face = resolveHomeChar(who);
  var ex = el.querySelector('.home-person-emoji');
  if (face.emoji) {
    el.style.backgroundImage = 'none';
    if (!ex) { ex = document.createElement('span'); ex.className = 'home-person-emoji'; el.appendChild(ex); }
    ex.textContent = face.emoji;
  } else {
    if (ex) ex.remove();
    el.style.backgroundImage = (face && face.url) ? "url('" + face.url + "')" : 'none';
  }
  el.style.width = homeCharSize(who) + '%';
}
function homeCharPickFile(who, input) {
  var file = input.files && input.files[0]; if (!file) return;
  var reader = new FileReader();
  reader.onload = function (e) {
    var url = e.target.result;
    if (who === 'ta') state.home.partnerChar = { type: 'image', value: url };
    else state.home.char = { type: 'image', value: url };
    saveState(); applyHomeCharToPerson(who); renderHomeCharPanel();
  };
  reader.readAsDataURL(file);
}
function homeCharSetDefault(who) {
  if (who === 'ta') state.home.partnerChar = { type: '', value: '' };
  else state.home.char = { type: '', value: '' };
  saveState(); applyHomeCharToPerson(who); renderHomeCharPanel();
}
function homeCharSetAvatar(who) {
  if (who === 'ta') state.home.partnerChar = { type: 'avatar', value: '' };
  else state.home.char = { type: 'avatar', value: '' };
  saveState(); applyHomeCharToPerson(who); renderHomeCharPanel();
}
function homeCharResize(who, val) {
  val = Math.max(6, Math.min(40, Number(val) || 11));
  if (who === 'ta') state.home.taSize = val; else state.home.mySize = val;
  saveState();
  var el = $(who === 'ta' ? 'homePartner' : 'homePerson');
  if (el) el.style.width = val + '%';
  var lab = $('homeCharSizeVal'); if (lab) lab.textContent = val + '%';
}
function renderHomeCharPanel() {
  var el = $('homeCharEdit'); if (!el) return;
  var tab = window._homeCharTab || 'me';
  var who = tab;
  var hasPartner = !!activeRole();
  if (tab === 'ta' && !hasPartner) { tab = 'me'; who = 'me'; window._homeCharTab = 'me'; }
  var f = homeCharDisplay(who);
  var face = resolveHomeChar(who);
  var size = homeCharSize(who);
  var usingImage = (f.type === 'image' && f.value);
  var usingAvatar = (f.type === 'avatar');
  var usingDefault = (!usingImage && !usingAvatar);
  var faceInner = face.emoji ? '<span class="char-face-emoji">' + escapeHTML(face.emoji) + '</span>' : '';
  var faceStyle = face.emoji ? '' : "background-image:url('" + escapeHTML(face.url) + "')";
  var taTab = hasPartner ? '<button class="char-tab' + (tab === 'ta' ? ' on' : '') + '" onclick="switchHomeCharTab(\'ta\')">' + escapeHTML(activeRole().name) + '</button>' : '';
  var sourceHtml = '<button class="char-src' + (usingDefault ? ' on' : '') + '" onclick="homeCharSetDefault(\'' + who + '\')">默认</button>'
    + '<label class="char-src' + (usingImage ? ' on' : '') + '">上传<input type="file" accept="image/*" style="display:none" onchange="homeCharPickFile(\'' + who + '\', this)"></label>';
  if (who !== 'ta') sourceHtml += '<button class="char-src' + (usingAvatar ? ' on' : '') + '" onclick="homeCharSetAvatar(\'' + who + '\')">头像</button>';
  el.innerHTML = `
    <div class="char-edit-card">
      <button class="char-edit-close" onclick="closeHomeCharEdit()" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="char-edit-tabs">
        <button class="char-tab${tab === 'me' ? ' on' : ''}" onclick="switchHomeCharTab('me')">我</button>
        ${taTab}
      </div>
      <div class="char-edit-avatar" id="charFacePreview" style="${faceStyle}">${faceInner}</div>
      <div class="char-edit-hint">${who === 'ta' ? 'TA' : '我'} · ${usingDefault ? (who === 'ta' ? '角色头像' : '默认形象') : (usingImage ? '已上传图片' : '我的头像')}</div>
      <div class="char-edit-size">
        <span>大小</span>
        <input type="range" min="6" max="40" step="1" value="${size}" oninput="homeCharResize('${who}', this.value)">
        <span id="homeCharSizeVal">${size}%</span>
      </div>
      <div class="char-edit-source">${sourceHtml}</div>
    </div>`;
  el.style.display = 'flex';
}

/* 给部分家具补上「和 TA 一起」的恋人互动（兼容旧存档） */
function ensureHomeCoupleActions() {
  var h = state.home; if (!h || !h.rooms) return;
  var defs = [
    { room: 'living', fid: 'fur-sofa', label: '和 TA 一起瘫', result: '小人靠在 TA 肩头，两个人什么都不用说，却很安心。' },
    { room: 'yard', fid: 'fur-swing', label: '和 TA 一起荡秋千', result: '小人拉着 TA 坐上秋千，脚尖点地，风把两个人的头发都吹得乱乱的。' }
  ];
  defs.forEach(function (d) {
    var room = h.rooms[d.room];
    if (!room || !room.furniture) return;
    var f = room.furniture.find(function (x) { return x.id === d.fid; });
    if (f && f.actions && !f.actions.some(function (a) { return a.cid === 'couple'; })) {
      f.actions.push({ cid: 'couple', label: d.label, result: d.result, kiss: true });
      saveState();
    }
  });
}

/* TA 走到某件家具旁 */
function homePartnerWalkTo(f) {
  var h = state.home; if (!h) return;
  h.partnerPos = { x: Math.min(94, Math.max(4, f.x + (f.w / 2) - 4)), y: Math.min(86, Math.max(4, f.y + f.h - 14)) };
  saveState();
  var p = $('homePartner');
  if (p) { p.style.left = h.partnerPos.x + '%'; p.style.top = h.partnerPos.y + '%'; }
}

/* 恋人互动飘心特效 */
function homeCoupleFx() {
  for (var i = 0; i < 8; i++) {
    (function () {
      var h = document.createElement('div');
      h.className = 'space-scene-heart';
      h.textContent = '💗';
      h.style.left = (Math.random() * window.innerWidth) + 'px';
      h.style.top = (window.innerHeight * 0.6) + 'px';
      h.style.position = 'fixed';
      document.body.appendChild(h);
      setTimeout(function () { h.remove(); }, 1800);
    })();
  }
}
function furEmoji(fid) {
  var map = {
    'fur-sofa': '🛋️', 'fur-table': '🪑', 'fur-plant': '🌱', 'fur-tv': '📺', 'fur-tvcabinet': '📺',
    'fur-shelf': '📚', 'fur-lamp': '💡', 'fur-pot': '🪴',
    'fur-desk': '📖', 'fur-fridge': '🧊', 'fur-coffee': '☕', 'fur-painting': '🖼️',
    'fur-bathtub': '🛁', 'fur-shower': '🚿', 'fur-sink': '🚿', 'fur-mirror': '🪞',
    'fur-toilet': '🚽', 'fur-towel': '🧺', 'fur-stool': '🪑', 'fur-candle': '🕯️',
    'fur-scale': '⚖️', 'fur-plant-bath': '🪴'
  };
  return map[fid] || '📦';
}
function furArt(fid) {
  if (fid === 'fur-plant') {
    return '<div class="fur-plant-pot"><div class="fpp-pot"></div><div class="fpp-stem"></div><div class="fpp-leaf l1"></div><div class="fpp-leaf l2"></div><div class="fpp-leaf l3"></div></div>';
  }
  if (fid === 'fur-sofa') {
    return '<div class="fur-sofa">'
      + '<div class="fs-shadow"></div>'
      + '<div class="fs-back"></div>'
      + '<div class="fs-seat"></div>'
      + '<div class="fs-arm fs-arm-l"></div>'
      + '<div class="fs-arm fs-arm-r"></div>'
      + '<div class="fs-cushion fs-c1"></div>'
      + '<div class="fs-cushion fs-c2"></div>'
      + '<div class="fs-leg fs-leg-l"></div>'
      + '<div class="fs-leg fs-leg-r"></div>'
      + '</div>';
  }
  if (fid === 'fur-table') {
    return '<div class="fur-table">'
      + '<div class="ft-top"></div>'
      + '<div class="ft-cup"></div>'
      + '<div class="ft-leg ft-leg-l"></div>'
      + '<div class="ft-leg ft-leg-r"></div>'
      + '</div>';
  }
  if (fid === 'fur-lamp') {
    return '<div class="fur-lamp">'
      + '<div class="fl-glow"></div>'
      + '<div class="fl-shade"></div>'
      + '<div class="fl-pole"></div>'
      + '<div class="fl-base"></div>'
      + '</div>';
  }
  if (fid === 'fur-pot') {
    return '<div class="fur-pot">'
      + '<div class="fp-leaf fp-leaf-l1"></div>'
      + '<div class="fp-leaf fp-leaf-l2"></div>'
      + '<div class="fp-leaf fp-leaf-l3"></div>'
      + '<div class="fp-stem"></div>'
      + '<div class="fp-pot"></div>'
      + '</div>';
  }
  if (fid === 'fur-shelf') {
    var bookColors = ['#f6a8c0', '#f9c98a', '#a9d68f', '#9fc9e8', '#c9a9e8', '#f0d27a'];
    var shelfRows = [{ sl: 34, h: 27 }, { sl: 66, h: 25 }, { sl: 100, h: 23 }];
    var books = '';
    shelfRows.forEach(function (r, ri) {
      var n = (ri === 1) ? 5 : 4;
      var gap = 84 / n;
      for (var i = 0; i < n; i++) {
        var cw = gap * 0.68;
        var left = 9 + i * gap + (gap - cw) / 2;
        var col = bookColors[(i + ri) % bookColors.length];
        books += '<div class="fsh-book" style="left:' + left.toFixed(1) + '%;top:' + (r.sl - r.h) + '%;height:' + r.h + '%;width:' + cw.toFixed(1) + '%;background:' + col + '"></div>';
      }
    });
    return '<div class="fur-shelf">'
      + '<div class="fsh-frame"></div>'
      + '<div class="fsh-shelf s1"></div>'
      + '<div class="fsh-shelf s2"></div>'
      + books
      + '</div>';
  }
  if (fid === 'fur-cabinet') {
    return '<div class="fur-cabinet">'
      + '<div class="fc-top"></div>'
      + '<div class="fc-body"></div>'
      + '<div class="fc-door d1"></div>'
      + '<div class="fc-door d2"></div>'
      + '<div class="fc-handle h1"></div>'
      + '<div class="fc-handle h2"></div>'
      + '</div>';
  }
  if (fid === 'fur-coffee') {
    return '<div class="fur-coffee">'
      + '<div class="fcm-steam"></div>'
      + '<div class="fcm-top"></div>'
      + '<div class="fcm-body"></div>'
      + '<div class="fcm-nozzle"></div>'
      + '<div class="fcm-btn b1"></div>'
      + '<div class="fcm-btn b2"></div>'
      + '<div class="fcm-cup"></div>'
      + '</div>';
  }
  var em = furEmoji(fid);
  return '<div class="fur-emoji">' + em + '</div>';
}
function livingRoomArt() {
  return ''
    + '<div class="lr-wall"></div>'
    + '<div class="lr-corner lr-corner-l"></div>'
    + '<div class="lr-backcorner"></div>'
    + '<div class="lr-floor"></div>'
    + '<div class="lr-rug"></div>';
}
function bathroomFurArt(fid) { return furArt(fid); }
function spaceSwitchRole() {
  const roles = state.roles;
  if (!roles.length) return;
  const idx = Math.max(0, roles.findIndex(r => r.id === activeRole().id));
  const next = roles[(idx + 1) % roles.length];
  state.activeRoleId = next.id;
  saveState();
  refreshSpaceView();
}
function saveSpace() {
  const sp = spaceFor(activeRole().id);
  const t = $('spaceMemo').value.trim();
  if (!t) return alert('写点想说的话再寄出吧');
  sp.notes.unshift({ text: t, date: new Date().toLocaleString() });
  sp.memo = '';
  saveState();
  refreshSpaceView();
  showIGToast('💌 悄悄话已寄出');
}
function spaceKiss() {
  const sp = spaceFor(activeRole().id);
  const k = spaceDailyKey();
  const daily = sp.daily[k] || (sp.daily[k] = {});
  if (sp.lastKissKey === k) {
    const n = Number(daily.kissed) || 0;
    if (n >= 10) { showIGToast('💋 今天啵够啦，明天再来～'); return; }
    daily.kissed = n + 1;
  } else {
    sp.lastKissKey = k;
    daily.kissed = 1;
  }
  sp.kisses += 1;
  sp.intimacy += 2;
  saveState();
  spaceHeartBurst();
  const beat = $('spaceBeat');
  if (beat) { beat.classList.remove('pulse'); void beat.offsetWidth; beat.classList.add('pulse'); }
  updateSpaceStats();
  const reply = $('spaceKissReply');
  if (reply) {
    reply.textContent = SPACE_KISS_LINES[Math.floor(Math.random() * SPACE_KISS_LINES.length)];
    reply.classList.remove('show'); void reply.offsetWidth; reply.classList.add('show');
    clearTimeout(reply._t);
    reply._t = setTimeout(function () { reply.classList.remove('show'); }, 2200);
  }
}
function spaceLoveLine() {
  const sp = spaceFor(activeRole().id);
  const day = spaceCurrDaily();
  const n = Number(day.lines) || 0;
  if (n >= 5) { showIGToast('· 今天的情话听够啦，明天再来 ·'); return; }
  day.lines = n + 1;
  sp.intimacy += 1;
  saveState();
  const box = $('spaceLineBox');
  if (box) { box.textContent = SPACE_LINES[Math.floor(Math.random() * SPACE_LINES.length)]; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
  spawnSpaceHearts(2);
  updateSpaceStats();
  showIGToast('· 收到一句甜甜的情话，+1 ·');
}

// ---------- 线下 · 今日见面 ----------
const OFFLINE_SCENES = [
  { id: 'cafe', icon: '☕', name: '街角咖啡馆', bg: 'linear-gradient(150deg,#fff6ef 0%,#ffe9dc 55%,#ffdccf 100%)', lines: ['TA 把最甜的奶盖轻轻推到你面前，说“小心烫”。', '窗边的位置正好有阳光，TA 笑起来的眼睛亮晶晶的。', '你们点了同一杯名字很好听的拿铁，喝到一半偷换了一下。'] },
  { id: 'park', icon: '🌳', name: '傍晚公园', bg: 'linear-gradient(150deg,#f2fbee 0%,#dff3e0 55%,#cfe9d8 100%)', lines: ['沿着湖边慢慢走，TA 悄悄把手指扣进你的指缝。', '风把 TA 的头发吹乱了，你伸手帮她理了理。', '路灯亮起来的那一刻，TA 突然停下来看了你很久。'] },
  { id: 'cinema', icon: '🎬', name: '深夜电影院', bg: 'linear-gradient(150deg,#f4effb 0%,#e7dcf6 55%,#dccff0 100%)', lines: ['电影放到煽情处，TA 把爆米花桶往你这边挪了挪。', '黑暗中，TA 的手轻轻搭在你的手背上。', '散场的时候，TA 说“刚刚那场，其实就是想和你一起看”。'] },
  { id: 'night', icon: '🌙', name: '夜市小摊', bg: 'linear-gradient(150deg,#fff2e8 0%,#ffdfc4 55%,#f7c9ae 100%)', lines: ['TA 举着一串烤肠跑到你面前，烫得直吹气也要喂你。', '人潮里 TA 一直牵着你，怕你走散。', '你们并排坐在长椅上，夜市的风都是甜的。'] }
];
const OFFLINE_TIMES = ['今天下午', '今晚', '明天中午', '周末'];
function offlineScene() {
  const sp = spaceFor(activeRole().id);
  const cur = (sp.offlineScene || 'cafe');
  return OFFLINE_SCENES.find(s => s.id === cur) || OFFLINE_SCENES[0];
}
function offlineFx(n) {
  const stage = document.querySelector('.offline-scene');
  if (!stage) return;
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    if (Math.random() < 0.3) {
      h.className = 'space-fx-bubble';
      h.style.left = (8 + Math.random() * 84) + '%';
      h.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
    } else {
      h.className = 'space-scene-heart' + (Math.random() < 0.5 ? ' spin' : '');
      h.textContent = SPACE_HEART_SYMS[Math.floor(Math.random() * SPACE_HEART_SYMS.length)];
      h.style.fontSize = (9 + Math.random() * 5) + 'px';
      h.style.left = (5 + Math.random() * 90) + '%';
      h.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    }
    stage.appendChild(h);
    const dur = parseFloat(h.style.animationDuration || '1.8');
    setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, (dur + 0.8) * 1000);
  }
}
function offlineDate() {
  const sp = spaceFor(activeRole().id);
  if (!sp.offlineDate) sp.offlineDate = { state: 'none', sceneId: sp.offlineScene || 'cafe', atMsgIndex: 0 };
  return sp.offlineDate;
}
function offlineAiCfg() {
  var ap = state.apiProfiles && state.activeApiProfile
    ? state.apiProfiles.find(function(p) { return p.id === state.activeApiProfile; }) : null;
  return ap || state.api;
}
function offlineAiOk() {
  const cfg = offlineAiCfg();
  return cfg && cfg.key && cfg.url && cfg.model;
}
var offlineTyping = false;
function offlineChatList() {
  const sp = spaceFor(activeRole().id);
  if (!Array.isArray(sp.offlineChat)) sp.offlineChat = [];
  return sp.offlineChat;
}
function renderOffline() {
  const role = activeRole();
  const sp = spaceFor(role.id);
  const sc = offlineScene();
  const d = offlineDate();
  const dating = d.state === 'dating';
  const list = sp.offlineChat || [];
  const meAv = renderAvatar(state.myProfile && (state.myProfile.avatarImage || state.myProfile.avatar) || activeProfile().avatar, '我');
  const roleAv = renderAvatar(role.avatar, role.name);
  const chatHTML = list.length
    ? list.map(offlineMsgHTML).join('') + (offlineTyping ? `<div class="offline-msg"><span class="offline-msg-av">${roleAv}</span><div class="offline-msg-bub typing"><span class="comic-tdot"></span><span class="comic-tdot"></span><span class="comic-tdot"></span></div></div>` : '')
    : `<div class="offline-chat-empty">选个地方，点「邀请见面」，TA 会在这里回复你。</div>`;
  const zoneHTML = dating ? `
    <div class="off-dialogue-input"><input id="offlineInput" placeholder="对 ${escapeHTML(role.name)} 说点什么…" onkeydown="if(event.key==='Enter')offlineSend()"><button onclick="offlineSend()">发送</button></div>
    <button class="offline-cta ghost" onclick="offlineEnd()">🌙 结束约会 · AI 写进记忆</button>
  ` : d.state === 'waiting' ? `
    <div class="off-status">📨 邀请函已发出，等 ${escapeHTML(role.name)} 回复…</div>
  ` : d.state === 'rejected' ? `
    <div class="off-status">😢 ${escapeHTML(role.name)} 这次婉拒了，换个时间再战</div>
    <button class="offline-cta" onclick="offlineInvite()">💌 再邀请一次</button>
  ` : `
    <div class="off-status">挑个地方，把 ${escapeHTML(role.name)} 约出来</div>
    <button class="offline-cta" onclick="offlineInvite()">💌 邀请 ${escapeHTML(role.name)} 出来见面</button>
  `;
  setTitle('线下');
  c().innerHTML = `
    <div class="offline-wrap">
      <div class="offline-scene" id="offlineScene" style="background:${sc.bg}">
        <div class="comic-scene-overlay"></div>
        <div class="off-hud">
          <button class="off-loc"${dating ? ' disabled' : ''} onclick="toggleScenePicker()">${sc.icon} ${escapeHTML(sc.name)} <span class="off-caret">▾</span></button>
          <div class="off-sweet">💖 <b id="offlineInt">${sp.intimacy}</b></div>
        </div>
        <div class="off-scene-picker" id="offScenePicker" style="display:none">
          ${OFFLINE_SCENES.map(s => `<button class="off-scene-pick${s.id === sc.id ? ' on' : ''}"${dating ? ' disabled' : ''} onclick="offlinePickScene('${s.id}')"><span class="off-pick-icon">${s.icon}</span><span class="off-pick-name">${escapeHTML(s.name)}</span></button>`).join('')}
        </div>
        <div class="off-dialogue">
          <div class="off-chat-head">${dating ? '约会中 · 此刻面对面' : (list.length ? '上次见面' : '线下约会 · 待开始')}</div>
          <div class="offline-chat-list">${chatHTML}</div>
          <div class="off-cta-zone">${zoneHTML}</div>
          <div class="offline-tip">TA 会答应或婉拒；答应后进入约会，结束由 AI 把这次见面写进记忆。</div>
        </div>
      </div>
    </div>`;
  const mc = c();
  mc.style.padding = '0';
  mc.style.display = 'flex';
  mc.style.flexDirection = 'column';
  mc.style.overflow = 'hidden';
  mc.style.background = '#f7eed8';
  const ah = document.querySelector('.app-header');
  if (ah) ah.style.background = '#f7eed8';
  const ha = document.querySelector('.header-action');
  if (ha) ha.style.color = '#2f2b28';
  const ol = document.querySelector('.offline-chat-list');
  if (ol) ol.scrollTop = ol.scrollHeight;
}
function offlinePick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function offlineMsgHTML(m) {
  const meAv = renderAvatar(state.myProfile && (state.myProfile.avatarImage || state.myProfile.avatar) || activeProfile().avatar, '我');
  const roleAv = renderAvatar(activeRole().avatar, activeRole().name);
  const me = m.who === 'me';
  if (m.type === 'invite') {
    const is = OFFLINE_SCENES.find(s => s.id === m.sceneId) || OFFLINE_SCENES[0];
    return `<div class="offline-msg me"><span class="offline-msg-av">${meAv}</span><div class="offline-invite-card"><div class="offline-invite-title">💌 约会邀请函</div><div class="offline-invite-row">📍 ${escapeHTML(is.name)}</div>${m.time ? `<div class="offline-invite-row">🕐 ${escapeHTML(m.time)}</div>` : ''}${m.note ? `<div class="offline-invite-note">${escapeHTML(m.note)}</div>` : ''}</div></div>`;
  }
  return `<div class="offline-msg ${me ? 'me' : ''}"><span class="offline-msg-av">${me ? meAv : roleAv}</span><div class="offline-msg-bub">${escapeHTML(m.text)}</div></div>`;
}
function offlineScrollBottom() {
  const ol = document.querySelector('.offline-chat-list');
  if (ol) ol.scrollTop = ol.scrollHeight;
}
function offlineAppendMsg(m) {
  const ol = document.querySelector('.offline-chat-list');
  if (!ol) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = offlineMsgHTML(m);
  ol.appendChild(wrap.firstElementChild);
  offlineScrollBottom();
}
function offlineSetTyping(on) {
  const ol = document.querySelector('.offline-chat-list');
  if (!ol) return;
  const old = ol.querySelector('.offline-msg-bub.typing');
  if (old && old.parentNode) old.parentNode.remove();
  if (on) {
    const roleAv = renderAvatar(activeRole().avatar, activeRole().name);
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="offline-msg"><span class="offline-msg-av">${roleAv}</span><div class="offline-msg-bub typing"><span class="comic-tdot"></span><span class="comic-tdot"></span><span class="comic-tdot"></span></div></div>`;
    ol.appendChild(wrap.firstElementChild);
  }
  offlineScrollBottom();
}
function offlineRefreshZone() {
  const role = activeRole();
  const d = offlineDate();
  const head = document.querySelector('.off-chat-head');
  if (head) head.textContent = d.state === 'dating' ? '约会中 · 此刻面对面' : '线下约会';
  const z = document.querySelector('.off-cta-zone');
  if (!z) return;
  z.innerHTML = d.state === 'dating'
    ? `<div class="off-dialogue-input"><input id="offlineInput" placeholder="对 ${escapeHTML(role.name)} 说点什么…" onkeydown="if(event.key==='Enter')offlineSend()"><button onclick="offlineSend()">发送</button></div>
       <button class="offline-cta ghost" onclick="offlineEnd()">🌙 结束约会 · AI 写进记忆</button>`
    : d.state === 'waiting'
    ? `<div class="off-status">📨 邀请函已发出，等 ${escapeHTML(role.name)} 回复…</div>`
    : d.state === 'rejected'
    ? `<div class="off-status">😢 ${escapeHTML(role.name)} 这次婉拒了，换个时间再战</div>
       <button class="offline-cta" onclick="offlineInvite()">💌 再邀请一次</button>`
    : `<div class="off-status">挑个地方，把 ${escapeHTML(role.name)} 约出来</div>
       <button class="offline-cta" onclick="offlineInvite()">💌 邀请 ${escapeHTML(role.name)} 出来见面</button>`;
}
function toggleScenePicker() {
  const p = $('offScenePicker');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'flex' : 'none';
}
function offlinePickScene(id) {
  const sp = spaceFor(activeRole().id);
  if (offlineDate().state === 'dating') return;
  if (sp.offlineScene === id) return;
  sp.offlineScene = id;
  offlineDate().sceneId = id;
  saveState();
  renderOffline();
  offlineFx(4);
}
async function offlineCallAI(text, hint) {
  const role = activeRole();
  const prevMode = role.mode;
  role.mode = 'offline';
  let systemPrompt;
  try { systemPrompt = buildRoleSystemPrompt(role, text); } finally { role.mode = prevMode; }
  const list = offlineChatList();
  const history = list.slice(0, -1).slice(-12).map(m => ({ role: m.who === 'me' ? 'user' : 'assistant', content: m.text }));
  const cfg = offlineAiCfg();
  const ctrl = new AbortController();
  const tmr = setTimeout(function() { ctrl.abort(); }, 90000);
  try {
    const res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'system', content: systemPrompt + (hint ? '\n[此刻提示] ' + hint : '') }, ...history, { role: 'user', content: text }],
        max_tokens: cfg.maxTokens || 500,
        temperature: cfg.temp ?? 0.75,
        top_p: cfg.topP ?? 0.9,
        presence_penalty: cfg.presencePenalty ?? 0,
        frequency_penalty: cfg.frequencyPenalty ?? 0
      })
    });
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok) throw new Error((data.error && data.error.message) || res.status);
    var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '我在。').trim();
    return content;
  } finally {
    clearTimeout(tmr);
  }
}
async function offlineSend() {
  if (!offlineAiOk()) return alert('还没连上 AI，先去设置里连接一下。');
  const role = activeRole();
  if (offlineDate().state !== 'dating') return;
  const input = document.getElementById('offlineInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;
  const list = offlineChatList();
  list.push({ who: 'me', text: text, time: new Date().toLocaleString() });
  if (input) input.value = '';
  saveState();
  offlineAppendMsg(list[list.length - 1]);
  offlineTyping = true;
  offlineSetTyping(true);
  try {
    const reply = await offlineCallAI(text);
    if (offlineDate().state === 'dating') {
      list.push({ who: 'role', text: reply, time: new Date().toLocaleString() });
      saveState();
      offlineAppendMsg(list[list.length - 1]);
    }
  } catch (err) {
    list.push({ who: 'role', text: '（' + (err && err.message || err) + '）', time: new Date().toLocaleString() });
    saveState();
    offlineAppendMsg(list[list.length - 1]);
  }
  offlineTyping = false;
  offlineSetTyping(false);
}
function offlineInvite(fromChat) {
  const d = offlineDate();
  if (d.state === 'dating') {
    if (fromChat) { closeChat(); renderOffline(); showIGToast('你们已经在约会中啦 💕'); }
    return;
  }
  if (d.state === 'waiting') {
    if (fromChat) { closeChat(); hidePanels(); }
    showIGToast('💌 邀请函已经发出啦，等 TA 回复中…');
    return;
  }
  if (fromChat) {
    closeChat();
    hidePanels();
    renderOffline();
    toggleScenePicker();
    showIGToast('先挑个地方，再点「邀请」～');
    return;
  }
  renderOffline();
  offlineSubmitInvite();
}
function offlineAccept(reply) {
  const no = /下次|改天|不方便|没空|不了|抱歉|不好意思|没时间|不太行|先不了|算了吧|再说|以后再|别了吧|今天不行|这两天/;
  return !no.test(reply || '');
}
async function offlineSubmitInvite() {
  if (!offlineAiOk()) return alert('还没连上 AI，先去设置里连接一下。');
  const role = activeRole();
  const d = offlineDate();
  if (d.state === 'dating' || d.state === 'waiting') return;
  const scene = OFFLINE_SCENES.find(s => s.id === (d.sceneId || offlineScene().id)) || OFFLINE_SCENES[0];
  const time = OFFLINE_TIMES[0];
  const note = '';
  d.state = 'waiting'; d.sceneId = scene.id;
  const list = offlineChatList();
  const inviteMsg = { who: 'me', type: 'invite', text: '发来一封约会邀请函', sceneId: scene.id, time: time, note: note, ts: Date.now() };
  list.push(inviteMsg);
  saveState();
  offlineAppendMsg(inviteMsg);
  offlineRefreshZone();
  offlineTyping = true;
  offlineSetTyping(true);
  const ask = '我约你去' + scene.name + (time ? '（' + time + '）' : '') + (note ? '，' + note : '') + '，你有空来吗？';
  let reply = '';
  try {
    reply = await offlineCallAI(ask, '对方给你发来一份线下约会邀请函（地点、时间、附言），你可以答应也可以礼貌婉拒。若答应，用线下面对面的语气开心回应；若婉拒，温和地说出理由。');
  } catch (err) {
    reply = '（' + (err && err.message || err) + '）';
  }
  offlineTyping = false;
  offlineSetTyping(false);
  list.push({ who: 'role', text: reply, time: new Date().toLocaleString() });
  offlineAppendMsg(list[list.length - 1]);
  if (offlineAccept(reply)) {
    d.state = 'dating';
    saveState();
    offlineRefreshZone();
    showIGToast('🎉 ' + role.name + ' 答应啦，约会开始！');
  } else {
    d.state = 'rejected';
    saveState();
    offlineRefreshZone();
    showIGToast('😢 ' + role.name + ' 这次婉拒了，换个时间再试试');
  }
}
async function offlineEnd() {
  if (!offlineAiOk()) return alert('还没连上 AI，无法生成约会回忆。');
  const role = activeRole();
  const sp = spaceFor(role.id);
  const d = offlineDate();
  if (d.state !== 'dating') return;
  const sc = OFFLINE_SCENES.find(s => s.id === d.sceneId) || OFFLINE_SCENES[0];
  const msgs = (sp.offlineChat || []).map(m => (m.who === 'me' ? '我：' : role.name + '：') + m.text).join('\n');
  showIGToast('🧠 AI 正在把这次约会写进记忆…');
  let summary = null;
  try { summary = await offlineSummarize(msgs, role, sc); } catch (e) {}
  if (!Array.isArray(role.memories)) role.memories = [];
  if (summary) {
    role.memories.unshift({ id: 'mem-offline-' + Date.now(), title: '线下约会 · ' + sc.name, text: summary, date: new Date().toLocaleString() });
  } else {
    role.memories.unshift({ id: 'mem-offline-' + Date.now(), title: '线下约会 · ' + sc.name, text: '今天和' + role.name + '在' + sc.name + '度过了一段甜甜的时光。', date: new Date().toLocaleString() });
  }
  if (role.memories.length > 50) role.memories.length = 50;
  d.state = 'none';
  saveState();
  renderOffline();
  showIGToast(summary ? '💾 这次见面已写进 ' + role.name + ' 的记忆库' : '已写入记忆（AI 未响应，用了备用文案）');
}
async function offlineSummarize(msgs, role, sc) {
  if (!msgs) return null;
  const cfg = offlineAiCfg();
  if (!cfg || !cfg.key || !cfg.url || !cfg.model) return null;
  const ctrl = new AbortController();
  const tmr = setTimeout(function() { ctrl.abort(); }, 15000);
  try {
    const res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: '你是回忆记录器。把一次线下约会的对话浓缩成一句' + role.name + '视角的甜蜜回忆，20~45字，一句话，不要引号，不要解释。' },
          { role: 'user', content: '约会地点：' + sc.name + '\n对话：\n' + (msgs || '（没有对话）') + '\n请只输出那句回忆。' }
        ],
        max_tokens: 100,
        temperature: 0.8
      })
    });
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok) return null;
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    return text || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}
const SPACE_HEART_SYMS = ['♡', '♥', '·', '✦'];
function spawnSpaceHearts(n) {
  const stage = document.querySelector('.space-hero2');
  if (!stage) return;
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    const roll = Math.random();
    if (roll < 0.22) {
      h.className = 'space-fx-bubble';
      h.style.left = (8 + Math.random() * 84) + '%';
      h.style.animationDuration = (1.8 + Math.random() * 1.2) + 's';
      h.style.animationDelay = (Math.random() * 0.5) + 's';
    } else {
      h.className = 'space-scene-heart' + (roll < 0.5 ? ' spin' : '');
      h.textContent = SPACE_HEART_SYMS[Math.floor(Math.random() * SPACE_HEART_SYMS.length)];
      h.style.fontSize = (9 + Math.random() * 5) + 'px';
      h.style.left = (5 + Math.random() * 90) + '%';
      h.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      h.style.animationDelay = (Math.random() * 0.4) + 's';
    }
    stage.appendChild(h);
    const dur = parseFloat(h.style.animationDuration || '1.8');
    setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, (dur + 0.8) * 1000);
  }
}
function spaceHeartBurst() {
  const stage = document.querySelector('.space-hero2');
  if (!stage) return;
  const ring = document.createElement('div');
  ring.className = 'space-beat-ring';
  stage.appendChild(ring);
  setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring); }, 900);
  for (let i = 0; i < 9; i++) {
    const h = document.createElement('div');
    h.className = 'space-burst-heart';
    h.textContent = i % 2 ? '♥' : '♡';
    h.style.setProperty('--dx', (Math.random() * 130 - 65) + 'px');
    h.style.setProperty('--dy', (-60 - Math.random() * 80) + 'px');
    h.style.animationDelay = (Math.random() * 0.12) + 's';
    stage.appendChild(h);
    setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 1500);
  }
}
function updateSpaceStats() {
  const sp = spaceFor(activeRole().id);
  const int = sp.intimacy;
  const lv = spaceLevel(int);
  const nxt = spaceNext(int);
  const nameEl = document.querySelector('.space-h2-lvname');
  const intEl = document.querySelector('.space-h2-int');
  const bar = document.querySelector('.space-h2-bar i');
  if (nameEl) nameEl.textContent = lv.icon + ' ' + lv.name;
  if (intEl) intEl.textContent = int;
  if (bar) bar.style.width = (nxt ? Math.min(100, Math.round(((int - lv.need) / (nxt.need - lv.need)) * 100)) : 100) + '%';
}
function spaceTask(id, el) {
  const sp = spaceFor(activeRole().id);
  const day = spaceCurrDaily();
  if (day[id]) { showIGToast('· 今天已经做过啦，明天再甜一次 ·'); return; }
  day[id] = true;
  sp.intimacy += SPACE_REWARD;
  saveState();
  spawnSpaceHearts(2);
  updateSpaceStats();
  const row = el && el.closest ? el.closest('.space-task') : null;
  if (row) {
    row.classList.add('on');
    const dot = row.querySelector('.space-task-dot');
    if (dot) dot.classList.add('on');
    const pts = row.querySelector('.space-task-pts');
    if (pts) pts.textContent = '+' + SPACE_REWARD;
  }
  const doneEl = document.querySelector('.space-task-counter');
  if (doneEl) {
    const m = doneEl.textContent.match(/(\d+)\/(\d+)/);
    if (m) doneEl.textContent = (parseInt(m[1], 10) + 1) + '/' + m[2];
  }
  showIGToast('· 完成，甜度 +' + SPACE_REWARD + ' ·');
}

// ===== 自定义表情包 =====
let stickerFormMode = null;
var stickerManageMode = false;
var stickerSelected = [];
var currentStickerCat = '默认';

function _ensureStickerFields() {
  var arr = state.customStickers || [];
  var changed = false;
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].category) { arr[i].category = '默认'; changed = true; }
    if (!arr[i].pack) { arr[i].pack = arr[i].category; changed = true; }
  }
  // 「默认」是固定默认文件夹，不应出现在文件夹列表里（否则会重复）
  if (state.stickerFolders && state.stickerFolders.indexOf('默认') > -1) {
    state.stickerFolders = state.stickerFolders.filter(function (f) { return f !== '默认'; });
    changed = true;
  }
  return changed;
}

function relayImgUrl(url) {
  if (!url || url.indexOf('data:') === 0) return url;
  var base = (typeof relayBase === 'function') ? relayBase() : '';
  return (base || '') + '/relay?url=' + encodeURIComponent(url);
}
function stickerImgFallback(el) {
  var u = el.getAttribute('data-fb');
  if (u && el.src !== relayImgUrl(u)) { el.onerror = null; el.src = relayImgUrl(u); }
}

function renderEmojiPanel() {
  var panel = $('emojiPanel');
  if (!panel) return;
  initStickerCatLongPress();
  _ensureStickerFields();
  var stickers = state.customStickers || [];

  // ===== 管理模式：在面板内选择 / 删除 / 移动 / 取消，不切画面 =====
  if (stickerManageMode) {
    var gridHtml = stickers.length ? stickers.map(function (s) {
      var sel = stickerSelected.indexOf(s.id) > -1;
      return '<div class="sp-card' + (sel ? ' selected' : '') + '" onclick="toggleStickerSelect(\'' + s.id + '\')">' +
        '<div class="sp-card-img"><img src="' + escapeHTML(s.image) + '" alt="' + escapeHTML(s.name) + '" referrerpolicy="no-referrer" data-fb="' + escapeHTML(s.src || s.image) + '" onerror="stickerImgFallback(this)"></div>' +
        '<div class="sp-card-name">' + escapeHTML(s.name) + '</div>' +
        (sel ? '<div class="sp-sel-badge">✓</div>' : '') +
      '</div>';
    }).join('') : '<div style="grid-column:1/-1;text-align:center;color:#ccc;font-size:12px;padding:20px 0">还没有贴图</div>';
  panel.innerHTML =
    '<div class="sp-header sp-manage-header">' +
      '<button class="sp-action" onclick="exitStickerManage()">取消</button>' +
      '<div style="flex:1"></div>' +
      '<button class="sp-action sp-danger" onclick="deleteSelectedStickers()">删除</button>' +
      '<button class="sp-action" onclick="moveSelectedStickers()">移动</button>' +
    '</div>' +
    '<div class="sticker-panel-grid" id="stickerPanelGrid">' + gridHtml + '</div>';
    return;
  }

  // ===== 正常模式 =====
  var folders = (state.stickerFolders || []).filter(function (f) { return f !== '默认'; });
  var cats = ['默认'].concat(folders);
  var stHtml = '';
  for (var j = 0; j < stickers.length; j++) {
    var s = stickers[j];
    stHtml += '<div class="sp-card" data-cat="' + escapeHTML(s.category || '默认') + '" data-name="' + escapeHTML((s.name || '').toLowerCase()) + '" onclick="sendSticker(\'' + s.id + '\')">' +
      '<div class="sp-card-img"><img src="' + escapeHTML(s.image) + '" alt="' + escapeHTML(s.name) + '" referrerpolicy="no-referrer" data-fb="' + escapeHTML(s.src || s.image) + '" onerror="stickerImgFallback(this)"></div>' +
      '<div class="sp-card-name">' + escapeHTML(s.name) + '</div></div>';
  }

  panel.innerHTML =
    '<div class="sp-header">' +
      '<div class="sp-search"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#aaa" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg><input id="stickerSearchInput" placeholder="搜寻贴图" oninput="filterStickerPanel()"></div>' +
      '<button class="sp-action" onclick="showStickerImportDialog()">导入</button>' +
      '<button class="sp-action" onclick="toggleStickerManage()">管理</button>' +
    '</div>' +
    '<div class="sticker-categories" id="stickerCategories">' + cats.map(function (c) {
      return '<button class="sticker-cat' + (c === currentStickerCat ? ' active' : '') + '" onclick="filterStickerByCat(this, \'' + escapeHTML(c) + '\')">' + escapeHTML(c) + '</button>';
    }).join('') + '<button class="sticker-cat sp-add-folder" onclick="addStickerFolder()" title="新建表情包文件夹">＋</button>' +
    '</div>' +
    '<div class="sticker-panel-grid" id="stickerPanelGrid">' +
      '<div class="sp-card sp-card-upload" onclick="showStickerImportDialog()">' +
        '<div class="sp-card-img sp-upload-icon">+</div>' +
        '<div class="sp-card-name">上传</div>' +
      '</div>' +
      (stHtml || '<div style="grid-column:1/-1;text-align:center;color:#ccc;font-size:12px;padding:20px 0">还没有贴图<br>点 + 上传或导入</div>') +
    '</div>';
  applyStickerCatFilter();
}

function toggleStickerManage() {
  stickerManageMode = !stickerManageMode;
  if (!stickerManageMode) stickerSelected = [];
  renderEmojiPanel();
}

function exitStickerManage() {
  stickerManageMode = false;
  stickerSelected = [];
  renderEmojiPanel();
}

function toggleStickerSelect(id) {
  var i = stickerSelected.indexOf(id);
  if (i > -1) stickerSelected.splice(i, 1);
  else stickerSelected.push(id);
  renderEmojiPanel();
}

function deleteSelectedStickers() {
  if (!stickerSelected.length) { if (window.uiToast) uiToast('先选择要删除的贴图'); return; }
  state.customStickers = (state.customStickers || []).filter(function (s) { return stickerSelected.indexOf(s.id) === -1; });
  stickerSelected = [];
  stickerManageMode = false;
  saveState();
  renderEmojiPanel();
}

function moveSelectedStickers() {
  if (!stickerSelected.length) { if (window.uiToast) uiToast('先选择要移动的贴图'); return; }
  showStickerFolderPicker();
}

function showStickerFolderPicker() {
  var folders = state.stickerFolders || [];
  var html = (folders.length ? folders.map(function (f, idx) {
    return '<div class="sp-folder-pick" onclick="moveSelectedToIdx(' + idx + ')">' + escapeHTML(f) + '</div>';
  }).join('') : '') + '<div class="sp-folder-pick sp-folder-new" onclick="addStickerFolderThenMove()">＋ 新建文件夹并移动</div>';
  var overlay = document.createElement('div');
  overlay.className = 'sticker-import-overlay active';
  overlay.id = 'stickerFolderPicker';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="sticker-import-sheet" onclick="event.stopPropagation()"><h3>移动到文件夹</h3>' + html + '<div class="sticker-import-actions"><button class="btn-cancel" onclick="var o=document.getElementById(\'stickerFolderPicker\');if(o)o.remove()">取消</button></div></div>';
  document.body.appendChild(overlay);
}

function moveSelectedToIdx(idx) {
  var folder = (state.stickerFolders || [])[idx];
  if (!folder) return;
  moveSelectedTo(folder);
}

function moveSelectedTo(folder) {
  var arr = state.customStickers || [];
  for (var i = 0; i < arr.length; i++) {
    if (stickerSelected.indexOf(arr[i].id) > -1) {
      arr[i].category = folder; arr[i].pack = folder;
    }
  }
  if (folder !== '默认' && state.stickerFolders.indexOf(folder) === -1) state.stickerFolders.push(folder);
  saveState();
  var o = document.getElementById('stickerFolderPicker'); if (o) o.remove();
  stickerSelected = [];
  stickerManageMode = false;
  currentStickerCat = folder;
  renderEmojiPanel();
}

async function addStickerFolderThenMove() {
  var input = await prompt('表情包合集命名');
  if (input === null || input === undefined) return;
  var name = String(input).trim();
  if (!name) return;
  if (!state.stickerFolders) state.stickerFolders = [];
  if (name !== '默认' && state.stickerFolders.indexOf(name) === -1) state.stickerFolders.push(name);
  saveState();
  var o = document.getElementById('stickerFolderPicker'); if (o) o.remove();
  moveSelectedTo(name);
}

async function addStickerFolder() {
  var input = await prompt('表情包合集命名');
  if (input === null || input === undefined) return;
  var name = String(input).trim();
  if (!name) return;
  if (!state.stickerFolders) state.stickerFolders = [];
  if (name !== '默认' && state.stickerFolders.indexOf(name) === -1) {
    state.stickerFolders.push(name);
    saveState();
  }
  renderEmojiPanel();
}

function showStickerFolderDeletePicker() {
  var folders = state.stickerFolders || [];
  if (!folders.length) { if (window.uiToast) uiToast('没有可删除的合集'); return; }
  var html = folders.map(function (f, idx) {
    return '<div class="sp-folder-pick" style="display:flex;align-items:center;gap:10px">' +
      '<span style="flex:1;text-align:left" onclick="deleteStickerFolderIdx(' + idx + ')">' + escapeHTML(f) + '</span>' +
      '<span class="sp-folder-del" onclick="deleteStickerFolderIdx(' + idx + ')">🗑</span>' +
    '</div>';
  }).join('');
  var overlay = document.createElement('div');
  overlay.className = 'sticker-import-overlay active';
  overlay.id = 'stickerFolderDeletePicker';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = '<div class="sticker-import-sheet" onclick="event.stopPropagation()"><h3>删除该合集</h3>' + html + '<div class="sticker-import-actions"><button class="btn-cancel" onclick="var o=document.getElementById(\'stickerFolderDeletePicker\');if(o)o.remove()">取消</button></div></div>';
  document.body.appendChild(overlay);
}

function deleteStickerFolderIdx(idx) {
  var folder = (state.stickerFolders || [])[idx];
  if (folder) deleteStickerFolderByName(folder);
}

function deleteStickerFolder() {
  var folder = _folderActionTarget;
  if (folder) deleteStickerFolderByName(folder);
}

function deleteStickerFolderByName(folder) {
  if (!folder) return;
  if (folder === '默认') { if (window.uiToast) uiToast('默认文件夹不能删除'); return; }
  var count = (state.customStickers || []).filter(function (s) { return (s.category || '') === folder; }).length;
  if (!confirm('删除合集「' + folder + '」？里面的 ' + count + ' 张贴图也会一并删除。')) return;
  state.stickerFolders = (state.stickerFolders || []).filter(function (f) { return f !== folder; });
  state.customStickers = (state.customStickers || []).filter(function (s) { return (s.category || '') !== folder; });
  if (currentStickerCat === folder) currentStickerCat = '默认';
  saveState();
  var a = document.getElementById('folderActionMenu'); if (a) a.remove();
  var p = document.getElementById('stickerFolderDeletePicker'); if (p) p.remove();
  renderEmojiPanel();
}

function showFolderActionMenu(cat) {
  _folderActionTarget = cat;
  var overlay = document.createElement('div');
  overlay.className = 'sticker-import-overlay active';
  overlay.id = 'folderActionMenu';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="sticker-import-sheet" onclick="event.stopPropagation()">' +
      '<h3>' + escapeHTML(cat) + '</h3>' +
      '<div class="sp-folder-pick" onclick="renameStickerFolder()">重命名</div>' +
      '<div class="sp-folder-pick sp-folder-danger" onclick="deleteStickerFolder()">删除该合集</div>' +
      '<div class="sticker-import-actions"><button class="btn-cancel" onclick="var o=document.getElementById(\'folderActionMenu\');if(o)o.remove()">取消</button></div>' +
    '</div>';
  document.body.appendChild(overlay);
}

async function renameStickerFolder() {
  var old = _folderActionTarget;
  if (!old) return;
  if (old === '默认') { if (window.uiToast) uiToast('默认文件夹不能重命名'); var c0 = document.getElementById('folderActionMenu'); if (c0) c0.remove(); return; }
  var input = await prompt('重命名合集', old);
  if (input === null || input === undefined) return;
  var name = String(input).trim();
  if (!name || name === old) { var c = document.getElementById('folderActionMenu'); if (c) c.remove(); return; }
  var arr = state.customStickers || [];
  for (var i = 0; i < arr.length; i++) {
    if ((arr[i].category || '') === old) {
      arr[i].category = name; arr[i].pack = name;
      if (arr[i].name === old) arr[i].name = name;
    }
  }
  var folders = state.stickerFolders || [];
  var idx = folders.indexOf(old);
  if (idx > -1) folders[idx] = name;
  else if (folders.indexOf(name) === -1) folders.push(name);
  if (currentStickerCat === old) currentStickerCat = name;
  saveState();
  var o = document.getElementById('folderActionMenu'); if (o) o.remove();
  renderEmojiPanel();
}

var _lpTimer = null, _lpFired = false, _lpCat = '', _folderActionTarget = '';
function initStickerCatLongPress() {
  var panel = $('emojiPanel');
  if (!panel || panel._lpInit) return;
  panel._lpInit = true;
  function catOf(e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('.sticker-cat') : null;
    if (!btn || btn.classList.contains('sp-add-folder')) return null;
    return btn.textContent;
  }
  function start(cat) {
    if (!cat || cat === '默认') return;
    _lpFired = false;
    _lpCat = cat;
    clearTimeout(_lpTimer);
    _lpTimer = setTimeout(function () {
      _lpFired = true;
      if (navigator.vibrate) { try { navigator.vibrate(30); } catch (e) {} }
      showFolderActionMenu(_lpCat);
    }, 500);
  }
  function end() { clearTimeout(_lpTimer); }
  panel.addEventListener('mousedown', function (e) { start(catOf(e)); });
  panel.addEventListener('touchstart', function (e) { start(catOf(e)); }, { passive: true });
  panel.addEventListener('mouseup', end);
  panel.addEventListener('mouseleave', end);
  panel.addEventListener('touchend', end);
  panel.addEventListener('touchcancel', end);
  panel.addEventListener('touchmove', end);
  panel.addEventListener('contextmenu', function (e) { if (catOf(e)) e.preventDefault(); });
  panel.addEventListener('click', function (e) {
    if (_lpFired) { _lpFired = false; e.preventDefault(); e.stopPropagation(); }
  }, true);
}

function filterStickerByCat(btn, cat) {
  currentStickerCat = cat;
  applyStickerCatFilter();
}

// 根据 currentStickerCat 高亮对应分类按钮，并应用分类+搜索过滤（重渲染后也会调用，保证视图一致）
function applyStickerCatFilter() {
  var cats = document.querySelectorAll('#stickerCategories .sticker-cat');
  for (var i = 0; i < cats.length; i++) {
    cats[i].classList.toggle('active', cats[i].textContent === currentStickerCat);
  }
  filterStickerPanel();
}

function filterStickerPanel() {
  var search = ($('stickerSearchInput') || {}).value || '';
  var searchLower = search.toLowerCase();
  var cat = currentStickerCat || '默认';
  var cards = document.querySelectorAll('#stickerPanelGrid .sp-card:not(.sp-card-upload)');
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var matchCat = (card.getAttribute('data-cat') === cat);
    var matchSearch = !searchLower || (card.getAttribute('data-name') || '').indexOf(searchLower) > -1;
    card.style.display = (matchCat && matchSearch) ? '' : 'none';
  }
}

function showStickerImportDialog() {
  var overlay = document.createElement('div');
  overlay.className = 'sticker-import-overlay active';
  overlay.id = 'stickerImportOverlay';
  overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div class="sticker-import-sheet" onclick="event.stopPropagation()">' +
      '<h3>导入贴图</h3>' +
      '<p style="font-size:12px;color:#999;margin:0 0 12px">每行：名字：图片链接（名字可留空）。会放进当前所在的文件夹。</p>' +
      '<textarea id="stickerImportUrls" rows="8" placeholder="小猫：https://example.com/s1.png&#10;小狗：https://example.com/s2.png&#10;https://example.com/s3.png"></textarea>' +
      '<div class="sticker-import-actions">' +
        '<button class="btn-cancel" onclick="document.getElementById(\'stickerImportOverlay\').remove()">取消</button>' +
        '<button class="btn-cancel" onclick="refreshAllStickerImages()">刷新图片</button>' +
        '<button class="btn-primary" onclick="doImportStickers()">导入</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

async function doImportStickers() {
  var ta = $('stickerImportUrls');
  if (!ta) return;
  var folderInput = $('stickerImportFolder');
  var folder = (folderInput ? folderInput.value : '').trim();
  // 留空 → 放进当前所在文件夹；在「默认」里留空就进「默认」文件夹
  if (!folder) folder = (currentStickerCat && currentStickerCat !== '默认') ? currentStickerCat : '默认';
  var lines = ta.value.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
  if (!lines.length) { alert('请输入内容'); return; }
  if (!state.customStickers) state.customStickers = [];
  if (!state.stickerFolders) state.stickerFolders = [];
  if (folder !== '默认' && state.stickerFolders.indexOf(folder) === -1) state.stickerFolders.push(folder);
  // 重复识别：按链接(src/image)或名字判断，避免重复添加
  function normUrl(u) {
    if (!u) return '';
    u = String(u).trim();
    if (u.indexOf('data:') === 0) return u;
    return u.replace(/\?.*$/, '').replace(/\/$/, '').toLowerCase();
  }
  function normName(n) { return (n || '').trim().toLowerCase(); }
  var seenImg = {}, seenName = {};
  var exist = state.customStickers || [];
  for (var k = 0; k < exist.length; k++) {
    var ex = exist[k];
    if (ex.image) seenImg[normUrl(ex.image)] = true;
    if (ex.src) seenImg[normUrl(ex.src)] = true;
    if (ex.name) seenName[normName(ex.name)] = true;
  }
  var count = 0, skipped = 0, failCount = 0, firstErr = '';
  // 整批放进同一个文件夹；每行「名字：图片链接」的名字只是该贴图的标签，不会变成文件夹
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var m = /^(.+?)[：:]\s*(https?:\/\/\S+|data:image\/\S+)\s*$/.exec(line);
    var name, url;
    if (m) {
      name = m[1].trim();
      url = m[2].trim();
    } else if (/^https?:\/\//i.test(line) || line.indexOf('data:') === 0) {
      name = '';
      url = line;
    } else {
      continue;
    }
    var u = normUrl(url), n = normName(name);
    if ((u && seenImg[u]) || (n && seenName[n])) { skipped++; continue; }
    // 尽量把图片抓下来内嵌成 base64，避免图床防盗链导致不显示；失败则保留原链接
    var imgRes = await fetchImageAsDataUrl(url);
    var finalImg;
    if (imgRes.data) {
      finalImg = imgRes.data;
    } else {
      failCount++;
      if (!firstErr) firstErr = imgRes.error;
      finalImg = url;
    }
    var fu = normUrl(finalImg);
    // 抓下来后再次比对：已抓取成 base64 的旧图，重新粘贴同一链接也能识别为重复
    if ((fu && seenImg[fu]) || (u && seenImg[u]) || (n && seenName[n])) { skipped++; continue; }
    state.customStickers.push({
      id: 'stk-' + Date.now() + '-' + count,
      image: finalImg,
      src: url,
      name: name,
      meaning: '',
      category: folder,
      pack: folder,
      date: new Date().toLocaleString()
    });
    count++;
    if (u) seenImg[u] = true;
    if (fu) seenImg[fu] = true;
    if (n) seenName[n] = true;
  }
  if (count === 0) {
    if (failCount > 0) {
      alert('图片一张都没抓下来（' + failCount + ' 张失败）。\n' + (firstErr || '') + '\n\n本地能显示、Render 不显示，通常是图床屏蔽了 Render 服务器的 IP。\n解决办法：去设置里填一个「外置转发代理地址」（把 sever/ 部署到你自己的服务器或能访问图床的地方），所有抓取就走那个代理。');
    } else if (skipped > 0) {
      alert('识别到 ' + skipped + ' 张重复，实际导入 0 张');
    } else {
      alert('没看出有效的「名字：图片链接」哦\n每行格式：名字：图片链接\n例如：小猫：https://example.com/s1.png');
    }
    return;
  }
  if (failCount > 0 && window.uiToast) {
    uiToast(failCount + ' 张抓取失败（图床可能屏蔽了服务器 IP），已用原链接兜底');
  }
  saveState();
  if (window.uiToast) {
    if (skipped > 0) uiToast('识别到 ' + skipped + ' 张重复，实际导入 ' + count + ' 张');
    else uiToast('成功导入 ' + count + ' 张');
  }
  var overlay = $('stickerImportOverlay');
  if (overlay) overlay.remove();
  renderEmojiPanel();
}

// 经 /relay 代理抓取图片并转成 data URL（规避图床防盗链与跨域）
// 成功返回 { data: 'data:...' }；失败返回 { error: '原因' }
async function fetchImageAsDataUrl(url) {
  if (url.indexOf('data:') === 0) return { data: url };
  try {
    var res = await aiRequest(url, { method: 'GET' });
    if (!res.ok) return { error: 'relay 返回 ' + res.status + '（图床可能屏蔽了服务器 IP）' };
    var blob = await res.blob();
    if (!blob || !blob.size) return { error: 'relay 返回了空内容' };
    var data = await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.readAsDataURL(blob);
    });
    return { data: data };
  } catch (e) {
    return { error: '抓取失败：' + (e && e.message ? e.message : String(e)) };
  }
}

// 用修好的 /relay（已禁用缓存）重新抓取所有贴图图片，修复之前被缓存成同一张的错误
async function refreshAllStickerImages() {
  var arr = state.customStickers || [];
  if (!arr.length) { if (window.uiToast) uiToast('还没有表情包'); return; }
  var done = 0;
  for (var i = 0; i < arr.length; i++) {
    var s = arr[i];
    var url = s.src || (typeof s.image === 'string' && /^https?:\/\//i.test(s.image) ? s.image : '');
    if (!url) continue;
    var imgRes = await fetchImageAsDataUrl(url);
    if (imgRes.data) { s.image = imgRes.data; done++; }
  }
  saveState();
  if (window.uiToast) uiToast('已刷新 ' + done + ' 张图片');
  renderEmojiPanel();
}

function sendSticker(id) {
  const s = (state.customStickers || []).find(x => x.id === id);
  if (!s) return;
  hidePanels();
  appendBubble('user', '', { type: 'image', src: s.image, stickerName: s.name, stickerMeaning: s.meaning }, '', 'sticker');
}

function renderStickerManager() {
  setTitle('表情包');
  const stickers = state.customStickers || [];
  c().innerHTML = `
    <div class="sticker-mgr-page">
      <div class="header">
        <h2>📦 表情包</h2>
        <button class="add-btn" onclick="openStickerForm()">＋ 添加</button>
      </div>
      ${stickers.length ? stickers.map(s => `
        <div class="card">
          <div class="preview"><img src="${escapeHTML(s.image)}"></div>
          <div class="info">
            <div class="name">${escapeHTML(s.name)}</div>
            <div class="meaning">${escapeHTML(s.meaning || '无含义')}</div>
          </div>
          <div class="actions">
            <button class="edit" onclick="openStickerForm('${s.id}')">编辑</button>
            <button class="del" onclick="deleteSticker('${s.id}')">删除</button>
          </div>
        </div>`).join('') : '<div style="text-align:center;color:#ccc;padding:40px 0;font-size:14px">还没有表情包<br><span style="font-size:12px">点右上角 ＋ 添加</span></div>'}
    </div>`;
}

function openStickerForm(id) {
  stickerFormMode = id || null;
  const s = id ? (state.customStickers || []).find(x => x.id === id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'sticker-form-overlay active';
  overlay.id = 'stickerFormOverlay';
  overlay.onclick = e => { if (e.target === overlay) closeStickerForm(); };
  overlay.innerHTML = `
    <div class="sticker-form-sheet" onclick="event.stopPropagation()">
      <h3>${s ? '编辑表情包' : '添加表情包'}</h3>
      <label>图片</label>
      <div class="upload-area" id="stickerUploadArea" onclick="document.getElementById('stickerFileInput').click()">${s ? `<img src="${escapeHTML(s.image)}">` : '＋'}</div>
      <input type="file" id="stickerFileInput" accept="image/*" style="display:none" onchange="stickerPickImage(event)">
      <input type="hidden" id="stickerImageVal" value="${s ? escapeHTML(s.image) : ''}">
      <label>名称</label>
      <input id="stickerName" placeholder="给表情包取个名字" value="${s ? escapeHTML(s.name) : ''}">
      <label>含义说明（可选）</label>
      <textarea id="stickerMeaning" placeholder="这个表情表达什么含义？">${s ? escapeHTML(s.meaning || '') : ''}</textarea>
      <div class="actions">
        <button class="cancel" onclick="closeStickerForm()">取消</button>
        <button class="save" onclick="saveStickerForm()">保存</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function closeStickerForm() {
  const o = document.getElementById('stickerFormOverlay');
  if (o) o.remove();
  stickerFormMode = null;
}

function stickerPickImage(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 150;
      let w = img.width, h = img.height;
      if (w > max || h > max) {
        if (w > h) { h = Math.round(h * max / w); w = max; }
        else { w = Math.round(w * max / h); h = max; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      document.getElementById('stickerImageVal').value = dataUrl;
      document.getElementById('stickerUploadArea').innerHTML = '<img src="' + dataUrl + '">';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function saveStickerForm() {
  const image = document.getElementById('stickerImageVal').value.trim();
  const name = document.getElementById('stickerName').value.trim();
  const meaning = document.getElementById('stickerMeaning').value.trim();
  if (!image) { alert('请选择图片'); return; }
  if (!name) { alert('请输入名称'); return; }
  if (stickerFormMode) {
    const s = state.customStickers.find(x => x.id === stickerFormMode);
    if (s) { s.image = image; s.name = name; s.meaning = meaning; }
  } else {
    state.customStickers.push({ id: 'stk-' + Date.now(), image, name, meaning, date: new Date().toLocaleString() });
  }
  closeStickerForm();
  saveState();
  renderStickerManager();
  renderEmojiPanel();
}

async function deleteSticker(id) {
  if (!await uiConfirm('删除这个表情包？')) return;
  state.customStickers = state.customStickers.filter(s => s.id !== id);
  saveState();
  renderStickerManager();
  renderEmojiPanel();
}
