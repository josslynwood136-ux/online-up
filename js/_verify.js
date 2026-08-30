var fs = require('fs');
var c = fs.readFileSync('js/apps.js', 'utf8');

// Check liveSay is async
console.log('liveSay is async:', c.indexOf('async function liveSay()') !== -1);

// Check lmTarget has onclick
var lmTargetOnclick = c.indexOf('onclick="handleMiniGameHit(event)"');
console.log('lmTarget has onclick:', lmTargetOnclick !== -1);

// Check CSS end
var css = fs.readFileSync('css/style.css', 'utf8');
console.log('CSS ends with live room styles:', css.includes('.lp-stats-wrap'));
console.log('CSS has .live-scroll:', css.includes('.live-scroll'));
console.log('CSS has .live-mini-game:', css.includes('.live-mini-game'));

// Check that liveSay is referenced in init.js exports
var init = fs.readFileSync('js/init.js', 'utf8');
console.log('init.js exports liveSay:', init.includes('window.liveSay = liveSay'));
console.log('init.js exports startLiveMiniGame:', init.includes('startLiveMiniGame'));

// Verify state.js has new fields
var state = fs.readFileSync('js/state.js', 'utf8');
console.log('state.js has miniGameActive:', state.includes('miniGameActive'));
console.log('state.js has chatHistory:', state.includes('chatHistory'));
console.log('state.js has mic:', state.includes('state.live.mic'));

console.log('\nAll checks passed!');
