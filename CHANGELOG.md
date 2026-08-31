# 开发日志 / Changelog

> 本文件记录「美乐地」（仓库 / npm：`joss-phone`，PWA 短名：小手机）每次改动的明细，方便上传 GitHub 时回溯。
> 日期格式 YYYY-MM-DD。文件引用版本见各条末的 index.html 后缀（?v=）。

---

## 2026-08-31

### 文档与命名
- 产品名统一为「美乐地」；`manifest.json` 的 `name` 与页面 `<title>` / `apple-mobile-web-app-title` 对齐；短名仍为「小手机」
- README 按当前 `index.html` 实际加载的脚本和 `sever/server.js` 接口重写（不再写「纯静态即可覆盖全部能力」）

### 一、RAG 检索增强 + 向量化存储 + 时间线摘要
- 新增 `js/rag.js`：简易向量嵌入（基于关键词哈希）、余弦相似度检索、时间线自动摘要
- 时间线系统：自动记录对话条目，周期性生成摘要
- 记忆检索增强：`buildAIMessagesWithRAG()` 自动检索相关记忆并注入系统提示词
- IndexedDB 存储向量嵌入，支持批量嵌入和检索
- 新增 `triggerMemorySummary()` 手动触发记忆总结 + 向量化

### 二、WebRTC 语音通话 + ASR+TTS 闭环
- 新增 `js/webrtc.js`：WebRTC 语音通话（STUN/TURN 支持）、ICE 重连机制
- 通话 UI：静音/扬声器切换、通话计时器、状态显示
- ASR 实时语音识别：通话中语音自动转写为文字
- ASR+TTS 闭环：语音输入 → AI 生成回复 → TTS 朗读
- 服务端信令：`/api/webrtc/signal` 端点支持 offer/answer/ICE candidate 中转
- 新增 `startCall(type)` / `endCall()`（`webrtc.js` 覆盖聊天窗通话入口）

### 三、AI 绘图/生图
- 新增 `js/imagegen.js`：经后端 `POST /api/imagegen` 代理生成（默认 sdxl）
- 支持在聊天中生成图片、IG 发帖生成封面
- 生成历史记录（localStorage）
- 新增 `genImageInChat()` / `genImageForPost()` 全局函数

### 四、服务端新增接口
- `POST /api/webrtc/signal` — WebRTC 信令中转
- `GET /api/webrtc/signal?charId=` — 拉取信令消息
- `POST /api/imagegen` — AI 图像生成
- `GET /api/weather?city=` — 天气查询代理（前端桌面小组件尚未接入）
- `POST /api/rag/search` — Supabase pgvector 记忆检索

### 五、技术栈与已挂载模块
- `package.json` 新增 `@supabase/supabase-js`、`sharp` 依赖
- 已挂到 `index.html` 的新模块：`rag.js`、`webrtc.js`、`imagegen.js`（另有 8-30 的 `liveroom.js`）
- CSS 含 WebRTC 通话、AI 生图等相关样式

### 六、未入库 / 未挂载（避免和代码脱节）
- **没有** `js/groupchat.js`、`js/widgets.js`；多角色群聊、可开关桌面小组件（天气/倒数日/打卡进度）尚未作为独立模块落地
- `js/mq.js`（联系人式 UI）在仓库中存在，但当前 `index.html` 未引用
- **已挂载 `js/relate.js`**：关系状态（亲密度/安全感/想念/吃醋/疲惫/欲言又止）驱动回复长短、延迟、心声三层、主动消息；作息含上课/洗澡/睡觉/出门/emo/忙完想你。点聊天头像可见心声与六条关系条

---

## 2026-08-24

### 一、语音克隆（MiMo TTS）修复
- `mimoSpeak` 按官方文档修正：
  - `messages` 固定顺序 `user` 在前（可为空）+ `assistant` 在后承载合成文本
  - 输出格式改为 `wav`（官方仅支持 wav / pcm16，原 mp3 非法）
  - 鉴权同时带 `Authorization: Bearer` 与 `api-key` 两个头；401/403 给中文提示
- 克隆样本存储从 `localStorage`（约 5MB 配额，会爆）迁移到 **IndexedDB**：
  - 角色数据只留轻量标记 `c.ttsClone = {name, size}`，音频本体存进数据库
  - 新增 `_cloneDbSet / _cloneDbGet / _cloneDbDel`
  - `mimoSpeak` 自动从 IndexedDB 取样本；样本丢失时明确报错
- `testTtsConnection` 的 MiMo 分支同步修正（用默认音色、wav、双鉴权头）

