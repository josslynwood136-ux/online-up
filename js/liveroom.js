// ========== 直播间 (liveroom.js) ==========
// 独立文件，深色沉浸式主题，精简交互，AI 上下文回复

// ---------- 内部状态 ----------
var _liveTimer = null;
var _liveBagTimer = null;
var _liveHallTimer = null;
var _liveBag = { t: 60, grabbed: false };
var _liveBoard = null;
var _toastT = null;
var _liveAnchor = null;
var _liveFromHall = true;
var _hallCat = '全部';
var _hallKey = '';

// ---------- 常量 ----------
var LIVE_AUDIENCE = ['明月','阿紫','桃子','懒羊羊','小橘猫','鲸鱼','奶茶','Q酱','团团','阿澈','布丁','晚风'];

var LIVE_AUDIENCE_MSGS = [
  '主播好可爱～','前排前排！','来了来了','哈哈哈哈','好喜欢这个',
  '加油加油','么么哒','蹲一个','学到了','赞赞赞',
  '等你开唱！','晚上好呀～','真滴爱了','氛围感拉满','今天心情好好',
  '刚来，发生了什么','主播唱首歌吧','有没有人一起','刷到就是缘分',
  '主播太好看了吧','这背景好有感觉','好想连麦','什么时候下播',
  '每天都来','已经关注了','主播好温柔','新来的请多关照',
  '今天吃什么了','好安静啊直播间','送出一个小礼物','终于等到开播了',
  '主播累不累','喝口水休息一下','直播间好温馨','我来了我来了',
  '下次还来','主播好有趣','笑死我了哈哈哈','关注了关注了',
  '好喜欢这个氛围','每天都来看','主播辛苦了','今天状态好好',
  '主播好甜','太治愈了','你们有没有什么爱好','我觉得你们都好有才华',
  '谢谢你们一直陪着我','你们猜我在想什么','今天发生了一件好玩的事'
];

var LIVE_ANCHOR_MSGS = [
  '家人们晚上好，啵啵～','今天也要开开心心','来，给大家比个心 ❤',
  '我刚忙完，出来透透气','今天心情超好！','谢谢大家的点赞',
  '想聊什么都可以','偷偷放一颗小星星 ✨','耶，人气又涨啦',
  '么么么，爱你们','今天有没有人想听我唱歌呀？','最近在追一部剧，好上头！',
  '问你们一个问题：你们今天开心吗？','我学会了新技能，改天展示给你们看',
  '夜里的直播间，都是温柔的人呀','大家吃饭了吗？别饿着肚子看直播',
  '今天外面天气好好','有没有什么有趣的事分享一下','刚喝了杯奶茶，好幸福',
  '你们最近有什么好看的剧推荐吗','我昨天做了个奇怪的梦','好想养一只猫呀',
  '有没有人和我一样喜欢下雨天','今天的内容准备了很久，希望你们喜欢',
  '你们觉得这个好看吗','有没有什么想让我做的','我看到你们的评论啦，好开心',
  '大家有什么烦恼可以跟我说说','今天学到了一个新东西，好有趣',
  '你们觉得什么颜色最好看','我明天想试一个新发型','你们喜欢什么季节',
  '好安静呀，有没有人想聊天','你们有没有什么特别的爱好','我觉得你们都好有才华',
  '谢谢你们一直陪着我','你们猜我在想什么','今天发生了一件好玩的事',
  '你们有没有特别想去的地方','我最近在学一首新歌','你们觉得我唱得怎么样',
  '好想你们呀','你们今天都做了什么','我刚看到一条好搞笑的评论'
];

var LIVE_ANCHOR_TITLE = ['我们的{T}今天也要好好的','今天也是想{T}的一天','给{T}比个心 ❤','好宠我的{T}～'];

var LIVE_GIFTS = [
  { name:'小花花', icon:'🌹', cost:10 },
  { name:'爱心', icon:'💖', cost:20 },
  { name:'甜蛋糕', icon:'🍰', cost:30 },
  { name:'啵啵兔', icon:'🐰', cost:52 },
  { name:'大束花', icon:'🌷', cost:66 },
  { name:'白马火箭', icon:'🚀', cost:99 }
];

var LIVE_AUD_GIFTS = [
  { name:'小花花', icon:'🌹', cost:10 },
  { name:'爱心', icon:'💖', cost:20 },
  { name:'甜蛋糕', icon:'🍰', cost:30 }
];

var LIVE_LEVELS = [
  { lv:1, name:'路人', need:0 },
  { lv:2, name:'新朋友', need:20 },
  { lv:3, name:'常客', need:50 },
  { lv:4, name:'熟客', need:100 },
  { lv:5, name:'老粉', need:200 },
  { lv:6, name:'铁粉', need:400 },
  { lv:7, name:'死忠', need:800 },
  { lv:8, name:'真爱', need:1500 },
  { lv:9, name:'专属', need:3000 },
  { lv:10, name:'唯一', need:6000 }
];

var LIVE_BIG_FANS = [
  { name:'星辰入梦', emoji:'🌠' }, { name:'一只猫不是猫', emoji:'🐱' },
  { name:'奶茶三分糖', emoji:'🧋' }, { name:'深海的鲸', emoji:'🐋' },
  { name:'柚子汽水', emoji:'🧃' }, { name:'今天也想你', emoji:'💙' }
];

var LIVE_SONGS = ['小星星','夏天的风','告白气球','小城夏天','月亮代表我的心','略略略之歌'];

