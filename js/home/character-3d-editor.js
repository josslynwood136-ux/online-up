/* ============================================================
 * js/home/character-3d-editor.js — 家园 3D 人物编辑面板
 * ============================================================
 *
 * 房间头部的 .home-char-btn 按钮点它调openHomeCharEdit()，
 * character-2d.js 里那个是 2D 版本；这里是 3D 版本（文件名后缀 3D）。
 *
 * 三块内容：
 *   * 尺寸/ 朝向滑杆  → 直接改 state.home.mySize，转发给 character-3d-girl
 *   * 发色/ 服装色板 → 调 girl.setHairColor / setSlotColor
 *   * 左边的 3D 预览  → 把人物模型clone 一份放进独立的小场景里转，
 *                      不用切回房间就能看到效果
 *
 * 注意
 * ----
 *   * 所有按钮都是 inline onclick，所以这些函数必须挂在 window 上。
 *      漏挂会直接抛 ReferenceError。
 *   * 当前在哪个房间：看 DOM 里哪个 .home-room 带active，
 *      HomeRooms.current() 那套拿不到 —— 这个面板自己判断。
 *
 * 渲染相关
 * --------
 * 预览用的是 SkeletonUtils.clone 而不是 model.clone() ——
 * 普通 clone 会让两份模型共用同一副骨骼，改一份两份一起动。
 * 姿势是从场景里那份每帧拷过来（见 startPreview 的循环）。
 * ============================================================ */
