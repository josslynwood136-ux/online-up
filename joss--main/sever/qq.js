// QQ 音乐扫码登录 / 搜索 / 播放 代理
const https = require('https')
const http = require('http')
const express = require('express')

const router = express.Router()

function hash33(t) {
  let e = 0
  for (let n = 0, o = t.length; n < o; ++n) e += (e << 5) + t.charCodeAt(n)
  return 2147483647 & e
}

function getGtk(pSkey) {
  let hash = 5381
  for (let i = 0, len = pSkey.length; i < len; ++i) hash += (hash << 5) + pSkey.charCodeAt(i)
  return hash & 0x7fffffff
}

function getGuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  }).toUpperCase()
}

function reqRaw(url, options) {
  options = options || {}
  return new Promise(function (resolve, reject) {
    const mod = url.indexOf('https') === 0 ? https : http
    const u = new URL(url)
    const opt = {
      hostname: u.hostname,
      port: u.port || (url.indexOf('https') === 0 ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: Object.assign(
        { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        options.headers || {}
      ),
    }
    const body = options.body || null
    if (body) opt.headers['Content-Length'] = Buffer.byteLength(body)
    const r = mod.request(opt, function (res) {
      const chunks = []
      res.on('data', function (c) { chunks.push(c) })
      res.on('end', function () {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          setCookie: res.headers['set-cookie'] || [],
          location: res.headers['location'] || null,
          body: Buffer.concat(chunks),
        })
      })
    })
    r.on('error', reject)
    if (body) r.write(body)
    r.end()
  })
}

function collectCookies(map, setCookieArr) {
  if (!setCookieArr) return
  setCookieArr.forEach(function (header) {
    header.split(/,(?=\s*[a-zA-Z_]+=)/).forEach(function (part) {
      const pair = part.split(';')[0].trim()
      const eq = pair.indexOf('=')
      if (eq > 0) {
        const k = pair.slice(0, eq).trim()
        const v = pair.slice(eq + 1).trim()
        if (k && v) map.set(k, pair)
      }
    })
  })
}

function cookieValue(map, key) {
  const pair = map.get(key)
  if (!pair) return ''
  const eq = pair.indexOf('=')
  return eq > 0 ? pair.slice(eq + 1) : ''
}

// 生成登录二维码
router.get('/qr', function (req, res) {
  const url =
    'https://ssl.ptlogin2.qq.com/ptqrshow?appid=716027609&e=2&l=M&s=3&d=72&v=4&t=' +
    Math.random() +
    '&daid=383&pt_3rd_aid=100497308&u1=' +
    encodeURIComponent('https://graph.qq.com/oauth2.0/login_jump')
  reqRaw(url)
    .then(function (r) {
      const map = new Map()
      collectCookies(map, r.setCookie)
      const qrsig = cookieValue(map, 'qrsig')
      if (!qrsig) return res.json({ result: 502, errMsg: '获取二维码失败' })
      res.json({
        result: 100,
        img: 'data:image/png;base64,' + r.body.toString('base64'),
        qrsig: qrsig,
        ptqrtoken: hash33(qrsig),
      })
    })
    .catch(function () {
      res.json({ result: 502, errMsg: '获取二维码失败' })
    })
})

