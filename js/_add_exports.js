var fs = require('fs');
var init = fs.readFileSync('js/init.js', 'utf8');
var newExports = '  _w.startLiveMiniGame = startLiveMiniGame;';
if (!init.includes('_w.startLiveMiniGame')) {
  init = init.replace(
    '_w.liveBagGrab = liveBagGrab;',
    '_w.liveBagGrab = liveBagGrab;\n  _w.startLiveMiniGame = startLiveMiniGame;\n  _w.handleMiniGameHit = handleMiniGameHit;\n  _w.toggleLiveTheme = toggleLiveTheme;'
  );
  fs.writeFileSync('js/init.js', init);
  console.log('Added new exports to init.js');
} else {
  console.log('Already exists');
}
