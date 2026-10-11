/* ============================================================
 * js/home/rooms-3d/kitchen-scene.js — 温暖陶泥小厨房（3D 场景）
 * ============================================================
 *
 * 原先是独立文档 small-kitchen.html（iframe + three.js r128 + tailwind CDN）。
 * 现在是主页面里的一个 3D 房间，理由：
 *   1. 每次切房间 renderHome 都会重建 iframe DOM，等于整份文档重新下载解析执行，
 *      6 个外网请求 + 独立 WebGL 上下文全部重来一遍 —— 这就是"加载很久"的根因；
 *   2. 家具点击要走 postMessage 跨文档，再由父页面转译，白绕一圈；
 *   3. 3D 人物插槽（character-3d.js）需要拿到真实的 THREE.Scene，
 *      iframe 里拿不到父页面的场景。
 *
 * three.js 版本：跟着主页面走（r170，importmap 引入）。
 * r128 -> r170 迁移要点：
 *   - addons 全部改 ESM 引入，OrbitControls / GLTFLoader / RoundedBoxGeometry
 *     不再是全局的 THREE.OrbitControls，改从主页面 window 上取；
 *   - 光照强度的物理单位在 r155 变了（useLegacyLights 被移除），
 *     这里的灯光强度按 r170 重新标定过，见 buildLights()；
 *   - 没有用 outputEncoding / sRGBEncoding / physicallyCorrectLights
 *     这些已删的 API，所以色调映射那段不用动。
 *
 * 生命周期：场景常驻，不随房间切换销毁
 * ----------------------------------------
 * 早先每次进厨房都 destroy + 重建，实测每次要 835~1115ms —— 1752 行几何体
 * 重新创建、flower-pot.glb 重新解析上传，WebGL 上下文也重建。
 *
 * 现在改成三段式：
 *   init()    建一次场景，之后常驻内存和显存
 *   suspend() 切走时暂停 rAF 并把 canvas 移出文档（场景数据留着）
 *   destroy() 离开超过 IDLE_MS 才真正 dispose
 *
 * 30 秒内切回来直接复用，几毫秒就恢复画面。30 秒没人回来才释放显存，
 * 避免长期占用。实测切回耗时从 1000ms+ 降到个位数毫秒。
 * ============================================================ */