// 轮询扫码状态
router.get('/check', function (req, res) {
  const qrsig = req.query.qrsig || ''
  const ptqrtoken = req.query.ptqrtoken || ''
  if (!qrsig || !ptqrtoken) return res.json({ result: 400, errMsg: '参数缺失' })
  const url =
    'https://ssl.ptlogin2.qq.com/ptqrlogin?u1=' +
    encodeURIComponent('https://graph.qq.com/oauth2.0/login_jump') +
    '&ptqrtoken=' + ptqrtoken +
    '&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-' + Date.now() +
    '&js_ver=23111510&js_type=1&login_sig=du-YS1h8*0GqVqcrru0pXkpwVg2DYw-DtbFulJ62IgPf6vfiJe*4ONVrYc5hMUNE' +
    '&pt_uistyle=40&aid=716027609&daid=383&pt_3rd_aid=100497308&o1vId=' + getGuid() + '&pt_js_version=v1.48.1'
  reqRaw(url, { headers: { Cookie: 'qrsig=' + qrsig } })
    .then(function (r) {
      const text = r.body.toString('utf8')
      const m = text.match(/ptuiCB\('(\d+)','[^']*','([^']*)'/)
      if (!m) return res.json({ result: 502, errMsg: '登录请求异常' })
      const code = m[1]
      if (code !== '0') {
        const refresh = code === '65'
        return res.json({
          result: 100,
          isOk: false,
          refresh: refresh,
          message: refresh ? '二维码已失效，请重试' : code === '67' ? '已扫码，请在手机上确认' : '等待扫码',
        })
      }
      const loginUrl = m[2]
      if (!loginUrl) return res.json({ result: 502, errMsg: '登录失败' })
      const cookieMap = new Map()
      collectCookies(cookieMap, r.setCookie)
      const allCookie = function () { return Array.from(cookieMap.values()).join('; ') }

      reqRaw(loginUrl, { headers: { Cookie: allCookie() } })
        .then(function (sigRes) {
          collectCookies(cookieMap, sigRes.setCookie)
          const pSkey = cookieValue(cookieMap, 'p_skey')
          if (!pSkey) return res.json({ result: 502, errMsg: '登录失败' })
          const gtk = getGtk(pSkey)

          const authForm = new URLSearchParams()
          authForm.append('response_type', 'code')
          authForm.append('client_id', '100497308')
          authForm.append('redirect_uri', 'https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=' + encodeURIComponent('https://y.qq.com/'))
          authForm.append('scope', 'get_user_info,get_app_friends')
          authForm.append('state', 'state')
          authForm.append('switch', '')
          authForm.append('from_ptlogin', '1')
          authForm.append('src', '1')
          authForm.append('update_auth', '1')
          authForm.append('openapi', '1010_1030')
          authForm.append('g_tk', String(gtk))
          authForm.append('auth_time', new Date().toString())
          authForm.append('ui', getGuid())

          reqRaw('https://graph.qq.com/oauth2.0/authorize', {
            method: 'POST',
            headers: { Cookie: allCookie(), 'Content-Type': 'application/x-www-form-urlencoded' },
            body: authForm.toString(),
          })
            .then(function (authRes) {
              collectCookies(cookieMap, authRes.setCookie)
              if (authRes.status < 300 || authRes.status >= 400 || !authRes.location) {
                return res.json({ result: 502, errMsg: '登录失败' })
              }
              const codeMatch = authRes.location.match(/[?&]code=([^&]+)/)
              if (!codeMatch) return res.json({ result: 502, errMsg: '登录失败' })
              const code = codeMatch[1]

              const loginData = JSON.stringify({
                comm: { g_tk: gtk, platform: 'yqq', ct: 24, cv: 0 },
                req: { module: 'QQConnectLogin.LoginServer', method: 'QQLogin', param: { code: code } },
              })
              reqRaw('https://u.y.qq.com/cgi-bin/musicu.fcg', {
                method: 'POST',
                headers: { Cookie: allCookie(), 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'data=' + encodeURIComponent(loginData),
              })
                .then(function (loginRes) {
                  collectCookies(cookieMap, loginRes.setCookie)
                  let nick = 'QQ音乐用户'
                  try {
                    const j = JSON.parse(loginRes.body.toString('utf8'))
                    if (j && j.req1 && j.req1.data) {
                      if (j.req1.data.nick) nick = j.req1.data.nick
                      else if (j.req1.data.nickname) nick = j.req1.data.nickname
                    }
                  } catch (e) {}
                  res.json({ result: 100, isOk: true, cookie: allCookie(), nick: nick })
                })
                .catch(function () { res.json({ result: 502, errMsg: '登录失败' }) })
            })
            .catch(function () { res.json({ result: 502, errMsg: '登录失败' }) })
        })
        .catch(function () { res.json({ result: 502, errMsg: '登录失败' }) })
    })
    .catch(function () {
      res.json({ result: 502, errMsg: '网络错误' })
    })
})

// 搜索歌曲
router.get('/search', function (req, res) {
  const key = (req.query.key || '').trim()
  if (!key) return res.json({ result: 400, errMsg: '请输入关键词' })
  const url =
    'https://c.y.qq.com/soso/fcgi-bin/client_search_cp?new_json=1&p=1&n=25&w=' +
    encodeURIComponent(key) + '&format=json'
  reqRaw(url)
    .then(function (r) {
      const j = JSON.parse(r.body.toString('utf8'))
      const list = (j && j.data && j.data.song && j.data.song.list) || []
      const songs = list
        .map(function (s) {
          return {
            songmid: s.songmid || '',
            name: s.songname || '',
            singer: (s.singer || []).map(function (x) { return x.name }).join('/'),
            album: s.albumname || '',
            albummid: s.albummid || '',
            interval: s.interval || 0,
          }
        })
        .filter(function (s) { return s.songmid && s.name })
      res.json({ result: 100, data: songs })
    })
    .catch(function () {
      res.json({ result: 502, errMsg: '搜索失败' })
    })
})

// 获取播放地址（带 cookie 可解锁 VIP）
router.get('/url', function (req, res) {
  const id = (req.query.id || '').trim()
  if (!id) return res.json({ result: 400, errMsg: 'id 不能为空' })
  const ck = {}
  String(req.query.cookie || '').split(';').forEach(function (p) {
    const i = p.indexOf('=')
    if (i > 0) ck[p.slice(0, i).trim()] = p.slice(i + 1).trim()
  })
  const uin = ck.uin || '0'
  const authst = ck.qqmusic_key || ck.qm_keyst || ''
  const file = 'M500' + id + id + '.mp3'
  const guid = Math.floor(Math.random() * 10000000)
  const data = JSON.stringify({
    req_0: {
      module: 'vkey.GetVkeyServer',
      method: 'CgiGetVkey',
      param: {
        filename: [file],
        guid: String(guid),
        songmid: [id],
        songtype: [0],
        uin: String(uin),
        loginflag: 1,
        platform: '20',
      },
    },
    comm: { uin: String(uin), format: 'json', ct: 19, cv: 0, authst: authst },
  })
  const form = new URLSearchParams({
    '-': 'getplaysongvkey',
    g_tk: '5381',
    loginUin: String(uin),
    hostUin: '0',
    format: 'json',
    inCharset: 'utf8',
    outCharset: 'utf-8?ice=0',
    platform: 'yqq.json',
    needNewCode: '0',
    data: data,
  }).toString()
  reqRaw('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
    .then(function (r) {
      const j = JSON.parse(r.body.toString('utf8'))
      const info = j && j.req_0 && j.req_0.data
      if (!info) return res.json({ result: 400, errMsg: '无法获取播放地址' })
      const purl = info.midurlinfo && info.midurlinfo[0] && info.midurlinfo[0].purl
      const sip = info.sip || []
      const domain = sip.find(function (i) { return i.indexOf('http://ws') !== 0 }) || sip[0]
      if (!purl || !domain) return res.json({ result: 400, errMsg: '无法获取播放地址' })
      res.json({ result: 100, data: domain + purl })
    })
    .catch(function () {
      res.json({ result: 502, errMsg: '播放地址获取失败' })
    })
})

module.exports = router