(function (global) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function girl() { return global.HomeCharacter3DGirl; }
  function slot() { return global.HomeCharacter3D; }

  /** 当前在哪个房间 —— 看哪个 .home-room 是激活的。
   * inline onclick 里传的是 activeId，传不进来就自己猜。 */
  function currentRoomId() {
    if (document.querySelector('.home-room.smallkitchen')) return 'smallkitchen';
    if (document.querySelector('.home-room.bedroom')) return 'bedroom';
    return 'bedroom';
  }

  /** 打开面板。roomId 是房间 id，不传就用 currentRoomId() 猜的。 */
  function openHomeCharEdit3D(roomId) {
    var g = girl();
    var el = $('homeCharEdit');
    // 还没挂上人物（模型在加载 / 加载失败了）：给个提示，别开面板
    if (!g || !slot() || !slot().has()) {
      if (typeof showIGToast === 'function') {
        showIGToast('3D 人物还没加载好，稍等一下再试');
      } else {
        console.warn('[home/character-3d-editor] 人物还没落地，先不打开面板');
      }
      return;
    }
    if (!el) return;

    var dbg = g.debug();
    var room = roomId || currentRoomId();
    var yaw = Math.round(g.currentYaw() * 180 / Math.PI);
    var size = g.currentSize();

    var curHair = (g.currentHairColor && g.currentHairColor()) ||
      (state && state.home && state.home.hairColor) || '';
    var curOutfit = (g.currentOutfit && g.currentOutfit()) ||
      (state && state.home && state.home.outfit) || {};
    curOutfit = { top: curOutfit.top || '', skirt: curOutfit.skirt || '', boots: curOutfit.boots || '' };
    var curStyle = (g.currentHairStyle && g.currentHairStyle()) ||
      (state && state.home && state.home.hairStyle) || 'orig';

    el.innerHTML =
      '<div class="char-edit-card c3d-card c3d-wide">' +
      '  <button class="char-edit-close" onclick="closeHomeCharEdit3D()" aria-label="关闭">' +
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '    <path d="M6 6l12 12M18 6L6 18"/></svg>' +
      '  </button>' +
      '  <div class="c3d-cols">' +
      '  <div class="c3d-preview">' +
      '    <div id="c3dPreview"></div>' +
      '    <div class="c3d-preview-hint">拖动可以转视角 · 滚轮缩放</div>' +
      '  </div>' +
      '  <div class="c3d-controls">' +
      '  <div class="char-edit-tabs"><button class="char-tab on">3D 人物</button></div>' +
      '  <div class="char-edit-hint">' + roomName(room) + ' · ' +
      (dbg.bones || 0) + ' 根骨骼</div>' +

      '  <div class="c3d-label">大小</div>' +
      '  <div class="char-edit-size">' +
      '    <input type="range" min="6" max="40" step="1" value="' + size +
      '      oninput="homeChar3DResize(this.value)">' +
      '    <span id="c3dSizeVal">' + size + '</span>' +
      '  </div>' +
      '  <div class="c3d-info" id="c3dHeight">' + heightText(dbg) + '</div>' +

      '  <div class="c3d-label">发型</div>' +
      '  <div class="c3d-style-row" id="c3dStyles">' +
      '    <button class="c3d-style' + (curStyle !== 'ponytail' ? ' on' : '') + '" data-style="orig" onclick="homeChar3DStyle(this)">长发</button>' +
      '    <button class="c3d-style' + (curStyle === 'ponytail' ? ' on' : '') + '" data-style="ponytail" onclick="homeChar3DStyle(this)">双马尾</button>' +
      '  </div>' +

      '  <div class="c3d-label">发色</div>' +
      '  <div class="c3d-swatch-row">' + swatchRow('hair', HAIR_COLORS, curHair) + '</div>' +

      '  <div class="c3d-label">上衣</div>' +
      '  <div class="c3d-swatch-row">' + swatchRow('top', OUTFIT_COLORS, curOutfit.top) + '</div>' +

      '  <div class="c3d-label">裙子</div>' +
      '  <div class="c3d-swatch-row">' + swatchRow('skirt', OUTFIT_COLORS, curOutfit.skirt) + '</div>' +

      '  <div class="c3d-label">鞋子</div>' +
      '  <div class="c3d-swatch-row">' + swatchRow('boots', OUTFIT_COLORS, curOutfit.boots) + '</div>' +

      '  <div class="c3d-label">朝向</div>' +
      '  <div class="char-edit-size">' +
      '    <input type="range" min="-180" max="180" step="5" value="' + yaw +
      '      oninput="homeChar3DYaw(this.value)">' +
      '    <span id="c3dYawVal">' + yaw + ' 度</span>' +
      '  </div>' +
      '  </div>' +
      '  </div>' +
      '</div>';

    el.style.display = 'flex';
    startPreview();
  }

  function closeHomeCharEdit3D() {
    var el = $('homeCharEdit');
    if (el) el.style.display = 'none';
    stopPreview();
  }

  // ------------------------------------------------------------
  // 3D 预览（独立小场景）
  // ------------------------------------------------------------
  //
  // 预览用的是 SkeletonUtils.clone，不是 model.clone() ——
  // 普通 clone 两份模型共用同一副骨骼，改一份两边都动。
  // 姿势从房间里那份每帧拷过来，所以预览和实际看到的一致。
  var preview = {
    renderer: null, scene: null, camera: null,
    bonesSrc: null, bonesDst: null, raf: 0, built: false
  };

  function buildPreview() {
    var g = girl();
    if (!g || typeof g.model !== 'function' || !g.model()) {
      console.warn('[home/character-3d-editor] buildPreview 跳过：girl adapter 没有可用的 model()',
        g ? 'model 类型=' + typeof g.model : 'girl 未注册');
      return false;
    }
    var THREE = window.THREE;
    if (!THREE || !window.SkeletonUtils) {
      console.warn('[home/character-3d-editor] buildPreview 跳过：THREE=' + !!THREE +
        ' SkeletonUtils=' + !!window.SkeletonUtils);
      return false;
    }

    var srcModel = g.model();
    // 万一重建过预览，先把旧 clone 的注册摘掉，别对脱离场景的副本白费功夫
    if (preview.clone && typeof g.unregisterHairRoot === 'function') g.unregisterHairRoot(preview.clone);
    var clone = window.SkeletonUtils.clone(srcModel);
    preview.clone = clone;
    // 注册进 girl adapter：预览是独立 clone，发型显隐/双马尾不会自动同步，
    // 不注册的话点了"双马尾"只有房间那份换、面板预览纹丝不动
    if (typeof g.registerHairRoot === 'function') g.registerHairRoot(clone);

    // 两份模型的骨骼按遍历顺序一一对应
    var bonesSrc = [], bonesDst = [];
    srcModel.traverse(function (o) { if (o.isBone) bonesSrc.push(o); });
    clone.traverse(function (o) { if (o.isBone) bonesDst.push(o); });

    // 归一化：缩到 1.7 单位高、脚底贴 y=0
    var holder = new THREE.Group();
    holder.add(clone);
    var bbox = g.bbox ? g.bbox() : null;
    var h = bbox && bbox.size ? bbox.size.y : 158;
    var k = 1.7 / h;
    holder.scale.setScalar(k);
    if (bbox && bbox.min) {
      holder.position.set(
        -(bbox.min.x + bbox.max.x) / 2 * k,
        -bbox.min.y * k,
        -(bbox.min.z + bbox.max.z) / 2 * k
      );
    }

    var scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    var key = new THREE.DirectionalLight(0xfff2e0, 1.6);
    key.position.set(2, 4, 3);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xdfe8ff, 0.5);
    fill.position.set(-3, 2, -2);
    scene.add(fill);
    scene.add(holder);

    // 脚下一块圆盘，给个落地感
    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8d2c8, transparent: true, opacity: 0.6 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.001;
    scene.add(disc);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(260, 380);

    // 相机：平视偏俯，人物占满画面
    var camera = new THREE.PerspectiveCamera(32, 260 / 380, 0.01, 50);
    camera.position.set(0, 1.2, 3.6);
    camera.lookAt(0, 1.12, 0);

    preview.renderer = renderer;
    preview.scene = scene;
    preview.camera = camera;
    preview.bonesSrc = bonesSrc;
    preview.bonesDst = bonesDst;
    preview.built = true;
    // 暴露到 window：调试预览用（控制台里 _c3dPreview.scene 可以直接查）
    global._c3dPreview = preview;

    // 可以拖动转视角
    if (window.OrbitControls) {
      var controls = new window.OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0.95, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.minDistance = 0.6;
      controls.maxDistance = 8;
      controls.maxPolarAngle = Math.PI * 0.55;   // 不让转到脚底下
      controls.update();
      preview.controls = controls;
    }
    return true;
  }

  function startPreview() {
    var host = $('c3dPreview');
    if (!host) return;
    if (!preview.built && !buildPreview()) return;
    host.innerHTML = '';
    host.appendChild(preview.renderer.domElement);
    if (preview.raf) return;   // 已经在跑了
    var loop = function () {
      preview.raf = requestAnimationFrame(loop);
      // 每帧把骨骼姿势从场景里那份拷到预览这份
      for (var i = 0; i < preview.bonesSrc.length; i++) {
        preview.bonesDst[i].quaternion.copy(preview.bonesSrc[i].quaternion);
        preview.bonesDst[i].position.copy(preview.bonesSrc[i].position);
      }
      // OrbitControls 有阻尼，得每帧 update
      if (preview.controls) preview.controls.update();
      preview.renderer.render(preview.scene, preview.camera);
    };
    preview.raf = requestAnimationFrame(loop);
  }

  function stopPreview() {
    if (preview.raf) cancelAnimationFrame(preview.raf);
    preview.raf = 0;
  }

  /** 改大小。写进 state.home.mySize，2D/3D 共用这个值。 */
  function homeChar3DResize(v) {
    v = Math.max(6, Math.min(40, parseInt(v, 10) || 11));
    // 先 clamp 再存，然后 saveState 落盘
    // 人物那边靠 slot().setConfig 重新算缩放，不直接碰 state
    if (global.HomeAvatar && typeof HomeAvatar.setSize === 'function') {
      HomeAvatar.setSize(v);
    } else if (state && state.home) {
      state.home.mySize = v;
      if (typeof saveState === 'function') saveState();
    }
    if (slot()) slot().setConfig({ mySize: v });

    var lab = $('c3dSizeVal');
    if (lab) lab.textContent = String(v);
    var info = $('c3dHeight');
    if (info && girl()) info.textContent = heightText(girl().debug());
  }

  function homeChar3DPose(btn) {
    var pose = btn && btn.getAttribute ? btn.getAttribute('data-pose') : btn;
    if (!pose || !slot()) return;
    slot().setPose(pose, { moving: false });
    var grid = $('c3dPoses');
    if (grid) {
      Array.prototype.forEach.call(grid.querySelectorAll('.c3d-pose'), function (b) {
        b.classList.toggle('on', b.getAttribute('data-pose') === pose);
      });
    }
  }

  function homeChar3DYaw(v) {
    var deg = parseFloat(v) || 0;
    if (slot()) slot().setConfig({ yaw: deg * Math.PI / 180 });
    var lab = $('c3dYawVal');
    if (lab) lab.textContent = Math.round(deg) + ' 度';
  }

  function heightText(d) {
    if (!d) return '身高未知';
    // debug() 给的是 height（房间单位）和 mySize；老字段是 roomHeight / heightM。
    // 两套都认，否则面板一直显示"身高未知"。
    var h = d.roomHeight != null ? d.roomHeight : d.height;
    if (h == null) return '身高未知';
    var m = d.heightM != null ? d.heightM : (d.mySize != null ? (1.66 * d.mySize / 11) : null);
    return '身高 ' + h.toFixed(2) + ' 房间单位' + (m != null ? ' 约 ' + m.toFixed(2) + ' m' : '');
  }

  // 发色板：value 是 hex，空字符串 = 不改（跟随贴图原色）
  var HAIR_COLORS = [
    { value: '',        label: '原色' },
    { value: '#3a3230', label: '墨黑' },
    { value: '#7a4a2b', label: '深棕' },
    { value: '#d9b26a', label: '亚麻' },
    { value: '#e8e4de', label: '银白' },
    { value: '#d97a8c', label: '樱粉' },
    { value: '#c94f3d', label: '砖红' },
    { value: '#5a7fd9', label: '雾蓝' },
    { value: '#9a6fd0', label: '薰衣草' },
    { value: '#6fae7f', label: '苔绿' }
  ];

  // 服装色板
  var OUTFIT_COLORS = [
    { value: '',        label: '原色' },
    { value: '#f2f2f2', label: '白' },
    { value: '#3a3a3a', label: '黑' },
    { value: '#9a9a9a', label: '灰' },
    { value: '#d94f4f', label: '红' },
    { value: '#f2a7bd', label: '粉' },
    { value: '#f08c3c', label: '橙' },
    { value: '#f2d54f', label: '黄' },
    { value: '#7fc98f', label: '绿' },
    { value: '#5a9fd9', label: '蓝' },
    { value: '#9a6fd0', label: '紫' },
    { value: '#8a5a2b', label: '棕' }
  ];

  // 生成一排色块按钮。slot 是 'hair' / 'top' / 'skirt' / 'boots'
  function swatchRow(slot, colors, cur) {
    return colors.map(function (c) {
      return '<button class="c3d-sw' + (c.value === cur ? ' on' : '') +
        '" data-slot="' + slot + '" data-color="' + c.value + '" title="' + c.label + '"' +
        ' style="background:' + (c.value || 'linear-gradient(135deg,#f7f7f7,#cfcfcf)') + '"' +
        ' onclick="homeChar3DSwatch(this)"></button>';
    }).join('');
  }

  function homeChar3DStyle(btn) {
    var style = btn.getAttribute('data-style');
    if (state && state.home) {
      state.home.hairStyle = style;
      if (typeof saveState === 'function') saveState();
    }
    var g = girl();
    if (g && typeof g.setHairStyle === 'function') g.setHairStyle(style);
    var row = $('c3dStyles');
    if (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.c3d-style'), function (b) {
        b.classList.toggle('on', b === btn);
      });
    }
  }

  function homeChar3DSwatch(btn) {
    var slotName = btn.getAttribute('data-slot');
    var v = btn.getAttribute('data-color') || '';
    var g = girl();
    if (slotName === 'hair') {
      if (state && state.home) {
        state.home.hairColor = v;
        if (typeof saveState === 'function') saveState();
      }
      if (g) {
        if (typeof g.setHairColor === 'function') g.setHairColor(v);
        else if (slot()) slot().setConfig({ hairColor: v });
      }
    } else {
      if (state && state.home) {
        if (!state.home.outfit || typeof state.home.outfit !== 'object') state.home.outfit = {};
        state.home.outfit[slotName] = v;
        if (typeof saveState === 'function') saveState();
      }
      if (g && typeof g.setSlotColor === 'function') g.setSlotColor(slotName, v);
      else if (slot()) slot().setConfig({ outfit: (state.home && state.home.outfit) || {} });
    }
    // 高亮当前选中的那个
    var row = btn.parentNode;
    if (row) {
      Array.prototype.forEach.call(row.querySelectorAll('.c3d-sw'), function (b) {
        b.classList.toggle('on', b === btn);
      });
    }
  }

  function roomName(roomId) {
    var map = { bedroom: '卧室', smallkitchen: '小厨房' };
    return map[roomId] || '3D 房间';
  }

  global.openHomeCharEdit3D = openHomeCharEdit3D;
  global.closeHomeCharEdit3D = closeHomeCharEdit3D;
  global.homeChar3DResize = homeChar3DResize;
  global.homeChar3DPose = homeChar3DPose;
  global.homeChar3DYaw = homeChar3DYaw;
  global.homeChar3DSwatch = homeChar3DSwatch;
  global.homeChar3DStyle = homeChar3DStyle;
})(window);