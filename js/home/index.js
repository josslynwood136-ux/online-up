/* ============================================================
 * js/home/index.js — 家园 · 入口与房间调度
 * ============================================================
 *
 * 整个家园 app 的门面。apps.js 里的 openApp('家园') 走 Home.open()，
 * 之后换房间是 Home.switchRoom()，重绘是 Home.render()。
 *
 * 房间分两类，渲染路径不同：
 *   2D 房间  客厅 / 浴室 / 庭院  —— 家具是 DOM + emoji，见 rooms-2d.js / art.js
 *   3D 房间  卧室 / 小厨房      —— 家具是 WebGL 网格，场景代码在
 *                                rooms-3d/{bedroom,kitchen}-scene.js，
 *                                几何体在同目录的 -geometry.js，HUD 在 -hud.js
 *
 * 人物严格分离，两边互不越界：
 *   2D 房间 -> character-2d.js 的 .home-person DOM 覆盖层（由 renderHome 生成）
 *   3D 房间 -> character-3d.js 挂进 WebGL 场景的网格
 * 3D 房间里不会出现 2D 小人，2D 房间里也不会加载 3D 模型。
 * 房间是 2D 还是 3D 由 rooms.js 的注册表决定，这里不硬编码。
 * ============================================================ */
(function (global) {
  'use strict';

  var Home = {
    /** 打开家园 app。由 apps.js 的 openApp 分发调用。 */
    open: function () {
      return global.renderHome();
    },

    /** 切换房间。id 见 state.home.rooms 的 key。 */
    switchRoom: function (id) {
      return global.switchRoom(id);
    },

    /** 重绘当前房间。家具互动、种植操作之后会调用。 */
    render: function () {
      return global.renderHome();
    },

    /** 当前房间是不是 3D 房间（决定用哪个人物系统）。类型表见 rooms.js。 */
    is3DRoom: function (id) {
      return HomeRooms.is3D(id);
    }
  };

  global.Home = Home;
})(typeof window !== 'undefined' ? window : this);