var LIVE_HALL_POOL = [
  { id:'h1', title:'深夜电台 · 想听故事', tag:'聊天', emoji:'🌙', base:128, night:true, anchor:'一只月', avatar:'🌙', bio:'夜里讲故事的人，声音软软的🌙', posts:['今晚月色真美','讲一个关于星星的故事✨','失眠的朋友欢迎来坐坐'] },
  { id:'h2', title:'街边小吃局', tag:'美食', emoji:'🍜', base:87, anchor:'饱饱', avatar:'🍜', bio:'带你吃遍每一条小吃街🍢', posts:['今晚的炒粉很香','找到了超好吃的炸串！','深夜放毒预警⚠️'] },
  { id:'h3', title:'安静自习室', tag:'学习', emoji:'📖', base:56, dayOnly:true, anchor:'小森林', avatar:'📚', bio:'一起安静学习，互相监督📖', posts:['今日打卡：2小时','整理了一份笔记','图书馆窗外的黄昏'] },
  { id:'h4', title:'深夜KTV', tag:'唱歌', emoji:'🎤', base:203, night:true, anchor:'麦霸', avatar:'🎤', bio:'点歌就唱，麦克风递给你🎤', posts:['今晚唱《夏天的风》','翻唱了周杰伦','高音我来了！'] },
  { id:'h5', title:'撸猫日常', tag:'宠物', emoji:'🐱', base:74, anchor:'猫饼', avatar:'🐱', bio:'三只猫的铲屎官🐱', posts:['饼饼今天又睡了18小时','新买的逗猫棒','猫咪晒太阳合集'] },
  { id:'h6', title:'手账素材分享', tag:'手工', emoji:'🎨', base:43, dayOnly:true, anchor:'小画笔', avatar:'🎨', bio:'手账排版灵感分享🎨', posts:['新入的胶带','今日拼贴完成！','素材整理到深夜'] },
  { id:'h7', title:'动漫番剧吐槽', tag:'聊天', emoji:'📺', base:96, anchor:'阿宅', avatar:'📺', bio:'追番十年，吐槽专业户📺', posts:['这周新番你看了吗','完结撒花🎉','千万别剧透啊'] },
  { id:'h8', title:'睡前读诗', tag:'聊天', emoji:'🌠', base:61, night:true, anchor:'晚风', avatar:'🌠', bio:'睡前读一首诗，陪你入睡🌠', posts:['今天读聂鲁达','晚安，世界','诗里的月亮最温柔'] }
];

var LIVE_KEYWORDS = [
  { re:/(火箭|🚀)/, eff:'rocket' },
  { re:/777/, eff:'777' },
  { re:/(666|六六六)/, eff:'666' },
  { re:/(爱|喜欢|么么|啵啵|想你)/, eff:'love' },
  { re:/(赞|牛|好听)/, eff:'nice' }
];

// ---------- AI 主播回复 ----------
var ANCHOR_RESPONSES = {
  greeting: {
    patterns: [/^(你好|嗨|哈喽|hey|hi|在吗|在不在|晚上好|早上好|下午好)/i],
    replies: ['在的在的，欢迎来～','你好呀，今天过得怎么样？','来啦来啦，等你很久了','嗨～今天也想见你呢','在呢在呢，你想聊什么呀']
  },
  compliment: {
    patterns: [/好看|漂亮|可爱|好听|唱得好|厉害|牛|666|赞|好棒|太强了/],
    replies: ['哎呀被你夸得都不好意思了','谢谢～你眼光真好','是你太会说了吧','嘿嘿，谢谢你的鼓励','你这样说我会骄傲的','好开心！今天也要加油']
  },
  question: {
    patterns: [/^(你|吗|呢|什么|怎么|为什么|几|哪|谁|有没有|是不是)/],
    replies: ['这个嘛…让我想想','嗯，好问题！','我觉得吧…每个人都不一样','这个我说了你别笑啊','哈哈你猜猜看','这个问题好难回答呀']
  },
  song: {
    patterns: [/唱歌|点歌|唱一个|来一首|唱首/],
    replies: ['好呀，想听什么？','我唱得不好你别嫌弃哦','来一首！等我酝酿一下','唱就唱，怕什么','你们想听什么类型的呀']
  },
  flirt: {
    patterns: [/喜欢你|想你|爱你|么么|啵啵|亲|贴贴|抱抱/],
    replies: ['哎呀你这样说我会害羞的','嘿嘿，我也喜欢你们','你嘴真甜','别这样啦，我脸都红了','谢谢你的喜欢～','你这样说我很开心呢']
  },
  food: {
    patterns: [/吃|喝|奶茶|咖啡|饭|饿|饱|宵夜|零食/],
    replies: ['说到吃的我就不困了！','你吃了吗？别饿着看直播','奶茶党万岁！','我也想吃好吃的','今天有人做饭吗','深夜聊吃的真的好吗😂']
  },
  default: {
    patterns: [],
    replies: ['嗯嗯，我在听','哈哈你说得对','是嘛是嘛','我觉得也是','你今天话好多呀，好喜欢','继续说继续说','嗯，然后呢？','我觉得你说得很有道理','哈哈哈','是的是的']
  }
};

// ---------- 工具函数 ----------
function livePick(a) { return a[Math.floor(Math.random() * a.length)]; }

function liveLevel() {
  var iv = state.live.intimacy;
  var cur = LIVE_LEVELS[0];
  for (var i = 0; i < LIVE_LEVELS.length; i++) { if (iv >= LIVE_LEVELS[i].need) cur = LIVE_LEVELS[i]; }
  var next = LIVE_LEVELS[cur.lv] || null;
  var prev = LIVE_LEVELS[cur.lv - 2] || cur;
  var pct = next ? Math.min(100, Math.round((iv - prev.need) / (next.need - prev.need) * 100)) : 100;
  return { lv: cur.lv, name: cur.name, need: cur.need, nextNeed: next ? next.need : null, pct: pct };
}

function liveTitle(lv) {
  if (lv >= 8) return '专属宝贝';
  if (lv >= 6) return '亲爱的';
  if (lv >= 4) return '宝贝';
  if (lv >= 2) return '常来呀';
  return '观众';
}

function paperIsNight() { var h = new Date().getHours(); return h >= 18 || h < 6; }
function paperName() { return paperIsNight() ? '晚报' : '日报'; }
function roomIsLive(r) {
  if (r.night && !paperIsNight()) return false;
  if (r.dayOnly && paperIsNight()) return false;
  return r.on !== false;
}

