# ============================================================
#  serve.ps1 — 起一个本地静态服务器，打开项目
# ============================================================
#
#  为什么需要这个
#  --------------
#  3D 人物是 character-girl.glb（10MB）。浏览器不允许 file:// 直接 fetch
#  .glb（CORS），所以双击 index.html 打开的话，卧室里看不到人。
#  必须走 http://，用这个脚本起一下就行。
#
#  为什么不用 serve.js
#  ------------------
#  serve.js 要 node，但这台机器没装 node（WindowsApps 里那个 python /
#  python3 也是空壳，装完会跳商店）。这个脚本只用 PowerShell 自带的
#  System.Net.HttpListener，Windows 上都有。
#
#  怎么用
#  ------
#  在项目目录里右键这个文件 →「使用 PowerShell 运行」，
#  或者在终端里：
#      powershell -ExecutionPolicy Bypass -File .\serve.ps1
#
#  然后浏览器打开 http://127.0.0.1:8123/
#
#  换端口：  .\serve.ps1 -Port 9000
#  不自动开浏览器：  .\serve.ps1 -NoOpen
#
#  关掉：关掉这个 PowerShell 窗口，或者在窗口里按 Ctrl+C。
# ============================================================
param(
  # 默认 8000 —— 和 serve.js（node 版）用同一个端口，两个可以互相替换
  [int]$Port = 8000,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

# 项目根目录（就是 index.html 所在的那层）
$root = (Resolve-Path -LiteralPath $root).Path

$MIME = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.mjs'  = 'application/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.glb'  = 'model/gltf-binary'
  '.gltf' = 'model/gltf+json'
  '.bin'  = 'application/octet-stream'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.gif'  = 'image/gif'
  '.webp' = 'image/webp'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
  '.woff' = 'font/woff'
  '.woff2' = 'font/woff2'
  '.ttf'  = 'font/ttf'
  '.mp3'  = 'audio/mpeg'
  '.mp4'  = 'video/mp4'
  '.webm' = 'video/webm'
  '.txt'  = 'text/plain; charset=utf-8'
}

try {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://127.0.0.1:$Port/")
  $listener.Start()
} catch {
  Write-Host ''
  Write-Host "  端口 $Port 起不来：$($_.Exception.Message)" -ForegroundColor Red
  Write-Host "  可能已经在跑了。换个端口： .\serve.ps1 -Port $(([int]$Port) + 1)"
  Write-Host ''
  exit 1
}

$url = "http://127.0.0.1:$Port/"
Write-Host ''
Write-Host "  美乐地 · 本地服务器已启动" -ForegroundColor Green
Write-Host "  $url"
Write-Host "  根目录：$root"
Write-Host '  3D 人物是 .glb，必须走这个地址，直接双击 index.html 看不到。' -ForegroundColor DarkGray
Write-Host '  关掉：Ctrl+C 或直接关掉这个窗口。' -ForegroundColor DarkGray
Write-Host ''

if (-not $NoOpen) {
  Start-Sleep -Milliseconds 400
  try { Start-Process $url } catch { }
}

try {
  while ($true) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }

      # 不许跳出项目根目录
      $full = [System.IO.Path]::GetFullPath(
        (Join-Path $root ($path.TrimStart('/') -replace '/', '\')))
      if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $res.ContentLength64 = 0
        $res.OutputStream.Close()
        continue
      }

      # 本地开发服务器没有推送后台，直接给空 pending，避免控制台一堆 404
      if ($path.StartsWith('/push/')) {
        $msg = [System.Text.Encoding]::UTF8.GetBytes('{"pending":[]}')
        $res.StatusCode = 200
        $res.ContentType = 'application/json; charset=utf-8'
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.OutputStream.Close()
        continue
      }

      if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404  $path")
        $res.StatusCode = 404
        $res.ContentType = 'text/plain; charset=utf-8'
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
        $res.OutputStream.Close()
        Write-Host ("  404  {0}" -f $path) -ForegroundColor DarkYellow
        continue
      }

      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      $type = if ($MIME.ContainsKey($ext)) { $MIME[$ext] } else { 'application/octet-stream' }
      $bytes = [System.IO.File]::ReadAllBytes($full)

      $res.StatusCode = 200
      $res.ContentType = $type
      $res.ContentLength64 = $bytes.Length
      $res.AddHeader('Access-Control-Allow-Origin', '*')
      # 开发时不缓存，免得改了代码还看到旧的
      $res.AddHeader('Cache-Control', 'no-store')

      $out = $res.OutputStream
      for ($o = 0; $o -lt $bytes.Length; $o += 262144) {
        $n = [Math]::Min(262144, $bytes.Length - $o)
        $out.Write($bytes, $o, $n)
      }
      $out.Close()

      # .glb 单独标一下，方便确认模型有没有真的被请求到
      if ($ext -eq '.glb') {
        Write-Host ("  200  {0,10:N0}  {1}   <- 3D 模型" -f $bytes.Length, $path) -ForegroundColor Cyan
      }
    } catch {
      Write-Host ("  ERR  {0}" -f $_.Exception.Message) -ForegroundColor DarkYellow
      try { $res.Abort() } catch { }
    }
  }
} finally {
  $listener.Stop()
}
