/* PLACEHOLDER_GEOM_HEADER */
(function (global) {
  'use strict';

  function buildKitchenGeometry(api) {
    var THREE = api.THREE;
    var scene = api.scene;
    var roomGroup = api.roomGroup;
    var mats = api.mats;
    var PALETTE = api.PALETTE;
    var RoundedBoxGeometry = api.RoundedBoxGeometry;
    var GLTFLoader = api.GLTFLoader;
        const ROOM_W = 7.5;
        const ROOM_H = 5.6;
        const WALL_THICK = 0.44;

        // Solid White Platform Base (raised clay diorama tray)
        const baseTrayGeo = new THREE.BoxGeometry(ROOM_W + 0.55, 0.42, ROOM_W + 0.55);
        const baseTrayMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f3, roughness: 0.95 });
        const baseTray = new THREE.Mesh(baseTrayGeo, baseTrayMat);
        baseTray.position.set(0, -0.21, 0);
        baseTray.receiveShadow = true;
        roomGroup.add(baseTray);

        // Wide floorboards laid along the angled perspective with rounded bullnose front borders
        const plankCount = 8;
        const plankLen = ROOM_W;
        const plankW = ROOM_W / plankCount - 0.035;
        const plankH = 0.14;
        const plankGeo = new THREE.BoxGeometry(plankLen, plankH, plankW);

        for (let i = 0; i < plankCount; i++) {
          const plank = new THREE.Mesh(plankGeo, mats.floor);
          const zPos = -ROOM_W / 2 + (i + 0.5) * (ROOM_W / plankCount);
          plank.position.set(0, plankH / 2, zPos);
          plank.receiveShadow = true;
          roomGroup.add(plank);

          // Bullnose rounded edge trim along the foreground border of each plank
          const bullnose = new THREE.Mesh(
            new THREE.CylinderGeometry(plankH / 2, plankH / 2, plankW, 16),
            mats.floor
          );
          bullnose.rotation.z = Math.PI / 2;
          bullnose.rotation.y = Math.PI / 2;
          bullnose.position.set(plankLen / 2, plankH / 2, zPos);
          bullnose.receiveShadow = true;
          roomGroup.add(bullnose);
        }

        // Left Wall with Cutout Window
        // 洞口是唯一真源：墙体缺口和窗框都从这几个数推出来，改一处两边一起动
        const WIN_Z0 = -2.1;           // 洞口靠后一侧
        const WIN_Z1 = 1.2;            // 洞口靠前一侧
        const WIN_Y0 = 2.05;           // 洞口下沿
        const WIN_Y1 = 4.25;           // 洞口上沿
        const WIN_W = WIN_Z1 - WIN_Z0; // 3.3
        const WIN_H = WIN_Y1 - WIN_Y0; // 2.2

        const leftWallGroup = new THREE.Group();
        const lLower = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WIN_Y0, ROOM_W), mats.wall);
        lLower.position.set(-ROOM_W / 2 - WALL_THICK / 2, WIN_Y0 / 2, 0);
        lLower.receiveShadow = true; lLower.castShadow = true;

        const lUpper = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, ROOM_H - WIN_Y1, ROOM_W), mats.wall);
        lUpper.position.set(-ROOM_W / 2 - WALL_THICK / 2, (ROOM_H + WIN_Y1) / 2, 0);
        lUpper.receiveShadow = true; lUpper.castShadow = true;

        // 洞口前后的两段墙，宽度从洞口边界反推，保证两侧齐平
        const wallFrontD = ROOM_W / 2 - WIN_Z1;
        const lFront = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WIN_H, wallFrontD), mats.wall);
        lFront.position.set(-ROOM_W / 2 - WALL_THICK / 2, WIN_Y0 + WIN_H / 2, WIN_Z1 + wallFrontD / 2);
        lFront.receiveShadow = true; lFront.castShadow = true;

        const wallBackD = WIN_Z0 + ROOM_W / 2;
        const lBack = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK, WIN_H, wallBackD), mats.wall);
        lBack.position.set(-ROOM_W / 2 - WALL_THICK / 2, WIN_Y0 + WIN_H / 2, WIN_Z0 - wallBackD / 2);
        lBack.receiveShadow = true; lBack.castShadow = true;

        leftWallGroup.add(lLower, lUpper, lFront, lBack);
        roomGroup.add(leftWallGroup);

        // Back-Right Wall
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + WALL_THICK, ROOM_H, WALL_THICK), mats.wall);
        backWall.position.set(-WALL_THICK / 2, ROOM_H / 2, -ROOM_W / 2 - WALL_THICK / 2);
        backWall.receiveShadow = true; backWall.castShadow = true;
        roomGroup.add(backWall);

        // Chunky rounded wood coping on top edges (signature feature of the reference image)
        const capThickness = 0.58;
        const capHeight = 0.36;
        const lCap = new THREE.Mesh(new THREE.BoxGeometry(capThickness, capHeight, ROOM_W + WALL_THICK * 2 + 0.12), mats.wallCoping);
        lCap.position.set(-ROOM_W / 2 - WALL_THICK / 2, ROOM_H + capHeight / 2, 0);
        lCap.castShadow = true;

        const bCap = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + capThickness + 0.22, capHeight, capThickness), mats.wallCoping);
        bCap.position.set(0, ROOM_H + capHeight / 2, -ROOM_W / 2 - WALL_THICK / 2);
        bCap.castShadow = true;
        roomGroup.add(lCap, bCap);

        // 窗洞边界复用上面定义的 WIN_Z0 / WIN_Z1 / WIN_Y0 / WIN_Y1
        const WIN_CZ = (WIN_Z0 + WIN_Z1) / 2;
        const FRAME_BAR = 0.16;      // 窗框条宽（往墙外侧长）

        // 窗框往洞口里压进一点，盖住墙的洞口切面。
        // 早先窗框内沿和墙的切面完全齐平（都落在 WIN_Z0 / WIN_Y0 / WIN_Z1 / WIN_Y1），
        // 两张共面的面互相抢深度：缩放改变深度精度时谁赢就翻转，表现就是闪烁 + 变色。
        // 这里一律改成体积相交（穿插），绝不共面。
        const OVERLAP = 0.04;

        const windowFrameOuter = new THREE.Group();
        const wallX = -ROOM_W / 2 - WALL_THICK / 2;

        // 侧框：通高，并向上下墙体里各延伸一点。
        // 高度必须超过洞口，否则侧框的上下端面会和墙的上下沿落在同一个平面上，照样打架。
        const sideD = FRAME_BAR + OVERLAP;
        const sideH = WIN_H + 0.2;
        const wSideL = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK + 0.24, sideH, sideD), mats.wallCoping);
        wSideL.position.set(wallX, WIN_Y0 + WIN_H / 2, WIN_Z0 + (OVERLAP - FRAME_BAR) / 2);
        const wSideR = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK + 0.24, sideH, sideD), mats.wallCoping);
        wSideR.position.set(wallX, WIN_Y0 + WIN_H / 2, WIN_Z1 + (FRAME_BAR - OVERLAP) / 2);

        // 窗台 / 上框：比通宽略窄，两端埋进侧框内部（不与侧框外沿齐平）
        const railD = WIN_W + FRAME_BAR * 2 - 0.04;
        const wSill = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK + 0.24, 0.18, railD), mats.wallCoping);
        wSill.position.set(wallX, WIN_Y0 - 0.07 + OVERLAP / 2, WIN_CZ);
        const wTop = new THREE.Mesh(new THREE.BoxGeometry(WALL_THICK + 0.24, 0.18, railD), mats.wallCoping);
        wTop.position.set(wallX, WIN_Y1 + 0.07 - OVERLAP / 2, WIN_CZ);

        windowFrameOuter.add(wSill, wTop, wSideL, wSideR);
        roomGroup.add(windowFrameOuter);

        // Awning-style upper window sash —— 铰链在洞口上沿，窗扇往下挂
        const windowHingePivot = new THREE.Group();
        // 铰链比上框内沿再低一点，窗扇上沿才不会和 wTop 的下表面贴在一起
        windowHingePivot.position.set(wallX, WIN_Y1 - 0.10, WIN_CZ);

        const sashThickness = 0.09;
        // 和固定窗框的内沿留出 0.08 左右的缝（内沿在 WIN_Z0+OVERLAP / WIN_Z1-OVERLAP）
        const sashW = WIN_W - 0.24;
        const sashH = WIN_H - 0.30;
        const sashBar = 0.13;        // 窗框料宽

        // 拼装原则：竖料（边梃）通高并略做出头，横料（上/下冒头）缩短后塞进两根竖料之间，
        // 中竖梃再塞进横料里。每一处都是体积相交、端头埋进邻件内部，
        // 没有任何两张面共面 —— 这是消除 Z-fighting 的关键。
        const sashFrame = new THREE.Group();
        sashFrame.position.set(0, -sashH / 2, 0);

        const mkBar = (w, h, d, x, y, z) => {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.wallCoping);
          bar.position.set(x, y, z);
          bar.castShadow = true;
          sashFrame.add(bar);
          return bar;
        };
        const STILE_H = sashH + 0.04;                // 竖料比整体略高，做出头压住横料
        // 横料比"两竖料之间"略宽一点，两端埋进竖料内部。
        // 若正好取 sashW - 2*sashBar，端面会和竖料内沿落在同一平面 → 闪烁。
        const RAIL_W = sashW - sashBar * 1.2;
        mkBar(sashThickness, STILE_H, sashBar, 0, 0, -sashW / 2 + sashBar / 2);   // 左边梃
        mkBar(sashThickness, STILE_H, sashBar, 0, 0, sashW / 2 - sashBar / 2);    // 右边梃
        mkBar(sashThickness, sashBar, RAIL_W, 0, sashH / 2 - sashBar / 2, 0);      // 上冒头
        mkBar(sashThickness, sashBar, RAIL_W, 0, -sashH / 2 + sashBar / 2, 0);     // 下冒头
        // 中竖梃：高度取 sashH - sashBar，端头正好埋进上下横料的内部（不与横料表面共面）
        mkBar(sashThickness * 0.8, sashH - sashBar, 0.07, 0, 0, 0);                // 中竖梃

        // 玻璃放在框内，和四根料都留缝
        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, sashH - sashBar * 2 - 0.08, sashW - sashBar * 2 - 0.1),
          mats.glass
        );
        glassPane.renderOrder = 1;   // 明确排在木框之后绘制
        sashFrame.add(glassPane);

        windowHingePivot.add(sashFrame);

        // 左墙在 x 为负、室内在 +X 侧。窗扇自铰链向下悬垂，绕 Z 轴负向旋转
        // 才会让下沿往 -X（墙外）甩出去，所以朝外开必须用负角度。
        const SASH_OPEN_Z = -0.52;   // 推开
        const SASH_SHUT_Z = -0.02;   // 合上
        windowHingePivot.rotation.z = SASH_OPEN_Z;
        roomGroup.add(windowHingePivot);

        // Left wall picture frames
        function createWallFrame(w, h, x, y, z) {
          const g = new THREE.Group();
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, w), mats.wallCoping);
          const inner = new THREE.Mesh(new THREE.BoxGeometry(0.07, h - 0.12, w - 0.12), mats.cabinet);
          g.add(frame, inner);
          g.position.set(x, y, z);
          g.castShadow = true;
          return g;
        }
        const f1 = createWallFrame(0.46, 0.58, -ROOM_W / 2 + 0.03, 3.25, 2.45);
        const f2 = createWallFrame(0.46, 0.58, -ROOM_W / 2 + 0.03, 2.45, 2.45);
        roomGroup.add(f1, f2);

        // 圆角盒体。RoundedBoxGeometry 是 examples 里的附加件，加载失败时
        // 自动退回普通 BoxGeometry，场景不会因为一个装饰件加载不到就整个挂掉。
        // r128 时它挂在全局 THREE 上；r170 改成 ESM 模块，由场景层从 window 传进来。
        const rbox = (w, h, d, r) => (RoundedBoxGeometry
          ? new RoundedBoxGeometry(w, h, d, 3, r)
          : new THREE.BoxGeometry(w, h, d));

        const fridgeGroup = new THREE.Group();
        const fW = 1.62;
        const fH = 3.65;
        const fD = 1.48;

        // 机身用圆角盒体，棱角软下来才像台复古家电，而不是一个方块箱子
        const fBody = new THREE.Mesh(rbox(fW, fH, fD, 0.16), mats.mintAppliance);
        fBody.position.set(0, fH / 2, 0);
        fBody.castShadow = true; fBody.receiveShadow = true;
        fridgeGroup.add(fBody);

        // 上下门之间的分缝条。原来是 fW+0.02 / fD+0.02 —— 比机身还大，
        // 四周各探出 0.01，看上去像腰上围了条凸出来的带子。
        // 改成比机身略小，正面看是一条内凹的缝，而不是一圈凸边。
        const fSeam = new THREE.Mesh(rbox(fW - 0.06, 0.05, fD - 0.06, 0.02), mats.mintDark);
        fSeam.position.set(0, fH * 0.43, 0);
        fridgeGroup.add(fSeam);

        // Retro horizontal chrome handles (rounded so they don't read as razor edges)
        const fHandle1 = new THREE.Mesh(rbox(0.36, 0.05, 0.07, 0.022), mats.chrome);
        fHandle1.position.set(0.46, fH * 0.49, fD / 2 + 0.04);
        const fHandle2 = new THREE.Mesh(rbox(0.36, 0.05, 0.07, 0.022), mats.chrome);
        fHandle2.position.set(0.46, fH * 0.37, fD / 2 + 0.04);
        fridgeGroup.add(fHandle1, fHandle2);

        fridgeGroup.position.set(-ROOM_W / 2 + fW / 2 + 0.22, 0, -ROOM_W / 2 + fD / 2 + 0.22);
        roomGroup.add(fridgeGroup);

        // ---- 板条箱：真正的木箱 ----
        // 原来这儿是个实心 BoxGeometry(1.15, 0.52, 0.95)，看着就是个盒子。
        // 现在改成四根角柱 + 四面带缝的横板条 + 底板 —— 中间是空的，
        // 里面的东西看得见，这才是木箱该有的样子。
        const crateMat = new THREE.MeshStandardMaterial({ color: 0xb5653a, roughness: 0.80 });
        const crateDarkMat = new THREE.MeshStandardMaterial({ color: 0x8f4c2c, roughness: 0.84 });
        const breadScoreMat = new THREE.MeshStandardMaterial({ color: 0xe3ad72, roughness: 0.88 });

        function createSlattedCrate(w, h, d) {
          const g = new THREE.Group();
          const POST = 0.07;        // 角柱截面
          const SLAT_H = 0.08;      // 横板条高度
          const SLAT_T = 0.035;     // 横板条厚度
          // 板条要止于角柱内侧，不能贯通整个箱体。
          // 之前板条跨满整个宽度、两端和角柱的外侧面正好共面（都在 z = d/2），
          // 两个面叠在同一平面上互相闪烁 —— 表现就是箱子在闪。
          // 现在板条长度扣掉两端角柱，并且比角柱外表面略微外凸（PRoud），
          // 彻底避开共面，同时也更接近真实木箱：板条压在角柱之间、略微凸出。
          const PROUD = 0.005;
          const spanX = w - POST * 2;
          const spanZ = d - POST * 2;

          // 四根角柱
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(POST, h, POST), crateDarkMat);
            post.position.set(p[0] * (w / 2 - POST / 2), h / 2, p[1] * (d / 2 - POST / 2));
            post.castShadow = true; post.receiveShadow = true;
            g.add(post);
          });

          // 四面横板条，中间留缝
          const rows = Math.max(2, Math.round(h / 0.14));
          for (let r = 0; r < rows; r++) {
            const y = (r + 0.5) * (h / rows);
            [-1, 1].forEach(function (sz) {          // 前后两面，沿 X 铺
              const s = new THREE.Mesh(new THREE.BoxGeometry(spanX, SLAT_H, SLAT_T), crateMat);
              s.position.set(0, y, sz * (d / 2 - SLAT_T / 2 + PROUD));
              s.castShadow = true; s.receiveShadow = true;
              g.add(s);
            });
            [-1, 1].forEach(function (sx) {          // 左右两面，沿 Z 铺
              const s = new THREE.Mesh(new THREE.BoxGeometry(SLAT_T, SLAT_H, spanZ), crateMat);
              s.position.set(sx * (w / 2 - SLAT_T / 2 + PROUD), y, 0);
              s.castShadow = true; s.receiveShadow = true;
              g.add(s);
            });
          }

          // 底板：四条并排，同样止于角柱内侧，避免端面和角柱共面
          for (let i = 0; i < 4; i++) {
            const b = new THREE.Mesh(new THREE.BoxGeometry(spanX, 0.028, d / 4.4), crateDarkMat);
            b.position.set(0, 0.014, -d / 2 + POST + (i + 0.5) * ((d - POST * 2) / 4));
            b.receiveShadow = true;
            g.add(b);
          }
          return g;
        }

        // ---- 法棍 ----
        // 比例照 Baguette.glb 实测：长/宽 = 3.33，截面宽:高 = 1.37:1（宽大于高）。
        // 原来那版是 CylinderGeometry 细长直筒，长宽比 5.4，比模型瘦太多；
        // 而且两头一样粗、截面是圆的，看着像木棍。改成中间粗两头收的旋成体，
        // 再把截面压扁，外面压四道斜刀口。
        function createBaguette(len, width) {
          const g = new THREE.Group();
          const R = width / 2;

          // 截面轮廓。必须只写一份 —— 之前刀口位置还在用旧的 sin(πt)^0.55，
          // 而面包体已经换成了新轮廓，两套对不上，导致靠近两端的刀口浮在
          // 表面外面或陷进去，看起来完全不贴。
          // (1 - |2t-1|^3.2)^0.38：10% 长度处半径已有 77%、2% 处 45%，
          // 是饱满的圆头而不是尖角 —— 法棍两端是圆钝的。
          function shape(t) {
            return Math.pow(1 - Math.pow(Math.abs(2 * t - 1), 3.2), 0.38);
          }

          const pts = [];
          const N = 18;
          for (let i = 0; i <= N; i++) {
            const t = i / N;
            pts.push(new THREE.Vector2(Math.max(R * shape(t), 0.0015), t * len));
          }
          const geo = new THREE.LatheGeometry(pts, 22);

          // 轻微不规则：烘出来的面包表面不是数学上光滑的。
          // 沿法线方向做一点点确定性抖动（幅度只有半径的 2%），去掉塑料感。
          const posAttr = geo.attributes.position;
          for (let vi = 0; vi < posAttr.count; vi++) {
            const h = Math.sin(vi * 12.9898 + len * 7.13) * 43758.5453;
            const jitter = (h - Math.floor(h)) * 0.04 - 0.02;
            posAttr.setXYZ(
              vi,
              posAttr.getX(vi) * (1 + jitter),
              posAttr.getY(vi),
              posAttr.getZ(vi) * (1 + jitter)
            );
          }
          posAttr.needsUpdate = true;
          geo.computeVertexNormals();
          geo.translate(0, -len / 2, 0);            // 以中心为原点，摆位时好算

          const loaf = new THREE.Mesh(geo, mats.bread);
          loaf.scale.set(0.73, 1, 1);             // 截面压扁：局部 X 缩 0.73
          loaf.rotation.z = -Math.PI / 2;         // 长轴由局部 Y 转到世界 X
          loaf.castShadow = true; loaf.receiveShadow = true;
          g.add(loaf);

          // 斜刀口：法棍最显眼的特征。烘烤时刀口两侧的面团会鼓起成"耳朵"，
          // 所以不是一道凹槽，而是顺着顶部斜着隆起的一道棱。
          // 用压扁的椭球、沉进表面一半来做，比长方体自然得多。
          for (let i = 0; i < 4; i++) {
            const t = (i + 0.8) / 5.2;
            const x = (t - 0.5) * len * 0.82;
            const rAt = R * shape(t);
            const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), breadScoreMat);
            ear.scale.set(len * 0.085, R * 0.30, width * 0.26);
            // 沉一半进表面，只露出上半个隆起
            ear.position.set(x, rAt * 0.73 - R * 0.10, 0);
            ear.rotation.z = 0.85;                // 斜刀方向
            ear.castShadow = true;
            g.add(ear);
          }
          return g;
        }

        // 冰箱上的面包箱 + 里面的法棍
        const crateGroup = new THREE.Group();
        const CRATE_W = 1.10, CRATE_H = 0.42, CRATE_D = 0.78;
        crateGroup.add(createSlattedCrate(CRATE_W, CRATE_H, CRATE_D));

        // 法棍随手丢在箱里：两根底层交错、一根斜搭在上面。
        // 之前是三根平行、等距、整整齐齐码成一摞，看着像工厂排版，不像面包。
        const BG_LEN = 0.94, BG_W = BG_LEN / 3.33;   // 长宽比照实测 3.33
        const BG_H = BG_W * 0.73;
        const b1 = createBaguette(BG_LEN, BG_W);
        b1.position.set(0.01, 0.03 + BG_H / 2, -0.16);
        b1.rotation.set(0, 0.09, 0.03);
        const b2 = createBaguette(BG_LEN - 0.05, BG_W * 0.95);
        b2.position.set(-0.03, 0.03 + BG_H / 2, 0.17);
        b2.rotation.set(0, -0.14, -0.04);
        // 上面那根斜搭着，角度大一点，别和底下两平行
        const b3 = createBaguette(BG_LEN - 0.09, BG_W * 0.9);
        b3.position.set(0.02, 0.03 + BG_H * 1.46, 0.02);
        b3.rotation.set(0, 0.26, 0.07);
        crateGroup.add(b1, b2, b3);

        crateGroup.position.set(fridgeGroup.position.x, fH, fridgeGroup.position.z);
        roomGroup.add(crateGroup);

        const counterGroup = new THREE.Group();
        const cW = 3.3;
        const cH = 1.95;
        const cD = 1.5;

        // 台面（留出水槽开口）
        const cTopMat = mats.countertop;
        const topY = cH, topH = 0.12;
        // 左段（水槽左边）
        const leftW = (-0.76 - 1.38 / 2) - (-cW / 2);
        const leftX = -cW / 2 + leftW / 2;
        const cLeft = new THREE.Mesh(new THREE.BoxGeometry(leftW, topH, cD), cTopMat);
        cLeft.position.set(leftX, topY, 0); cLeft.castShadow = true; cLeft.receiveShadow = true;
        counterGroup.add(cLeft);
        // 右段（水槽右边）
        const rightW = (cW / 2) - (-0.76 + 1.38 / 2);
        const rightX = cW / 2 - rightW / 2;
        const cRight = new THREE.Mesh(new THREE.BoxGeometry(rightW, topH, cD), cTopMat);
        cRight.position.set(rightX, topY, 0); cRight.castShadow = true; cRight.receiveShadow = true;
        counterGroup.add(cRight);
        // 前段（水槽前面）
        const frontD = (0.08 - 1.08 / 2) - (-cD / 2);
        const frontZ = -cD / 2 + frontD / 2;
        const cFront = new THREE.Mesh(new THREE.BoxGeometry(1.38, topH, frontD), cTopMat);
        cFront.position.set(-0.76, topY, frontZ); cFront.castShadow = true; cFront.receiveShadow = true;
        counterGroup.add(cFront);
        // 后段（水槽后面）
        const backD = (cD / 2) - (0.08 + 1.08 / 2);
        const backZ = cD / 2 - backD / 2;
        const cBack = new THREE.Mesh(new THREE.BoxGeometry(1.38, topH, backD), cTopMat);
        cBack.position.set(-0.76, topY, backZ); cBack.castShadow = true; cBack.receiveShadow = true;
        counterGroup.add(cBack);

        // Cream white cabinet base —— 做成"空心但四面封闭"的壳：
        // 早期版本是实心柜体，会把水槽盆胆整个包住看不见；现在用板件拼，
        // 内部中空（盆胆放得下），但正面补上门板后不再是个漏光的黑洞。
        const cW2 = cW - 0.05, cD2 = cD - 0.08, cH2 = cH - 0.06, pT = 0.1;
        const mkPanel = (w, h, d, x, y, z) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.cabinet);
          m.position.set(x, y, z);
          m.castShadow = true; m.receiveShadow = true;
          counterGroup.add(m);
          return m;
        };
        mkPanel(cW2, pT, cD2, 0, pT / 2, -0.02);                                  // 底板
        mkPanel(cW2, cH2, pT, 0, cH2 / 2, -0.02 - cD2 / 2 + pT / 2);               // 后板
        mkPanel(pT, cH2, cD2, -cW2 / 2 + pT / 2, cH2 / 2, -0.02);                  // 左侧板
        mkPanel(pT, cH2, cD2, cW2 / 2 - pT / 2, cH2 / 2, -0.02);                   // 右侧板
        // 正面两扇门。宽度和位置按"内腔边界"算，而不是拿 cW2 乘系数 ——
        // 之前用 cW2*0.60 / cW2*0.34，两扇门中间留了 0.13 的缝，
        // 各自又捅穿了左右侧板（内边界 ±1.525，门却到了 -1.56 / +1.625），
        // 正面看就是"中间有空隙、边上还多出一块板"。
        const doorInL = -cW2 / 2 + pT;                 // 内腔左边界
        const doorInR =  cW2 / 2 - pT;                 // 内腔右边界
        const doorGap = 0.03;                          // 两扇门之间的缝
        const doorW = (doorInR - doorInL - doorGap) / 2;
        const doorZ = -0.02 + cD2 / 2 - pT / 2;
        mkPanel(doorW, cH2, pT, doorInL + doorW / 2, cH2 / 2, doorZ);              // 左门（水槽下）
        mkPanel(doorW, cH2, pT, doorInL + doorGap + doorW * 1.5, cH2 / 2, doorZ);  // 右门

        // 水槽：外框 + 凹陷盆胆
        const sinkW = 1.38, sinkD = 1.08;
        const yTop = cH + topH / 2;      // 台面上表面
        const rimH = 0.07;               // 陶瓷边框厚度
        const basinDepth = 0.36;         // 盆胆深度
        const wallT = 0.08;              // 盆壁厚度
        const sinkX = -0.76, sinkZ = 0.08;

        // 陶瓷边框（四条，围出台面开口）
        const rimMat = new THREE.MeshStandardMaterial({ color: 0xfbfaf8, roughness: 0.22, metalness: 0.04 });
        const iw = sinkW - wallT * 2, id = sinkD - wallT * 2;
        const mkRim = (w, d, x, z) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, rimH, d), rimMat);
          m.position.set(x, yTop - rimH / 2, z);
          m.castShadow = true; m.receiveShadow = true;
          counterGroup.add(m);
        };
        mkRim(sinkW, wallT, sinkX, sinkZ - sinkD / 2 + wallT / 2);
        mkRim(sinkW, wallT, sinkX, sinkZ + sinkD / 2 - wallT / 2);
        mkRim(wallT, sinkD - wallT * 2, sinkX - sinkW / 2 + wallT / 2, sinkZ);
        mkRim(wallT, sinkD - wallT * 2, sinkX + sinkW / 2 - wallT / 2, sinkZ);

        // 盆胆内壁：竖向渐变贴图（口沿亮 → 盆底暗），不用 AO 也能看出凹陷
        const basinGradTex = (function () {
          const cv = document.createElement('canvas');
          cv.width = 8; cv.height = 256;
          const g = cv.getContext('2d');
          const grd = g.createLinearGradient(0, 0, 0, 256);
          grd.addColorStop(0.00, '#fbf9f5');
          grd.addColorStop(0.30, '#e4ded6');
          grd.addColorStop(0.70, '#b6afa5');
          grd.addColorStop(1.00, '#8d867c');
          g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
          const t = new THREE.CanvasTexture(cv);
          t.colorSpace = THREE.SRGBColorSpace;
          return t;
        })();
        const innerMat = new THREE.MeshStandardMaterial({ map: basinGradTex, roughness: 0.3, metalness: 0.04 });
        const mkWall = (w, d, x, z) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(w, basinDepth, d), innerMat);
          m.position.set(x, yTop - rimH - basinDepth / 2, z);
          m.receiveShadow = true;
          counterGroup.add(m);
        };
        mkWall(iw, 0.02, sinkX, sinkZ - id / 2 + 0.01);
        mkWall(iw, 0.02, sinkX, sinkZ + id / 2 - 0.01);
        mkWall(0.02, id, sinkX - iw / 2 + 0.01, sinkZ);
        mkWall(0.02, id, sinkX + iw / 2 - 0.01, sinkZ);

        // 盆底：压暗以体现凹陷，但原来 0x5f5952 太黑了，光照进不去就是一团糊。
        // 抬到中灰并给一点自发光，保证任何角度都能看出是个盆而不是黑洞。
        const basinBottom = new THREE.Mesh(
          new THREE.BoxGeometry(iw, 0.03, id),
          new THREE.MeshStandardMaterial({
            color: 0x9a958c, roughness: 0.55, metalness: 0.02,
            emissive: 0x2a2724, emissiveIntensity: 1
          })
        );
        basinBottom.position.set(sinkX, yTop - rimH - basinDepth + 0.015, sinkZ);
        basinBottom.receiveShadow = true;
        counterGroup.add(basinBottom);

        // 排水孔
        const drain = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.012, 16),
          mats.chrome
        );
        drain.position.set(sinkX, yTop - rimH - basinDepth + 0.032, sinkZ);
        counterGroup.add(drain);

        // Gooseneck curved chrome retro faucet
        const faucetGroup = new THREE.Group();
        const faucetCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.58, 0),
          new THREE.Vector3(0.08, 0.74, 0),
          new THREE.Vector3(0.24, 0.66, 0),
          new THREE.Vector3(0.28, 0.54, 0)
        ]);
        const faucetMesh = new THREE.Mesh(new THREE.TubeGeometry(faucetCurve, 24, 0.038, 12, false), mats.chrome);
        faucetGroup.add(faucetMesh);

        const fLever = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.055, 0.07, 2, 0.025), mats.chrome);
        fLever.rotation.z = -0.12;   // 微微往下压的姿势，顺手一点
        fLever.position.set(-0.1, 0.18, 0);
        faucetGroup.add(fLever);
        faucetGroup.rotation.y = -Math.PI / 2;   // 壶嘴朝前下方（朝水槽）
        faucetGroup.position.set(-0.76, cH + 0.06, -0.6);   // 往后挪一点，别压水槽边上
        counterGroup.add(faucetGroup);

        // Lower open shelf with woven vegetable crate & pumpkins/potatoes
        // 开放式置物格。深度原来错用了 cD(1.5)——柜体只有 cD2(1.42)，
        // 再叠加 z=0.04 的偏移，正面比柜体门面多出 0.1，
        // 于是从两扇门之间戳出来一块，像柜子上贴了个凸出来的方盒子。
        // 改成贴着柜体内腔：深度用 cD2，中心对齐柜体中心 -0.02。
        const openCut = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.88, cD2 - 0.04), new THREE.MeshStandardMaterial({ color: 0xeae5dc, roughness: 0.8 }));
        openCut.position.set(0.85, 0.62, -0.02);
        counterGroup.add(openCut);

        // 台面下层开放格里的蔬果箱：原来也是实心方块，换成同一个板条箱
        const vegCrate = createSlattedCrate(0.92, 0.36, 0.72);
        vegCrate.position.set(0.85, 0.16, 0.04);
        counterGroup.add(vegCrate);

        const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xf57920, roughness: 0.65 });
        for (let pi = 0; pi < 4; pi++) {
          const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 10), pumpkinMat);
          pumpkin.scale.set(1.15, 0.85, 1.15);
          // 往下挪，让南瓜坐在箱底板附近，而不是浮在箱子中段
          pumpkin.position.set(0.72 + (pi % 2) * 0.24, 0.29, -0.08 + Math.floor(pi / 2) * 0.24);
          pumpkin.castShadow = true;
          counterGroup.add(pumpkin);
        }

        // Cutting board with loaf & knife
        const cBoard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.98), mats.countertopDark);
        cBoard.position.set(0.85, cH + 0.08, 0.12);
        cBoard.castShadow = true;
        const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mats.bread);
        loaf.scale.set(1.4, 0.72, 0.9);
        loaf.position.set(0.85, cH + 0.2, 0.12);
        loaf.castShadow = true;
        counterGroup.add(cBoard, loaf);

        // Spice jars on corner
        for (let j = 0; j < 2; j++) {
          const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 12), mats.ceramic);
          const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 12), mats.wallCoping);
          lid.position.y = 0.14;
          jar.add(lid);
          jar.position.set(1.36 + j * 0.2, cH + 0.16, -0.4);
          counterGroup.add(jar);
        }

        // 台面原本在 x=0.65，右边缘 2.30 越过了烤箱左边缘 1.88，
        // 两者在世界坐标上重叠 0.42 —— 棕色台面直接插进烤箱体内，
        // 表现就是"棕色跑到烤箱上、烤箱被挡住"。移到 x=0 后两侧各留出 0.23 / 0.26 间隙。
        counterGroup.position.set(0, 0, -ROOM_W / 2 + cD / 2 + 0.22);
        roomGroup.add(counterGroup);


        const ovenGroup = new THREE.Group();
        const oW = 1.62;
        const oH = 2.0;
        const oD = 1.5;

        // ---- 烤箱的尺寸分区 -------------------------------------------------
        // 机身按真实烤箱拆成控制面板 / 炉腔 / 底座三段，门和玻璃都开在炉腔那一段上。
        // 之前是整块 BoxGeometry：硬直角、门和机身齐平、玻璃只是贴在正面的一块发光板。
        const FOOT_H = 0.10;          // 底座离地高度，露出四个脚
        const PANEL_H = 0.34;         // 顶部控制面板
        const PLINTH_H = 0.16;        // 底部踢脚线
        const CAV_TOP = oH - PANEL_H;
        const CAV_BOT = PLINTH_H + 0.06;
        const CAV_H = CAV_TOP - CAV_BOT;
        const DOOR_INSET = 0.045;     // 门相对机身正面的凹陷深度
        const DOOR_FACE = oD / 2 - DOOR_INSET;

        // 炉腔内壁：单独一层深色金属盒，比机身小一圈，形成真实的"洞"
        const cavityMat = new THREE.MeshStandardMaterial({
          color: 0x2f2c29, roughness: 0.55, metalness: 0.35, side: THREE.BackSide
        });
        const CAV_W = oW - 0.30, CAV_D = oD - 0.34;
        const cavity = new THREE.Mesh(new THREE.BoxGeometry(CAV_W, CAV_H, CAV_D), cavityMat);
        cavity.position.set(0, (CAV_TOP + CAV_BOT) / 2, -0.02);
        ovenGroup.add(cavity);

        // —— 炉腔细节，让里面不再是空方盒 ——
        // 暗色搪瓷钢材质，和内壁同色系但粗糙度略不同，靠光影拉层次
        const enamelMat = new THREE.MeshStandardMaterial({ color: 0x3b3835, roughness: 0.6, metalness: 0.3 });
        const cavCY = (CAV_TOP + CAV_BOT) / 2;
        const cavBackZ = -0.02 - CAV_D / 2;

        // 后壁：热风循环烤箱的圆形风扇罩 + 中心轴盖
        const fanCover = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 28), enamelMat);
        fanCover.rotation.x = Math.PI / 2;
        fanCover.position.set(0, cavCY, cavBackZ + 0.015);
        ovenGroup.add(fanCover);
        const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16),
          new THREE.MeshStandardMaterial({ color: 0x4a4642, roughness: 0.5, metalness: 0.5 }));
        fanHub.rotation.x = Math.PI / 2;
        fanHub.position.set(0, cavCY, cavBackZ + 0.03);
        ovenGroup.add(fanHub);

        // 两侧壁：烤架滑轨，真实烤箱的搁板位三道槽
        [-1, 1].forEach(sx => {
          for (let li = 0; li < 3; li++) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, CAV_D - 0.16), enamelMat);
            rail.position.set(sx * (CAV_W / 2 - 0.03), CAV_BOT + CAV_H * (0.25 + li * 0.25), -0.02);
            ovenGroup.add(rail);
          }
        });

        // 底部：烤盘平搁在炉腔底
        const tray = new THREE.Mesh(rbox(CAV_W - 0.14, 0.045, CAV_D - 0.14, 0.015), enamelMat);
        tray.position.set(0, CAV_BOT + 0.03, -0.02);
        tray.receiveShadow = true;
        ovenGroup.add(tray);

        // 顶部：烧烤管，三根横杆藏在腔顶
        for (let bi = 0; bi < 3; bi++) {
          const broil = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, CAV_W - 0.2, 8), enamelMat);
          broil.rotation.z = Math.PI / 2;
          broil.position.set(0, CAV_TOP - 0.07, -0.02 - CAV_D / 2 + 0.2 + bi * 0.3);
          ovenGroup.add(broil);
        }

        // 机身：圆角盒体，棱角软下来才像台复古烤箱，而不是一个方块箱子
        const ovenBody = new THREE.Mesh(rbox(oW, oH, oD, 0.07), mats.mintAppliance);
        ovenBody.position.set(0, oH / 2, 0);
        ovenBody.castShadow = true; ovenBody.receiveShadow = true;
        ovenGroup.add(ovenBody);

        // 正面挖出门洞：四块面板围出一个矩形开口，中间透出炉腔。
        // 单靠机身方块挡不住，玻璃会被机身正面压住，所以正面必须是"框 + 洞"。
        const OPEN_Y0 = CAV_BOT + 0.05;
        const OPEN_Y1 = CAV_TOP - 0.05;
        const OPEN_W = oW - 0.34;
        const faceZ = oD / 2;
        const panelMat = mats.mintAppliance;
        const mkFacePanel = (w, h, x, y) => {
          const p = new THREE.Mesh(rbox(w, h, 0.06, 0.018), panelMat);
          p.position.set(x, y, faceZ - 0.03);
          p.castShadow = true; p.receiveShadow = true;
          ovenGroup.add(p);
          return p;
        };
        // 门洞左右立柱
        const sideW = (oW - OPEN_W) / 2;
        mkFacePanel(sideW, OPEN_Y1 - OPEN_Y0, -(oW / 2 - sideW / 2), (OPEN_Y0 + OPEN_Y1) / 2);
        mkFacePanel(sideW, OPEN_Y1 - OPEN_Y0, (oW / 2 - sideW / 2), (OPEN_Y0 + OPEN_Y1) / 2);
        // 门洞上下横梁（下横梁兼作门框底边）
        mkFacePanel(OPEN_W, OPEN_Y0 - PLINTH_H, 0, (PLINTH_H + OPEN_Y0) / 2);
        mkFacePanel(OPEN_W, oH - PLINTH_H - OPEN_Y1, 0, (OPEN_Y1 + oH) / 2);

        // 横向铬合金把手：两端支脚 + 一根横杆，跨在门上方
        const handleY = OPEN_Y1 - 0.16;
        const handleBar = new THREE.Mesh(rbox(OPEN_W - 0.24, 0.055, 0.075, 0.026), mats.chrome);
        handleBar.position.set(0, handleY, DOOR_FACE + 0.10);
        handleBar.castShadow = true;
        ovenGroup.add(handleBar);
        [-1, 1].forEach(side => {
          const post = new THREE.Mesh(rbox(0.06, 0.06, 0.14, 0.024), mats.chrome);
          post.position.set(side * (OPEN_W / 2 - 0.15), handleY, DOOR_FACE + 0.035);
          post.castShadow = true;
          ovenGroup.add(post);
        });

        // ---- 玻璃门：门框四条边 + 中间一块半透明玻璃 ------------------------
        // 之前正面是裸的矩形洞，炉腔直接敞着；真烤箱是门玻璃，透过去能看到
        // 里面的烤架和曲奇，但玻璃本身要带一点反射的感觉，所以用哑光半透明。
        const doorFrameMat = mats.mintDark;
        const DOOR_T = 0.05;
        const frameBarH = 0.09;
        // 门框上下横条
        [OPEN_Y0 + frameBarH / 2, OPEN_Y1 - frameBarH / 2].forEach(fy => {
          const barF = new THREE.Mesh(rbox(OPEN_W, frameBarH, DOOR_T, 0.015), doorFrameMat);
          barF.position.set(0, fy, DOOR_FACE);
          barF.castShadow = true;
          ovenGroup.add(barF);
        });
        // 门框左右立条
        [-1, 1].forEach(sx => {
          const sideF = new THREE.Mesh(rbox(frameBarH, OPEN_Y1 - OPEN_Y0 - frameBarH * 2, DOOR_T, 0.015), doorFrameMat);
          sideF.position.set(sx * (OPEN_W / 2 - frameBarH / 2), (OPEN_Y0 + OPEN_Y1) / 2, DOOR_FACE);
          sideF.castShadow = true;
          ovenGroup.add(sideF);
        });
        // 玻璃：略缩进门框，深度写关闭避免和炉腔内壁打架（之前闪烁的根因）
        const ovenGlass = new THREE.Mesh(
          new THREE.BoxGeometry(OPEN_W - frameBarH * 1.2, OPEN_Y1 - OPEN_Y0 - frameBarH * 1.2, 0.02),
          mats.glass
        );
        ovenGlass.position.set(0, (OPEN_Y0 + OPEN_Y1) / 2, DOOR_FACE - 0.01);
        ovenGroup.add(ovenGlass);

        // ---- 炉腔内的烤架与曲奇 --------------------------------------------
        // 烤架用前后两根横杆 + 中间几根纵杆拼出来，真实烤箱都是这种钢丝结构。
        const rackY = CAV_BOT + CAV_H * 0.42;
        const rack = new THREE.Group();
        const wireMat = new THREE.MeshStandardMaterial({ color: 0xb9b4ab, roughness: 0.34, metalness: 0.8 });
        [-1, 1].forEach(sz => {
          const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, CAV_W - 0.10, 8), wireMat);
          rail.rotation.z = Math.PI / 2;
          rail.position.set(0, 0, sz * (CAV_D / 2 - 0.14));
          rack.add(rail);
        });
        for (let wi = -3; wi <= 3; wi++) {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, CAV_D - 0.24, 6), wireMat);
          bar.rotation.x = Math.PI / 2;
          bar.position.set(wi * ((CAV_W - 0.24) / 6), 0, 0);
          rack.add(bar);
        }
        rack.position.set(0, rackY, -0.02);
        ovenGroup.add(rack);

        // 曲奇摆在烤架上（原来直接摆在机身正面，等于悬空在半空中）
        for (let ci = 0; ci < 3; ci++) {
          const cookie = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.03, 12), mats.bread);
          cookie.position.set(-0.25 + ci * 0.25, rackY + 0.03, -0.02);
          cookie.castShadow = true;
          ovenGroup.add(cookie);
          // 每块曲奇顶上加两颗巧克力豆
          for (let cn = 0; cn < 2; cn++) {
            const chip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6),
              new THREE.MeshStandardMaterial({ color: 0x4a2f1c, roughness: 0.6 }));
            chip.position.set(
              -0.025 + cn * 0.05,
              0.018,
              (ci % 2 ? 1 : -1) * 0.02
            );
            cookie.add(chip);
          }
        }

        // ---- 控制面板 ------------------------------------------------------
        // 面板比机身略深一点，凸出来一条，四颗旋钮带指示刻线。
        const panelBar = new THREE.Mesh(rbox(oW - 0.10, PANEL_H - 0.06, 0.05, 0.018), mats.mintDark);
        panelBar.position.set(0, oH - PANEL_H / 2 - 0.02, faceZ + 0.012);
        panelBar.castShadow = true;
        ovenGroup.add(panelBar);

        const knobMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.28, metalness: 0.55 });
        const knobY = oH - PANEL_H / 2 - 0.02;
        // 面板正面在 z = faceZ + 0.037，旋钮中心要再往前挪一截，
        // 否则旋钮大半埋在面板里，看上去只是面板上浮着四个圆片。
        const knobZ = faceZ + 0.070;
        const KNOB_H = 0.06;
        for (let k = 0; k < 4; k++) {
          const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, KNOB_H, 14), knobMat);
          knob.rotation.x = Math.PI / 2;
          knob.position.set(-0.46 + k * 0.31, knobY, knobZ);
          knob.castShadow = true;
          ovenGroup.add(knob);
          // 旋钮面上的指示刻线，指向上方（0 点位），远处看就是个真实的旋钮
          const marker = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.040, 0.012),
            new THREE.MeshStandardMaterial({ color: 0x8a8579, roughness: 0.5 }));
          marker.position.set(-0.46 + k * 0.31, knobY + 0.016, knobZ + KNOB_H / 2 + 0.004);
          ovenGroup.add(marker);
        }

        // ---- 底座与脚 ------------------------------------------------------
        const plinth = new THREE.Mesh(rbox(oW - 0.14, PLINTH_H, oD - 0.14, 0.03), mats.mintDark);
        plinth.position.set(0, PLINTH_H / 2, 0);
        plinth.castShadow = true;
        ovenGroup.add(plinth);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(p => {
          const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, FOOT_H, 10), mats.mintDark);
          foot.position.set(p[0] * (oW / 2 - 0.16), FOOT_H / 2, p[1] * (oD / 2 - 0.16));
          foot.castShadow = true;
          ovenGroup.add(foot);
        });

        // ---- 灶台 ----------------------------------------------------------
        // 原来灶台就是四个 TorusGeometry 圆环平放在机身顶面上，远看是四个甜甜圈。
        // 真实灶台有三层结构，少一层都不像：
        //   1) 下沉式炉盘（灶眼凹进去一圈，不是平的顶面）
        //   2) 灶头：底座 + 分火盘 + 中心盖
        //   3) 铸铁锅架：外圈 + 四根放射状支架，架在灶头上面
        // 台面颜色跟着机身走，不另起一套。之前用深褐灰 0x35322e + 近黑 0x24211e，
        // 一整块脏兮兮的深色压在薄荷绿机身顶上，看着像另接了一个不属于这里的零件。
        // 复古灶台的规矩是：台面机身同色，凹进去的地方用深一号同色系拉出层次，
        // 只有铸铁锅架是黑的 —— 对比靠锅架，不靠台面。
        const hobDark = new THREE.MeshStandardMaterial({ color: PALETTE.sageMintDark, roughness: 0.5 });
        const ironMat = new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.75, metalness: 0.12 });
        const GRATE_Y = oH + 0.10;          // 锅架顶面高度，锅要坐在这个面上

        // 灶面板：机身同色的薄荷绿，和烤箱是一个整体
        const hobPlate = new THREE.Mesh(rbox(oW - 0.08, 0.035, oD - 0.08, 0.012), mats.mintAppliance);
        hobPlate.position.set(0, oH - 0.012, 0);
        hobPlate.castShadow = true; hobPlate.receiveShadow = true;
        ovenGroup.add(hobPlate);

        for (let bx = 0; bx < 2; bx++) {
          for (let bz = 0; bz < 2; bz++) {
            const cx = -0.36 + bx * 0.72;
            const cz = -0.3 + bz * 0.65;

            // 1) 炉盘：灶眼位置往下凹一个浅碟，边缘留一圈台肩
            const burnerWell = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.205, 0.03, 22), hobDark);
            burnerWell.position.set(cx, oH + 0.006, cz);
            burnerWell.receiveShadow = true;
            ovenGroup.add(burnerWell);

            // 2) 灶头：底座 + 分火盘 + 一圈分火齿。
            //    名字统一加 burner 前缀：文件上方已经 const 过 bCap（后墙压顶），
            //    同名重复声明会让整个脚本停摆。
            const burnerBase = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.045, 18), ironMat);
            burnerBase.position.set(cx, oH + 0.04, cz);
            burnerBase.castShadow = true;
            ovenGroup.add(burnerBase);
            // 分火盘 + 周围的分火齿，是"灶头"最有辨识度的形状
            const burnerCap = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.072, 0.038, 16), hobDark);
            burnerCap.position.set(cx, oH + 0.08, cz);
            burnerCap.castShadow = true;
            ovenGroup.add(burnerCap);
            for (let t = 0; t < 8; t++) {
              const burnerTooth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.026, 0.018), ironMat);
              const a = (t / 8) * Math.PI * 2;
              burnerTooth.position.set(cx + Math.cos(a) * 0.098, oH + 0.062, cz + Math.sin(a) * 0.098);
              burnerTooth.rotation.y = -a;
              ovenGroup.add(burnerTooth);
            }

            // 3) 铸铁锅架：外圈 + 四根放射状支架
            const burnerGrate = new THREE.Group();
            const grateRing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.019, 6, 18), ironMat);
            grateRing.rotation.x = Math.PI / 2;
            grateRing.castShadow = true;
            burnerGrate.add(grateRing);
            for (let a = 0; a < 4; a++) {
              const grateArm = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.022, 0.030), ironMat);
              grateArm.rotation.y = (a / 4) * Math.PI;
              grateArm.castShadow = true;
              burnerGrate.add(grateArm);
            }
            burnerGrate.position.set(cx, GRATE_Y, cz);
            ovenGroup.add(burnerGrate);
          }
        }

        // 炉头上炖着一口赤陶小锅（原先是个薄荷绿水壶，尖嘴细腰像个茶壶，和灶台不搭）
        const potGroup = new THREE.Group();
        // 锅身：矮胖的圆筒，底部略收
        const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.21, 0.2, 20), mats.terracotta);
        potBody.position.y = 0.1; potBody.castShadow = true; potBody.receiveShadow = true;
        potGroup.add(potBody);
        // 锅口沿
        const potRim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.035, 20), mats.ceramic);
        potRim.position.y = 0.21; potRim.castShadow = true;
        potGroup.add(potRim);
        // 锅盖 + 盖钮
        const potLid = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.255, 0.05, 20), mats.ceramic);
        potLid.position.y = 0.245; potLid.castShadow = true;
        potGroup.add(potLid);
        const potKnob = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), mats.chrome);
        potKnob.position.y = 0.295; potKnob.castShadow = true;
        potGroup.add(potKnob);
        // 两侧锅耳：半环竖起来，环面朝前后（YZ 平面）
        [-1, 1].forEach(function (side) {
          const ear = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.024, 8, 16, Math.PI), mats.chrome);
          ear.rotation.y = Math.PI / 2;
          ear.rotation.z = side > 0 ? Math.PI : 0;
          ear.position.set(side * 0.235, 0.15, 0);
          ear.castShadow = true;
          potGroup.add(ear);
        });
        // 锅坐在铸铁锅架上（架面 GRATE_Y + 半个杆厚），不是浮在灶眼那个高度
        potGroup.position.set(-0.36, GRATE_Y + 0.011, -0.3);
        ovenGroup.add(potGroup);

        ovenGroup.position.set(ROOM_W / 2 - oW / 2 - 0.25, 0, -ROOM_W / 2 + oD / 2 + 0.22);
        roomGroup.add(ovenGroup);
        const islandGroup = new THREE.Group();
        const iW = 3.95;
        const iH = 2.15;
        const iD = 1.48;

        // Solid caramel wood island top
        const iTop = new THREE.Mesh(new THREE.BoxGeometry(iW, 0.14, iD), mats.countertop);
        iTop.position.set(0, iH, 0);
        iTop.castShadow = true; iTop.receiveShadow = true;
        islandGroup.add(iTop);

        // Cream white paneled island base
        const iBase = new THREE.Mesh(new THREE.BoxGeometry(iW - 0.3, iH - 0.08, iD - 0.26), mats.cabinet);
        iBase.position.set(-0.06, (iH - 0.08) / 2, -0.06);
        iBase.castShadow = true; iBase.receiveShadow = true;
        islandGroup.add(iBase);

        // Recessed wainscot panel moldings on the front
        for (let p = 0; p < 4; p++) {
          const panelTrim = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.25, 0.04), new THREE.MeshStandardMaterial({ color: 0xece6dd, roughness: 0.65 }));
          panelTrim.position.set(-1.26 + p * 0.81, 1.05, iD / 2 - 0.17);
          panelTrim.castShadow = true;
          islandGroup.add(panelTrim);
        }

        // Party treats and beverage accessories on the island
        //
        // 杯子原来是一个开口圆筒 + 一块咖啡色圆片：杯壁是直的、没有把手、
        // 咖啡是个浮在杯口的实心圆饼（不是液面），杯底直接坐在桌面上。
        // 现在按真实马克杯拆开做：杯身收腰 + 杯口外翻 + 杯耳 + 碟子 + 液面 + 热气。
        //
        // 位置也改了：原来 0.35, 0.15 这只正好压在饼干盘（0.4, -0.12）边上，
        // 两个现在都挪到桌子前后沿的空档里，不再遮挡甜点。
        const cupBodyMat = new THREE.MeshStandardMaterial({ color: 0xfbf8f2, roughness: 0.32 });
        const cupRimMat = new THREE.MeshStandardMaterial({ color: 0xd8e6ee, roughness: 0.22 });
        // 咖啡：原来的 0x3f2716 + roughness 0.18 太黑太亮，在 ACES 色调映射下
        // 会把环境光反射成一面白镜子，远看像"咖啡过了一会儿才加载出来"。
        // 现在改成看得清的拿铁色 + 哑光，一眼就是咖啡。
        const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.55, metalness: 0.0 });
        const saucerMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.35 });

        function createCup(x, z, rotY) {
          const g = new THREE.Group();
          const R_BOT = 0.075, R_TOP = 0.098, CUP_H = 0.19;

          // 碟子：底托 + 略微上翘的边沿
          const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.115, 0.018, 24), saucerMat);
          saucer.castShadow = true; saucer.receiveShadow = true;
          g.add(saucer);
          const saucerRim = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.011, 8, 24), saucerMat);
          saucerRim.rotation.x = Math.PI / 2;
          saucerRim.position.y = 0.011;
          g.add(saucerRim);

          // 杯身：上宽下窄的收腰造型（用 Lathe 画轮廓，比圆柱有形）
          const profile = [];
          const STEPS = 10;
          for (let i = 0; i <= STEPS; i++) {
            const t = i / STEPS;
            profile.push(new THREE.Vector2(
              R_BOT + (R_TOP - R_BOT) * Math.pow(t, 0.75),
              t * CUP_H
            ));
          }
          const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 26), cupBodyMat);
          cup.position.y = 0.018;
          cup.castShadow = true; cup.receiveShadow = true;
          g.add(cup);

          // 杯口外翻的一圈边
          const lip = new THREE.Mesh(new THREE.TorusGeometry(R_TOP + 0.004, 0.010, 8, 26), cupRimMat);
          lip.rotation.x = Math.PI / 2;
          lip.position.y = 0.018 + CUP_H;
          g.add(lip);

          // 杯耳：竖在杯子侧面的一段 C 形环。
          //
          // 之前这行写的是 rotation.y = Math.PI/2，那会把环从 XY 平面转到 ZY 平面 ——
          // 结果环面横过来贴在杯壁外侧，箍着杯子而不是伸出去，看着像个套圈。
          // 杯子把手应该在"竖直方向 + 朝外方向"张成的平面里，也就是默认的 XY 平面，
          // 所以正确做法是不转 Y，只绕 Z 转 -90°，把半环摆成"口朝杯子"的 C 形：
          //   弧角 0     -> (0, -R) 下端，嵌进杯壁
          //   弧角 π/2   -> (+R, 0) 外凸，伸到杯子外侧
          //   弧角 π     -> (0, +R) 上端，嵌进杯壁
          const HANDLE_R = 0.052;
          const handle = new THREE.Mesh(new THREE.TorusGeometry(HANDLE_R, 0.0125, 8, 20, Math.PI), cupBodyMat);
          handle.rotation.z = -Math.PI / 2;
          // x 用杯身下段半径 + 一点点，让上下两端都埋进杯壁，看起来是"长在杯子上"
          handle.position.set(R_BOT + 0.007, 0.018 + CUP_H * 0.55, 0);
          handle.castShadow = true;
          g.add(handle);

          // 咖啡液面：凹下去一点，不是浮在杯口的实心饼。
          // 颜色要够亮、粗糙度要够高：之前用接近黑的 0x3f2716 + roughness 0.18，
          // 在 ACES 色调映射下几乎变成一面镜子，把环境亮光整个反射回来，
          // 远看就是"杯口那片白色慢慢变成褐色"，看着像咖啡延迟加载出来了。
          const liquid = new THREE.Mesh(new THREE.CylinderGeometry(R_TOP - 0.013, R_TOP - 0.016, 0.012, 22), coffeeMat);
          liquid.position.y = 0.018 + CUP_H - 0.028;
          g.add(liquid);

          // 液面上的那圈油脂／泡沫：一道略浅的环，让液面不是一块死板的圆饼
          const crema = new THREE.Mesh(
            new THREE.RingGeometry(R_TOP - 0.062, R_TOP - 0.014, 22),
            new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.6, side: THREE.DoubleSide })
          );
          crema.rotation.x = -Math.PI / 2;
          crema.position.y = 0.018 + CUP_H - 0.0215;
          g.add(crema);

          g.position.set(x, iH + 0.07, z);   // 0.07 = 台面厚度一半，坐在台面上
          g.rotation.y = rotY;
          islandGroup.add(g);
          return g;
        }

        // 两只杯子：一只放前沿（-1.30, 0.44），一只放后沿（-0.45, -0.50）。
        // 甜点盘在 z ≈ -0.15 ~ 0.15 一带，所以杯子全部推到 |z| > 0.4 的前后沿，互不遮挡。
        createCup(-1.30, 0.44, -0.5);
        createCup(-0.45, -0.50, 2.3);

        // 备注：这里原本有一张外部 3D 素材的路径表（华夫饼 FBX/GLB、窗台花盆 GLB），
        // 现在厨房里所有家具、甜点、植物都已改为纯代码生成，那张表没有读者了，
        // 连同 models/ 目录一起删掉了。
        //
        // KayKit 小人原本也在这张表里（kaykit/Characters/Rogue.glb + kaykit/Animations/*.glb），
        // 3D 小人下线后已连同 js/kaykit-character.js 一起删除。
        // 注意 flower-pot.glb 还在用（窗台花盆），别跟着一起清掉。

        // ---- 叠起来的华夫饼（纯代码生成）------------------------------------
        // 一片华夫饼 = 圆角方饼 + 表面菱形网格凹槽 + 边缘波浪边。
        // 网格用交叉的细长条压出"格子"的明暗，比单纯一个方块有说服力得多。
        const waffleDough = new THREE.MeshStandardMaterial({ color: 0xd89a52, roughness: 0.88 });
        const waffleGrid = new THREE.MeshStandardMaterial({ color: 0xb87b3a, roughness: 0.92 });
        const waffleButter = new THREE.MeshStandardMaterial({ color: 0xf2d98a, roughness: 0.5 });

        // 一片华夫饼。size = 边长，gridN = 网格格数
        function makeWaffleSlice(size, gridN) {
          const g = new THREE.Group();
          const h = size * 0.17;

          // 饼身：圆角方块
          const body = new THREE.Mesh(rbox(size, h, size, size * 0.16), waffleDough);
          body.castShadow = true; body.receiveShadow = true;
          g.add(body);

          // 表面网格：横竖两组细条，交叉出菱形格。
          // 条要比饼面高一点点，形成凸起的格筋，凹槽自然落在条与条之间。
          const step = size / gridN;
          const barT = size * 0.035;          // 格筋粗细
          const barH = h * 0.30;              // 格筋高度
          const span = size * 0.86;           // 网格整体范围，四周留边
          const count = gridN - 1;
          for (let i = 0; i < count; i++) {
            const off = -span / 2 + step * (i + 0.5);
            [-1, 1].forEach(dir => {
              // dir=1 是一组（沿 x 铺），dir=-1 是另一组（沿 z 铺）
              const bar = new THREE.Mesh(
                new THREE.BoxGeometry(dir > 0 ? span : barT, barH, dir > 0 ? barT : span),
                waffleGrid
              );
              bar.position.set(dir > 0 ? 0 : off, h / 2 + barH / 2 - h * 0.06, dir > 0 ? off : 0);
              bar.castShadow = true;
              g.add(bar);
            });
          }
          return g;
        }

        // 盘子上的成品：三层华夫饼错位叠起，顶上放一块黄油
        function addStackedWaffle(x, z) {
          const plateTop = PLATE_TOP;
          const stack = new THREE.Group();

          const s0 = 0.30, s1 = 0.27, s2 = 0.24;   // 越往上越小
          const layerY = [0, s0 * 0.15, s0 * 0.15 + s1 * 0.14];

          // 每层绕 Y 轴转一点，叠出"随手一放"的感觉
          [ [0, 0.34], [0.28, -0.19], [0.55, 0.42] ].forEach((cfg, idx) => {
            const slice = makeWaffleSlice([s0, s1, s2][idx], 4);
            slice.position.y = layerY[idx];
            slice.rotation.y = cfg[0];
            stack.add(slice);
          });

          // 黄油块：歪着搭在最上层，边缘略微融化
          const butter = new THREE.Mesh(rbox(0.075, 0.035, 0.055, 0.008), waffleButter);
          butter.position.set(0.03, layerY[2] + s2 * 0.17 + 0.018, -0.02);
          butter.rotation.y = 0.5;
          butter.castShadow = true;
          stack.add(butter);

          // 洒在上面的糖粉：一小撮白点
          for (let i = 0; i < 7; i++) {
            const dust = new THREE.Mesh(
              new THREE.SphereGeometry(0.006 + Math.random() * 0.004, 6, 5),
              new THREE.MeshBasicMaterial({ color: 0xfffdf6 })
            );
            dust.position.set(
              (Math.random() - 0.5) * s2 * 0.7,
              layerY[2] + s2 * 0.17 + 0.006,
              (Math.random() - 0.5) * s2 * 0.7
            );
            stack.add(dust);
          }

          stack.position.set(x, plateTop, z);
          islandGroup.add(stack);
        }

        // ---- 可颂（纯代码生成）----------------------------------------------
        // 沿一段二次贝塞尔曲线摆一串逐渐变细的椭球。三点决定它像不像可颂：
        //   1) 半径按 sin(πt)^0.6 变化 —— 两端收成尖角、中间最粗
        //   2) 曲线两端朝 +z、中间往 -z 鼓，整体弯成月牙
        //   3) 每个椭球沿曲线切线拉长、段与段重叠，天然形成一节节的卷层褶皱
        // 半径取 0.6 次幂而不是 1，是为了让中段更饱满、收尖更利落。
        // 颜色：烘得透的深金棕。之前 0xb9762f / 0xd19449 在暖色主光下偏浅发黄，
        // 和华夫饼、饼干挤在一起分不出层次。
        const croissantDough = new THREE.MeshStandardMaterial({ color: 0x8f5218, roughness: 0.82 });
        const croissantFlaky = new THREE.MeshStandardMaterial({ color: 0xa9682a, roughness: 0.74 });

        function addCroissant(x, z) {
          const SEG = 15;
          const MAXR = 0.088;
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(-0.205, 0, 0.068),
            new THREE.Vector3(0, 0, -0.140),
            new THREE.Vector3(0.205, 0, 0.068)
          );

          const g = new THREE.Group();
          for (let i = 0; i < SEG; i++) {
            const t = i / (SEG - 1);
            const p = curve.getPoint(t);
            const tan = curve.getTangent(t);
            const r = MAXR * Math.pow(Math.sin(Math.PI * t), 0.72);
            if (r < 0.004) continue;

            const seg = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), i % 2 ? croissantFlaky : croissantDough);
            // 蓬松的关键：不要拉太长。
            // 之前长轴给到 1.55、段间又高度重叠，结果是一根粗细均匀的香肠 ——
            // 分瓣被抹平了。改成接近球形（长轴 1.20）并把垂直方向从 0.82 抬到 0.95，
            // 每一瓣才鼓起来，瓣与瓣之间留得出缝。
            seg.scale.set(r * 1.12, r * 0.95, r * 1.20);
            seg.position.copy(p);
            // 每段底面贴住盘面：抬升自身垂直半径，两端再加一点翘起
            seg.position.y = r * 0.95 + 0.026 * (1 - Math.sin(Math.PI * t));
            seg.lookAt(p.clone().add(tan));
            seg.castShadow = true; seg.receiveShadow = true;
            g.add(seg);
          }

          // 糖霜：几粒浅色碎点，落在中段
          for (let i = 0; i < 6; i++) {
            const t = 0.32 + Math.random() * 0.36;
            const p = curve.getPoint(t);
            const r = MAXR * Math.pow(Math.sin(Math.PI * t), 0.6);
            const frost = new THREE.Mesh(
              new THREE.SphereGeometry(0.006 + Math.random() * 0.004, 6, 5),
              new THREE.MeshBasicMaterial({ color: 0xfffdf6 })
            );
            frost.position.set(p.x + (Math.random() - 0.5) * r, r * 0.80 + r * 0.55, p.z + (Math.random() - 0.5) * r);
            g.add(frost);
          }

          g.position.set(x, PLATE_TOP, z);
          g.rotation.y = -0.35;   // 斜着摆，别正对镜头
          islandGroup.add(g);
        }

        // ---- 甜甜圈：几何按 Donut Pink.glb 实测数据还原 ----
        // 虽然最终没用那个 GLB（本地 file:// 加载不了），但解析它 604 个顶点
        // 量出来的数据是真的，用在这里比拍脑袋靠谱：
        //   · R_major / r_tube = 1.326
        //   · X、Z 跨度完全一致 → 环面，轴向 Y，最低点 y=0
        //   · 按半径把顶点分成 14 桶看每桶的 y 上限：内孔（桶 0）和最外缘（桶 13）
        //     都没超过管子顶部 → 那两处没有糖霜；只有桶 2~12 超过去
        //   · 糖霜最高点比管顶高 0.28 个管半径
        // 由 r = R + r_t·cos(phi) 反推糖霜覆盖的截面角：
        //   外缘 phi = acos(2.02 - 1.326) ≈ 0.80 rad
        //   内缘 phi = acos(0.61 - 1.326) ≈ 2.37 rad
        // 所以糖霜是盖在顶部、两端渐薄融进面团的一层壳 —— 不是齐边切一半的半环。
        // （第一版就是用 TorusGeometry(arc=π) 做的半环，两头硬切口，很难看。）
        //
        // 注意：下面只有「糖霜怎么盖」是照实测来的；尺寸比例是按要求重新定的，
        // 不再照搬模型的 R/r = 1.326 —— 那个比例下环孔半径只有管半径的 0.33 倍，
        // 孔小到几乎看不见。这里放大到 1.9，孔径占外径约 28%。
        // 颜色必须比"看起来对"的值更深一档。
        // 场景用了 ACESFilmicToneMapping（renderer.toneMappingExposure 1.05，本属正常），
        // 而灯很多：半球光 0.85 + 主光 1.48 + 补光 0.45 + 烤箱内灯 2.1。
        // 表面亮度早就超过 1，ACES 会把偏浅的底色推成粉白色 —— 也就是"颜色好淡、不好吃"的原因。
        // 所以底色要压深、提高饱和度，让它过完 ACES 还能剩下颜色。
        const donutDoughMat = new THREE.MeshStandardMaterial({ color: 0x9a5220, roughness: 0.85 });
        const donutFrostMat = new THREE.MeshStandardMaterial({ color: 0xd4527e, roughness: 0.40 });
        // 彩针糖同理，全部压深一档，纯白会直接过曝成一片
        const donutSprinkleCols = [0xf5e2bb, 0x5fb6d8, 0xf5b942, 0x6fc47c];

        function addDonut(x, z) {
          const g = new THREE.Group();
          const rTube = 0.045, rMajor = 0.0855;     // R/r = 1.9，外径 0.261，环孔径 0.081
          const FROST_T = 0.45 * rTube;             // 糖霜最厚处：实测是 0.28，加厚到 0.45
          const PHI0 = 0.80, PHI1 = 2.37;           // 糖霜覆盖的截面角范围（照实测）

          // 糖霜厚度：两端收到 0、中间最厚 —— 这才是"淋上去"的样子
          function frostThick(u) { return FROST_T * Math.pow(Math.sin(Math.PI * u), 0.65); }

          function frostPoint(theta, u) {
            const phi = PHI0 + (PHI1 - PHI0) * u;
            const d = rTube + frostThick(u);
            const rr = rMajor + d * Math.cos(phi);
            return new THREE.Vector3(Math.cos(theta) * rr, d * Math.sin(phi), Math.sin(theta) * rr);
          }

          // 本体：完整环面
          const dough = new THREE.Mesh(new THREE.TorusGeometry(rMajor, rTube, 20, 48), donutDoughMat);
          dough.rotation.x = Math.PI / 2;           // 默认在 XY 面，转成水平
          dough.castShadow = true; dough.receiveShadow = true;
          g.add(dough);

          // 糖霜壳：绕环向一圈 × 截面一段，放样出曲面
          const SEG_T = 48, SEG_P = 18;
          const fpos = [], fidx = [];
          for (let i = 0; i <= SEG_T; i++) {
            const th = (i / SEG_T) * Math.PI * 2;
            for (let j = 0; j <= SEG_P; j++) {
              const p = frostPoint(th, j / SEG_P);
              fpos.push(p.x, p.y, p.z);
            }
          }
          const ROW = SEG_P + 1;
          for (let i = 0; i < SEG_T; i++) {
            for (let j = 0; j < SEG_P; j++) {
              const a = i * ROW + j, b = a + 1, c = a + ROW, d = c + 1;
              fidx.push(a, c, b, b, c, d);
            }
          }
          const fgeo = new THREE.BufferGeometry();
          fgeo.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
          fgeo.setIndex(fidx);
          fgeo.computeVertexNormals();
          const frost = new THREE.Mesh(fgeo, donutFrostMat);
          frost.castShadow = true;
          g.add(frost);

          // 彩针糖：用 frostPoint 取位置，保证插在糖霜表面上而不是浮在空中。
          // 用 CylinderGeometry 而不是 CapsuleGeometry —— 后者是 three.js r140 才有的，
          // 本项目锁 r128，直接用会抛 "is not a constructor" 把整个脚本打断。
          const sprGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.020, 6);
          for (let i = 0; i < 14; i++) {
            const spr = new THREE.Mesh(sprGeo,
              new THREE.MeshStandardMaterial({ color: donutSprinkleCols[i % 4], roughness: 0.5 }));
            spr.position.copy(frostPoint(Math.random() * Math.PI * 2, 0.22 + Math.random() * 0.56));
            spr.position.y += 0.004;
            spr.rotation.set(Math.random() * 1.4 - 0.7, Math.random() * 6.28, Math.PI / 2 + (Math.random() - 0.5));
            g.add(spr);
          }

          g.position.set(x, PLATE_TOP + rTube, z);   // 管半径 = 环面半高，抬到这个高度才贴盘面
          islandGroup.add(g);
        }

        // 盘子不用 mats.ceramic：那个是 0xfcfbfa，几乎纯白但也几乎没质感，
        // 配一个纯圆柱没有盘沿，看着像块塑料板。形状改成有盘沿的旋成体（见下）。
        //
        // 颜色必须用**中性偏冷**的白，不能用暖米白。之前试的 0xe6d9c3 是
        // RGB(230,217,195) —— R 比 B 高 35，本身就偏黄；再碰上场景里全暖的光
        // （主光 0xfffaec、补光 0xffedd9、半球光地面色 0x8a8274），
        // 盘底就被染成明显的土黄色。改成 R≈G≈B 略偏冷就不会吃这套暖光。
        const plateWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.34, metalness: 0 });
        // 装饰线改成极淡的冷灰，不是彩色 —— 一圈细白盘子上的浅色线
        const plateBandMat = new THREE.MeshStandardMaterial({ color: 0xdcdfe0, roughness: 0.28, metalness: 0 });
        // PLATE_TOP 是甜点坐落的高度，所有 addXxx() 都按它摆，改了要同步。
        const PLATE_TOP = iH + 0.095;
        // 盘子轮廓拆成上下两段，因为上下受的光完全不同，必须给不同材质：
        //   上面吃主光（暖白），下面是背光的
        // 盘子放在 0xd59868 的焦糖色台面上，暖光从台面反弹上来打在盘底，
        // 所以盘底会泛土黄 —— 这是光照造成的，光调底色压不掉，
        // 只能给盘底一份偏冷的白，用冷暖互补把它抵消掉。
        const PLATE_PROFILE_TOP = [
          [0.000, 0.035], [0.100, 0.035], [0.190, 0.036], [0.245, 0.046],
          [0.285, 0.069], [0.300, 0.079], [0.298, 0.062]
        ];
        const PLATE_PROFILE_BOTTOM = [
          [0.298, 0.062], [0.270, 0.030], [0.200, 0.008], [0.100, 0.002], [0.000, 0.000]
        ];
        // 偏冷的白：抵消台面反弹上来的暖黄。蓝通道比红通道高 20 就能压住。
        const plateUnderMat = new THREE.MeshStandardMaterial({ color: 0xdfe8f2, roughness: 0.46, metalness: 0 });

        function createPlate(x, z) {
          const g = new THREE.Group();
          const lathe = function (profile, mat) {
            const pts = profile.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
            const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 30), mat);
            m.receiveShadow = true; m.castShadow = true;
            return m;
          };
          g.add(lathe(PLATE_PROFILE_TOP, plateWhiteMat));
          g.add(lathe(PLATE_PROFILE_BOTTOM, plateUnderMat));

          // 外沿上的一道细色边：陶瓷上釉的装饰线，一圈就有质感
          const band = new THREE.Mesh(new THREE.TorusGeometry(0.2985, 0.0055, 8, 32), plateBandMat);
          band.rotation.x = Math.PI / 2;
          band.position.y = 0.076;
          g.add(band);

          // 组原点定在盘心平面（local y=0），整组下移使盘心落在 PLATE_TOP
          g.position.set(x, PLATE_TOP - 0.035, z);
          return g;
        }

        function createPlateWithPastry(x, z, type) {
          islandGroup.add(createPlate(x, z));

          if (type === 'waffle') {
            addStackedWaffle(x, z);
          } else if (type === 'croissant') {
            addCroissant(x, z);
          } else if (type === 'donut') {
            addDonut(x, z);
          }
        }
        // 盘子上三种甜点：可颂、甜甜圈、华夫饼。
        // 原先还有饼干（'cookies'），已按要求删除，对应实现也一并移除。
        createPlateWithPastry(-0.15, -0.15, 'croissant');
        createPlateWithPastry(0.4, -0.12, 'donut');
        createPlateWithPastry(0.95, 0.15, 'waffle');

        // Pitcher / mint teapot & delicate tulip vase
        const islandPitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.38, 14), mats.mintDark);
        islandPitcher.position.set(1.42, iH + 0.24, 0.12);
        islandPitcher.castShadow = true;
        islandGroup.add(islandPitcher);

        const slimVase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.32, 12), mats.ceramic);
        slimVase.position.set(-1.62, iH + 0.22, -0.28);
        const flowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3), mats.wallCoping);
        flowerStem.position.set(-1.62, iH + 0.42, -0.28);
        const tulip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe86678, roughness: 0.6 }));
        tulip.scale.set(0.8, 1.3, 0.8);
        tulip.position.set(-1.62, iH + 0.56, -0.28);
        islandGroup.add(slimVase, flowerStem, tulip);

        // ===== 椅子：程序化生成，比例按 chair1.src.glb 实测还原 =====
        //
        // 两个 GLB（furnimesh 扫描模型）合计 45MB、18.9 万顶点起、贴图是照片级 PBR，
        // 加载慢、画风也不搭，所以改用代码生成。下面的尺寸不是估的，是直接解析
        // chair1.src.glb 的顶点云量出来的：
        //   · 整体 0.629(宽) × 1.004(高) × 0.629(深)，底面近似正方形
        //   · 座面顶在总高 0.52 处（h=0.50 那层顶点数暴增到 48326，是朝上的座面）
        //   · 下部 X 跨度从 0.629 收到 0.492 → 四条腿向上内收
        //   · 下部 X 直方图中间 5 段顶点全为 0、中心区域 0 顶点 → 确定是四条独立角腿，
        //     不是整块底座
        //   · 靠背区（h>0.65）X 仍约 0.60 但 Z 只剩 0.26 → 无扶手、靠背薄而通宽
        // 建模单位：总高 = 1，最后统一缩放到 CHAIR_H。
        // 椅子总高。座面高度 = 0.58 × 本值（SEAT_TOP 是占总高的比例），
        // 所以改这一个数就能整体调高矮：台面 2.15、想坐上去舒服就往 2.0 以上取。
        const CHAIR_H = 2.05;
        const SEAT_TOP = 0.58;         // 座面顶（占总高比例）
        const SEAT_T = 0.11;           // 座垫厚
        const SEAT_W = 0.60, SEAT_D = 0.55;
        const BACK_T = 0.20;           // 靠背厚度

        // 在两点之间架一根锥形杆（腿、靠背支柱都用它，避免手算旋转角）
        function limb(mat, rTop, rBot, p0, p1) {
          const dir = p1.clone().sub(p0);
          const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, dir.length(), 10), mat);
          m.position.copy(p0).add(p1).multiplyScalar(0.5);
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          m.castShadow = true;
          return m;
        }

        function createChair(x, z, tint) {
          const g = new THREE.Group();
          const seatMat = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.8, metalness: 0 });
          const legMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });

          // 四条角腿：底端外撇、顶端内收，对应实测的 0.629 → 0.492。
          // 半径 0.030/0.042 → 0.020/0.028：之前那版在缩放到 2.05 之后显得又粗又笨。
          const legTopY = SEAT_TOP - SEAT_T;
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
            g.add(limb(
              legMat, 0.020, 0.028,
              new THREE.Vector3(p[0] * 0.285, 0, p[1] * 0.255),
              new THREE.Vector3(p[0] * 0.225, legTopY, p[1] * 0.200)
            ));
          });

          // 座垫：圆角方块，比腿的外沿宽（实测座面 0.60 vs 腿 0.49）
          const seat = new THREE.Mesh(rbox(SEAT_W, SEAT_T, SEAT_D, 0.045), seatMat);
          seat.position.y = SEAT_TOP - SEAT_T / 2;
          seat.castShadow = true; seat.receiveShadow = true;
          g.add(seat);

          // 座垫下方一圈收边，避免底面看起来是切平的
          const seatUnder = new THREE.Mesh(rbox(SEAT_W - 0.06, 0.05, SEAT_D - 0.06, 0.02), seatMat);
          seatUnder.position.y = SEAT_TOP - SEAT_T - 0.015;
          seatUnder.castShadow = true;
          g.add(seatUnder);

          // 靠背：从座面后方竖起，略向后倾
          const backZ = -(SEAT_D / 2 - BACK_T / 2 + 0.01);
          const backBot = SEAT_TOP - 0.04;
          const backH = 1.0 - backBot;
          const backrest = new THREE.Mesh(rbox(SEAT_W - 0.04, backH, BACK_T, 0.055), seatMat);
          backrest.position.set(0, backBot + backH / 2, backZ);
          backrest.rotation.x = -0.10;          // 后倾
          backrest.castShadow = true;
          g.add(backrest);

          // 靠背顶部的圆边
          const backCrest = new THREE.Mesh(new THREE.CylinderGeometry(BACK_T / 2, BACK_T / 2, SEAT_W - 0.04, 14), seatMat);
          backCrest.rotation.z = Math.PI / 2;
          backCrest.position.set(0, backBot + backH, backZ - 0.02);
          backCrest.castShadow = true;
          g.add(backCrest);

          // 后侧两根靠背支柱，从座面斜撑到靠背背面
          [-1, 1].forEach(function (sx) {
            g.add(limb(
              legMat, 0.016, 0.019,
              new THREE.Vector3(sx * 0.20, SEAT_TOP - SEAT_T, -0.10),
              new THREE.Vector3(sx * 0.21, backBot + backH * 0.55, backZ - BACK_T / 2)
            ));
          });

          // 横撑（前后各一根，把四条腿连起来）
          [0.20, -0.20].forEach(function (sz) {
            g.add(limb(legMat, 0.012, 0.012,
              new THREE.Vector3(-0.245, 0.20, sz),
              new THREE.Vector3(0.245, 0.20, sz)));
          });

          g.scale.setScalar(CHAIR_H);          // 单位总高 1 → 实际 1.78
          g.position.set(x, 0, z);
          g.rotation.y = Math.PI;              // 正面朝岛台
          return g;
        }

        // 两把椅子：深鼠尾草绿 + 暖陶木色。
        // 都比同名的家具色再压深一点 —— 椅子是前景家具，太浅会发白糊掉。
        const chair1 = createChair(-1.05, iD / 2 + 0.5, PALETTE.chairSage);
        const chair2 = createChair(0.5, iD / 2 + 0.5, PALETTE.chairWood);
        islandGroup.add(chair1, chair2);

        // 岛台边的小推车按要求删掉了（原本是牛皮纸袋 + 三根竖插法棍，
        // 后来换成一辆小推车，现在整块移除）。

        islandGroup.position.set(-0.7, 0, 1.6);
        roomGroup.add(islandGroup);

        const wallDecorGroup = new THREE.Group();
        const bWallZ = -ROOM_W / 2 + 0.16;

        // Glowing fairy light garland draped across back wall
        const garlandCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.8, 4.4, bWallZ),
          new THREE.Vector3(-0.9, 4.1, bWallZ + 0.05),
          new THREE.Vector3(0.0, 4.25, bWallZ + 0.04),
          new THREE.Vector3(0.9, 3.95, bWallZ + 0.06),
          new THREE.Vector3(1.8, 4.3, bWallZ)
        ]);
        const garlandWire = new THREE.Mesh(new THREE.TubeGeometry(garlandCurve, 32, 0.012, 6, false), mats.wall);
        wallDecorGroup.add(garlandWire);

        for (let bi = 0; bi <= 14; bi++) {
          const pt = garlandCurve.getPoint(bi / 14);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), mats.fairyBulb);
          bulb.position.copy(pt).add(new THREE.Vector3(0, -0.04, 0.02));
          wallDecorGroup.add(bulb);
        }

        // Cubby pigeon-hole wood wall spice rack
        const cubbyGroup = new THREE.Group();
        const cubbyW = 1.35;
        const cubbyH = 1.25;
        const cubbyD = 0.45;
        const cubbyFrame = new THREE.Mesh(new THREE.BoxGeometry(cubbyW, cubbyH, cubbyD), mats.wallCoping);
        cubbyFrame.castShadow = true;
        cubbyGroup.add(cubbyFrame);

        const hole1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, cubbyD + 0.02), mats.wall);
        hole1.position.set(-0.32, 0.28, 0);
        const hole2 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.52, cubbyD + 0.02), mats.wall);
        hole2.position.set(0.32, 0.28, 0);
        const hole3 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, cubbyD + 0.02), mats.wall);
        hole3.position.set(0, -0.32, 0);
        cubbyGroup.add(hole1, hole2, hole3);

        for (let pi = 0; pi < 3; pi++) {
          const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), mats.ceramic);
          pl.rotation.z = Math.PI / 2;
          pl.position.set(-0.45 + pi * 0.08, -0.32, 0.05);
          cubbyGroup.add(pl);
        }
        const tinyMug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.14, 10), mats.bread);
        tinyMug.position.set(0.32, 0.25, 0.05);
        cubbyGroup.add(tinyMug);

        cubbyGroup.position.set(0.9, 3.1, bWallZ + cubbyD / 2);
        wallDecorGroup.add(cubbyGroup);

        // Left floating shelf with trailing ivy
        const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.45), mats.wallCoping);
        shelf1.position.set(-0.55, 3.45, bWallZ + 0.22);
        shelf1.castShadow = true;
        wallDecorGroup.add(shelf1);

        const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 12), mats.terracotta);
        plantPot.position.set(-0.35, 3.6, bWallZ + 0.22);
        wallDecorGroup.add(plantPot);

        for (let li = 0; li < 7; li++) {
          const vine = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: PALETTE.plantGreenMid, roughness: 0.6 }));
          vine.scale.set(1.4, 0.4, 1.2);
          vine.position.set(-0.32 + Math.sin(li) * 0.12, 3.5 - li * 0.12, bWallZ + 0.38 + Math.cos(li) * 0.06);
          wallDecorGroup.add(vine);
        }

        // Right floating shelf with bottles & utensil rail below
        const shelf2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.45), mats.wallCoping);
        shelf2.position.set(2.35, 2.9, bWallZ + 0.22);
        shelf2.castShadow = true;
        wallDecorGroup.add(shelf2);

        for (let s = 0; s < 4; s++) {
          const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), new THREE.MeshStandardMaterial({
            color: [0xf2e2cf, 0xd4a574, 0xe07b53, 0x93b59d][s],
            roughness: 0.4
          }));
          bottle.position.set(1.95 + s * 0.22, 3.05, bWallZ + 0.22);
          wallDecorGroup.add(bottle);
        }

        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1), mats.brass);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(2.35, 2.65, bWallZ + 0.18);
        wallDecorGroup.add(rail);

        for (let u = 0; u < 3; u++) {
          const utensil = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.015), mats.wallCoping);
          utensil.position.set(2.05 + u * 0.28, 2.45, bWallZ + 0.18);
          utensil.castShadow = true;
          wallDecorGroup.add(utensil);
        }

        // Wooden circular ring mirror & picture frame on right wall
        const roundMirror = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 12, 24), mats.wallCoping);
        roundMirror.position.set(2.45, 4.15, bWallZ + 0.04);
        roundMirror.castShadow = true;
        const mirrorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshStandardMaterial({ color: 0xebf2f5, roughness: 0.1, metalness: 0.5 }));
        mirrorGlass.position.set(2.45, 4.15, bWallZ + 0.045);
        wallDecorGroup.add(roundMirror, mirrorGlass);

        const squareFrame = createWallFrame(0.5, 0.55, -0.1, 4.8, bWallZ + 0.03);
        squareFrame.rotation.y = Math.PI / 2;
        wallDecorGroup.add(squareFrame);

        roomGroup.add(wallDecorGroup);

        // ===== 窗台花盆植物：纯代码生成 =====
        // 原来这里加载 flower-pot.glb，再逐顶点把花盆那截沿 Y 拉长 1.5 倍、
        // ===== 花盆植物：GLB 模型替换原来的程序化蛇尾兰 =====
        // 窗台花盆。GLTFLoader 在 r128 是全局 THREE.GLTFLoader，
        // r170 改成 ESM 模块，由场景层从 window 传进来。
        const plantLoader = new GLTFLoader();
        plantLoader.load('flower-pot.glb', function(gltf) {
          const plant = gltf.scene;
          const holder = new THREE.Group();
          holder.add(plant);

          // 获取原始包围盒
          const raw = new THREE.Box3().setFromObject(plant);
          const size = raw.getSize(new THREE.Vector3());

          // 整体缩放到合适高度
          const targetH = 2.0;
          const k = targetH / Math.max(size.y, 0.0001);
          plant.scale.setScalar(k);

          // 居中（仅水平方向）
          const center = raw.getCenter(new THREE.Vector3());
          plant.position.set(-center.x, 0, -center.z);

          // 花盆占模型下方 40%，把这段沿 Y 方向拉长，让花盆更高挑
          const POT_RATIO = 0.4;   // 花盆占整体高度的比例
          const POT_STRETCH = 1.5; // 花盆额外拉长的倍数
          // 先还原成原始包围盒坐标（植物已经被居中平移过，这里换算回来）
          const localMinY = raw.min.y - center.y;
          const localMaxY = raw.max.y - center.y;
          const potTopY = localMinY + (localMaxY - localMinY) * POT_RATIO;

          plant.traverse(function (o) {
            if (!o.isMesh || !o.geometry.attributes.position) return;
            const pos = o.geometry.attributes.position;
            for (let vi = 0; vi < pos.count; vi++) {
              // pos 已经是居中后的局部坐标
              if (pos.getY(vi) < potTopY) {
                // 盆底以下往上撑：底不动，盆口按比例升高
                const t = (pos.getY(vi) - localMinY) / Math.max(potTopY - localMinY, 0.0001);
                pos.setY(vi, localMinY + (pos.getY(vi) - localMinY) * POT_STRETCH);
                // 横向略微收窄，避免拉长后显得臃肿
                const narrow = 1 - t * 0.12;
                pos.setX(vi, pos.getX(vi) * narrow);
                pos.setZ(vi, pos.getZ(vi) * narrow);
              }
            }
            pos.needsUpdate = true;
            o.geometry.computeVertexNormals();
            o.geometry.computeBoundingBox();
          });

          // 拉长后重新计算包围盒，保证盆底仍然贴地
          const stretched = new THREE.Box3().setFromObject(plant);
          plant.position.set(
            -center.x,
            -stretched.min.y,
            -center.z
          );

          // 放到角落位置（x 再往左靠一点，贴着左墙）
          holder.position.set(-ROOM_W / 2 + 0.45, 0, ROOM_W / 2 - 0.7);

          // 盆是赤陶色，叶子绿色：按拉高后的盆口位置划分
          const potTopWorldY = stretched.min.y + (stretched.max.y - stretched.min.y) * POT_RATIO;
          plant.traverse(function(o) {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
              var geo = o.geometry;
              geo.computeBoundingBox();
              var meshCenterY = (geo.boundingBox.min.y + geo.boundingBox.max.y) / 2;
              if (meshCenterY < potTopWorldY) {
                // 花盆：赤陶色
                o.material = new THREE.MeshStandardMaterial({
                  color: 0xd9683e,
                  roughness: 0.8,
                  metalness: 0
                });
              } else {
                // 植物：绿色
                o.material = new THREE.MeshStandardMaterial({
                  color: 0x3d7848,
                  roughness: 0.6,
                  metalness: 0
                });
              }
            }
          });

          roomGroup.add(holder);
        }, undefined, function(err) {
          console.warn('花盆植物加载失败：', err);
        });

    // ---- 交给场景层用的句柄 ----
    // 拾取靠对象引用往上找父节点，所以这几个必须暴露出去。
    // 不再用 userData.fid：那要改 2000 行几何体代码，而这里只需 4 行。
    api.fridgeGroup = fridgeGroup;
    api.crateGroup = crateGroup;
    api.ovenGroup = ovenGroup;      // 拾取要点烤箱，场景层靠这个引用往上找父节点
    api.islandGroup = islandGroup;
    // 窗扇开合：场景层要拿到 sashFrame 才能补间它的 rotation.z
    api.windowHingePivot = windowHingePivot;
    api.windowFrameOuter = windowFrameOuter;
    api.sashFrame = sashFrame;
    api.SASH_OPEN_Z = SASH_OPEN_Z;
    api.SASH_SHUT_Z = SASH_SHUT_Z;
    api.faucetTip = new THREE.Vector3(0.665, 1.98, 0.08);
    api.counterTopY = topY;
  }

  global.buildKitchenGeometry = buildKitchenGeometry;
})(window);
