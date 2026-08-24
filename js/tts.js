// ===== AI 语音播报 =====
// 平台一：MiniMax 海螺 t2a_v2（中文自然，返回 hex 音频）
// 平台二：小米 MiMo TTS（OpenAI 兼容 chat/completions，返回 base64 音频）
// 平台三：ElevenLabs text-to-speech（返回 mp3 二进制）
// 密钥按平台分开保存在主设置里；音色按角色在「聊天设置」里单独设（不同角色不同声音）。

var _ttsVoice = null;
var _ttsVoicesReady = false;
var _ttsCurBtn = null;
var _ttsAudio = null;
var _ttsAbort = null;
var _ttsSeq = 0; // 播放序号：每次 speakText +1，用于识别"已被新的播放/停止取代"

// 各平台预设：默认模型 / 默认音色 / 官方地址 / 可选模型 / 音色候选（value + 说明）
var TTS_PRESETS = {
  minimax: {
    name: 'MiniMax 海螺',
    model: 'speech-02-hd', voice: 'female-shaonv', url: 'https://api.minimaxi.com',
    models: ['speech-02-hd', 'speech-02-turbo', 'speech-01-hd', 'speech-01-turbo'],
    voices: [
      ['female-shaonv', '少女'], ['female-yujie', '御姐'], ['female-chengshu', '成熟女声'],
      ['female-tianmei', '甜美女声'], ['male-qn-qingse', '青涩青年'], ['male-qn-jingying', '精英青年'],
      ['male-qn-badao', '霸道少爷'], ['presenter_female', '播报女声'], ['presenter_male', '播报男声']
    ],
    keyHint: '在 platform.minimaxi.com 创建的密钥'
  },
  mimo: {
    name: '小米 MiMo',
    model: 'mimo-v2.5-tts', voice: 'mimo_default', url: 'https://api.xiaomimimo.com',
    models: ['mimo-v2.5-tts'],
    voices: [['mimo_default', '默认'], ['冰糖', '冰糖'], ['茉莉', '茉莉'], ['苏打', '苏打'], ['白桦', '白桦'], ['Mia', 'Mia'], ['Chloe', 'Chloe'], ['Milo', 'Milo'], ['Dean', 'Dean']],
    keyHint: '在 mimo.mi.com 控制台创建的密钥'
  },
  elevenlabs: {
    name: 'ElevenLabs',
    model: 'eleven_multilingual_v2', voice: '21m00Tcm4TlvDq8ikWAM', url: 'https://api.elevenlabs.io',
    models: ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_v3'],
    voices: [
      ['21m00Tcm4TlvDq8ikWAM', 'Rachel 女'], ['EXAVITQu4vr4xnSDxMaL', 'Sarah 女'], ['FGY2WhTYpPnrIDTdsKH5', 'Laura 女'],
      ['Xb7hH8MSUJpSbSDYk0k2', 'Alice 女'], ['pFZP5JQG7iQjIQuC4Bku', 'Lily 女'], ['nPczCjzI2devNBz1zQrb', 'Brian 男'],
      ['JBFqnCBsd6RMkjVDRZzb', 'George 男'], ['N2lVS1w4EtoT3dr4eOWO', 'Callum 男'], ['onwK4e9ZLuTAKqWW03F9', 'Daniel 男'],
      ['cjVigY5qzO86Huf0OWal', 'Eric 男'], ['XrExE9yKIg1WjnnlVkGX', 'Matilda 女'], ['cgSgspJ2msm6clMCkdW9', 'Jessica 女']
    ],
    keyHint: '在 elevenlabs.io 拿的 xi-api-key'
  }
};
var TTS_PROVIDERS = ['minimax', 'mimo', 'elevenlabs'];

function _ttsPreset(p) { return TTS_PRESETS[p] || TTS_PRESETS.minimax; }
function _activeChar() { try { return activeCharacter(); } catch (e) { return null; } }

