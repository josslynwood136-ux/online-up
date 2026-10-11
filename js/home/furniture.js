/* ============================================================
 * js/home/furniture.js — 家园 · 家具互动流程（2D / 3D 共用）
 * ============================================================
 *
 * 本文件只管**流程**，不管**怎么显示**：
 *   点家具 -> 找家具 -> 让当前房间摆动作泡泡 -> 选动作 -> 出结果 + 写记录 + 涨亲密��
 *
 * "泡泡和结果画在哪" 交给房间自己：
 *   2D 房间 -> room-view-2d.js  （按 f.x/f.y 百分比定位 DOM）
 *   3D 房间 -> room-view-3d.js  （把 raycaster 的世界坐标投影到屏幕像素）
 * 房间是哪种由 rooms.js 决定，本文件不硬编码房间名。
 *
 * 这是 2D 和 3D 唯一的汇合点：两边都从 openFurniture(fid) 进来，
 * 之后流程完全一致，只有"呈现"这一步分道扬镳。
 * ============================================================ */

function toggleHomeLog() {
  const v = document.getElementById('homeLogView');
  if (v) v.classList.toggle('show');
}

function curRoomFur() {
  var h = state.home; if (!h || !h.rooms) return [];
  var room = h.rooms[h.activeRoom || 'living'];
  return room ? (room.furniture || []) : [];
}

// 兼容旧调用点：现在只是把活转给当前房间的实现。
// 2D / 3D 的泡泡定位逻辑分别在 room-view-2d.js / room-view-3d.js。
function openRoomBubble(f) {
  closeHomePanel();
  closeSimsPie();
  if (!f || !f.actions || !f.actions.length) return;
  var roomId = state.home && state.home.activeRoom;
  if (HomeRooms.is3D(roomId)) {
    // 3D 房间拿不到世界坐标（可能是场景自己触发的），先不投影，退化到房间中央
    Home3DRoom.showActions(f, null);
  } else {
    Home2DRoom.showActions(f);
  }
}

function openFurniture(id, world) {
  const h = state.home; if (!h) return;
  var furn = curRoomFur();
  const f = furn.find(x => x.id === id); if (!f) return;
  var room = h.rooms[h.activeRoom || 'living'];
  if (!room) return;
  if (!document.getElementById('homePanel')) return;
  if (id === 'fur-tvcabinet' || id === 'fur-painting') return;

  var roomId = h.activeRoom || 'living';
  var is3D = HomeRooms.is3D(roomId);

  if (is3D) {
    // world 是 3D 场景 raycaster 命中的世界坐标，投影成屏幕像素用
    Home3DRoom.showActions(f, world || null);
  } else {
    // 2D 房间：人物挪到家具旁边（3D 房间没有 .home-person 覆盖层，不做这件事）
    Home2DRoom.moveCharacter(roomId, f);
    Home2DRoom.showActions(f);
  }
}

function closeHomePanel() { const p = $('homePanel'); if (p) p.style.display = 'none'; }

function closeSimsPie() {
  document.querySelectorAll('.sims-pie-overlay').forEach(function(el) { el.remove(); });
}

function doFurnitureAction(furnitureId, idx, sourceEl) {
  const h = state.home; if (!h) return;
  var furn = curRoomFur();
  const f = furn.find(x => x.id === furnitureId); if (!f) return;
  const act = (f.actions || [])[idx]; if (!act) return;
  // 姿势和结果呈现都交给房间自己，furniture.js 不再判断 2D/3D。
  // 2D -> 覆盖层的 home-pose-* 类；3D -> character-3d.js 插槽。
  var is3D = HomeRooms.is3D(h.activeRoom || 'living');
  if (is3D) Home3DRoom.setPose(f, act);
  else Home2DRoom.setPose(f, act);
  const panelResult = $('homePanelResult');
  if (panelResult) panelResult.innerText = act.result;
  if (act.effect) spawnRoomEffect(furnitureId, act.effect);
  if (act.cid === 'couple' || act.kiss) {
    var p = activeRole();
    if (p) {
      var sp = spaceFor(p.id);
      sp.intimacy += 2;
      sp.kisses += 1;
      saveState();
      // 对方形象暂不移动
      homeCoupleFx();
      showIGToast((SPACE_KISS_LINES[Math.floor(Math.random() * SPACE_KISS_LINES.length)]) + ' · 亲密度 +2');
    }
  }
  const time = new Date().toLocaleString();
  h.logs = h.logs || [];
  h.logs.unshift(time + ' · ' + f.name + '：' + act.label);
  if (h.logs.length > 50) h.logs.length = 50;
  saveState();

  // 收掉泡泡，把结果文字摆在泡泡原来的位置。
  // 记下被点的那个泡泡（而不是 bubbles[0]）—— 多个动作时位置不同。
  var bubbles = Array.prototype.slice.call(document.querySelectorAll('.bath-bubble'));
  var lastPos = null;
  if (bubbles.length) {
    var lastBubble = sourceEl || bubbles[bubbles.length - 1];
    lastPos = { left: lastBubble.style.left, top: lastBubble.style.top };
  }
  if (is3D) Home3DRoom.closeActions();
  else Home2DRoom.closeActions();

  if (is3D) {
    // 3D 房间：world 传进来才能投影；拿不到就退到房间中央
    Home3DRoom.showResult(f, act.result, (sourceEl && sourceEl.__world) || null, lastPos);
  } else {
    Home2DRoom.showResult(f, act.result, lastPos);
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
