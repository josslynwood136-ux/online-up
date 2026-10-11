/* ============================================================
 * js/home/rooms-3d/scene-base.js — 家园 · 3D 房间共用底座
 * ============================================================
 *
 * 卧室和小厨房是两套独立的场景：几何体、灯光、拾取分支、HUD 按钮的
 * 语义都不一样，那些各留在自己的 scene 文件里。但"怎么把一个正交相机
 * 的 3D 房间跑起来"这件事两边完全相同 —— 取景、提示条、HUD 绑定、
 * resize 重试、动画循环、世界坐标投影、销毁时的资源释放。
 *
 * 这些代码原先各抄一份。改一边忘一边就会出单边 bug：取景比例只在卧室
 * 修了、厨房还是错的；或者销毁时一边多释放了一样东西。
 *
 * 收进本文件的标准只有一条：**两边逐字相同，或者只差几个参数**。
 * 真的不一样的东西（生命周期策略、拾取分支、按钮行为）不收 —— 硬合并
 * 只会多出一层没人看得懂的 if。
 *
 * 加载顺序：排在 rooms-3d 组第一个，在 bedroom-scene.js /
 * kitchen-scene.js 之前。那两个只在 init 时取用，不看 parse 期。
 * ============================================================ */
(function (global) {
  'use strict';

  /* =================================================================
   * 纯工具
   * ================================================================= */

  /**
   * obj 是不是 root 的后代（自己也算）。
   * 用来把 3D 人物从射线检测里排除掉 —— 她也在 scene.children 里，
   * 不排除的话射线会先打中她（她 3.8 单位高，从相机看过去挡得很准），
   * 后面什么都不用判了。
   *
   * @param {THREE.Object3D} obj
   * @param {THREE.Object3D} root
   * @returns {boolean}
   */
  function isUnder(obj, root) {
    var p = obj;
    while (p) {
      if (p === root) return true;
      p = p.parent;
    }
    return false;
  }

  /**
   * 释放一个 scene 里所有几何体和材质。
   *
   * 不要对带骨骼的人物模型用：她和 character-3d-girl.js 里的 cached
   * 单例共享 geometry，traverse + dispose 会把别的实例一起弄坏。
   * 人物由 HomeCharacter3D.dispose() 单独管 —— 调用方要先摘掉她，
   * 再调这个。
   *
   * 注意 PMREM 的 render target 不在 scene.traverse 覆盖范围内，
   * 要单独释放（卧室的 geoArgs.envRenderTarget）。
   *
   * @param {THREE.Scene} scene
   */
  function disposeSceneObjects(scene) {
    if (!scene) return;
    scene.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        var list = Array.isArray(obj.material) ? obj.material : [obj.material];
        list.forEach(function (m) { if (m) m.dispose(); });
      }
    });
  }

  /* =================================================================
   * 取景 — 正交相机按"设计尺寸"锁视野
   * ================================================================= */
  //
  // 为什么必须是正交而不是透视：这两间房都是"微缩景观"（diorama），
  // 全部家当按缩尺摆的。透视相机会让近处的沙发比远处的书架大一大截，
  // 微缩感立刻散掉，看着像走进了真房间。
  //
  // 为什么不能直接吃容器宽高比：房间容器比整屏视口窄，直接用窗口比例
  // 会在某些比例下把地板或墙顶裁掉。以设计尺寸为基准算视野，容器更宽
  // 时按宽度反推垂直范围 —— 任何比例下都完整装下整个房间。
  //
  // 两边数学完全相同，只有 DESIGN_W / DESIGN_H / DESIGN_EXTENT 不同。
  //
  // @param {object} o
  //   getHost()       当前容器。**每次现取** —— 厨房 attach() 会换容器
  //   getCamera()     正交相机
  //   getRenderer()   渲染器
  //   designW/designH 设计尺寸
  //   designExtent    设计垂直视野
  // @returns {() => boolean} true = 拿到尺寸、取景成功；
  //                          false = 容器还没布局好，等下一帧再试
  function makeFitCamera(o) {
    return function fitCamera() {
      var host = o.getHost();
      var camera = o.getCamera();
      var renderer = o.getRenderer();
      if (!host || !camera || !renderer) return false;
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return false;
      // 关键：extentH/extentV 必须等于容器比例 w/h（下面第三行保证），
      // 否则正交相机的视锥比例和画布比例不一致 —— 场景被横向/纵向拉伸
      // （手机窄长屏上最明显，家具变"瘦高"）。取景范围只会扩大不会缩小，
      // 所以房间永远完整装下、且任何比例下都不变形。
      var aspect = w / h;
      // 垂直视野：至少 designExtent（装下设计高度）；
      // 容器更窄时按比例放大，保证水平方向也装得下设计宽度
      var extentV = Math.max(o.designExtent,
                             o.designExtent * (o.designW / o.designH) / aspect);
      // 水平视野：严格按容器比例推 —— 视锥比例 == 画布比例，永不变形
      var extentH = extentV * aspect;
      camera.left = -extentH;
      camera.right = extentH;
      camera.top = extentV;
      camera.bottom = -extentV;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      return true;
    };
  }

  /* =================================================================
   * 提示条 #interactive-toast
   * ================================================================= */
  //
  // 两个房间都是"设文案 -> 亮起 -> 2.2 秒后淡出"。唯一差别：卧室淡出时
  // 要把默认操作提示写回去（不然提示条空着，用户不知道怎么操作），
  // 厨房不写。
  //
  // 元素在 init 时取一次就不再重查：厨房 attach() 是把**同一个节点**
  // appendChild 到新容器，引用依然有效；卧室的提示条随房间一起销毁重建，
  // 每次 init 重新取。
  //
  // @param {object} o
  //   getHost()     从哪个容器找 #interactive-toast
  //   defaultText   淡出时写回的默认文案；不传则保持原文案
  // @returns {{show: (txt: string) => void, dispose: () => void}}
  function makeToast(o) {
    var host = o.getHost();
    var el = host ? host.querySelector('#interactive-toast') : null;
    var timer = null;
    return {
      show: function (txt) {
        if (!el) return;
        el.textContent = txt;
        el.style.opacity = '1';
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (o.defaultText) el.textContent = o.defaultText;
          el.style.opacity = '0';
        }, 2200);
      },
      /** 拆掉挂起的定时器。销毁时调，避免回调打在已分离的节点上。 */
      dispose: function () { clearTimeout(timer); }
    };
  }

  /* =================================================================
   * HUD 按钮绑定
   * ================================================================= */
  //
  // 房间来回切时 renderHome 会 innerHTML 重建整个房间容器，按钮节点全部
  // 换新 —— 所以绑定必须能"整体拆掉重来"。
  //
  // 两个房间的差别，都做成开关（默认走厨房那套：不记录、不 stop）：
  //   卧室  按钮点了要 stopPropagation，别让房间层的点击处理收到；
  //         且记录 handler，destroyBedroom3D 时摘掉（destroy 是模块级
  //         函数，拿不到 init 里的局部数组，所以数组也放这里）
  //   厨房  不 stop（它的画布监听挂在 canvas 上，和 HUD 不冲突）；
  //         节点随容器重建自然消亡，不需要记录
  //
  // @param {object} o
  //   getHost()         当前容器
  //   stopPropagation   点击时 stopPropagation
  //   track             记录 handler，让 rebind / unbind 有意义
  // @returns {{bind, rebind, unbind}}
  function makeHudBinder(o) {
    var handlers = [];

    function bind(sel, fn) {
      var host = o.getHost();
      var el = host && host.querySelector(sel);
      if (!el) return;
      var h = o.stopPropagation
        ? function (e) { e.stopPropagation(); fn(); }
        : fn;
      el.addEventListener('click', h);
      if (o.track) handlers.push({ el: el, h: h });
    }

    function unbind() {
      handlers.forEach(function (x) { x.el.removeEventListener('click', x.h); });
      handlers = [];
    }

    return {
      bind: bind,
      /** 一组 [selector, handler]。track 时先拆旧的再绑新的。 */
      rebind: function (list) {
        if (o.track) unbind();
        list.forEach(function (p) { bind(p[0], p[1]); });
      },
      unbind: unbind
    };
  }

  /* =================================================================
   * 窗口 resize
   * ================================================================= */
  //
  // 正交相机没有 aspect，取景由 fitCamera() 按容器尺寸重算。容器尺寸在
  // 刚注入 HUD 之后可能还是 0，所以要能连续重试，直到拿到真实尺寸为止。
  //
  // 两边的重试强度不同：卧室在每帧 animate 里也调 tickRetry（拿不到
  // 尺寸时几乎立刻就能补上），厨房只在 resize 事件里试一次。
  //
  // @param {object} o
  //   getHost()   当前容器
  //   fit()       取景函数
  //   guard()     可选，先过一道（比如"容器还在文档里吗"）
  //   maxRetry    最多重试多少次（默认 30）
  // @returns {{handler, add, remove, tickRetry}}
  function makeResizeWatcher(o) {
    var retries = 0;
    var max = o.maxRetry || 30;

    function handler() {
      if (o.guard && !o.guard()) return;
      if (o.fit()) retries = 0;
      else if (retries < max) retries++;
    }

    return {
      handler: handler,
      add: function () { global.addEventListener('resize', handler); },
      remove: function () { global.removeEventListener('resize', handler); },
      /** 每帧调一次：还有没取到景就继续试。 */
      tickRetry: function () {
        if (retries > 0 && !o.fit()) retries++;
      }
    };
  }

  /* =================================================================
   * 世界坐标 -> 屏幕像素
   * ================================================================= */
  //
  // 结果泡泡要贴在点中的 3D 家具旁边。raycaster 给的是世界坐标，泡泡是
  // DOM 节点，必须先投影到像素。
  //
  // 两边公式相同，只有"相对哪个元素定位"不同：
  //   卧室  挂在最外层 .home-room 上 —— .bedroom-embed 有 bottom:58px，
  //         尺寸和位置都不同，用它泡泡会偏
  //   厨房  挂在自己容器里
  //
  // @param {object} o
  //   THREE / getCamera() / getScene() / getRectTarget()
  // @returns {(world: {x,y,z}) => ({x,y}|null)}
  function makeProjector(o) {
    return function project(world) {
      var camera = o.getCamera();
      var scene = o.getScene();
      if (!world || !camera || !scene) return null;
      var target = o.getRectTarget();
      if (!target) return null;
      var v = new o.THREE.Vector3(world.x, world.y || 0, world.z);
      v.project(camera);
      var rect = target.getBoundingClientRect();
      return {
        x: (v.x * 0.5 + 0.5) * rect.width,
        y: (-v.y * 0.5 + 0.5) * rect.height
      };
    };
  }

  /* =================================================================
   * 动画循环
   * ================================================================= */
  //
  // 每帧固定做这几件事，顺序不能换：
  //   TWEEN 补间推进 -> OrbitControls 阻尼 -> 各房间自己的帧逻辑 -> 渲染
  // controls.update 必须在 render 前，否则阻尼慢一帧；房间的帧逻辑放在
  // 两者之后、render 之前，保证本帧新加/移动过的对象当帧就画出来。
  //
  // 两个房间只是"帧逻辑"不同：卧室重试取景，厨房放水滴 + 推进水粒子。
  //
  // isAlive() 返回 false 时**不再排下一帧**，循环停在这里（这正是
  // 旧代码里 `if (destroyed) return;` / `if (!running) return;` 的语义）。
  //
  // @param {object} o
  //   isAlive()    false 就停
  //   onFrame(now) 各房间自己的帧逻辑，可空
  //   TWEEN / controls / camera / scene / renderer
  // @returns {{start, stop, isRunning}}
  function createLoop(o) {
    var id = 0;
    var running = false;

    function tick(now) {
      if (!o.isAlive()) { running = false; return; }
      id = requestAnimationFrame(tick);
      if (o.TWEEN) o.TWEEN.update();
      if (o.controls) o.controls.update();
      if (o.onFrame) o.onFrame(now);
      o.renderer.render(o.scene, o.camera);
    }

    return {
      /** 开始循环；已经在跑就什么都不做。首帧同步执行（和旧行为一致）。 */
      start: function () {
        if (running) return;
        running = true;
        tick(typeof performance !== 'undefined' ? performance.now() : Date.now());
      },
      stop: function () {
        running = false;
        if (id) { cancelAnimationFrame(id); id = 0; }
      },
      isRunning: function () { return running; }
    };
  }

  global.Home3DSceneBase = {
    isUnder: isUnder,
    disposeSceneObjects: disposeSceneObjects,
    makeFitCamera: makeFitCamera,
    makeToast: makeToast,
    makeHudBinder: makeHudBinder,
    makeResizeWatcher: makeResizeWatcher,
    makeProjector: makeProjector,
    createLoop: createLoop
  };
})(window);