function updateRoomSchedule() {
  var now = Date.now();
  var key = '';
  LIVE_HALL_POOL.forEach(function (r) {
    if (r.on === undefined) r.on = Math.random() > 0.25;
    if (r.next === undefined) r.next = now + (2 + Math.random() * 8) * 60000;
    if (now >= r.next) {
      r.on = !r.on;
      r.next = now + (3 + Math.random() * 10) * 60000;
    }
    if (roomIsLive(r)) key += r.id + ',';
  });
  var changed = key !== _hallKey;
  _hallKey = key;
  return changed;
}

function liveAddIntimacy(n) {
  var before = liveLevel().lv;
  state.live.intimacy = Math.max(0, (state.live.intimacy || 0) + n);
  liveRefreshChips();
  var after = liveLevel();
  if (after.lv > before) liveLevelUp(after);
}

function liveLevelUp(after) {
  livePush('🎉 升级 Lv' + after.lv + ' · ' + after.name, 'sys');
  var line = $('liveLine');
  if (line) line.textContent = '哇，' + liveTitle(after.lv) + '升到 Lv' + after.lv + ' 啦！';
  saveState();
}

function liveRememberGift(g) {
  var char = activeCharacter();
  if (!char) return;
  var mems = char.memories || [];
  var last = mems[0];
  if (last && last.title === '啵啵间' && last.text.indexOf(g.name) >= 0 && (Date.now() - (last.ts || 0)) < 60000) return;
  char.memories.unshift({ id:'mem-live-'+Date.now(), title:'啵啵间', text:'在直播间给'+char.name+'送过「'+g.name+'」（¥'+g.cost+'），TA 心里记着呢。', date:new Date().toLocaleString(), ts:Date.now() });
  if (char.memories.length > 20) char.memories.length = 20;
  saveState();
}

// ---------- Toast & Banner ----------
function liveToast(msg) {
  var t = $('liveToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(function () { var tt = $('liveToast'); if (tt) tt.classList.remove('show'); }, 2200);
}

function liveBanner(text) {
  var b = $('liveBanner');
  if (!b) return;
  b.textContent = text;
  b.classList.remove('show');
  void b.offsetWidth;
  b.classList.add('show');
  setTimeout(function () { b.classList.remove('show'); }, 2800);
}

// ---------- Chat Feed ----------
function livePush(text, who, html) {
  var feed = $('liveChat');
  if (!feed) return;
  var item = document.createElement('div');
  item.className = 'live-msg';
  if (who === 'me') item.innerHTML = '<b style="color:#25f4ee">我：</b>' + text;
  else if (who === 'mygift') item.innerHTML = '<b style="color:#fe2c55">我：</b> 送出 ' + text;
  else if (who === 'follow') item.innerHTML = '<b style="color:#25f4ee">我：</b> 关注了主播～';
  else if (who === 'sys') item.innerHTML = '<b style="color:rgba(255,255,255,.5)">📢</b> ' + (html || text);
  else if (who === 'anchor') item.innerHTML = '<b style="color:#fe2c55">主播：</b> ' + escapeHTML(text);
  else if (who === 'a') item.innerHTML = '<b style="color:#ffd700">' + escapeHTML(text) + '</b>';
  else item.innerHTML = html || escapeHTML(text);
  feed.appendChild(item);
  while (feed.children.length > 12) feed.removeChild(feed.firstChild);
  feed.scrollTop = feed.scrollHeight;
}

function liveNum(n) {
  if (isNaN(n)) return;
  state.live.viewer = Math.max(0, n);
  var el = $('liveViewerNum');
  if (el) el.innerText = state.live.viewer;
}

function liveRefreshChips() {
  var lv = liveLevel();
  var lvEl = $('liveLv'); if (lvEl) lvEl.innerText = lv.lv;
  var nEl = $('liveLvName'); if (nEl) nEl.innerText = lv.name;
  var cEl = $('liveCoins'); if (cEl) cEl.innerText = state.live.coins;
}

// ---------- AI 主播回复 ----------
function liveAnchorRespond(userMsg) {
  var delay = 800 + Math.random() * 1200;
  setTimeout(function () {
    var category = 'default';
    var keys = Object.keys(ANCHOR_RESPONSES);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === 'default') continue;
      var pats = ANCHOR_RESPONSES[k].patterns;
      for (var j = 0; j < pats.length; j++) {
        if (pats[j].test(userMsg)) { category = k; break; }
      }
      if (category !== 'default') break;
    }
    var reply = livePick(ANCHOR_RESPONSES[category].replies);
    livePush(reply, 'anchor');
    var line = $('liveLine');
    if (line) line.textContent = reply;
  }, delay);
}

function liveGiftAnchorReaction(g) {
  var reactions = [
    '谢谢宝贝的{name}！好开心～',
    '哇 {icon} 好喜欢，谢谢你～',
    '收到{icon}，今晚做梦都会笑',
    '好宠我，爱你 ❤',
    '天哪 {icon}！谢谢谢谢～'
  ];
  setTimeout(function () {
    var r = livePick(reactions).replace('{name}', g.name).replace('{icon}', g.icon);
    livePush(r, 'anchor');
  }, 600 + Math.random() * 800);
}

function liveFollowAnchorReaction() {
  setTimeout(function () { livePush('谢谢关注！以后常来玩呀～', 'anchor'); }, 800);
}

// ---------- 视觉效果 ----------
function liveFloatHeart() {
  var stage = $('liveHearts');
  if (!stage) return;
  var h = document.createElement('div');
  h.className = 'live-float-heart';
  h.textContent = livePick(['❤️','💖','💛','💚','💜']);
  h.style.left = (20 + Math.random() * 60) + '%';
  stage.appendChild(h);
  setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 1100);
}

