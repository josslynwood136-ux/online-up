// 网易云 + QQ 音乐助手（云端版）
// 网易云 API 跑在内部端口，主服务提供 /qq 路由，其余请求代理给网易云
// 部署到免费云服务器后，手机上的仿真小手机就能扫码登录你的网易云 / QQ 音乐账号
const express = require('express')
const http = require('http')
const https = require('https')
const path = require('path')
const fs = require('fs')

const PORT = Number(process.env.PORT || 3000)

const NCM_PORT = Number(process.env.NCM_PORT || 3100)

// 网易云 API 单独包一层 try/catch：它启动失败绝不能拖垮整个服务（否则网页和 /relay 都挂）
let serveNcmApi = null
try {
  serveNcmApi = require('NeteaseCloudMusicApi').serveNcmApi
} catch (e) {
  console.error('网易云依赖未安装或加载失败（不影响网页与翻译代理）：' + (e && e.message))
}

if (serveNcmApi) {
  serveNcmApi({ port: NCM_PORT, host: '127.0.0.1', checkVersion: false })
    .then(function () {
      console.log('网易云 API 已在 127.0.0.1:' + NCM_PORT + ' 启动')
    })
    .catch(function (e) {
      console.error('网易云 API 启动失败（不影响网页与翻译代理）：' + (e && e.message))
    })
}

const app = express()

// 全局 CORS
app.use(function (req, res, next) {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type,Origin,Cookie')
  if (req.method === 'OPTIONS') return res.status(204).end()
  next()
})

// QQ 音乐路由
app.use('/qq', express.json())
app.use('/qq', require('./qq'))

// 探测标记：浏览器用它判断「本站是否带 AI 转发」——有就走 /relay，没有就直连
app.all('/relay-probe', function (req, res) { res.status(204).end() })

