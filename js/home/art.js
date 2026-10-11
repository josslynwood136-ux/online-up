/* ============================================================
 * js/home/art.js — 家园 · 2D 房间的纯绘图函数
 * ============================================================
 *
 * 这些函数只根据家具 id 返回一段 HTML/emoji 字符串，不碰 DOM、不读状态，
 * 所以单独成文件：客厅 / 浴室 / 庭院的家具外观全在这里，方便统一改画风。
 *
 * 3D 房间（卧室 / 小厨房）不走这里 —— 它们的家具是 WebGL 网格，
 * 由各自场景的 mesh 构建代码负责。
 *
 * 已删除的旧函数（2D 卧室时代的残留，卧室改成 3D 房间后零调用）：
 *   bedroomFurArt / bedroomArt / bathroomFurArt
 * 卧室的家具外观现在是 initBedroom3D() 里的 WebGL 网格，不走 SVG。
 * ============================================================ */

function furEmoji(fid) {
  var map = {
    'fur-sofa': '🛋️', 'fur-table': '🪑', 'fur-plant': '🌱', 'fur-tv': '📺', 'fur-tvcabinet': '📺',
    'fur-shelf': '📚', 'fur-lamp': '💡', 'fur-pot': '🪴',
    'fur-bathtub': '🛁', 'fur-shower': '🚿', 'fur-sink': '🚿', 'fur-mirror': '🪞',
    'fur-toilet': '🚽', 'fur-towel': '🧺', 'fur-stool': '🪑', 'fur-candle': '🕯️',
    'fur-scale': '⚖️', 'fur-plant-bath': '🪴',
    'fur-bed': '🛏️', 'fur-wardrobe': '👗', 'fur-dresser': '🪞', 'fur-nightlamp': '💡', 'fur-carpet': '🧶', 'fur-pillow': '💤',
  };
  return map[fid] || '📦';
}
function furArt(fid) {
  if (fid === 'fur-plant') {
    return '<div class="fur-plant-pot"><div class="fpp-pot"></div><div class="fpp-stem"></div><div class="fpp-leaf l1"></div><div class="fpp-leaf l2"></div><div class="fpp-leaf l3"></div></div>';
  }
  if (fid === 'fur-sofa') {
    return '<div class="fur-sofa">'
      + '<div class="fs-shadow"></div>'
      + '<div class="fs-base"></div>'
      + '<div class="fs-back"></div>'
      + '<div class="fs-seat"></div>'
      + '<div class="fs-arm l"></div>'
      + '<div class="fs-arm r"></div>'
      + '<div class="fs-cushion fs-c1"></div>'
      + '<div class="fs-cushion fs-c2"></div>'
      + '<div class="fs-leg l1"></div>'
      + '<div class="fs-leg l2"></div>'
      + '<div class="fs-leg r1"></div>'
      + '<div class="fs-leg r2"></div>'
      + '</div>';
  }
  if (fid === 'fur-table') {
    return '<div class="fur-table">'
      + '<div class="ft-top"></div>'
      + '<div class="ft-cup"></div>'
      + '<div class="ft-leg ft-leg-l"></div>'
      + '<div class="ft-leg ft-leg-r"></div>'
      + '</div>';
  }
  if (fid === 'fur-lamp') {
    return '<div class="fur-lamp">'
      + '<div class="fl-glow"></div>'
      + '<div class="fl-shade"></div>'
      + '<div class="fl-pole"></div>'
      + '<div class="fl-base"></div>'
      + '</div>';
  }
  if (fid === 'fur-pot') {
    return '<div class="fur-pot">'
      + '<div class="fp-leaf fp-leaf-l1"></div>'
      + '<div class="fp-leaf fp-leaf-l2"></div>'
      + '<div class="fp-leaf fp-leaf-l3"></div>'
      + '<div class="fp-stem"></div>'
      + '<div class="fp-pot"></div>'
      + '</div>';
  }
  if (fid === 'fur-shelf') {
    var bookColors = ['#f6a8c0', '#f9c98a', '#a9d68f', '#9fc9e8', '#c9a9e8', '#f0d27a'];
    var shelfRows = [{ sl: 34, h: 27 }, { sl: 66, h: 25 }, { sl: 100, h: 23 }];
    var books = '';
    shelfRows.forEach(function (r, ri) {
      var n = (ri === 1) ? 5 : 4;
      var gap = 84 / n;
      for (var i = 0; i < n; i++) {
        var cw = gap * 0.68;
        var left = 9 + i * gap + (gap - cw) / 2;
        var col = bookColors[(i + ri) % bookColors.length];
        books += '<div class="fsh-book" style="left:' + left.toFixed(1) + '%;top:' + (r.sl - r.h) + '%;height:' + r.h + '%;width:' + cw.toFixed(1) + '%;background:' + col + '"></div>';
      }
    });
    return '<div class="fur-shelf">'
      + '<div class="fsh-frame"></div>'
      + '<div class="fsh-shelf s1"></div>'
      + '<div class="fsh-shelf s2"></div>'
      + books
      + '</div>';
  }
  if (fid === 'fur-cabinet') {
    return '<div class="fur-cabinet">'
      + '<div class="fc-top"></div>'
      + '<div class="fc-body"></div>'
      + '<div class="fc-drawer d1"><span class="fc-handle"></span></div>'
      + '<div class="fc-drawer d2"><span class="fc-handle"></span></div>'
      + '<div class="fc-door d1"><span class="fc-handle"></span></div>'
      + '<div class="fc-door d2"><span class="fc-handle"></span></div>'
      + '<div class="fc-leg l"></div>'
      + '<div class="fc-leg r"></div>'
      + '</div>';
  }
  if (fid === 'fur-tv') {
    return '<div class="fur-tv">'
      + '<div class="ftv-glow"></div>'
      + '<div class="ftv-body"><div class="ftv-screen"><span class="ftv-shine"></span></div></div>'
      + '<div class="ftv-neck"></div>'
      + '<div class="ftv-foot"></div>'
      + '</div>';
  }
  if (fid === 'fur-painting') {
    return '<svg class="living-painting" viewBox="0 0 120 100" aria-hidden="true">'
      + '<rect x="3" y="3" width="114" height="94" rx="8" fill="#d8b98f"/>'
      + '<rect x="9" y="9" width="102" height="82" rx="5" fill="#fffaf0"/>'
      + '<circle cx="88" cy="30" r="12" fill="#ffd98b"/>'
      + '<path d="M9 77 C30 55 45 67 61 49 C78 30 92 49 111 30 L111 91 L9 91 Z" fill="#b9d9b2"/>'
      + '<path d="M9 84 C34 70 55 79 72 63 C86 50 98 58 111 47 L111 91 L9 91 Z" fill="#88bd94"/>'
      + '<path d="M48 88 C50 68 55 54 61 41" stroke="#668e63" stroke-width="4" fill="none" stroke-linecap="round"/>'
      + '<circle cx="61" cy="40" r="8" fill="#f39cae"/><circle cx="51" cy="51" r="6" fill="#f5b6c2"/><circle cx="70" cy="52" r="6" fill="#ef8fa6"/>'
      + '</svg>';
  }
  if (fid === 'fur-coffee') {
    return '<div class="fur-coffee">'
      + '<div class="fcm-steam"></div>'
      + '<div class="fcm-top"></div>'
      + '<div class="fcm-body"></div>'
      + '<div class="fcm-nozzle"></div>'
      + '<div class="fcm-btn b1"></div>'
      + '<div class="fcm-btn b2"></div>'
      + '<div class="fcm-cup"></div>'
      + '</div>';
  }
  var em = furEmoji(fid);
  return '<div class="fur-emoji">' + em + '</div>';
}
function bathroomRoomArt() {
  return ''
    + '<div class="lr-wall"></div>'
    + '<div class="lr-corner lr-corner-l"></div>'
    + '<div class="lr-backcorner"></div>'
    + '<div class="lr-floor"></div>'
    + '<div class="lr-rug"></div>'
    + '<div class="bath-light"></div>'
    + '<span class="bath-steam s1"></span><span class="bath-steam s2"></span><span class="bath-steam s3"></span>'
    + '<span class="bath-floatbub b1"></span><span class="bath-floatbub b2"></span>';
}
function livingRoomArt() {
  return ''
    + '<div class="lr-wall"></div>'
    + '<div class="lr-wainscot"></div>'
    + '<div class="lr-base"></div>'
    + '<div class="lr-corner lr-corner-l"></div>'
    + '<div class="lr-backcorner"></div>'
    + '<div class="lr-window">'
      + '<div class="lr-sky"><span class="lr-cloud c1"></span><span class="lr-cloud c2"></span></div>'
      + '<div class="lr-sun"></div><div class="lr-mullion"></div>'
      + '<div class="lr-curtain-l"></div><div class="lr-curtain-r"></div>'
    + '</div>'
    + '<div class="lr-frame f1"><span>🌷</span></div>'
    + '<div class="lr-frame f2"><span>🏡</span></div>'
    + '<div class="lr-floor"></div>'
    + '<div class="lr-rug"><span></span></div>';
}