function liveGiftBurst(icon) {
  var burst = document.createElement('div');
  burst.className = 'live-gift-burst';
  burst.textContent = icon;
  var stage = $('liveStage');
  if (stage) stage.appendChild(burst);
  setTimeout(function () { if (burst.parentNode) burst.parentNode.removeChild(burst); }, 1200);
}

function liveSpawnParticles() {
  var container = $('liveParticles');
  if (!container || container.getAttribute('data-seeded')) return;
  container.setAttribute('data-seeded', '1');
  for (var i = 0; i < 15; i++) {
    var d = document.createElement('div');
    d.className = 'live-particle';
    d.style.left = (Math.random() * 100) + '%';
    var s = 2 + Math.random() * 3;
    d.style.width = s.toFixed(1) + 'px';
    d.style.height = s.toFixed(1) + 'px';
    d.style.opacity = (0.15 + Math.random() * 0.4).toFixed(2);
    d.style.animationDelay = (Math.random() * 10).toFixed(1) + 's';
    d.style.animationDuration = (8 + Math.random() * 10).toFixed(1) + 's';
    container.appendChild(d);
  }
}

// ---------- 大厅 ----------
function renderHallMasthead() {
  var t = document.querySelector('.hall-title');
  var n = document.querySelector('.hall-now');
  if (t) t.textContent = '啵啵间' + paperName();
  if (n) {
    var live = LIVE_HALL_POOL.filter(function (r) { return roomIsLive(r); }).length;
    n.textContent = live + ' / ' + LIVE_HALL_POOL.length + ' 间直播中';
  }
}

function hallTicker() {
  var changed = updateRoomSchedule();
  if (changed) { renderHallRooms(_hallCat || '全部'); renderHallMasthead(); }
  else renderHallViewers();
}

function renderHallViewers() {
  document.querySelectorAll('.hall-cover-viewers').forEach(function (el) {
    var r = LIVE_HALL_POOL.find(function (x) { return x.id === el.getAttribute('data-i'); });
    if (!r) return;
    var v = r.base + Math.floor(Math.random() * 40) - 20; if (v < 1) v = 1;
    el.textContent = v + ' 人';
  });
}

function renderLiveHall() {
  _liveFromHall = true;
  var hdr = document.querySelector('.app-header');
  if (hdr) hdr.classList.add('hidden');
  var mc = c();
  if (mc) { mc.style.padding = '0'; mc.style.height = '100%'; mc.style.overflow = 'hidden'; mc.style.background = 'transparent'; }
  if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; }
  if (_liveBagTimer) { clearInterval(_liveBagTimer); _liveBagTimer = null; }
  var char = activeCharacter();
  var cats = ['全部','唱歌','聊天','美食','学习'];
  c().innerHTML =
    '<div class="live-wrap hall-mode">' +
      '<div class="live-bg">' +
        '<div class="live-bg-orb live-bg-orb--1"></div>' +
        '<div class="live-bg-orb live-bg-orb--2"></div>' +
      '</div>' +
      '<div class="live-topbar">' +
        '<button class="live-back" onclick="closeApp()">✕</button>' +
        '<div class="hall-title-text">啵啵间' + paperName() + '</div>' +
        '<div class="hall-now">— · —</div>' +
      '</div>' +
      '<div class="hall-feature" onclick="openLiveRoom(\'\')">' +
        '<div class="hall-feat-live">LIVE</div>' +
        '<div class="hall-feat-info">' +
          '<div class="hall-feat-avatar">' + renderAvatar(char.avatar, char.name) + '</div>' +
          '<div class="hall-feat-mid">' +
            '<div class="hall-feat-head">今 日 头 条</div>' +
            '<div class="hall-feat-title">' + escapeHTML(char.name) + ' 的直播间</div>' +
            '<div class="hall-feat-sub">' + escapeHTML(char.relation || '我们的主播') + ' · 进去聊聊</div>' +
          '</div>' +
          '<div class="hall-feat-right">' +
            '<div class="hall-feat-viewers">观众 <b>' + (state.live.viewer || 12) + '</b> 人</div>' +
            '<button class="hall-enter-btn">进场</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="hall-cats">' + cats.map(function (c2) {
        return '<span class="hall-cat' + (c2 === '全部' ? ' on' : '') + '" data-cat="' + c2 + '" onclick="filterHall(\'' + c2 + '\')">' + c2 + '</span>';
      }).join('') + '</div>' +
      '<div class="hall-grid" id="hallGrid"></div>' +
    '</div>';
  updateRoomSchedule();
  renderHallRooms('全部');
  renderHallMasthead();
  if (_liveHallTimer) clearInterval(_liveHallTimer);
  _liveHallTimer = setInterval(hallTicker, 3200);
}

function renderHallRooms(cat) {
  var grid = $('hallGrid');
  if (!grid) return;
  var list = LIVE_HALL_POOL.filter(function (r) { return roomIsLive(r); });
  if (cat && cat !== '全部') list = list.filter(function (r) { return r.tag === cat; });
  if (!list.length) { grid.innerHTML = '<div class="board-empty" style="grid-column:1/-1">此栏目今日无直播</div>'; return; }
  grid.innerHTML = list.map(function (r) {
    var v = r.base + Math.floor(Math.random() * 40) - 18; if (v < 1) v = 1;
    return '<div class="hall-card" onclick="openLiveRoom(\'' + r.id + '\')">' +
      '<div class="hall-cover">' +
        '<span class="hall-cover-emoji">' + r.emoji + '</span>' +
        '<span class="hall-live-badge">LIVE</span>' +
        '<span class="hall-cover-viewers" data-i="' + r.id + '">' + v + ' 人</span>' +
        '<span class="hall-tag">' + escapeHTML(r.tag) + '</span>' +
      '</div>' +
      '<div class="hall-card-title">' + escapeHTML(r.title) + '</div>' +
      '<div class="hall-card-anchor">' + escapeHTML(r.anchor) + '</div>' +
    '</div>';
  }).join('');
}

