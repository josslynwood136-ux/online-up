/* ============================================================
 * js/home/character-3d.js — 家园 · 3D 人物插槽（支持多角色）
 * ============================================================
 *
 * 3D 房间（卧室 / 小厨房）专用的人物模块。**插槽**：只定义契约，
 * 不关心模型长什么样。当前的实现见 character-3d-girl.js（卡通女孩 GLB）
 * 和 character-3d-ghost.js（Ghost 西蒙·莱利）。
 *
 * 与 2D 人物完全分离
 * ------------------
 * 2D 房间（客厅 / 浴室 / 庭院）的人物是 DOM 覆盖层，见 character-2d.js。
 * 那边的数据是 state.home.char / mySize / rooms[*].personPos，纯百分比坐标。
 *
 * 这边是 WebGL 网格，数据是各自场景里的 THREE.Object3D，世界坐标。
 * 两边不共享任何代码，只通过下面的接口和房间层对话 ——
 * 所以你可以让 3D 房间用带骨骼的模型、3D 房间有独立动画，
 * 而 2D 房间继续用静态图，两者互不影响。
 *
 * 要实现一个 3D 人物，需要提供这 5 个方法：
 *
 *   mount(opts)
 *     把人物加进场景。opts = { THREE, scene, roomId }
 *     roomId 是 'bedroom' 或 'smallkitchen'，用来决定站位换算和默认朝向。
 *     必须是异步的（模型要下载）；返回 Promise。
 *
 *   setPosition(world)
 *     移动人物。world = { x, y, z }，THREE 世界坐标。
 *
 *   setPose(pose, opts)
 *     切姿势。pose ∈ 'stand' | 'walk' | 'sit' | 'sleep' | 'wave' | 'crouch'
 *     （和 character-2d.js 的 home-pose-* 类同一套取值，两边语义对齐）。
 *     opts = { moving, time, dt }，moving=true 表示正在位移。
 *
 *   setConfig(config)
 *     换外观。config = { height, glasses, hat, ... }，形态由你的模型决定。
 *
 *   dispose()
 *     从场景里摘掉并释放。切房间 / 退出家园时会被调用。
 *
 * 注意事项（以前踩过的坑）
 * ------------------------
 * 带骨骼的模型，geometry / material 是跨实例共享的。
 * 切房间重建时绝不能 dispose 掉它们，否则整个模型会废掉。
 * 只从场景 remove，不要 traverse + dispose。
 * ============================================================ */
