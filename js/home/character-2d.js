/* ============================================================
 * js/home/character-2d.js — 家园 · 2D 人物
 * ============================================================
 *
 * 2D 房间（客厅 / 浴室 / 庭院）里的人物就是这一份：一个 .home-person 覆盖层，
 * 背后是 state.home.char（形象）+ state.home.mySize（大小）+ rooms[*].personPos（站位）。
 *
 * 3D 房间（卧室 / 小厨房）的人物是另一套，见 character-3d.js —— 两边互不依赖，
 * 渲染方式、数据结构、生命周期都分开。以后往 3D 房间里加人物模型，
 * 只需要实现 character-3d.js 的接口，本文件一行都不用改。
 *
 * 本文件由两部分组成，作用域刻意不同：
 *   1) 下面的 IIFE：状态读写（HomeAvatar）+ iframe 消息桥接，保持私有，只导出全局；
 *   2) 顶层的形象编辑面板函数：必须保持全局，因为 renderHome 生成的 HTML 里
 *      用内联 onclick 直接调 openHomeCharEdit。
 * ============================================================ */

(function () {
  'use strict';

  var SIZE_MIN = 6, SIZE_MAX = 40, SIZE_DEFAULT = 11;
  var POSES = ['stand', 'walk', 'sit', 'sleep', 'wave', 'crouch'];
  var legacyClose = window.closeHomeCharEdit;

  function clone(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  // ---- 2D 形象：类型 + 取值（默认 / 自定义图片 / 我的头像）----

  function get2D() {
    return clone((state.home && state.home.char) || { type:'', value:'' });
  }

  function set2D(value) {
    value = value && typeof value === 'object'
      ? { type:value.type || '', value:typeof value.value === 'string' ? value.value : '' }
      : { type:'', value:'' };
    state.home.char = value;
  }

  // ---- 尺寸 ----

  function getSize() {
    // state.js 载入时已归一化为 Number(x) || 11，这里保持同一兜底语义，
    // 不能写成 clamp(...) || SIZE_DEFAULT —— clamp 会把空值抬到 SIZE_MIN。
    return clamp((state.home && state.home.mySize) || SIZE_DEFAULT, SIZE_MIN, SIZE_MAX);
  }

  function setSize(value) {
    state.home.mySize = clamp(value, SIZE_MIN, SIZE_MAX);
  }

  // ---- 站位：按房间分别记 ----

  function currentRoomId() {
    return state.home && state.home.activeRoom ? state.home.activeRoom : 'living';
  }

  function roomDefaultPosition(roomId) {
    var room = state.home && state.home.rooms && state.home.rooms[roomId];
    var base = room && room.personPos ? room.personPos : { x:50, y:75 };
    return { x:clamp(base.x, 2, 98), y:clamp(base.y, 2, 94) };
  }

  function getPosition(roomId) {
    roomId = roomId || currentRoomId();
    var room = state.home && state.home.rooms && state.home.rooms[roomId];
    return clone((room && room.personPos) || roomDefaultPosition(roomId));
  }

  function setPosition(roomId, position, shouldSave) {
    roomId = roomId || currentRoomId();
    var p = {
      x: clamp(position && position.x == null ? 50 : position.x, 2, 98),
      y: clamp(position && position.y == null ? 75 : position.y, 2, 94)
    };
    var room = state.home && state.home.rooms && state.home.rooms[roomId];
    if (room) room.personPos = p;
    if (shouldSave && typeof saveState === 'function') saveState();
    return p;
  }

  // ---- 姿势：驱动 2D 形象上的 home-pose-* 类 ----

  function getActorState(roomId) {
    roomId = roomId || currentRoomId();
    var room = state.home && state.home.rooms && state.home.rooms[roomId];
    return Object.assign({ pose:'stand', furnitureId:'', action:'', updatedAt:0 }, room && room.personState || {});
  }

  function setActorState(roomId, nextState, shouldSave) {
    roomId = roomId || currentRoomId();
    nextState = Object.assign({ pose:'stand', furnitureId:'', action:'', updatedAt:Date.now() }, nextState || {});
    if (POSES.indexOf(nextState.pose) < 0) nextState.pose = 'stand';
    var room = state.home && state.home.rooms && state.home.rooms[roomId];
    if (room) room.personState = nextState;
    applyPoseToOverlay();
    if (shouldSave && typeof saveState === 'function') saveState();
    return nextState;
  }

  function poseForAction(furniture, action) {
    var text = String(((furniture && furniture.id) || '') + ' ' + ((action && action.label) || '') + ' ' + ((action && action.result) || ''));
    if (/睡|躺|午睡|休息/.test(text)) return 'sleep';
    if (/坐|瘫|靠|依偎/.test(text)) return 'sit';
    if (/蹲|弯腰|翻找/.test(text)) return 'crouch';
    if (/挥手|打招呼|招手/.test(text)) return 'wave';
    return 'stand';
  }

  // 2D 和 3D 人物用同一套姿势取值，但解析规则必须一致，
  // 否则同一个家具在 2D 房间和 3D 房间会摆出不同姿势。
  // 规则实现在这里（属于人物语义），furniture.js 直接取用，不自己再写一份。
  function poseForFurnitureAction(furniture, action) {
    return poseForAction(furniture, action);
  }

  function applyFurniturePose(furniture, action, shouldSave) {
    return setActorState(currentRoomId(), {
      pose: poseForAction(furniture, action),
      furnitureId: furniture && furniture.id || '',
      action: action && action.label || '',
      updatedAt: Date.now()
    }, shouldSave);
  }

  function applyPoseToOverlay() {
    var el = document.getElementById('homePerson');
    if (!el) return;
    var actorState = getActorState();
    POSES.forEach(function (pose) { el.classList.remove('home-pose-' + pose); });
    el.classList.add('home-pose-' + (actorState.pose || 'stand'));
    el.dataset.pose = actorState.pose || 'stand';
  }

  var HomeAvatar = {
    get2D: get2D,
    set2D: set2D,
    getSize: getSize,
    setSize: setSize,
    getPosition: getPosition,
    setPosition: setPosition,
    getActorState: getActorState,
    setActorState: setActorState,
    applyFurniturePose: applyFurniturePose,
    applyPoseToOverlay: applyPoseToOverlay
  };
  window.HomeAvatar = HomeAvatar;

  // 姿势解析规则是"人物语义"，不属于 2D 实现细节 —— 3D 插槽也要用同一份，
  // 否则同一个家具动作在两类房间里会解析出不同姿势。
  // 2D/3D 各自怎么渲染这个姿势仍然完全独立，这里只共享"哪个姿势"的判定。
  window.poseForFurnitureAction = poseForFurnitureAction;

  // 退出家园 / 切换房间时收起形象编辑器。3D 编辑器已下线，
  // 这里只是把 2D 面板关掉，调用点都带 window 判空，留着最省事。
  window.closeHomeAvatarEditor = function () {
    if (typeof legacyClose === 'function') legacyClose();
  };
})();

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
function homeCharDisplay() {
  if (window.HomeAvatar) return HomeAvatar.get2D();
  return (state.home && state.home.char) || { type: '', value: '' };
}
var HOME_DEFAULT_PERSON = 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg';
function resolveHomeChar() {
  var f = homeCharDisplay();
  if (f.type === 'image' && f.value) return { url: f.value };
  if (f.type === 'emoji' && f.value) return { emoji: f.value };
  if (f.type === 'avatar') {
    var profile = (typeof activeProfile === 'function') ? activeProfile() : null;
    var av = (profile && profile.avatar) || (state.myProfile && (state.myProfile.avatarImage || state.myProfile.avatar));
    if (typeof av === 'string' && /^(https?:|data:|\/)/.test(av)) return { url: av };
    if (typeof av === 'string' && av.trim()) return { emoji: av };
  }
  return { url: HOME_DEFAULT_PERSON };
}
function homeCharSize() {
  if (window.HomeAvatar) return HomeAvatar.getSize();
  return (state.home && state.home.mySize) || 11;
}
function homePersonHtml(id, pos) {
  var face = resolveHomeChar();
  var size = homeCharSize();
  var bg = face.url ? "background-image:url('" + escapeHTML(face.url) + "')" : '';
  var inner = face.emoji ? '<span class="home-person-emoji">' + escapeHTML(face.emoji) + '</span>' : '';
  var depthStyle = '';
  if (state.home && state.home.activeRoom === 'living') {
    var pd = Math.max(0, Math.min(100, pos.y)) / 100;
    depthStyle = ';transform:translate(-50%,-100%) scale(' + (0.6 + pd * 0.8).toFixed(3) + ');transform-origin:50% 100%;animation:none;z-index:' + Math.round(20 + pos.y);
  }
  return '<div id="' + id + '" class="home-person" style="left:' + pos.x + '%;top:' + pos.y + '%;width:' + size + '%;' + bg + depthStyle + '">' + inner + '</div>';
}
function openHomeCharEdit() {
  window._homeCharTab = 'me';
  renderHomeCharPanel();
}
function closeHomeCharEdit() { var el = $('homeCharEdit'); if (el) el.style.display = 'none'; }
function applyHomeCharToPerson() {
  var el = $('homePerson');
  if (!el) return;
  var face = resolveHomeChar();
  var ex = el.querySelector('.home-person-emoji');
  if (face.emoji) {
    el.style.backgroundImage = 'none';
    if (!ex) { ex = document.createElement('span'); ex.className = 'home-person-emoji'; el.appendChild(ex); }
    ex.textContent = face.emoji;
  } else {
    if (ex) ex.remove();
    el.style.backgroundImage = (face && face.url) ? "url('" + face.url + "')" : 'none';
  }
  el.style.width = homeCharSize() + '%';
  if (window.HomeAvatar) HomeAvatar.applyPoseToOverlay();
}
function homeCharPickFile(input) {
  var file = input.files && input.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { input.value = ''; return alert('请选择图片文件'); }
  compressAvatar(file).then(function (url) {
    if (window.HomeAvatar) HomeAvatar.set2D({ type:'image', value:url });
    else state.home.char = { type:'image', value:url };
    saveState(); applyHomeCharToPerson(); renderHomeCharPanel();
  }).catch(function (err) {
    alert('人物图片读取失败：' + err.message);
  }).finally(function () { input.value = ''; });
}
function homeCharSetDefault() {
  if (window.HomeAvatar) HomeAvatar.set2D({ type:'', value:'' });
  else state.home.char = { type:'', value:'' };
  saveState(); applyHomeCharToPerson(); renderHomeCharPanel();
}
function homeCharSetAvatar() {
  if (window.HomeAvatar) HomeAvatar.set2D({ type:'avatar', value:'' });
  else state.home.char = { type:'avatar', value:'' };
  saveState(); applyHomeCharToPerson(); renderHomeCharPanel();
}
function homeCharResize(val) {
  val = Math.max(6, Math.min(40, Number(val) || 11));
  if (window.HomeAvatar) HomeAvatar.setSize(val);
  else state.home.mySize = val;
  saveState();
  var el = $('homePerson');
  if (el) el.style.width = val + '%';
  var lab = $('homeCharSizeVal'); if (lab) lab.textContent = val + '%';
}
function renderHomeCharPanel() {
  var el = $('homeCharEdit'); if (!el) return;
  window._homeCharTab = 'me';
  var f = homeCharDisplay();
  var face = resolveHomeChar();
  var size = homeCharSize();
  var usingImage = (f.type === 'image' && f.value);
  var usingAvatar = (f.type === 'avatar');
  var usingDefault = (!usingImage && !usingAvatar);
  var faceInner = face.emoji ? '<span class="char-face-emoji">' + escapeHTML(face.emoji) + '</span>' : '';
  var faceStyle = face.emoji ? '' : "background-image:url('" + escapeHTML(face.url) + "')";
  var sourceHtml = '<button class="char-src' + (usingDefault ? ' on' : '') + '" onclick="homeCharSetDefault()">默认</button>'
    + '<label class="char-src' + (usingImage ? ' on' : '') + '">上传<input type="file" accept="image/*" style="display:none" onchange="homeCharPickFile(this)"></label>'
    + '<button class="char-src' + (usingAvatar ? ' on' : '') + '" onclick="homeCharSetAvatar()">头像</button>';
  el.innerHTML = `
    <div class="char-edit-card">
      <button class="char-edit-close" onclick="closeHomeCharEdit()" aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="char-edit-tabs">
        <button class="char-tab on">我</button>
        <!-- 只编辑自己的形象 -->
      </div>
      <div class="char-edit-avatar" id="charFacePreview" style="${faceStyle}">${faceInner}</div>
      <div class="char-edit-hint">我 · ${usingDefault ? '默认形象' : (usingImage ? '已上传图片' : '我的头像')}</div>
      <div class="char-edit-size">
        <span>大小</span>
        <input type="range" min="6" max="40" step="1" value="${size}" oninput="homeCharResize(this.value)">
        <span id="homeCharSizeVal">${size}%</span>
      </div>
      <div class="char-edit-source">${sourceHtml}</div>
    </div>`;
  el.style.display = 'flex';
}

/* 伴侣形象相关的家具动作不再自动注入；聊天和关系数据不受影响。 */

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
