# 开发日志 / Changelog

> 本文件记录「美乐地」(joss--main) 每次改动的明细，方便上传 GitHub 时回溯。
> 日期格式 YYYY-MM-DD。文件引用版本见各条末的 index.html 后缀（?v=）。

---

## 2026-08-25

### 语音消息功能增强
- **iOS/Safari 录音修复**：`startVoiceRecord` 用 `MediaRecorder.isTypeSupported` 探测浏览器支持的录制格式（webm/mp4/aac…），不再硬写 `audio/webm`（iPhone 上会录出空 blob）。
- **语音消息改存 IndexedDB**：音频本体不再塞进 localStorage（整个 state 共享约 5MB 配额，多录几条就爆），消息里只留 `storeId` 索引，渲染时 `hydrateVoiceMessages` 异步回填到 `<audio>`；IndexedDB 不可用时自动退回内联 `src`。
- **真·ASR 转写**：录音同时用 Web Speech API 实时转写（Chrome/安卓支持，iOS Safari 自动跳过不影响录音），说话内容作为气泡文字 + 喂给角色，让对方真正"听懂"再回应；转写为空时退回原占位话术。
- **长按体验优化**：① `voiceTouchStart` 加防重入（`touch+mouse` 双触发只算一次）；② 录音中上滑超过阈值标记取消，松手作废不发送。

### 本期文件版本
- `js/chat.js` → `?v=20260825a`

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
-  blockers：① 需一台 7×24 常驻服务器（VPS / 旧电脑）② 需 GitHub 账号走 Actions 自动打包 ③ 主动消息触发策略未定
- **MP4 转换（客户端）已取消**：经实测手机端转换不可靠，已移除 mp4/webm/m4a 上传与全部前端转码兜底代码，克隆音色仅接受 mp3 / wav 音频（见第八节）；后改为**服务端 ffmpeg 转码**重新支持（见第九节）

### 八、回退：克隆恢复为纯音频（mp3 / wav）
- 删除所有「视频 / 容器 → 音频」转码代码：移除 `_readAb`、`_encodeWav`、`_decodeOnce`、`_mediaElementDecode`、`_fileToWavDataUrl` 及 ffmpeg.wasm 兜底（`_getFFmpeg` / `_fileToWavViaFfmpeg` / `_loadScript`）
- `uploadCloneVoice` 改为只接受 mp3 / wav：非音频直接提示「仅支持 mp3 / wav 音频，暂不支持视频（mp4 等）」并 return，不再走转换
- `index.html` 克隆上传框 `accept` 收敛为 `audio/*,.mp3,.wav,.m4a`，按钮文案改为「🎙 上传录音 · 仅支持 mp3 / wav」
- 原因：mp4 等容器在部分（尤其手机）浏览器音轨解码不稳定，转换失败率高，性价比低；克隆走 MiMo 官方要求的 mp3 / wav 最稳
- 本期文件版本：`js/tts.js` → `?v=20260824m`

### 九、MP4/WebM 经服务端转码重新支持克隆
- 把"视频转克隆样本"改走**服务端 ffmpeg 转码**：新增 `sever/server.js` 的 `POST /api/convert-audio`（原始文件 → ffmpeg 抽音轨 → 单声道 24kHz WAV → `data:audio/wav;base64` 返回），依赖 `ffmpeg-static`（`package.json` 新增，随 `npm install` 装静态二进制）；`GET /api/convert-audio` 供前端探测能力
- 前端 `uploadCloneVoice`：mp3/wav 走原直传；视频/其它容器上传到 `/api/convert-audio` 取回 wav 后照常存 IndexedDB；失败给明确提示（改用 mp3/wav 或确认后端已部署）
- `index.html`：`accept` 重新放开视频类型，按钮文案改回「🎙 上传录音或视频 · mp3 / wav / mp4 均可」
- 说明：视频转码需部署后端（`sever/server.js`）；纯静态打开（无后端）时视频上传会提示改用 mp3/wav，不影响音频直传
- 之所以能成：之前失败是手机浏览器解码 mp4 音轨不稳，现在解码/转码全在服务端，与客户端无关
- 本期文件版本：`js/tts.js` → `?v=20260824n`（server 端变更需重新部署 `sever/server.js`）
