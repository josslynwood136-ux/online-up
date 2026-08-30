// ============================================================
// webrtc.js - WebRTC 语音通话 + SFU 信令 + ASR+TTS 闭环
// ============================================================

let webrtcPeer = null;
let webrtcDataChannel = null;
let webrtcStream = null;
let webrtcCallActive = false;
let webrtcCallType = 'audio';
let webrtcSignalTimer = null;
let webrtcIceCandidates = [];
let webrtcASR = null;
let webrtcASRInterim = '';
let webrtcMicStream = null;
let webrtcCallStartTime = 0;
let webrtcCallInterval = null;
let webrtcServerUrl = '';
let webrtcRetryCount = 0;
const MAX_WEBRTC_RETRIES = 3;

// ===== 通话 UI =====
function startCall(type) {
  webrtcCallType = type || 'audio';
  webrtcCallActive = true;
  webrtcCallStartTime = Date.now();
  renderCallUI();
  initWebRTC();
  startCallTimer();
  startMic();
  if (webrtcCallType === 'audio') {
    startASR();
  }
}

function endCall() {
  webrtcCallActive = false;
  if (webrtcCallInterval) { clearInterval(webrtcCallInterval); webrtcCallInterval = null; }
  stopMic();
  stopASR();
  if (webrtcDataChannel) { try { webrtcDataChannel.close(); } catch(e) {} webrtcDataChannel = null; }
  if (webrtcStream) { webrtcStream.getTracks().forEach(function(t) { t.stop(); }); webrtcStream = null; }
  if (webrtcPeer) { try { webrtcPeer.close(); } catch(e) {} webrtcPeer = null; }
  if (webrtcSignalTimer) { clearInterval(webrtcSignalTimer); webrtcSignalTimer = null; }
  webrtcCallStartTime = 0;
  webrtcRetryCount = 0;
  const callUI = $('callUI');
  if (callUI) callUI.style.display = 'none';
  closeChat();
}

function renderCallUI() {
  let ui = $('callUI');
  if (!ui) {
    ui = document.createElement('div');
    ui.id = 'callUI';
    ui.className = 'call-ui';
    ui.innerHTML = `
      <div class="call-overlay" onclick="if(confirm('确定结束通话？'))endCall()"></div>
      <div class="call-sheet">
        <div class="call-header">
          <div class="call-avatar">${renderAvatar((activeCharacter() || {}).avatar, (activeCharacter() || {}).name)}</div>
          <div class="call-name">${escapeHTML((activeCharacter() || {}).name || '角色')}</div>
          <div class="call-status" id="callStatus">连接中…</div>
        </div>
        <div class="call-timer" id="callTimer">00:00</div>
        <div class="call-controls">
          <button class="call-btn" id="callMicBtn" onclick="toggleCallMute()" title="静音">🎙</button>
          <button class="call-btn call-end" onclick="endCall()">📵</button>
          <button class="call-btn" id="callSpeakerBtn" onclick="toggleCallSpeaker()" title="扬声器">🔊</button>
          ${webrtcCallType === 'audio' ? '<button class="call-btn" onclick="toggleASR()" title="语音转文字">📝</button>' : ''}
        </div>
        <div class="call-asr" id="callASR" style="display:none">
          <div class="call-asr-text" id="callASRText"></div>
        </div>
        <div class="call-info">
          <span id="callDuration">00:00</span>
          <span id="callBitrate"></span>
        </div>
      </div>
    `;
    document.body.appendChild(ui);
  }
  ui.style.display = 'flex';
  updateCallStatus('连接中…');
}

function updateCallStatus(text) {
  const el = $('callStatus');
  if (el) el.textContent = text;
}

