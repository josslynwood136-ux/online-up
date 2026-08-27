// 网易云 + QQ 音乐助手（云端版）
// 网易云 API 跑在内部端口，主服务提供 /qq 路由，其余请求代理给网易云
// 部署到免费云服务器后，手机上的仿真小手机就能扫码登录你的网易云 / QQ 音乐账号
const express = require('express')
const http = require('http')
const https = require('https')
const path = require('path')
const fs = require('fs')
const webpush = require('web-push')

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
// Web Push（网页后台 / 关闭时也能把消息推到手机）
// ============================================================
// VAPID 密钥：优先用环境变量，否则用项目里的 vapid-keys.json（已生成）
const VAPID_KEYS = (function () {
  const pub = process.env.VAPID_PUBLIC_KEY
  const pri = process.env.VAPID_PRIVATE_KEY
  if (pub && pri) return { publicKey: pub, privateKey: pri }
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'vapid-keys.json'), 'utf8'))
  } catch (e) {
    console.error('未找到 VAPID 密钥：请设置 VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY 或生成 vapid-keys.json')
    return null
  }
})()
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:push@mele.me'
if (VAPID_KEYS) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_KEYS.publicKey, VAPID_KEYS.privateKey)
}

// 订阅存储（文件持久化，重启不丢）
const SUB_FILE = path.join(__dirname, 'push-subscriptions.json')
let pushSubs = []
try { pushSubs = JSON.parse(fs.readFileSync(SUB_FILE, 'utf8')) } catch (e) { pushSubs = [] }
function saveSubs() {
  try { fs.writeFileSync(SUB_FILE, JSON.stringify(pushSubs)) } catch (e) {}
}
function upsertSub(sub) {
  if (!sub || !sub.endpoint) return
  const i = pushSubs.findIndex(function (s) { return s.endpoint === sub.endpoint })
  if (i >= 0) pushSubs[i] = sub; else pushSubs.push(sub)
  saveSubs()
}
function removeSub(sub) {
  if (!sub || !sub.endpoint) return
  pushSubs = pushSubs.filter(function (s) { return s.endpoint !== sub.endpoint })
  saveSubs()
  // 订阅删除时一并清掉它的配置/待收
  if (pushConfigs[sub.endpoint]) { delete pushConfigs[sub.endpoint]; saveConfigs() }
}

// ===== 主动推送配置（含 AI 凭证 + 角色人设 + 发送计划，存服务器用于后台生成）=====
// ⚠️ 注意：这里会以明文保存用户的 AI key，仅适用于你自己部署、信任该服务器的场景。
const PUSH_CFG_FILE = path.join(__dirname, 'push-config.json')
let pushConfigs = {}
try { pushConfigs = JSON.parse(fs.readFileSync(PUSH_CFG_FILE, 'utf8')) } catch (e) { pushConfigs = {} }
function saveConfigs() {
  try { fs.writeFileSync(PUSH_CFG_FILE, JSON.stringify(pushConfigs)) } catch (e) {}
}
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
// 定时器：每分钟扫一遍，给"到点"的订阅生成并推送主动消息
async function scheduleTick() {
  var now = Date.now()
  for (var ep in pushConfigs) {
    var cfg = pushConfigs[ep]
    if (!cfg || !cfg.plan || !cfg.plan.enabled) continue
    if (!cfg.creds || !cfg.creds.url || !cfg.creds.key) continue
    if (!cfg.subscription) continue
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
    var payload = {
      title: best.name || '美乐地',
      body: text.slice(0, 200),
      url: '/',
      tag: 'proactive-' + (best.id || 'all'),
      avatar: best.avatar || '',
      charId: best.id || ''
    }
    try { await webpush.sendNotification(cfg.subscription, JSON.stringify(payload)) } catch (err) {
      if (err && (err.statusCode === 404 || err.statusCode === 410)) { delete pushConfigs[ep]; saveConfigs() }
      continue
    }
    // 写入待收队列，app 打开时倒进聊天
    cfg.lastSent = cfg.lastSent || {}
    cfg.lastSent[best.id] = now
    cfg.pending = cfg.pending || []
    cfg.pending.push({ charId: best.id || '', text: text, ts: now })
    if (cfg.pending.length > 50) cfg.pending = cfg.pending.slice(-50)
    saveConfigs()
  }
}
setInterval(scheduleTick, 60000)

