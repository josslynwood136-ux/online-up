# 美乐地 (joss--main)

一个网页版“手机模拟器”角色聊天应用，支持多平台 AI 语音（MiniMax / 小米 MiMo / ElevenLabs）、MiMo 声音克隆、以及把音视频片段转成克隆样本。

## 📝 最近更新（2026-08-24）

- **MiMo 克隆修通**：修正官方接口（`messages` 顺序、输出 `wav`、双鉴权头）；克隆样本改存 IndexedDB，角色只留 `{name,size}` 标记，解决“无法保存”
- **MP4/WebM/M4A 转克隆样本**：纯前端提取音轨 → 单声道 → 24kHz → WAV；移动端加 `<video>+MediaRecorder` 兜底
- **聊天设置新增**：声音风格指令、克隆稳定度滑杆、输出语种跟随
- **模型更新**：MiniMax 补 speech-2.8/2.6 系列；ElevenLabs 补 v3_conversational / flash_v2_5
- **界面**：小米密钥框仅在有克隆角色时显示；克隆按钮与滑杆配色美化
- **规划中**：Capacitor 打包 APK + 前台服务 + WebSocket，做后台推送与荣耀手环提醒

> 完整改动明细见 [CHANGELOG.md](./CHANGELOG.md)

## ✨ 功能

- **多平台 AI 语音播报**：MiniMax 海螺 / 小米 MiMo / ElevenLabs，按角色独立设置平台与音色
- **MiMo 声音克隆**：上传 10~30 秒清晰录音（或 MP4/WebM/M4A 视频片段）复刻角色声线；样本存 IndexedDB，不挤占 localStorage
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

- **手机端 MP4 转换**：部分视频音轨编码（如 AC3/DTS）手机浏览器解不出，建议先导出 mp3 再上传
- **推送依赖常驻服务器**：服务器休眠则角色无法主动发消息

## 🗺️ 路线图

- [ ] **后台推送 + 荣耀手环**：Capacitor 打包 APK + 前台服务 + WebSocket；服务器侧加「角色代笔」定时任务（替角色调 LLM 生成主动消息并推送，手环经荣耀运动健康镜像通知）
- [ ] 完善移动端音频转换的兜底与诊断

## 目录速览

- `index.html` — 入口与聊天设置 UI
- `js/tts.js` — 三平台 TTS、克隆存储、音视频转换
- `js/apps.js` — 语音设置面板
- `css/style.css` — 样式（含滑杆配色）
- `sever/server.js` — 中继 / Web Push 服务器
