/* ============================================================
 * js/home/rooms.js — 家园 · 房间注册表
 * ============================================================
 *
 * 每个房间声明自己是 2D 还是 3D，渲染路径和人物系统都由此决定。
 * 加新房间只需要在这里加一条；renderHome() 不再自己 if/else 猜房间类型。
 *
 * kind: '2d' —— 家具是 DOM + emoji（art.js 画），人物是 .home-person 覆盖层
 * kind: '3d' —— 家具是 WebGL 网格，人物走 character-3d.js 插槽
 * ============================================================ */
(function (global) {
  'use strict';

  var REGISTRY = {
    living:      { kind: '2d', name: '客厅' },
    bathroom:    { kind: '2d', name: '浴室' },
    yard:        { kind: '2d', name: '庭院' },
    bedroom:     { kind: '3d', name: '卧室' },
    smallkitchen:{ kind: '3d', name: '小厨房' }
  };

  function kindOf(roomId) {
    roomId = roomId || (state.home && state.home.activeRoom);
    var entry = REGISTRY[roomId];
    return entry ? entry.kind : '2d';
  }

  var HomeRooms = {
    registry: REGISTRY,

    /** 房间类型：'2d' | '3d'，未知房间按 2d 处理（最安全的兜底）。 */
    kind: kindOf,

    is2D: function (roomId) { return kindOf(roomId) === '2d'; },
    is3D: function (roomId) { return kindOf(roomId) === '3d'; },

    /** 3D 房间列表。character-3d.js 和场景初始化都用它遍历。 */
    list3D: function () {
      return Object.keys(REGISTRY).filter(function (id) { return REGISTRY[id].kind === '3d'; });
    },
    list2D: function () {
      return Object.keys(REGISTRY).filter(function (id) { return REGISTRY[id].kind === '2d'; });
    }
  };

  global.HomeRooms = HomeRooms;
})(typeof window !== 'undefined' ? window : this);
