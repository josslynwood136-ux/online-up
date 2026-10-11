const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// 一套代码部署两个 Render 服务（同一仓库）：
//   主体站（默认）      → 纯静态服务器（本文件下方）
//   音乐后端            → 设 MUSIC_BACKEND=1，跑 sever/server.js
//     （网易云/QQ音乐 API、通话信令、视频转码、后台消息）
// 在 Render 的 yin-le-bu-shu 服务 Environment 里加 MUSIC_BACKEND=1
// ============================================================
if (process.env.MUSIC_BACKEND === '1') {
  require('./sever/server.js');
} else {

const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.fbx': 'application/octet-stream'
};

// 纯静态部署没有后端接口。前端对这些路径的请求（含 webrtc.js 每 2 秒一次的
// 信令轮询）在这里就地返回安全的空响应，避免控制台被 404 刷屏：
//   /__meilodi/photos      桌面照片备份 —— 返回 {} 表示"没有备份"，前端有对象检查
//   /api/webrtc/signal     通话信令     —— GET 返回 [] 表示"没有新消息"，POST 假成功
//   /api/convert-audio     视频转语音   —— 返回 200 + error，前端会展示这条友好提示
function jsonSafe(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  // 浏览器会自动请求 /favicon.ico，项目里只有 icon.svg —— 指过去，消掉 404
  if (p === '/favicon.ico') p = '/icon.svg';

  // ---- 无后端时的空响应（见上方注释） ----
  if (p === '/__meilodi/photos') {
    if (req.method === 'POST') { jsonSafe(res, 200, { ok: true }); return; }
    jsonSafe(res, 200, {});
    return;
  }
  if (p === '/api/webrtc/signal') {
    if (req.method === 'POST') { jsonSafe(res, 200, { ok: true }); return; }
    jsonSafe(res, 200, []);
    return;
  }
  if (p === '/api/convert-audio') {
    jsonSafe(res, 200, { error: '当前为静态部署，无转码服务；请直接上传 mp3 / wav 音频' });
    return;
  }

  const file = path.join(__dirname, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(process.env.PORT || 8080, () => console.log('Server running at http://localhost:' + (process.env.PORT || 8080)));
} // end of else（静态服务器）