// ============================================================
// 后台消息（网页开着 / 放后台时，定时生成角色消息，前端轮询后弹出通知）
// 不依赖 Web Push / FCM，国内安卓也能用；代价是 App 必须保持打开（后台）
// ============================================================
// ===== 主动消息配置（含 AI 凭证 + 角色人设 + 发送计划，存服务器用于后台生成）=====
// ⚠️ 注意：这里会以明文保存用户的 AI key，仅适用于你自己部署、信任该服务器的场景。
const PUSH_CFG_FILE = path.join(__dirname, 'push-config.json')
let pushConfigs = {}
try { pushConfigs = JSON.parse(fs.readFileSync(PUSH_CFG_FILE, 'utf8')) } catch (e) { pushConfigs = {} }
function saveConfigs() {
  try { fs.writeFileSync(PUSH_CFG_FILE, JSON.stringify(pushConfigs)) } catch (e) {}
}
// 设备级待收队列：不依赖 Web Push 订阅，用客户端生成的 deviceId 暂存后台生成的回复
const devicePending = {}
function inQuiet(now, quiet) {
  if (!quiet || !Array.isArray(quiet) || quiet.length !== 2) return false
  var h = new Date(now).getHours()
  var s = Number(quiet[0]), e = Number(quiet[1])
  if (isNaN(s) || isNaN(e)) return false
  if (s <= e) return h >= s && h < e
  return h >= s || h < e // 跨午夜，如 23~7
}
function joinUrl(base, p) {
  base = String(base || '').replace(/\/+$/, '')
  if (!p) return base
  return base + '/' + String(p).replace(/^\/+/, '')
}
// 用订阅里存的凭证调 AI，生成一条角色主动消息；失败返回 null
async function genCharacterMessage(char, creds) {
  if (!creds || !creds.url || !creds.key) return null
  var sys = '你是' + (char.name || '角色') + '。'
  if (char.persona && char.persona.trim()) sys += '设定：' + char.persona.trim() + '。'
  if (char.relation && char.relation.trim()) sys += '与用户关系：' + char.relation.trim() + '。'
  sys += '请用' + (char.name || '角色') + '的口吻，主动给用户发一条自然的消息：像真人会突然发来的——可以分享当下在做的事、或突然想起的小事，一两句口语，自然带情绪，不要问号轰炸，不要自我总结，不要提 AI、不要提"消息"二字。只输出这条消息正文，不要任何解释或引号。'
  var messages = [
    { role: 'system', content: sys },
    { role: 'user', content: '（你现在主动给用户发一条消息）' }
  ]
  try {
    var r = await fetch(joinUrl(creds.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + creds.key },
      body: JSON.stringify({ model: creds.model || 'gpt-3.5-turbo', messages: messages, max_tokens: 120, temperature: 0.85, stream: false })
    })
    if (!r.ok) return null
    var j = await r.json()
    var txt = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim()
    if (!txt) return null
    txt = txt.replace(/^["'「『]|["'」』]$/g, '').trim()
    return txt
  } catch (e) { return null }
}
// ====== 打卡提醒用的时间/日期工具（按用户上报时区判断"今天/现在"）======
function _todayKeyLocal() {
  var d = new Date()
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
}
function _nowHHMMLocal() {
  var d = new Date()
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)
}
function _parseCk(s) { var p = String(s || '').split('/'); return new Date(+p[0], +p[1] - 1, +p[2]) }
// 按用户上报的 IANA 时区算出"今天"和"现在 HH:MM"；没上报则用服务器本地时区
function _userClock(tz) {
  if (!tz) return null
  try {
    var s = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())
    var m = String(s).match(/(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})/)
    if (!m) return null
    // tKey 不补零，保持与前端 todayStr() 一致（如 2026/8/28），否则 doneDates 比对会失配
    return { tKey: m[3] + '/' + parseInt(m[1], 10) + '/' + parseInt(m[2], 10), cur: m[4] + ':' + m[5] }
  } catch (e) { return null }
}
function _ckDue(ck, today) {
  if (!ck || ck.status === 'done') return false
  return (ck.doneDates || []).indexOf(today) < 0
}
function _ckActive(ck, today) {
  var t = _parseCk(today), s = ck.start ? _parseCk(ck.start) : null, e = ck.end ? _parseCk(ck.end) : null
  if (s && !isNaN(s.getTime()) && t < s) return false
  if (e && !isNaN(e.getTime()) && t > e) return false
  return true
}
// 定时器：每分钟扫一遍，给"到点"的设备生成主动消息 / 打卡提醒，写入待收队列
async function scheduleTick() {
  var now = Date.now()
  for (var ep in pushConfigs) {
    var cfg = pushConfigs[ep]
    if (!cfg || !cfg.deviceId) continue
    if (inQuiet(now, cfg.plan.quiet)) continue
    var chars = cfg.chars || []
    if (!chars.length) continue
    var interval = (Number(cfg.plan.intervalMin) || 180) * 60000
    // 挑"最 overdue"的角色，每轮最多发一条，摊开负载
    var best = null, bestOver = -1
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i]
      if (!c.proactive) continue // 该角色未开启后台主动发消息
      var last = cfg.lastSent && cfg.lastSent[c.id] ? cfg.lastSent[c.id] : 0
      var over = now - last - interval
      if (over >= 0 && over > bestOver) { best = c; bestOver = over }
    }
    if (!best) continue
    var text = await genCharacterMessage(best, cfg.creds)
    if (!text) continue
    // 写入设备待收队列，前端轮询按 deviceId 拉取并弹通知
    cfg.lastSent = cfg.lastSent || {}
    cfg.lastSent[best.id] = now
    devicePending[cfg.deviceId] = devicePending[cfg.deviceId] || []
    devicePending[cfg.deviceId].push({ charId: best.id || '', charName: best.name || '美乐地', text: text, ts: now })
    if (devicePending[cfg.deviceId].length > 50) devicePending[cfg.deviceId] = devicePending[cfg.deviceId].slice(-50)
    saveConfigs()
    // ---- 打卡提醒（不需要 AI，模板文案）----
    var cks = cfg.checkins || []
    if (cks.length) {
      var clk = cfg.tz ? _userClock(cfg.tz) : null
      var tKey = clk ? clk.tKey : _todayKeyLocal()
      var cur = clk ? clk.cur : _nowHHMMLocal()
      var curMin = parseInt(cur.slice(0, 2), 10) * 60 + parseInt(cur.slice(3, 5), 10)
      cfg.checkinReminded = cfg.checkinReminded || {}
      for (var k = 0; k < cks.length; k++) {
        var ck = cks[k]
        if (!ck.remindTime || ck.status === 'done') continue
        if (!_ckActive(ck, tKey) || !_ckDue(ck, tKey)) continue
        var pp = ck.remindTime.split(':')
        var rm = (parseInt(pp[0], 10) || 0) * 60 + (parseInt(pp[1], 10) || 0)
        var diff = curMin - rm
        if (diff < 0 || diff > 15) continue
        if (cfg.checkinReminded[ck.id] === tKey) continue
        cfg.checkinReminded[ck.id] = tKey
        devicePending[cfg.deviceId] = devicePending[cfg.deviceId] || []
        devicePending[cfg.deviceId].push({ charId: '', charName: '⏰ 打卡提醒', text: '「' + (ck.name || '打卡') + '」该打卡啦，今天还没打哦', ts: now })
        if (devicePending[cfg.deviceId].length > 50) devicePending[cfg.deviceId] = devicePending[cfg.deviceId].slice(-50)
      }
    }
  }
}
setInterval(scheduleTick, 60000)