function startCallTimer() {
  webrtcCallInterval = setInterval(function() {
    if (!webrtcCallActive) return;
    const elapsed = Math.floor((Date.now() - webrtcCallStartTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    const timer = $('callTimer');
    const dur = $('callDuration');
    if (timer) timer.textContent = min + ':' + sec;
    if (dur) dur.textContent = min + ':' + sec;
  }, 1000);
}

// ===== WebRTC 信令 =====
function initWebRTC() {
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:turn.twilink.cn:3478', username: 'twilink', credential: 'twilink2024' }
    ]
  };
  webrtcPeer = new RTCPeerConnection(config);

  webrtcPeer.onicecandidate = function(event) {
    if (event.candidate) {
      sendSignal({ type: 'ice', candidate: event.candidate.toJSON() });
    }
  };

  webrtcPeer.oniceconnectionstatechange = function() {
    const state = webrtcPeer ? webrtcPeer.iceConnectionState : 'unknown';
    updateCallStatus(state === 'connected' ? '✅ 已连接' : state);
    if (state === 'connected') {
      webrtcRetryCount = 0;
      const bitrateEl = $('callBitrate');
      if (bitrateEl) bitrateEl.textContent = '📶';
    }
    if (state === 'failed' && webrtcRetryCount < MAX_WEBRTC_RETRIES) {
      webrtcRetryCount++;
      restartICE();
    }
  };

  webrtcPeer.ontrack = function(event) {
    updateCallStatus('🔊 远程音频已接通');
  };

  webrtcPeer.onnegotiationneeded = async function() {
    try {
      const offer = await webrtcPeer.createOffer();
      await webrtcPeer.setLocalDescription(offer);
      sendSignal({ type: 'offer', sdp: offer.sdp });
    } catch(e) {
      updateCallStatus('⚠️ 协商失败');
    }
  };

  // 添加本地音频/视频流
  if (webrtcStream) {
    webrtcStream.getTracks().forEach(function(t) { webrtcPeer.addTrack(t, webrtcStream); });
  }

  // 连接到信令服务器
  connectSignalServer();
}

function connectSignalServer() {
  if (webrtcSignalTimer) clearInterval(webrtcSignalTimer);
  // 使用 Server-Sent Events 方式轮询信令，或使用 WebSocket
  const serverUrl = webrtcServerUrl || '/api/webrtc/signal';
  webrtcSignalTimer = setInterval(function() {
    if (!webrtcCallActive) return;
    fetchSignalMessages().then(function(messages) {
      messages.forEach(processSignal);
    }).catch(function() {});
  }, 2000);
}

async function fetchSignalMessages() {
  try {
    const res = await fetch('/api/webrtc/signal?charId=' + (activeCharacter() ? activeCharacter().id : ''), {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return [];
    return await res.json();
  } catch(e) { return []; }
}

function sendSignal(msg) {
  fetch('/api/webrtc/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: state.activeRoleId,
      to: msg.to || 'all',
      type: msg.type,
      sdp: msg.sdp,
      candidate: msg.candidate,
      ts: Date.now()
    })
  }).catch(function() {});
}

function processSignal(msg) {
  if (!webrtcPeer || !webrtcCallActive) return;
  if (msg.from === state.activeRoleId) return;
  if (msg.type === 'offer') {
    webrtcPeer.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }))
      .then(function() { return webrtcPeer.createAnswer(); })
      .then(function(answer) { return webrtcPeer.setLocalDescription(answer); })
      .then(function() { sendSignal({ type: 'answer', sdp: webrtcPeer.localDescription.sdp }); })
      .catch(function() {});
  } else if (msg.type === 'answer') {
    webrtcPeer.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }))
      .catch(function() {});
  } else if (msg.type === 'ice' && msg.candidate) {
    webrtcPeer.addIceCandidate(new RTCIceCandidate(msg.candidate))
      .catch(function() {});
  }
}

function restartICE() {
  if (!webrtcPeer) return;
  try {
    const transceivers = webrtcPeer.getTransceivers();
    transceivers.forEach(function(t) {
      if (t.sender && t.sender.track) {
        t.sender.setStreams(webrtcStream || new MediaStream());
      }
    });
    webrtcPeer.restartIce();
    updateCallStatus('🔄 重连中…');
  } catch(e) {}
}

// ===== 麦克风 =====
async function startMic() {
  try {
    webrtcMicStream = await navigator.mediaDevices.getUserMedia({
      audio: webrtcCallType === 'audio',
      video: webrtcCallType === 'video'
    });
    webrtcStream = webrtcMicStream;
    if (webrtcPeer) {
      webrtcStream.getTracks().forEach(function(t) { webrtcPeer.addTrack(t, webrtcStream); });
    }
    updateCallStatus('🎙 麦克风已开启');
  } catch(e) {
    updateCallStatus('⚠️ 麦克风权限被拒绝');
  }
}

