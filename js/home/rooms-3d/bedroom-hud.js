/* ============================================================
 * js/home/rooms-3d/bedroom-hud.js — 卧室 HUD
 * ============================================================
 *
 * 和 kitchen-hud.js 同一个套路：厨房原来是 iframe 套一整份
 * small-kitchen.html，HUD 直接写在那个 HTML 里；转成同页
 * three.js 之后不再有独立文档，所以标记拆到这个文件，由
 * bedroom-scene.js 调 createBedroomHud(host) 塞进容器。
 *
 * class 用 bd- (bedroom) 前缀，和厨房的 ck- 区分开。
 * 玻璃卡片 / 描边 / 阴影的视觉参数抄厨房那套（.ck-glass /
 * .ck-shadow），色调换成卧室的暖米色。
 *
 * 这��只管标记和 class，按钮的点击逻辑全在 bedroom-scene.js 里绑，
 * 和厨房那边一样 —— HUD 不持有任何场景状态。
 * ============================================================ */
(function (global) {
  'use strict';

  // 提示条的默认文案。人物模型 10MB，加载中/失败都会被 bedroom-scene.js
  // 临时改写，加载完要改回来 —— 放一个常量出来，别在两个文件里各抄一份。
  var HINT_DEFAULT = '拖动平移视角 · 右键旋转 · 点地板走动';

  function createBedroomHud(root) {
    root.innerHTML = [
      // ---- canvas：3D 渲染目标 ----
      // class 名要和 style.css 里 .home-room.bedroom .bd-canvas 对得上
      '<canvas class="bd-canvas"></canvas>',

      // 左上角原本有标题卡和色板，按要求删掉了（厨房那边也一起删）。
      // 只留底部操作条和顶部提示条。

      // ---- 底部：操作按钮 ----
      '<footer class="bd-card bd-glass bd-shadow bd-bar">',
      '  <button id="bd-mood" class="bd-btn bd-btn-on"><span id="bd-mood-icon">☀️</span> <span id="bd-mood-text">午后暖阳</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-lamp" class="bd-btn bd-btn-on">💡 <span id="bd-lamp-text">落地灯</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-glow" class="bd-btn">✨ <span>氛围</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-win" class="bd-btn">🪟 <span>窗</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-curtain" class="bd-btn bd-btn-on">🪞 <span>帘</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-reset" class="bd-btn" title="恢复默认视角">🔄 <span>视角</span></button>',
      '  <i class="bd-sep"></i>',
      '  <button id="bd-char-girl" class="bd-btn bd-btn-on" title="选中女孩">👧 <span>女孩</span></button>',
      '  <button id="bd-char-ghost" class="bd-btn" title="选中 Ghost">💀 <span>Ghost</span></button>',
      '</footer>',

      // ---- 浮动提示 ----
      // 同时承担两件事：平时当操作提示，初始化失败时 bedroom-scene.js 的
      // showError() 会往这里写错误文案（靠 .bedroom3d-hint 这个 class 找它）
      '<div id="interactive-toast" class="bd-card bd-glass bd-shadow bedroom3d-hint bd-toast">' + HINT_DEFAULT + '</div>'
    ].join('\n');
  }

  global.createBedroomHud = createBedroomHud;
  global.BEDROOM_HINT_DEFAULT = HINT_DEFAULT;
})(window);