function renderHome() {
  if (window.closeHomeAvatarEditor) window.closeHomeAvatarEditor();
  if (window.closeHomeCharEdit3D) window.closeHomeCharEdit3D();
  destroyBedroom3D();
  // 小厨房场景常驻：切走只暂停，30 秒内回来直接复用（见 kitchen-scene.js）
  if (typeof suspendKitchen3D === 'function') suspendKitchen3D();
  const mc = c();
  if (mc) { mc.style.padding = '0'; mc.style.height = '100%'; mc.style.overflow = 'hidden'; }
  const hdr = document.querySelector('.app-header');
  if (hdr) hdr.classList.add('hidden');
  const DEFAULT_PERSON = 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg';
  var h = state.home;
  if (!h || !h.rooms) { state.home = JSON.parse(JSON.stringify(defaultState.home)); h = state.home; saveState(); }
  ensureHomeRooms();
  var activeId = h.activeRoom || 'living';
  var room = h.rooms[activeId];
  if (!room) { activeId = 'living'; room = h.rooms.living; h.activeRoom = 'living'; saveState(); }
  var yd = yardState();
  var plotHtml = (activeId === 'yard' && yd) ? renderYardPlots(yd) : '';
  var bathHtml = '';
  var sceneHtml = '';
  if (activeId === 'living') sceneHtml = livingRoomArt();
  if (activeId === 'bathroom') sceneHtml = bathroomRoomArt();
  var isBath = (activeId === 'bathroom');
var furHtml = '';
    if (activeId === 'bedroom') {
      // 3D 房间：canvas + HUD 由 initBedroom3D 填进这个容器
      // （原来在这里手写 canvas + 提示条 + 圆按钮，现已搬进 bedroom-hud.js）
      furHtml = '<div class="bedroom-embed"></div>';
    } else if (activeId === 'smallkitchen') {
      // 3D 房间：canvas 由 initKitchen3D 填进这个容器（原来是一个 iframe）
      furHtml = '<div class="kitchen-embed"></div>'
        + '<div class="bedroom3d-hint">拖动旋转视角 · 点击家具互动</div>';
    } else {
      furHtml = (room.furniture || []).map(function (f) {
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
    }
  var roomTabs = Object.keys(h.rooms).map(function(rid) {
    var r = h.rooms[rid];
    return '<div class="home-tab' + (rid === activeId ? ' active' : '') + '" onclick="switchRoom(\'' + rid + '\')">' + escapeHTML(r.name) + '</div>';
  }).join('');

  // 人物只在 2D 房间渲染 .home-person 覆盖层。
  // 3D 房间的人物由 character-3d.js 挂进 WebGL 场景，不走 DOM，
  // 所以这里不能给 3D 房间生成 2D 形象，否则会出现"3D 房间里有 2D 小人"。
  var is3DRoom = HomeRooms.is3D(activeId);
  var mePersonHtml = '';
  if (!is3DRoom) {
    var pp = window.HomeAvatar ? HomeAvatar.getPosition(activeId) : (room.personPos || { x: 50, y: 72 });
    mePersonHtml = homePersonHtml('homePerson', pp);
  }
  c().innerHTML = `
    <div class="stack" style="height:100%;margin:0;padding:0;position:relative">
      <div class="home-room${activeId === 'living' ? ' living' : ''}${activeId === 'bathroom' ? ' bathroom' : ''}${activeId === 'yard' ? ' yard' : ''}${activeId === 'bedroom' ? ' bedroom' : ''}${activeId === 'smallkitchen' ? ' smallkitchen' : ''}">
        <div class="home-bg"${room.bg ? ` style="background-image:url('${escapeHTML(room.bg)}')"` : ''}></div>
        ${sceneHtml}
        <div class="home-exit" onclick="closeApp()" title="退出">✕</div>
        <div class="home-log-btn" onclick="toggleHomeLog()" title="查看记录">📜</div>
        <div class="home-char-btn" onclick="${is3DRoom ? 'openHomeCharEdit3D()' : "openHomeCharEdit('me')"}" title="${is3DRoom ? '编辑 3D 人物' : '编辑我的形象'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5"/></svg></div>
        ${bathHtml}
        ${plotHtml}
        ${furHtml}
        ${mePersonHtml}
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
  if (window.HomeAvatar) HomeAvatar.applyPoseToOverlay();
  if (roomEl) {
    roomEl.onclick = function(ev) {
      const bubEl = ev.target.closest('.bath-bubble');
      if (bubEl) { doFurnitureAction(bubEl.dataset.fid, parseInt(bubEl.dataset.idx), bubEl); return; }
      // 对方形象暂不显示
      // 对方形象点击入口已暂时关闭
      const furEl = ev.target.closest('.home-fur');
      if (furEl) { const fid = furEl.dataset.fid; if (fid) { openFurniture(fid); return; } }
      const plotEl = ev.target.closest('.yard-plot');
      if (plotEl) { openYardPlot(parseInt(plotEl.dataset.idx)); return; }
      if (ev.target === roomEl || ev.target.classList.contains('home-bg')) {
        closeYardPop();
        var bubbles = document.querySelectorAll('.bath-bubble');
        bubbles.forEach(function(b) { b.remove(); });
      }
    };
  }
  // 3D 房间的场景是异步就绪的（要先建 canvas、再建 WebGL 上下文），
  // 所以人物挂载交给场景自己回调，而不是在这里同步问一次 ——
  // 同步问的话此刻场景还没建好，mount 永远不会被调用。
  if (activeId === 'bedroom') {
    setTimeout(initBedroom3D, 100);
  } else if (activeId === 'smallkitchen') {
    setTimeout(function () {
      var host = document.querySelector('.kitchen-embed');
      if (host && typeof initKitchen3D === 'function') initKitchen3D(host);
    }, 100);
  }
}

// 场景就绪后由场景调用（目前只有卧室；小厨房转同页后也走这里）。
// 单独抽出来是为了让"场景建好了，该把人放进去了"这件事只有一个入口。
function mountCharacter3D(roomId, scene) {
  if (!scene || !window.HomeCharacter3D) return;
  var room = state.home && state.home.rooms && state.home.rooms[roomId];
  HomeCharacter3D.mount({
    THREE: window.THREE,
    scene: scene,
    roomId: roomId,
    // 各房间的站位换算不同，交给 3D 人物自己按 roomId 决定
    personPos: (room && room.personPos) || null
  });
}
window.mountHomeCharacter3D = mountCharacter3D;

function switchRoom(id) {
  // 这里不做收摊 —— 下面必然调 renderHome()，收摊统一在它开头做（L49-53）。
  // 原来这四行和 renderHome 开头逐字重复，每次切房间收摊做两遍。
  // 它们都不读 activeRoom，所以在换房间之前做和之后做没有区别，删掉即可。
  // 以后加新的收摊步骤，只加到 renderHome 一个地方。
  var h = state.home;
  if (!h || !h.rooms || !h.rooms[id]) return;
  h.activeRoom = id;
  saveState();
  renderHome();
}
