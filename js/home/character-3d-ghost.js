/* ============================================================
 * js/home/character-3d-ghost.js — 家园 3D 人物：Ghost（西蒙·莱利）
 * ============================================================
 *
 * 接在 character-3d.js 那个插槽上。房间层只认 mount / setPosition /
 * setPose / setConfig / dispose 这五个方法。
 *
 * 模型
 * ----
 * ghost-udt.glb
 *   使命召唤 MW2 官方 Ghost（Simon Riley）UDT 造型，
 *   由原版 Source 引擎包（.mdl）经 Blender + SourceIO 直接转换：
 *   ValveBiped 标准骨架 132 骨，网格 13 件，贴图 jpg（≤1024）。
 *   游戏内容版权归动视，仅限个人学习使用。
 *
 * 注意
 * ----
 *   * 必须走 http。file:// 下 fetch .glb 会被 CORS 挡掉。
 *   * 无姿势系统：人物保持模型原生姿态，setPose 只记录状态。
 * ============================================================ */
(function (global) {
  'use strict';

  var MODEL_URL = 'js/home/ghost-udt.glb?v=20261009f';

  // 模块内状态
  var cached = null;
  var loading = null;
  var live = null;
  var currentPose = 'stand';
  var warnedConfig = false;

  function say(state, text) {
    try {
      global.dispatchEvent(new CustomEvent('home:character', {
        detail: { state: state, text: text }
      }));
    } catch (e) { }
    if (state === 'error') console.warn('[home/character-3d-ghost] ' + text);
  }

  // ------------------------------------------------------------
  // 加载 + 归一化
  // ------------------------------------------------------------

  function loadModel(THREE) {
    if (cached) return Promise.resolve(cached);
    if (loading) return loading;
    if (!global.GLTFLoader) {
      return Promise.reject(new Error('GLTFLoader 没加载'));
    }

    say('loading', '正在加载 Ghost 模型…');
    loading = new Promise(function (resolve, reject) {
      new global.GLTFLoader().load(MODEL_URL, function (gltf) {
        try {
          cached = prepare(THREE, gltf);
          loading = null;
          resolve(cached);
        } catch (e) {
          loading = null;
          reject(e);
        }
      }, undefined, function (err) {
        loading = null;
        var msg = (err && err.message) ? err.message : String(err);
        if (global.location && global.location.protocol === 'file:') {
          msg = '浏览器不允许 file:// 直接读 .glb。请用本地服务器打开。';
        }
        reject(new Error(msg));
      });
    });
    return loading;
  }

  function prepare(THREE, gltf) {
    var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!model) throw new Error('GLB 里没有 scene');

    // 量原始包围盒
    model.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) throw new Error('GLB 几何体是空的');
    var size = new THREE.Vector3();
    var mid = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(mid);
    var rawHeight = Math.max(1e-4, size.y);

    // 四层结构：place → holder → turn → model
    var place = new THREE.Group();
    place.name = 'home-character-place';
    var holder = new THREE.Group();
    var turn = new THREE.Group();
    place.add(holder);
    holder.name = 'home-character';
    holder.scale.setScalar(1);
    holder.position.set(0, 0, 0);
    holder.add(turn);
    turn.add(model);
    place.updateWorldMatrix(true, true);

    // 收集骨骼。
    // GLB 里的名字带点（ValveBiped.Bip01_Pelvis），AnimationMixer 的轨道名
    // 是按 “节点名.属性” 解析的，名字里有点会解析错 —— 加载时先把点去掉。
    var bones = {};
    model.traverse(function (o) {
      if (!o.isBone || !o.name) return;
      o.name = o.name.replace(/\./g, '');
      if (bones[o.name]) return;
      bones[o.name] = o;
    });

    // 网格设置
    model.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = false;
      o.frustumCulled = false;
    });

    return {
      THREE: THREE,
      place: place,
      holder: holder,
      turn: turn,
      model: model,
      bones: bones,
      rawHeight: rawHeight,
      bbox: { min: box.min.clone(), max: box.max.clone(), size: size.clone() },
      bboxCenter: mid.clone()
    };
  }

  // ------------------------------------------------------------
  // 适配层
  // ------------------------------------------------------------

  var adapter = {
    currentPose: function () { return currentPose; },
    currentYaw: function () {
      return live ? live.turn.rotation.y : 0;
    },
    currentSize: function () { return 11; },

    mount: function (opts) {
      opts = opts || {};
      var THREE = opts.THREE || global.THREE;
      var scene = opts.scene;
      if (!THREE || !scene) return Promise.resolve(false);

      if (live && live.scene === scene && live.place.parent) {
        return Promise.resolve(true);
      }
      if (live) adapter.dispose();

      var roomId = opts.roomId;
      if (roomId) activeRoomId = roomId;
      return loadModel(THREE).then(function (m) {
        if (!scene) return false;

        scene.add(m.place);
        // 缩放：Ghost 要比女孩高一头，基准从 1.7 加到 2.0
        var roomScale = roomId === 'smallkitchen' ? 2.0 : 2.3;
        m.holder.scale.setScalar((2.0 * roomScale) / m.rawHeight);
        m.turn.rotation.y = -0.42;
        // 默认站位
        var dp = roomId === 'smallkitchen' ? { x: 2.0, z: 1.5 } : { x: 1.6, z: 1.8 };
        m.place.position.set(dp.x, 0, dp.z);

        live = { scene: scene, place: m.place, holder: m.holder, turn: m.turn, model: m.model };
        currentPose = 'stand';
        say('ready', '');

        console.info('[home/character-3d-ghost] 已挂载到 ' + (roomId || '?') +
          '：' + Math.round(m.bbox.size.y) + ' 模型单位');
        return true;
      }).catch(function (e) {
        say('error', e && e.message ? e.message : String(e));
        return false;
      });
    },

    setPosition: function (world) {
      if (!live || !world) return;
      if (world.x != null) live.place.position.x = world.x;
      if (world.y != null) live.place.position.y = world.y;
      if (world.z != null) live.place.position.z = world.z;
      live.place.updateWorldMatrix(true, true);
    },

    setPose: function (pose) {
      if (pose) currentPose = pose;
    },

    setConfig: function (config) {
      config = config || {};
      if (!live) return;
      if (config.yaw != null && isFinite(Number(config.yaw))) {
        live.turn.rotation.y = Number(config.yaw);
        live.place.updateWorldMatrix(true, true);
      }
    },

    dispose: function () {
      if (live && live.place.parent) live.place.parent.remove(live.place);
      live = null;
      currentPose = 'stand';
    },

    root: function () { return cached ? cached.place : null; },
    tick: function () { },
    debug: function () {
      if (!cached) return null;
      return {
        bones: Object.keys(cached.bones).length,
        height: cached.bbox.size.y,
        pos: live ? [live.place.position.x, live.place.position.y, live.place.position.z] : null
      };
    },

    debugBones: function () {
      if (!cached) return [];
      return Object.keys(cached.bones).map(function (n) {
        return { name: n };
      });
    },

    debugTree: function () {
      if (!live) return null;
      var lines = [];
      (function walk(node, depth) {
        if (depth > 3) return;
        lines.push('  '.repeat(depth) + node.name + ' [' + node.type + ']');
        for (var i = 0; i < node.children.length; i++) walk(node.children[i], depth + 1);
      })(live.place, 0);
      return lines.join('\n');
    }
  };

  // 当前房间 ID
  var activeRoomId = null;

  // 注册到 character-3d.js 的插槽
  if (global.HomeCharacter3D) {
    global.HomeCharacter3D.register('ghost', adapter);
  } else {
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (global.HomeCharacter3D) {
        clearInterval(timer);
        global.HomeCharacter3D.register('ghost', adapter);
      } else if (tries > 100) {
        clearInterval(timer);
        console.warn('[home/character-3d-ghost] 等不到 character-3d.js');
      }
    }, 60);
  }

  global.HomeCharacter3DGhost = adapter;
})(typeof window !== 'undefined' ? window : this);