function filterHall(c) {
  _hallCat = c;
  document.querySelectorAll('.hall-cat').forEach(function (x) {
    x.classList.toggle('on', x.getAttribute('data-cat') === c);
  });
  renderHallRooms(c);
}

// ---------- 进入直播间 ----------
function openLiveRoom(id) {
  _liveFromHall = true;
  if (id) {
    var r = LIVE_HALL_POOL.find(function (x) { return x.id === id; });
    _liveAnchor = r ? r : null;
  } else {
    _liveAnchor = null;
  }
  renderLive();
}

function liveBack() {
  if (_liveFromHall) renderLiveHall();
  else closeApp();
}

// ---------- 主直播间 ----------
function renderLive() {
  if (!state.live) state.live = { viewer:12, likes:0, giftWorth:0, gifts:0, followers:0, intimacy:0, coins:0, lastSign:'', giftLog:[], song:'', flirt:0 };
  var hdr = document.querySelector('.app-header');
  if (hdr) hdr.classList.add('hidden');
  var mc = c();
  if (mc) { mc.style.padding = '0'; mc.style.height = '100%'; mc.style.overflow = 'hidden'; mc.style.background = 'transparent'; }
  var char;
  if (_liveAnchor && _liveAnchor.anchor) {
    char = { name: _liveAnchor.anchor, avatar: _liveAnchor.avatar };
  } else {
    char = activeCharacter();
  }
  var now = state.live;
  var lv = liveLevel();
  c().innerHTML =
    '<div class="live-wrap">' +
      '<div class="live-bg">' +
        '<div class="live-bg-orb live-bg-orb--1"></div>' +
        '<div class="live-bg-orb live-bg-orb--2"></div>' +
        '<div class="live-particles" id="liveParticles"></div>' +
      '</div>' +
      '<div class="live-topbar">' +
        '<button class="live-back" onclick="liveBack()">←</button>' +
        '<div class="live-chip live-chip--live"><span class="live-dot-pulse"></span> LIVE</div>' +
        '<div class="live-chip">👁 <b id="liveViewerNum">' + now.viewer + '</b></div>' +
        '<div class="live-chip">❤ <b id="liveLikeNum">' + now.likes + '</b></div>' +
        '<div class="live-spacer"></div>' +
        '<div class="live-chip">⭐ Lv<b id="liveLv">' + lv.lv + '</b></div>' +
        '<div class="live-chip">💰 <span id="liveCoins">' + now.coins + '</span></div>' +
      '</div>' +
      '<div class="live-stage" id="liveStage">' +
        '<div class="live-avatar-ring">' +
          '<div class="live-avatar" id="liveAvatar" onclick="liveOpenProfile(\'\')" title="查看主播主页">' +
            renderAvatar(char.avatar, char.name) +
          '</div>' +
        '</div>' +
        '<div class="live-badge">LIVE · ' + escapeHTML(char.name || '主播') + '</div>' +
        '<div class="live-anchor-name" id="liveAnchorName">' + escapeHTML(char.name || '主播') +
          '<span style="font-size:12px;color:#fe2c55;margin-left:6px">☆ ' + now.followers + ' 粉</span></div>' +
        '<div class="live-subtitle" id="liveLine">正在直播中...</div>' +
        '<div class="live-hearts" id="liveHearts"></div>' +
        '<div class="live-growth" id="liveGrowth"></div>' +
      '</div>' +
      '<div class="live-banner" id="liveBanner"></div>' +
      '<div class="live-toast" id="liveToast"></div>' +
      '<div class="live-bag" id="liveBag">' +
        '<span class="live-bag-icon">🎁</span>' +
        '<b id="liveBagTime">60</b><span>s</span>' +
        '<button class="live-bag-btn" id="liveBagBtn" onclick="liveBagGrab()">抢</button>' +
      '</div>' +
      '<div class="live-chat" id="liveChat"></div>' +
      '<div class="live-toolbar">' +
        '<button class="live-tool" onclick="liveSign()">📝 签到</button>' +
        '<button class="live-tool" onclick="toggleLiveSongs()">🎵 点歌</button>' +
        '<button class="live-tool" onclick="toggleLiveBoard()">🏆 榜单</button>' +
        '<button class="live-tool" onclick="liveFollow()">＋ 关注</button>' +
      '</div>' +
      '<div class="live-inputbar">' +
        '<input class="live-input" id="liveInput" placeholder="说点什么..." onkeydown="if(event.key===\'Enter\')liveSay()">' +
        '<button class="live-like-btn" onclick="liveHeart()">❤</button>' +
        '<button class="live-gift-btn" onclick="toggleLiveGifts()">🎁</button>' +
        '<button class="live-send-btn" onclick="liveSay()">发送</button>' +
      '</div>' +
      '<div class="live-sheet-mask" id="liveGiftSheetMask" style="display:none" onclick="toggleLiveGifts()"></div>' +
      '<div class="live-sheet" id="liveGiftSheet" style="display:none">' +
        '<div class="live-sheet-handle"></div>' +
        '<div class="live-sheet-title">送礼物</div>' +
        '<div class="live-gift-grid" id="liveGiftGrid"></div>' +
      '</div>' +
      '<div class="live-sheet-mask" id="liveSongSheetMask" style="display:none" onclick="toggleLiveSongs()"></div>' +
      '<div class="live-sheet" id="liveSongSheet" style="display:none">' +
        '<div class="live-sheet-handle"></div>' +
        '<div class="live-sheet-title">点歌</div>' +
        '<div class="live-gift-grid" id="liveSongGrid"></div>' +
      '</div>' +
      '<div class="live-sheet-mask" id="liveBoardSheetMask" style="display:none" onclick="toggleLiveBoard()"></div>' +
      '<div class="live-sheet live-sheet--tall" id="liveBoardSheet" style="display:none">' +
        '<div class="live-sheet-handle"></div>' +
        '<div id="liveBoardContent"></div>' +
      '</div>' +
      '<div class="live-sheet-mask" id="liveProfileSheetMask" style="display:none" onclick="liveCloseProfile()"></div>' +
      '<div class="live-sheet live-sheet--tall" id="liveProfileSheet" style="display:none">' +
        '<div class="live-sheet-handle"></div>' +
        '<div id="liveProfileContent"></div>' +
      '</div>' +
    '</div>';
  livePush('', 'sys', '欢迎进入「啵啵间」· ' + escapeHTML(char.name) + ' 的直播间');
  livePush(livePick(LIVE_AUDIENCE), 'a');
  if (_liveTimer) { clearInterval(_liveTimer); _liveTimer = null; }
  if (_liveBagTimer) { clearInterval(_liveBagTimer); _liveBagTimer = null; }
  _liveTimer = setInterval(liveTick, 2500);
  liveBagStart();
  liveSpawnParticles();
}

