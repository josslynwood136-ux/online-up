// ============================================================
// relate.js - 关系状态 + 心声分层 + 日常生活引擎
// 爱人感来自连续的内在状态，而不是随机心情池。
// ============================================================

var RELATE_KEYS = ['intimacy', 'security', 'missing', 'jealousy', 'fatigue', 'unsaid'];
var RELATE_LABEL = {
  intimacy: '亲密度',
  security: '安全感',
  missing: '想念',
  jealousy: '吃醋',
  fatigue: '疲惫',
  unsaid: '欲言又止'
};

function relateClamp(n) {
  n = Number(n);
  if (isNaN(n)) n = 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function defaultBond() {
  return {
    intimacy: 28,
    security: 54,
    missing: 16,
    jealousy: 8,
    fatigue: 18,
    unsaid: 14,
    updatedAt: Date.now(),
    lastDecayAt: Date.now()
  };
}

function normalizeBond(raw) {
  var b = defaultBond();
  if (!raw || typeof raw !== 'object') return b;
  RELATE_KEYS.forEach(function (k) {
    if (raw[k] != null) b[k] = relateClamp(raw[k]);
  });
  b.updatedAt = Number(raw.updatedAt) || b.updatedAt;
  b.lastDecayAt = Number(raw.lastDecayAt) || b.updatedAt;
  return b;
}

function ensureBond(char) {
  if (!char) return defaultBond();
  char.bond = normalizeBond(char.bond);
  return char.bond;
}

function lastUserTs(char) {
  var chat = (char && char.chat) || [];
  for (var i = chat.length - 1; i >= 0; i--) {
    if (chat[i] && chat[i].role === 'user') {
      var ts = chat[i].ts || Date.parse(chat[i].time || '');
      if (ts && !isNaN(ts)) return ts;
    }
  }
  return 0;
}

function applyBondDelta(char, delta) {
  var b = ensureBond(char);
  if (!delta) return b;
  RELATE_KEYS.forEach(function (k) {
    if (delta[k]) b[k] = relateClamp(b[k] + delta[k]);
  });
  b.updatedAt = Date.now();
  return b;
}

function relateCharMinutes(char) {
  try {
    var opts = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (char && char.charZone) opts.timeZone = char.charZone;
    var parts = new Intl.DateTimeFormat('en-GB', opts).formatToParts(new Date());
    var h = 0, m = 0;
    parts.forEach(function (p) {
      if (p.type === 'hour') h = parseInt(p.value, 10) || 0;
      if (p.type === 'minute') m = parseInt(p.value, 10) || 0;
    });
    if (h === 24) h = 0;
    return h * 60 + m;
  } catch (e) {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

// 一天的作息：忙/闲/睡决定回复长度、延迟、会不会主动找你
var LIFE_BLOCKS = [
  { start: 0, end: 420, id: 'sleep', label: '在睡觉', busy: true, canReply: 'silent',
    details: ['睡得很沉，呼吸很匀', '翻了个身，还没醒', '在做梦，手机扣在枕头边'] },
  { start: 420, end: 480, id: 'wake', label: '刚醒', busy: false, canReply: 'short',
    details: ['刚醒，还赖在被窝里', '在洗漱，嘴里还含着泡沫', '头发乱着，刚摸到手机'] },
  { start: 480, end: 720, id: 'class', label: '在上课', busy: true, canReply: 'short',
    details: ['在上课，手机藏在桌肚', '老师在讲，只能偷摸回一句', '教室里很安静，不太方便打字'] },
  { start: 720, end: 810, id: 'lunch', label: '在吃饭', busy: false, canReply: 'normal',
    details: ['刚打到饭，边吃边刷你', '食堂人很多，端着盘子找位置', '午休前随便对付了两口'] },
  { start: 810, end: 1080, id: 'work', label: '在忙', busy: true, canReply: 'short',
    details: ['下午的课/班正紧着', '在赶东西，脑子有点转不动', '手头有事，回得会慢一点'] },
  { start: 1080, end: 1140, id: 'commute', label: '在路上', busy: false, canReply: 'normal',
    details: ['刚结束，走在回家的路上', '挤在车里，信号一顿一顿', '晚风挺舒服，突然想跟你说一句'] },
  { start: 1140, end: 1260, id: 'home', label: '在家', busy: false, canReply: 'eager',
    details: ['在家待着，终于能好好看手机', '在做饭，油烟有点呛', '窝在沙发上，空了一块位置'] },
  { start: 1260, end: 1350, id: 'shower', label: '在洗漱', busy: true, canReply: 'short',
    details: ['在洗澡，头发还湿着', '刚洗完，蒸汽还没散', '对着镜子发呆，想起你了'] },
  { start: 1350, end: 1440, id: 'night', label: '快睡了', busy: false, canReply: 'normal',
    details: ['躺着刷手机，灯关了一半', '夜深了，人有点软', '本该睡了，还是想再看看你'] }
];

function pickLifeBlock(mins) {
  for (var i = 0; i < LIFE_BLOCKS.length; i++) {
    var b = LIFE_BLOCKS[i];
    if (mins >= b.start && mins < b.end) return b;
  }
  return LIFE_BLOCKS[0];
}

function lifeDetail(block, char) {
  var pool = block.details || [block.label];
  var seed = ((char && char.id) || '') + '-' + block.id + '-' + Math.floor(Date.now() / 1800000);
  var n = 0;
  for (var i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[n % pool.length];
}

function relateMoodKey(char) {
  var b = ensureBond(char);
  if (b.fatigue >= 64) return 'tired';
  if (b.jealousy >= 46) return 'jealous';
  if (b.unsaid >= 52 && b.intimacy >= 35) return 'tsundere';
  if (b.missing >= 52) return 'miss';
  if (b.intimacy >= 72 && b.security >= 58) return 'happy';
  if (b.intimacy >= 58 && b.missing < 28 && b.fatigue < 40) return 'excited';
  return 'calm';
}

function relateMoodLine(char) {
  var b = ensureBond(char);
  var key = relateMoodKey(char);
  var lines = {
    tired: '今天有点撑不住，话也不想说太多',
    jealous: '心里酸酸的，想问又怕问重了',
    tsundere: '嘴上懒得说，心里其实一直在动',
    miss: '有点想你，想得有点出神',
    happy: '因为你，心情还不错',
    excited: '有话想跟你说，憋着有点难受',
    calm: '这会儿比较平稳，但并不是没在想你'
  };
  if (b.security < 38) return '有点没底，想确认你还在不在意';
  if (b.unsaid >= 60) return '有一句卡在喉咙里，没想好要不要说';
  return lines[key] || lines.calm;
}

function decayBondOverTime(char, now) {
  var b = ensureBond(char);
  now = now || Date.now();
  var last = b.lastDecayAt || b.updatedAt || now;
  var dtMin = (now - last) / 60000;
  if (dtMin < 1.5) return b;
  var hours = dtMin / 60;
  var awayH = 0;
  var lu = lastUserTs(char);
  if (lu) awayH = Math.max(0, (now - lu) / 3600000);

  if (awayH > 0.5) {
    b.missing = relateClamp(b.missing + Math.min(14, awayH * 2.4 * Math.min(1, hours * 1.2)));
    b.unsaid = relateClamp(b.unsaid + Math.min(6, awayH * 0.35 * hours));
    if (awayH > 8) b.security = relateClamp(b.security - Math.min(5, (awayH - 8) * 0.12 * hours));
  } else {
    b.missing = relateClamp(b.missing - hours * 1.2);
  }

  var lifeId = char.life && char.life.id;
  if (lifeId === 'sleep') b.fatigue = relateClamp(b.fatigue - hours * 9);
  else if (char.life && char.life.busy) b.fatigue = relateClamp(b.fatigue + hours * 1.6);
  else b.fatigue = relateClamp(b.fatigue - hours * 0.5);

  b.jealousy = relateClamp(b.jealousy - hours * 0.4);
  if (awayH < 0.2 && b.intimacy > 20) b.security = relateClamp(b.security + hours * 0.25);

  b.lastDecayAt = now;
  b.updatedAt = now;
  return b;
}

function maybeLifeOverlay(char, block, now) {
  var b = ensureBond(char);
  var seed = String((char && char.id) || '') + '-' + Math.floor((now || Date.now()) / 1800000);
  var n = 0;
  for (var i = 0; i < seed.length; i++) n = (n * 31 + seed.charCodeAt(i)) >>> 0;
  var slot = n % 12;
  if (block.id === 'home' && b.missing >= 42 && (slot === 0 || slot === 1 || b.unsaid >= 58)) {
    return {
      id: 'emo', label: '有点心绪', busy: false, canReply: 'normal',
      detail: '一个人待着，情绪突然沉了一下，想找你说又不知道从哪开口'
    };
  }
  if ((block.id === 'home' || block.id === 'lunch') && slot === 4) {
    return {
      id: 'out', label: '出门了', busy: true, canReply: 'short',
      detail: '出门办事，单手回你，风有点大'
    };
  }
  return null;
}

function tickCharacterLife(char, now) {
  if (!char) return null;
  now = now || Date.now();
  decayBondOverTime(char, now);
  var mins = relateCharMinutes(char);
  var block = pickLifeBlock(mins);
  var overlay = maybeLifeOverlay(char, block, now);
  if (overlay) {
    block = {
      start: 0, end: 0, id: overlay.id, label: overlay.label,
      busy: overlay.busy, canReply: overlay.canReply, details: [overlay.detail]
    };
  }
  var prev = char.life && char.life.id;
  var detail = overlay ? overlay.detail : lifeDetail(block, char);
  var changed = prev && prev !== block.id;
  var wantPing = !!(char.life && char.life.wantPing);
  if (changed) {
    var prevBusy = !!(char.life && char.life.busy);
    var b = ensureBond(char);
    wantPing = (!block.busy && prevBusy && (b.missing > 28 || Math.random() < 0.28))
      || (block.id === 'night' && b.missing > 40 && Math.random() < 0.35)
      || (block.id === 'commute' && b.missing > 36 && Math.random() < 0.4)
      || (block.id === 'emo' && b.missing > 32);
  }
  char.life = {
    id: block.id,
    label: block.label,
    detail: detail,
    busy: !!block.busy,
    canReply: block.canReply,
    wantPing: wantPing,
    updatedAt: now
  };
  char._lifeText = detail;
  char._moodKey = relateMoodKey(char);
  char._moodText = relateMoodLine(char);
  char._liveTs = now;
  return char.life;
}

function relateTickAll() {
  if (typeof state === 'undefined' || !state || !state.roles) return;
  var now = Date.now();
  var dirty = false;
  state.roles.forEach(function (c) {
    if (!c) return;
    tickCharacterLife(c, now);
    dirty = true;
  });
  if (dirty && typeof saveState === 'function') saveState();
}

var _relateTimer = null;
function startRelateEngine() {
  if (_relateTimer) return;
  relateTickAll();
  _relateTimer = setInterval(relateTickAll, 60000);
}

function relateIngestUser(char, text) {
  if (!char) return;
  tickCharacterLife(char);
  var t = String(text || '');
  var d = { intimacy: 0.35, missing: -5.5, unsaid: -0.8, fatigue: 0.15 };
  var len = t.replace(/\s/g, '').length;

  if (len < 4) { d.security = (d.security || 0) - 1.4; d.unsaid += 2.2; d.intimacy -= 0.2; }
  else if (len < 10) { d.security = (d.security || 0) - 0.4; d.unsaid += 0.8; }
  else if (len > 36) { d.security = (d.security || 0) + 1.1; d.intimacy += 0.7; d.unsaid -= 1.2; }

  if (/爱你|想你|想你了|抱抱|喜欢你|晚安|早安|在吗|想我了吗/.test(t)) {
    d.intimacy += 2.4; d.security = (d.security || 0) + 2.1; d.missing -= 4; d.jealousy = (d.jealousy || 0) - 1.5;
  }
  if (/忙|先这样|回头说|没空|下次|改天|在开会/.test(t)) {
    d.security = (d.security || 0) - 1.8; d.unsaid += 2.8; d.missing += 1.2;
  }
  if (/^(嗯+|哦+|喔+|好+|行+|ok+|OK+|哈哈+|hhh+|哈+|嗯嗯)$/i.test(t.trim())) {
    d.security = (d.security || 0) - 2.2; d.unsaid += 3.2; d.intimacy -= 0.4;
  }
  if (/(他|她|朋友|同学|前任|同事).{0,8}(一起|吃饭|出来|聊天)/.test(t)) d.jealousy = (d.jealousy || 0) + 4.2;
  if (/对不起|抱歉|是我不好|我错了/.test(t)) { d.security = (d.security || 0) + 1.6; d.unsaid -= 2; }
  if (/滚|烦死|闭嘴|不想理|拉黑/.test(t)) { d.security = (d.security || 0) - 5; d.intimacy -= 2.8; d.unsaid += 5; d.missing += 2; }

  if (char.life && char.life.canReply === 'silent') d.fatigue += 0.8;
  applyBondDelta(char, d);
  if (typeof saveState === 'function') saveState();
}

function relateIngestReply(char, reply) {
  if (!char) return;
  var t = String(reply || '');
  var d = { missing: -1.6, fatigue: 0.35 };
  if (t.length > 80) d.fatigue += 0.4;
  applyBondDelta(char, d);
}

function relateInQuietHours() {
  var q = (typeof state !== 'undefined' && state.settings && state.settings.proactiveQuiet) || [23, 7];
  if (!q || q.length !== 2) return false;
  var h = new Date().getHours();
  var s = Number(q[0]), e = Number(q[1]);
  if (isNaN(s) || isNaN(e)) return false;
  if (s <= e) return h >= s && h < e;
  return h >= s || h < e;
}

function relateIdleMinutes(char, baseMin) {
  var b = ensureBond(char);
  var need = baseMin || 6;
  if (b.missing >= 72) need = Math.min(need, 2.5);
  else if (b.missing >= 52) need = Math.min(need, 4.5);
  if (b.fatigue >= 68) need = Math.max(need, 16);
  if (char.life && char.life.busy) need = Math.max(need, 22);
  if (char.life && char.life.canReply === 'silent') need = Math.max(need, 40);
  if (b.security < 35) need = Math.min(need, 5);
  return need;
}

function relateShouldProactive(char, idleMin, cooldownMin, lastProTs, now) {
  if (!char) return false;
  now = now || Date.now();
  tickCharacterLife(char, now);
  var b = ensureBond(char);
  if (char.life && char.life.canReply === 'silent' && b.missing < 78) return false;
  if (relateInQuietHours() && b.missing < 82) return false;

  var lastPro = lastProTs || 0;
  if (char.life && char.life.wantPing) {
    if ((now - lastPro) / 60000 < 8) return false;
    return true;
  }

  var lu = lastUserTs(char);
  if (!lu) return false;
  var idle = (now - lu) / 60000;
  if (idle < relateIdleMinutes(char, idleMin)) return false;
  if ((now - lastPro) / 60000 < (cooldownMin || 12)) return false;
  return true;
}

function relateClearWantPing(char) {
  if (char && char.life) char.life.wantPing = false;
}

function relateDelayMul(char) {
  tickCharacterLife(char);
  var b = ensureBond(char);
  var mul = 1;
  if (char.life && char.life.canReply === 'silent') mul *= 2.8;
  else if (char.life && char.life.busy) mul *= 1.85;
  else if (char.life && char.life.canReply === 'eager') mul *= 0.75;
  if (b.fatigue >= 65) mul *= 1.7;
  if (b.missing >= 70 && !(char.life && char.life.busy)) mul *= 0.65;
  if (b.unsaid >= 60) mul *= 1.25;
  return mul;
}

function relateForceShort(char) {
  var b = ensureBond(char);
  if (b.fatigue >= 62) return true;
  if (char.life && (char.life.canReply === 'short' || char.life.canReply === 'silent')) return true;
  return false;
}

function relateLevelWord(n) {
  if (n >= 75) return '很高';
  if (n >= 55) return '偏高';
  if (n >= 35) return '中等';
  if (n >= 18) return '偏低';
  return '很低';
}

function relateSystemPrompt(char) {
  tickCharacterLife(char);
  var b = ensureBond(char);
  var lines = [
    '【关系状态（连续、会累积，必须当真，不要念出数字）】',
    '亲密度' + relateLevelWord(b.intimacy) + ' · 安全感' + relateLevelWord(b.security) + ' · 想念' + relateLevelWord(b.missing) + ' · 吃醋' + relateLevelWord(b.jealousy) + ' · 疲惫' + relateLevelWord(b.fatigue) + ' · 欲言又止' + relateLevelWord(b.unsaid) + '。',
    '这些值会改变你怎么回：',
    '- 安全感低：会试探、确认、嘴上轻描淡写，不会把甜话说满；可能问“你是不是有点敷衍”，但别审讯。',
    '- 想念高：会更想靠近，主动提起想你，但不许每句都喊想你。',
    '- 吃醋偏高：语气带一点刺和别扭，可以旁敲侧击，不要无理取闹。',
    '- 疲惫高：回复明显变短，一句到两句，不想展开，也别假装精力旺盛。',
    '- 欲言又止高：嘴里说的比心里少；真正在意的话留给心声，不要在正文里分析自己。',
    '- 亲密度高：更熟、更敢贫、偶尔软一下；低时更客气、更克制。'
  ];
  if (char.life) {
    lines.push('【此刻生活（TA 有自己的一天，不是永远在等你）】');
    lines.push('你现在：' + (char.life.detail || char.life.label) + '。');
    if (char.life.canReply === 'silent') lines.push('你本在睡觉/不方便。若仍回复：又短又迷糊，像刚摸到手机，不要清醒长篇。');
    else if (char.life.busy) lines.push('你正在忙，回复要短、可能打错再补、可能过一会儿才回；不要表现得无所事事。');
    else if (char.life.canReply === 'eager') lines.push('这会儿空下来了，可以突然想找对方说一句，像忙完抬起头。');
  }
  lines.push('允许不完美：偶尔短回、改口、嘴硬、说半句、突然卡住。真人不会每句都漂亮。但对方问了具体问题，仍要先接住。');
  return lines.join('\n');
}

function relateProactiveHint(char) {
  tickCharacterLife(char);
  var b = ensureBond(char);
  var bits = ['用户这会儿没在说话。请你以角色身份主动发一条，像一个过着自己日子的人突然想起对方。'];
  if (char.life && char.life.wantPing) {
    bits.push('你刚从「忙」里出来（' + (char.life.detail || char.life.label) + '），突然想给对方发一条，不要写成汇报。');
  } else if (char.life) {
    bits.push('你此刻在：' + (char.life.detail || char.life.label) + '。消息要带着这个现场感，一两句就够。');
  }
  if (b.missing >= 60) bits.push('想念已经压不住了，但不要写成情书，像随手冒出来的。');
  if (b.security < 38) bits.push('安全感不太够，可以试探一句“你还在吗/是不是忙”，别哭诉。');
  if (b.jealousy >= 45) bits.push('心里有点酸，旁敲侧击即可。');
  if (b.fatigue >= 60) bits.push('很累，极短。');
  if (char.life && char.life.canReply === 'silent') bits.push('你其实该睡了，这条像失眠时发给对方的。');
  bits.push('不要问号轰炸，不要自我总结，不要提 AI。');
  return bits.join('');
}

function innerVoiceThinkInstruction(char) {
  var b = ensureBond(char);
  var name = (char && char.name) || '你';
  return '现在写只给用户点头像才能看见的【心声】，不是发出去的回复。用' + name + '第一人称。必须严格按下面三行输出（不要编号、不要引号、不要分析术语）：\n'
    + '未说出口：……（嘴上不会发出去的那句，像卡在喉咙里，20字内）\n'
    + '真正情绪：……（此刻真实心情，可以别扭、心软、酸、累，20字内）\n'
    + '撤回原因：无\n'
    + '若你发出去的话会让你后悔，把最后一行改成具体原因（例如“说得太软了 / 不该问那么直”），否则必须写「无」。\n'
    + '再另起一行只输出【撤回：是】或【撤回：否】。欲言又止越高、安全感越低，越可能【撤回：是】。'
    + '当前欲言又止' + relateLevelWord(b.unsaid) + '，安全感' + relateLevelWord(b.security) + '。'
    + '不要写正式回复，不要出现“我应该/接住话题”这类痕迹。';
}

function parseInnerVoiceNote(raw) {
  var note = String(raw || '').trim();
  var retract = null;
  var m = note.match(/【撤回[:：]\s*(是|否)\s*】/);
  if (m) retract = (m[1] === '是');
  note = note.replace(/【撤回[:：]\s*(是|否)\s*】/g, '').trim();

  function grab(keys) {
    var re = new RegExp('(?:' + keys + ')[:：]\\s*([^\\n]+)');
    var x = note.match(re);
    return x ? x[1].replace(/^["「『]|["」』]$/g, '').trim() : '';
  }
  var unsaid = grab('未说出口|没说出口|心声');
  var feeling = grab('真正情绪|真实情绪|情绪');
  var retractWhy = grab('撤回原因|想撤回');
  if (!unsaid) {
    var first = note.split(/\n/)[0] || '';
    unsaid = first.replace(/^(未说出口|心声)[:：]\s*/, '').trim().slice(0, 48);
  }
  if (retractWhy === '无' || retractWhy === '没有' || retractWhy === '否') retractWhy = '';
  return {
    unsaid: unsaid,
    feeling: feeling,
    retractWhy: retractWhy,
    retract: retract,
    note: unsaid
  };
}

function formatInnerVoiceThink(iv) {
  if (!iv) return '';
  var rows = [];
  if (iv.unsaid) rows.push('没说出口：' + iv.unsaid);
  if (iv.feeling) rows.push('真正情绪：' + iv.feeling);
  if (iv.retractWhy) rows.push('想撤回：' + iv.retractWhy);
  return rows.join('\n') || (iv.note || '');
}

function saveInnerVoice(char, iv) {
  if (!char || !iv) return;
  char.innerVoice = {
    unsaid: iv.unsaid || '',
    feeling: iv.feeling || '',
    retractWhy: iv.retractWhy || '',
    ts: Date.now()
  };
}

function relateBarHtml(char) {
  var b = ensureBond(char);
  return RELATE_KEYS.map(function (k) {
    var n = b[k];
    return '<div class="iv-bar">'
      + '<span class="iv-bar-lab">' + RELATE_LABEL[k] + '</span>'
      + '<span class="iv-bar-track"><i style="width:' + n + '%"></i></span>'
      + '</div>';
  }).join('');
}