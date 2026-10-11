/* ============================================================
 * js/home/room-view-2d.js — 家园 · 2D 房间的结果呈现
 * ============================================================
 *
 * 2D 房间（客厅 / 浴室 / 庭院）的家具互动结果怎么显示：
 *   showActions()  动作泡泡摆在家具周围（按 f.x/f.y 百分比定位）
 *   showResult()   结果文字浮在原泡泡的位置，3 秒后淡出
 *   moveCharacter() 人物挪到被点的家具旁边
 *
 * 为什么单独成文件：furniture.js 原本把这段 DOM 定位逻辑和 3D 房间的判断
 * 混在一起（L162 那种"living || yard || smallkitchen || 有浴室元素"的写法），
 * 两套依据混用很容易出错。现在 2D 房间只走这里。
 *
 * 3D 房间的结果呈现见 room-view-3d.js —— 它要把世界坐标投影到屏幕，
 * 定位方式和 2D 完全不同，不能共用本文件。
 * ============================================================ */
(function (global) {
  'use strict';

  function roomEl() {
    return document.querySelector('.home-room');
  }

  var Home2DRoom = {

    /**
     * 在家具周围摆动作泡泡。
     * @param {object} f state 里的家具对象（用 x/y/w/h 百分比坐标）
     */
    showActions: function (f) {
      var acts = f.actions || [];
      if (!acts.length) return;
      var host = roomEl();
      if (!host) return;
      // 只留最新一批
      global.closeHomeBubbleRow && global.closeHomeBubbleRow();

      var cx = Number(f.x) + Number(f.w) / 2;
      var cy = Number(f.y) + Number(f.h) / 2;
      var n = acts.length;
      acts.forEach(function (a, i) {
        var bub = document.createElement('div');
        bub.className = 'bath-bubble';
        bub.innerText = a.label;
        // 多个动作时沿扇形散开；只有一个就摆在正上方
        var angle = -55 + i * (110 / (n - 1 || 1));
        var rad = angle * Math.PI / 180;
        var r = Math.max(14, Number(f.w) * 0.55);
        bub.style.left = (cx + Math.cos(rad) * r) + '%';
        bub.style.top = (cy + Math.sin(rad) * r * 0.75 - Number(f.h) * 0.12) + '%';
        bub.dataset.fid = f.id;
        bub.dataset.idx = i;
        host.appendChild(bub);
        setTimeout(function () { bub.classList.add('show'); }, i * 60);
      });
      // 5 秒没人点就自己收掉。
      //
      // 这个倒计时和 room-view-3d.js **共用** global._homeBubbleTimer，
      // 不要改成"各存各的"：
      //   1. 下面 closeActions 是按 class 满页面删泡泡的，而 .bath-bubble
      //      是 2D 和 3D 共用的 class；
      //   2. 换房间时 renderHome 只重建 DOM，没人取消旧倒计时；
      //   3. 正因为两边写的是同一个槽，新房间 showActions 开头那句预清理
      //      才能顺手把旧房间挂着的那次也取消掉。
      // 拆成私有后第 3 步就只清自己那个（空的），旧倒计时变成没人管的孤儿，
      // 到点照样按 class 满页面删 —— 复现：客厅开泡泡，4.9 秒内切进卧室
      // 也开泡泡，第 5 秒整卧室正在显示的泡泡会凭空消失。
      global._homeBubbleTimer = setTimeout(function () {
        global.closeHomeBubbleRow();
      }, 5000);
    },

    /** 清掉所有动作泡泡。 */
    closeActions: function () {
      if (global._homeBubbleTimer) {
        clearTimeout(global._homeBubbleTimer);
        global._homeBubbleTimer = null;
      }
      document.querySelectorAll('.bath-bubble').forEach(function (b) { b.remove(); });
    },

    /**
     * 结果文字浮在泡泡原来的位置，3 秒后消失。
     * @param {object} f 家具对象
     * @param {string} text 结果文案
     * @param {{left:string,top:string}} [at] 泡泡位置（百分比字符串）
     */
    showResult: function (f, text, at) {
      var host = roomEl();
      if (!host) return;
      var old = host.querySelector('.home-panel-result');
      if (old) old.remove();

      var res = document.createElement('div');
      res.className = 'home-panel-result';
      res.innerText = text;

      var furEl = f && f.id ? host.querySelector('[data-fid="' + f.id + '"]') : null;
      if (at) {
        res.style.left = at.left;
        res.style.top = at.top;
      } else if (furEl && furEl.parentElement === host) {
        // 没有泡泡位置就贴到家具正上方
        var fr = furEl.getBoundingClientRect();
        var pr = host.getBoundingClientRect();
        res.style.left = (fr.left - pr.left + fr.width / 2 - 60) + 'px';
        res.style.top = (fr.top - pr.top - 8) + 'px';
      } else {
        res.style.left = '50%';
        res.style.top = '38%';
        res.style.transform = 'translateX(-50%)';
      }
      host.appendChild(res);
      setTimeout(function () { if (res.parentNode) res.remove(); }, 3000);
    },

    /**
     * 2D 房间：把人物挪到家具旁边（百分比坐标，直接改 style）。
     * 3D 房间没有 .home-person 覆盖层，不会调到这里。
     */
    moveCharacter: function (roomId, f) {
      if (!global.HomeAvatar) return;
      var target = {
        x: Math.min(92, Math.max(4, Number(f.x) + Number(f.w) / 2 - 6)),
        y: Math.min(82, Math.max(4, Number(f.y) + Number(f.h) - 12))
      };
      HomeAvatar.setPosition(roomId, target, false);
      saveState();
      var el = document.getElementById('homePerson');
      if (el) { el.style.left = target.x + '%'; el.style.top = target.y + '%'; }
    },

    /**
     * 让当前房间的人物摆姿势。
     * 2D 房间走覆盖层的 home-pose-* 类；3D 房间不在这里处理。
     */
    setPose: function (f, act) {
      if (global.HomeAvatar) HomeAvatar.applyFurniturePose(f, act, false);
    }
  };

  global.Home2DRoom = Home2DRoom;
  global.closeHomeBubbleRow = function () { Home2DRoom.closeActions(); };
})(typeof window !== 'undefined' ? window : this);