// 说话时用的平台：优先角色自己选的，否则主设置里的默认平台
function _ttsCharProvider() {
  var c = _activeChar();
  if (c && c.ttsProvider && TTS_PRESETS[c.ttsProvider]) return c.ttsProvider;
  var d = (state.settings && state.settings.ttsProvider) || 'minimax';
  return TTS_PRESETS[d] ? d : 'minimax';
}
// 音色：优先角色自己设的（按平台分），否则回退平台默认
function _ttsCharVoice() {
  var c = _activeChar();
  var p = _ttsCharProvider();
  if (c) {
    if (c.ttsVoices && c.ttsVoices[p]) return c.ttsVoices[p];
    if (c.ttsVoice) return c.ttsVoice; // 兼容旧的单字段
  }
  var s = state.settings || {};
  return (s.ttsVoices && s.ttsVoices[p]) || _ttsPreset(p).voice;
}
function _ttsGlobalModel(p) {
  var s = state.settings || {};
  return (s.ttsModels && s.ttsModels[p]) || _ttsPreset(p).model;
}
// 按平台取地址/密钥（各自独立保存）
function _ttsCfg(p) {
  var s = state.settings || {};
  var urls = s.ttsUrls || {};
  var keys = s.ttsKeys || {};
  var groups = s.ttsGroups || {};
  var preset = _ttsPreset(p);
  function _clean(v) { return String(v == null ? '' : v).replace(/[^\x20-\x7E]/g, '').trim(); }
  return {
    url: _clean(urls[p]) || preset.url,
    key: _clean(keys[p]),
    group: _clean(groups[p])
  };
}

function _ttsLangCode(lang) {
  var map = {
    '中文': 'zh-CN', 'English': 'en-US', '日本語': 'ja-JP', '한국어': 'ko-KR',
    'Français': 'fr-FR', 'Deutsch': 'de-DE', 'Español': 'es-ES', 'Русский': 'ru-RU'
  };
  return map[lang] || 'zh-CN';
}

function _ttsLoadVoices() {
  if (!('speechSynthesis' in window)) return;
  var list = speechSynthesis.getVoices();
  if (!list || !list.length) return;
  _ttsVoicesReady = true;
  var want = 'zh-CN';
  try {
    var c = activeCharacter();
    if (c && c.lang) want = _ttsLangCode(c.lang);
  } catch (e) {}
  _ttsVoice = null;
  var exact = list.filter(function(v) { return v.lang === want; });
  var loose = list.filter(function(v) { return v.lang && v.lang.indexOf(want.split('-')[0]) === 0; });
  var pool = exact.length ? exact : loose;
  var prefer = ['Xiaoxiao', 'Xiaoyi', 'Yunxi', 'Google 普通话', 'Ting-Ting', 'Tingting', 'Sin-ji', 'Mei-Jia'];
  for (var i = 0; i < prefer.length; i++) {
    var hit = pool.filter(function(v) { return v.name.indexOf(prefer[i]) >= 0; });
    if (hit.length) { _ttsVoice = hit[0]; break; }
  }
  if (!_ttsVoice && pool.length) _ttsVoice = pool[0];
  if (!_ttsVoice) _ttsVoice = list[0];
}

if ('speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = _ttsLoadVoices;
  _ttsLoadVoices();
}

function cleanTextForTTS(text) {
  return String(text || '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[*#~_`]{1,3}[^*#~_`]*[*#~_`]{1,3}/g, '')
    .replace(/\[[^\]]{0,20}\]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTTSSpeaking() {
  if (_ttsAudio) return true;
  return 'speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending);
}

function _setBtnOn(btn) {
  if (!btn) return;
  btn.textContent = '🔊';
  btn.classList.add('speaking');
  _ttsCurBtn = btn;
}
function _setBtnOff() {
  if (_ttsCurBtn) {
    _ttsCurBtn.textContent = '🔈';
    _ttsCurBtn.classList.remove('speaking');
    _ttsCurBtn = null;
  }
}
function stopSpeak() {
  _ttsSeq++;
  if (_ttsAudio) { try { _ttsAudio.pause(); _ttsAudio.src = ''; } catch (e) {} _ttsAudio = null; }
  if (_ttsAbort) { try { _ttsAbort.abort(); } catch (e) {} _ttsAbort = null; }
  _setBtnOff();
  if ('speechSynthesis' in window) { try { speechSynthesis.cancel(); } catch (e) {} }
  document.querySelectorAll('.voice-play-btn.speaking').forEach(function(b) {
    b.textContent = '🔈';
    b.classList.remove('speaking');
  });
}

function _hexToBlob(hex, mime) {
  var len = Math.floor(hex.length / 2);
  var buf = new Uint8Array(len);
  for (var i = 0; i < len; i++) buf[i] = parseInt(hex.substr(i * 2, 2), 16);
  return new Blob([buf], { type: mime || 'audio/mpeg' });
}
function _b64ToBlob(b64, mime) {
  var bin = atob(String(b64).replace(/\s/g, ''));
  var buf = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime || 'audio/mpeg' });
}
async function _playBlob(blob, btn, cancelled) {
  if (cancelled()) return;
  var url = URL.createObjectURL(blob);
  var a = new Audio(url);
  _ttsAudio = a;
  _setBtnOn(btn);
  a.onended = function() {
    if (_ttsAudio === a) { _ttsAudio = null; URL.revokeObjectURL(url); _setBtnOff(); }
  };
  a.onerror = a.onended;
  await a.play();
}
async function _ttsFetch(url, opts) {
  return aiRequest(url, opts); // 有中继服务器时自动走代理规避跨域，否则直连
}

