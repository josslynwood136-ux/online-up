/* ============================================================
 * js/home/rooms-3d/kitchen-hud.js — 小厨房 HUD
 * ============================================================
 *
 * 原来是 tailwindcss.com 运行时编译的 class 字符串。
 * 转成同页 three.js 之后不再有独立文档，也不能依赖外部 CDN 编译 CSS，
 * 所以这些样式全部改成手写 class。
 *
 * 迁移时保持 class 名和原来 tailwind 生成的效果一致，视觉不变。
 * ============================================================ */
(function (global) {
  'use strict';

  function createKitchenHud(root) {
    root.innerHTML = [
      // ---- canvas：3D 渲染目标 ----
      '<canvas class="ck-canvas"></canvas>',

      // 左上角原本有标题卡和色板，按要求删掉了（卧室那边也一起删）。
      // 只留底部操作条和浮动提示。

      // ---- 底部：操作按钮 ----
      '<footer class="ck-bar">',
      '  <button id="btn-mood" class="ck-btn ck-btn-on"><span id="mood-icon">☀️</span> <span id="mood-text">暖阳午后</span></button>',
      '  <i class="ck-sep"></i>',
      '  <button id="btn-faucet" class="ck-btn">🚰 <span>放水</span></button>',
      '  <i class="ck-sep"></i>',
      '  <button id="btn-window" class="ck-btn">🪟 <span>推窗</span></button>',
      '  <i class="ck-sep"></i>',
      '  <button id="btn-oven" class="ck-btn">🔥 <span>烤箱</span></button>',
      '  <i class="ck-sep"></i>',
      '  <button id="btn-reset" class="ck-btn" title="恢复默认等距视角">🔄 <span>视角</span></button>',
      '</footer>',

      // ---- 浮动提示 ----
      '<div id="interactive-toast" class="ck-toast">点窗户、冰箱或岛台试试</div>'
    ].join('\n');
  }

  global.createKitchenHud = createKitchenHud;
})(window);
