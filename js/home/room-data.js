/* ============================================================
 * js/home/room-data.js — 家园 · 房间数据补全
 * ============================================================
 *
 * 跟 2D / 3D 都没关系：不管什么类型的房间，老存档里缺东西都要补齐。
 *
 * 为什么单独成文件（而不是塞在 rooms-2d.js 里）：
 * ensureHomeRooms() 要遍历 defaultState.home.rooms 的**全部**房间，
 * 包含卧室和小厨房这两个 3D 房间。放在"2D 房间"文件里名不副实，
 * 而且以后加 3D 房间会让人误以为要改 rooms-2d.js。
 *
 * 这里是唯一允许知道"defaultState 里有哪些房间"的地方。
 * 房间是 2D 还是 3D 由 rooms.js 决定，这里不关心。
 * ============================================================ */
(function (global) {
  'use strict';

  /**
   * 把 defaultState 里新增的房间补进老存档，并清掉失效字段。
   * 幂等：没有变化就不写盘。
   */
  function ensureHomeRooms() {
    var h = state.home;
    if (!h || !h.rooms) return;
    var defaults = defaultState.home.rooms || {};
    var changed = false;
    Object.keys(defaults).forEach(function (rid) {
      if (!h.rooms[rid]) {
        h.rooms[rid] = JSON.parse(JSON.stringify(defaults[rid]));
        changed = true;
        return;
      }
      var room = h.rooms[rid];
      if (!Array.isArray(room.furniture) || room.furniture.length === 0) {
        room.furniture = JSON.parse(JSON.stringify(defaults[rid].furniture || []));
        changed = true;
      }
      // 外链图片早就不能用了（跨域 + 体积），统一清空
      if (typeof room.bg === 'string' && room.bg.startsWith('http')) {
        room.bg = '';
        changed = true;
      }
      if (typeof room.person === 'string' && room.person.startsWith('http')) {
        room.person = '';
        changed = true;
      }
    });
    if (changed) saveState();
  }

  // 保持全局：renderHome（index.js）和 state.js 的迁移逻辑都在调它。
  global.ensureHomeRooms = ensureHomeRooms;
})(typeof window !== 'undefined' ? window : this);