// MiniMax 地址：中国站需在 URL 上带 ?GroupId=，国际站 api.minimax.io 不需要
function _minimaxUrl(cfg) {
  var u = cfg.url;
  if (!/t2a_v2$/i.test(u)) {
    if (!/\/v1$/i.test(u)) u += '/v1';
    u += '/t2a_v2';
  }
  if (cfg.group) u += (u.indexOf('?') >= 0 ? '&' : '?') + 'GroupId=' + encodeURIComponent(cfg.group);
  return u;
}

// ---- 平台一：MiniMax 海螺 t2a_v2（响应里 data.audio 为 hex 编码的 mp3）----
async function minimaxSpeak(text, btn, cancelled) {
  var p = _ttsCharProvider();
  var cfg = _ttsCfg(p);
  if (!cfg.key) throw new Error('MiniMax 还没填密钥（主设置-角色语音里）');
  var u = _minimaxUrl(cfg);
  _ttsAbort = new AbortController();
  var res = await _ttsFetch(u, {
    method: 'POST',
    signal: _ttsAbort.signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
    body: JSON.stringify({
      model: _ttsGlobalModel(p),
      text: text.slice(0, 4000),
      stream: false,
      output_format: 'hex',
      language_boost: 'auto',
      voice_setting: { voice_id: _ttsCharVoice(), speed: 1, vol: 1, pitch: 0 },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
    })
  });
  var data = await res.json().catch(function() { return {}; });
  if (data.base_resp && data.base_resp.status_code !== 0) throw new Error(data.base_resp.status_msg || ('code ' + data.base_resp.status_code));
  if (!res.ok) throw new Error('HTTP ' + res.status);
  var hex = data.data && data.data.audio;
  if (!hex) throw new Error('没有返回音频');
  await _playBlob(_hexToBlob(hex, 'audio/mpeg'), btn, cancelled);
}

// ---- 平台二：小米 MiMo（OpenAI 兼容 chat/completions，音频为 message.audio.data base64）----
async function mimoSpeak(text, btn, cancelled) {
  var p = _ttsCharProvider();
  var cfg = _ttsCfg(p);
  if (!cfg.key) throw new Error('MiMo 还没填密钥（主设置-角色语音里）');
  var voice = _ttsCharVoice();
  var isClone = (p === 'mimo' && typeof voice === 'string' && voice.indexOf('data:') === 0);
  var model = isClone ? 'mimo-v2.5-ts-voiceclone' : _ttsGlobalModel(p);
  var reqFormat = isClone ? (voice.indexOf('audio/wav') >= 0 ? 'wav' : 'mp3') : 'mp3';
  var u = cfg.url;
  if (/\/chat\/completions$/i.test(u)) {
    // 已是完整地址
  } else if (/\/v1$/i.test(u)) {
    u += '/chat/completions';
  } else {
    u += '/v1/chat/completions';
  }
  _ttsAbort = new AbortController();
  var res = await _ttsFetch(u, {
    method: 'POST',
    signal: _ttsAbort.signal,
    headers: { 'Content-Type': 'application/json', 'api-key': cfg.key },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'assistant', content: text.slice(0, 4000) }],
      audio: { format: reqFormat, voice: voice }
    })
  });
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) throw new Error((data.error && data.error.message) || ('HTTP ' + res.status));
  var b64 = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.audio && data.choices[0].message.audio.data;
  if (!b64) throw new Error('没有返回音频');
  await _playBlob(_b64ToBlob(b64, reqFormat === 'wav' ? 'audio/wav' : 'audio/mpeg'), btn, cancelled);
}