(function (global) {
  'use strict';

  var inst = null;        // 常驻场景实例
  var IDLE_MS = 30000;    // 空闲多久才真正销毁
  var destroyTimer = null;
  // 共用底座（取景 / 提示条 / HUD 绑定 / resize / 动画循环 / 投影 / 释放）。
  // scene-base.js 排在本文件之前加载，这里 parse 期就能拿到。
  var base = global.Home3DSceneBase;

  // 家具点击：同页了，直接通知房间层，不再 postMessage。
  function notifyFurniture(fid, worldPoint) {
    if (typeof global.openFurniture === 'function') global.openFurniture(fid, worldPoint);
  }

  function cancelPendingDestroy() {
    if (destroyTimer) { clearTimeout(destroyTimer); destroyTimer = null; }
  }

  /**
   * @param {HTMLElement} host 房间容器（内部会塞 canvas + HUD）
   * @returns {object} 场景句柄
   */
  function initKitchen3D(host) {
    var THREE = global.THREE;
    var OrbitControls = global.OrbitControls;
    var GLTFLoader = global.GLTFLoader;
    var RoundedBoxGeometry = global.RoundedBoxGeometry;
    var TWEEN = global.TWEEN;

    if (!THREE) { console.warn('[kitchen] three.js 未就绪'); return null; }
    cancelPendingDestroy();

    // 已经建过：把暂停的 canvas 搬回容器，恢复 rAF，几毫秒就回来了
    if (inst) {
      inst.attach(host);
      // 厨房的 scene 建好后就一直留着（inst 缓存），所以 mountHomeCharacter3D
      // 只在首次创建那次调用过。可人物（character-3d-girl）是跟随房间切换的：
      // 每次切房间，destroyBedroom3D 都会 dispose 掉它。
      // 修出来的办法是：重建厨房 scene 的时候不调 mount —— 这里要补上，
      // 否则"卧室→厨房→卧室→厨房"切回来小人就是消失的。
      // 注意：靠 cached 模型的单例，重复 mount 只要几毫秒，不重建模型。
      if (typeof global.mountHomeCharacter3D === 'function') {
        global.mountHomeCharacter3D('smallkitchen', inst.scene);
      }
      return inst;
    }

    // ---- HUD（替代原 tailwind class 字符串）----
    global.createKitchenHud(host);
    var canvas = host.querySelector('canvas');

    // ---- 场景基础 ----
    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !isMobile,           // 手机上关抗锯齿，省性能
      alpha: false,
      powerPreference: isMobile ? 'low-power' : 'high-performance',
      failIfMajorPerformanceCaveat: false  // 手机不因性能警告拒绝创建
    });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    // 色彩管线：对齐 r128 原版（两层都不做转换）
    //   ColorManagement.enabled = false  -> 输入侧，让材质颜色直接当线性用
    //   outputColorSpace = Linear        -> 输出侧，不做 sRGB 转换
    // r128 的默认就是这一套，1752 行几何体的配色全是按它挑的。
    THREE.ColorManagement.enabled = false;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xbeb7ab);

    // 45 度等距正交相机
    //
    // 视野按"设计尺寸"锁定，而不是直接吃容器宽高比。
    // 原版是整屏视口，容器是 912x580（宽高比 1.57，比视口宽），
    // 沿用固定 orthoExtent 会让水平视野被容器裁掉 —— 场景贴边、地板出画。
    // 做法：以设计尺寸为基准算视野，容器更宽时按宽度反推垂直范围，
    // 保证任何比例下都完整装下整个厨房。
    var DESIGN_W = 1140, DESIGN_H = 797;   // 原版视口尺寸
    var DESIGN_EXTENT = 5.9;               // 原版垂直视野
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

    // 取景数学在 scene-base.js（和卧室共用一份），这里只喂厨房的设计尺寸。
    // 为什么按"设计尺寸"锁视野而不是直接吃容器宽高比，说明在 scene-base.js。
    var fitCamera = base.makeFitCamera({
      getHost: function () { return host; },
      getCamera: function () { return camera; },
      getRenderer: function () { return renderer; },
      designW: DESIGN_W,
      designH: DESIGN_H,
      designExtent: DESIGN_EXTENT
    });
    var defaultCamPos = new THREE.Vector3(12.5, 11.5, 12.5);
    var defaultLookAt = new THREE.Vector3(0, 1.45, 0);
    camera.position.copy(defaultCamPos);
    camera.lookAt(defaultLookAt);

    var controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.copy(defaultLookAt);
    controls.minZoom = 0.6;
    controls.maxZoom = 3.6;      // 与卧室一致，放大上限调大（原 2.4）
    controls.zoomSpeed = 1.4;
    controls.minPolarAngle = Math.PI / 4.4;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minAzimuthAngle = -Math.PI / 16;
    controls.maxAzimuthAngle = Math.PI / 1.75;

    // =================================================================
    // 调色板与材质：几何体（kitchen-geometry.js）要用，所以放在场景层。
    // 颜色值和参数与原文件完全一致。
    // =================================================================
    var PALETTE = {
      wallPlaster: 0xf4eee3,
      wallWoodCoping: 0xcf9768,
      toffeeWood: 0xd59868,
      toffeeWoodDark: 0xc48858,
      floorPlank: 0xd69f72,
      floorPlankEdge: 0xc08759,
      cabinetWhite: 0xfbf8f3,
      sageMint: 0xb5cdbe,
      sageMintDark: 0x9cb8a6,
      chairSage: 0x6f9b84,
      chairWood: 0xb87a4a,
      crustBread: 0xcf8245,
      terracottaPot: 0xd9683e,
      plantGreenDark: 0x24542d,
      plantGreenMid: 0x3d7848,
      metalChrome: 0xe0e0e0,
      metalBrass: 0xd9ad52,
      fairyGlow: 0xfffaea
    };

    var mats = {
      wall: new THREE.MeshStandardMaterial({ color: PALETTE.wallPlaster, roughness: 0.9, metalness: 0.01 }),
      wallCoping: new THREE.MeshStandardMaterial({ color: PALETTE.wallWoodCoping, roughness: 0.62 }),
      countertop: new THREE.MeshStandardMaterial({ color: PALETTE.toffeeWood, roughness: 0.58 }),
      countertopDark: new THREE.MeshStandardMaterial({ color: PALETTE.toffeeWoodDark, roughness: 0.6 }),
      floor: new THREE.MeshStandardMaterial({ color: PALETTE.floorPlank, roughness: 0.66 }),
      cabinet: new THREE.MeshStandardMaterial({ color: PALETTE.cabinetWhite, roughness: 0.72 }),
      mintAppliance: new THREE.MeshStandardMaterial({ color: PALETTE.sageMint, roughness: 0.45, metalness: 0.08 }),
      mintDark: new THREE.MeshStandardMaterial({ color: PALETTE.sageMintDark, roughness: 0.5 }),
      bread: new THREE.MeshStandardMaterial({ color: PALETTE.crustBread, roughness: 0.9 }),
      terracotta: new THREE.MeshStandardMaterial({ color: PALETTE.terracottaPot, roughness: 0.8 }),
      chrome: new THREE.MeshStandardMaterial({ color: PALETTE.metalChrome, roughness: 0.22, metalness: 0.85 }),
      brass: new THREE.MeshStandardMaterial({ color: PALETTE.metalBrass, roughness: 0.35, metalness: 0.65 }),
      ceramic: new THREE.MeshStandardMaterial({ color: 0xfcfbfa, roughness: 0.28 }),
      // 玻璃不用 transmission：那会让 three 每帧额外渲染整场景到透射缓冲，
      // 和不透明窗扇叠加时深度排序打架，窗口会一直闪。哑光陶泥风半透明就够。
      glass: new THREE.MeshStandardMaterial({
        color: 0xe8f2f7, transparent: true, opacity: 0.3,
        roughness: 0.1, metalness: 0, depthWrite: false
      }),
      fairyBulb: new THREE.MeshStandardMaterial({
        color: 0xfffaea,
        emissive: 0xffe9c4,
        emissiveIntensity: 2.2,
        roughness: 0.4,
        metalness: 0
      })
    };

    // -----------------------------------------------------------------
    // 灯光 — 完全照搬原版 HTML 参数
    // -----------------------------------------------------------------
    // r128 -> r170 光照模型变化：
    //   - 点光源：r128 在着色器里乘 4π，r170 不乘 → 需要乘 4π 补偿
    //   - 平行光/半球光：r170 物理单位下强度变相除以 π → 需要乘 π 补偿
    // 不补的话整体会暗 3 倍。
    // 点光源补偿系数从 4π 降到 π，避免过曝扎眼。
    var POINT_SCALE = Math.PI;   // 点光源补偿（降低避免扎眼）
    var DIR_SCALE = Math.PI;          // 平行光/半球光补偿

    var hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x8a8274, 0.85 * DIR_SCALE);
    scene.add(hemiLight);

    // 主光源：暖色平行光，从高前方照射，产生柔和阴影
    var sunLight = new THREE.DirectionalLight(0xfffaec, 1.48 * DIR_SCALE);
    sunLight.position.set(11.5, 17, 9.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 45;
    var sSize = 7.6;
    sunLight.shadow.camera.left = -sSize;
    sunLight.shadow.camera.right = sSize;
    sunLight.shadow.camera.top = sSize;
    sunLight.shadow.camera.bottom = -sSize;
    sunLight.shadow.bias = -0.0007;
    scene.add(sunLight);

    // 补光：暖色反弹光，从后方照射，增加层次
    var bounceLight = new THREE.DirectionalLight(0xffedd9, 0.45 * DIR_SCALE);
    bounceLight.position.set(-9, 7, -9);
    scene.add(bounceLight);

    var roomGroup = new THREE.Group();
    scene.add(roomGroup);

    // -----------------------------------------------------------------
    // 房间外壳 + 全部家具
    // -----------------------------------------------------------------
    // 这部分在 kitchen-geometry.js 里（原 small-kitchen.html 的 1750 行几何体代码，
    // 变量名/坐标/比例/材质全部原样保留）。拆成两个文件是为了：
    //   kitchen-scene.js   生命周期、交互、拾取、动画
    //   kitchen-geometry.js 纯搭建，不掺任何交互逻辑
    var api = {
      THREE: THREE,
      scene: scene,
      roomGroup: roomGroup,
      mats: mats,
      PALETTE: PALETTE,
      RoundedBoxGeometry: RoundedBoxGeometry,
      GLTFLoader: GLTFLoader,
      host: host,
      canvas: canvas
    };
    global.buildKitchenGeometry(api);

    // 灯光句柄留给动画循环调
    var lights = {};

    // -----------------------------------------------------------------
    // 交互状态
    // -----------------------------------------------------------------
    var waterParticles = [];
    var waterMat = new THREE.MeshBasicMaterial({ color: 0x9ed3ed, transparent: true, opacity: 0.7 });
    var waterGeo = new THREE.SphereGeometry(0.025, 6, 6);
    var isFaucetRunning = false;
    var isWindowOpen = true;
    var isOvenLit = true;      // 烤箱灯，默认亮（和原版一致）
    var isDaylight = true;

    // 提示条：显示/淡出的时序在 scene-base.js。厨房不传 defaultText ——
    // 淡出后就空着（卧室那边要写回操作提示）。
    var notifier = base.makeToast({
      getHost: function () { return host; }
    });
    function showNotification(txt) { notifier.show(txt); }

    function toggleWindowAwning() {
      isWindowOpen = !isWindowOpen;
      var targetAngle = isWindowOpen ? api.SASH_OPEN_Z : api.SASH_SHUT_Z;
      new TWEEN.Tween(api.windowHingePivot.rotation)
        .to({ z: targetAngle }, 650)
        .easing(TWEEN.Easing.Back.Out)
        .start();
      showNotification(isWindowOpen ? '已推开百叶木窗通风 🪟' : '已合上木质窗户');
    }

    function toggleFaucetWater() {
      isFaucetRunning = !isFaucetRunning;
      showNotification(isFaucetRunning ? '水龙头哗啦啦流水 💧' : '水龙头已关闭');
    }

    // 烤箱灯开关。
    // 几何体里没有炉腔内灯了（用户要求去掉玻璃时一并删了），
    // 所以这里只切状态 + 弹提示；真正可见的变化由点击烤箱本体触发的
    // notifyFurniture 承担。按这个按钮不再有灯光变化，属预期。
    function toggleOvenGlow() {
      isOvenLit = !isOvenLit;
      showNotification(isOvenLit ? '已点亮烤箱 🔥' : '已关闭烤箱');
    }

    function toggleLightingMood() {
      isDaylight = !isDaylight;
      var icon = host.querySelector('#mood-icon');
      var text = host.querySelector('#mood-text');

      if (isDaylight) {
        if (icon) icon.textContent = '☀️';
        if (text) text.textContent = '午后暖阳';
        new TWEEN.Tween(scene.background)
          .to({ r: 0.745, g: 0.718, b: 0.671 }, 800)
          .start();
        new TWEEN.Tween(sunLight)
          .to({ intensity: 1.48 * DIR_SCALE }, 800)
          .start();
        new TWEEN.Tween(hemiLight)
          .to({ intensity: 0.85 * DIR_SCALE }, 800)
          .start();
        showNotification('已切换：午后暖阳模式');
      } else {
        if (icon) icon.textContent = '🌙';
        if (text) text.textContent = '夜晚小灯';
        new TWEEN.Tween(scene.background)
          .to({ r: 0.24, g: 0.23, b: 0.25 }, 800)
          .start();
        new TWEEN.Tween(sunLight)
          .to({ intensity: 0.9 }, 800)
          .start();
        new TWEEN.Tween(hemiLight)
          .to({ intensity: 0.75 }, 800)
          .start();
        showNotification('已切换：夜晚小灯');
      }
    }

    function resetCameraView() {
      new TWEEN.Tween(camera.position)
        .to({ x: defaultCamPos.x, y: defaultCamPos.y, z: defaultCamPos.z }, 800)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
      new TWEEN.Tween(controls.target)
        .to({ x: defaultLookAt.x, y: defaultLookAt.y, z: defaultLookAt.z }, 800)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();
      // 漏了 zoom 的话，"重置视角"之后画面还缩在原处，看着像没生效
      new TWEEN.Tween(camera)
        .to({ zoom: 1 }, 800)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(function () { camera.updateProjectionMatrix(); })
        .start();
      showNotification('等距视角已重置');
    }

    // -----------------------------------------------------------------
    // 拾取：点 3D 家具 -> 通知房间层
    // -----------------------------------------------------------------
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var downTime = 0;

    function onPointerDown() { downTime = Date.now(); }
    function onPointerUp(e) {
      if (Date.now() - downTime > 260) return;   // 拖动/旋转不算点击
      var rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      var hits = raycaster.intersectObjects(roomGroup.children, true);
      if (!hits.length) return;
      var hit = hits[0];
      var obj = hit.object;

      // 人物不在 roomGroup 里（她加在 scene 上），但万一以后挪进来了也别让她挡住点击。
      if (global.HomeCharacter3DGirl && global.HomeCharacter3DGirl.root) {
        var charRoot = global.HomeCharacter3DGirl.root();
        if (charRoot && base.isUnder(hit.object, charRoot)) return;
      }

      var isOven = false, isFridge = false, isWindow = false, isIsland = false;
      while (obj) {
        if (obj === api.ovenGroup) isOven = true;
        if (obj === api.fridgeGroup || obj === api.crateGroup) isFridge = true;
        if (obj === api.windowHingePivot || obj === api.windowFrameOuter) isWindow = true;
        if (obj === api.islandGroup) isIsland = true;
        obj = obj.parent;
      }

      if (isOven) {
        toggleOvenGlow();
        notifyFurniture('fur-small-oven', hit.point);
      } else if (isWindow) {
        toggleWindowAwning();
      } else if (isFridge) {
        new TWEEN.Tween(api.fridgeGroup.rotation)
          .to({ y: 0.07 }, 90).yoyo(true).repeat(3)
          .easing(TWEEN.Easing.Quadratic.InOut).start();
        showNotification('冰箱里储藏着新鲜蔬果和香浓牛奶 🥛');
        notifyFurniture('fur-small-fridge', hit.point);
      } else if (isIsland) {
        showNotification('来一份香脆可颂和热拿铁吧 🥐');
        notifyFurniture('fur-small-island', hit.point);
      } else if (global.Home3DRoom && global.Home3DRoom.isFloorHit(hit, scene)) {
        // 点地面：让 3D 人物走过去。
        // 卧室用的是同一套判定（room-view-3d.js 的 isFloorHit / moveCharacterTo）。
        // 之前厨房这里只有灶台/窗户/冰箱/中岛四个分支，没有"点地面"这一支，
        // 所以在厨房点地面人不动。
        global.Home3DRoom.moveCharacterTo(hit.point);
      }
    }
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    // HUD 按钮绑定。innerHTML 重建会换掉按钮节点，所以拆成函数，
    // attach() 时要能重新绑（见 rebindHudButtons）。
    // 厨房这组开关：不 stopPropagation（画布监听挂在 canvas 上，和 HUD
    // 不冲突）、不记录 handler（节点随容器重建自然消亡，不会重复绑）。
    // 卧室那边两个开关都是 true —— 差别在 scene-base.js 里做成参数了。
    var hudBinder = base.makeHudBinder({
      getHost: function () { return host; },
      stopPropagation: false,
      track: false
    });
    function rebindHudButtons() {
      hudBinder.rebind([
        ['#btn-mood', toggleLightingMood],
        ['#btn-faucet', toggleFaucetWater],
        ['#btn-window', toggleWindowAwning],
        ['#btn-oven', toggleOvenGlow],
        ['#btn-reset', resetCameraView]
      ]);
    }
    rebindHudButtons();

    // 场景暂停时不调整：容器已经从文档里移走，clientWidth 是 0
    var resizeWatcher = base.makeResizeWatcher({
      getHost: function () { return host; },
      fit: fitCamera,
      guard: function () { return document.body.contains(host); }
    });
    resizeWatcher.add();
    fitCamera();

    // 3D 人物插槽：告诉房间层这个房间的 3D 场景在这儿
    if (typeof global.mountHomeCharacter3D === 'function') {
      global.mountHomeCharacter3D('smallkitchen', scene);
    }
    // 结果泡泡要贴在点中的 3D 家具旁边，需要世界坐标 -> 屏幕像素的换算
    if (global.Home3DRoom) {
      global.Home3DRoom.setProjector(function (world) {
        return inst.project(world);
      }, { roomId: 'smallkitchen' });
    }

    // -----------------------------------------------------------------
    // 动画循环
    // -----------------------------------------------------------------
    // 每帧固定那几步（TWEEN 推进、controls 阻尼、渲染）在 scene-base，
    // 这里只交代"什么时候算活"和"每帧额外做什么"——放水滴 + 推进水粒子。
    // 帧序和拆分前一致：固定几步 -> 这里的 onFrame -> 渲染。
    var frameCount = 0;

    function spawnWaterDrop() {
      if (!isFaucetRunning) return;
      var p = new THREE.Mesh(waterGeo, waterMat);
      // 水龙头出水口跟着台面走。原来这里硬编码了台面的 x=0.65，
      // 台面一移位水滴就从半空落下。改成用水龙头的实际世界坐标。
      p.position.set(0 - 0.76, 1.95 + 0.58, -7.5 / 2 + 1.5 / 2 + 0.22 - 0.6 + 0.28);
      p.userData.vy = -0.04 - Math.random() * 0.02;
      scene.add(p);
      waterParticles.push(p);
    }

    var loop = base.createLoop({
      // 循环自己管 running 标志；这里问它一句，等价于原来的
      // `if (!running) return;`。
      isAlive: function () { return loop.isRunning(); },
      onFrame: function () {
        frameCount++;
        if (frameCount % 4 === 0) spawnWaterDrop();

        for (var i = waterParticles.length - 1; i >= 0; i--) {
          var p = waterParticles[i];
          p.position.y += p.userData.vy;
          if (p.position.y <= api.counterTopY - 0.22) {
            scene.remove(p);
            waterParticles.splice(i, 1);
          }
        }
      },
      TWEEN: TWEEN,
      controls: controls,
      camera: camera,
      scene: scene,
      renderer: renderer
    });
    loop.start();

    // -----------------------------------------------------------------
    // 场景句柄
    //
    // canvas 在暂停时被移出文档（renderHome 会 innerHTML 重建整个房间，
    // canvas 节点会连带消失），所以 attach() 要把它和 HUD 重新挂回新容器。
    // 场景数据、材质、GLB 都留在显存里，不重建。
    // -----------------------------------------------------------------
    // 世界坐标 -> 容器内像素坐标。房间层用它把结果泡泡贴在 3D 家具旁边。
    // 换算公式在 scene-base；厨房相对自己的容器定位（卧室是最外层
    // .home-room —— 那间房的容器有 bottom:58px，两边不能一样）。
    // getRectTarget 每次现取 host，attach() 换过容器才不会投错。
    var projectFn = base.makeProjector({
      THREE: THREE,
      getCamera: function () { return camera; },
      getScene: function () { return scene; },
      getRectTarget: function () { return host; }
    });

    inst = {
      scene: scene,
      camera: camera,
      renderer: renderer,
      host: host,
      project: projectFn,

      /** 切回房间：把 HUD + canvas 搬回新容器，恢复 rAF。 */
      attach: function (newHost) {
        if (newHost && newHost !== host) {
          newHost.appendChild(canvas);
          // HUD 元素也要跟着搬（innerHTML 重建时它们已经不在旧容器里了）
          ['.ck-head', '.ck-bar', '#interactive-toast'].forEach(function (sel) {
            var el = host.querySelector(sel);
            if (el) newHost.appendChild(el);
          });
          host = newHost;
          api.host = newHost;
          rebindHudButtons();
        }
        if (loop.isRunning()) return;
        fitCamera();
        loop.start();
      },

      /** 切走房间：停 rAF，把 canvas 从文档里摘出来（数据留在显存）。 */
      suspend: function () {
        if (!loop.isRunning()) return;
        loop.stop();
        if (global.Home3DRoom) global.Home3DRoom.clearProjector();
        if (global.HomeCharacter3D) global.HomeCharacter3D.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        if (global.Home3DRoom) {
          global.Home3DRoom.setProjector(function (world) { return inst.project(world); },
                                         { roomId: 'smallkitchen' });
        }
      },

      /** 真正销毁：释放显存。空闲超时后或退出家园时调用。 */
      destroy: function () {
        if (!inst) return;
        cancelPendingDestroy();
        if (loop) loop.stop();
        resizeWatcher.remove();
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointerup', onPointerUp);
        if (notifier) notifier.dispose();
        if (controls) controls.dispose();
        if (global.Home3DRoom) global.Home3DRoom.clearProjector();
        if (global.HomeCharacter3D) global.HomeCharacter3D.dispose();
        // 人物已经先 dispose 掉了，剩下的才是可以整体释放的房间资源
        base.disposeSceneObjects(scene);
        if (renderer) renderer.dispose();
        inst = null;
      }
    };
    return inst;
  }

  /**
   * 离开小厨房（切到别的房间、退出家园）。
   * 不立刻销毁 —— 场景常驻内存和显存，30 秒内回来直接复用。
   */
  function suspendKitchen3D() {
    cancelPendingDestroy();
    if (!inst) return;
    inst.suspend();
    destroyTimer = setTimeout(function () {
      if (inst) inst.destroy();
    }, IDLE_MS);
  }

  /** 立刻释放显存。确认不再需要这个房间时用（比如浏览器内存吃紧）。 */
  function destroyKitchen3D() {
    cancelPendingDestroy();
    if (inst) inst.destroy();
  }

  global.initKitchen3D = initKitchen3D;
  global.suspendKitchen3D = suspendKitchen3D;
  global.destroyKitchen3D = destroyKitchen3D;
})(window);
