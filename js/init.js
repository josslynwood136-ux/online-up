// ============================================================
// init.js - 初始化 + 全局事件绑定 + window 导出
// ============================================================

// 错误捕获
window.onerror = function(msg, src, line, col, err) {
  alert('脚本报错：' + msg + '\n位置：行' + line + ' 列' + col + (err && err.stack ? '\n' + err.stack : ''));
  return false;
};
window.addEventListener('error', function(e) {
  if (e.message) alert('加载/运行错误：' + e.message);
});

// ===== 桌面 App 网格渲染 =====
var APP_ICONS = [
  { name: '打卡', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
  { name: 'API', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>' },
  { name: '外观', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/><path d="M8 12h8M12 8v8"/></svg>' },
  { name: '家园', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
  { name: 'IG', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>' },
  { name: '恋爱日记', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
  { name: '自习室', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>' },
  { name: '养多肉', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M9 16h6"/><path d="M12 4v16"/><path d="M10 8c0-2 1-3 2-3s2 1 2 3"/><path d="M8 12c0-2 1-3 2-3s2 1 2 3"/><path d="M14 12c0-2 1-3 2-3s2 1 2 3"/><path d="M12 2l-2 4"/></svg>' },
  { name: '账本', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { name: '涂鸦', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>' },
  { name: '音乐', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
  { name: '线下', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' },
  { name: '相册', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
  { name: '许愿柳', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4-3-8-6-8-11a8 8 0 0 1 16 0c0 5-4 8-8 11z"/><path d="M12 11v5"/><path d="M9 14h6"/></svg>' },
  { name: '游戏房', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
  { name: '直播间', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' }
];

function renderAppGrid() {
  var g1 = $('appGrid'), g2 = $('appGrid2');
  if (!g1 || !g2) return;
  g1.innerHTML = ''; g2.innerHTML = '';
  var page1Names = { '音乐': 1, '相册': 1, 'IG': 1, '恋爱日记': 1, '自习室': 1, '养多肉': 1, '账本': 1, '涂鸦': 1, '线下': 1, '许愿柳': 1, '游戏房': 1, '直播间': 1 };
  APP_ICONS.forEach(function(app) {
    var el = document.createElement('div');
    var sizeCls = app.name === '音乐' ? ' tile-big' : (app.name === '相册' ? ' tile-wide' : '');
    el.className = 'app-icon' + sizeCls;
    el.setAttribute('data-name', app.name);
    el.innerHTML = '<div class="app-icon-svg">' + (app.svg || app.icon) + '</div><div class="app-icon-label">' + app.name + '</div>';
    el.addEventListener('click', function() {
      if (app.name === '外观') { if (typeof openAppearance === 'function') openAppearance(); return; }
      if (app.name === '许愿柳') { showWillowPortal(); return; }
      openApp(app.name);
    });
    (page1Names[app.name] ? g1 : g2).appendChild(el);
  });
}

// ===== 桌面图标分页：横向滑动 + 分页点同步 =====
function initAppPages() {
  var pages = $('appPages');
  if (!pages) return;
  var ind = $('pageIndicator');
  var dots = ind ? ind.querySelectorAll('.page-dot') : [];
  var syncDots = function(idx) {
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('active', i === idx);
  };
  // scroll 事件用 requestAnimationFrame 节流，避免每帧多次触发
  var ticking = false;
  pages.addEventListener('scroll', function() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
      var w = pages.clientWidth || 1;
      syncDots(Math.round(pages.scrollLeft / w));
      ticking = false;
    });
  });
  for (var i = 0; i < dots.length; i++) {
    (function(idx) {
      dots[i].addEventListener('click', function() {
        // 用 instant 跳转 + CSS scroll-snap 吸附，避免 smooth 动画和 snap 冲突
        pages.scrollTo({ left: idx * pages.clientWidth, behavior: 'instant' });
      });
    })(i);
  }
  // 鼠标拖拽翻页（桌面浏览器用；触屏走原生滑动）
  var down = false, moved = false, startX = 0, startL = 0, suppressNext = false;
  pages.addEventListener('pointerdown', function(e) {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; startX = e.clientX; startL = pages.scrollLeft;
  });
  window.addEventListener('pointermove', function(e) {
    if (!down) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 8) moved = true;
    pages.scrollLeft = startL - dx;
  });
  window.addEventListener('pointerup', function() {
    if (!down) return;
    down = false;
    if (moved) {
      var w = pages.clientWidth || 1;
      var idx = Math.round(pages.scrollLeft / w);
      // 拖拽松手后靠 scroll-snap 吸附，不再用 smooth scrollTo
      syncDots(idx);
      suppressNext = true;
      setTimeout(function() { suppressNext = false; }, 220);
    }
  });
  pages.addEventListener('click', function(e) {
    if (suppressNext) { e.stopPropagation(); e.preventDefault(); }
  }, true);
}

// 时钟更新
function updateClock() {
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var timeEl = $('widgetTime');
  if (timeEl) timeEl.textContent = h + ':' + m;
  var dateEl = $('widgetDate');
  if (dateEl) dateEl.textContent = now.getFullYear() + '/' + (now.getMonth()+1) + '/' + now.getDate();
  var medT = $('medTime');
  if (medT) medT.textContent = h + ':' + m;
  var medD = $('medDate');
  if (medD) medD.textContent = (now.getMonth()+1) + '/' + now.getDate();
}

// ===== 天气小组件 =====
function renderWeatherWidget() {
  var el = $('widgetWeather');
  if (!el) return;
  // 模拟天气数据，可后续接入真实 API
  var weatherData = [
    { icon: '☀️', temp: '28°', desc: '晴朗', city: '北京' },
    { icon: '⛅', temp: '26°', desc: '多云转晴', city: '北京' },
    { icon: '🌧', temp: '22°', desc: '小雨', city: '北京' },
    { icon: '❄️', temp: '-2°', desc: '小雪', city: '北京' },
    { icon: '🌤', temp: '24°', desc: '晴间多云', city: '北京' }
  ];
  var today = new Date().getDate();
  var w = weatherData[today % weatherData.length];
  el.innerHTML = '<div class="widget-weather-icon">' + w.icon + '</div>' +
    '<div class="widget-weather-info"><div class="widget-weather-temp">' + w.temp + '</div>' +
    '<div class="widget-weather-desc">' + w.desc + '</div></div>' +
    '<div class="widget-weather-city">' + w.city + '</div>';
}

// ===== 待办小组件 =====
function renderTodoWidget() {
  var list = $('todoList');
  var count = $('todoCount');
  if (!list) return;
  var todos = [
    { text: '喝水 8 杯', done: false },
    { text: '运动 30 分钟', done: false },
    { text: '阅读 20 页', done: true },
    { text: '早睡早起', done: false }
  ];
  var doneCount = todos.filter(function(t) { return t.done; }).length;
  if (count) count.textContent = doneCount + '/' + todos.length;
  list.innerHTML = todos.map(function(t, i) {
    return '<div class="widget-todo-item">' +
      '<div class="widget-todo-check' + (t.done ? ' done' : '') + '" onclick="toggleTodo(' + i + ')"></div>' +
      '<span class="widget-todo-text' + (t.done ? ' done' : '') + '">' + t.text + '</span>' +
      '</div>';
  }).join('');
}

function toggleTodo(idx) {
  var todos = [
    { text: '喝水 8 杯', done: false },
    { text: '运动 30 分钟', done: false },
    { text: '阅读 20 页', done: true },
    { text: '早睡早起', done: false }
  ];
  todos[idx].done = !todos[idx].done;
  renderTodoWidget();
}

// ===== 桌面大方照片（点选本地图片，自动压缩后存档） =====
function initDeskPhoto() {
  var box = $('deskPhoto'), img = $('deskPhotoImg'),
      hint = $('deskPhotoHint'), file = $('deskPhotoFile');
  if (!box || !img || !file) return;
  // 本地预览服务器备份兜底：浏览器存储被清空时自动恢复照片
  function saveDeskPhotosBackup() {
    try {
      var s = state.settings || {};
      fetch('/__meilodi/photos', {
        method: 'POST',
        body: JSON.stringify({
          photo: s.desktopPhoto || '',
          medal: s.desktopMedalPhoto || '',
          frames: s.desktopFrames || [],
          wallpaper: s.desktopWallpaper || ''
        })
      }).catch(function() {});
    } catch(e) {}
  }
  window.saveDeskPhotosBackup = saveDeskPhotosBackup;
  function renderDeskFrames() {
    var fr = $('deskFrames');
    if (!fr) return;
    var fArr = (state.settings && state.settings.desktopFrames) || [];
    for (var i = 0; i < 4; i++) {
      var fim = $('deskFrameImg' + i);
      var u = fArr[i];
      if (fim) { fim.style.display = u ? 'block' : 'none'; if (u && fim.src !== u) fim.src = u; }
    }
  }
  fetch('/__meilodi/photos').then(function(r) { return r.json(); }).then(function(bk) {
    try {
      if (!bk || typeof bk !== 'object') return;
      if (!state.settings) state.settings = {};
      var changed = false;
      if (!state.settings.desktopPhoto && bk.photo) { state.settings.desktopPhoto = bk.photo; changed = true; }
      if (!state.settings.desktopMedalPhoto && bk.medal) { state.settings.desktopMedalPhoto = bk.medal; changed = true; }
      if ((!state.settings.desktopFrames || !state.settings.desktopFrames.length) && bk.frames && bk.frames.length) { state.settings.desktopFrames = bk.frames; changed = true; }
      if (!state.settings.desktopWallpaper && bk.wallpaper) { state.settings.desktopWallpaper = bk.wallpaper; changed = true; }
      if (changed) {
        saveState();
        if (state.settings.desktopPhoto) { img.src = state.settings.desktopPhoto; img.style.display = 'block'; if (hint) hint.style.display = 'none'; }
        renderDeskFrames();
        var wpEl = $('wallpaper');
        if (wpEl && state.settings.desktopWallpaper) wpEl.src = state.settings.desktopWallpaper;
      }
    } catch(e) {}
  }).catch(function() {});
  var fitPhoto = function() { box.style.height = Math.round(box.offsetWidth * 9 / 16) + 'px'; };
  fitPhoto();
  window.addEventListener('resize', fitPhoto);
  var src = (state.settings && state.settings.desktopPhoto) || '';
  if (src) {
    img.src = src; img.style.display = 'block';
    if (hint) hint.style.display = 'none';
  }
  // 点选由透明 input 原生接收，这里只处理选图后的事
  file.addEventListener('change', function() {
    var f = file.files && file.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function() {
      var im = new Image();
      im.onload = function() {
        try {
          var max = 1200, w = im.width, h = im.height;
          var sc = Math.min(1, max / Math.max(w, h));
          var cv = document.createElement('canvas');
          cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
          cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
          var url = cv.toDataURL('image/jpeg', 0.85);
          if (!state.settings) state.settings = {};
          state.settings.desktopPhoto = url;
          saveState();
          saveDeskPhotosBackup();
          img.src = url; img.style.display = 'block';
          if (hint) hint.style.display = 'none';
        } catch(e) { alert('照片太大，换一张小一点的试试'); }
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
    file.value = '';
  });
  // 圆牌小图（点圆牌换图，有图时盖住时钟）
  var medal = $('deskMedal'), mImg = $('deskMedalImg'),
      mClock = $('deskMedalClock'), mFile = $('deskMedalFile');
  if (medal && mImg && mFile) {
    var mSrc = (state.settings && state.settings.desktopMedalPhoto) || '';
    if (mSrc) {
      mImg.src = mSrc; mImg.style.display = 'block';
      if (mClock) mClock.style.display = 'none';
    }
    medal.addEventListener('click', function(e) { e.stopPropagation(); });
    mFile.addEventListener('change', function() {
      var mf = mFile.files && mFile.files[0];
      if (!mf) return;
      var mrd = new FileReader();
      mrd.onload = function() {
        var mim = new Image();
        mim.onload = function() {
          try {
            var mmax = 400, mw = mim.width, mh = mim.height;
            var msc = Math.min(1, mmax / Math.max(mw, mh));
            var mcv = document.createElement('canvas');
            mcv.width = Math.round(mw * msc); mcv.height = Math.round(mh * msc);
            mcv.getContext('2d').drawImage(mim, 0, 0, mcv.width, mcv.height);
            var murl = mcv.toDataURL('image/jpeg', 0.85);
            if (!state.settings) state.settings = {};
            state.settings.desktopMedalPhoto = murl;
            saveState();
            saveDeskPhotosBackup();
            mImg.src = murl; mImg.style.display = 'block';
            if (mClock) mClock.style.display = 'none';
          } catch(e) { alert('照片太大，换一张小一点的试试'); }
        };
        mim.src = mrd.result;
      };
      mrd.readAsDataURL(mf);
      mFile.value = '';
    });
  }
  // 四个小相框（点框换图，有图显示图，没图显示小涂鸦占位）
  var frames = $('deskFrames');
  if (frames) {
    var fArr0 = (state.settings && state.settings.desktopFrames) || [];
    for (var fi = 0; fi < 4; fi++) {
      (function(idx) {
        var inp = frames.querySelector('.desk-file[data-fi="' + idx + '"]');
        var fim = $('deskFrameImg' + idx);
        if (!inp || !fim) return;
        var u0 = fArr0[idx];
        if (u0) { fim.src = u0; fim.style.display = 'block'; }
        inp.addEventListener('change', function() {
          var ff = inp.files && inp.files[0];
          if (!ff) return;
          var frd = new FileReader();
          frd.onload = function() {
            var fim2 = new Image();
            fim2.onload = function() {
              try {
                var fmax = 800, fw = fim2.width, fh = fim2.height;
                var fsc = Math.min(1, fmax / Math.max(fw, fh));
                var fcv = document.createElement('canvas');
                fcv.width = Math.round(fw * fsc); fcv.height = Math.round(fh * fsc);
                fcv.getContext('2d').drawImage(fim2, 0, 0, fcv.width, fcv.height);
                var furl = fcv.toDataURL('image/jpeg', 0.85);
                if (!state.settings) state.settings = {};
                if (!state.settings.desktopFrames) state.settings.desktopFrames = ['', '', '', ''];
                state.settings.desktopFrames[idx] = furl;
                saveState();
                saveDeskPhotosBackup();
                fim.src = furl; fim.style.display = 'block';
              } catch(e) { alert('照片太大，换一张小一点的试试'); }
            };
            fim2.src = frd.result;
          };
          frd.readAsDataURL(ff);
          inp.value = '';
        });
      })(fi);
    }
  }
}

// 初始化入口
function init() {
  function setPhoneH() {
    document.documentElement.style.setProperty('--phone-h', window.innerHeight + 'px');
  }
  setPhoneH();
  window.addEventListener('resize', setPhoneH);
  renderEmojiPanel();
  if (!state.checkins.find(function(c) { return c.id === 'ck-water'; })) {
    var today = new Date();
    var weekLater = new Date(today);
    weekLater.setDate(weekLater.getDate() + 7);
    var fmt = function(d) { return d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate(); };
    state.checkins.push({ id: 'ck-water', name: '喝水打卡', start: fmt(today), end: fmt(weekLater), totalDays: 7, doneDays: 0, doneDates: [], charId: '', status: 'doing' });
    saveState();
  }
  var _prof = activeProfile();
  var _mp = state.myProfile || {};
  if (_prof && !_prof.avatar && _mp.avatarImage) {
    _prof.avatar = _mp.avatarImage;
    saveState();
  }
  renderChat();
  renderAppGrid();
  initAppPages();
  renderWeatherWidget();
  renderTodoWidget();
  updateClock();
  setInterval(updateClock, 30000);
  initDeskPhoto();
  initDragDesktop();
  bindHotspots();
  // 更多面板：点击选项项后自动关闭
  var _mp = $('morePanel');
  if (_mp) _mp.addEventListener('click', function(e) {
    var item = e.target.closest('.panel-item');
    if (item) setTimeout(function() { var p = $('morePanel'); if (p && p.style.display === 'grid') p.style.display = 'none'; }, 80);
  });
  if (typeof loadNcmState === 'function') loadNcmState();
  if (typeof loadQqState === 'function') loadQqState();
  if (typeof maybeProbeNcm === 'function') maybeProbeNcm();
  if (typeof startRelateEngine === 'function') startRelateEngine();
  if (typeof startIdleProactive === 'function') startIdleProactive();
  if (typeof initPush === 'function') initPush();
  if (typeof checkinReminderTick === 'function') { checkinReminderTick(); setInterval(checkinReminderTick, 30000); }
  setupLaunchFullscreen();
}

// 从桌面图标启动（已安装 PWA）时，第一次用户手势进入真全屏（隐藏状态栏）。
// 浏览器禁止页面自动全屏，所以必须等首次点击/触摸；普通浏览器里不触发。
function setupLaunchFullscreen() {
  var mq = window.matchMedia;
  var launched = (mq && (mq('(display-mode: standalone)').matches || mq('(display-mode: fullscreen)').matches)) || window.navigator.standalone;
  if (!launched) return;
  var el = document.documentElement;
  var reqFs = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!reqFs) return;
  var hint = document.createElement('div');
  hint.id = 'fsHint';
  hint.textContent = '点击任意处进入全屏';
  hint.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:rgba(0,0,0,.7);color:#fff;font-size:13px;padding:8px 14px;border-radius:20px;pointer-events:none;box-shadow:0 2px 10px rgba(0,0,0,.3)';
  document.body.appendChild(hint);
  var fired = false;
  function enter() {
    if (fired) return; fired = true;
    try { reqFs.call(el); } catch (e) {}
    if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
    window.removeEventListener('pointerdown', enter);
    window.removeEventListener('touchstart', enter);
    window.removeEventListener('click', enter);
  }
  window.addEventListener('pointerdown', enter);
  window.addEventListener('touchstart', enter);
  window.addEventListener('click', enter);
}

// 桌面热点绑定（兼容触摸 + 鼠标）
function bindHotspots() {
  document.querySelectorAll('.hotspot').forEach(hs => {
    const name = hs.getAttribute('data-name');
    if (!name) return;
    let touched = false;
    hs.addEventListener('touchstart', function(ev) {
      touched = true;
      ev.preventDefault();
      if (name === '许愿柳' || name === '许愿流') { showWillowPortal(); return; }
      openApp(name);
    }, { passive: false });
    hs.addEventListener('click', function(ev) {
      if (touched) { touched = false; return; }
      if (name === '许愿柳' || name === '许愿流') { showWillowPortal(); return; }
      openApp(name);
    });
  });
}

function toggleDebug() { document.getElementById('contentArea').classList.toggle('debug-mode'); }

// 桌面滑动
function initDragDesktop() {
  const slider = $('slider');
  let isDown = false, startX = 0, scrollLeft = 0, startY = 0, moved = false;

  slider.addEventListener('mousedown', e => {
    if ($('appModal').classList.contains('active')) return;
    isDown = true; moved = false;
    startX = e.pageX - slider.offsetLeft;
    startY = e.pageY;
    scrollLeft = slider.scrollLeft;
  });
  slider.addEventListener('mouseup', () => isDown = false);
  slider.addEventListener('mouseleave', () => isDown = false);
  slider.addEventListener('mousemove', e => {
    if (!isDown) return;
    if ($('appModal').classList.contains('active')) { isDown = false; return; }
    const dx = e.pageX - slider.offsetLeft - startX;
    if (Math.abs(dx) > 6 || Math.abs(e.pageY - startY) > 6) moved = true;
    if (moved) { e.preventDefault(); slider.scrollLeft = scrollLeft - dx * 1.5; }
  });

  slider.addEventListener('touchstart', e => {
    if ($('appModal').classList.contains('active')) return;
    isDown = true; moved = false;
    startX = e.touches[0].pageX - slider.offsetLeft;
    startY = e.touches[0].pageY;
    scrollLeft = slider.scrollLeft;
  }, { passive: true });
  slider.addEventListener('touchmove', e => {
    if (!isDown) return;
    if ($('appModal').classList.contains('active')) { isDown = false; return; }
    const dx = e.touches[0].pageX - slider.offsetLeft - startX;
    const dy = e.touches[0].pageY - startY;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved = true;
    if (moved) slider.scrollLeft = scrollLeft - dx * 1.5;
  }, { passive: true });
  slider.addEventListener('touchend', () => { isDown = false; moved = false; }, { passive: true });
}

// ===== 导出到 window（确保内联 onclick 正常工作）=====
var _w = window;
_w.toggleDebug = toggleDebug; _w.openApp = openApp; _w.closeApp = closeApp; _w.quickNotice = quickNotice;
_w.switchTab = switchTab; _w.openChat = openChat; _w.closeChat = closeChat; _w.openSettings = openSettings; _w.closeSettings = closeSettings;
_w.togglePin = togglePin; _w.clearHistory = clearHistory; _w.toggleMore = toggleMore; _w.toggleEmoji = toggleEmoji; _w.toggleAutoMem = toggleAutoMem; _w.setAutoMemLen = setAutoMemLen; _w.setAutoMemEvery = setAutoMemEvery; _w.manualSummarizeMemory = manualSummarizeMemory;
_w.sendChat = sendChat; _w.sendRed = sendRed; _w.selectRpAmount = selectRpAmount; _w.onRpAmountInput = onRpAmountInput; _w.confirmRedPacket = confirmRedPacket; _w.openRedPacket = openRedPacket; _w.saveApiConfig = saveApiConfig; _w.fetchModels = fetchModels; _w.filterModelSuggestions = filterModelSuggestions; _w.showAllModels = showAllModels;
_w.testConnection = testConnection; _w.exportAllData = exportAllData; _w.importAllData = importAllData; _w.resetAllData = resetAllData;
_w.renderCharacterEditor = renderCharacterEditor; _w.saveCharacter = saveCharacter; _w.deleteCharacter = deleteCharacter; _w.addMemory = addMemory;
_w.deleteMemory = deleteMemory; _w.uploadAvatar = uploadAvatar; _w.saveMyProfile = saveMyProfile; _w.settingsAddMemory = settingsAddMemory; _w.settingsDeleteMemory = settingsDeleteMemory;
_w.newProfile = newProfile; _w.editProfile = editProfile;
_w.doCheckin = doCheckin; _w.deleteCheckin = deleteCheckin; _w.submitNewCheckin = submitNewCheckin; _w.submitEditCheckin = submitEditCheckin;
_w.addDiary = addDiary; _w.setStudyMinutes = setStudyMinutes; _w.setBreak = setBreak;
_w.toggleStudy = toggleStudy; _w.finishStudy = finishStudy; _w.clearStudyRecords = clearStudyRecords; _w.companionSay = companionSay; _w.refreshCompanion = refreshCompanion; _w.inviteStudy = inviteStudy;
_w.switchStudyCompanion = switchStudyCompanion; _w.toggleStudySound = toggleStudySound; _w.studySoundStop = studySoundStop;
_w.addLedger = addLedger; _w.deleteLedger = deleteLedger; _w.editLedger = editLedger; _w.changeLedgerMonth = changeLedgerMonth;
_w.clearCanvas = clearCanvas; _w.saveDoodle = saveDoodle; _w.undoDoodle = undoDoodle; _w.uploadDoodleBg = uploadDoodleBg;
_w.uploadMusic = uploadMusic; _w.playSong = playSong; _w.playMusic = playSong; _w.renameMusic = renameMusic; _w.deleteMusic = deleteMusic; _w.togglePlay = togglePlay; _w.nextSong = nextSong; _w.prevSong = prevSong; _w.cycleMode = cycleMode; _w.toggleFav = toggleFav; _w.setFavView = setFavView; _w.searchMusic = searchMusic; _w.clearSearch = clearSearch; _w.playSearch = playSearch; _w.openNcmLogin = openNcmLogin; _w.closeNcmLogin = closeNcmLogin; _w.setSearchSrc = setSearchSrc; _w.openQqLogin = openQqLogin; _w.closeQqLogin = closeQqLogin;
_w.renderLive = renderLive; _w.renderLiveHall = renderLiveHall; _w.openLiveRoom = openLiveRoom; _w.filterHall = filterHall; _w.liveBack = liveBack; _w.liveOpenProfile = liveOpenProfile; _w.liveCloseProfile = liveCloseProfile; _w.liveProfileFollow = liveProfileFollow; _w.liveProfileMessage = liveProfileMessage; _w.liveSay = liveSay; _w.liveHeart = liveHeart; _w.liveFollow = liveFollow; _w.liveGift = liveGift; _w.toggleLiveGifts = toggleLiveGifts; _w.toggleLiveSongs = toggleLiveSongs; _w.toggleLiveBoard = toggleLiveBoard; _w.liveSong = liveSong; _w.liveSign = liveSign; _w.liveBar = liveBar; _w.liveMic = liveMic; _w.liveBagGrab = liveBagGrab; _w.startGame = startGame; _w.hitTarget = hitTarget; _w.submitGuess = submitGuess; _w.resetGuess = resetGuess; _w.initSnake = initSnake; _w.saveSpace = saveSpace; _w.spaceKiss = spaceKiss; _w.spaceTask = spaceTask; _w.spaceSwitchRole = spaceSwitchRole; _w.spaceLoveLine = spaceLoveLine; _w.renderOffline = renderOffline; _w.offlinePickScene = offlinePickScene; _w.toggleScenePicker = toggleScenePicker; _w.offlineInvite = offlineInvite; _w.offlineSend = offlineSend; _w.offlineEnd = offlineEnd; _w.offlineSubmitInvite = offlineSubmitInvite;
_w.startLiveMiniGame = startLiveMiniGame; _w.handleMiniGameHit = handleMiniGameHit; _w.toggleLiveTheme = toggleLiveTheme;
_w.deleteMessage = deleteMessage; _w.openAlbumPicker = openAlbumPicker; _w.startCapture = startCapture;
_w.exitMultiSelect = exitMultiSelect; _w.selectAllMsgs = selectAllMsgs; _w.deleteSelected = deleteSelected;
_w.showQuoteMenu = showQuoteMenu; _w.hideQuoteMenu = hideQuoteMenu; _w.onMsgRightClick = onMsgRightClick;
_w.onMsgTap = onMsgTap; _w.quoteMessage = quoteMessage;
_w.fertilizePlant = fertilizePlant; _w.plantMood = plantMood;
_w.addLedgerQuick = addLedgerQuick;
_w.renderAlbum = renderAlbum; _w.addPhoto = addPhoto; _w.uploadPhoto = uploadPhoto; _w.deletePhoto = deletePhoto; _w.viewPhoto = viewPhoto; _w.toggleAlbumUpload = toggleAlbumUpload;
_w.openAlbum = openAlbum; _w.newAlbum = newAlbum; _w.renameAlbum = renameAlbum; _w.delAlbum = delAlbum; _w.renderAlbumPhotos = renderAlbumPhotos;
_w.capturePhoto = capturePhoto; _w.renamePhoto = renamePhoto; _w.copyPhoto = copyPhoto; _w.movePhoto = movePhoto;
_w.renderHome = renderHome; _w.switchRoom = switchRoom; _w.openFurniture = openFurniture; _w.closeHomePanel = closeHomePanel; _w.closeSimsPie = closeSimsPie; _w.doFurnitureAction = doFurnitureAction; _w.spawnRoomEffect = spawnRoomEffect;
_w.toggleHomeLog = toggleHomeLog; _w.waterPlant = waterPlant; _w.touchPlant = touchPlant;
_w.cakeNewOrder = cakeNewOrder; _w.cakePick = cakePick; _w.cakeNextStep = cakeNextStep; _w.cakeRestart = cakeRestart;
_w.hidePanels = hidePanels; _w.toggleHabit = toggleHabit; _w.addHabit = addHabit; _w.delHabit = delHabit; _w.stopMusic = stopMusic;
_w.renderIGProfile = renderIGProfile; _w.switchProfileTab = switchProfileTab; _w.renderFeed = renderFeed; _w.renderCharLibrary = renderCharLibrary; _w.openCharFromLib = openCharFromLib; _w.bindStoryItems = bindStoryItems;
_w.createCharFromLib = createCharFromLib; _w.renderIGCharEditor = renderIGCharEditor; _w.igHandleAvatarUpload = igHandleAvatarUpload; _w.igClearAvatar = igClearAvatar; _w.saveIGCharEditor = saveIGCharEditor; _w.deleteIGChar = deleteIGChar;
_w.igAddMemory = igAddMemory; _w.igDeleteMemory = igDeleteMemory;
_w.renderDmList = renderDmList; _w.renderMyProfileContent = renderMyProfileContent;
_w.openProfileEditor = openProfileEditor; _w.closeProfileEditor = closeProfileEditor;
_w.handleProfileAvatarUpload = handleProfileAvatarUpload; _w.handleProfileCoverUpload = handleProfileCoverUpload;
_w.resetProfileAvatar = resetProfileAvatar; _w.saveProfile = saveProfile;
_w.openIGStory = openIGStory; _w.showIGToast = showIGToast;
_w.renderEmojiPanel = renderEmojiPanel; _w.sendSticker = sendSticker; _w.filterStickerPanel = filterStickerPanel; _w.filterStickerByCat = filterStickerByCat; _w.addStickerFolder = addStickerFolder; _w.toggleStickerManage = toggleStickerManage; _w.exitStickerManage = exitStickerManage; _w.toggleStickerSelect = toggleStickerSelect; _w.deleteSelectedStickers = deleteSelectedStickers; _w.moveSelectedStickers = moveSelectedStickers; _w.showStickerFolderPicker = showStickerFolderPicker; _w.moveSelectedToIdx = moveSelectedToIdx; _w.moveSelectedTo = moveSelectedTo; _w.addStickerFolderThenMove = addStickerFolderThenMove; _w.showStickerFolderDeletePicker = showStickerFolderDeletePicker; _w.deleteStickerFolderIdx = deleteStickerFolderIdx; _w.showFolderActionMenu = showFolderActionMenu; _w.renameStickerFolder = renameStickerFolder; _w.deleteStickerFolder = deleteStickerFolder;
_w.renderStickerManager = renderStickerManager; _w.openStickerForm = openStickerForm; _w.switchStickerCat = switchStickerCat; _w.batchUploadStickerFiles = batchUploadStickerFiles; _w.handleStickerBatchFiles = handleStickerBatchFiles; _w.showStickerImportDialog = showStickerImportDialog; _w.closeStickerImport = closeStickerImport; _w.doImportStickers = doImportStickers; _w.relayFetchImage = relayFetchImage;
_w.closeStickerForm = closeStickerForm; _w.stickerPickImage = stickerPickImage; _w.saveStickerForm = saveStickerForm; _w.pickEditStickerCat = pickEditStickerCat;
_w.toggleTodo = toggleTodo;
_w.deleteSticker = deleteSticker;
_w.renderWillow = renderWillow; _w.makeWish = makeWish; _w.clearWishToday = clearWishToday;
_w.currentWillowWish = currentWillowWish; _w.currentWillowRule = currentWillowRule; _w.willowContextText = willowContextText; _w.willowBlocksProactive = willowBlocksProactive; _w.willowBlocksReplyFor = willowBlocksReplyFor; _w.willowBreaksRelation = willowBreaksRelation; _w.willowParseRule = willowParseRule;
_w.startIdleProactive = startIdleProactive; _w.setIdleParams = setIdleParams;
_w.showInnerVoice = showInnerVoice; _w.closeInnerVoice = closeInnerVoice;
_w.toggleAutoVoice = toggleAutoVoice; _w.setTtsProvider = setTtsProvider; _w.setTtsUrl = setTtsUrl; _w.setTtsKey = setTtsKey; _w.setTtsModel = setTtsModel; _w.setCharTtsProvider = setCharTtsProvider; _w.setCharTtsVoice = setCharTtsVoice; _w.testTtsConnection = testTtsConnection; _w.toggleMsgVoice = toggleMsgVoice; _w.stopSpeak = stopSpeak; _w.speakText = speakText;
_w.startCall = startCall; _w.endCall = endCall; _w.openChatSearch = openChatSearch; _w.closeChatSearch = closeChatSearch; _w.doChatSearch = doChatSearch; _w.jumpToChatMsg = jumpToChatMsg;

// 离开时保存
window.addEventListener('beforeunload', saveState);

// DOM 就绪后启动
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => { try { init(); } catch (e) { alert('init 执行失败：' + e.message); } });
} else {
  try { init(); } catch (e) { alert('init 执行失败：' + e.message); }
}
