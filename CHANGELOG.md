# 开发日志 / Changelog

> 本文件记录「美乐地」(joss--main) 每次改动的明细，方便上传 GitHub 时回溯。
> 日期格式 YYYY-MM-DD。文件引用版本见各条末的 index.html 后缀（?v=）。

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

### 五、音视频转克隆样本（新功能，纯前端）
- 新增 `MP4 / WebM / M4A` 上传 → 提取音轨 → 单声道 → 24kHz 重采样 → WAV
- 关键函数：`_readAb`、`_encodeWav`、`_decodeOnce`、`_mediaElementDecode`、`_fileToWavDataUrl`
- 加固过程（同一天连修三版）：
  - 90 秒解码超时，防止坏文件卡死
  - 修复重试时对已 `detached` 的 ArrayBuffer 操作崩溃（每次传全新副本）
  - 移动端兜底：先 `resume()` 唤醒上下文；仍失败则 `<video> 播放 + MediaRecorder` 重编码
- 已知限制：手机浏览器解码器比桌面严格，部分 MP4 音轨（如 AC3/DTS）前端解不出，需先导出 mp3

### 六、本期文件版本（index.html 引用后缀）
- `js/tts.js` → `?v=20260824l`
- `js/apps.js` → `?v=20260824e`
- `css/style.css` → `?v=20260824b`

### 七、待办 / 未决
- **后台推送 + 手环（荣耀）**：规划 Capacitor 打包 APK + 前台服务 + WebSocket，服务器侧加「角色代笔」定时任务（替角色调 LLM 生成主动消息并推送）
-  blockers：① 需一台 7×24 常驻服务器（VPS / 旧电脑）② 需 GitHub 账号走 Actions 自动打包 ③ 主动消息触发策略未定
- **MP4 转换仍待用户回执**：手机端报「解不出音轨」，PC 正常；已加降级链与完整诊断提示，等用户回红字病历 + 手机浏览器类型