// ---------- Tick ----------
function liveTick() {
  if (!_liveTimer) return;
  var r = Math.random();
  if (r < 0.35) {
    livePush(livePick(LIVE_AUDIENCE_MSGS), 'a');
    if (Math.random() < 0.25) {
      setTimeout(function () { livePush(livePick(LIVE_ANCHOR_MSGS), 'anchor'); }, 1200 + Math.random() * 1500);
    }
  } else if (r < 0.55) {
    var line = $('liveLine');
    if (line) {
      if (Math.random() < 0.6) line.textContent = livePick(LIVE_ANCHOR_MSGS);
      else line.textContent = livePick(LIVE_ANCHOR_TITLE).replace('{T}', liveTitle(liveLevel().lv));
    }
  } else if (r < 0.68) {
    liveBigFan();
  } else if (r < 0.78) {
    liveAudienceGift();
  } else if (r < 0.88) {
    var old = state.live.viewer;
    liveNum(state.live.viewer + (Math.random() < 0.5 ? 1 : (state.live.viewer > 3 ? -1 : 1)));
    if (state.live.viewer > old + 3) {
      setTimeout(function () { livePush('哇，人气涨了好多！欢迎新来的朋友～', 'anchor'); }, 1500);
    }
  }
}

// ---------- 互动 ----------
function liveSay() {
  var input = $('liveInput');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  input.value = '';
  livePush(text, 'me');
  liveNum(state.live.viewer + (Math.random() < 0.5 ? 1 : 0));
  var eff = null;
  for (var i = 0; i < LIVE_KEYWORDS.length; i++) {
    if (LIVE_KEYWORDS[i].re.test(text)) { eff = LIVE_KEYWORDS[i].eff; break; }
  }
  var line = $('liveLine');
  if (eff === 'rocket') { liveGiftBurst('🚀'); if (line) line.textContent = '哇 有人刷火箭啦！！'; }
  else if (eff === '777') { /* subtle */ }
  else if (eff === '666') { if (line) line.textContent = '你们好会夸，我害羞了～'; }
  else if (eff === 'love') { liveFloatHeart(); if (line) line.textContent = text.length <= 6 ? '我也' + text : '心都被你说软了 ❤'; }
  else if (eff === 'nice') { if (line) line.textContent = '谢谢谢谢，我会继续加油的！'; }
  liveAnchorRespond(text);
}

function liveHeart() {
  state.live.likes++;
  var likeEl = $('liveLikeNum');
  if (likeEl) likeEl.innerText = state.live.likes;
  liveFloatHeart();
  livePush('', 'me', '❤ 给主播比个心');
  if (Math.random() < 0.34) livePush(livePick(LIVE_AUDIENCE), 'a');
  saveState();
}

function liveFollow() {
  var first = state.live.followers === 0;
  state.live.followers++;
  liveAddIntimacy(first ? 10 : 5);
  liveBanner('🎉 感谢关注！粉丝 ' + state.live.followers);
  livePush('', 'follow');
  var line = $('liveLine');
  if (line) line.textContent = '关注不迷路，' + liveTitle(liveLevel().lv) + '！';
  liveFollowAnchorReaction();
  saveState();
}

function liveSign() {
  var t = todayKey();
  if (state.live.lastSign === t) { liveToast('今天已经签到过啦，明天再来'); return; }
  state.live.lastSign = t;
  state.live.coins += 20;
  liveAddIntimacy(5);
  livePush('', 'sys', '签到成功 +20 金币');
  liveToast('📝 签到成功 +20金币 · 亲密+5');
  liveRefreshChips();
  saveState();
}

// ---------- 礼物 ----------
function toggleLiveGifts() {
  var sheet = $('liveGiftSheet');
  var mask = $('liveGiftSheetMask');
  if (!sheet || !mask) return;
  var show = sheet.style.display === 'none';
  sheet.style.display = show ? 'block' : 'none';
  mask.style.display = show ? 'block' : 'none';
  if (show) renderLiveGifts();
}

function renderLiveGifts() {
  var grid = $('liveGiftGrid');
  if (!grid) return;
  grid.innerHTML = LIVE_GIFTS.map(function (g, i) {
    return '<div class="live-gift-item" onclick="liveGift(' + i + ')">' +
      '<span class="live-gift-icon">' + g.icon + '</span>' +
      '<span class="live-gift-name">' + escapeHTML(g.name) + '</span>' +
      '<span class="live-gift-cost">¥' + g.cost + '</span>' +
    '</div>';
  }).join('');
}