// ---- 平台三：ElevenLabs text-to-speech（直接返回 mp3 二进制）----
async function elevenSpeak(text, btn, cancelled) {
  var p = _ttsCharProvider();
  var cfg = _ttsCfg(p);
  if (!cfg.key) throw new Error('ElevenLabs 还没填密钥（主设置-角色语音里）');
  var u = cfg.url.replace(/\/+$/, '');
  u = u.replace(/\/text-to-speech(\/)?$/i, ''); // 容错：粘贴了完整端点也能拼对
  if (/\/v\d+(\/|$)/i.test(u.replace(/^https?:\/\/[^/]+/, ''))) {
    u += '/text-to-speech/';
  } else {
    u += '/v1/text-to-speech/';
  }
  u += encodeURIComponent(_ttsCharVoice()) + '?output_format=mp3_44100_128';
  _ttsAbort = new AbortController();
  var res = await _ttsFetch(u, {
    method: 'POST',
    signal: _ttsAbort.signal,
    headers: { 'Content-Type': 'application/json', 'xi-api-key': cfg.key },
    body: JSON.stringify({ text: text.slice(0, 4000), model_id: _ttsGlobalModel(p) })
  });
  if (!res.ok) {
    var msg = 'HTTP ' + res.status;
    try { msg += ' ' + (await res.text()).slice(0, 100); } catch (e) {}
    throw new Error(msg);
  }
  await _playBlob(await res.blob(), btn, cancelled);
}

var _TTS_ENGINES = { minimax: minimaxSpeak, mimo: mimoSpeak, elevenlabs: elevenSpeak };

// ---- 浏览器 Web Speech（仅作兜底，不在设置里提供）----
function browserSpeak(text, btn) {
  if (!('speechSynthesis' in window)) return;
  if (!_ttsVoicesReady) _ttsLoadVoices();
  var u = new SpeechSynthesisUtterance(text);
  if (_ttsVoice) {
    u.voice = _ttsVoice;
    u.lang = _ttsVoice.lang;
  } else {
    try {
      var c = activeCharacter();
      u.lang = _ttsLangCode(c && c.lang);
    } catch (e) { u.lang = 'zh-CN'; }
  }
  u.rate = 1; u.pitch = 1.05; u.volume = 1;
  _setBtnOn(btn);
  u.onend = function() { _setBtnOff(); };
  u.onerror = u.onend;
  speechSynthesis.speak(u);
}

// 接口失败提示：30 秒内只弹一次，避免自动播报时刷屏
var _ttsLastErrAt = 0;
function _ttsWarn(msg) {
  var now = Date.now();
  console.warn('[TTS]', msg);
  if (now - _ttsLastErrAt < 30000) return;
  _ttsLastErrAt = now;
  try { alert('角色语音播放失败：' + msg + '\n\n请到 设置-角色语音 检查该平台的密钥和网络。'); } catch (e) {}
}

// ---- 统一入口 ----
function speakText(rawText, btn) {
  var text = cleanTextForTTS(rawText);
  if (!text) return;
  var wasThis = (_ttsCurBtn && btn && _ttsCurBtn === btn);
  stopSpeak();
  if (wasThis) return; // 再点一次 = 停止

  var myToken = ++_ttsSeq;
  function cancelled() { return myToken !== _ttsSeq; }

  var provider = _ttsCharProvider();
  var engine = _TTS_ENGINES[provider];
  if (engine) {
    _setBtnOn(btn);
    engine(text, btn, cancelled).catch(function(err) {
      if (cancelled() || err.name === 'AbortError') return;
      _ttsWarn(err.message || String(err));
      _setBtnOff();
    });
  } else {
    browserSpeak(text, btn);
  }
}