app.use('/push', express.json({ limit: '2mb' }))
// 上报/更新主动消息配置（凭证 + 角色人设 + 计划）
// 仅用 deviceId 作键：不依赖 Web Push 订阅，国内安卓也能后台接收
app.post('/push/config', function (req, res) {
  const deviceId = req.body && req.body.deviceId
  if (!deviceId) return res.status(400).json({ error: '缺少 deviceId' })
  const creds = req.body.creds || null
  const chars = Array.isArray(req.body.chars) ? req.body.chars : []
  const checkins = Array.isArray(req.body.checkins) ? req.body.checkins : []
  const tz = req.body.tz || ''
  const plan = req.body.plan || { enabled: false }
  const ep = 'device:' + deviceId
  const old = pushConfigs[ep] || {}
  pushConfigs[ep] = {
    deviceId: deviceId,
    creds: creds,
    chars: chars,
    plan: plan,
    checkins: checkins,
    tz: tz,
    checkinReminded: old.checkinReminded || {},
    lastSent: old.lastSent || {},
    pending: old.pending || []
  }
  saveConfigs()
  res.json({ ok: true })
})
// 拉取待收消息（app 打开/后台轮询时调用，把后台生成的消息补进聊天）
app.get('/push/pending', function (req, res) {
  const did = req.query && req.query.deviceId
  if (did && devicePending[did]) return res.json({ pending: devicePending[did] })
  res.json({ pending: [] })
})
// 清空待收队列（拉取并写入聊天后调用）
app.post('/push/drain', function (req, res) {
  const did = req.body && req.body.deviceId
  if (did && devicePending[did]) { devicePending[did] = [] }
  res.json({ ok: true })
})
// 按需生成回复：网页把已拼好的模型请求发来，服务端代为调用 AI（与 /relay 同样只中转、key 不留存）。
// 生成的消息写入 devicePending，前端在后台开着时轮询拉取并弹系统通知。
app.post('/push/reply', async function (req, res) {
  const b = req.body || {}
  const target = b.target
  if (!target) return res.status(400).json({ error: '缺少 target' })
  let u
  try { u = new URL(target) } catch (e) { return res.status(400).json({ error: 'target 不合法' }) }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return res.status(400).json({ error: '仅支持 http/https' })
  const messages = b.messages
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: '缺少 messages' })
  const headers = Object.assign({}, b.headers || {})
  delete headers.host; delete headers.origin; delete headers.referer; delete headers['content-length']
  const modelBody = Object.assign({}, b.modelBody || {})
  modelBody.stream = false
  let text = ''
  try {
    const r = await fetch(target, { method: 'POST', headers: headers, body: JSON.stringify(Object.assign({ messages: messages }, modelBody)) })
    if (!r.ok) { const ed = await r.json().catch(function () { return {} }); return res.status(502).json({ error: (ed.error && ed.error.message) || ('HTTP ' + r.status) }) }
    const j = await r.json()
    text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content || '').trim()
  } catch (e) { return res.status(502).json({ error: 'AI 请求失败：' + (e && e.message || e) }) }
  if (!text) return res.status(502).json({ error: 'AI 返回为空' })
  const deviceId = b.deviceId
  const charId = b.charId || ''
  const charName = b.charName || '美乐地'
  // 设备级待收：写入 devicePending，前端轮询（后台开着时）拉取并弹通知
  if (deviceId) {
    devicePending[deviceId] = devicePending[deviceId] || []
    devicePending[deviceId].push({ charId: charId, charName: charName, text: text, ts: Date.now() })
    if (devicePending[deviceId].length > 50) devicePending[deviceId] = devicePending[deviceId].slice(-50)
  }
  res.json({ ok: true, text: text })
})

