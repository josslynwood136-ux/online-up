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
    models: ['mimo-v2.5-tts', 'mimo-v2.5-tts-voiceclone', 'mimo-v2.5-tts-voicedesign'],
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
// 音色：MiMo 克隆样本优先（c.ttsClone），其次角色显式普通 ID，再回退平台默认
function _ttsCharVoice() {
  var c = _activeChar();
  var p = _ttsCharProvider();
  if (c) {
    if (p === 'mimo' && c.ttsClone && String(c.ttsClone).indexOf('data:') === 0) return c.ttsClone;
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
// 官方约束（platform.xiaomimimo.com 文档）：
//   1) messages 固定顺序：user 在前（可为空字符串）、assistant 在后承载待合成文本；
//   2) audio.format 仅支持 "wav" / "pcm16"，不支持 mp3 输出；
//   3) 克隆时 audio.voice 为 data URI 参考音频，MIME 必须是 audio/wav 或 audio/mpeg 且与样本真实格式一致；
//   4) 鉴权用 Authorization: Bearer <key>（api-key 一并带上兼容旧写法）。
async function mimoSpeak(text, btn, cancelled) {
  var p = _ttsCharProvider();
  var cfg = _ttsCfg(p);
  if (!cfg.key) throw new Error('MiMo 还没填密钥（主设置-角色语音里）');
  var voice = _ttsCharVoice();
  var hasCloneSample = (typeof voice === 'string' && voice.indexOf('data:') === 0);
  // 新版：角色里只有 {name,size} 标记，样本本体从 IndexedDB 取；旧版直接存 data URL 的也兼容
  if (!hasCloneSample && p === 'mimo' && _activeChar() && _activeChar().ttsClone && typeof _activeChar().ttsClone === 'object') {
    var _sample = await _cloneDbGet(_activeChar().id);
    if (!_sample) throw new Error('克隆样本已丢失（换设备或清理浏览器数据会清掉），请重新上传');
    voice = _sample;
    hasCloneSample = true;
  }
  var baseModel = _ttsGlobalModel(p);
  // 上传了克隆样本 → 自动切克隆模型；选了克隆/设计模型但没样本 → 明确报错
  var model = hasCloneSample ? 'mimo-v2.5-tts-voiceclone' : baseModel;
  if (model === 'mimo-v2.5-tts-voiceclone' && !hasCloneSample) throw new Error('克隆模型需要先上传克隆音色样本（在该角色聊天设置里上传录音）');
  if (model === 'mimo-v2.5-tts-voicedesign' && !hasCloneSample) throw new Error('音色设计模型请在主设置里改回 mimo-v2.5-tts，或给该角色上传克隆样本');
  // 基础模型下：音色 ID 不是已知 ID → 退回默认音色，避免 MiMo 因非法 voice 报错
  if (model === 'mimo-v2.5-tts') {
    var _ids = (_ttsPreset('mimo').voices || []).map(function(v) { return v[0]; });
    if (voice && _ids.indexOf(voice) < 0) voice = _ttsPreset('mimo').voice;
  }
  var outFormat = 'wav'; // 官方只支持 wav / pcm16
  var u = cfg.url;
  if (/\/chat\/completions$/i.test(u)) {
    // 已是完整地址
  } else if (/\/v1$/i.test(u)) {
    u += '/chat/completions';
  } else {
    u += '/v1/chat/completions';
  }
  _ttsAbort = new AbortController();
  console.log('[TTS] MiMo model=', model, 'isClone=', (model === 'mimo-v2.5-tts-voiceclone'), 'voiceHead=', String(voice).slice(0, 18));
  var res = await _ttsFetch(u, {
    method: 'POST',
    signal: _ttsAbort.signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key, 'api-key': cfg.key },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: '' }, { role: 'assistant', content: text.slice(0, 4000) }],
      audio: { format: outFormat, voice: voice }
    })
  });
  var data = await res.json().catch(function() { return {}; });
  if (!res.ok) {
    var emsg = (data.error && data.error.message) || JSON.stringify(data).slice(0, 160) || ('HTTP ' + res.status);
    if (res.status === 401 || res.status === 403) emsg = '密钥无效或未授权：' + emsg;
    throw new Error(emsg);
  }
  var b64 = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.audio && data.choices[0].message.audio.data;
  if (!b64) throw new Error('没有返回音频');
  await _playBlob(_b64ToBlob(b64, 'audio/wav'), btn, cancelled);
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
      // 连通性测试固定用默认音色（克隆样本太大不适合做测试）；若全局模型选了克隆则临时退回基础模型
      var tm = _ttsGlobalModel(p);
      if (tm === 'mimo-v2.5-tts-voiceclone' || tm === 'mimo-v2.5-tts-voicedesign') tm = 'mimo-v2.5-tts';
      var r3 = await aiRequest(u3, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key, 'api-key': cfg.key },
        body: JSON.stringify({ model: tm, messages: [{ role: 'user', content: '' }, { role: 'assistant', content: '连接测试' }], audio: { format: 'wav', voice: _ttsPreset(p).voice } })
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
// ===== 克隆样本存储（IndexedDB）=====
// 样本可达数 MB，localStorage（整个 state 共享约 5MB 配额）根本放不下；
// 角色数据里只存轻量标记 {name,size}，音频本体放 IndexedDB（配额几百 MB 起）。
var _CLONE_DB = 'meilidi-tts', _CLONE_STORE = 'cloneSamples';
function _cloneDb() {
  return new Promise(function(resolve, reject) {
    try {
      var req = indexedDB.open(_CLONE_DB, 1);
      req.onupgradeneeded = function() { try { req.result.createObjectStore(_CLONE_STORE); } catch (e) {} };
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error || new Error('IndexedDB 打开失败')); };
    } catch (e) { reject(e); }
  });
}
function _cloneDbSet(charId, dataUrl) {
  return _cloneDb().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(_CLONE_STORE, 'readwrite');
      tx.objectStore(_CLONE_STORE).put(dataUrl, String(charId));
      tx.oncomplete = function() { resolve(true); };
      tx.onerror = function() { reject(tx.error || new Error('样本写入失败')); };
      tx.onabort = function() { reject(tx.error || new Error('样本写入被中止')); };
    });
  });
}
function _cloneDbGet(charId) {
  return new Promise(function(resolve) {
    _cloneDb().then(function(db) {
      var rq = db.transaction(_CLONE_STORE, 'readonly').objectStore(_CLONE_STORE).get(String(charId));
      rq.onsuccess = function() { resolve(rq.result ? String(rq.result) : null); };
      rq.onerror = function() { resolve(null); };
    }).catch(function() { resolve(null); });
  });
}
function _cloneDbDel(charId) {
  return _cloneDb().then(function(db) {
    db.transaction(_CLONE_STORE, 'readwrite').objectStore(_CLONE_STORE)['delete'](String(charId));
    return true;
  }).catch(function() { return false; });
}