function liveGift(i) {
  var g = LIVE_GIFTS[i];
  if (!g) return;
  if (parseFloat(state.profile.wallet) < g.cost) { liveToast('钱包余额不足，去账本看看啦'); return; }
  state.profile.wallet = parseFloat(state.profile.wallet || 0) - g.cost;
  state.live.gifts++;
  state.live.giftWorth += g.cost;
  state.live.giftLog.unshift({ icon:g.icon, name:g.name, from:'我', cost:g.cost, time:Date.now() });
  if (state.live.giftLog.length > 30) state.live.giftLog.length = 30;
  toggleLiveGifts();
  livePush('', 'mygift', '<b style="color:#fe2c55">' + g.icon + ' ' + escapeHTML(g.name) + '</b>（¥' + g.cost + '）');
  liveGiftBurst(g.icon);
  var line = $('liveLine');
  if (line) line.textContent = livePick(['谢谢宝贝的' + g.name + '！','哇 ' + g.icon + ' 好喜欢，谢谢你～','收到' + g.icon + '，今晚做梦都会笑','好宠我，爱你 ❤']);
  liveAddIntimacy(g.cost);
  liveRememberGift(g);
  liveGiftAnchorReaction(g);
  saveState();
}

function liveAudienceGift() {
  var g = livePick(LIVE_AUD_GIFTS);
  var a = livePick(LIVE_AUDIENCE);
  state.live.giftWorth += g.cost;
  state.live.giftLog.unshift({ icon:g.icon, name:g.name, from:a, cost:g.cost, time:Date.now() });
  if (state.live.giftLog.length > 30) state.live.giftLog.length = 30;
  livePush('', 'a', '<b style="color:#ffd700">' + escapeHTML(a) + '</b> 送出 ' + g.icon + ' ' + escapeHTML(g.name) + ' ¥' + g.cost);
  saveState();
}

// ---------- 点歌 ----------
function toggleLiveSongs() {
  var sheet = $('liveSongSheet');
  var mask = $('liveSongSheetMask');
  if (!sheet || !mask) return;
  var show = sheet.style.display === 'none';
  sheet.style.display = show ? 'block' : 'none';
  mask.style.display = show ? 'block' : 'none';
  if (show) renderLiveSongs();
}

function renderLiveSongs() {
  var grid = $('liveSongGrid');
  if (!grid) return;
  var nowSong = state.live.song;
  grid.innerHTML = LIVE_SONGS.map(function (s, i) {
    return '<div class="live-gift-item' + (s === nowSong ? ' active' : '') + '" onclick="liveSong(' + i + ')">' +
      '<span class="live-gift-icon">🎵</span>' +
      '<span class="live-gift-name">' + escapeHTML(s) + '</span>' +
    '</div>';
  }).join('');
}

function liveSong(k) {
  var name = LIVE_SONGS[k];
  if (!name) return;
  state.live.song = name;
  livePush('', 'sys', '点歌：《' + escapeHTML(name) + '》');
  var line = $('liveLine');
  if (line) line.textContent = '好，唱给你听～《' + name + '》';
  toggleLiveSongs();
  saveState();
  renderLiveSongs();
}

// ---------- 榜单 ----------
function toggleLiveBoard() {
  var sheet = $('liveBoardSheet');
  var mask = $('liveBoardSheetMask');
  if (!sheet || !mask) return;
  var show = sheet.style.display === 'none';
  sheet.style.display = show ? 'block' : 'none';
  mask.style.display = show ? 'block' : 'none';
  if (show) renderLiveBoard();
}

function renderLiveBoard() {
  var board = $('liveBoardContent');
  if (!board) return;
  if (!_liveBoard) {
    _liveBoard = [
      { name:'阿澈', emoji:'🐱', worth:188 },
      { name:'奶茶', emoji:'🧋', worth:120 },
      { name:'橘子', emoji:'🍊', worth:66 }
    ];
  }
  var me = { name:'我', emoji:'🙋', worth:state.live.giftWorth || 0 };
  var rows = _liveBoard.concat([me]).sort(function (a, b) { return b.worth - a.worth; }).slice(0, 3);
  var topHtml = rows.map(function (r, i) {
    var mine = r.emoji === '🙋' ? ' mine' : '';
    return '<div class="board-row' + mine + '"><span class="board-rank">' + (i + 1) + '</span><span class="board-emoji">' + r.emoji + '</span><span class="board-name">' + escapeHTML(r.name) + '</span><span class="board-worth">¥' + r.worth + '</span></div>';
  }).join('');
  var wall = (state.live.giftLog || []).slice(0, 10).map(function (g) {
    return '<span class="wall-item">' + g.icon + ' ' + escapeHTML(g.from) + ' ' + escapeHTML(g.name) + ' ¥' + g.cost + '</span>';
  }).join('') || '<div class="board-empty">还没人送礼物，去送一个吧～</div>';
  var lv = liveLevel();
  var next = LIVE_LEVELS[lv.lv] || null;
  board.innerHTML =
    '<div class="board-head"><b>🏆 贡献榜 TOP3</b></div>' +
    topHtml +
    '<div class="board-title">🎁 礼物墙</div><div class="wall-wrap">' + wall + '</div>' +
    '<div class="board-title">⭐ 我的等级 · 亲密度 ' + state.live.intimacy + '</div>' +
    '<div class="lv-row"><span class="lv-badge">Lv' + lv.lv + '</span><span>' + escapeHTML(lv.name) + '</span><span class="lv-address">' + escapeHTML(liveTitle(lv.lv)) + '</span></div>' +
    '<div class="lv-track"><div class="lv-fill" style="width:' + lv.pct + '%"></div></div>' +
    '<div class="board-sub">' + (next ? '距 Lv' + next.lv + '·' + escapeHTML(next.name) + ' 还需 ' + (next.need - state.live.intimacy) : '已满级') + '</div>';
}

// ---------- 福袋 ----------
function liveBagStart() {
  _liveBag = { t: 60, grabbed: false };
  var bag = $('liveBag');
  if (bag) bag.style.display = 'flex';
  var te = $('liveBagTime'); if (te) te.innerText = '60';
  var btn = $('liveBagBtn');
  if (btn) { btn.disabled = false; btn.textContent = '抢'; }
  if (_liveBagTimer) clearInterval(_liveBagTimer);
  _liveBagTimer = setInterval(function () {
    _liveBag.t--;
    var el = $('liveBagTime');
    if (el) el.innerText = Math.max(0, _liveBag.t);
    if (_liveBag.t <= 0) liveBagOpen();
  }, 1000);
}

