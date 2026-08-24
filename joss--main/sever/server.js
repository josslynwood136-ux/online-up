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
}

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