app.use('/push', express.json())
// 前端拿公钥用于订阅
app.get('/push/vapid-public-key', function (req, res) {
  if (!VAPID_KEYS) return res.status(500).json({ error: 'VAPID 未配置' })
  res.json({ publicKey: VAPID_KEYS.publicKey })
})
// 保存订阅
app.post('/push/subscribe', function (req, res) {
  const sub = req.body && req.body.subscription
  if (!sub || !sub.endpoint) return res.status(400).json({ error: '缺少 subscription' })
  upsertSub(sub)
  res.json({ ok: true, count: pushSubs.length })
})
// 取消订阅
app.post('/push/unsubscribe', function (req, res) {
  const sub = req.body && req.body.subscription
  if (sub && sub.endpoint) removeSub(sub)
  res.json({ ok: true, count: pushSubs.length })
})
// 发送推送（characterId 可选，用于对某角色的单设备定向；这里简单推送给全部订阅）
app.post('/push/send', function (req, res) {
  const payload = {
    title: (req.body && req.body.title) || '美乐地',
    body: (req.body && req.body.body) || '你有一条新消息',
    url: (req.body && req.body.url) || '/',
    tag: (req.body && req.body.tag) || 'msg',
    avatar: (req.body && req.body.avatar) || '',
    charId: (req.body && req.body.charId) || ''
  }
  if (!pushSubs.length) return res.json({ ok: true, sent: 0, skipped: true })
  const data = JSON.stringify(payload)
  let sent = 0, failed = 0
  const tasks = pushSubs.map(function (sub) {
    return webpush.sendNotification(sub, data).then(function () { sent++ }).catch(function (err) {
      failed++
      if (err.statusCode === 404 || err.statusCode === 410) removeSub(sub) // 订阅失效，清理
    })
  })
  Promise.all(tasks).then(function () {
    res.json({ ok: true, sent: sent, failed: failed, total: pushSubs.length })
  }).catch(function () { res.json({ ok: true, sent: sent, failed: failed }) })
})
// 上报/更新主动推送配置（凭证 + 角色人设 + 计划）
app.post('/push/config', function (req, res) {
  const sub = req.body && req.body.subscription
  if (!sub || !sub.endpoint) return res.status(400).json({ error: '缺少 subscription' })
  const creds = req.body.creds || null
  const chars = Array.isArray(req.body.chars) ? req.body.chars : []
  const plan = req.body.plan || { enabled: false }
  const ep = sub.endpoint
  const old = pushConfigs[ep] || {}
  pushConfigs[ep] = {
    subscription: sub,
    creds: creds,
    chars: chars,
    plan: plan,
    lastSent: old.lastSent || {},
    pending: old.pending || []
  }
  saveConfigs()
  res.json({ ok: true })
})
// 拉取待收消息（app 打开时调用，把后台生成的消息补进聊天）
app.get('/push/pending', function (req, res) {
  const ep = req.query && req.query.endpoint
  if (!ep) return res.json({ pending: [] })
  const cfg = pushConfigs[ep]
  if (!cfg || !cfg.pending) return res.json({ pending: [] })
  res.json({ pending: cfg.pending })
})
// 清空待收队列（拉取并写入聊天后调用）
app.post('/push/drain', function (req, res) {
  const ep = req.body && req.body.endpoint
  if (ep && pushConfigs[ep]) { pushConfigs[ep].pending = []; saveConfigs() }
  res.json({ ok: true })
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

// 静态托管整个项目（应用网页在本文件上一级目录）
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
