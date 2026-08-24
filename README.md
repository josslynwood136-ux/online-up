# 美乐地 (joss--main)

一个网页版“手机模拟器”角色聊天应用，支持多平台 AI 语音（MiniMax / 小米 MiMo / ElevenLabs）与 MiMo 声音克隆。

## 📝 最近更新（2026-08-24）

- **MiMo 克隆修通**：修正官方接口（`messages` 顺序、输出 `wav`、双鉴权头）；克隆样本改存 IndexedDB，角色只留 `{name,size}` 标记，解决“无法保存”
- **克隆恢复纯音频**：移除 mp4/webm/m4a 转码与 ffmpeg 兜底（手机端转换不稳定），克隆仅接受 mp3 / wav
- **聊天设置新增**：声音风格指令、克隆稳定度滑杆、输出语种跟随
- **模型更新**：MiniMax 补 speech-2.8/2.6 系列；ElevenLabs 补 v3_conversational / flash_v2_5
- **界面**：小米密钥框仅在有克隆角色时显示；克隆按钮与滑杆配色美化
- **规划中**：Capacitor 打包 APK + 前台服务 + WebSocket，做后台推送与荣耀手环提醒

> 完整改动明细见 [CHANGELOG.md](./CHANGELOG.md)

## 📚 版本更新历史（按时期，每个 block 独立说明当期改动）

> **约定（重要）**：每做一次实质改动，就在下面新增一个「### 日期」block，独立写清「本期做了什么、相对上一版改了什么」。
> 这样日后回看任意某一天的版本，都能直接知道那是 A 还是 B，不用翻上下文。
> 例如：昨天做了 A 功能 → 加一个 `### 昨天` 写"A 做了什么"；今天加了 B → 加一个 `### 今天` 写"B 在 A 基础上改进了什么"。两个 block 互不依赖，单独看就懂。

### 2026-08-24
**本期范围（这一版 = 做了什么）**：语音克隆打通（MiMo）+ 聊天设置增强 + 模型预设扩充；并在**同一天回退**了"音视频转克隆样本"功能。

- **语音克隆（MiMo TTS）修复**：`mimoSpeak` 按官方文档修正（`messages` 固定 `user` 在前 + `assistant` 承载合成文本、输出格式改 `wav`、鉴权同时带 `Authorization` 与 `api-key` 两个头，401/403 给中文提示）；克隆样本从 `localStorage`（约 5MB 配额会爆）迁移到 **IndexedDB**（新增 `_cloneDbSet / _cloneDbGet / _cloneDbDel`），角色数据只留轻量标记 `c.ttsClone = {name, size}`，`mimoSpeak` 自动从 IndexedDB 取样本，样本丢失时明确报错
- **聊天设置增强**：声音风格指令（一句话导演语气，随 user 消息下发）、克隆稳定度滑杆（0.1 稳 ~ 1.2 灵动，联动 temperature / top_p）、输出语种跟随（选非中文自动追加「全程用 X 语发音」）
- **模型预设**：MiniMax 新增 `speech-2.8-hd / -turbo`、`speech-2.6-hd / -turbo`；ElevenLabs 新增 `eleven_v3_conversational`、`eleven_flash_v2_5`
- **界面**：小米密钥框改为仅当存在启用克隆的角色时才显示；克隆上传重做为「虚线上传框 + 试听/清除胶囊」，稳定度滑杆换暖色系
- **（当日回退）音视频转克隆样本**：原本新增 MP4/WebM/M4A → 提取音轨 → 单声道 → 24kHz 重采样 → WAV 的纯前端转换（含 `<video>+MediaRecorder` 兜底，后又加 ffmpeg.wasm 兜底）。实测手机端转换不稳定、失败率高（部分 mp4 音轨浏览器解不出 / 转码失败），已整体移除，克隆恢复为仅接受 mp3 / wav 音频