function toggleMsgVoice(btn, idx) {
  var char = activeCharacter();
  var msg = char && char.chat[idx];
  if (!msg) return;
  speakText(msg.content, btn);
}

function autoVoiceEnabled() {
  return !!(state.settings && state.settings.autoVoice);
}
function autoSpeakReply(text) {
  if (!autoVoiceEnabled()) return;
  speakText(text, null);
}

// ---- 主设置（全局：开关 + 默认平台 + 三平台独立密钥）----
function toggleAutoVoice() {
  if (!state.settings) state.settings = {};
  state.settings.autoVoice = !state.settings.autoVoice;
  saveState();
  if (!state.settings.autoVoice) stopSpeak();
  syncTtsOptions();
}
function setTtsProvider(val) {
  if (!state.settings) state.settings = {};
  state.settings.ttsProvider = TTS_PRESETS[val] ? val : 'minimax';
  saveState();
  syncTtsOptions();
}
function setTtsUrl(p, val) {
  if (!state.settings) state.settings = {};
  if (!state.settings.ttsUrls) state.settings.ttsUrls = {};
  state.settings.ttsUrls[p] = String(val || '').trim();
  saveState();
}
function setTtsKey(p, val) {
  if (!state.settings) state.settings = {};
  if (!state.settings.ttsKeys) state.settings.ttsKeys = {};
  state.settings.ttsKeys[p] = String(val == null ? '' : val).replace(/[^\x20-\x7E]/g, '').trim();
  saveState();
}
function setTtsGroupId(p, val) {
  if (!state.settings) state.settings = {};
  if (!state.settings.ttsGroups) state.settings.ttsGroups = {};
  state.settings.ttsGroups[p] = String(val == null ? '' : val).replace(/[^\x20-\x7E]/g, '').trim();
  saveState();
}
function setTtsModel(p, val) {
  if (!state.settings) state.settings = {};
  if (!state.settings.ttsModels) state.settings.ttsModels = {};
  state.settings.ttsModels[p] = String(val || '').trim();
  saveState();
}
function _fillDatalist(id, pairs) {
  var dl = $(id);
  if (!dl) return;
  dl.innerHTML = pairs.map(function(x) {
    return '<option value="' + escapeHTML(x[0]) + '">' + escapeHTML(x[1] || '') + '</option>';
  }).join('');
}
function syncTtsOptions() {
  var s = state.settings || {};
  var sw = $('autoVoiceSwitch');
  if (sw) sw.classList.toggle('on', !!s.autoVoice);
  var sel = $('ttsProviderSelect');
  if (sel) sel.value = (TTS_PRESETS[s.ttsProvider] ? s.ttsProvider : 'minimax');
  if (typeof syncTtsChannel === 'function') syncTtsChannel();
  TTS_PROVIDERS.forEach(function(p) {
    var pr = _ttsPreset(p);
    var k = $('ttsKey_' + p);
    if (k) k.value = (s.ttsKeys && s.ttsKeys[p]) || '';
    var u = $('ttsUrl_' + p);
    if (u) u.value = (s.ttsUrls && s.ttsUrls[p]) || pr.url;
  });
}