// AI 对话通用转发：访客填哪个网址就转发到哪，密钥留在访客浏览器里
// 浏览器发送 x-relay-target（完整目标 URL）+ x-relay-method，服务端原样转发
app.use('/relay', function (req, res) {
  const target = req.headers['x-relay-target']
  if (!target) return res.status(400).json({ code: 400, msg: '缺少 x-relay-target' })
  let u
  try { u = new URL(target) } catch (e) { return res.status(400).json({ code: 400, msg: '目标网址不合法' }) }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return res.status(400).json({ code: 400, msg: '仅支持 http/https' })
  const method = String(req.headers['x-relay-method'] || req.method).toUpperCase()
  const headers = Object.assign({}, req.headers)
  delete headers['x-relay-target']
  delete headers['x-relay-method']
  delete headers.origin
  delete headers.referer
  delete headers.host
  headers.host = u.host
  const client = u.protocol === 'https:' ? https : http
  const proxy = client.request({
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
    method: method,
    headers: headers
  }, function (pr) {
    const outHeaders = Object.assign({}, pr.headers)
    outHeaders['cache-control'] = 'no-store'
    delete outHeaders['etag']
    res.writeHead(pr.statusCode, outHeaders)
    pr.pipe(res)
  })
  proxy.on('error', function () {
    if (!res.headersSent) res.status(502).json({ code: 502, msg: '目标服务暂时不可用' })
    else res.end()
  })
  req.pipe(proxy)
})