### 2026-08-24（补充）：mp4/webm 经服务端转码重新支持
**本期范围（这一版 = 做了什么）**：把"视频转克隆样本"改走**服务端 ffmpeg 转码**，彻底绕开手机浏览器解码不稳定的问题，mp4/webm/m4a/mov 重新可用。

- **后端新增 `/api/convert-audio`**（`sever/server.js`）：前端把原始视频/音频 POST 上来，服务端用 ffmpeg 抽音轨 → 单声道 24kHz WAV → 返回 `data:audio/wav;base64`；依赖 `ffmpeg-static`（随 `npm install` 自动装静态二进制）。另提供 `GET /api/convert-audio` 供前端探测服务端是否支持
- **前端 `uploadCloneVoice`**：mp3/wav 仍走原"直传"快路径；视频/其它容器改为上传到 `/api/convert-audio`，拿到 wav 后照常存 IndexedDB；失败给出明确提示（建议改用 mp3/wav 或确认后端已部署）
- **UI**：克隆上传框 `accept` 重新放开视频类型，按钮文案改回「🎙 上传录音或视频 · mp3 / wav / mp4 均可」
- **说明**：视频转码需要后端（部署 `sever/server.js`）；若以纯静态方式打开网页（无后端），视频上传会提示改用 mp3/wav，不影响音频直传

## ✨ 功能

- **多平台 AI 语音播报**：MiniMax 海螺 / 小米 MiMo / ElevenLabs，按角色独立设置平台与音色
- **MiMo 声音克隆**：上传 10~30 秒清晰录音（mp3 / wav），或视频/音频片段（mp4 / webm / m4a 等，由服务端 ffmpeg 转成 wav）复刻角色声线；样本存 IndexedDB，不挤占 localStorage
- **声音风格 & 稳定度**：一句话导演语气 + 稳定度滑杆（联动 temperature/top_p）
- **语种跟随**：跟随聊天设置里的输出语种，非中文自动要求模型用该语言发音
- **网页推送**：内置 Web Push（VAPID），可推送角色消息到手机通知

## 🚀 运行 / 部署

前端是纯静态文件，后端 `sever/server.js` 提供中继（规避跨域）与 Web Push。

```bash
# 本地
node sever/server.js

# 部署到 Render / 类似平台：
#   构建命令：留空（纯静态 + Node 服务）
#   启动命令：node sever/server.js
#   注意：免费档会休眠——若要做“角色主动推送”，需要常驻不休眠的主机
```

## 🔑 配置各平台密钥

在「设置 → 角色语音」里分别填：

| 平台 | 密钥来源 | 备注 |
|---|---|---|
| MiniMax 海螺 | platform.minimaxi.com | 中国站需额外填 GroupId |
| 小米 MiMo | mimo.mi.com 控制台 | 克隆需先上传样本 |
| ElevenLabs | elevenlabs.io 的 xi-api-key | — |

## ⚠️ 已知问题

- **克隆视频需后端转码**：mp4/webm 等视频由服务端 ffmpeg 转成 wav（需部署 `sever/server.js`）；纯静态打开（无后端）时视频上传会提示改用 mp3/wav
- **推送依赖常驻服务器**：服务器休眠则角色无法主动发消息

## 🗺️ 路线图

- [ ] **后台推送 + 荣耀手环**：Capacitor 打包 APK + 前台服务 + WebSocket；服务器侧加「角色代笔」定时任务（替角色调 LLM 生成主动消息并推送，手环经荣耀运动健康镜像通知）
- [ ] 探索更稳的音频导入方式（如服务端转码）以支持更多格式

## 目录速览

- `index.html` — 入口与聊天设置 UI
- `js/tts.js` — 三平台 TTS、克隆存储（IndexedDB）
- `js/apps.js` — 语音设置面板
- `css/style.css` — 样式（含滑杆配色）
- `sever/server.js` — 中继 / Web Push 服务器
