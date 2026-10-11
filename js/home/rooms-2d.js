/* ============================================================
 * js/home/rooms-2d.js — 家园 · 庭院（2D 种植养成）
 * ============================================================
 *
 * 2D 房间 = 客厅 / 浴室 / 庭院，它们没有 WebGL 场景，家具是 DOM 元素 +
 * emoji/内联 SVG（图形见 art.js），互动逻辑直接操作 DOM。
 *
 * 本文件只放**庭院**的种植玩法（空地 / 浇水 / 除虫 / 收获）。
 * 客厅和浴室没有自己的玩法代码，它们只是复用 index.js 的通用渲染 +
 * furniture.js 的通用互动；���体画面由 art.js 的 livingRoomArt /
 * bathroomRoomArt 提供。
 *
 * 房间数据补全（ensureHomeRooms）已移到 room-data.js —— 它要处理所有房间，
 * 包括 3D 的卧室和小厨房，放在这里名不副实。
 * ============================================================ */

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
  person: '',
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