function stopMic() {
  if (webrtcMicStream) {
    webrtcMicStream.getTracks().forEach(function(t) { t.stop(); });
    webrtcMicStream = null;
  }
}

function toggleCallMute() {
  if (!webrtcStream) return;
  const audioTracks = webrtcStream.getAudioTracks();
  audioTracks.forEach(function(t) { t.enabled = !t.enabled; });
  const btn = $('callMicBtn');
  if (btn) btn.textContent = audioTracks[0] && audioTracks[0].enabled ? '🎙' : '🔇';
}

function toggleCallSpeaker() {
  const btn = $('callSpeakerBtn');
  const current = btn ? btn.textContent : '🔊';
  btn.textContent = current === '🔊' ? '🔇' : '🔊';
}

// ===== ASR (语音识别) =====
function startASR() {
  var R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) return;
  try {
    webrtcASR = new R();
    webrtcASR.lang = 'zh-CN';
    webrtcASR.continuous = true;
    webrtcASR.interimResults = true;
    webrtcASR.onresult = function(e) {
      webrtcASRInterim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var tr = e.results[i];
        if (tr.isFinal) webrtcASRInterim += tr[0].transcript;
        else webrtcASRInterim = tr[0].transcript;
      }
      const el = $('callASRText');
      if (el) el.textContent = webrtcASRInterim || '正在识别…';
    };
    webrtcASR.onerror = function() {};
    webrtcASR.onend = function() {
      if (webrtcCallActive && webrtcCallType === 'audio') {
        try { webrtcASR.start(); } catch(x) {}
      }
    };
    webrtcASR.start();
  } catch(e) {}
}

function stopASR() {
  if (webrtcASR) { try { webrtcASR.stop(); } catch(e) {} webrtcASR = null; }
}

function toggleASR() {
  const asrPanel = $('callASR');
  if (!asrPanel) return;
  const show = asrPanel.style.display !== 'block';
  asrPanel.style.display = show ? 'block' : 'none';
  if (show && !webrtcASR) startASR();
}

// ===== TTS 播放 =====
function speakDuringCall(text) {
  if (!state.settings || !state.settings.ttsProvider) return;
  if (typeof speakText === 'function') {
    speakText(text, null, null, true);
  }
}

// ===== 通话中 ASR+TTS 闭环 =====
async function voiceCallLoop() {
  if (!webrtcCallActive || !webrtcASRInterim.trim()) return;
  const text = webrtcASRInterim.trim();
  webrtcASRInterim = '';
  const cfg = resolveApiConfig(true);
  if (!cfg.key || !cfg.url || !cfg.model) return;
  try {
    const res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: '你正在与用户进行语音通话。请用简短回复（10-30字）。' },
          { role: 'user', content: text }
        ],
        max_tokens: 60,
        temperature: 0.8
      })
    });
    if (!res.ok) return;
    const data = await res.json().catch(function() { return {}; });
    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    if (reply) {
      appendBubble('assistant', reply);
      speakDuringCall(reply);
    }
  } catch(e) {}
}

// ===== 通话按钮绑定 =====
(function bindCallBtns() {
  const audioBtn = document.querySelector('[onclick="startCall(\'audio\')"]');
  const videoBtn = document.querySelector('[onclick="startCall(\'video\')"]');
  if (audioBtn) audioBtn.addEventListener('click', function() { startCall('audio'); });
  if (videoBtn) videoBtn.addEventListener('click', function() { startCall('video'); });
})();

// ===== 语音通话 ASR+TTS 闭环轮询 =====
setInterval(function() {
  if (!webrtcCallActive || webrtcCallType !== 'audio') return;
  if (webrtcASRInterim && webrtcASRInterim.length > 3) {
    voiceCallLoop();
  }
}, 3000);

window.startCall = startCall;
window.endCall = endCall;
window.toggleCallMute = toggleCallMute;
window.toggleCallSpeaker = toggleCallSpeaker;
window.toggleASR = toggleASR;
window.voiceCallLoop = voiceCallLoop;