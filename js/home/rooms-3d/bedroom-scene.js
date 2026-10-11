/* ============================================================
 * js/home/rooms-3d/bedroom-scene.js — 卧室 3D 场景
 * ============================================================
 *
 * 原来这段 840 行塞在 apps.js 的 initBedroom3D() 里，和 30 多个 app 的
 * 业务逻辑混在同一个 6000 行文件里。现在拆出来，和小厨房同构：
 *
 *   bedroom-scene.js     生命周期 / 相机 / 交互 / 拾取 / 动画
 *   bedroom-geometry.js  场景搭建（家具、材质、灯光）
 *
 * 行为和拆分前完全一致，包括：
 *   - 3D 资源没就绪时重试 100 次（renderHome 是异步的，THREE 可能还没 import 完）
 *   - mesh.userData.fid 拾取（比小厨房的对象引用比较更好，不用改几何体代码）
 *   - 点地板把 3D 人物移过去
 *   - 世界坐标 -> 屏幕像素投影，给结果泡泡定位
 *
 * 和小厨房的差异：卧室不常驻。场景包含 shadowMap 和 2048 阴影贴图，
 * 重建成本比小厨房高，而且卧室没有"打开很久"的价值需求。
 * ============================================================ */
(function (global) {
  'use strict';

  var scene = null;
  var renderer = null;
  var camera = null;
  var controls = null;
  var initTimer = null;
  // 共用底座（取景 / 提示条 / HUD 绑定 / resize 重试 / 动画循环 / 投影）。
  // scene-base.js 排在本文件之前加载，这里 parse 期就能拿到。
  var base = global.Home3DSceneBase;
  // 下面三个句柄都必须放在模块级 —— destroyBedroom3D 是模块级函数，
  // 拿不到 initBedroom3D 里的局部变量。
  var hudBinder = null;
  var resizeWatcher = null;
  var loop = null;
  var notifier = null;
  var composer = null;   // 后期链句柄，销毁时要 dispose（模块级，理由同上）
  var initAttempts = 0;
  var pointerHandlers = null;
  var destroyed = false;
  // 传给几何体的参数对象，销毁时用来释放 PMREM 的 render target
  var geoArgs = null;

  // -----------------------------------------------------------------
  // 背景色（后期管线补偿值）
  // -----------------------------------------------------------------
  // 卧室开了后期链（EffectComposer + OutputPass，见 init 里的 setupPost），
  // 背景 clear 值会和全场一起过 ACES(曝光 0.62) 再做 sRGB 编码。
  // 而原管线里 clear 是直接写像素的（ColorManagement 关着，getRGB 的
  // 色彩空间转换是空操作），显示值 = 存的值 = f(hex)（f 为 sRGB EOTF）。
  //
  // 要让加后期前后背景逐位一致，就得存逆像：
  //   X = ACES⁻¹( f(f(hex)) ) / (0.62/0.6)
  // 正向渲染时 LinearToSRGB(ACES(X)) = f(hex) = 旧显示值（已数值验证）。
  // 想换背景色就按这个公式重算，或直接让我改。
  var BG_DAY = null;      // 0xe2cdc3 的补偿值
  var BG_NIGHT = null;    // 0x3a3145 的补偿值

  function showError(message) {
    var hint = document.querySelector('.bedroom3d-hint');
    if (hint) hint.textContent = message;
  }

  // ---- 3D 人物的加载状态 ----
  // character-3d-girl.js 派发 home:character 事件（loading / ready / error）。
  // 模型 10MB，本地也要下好几秒，没提示的话用户会以为房间是空的。
  // 提示条这个元素只在卧室打开时存在，所以监听挂一次就行，
  // 不需要跟着房间的起落走 —— 卧室没开时事件也压根不会派发。
  function onCharacterEvent(e) {
    var d = (e && e.detail) || {};
    var hint = document.querySelector('.bedroom3d-hint');
    if (!hint) return;
    if (d.state === 'loading') hint.textContent = d.text || '正在加载 3D 人物…';
    else if (d.state === 'error') hint.textContent = d.text || '3D 人物加载失败';
    else if (d.state === 'ready') hint.textContent = global.BEDROOM_HINT_DEFAULT;
  }
  global.addEventListener('home:character', onCharacterEvent);

  function initBedroom3D() {
    if (scene) return;
    if (initTimer) { clearTimeout(initTimer); initTimer = null; }
    // renderHome 是异步切房间的，three.js 的 import 可能还没完成。
    // 这里轮询等它就绪，最多 100 次（约 6 秒）。
    if (!global.THREE || !global.OrbitControls) {
      initAttempts++;
      if (initAttempts < 100) initTimer = setTimeout(initBedroom3D, 60);
      else showError('3D 资源加载失败，请检查网络后刷新');
      return;
    }
    var host = document.querySelector('.home-room.bedroom .bedroom-embed');
    if (!host) return;
    var THREE = global.THREE;
    var OrbitControls = global.OrbitControls;
    initAttempts = 0;
    destroyed = false;

    // ---- HUD（替代原来 index.js 里手写的 canvas + 提示条 + 圆按钮）----
    global.createBedroomHud(host);
    var canvas = host.querySelector('canvas.bd-canvas');
    if (!canvas) return;

    BG_DAY = { r: 0.758397, g: 0.417307, b: 0.323168 };   // 0xe2cdc3 的逆 ACES 补偿值
    BG_NIGHT = { r: 0.019862, g: 0.015753, b: 0.025986 }; // 0x3a3145 的逆 ACES 补偿值
    scene = new THREE.Scene();
    // 原文件没有雾：加雾会把 11 米宽的房间洗白，所以去掉。
    scene.background = new THREE.Color(BG_DAY.r, BG_DAY.g, BG_DAY.b);

    // =================================================================
    // 相机：45 度等距正交，和小厨房完全同一套
    // =================================================================
    // 为什么必须是正交而不是透视：
    // 这间房是"微缩景观"（diorama），全部家当都是按缩尺摆的。透视相机会让
    // 近处的沙发比远处的书架大一大截，微缩感立刻散掉，看着像走进了真房间。
    // 正交投影下所有物体等比缩放，才有"摆在盒子里"的感觉 —— 原作者用的
    // 也是正交。
    //
    // 视野按"设计尺寸"锁定，不直接吃容器宽高比：房间容器只有 ~900x560，
    // 比整屏视口小，直接用窗口宽高比会在某些比例下把地板或墙顶裁掉。
    // 以设计尺寸为基准算视野，容器更宽时按宽度反推垂直范围。
    var DESIGN_W = 1400, DESIGN_H = 900;   // 设计尺寸（取一个好构图的比例）
    // 10.0 是照原 HTML 抄的，但那个值是给"整屏视口"调的。
    // 房间容器只有 ~900x560，fitCamera 里的 Math.max(1, DESIGN_H/h)
    // 会把视野再放大 1.6 倍，结果房间只占画面一小块，看着很小。
    // 7.0 是试出来的：房间横向占满约九成，不会裁到也不会显空。
    var DESIGN_EXTENT = 7.0;
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    // 取景数学在 scene-base.js（和厨房共用一份），这里只喂卧室的设计尺寸。
    // 返回值有语义：false = 容器还没布局好，交给 resize 重试（见下方
    // resizeWatcher 和 animate 里的 tickRetry）。
    var fitCamera = base.makeFitCamera({
      getHost: function () { return host; },
      getCamera: function () { return camera; },
      getRenderer: function () { return renderer; },
      designW: DESIGN_W,
      designH: DESIGN_H,
      designExtent: DESIGN_EXTENT
    });
    // 机位：方向和厨房一致（delta 12.5 / 10.05 / 12.5，即仰角约 29.6 度），
    // 只是把注视点抬到房间实际重心（微缩景观高 6.9 米，不是原来 1.45）。
    var defaultCamPos = new THREE.Vector3(12.5, 13.05, 12.5);
    var defaultLookAt = new THREE.Vector3(0, 3.0, 0);
    camera.position.copy(defaultCamPos);
    camera.lookAt(defaultLookAt);

    var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    var webglCtxAttrs = {
      antialias: !isMobile,
      failIfMajorPerformanceCaveat: false,
      powerPreference: isMobile ? 'low-power' : 'high-performance'
    };
    try {
      renderer = new THREE.WebGLRenderer(Object.assign({ canvas: canvas }, webglCtxAttrs));
    } catch (err) {
      // 手机 WebGL 偶尔创建失败，等一帧重试
      if (initAttempts < 3) {
        initAttempts++;
        if (initTimer) clearTimeout(initTimer);
        initTimer = setTimeout(initBedroom3D, 300);
        return;
      }
      scene = null;
      camera = null;
      showError('当前浏览器无法启动 3D 卧室，请开启 WebGL 后刷新');
      return;
    }
    renderer.setPixelRatio(Math.min(global.devicePixelRatio, 2));
    // 容器尺寸可能还没算出来（刚 inject 完 HUD）。这时候 setSize 没跑成，
    // canvas 会停在 three 的默认 300x150 缓冲区，然后被 CSS 拉满 ——
    // 那就是"糊"。所以这里排队一帧再试。
    if (!fitCamera()) {
      requestAnimationFrame(function () {
        if (!destroyed) fitCamera();
      });
    }

    // WebGL 上下文丢失处理（手机内存不足时常见）
    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      showError('3D 上下文丢失，请刷新页面重试');
      if (loop) cancelAnimationFrame(loop);
    }, false);
    canvas.addEventListener('webglcontextrestored', function () {
      showError('3D 上下文已恢复，正在重新加载…');
      if (typeof initBedroom3D === 'function') initBedroom3D();
    }, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // 输出色彩空间：和 r128 的 LinearEncoding 对齐。
    // 输入侧（ColorManagement.enabled = false）在 index.html 统一关，
    // 输出侧在这里关 —— 两边不对称会让整个房间发灰。详见 kitchen-scene.js 里的说明。
    // 输出色彩空间：sRGB —— 和原 HTML 完全一致，**不要**改成 Linear。
    //
    // 为什么厨房是 Linear 而卧室不是：
    //   厨房几何体几乎全是纯色材质，1752 行的颜色当年就是照着
    //   "Linear 输出"这套管线一手挑亮的，用 sRGB 输出反而会过曝。
    //   卧室到处是 Canvas 贴图（地板 / 墙板 / 被子 / 藤筐 / 地毯 / 挂画），
    //   颜色是作者在 r128 的 sRGB 输出下调的。
    //
    // 少掉"线性 -> sRGB"这一步等于把线性值直接写进屏幕：中间调被压暗、
    // 对比度被拉平，看起来就是发灰、发糊 —— 就是"模模糊糊"。
    // 完整管线：材质色当线性用（ColorManagement 关）→ 贴图硬件 sRGB→线性
    // → ACES → 线性→sRGB 输出。和原文件逐级对齐。
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // 0.62 是原文件的值，但实测下来整张图像蒙了一层白纱：地板的陶土色被冲成
    // 灰粉、大面积白色全糊成一片。所谓"模模糊糊"就是这个。
    // 光源位置修正后层次已经出来了，但总量还是偏高，这个数要往下压。
    // 0.30 太暗了，整间房发灰发闷（"昏暗模糊"）。
    // 之前注释说 0.62 会"蒙白纱"，是因为当时太阳从相机这侧打，
    // 正面全是光、没有任何暗部，亮处一糊就成了白纱。
    // 现在阳光改成从窗外斜射进来（见 geometry 里的 sun），
    // 房间有了明确的亮区暗区，层次托得住更高曝光。
    // 0.95 保守些，比厨房 1.05 略低，留卧室一点柔和。
    renderer.toneMappingExposure = 0.62;

    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.target.copy(defaultLookAt);
    // 正交相机靠 zoom 缩放，不是 min/maxDistance
    controls.minZoom = 0.65;
    controls.maxZoom = 3.6;      // 放大上限（原 2.2，用户要求能放更大）
    controls.zoomSpeed = 1.4;    // 滚轮每档放大量（默认 1）
    // 角度锁死在一个"设计好的等距窗口"里 —— 和厨房同一组数值。
    // 不锁的话能绕到地台底下看穿单面墙，或者转到墙背面对着空气，
    // 那正是"看着别扭"的来源。
    controls.minPolarAngle = Math.PI / 4.4;    // 约 41 度，最高
    controls.maxPolarAngle = Math.PI / 2.2;    // 约 82 度，最低
    controls.minAzimuthAngle = -Math.PI / 16; // 约 -11 度
    controls.maxAzimuthAngle = Math.PI / 1.75;// 约 103 度
    // 鼠标映射和厨房一致：左键平移、右键旋转、中键缩放
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };

    // 家具、材质、灯光都在 geometry 文件里搭。
    // 几何体不回传值，是往这个 api 对象上写东西（roomGroup / lights /
    // envRenderTarget），所以要把对象本身留着，销毁时才能释放 PMREM。
    var TWEEN = global.TWEEN;

    geoArgs = { THREE: THREE, scene: scene, renderer: renderer };
    global.buildBedroomGeometry(geoArgs);
    // 记一份落地灯的白天强度，关灯时才知道要恢复成多少
    if (geoArgs.lampLight) geoArgs.lampDay = geoArgs.lampLight.intensity;
    else geoArgs.lampDay = 0;

    // =================================================================
    // 后期处理：GTAO 接触阴影 + 轻 bloom + 暗角
    // =================================================================
    // 目标是"家具落得住、灯光有氛围"，不改风格不动颜色：
    //   RenderPass（线性 HDR —— three 只在直绘画布时做 ACES，进 RT 后
    //     材质不再 tone map，所以末端必须补一个 OutputPass）
    //   → GTAOPass（AO 乘在亮部上，接触处自然压暗）
    //   → UnrealBloom（极弱，只让亮部有点光晕）
    //   → Vignette（四周轻微压暗，视线聚焦）
    //   → OutputPass（ACES 曝光 0.62 + sRGB —— 和原直绘管线逐位对齐；
    //      背景色为此存了逆像补偿，见文件头 BG_DAY）
    // 加载失败（CDN 拉不到模块等）就静默回退直绘，房间照常能用。
    var ppBusy = false;
    var baseRender = renderer.render.bind(renderer);
    renderer.render = function (sc, cam) {
      if (composer && !ppBusy && sc === scene && cam === camera) {
        ppBusy = true;
        try { composer.render(); } finally { ppBusy = false; }
      } else {
        baseRender(sc, cam);
      }
    };
    var baseSetSize = renderer.setSize.bind(renderer);
    renderer.setSize = function (w, h, updateStyle) {
      if (composer) composer.setSize(w, h);
      return baseSetSize(w, h, updateStyle);
    };

    var ppBuf = renderer.getDrawingBufferSize(new THREE.Vector2());
    // 手机上跳过后期处理（GTAO + Bloom 太耗 GPU，手机跑不动）
    if (isMobile) {
      baseRender(scene, camera);
      return;
    }
    Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/GTAOPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/ShaderPass.js'),
      import('three/addons/shaders/VignetteShader.js'),
      import('three/addons/postprocessing/OutputPass.js')
    ]).then(function (m) {
      if (destroyed) return;
      var EC = m[0], RP = m[1], GT = m[2], UB = m[3], SP = m[4], VS = m[5], OP = m[6];
      var comp = new EC.EffectComposer(renderer);
      // MSAA：直绘时画布自带 antialias，走 RT 后要给 composer 的缓冲开 4x
      comp.renderTarget1.samples = 4;
      comp.renderTarget2.samples = 4;
      comp.addPass(new RP.RenderPass(scene, camera));
      var gtao = new GT.GTAOPass(scene, camera, ppBuf.x, ppBuf.y);
      gtao.output = GT.GTAOPass.OUTPUT.Default;
      gtao.updateGtaoMaterial({
        radius: 0.35,           // 世界半径：家具腿、靠垫这些接触尺度
        distanceExponent: 1.6,
        thickness: 1.0,
        scale: 0.9,             // AO 强度，0.9 克制一点不脏
        samples: 16,
        distanceFallOff: 1.0,
        screenSpaceRadius: false
      });
      comp.addPass(gtao);
      var bloom = new UB.UnrealBloomPass(new THREE.Vector2(ppBuf.x, ppBuf.y), 0.20, 0.55, 1.0);
      comp.addPass(bloom);
      var vig = new SP.ShaderPass(VS.VignetteShader);
      vig.uniforms.offset.value = 1.15;
      vig.uniforms.darkness.value = 0.75;
      comp.addPass(vig);
      comp.addPass(new OP.OutputPass());
      var cssSize = renderer.getSize(new THREE.Vector2());
      comp.setSize(cssSize.x, cssSize.y);
      composer = comp;
    }).catch(function (err) {
      console.warn('[bedroom] 后期链加载失败，回退直绘:', err);
      composer = null;
    });

    // -----------------------------------------------------------------
    // HUD 按钮逻辑
    // -----------------------------------------------------------------
    // 和厨房一致：状态存在场景层，HUD 只负责标记。
    var L = geoArgs.lights || {};
    var lampLight = geoArgs.lampLight || null;

    // 几何体里已经乘过 π 的"白天"强度，夜晚从这里按比例往下压。
    var DAY = {
      sun: L.sun ? L.sun.intensity : 0,
      hemi: L.hemi ? L.hemi.intensity : 0,
      fill: L.fill ? L.fill.intensity : 0
    };
    var NIGHT = { sun: DAY.sun * 0.10, hemi: DAY.hemi * 0.42, fill: DAY.fill * 0.5 };

    // 提示条：显示/淡出的时序在 scene-base.js，卧室只提供默认文案
    // （淡出时要把操作提示写回去，不然提示条空着，用户不知道怎么操作）。
    notifier = base.makeToast({
      getHost: function () { return host; },
      defaultText: '拖动平移视角 · 右键旋转 · 点地板走动'
    });
    function showNotification(txt) { notifier.show(txt); }

    var isDaylight = true;
    var isLampOn = true;
    var isCozy = false;

    function setMood(isDay) {
      isDaylight = isDay;
      var icon = host.querySelector('#bd-mood-icon');
      var text = host.querySelector('#bd-mood-text');
      var btn = host.querySelector('#bd-mood');
      var tgt = isDay ? DAY : NIGHT;

      if (icon) icon.textContent = isDay ? '☀️' : '🌙';
      if (text) text.textContent = isDay ? '午后暖阳' : '夜晚小灯';
      if (btn) btn.classList.toggle('bd-btn-on', isDay);

      // 夜间把阳光调暗、天空光调暖；场景背景同步压暗，
      // 否则暖色房间配亮背景会像白天。用 makeBg 算好的线性值。
      var bg = scene.background;
      var tgtBg = isDay ? BG_DAY : BG_NIGHT;
      new TWEEN.Tween(bg).to({ r: tgtBg.r, g: tgtBg.g, b: tgtBg.b }, 800).start();
      if (L.sun) new TWEEN.Tween(L.sun).to({ intensity: tgt.sun }, 800).start();
      if (L.hemi) new TWEEN.Tween(L.hemi).to({ intensity: tgt.hemi }, 800).start();
      if (L.fill) new TWEEN.Tween(L.fill).to({ intensity: tgt.fill }, 800).start();

      showNotification(isDay ? '已切换：午后暖阳模式 ☀️' : '已切换：夜晚小灯模式 🌙');
    }

    function toggleMood() { setMood(!isDaylight); }

    function toggleLamp() {
      isLampOn = !isLampOn;
      var btn = host.querySelector('#bd-lamp');
      if (btn) btn.classList.toggle('bd-btn-on', isLampOn);
      if (lampLight) {
        // 灯罩和灯泡也跟着暗下来，不然关了灯灯罩还是亮的，看着假。
        // 只处理有 emissive 的材质（灯罩 + 灯泡），地面和家具不动。
        new TWEEN.Tween(lampLight).to({
          intensity: isLampOn ? geoArgs.lampDay : 0
        }, 400).start();
        var g = lampLight.parent;
        if (g) {
          g.traverse(function (o) {
            if (!o.isMesh || !o.material || !o.material.emissive) return;
            // 第一次进来时把原值记下来，后面直接用它当恢复目标
            if (o.material.userData.emissiveDay === undefined) {
              o.material.userData.emissiveDay = o.material.emissiveIntensity;
            }
            new TWEEN.Tween(o.material).to({
              emissiveIntensity: isLampOn ? o.material.userData.emissiveDay : 0
            }, 400).start();
          });
        }
      }
      showNotification(isLampOn ? '落地灯亮起来了 💡' : '落地灯已关');
    }

    function toggleCozy() {
      isCozy = !isCozy;
      var btn = host.querySelector('#bd-glow');
      if (btn) btn.classList.toggle('bd-btn-on', isCozy);
      // 只动曝光度，不动灯 —— 这是最不破坏原本配色的柔化方式。
      new TWEEN.Tween(renderer)
        .to({ toneMappingExposure: isCozy ? 0.42 : 0.62 }, 700)
        .start();
      showNotification(isCozy ? '调暗一档，适合夜里看 🌙' : '恢复原本亮度 ✨');
    }

    // ---- 窗扇开合 + 窗帘开合 HUD ----
    var winOpen = false;
    var curtainOpen = true;   // 默认已抽开（帘子收在两侧）
    var sashL = geoArgs.sashL || null;
    var sashR = geoArgs.sashR || null;
    var curtainRig = geoArgs.curtain || null;
    var curSheer = geoArgs.sheer || null;
    // 各自的原始 x。窗扇靠平移错开，窗帘靠几何体重算顶点。
    var sashL_x0 = sashL ? sashL.position.x : 0;
    var sashR_x0 = sashR ? sashR.position.x : 0;
    var sashL_w = geoArgs.sashW || 0;
    var sashR_w = geoArgs.sashW || 0;
    var sashTweenL = null;
    var sashTweenR = null;
    // curtainOpen = true 表示「帘子已抽开」。几何体默认建成闭合状态（shape(0)），
    // 这里同步一次初始状态，否则按钮亮着「开」但帘子其实是合上的。
    // 无条件调一次 setOpen —— 合上时也别去依赖几何体碰巧建对了。
    var curtainT = curtainOpen ? 1 : 0;
    var curtainTL = curtainT, curtainTR = curtainT;
    var curtainTween = null;
    if (curtainRig) curtainRig.setOpen(curtainT, 0, 0, 0);

    function toggleWindow() {
      winOpen = !winOpen;
      var btn = host.querySelector('#bd-win');
      if (btn) btn.classList.toggle('bd-btn-on', winOpen);
      // 推拉窗：左扇固定，右扇滑过去叠在左扇后面。只开左边一半。
      //
      // 真窗就是这样——只有一扇能活动，另一扇是固定的。
      // 两扇的前后轨道差 0.07，所以叠在一起只是前后错开、不会真撞上。
      // 之前试过的几种都不行，记一下免得又绕回去：
      //   A. 两扇往左右两边抽 —— 各自那条加粗边框压在窗洞左右端，
      //      室内左右各杵一道竖框，又难看又穿模。
      //   B. 往左抽一点留条缝 —— 缝太窄，开没开几乎看不出来。
      //
      // 现在右扇整个滑到左扇位置，右侧空出半个窗洞。
      // 只出现一条竖边（后面那扇的），不会两边各杵一道。
      // 连点要打断上一条，否则两条 tween 同时写 position.x 会打架
      if (sashTweenL) sashTweenL.stop();
      if (sashTweenR) sashTweenR.stop();
      if (sashL) {
        sashTweenL = new TWEEN.Tween(sashL.position)
          .to({ x: sashL_x0 }, 900)
          .easing(TWEEN.Easing.Cubic.InOut)
          .start();
      }
      if (sashR) {
        sashTweenR = new TWEEN.Tween(sashR.position)
          .to({ x: winOpen ? sashL_x0 : sashR_x0 }, 900)
          .easing(TWEEN.Easing.Cubic.InOut)
          .start();
      }
      showNotification(winOpen ? '右扇滑开，窗开着 🪟' : '窗合上了');
    }

    function toggleCurtain() {
      curtainOpen = !curtainOpen;
      var btn = host.querySelector('#bd-curtain');
      if (btn) btn.classList.toggle('bd-btn-on', curtainOpen);

      // 手拉布逻辑：一整幅布从中间向两侧抽 / 向中间合。
      // 不能用 scale.x：那会把正弦褶皱一起拉宽压平，收拢处像抻平的塑料布。
      var tgt = curtainOpen ? 1 : 0;
      var dir = curtainOpen ? 1 : -1;
      var DUR = 1500;

      // 连点要打断上一次，否则两条 tween 同时写进度，动作会叠在一起
      if (curtainTween) curtainTween.stop();

      // k 是线性时间 0→1（ sway / lift / drag 都吃它，保证节奏按真实时间走）。
      // 位移另用 easeInOutCubic(k) 算，动静分离：之前 v 和 p 共用一个 Cubic，
      // 中段被加速、摆动包络也被压扁，看着就像推拉门。
      function easeInOutCubic(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
      function clamp01(x) { return x > 1 ? 1 : (x < 0 ? 0 : x); }
      var startL = curtainTL, startR = curtainTR;
      // 进度必须用闭包里的 st 读，不能写 this.v ——
      // 这个 tween.js 调 onUpdate 时不把 Tween 挂到 this 上，this.v 是
      // undefined；setOpen(undefined) 会算出 NaN 顶点，整片帘子不渲染，
      // 而且不报错（只是凭空消失）。之前窗帘一直不动就是栽在这里。
      var st = { k: 0 };
      curtainTween = new TWEEN.Tween(st)
        .to({ k: 1 }, DUR)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function () {
          var k = clamp01(st.k);
          // 右幅领跑约 90ms，左幅追上：破除完全对称的 CG 感，中断续播也不跳变
          var eR = easeInOutCubic(k);
          var eL = easeInOutCubic(clamp01(k * 1.12 - 0.06));
          var vR = startR + (tgt - startR) * eR;
          var vL = startL + (tgt - startL) * eL;
          curtainTL = vL; curtainTR = vR; curtainT = (vL + vR) / 2;
          // 一次大幅摆 + 一次小幅余纹，到 k=1 归零；幅度给到 11cm，正交相机下才看得见。
          // 左右幅差 15%，不同步才像两块布。
          var swayBase = dir * (0.11 * Math.sin(k * Math.PI * 2) * (1 - k * 0.5)
            + 0.035 * Math.sin(k * Math.PI * 5) * (1 - k) * (1 - k));
          // 下摆提起 9cm 再落下 + 底部位置滞后 14cm，中段布挤在一起的顿挫感
          var lift = Math.sin(k * Math.PI) * 0.09;
          var drag = dir * 0.14 * Math.sin(k * Math.PI);
          if (curtainRig) curtainRig.setOpen([vL, vR], [swayBase, swayBase * 0.85], lift, drag);
        })
        .onComplete(function () {
          curtainTween = null;
          curtainTL = curtainTR = curtainT = tgt;
          // 这里用精确终值归位，比 onUpdate 里读到的那次更准
          if (curtainRig) curtainRig.setOpen(tgt, 0, 0, 0);
        })
        .start();

      // 薄纱是窗上的一层纱，一直在，只是被窗帘盖住时存在感变低。
      if (curSheer) {
        curSheer.visible = true;
        new TWEEN.Tween(curSheer.material)
          .to({ opacity: curtainOpen ? 0.28 : 0.12 }, 700)
          .start();
      }
      showNotification(curtainOpen ? '窗帘抽开了 🌇' : '窗帘合上了 🌙');
    }

    function resetView() {
      if (!camera || !controls) return;
      camera.position.copy(defaultCamPos);
      camera.zoom = 1;
      controls.target.copy(defaultLookAt);
      controls.update();
      fitCamera();
      showNotification('视角已重置 ↺');
    }

    // 房间来回切，容器 innerHTML 被重建过，按钮节点全部换新 —— 所以
    // rebind 要能整体拆掉重来。卧室的两个开关（stopPropagation + 记录
    // handler）都由 scene-base 提供，厨房那边是另一组取值。
    hudBinder = base.makeHudBinder({
      getHost: function () { return host; },
      stopPropagation: true,
      track: true
    });
    function rebindHudButtons() {
      hudBinder.rebind([
        ['#bd-mood', toggleMood],
        ['#bd-lamp', toggleLamp],
        ['#bd-glow', toggleCozy],
        ['#bd-win', toggleWindow],
        ['#bd-curtain', toggleCurtain],
        ['#bd-reset', resetView],
        ['#bd-char-girl', function () { selectChar('girl'); }],
        ['#bd-char-ghost', function () { selectChar('ghost'); }]
      ]);
    }
    function selectChar(id) {
      if (global.HomeCharacter3D && global.HomeCharacter3D.selectCharacter) {
        global.HomeCharacter3D.selectCharacter(id);
        updateCharButtons();
      }
    }
    function updateCharButtons() {
      var sel = global.HomeCharacter3D ? global.HomeCharacter3D.getSelectedId() : null;
      var bg = host.querySelector('#bd-char-girl');
      var bgh = host.querySelector('#bd-char-ghost');
      if (bg) bg.classList.toggle('bd-btn-on', sel === 'girl');
      if (bgh) bgh.classList.toggle('bd-btn-on', sel === 'ghost');
    }
    rebindHudButtons();

    // ---- resize ----
    // 正交相机没有 aspect，取景由 fitCamera() 按容器尺寸重算。容器尺寸在
    // 刚 inject HUD 之后可能还是 0，所以要连续重试，拿到真实尺寸为止。
    // 重试计数和"没取到景就再试"的逻辑在 scene-base 的 watcher 里，
    // animate 每帧通过 tickRetry 推一把 —— 只靠 resize 事件的话，注入后
    // 那次失败就再也没人重试了。
    resizeWatcher = base.makeResizeWatcher({
      getHost: function () { return host; },
      fit: fitCamera,
      guard: function () { return !!(host && renderer && camera); },
      maxRetry: 30
    });

    // ---- 动画循环 ----
    // 3D 小人已下线，这里只转场景；人物由 2D 覆盖层（.home-person）渲染。
    // 每帧固定那几步（TWEEN 推进、controls 阻尼、渲染）在 scene-base，
    // 这里只交代"什么时候算死"和"每帧还要额外做什么"。
    loop = base.createLoop({
      isAlive: function () { return !destroyed && !!renderer && !!scene; },
      onFrame: function () { resizeWatcher.tickRetry(); },
      TWEEN: TWEEN,
      controls: controls,
      camera: camera,
      scene: scene,
      renderer: renderer
    });
    loop.start();

    // 顺序和拆分前一致：先起循环，再挂 resize，最后手动跑一次取景。
    resizeWatcher.add();
    resizeWatcher.handler();

    // ---- 世界坐标 -> 屏幕像素 ----
    // room-view-3d.js 用它把互动结果贴在点中的 3D 家具旁边。
    // 换算公式在 scene-base，这里只交代"相对哪个元素定位"—— 必须是最
    // 外层 .home-room（泡泡是它的子节点），不能用 host（.bedroom-embed
    // 有 bottom:58px，尺寸和位置都不同，用它泡泡会偏）。
    var projectToScreen = base.makeProjector({
      THREE: THREE,
      getCamera: function () { return camera; },
      getScene: function () { return scene; },
      getRectTarget: function () { return document.querySelector('.home-room'); }
    });
    if (global.Home3DRoom) {
      global.Home3DRoom.setProjector(projectToScreen, { roomId: 'bedroom' });
    }

    // ---- 3D 人物插槽 ----
    // 场景建好了才挂人。必须在 renderHome 之后（异步）调用 ——
    // 同步问的话此刻场景还不存在。
    if (typeof global.mountHomeCharacter3D === 'function') {
      global.mountHomeCharacter3D('bedroom', scene);
      // 挂载完成后同步角色切换按钮状态
      setTimeout(updateCharButtons, 100);
    }

    // ---- 衣柜开合（点衣柜先开关门，再弹动作泡泡）----
    var wardrobeOpen = false;
    var wardrobeTweenL = null;
    var wardrobeTweenR = null;
    function toggleWardrobe() {
      var wd = geoArgs.wardrobe;
      if (!wd || !wd.doorL || !wd.doorR) return;
      wardrobeOpen = !wardrobeOpen;
      wd.open = wardrobeOpen;
      if (wardrobeTweenL) wardrobeTweenL.stop();
      if (wardrobeTweenR) wardrobeTweenR.stop();
      // 左门轴在 z0 侧向 +z 伸，开门往 +x 转取正；右门镜像取负。约 106 度。
      wardrobeTweenL = new TWEEN.Tween(wd.doorL.rotation)
        .to({ y: wardrobeOpen ? 1.85 : 0 }, 900)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
      wardrobeTweenR = new TWEEN.Tween(wd.doorR.rotation)
        .to({ y: wardrobeOpen ? -1.85 : 0 }, 900)
        .easing(TWEEN.Easing.Cubic.InOut)
        .start();
      showNotification(wardrobeOpen ? '衣柜打开了 👗' : '衣柜合上了');
    }

    // ---- 拾取 ----
    function openFurniture(fid, hitPoint) {
      if (fid === 'fur-wardrobe') toggleWardrobe();
      if (hitPoint && global.HomeCharacter3D) {
        // 卧室是 3D 房间：点地板把 3D 人物移过去。
        // 3D 人物位置由 character-3d.js 自己在场景里处理，
        // 这里只给世界坐标。
        // y 用实际命中高度，不要写死 0 —— 地毯、蒲团是浮在地板上的几层，
        // 写死 0 站在上面会陷进去。
        global.HomeCharacter3D.setPosition({ x: hitPoint.x, y: hitPoint.y, z: hitPoint.z });
      }
      if (typeof global.openFurniture === 'function') global.openFurniture(fid, hitPoint);
    }
    global.bedroom3DOpenFurniture = openFurniture;

    // 只在点击时算交点，拖动不触发（拖动是转视角）
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var pointerDownPos = { x: 0, y: 0 };
    var pointerMoved = false;
    var onPointerDown = function (e) {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
      pointerMoved = false;
    };
    var onPointerMove = function (e) {
      var dx = e.clientX - pointerDownPos.x;
      var dy = e.clientY - pointerDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 8) pointerMoved = true;
    };
    var onPointerUp = function (e) {
      if (pointerMoved) return;
      var rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      var intersects = raycaster.intersectObjects(scene.children, true);
      if (!intersects.length) return;
      var hit = intersects[0];

      // 点中人物 = 选中该角色（之后点地板只走选中的）
      if (global.HomeCharacter3D) {
        var roles = global.HomeCharacter3D.getRoles();
        for (var ri = 0; ri < roles.length; ri++) {
          var rid = roles[ri];
          var rad = global['HomeCharacter3D' + rid.charAt(0).toUpperCase() + rid.slice(1)];
          if (rad && rad.root) {
            var charRoot = rad.root();
            if (charRoot && base.isUnder(hit.object, charRoot)) {
              global.HomeCharacter3D.selectCharacter(rid);
              return;
            }
          }
        }
      }

      var obj = hit.object;
      // 家具 id 标在 mesh.userData.fid 上，向上找最近的带 id 的祖先
      var fid = null;
      while (obj) {
        if (obj.userData && obj.userData.fid) { fid = obj.userData.fid; break; }
        obj = obj.parent;
      }
      if (fid) {
        openFurniture(fid, hit.point);
      } else if (global.Home3DRoom && global.Home3DRoom.isFloorHit(hit, scene)) {
        // 点地面：只让选中的角色走过去
        global.Home3DRoom.moveCharacterTo(hit.point);
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    pointerHandlers = { onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp };
  }

  function resetBedroom3DView() {
    if (!camera || !controls) return;
    camera.position.set(12.5, 13.05, 12.5);
    camera.zoom = 1;
    controls.target.set(0, 3.0, 0);
    controls.update();
  }

  function destroyBedroom3D() {
    // 场景没了，投影函数必须撤掉 —— 它闭包引用了即将 dispose 的 camera
    if (global.Home3DRoom) global.Home3DRoom.clearProjector();
    // 3D 人物挂在场景里，销毁前先摘掉，否则残留孤儿 mesh。
    // 她的 geometry 跨实例共享，所以只能走 HomeCharacter3D.dispose()，
    // 不能进下面的 disposeSceneObjects。
    if (global.HomeCharacter3D) global.HomeCharacter3D.dispose();
    destroyed = true;
    if (initTimer) { clearTimeout(initTimer); initTimer = null; }
    initAttempts = 0;
    // PMREM 的 render target 不在 scene.traverse 覆盖范围内，得单独释放
    // 穿衣镜 Reflector 的 target 也一样（有 dispose 就调，没有就跳过）
    if (geoArgs && geoArgs.envRenderTarget) {
      geoArgs.envRenderTarget.dispose();
    }
    if (geoArgs && geoArgs.mirrorReflector && typeof geoArgs.mirrorReflector.dispose === 'function') {
      try { geoArgs.mirrorReflector.dispose(); } catch (e) {}
    }
    if (geoArgs) geoArgs = null;    if (loop) { loop.stop(); loop = null; }
    var cv = document.querySelector('.home-room.bedroom canvas.bd-canvas');
    if (cv && pointerHandlers) {
      cv.removeEventListener('pointerdown', pointerHandlers.onPointerDown);
      cv.removeEventListener('pointermove', pointerHandlers.onPointerMove);
      cv.removeEventListener('pointerup', pointerHandlers.onPointerUp);
    }
    pointerHandlers = null;
    if (hudBinder) { hudBinder.unbind(); hudBinder = null; }
    if (resizeWatcher) { resizeWatcher.remove(); resizeWatcher = null; }
    if (notifier) { notifier.dispose(); notifier = null; }
    if (controls) { controls.dispose(); controls = null; }
    if (composer) { try { composer.dispose(); } catch (e) {} composer = null; }
    if (renderer) { renderer.dispose(); renderer = null; }
    base.disposeSceneObjects(scene);
    scene = null;
    camera = null;
  }

  global.initBedroom3D = initBedroom3D;
  global.destroyBedroom3D = destroyBedroom3D;
  global.resetBedroom3DView = resetBedroom3DView;
})(window);