function liveBagOpen() {
  if (_liveBagTimer) { clearInterval(_liveBagTimer); _liveBagTimer = null; }
  var won = _liveBag.grabbed ? '我' : livePick(LIVE_AUDIENCE);
  var val = 10 + Math.floor(Math.random() * 16);
  if (won === '我') {
    state.live.coins += val;
    liveAddIntimacy(3);
    liveToast('🎁 福袋开奖：你抢到 ' + val + ' 金币！');
    livePush('', 'sys', '🎁 福袋开奖：我 抢到 ' + val + ' 金币！');
  } else {
    livePush('', 'sys', '🎁 福袋开奖：' + escapeHTML(won) + ' 抢到 ' + val + ' 金币');
  }
  saveState();
  liveRefreshChips();
  liveBagStart();
}

function liveBagGrab() {
  if (_liveBag.grabbed) { liveToast('你已经抢过这个福袋啦'); return; }
  _liveBag.grabbed = true;
  var btn = $('liveBagBtn');
  if (btn) { btn.disabled = true; btn.textContent = '已抢'; }
  liveToast('🎁 已抢福袋，等开奖～');
}

// ---------- 大号粉丝进场 ----------
function liveBigFan() {
  var f = livePick(LIVE_BIG_FANS);
  liveBanner('🌟 ' + escapeHTML(f.name) + ' ' + f.emoji + ' 进入直播间');
}

// ---------- 主播主页 ----------
function liveOpenProfile(id) {
  var src;
  if (id) {
    src = LIVE_HALL_POOL.find(function (x) { return x.id === id; });
  } else {
    src = _liveAnchor;
  }
  var self;
  if (!src) {
    self = true;
    var ch = activeCharacter();
    var mp = state.myProfile || {};
    src = {
      name: mp.name || ch.name, avatar: mp.avatarImage ? mp.avatar : (mp.avatar || ch.avatar),
      avatarImage: mp.avatarImage || '', bio: mp.bio || ch.background || ch.greeting || '这个人很懒，什么都没写...',
      followers: state.live.followers || (mp.followers || 342),
      posts: mp.gallery ? mp.gallery.slice(0, 9) : []
    };
  }
  var name = src.anchor || src.name || '主播';
  var avatar = src.avatar || '🌸';
  var avatarHtml = src.avatarImage
    ? '<img src="' + src.avatarImage + '" alt="">'
    : '<span style="font-size:36px">' + avatar + '</span>';
  var posts = (src.posts && src.posts.length)
    ? src.posts.map(function (t) {
        return '<div class="lp-post"><span class="lp-post-emoji">' + (src.emoji || avatar) + '</span><span class="lp-post-text">' + escapeHTML(t) + '</span></div>';
      }).join('')
    : '<div class="board-empty">还没有动态～</div>';
  var sheet = $('liveProfileSheet');
  var mask = $('liveProfileSheetMask');
  var content = $('liveProfileContent');
  if (!sheet || !mask || !content) return;
  content.innerHTML =
    '<div class="lp-cover">' +
      '<div class="lp-avatar">' + avatarHtml + '</div>' +
      '<div class="lp-name">' + escapeHTML(name) + '</div>' +
      '<div class="lp-followers">⭐ ' + (src.followers || 0) + ' 粉丝</div>' +
    '</div>' +
    '<div class="lp-bio">' + escapeHTML(src.bio || '这个人很懒，什么都没写...') + '</div>' +
    '<div class="lp-actions">' +
      '<button class="lp-btn lp-btn-primary" onclick="liveProfileFollow()">➕ 关注</button>' +
      '<button class="lp-btn" onclick="liveProfileMessage()">💬 私信</button>' +
    '</div>' +
    '<div class="lp-title">TA 的动态</div>' +
    '<div class="lp-posts">' + posts + '</div>';
  sheet.style.display = 'block';
  mask.style.display = 'block';
}

function liveCloseProfile() {
  var sheet = $('liveProfileSheet');
  var mask = $('liveProfileSheetMask');
  if (sheet) sheet.style.display = 'none';
  if (mask) mask.style.display = 'none';
}

function liveProfileFollow() {
  state.live.followers = (state.live.followers || 0) + 1;
  liveCloseProfile();
  liveToast('你关注了主播，粉丝 +1 🎉');
  var nm = _liveAnchor ? (_liveAnchor.anchor || _liveAnchor.name) : activeCharacter().name;
  var el = document.querySelector('.live-anchor-name');
  if (el) el.innerHTML = escapeHTML(nm) + '<span style="font-size:12px;color:#fe2c55;margin-left:6px">☆ ' + state.live.followers + ' 粉</span>';
}

function liveProfileMessage() {
  liveCloseProfile();
  liveToast('已发出一条私信～');
}

// ---------- 荧光棒 ----------
function liveBar() {
  if (state.live.coins < 5) { liveToast('金币不够啦，先签到或抢福袋吧'); return; }
  state.live.coins -= 5;
  liveAddIntimacy(2);
  livePush('', 'me', '🪄 点亮了一根荧光棒');
  var line = $('liveLine');
  if (line) line.textContent = '哇 有人点亮荧光棒！好有氛围～';
  liveRefreshChips();
  saveState();
}

// ---------- 连麦 ----------
function liveMic() {
  state.live.mic = !state.live.mic;
  var line = $('liveLine');
  if (state.live.mic) {
    livePush('', 'sys', '🎙️ 我 已上麦');
    if (line) line.textContent = '🎙️ 连麦中，别紧张～';
  } else {
    livePush('', 'sys', '🎙️ 我 已下麦');
    if (line) line.textContent = '下麦啦，聊得好好的嘛～';
  }
  saveState();
}
