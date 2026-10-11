/* ============================================================
 * js/home/character-3d-girl.js — 家园 3D 人物：卡通女孩（GLB）
 * ============================================================
 *
 * 接在 character-3d.js 那个空插槽上。房间层（bedroom-scene.js /
 * room-view-3d.js）只认 mount / setPosition / setPose / setConfig / dispose
 * 这五个方法，这里实现它们，另加一个 tick（自带 rAF 循环，走路摆动用）。
 *
 * 模型
 * ----
 * free_stylized_cartoon_girl_rigged_character (1).glb
 *   18,565 三角面 / 24 网格 / 23 材质 / 29 张内嵌贴图 / 172 根骨骼 / 10.0 MB
 *   几何体很轻，10.0 MB 里 99% 是那 29 张贴图。
 *   animations 里只有一个空壳（没有通道），没有可播的剪辑，
 *   所以姿势是直接转骨骼摆出来的。
 *
 * 实测数据（离线读 GLB 的 JSON 块 + 运行时读骨骼，不是猜的）
 *   原始包围盒  X -63.9…63.9   Y 11.5…169.8   Z -25.3…12.1（glTF 本地单位，约 95 单位 = 1 米）
 *   朝向：眼球最前端在 +Z（Std_Eye_R 的 Z 是 -3.1…+0.9），长发拖到 -25.3
 *         → 面朝 +Z。脸的左半（+X 侧）是 CC 骨架的 L 骨。
 *   bind pose 是**30° 斜下的 A 字手**，不是 T 字（我一开始按网格 X 伸到 ±63.7
 *   误判成 T 字，量了骨骼才发现上臂 bind 指向是 [0.87,-0.50,0]）。
 *   腿本来就是直的、bind 时脚朝前，所以站姿只需要处理胳膊。
 *
 * 骨骼层级里插了 _scaleCompensation 中间节点
 * ---------------------------------------
 * Maya / Reallusion 的导出会在骨骼之间塞一个 xxx_scaleCompensation 的普通
 * Object3D（不是 Bone）。所以 CC_Base_L_Upperarm_050 的父节点不是锁骨，
 * 而是 CC_Base_L_Upperarm_050_scaleCompensation。
 * 任何"按名字查父骨骼 bind 朝向"的写法在这里都会拿到 null ——
 * applyPose 的注释里写了这件事具体怎么炸的。
 *
 * 姿势系统
 * --------
 * 规则有两种，可以混着用：
 *   [骨骼, 目标世界方向]                  把这根骨骼从当前 bind 指向旋到指定的世界方向
 *   [骨骼, null, null, [x,y,z,弧度]]      额外绕世界轴转一点（小幅转动用方向表达不了）
 *   [骨骼, null, [x,y,z]]                 位置偏移（父节点局部空间，glTF 本地单位）
 * 骨骼可以是 PAIR 里的 '…LR'（左右各一根，右边自动镜像）、BONE 里的键、
 * 或者完整骨骼名。
 *
 * 不依赖"骨骼本地轴朝哪个方向"这种各家不同的约定，而是实时量：
 *   bindDir[骨] = 子骨骼里离得最远那根的世界位置 − 自己的世界位置
 *   （取最远那根而不是第一个 —— CC 骨架有一堆 xxx_0 和 ShareBone，
 *     和父骨骼几乎重合，方向算出来是噪声）
 *
 * 摆之前先把全部 172 根骨骼的局部四元数/位置还原成 bind —— 姿势是叠加上去的，
 * 不会越摆越歪。还原用 copy() 不是 clone()，走路时每帧要跑十几次。
 *
 * 朝向与位置
 * ----------
 * holder（缩放 + 落地 + 居中）和 turn（绕 Y 转）分开：
 * bind 的世界朝向是在 turn 还是 0 的时候量的，姿势也在这个规范坐标系里算，
 * 之后 turn 整个转过去。所以改朝向不会把已经摆好的姿势弄歪，
 * 也意味着 setPosition 不会碰朝向。
 *
 * 缩放
 * ----
 * 归一化放在 holder 上，不直接改 gltf.scene 的 scale：
 * 骨骼是 holder 的后代，蒙皮照常工作（three 会算 bone.matrixWorld × boneInverse）。
 *
 * 缓存
 * ----
 * 整个页面生命周期只解析一次，10 MB 重新 parse 一次要好几秒。
 * dispose 只把 holder 从场景摘下来，绝不 traverse + dispose ——
 * 骨骼模型的 geometry / material 是跨实例共享的，dispose 掉整个模型就废了
 * （character-3d.js 顶部专门写过这条，bedroom-scene.js 也是先摘人物再清场景）。
 *
 * 已知坑
 * ------
 * - index.html 里 THREE.ColorManagement.enabled = false，
 *   所以 GLTFLoader 给贴图设的 SRGBColorSpace 不会转到工作空间，
 *   人物会比房间其余部分（用的 MeshStandardMaterial）偏亮、偏平。
 *   这是有意接受的：卧室的调色板是按 sRGB 输出调的，改管线会连房间一起变。
 * - 必须走 http。file:// 下 fetch .glb 会被 CORS 挡掉，
 *   所以直接双击 index.html 看不到人物，要用 Live Server 之类起服务
 *   （项目根目录有 serve.js）。
 *
 * 已知技术债：厨房 scene 复用
 * ------------------------------------------------------------
 * kitchen-scene.js 的小厨房 scene 用 `inst` 缓存（30 秒内切回直接 attach 复用，
 * 正常情况下不销毁）。而人物是跟随房间切换销毁的（switchRoom → destroyBedroom3D
 * → HomeCharacter3D.dispose()）。这两套生命周期没对齐：小厨房二次进入走
 * `if (inst)` 缓存路径时，没有重新调用 mountHomeCharacter3D，人物就没了。
 *
 * 现在的修法是在 kitchen-scene.js 的缓存路径里补了一行 mount。它能跑，
 * 但是个补丁：以后再加"scene 复用"的 3D 房间，这个遗忘会原样复现。
 *
 * 从根修应该是：任何持久化 scene 的房间，都要在缓存复用路径里重新挂人物
 *（或干脆让人物挂载/销毁也跟 scene 缓存走同一套判断）。动手时一起改。
 * ============================================================ */