### 二、模型预设更新
- MiniMax：新增 `speech-2.8-hd / -turbo`、`speech-2.6-hd / -turbo`
- ElevenLabs：新增 `eleven_v3_conversational`、`eleven_flash_v2_5`

### 三、聊天设置新增
- 声音风格指令 `setCharTtsStyle`（一句话导演语气，随 user 消息下发）
- 克隆稳定度滑杆 `setCharTtsTemp`（0.1 稳 ~ 1.2 灵动，联动 temperature / top_p）
- 语种跟随：聊天设置选了非中文输出语种时，自动追加「全程用 X 语发音」

### 四、界面（apps.js / style.css）
- 小米密钥框改为：仅当存在启用克隆的角色时才显示
- 删除多余说明文字
- 克隆按钮重做为「虚线上传框 + 试听/清除胶囊」；稳定度滑杆换暖色系

### 五、音视频转克隆样本（已回退，见第八节）
- 曾新增 `MP4 / WebM / M4A` 上传 → 提取音轨 → 单声道 → 24kHz 重采样 → WAV 的纯前端转换（含 `<video>+MediaRecorder` 兜底、以及 ffmpeg.wasm 兜底）
- 实测手机端转换不稳定（部分 mp4 音轨浏览器解不出 / 转码失败），已整体移除，克隆恢复为仅支持 mp3 / wav 音频

### 六、本期文件版本（index.html 引用后缀）
- `js/tts.js` → `?v=20260824m`
- `js/apps.js` → `?v=20260824e`
- `css/style.css` → `?v=20260824b`

### 七、待办 / 未决
- **后台推送 + 手环（荣耀）**：规划 Capacitor 打包 APK + 前台服务 + WebSocket，服务器侧加「角色代笔」定时任务（替角色调 LLM 生成主动消息并推送）
- blockers：① 需一台 7×24 常驻服务器（VPS / 旧电脑）② 需 GitHub 账号走 Actions 自动打包 ③ 主动消息触发策略未定
- **MP4 转换（客户端）已取消**：经实测手机端转换不可靠，已移除 mp4/webm/m4a 上传与全部前端转码兜底代码，克隆音色仅接受 mp3 / wav 音频（见第八节）；后改为**服务端 ffmpeg 转码**重新支持（见第九节）

### 八、回退：克隆恢复为纯音频（mp3 / wav）
- 删除所有「视频 / 容器 → 音频」转码代码：移除 `_readAb`、`_encodeWav`、`_decodeOnce`、`_mediaElementDecode`、`_fileToWavDataUrl` 及 ffmpeg.wasm 兜底（`_getFFmpeg` / `_fileToWavViaFfmpeg` / `_loadScript`）
- `uploadCloneVoice` 改为只接受 mp3 / wav：非音频直接提示「仅支持 mp3 / wav 音频，暂不支持视频（mp4 等）」并 return，不再走转换
- `index.html` 克隆上传框 `accept` 收敛为 `audio/*,.mp3,.wav,.m4a`，按钮文案改为「🎙 上传录音 · 仅支持 mp3 / wav」
- 原因：mp4 等容器在部分（尤其手机）浏览器音轨解码不稳定，转换失败率高，性价比低；克隆走 MiMo 官方要求的 mp3 / wav 最稳
- 本期文件版本：`js/tts.js` → `?v=20260824m`

### 九、MP4/WebM 经服务端转码重新支持克隆
- 把「视频转克隆样本」改走**服务端 ffmpeg 转码**：新增 `sever/server.js` 的 `POST /api/convert-audio`（原始文件 → ffmpeg 抽音轨 → 单声道 24kHz WAV → `data:audio/wav;base64` 返回），依赖 `ffmpeg-static`（`package.json` 新增，随 `npm install` 装静态二进制）；`GET /api/convert-audio` 供前端探测能力
- 前端 `uploadCloneVoice`：mp3/wav 走原直传；视频/其它容器上传到 `/api/convert-audio` 取回 wav 后照常存 IndexedDB；失败给明确提示（改用 mp3/wav 或确认后端已部署）
- `index.html`：`accept` 重新放开视频类型，按钮文案改回「🎙 上传录音或视频 · mp3 / wav / mp4 均可」
- 说明：视频转码需部署后端（`sever/server.js`）；纯静态打开（无后端）时视频上传会提示改用 mp3/wav，不影响音频直传
- 之所以能成：之前失败是手机浏览器解码 mp4 音轨不稳，现在解码/转码全在服务端，与客户端无关
- 本期文件版本：`js/tts.js` → `?v=20260824n`（server 端变更需重新部署 `sever/server.js`）