// ============================================================
// 音频/视频 → WAV 转码（用于语音克隆样本）
// 手机浏览器解不出某些 mp4/webm 音轨，改由服务端 ffmpeg 抽音轨 → 单声道 24kHz WAV → 返回 dataURL
// ============================================================
const cp = require('child_process')
const os = require('os')
const ffmpegStatic = (function () { try { return require('ffmpeg-static') } catch (e) { return null } })()
function getFfmpeg() {
  if (ffmpegStatic) return ffmpegStatic
  try { cp.execSync('which ffmpeg'); return 'ffmpeg' } catch (e) { return null }
}
// 前端探测：服务端是否具备转码能力
app.get('/api/convert-audio', function (req, res) {
  res.json({ ok: true, supported: !!getFfmpeg() })
})
app.post('/api/convert-audio', function (req, res) {
  const ff = getFfmpeg()
  if (!ff) return res.status(500).json({ error: '服务器未安装 ffmpeg（请 npm i ffmpeg-static，或在系统安装 ffmpeg）' })
  const chunks = []
  let aborted = false
  req.on('data', function (c) {
    if (aborted) return
    chunks.push(c)
    const len = chunks.reduce(function (s, x) { return s + x.length }, 0)
    if (len > 220 * 1024 * 1024) { // 上限约 220MB，防撑爆内存
      aborted = true
      res.status(413).json({ error: '文件过大（上限约 220MB）' })
      req.destroy()
    }
  })
  req.on('error', function () { aborted = true })
  req.on('end', function () {
    if (aborted) return
    const buf = Buffer.concat(chunks)
    if (!buf.length) return res.status(400).json({ error: '空文件' })
    const ext = String(req.headers['x-file-ext'] || (req.headers['content-type'] || '').split('/')[1] || 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'mp4'
    const tmpIn = path.join(os.tmpdir(), 'cv_in_' + Date.now() + '.' + ext)
    const tmpOut = path.join(os.tmpdir(), 'cv_out_' + Date.now() + '.wav')
    fs.writeFile(tmpIn, buf, function (werr) {
      if (werr) return res.status(500).json({ error: '写入临时文件失败' })
      cp.execFile(ff, ['-i', tmpIn, '-vn', '-ac', '1', '-ar', '24000', '-f', 'wav', tmpOut],
        { timeout: 180000, maxBuffer: 50 * 1024 * 1024 }, function (e) {
          fs.unlink(tmpIn, function () {})
          if (e) {
            fs.unlink(tmpOut, function () {})
            return res.status(422).json({ error: '转码失败：' + (e.stderr ? String(e.stderr).slice(0, 200) : (e.message || e)) })
          }
          fs.readFile(tmpOut, function (rerr, data) {
            fs.unlink(tmpOut, function () {})
            if (rerr || !data) return res.status(500).json({ error: '读取转换结果失败' })
            res.json({ dataUrl: 'data:audio/wav;base64,' + data.toString('base64') })
          })
        })
    })
  })
})

// ===== WebRTC 信令 =====
app.use('/api/webrtc', express.json({ limit: '5mb' }));
app.post('/api/webrtc/signal', function(req, res) {
  const { from, to, type, sdp, candidate } = req.body || {};
  // 存储信令消息到内存（生产环境应使用 Redis）
  if (!global._webrtcSignals) global._webrtcSignals = {};
  const key = from + '-' + (to || 'all');
  if (!global._webrtcSignals[key]) global._webrtcSignals[key] = [];
  global._webrtcSignals[key].push({ from, to, type, sdp, candidate, ts: Date.now() });
  // 清理过期信令（保留5分钟）
  const cutoff = Date.now() - 300000;
  global._webrtcSignals[key] = global._webrtcSignals[key].filter(function(m) { return m.ts > cutoff; });
  res.json({ ok: true });
});
app.get('/api/webrtc/signal', function(req, res) {
  const from = req.query.charId || '';
  if (!global._webrtcSignals) return res.json({ messages: [] });
  const messages = [];
  Object.keys(global._webrtcSignals).forEach(function(key) {
    if (key.endsWith('-' + from) || key.endsWith('-all')) {
      messages.push(...global._webrtcSignals[key].filter(function(m) { return m.ts > Date.now() - 300000; }));
    }
  });
  res.json({ messages: messages });
});

app.use('/api', express.json({ limit: '20mb' }));

// ===== 天气查询代理 =====
app.get('/api/weather', async function(req, res) {
  const city = req.query.city || '上海';
  const key = process.env.AMAP_KEY || '';
  try {
    const r = await fetch('https://restapi.amap.com/v3/weather/weatherInfo?key=' + key + '&city=' + encodeURIComponent(city));
    if (!r.ok) return res.status(502).json({ error: '天气接口失败' });
    const data = await r.json();
    res.json({ ok: true, data: data });
  } catch(e) { res.status(502).json({ error: '天气查询失败' }); }
});

// ===== Supabase pgvector 记忆检索 =====
let pgClient = null;
async function getPgClient() {
  if (pgClient) return pgClient;
  const { Client } = require('pg');
  const pgUrl = process.env.SUPABASE_URL || '';
  const pgKey = process.env.SUPABASE_SERVICE_KEY || '';
  if (!pgUrl || !pgKey) return null;
  pgClient = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();
  return pgClient;
}
app.post('/api/rag/search', async function(req, res) {
  try {
    const { query, charId, topK } = req.body || {};
    if (!query) return res.status(400).json({ error: '缺少 query' });
    const top = parseInt(topK) || 5;
    const client = await getPgClient();
    if (!client) return res.status(503).json({ error: '向量数据库未配置' });
    try {
      const result = await client.query(
        `SELECT id, char_id, title, text, tags, weight, embedding <=> $1::vector as distance
         FROM rag_memories
         WHERE char_id = $2
         ORDER BY embedding <=> $1::vector
         LIMIT $3`,
        [query, charId || '', top]
      );
      res.json({ ok: true, results: result.rows });
    } catch(qe) {
      // 表不存在时返回空结果
      res.json({ ok: true, results: [] });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ===== 静态托管 =====
const APP_ROOT = process.env.APP_ROOT || path.join(__dirname, '..')
app.use(function (req, res, next) {
  const p = (req.path || '').split('?')[0]
  if (p === '/sever' || p.startsWith('/sever/') ||
      p === '/node_modules' || p.startsWith('/node_modules/') ||
      p === '/.git' || p.startsWith('/.git/')) {
    return res.status(403).send('Forbidden')
  }
  next()
})
app.use(express.static(APP_ROOT, { index: 'index.html', dotfiles: 'ignore' }))

// 其余请求代理给网易云 API
app.use(function (req, res) {
  const target = {
    hostname: '127.0.0.1',
    port: NCM_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: Object.assign({}, req.headers, { host: '127.0.0.1:' + NCM_PORT }),
  }
  const proxy = http.request(target, function (pr) {
    res.writeHead(pr.statusCode, pr.headers)
    pr.pipe(res)
  })
  proxy.on('error', function () {
    if (!res.headersSent) res.status(502).json({ code: 502, msg: '服务暂时不可用' })
    else res.end()
  })
  req.pipe(proxy)
})

app.listen(PORT, '0.0.0.0', function () {
  console.log('服务器已启动，监听端口：' + PORT)
})