(function (global) {
  'use strict';

  // 所有注册的角色
  var adapters = {};
  var currentAdapterId = null;
  var selectedId = null;   // 当前选中的角色（点地板只走这个）

  var Character3D = {

    /**
     * 注册一个 3D 人物实现。
     * @param {string} id 角色唯一标识，如 'girl'、'ghost'
     * @param {object} impl 需实现 mount / setPosition / setPose / setConfig / dispose
     */
    register: function (id, impl) {
      if (!impl || typeof impl.mount !== 'function') {
        console.warn('[home/character-3d] register 需要一个带 mount() 的对象');
        return false;
      }
      ['setPosition', 'setPose', 'setConfig', 'dispose'].forEach(function (key) {
        if (typeof impl[key] !== 'function') {
          console.warn('[home/character-3d] 缺少方法：' + key + '，已补 no-op');
          impl[key] = function () {};
        }
      });
      adapters[id] = impl;
      // 第一个注册的设为默认
      if (!currentAdapterId) currentAdapterId = id;
      // 第一个注册的也设为默认选中
      if (!selectedId) selectedId = id;
      return true;
    },

    /** 切换到指定角色 */
    switchTo: function (id) {
      if (!adapters[id]) {
        console.warn('[home/character-3d] 角色不存在：' + id);
        return false;
      }
      // 先卸载当前角色
      if (currentAdapterId && adapters[currentAdapterId]) {
        try { adapters[currentAdapterId].dispose(); } catch (e) { }
      }
      currentAdapterId = id;
      return true;
    },

    /** 获取当前角色 ID */
    getCurrentId: function () {
      return currentAdapterId;
    },

    /** 获取所有已注册的角色 */
    getRoles: function () {
      return Object.keys(adapters);
    },

    /** 是否已经有可用的人物模型了。房间层用它决定要不要显示 2D 兜底形象。 */
    has: function () {
      return !!currentAdapterId;
    },

    /** 取当前站位，房间层在算好世界坐标后调用。 */
    getPosition: function () {
      return { x: 0, y: 0, z: 0 };
    },

    /* ---- 以下都是薄封装，没注册 adapter 时静默降级，不抛错 ---- */

    // 同住偏移：ghost 站在 girl 右边 0.9、前 0.2，避免重叠
    _coupleOffset: { x: 0.9, z: 0.2 },

    mount: function (opts) {
      var ids = Object.keys(adapters);
      if (!ids.length) return Promise.resolve(false);
      var self = this;
      var tasks = ids.map(function (id) {
        try { return Promise.resolve(adapters[id].mount(opts)); }
        catch (e) { console.warn('[home/character-3d] mount 失败：' + id, e); return Promise.resolve(false); }
      });
      return Promise.all(tasks).then(function (results) {
        var okAny = results.some(function (r) { return !!r; });
        if (okAny) {
          console.info('[home/character-3d] 已挂载到房间：' + (opts && opts.roomId) + '，角色：' + ids.join('+'));
          // 确保选中指示环存在
          try { self._ensureSelectionRing(opts && opts.scene); } catch (e) { console.warn('[home/character-3d] 选中环创建失败', e); }
          // 同住站位：girl 保持默认，ghost 往旁边挪一下
          try {
            if (adapters.girl && adapters.ghost && typeof adapters.ghost.setPosition === 'function') {
              var gp = adapters.girl.getPosition ? null : null;
              // 直接在 ghost 当前位置上加偏移，避免两个模型叠在一起
              var gd = adapters.ghost.debug ? adapters.ghost.debug() : null;
              if (gd && gd.pos) {
                adapters.ghost.setPosition({ x: gd.pos[0] + self._coupleOffset.x, z: gd.pos[2] + self._coupleOffset.z });
              }
            }
          } catch (e) { console.warn('[home/character-3d] 同住偏移失败', e); }
        }
        return okAny;
      });
    },

    /** 当前选中的角色 ID（点角色切换，点地板只走选中的） */
    getSelectedId: function () {
      return selectedId;
    },

    /** 选中某个角色 */
    selectCharacter: function (id) {
      if (!adapters[id]) {
        console.warn('[home/character-3d] 角色不存在：' + id);
        return false;
      }
      selectedId = id;
      this._updateRingPos();
      return true;
    },

    /** 选中指示环（脚下光圈） */
    _selectionRing: null,
    _ringRaf: 0,
    _ensureSelectionRing: function (scene) {
      if (this._selectionRing) return this._selectionRing;
      var THREE = global.THREE;
      if (!THREE || !scene) return null;
      var geo = new THREE.RingGeometry(0.35, 0.45, 32);
      var mat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      var ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = -Math.PI / 2;
      ring.renderOrder = 999;
      scene.add(ring);
      this._selectionRing = ring;
      this._startRingLoop();
      return ring;
    },

    _startRingLoop: function () {
      if (this._ringRaf) return;
      var self = this;
      var loop = function () {
        self._ringRaf = requestAnimationFrame(loop);
        self._updateRingPos();
      };
      this._ringRaf = requestAnimationFrame(loop);
    },

    _updateRingPos: function () {
      var ring = this._selectionRing;
      if (!ring) return;
      var id = selectedId;
      if (!id || !adapters[id]) { ring.visible = false; return; }
      var rad = adapters[id];
      if (!rad || !rad.root) { ring.visible = false; return; }
      var root = rad.root();
      if (!root || !root.parent) { ring.visible = false; return; }
      // 取角色脚下位置：root.position 就是脚下
      ring.position.set(root.position.x, root.position.y + 0.02, root.position.z);
      ring.visible = true;
    },

    setPosition: function (world) {
      var self = this;
      // 只移动选中的角色
      var id = selectedId;
      if (!id || !adapters[id]) return;
      var w = world;
      try { adapters[id].setPosition(w); } catch (e) {}
    },

    /** 走过去（位移 + 走路动画）。adapter 没有 moveTo 就退回 setPosition。 */
    moveTo: function (world) {
      var self = this;
      // 只移动选中的角色
      var id = selectedId;
      if (!id || !adapters[id]) return;
      var w = world;
      try {
        var adapter = adapters[id];
        if (typeof adapter.moveTo === 'function') adapter.moveTo(w);
        else if (typeof adapter.setPosition === 'function') adapter.setPosition(w);
      } catch (e) {}
    },

    setPose: function (pose, opts) {
      Object.keys(adapters).forEach(function (id) {
        try { adapters[id].setPose(pose, opts || {}); } catch (e) {}
      });
    },

    setConfig: function (config) {
      Object.keys(adapters).forEach(function (id) {
        try { adapters[id].setConfig(config || {}); } catch (e) {}
      });
    },

    dispose: function () {
      Object.keys(adapters).forEach(function (id) {
        try { adapters[id].dispose(); } catch (e) { console.warn('[home/character-3d] dispose 失败：' + id, e); }
      });
    }
  };

  global.HomeCharacter3D = Character3D;
})(typeof window !== 'undefined' ? window : this);