// 测试当前默认平台密钥能否连通（不发声音，只验证鉴权/网络）
async function testTtsConnection() {
  var p = (state.settings && TTS_PRESETS[state.settings.ttsProvider]) ? state.settings.ttsProvider : 'minimax';
  var box = $('ttsTestResult');
  function show(msg, ok) { if (box) { box.textContent = msg; box.style.color = ok ? '#7aab7a' : '#c0392b'; } }
  var cfg = _ttsCfg(p);
  if (!cfg.key) { show('请先填写 ' + _ttsPreset(p).name + ' 的密钥', false); return; }
  show('正在测试连接…', false);
  try {
    if (p === 'elevenlabs') {
      var u = cfg.url.replace(/\/+$/, '') + '/v1/voices';
      var r = await aiRequest(u, { method: 'GET', headers: { 'xi-api-key': cfg.key } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      show('连接成功 ✓', true);
    } else if (p === 'minimax') {
      var u2 = _minimaxUrl(cfg);
      var r2 = await aiRequest(u2, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        body: JSON.stringify({ model: _ttsGlobalModel(p), text: '连接测试', stream: false, output_format: 'hex', language_boost: 'auto', voice_setting: { voice_id: _ttsCharVoice(), speed: 1, vol: 1, pitch: 0 }, audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 } })
      });
      var d2 = await r2.json().catch(function() { return {}; });
      if (d2.base_resp && d2.base_resp.status_code !== 0) throw new Error(d2.base_resp.status_msg + ' (code ' + d2.base_resp.status_code + ')');
      if (!r2.ok) throw new Error('HTTP ' + r2.status + ' ' + JSON.stringify(d2).slice(0, 240));
      show('连接成功 ✓', true);
    } else {
      var u3 = cfg.url;
      if (!/\/chat\/completions$/i.test(u3)) { if (/\/v1$/i.test(u3)) u3 += '/chat/completions'; else u3 += '/v1/chat/completions'; }
      var r3 = await aiRequest(u3, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': cfg.key },
        body: JSON.stringify({ model: _ttsGlobalModel(p), messages: [{ role: 'assistant', content: '连接测试' }], audio: { format: 'mp3', voice: _ttsCharVoice() } })
      });
      var d3 = await r3.json().catch(function() { return {}; });
      if (!r3.ok) throw new Error('HTTP ' + r3.status + ' ' + ((d3.error && d3.error.message) || JSON.stringify(d3).slice(0, 240)));
      show('连接成功 ✓', true);
    }
  } catch (e) { show('连接失败：' + (e && e.message ? e.message : e), false); }
}

// ---- 聊天设置（按角色：平台 + 音色）----
function setCharTtsProvider(val) {
  var c = activeCharacter();
  if (!c) return;
  c.ttsProvider = TTS_PRESETS[val] ? val : '';
  saveState();
  syncCharTts();
}
function setCharTtsVoice(val) {
  var c = activeCharacter();
  if (!c) return;
  var p = _ttsCharProvider();
  if (!c.ttsVoices) c.ttsVoices = {};
  c.ttsVoices[p] = String(val || '').trim();
  saveState();
}
// 上传一段录音，作为该角色 MiMo 的克隆音色（存为 data URL，朗读时自动切 voiceclone 模型）
function uploadCloneVoice(e) {
  var c = activeCharacter();
  if (!c) return;
  var f = e && e.target && e.target.files && e.target.files[0];
  if (!f) return;
  var r = new FileReader();
  r.onload = function() {
    var dataUrl = r.result;
    if (!c.ttsVoices) c.ttsVoices = {};
    c.ttsVoices.mimo = dataUrl;
    c.ttsProvider = 'mimo'; // 克隆是 MiMo 专属，上传即自动切到 MiMo
    saveState();
    if (typeof syncCharTts === 'function') syncCharTts();
    var st = $('cloneStatus');
    if (st) st.textContent = '已保存克隆音色：' + (f.name || '') + '（已自动切到 MiMo + 复刻声线）';
    var inp = $('charTtsVoice');
    if (inp) inp.value = '(克隆音色已启用)';
  };
  r.onerror = function() {
    var st = $('cloneStatus');
    if (st) st.textContent = '读取文件失败，请换一个音频';
  };
  r.readAsDataURL(f);
}
function syncCharTts() {
  var c = activeCharacter();
  if (!c) return;
  var p = (c.ttsProvider && TTS_PRESETS[c.ttsProvider]) ? c.ttsProvider : (state.settings.ttsProvider || 'minimax');
  var sel = $('charTtsProvider');
  if (sel) sel.value = (c.ttsProvider && TTS_PRESETS[c.ttsProvider]) ? c.ttsProvider : (c.ttsProvider === '' ? '' : (state.settings.ttsProvider || 'minimax'));
  var inp = $('charTtsVoice');
  if (inp) inp.value = (c.ttsVoices && c.ttsVoices[p]) || c.ttsVoice || '';
  var cs = $('cloneStatus');
  if (cs) {
    if (c.ttsVoices && c.ttsVoices.mimo && String(c.ttsVoices.mimo).indexOf('data:') === 0) cs.textContent = '已启用克隆音色（MiMo）';
    else cs.textContent = '';
  }
  _fillDatalist('charTtsVoiceList', (_ttsPreset(p).voices) || []);
}