// 上传一段录音，作为该角色 MiMo 的克隆音色。
// 官方约束：样本仅支持 mp3 / wav，base64 后 ≤10MB；MIME 必须与真实格式一致。
// 音频本体存 IndexedDB，角色里只记 {name,size} 标记，不再挤占 localStorage 配额。
function uploadCloneVoice(e) {
  var c = activeCharacter();
  if (!c) return;
  var f = e && e.target && e.target.files && e.target.files[0];
  if (e && e.target) e.target.value = ''; // 允许重复选择同一个文件
  if (!f) return;
  var st = $('cloneStatus');
  function fail(msg) {
    if (st) { st.textContent = msg; st.style.color = '#c0392b'; setTimeout(function() { if (st) st.style.color = ''; }, 6000); }
  }
  var isWav = (/wav/i.test(f.type)) || (/\.wav$/i.test(f.name || ''));
  var isMp3 = (/mpeg|mp3/i.test(f.type)) || (/\.mp3$/i.test(f.name || ''));
  if (!isWav && !isMp3) { fail('仅支持 mp3 或 wav 录音，当前文件类型：' + (f.type || '未知')); return; }
  if (f.size > 9 * 1024 * 1024) { fail('文件太大（约 ' + Math.round(f.size / 1024 / 1024 * 10) / 10 + 'MB）。请用 10~30 秒的清晰录音（建议 mp3）'); return; }
  var r = new FileReader();
  r.onload = function() {
    var dataUrl = String(r.result || '');
    if (dataUrl.indexOf('data:') !== 0) { fail('读取文件失败，请换一个音频'); return; }
    // 统一 MIME：MiMo 只认 audio/wav 与 audio/mpeg
    dataUrl = dataUrl.replace(/^data:[^,]*,/, isWav ? 'data:audio/wav;base64,' : 'data:audio/mpeg;base64,');
    _cloneDbSet(c.id, dataUrl).then(function() {
      c.ttsClone = { name: f.name || 'sample', size: f.size }; // 轻量标记（不含音频本体）
      if (!c.ttsVoices) c.ttsVoices = {};
      c.ttsVoices.mimo = ''; // 清掉旧的普通 MiMo 音色，避免它盖过克隆
      c.ttsProvider = 'mimo'; // 克隆是 MiMo 专属，上传即自动切到 MiMo
      if (!saveState()) { c.ttsClone = null; _cloneDbDel(c.id); fail('保存失败：本机存储空间不足，请先清理聊天图片/表情包再试'); return; }
      if (typeof syncCharTts === 'function') syncCharTts();
      if (st) st.textContent = '已保存克隆音色：' + (f.name || '') + '（' + Math.round(f.size / 1024) + 'KB，已启用复刻声线；点“清除克隆”可还原）';
    }).catch(function(err) {
      fail('克隆样本写入本地数据库失败：' + ((err && err.message) || err) + '（无痕/隐私模式下 IndexedDB 可能不可用）');
    });
  };
  r.onerror = function() { fail('读取文件失败，请换一个音频'); };
  r.readAsDataURL(f);
}
// 清除该角色 MiMo 克隆音色，回到普通音色
function clearCloneVoice() {
  var c = activeCharacter();
  if (!c) return;
  c.ttsClone = null;
  saveState();
  _cloneDbDel(c.id);
  if (typeof syncCharTts === 'function') syncCharTts();
  var st = $('cloneStatus');
  if (st) st.textContent = '已清除克隆音色，回到普通音色';
}
// 直接试听克隆音色（朗读一句样例），不经过 AI 回复
async function previewCloneVoice() {
  var c = activeCharacter();
  if (!c) return;
  var st = $('cloneStatus');
  var has = !!(c.ttsClone && ((typeof c.ttsClone === 'object') || (typeof c.ttsClone === 'string' && c.ttsClone.indexOf('data:') === 0)));
  if (has && typeof c.ttsClone === 'object') has = !!(await _cloneDbGet(c.id)); // 确认样本真的还在
  if (!has) {
    if (st) st.textContent = '请先上传克隆音色样本';
    return;
  }
  c.ttsProvider = 'mimo'; // 克隆走 MiMo
  saveState();
  var sample = '你好，我是' + (c.name || '这个角色') + '。这是用克隆音色读出来的句子，你听听像不像？';
  speakText(sample, null);
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
    if (c.ttsClone) {
      var _label = (c.ttsClone && typeof c.ttsClone === 'object' && c.ttsClone.name) ? '（' + c.ttsClone.name + '）' : '';
      cs.textContent = '已启用克隆音色（MiMo）' + _label;
    } else {
      cs.textContent = '';
    }
  }
  _fillDatalist('charTtsVoiceList', (_ttsPreset(p).voices) || []);
}
