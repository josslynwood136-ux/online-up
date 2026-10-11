/* ============================================================
 * js/home/room-view-3d.js — 家园 · 3D 房间的结果呈现
 * ============================================================
 *
 * 3D 房间（卧室 / 小厨房）的家具互动结果怎么显示。
 *
 * 和 2D 房间的根本差别
 * --------------------
 * 2D 房间的家具在 DOM 里，f.x/f.y 就是百分比，直接拿来定位泡泡和结果就行。
 * 3D 房间的家具是 WebGL 网格，raycaster 返回的是**世界坐标**，
 * 要显示 DOM 泡泡必须先投影到屏幕像素。这件事本文件负责。
 *
 * 场景尚未就绪时（WebGL 上下文还在建、模型还在下载），
 * 动作泡泡退化成房间中央固定位置 —— 不能因为拿不到投影就不给反馈。
 *
 * 卧室和小厨房的场景在 rooms-3d/{bedroom,kitchen}-scene.js，
 * 两者都通过下面这组钩子把"世界坐标 -> 屏幕像素"的换算交进来，
 * 调用方式完全一致（各自在场景就绪时 setProjector，销毁时 clearProjector）。
 * ============================================================ */
(function (global) {
  'use strict';

  // 各房间的场景投影函数。由场景代码在初始化完成时注册进来。
  var projector = null;

  function roomEl() {
    return document.querySelector('.home-room');
  }

  var Home3DRoom = {

    /**
     * 注册"世界坐标 -> 屏幕像素"的换算。
     * @param {(world:{x:number,y:number,z:number}) => {x:number,y:number}} fn
     *        返回相对房间容器的像素坐标
     * @param {object} [handle] 场景句柄，disposeActions 时会调它的 release()
     */
    setProjector: function (fn, handle) {
      projector = fn ? { fn: fn, handle: handle || null } : null;
    },

    /** 场景销毁时调用，避免拿着已经 dispose 的 THREE 对象去投影。 */
    clearProjector: function () {
      projector = null;
    },

    hasProjector: function () {
      return !!projector;
    },

    /**
     * 把世界坐标投到房间容器的像素坐标。
     * 投影不可用时返回 null，由调用方决定退化行为。
     */
    project: function (world) {
      if (!projector || !world) return null;
      try {
        return projector.fn(world);
      } catch (e) {
        // 场景可能刚好在 dispose，投影拿不到就当没有
        return null;
      }
    },

    /**
     * 在 3D 家具旁边摆动作泡泡。
     * @param {object} f     家具对象（state 里的，只有 id/name/actions 有用）
     * @param {{x:number,y:number,z:number}} [world] raycaster 命中的世界坐标
     */
    showActions: function (f, world) {
      var acts = f.actions || [];
      if (!acts.length) return;
      var host = roomEl();
      if (!host) return;
      Home3DRoom.closeActions();

      var at = Home3DRoom.project(world);
      // 投影拿不到就摆中间，保证点家具一定有反馈
      var baseX = at ? at.x : host.clientWidth / 2;
      var baseY = at ? at.y : host.clientHeight / 2;

      acts.forEach(function (a, i) {
        var bub = document.createElement('div');
        bub.className = 'bath-bubble home-bubble-3d';
        bub.innerText = a.label;
        // 像素定位，不再用百分比
        var offset = (i - (acts.length - 1) / 2) * 76;
        bub.style.left = (baseX + offset) + 'px';
        bub.style.top = (baseY - 46) + 'px';
        bub.dataset.fid = f.id;
        bub.dataset.idx = i;
        // 把世界坐标挂在泡泡上：doFurnitureAction 之后还要用它定位结果文字
        if (world) bub.__world = world;
        host.appendChild(bub);
        setTimeout(function () { bub.classList.add('show'); }, i * 60);
      });

      // 和 room-view-2d.js **共用** global._homeBubbleTimer，别拆成私有。
      // 上面 showActions 开头那句 closeActions 预清理，之所以能顺带取消掉
      // 旧房间（2D）挂着的倒计时，靠的就是两边写同一个槽。各存各的会留下
      // 一个没人管的孤儿倒计时，到点按 .bath-bubble 满页面删，会把这里刚
      // 摆出来的泡泡一起删掉。完整说明见 room-view-2d.js 的同名注释。
      global._homeBubbleTimer = setTimeout(function () {
        Home3DRoom.closeActions();
      }, 5000);
    },

    closeActions: function () {
      if (global._homeBubbleTimer) {
        clearTimeout(global._homeBubbleTimer);
        global._homeBubbleTimer = null;
      }
      document.querySelectorAll('.bath-bubble').forEach(function (b) { b.remove(); });
    },

    /**
     * 结果文字浮在泡泡位置（世界坐标没变就重新投一次）。
     * @param {{left:string,top:string}} [atPx] 泡泡的像素位置
     */
    showResult: function (f, text, world, atPx) {
      var host = roomEl();
      if (!host) return;
      var old = host.querySelector('.home-panel-result');
      if (old) old.remove();

      var at = atPx || Home3DRoom.project(world);
      var res = document.createElement('div');
      res.className = 'home-panel-result';
      res.innerText = text;
      if (at) {
        res.style.left = at.x + 'px';
        res.style.top = (at.y - 34) + 'px';
        // 像素定位时不再用 CSS 的 translate(-50%)，否则会偏
        res.style.transform = 'translateX(-50%)';
      } else {
        res.style.left = '50%';
        res.style.top = '40%';
        res.style.transform = 'translateX(-50%)';
      }
      host.appendChild(res);
      setTimeout(function () { if (res.parentNode) res.remove(); }, 3000);
    },

    /**
     * 让 3D 人物摆姿势。走 character-3d.js 插槽。
     * 插槽为空（还没接模型）时静默忽略 —— 3D 房间里本来就没有 2D 兜底。
     */
    setPose: function (f, act) {
      if (!global.HomeCharacter3D) return;
      var pose = global.poseForFurnitureAction
        ? global.poseForFurnitureAction(f, act)
        : 'stand';
      HomeCharacter3D.setPose(pose, { moving: false });
    },

    /**
     * 从上往下打一条射线，找 (x,z) 处真正的"可站表面"高度。
     *
     * 不能直接用 y=0：卧室地板顶面在 y=0，但地毯是浮在地板上的
     * （卧室地毯顶面 ≈0.11，厨房木地板顶面 = 0.14）。写死 0 人会陷进去。
     *
     * 只认朝上的面（法线 y > 0.5），否则会打到墙面、柜子侧板。
     * 多个朝上面时贴着**最低那层**挑，而不是取第一个 ——
     * 第一个可能是灶台面 / 台面，人站上去就悬空了。
     * 允许高出最低面 0.5 以内，这样地毯、蒲团这种有厚度的会站上去。
     *
     * @param {object} scene 场景（人物不在这里面，会被排除）
     * @returns {number} 可站高度，取不到就返回 0
     */
    floorYAt: function (scene, x, z) {
      if (!scene || !global.THREE) return 0;
      var THREE = global.THREE;
      if (!Home3DRoom._ray) Home3DRoom._ray = new THREE.Raycaster();
      var ray = Home3DRoom._ray;
      ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
      var hits;
      try {
        hits = ray.intersectObjects(scene.children, true);
      } catch (e) {
        return 0;
      }
      var up = [];
      for (var i = 0; i < hits.length; i++) {
        var ob = hits[i].object;
        // 人物自己会挡住射线（她 3.3 单位高，从 y=30 打下来先打中她），必须排除
        if (global.HomeCharacter3D && global.HomeCharacter3DGirl) {
          var holder = global.HomeCharacter3DGirl.root && global.HomeCharacter3DGirl.root();
          if (holder && isUnder(ob, holder)) continue;
        }
        if (!hits[i].face) continue;
        var n = hits[i].face.normal.clone().transformDirection(ob.matrixWorld);
        if (n.y > 0.5) up.push(hits[i].point.y);
      }
      if (!up.length) return 0;
      var lo = Math.min.apply(null, up);
      for (var j = 0; j < up.length; j++) {
        if (up[j] <= lo + 0.5) return up[j];
      }
      return lo;
    },

    /**
     * 判断一次射线命中是不是"人能站上去的地面"。
     *
     * 判定：命中面朝上，且离该处的地面高度差不多（< 0.5）。
     * 这样点床、点灶台、点台面都不会让人物跳上去 ——
     * 它们是朝上的面，但离地面很远。
     *
     * @param {{point:{x,y,z},face?:object}} hit 射线命中
     * @param {object} scene 场景，用来反查地面高度
     */
    isFloorHit: function (hit, scene) {
      if (!hit || !hit.face || !hit.point) return false;
      var n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (n.y <= 0.5) return false;               // 墙面 / 侧板
      var floorY = Home3DRoom.floorYAt(scene, hit.point.x, hit.point.z);
      return Math.abs(hit.point.y - floorY) < 0.5;
    },

    /** 把人物移到某个世界坐标（点地面时用）。 */
    moveCharacterTo: function (world) {
      if (!world || !global.HomeCharacter3D) return;
      var w = {
        x: world.x,
        // y 用调用方给的命中高度。写死 0 会让人陷进地毯 / 木地板。
        y: world.y != null ? world.y : 0,
        z: world.z
      };
      // 有 moveTo（会走过去 + 摆走路）就走；老的 adapter 没有的话退回 setPosition。
      if (typeof global.HomeCharacter3D.moveTo === 'function') {
        global.HomeCharacter3D.moveTo(w);
      } else {
        HomeCharacter3D.setPosition(w);
      }
    }
  };

  Home3DRoom._ray = null;

  function isUnder(obj, root) {
    var p = obj;
    while (p) {
      if (p === root) return true;
      p = p.parent;
    }
    return false;
  }

  global.Home3DRoom = Home3DRoom;
})(typeof window !== 'undefined' ? window : this);
