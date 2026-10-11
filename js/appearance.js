// ============================================================
// appearance.js - 桌面外观设置
// ============================================================

// ===== 外观设置面板 =====
function openAppearance() {
  try {
    var overlay = $('appearanceOverlay');
    if (overlay) overlay.classList.add('show');
    if (typeof applyAppearanceStyle === 'function') applyAppearanceStyle();
  } catch(e) { console.warn('openAppearance error:', e); }
}
function closeAppearance() {
  try {
    var overlay = $('appearanceOverlay');
    if (overlay) overlay.classList.remove('show');
  } catch(e) { console.warn('closeAppearance error:', e); }
}
function toggleAppearanceSetting(key) {
  if (!state.settings) state.settings = {};
  state.settings[key] = !state.settings[key];
  saveState();
  applyAppearanceStyle();
  var sw = $(key === 'showClock' ? 'dsShowClockSwitch' : 'dsShowNotesSwitch');
  if (sw) sw.classList.toggle('on', state.settings[key]);
}

function setAppearanceWallpaper(val) {
  state.settings.desktopWallpaper = val || '';
  saveState();
  applyAppearanceStyle();
  if (typeof saveDeskPhotosBackup === 'function') saveDeskPhotosBackup();
}
function setAppearanceIconSize(val) {
  state.settings.desktopIconSize = val || 'medium';
  saveState();
  applyAppearanceStyle();
}
function setAppearanceIconShape(val) {
  state.settings.desktopIconShape = val || 'rounded';
  saveState();
  applyAppearanceStyle();
}
function setAppearanceColumns(val) {
  state.settings.desktopColumns = parseInt(val) || 4;
  saveState();
  applyAppearanceStyle();
}
function applyAppearanceStyle() {
  try {
    var s = (typeof state !== 'undefined' && state.settings) || {};
    var wp = $('wallpaper');
    if (wp) {
      if (s.desktopWallpaper) { wp.src = s.desktopWallpaper; }
      wp.style.display = '';
    }
    var sizeMap = { small: '48px', medium: '64px', large: '80px' };
    var sz = sizeMap[s.desktopIconSize] || '64px';
    document.documentElement.style.setProperty('--desktop-icon-size', sz);
    var grid = $('appGrid');
    if (grid) {
      grid.classList.remove('app-icon-shape-rounded', 'app-icon-shape-square', 'app-icon-shape-circle');
      grid.classList.add('app-icon-shape-' + (s.desktopIconShape || 'rounded'));
      grid.style.gridTemplateColumns = 'repeat(' + (s.desktopColumns || 4) + ', 1fr)';
    }
    document.documentElement.style.setProperty('--desktop-icon-bg', s.desktopIconBg || 'rgba(255,255,255,.85)');
    var wc = $('widgetClock');
    if (wc) wc.style.display = s.showClock !== false ? '' : 'none';
    var wn = $('widgetNotes');
    if (wn) wn.style.display = s.showNotes !== false ? '' : 'none';
     var is2 = $('dsIconSizeSelect'); if (is2) is2.value = s.desktopIconSize || 'medium';
    var ix2 = $('dsIconShapeSelect'); if (ix2) ix2.value = s.desktopIconShape || 'rounded';
    var ic2 = $('dsColumnsSelect'); if (ic2) ic2.value = String(s.desktopColumns || 4);
    var wsIn = $('dsWallpaper'); if (wsIn) wsIn.value = s.desktopWallpaper || '';
    var cs2 = $('dsShowClockSwitch'); if (cs2) cs2.classList.toggle('on', s.showClock !== false);
    var ns2 = $('dsShowNotesSwitch'); if (ns2) ns2.classList.toggle('on', s.showNotes !== false);
  } catch(e) { console.warn('applyAppearanceStyle error:', e); }
}