(function (global) {
  'use strict';

  // ------------------------------------------------------------
  // 常量
  // ------------------------------------------------------------

  // 文件名里不要留空格和括号 —— 原来叫 "free_stylized_cartoon_girl_rigged_character (1).glb"，
  // URL 编码之后很容易在某一环被截断，已改名成 character-girl.glb。
  var MODEL_URL = 'character-girl.glb?v=20261007j';

  // 真实人类身高（米）。这一项是有实际含义的，mySize 也按米换算。
  var BASE_H = 1.66;
  var MY_SIZE_DEFAULT = 11;
  var MY_SIZE_MIN = 6;
  var MY_SIZE_MAX = 40;

  // 每个房间相对真实房间放大多少倍，**按房间分开算**。
  //
  //   卧室  净高 6.5 单位 ≈ 2.8 m  → 2.32
  //         床长 5.1 单位 ≈ 2.05 m → 2.49
  //         衣柜 4.48 单位 ≈ 2.2 m → 2.04      ⇒ 2.30
  //
  //   厨房  净高 5.6 单位 ≈ 2.8 m  → 2.00
  //         开间 7.5 单位 ≈ 3.6 m  → 2.08      ⇒ 2.00
  //
  // 之前只有一个 ROOM_SCALE = 2.30，两个房间共用。厨房本来就小一圈，
  // 用 2.30 的话人在厨房里比该有的高度高 15% —— 和在卧室里偏小是同一个毛病的镜像。
  //
  // 高度、宽度、椅子、门把手在房间内都按同一倍数放大过，所以按壳体（净高/开间）
  // 换算比按单件家具准。改房间尺寸时这两个数要跟着重算。
  var ROOM_SCALE_BY_ROOM = { bedroom: 2.30, smallkitchen: 2.00 };
  var ROOM_SCALE_FALLBACK = 2.30;

  // 当前所在房间。mount() 里第一时间设好，roomHeight() 靠它选比例。
  var activeRoomId = null;

  function roomScale() {
    return ROOM_SCALE_BY_ROOM[activeRoomId] || ROOM_SCALE_FALLBACK;
  }
  function roomHeight() { return BASE_H * roomScale() * sizeScale(); }

  // 归一化偏移必须跟着当前缩放走。
  // holder.position = -包围盒 min/max × k，里面的 k 是"当前"的缩放系数。
  // 一开始我把 k 算死成加载时的值，结果 setConfig 改大小时人就会脱离地板：
  // mySize 24 → 浮起 0.33，mySize 6 → 陷进去 0.13。
  function syncHolder() {
    if (!cached || !cached.place) return;
    var k = cached.holder.scale.y;
    var b = cached.bbox, c = cached.bboxCenter;
    cached.holder.position.set(-c.x * k, -b.min.y * k, -c.z * k);
  }

  // 默认站位，按房间分开。
  //
  // y 不写死 —— 往下打射线找真正的表面（见 surfaceY）。
  //
  // 坐标是从对应房间的布局里量出来的，改家具布局时要跟着改：
  //
  // 卧室（SIZE 11，墙在 ±5.5）
  //   床 x -4.25…-0.85 / z -4.55…0.55（床往前挪了 0.6 给窗帘），地毯中心 (1.0, 1.4)
  //   → (1.6, 1.8) 在地毯上、扶手椅旁，周围没家具
  //
  // 小厨房（ROOM_W 7.5，墙在 ±3.75）
  //   岛台 islandGroup 在 (-0.7, 1.6)，iW 3.95 → x 占 -2.68…1.28
  //   两把椅子在岛台 +z 侧（世界 x -1.75 和 -0.2，z 2.84）
  //   灶台在右侧 x ≈ 3.3，冷藏柜在左侧 x ≈ -2.7，都在 -z 那半边
  //   → 岛台右边 = x 1.6…2.2 那一带，是唯一没家具的空地
  var DEFAULT_POS = {
    bedroom:     { x: 1.6, z: 1.8 },
    smallkitchen: { x: 2.0, z: 1.5 }
  };
  var FALLBACK_POS = { x: 1.6, z: 1.8 };
  function defaultPos(roomId) { return DEFAULT_POS[roomId] || FALLBACK_POS; }

  // 没给 personPos 时的默认朝向。微微侧身，像在房间里站着发呆，不像在摆拍。
  var DEFAULT_YAW = -0.42;

  // Reallusion CC Base 骨架（172 根），这里只列摆姿势用到的
  var BONE = {
    pelvis: 'CC_Base_Pelvis_03',
    hip:    'CC_Base_Hip_02',
    spine:  'CC_Base_Spine02_035',
    neck:   'CC_Base_NeckTwist01_036',
    head:   'CC_Base_Head_038',

    thighL: 'CC_Base_L_Thigh_04',  thighR: 'CC_Base_R_Thigh_019',
    calfL:  'CC_Base_L_Calf_05',   calfR:  'CC_Base_R_Calf_020',
    footL:  'CC_Base_L_Foot_06',   footR:  'CC_Base_R_Foot_022',

    clavL: 'CC_Base_L_Clavicle_049', clavR: 'CC_Base_R_Clavicle_077',
    armL:  'CC_Base_L_Upperarm_050', armR: 'CC_Base_R_Upperarm_078',
    foreL: 'CC_Base_L_Forearm_051',  foreR: 'CC_Base_R_Forearm_079',
    handL: 'CC_Base_L_Hand_055',     handR: 'CC_Base_R_Hand_083'
  };

  // 键 → 左右两根骨骼。'…LR' 的键展开时右边那根自动把方向的 X 取反
  //（前提是姿势左右对称，下面这几个都是）。
  var PAIR = {
    thighLR: [BONE.thighL, BONE.thighR],
    calfLR:  [BONE.calfL,  BONE.calfR],
    footLR:  [BONE.footL,  BONE.footR],
    clavLR:  [BONE.clavL,  BONE.clavR],
    armLR:   [BONE.armL,   BONE.armR],
    foreLR:  [BONE.foreL,  BONE.foreR],
    handLR:  [BONE.handL,  BONE.handR]
  };

  // 规则有两种，现在可以混着用：
  //   [键, 方向]              把这根骨骼从 bind 指向旋到指定的世界方向
  //   [键, null, null, [x,y,z,弧度]]  在 bind 姿态上再绕世界轴转一点
  //                                  （"绕竖轴轻转 10°"这种用方向表达不了，只能这么做）
  // 键是 PAIR 里的 '…LR'、BONE 里的单骨骼名，或者完整骨骼名。
  //
  // 站姿的基础规则。别的姿势都在这上面追加。
  //
  // 实测 bind 指向（角色面朝 +z，+x 是她的左侧）：
  //   上臂 [ 0.87,-0.50, 0.00]  ← bind 就是 30° 斜下的 A 字手，不是 T 字
  //   小臂 [ 0.87,-0.49, 0.00]
  //   手   [ 0.86,-0.43, 0.28]
  //   大腿 [ 0.00,-1.00,-0.02]  ← 腿本来就是直的，站姿不用动
  //   脚   [ 0.10,-0.24, 0.96]  ← 朝前，站姿不用动
  // 所以站姿只需要把胳膊从 30° 斜下放到自然垂着。
  function standRules() {
    return [
      // 手臂基本垂放，只在肘部略带前摆，像正常站立
      ['armLR',  [0.08, -0.99, 0.04]],
      ['foreLR', [0.06, -0.99, 0.06]],
      ['handLR', [0.05, -0.99, 0.04]],
      // 双腿回到一直向下的方向 —— 保持和走到终点时 walkRules 在振幅为 0
      // 时给出的方向一致，避免从走路切到站立瞬间腿形跳一下
      ['thighLR', legDir(0, 0)],
      ['calfLR',  legDir(0, 0)]
      // 脚掌保持 bind 姿态，不要强制写方向 —— 上一版本直接把脚骨往下压，
      // 结果把原本水平的鞋底转了个角度，鞋子像被埋进了地板里。
    ];
  }

  // 腿的方向：fwd 是前后摆的角度（正 = 向前），side 是左右分开
  function legDir(fwd, side) {
    var x = Math.sin(side || 0);
    var y = -Math.cos(fwd);
    var z = Math.sin(fwd);
    var l = Math.sqrt(x * x + y * y + z * z) || 1;
    return [x / l, y / l, z / l];
  }

  // 位移是 glTF 本地单位（约 95 单位 = 1 米），不是米。
  // 别按米填，否则差 95 倍。
  var POSES = {
    stand: { rules: standRules(), idle: true },

    // 走路：基础站姿 + 按相位叠的摆动（见 walkRules）
    walk: { rules: standRules(), swing: true },

    // 打招呼：右臂举起来，前臂绕世界 Z 轴来回摆
    wave: {
      rules: standRules().concat([
        ['armR',  [-0.34, -0.60, 0.72]],
        ['foreR', [-0.22, -0.22, 0.95]]
      ]),
      waveArm: BONE.foreR
    },

    // 蹲下：大腿抬起来、小腿收回来，手臂前伸找平衡。
    // 髋部下沉 30 本地单位（≈32cm）是估的，没做 IK，脚会陷进地板一点点。
    crouch: {
      rules: standRules().concat([
        ['thighLR', legDir(0.95, 0.07)],
        ['calfLR',  legDir(-0.60, 0)],
        ['armLR',   [0.34, -0.86, -0.38]],
        ['foreLR',  [0.30, -0.80, -0.52]]
      ]),
      offsets: [[BONE.hip, [0, -30, -14]], [BONE.pelvis, [0, -6, -4]]]
    },

    // 坐在床边：大腿向前接近水平、小腿垂下。
    // 脚不单独摆 —— bind 时脚就朝前，坐姿下小腿垂着、脚掌朝前才是对的。
    // 髋部下沉 44 本地单位（≈46cm）大致是床沿高度，同样是估的。
    sit: {
      rules: standRules().concat([
        ['thighLR', legDir(1.45, 0.10)],
        ['calfLR',  legDir(-0.22, 0)],
        ['armLR',   [0.28, -0.90, 0.32]]
      ]),
      offsets: [[BONE.hip, [0, -44, 8]], [BONE.pelvis, [0, -8, 2]]]
    },

    // 睡觉：这里只做"蜷起来靠着"的近似，不是真的躺平。
    // 真躺平要把人物挪到床上再整体绕 X 轴放倒，那是房间层的事
    // （要按家具 id 定位，现在 mesh 上没有 userData.fid，见 README 备注）。
    sleep: {
      rules: standRules().concat([
        ['thighLR', legDir(0.75, 0.10)],
        ['calfLR',  legDir(-1.15, 0)],
        ['armLR',   [0.34, -0.72, 0.60]],
        ['foreLR',  [0.30, -0.80, 0.50]]
      ]),
      offsets: [[BONE.hip, [0, -34, 6]]]
    }
  };

  // 走路的动态规则。必须是"旋转"而不是"方向相加" ——
  // 大腿 bind 时本来就指向正下方，加一个 (0,-1,0.5) 只会越加越朝下。
  function walkRules(s, env) {
    var sw = Math.sin(s) * env;
    return [
      [BONE.thighL, legDir(0.18 * sw, 0.03 * sw)],
      [BONE.thighR, legDir(-0.18 * sw, -0.03 * sw)],
      // 膝盖要在这个步子向前送的时候弯（同时髋颁前送），
      // 不是后摆的时候 —— 后摆是前脚向后时近乎伸直的姿态。
      [BONE.calfL, legDir(0, 0)],
      [BONE.calfR, legDir(0, 0)],
      // 手臂前后轻摆
      [BONE.armL,  [0.10, -0.97, 0.05 - 0.14 * sw]],
      [BONE.armR,  [-0.10, -0.97, 0.05 + 0.14 * sw]],
      // 胯和肩反相轻转
      [BONE.hip,   null, null, [0, 1, 0, 0.08 * sw]],
      [BONE.spine, null, null, [0, 1, 0, -0.06 * sw]]
    ];
  }

  // ------------------------------------------------------------
  // 模块内状态
  // ------------------------------------------------------------

  var cached = null;    // 解析好的模型，全页面复用一次
  var loading = null;   // 正在进行的 Promise，避免并发重复下载
  var live = null;      // 当前挂在场景里的实例

  // ── 走路动画 ───────────────────────────
  // walking.fbx 是 Mixamo 免费下载的普通走路循环。
  // Mixamo 骨架比 CC3+ 骨架多/少几根，又用不同的骨名；
  // remapWalkClip 把它的轨道映射到我们的骨名上，并做绑姿归一化：
  //   ourQ = ourBind * inverse(mixBind) * mixQ
  // 位置轨道只保留 mixamorigHips 的 Y（上下起伏），X/Z 清零——
  // 前进交给 moveTo + walkSpeed 控制。
  var wk_state = {
    clip: null,   // remap 后可在 GLB 上直接播
    mixer: null,
    action: null,
    loadFailed: false,
    fbxRoot: null // walking.fbx 的原始 scene（不渲染）
  };
  var _fbxBindLocal = {};  // Mixamo 骨架绑姿本地旋转
  var _fbxBindPos = {};    // Mixamo 骨架绑姿本地位置
  var rafId = 0;
  var lastT = 0;
  var phase = 0;
  var currentPose = 'stand';
  var moving = false;
  var warnedConfig = false;
  var warnedPersonPos = false;

  // 走动状态（打通 "点地面 → 走过去"）
  // moveTo() 把目标坐标写进来，tick() 每帧推进 place.position，
  // 到达后才切回站立姿势。没有它这里 stand/walk 姿势只在手动切的时候才会变。
  var walking = false;
  var walkTarget = null;     // {x, y, z}
  var walkSpeed = 1.7;       // 和 walking.fbx 的步幅/周期对上（1.63m ÷ 0.97s ≈ 1.68 m/s），太大就会脚滑步
  var walkEnv = 0;           // 摆幅包络：走起时 0→1，到了以后 1→0
  var walkFade = false;      // 是否在衰减振幅（到达终点后慢慢归零，再切回站立）

  function say(state, text) {
    try {
      global.dispatchEvent(new CustomEvent('home:character', {
        detail: { state: state, text: text }
      }));
    } catch (e) { /* 老浏览器没有 CustomEvent，忽略 */ }
    if (state === 'error') console.warn('[home/character-3d-girl] ' + text);
  }

  function mySize() {
    var n = Number(global.state && global.state.home && global.state.home.mySize);
    if (!isFinite(n) || n <= 0) return MY_SIZE_DEFAULT;
    return Math.max(MY_SIZE_MIN, Math.min(MY_SIZE_MAX, n));
  }

  // ------------------------------------------------------------
  // 加载 + 归一化
  // ------------------------------------------------------------

  function loadModel(THREE) {
    if (cached) return Promise.resolve(cached);
    if (loading) return loading;
    if (!global.GLTFLoader) {
      return Promise.reject(new Error('GLTFLoader 没加载（index.html 顶部的 module 没跑成功？）'));
    }

    say('loading', '正在加载 3D 人物…');
    loading = new Promise(function (resolve, reject) {
      new global.GLTFLoader().load(MODEL_URL, function (gltf) {
        try {
          cached = prepare(THREE, gltf);
          // 动作包也顺手开一次加载：有就用真实步态，没有就退化到程序合成
          loadWalkClip(THREE);
          loading = null;
          resolve(cached);
        } catch (e) {
          loading = null;
          reject(e);
        }
      }, undefined, function (err) {
        loading = null;
        var msg = (err && err.message) ? err.message : String(err);
        // file:// 下必然是这个错，写清楚点免得以为是模型坏了
        if (global.location && global.location.protocol === 'file:') {
          msg = '浏览器不允许 file:// 直接读 .glb。请用 Live Server 之类的本地服务器打开（项目根目录有 serve.js）。';
        }
        reject(new Error(msg));
      });
    });
    return loading;
  }

  // Mixamo 骨架名 → 我们 GLB 模型的实际骨骼名。
  // Mixamo 手指有 4 节，我们模型只有 3 节，第 4 节（末节球）不映射、直接丢掉。
  var MIX_TO_CC = {
    // 脊柱 / 头
    mixamorigHips: 'CC_Base_Pelvis_03',
    mixamorigSpine: 'CC_Base_Waist_033',
    mixamorigSpine1: 'CC_Base_Spine01_034',
    mixamorigSpine2: 'CC_Base_Spine02_035',
    mixamorigNeck: 'CC_Base_NeckTwist01_036',
    mixamorigHead: 'CC_Base_Head_038',
    // 左腿
    mixamorigLeftUpLeg: 'CC_Base_L_Thigh_04',
    mixamorigLeftLeg: 'CC_Base_L_Calf_05',
    mixamorigLeftFoot: 'CC_Base_L_Foot_06',
    mixamorigLeftToeBase: 'CC_Base_L_ToeBase_08',
    // 右腿
    mixamorigRightUpLeg: 'CC_Base_R_Thigh_019',
    mixamorigRightLeg: 'CC_Base_R_Calf_020',
    mixamorigRightFoot: 'CC_Base_R_Foot_022',
    mixamorigRightToeBase: 'CC_Base_R_ToeBase_023',
    // 左臂
    mixamorigLeftShoulder: 'CC_Base_L_Clavicle_049',
    mixamorigLeftArm: 'CC_Base_L_Upperarm_050',
    mixamorigLeftForeArm: 'CC_Base_L_Forearm_051',
    mixamorigLeftHand: 'CC_Base_L_Hand_055',
    // 右臂
    mixamorigRightShoulder: 'CC_Base_R_Clavicle_077',
    mixamorigRightArm: 'CC_Base_R_Upperarm_078',
    mixamorigRightForeArm: 'CC_Base_R_Forearm_079',
    mixamorigRightHand: 'CC_Base_R_Hand_083',
    // 左手指（Mixamo 每指 4 节，我们取前 3 节）
    mixamorigLeftHandThumb1: 'CC_Base_L_Thumb1_068',
    mixamorigLeftHandThumb2: 'CC_Base_L_Thumb2_069',
    mixamorigLeftHandThumb3: 'CC_Base_L_Thumb3_070',
    mixamorigLeftHandIndex1: 'CC_Base_L_Index1_065',
    mixamorigLeftHandIndex2: 'CC_Base_L_Index2_066',
    mixamorigLeftHandIndex3: 'CC_Base_L_Index3_067',
    mixamorigLeftHandMiddle1: 'CC_Base_L_Mid1_062',
    mixamorigLeftHandMiddle2: 'CC_Base_L_Mid2_063',
    mixamorigLeftHandMiddle3: 'CC_Base_L_Mid3_064',
    mixamorigLeftHandRing1: 'CC_Base_L_Ring1_059',
    mixamorigLeftHandRing2: 'CC_Base_L_Ring2_060',
    mixamorigLeftHandRing3: 'CC_Base_L_Ring3_061',
    mixamorigLeftHandPinky1: 'CC_Base_L_Pinky1_056',
    mixamorigLeftHandPinky2: 'CC_Base_L_Pinky2_057',
    mixamorigLeftHandPinky3: 'CC_Base_L_Pinky3_058',
    // 右手指
    mixamorigRightHandThumb1: 'CC_Base_R_Thumb1_090',
    mixamorigRightHandThumb2: 'CC_Base_R_Thumb2_091',
    mixamorigRightHandThumb3: 'CC_Base_R_Thumb3_092',
    mixamorigRightHandIndex1: 'CC_Base_R_Index1_093',
    mixamorigRightHandIndex2: 'CC_Base_R_Index2_094',
    mixamorigRightHandIndex3: 'CC_Base_R_Index3_095',
    mixamorigRightHandMiddle1: 'CC_Base_R_Mid1_087',
    mixamorigRightHandMiddle2: 'CC_Base_R_Mid2_088',
    mixamorigRightHandMiddle3: 'CC_Base_R_Mid3_089',
    mixamorigRightHandRing1: 'CC_Base_R_Ring1_084',
    mixamorigRightHandRing2: 'CC_Base_R_Ring2_085',
    mixamorigRightHandRing3: 'CC_Base_R_Ring3_086',
    mixamorigRightHandPinky1: 'CC_Base_R_Pinky1_096',
    mixamorigRightHandPinky2: 'CC_Base_R_Pinky2_097',
    mixamorigRightHandPinky3: 'CC_Base_R_Pinky3_098'
  };

  function loadWalkClip(THREE) {
    if (wk_state.clip || wk_state.loadFailed || !global.FBXLoader) return;
    new global.FBXLoader().load('js/home/walking.fbx', function (fbx) {
      try {
        // 记录 Mixamo 骨架的绑姿，后续做归一化用
        _fbxBindLocal = {};
        _fbxBindPos = {};
        fbx.updateMatrixWorld(true);
        fbx.traverse(function (c) {
          if (c.isBone && c.name) {
            _fbxBindLocal[c.name] = c.quaternion.clone();
            _fbxBindPos[c.name] = c.position.clone();
          }
        });

        var clips = fbx.animations || [];
        if (!clips.length) { wk_state.loadFailed = true; return; }
        var clip = null;
        for (var i = 0; i < clips.length; i++) {
          if (clips[i] && clips[i].duration > 0.001) { clip = clips[i]; break; }
        }
        if (!clip) { wk_state.loadFailed = true; return; }

        wk_state.clip = remapWalkClip(THREE, clip, fbx);
        wk_state.mixer = new THREE.AnimationMixer(cached.model);
        wk_state.action = wk_state.mixer.clipAction(wk_state.clip);
        wk_state.action.setLoop(THREE.LoopRepeat, Infinity);
        wk_state.action.timeScale = 1.0;   // 步频和前进速度匹配
        wk_state.action.play();
        console.info('[home/character-3d-girl] walk Clip 载入：' + clip.name +
          '（' + clip.duration.toFixed(2) + 's，' + wk_state.clip.tracks.length + ' 条轨道）');
      } catch (e) {
        wk_state.loadFailed = true;
        console.warn('[home/character-3d-girl] walk Clip 异常', e);
      }
    }, undefined, function (e) {
      wk_state.loadFailed = true;
      console.warn('[home/character-3d-girl] walk.fbx 下载失败', e);
    });
  }

  // FBX 骨名 → 本地 GLB 骨名（支持 Mixamo 和 CC 风格）
  function _boneLocalName(fbxName) {
    if (!cached) return null;
    if (cached.bones[fbxName]) return fbxName;
    if (fbxName === 'root' && cached.bones['CC_Base_BoneRoot_01']) return 'CC_Base_BoneRoot_01';
    if (MIX_TO_CC && MIX_TO_CC[fbxName]) return MIX_TO_CC[fbxName];
    // fallback: 去掉末尾 _数字 找前缀
    var base = fbxName.replace(/_\d+$/, '');
    var keys = Object.keys(cached.bones);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].replace(/_\d+$/, '') === base) return keys[i];
    }
    return null;
  }

  // 把 Mixamo 骨轨道映射到我们 GLB 的骨名上，并做绑姿归一化：
  //   ourQ = ourBind * inverse(mixBind) * mixQ
  // 位置轨道只保留 mixamorigHips 的 Y（上下起伏），X/Z 清零——
  // 前进交给 moveTo + walkSpeed 控制。
  function remapWalkClip(THREE, clip, fbxRoot) {
    var out = [];
    var src = clip.tracks || [];
    for (var i = 0; i < src.length; i++) {
      var t = src[i];
      var dot = t.name.indexOf('.');
      var node = dot >= 0 ? t.name.substring(0, dot) : t.name;
      var prop = dot >= 0 ? t.name.substring(dot) : '';
      var local = _boneLocalName(node);
      if (!local) continue;

      // 胳膊用我们的静态站姿，不用 Mixamo（它的肩轴体系与 CC 差太多）；
      // 肩/臂/手整一条子链全部丢掉，避免手举起来的问题}
      if (/Upperarm|Forearm|Hand|Clavicle/.test(local)) continue;

      // 位置轨道：只保留 Hips 的 Y 起伏
      if (prop === '.position') {
        if (node !== 'mixamorigHips') continue;
        var modelBindPos = cached.bindLocalP[local];
        var fbxBindPos = _fbxBindPos[node];
        if (!modelBindPos || !fbxBindPos) continue;
        var pv = t.values;
        var pc = new Float32Array(pv.length);
        for (var v = 0; v < pv.length; v += 3) {
          pc[v] = modelBindPos.x;
          pc[v + 1] = pv[v + 1] - fbxBindPos.y + modelBindPos.y;
          pc[v + 2] = modelBindPos.z;
        }
        out.push(new THREE.VectorKeyframeTrack(local + '.position', t.times.slice(), pc));
        continue;
      }

      // 缩放轨道我们不要
      if (prop !== '.quaternion') continue;

      var modelBind = cached.bindLocalQ[local];
      var fbxBind = _fbxBindLocal[node];
      if (!modelBind || !fbxBind) continue;

      // 上半身跟 Mixamo 的局部轴体系差太多，直接按它原样解出来会左右摇晃；
      // 把 delta（mixBind⁻¹·mixQ）按 35% 阻尼回去，只保留轻微的转肩。
      var UPPER_BODY_DAMP = 0.35;
      var isUpper = /Hips|Spine|Waist|Neck|Head/.test(local);

      var values = t.values;
      var corrected = new Float32Array(values.length);
      var identity = new THREE.Quaternion();
      for (var v2 = 0; v2 < values.length; v2 += 4) {
        var qm = new THREE.Quaternion(values[v2], values[v2 + 1], values[v2 + 2], values[v2 + 3]);
        var delta = fbxBind.clone().invert().multiply(qm);
        if (isUpper) {
          delta.slerp(identity, 1 - UPPER_BODY_DAMP);
        }
        var q = modelBind.clone().multiply(delta);
        corrected[v2] = q.x;
        corrected[v2 + 1] = q.y;
        corrected[v2 + 2] = q.z;
        corrected[v2 + 3] = q.w;
      }
      out.push(new THREE.QuaternionKeyframeTrack(local + '.quaternion', t.times.slice(), corrected));
    }
    return new THREE.AnimationClip(clip.name, clip.duration, out);
  }

  function ensureWalkMixer(THREE) {
    if (!wk_state.clip || wk_state.mixer) return;
    if (!cached) return;
    wk_state.mixer = new THREE.AnimationMixer(cached.model);
    wk_state.action = wk_state.mixer.clipAction(wk_state.clip);
    wk_state.action.setLoop(THREE.LoopRepeat, Infinity);
    wk_state.action.timeScale = 1.0;
    wk_state.action.play();
  }

  function stopWalkAction() {
    if (wk_state.action) { wk_state.action.stop(); }
  }

  function prepare(THREE, gltf) {
    var model = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!model) throw new Error('GLB 里没有 scene');

    // --- 1. 量原始包围盒（scale 还是 1、还没加进场景的时候量）---
    model.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) throw new Error('GLB 几何体是空的');
    var size = new THREE.Vector3();
    var mid = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(mid);
    // 只记下"模型本身多高"，**不**在这里乘房间比例。
    // prepare() 是全局缓存、整个页面只跑一次，但房间有两个、比例还不一样
    //（卧室 2.30 / 厨房 2.00）。在这里就把比例乘进去的话，
    // 谁先进房间谁的缩放就被永久烙进缓存 —— 第二个房间直接套用第一个的比例。
    // 所以缩放统一留给 mount()，那时候才知道是哪个房间。
    var rawHeight = Math.max(1e-4, size.y);

    // --- 2. 四层结构，每层只管一件事 ---
    //   place  → holder → turn → model
    //   place.position  = 站在房间哪里（世界坐标，setPosition 写这里）
    //   holder.scale    = 多大；holder.position = 归一化偏移（脚底贴 y=0）
    //   turn.rotation.y = 朝向
    //
    // place 必须在 holder **外面**：holder 上有 scale，如果 place 在里面，
    // setPosition 写的 x=1.6 会被当成局部坐标再乘一次 k，站位就跟着身高缩放了。
    //
    // 另外归一化偏移绝对不能被 setPosition 覆盖 —— 之前就是这么写的：
    // holder.position.y 既是"脚底贴地"又是"站位 y"，setPosition 一写 y=0
    // 就把贴地偏移冲掉了，人浮起来 box.min.y * k 那么多。
    var place = new THREE.Group();
    place.name = 'home-character-place';
    var holder = new THREE.Group();
    var turn = new THREE.Group();
    place.add(holder);
    holder.name = 'home-character';
    holder.scale.setScalar(1);       // mount() 会按房间比例设，别在这里定死
    holder.position.set(0, 0, 0);    // 同上，syncHolder() 负责贴地
    holder.add(turn);
    turn.add(model);
    // 注意：bind 的世界朝向必须在 turn 还是 0 的时候量，下面所有量都基于这一点。
    place.updateWorldMatrix(true, true);

    // --- 3. 收骨骼 + 存 bind 姿态 ---
    var bones = {};
    model.traverse(function (o) {
      if (o.isBone && o.name && !bones[o.name]) bones[o.name] = o;
    });

    var bindLocalQ = {};
    var bindLocalP = {};
    var bindWorldQ = {};
    var bindDir = {};
    var wp = new THREE.Vector3();     // 子骨骼的世界位置
    var wb = new THREE.Vector3();     // 自己的世界位置
    var self = new THREE.Vector3();

    Object.keys(bones).forEach(function (name) {
      var b = bones[name];
      bindLocalQ[name] = b.quaternion.clone();
      bindLocalP[name] = b.position.clone();
      bindWorldQ[name] = b.getWorldQuaternion(new THREE.Quaternion());

      // bind 时这根骨骼指向哪：取子骨骼里离得最远的那根。
      // 不能取第一个 —— CC 骨架有一堆 xxx_0 和 ShareBone，
      // 和父骨骼几乎重合，方向算出来是噪声。
      var far = null, farD = 0;
      b.getWorldPosition(wb);
      for (var j = 0; j < b.children.length; j++) {
        b.children[j].getWorldPosition(wp);
        var d = wp.distanceTo(wb);
        if (d > farD) { farD = d; far = b.children[j]; }
      }

      if (far && farD > 1e-5) {
        far.getWorldPosition(wp);
        // 归一化一次存下来，之后172 根骨骼都不用再 clone Vector3 —— 这是 prepare 里最重的部分。
        bindDir[name] = wp.clone().sub(wb).normalize();
      } else {
        // 没有子骨骼（叶节点）就用它自己的 +y 朝向兜底
        bindDir[name] = self.set(0, 1, 0).applyQuaternion(bindWorldQ[name]).normalize().clone();
      }
    });

    // 姿势用到的骨名里有没有对不上的 —— 对不上会静默失效（那根骨保持 bind），
    // 所以打一条警告，省得"怎么摆手没动"。
    var missing = [];
    Object.keys(PAIR).forEach(function (key) {
      PAIR[key].forEach(function (n) { if (!bones[n]) missing.push(n); });
    });
    Object.keys(BONE).forEach(function (key) {
      var n = BONE[key];
      if (!bones[n] && missing.indexOf(n) < 0) missing.push(n);
    });
    if (missing.length) console.warn('[home/character-3d-girl] 缺少这些骨骼：' + missing.join(' / '));

    // --- 4. 网格的阴影与剔除设置 ---
    model.traverse(function (o) {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = false;
      // 18k 面的小模型，frustumCulled 误剔的收益远小于风险，直接关掉。
      // 之前开着，人物偶尔在房间边缘整体消失，"frustumCulled" 这行注释是这么加的。
      o.frustumCulled = false;
    });

    return {
      THREE: THREE,
      place: place,
      holder: holder,
      turn: turn,
      model: model,
      bones: bones,
      bindLocalQ: bindLocalQ,
      bindLocalP: bindLocalP,
      bindDir: bindDir,          // 只给 debugBones 用；applyPose 里是实时算的
      rawHeight: rawHeight,   // 归一化缩放的分母，mount() 里用它算 holder.scale
      bbox: { min: box.min.clone(), max: box.max.clone(), size: size.clone() },
      bboxCenter: mid.clone()   // syncHolder 用它居中
    };
  }

  // ------------------------------------------------------------
  // 规则展开
  // ------------------------------------------------------------

  /** 把一条规则展开成 [{ bone, dir, pos, rot }]。 */
  function expand(rules) {
    var out = [];
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      var key = r[0];
      var dir = r[1] || null;
      var pos = r[2] || null;
      var rot = r[3] || null;
      var names = PAIR[key] || (BONE[key] ? [BONE[key]] : [key]);
      if (names.length === 1) {
        out.push({ bone: names[0], dir: dir, pos: pos, rot: rot });
      } else {
        // LR 键：右边那根自动镜像 —— x 取反、绕轴的弧度取反
        out.push({ bone: names[0], dir: dir, pos: pos, rot: rot });
        out.push({
          bone: names[1],
          dir: dir ? [-dir[0], dir[1], dir[2]] : null,
          pos: pos ? [-pos[0], pos[1], pos[2]] : null,
          rot: rot ? [rot[0], rot[1], rot[2], -rot[3]] : null
        });
      }
    }
    return out;
  }

  /** 按骨骼在层级里的深度排序，保证父骨先摆，子骨才读到新的父朝向。 */
  function byDepth(bones, list) {
    var mapped = [];
    for (var i = 0; i < list.length; i++) {
      var b = bones[list[i].bone];
      if (!b) continue;
      var d = 0, p = b.parent;
      while (p) { d++; p = p.parent; }
      mapped.push({ rule: list[i], depth: d });
    }
    mapped.sort(function (a, b) { return a.depth - b.depth; });
    return mapped.map(function (x) { return x.rule; });
  }

  /* 摆姿势（applyPose）——这里有三个必须知道的前提，写下来免得再踩：
   *
   * 1) 不能假设某根骨骼的 parent 是另一根 Bone。
   *    Reallusion / Maya 的导出会在父子之间插 _scaleCompensation 这种
   *    非 Bone 节点：CC_Base_L_Upperarm_050 的父节点不是锁骨，而是
   *    CC_Base_L_Upperarm_050_scaleCompensation。按名字去找父骨骼的
   *    bindWorldQ 在这里会拿到 null（下面 line 134 那次就是这么炸的）。
   *    所以这里只用"父节点的**世界**四元数"，不查它是哪根骨。
   *
   * 2) bind 方向必须**实时**算，不能用 prepare 时存下来的那份。
   *    prepare 时 turn.rotation.y 还是 0，mount 之后才设成 DEFAULT_YAW，
   *    拿旧值当"当前帧的 bind 方向"就是坐标系不一致。
   *
   * 3) 摆完一根要 b.updateMatrixWorld(true)，不然子孙读到的是旧的父朝向。
   */
  function applyPose(name, t) {
    var m = cached;
    if (!m) return;
    var THREE = m.THREE;
    var def = POSES[name] || POSES.stand;

    // 已装真实 walk Clip 时，用 mixer 驱动我们自己的 GLB 骨骼，不走这套方向相加
    if (name === 'walk' && wk_state.clip) {
      if (!walking) { stopWalkAction(); return; }
      ensureWalkMixer(m.THREE);
      if (wk_state.action && !wk_state.action.isRunning()) {
        wk_state.action.reset();
        wk_state.action.play();
      }
      return;
    }
    if (name !== 'walk') stopWalkAction();

    // 还原 bind。用 copy() 不 clone()：走路时每帧要跑十几次。
    var names = Object.keys(m.bones);
    for (var i = 0; i < names.length; i++) {
      var bn = m.bones[names[i]];
      bn.quaternion.copy(m.bindLocalQ[names[i]]);
      bn.position.copy(m.bindLocalP[names[i]]);
    }
    m.place.updateWorldMatrix(true, true);

    var rules;
    rules = expand(def.rules);
    if (def.swing && typeof t === 'number') rules = rules.concat(expand(walkRules(t, walkEnv)));
    if (def.offsets) {
      for (var o = 0; o < def.offsets.length; o++) {
        rules.push({ bone: def.offsets[o][0], dir: null, pos: def.offsets[o][1], rot: null });
      }
    }

    // 挥手就是一条绕世界 Z 轴的 rot 规则，不用单独一段逻辑
    if (def.waveArm && typeof t === 'number') {
      rules.push({ bone: def.waveArm, dir: null, pos: null, rot: [0, 0, 1, 0.42 * Math.sin(t)] });
    }

    var ordered = byDepth(m.bones, rules);
    var selfP = new THREE.Vector3();
    var kidP = new THREE.Vector3();
    var bindDir = new THREE.Vector3();
    var target = new THREE.Vector3();
    var axis = new THREE.Vector3();
    var selfW = new THREE.Quaternion();
    var parentQ = new THREE.Quaternion();
    var deltaW = new THREE.Quaternion();
    var spinW = new THREE.Quaternion();
    var newW = new THREE.Quaternion();
    var newLocal = new THREE.Quaternion();
    var invParent = new THREE.Quaternion();
    var off = new THREE.Vector3();

    // 转身用：目标方向是角色身体局部的，得先转回世界空间。
    // 不转的话，朝 +x 走的时候手臂朝 +z 摆，等于把整个方向系统整体旋转了。
    var bodyQuat = m.turn ? m.turn.getWorldQuaternion(new THREE.Quaternion()) : null;

    for (var r = 0; r < ordered.length; r++) {
      var rule = ordered[r];
      var b = m.bones[rule.bone];
      if (!b) continue;

      b.getWorldQuaternion(selfW);
      var hasParent = !!b.parent;
      if (hasParent) b.parent.getWorldQuaternion(parentQ);

      // 这根骨骼此刻指向哪：子骨骼里离得最远的那根。
      // 实时算，所以自动带着 turn 的朝向，不用管坐标系。
      bindDir.set(0, 0, 0);
      var best = 0;
      b.getWorldPosition(selfP);
      for (var c = 0; c < b.children.length; c++) {
        b.children[c].getWorldPosition(kidP);
        var dd = kidP.distanceToSquared(selfP);
        if (dd > best) { best = dd; bindDir.copy(kidP).sub(selfP); }
      }
      if (best < 1e-10) bindDir.set(0, 1, 0).applyQuaternion(selfW);
      else bindDir.normalize();

      if (rule.dir) {
        target.set(rule.dir[0], rule.dir[1], rule.dir[2]);
        if (target.lengthSq() < 1e-10) target.copy(bindDir);
        else if (bodyQuat) target.applyQuaternion(bodyQuat);   // 身体局部→世界
        deltaW.setFromUnitVectors(bindDir, target);
      } else {
        deltaW.identity();
      }
      newW.copy(deltaW).multiply(selfW);

      // 再绕世界轴补一个旋转（小幅转动用"方向"表达不了，只能这么做）
      if (rule.rot) {
        axis.set(rule.rot[0], rule.rot[1], rule.rot[2]);
        if (axis.lengthSq() > 1e-12) {
          if (bodyQuat) axis.applyQuaternion(bodyQuat);          // 身体局部→世界
          spinW.setFromAxisAngle(axis.normalize(), rule.rot[3]);
          newW.premultiply(spinW);
        }
      }

      if (hasParent) newLocal.copy(invParent.copy(parentQ).invert()).multiply(newW);
      else newLocal.copy(newW);
      b.quaternion.copy(newLocal);
      b.position.copy(m.bindLocalP[rule.bone]);

      if (rule.pos) {
        off.set(rule.pos[0], rule.pos[1], rule.pos[2]);
        // 位移是父节点局部空间的值，要用父的朝向转回来
        if (hasParent) off.applyQuaternion(invParent.copy(parentQ).invert());
        b.position.add(off);
      }

      // 子骨骼要用新的父朝向，所以这里得立刻刷新
      b.updateMatrixWorld(true);
    }

    // 待机时的小动作：只敢动**脖子以上**的轻微动作 ——
    // 不再动髋盆和脊柱了：
    //   髋盆一动，腿带着髋转会首尾浮空，容易被看成"被吊起来摇"的假象。
    //   只给头/脖子一个慢慢的微摆，就够了。
    var def = POSES[name] || POSES.stand;
    if (def.idle && typeof t === 'number' && m.bones) {
      sway('CC_Base_NeckTwist01_036', t * 0.8 + 1.3, 0.008, 0.005, m); // 脖子轻微左右看的速度
      sway('CC_Base_Head_038', t * 0.6, 0.010, 0.006, m);          // 头微微左右摇一点点
    }

    m.place.updateWorldMatrix(true, true);
  }

  // 轻微摆动：在当前骨骼方向上乘两个小角（保持其 stand 方向，别覆盖）
  function sway(boneName, t, ampY, ampX, m) {
    var b = m.bones && m.bones[boneName];
    if (!b) return;
    var THREE = m.THREE;
    var q = b.quaternion.clone();
    var qY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(t) * ampY);
    var qX = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.sin(t * 1.3 + 1.1) * ampX);
    b.quaternion.copy(q).multiply(qY).multiply(qX);
    b.updateMatrixWorld(true);
  }

  // ------------------------------------------------------------
  // 地面探测 / 避障
  // ------------------------------------------------------------

  // 从上往下打一条射线，找脚下真正的表面高度。
  // 地板顶面是 y=0，但地毯、蒲团、矮柜这些浮在地板上，写死 y=0 会陷进去。
  // surfaceY() 给 mount 时找站位用，isFloorHit() 给房间点地板时用。
  var _down = null;

  function surfaceY(THREE, scene, x, z, fromY) {
    if (!THREE || !scene) return 0;
    if (!_down) _down = new THREE.Vector3(0, -1, 0);
    var rc = new THREE.Raycaster();
    rc.set(new THREE.Vector3(x, (fromY || 40), z), _down);
    rc.far = 80;
    var hits = rc.intersectObjects(scene.children, true);
    // 第一个命中里挑最近的、且不比出发点低太多的（排除打到地台背面）
    for (var i = 0; i < hits.length; i++) {
      if (hits[i].object && hits[i].object.userData && hits[i].object.userData.noFloor) continue;
      return hits[i].point.y;
    }
    return 0;
  }

  function isFloorHit(THREE, scene, x, z) {
    if (!THREE || !scene) return 0;
    var y = surfaceY(THREE, scene, x, z);
    return isFinite(y) ? y : 0;
  }

  // 往前走一段会不会撞到东西：从脚下往上打一条短射线探障碍。
  // len 越长探得越远。家具都会挡住射线，地板不会（因为射线起点抬到腰高）。
  function directCheck(THREE, p, vx, vz, len) {
    if (!THREE || !live || !live.scene) return true;
    var rc = new THREE.Raycaster();
    var start = new THREE.Vector3(
      p.x + vx * 0.15, p.y + 0.9, p.z + vz * 0.15
    );
    rc.set(start, new THREE.Vector3(vx, 0, vz));
    rc.far = Math.max(0.2, len);
    var hits = rc.intersectObjects(live.scene.children, true);
    for (var i = 0; i < hits.length; i++) {
      var o = hits[i].object;
      if (!o || !o.visible) continue;
      // 人物自己的 mesh 不算障碍
      if (o === live.model || (live.place && isDescendant(o, live.place))) continue;
      // 薄纱 / 玻璃 / 窗 这些透明层不算，撞上也不该停
      if (o.material && o.material.transparent && o.material.opacity < 0.6) continue;
      return false;
    }
    return true;
  }

  function isDescendant(node, ancestor) {
    var p = node;
    while (p) { if (p === ancestor) return true; p = p.parent; }
    return false;
  }

  // ------------------------------------------------------------
  // 自带循环：走路摆动 / 挥手。房间的 animate loop 不会调这里。
  // ------------------------------------------------------------

  function tick() {
    rafId = global.requestAnimationFrame(tick);
    var now = (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0;
    lastT = now;
    if (!live || !live.place.parent) return;

    // 真实走路 Clip 在播的话，直接更新这个 GLB 上的骨骼
    if (wk_state.action && wk_state.action.isRunning()) {
      wk_state.mixer.update(dt);
    }

    // ── 走动推进 ──────────────────
    if (walking && walkTarget) {
      var w = walkTarget;            // 到了时下面会把 walkTarget 置 null，
      var p = live.place.position;   // 所以先存一局部变量，后面读 w.y 就不会碰 null
      var dx = w.x - p.x;
      var dz = w.z - p.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      var step = walkSpeed * dt;

      if (dist <= step || dist < 0.15) {
        // 到了
        p.x = w.x;
        p.z = w.z;
        walking = false;
        walkTarget = null;
        walkFade = true;     // 到这里以后让振幅慢慢归到 0，再切回站立
        stopWalkAction();   // 到了，停止走路循环
      } else {
        var THREE = global.THREE;
        // 实时避障：朝目标方向试 probe，若被挡住就在左右扇形里挑一个
        // 离目标方向最近且没有挡贴到东西的方向来走。
        var th = Math.atan2(dx, dz);
        var vx = dx / dist, vz = dz / dist;
        var canGo = directCheck(THREE, p, vx, vz, step * 2.5);
        if (!canGo) {
          var bestScore = -Infinity, bestAng = th;
          for (var a = -1.2; a <= 1.2; a += 0.2) {
            var ang = th + a;
            var cvx = Math.sin(ang), cvz = Math.cos(ang);
            if (!directCheck(THREE, p, cvx, cvz, step * 2.5)) continue;
            var score = cvx * vx + cvz * vz;
            if (score > bestScore) { bestScore = score; bestAng = ang; }
          }
          if (bestScore > -Infinity) {
            vx = Math.sin(bestAng);
            vz = Math.cos(bestAng);
          } else {
            // 前方被封死：在 16 个方向里找任意一条能走的，实在没有再停下来
            var rescued = false;
            for (var a = -Math.PI; a < Math.PI && !rescued; a += Math.PI / 8) {
              var cvx = Math.sin(a), cvz = Math.cos(a);
              if (directCheck(THREE, p, cvx, cvz, step * 2.5)) {
                vx = cvx; vz = cvz; rescued = true;
              }
            }
            if (!rescued) {
              walking = false;
              moving = false;
              walkEnv = 0;
              adapter.setPose('stand', { moving: false });
              return;
            }
          }
        }
        p.x += vx * step;
        p.z += vz * step;
        // 转身面向实际移动方向
        live.turn.rotation.y = Math.atan2(vx, vz);
      }
      // 失重修正：走动时脚底贴着 click 点的高度即可，
      // 目标 y 已经是调用方（房间场景）用 isFloorHit 验证过的地面高度。
      p.y = w.y;
      live.place.updateWorldMatrix(true, true);
    }

    // 走路摆幅包络：走动中 0→1，到达后（walkFade）慢慢归到 0，再切回站立
    if (walking) {
      walkEnv = Math.min(1, walkEnv + dt * 4);
    } else if (walkFade) {
      walkEnv = Math.max(0, walkEnv - dt * 4);
      moving = walkEnv > 0.02;
      if (walkEnv <= 0.02) {
        walkEnv = 0;
        walkFade = false;
        moving = false;
        adapter.setPose('stand', { moving: false });
      }
    }

    var def = POSES[currentPose];
    if (!def) return;
    if (def.swing) {
      phase += dt * (moving ? 8.5 : 2.0);
      applyPose('walk', phase);
    } else if (def.waveArm) {
      phase += dt * 6.5;
      applyPose('wave', phase);
    } else if (def.idle) {
      // 待机小动作。不靠 rules，直接在 bind 上乘一个慢呼吸 + 头微微转
      phase += dt * 1.25;
      applyPose(currentPose, phase);
    }
  }

  // 走到目标时把 walkTarget 置 null；房间要判断"走完了"时用这两只小函数
  function walkingTargetNullSafe() {
    walkTarget = null;
  }
  function moveDone() {
    moving = false;
    adapter.setPose('stand', { moving: false });
  }

  function startLoop() {
    if (rafId) return;
    lastT = 0;
    rafId = global.requestAnimationFrame(tick);
  }
  function stopLoop() {
    if (!rafId) return;
    global.cancelAnimationFrame(rafId);
    rafId = 0;
  }

  // ------------------------------------------------------------
  // 双马尾发型（静态 GLB，挂到头骨 CC_Base_Head_038 上）
  // ------------------------------------------------------------
  //
  // 资源：js/home/braids.glb
  //   由 IP_SCBE_F_HAIR_2.fbx 离线转换而来（烘焙蒙皮顶点 → 静态网格，删骨骼），
  //   并且**顶点在转换时就烘进了头骨 CC_Base_Head_038 的局部空间**：
  //   两个资产头骨解剖位置同源、朝向一致（脸+Z 上+Y），转换脚本按"头骨对头骨、k=1"
  //   算好 inv(headWorldBind) 焊进顶点（脚本：hairtest/convert_fit.mjs）。
  //   运行时只需 head.add(glb) + 单位变换 —— 不依赖加载时机/当前姿态/包围盒，
  //   加载时模型在任何姿态下挂上去都是对的。
  var braidsGroup = null;    // 加载好的 GLB 根（挂在头骨下）
  var braidsLoading = false;
  var BRAIDS_URL = 'js/home/braids.glb?v=20261007h';
  var BRAIDS_MARK = 'hair-braids';   // 挂上去的 group 打个标记，方便在任意副本里找到它
  var hairRoots = [];                // 注册进来要同步发型的额外模型根（编辑器预览的 clone）
  var braidsDefaultColor = null;     // GLB 自带的默认发色（"原色"时恢复它）

  // 在模型根里找头骨
  function findHeadBone(root) {
    var found = null;
    root.traverse(function (o) { if (o.isBone && o.name === 'CC_Base_Head_038') found = o; });
    return found;
  }

  // 在模型根里拿双马尾 group；没有就克隆一份挂进这个根的头骨。
  // 预览是 SkeletonUtils.clone 的独立副本（mesh 独立、只共享材质），
  // 房间那份挂了双马尾不代表预览那份也有 —— 待注册的副本各挂各的。
  // clone(true) 共享 geometry/material，所以改色两边依然同步。
  function braidsIn(root) {
    var head = findHeadBone(root);
    if (!head) return null;
    for (var i = 0; i < head.children.length; i++) {
      if (head.children[i].name === BRAIDS_MARK) return head.children[i];
    }
    if (!braidsGroup || !cached || root === cached.model) return null;
    var cp = braidsGroup.clone(true);
    head.add(cp);
    return cp;
  }

  // 把当前发型套到一个模型根：原发按材质名 lambert10 显隐，双马尾反着来
  function applyHairStyleTo(root) {
    if (!root) return;
    var showOrig = (adapter._hairStyle !== 'ponytail');
    root.traverse(function (o) {
      if (!o.isMesh || !o.material) return;
      var mats = Array.isArray(o.material) ? o.material : [o.material];
      for (var i = 0; i < mats.length; i++) {
        if (mats[i].name === 'lambert10') o.visible = showOrig;
      }
    });
    var tw = braidsIn(root);
    if (tw) tw.visible = !showOrig;
  }

  // 房间模型 + 所有注册的预览副本一起套用
  function applyHairStyleEverywhere() {
    applyHairStyleTo(cached && cached.model);
    for (var i = 0; i < hairRoots.length; i++) applyHairStyleTo(hairRoots[i]);
  }

  function loadTwoBraids(THREE) {
    if (braidsGroup || braidsLoading || !cached || !global.GLTFLoader) return;
    braidsLoading = true;
    console.info('[home/character-3d-girl] 双马尾 GLB 开始加载…');
    new global.GLTFLoader().load(BRAIDS_URL, function (gltf) {
      braidsLoading = false;
      try {
        var head = cached.bones['CC_Base_Head_038'];
        if (!head) throw new Error('找不到头骨 CC_Base_Head_038');

        // 顶点已是头骨局部空间（离线烘好），直接挂上、单位变换
        var fbx = gltf.scene;
        fbx.position.set(0, 0, 0);
        fbx.quaternion.set(0, 0, 0, 1);
        fbx.scale.set(1, 1, 1);
        head.add(fbx);
        head.updateWorldMatrix(true, true);

        // 打标记 → 交给统一的套用逻辑（房间 + 所有注册的预览副本一起换）
        fbx.name = BRAIDS_MARK;
        braidsGroup = fbx;
        // 记下 GLB 自带发色，发色选"原色"时恢复它（lambert10 的原色是白=贴图，双马尾没贴图）
        fbx.traverse(function (o) {
          if (!braidsDefaultColor && o.isMesh && o.material && o.material.color) {
            braidsDefaultColor = o.material.color.clone();
          }
        });
        applyHairStyleEverywhere();
        // 之前选过发色的话，补涂到刚加载的双马尾上
        if (adapter._hairColor) adapter.setHairColor(adapter._hairColor);

        var wb = new THREE.Box3().setFromObject(fbx);
        var ws = new THREE.Vector3(); wb.getSize(ws);
        console.info('[home/character-3d-girl] 双马尾加载完成（顶点已烘进头骨空间）：世界尺寸=(' +
          ws.x.toFixed(3) + ',' + ws.y.toFixed(3) + ',' + ws.z.toFixed(3) +
          ') 顶部Y=' + wb.max.y.toFixed(3) + ' 底部Y=' + wb.min.y.toFixed(3) +
          ' 位置=(' + fbx.position.x.toFixed(2) + ',' + fbx.position.y.toFixed(2) + ',' + fbx.position.z.toFixed(2) + ')' +
          ' 可见=' + fbx.visible);
      } catch (e) {
        console.warn('[home/character-3d-girl] 双马尾挂载失败', e);
      }
    }, undefined, function (e) {
      braidsLoading = false;
      console.warn('[home/character-3d-girl] 双马尾 GLB 下载失败', e);
    });
  }

  // ------------------------------------------------------------
  // 适配层
  // ------------------------------------------------------------

  function sizeScale() {
    return mySize() / MY_SIZE_DEFAULT;
  }

  // 换姿势时的中文提示。HUD 按钮要显示，得和 character-2d.js
  // 的 home-pose-* 一组取值配套。
  var POSE_LABELS = {
    stand: '站立', walk: '走路', sit: '坐下',
    crouch: '蹲下', wave: '挥手', sleep: '睡觉'
  };

  var adapter = {
    // 房间层从这里读当前状态 / 显示当前姿势
    poses: Object.keys(POSES).map(function (k) {
      return { id: k, label: POSE_LABELS[k] || k };
    }),
    currentPose: function () { return currentPose; },
    currentYaw: function () {
      return live ? live.turn.rotation.y : DEFAULT_YAW;
    },
    currentSize: function () { return mySize(); },

    mount: function (opts) {
      opts = opts || {};
      var THREE = opts.THREE || global.THREE;
      var scene = opts.scene;
      if (!THREE || !scene) return Promise.resolve(false);

      // 同一个场景重复 mount（比如房间重建后又调了一次）—— 复用，别再解析一遍
      if (live && live.scene === scene && live.place.parent) {
        applyPose(currentPose, currentPose === 'stand' ? undefined : phase);
        return Promise.resolve(true);
      }
      if (live) adapter.dispose();

      var roomId = opts.roomId;
      // 必须在 loadModel 之前设好：prepare() 里算缩放要用 roomScale()，
      // 而 loadModel 是缓存的 Promise，同步部分先跑完。
      if (roomId) activeRoomId = roomId;
      // personPos 是 2D 的百分比坐标，在 3D 场景里没有意义 —— 明确丢掉。
      // 之前没管它，人直接飞到 (60, 82) 去了。
      if (opts.personPos && !warnedPersonPos) {
        warnedPersonPos = true;
        console.info('[home/character-3d-girl] 已忽略 mount 传来的 personPos：' +
          JSON.stringify(opts.personPos) +
          '（那是 2D 房间的百分比坐标，3D 里用不了。3D 的站位由点地板决定）');
      }
      return loadModel(THREE).then(function (m) {
        // 10 MB 要下好几秒，这期间房间可能已经被切掉了
        if (!scene) return false;
        // 两个房间几乎同时发起 mount 时，只有「最后一次 mount」才生效：
        // 先发起的后完成，不能把 place 抢到上一个场景里。
        if (roomId && activeRoomId !== roomId) return false;

        // 加进场景的是 place，不是 holder —— place 的坐标就是房间坐标
        scene.add(m.place);
        // 缩放在**这里**算，不在 prepare() 里 —— 模型是全局缓存的，
        // 而两个房间的放大倍数不同。先乘的那个房间会把缩放烙进缓存。
        m.holder.scale.setScalar(roomHeight() / m.rawHeight);
        syncHolder();                        // 缩放变了，贴地偏移要跟着重算
        m.turn.rotation.y = DEFAULT_YAW;
        // 站位要落在"表面"上。地板顶面是 y=0，但地毯、蒲团这些是浮在地板上的，
        // 写死 y=0 站在地毯上会陷进去。所以往下打一条射线找真正的表面。
        var dp = defaultPos(roomId);
        var standY = surfaceY(THREE, scene, dp.x, dp.z);
        m.place.position.set(dp.x, standY, dp.z);

        live = { scene: scene, place: m.place, holder: m.holder, turn: m.turn, model: m.model };
        currentPose = 'stand';
        phase = 0;
        applyPose('stand');
        say('ready', '');

        startLoop();

        // 恢复持久化的外观（刷新页面 / 重进房间后颜色和发型还在）。
        // 放在 mount 成功之后：此时 cached 和 live 都就绪。
        try {
          var sh = (global.state && global.state.home) || {};
          if (sh.hairColor) adapter.setHairColor(sh.hairColor);
          if (sh.hairStyle === 'ponytail') adapter.setHairStyle('ponytail');
        } catch (e) { console.warn('[home/character-3d-girl] 恢复外观失败', e); }

        console.info('[home/character-3d-girl] 已挂载到 ' + (roomId || '?') +
          '：' + Math.round(m.bbox.size.y) + ' 模型单位 -> ' +
          roomHeight().toFixed(2) + ' 房间单位（= ' +
          (BASE_H * sizeScale()).toFixed(2) + ' m × ' + roomScale() +
          '，' + Object.keys(m.bones).length + ' 根骨骼）');
        return true;
      }).catch(function (e) {
        say('error', e && e.message ? e.message : String(e));
        return false;
      });
    },

    /**
     * 瞬移。只改位置不播走路动画 —— 初始化、切房间时用。
     * 要"走过去"（带手脚摆动）用 moveTo。
     */
    setPosition: function (world) {
      if (!live || !world) return;
      if (world.x != null) live.place.position.x = world.x;
      if (world.y != null) live.place.position.y = world.y;
      if (world.z != null) live.place.position.z = world.z;
      live.place.updateWorldMatrix(true, true);
    },

    /**
     * 走过去。把目标点写到 walking 状态里，由 tick 推进 place.position，
     * 同时强制 currentPose = 'walk'让手脚摆动。到达后切回 'stand'。
     *
     * world.y 必须是调用方（房间场景）用 isFloorHit 验证过的地面高度，
     * 否则会陷进地板 / 飘起来。
     *
     * 这是打通"点地面 → 走过去"的那个方法；旧的 setPosition 不摇腿，
     * 继续留给初始化、瞬移之类不需要走路动画的场景。
     */
    moveTo: function (world) {
      if (!live || !world) return;
      var px = live.place.position.x;
      var pz = live.place.position.z;
      var dx = (world.x != null ? world.x : px) - px;
      var dz = (world.z != null ? world.z : pz) - pz;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.1) return;   // 目标太近，原地不动

      // 不挡在 moveTo 里了 —— 现在改成运行时实时避障，能绕开家具继续走。
      walkTarget = {
        x: px + dx,
        y: world.y != null ? world.y : live.place.position.y,
        z: pz + dz
      };
      // 面向目标（+Z 是模型正前方，所以 yaw = atan2(dx, dz)）
      live.turn.rotation.y = Math.atan2(dx, dz);
      live.place.updateWorldMatrix(true, true);

      walking = true;
      moving = true;
      adapter.setPose('walk', { moving: true });
    },

    /** 立刻停下，不再往 walkTarget 走，保持当前姿势。 */
    stop: function () {
      walking = false;
      walkTarget = null;
      moving = false;
      walkEnv = 0;
      walkFade = false;
      if (currentPose === 'walk') adapter.setPose('stand', { moving: false });
    },

    setPose: function (pose, opts) {
      opts = opts || {};
      if (pose && POSES[pose]) currentPose = pose;
      moving = !!opts.moving;
      if (live) applyPose(currentPose, currentPose === 'stand' ? undefined : phase);
    },

    setConfig: function (config) {
      config = config || {};
      if (!live) return;

      // 目标房间比例。给了 config.roomScale 就用它，否则用当前房间自己的。
      // 注意 sizeScale() 已经含在 roomHeight() 里了，别再乘一次。
      var rs = (typeof config.roomScale === 'number' && config.roomScale > 0)
        ? config.roomScale : roomScale();

      // 身高：和 2D 共用 state.home.mySize（6…40，默认 11）。
      // 没传就用当前 state 的值 —— 每次都重算缩放，保证"改过之后回到默认值"
      // 也能正确还原。
      var sz = config.mySize != null ? config.mySize
             : (config.size != null ? config.size : mySize());
      var n = Number(sz);
      var clamped = (isFinite(n) && n > 0)
        ? Math.max(MY_SIZE_MIN, Math.min(MY_SIZE_MAX, n)) : MY_SIZE_DEFAULT;

      // 用 rawHeight 当分母：模型多高 → 要多高。
      // 之前用 cached.heightUnit，那是从"当前缩放"反推出来的，
      // 一旦改过一次就会自我累积（改两次大小高度就飘了）。
      live.holder.scale.setScalar((BASE_H * rs * (clamped / MY_SIZE_DEFAULT)) / cached.rawHeight);
      syncHolder();
      live.place.updateWorldMatrix(true, true);

      if (typeof config.roomScale === 'number' && config.roomScale > 0) {
        console.info('[home/character-3d-girl] roomScale -> ' + config.roomScale +
          '（身高 ' + (BASE_H * clamped / MY_SIZE_DEFAULT * config.roomScale).toFixed(2) + ' 房间单位）');
      }

      // 朝向。直接写 rotation.y，走路中会被 tick 每帧覆盖，所以走路时要额外转。
      if (config.yaw != null && isFinite(Number(config.yaw))) {
        live.turn.rotation.y = Number(config.yaw);
        live.place.updateWorldMatrix(true, true);
      }
    },

    dispose: function () {
      stopLoop();
      if (live && live.place.parent) live.place.parent.remove(live.place);
      live = null;
      walking = false;
      walkTarget = null;
      walkEnv = 0;
      walkFade = false;
      moving = false;
      // cached 故意留着：模型是全局缓存的，dispose 掉 geometry/material
      // 会连别的房间一起废掉（骨骼模型是多实例共享同一份资源的）。
      currentPose = 'stand';
    },

    /* ---- 发色 ----
     * 头发 mesh = "model:Mesh_lambert10_0"（材质 lambert10），
     * 实测包围盒 Y 115~170（头顶最高点 169.8）、Z 拖到 -25.3（长发向后拖），
     * 是模型里唯一的头发。材质带贴图，换色 = color × 贴图（tint），
     * 所以原色是 0xffffff（白色 = 显示贴图本来的颜色）。
     * 预览那份 clone 是 SkeletonUtils.clone，material 引用共享 ——
     * 在这里改颜色，房间和预览会同时变，正好。 */
    _hairColor: '',
    setHairColor: function (hex) {
      if (!cached) return;
      hex = hex || '';
      this._hairColor = hex;
      var target = new (cached.THREE.Color)(hex || '#ffffff');
      var found = false;
      cached.model.traverse(function (o) {
        if (!o.isMesh || !o.material) return;
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        for (var i = 0; i < mats.length; i++) {
          if (mats[i].name === 'lambert10') {
            mats[i].color.copy(target);
            found = true;
          }
        }
      });
      // 双马尾 GLB 的材质（名不是 lambert10，单独处理）。
      // 预览副本是 clone(true)，和 braidsGroup 共享同一份 material —— 改这里两边同步。
      // 发色为空（"原色"）时恢复 GLB 自带的默认色：lambert10 的原色是白=显示贴图，
      // 双马尾没贴图，套白色会变成白发，所以要分开处理。
      if (braidsGroup) {
        braidsGroup.traverse(function (o) {
          if (!o.isMesh || !o.material) return;
          var mats = Array.isArray(o.material) ? o.material : [o.material];
          for (var i = 0; i < mats.length; i++) {
            if (mats[i].color) {
              mats[i].color.copy(hex ? target : (braidsDefaultColor || target));
              found = true;
            }
          }
        });
      }
      if (!found) {
        console.warn('[home/character-3d-girl] setHairColor: 没找到头发材质 lambert10');
      }
    },
    currentHairColor: function () { return this._hairColor || ''; },

    /* ---- 发型 ----
     * GLB 里只有一个发型（长发 mesh）。双马尾是独立资源
     * js/home/braids.glb（由 IP_SCBE_F_HAIR_2.fbx 离线转换而来），
     * 由 loadTwoBraids() 异步加载后挂到头骨上。
     *   'orig'    → 显示 GLB 长发，隐藏双马尾
     *   'ponytail'→ 隐藏 GLB 长发，显示双马尾（加载没完成就先只隐藏原发）
     *
     * 注意：找头发 mesh 要按 **材质名 lambert10**，不能按 mesh 名 ——
     * GLTFLoader 加载后 mesh.name 会变成 Object_NN（运行时重命名），
     * glTF JSON 里的 "model:Mesh_lambert10_0" 在运行时对不上。 */
    _hairStyle: 'orig',
    setHairStyle: function (style) {
      if (!cached || !live) return;
      style = (style === 'ponytail') ? 'ponytail' : 'orig';
      this._hairStyle = style;
      console.info('[home/character-3d-girl] setHairStyle(' + style + ')，braidsGroup=' +
        (braidsGroup ? '已加载' : '未加载'));
      // 房间模型 + 注册的预览副本一起换 ——
      // 预览是独立 clone，只改房间那份的话面板里看不到任何变化
      applyHairStyleEverywhere();
      // 没加载过就触发加载，完成后 applyHairStyleEverywhere 会自动套上
      if (style === 'ponytail' && !braidsGroup) loadTwoBraids(cached.THREE);
    },
    currentHairStyle: function () { return this._hairStyle || 'orig'; },

    // 给 character-3d-editor.js 的 buildPreview() 用：
    // 它需要 g.model() 拿到模型对象来 clone 一份做预览
    model: function () { return cached ? cached.model : null; },
    // 预览（SkeletonUtils clone）是独立副本：mesh 的显隐不会自动同步过来，
    // 双马尾也只挂在房间那份的头骨上。编辑器把 clone 注册进来，
    // 换发型 / 双马尾加载完成时会一起套用，预览才和房间一致。
    registerHairRoot: function (root) {
      if (!root || hairRoots.indexOf(root) >= 0) return;
      hairRoots.push(root);
      applyHairStyleTo(root);   // 注册那一刻就套上当前发型，顺序反了也不怕
    },
    unregisterHairRoot: function (root) {
      var i = hairRoots.indexOf(root);
      if (i >= 0) hairRoots.splice(i, 1);
    },
    // buildPreview 用它把预览人物缩放 + 归中（脚底贴 y=0、x/z 居中）。
    // 返回的是 **归一化前的原始包围盒**（scale=1 时量的），和预览自算的 k 配套。
    bbox: function () { return cached ? cached.bbox : null; },

    // 调试信息，给 character-3d-editor.js 的面板用
    root: function () { return cached ? cached.place : null; },
    tick: tick,
    debug: function () {
      if (!cached) return null;
      var box = new THREE.Box3().setFromObject(cached.model);
      var size = new THREE.Vector3();
      box.getSize(size);
      return {
        bones: Object.keys(cached.bones).length,
        hasClip: !!wk_state.clip,
        height: size.y,
        roomScale: roomScale(),
        mySize: mySize(),
        pos: live ? [live.place.position.x, live.place.position.y, live.place.position.z] : null
      };
    },

    // 把全部骨骼名和朝向 dump 出来，调姿势规则时对着看
    debugBones: function () {
      if (!cached) return [];
      return Object.keys(cached.bones).map(function (n) {
        return { name: n, dir: cached.bindDir[n] ? cached.bindDir[n].toArray() : null };
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

  // 房间层通过 character-3d.js 的插槽调我们。character-3d.js 可能还没加载完
  // （index.html 里的脚本都是 defer），所以这里轮询等它出现，
  // 而不是假设 global.HomeCharacter3D 一定在。
  if (global.HomeCharacter3D) {
    global.HomeCharacter3D.register('girl', adapter);
  } else {
    // character-3d.js 还没到，轮询等它 —— 别报"找不到 HomeCharacter3D"
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (global.HomeCharacter3D) {
        clearInterval(timer);
        global.HomeCharacter3D.register('girl', adapter);
      } else if (tries > 100) {
        clearInterval(timer);
        console.warn('[home/character-3d-girl] 等不到 character-3d.js，人物不会显示');
      }
    }, 60);
  }

  global.HomeCharacter3DGirl = adapter;
})(typeof window !== 'undefined' ? window : this);