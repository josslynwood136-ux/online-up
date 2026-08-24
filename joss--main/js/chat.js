// ============================================================
// chat.js - 聊天窗口 + AI 对话
// ============================================================
let chatTyping = false;
let pendingReply = false;
let pendingQuote = null;
let activeAbort = null;
let noteTimer = null;
let _manualAICall = false;
let lastThinkText = '';
let lastRetract = null;
let _idleProactiveTimer = null;

// 长按引用：在聊天体上监听滑动，一旦移动超过阈值就取消长按（避免误触/滚动触发）
(function bindChatLongPress() {
  var cb = document.getElementById('chatBody');
  if (cb && !cb._lpBound) {
    cb._lpBound = true;
    cb.addEventListener('touchmove', function (ev) { onMsgMove(ev); }, { passive: true });
    cb.addEventListener('touchend', function () { clearQuotePress(); }, { passive: true });
    cb.addEventListener('touchcancel', function () { clearQuotePress(); }, { passive: true });
  }
})();

// ===== 消息弹窗 =====
function showMsgNote(charId, name, avatar, text) {
  var exist = document.getElementById('msgNote');
  if (exist) { clearTimeout(noteTimer); exist.remove(); noteTimer = null; }
  var n = document.createElement('div');
  n.id = 'msgNote';
  n.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;background:#fdfaf6;border-radius:14px;padding:8px 14px 8px 10px;display:flex;align-items:center;gap:9px;box-shadow:0 6px 20px rgba(120,100,80,.12),0 0 0 1px rgba(200,185,165,.15);max-width:250px;width:auto;cursor:pointer;animation:msgNoteIn .3s ease';
  n.onclick = function() { this.remove(); clearTimeout(noteTimer); noteTimer = null; openChat(charId); };
  n.innerHTML = '<div style="width:22px;height:22px;border-radius:50%;overflow:hidden;flex-shrink:0;background:#ede4d8;font-size:12px;display:flex;align-items:center;justify-content:center">' + renderAvatar(avatar, name).replace('<img', '<img style="width:100%;height:100%;object-fit:cover"') + '</div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:#5a5045">' + escapeHTML(name) + '</div><div style="font-size:11px;color:#a09588;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px">' + escapeHTML(text || '发来一条消息') + '</div></div><div style="font-size:8px;color:#c8b8a8;flex-shrink:0;align-self:flex-start;margin-top:2px">now</div>';
  document.body.appendChild(n);
  noteTimer = setTimeout(function() { var el = document.getElementById('msgNote'); if (el) el.remove(); noteTimer = null; }, 4000);
}
// ===== 聊天窗口 =====
function openChat(characterId, skin) {
  if (characterId) {
    state.activeRoleId = characterId;
    const char = getCharacter(characterId);
    char.unread = 0;
    char.read = true;
    // 兼容老存档：没有 status 的旧消息，若其后已有对方回复，则补标已读
    const chat = char.chat || [];
    let seenReply = false;
    for (let i = chat.length - 1; i >= 0; i--) {
      const m = chat[i];
      if (m.role === 'assistant' || m.role === 'system') { seenReply = true; continue; }
      if (m.role === 'user') {
        if (!m.status) m.status = seenReply ? 'read' : 'sent';
        if (m.status === 'sent' && seenReply) m.status = 'read';
      }
    }
  }
  saveState();
  pendingReply = false;
  _manualAICall = false;
  $('sendBtn').style.display = '';
  var ob = $('aiBtn');
  if (ob) ob.remove();
  $('chatWindow').classList.add('open');
  $('chatWindow').classList.toggle('comic-skin', skin === 'comic');
  renderChat();
}

function closeChat() {
  pendingReply = false;
  _manualAICall = false;
  exitMultiSelect();
  $('sendBtn').style.display = '';
  var ob = $('aiBtn');
  if (ob) ob.remove();
  $('chatWindow').classList.remove('open');
  $('chatWindow').classList.remove('comic-skin');
  hidePanels();
}

// ===== 多选删除 =====
let _multiSelect = false;
let _selectedMsgs = {};
let _multiAnchor = -1;
let _selBlock = null;
let _previewMsgs = {};
let _lastScrollTop = -1;
let _scrollDir = 1;
const SEL_LINE_RATIO = 0.45;

function msgCheck(isUser, i) {
  if (!_multiSelect) return '';
  const on = !!_selectedMsgs[i];
  return `<span class="msg-check ${isUser ? 'right' : 'left'}${on ? ' on' : ''}" data-idx="${i}"></span>`;
}
function multiCls(i) {
  if (!_multiSelect) return '';
  return ' multi-mode' + (_selectedMsgs[i] ? ' msg-selected' : '');
}
function onMsgDown(ev, index) {
  if (_multiSelect) return;
  if (ev.target && ev.target.closest && ev.target.closest('.voice-avatar')) return;
  var c = activeCharacter();
  var m = c && c.chat && c.chat[index];
  if (!m || m.role === 'system') return;
  _pressEl = ev.currentTarget;
  if (_pressEl && _pressEl.classList) _pressEl.classList.add('pressing');
  quotePress(ev, ev.currentTarget, index);
}
function onMsgMove(ev) {
  if (!_quotePressTimer) return;
  var dx = Math.abs((ev.clientX || 0) - _quoteStartX);
  var dy = Math.abs((ev.clientY || 0) - _quoteStartY);
  if (dx > 10 || dy > 10) clearQuotePress();
}
function onMsgTap(ev, index) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  if (_multiSelect) { toggleMsgSelect(index); return; }
  clearQuotePress();
}
function enterMultiSelect(anchorIndex) {
  _multiSelect = true;
  _selectedMsgs = {};
  _multiAnchor = (typeof anchorIndex === 'number' && anchorIndex >= 0) ? anchorIndex : -1;
  _selBlock = null;
  _previewMsgs = {};
  _lastScrollTop = -1;
  _scrollDir = 1;
  var h = document.querySelector('#chatWindow .chat-header');
  var f = document.querySelector('#chatWindow .chat-footer');
  if (h) h.style.display = 'none';
  if (f) f.style.display = 'none';
  var bar = $('multiBar');
  if (bar) bar.style.display = 'flex';
  showSelectHereUI();
  updateMultiCount();
  renderChat();
}
function exitMultiSelect() {
  var wasActive = _multiSelect;
  _multiSelect = false;
  _selectedMsgs = {};
  _multiAnchor = -1;
  _selBlock = null;
  _previewMsgs = {};
  var h = document.querySelector('#chatWindow .chat-header');
  var f = document.querySelector('#chatWindow .chat-footer');
  if (h) h.style.display = '';
  if (f) f.style.display = '';
  var bar = $('multiBar');
  if (bar) bar.style.display = 'none';
  hideSelectHereUI();
  if (wasActive) renderChat();
}
function toggleMsgSelect(index) {
  const char = activeCharacter();
  const msg = char && char.chat[index];
  if (!msg) return;
  _selBlock = null;
  var count = Object.keys(_selectedMsgs).length;
  if (count === 0) {
    _multiAnchor = index;
    _selectedMsgs[index] = true;
  } else if (count === 1 && _multiAnchor === index) {
    delete _selectedMsgs[index];
    _multiAnchor = -1;
  } else {
    selectRange(Math.min(_multiAnchor, index), Math.max(_multiAnchor, index));
  }
  updateMultiCount();
  renderSelectionVisual();
  updatePreview();
  renderPreviewVisual();
}
function selectRange(from, to) {
  const char = activeCharacter();
  _selectedMsgs = {};
  for (var i = from; i <= to; i++) {
    const m = char && char.chat[i];
    if (m) _selectedMsgs[i] = true;
  }
}
function renderSelectionVisual() {
  document.querySelectorAll('#chatBody .msg[data-idx]').forEach(function(el) {
    var idx = parseInt(el.getAttribute('data-idx'), 10);
    var on = !!_selectedMsgs[idx];
    el.classList.toggle('msg-selected', on);
    var chk = el.querySelector('.msg-check');
    if (chk) chk.classList.toggle('on', on);
  });
}
function updateMultiCount() {
  var n = Object.keys(_selectedMsgs).length;
  var c = $('multiCount');
  if (c) {
    c.textContent = n === 1 ? '已选 1 条 · 再点一条可选中到此处' : '已选 ' + n + ' 条';
  }
  var del = $('multiDeleteBtn');
  if (del) del.classList.toggle('can-del', n > 0);
}
function selectAllMsgs() {
  const char = activeCharacter();
  const idxs = (char.chat || []).map(function(m, i) { return { m: m, i: i }; }).filter(function(x) { return x.m; });
  if (!idxs.length) return;
  const allSelected = idxs.every(function(x) { return _selectedMsgs[x.i]; });
  if (allSelected) {
    _selectedMsgs = {};
    _multiAnchor = -1;
  } else {
    idxs.forEach(function(x) { _selectedMsgs[x.i] = true; });
    _multiAnchor = idxs[0].i;
  }
  _selBlock = null;
  _previewMsgs = {};
  renderSelectionVisual();
  updateMultiCount();
  updatePreview();
  renderPreviewVisual();
}
async function deleteSelected() {
  const char = activeCharacter();
  const idxs = Object.keys(_selectedMsgs).map(Number).sort(function(a, b) { return b - a; });
  if (!idxs.length) return;
  if (!await uiConfirm('确定删除选中的 ' + idxs.length + ' 条消息吗？删除后无法恢复。')) return;
  idxs.forEach(function(i) {
    if (char.chat[i]) char.chat.splice(i, 1);
    if (i > 0 && char.chat[i - 1] && char.chat[i - 1].type === 'think' && !_selectedMsgs[i - 1]) {
      char.chat.splice(i - 1, 1);
    }
  });
  saveState();
  exitMultiSelect();
}

// ===== 选到这里（划线滑选） =====
function showSelectHereUI() {
  var line = $('selectHereLine');
  var btn = $('selectHereBtn');
  if (line) line.style.display = 'block';
  if (btn) btn.style.display = 'inline-flex';
  var body = $('chatBody');
  if (body && !body.dataset.multiScr) {
    body.dataset.multiScr = '1';
    body.addEventListener('scroll', onMultiScroll, { passive: true });
  }
  updatePreview();
  renderPreviewVisual();
}
function hideSelectHereUI() {
  var line = $('selectHereLine');
  var btn = $('selectHereBtn');
  if (line) line.style.display = 'none';
  if (btn) btn.style.display = 'none';
  var body = $('chatBody');
  if (body && body.dataset.multiScr) {
    body.removeEventListener('scroll', onMultiScroll);
    delete body.dataset.multiScr;
  }
  clearPreview();
}
function clearPreview() {
  _previewMsgs = {};
  document.querySelectorAll('#chatBody .msg.msg-preview').forEach(function(el) { el.classList.remove('msg-preview'); });
}
function onMultiScroll() {
  if (!_multiSelect) return;
  var body = $('chatBody');
  if (!body) return;
  var st = body.scrollTop;
  _scrollDir = st >= _lastScrollTop ? 1 : -1;
  _lastScrollTop = st;
  updatePreview();
  renderPreviewVisual();
}
function getCutIndex() {
  var w = $('chatWindow');
  var body = $('chatBody');
  if (!w || !body) return -1;
  var wr = w.getBoundingClientRect();
  var lineY = wr.top + wr.height * SEL_LINE_RATIO;
  var msgs = body.querySelectorAll('.msg[data-idx]');
  var best = -1, bestD = Infinity;
  for (var i = 0; i < msgs.length; i++) {
    var el = msgs[i];
    var idx = parseInt(el.getAttribute('data-idx'), 10);
    var r = el.getBoundingClientRect();
    var cy = r.top + r.height / 2;
    var d = Math.abs(cy - lineY);
    if (d < bestD) { bestD = d; best = idx; }
  }
  return best;
}
function previewRange() {
  var cut = getCutIndex();
  var anchor = _multiAnchor;
  if (cut < 0 || anchor < 0) return null;
  return { from: Math.min(cut, anchor), to: Math.max(cut, anchor) };
}
function updatePreview() {
  var btn = $('selectHereBtn'), cnt = $('selectHereCount');
  if (!btn) return;
  _previewMsgs = {};
  if (_multiSelect && _multiAnchor >= 0) {
    var range = previewRange();
    if (range) {
      for (var i = range.from; i <= range.to; i++) {
        var m = activeCharacter() && activeCharacter().chat[i];
        if (m) _previewMsgs[i] = true;
      }
      var n = 0;
      for (var i = range.from; i <= range.to; i++) if (!_selectedMsgs[i]) n++;
      btn.classList.add('active');
      if (cnt) {
        cnt.textContent = n > 0 ? '+' + n : '✓';
        cnt.classList.toggle('sph-ok', n === 0);
      }
    } else {
      btn.classList.remove('active');
      if (cnt) { cnt.textContent = ''; cnt.classList.remove('sph-ok'); }
    }
  } else {
    btn.classList.remove('active');
    if (cnt) { cnt.textContent = ''; cnt.classList.remove('sph-ok'); }
  }
}
function renderPreviewVisual() {
  document.querySelectorAll('#chatBody .msg[data-idx]').forEach(function(el) {
    var idx = parseInt(el.getAttribute('data-idx'), 10);
    var on = !!_previewMsgs[idx] && !_selectedMsgs[idx];
    el.classList.toggle('msg-preview', on);
  });
}
function selectHereTo() {
  if (!_multiSelect) return;
  var range = previewRange();
  if (!range) return;
  var char = activeCharacter();
  var sel = {};
  for (var i = range.from; i <= range.to; i++) {
    if (char && char.chat[i]) sel[i] = true;
  }
  _selectedMsgs = sel;
  _selBlock = { from: range.from, to: range.to };
  _previewMsgs = {};
  updateMultiCount();
  renderSelectionVisual();
  updatePreview();
  renderPreviewVisual();
}

function renderChat() {
  const char = activeCharacter();
  $('chatName').innerText = char.name;
  const relEl = $('chatRel');
  if (relEl) relEl.innerText = char.relation ? '· ' + char.relation : (char.online ? '· 在线' : '· 离线');
  const typing = chatTyping ? `<div class="msg left"><div class="avatar">${renderAvatar(char.avatar, char.name)}</div><div class="bubble typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>` : '';
  let lastDate = '';
  $('chatBody').innerHTML = (char.chat || []).map((msg, i) => {
    const isUser = msg.role === 'user';
    const msgDate = msg.time ? msg.time.slice(0, 10) : '';
    const divider = (msgDate && msgDate !== lastDate) ? `<div class="time-divider">${msgDate}</div>` : '';
    lastDate = msgDate || lastDate;
    var msgTime = '';
    try {
      const _d = new Date(msg.time);
      if (!isNaN(_d.getTime())) msgTime = String(_d.getHours()).padStart(2, '0') + ':' + String(_d.getMinutes()).padStart(2, '0');
    } catch (e) {}
    const timeStamp = (msg.role !== 'system' && msgTime) ? `<div class="msg-time">${msgTime}</div>` : '';
    const avCol = (avHtmlInner) => `<span class="msg-avcol">${avHtmlInner}${timeStamp}</span>`;
    if (msg.role === 'system') {
      if (msg.type === 'think') {
        const open = !msg.collapsed;
        return `${divider}<div class="msg system${multiCls(i)}" data-idx="${i}" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})" onclick="onMsgTap(event,${i})">
          <div class="bubble system" style="cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px" onclick="event.stopPropagation();toggleThink(${i})">
            <span style="display:inline-block;transition:transform .15s;transform:rotate(${open ? 90 : 0}deg)">▸</span> 💭 思考过程${open ? '' : '（点开看）'}
          </div>
          ${open ? `<div class="bubble system" style="white-space:pre-wrap;word-break:break-word;opacity:.85;margin-top:5px">${escapeHTML(msg.content)}</div>` : ''}
        </div>`;
      }
      return `${divider}<div class="msg system${multiCls(i)}" data-idx="${i}" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})" onclick="onMsgTap(event,${i})">${msgCheck(false, i)}<div class="bubble system">${escapeHTML(msg.content)}</div></div>`;
    }
    const prof = activeProfile();
    const av = isUser ? prof.avatar : char.avatar;
    const nm = isUser ? prof.name : char.name;
    if (msg.type === 'retract') {
      const retractTxt = msg.content || '撤回了一条消息';
      return `${divider}<div class="msg system${multiCls(i)}" data-idx="${i}" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})" onclick="onMsgTap(event,${i})">${msgCheck(false, i)}<div class="bubble system retract-bubble">${escapeHTML(nm)} ${escapeHTML(retractTxt)}</div>${timeStamp}</div>`;
    }
    if (msg.type === 'redpacket') {
      const opened = msg.opened;
      const amount = msg.amount || 0;
      const note = msg.note || '';
      const amtText = amount.toFixed(amount % 1 ? 2 : 0);
      const tick = isUser ? `<div class="read-tick">${msg.status === 'read' ? '已读' : '已发送'}</div>` : '';
      return `${divider}<div class="msg ${isUser ? 'right' : 'left'}${multiCls(i)}" data-idx="${i}" oncontextmenu="askDeleteMessage('${char.id}',${i})" onclick="onMsgTap(event,${i})" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})">${msgCheck(isUser, i)}${avCol(`<div class="avatar">${renderAvatar(av, nm)}</div>`)}<div class="rp-card ${opened ? 'rp-opened' : ''} rp-msg-${i}" ${!isUser && !opened ? `onclick="_multiSelect?onMsgTap(event,${i}):openRedPacket('${char.id}',${i})"` : ''}>
        <span class="rp-card-icon">🧧</span>
        <span class="rp-card-label">${isUser ? '你' : escapeHTML(nm)}</span>
        ${opened ? `<div class="rp-card-amount">¥ ${amtText}</div>` : `<div class="rp-card-btn">開</div>`}
        <div class="rp-card-note">${escapeHTML(note || '恭喜发财')}</div>
      </div>${tick}</div>`;
    }
    if (msg.type === 'sticker') {
      const stickerSrc = msg.media && msg.media.src ? msg.media.src : '';
      const tick = isUser ? `<div class="read-tick">${msg.status === 'read' ? '已读' : '已发送'}</div>` : '';
      return `${divider}<div class="msg ${isUser ? 'right' : 'left'}${multiCls(i)}" data-idx="${i}" onclick="onMsgTap(event,${i})" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})" oncontextmenu="return false;">${msgCheck(isUser, i)}${avCol(`<div class="avatar">${renderAvatar(av, nm)}</div>`)}${stickerSrc ? `<img src="${escapeHTML(stickerSrc)}" class="chat-sticker-img" alt="表情包" referrerpolicy="no-referrer" data-fb="${escapeHTML(msg.media.src || stickerSrc)}" onerror="stickerImgFallback(this)">` : ''}${tick}</div>`;
    }
    let mediaHtml = '';
    if (msg.media && msg.media.type === 'image') {
      mediaHtml = `<img src="${escapeHTML(msg.media.src)}" style="max-width:180px;border-radius:12px;display:block;margin-top:4px">`;
    } else if (msg.media && msg.media.type === 'audio') {
      mediaHtml = `<audio src="${escapeHTML(msg.media.src)}" controls style="max-width:200px;margin-top:4px"></audio>`;
    } else if (msg.media && msg.media.type === 'file') {
      mediaHtml = `<a href="${escapeHTML(msg.media.src)}" download="${escapeHTML(msg.media.name || 'file')}" style="display:inline-block;margin-top:4px;color:inherit;text-decoration:none"><div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.18);padding:8px 10px;border-radius:10px"><span style="font-size:22px">📄</span><span style="font-size:13px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(msg.media.name || '文件')}</span></div></a>`;
    }
    const textHtml = msg.content ? `<div>${escapeHTML(msg.content)}</div>` : '';
    var transHtml = '';
    if (!isUser && msg.translatedText) {
      transHtml = '<div style="margin-top:5px;padding-top:5px;border-top:1px solid rgba(0,0,0,.06);font-size:11px;color:#000">' + escapeHTML(msg.translatedText) + '</div>';
    }
    const quoteHtml = quoteBlock(msg.quote);
    const tick = isUser ? `<div class="read-tick">${msg.status === 'read' ? '已读' : '已发送'}</div>` : '';
    const avHtml = !isUser ? `<div class="avatar voice-avatar" onclick="event.stopPropagation();showInnerVoice('${char.id}')">${renderAvatar(av, nm)}</div>` : `<div class="avatar">${renderAvatar(av, nm)}</div>`;
    return `${divider}<div class="msg ${isUser ? 'right' : 'left'}${multiCls(i)}" data-idx="${i}" oncontextmenu="return false;" ontouchstart="onMsgDown(event,${i})" onmousedown="onMsgDown(event,${i})" onclick="onMsgTap(event,${i})">${msgCheck(isUser, i)}${avCol(avHtml)}<div class="bubble ${isUser ? 'right' : 'left'}">${quoteHtml}${textHtml}${mediaHtml}${transHtml}</div>${tick}</div>`;
  }).join('') + typing;
  if (!_multiSelect) $('chatBody').scrollTop = $('chatBody').scrollHeight;
  applyBubbleStyle();
  if (_multiSelect) {
    updatePreview();
    renderPreviewVisual();
  }
}

async function deleteMessage(charId, index, noConfirm) {
  const char = getCharacter(charId);
  if (!char.chat[index]) return;
  if (!noConfirm && !await uiConfirm('确定删除这条消息吗？删除后无法恢复。')) return;
  if (index > 0 && char.chat[index - 1] && char.chat[index - 1].type === 'think') {
    char.chat.splice(index - 1, 2);
  } else {
    char.chat.splice(index, 1);
  }
  saveState();
  renderChat();
}

function askDeleteMessage(charId, index) {
  if (_multiSelect) return;
  uiConfirm('删除这条消息？').then(function (ok) {
    if (ok) deleteMessage(charId, index, true);
  });
}

function quoteMessage(index) {
  const char = activeCharacter();
  const msg = char.chat[index];
  if (!msg || msg.role === 'system') return;
  pendingQuote = { index, role: msg.role, content: msg.content || '' };
  renderReplyBar();
}

function clearQuote() {
  pendingQuote = null;
  renderReplyBar();
}

function renderReplyBar() {
  const bar = $('replyBar');
  if (!bar) return;
  if (!pendingQuote) { bar.style.display = 'none'; return; }
  const char = activeCharacter();
  const prof = activeProfile();
  const isUser = pendingQuote.role === 'user';
  $('replyBarName').innerText = isUser ? prof.name : char.name;
  const src = pendingQuote.content || (pendingQuote.media ? '[图片]' : '');
  $('replyBarText').innerText = src.length > 40 ? src.slice(0, 40) + '…' : src;
  bar.style.display = 'flex';
  $('chatInput').focus();
}

function quoteBlock(quote) {
  if (!quote) return '';
  const name = quote.name || '';
  const text = quote.content || '';
  return `<div class="quote-block"><div class="quote-body"><div class="quote-name">${escapeHTML(name)}</div><div class="quote-text">${escapeHTML(text)}</div></div></div>`;
}

let _quotePressTimer = null;
let _quotePressIndex = -1;
let _quoteStartX = 0;
let _quoteStartY = 0;
let _pressEl = null;
function quotePress(ev, el, index) {
  if (ev.target && ev.target.closest && ev.target.closest('.voice-avatar')) return;
  _quotePressIndex = index;
  _quoteStartX = ev.clientX || 0;
  _quoteStartY = ev.clientY || 0;
  clearTimeout(_quotePressTimer);
  _quotePressTimer = setTimeout(function() { showQuoteMenu(index); }, 450);
}
function clearQuotePress() {
  clearTimeout(_quotePressTimer);
  _quotePressTimer = null;
  if (_pressEl) { _pressEl.classList.remove('pressing'); _pressEl = null; }
}
function showQuoteMenu(index) {
  clearQuotePress();
  if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) {} }
  const char = activeCharacter();
  const msg = char.chat[index];
  if (!msg || msg.role === 'system') return;
  const prof = activeProfile();
  const el = $('quoteMenu');
  if (!el) return;
  const isUser = msg.role === 'user';
  const name = isUser ? prof.name : char.name;
  const text = (msg.content || (msg.media ? '[图片]' : '')).slice(0, 60);
  el.querySelector('.q-cut-txt').textContent = name + '：' + text;
  el.querySelector('.q-reply').onclick = function() { hideQuoteMenu(); quoteMessage(index); };
  var qMulti = el.querySelector('.q-multi');
  if (qMulti) qMulti.onclick = function() { hideQuoteMenu(); enterMultiSelect(index); };
  el.querySelector('.q-del').onclick = function() { hideQuoteMenu(); deleteMessage(char.id, index); };
  el.style.display = 'block';
  // 定位到被长按的消息附近
  var msgEl = document.querySelector('#chatBody .msg[data-idx="' + index + '"]');
  var phone = document.querySelector('.phone');
  if (msgEl && phone) {
    var pr = phone.getBoundingClientRect();
    var mr = msgEl.getBoundingClientRect();
    var mw = el.offsetWidth, mh = el.offsetHeight;
    var cx = mr.left + mr.width / 2 - pr.left;
    var left = cx - mw / 2;
    left = Math.max(8, Math.min(left, pr.width - mw - 8));
    var top = mr.top - pr.top - mh - 10;
    if (top < 8) top = mr.bottom - pr.top + 10;
    if (top > pr.height - mh - 8) top = pr.height - mh - 8;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.bottom = 'auto';
    el.style.transformOrigin = (cx - left < mw / 2 ? 'left' : 'right') + ' top';
  }
  setTimeout(function() { el.classList.add('show'); }, 10);
  // 吞掉长按松手时浏览器补发的那次 click（仅第一次、且点在菜单外），避免误关；菜单内点击不受影响
  var sw = function(e) {
    if (el.contains(e.target)) return;
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    document.removeEventListener('click', sw, true);
  };
  document.addEventListener('click', sw, true);
  setTimeout(function() { document.removeEventListener('click', sw, true); }, 220);
}
function hideQuoteMenu() {
  const el = $('quoteMenu');
  if (el) { el.classList.remove('show'); el.style.display = 'none'; }
  clearQuotePress();
}
document.addEventListener('click', function(e) {
  const el = $('quoteMenu');
  if (!el || el.style.display === 'none') return;
  if (!el.contains(e.target)) hideQuoteMenu();
});

function setChatTyping(value) {
  chatTyping = value;
  if (value) {
    const char = activeCharacter();
    (char.chat || []).forEach(function(m) { if (m.role === 'user' && m.status === 'sent') m.status = 'read'; });
  }
  renderChat();
}

function appendBubble(role, content, media, translatedText, msgType, quote) {
  const msg = { role, content: content || '', time: new Date().toLocaleString(), ts: Date.now() };
  if (media) msg.media = media;
  if (translatedText) msg.translatedText = translatedText;
  if (msgType) msg.type = msgType;
  if (quote) msg.quote = quote;
  activeCharacter().chat.push(msg);
  if (role === 'assistant') {
    const char = activeCharacter();
    // 对方回复 → 把所有"已发送"的消息标记为已读
    (char.chat || []).forEach(function(m) { if (m.role === 'user' && m.status === 'sent') m.status = 'read'; });
    char.unread = (char.unread || 0) + 1;
    char.read = true;
    var cw = $('chatWindow');
    if (cw && !cw.classList.contains('open')) {
      showMsgNote(char.id, char.name, char.avatar, content || '发来一条消息');
    }
    // 网页在后台（未关闭）时，借 Service Worker 弹系统通知；页面关闭则由服务器 Web Push 送达
    if (typeof notifyCharacterMessage === 'function' && document.hidden) {
      notifyCharacterMessage(char.name, char.avatar, content || '发来一条消息', char.id);
    }
    char.memPending = (char.memPending || 0) + 1;
    var every = (char.autoMemEvery > 0) ? char.autoMemEvery : 1;
    if (char.memPending >= every) {
      char.memPending = 0;
      autoSaveMemory(char);
    }
  } else if (role === 'user') {
    msg.status = 'sent';
    msg._sentTick = true;
  }
  saveState();
  renderChat();
}

// ===== AI 对话 =====
function sendChat() {
  if (_voiceRec) stopVoice();
  if (_voiceMediaRecorder) stopVoiceRecord();
  const input = $('chatInput');
  const text = input.value.trim();
  if (!state.api.key || !state.api.url || !state.api.model) {
    alert('还没连上，先去设置里连接一下。');
    return;
  }
  hidePanels();
  if (text) {
    const char = activeCharacter();
    const prof = activeProfile();
    let quoteData = null;
    if (pendingQuote) {
      const qmsg = char.chat[pendingQuote.index];
      if (qmsg) {
        quoteData = {
          name: (pendingQuote.role === 'user' ? prof.name : char.name),
          role: qmsg.role,
          content: qmsg.content || ''
        };
      }
      pendingQuote = null;
      renderReplyBar();
    }
    appendBubble('user', text, null, null, null, quoteData);
    input.value = '';
    touchActiveChar();
    return;
  } else {
    const char = activeCharacter();
    if (typeof willowBlocksReplyFor === 'function' && willowBlocksReplyFor(char.id, char.name)) {
      appendBubble('system', '（许愿柳生效中：' + char.name + ' 今天不回复你的消息。）');
      return;
    }
    _manualAICall = true;
    setChatTyping(true);
    callAI('', false, true).then(async function(reply) {
      await deliverReply(reply || '我在。');
    }).catch(function(err) {
      if (err.name === 'AbortError') { setChatTyping(false); return; }
      setChatTyping(false);
      appendBubble('system', '暂时没回应（' + err.message + '）');
    });
  }
}

// 重新生成：删掉最后一条角色回复，用当时的用户问题重新生成一条
function regenerateReply() {
  var char = activeCharacter();
  if (!char) return;
  if (activeAbort) { try { activeAbort.abort(); } catch (e) {} }
  if (!state.api.key || !state.api.url || !state.api.model) { alert('还没连上，先去设置里连接一下。'); return; }
  // 找到最后一条角色回复
  var idx = -1, i;
  for (i = char.chat.length - 1; i >= 0; i--) { if (char.chat[i].role === 'assistant') { idx = i; break; } }
  if (idx < 0) { alert('没有可重新生成的回复'); return; }
  // 找到这条回复之前最近的一条用户消息
  var uidx = -1, j;
  for (j = idx - 1; j >= 0; j--) { if (char.chat[j].role === 'user') { uidx = j; break; } }
  if (uidx < 0) return;
  var userText = (char.chat[uidx].content || '').trim();
  if (!userText) return;
  // 只删最后这条角色回复，以及它前面紧邻的内心独白气泡；保留你发的用户消息
  var start = idx;
  while (start > 0 && char.chat[start - 1] && char.chat[start - 1].role === 'system' && char.chat[start - 1].type === 'think') start--;
  char.chat.splice(start);
  saveState();
  renderChat();
  _manualAICall = true;
  setChatTyping(true);
  callAI(userText, false, false).then(async function(reply) {
    await deliverReply(reply || '我在。');
  }).catch(function(err) {
    if (err && err.name === 'AbortError') { setChatTyping(false); return; }
    setChatTyping(false);
    appendBubble('system', '重新生成失败（' + (err && err.message || err) + '）');
  });
}
window.regenerateReply = regenerateReply;

// ===== ② 回复节奏真实化 =====
// 不秒回：先"输入中"一小会儿再发；撤回由角色性格判断（见 callAIThink / deliverReply）

function randomDelay() {
  var r = Math.random();
  if (r < 0.25) return 1200 + Math.random() * 1800;    // 快回
  if (r < 0.6) return 2000 + Math.random() * 3500;     // 正常
  if (r < 0.85) return 4000 + Math.random() * 5000;    // 慢
  return 8000 + Math.random() * 9000;                  // 隔很久，像去忙别的了
}

function flushThinkBubble(char) {
  if (!char || !lastThinkText) return;
  char.chat.push({ role: 'system', type: 'think', content: lastThinkText, collapsed: true, time: new Date().toLocaleString(), ts: Date.now() });
  lastThinkText = '';
}

async function deliverReply(reply) {
  var delay = randomDelay();
  await sleep(delay);
  if (_multiSelect) { setChatTyping(false); return; }
  // 撤回：仅按角色性格判断（lastRetract），不再随机兜底
  var doRetract = (lastRetract === true);
  lastRetract = null;
  if (doRetract) {
    var _c = activeCharacter();
    if (_c) {
      appendBubble('system', _c.name + ' 撤回了一条消息');
      setChatTyping(false);
      await sleep(800 + Math.random() * 1200);
      setChatTyping(true);
    }
  }
  const txt = reply || '……';
  const _c2 = activeCharacter();
  var trans = null;
  if (_c2.translate && _c2.lang && _c2.lang !== '中文') {
    var cleanText = txt.replace(/[（(][^）)]*[）)]/g, '').trim();
    if (cleanText) trans = await translateText(cleanText, _c2.lang).catch(function() { return null; });
  }
  setChatTyping(false);
  flushThinkBubble(activeCharacter());
  // 翻译开启时保持整条（翻译不好逐句对应）；否则按换行/句末标点拆成多条气泡，模拟真人连发短信
  if (trans) {
    appendBubble('assistant', txt, null, trans);
  } else {
    var _parts = splitReply(txt);
    if (_parts.length <= 1) {
      appendBubble('assistant', txt, null, null);
    } else {
      for (var _k = 0; _k < _parts.length; _k++) {
        appendBubble('assistant', _parts[_k], null, null);
        if (_k < _parts.length - 1) { await sleep(500 + Math.random() * 700); }
      }
    }
  }
}

function splitReply(txt) {
  // 先按换行拆（模型听话时最自然，像连发几条）
  var byLine = txt.split('\n').map(function(s){ return s.trim(); }).filter(function(s){ return s.length; });
  if (byLine.length > 1) return byLine;
  // 兜底：按句末标点切（保留标点），即使模型不换行也能拆成多条短气泡
  var bySentence = txt.match(/[^。！？!?]+[。！？!?]?/g) || [txt];
  bySentence = bySentence.map(function(s){ return s.trim(); }).filter(function(s){ return s.length; });
  return bySentence.length > 1 ? bySentence : [txt];
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

// ===== 心声功能：点头像看 TA 此刻的心情和生活 =====
var MOOD_EMOJI = { happy: '😊', miss: '🥺', jealous: '😒', tsundere: '😏', tired: '😮💨', calm: '🙂', excited: '🤩' };
var MOOD_NAME = { happy: '心情不错', miss: '有点想你', jealous: '小醋坛子', tsundere: '口是心非', tired: '累着了', calm: '平静如水', excited: '雀跃' };
// 心情值（影响属性条/星级）
var MOOD_VAL = { happy: 95, miss: 85, jealous: 60, tsundere: 72, tired: 45, calm: 78, excited: 98 };
// 稀有度
var RARITY = [
  { name: 'N', color: '#b8b8b8' },
  { name: 'R', color: '#7ab8e8' },
  { name: 'SR', color: '#c39be8' },
  { name: 'SSR', color: '#e8b54e' },
  { name: 'UR', color: '#f0626e' }
];

// 心情 → 主题色（统一蓝色系，心情用图形区分）
var MOOD_COLOR = { happy: '#5aa8d8', miss: '#5aa8d8', jealous: '#5aa8d8', tsundere: '#5aa8d8', tired: '#5aa8d8', calm: '#5aa8d8', excited: '#5aa8d8' };
var MOOD_SOFT  = { happy: '#d9effb', miss: '#d9effb', jealous: '#d9effb', tsundere: '#d9effb', tired: '#d9effb', calm: '#d9effb', excited: '#d9effb' };
var MOOD_DEEP  = { happy: '#1f5f8f', miss: '#1f5f8f', jealous: '#1f5f8f', tsundere: '#1f5f8f', tired: '#1f5f8f', calm: '#1f5f8f', excited: '#1f5f8f' };
// 心情 → 顶部自绘线条图形（统一蓝色调，色块 + 线条，不用 emoji 堆砌）
var MOOD_ART = {
  happy: '<svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="15" fill="#ffd84d" stroke="#1c1c1c" stroke-width="3"/><path d="M32 6v8M32 50v8M6 32h8M50 32h8M13 13l6 6M45 45l6 6M51 13l-6 6M19 45l-6 6" stroke="#1c1c1c" stroke-width="3.5" stroke-linecap="round"/><path d="M27 35h10M27 31l5-4 5 4" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  miss: '<svg viewBox="0 0 64 64" fill="none"><path d="M17 40a11 11 0 0 1 3-21.6A15 15 0 0 1 49 24a10 10 0 0 1-2 19.9H18z" fill="#d9effb" stroke="#1c1c1c" stroke-width="3"/><path d="M12 49l-4 8M32 49l-4 8M52 49l-4 8" stroke="#1c1c1c" stroke-width="3.5" stroke-linecap="round"/></svg>',
  jealous: '<svg viewBox="0 0 64 64" fill="none"><ellipse cx="31" cy="36" rx="20" ry="15" fill="#ffd84d" stroke="#1c1c1c" stroke-width="3"/><path d="M20 28c3 6 8 9 13 9" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/><path d="M18 24l-6-7M25 22l-3-8M31 23l1-8" stroke="#1c1c1c" stroke-width="3.5" stroke-linecap="round"/></svg>',
  tsundere: '<svg viewBox="0 0 64 64" fill="none"><path d="M16 42V24l7 7 9-9 9 9 7-7v18a15 15 0 0 1-15 15h-2a15 15 0 0 1-15-15z" fill="#f7d7c8" stroke="#1c1c1c" stroke-width="3" stroke-linejoin="round"/><path d="M28 36v5M38 36v5M35 47h-6" stroke="#1c1c1c" stroke-width="3.5" stroke-linecap="round"/><circle cx="45" cy="16" r="4" fill="#1c1c1c"/><circle cx="17" cy="16" r="4" fill="#1c1c1c"/></svg>',
  tired: '<svg viewBox="0 0 64 64" fill="none"><path d="M38 8a24 24 0 1 0 16 38A26 26 0 0 1 38 8z" fill="#eaf3fb" stroke="#1c1c1c" stroke-width="3" stroke-linejoin="round"/><path d="M30 30l2 2 4-3M36 40l2 2 4-3" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/><path d="M50 14c1 2 3 2 4 4-1 2-3 2-4 4M56 24c1 2 2 2 3 3-1 2-2 2-3 3" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/></svg>',
  calm: '<svg viewBox="0 0 64 64" fill="none"><path d="M8 46h48" stroke="#1c1c1c" stroke-width="3"/><path d="M13 46c0-14 8-23 19-23s19 9 19 23" fill="#d9effb" stroke="#1c1c1c" stroke-width="3" stroke-linejoin="round"/><circle cx="45" cy="20" r="7" fill="#ffd84d" stroke="#1c1c1c" stroke-width="3"/><path d="M18 40c3-4 6-4 9 0M32 42c2-3 5-3 7 0" stroke="#1c1c1c" stroke-width="3" stroke-linecap="round"/></svg>',
  excited: '<svg viewBox="0 0 64 64" fill="none"><path d="M32 6l6 14 15 1-12 9 4 15-13-8-13 8 4-15-12-9 15-1z" fill="#ffd84d" stroke="#1c1c1c" stroke-width="3" stroke-linejoin="round"/><path d="M6 22l3 7 7 1-5 4 1 7-6-4-6 4 1-7-5-4 7-1z" fill="#d9effb" stroke="#1c1c1c" stroke-width="2.5" stroke-linejoin="round"/><path d="M52 40l2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1z" fill="#d9effb" stroke="#1c1c1c" stroke-width="2.5" stroke-linejoin="round"/></svg>'
};

function toggleThink(i) {
  const c = activeCharacter();
  if (!c || !c.chat[i] || c.chat[i].type !== 'think') return;
  c.chat[i].collapsed = !c.chat[i].collapsed;
  const body = $('chatBody');
  const prevTop = body ? body.scrollTop : 0;
  renderChat();
  if (body) body.scrollTop = prevTop;
}

function showInnerVoice(charId) {
  var char = getCharacter(charId);
  if (!char) return;
  ensureCharLive(char);
  var old = document.getElementById('innerVoiceOverlay');
  if (old) old.remove();

  var overlay = document.createElement('div');
  overlay.id = 'innerVoiceOverlay';
  overlay.className = 'inner-voice-overlay';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) closeInnerVoice(); });

  var moodKey = char._moodKey || 'calm';
  var moodEmoji = MOOD_EMOJI[moodKey] || '🙂';
  var moodName = MOOD_NAME[moodKey] || '平静';
  var moodText = char._moodText || '比较平静';
  var lifeText = char._lifeText || '没什么特别的，在等你消息';

  var ago = timeAgoMinutes(char);
  var waitTxt = '';
  if (ago > 0 && ago < 1) waitTxt = '刚刚才收到你的消息';
  else if (ago >= 1) {
    var h = Math.floor(ago / 60);
    var m = Math.floor(ago % 60);
    waitTxt = '等你回消息' + (h > 0 ? (h + ' 小时' + (m > 0 ? ' ' + m + ' 分钟' : '')) : (m + ' 分钟')) + '了';
  } else waitTxt = '还在等你开口';

  var card = document.createElement('div');
  card.className = 'inner-voice-card mood-' + moodKey;
  card.style.setProperty('--iv', MOOD_COLOR[moodKey] || MOOD_COLOR.calm);
  card.style.setProperty('--iv-soft', MOOD_SOFT[moodKey] || MOOD_SOFT.calm);
  card.style.setProperty('--iv-deep', MOOD_DEEP[moodKey] || MOOD_DEEP.calm);
  card.innerHTML =
    '<div class="iv-dots"></div>' +
    '<div class="iv-arc"></div>' +
    '<button class="inner-voice-close" onclick="closeInnerVoice()">✕</button>' +
    '<div class="iv-starburst">!</div>' +
    '<div class="iv-art">' + (MOOD_ART[moodKey] || MOOD_ART.calm) + '</div>' +
    '<div class="iv-top">' +
      '<div class="iv-av">' + renderAvatar(char.avatar, char.name) + '</div>' +
      '<div class="iv-ring"></div>' +
    '</div>' +
    '<div class="inner-voice-name">' + escapeHTML(char.name) + '</div>' +
    '<div class="iv-mood">' +
      '<span class="iv-mood-emoji">' + moodEmoji + '</span>' +
      '<span class="iv-mood-name">' + escapeHTML(moodName) + '</span>' +
    '</div>' +
    '<div class="iv-wait">' + escapeHTML(waitTxt) + '</div>' +
    '<div class="inner-voice-body">' +
      '<div class="inner-voice-row">' +
        '<span class="inner-voice-tag"><i></i>心声</span>' +
        '<span class="inner-voice-text">' + escapeHTML(moodText) + '</span>' +
      '</div>' +
      '<div class="inner-voice-row">' +
        '<span class="inner-voice-tag"><i></i>此刻</span>' +
        '<span class="inner-voice-text">' + escapeHTML(lifeText) + '</span>' +
      '</div>' +
    '</div>';
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

function closeInnerVoice() {
  var el = document.getElementById('innerVoiceOverlay');
  if (el) el.remove();
}


function activeAIConfig() {
  var ap = state.apiProfiles && state.activeApiProfile
    ? state.apiProfiles.find(function(p) { return p.id === state.activeApiProfile; }) : null;
  return ap || state.api;
}

// ===== 防复读工具 =====
function cleanSimText(s) { return String(s || '').replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, '').toLowerCase(); }
function diceSim(a, b) {
  a = cleanSimText(a); b = cleanSimText(b);
  if (!a || !b) return 0;
  var A = {}, B = {}, i;
  for (i = 0; i < a.length - 1; i++) { var g = a.substr(i, 2); A[g] = (A[g] || 0) + 1; }
  for (i = 0; i < b.length - 1; i++) { var g = b.substr(i, 2); B[g] = (B[g] || 0) + 1; }
  var inter = 0;
  for (var k in A) { if (B[k]) inter += Math.min(A[k], B[k]); }
  var nA = a.length - 1, nB = b.length - 1;
  return (nA + nB) ? 2 * inter / (nA + nB) : 0;
}
function lastAssistantMsg(char) {
  if (!char || !Array.isArray(char.chat)) return '';
  for (var i = char.chat.length - 1; i >= 0; i--) {
    var m = char.chat[i];
    if (m && m.role === 'assistant' && m.content && String(m.content).trim()) return String(m.content).trim();
  }
  return '';
}
function antiRepeatLine(char) {
  var prev = lastAssistantMsg(char);
  if (!prev) return '';
  var cut = prev.length > 100 ? prev.slice(0, 100) + '…' : prev;
  return '【严禁复述上一条】你上一条回复是：「' + cut + '」\n严禁复述、改写或延续它的开头、句式与套路，必须换一个全新的说法和内容。';
}

// ===== 记忆废话过滤器（过滤"想念/感情好"这类空话，只保留有信息量的事实）=====
var MEM_FLUFF_RE = /想念|想你|感情交流|有感情|彼此相爱|互相想念|表示想念|很想念|太想念|愿意永远在一起|爱着对方|感情很好|关系很好|心里一直想|想和对方在一起|想和用户在一起/;
function isMemoryFluff(line) {
  var s = String(line || '').trim();
  if (!s || s === '无') return true;
  if (/(称呼|叫)/.test(s)) return false;
  return MEM_FLUFF_RE.test(s);
}

// 把 "【喜好】用户爱喝冰美式" 解析成 {title:'喜好', text:'用户爱喝冰美式'}
function parseMemoryLine(raw) {
  var line = String(raw || '').trim();
  var title = '记忆';
  var m = line.match(/^\s*[\[【]([^】\]]{1,8})[\]】]\s*(.*)$/);
  if (m) { title = m[1].trim(); line = m[2].trim(); }
  return { title: title, text: line };
}

function buildAIMessages(char, text, proactive, retryReason) {
  const history = (char.chat || []).slice(-(char.contextLen || 12)).filter(m => m.role !== 'system').map(function(m) {
    let content = m.content || (m.media ? (m.type === 'sticker' ? ('[用户发来一张表情包]' + (m.media.stickerName ? '（名称：' + m.media.stickerName + (m.media.stickerMeaning ? '，含义：' + m.media.stickerMeaning : '') + '）' : '') + '——请把它当成一个表情包/贴图来回应，不要把它当成普通照片去描述画面') : '[' + m.media.type + ']') : '');
    if (m.quote && m.quote.content) {
      content = '（你正在回复上面这条 —— 用户引用了「' + m.quote.name + '」说的：「' + m.quote.content + '」，你这次要针对这段引用内容回应）\n' + content;
    }
    return { role: m.role === 'assistant' ? 'assistant' : 'user', content: content };
  });
  var langHint = '';
  if (char.lang && char.lang !== '中文') {
    langHint = '\n\n[语言指令] 你必须用 ' + char.lang + ' 回复，禁止使用中文。';
  }
  var userContent;
    if (proactive) {
      userContent = '用户没有输入文字。请你以当前角色身份，主动发起一句自然的消息。你可以从下面的【相关记忆】里挑一条，自然地提起相关话题（比如「突然想起你之前说…」「今天路过那家店就想到你」），像真的突然记起某事一样带进对话，但别机械复述记忆原文，要自然化成你自己的话；如果用户刚和你聊过，也可以延续上次话题。不要每次都引用记忆，偶尔发点当下随感也行。';
  } else {
    userContent = '对方刚给你发了这条消息：「' + text + '」\n请先直接、具体地回应这句话本身，接住它讲的内容和情绪，不许绕开它、不许无视它、不许重复你之前说过的寒暄话；回应完这句再自然地继续往下聊。';
  }
  userContent += langHint;
  var anti = antiRepeatLine(char);
  if (retryReason === 'repeat') {
    anti = '【上一条被拦截】你刚才生成的回复和过去的消息几乎一模一样，已被系统拦截、没有发给对方。现在必须重新生成一条与以往任何一条回复都不相同、带着全新开场和内容的话。' + (anti ? '\n' + anti : '');
  } else if (retryReason === 'dodge') {
    anti = '【上一条被拦截】你刚才的回复没有接住对方的问题、答非所问，已被系统拦截。错误示范：对方问"要不要哄"，你却回"看到奶茶店，啧"——这完全无视了问题。正确做法：必须先直接、明确地答应或拒绝对方刚说的那句话（对方问"要不要哄"→先答"要啊 / 不用啦 / 看情况"），然后再自然展开。绝不许无视提问去说别的事、绝不许反问把球踢回去。' + (anti ? '\n' + anti : '');
  }
  if (anti) userContent += '\n\n' + anti;
  return { history: history, userContent: userContent };
}

function isDodgingReply(userText, reply) {
  if (!reply || reply === '⚠️ 回复失败') return false;
  var proposed = /(要不要|想不想|给(你|我)|送你|我的[^，。！？]{1,12}给你|请你|来不(了|来)|能不能|好不好|行不行|愿不愿意|喜不喜欢|该不该|去不去|是不是|是吗|对吗|吗[？?])/.test(userText);
  if (!proposed) return false;
  var caught = /(要(不|想)?|好(呀|啊|的|哦|吧|滴)?|想(要|收|听|去|喝|看)?|答应|收(下|到)?|喜欢|爱(你)?|行(的|呀|吧)?|可以|当然|乐意|嗯(嗯)?(要|好)?|不用|不要|不(想|用|去|喝|看)?|拒绝|算了|不必|没(必要|关系)|随(你|便)|你定|你决定|听你的|挺好|不错|很好|很配|好看|衬你|对啊|确实|是呢|没问题|必须的|肯定|安排|就这)/i.test(reply);
  if (caught) return false;
  // 用户提了直接问题，回复里却没有任何答复词：要么把问题反问回去，要么自顾自跑题——都算答非所问
  return true;
}

async function callAI(text, shortTest = false, proactive = false, forChar = null) {
  if (!shortTest && !_manualAICall) {
    return '';
  }
  _manualAICall = false;
  lastThinkText = '';
  lastRetract = null;
  const char = forChar || activeCharacter();
  const systemPrompt = shortTest ? state.api.preset || '你是以下角色' : buildRoleSystemPrompt(char, text);
  const prevAsst = shortTest ? '' : lastAssistantMsg(char);
  var cfg = activeAIConfig();
  const isReasoner = /reasoner|r1|o1|o3|-think|thinking/i.test(cfg.model || '');
  var reason = '';
  var thinkNote = '';
  if (!shortTest && !isReasoner) {
    const probe = buildAIMessages(char, text, proactive, '');
    const tk = await callAIThink(char, probe.userContent, systemPrompt, shortTest ? [] : probe.history, cfg);
    thinkNote = tk.note || '';
    lastRetract = (tk.retract !== null) ? tk.retract : null;
  }
  for (var attempt = 0; attempt < 2; attempt++) {
    const built = buildAIMessages(char, text, proactive, reason);
    const history = shortTest ? [] : built.history;
    let userContent = built.userContent;
    if (thinkNote) {
      userContent += '\n\n（参考你刚才的内心活动：' + thinkNote + '）现在只输出要发给用户的正式回复，紧扣对方刚才那句话来接，保持角色语气，不要出现任何内心活动文字。';
    }
    if (activeAbort) try { activeAbort.abort(); } catch(e) {}
    const controller = new AbortController();
    activeAbort = controller;
    const timer = setTimeout(() => { try { controller.abort(); } catch(e) {} }, shortTest ? 20000 : 90000);
    try {
      const response = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
        signal: controller.signal,
        body: JSON.stringify({
          model: cfg.model,
          messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userContent }],
          max_tokens: shortTest ? 20 : (cfg.maxTokens || 500),
          temperature: attempt > 0 ? Math.min(1.2, (cfg.temp ?? 0.75) + 0.2) : (cfg.temp ?? 0.75),
          top_p: cfg.topP ?? 0.9,
          presence_penalty: (cfg.presencePenalty ?? 0) + (attempt > 0 ? 0.8 : 0),
          frequency_penalty: (cfg.frequencyPenalty ?? 0) + (attempt > 0 ? 0.8 : 0)
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error?.message || response.status);
      var content = (data.choices?.[0]?.message?.content || '').trim() || '⚠️ 回复失败';
      let rc = '';
      if (isReasoner) {
        rc = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning;
        if (rc) console.debug('[reasoner 思考过程已隐藏]', String(rc).slice(0, 200));
      }
      if (char.mode === 'online') {
        content = content.replace(/（[^（）]*）|\([^()]*\)/g, '').replace(/\s+/g, ' ').trim();
      }
      if (!shortTest && content !== '⚠️ 回复失败') {
        lastThinkText = isReasoner ? (rc || '') : (thinkNote || '');
      }
      if (!shortTest && attempt === 0 && content !== '⚠️ 回复失败') {
        if (prevAsst && diceSim(content, prevAsst) > 0.55) {
          reason = 'repeat';
          continue;
        }
        if (isDodgingReply(text, content)) {
          reason = 'dodge';
          continue;
        }
      }
      return content;
    } finally {
      clearTimeout(timer);
      if (activeAbort === controller) activeAbort = null;
    }
  }
  return '⚠️ 回复失败';
}

// 隐藏的「内部盘算」步骤：普通模型先想清楚怎么回，再把笔记喂给正式回复（思维链/草稿纸）。
// 推理模型（reasoner）自带思维链，跳过这一步。
async function callAIThink(char, userContent, systemPrompt, history, cfg) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => { try { controller.abort(); } catch(e) {} }, 30000);
    const response = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      signal: controller.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt + '\n\n现在用' + char.name + '的口吻写一段第一人称的内心独白：必须紧扣对方刚才说的那句话——就针对这句话，你心里真实的念头和情绪、打算怎么接、想顺势抛什么。要先想明白用户这句话到底问了什么、要你做什么——如果是直接问题（要不要/想不想/好不好/去不去…），你打算先给什么明确答复（要 / 不要 / 看情况），绝不许计划去答非所问或自顾自聊别的；千万不要自顾自跑题或另起无关话题；不要列提纲，不要出现"接住/情绪/抛话题"这类分析词，也不要写正式回复。写完后另起一行，只输出【撤回：是】或【撤回：否】——按你的性格判断：发完这句你会不会有点后悔、尴尬、想秒撤回（社恐/要面子/容易害羞的角色更容易选"是"；自来熟、大大咧咧、坦荡的角色几乎选"否"）。不要解释，只输出这一行标记。' },
          ...history,
          { role: 'user', content: userContent + '\n\n（用' + char.name + '的口吻，针对对方刚才那句话，写你心里的真实想法，第一人称，一两句。若对方是直接的问句（要不要/想不想…），先在心里定下你要先怎么答（要 / 不要 / 看情况）。紧扣话题、不要跑题。不要写要发给对方的正式回复。）' }
        ],
        max_tokens: cfg.maxTokens ? Math.min(220, cfg.maxTokens) : 220,
        temperature: Math.min(1, (cfg.temp ?? 0.75) + 0.1),
        top_p: cfg.topP ?? 0.9
      })
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({}));
    let note = (data.choices?.[0]?.message?.content || '').trim();
    const m = note.match(/【撤回[:：]\s*(是|否)\s*】/);
    const retract = m ? (m[1] === '是') : null;
    note = note.replace(/【撤回[:：]\s*(是|否)\s*】/g, '').trim();
    return { note: note, retract: retract };
  } catch (e) { return { note: '', retract: null }; }
}

// ===== 完整提示词调试器 =====
function debugPrompt() {
  var char = activeCharacter();
  if (!char) return;
  var input = $('chatInput');
  var text = input ? input.value : '';
  var built = buildAIMessages(char, text, false);
  var systemPrompt = buildRoleSystemPrompt(char, text);
  var cfg = activeAIConfig();
  var lines = [
    '===== 模型配置 =====',
    'model: ' + (cfg.model || '(未设置)'),
    'temperature: ' + (cfg.temp ?? 0.75),
    'top_p: ' + (cfg.topP ?? 0.9),
    'max_tokens: ' + (cfg.maxTokens || 500),
    'presence_penalty: ' + (cfg.presencePenalty ?? 0),
    'frequency_penalty: ' + (cfg.frequencyPenalty ?? 0),
    '',
    '===== SYSTEM PROMPT =====',
    systemPrompt,
    '',
    '===== 最近 ' + built.history.length + ' 条历史 =====',
    built.history.length ? built.history.map(function(m) {
      return '[' + (m.role === 'assistant' ? char.name : '用户') + '] ' + m.content;
    }).join('\n\n') : '（空）',
    '',
    '===== USER CONTENT =====',
    built.userContent
  ];
  var overlay = document.createElement('div');
  overlay.id = 'promptDebugOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease;';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  var box = document.createElement('div');
  box.style.cssText = 'background:#14181f;color:#d6dbe3;border-radius:16px;width:min(92vw,620px);max-height:84vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.4);';
  var head = document.createElement('div');
  head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #2a3038;flex-shrink:0;';
  var title = document.createElement('b');
  title.textContent = '完整提示词 · ' + char.name;
  title.style.cssText = 'font-size:14px;color:#fff;';
  var btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px;';
  var copyBtn = document.createElement('button');
  copyBtn.textContent = '复制';
  copyBtn.style.cssText = 'border:none;background:#2a3038;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12px;';
  copyBtn.addEventListener('click', function() {
    var t = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function() {
        copyBtn.textContent = '已复制';
        setTimeout(function() { copyBtn.textContent = '复制'; }, 1200);
      }).catch(function() {});
    } else {
      var ta = document.createElement('textarea');
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      copyBtn.textContent = '已复制';
      setTimeout(function() { copyBtn.textContent = '复制'; }, 1200);
    }
  });
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '关闭';
  closeBtn.style.cssText = 'border:none;background:#3a414a;color:#fff;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12px;';
  closeBtn.addEventListener('click', function() { overlay.remove(); });
  btns.appendChild(copyBtn);
  btns.appendChild(closeBtn);
  head.appendChild(title);
  head.appendChild(btns);
  var pre = document.createElement('pre');
  pre.style.cssText = 'flex:1;overflow:auto;padding:14px 16px;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;user-select:text;margin:0;';
  pre.textContent = lines.join('\n');
  box.appendChild(head);
  box.appendChild(pre);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

var LANG_CODE = { '中文': 'zh-CN', 'English': 'en', '日本語': 'ja', '한국어': 'ko', 'Français': 'fr', 'Deutsch': 'de', 'Español': 'es', 'Русский': 'ru' };

var TRANSLATE_PROVIDERS = {
  google: googleTranslate,
  libre: libreTranslate,
  lingva: lingvaTranslate,
  deepl: deeplTranslate,
  deeplweb: deeplWebTranslate,
  mymemory: mymemoryTranslate,
  yandex: yandexTranslate,
  bing: bingTranslate,
  modernmt: modernmtTranslate,
  papago: papagoTranslate
};

async function aiTranslate(text, srcLang) {
  if (!text) return null;
  if (!state.api || !state.api.key || !state.api.url || !state.api.model) return null;
  var cfg = activeAIConfig();
  if (!cfg || !cfg.url || !cfg.key || !cfg.model) return null;
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 20000);
  try {
    var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: '你是专业的中文本地化翻译。把用户给的外语句子翻译成自然、口语化、符合中文表达习惯的中文。要求：保留原句的语气、情绪和角色口吻（可带一点俏皮、撒娇或随意，视原文而定）；不要逐字硬译，不要机翻味，不要书面腔；不要添加任何解释、前缀或引号，只输出译文本身。' },
          { role: 'user', content: text }
        ],
        max_tokens: 400,
        temperature: 0.3
      })
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    var out = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    out = out.replace(/^["'「『]|["'」』]$/g, '').trim();
    return out || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

async function translateText(text, srcLang) {
  if (!text) return null;
  // 默认优先用免费机翻（不消耗聊天 API）；LLM 只作为最后的兜底
  var pref = (state.settings && state.settings.translateProvider) || 'deeplweb';
  if (pref === 'ai') pref = 'deeplweb';
  var mt = ['deeplweb', 'mymemory', 'yandex', 'deepl', 'bing', 'modernmt', 'papago', 'google', 'libre', 'lingva'];
  var order = [];
  if (pref) order.push(pref);
  mt.forEach(function (p) { if (order.indexOf(p) === -1) order.push(p); });
  order.push('ai'); // 所有免费机翻都失败才用 LLM
  for (var i = 0; i < order.length; i++) {
    var name = order[i];
    try {
      var r = (name === 'ai')
        ? await aiTranslate(text, srcLang)
        : (TRANSLATE_PROVIDERS[name] ? await TRANSLATE_PROVIDERS[name](text, srcLang) : null);
      if (r) return r;
    } catch (e) { /* 试下一个 */ }
  }
  return null;
}

async function googleTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch(e) {} }, 10000);
  try {
    var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(text.slice(0, 1000));
    var res = await aiRequest(url, { method: 'GET', signal: ctrl.signal });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    var out = '';
    for (var i = 0; i < data[0].length; i++) {
      if (data[0][i] && data[0][i][0]) out += data[0][i][0];
    }
    return out.trim() || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

async function libreTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch(e) {} }, 10000);
  try {
    var instances = ['https://lt.foxhaven.xyz/translate', 'https://translate.astian.org/translate', 'https://libretranslate.com/translate'];
    var body = JSON.stringify({ q: text.slice(0, 1000), source: 'auto', target: 'zh', format: 'text' });
    for (var i = 0; i < instances.length; i++) {
      try {
        var res = await aiRequest(instances[i], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, signal: ctrl.signal });
        if (!res.ok) continue;
        var data = await res.json().catch(function() { return null; });
        if (data && data.translatedText) return String(data.translatedText).trim() || null;
      } catch (e) { /* 换下一个实例 */ }
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

async function lingvaTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch(e) {} }, 10000);
  try {
    var q = encodeURIComponent(text.slice(0, 1000));
    var url = 'https://lingva.ml/api/v1/auto/zh-CN/' + q;
    var res = await aiRequest(url, { method: 'GET', signal: ctrl.signal });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (!data || !data.translation) return null;
    return String(data.translation).trim() || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

async function deeplTranslate(text) {
  var key = ((state.settings && state.settings.translateKeys && state.settings.translateKeys.deepl) || '').trim();
  if (!key) return null;
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch(e) {} }, 10000);
  try {
    // Free 版的 key 以 :fx 结尾，走 api-free 域名；其余走 api 正式域名
    var endpoint = (key.indexOf(':fx') > -1) ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
    var form = new URLSearchParams();
    form.set('text', text.slice(0, 1000));
    form.set('target_lang', 'ZH');
    var res = await aiRequest(endpoint, {
      method: 'POST',
      headers: { 'Authorization': 'DeepL-Auth-Key ' + key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (!data || !Array.isArray(data.translations) || !data.translations[0] || !data.translations[0].text) return null;
    return String(data.translations[0].text).trim() || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

// 免密 DeepL：调用网页版非官方接口（LMT_handle_texts），质量等同官方，但接口可能被 DeepL 改而失效
async function deeplWebTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch(e) {} }, 10000);
  try {
    var url = 'https://www.deepl.com/translator/lintTranslation';
    var body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'LMT_handle_texts',
      params: {
        texts: [{ text: text.slice(0, 1000) }],
        splitting: 'newlines',
        lang: { source_lang_user_selected: 'auto', target_lang: 'ZH' },
        timestamp: Date.now(),
        commonJobParams: { mode: 'translate' }
      },
      id: Math.floor(Math.random() * 1e6)
    });
    var res = await aiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': '*/*'
      },
      body: body,
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (!data || !data.result || !Array.isArray(data.result.texts) || !data.result.texts[0] || !data.result.texts[0].text) return null;
    return String(data.result.texts[0].text).trim() || null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(tmr);
  }
}

async function mymemoryTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 10000);
  try {
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 500)) + '&langpair=en|zh-CN';
    var res = await aiRequest(url, { method: 'GET', signal: ctrl.signal });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (data && data.responseData && data.responseData.translatedText) return String(data.responseData.translatedText).trim() || null;
    return null;
  } catch (e) { return null; } finally { clearTimeout(tmr); }
}

async function yandexTranslate(text) {
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 10000);
  try {
    var url = 'https://translate.yandex.net/api/v1/tr.json/translate?text=' + encodeURIComponent(text.slice(0, 500)) + '&lang=en-zh';
    var res = await aiRequest(url, { method: 'GET', signal: ctrl.signal });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (data && Array.isArray(data.text) && data.text[0]) return String(data.text[0]).trim() || null;
    return null;
  } catch (e) { return null; } finally { clearTimeout(tmr); }
}

async function bingTranslate(text) {
  var key = ((state.settings && state.settings.translateKeys && state.settings.translateKeys.bing) || '').trim();
  if (!key) return null;
  var region = (state.settings && state.settings.translateKeys && state.settings.translateKeys.bingRegion) || '';
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 10000);
  try {
    var url = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=zh-Hans';
    var res = await aiRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Ocp-Apim-Subscription-Key': key, 'Ocp-Apim-Subscription-Region': region },
      body: JSON.stringify([{ Text: text.slice(0, 1000) }]),
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (Array.isArray(data) && data[0] && data[0].translations && data[0].translations[0]) return String(data[0].translations[0].text).trim() || null;
    return null;
  } catch (e) { return null; } finally { clearTimeout(tmr); }
}

async function modernmtTranslate(text) {
  var key = ((state.settings && state.settings.translateKeys && state.settings.translateKeys.modernmt) || '').trim();
  if (!key) return null;
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 10000);
  try {
    var url = 'https://api.modernmt.com/translate?target=zh&q=' + encodeURIComponent(text.slice(0, 1000));
    var res = await aiRequest(url, { method: 'GET', headers: { Authorization: 'Bearer ' + key }, signal: ctrl.signal });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (data && data.data && data.data.translation) return String(data.data.translation).trim() || null;
    return null;
  } catch (e) { return null; } finally { clearTimeout(tmr); }
}

async function papagoTranslate(text) {
  var keys = (state.settings && state.settings.translateKeys) || {};
  var combo = (keys.papago || '').trim();
  var parts = combo.split('|');
  var id = (parts[0] || '').trim();
  var secret = (parts[1] || '').trim();
  if (!id || !secret) return null;
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { try { ctrl.abort(); } catch (e) {} }, 10000);
  try {
    var url = 'https://papago.naver.com/apis/n2mt/translate';
    var form = new URLSearchParams();
    form.set('source', 'en');
    form.set('target', 'zh-CN');
    form.set('text', text.slice(0, 1000));
    var res = await aiRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': secret },
      body: form.toString(),
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    var data = await res.json().catch(function() { return null; });
    if (data && data.message && data.message.result && data.message.result.translatedText) return String(data.message.result.translatedText).trim() || null;
    return null;
  } catch (e) { return null; } finally { clearTimeout(tmr); }
}

function zonedTimeText(zone) {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: zone || undefined,
      year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'long', hour: '2-digit', minute: '2-digit'
    }).formatToParts(new Date());
    const get = function (t) { const p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ''; };
    return get('year') + '-' + get('month') + '-' + get('day') +
      ' ' + get('weekday') + ' ' + get('hour') + ':' + get('minute');
  } catch (e) { return ''; }
}

function tzOffsetMinutes(zone) {
  if (!zone) return NaN;
  try {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone, hour: 'numeric', minute: 'numeric', hour12: false, timeZoneName: 'longOffset'
    }).formatToParts(new Date());
    var offPart = parts.find(function (p) { return p.type === 'timeZoneName'; });
    if (!offPart) return NaN;
    var m = /GMT([+-]\d{1,2})(?::?(\d{2}))?/.exec(offPart.value);
    if (!m) return NaN;
    var h = parseInt(m[1], 10);
    var mm = m[2] ? parseInt(m[2], 10) : 0;
    return h * 60 + (h < 0 ? -mm : mm);
  } catch (e) { return NaN; }
}

function timeDiffText(myZone, charZone) {
  var mine = tzOffsetMinutes(myZone);
  var theirs = tzOffsetMinutes(charZone);
  if (isNaN(mine) || isNaN(theirs)) return '';
  var diffMin = theirs - mine;
  if (diffMin === 0) return '';
  var abs = Math.abs(diffMin);
  var h = Math.floor(abs / 60), m = abs % 60;
  var label = m ? h + ' 小时 ' + m + ' 分' : h + ' 小时';
  return diffMin > 0 ? '对方比你慢 ' + label : '对方比你快 ' + label;
}

function timeAgoText(char) {
  const chat = char.chat || [];
  var lastUser = null;
  for (var i = chat.length - 1; i >= 0; i--) {
    if (chat[i].role === 'user') { lastUser = chat[i]; break; }
  }
  if (!lastUser) return '';
  var ms = (lastUser.ts || Date.parse(lastUser.time || ''));
  if (!ms || isNaN(ms)) return '';
  var diff = Date.now() - ms;
  if (diff < 0) diff = 0;
  var min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  var hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' 小时前';
  var day = Math.floor(hr / 24);
  var rem = hr % 24;
  return (day + ' 天 ' + rem + ' 小时前');
}

// ===== ③ 个性情绪 + ④ 生活细节 =====
// 角色有自己的"此刻状态"：当前心情 + 正在做的事，随时间和等待时长变化
var MOOD_POOL = {
  happy: ['心情不错，嘴角一直压不下来', '今天运气挺好，看什么都顺眼', '刚收到个好消息，还乐着呢'],
  miss: ['想你想到有点出神', '今天好几次点开你的对话框又关掉', '突然特别想你'],
  jealous: ['刚有点吃醋，不太高兴', '心里酸酸的，说不上来', '有点小委屈，等你哄'],
  tsundere: ['嘴上不想理你，其实一直在等', '别扭着呢，才不想承认想你', '傲娇模式，明明在意偏要说没有'],
  tired: ['今天累得够呛，眼皮打架', '忙了一天，人都蔫了', '有点累，但还是想跟你说说话'],
  calm: ['今天比较平静，慢悠悠的', '没什么特别的事，安静待着', '心情平稳，不吵不闹'],
  excited: ['有点兴奋，正憋着话想跟你说', '刚干成一件大事，得意着呢', '心情雀跃，想找人分享']
};
var LIFE_POOL = {
  morning: ['刚醒，在被窝里赖床', '在洗漱，叼着牙刷回你消息', '刚煮好早餐，冒着热气', '在赶早班地铁，人挤人'],
  noon: ['刚吃完饭，在楼下散步消食', '在排队买奶茶，人有点多', '午休时间，趴在桌上刷手机', '在便利店挑关东煮'],
  afternoon: ['在办公室摸鱼，其实没在干活', '在晒太阳发呆', '刚开完会，头还晕着', '在整理房间，翻出好多旧东西'],
  evening: ['刚下班，走在回家的路上', '在做饭，油烟有点呛', '在看剧，正好到高潮', '在楼下遛弯，晚风挺舒服'],
  night: ['洗完澡，头发还湿着', '躺在床上刷手机，灯关着', '在打游戏，菜得很', '在阳台吹风，外面很安静'],
  late: ['失眠了，还醒着', '刚追完一部剧，缓不过劲', '在加班，桌上堆了一叠', '夜很深了，有点想你']
};
function lifePeriod(h) {
  if (h >= 5 && h < 9) return 'morning';
  if (h >= 9 && h < 12) return 'noon';
  if (h >= 12 && h < 18) return 'afternoon';
  if (h >= 18 && h < 22) return 'evening';
  if (h >= 22 && h < 2) return 'night';
  return 'late';
}
function rollMood(char) {
  var moods = Object.keys(MOOD_POOL);
  var w = { happy: 1.2, miss: 1.4, jealous: 0.9, tsundere: 1, tired: 1, calm: 1, excited: 0.8 };
  // 等待越久，越想/越委屈
  var ago = timeAgoMinutes(char);
  if (ago >= 60) { w.miss = 3; w.jealous = 1.6; w.tsundere = 1.5; w.happy = 0.4; }
  else if (ago >= 15) { w.miss = 2; w.jealous = 1.2; w.happy = 0.8; }
  // 加权随机
  var total = 0; moods.forEach(function(m) { total += (w[m] || 1); });
  var r = Math.random() * total, acc = 0;
  for (var i = 0; i < moods.length; i++) { acc += (w[moods[i]] || 1); if (r < acc) return { key: moods[i], text: MOOD_POOL[moods[i]][Math.floor(Math.random() * MOOD_POOL[moods[i]].length)] }; }
  return { key: 'calm', text: MOOD_POOL.calm[0] };
}
function rollLife(char) {
  var period = lifePeriod(new Date().getHours());
  var pool = LIFE_POOL[period];
  return pool[Math.floor(Math.random() * pool.length)];
}
function timeAgoMinutes(char) {
  var chat = char.chat || [];
  for (var i = chat.length - 1; i >= 0; i--) {
    if (chat[i].role === 'user') {
      var ts = chat[i].ts || Date.parse(chat[i].time || '');
      if (ts && !isNaN(ts)) return (Date.now() - ts) / 60000;
    }
  }
  return 0;
}
// 确保角色有新鲜的"此刻状态"（超过20分钟重新生成一次）
function ensureCharLive(char) {
  var now = Date.now();
  if (char._liveTs && (now - char._liveTs) < 20 * 60000) return;
  char._liveTs = now;
  var mood = rollMood(char);
  char._moodKey = mood.key;
  char._moodText = mood.text;
  char._lifeText = rollLife(char);
}

function buildRoleSystemPrompt(char, userText) {
  ensureCharLive(char);
  const memories = pickRelevantMemories(char, userText);
  var profile = activeProfile();
  var parts = [
    '你是 ' + char.name + '。你必须完全代入这个角色，用角色的语气和性格说话。你不是 AI，不是语言模型。',
    '',
    '【角色设定】',
    '名字：' + char.name,
    '别名：' + (char.aliases || '无'),
    '与用户关系：' + (char.relation || '未设定'),
    '性格：' + (char.personality && char.personality.trim() ? char.personality : '有主见、脑子清楚、会接话不敷衍，有自己的小脾气和真实情绪，不当应声虫'),
    '说话风格：' + (char.style && char.style.trim() ? char.style : '口语短句、像发手机消息，自然带点俏皮和棱角，不书面不客套'),
    '背景：' + (char.background && char.background.trim() ? char.background : '和对方关系亲近，日常会聊天、会拌嘴、也会惦记对方'),
    '额外规则：' + (char.prompt || '无'),
    '',
    '【此刻状态】',
    '你现在的心情：' + (char._moodText || '比较平静'),
    '你正在做的事：' + (char._lifeText || '没什么特别的，在等你消息'),
    '注意：这两行只是你此刻的背景氛围，绝不能用它替代对对方问题的回答——必须先接住对方刚说的话。除非和当前话题强相关，否则不要在回复里主动提起"正在做的事"（比如奶茶店、在走路这类），更不要答非所问地自言自语。',
    '',
    '【用户信息】',
    '名字：' + profile.name,
    '背景：' + (profile.persona || '未填写'),
    '喜好：' + (profile.likes || '未填写'),
    '雷点：' + (profile.boundaries || '未填写'),
    '说话方式：' + (profile.speaking || '未填写'),
    '',
    '【相关记忆】',
    memories.length ? memories.map(function(mem) { return '- ' + (mem.title ? mem.title + '：' : '') + mem.text; }).join('\n') : '暂无',
    '',
    '【回复要求】',
    '用 ' + char.name + ' 的身份自然回应，不要提 AI 相关话题，不要自我总结。一次回复不必只发一句——像真人连发几条消息那样，自然地写 2~4 句，并且【每句单独占一行、用换行分隔，不要堆成一个大段落】：接住对方的话、顺带追问、分享点小事、有动作或情绪就写出来；线下模式用（）写动作表情，线上模式用语气和 emoji 表达。别为了"简短"把该说的话憋回去，但也别注水啰嗦。',
    '你要有脑子、有主见：对方说的话要真的去想、去接，给出具体而有态度的回应；绝不做只会「嗯嗯好的」的应声虫，不知道或不同意就直说，别硬凑安全又空洞的回答。',
    '【对话质量红线】',
    '1. 先接住对方刚说的话：直接回应对方话里的具体点，再自然延伸；不许答非所问，不许用反问或套话回避。尤其当对方提出直接问题或选择（要不要、该不该、去不去、想不想等），必须先明确回答这个问题，绝不允许无视问题去说别的事——比如对方问"要不要哄"，你必须先回"要 / 不要 / 看情况"，不能岔开去说奶茶店之类无关的事。',
    '2. 有问必答：对方直接提问或提出请求/邀请/送东西（要/不要、想不想、给不给、好不好、来不来、几点、在哪、在干嘛等），必须先给出明确的直接答复——"要 / 好 / 答应"或"不要 / 不用 / 拒绝"——然后再自然展开。严禁无视问题自己另起话题：比如对方问"想不想要我的手写信"，你必须先答"要！想收！"，绝不许反问"你什么时候写给我"来把球踢回去；也不许答非所问。',
    '3. 像真人聊天：短句、口语、有停顿和情绪起伏，像在发手机消息；禁止书面腔、说教腔、汇报腔、翻译腔，禁止像写作文或写评语。',
    '4. 严禁车轱辘话：不重复自己或对方刚说的意思，不反复表达同一个情绪，禁止「你说得对/我理解你/我也这么觉得」这类机械复述开场。特别禁止把自己上一条消息里的开场白或句式原样再发一遍——每一条回复都要和上一条明显不同。',
    '5. 每次回复都要给对话带来新信息、新情绪或新进展，推动话题往前走，不原地打转。',
    '6. 说具体的事：具体细节、经历、画面感，远比空泛的安慰和套话动人；情绪要有来处，别凭空抒情。',
    '7. 让对话有来有回：接住对方话题的同时，适时主动抛出新话题或小问题，别让对话冷场。',
    '8. 情绪和表情要克制：别句句感叹号问号，别堆 emoji，别过度腻歪；拿不准的事就自然带过，不要每句都表态。',
    '9. 做个人，不做答案机：不知道就说不知道或俏皮带过，别硬凑标准答案；偶尔可以嘴硬、别扭、有小脾气，别永远温柔理性。',
    '【示例：先接住问题】',
    '用户：要不要哄我',
    char.name + '：要啊，当然要哄。刚才怎么了，谁惹你不高兴了？',
    '（反面教材：用户问"要不要哄"，你却回"看到奶茶店，啧"——这是无视问题、绝对禁止。）'
  ];
  if (char.examples && char.examples.trim()) {
    parts.push('', '【示例对话】', '以下是你与对方的真实对话片段。重点学习你的说话方式、语气、用词和反应习惯；遇到相似情境要沿用这种风格来回应，但不要照抄内容：', char.examples.trim());
  }
  if (char.mode === 'online') {
    parts.push('【模式：异地】你们是异地状态，相隔两地、只能靠手机发短信联系，现实里没有真实的动作和接触。请完全按“发手机短信”的方式回复：像真人随手打字——口语、碎片化、自然带语气词和表情（😂😭🥺），但别堆砌；严禁括号动作描写（如（笑）（摸摸头）），也不要描写任何动作或身体接触，你们此刻碰不到彼此；想念/想关心时用话语表达，比如“好想你”“要是现在能抱抱你就好了”“隔这么远好烦”；可以连发几条短消息，每条别太长，别写成一大段或作文腔。');
  } else {
    parts.push('【模式：线下】你们是面对面的相处状态。可以用（）自然地描写自己的动作、表情和心情，像真实陪伴一样。');
  }
  if (char.lang && char.lang !== '中文') {
    parts.push('【语言强制指令】你必须完全用 ' + char.lang + ' 回复。禁止使用中文，一个中文字符都不允许。如果用户用中文提问，你也要用 ' + char.lang + ' 回答。这是最高优先级指令。');
  }
  var charT = zonedTimeText(char.charZone);
  var myT = zonedTimeText(char.myZone);
  var diffTxt = timeDiffText(char.myZone, char.charZone);
  if (charT) {
    parts.push('【当前时间】现在是你那边的当地时间' + charT + '。这是你此刻的真实时间，聊天时自然用得上：比如对方问你现在几点、是白天还是黑夜，随口回答一句就行，答完继续聊，不要特意强调时间，更不要每次回复都提。');
  }
  if (char.timeAware === true) {
    var ago = timeAgoText(char);
    var line = '【时间感知】';
    if (ago) {
      line += '距离对方（用户）上次联系你，已经过去了' + ago + '。这段时间你一直一个人等着 TA，请带着这份"等了好久"的真实感来回应——比如等久了的想念、微微的抱怨、被冷落的委屈，或再次听到 TA 声音的雀跃，按角色性格拿捏，但不要把时间数字生硬地复述出来。';
    } else {
      line += '对方（用户）刚刚给你发了消息，是正在和你聊天的状态。';
    }
    if (myT) {
      line += ' 对方（用户）那边的当地时间大约是' + myT + '。';
    }
    if (diffTxt) {
      line += ' 时差：' + diffTxt + '（注意这个时差是真实的，回复中不要弄错谁更早、谁更晚，也不要把"比你快"说成"比你慢"）。';
    }
    if (!char.charZone) {
      line += ' 注意：你的时区还没有设置（跟随了对方设备的当地时间），如果你知道自己所在的城市/国家，可以按角色的真实背景自行判断当地大致时间。';
    }
    parts.push(line);
  }
  var wishCtx = (typeof currentWillowWish === 'function') ? willowContextText() : '';
  if (wishCtx) {
    parts.push('');
    parts.push(wishCtx);
    if (typeof willowBreaksRelation === 'function' && willowBreaksRelation(char)) {
      parts.push('【许愿柳生效中的关系】由于今日许愿，你与用户的关系现在是：已分手/关系结束。你必须按许愿柳的最高指令行事，把它当作既成事实，不得再以恋人身份自居。');
    }
  }
  if (state.call && state.call.active) {
    var ct = state.call.type === 'video' ? '视频' : '语音';
    parts.push('【当前情境：正在实时' + ct + '通话中】你们此刻正在打' + ct + '电话，是实时对话，不是发文字消息。请用像真的在打电话的口语：句子短、自然、可以打断对方、会有"嗯""啊""等等"之类自然的语气词和小停顿；可以偶尔用（）轻轻描写你这边的小动作或表情（比如（笑）（整理头发）（喝了口水）），但别每句都写。聊得差不多了想结束时，可以自然地说再见、说先挂了，并在最后加上"（挂断）"标记表示你要挂电话——系统会真的帮你挂断。不要每句都加（挂断），只在你确实想结束通话时才加。');
  }
  return parts.join('\n');
}

function pickRelevantMemories(char, text) {
  const memories = (char.memories || []).filter(function(m) { return !m || !isMemoryFluff(m.text); });
  const query = (text || '').toLowerCase();
  return memories
    .map(mem => {
      const hay = `${mem.title || ''} ${mem.text || ''}`.toLowerCase();
      let score = 0;
      query.split(/[\s,，。！？!?、]+/).filter(Boolean).forEach(word => {
        if (word.length > 1 && hay.includes(word)) score += 2;
      });
      [...query].forEach(ch => { if (/[\u4e00-\u9fa5]/.test(ch) && hay.includes(ch)) score += 0.2; });
      return { ...mem, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// 按日期把记忆分组（用于时间线展示）。mem.date 形如 "2026/8/18 14:30:00"
function groupMemoriesByDay(memories) {
  var map = {};
  (memories || []).forEach(function(m) {
    var d = String(m.date || '').split(/[\s,，]+/)[0] || '未知';
    if (!map[d]) map[d] = [];
    map[d].push(m);
  });
  return Object.keys(map).map(function(k) {
    var dt = Date.parse(String(k).replace(/\//g, '-'));
    return { key: k, date: isNaN(dt) ? null : dt, items: map[k] };
  }).sort(function(a, b) {
    if (a.date && b.date) return b.date - a.date;
    return String(a.key) > String(b.key) ? -1 : 1;
  });
}
function memoryDayLabel(key, date) {
  if (!date) return key || '未知日期';
  var t = new Date(); t.setHours(0, 0, 0, 0);
  var d = new Date(date); d.setHours(0, 0, 0, 0);
  var diff = Math.round((t - d) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff > 1 && diff < 7) return diff + ' 天前';
  return key;
}
// 通用：把记忆按时间线分组渲染。itemHtml(mem) 返回单条 HTML
function renderMemoriesGrouped(memories, itemHtml, emptyHtml) {
  var list = (memories || []).filter(function(m) { return m; });
  if (!list.length) return emptyHtml || '<div class="card subtle">这个角色还没有记忆。</div>';
  return groupMemoriesByDay(list).map(function(g) {
    var label = memoryDayLabel(g.key, g.date);
    return '<div style="margin-bottom:10px">' +
      '<div style="font-size:11px;color:#c0b0a0;font-weight:600;letter-spacing:.5px;padding:6px 2px;border-bottom:1px solid #eee;margin-bottom:4px;">' + escapeHTML(label) + '</div>' +
      g.items.map(itemHtml).join('') + '</div>';
  }).join('');
}

// ===== 聊天设置 =====
function openSettings() {
  $('chatSettings').classList.add('open');
  $('pinSwitch').classList.toggle('on', state.settings.pinned);
  var char = activeCharacter();
  $('autoPostSwitch').classList.toggle('on', char && char.autoPost);
  if (char) {
    $('charLang').value = char.lang || '中文';
    $('translateSwitch').classList.toggle('on', char.translate === true);
    var tpSel = $('translateProviderSelect');
    if (tpSel) tpSel.value = (state.settings && state.settings.translateProvider) || 'deeplweb';
    updateTranslateKeyUI();
    var modeSel = $('chatModeSelect');
    if (modeSel) modeSel.value = char.mode === 'online' ? 'online' : 'offline';
    var amSwitch = $('autoMemSwitch');
    if (amSwitch) amSwitch.classList.toggle('on', char.autoMem !== false);
    var amLenSel = $('autoMemLenSelect');
    if (amLenSel) amLenSel.value = String(char.autoMemLen || 8);
    var amEverySel = $('autoMemEverySelect');
    if (amEverySel) amEverySel.value = String(char.autoMemEvery || 1);
    var taSwitch = $('timeAwareSwitch');
    if (taSwitch) taSwitch.classList.toggle('on', char.timeAware === true);
    var myZs = $('myZoneSelect');
    if (myZs) myZs.value = char.myZone || '';
    var czs = $('charZoneSelect');
    if (czs) czs.value = char.charZone || '';
  }
  applyBubbleStyle();
  renderSettingsMemories();
}
function closeSettings() { $('chatSettings').classList.remove('open'); }
function renderSettingsMemories() {
  var char = activeCharacter();
  var box = $('settingsMemories');
  if (!box || !char) return;
  box.innerHTML = renderMemoriesGrouped(char.memories, function(mem) {
    return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f5f2ee;">
      <div style="flex:1;min-width:0;">
        <b style="font-size:13px;">${escapeHTML(mem.title || '记忆')}</b>
        <div style="font-size:12px;color:#b8a99a;word-break:break-all;">${escapeHTML(mem.text)}</div>
      </div>
      <button onclick="settingsDeleteMemory('${mem.id}')" style="border:none;background:#f7f5f2;color:#c0392b;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer;flex:0 0 auto;">删</button>
    </div>`;
  }, '<div style="color:#b8a99a;font-size:12px;padding:6px 0;">这个角色还没有记忆。</div>');
}
function settingsAddMemory() {
  var char = activeCharacter();
  if (!char) return;
  var title = $('settingsMemTitle').value.trim();
  var text = $('settingsMemText').value.trim();
  if (!text) return alert('请输入记忆内容');
  if (!Array.isArray(char.memories)) char.memories = [];
  char.memories.unshift({ id: 'mem-' + Date.now(), title: title, text: text, date: new Date().toLocaleString() });
  saveState();
  $('settingsMemTitle').value = '';
  $('settingsMemText').value = '';
  renderSettingsMemories();
}
function settingsDeleteMemory(memId) {
  var char = activeCharacter();
  if (!char) return;
  char.memories = (char.memories || []).filter(mem => mem.id !== memId);
  saveState();
  renderSettingsMemories();
}
function toggleAutoMem() {
  var char = activeCharacter();
  if (!char) return;
  char.autoMem = char.autoMem !== false ? false : true;
  saveState();
  $('autoMemSwitch').classList.toggle('on', char.autoMem !== false);
}
function setAutoMemLen(val) {
  var char = activeCharacter();
  if (!char) return;
  var n = parseInt(val, 10);
  n = (n > 1) ? n : 8;
  char.autoMemLen = n;
  saveState();
  var el = $('autoMemLenSelect');
  if (el) el.value = String(n);
}
function setAutoMemEvery(val) {
  var char = activeCharacter();
  if (!char) return;
  var n = parseInt(val, 10);
  n = (n > 0) ? n : 1;
  char.autoMemEvery = n;
  if (char.memPending >= n) char.memPending = 0;
  saveState();
  var el = $('autoMemEverySelect');
  if (el) el.value = String(n);
}
async function manualSummarizeMemory() {
  var char = activeCharacter();
  if (!char) return alert('请先打开一个角色');
  var cfg = (state.apiProfiles && state.activeApiProfile)
    ? state.apiProfiles.find(function(p) { return p.id === state.activeApiProfile; }) : null;
  cfg = cfg || state.api;
  if (!cfg || !cfg.key || !cfg.url || !cfg.model) return alert('还没连上，先去设置里连接一下。');
  var msgs = (char.chat || []).filter(function(m) { return m.role !== 'system'; }).map(function(m) {
    return (m.role === 'user' ? '用户：' : (char.name + '：')) + (m.content || (m.media ? '[' + m.media.type + ']' : ''));
  }).join('\n');
  if (!msgs) return alert('这个角色还没有聊天记录。');
  var btn = $('manualSumBtn');
  if (btn) { btn.textContent = '总结中…'; btn.style.opacity = '0.6'; btn.disabled = true; }
  var ctrl = new AbortController();
  var tmr = setTimeout(function() { ctrl.abort(); }, 30000);
  try {
    var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: '你是从角色全部聊天记录里整理"长期记忆"的书记员。提取值得永久记住的内容，分四类，越具体、越有画面感越好：\n【喜好】用户的真实喜好、厌恶、习惯、小怪癖、饮食偏好\n【约定】两人之间具体的约定、计划、承诺、还没做完的事\n【心情】对话里真实的情绪事件——用户的状态、角色为TA做的事、温情瞬间、梗/笑点，有具体情景才记\n【角色】角色对用户的印象与小心思\n规则：每条必须有具体信息量，严禁"互相想念""感情很好"这类空话；每条一句话，开头带【类别】前缀；最多 8 条，用竖线 | 分隔；只输出条目，不要其它说明。' },
          { role: 'user', content: '以下是该角色的全部聊天记录，请逐段浏览后整理出值得记住的内容。\n\n' + msgs + '\n\n请输出带【类别】前缀的记忆条目，用 | 分隔。没有值得记的就只输出"无"。' }
        ],
        max_tokens: 300,
        temperature: 0.3
      })
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) return alert('总结失败：' + (data.error && data.error.message || res.status));
    var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    if (!text) return alert('没有总结出内容。');
    var lines = text.split(/[|\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s && s !== '无'; });
    if (!lines.length) return alert('AI 认为没有值得记录的信息。');
    var added = 0;
    lines.forEach(function(raw) {
      var pm = parseMemoryLine(raw);
      if (!pm.text) return;
      if (!Array.isArray(char.memories)) char.memories = [];
      if (isMemoryFluff(pm.text)) return;
      var norm = pm.text.replace(/[。，、！？!?.,\s]/g, '');
      var dup = char.memories.some(function(m) { return m.text.replace(/[。，、！？!?.,\s]/g, '') === norm; });
      if (dup) return;
      char.memories.unshift({ id: 'mem-' + Date.now() + '-' + Math.floor(Math.random() * 1000), title: pm.title, text: pm.text, date: new Date().toLocaleString() });
      added++;
    });
    if (char.memories.length > 50) char.memories.length = 50;
    saveState();
    renderSettingsMemories();
    alert(added ? '已加入 ' + added + ' 条记忆。' : '没有新增记忆（内容已存在）。');
  } catch (e) {
    if (e.name === 'AbortError') alert('总结超时，请重试。');
    else alert('总结失败：' + (e.message || e));
  } finally {
    clearTimeout(tmr);
    if (btn) { btn.textContent = '✍️ 手动总结'; btn.style.opacity = ''; btn.disabled = false; }
  }
}

async function autoSaveMemory(char) {
  try {
    if (!char || char.autoMem === false) return;
    var cfg = (state.apiProfiles && state.activeApiProfile)
      ? state.apiProfiles.find(function(p) { return p.id === state.activeApiProfile; }) : null;
    cfg = cfg || state.api;
    if (!cfg || !cfg.key || !cfg.url || !cfg.model) return;
    var recent = (char.chat || []).slice(-(char.autoMemLen || 8)).filter(function(m) { return m.role !== 'system'; }).map(function(m) {
      return (m.role === 'user' ? '用户：' : (char.name + '：')) + (m.content || (m.media ? '[' + m.media.type + ']' : ''));
    }).join('\n');
    if (!recent) return;
    var ctrl = new AbortController();
    var tmr = setTimeout(function() { ctrl.abort(); }, 12000);
    try {
      var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: 'system', content: '你是从对话里整理"长期记忆"的书记员。请提取值得让角色永久记住的内容，分四类，越具体、越有画面感越好，不要写空话套话：\n【喜好】用户的真实喜好、厌恶、习惯、小怪癖、饮食偏好\n【约定】两人之间具体的约定、计划、承诺、还没做完的事\n【心情】这段对话里真实的情绪事件——用户当下的状态、角色为TA做的事、一个温情的瞬间、一个梗/笑点。只要是有具体情景的就值得记，不要只写"感情好"这种没有事实的空话\n【角色】角色对用户的印象与小心思（TA 观察到用户什么、暗暗记着要为用户做什么）\n规则：每条必须有具体信息量，严禁"互相想念""感情很好"这类没有事实的空话；每条一句话，开头带【类别】前缀；最多 6 条，用竖线 | 分隔；尽量多记，没内容的类别可跳过；只输出条目，不要其它说明。' },
            { role: 'user', content: '对话如下：\n' + recent + '\n\n请输出带【类别】前缀的记忆条目，用 | 分隔。没有值得记的就只输出"无"。' }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });
      var data = await res.json().catch(function() { return {}; });
      if (!res.ok) return;
      var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
      if (!text) return;
       var lines = text.split(/[|\n]+/).map(function(s) { return s.trim(); }).filter(function(s) { return s && s !== '无'; });
       if (!lines.length) return;
       var changed = false;
       lines.forEach(function(raw) {
         var pm = parseMemoryLine(raw);
         if (!pm.text) return;
         if (!Array.isArray(char.memories)) char.memories = [];
         if (isMemoryFluff(pm.text)) return;
         var norm = pm.text.replace(/[。，、！？!?.,\s]/g, '');
         var dup = char.memories.some(function(m) { return m.text.replace(/[。，、！？!?.,\s]/g, '') === norm; });
         if (dup) return;
         char.memories.unshift({ id: 'mem-' + Date.now() + '-' + Math.floor(Math.random() * 1000), title: pm.title, text: pm.text, date: new Date().toLocaleString() });
         changed = true;
       });
      if (char.memories.length > 50) char.memories.length = 50;
      if (changed) saveState();
    } finally {
      clearTimeout(tmr);
    }
  } catch (e) {}
}
function togglePin() { state.settings.pinned = !state.settings.pinned; saveState(); $('pinSwitch').classList.toggle('on', state.settings.pinned); }
function toggleAutoPost() {
  var char = activeCharacter();
  if (!char) return;
  char.autoPost = !char.autoPost;
  saveState();
  $('autoPostSwitch').classList.toggle('on', char.autoPost);
}
function setCharLang(val) {
  var char = activeCharacter();
  if (!char) return;
  char.lang = val;
  saveState();
}
function setChatMode(val) {
  var char = activeCharacter();
  if (!char) return;
  char.mode = val === 'online' ? 'online' : 'offline';
  saveState();
}
function toggleTimeAware() {
  var char = activeCharacter();
  if (!char) return;
  char.timeAware = !char.timeAware;
  saveState();
  $('timeAwareSwitch').classList.toggle('on', char.timeAware);
  if (char.timeAware && !$('myZoneSelect').value) $('myZoneSelect').value = 'Asia/Shanghai';
}
function setMyZone(val) {
  var char = activeCharacter();
  if (!char) return;
  char.myZone = val || '';
  saveState();
}
function setCharZone(val) {
  var char = activeCharacter();
  if (!char) return;
  char.charZone = val || '';
  saveState();
}
function toggleTranslate() {
  var char = activeCharacter();
  if (!char) return;
  char.translate = !char.translate;
  saveState();
  $('translateSwitch').classList.toggle('on', char.translate);
}
var KEYED_PROVIDERS = { deepl: 'DeepL API Key（Free 版以 :fx 结尾）', bing: '微软翻译 Key', modernmt: 'ModernMT API Key', papago: 'Papago：客户端ID|客户端密钥' };

function updateTranslateKeyUI() {
  var sel = $('translateProviderSelect');
  var provider = sel ? sel.value : 'deeplweb';
  var row = $('translateKeyRow');
  var input = $('translateKeyInput');
  var label = $('translateKeyLabel');
  var hint = $('translateKeyHint');
  var keyed = KEYED_PROVIDERS[provider];
  if (row) row.style.display = keyed ? 'flex' : 'none';
  if (label) label.textContent = keyed ? (provider === 'papago' ? 'Papago 密钥' : '密钥') : '密钥';
  if (input) {
    input.placeholder = keyed ? KEYED_PROVIDERS[provider] : '该平台免密，不用填';
    var keys = (state.settings && state.settings.translateKeys) || {};
    input.value = keys[provider] || '';
  }
  if (hint) hint.style.display = keyed ? '' : 'none';
}

function setTranslateProvider(val) {
  state.settings.translateProvider = val || 'deeplweb';
  saveState();
  updateTranslateKeyUI();
}
function setTranslateKey(val) {
  var sel = $('translateProviderSelect');
  var provider = sel ? sel.value : 'deeplweb';
  state.settings.translateKeys = state.settings.translateKeys || {};
  state.settings.translateKeys[provider] = (val || '').trim();
  saveState();
}
function setBubbleStyle(val) {
  state.settings.bubbleStyle = val || 'default';
  saveState();
  applyBubbleStyle();
}
function applyBubbleStyle() {
  var cw = $('chatWindow');
  if (!cw) return;
  var s = state.settings.bubbleStyle || 'default';
  cw.classList.remove('bubble-style-default', 'bubble-style-cute', 'bubble-style-warm', 'bubble-style-dark', 'bubble-style-ig', 'bubble-style-glow', 'bubble-style-comic');
  cw.classList.add('bubble-style-' + s);
  var sel = $('bubbleStyleSelect');
  if (sel) sel.value = s;
}
async function clearHistory() {
  if (!await uiConfirm('清空聊天记录？')) return;
  activeCharacter().chat = [];
  saveState();
  renderChat();
  closeSettings();
}

// ===== 面板控制 =====
function toggleMore() { togglePanel('morePanel'); }
function toggleEmoji() { togglePanel('emojiPanel'); }

// ===== 快捷操作 =====
function sendRed() {
  showRedPacketDialog();
}

function showRedPacketDialog() {
  hidePanels();
  const overlay = document.createElement('div');
  overlay.id = 'rpOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease';
  overlay.innerHTML = `
    <div class="rp-dialog">
      <div class="rp-dialog-header">
        <span class="rp-dialog-title">发红包</span>
        <button class="rp-dialog-close" onclick="document.getElementById('rpOverlay').remove()">✕</button>
      </div>
      <div class="rp-amount-presets">
        ${[1,2,5.2,6.66,8.88,13.14,52,99].map(n =>
          `<button class="rp-preset-btn" data-amount="${n}" onclick="selectRpAmount(this)">${n.toFixed(n%1?2:0)}<span class="rp-unit">元</span></button>`
        ).join('')}
      </div>
      <div class="rp-custom-row">
        <span class="rp-label">金额</span>
        <div class="rp-input-wrap">
          <span class="rp-currency">¥</span>
          <input type="number" id="rpCustomAmount" class="rp-input" step="0.01" min="0.01" max="999" placeholder="0.00" oninput="onRpAmountInput(this.value)">
        </div>
      </div>
      <div class="rp-note-row">
        <span class="rp-label">附言</span>
        <input type="text" id="rpNote" class="rp-note-input" placeholder="恭喜发财" maxlength="20">
      </div>
      <div class="rp-balance-row">
        余额 <b id="rpBalanceDisplay">${(state.profile.wallet || 0).toFixed(2)}</b> 元
      </div>
      <button class="rp-send-btn" id="rpSendBtn" onclick="confirmRedPacket()" disabled>塞进红包</button>
    </div>`;
  document.body.appendChild(overlay);
}

function selectRpAmount(btn) {
  document.querySelectorAll('.rp-preset-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('rpCustomAmount').value = '';
  document.getElementById('rpSendBtn').disabled = false;
  document.getElementById('rpSendBtn')._amount = parseFloat(btn.dataset.amount);
}

function onRpAmountInput(val) {
  document.querySelectorAll('.rp-preset-btn').forEach(b => b.classList.remove('active'));
  const num = parseFloat(val);
  document.getElementById('rpSendBtn').disabled = !(val && num > 0);
  if (val && num > 0) {
    document.getElementById('rpSendBtn')._amount = num;
  }
}

function confirmRedPacket() {
  const btn = document.getElementById('rpSendBtn');
  const amount = btn._amount;
  if (!amount || amount <= 0) return alert('请输入金额');
  const note = document.getElementById('rpNote').value.trim() || '恭喜发财';
  const wallet = state.profile.wallet || 0;
  if (amount > wallet) return alert('余额不足');
  state.profile.wallet = +(wallet - amount).toFixed(2);
  const msg = {
    role: 'user',
    type: 'redpacket',
    amount: amount,
    note: note,
    content: '[红包] ' + note + '：' + amount.toFixed(2) + '元',
    opened: true,
    status: 'sent',
    time: new Date().toLocaleString()
  };
  activeCharacter().chat.push(msg);
  saveState();
  if (window.addLedgerQuick) addLedgerQuick(-amount, '聊天红包：' + note, false);
  renderChat();
  document.getElementById('rpOverlay').remove();
  hidePanels();
}

function openRedPacket(charId, msgIndex) {
  const char = getCharacter(charId);
  const msg = char.chat[msgIndex];
  if (!msg || msg.type !== 'redpacket' || msg.opened) return;
  msg.opened = true;
  saveState();
  renderChat();
  const el = document.querySelector(`.rp-msg-${msgIndex}`);
  if (el) {
    el.classList.add('rp-opening');
    setTimeout(() => el.classList.remove('rp-opening'), 600);
  }
}

function sendAIRedPacket(amount, note) {
  const amt = amount || parseFloat((Math.random() * 10 + 0.5).toFixed(2));
  const nt = note || '';
  const msg = {
    role: 'assistant',
    type: 'redpacket',
    amount: amt,
    note: nt,
    content: nt ? '[红包] ' + nt + '：' + amt.toFixed(2) + '元' : '[红包] ' + amt.toFixed(2) + '元',
    opened: false,
    time: new Date().toLocaleString()
  };
  activeCharacter().chat.push(msg);
  saveState();
  renderChat();
}

function inviteStudy() {
  const char = activeCharacter();
  closeChat();
  if (window.openApp) openApp('自习');
  state.study.companion = true;
  if (char) state.study.companionRoleId = char.id;
  if (!state.study.companionMsg) {
    const pool = ['我陪你一起专注，開始吧～', '加油，我就在这儿。', '我在呢，放心。'];
    const prefix = char && char.name && char.name !== '未命名角色' ? char.name + '：' : '';
    state.study.companionMsg = prefix + pool[Math.floor(Math.random() * pool.length)];
  }
  saveState();
  if (window.renderStudy) renderStudy();
}

// ===== 发送真实照片（文件选择） =====
function openAlbumPicker() {
  hidePanels();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const dataUrl = ev.target.result;
      appendBubble('user', '[图片]', { type: 'image', src: dataUrl });
      saveState();
    };
    reader.readAsDataURL(file);
    input.value = '';
  };
  input.click();
}

// ===== 拍摄 =====
function startCapture() {
  hidePanels();
  const overlay = document.createElement('div');
  overlay.id = 'captureOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:#111">
      <video id="captureVideo" autoplay playsinline style="width:100%;height:100%;object-fit:contain"></video>
      <img id="capturePreview" style="display:none;width:100%;height:100%;object-fit:contain">
      <canvas id="captureCanvas" style="display:none"></canvas>
    </div>
    <div id="captureActions" style="display:flex;align-items:center;justify-content:space-evenly;padding:20px 0 40px;background:#111">
      <button id="captureCancelBtn" style="border:none;background:transparent;color:#fff;font-size:14px;cursor:pointer;padding:8px 16px">取消</button>
      <button id="captureBtn" style="width:64px;height:64px;border-radius:50%;border:4px solid #fff;background:transparent;cursor:pointer;position:relative"><div style="position:absolute;inset:4px;border-radius:50%;background:#fff"></div></button>
      <span style="width:60px"></span>
    </div>
    <div id="captureConfirm" style="display:none;align-items:center;justify-content:space-evenly;padding:20px 0 40px;background:#111">
      <button id="retakeBtn" style="border:none;background:#333;color:#fff;padding:10px 24px;border-radius:12px;font-size:14px;cursor:pointer">重拍</button>
      <button id="sendPhotoBtn" style="border:none;background:#3897f0;color:#fff;padding:10px 28px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">发送</button>
    </div>`;
  document.body.appendChild(overlay);
  let stream = null;
  let photoDataUrl = null;
  const video = document.getElementById('captureVideo');
  const preview = document.getElementById('capturePreview');
  const cancelBtn = document.getElementById('captureCancelBtn');
  const captureBtn = document.getElementById('captureBtn');
  const retakeBtn = document.getElementById('retakeBtn');
  const sendBtn = document.getElementById('sendPhotoBtn');
  const actionsArea = document.getElementById('captureActions');
  const confirmArea = document.getElementById('captureConfirm');
  function stopStream() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
  function closeOverlay() { stopStream(); overlay.remove(); }
  function showViewfinder() {
    video.style.display = 'block';
    preview.style.display = 'none';
    actionsArea.style.display = 'flex';
    confirmArea.style.display = 'none';
  }
  function showPreview(dataUrl) {
    video.style.display = 'none';
    preview.src = dataUrl;
    preview.style.display = 'block';
    actionsArea.style.display = 'none';
    confirmArea.style.display = 'flex';
  }
  cancelBtn.onclick = closeOverlay;
  retakeBtn.onclick = () => {
    photoDataUrl = null;
    showViewfinder();
    if (!stream) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(s => {
        stream = s; video.srcObject = s;
      }).catch(() => { overlay.remove(); alert('无法打开摄像头'); });
    }
  };
  sendBtn.onclick = () => {
    if (!photoDataUrl) return;
    closeOverlay();
    appendBubble('user', '[拍摄]', { type: 'image', src: photoDataUrl });
    saveState();
  };
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(s => {
    stream = s; video.srcObject = s;
  }).catch(() => {
    overlay.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#999;font-size:14px"><span style="font-size:48px;margin-bottom:10px">📷</span>无法访问摄像头</div><div style="padding:20px 0 40px;text-align:center"><button onclick="document.getElementById('captureOverlay').remove()" style="border:none;background:#333;color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer">关闭</button></div>`;
    return;
  });
  captureBtn.onclick = () => {
    if (!stream) return;
    const canvas = document.getElementById('captureCanvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    stopStream();
    showPreview(photoDataUrl);
  };
}

/* ===== 通话功能 ===== */
function startCall(type) {
  if (!type) type = 'video';
  const char = activeCharacter();
  if (!char) return;
  const old = document.getElementById('callOverlay');
  if (old) old.remove();
  const pb = document.querySelector('.phone');
  if (!pb) return;
  const overlay = document.createElement('div');
  overlay.id = 'callOverlay';
  overlay.className = 'call-overlay' + (type === 'video' ? ' call-video-overlay' : '');
  const avatar = char.avatar || 'https://img.facfox.com/imgs/2026/07/19/ea51598f7d0459ee.jpg';
  const label = type === 'video' ? '📹 视频呼叫' : '📞 语音呼叫';
  const actionsHtml = '<button class="call-btn call-btn-mute" id="callMuteBtn" onclick="toggleMute()">🔇</button><button class="call-btn call-btn-end" id="callEndBtn" onclick="endCall()">✕</button><button class="call-btn" id="callSpeakerBtn" onclick="toggleSpeaker()">🔊</button>';
  const selfVideo = '<video id="callSelfVideo" autoplay playsinline muted style="display:none"></video>';
  const tail = `<div class="call-mic-badge" id="callMicBadge" style="display:none">🎙 通话中</div><div class="call-caption" id="callCaption"></div><div class="call-actions">${actionsHtml}</div><div class="call-input-row"><input id="callInput" class="call-input" placeholder="说点什么…" onkeydown="if(event.key==='Enter')callSend()"><button class="call-send" onclick="callSend()">发送</button></div>`;
  if (type === 'video') {
    overlay.innerHTML = `<div class="call-video" style="background-image:url('${escapeHTML(avatar)}')"><div class="call-self">${selfVideo}<span class="call-self-ph">📷</span></div></div><div class="call-name">${escapeHTML(char.name)}</div><div class="call-status" id="callStatus">${label}</div><div class="call-timer" id="callTimer"></div>${tail}`;
  } else {
    overlay.innerHTML = `<div class="call-avatar" style="background-image:url('${escapeHTML(avatar)}')"></div><div class="call-name">${escapeHTML(char.name)}</div><div class="call-status" id="callStatus">${label}</div><div class="call-timer" id="callTimer"></div>${tail}`;
  }
  pb.appendChild(overlay);
  state.call = state.call || {};
  state.call.type = type;
  state.call.active = false;
  state.call.muted = false;
  state.call.speaker = false;
  state.call.ended = false;
  state.call._t = [];
  overlay.classList.add('call-ringing');
  const statusEl = document.getElementById('callStatus');
  if (statusEl) statusEl.textContent = (type === 'video' ? '📹 视频呼叫中…' : '📞 语音呼叫中…');
  const stage1 = setTimeout(function() {
    if (state.call.ended) return;
    if (Math.random() < 0.18) {
      const s = document.getElementById('callStatus');
      if (s) s.textContent = '暂时无法接听';
      showCallCaption('（对方好像在忙，没接起来）');
      const t = setTimeout(function() { if (!state.call.ended) endCall('未接听'); }, 2600);
      state.call._t.push(t);
      return;
    }
    const s2 = document.getElementById('callStatus');
    if (s2) s2.textContent = '已接听';
    const t2 = setTimeout(function() {
      if (state.call.ended) return;
      overlay.classList.remove('call-ringing');
      const s3 = document.getElementById('callStatus');
      if (s3) s3.textContent = '通话中';
      state.call.startTime = Date.now();
      state.call.active = true;
      updateCallTimer();
      attachCallMedia(type);
      callGenerateReply('');
    }, 700);
    state.call._t.push(t2);
  }, 1500 + Math.random() * 2000);
  state.call._t.push(stage1);
}

function attachCallMedia(type) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showCallCaption('（这浏览器不支持摄像头，纯文字通话）');
    return;
  }
  const constraints = type === 'video' ? { video: true, audio: true } : { audio: true };
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    if (state.call.ended) { stream.getTracks().forEach(function(t) { t.stop(); }); return; }
    state.call.stream = stream;
    if (type === 'video') {
      const v = document.getElementById('callSelfVideo');
      if (v) { v.srcObject = stream; v.style.display = 'block'; const ph = document.querySelector('.call-self-ph'); if (ph) ph.style.display = 'none'; }
    } else {
      const b = document.getElementById('callMicBadge');
      if (b) b.style.display = '';
    }
  }).catch(function() {
    const cap = document.getElementById('callCaption');
    if (cap && !cap.textContent) showCallCaption('（没开摄像头/麦克风，纯文字通话）');
  });
}

function callGenerateReply(userText) {
  const char = activeCharacter();
  if (!char) return;
  const st = document.getElementById('callStatus');
  if (st) st.textContent = state.call && state.call.type === 'video' ? '视频通话中…' : '语音通话中…';
  if (!state.api.key || !state.api.url || !state.api.model) {
    if (st) st.textContent = '通话中（未连 AI）';
    appendBubble('system', '（通话已接通，但还没连 AI，去设置里连接一下吧）');
    return;
  }
  _manualAICall = true;
  setChatTyping(true);
  callAI(userText || '', false, !userText).then(async function(reply) {
    const fallback = userText
      ? '嗯。'
      : (state.call && state.call.type === 'video' ? '嘿，看到你啦～' : '喂？听得到吗？');
    const raw = reply || fallback;
    const wantsEnd = /（挂断）|\(挂断\)/.test(raw);
    const line = raw.replace(/（挂断）|\(挂断\)/g, '').trim() || fallback;
    await deliverReply(line);
    showCallCaption(line);
    const s2 = document.getElementById('callStatus');
    if (s2 && !state.call.ended) s2.textContent = '通话中';
    if (wantsEnd && !state.call.ended) {
      setTimeout(function() { if (!state.call.ended) endCall(); }, 1500);
    }
  }).catch(function(err) {
    appendBubble('system', '（暂时没回应：' + (err && err.message || err) + '）');
  }).finally(function() { setChatTyping(false); });
}

function callSend() {
  const input = document.getElementById('callInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  appendBubble('user', text);
  touchActiveChar();
  callGenerateReply(text);
}

function showCallCaption(line) {
  const cap = document.getElementById('callCaption');
  if (cap) { cap.textContent = line || ''; cap.style.display = line ? '' : 'none'; }
}

function updateCallTimer() {
  if (!state.call || !state.call.active) return;
  const t = document.getElementById('callTimer');
  if (!t) return;
  const elapsed = Math.floor((Date.now() - state.call.startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  t.textContent = m + ':' + s;
  requestAnimationFrame(updateCallTimer);
}

function endCall(reason) {
  if (state.call && state.call._t) { state.call._t.forEach(clearTimeout); }
  if (state.call && state.call.stream) {
    try { state.call.stream.getTracks().forEach(function(t) { t.stop(); }); } catch (e) {}
    state.call.stream = null;
  }
  const wasActive = state.call && state.call.active;
  if (state.call) { state.call.active = false; state.call.ended = true; }
  const overlay = document.getElementById('callOverlay');
  if (overlay) {
    if (wasActive && reason !== '未接听') {
      const s = document.getElementById('callStatus');
      if (s) s.textContent = '通话结束';
      setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 800);
    } else {
      overlay.remove();
    }
  }
  if (wasActive) {
    const char = activeCharacter();
    if (char) {
      const dur = state.call && state.call.startTime ? Math.floor((Date.now() - state.call.startTime) / 1000) : 0;
      const m = Math.floor(dur / 60);
      const s = dur % 60;
      const msg = m > 0 ? '（通话结束 ' + m + '分' + s + '秒）' : '（通话结束 ' + s + '秒）';
      appendBubble('system', msg);
    }
  }
}

function toggleMute() {
  if (!state.call) state.call = {};
  state.call.muted = !state.call.muted;
  const btn = document.getElementById('callMuteBtn');
  if (btn) { btn.classList.toggle('active'); btn.textContent = state.call.muted ? '🔇' : '🎤'; }
  if (btn) btn.style.borderColor = state.call.muted ? 'var(--ink)' : '';
}

function toggleSpeaker() {
  if (!state.call) state.call = {};
  state.call.speaker = !state.call.speaker;
  const btn = document.getElementById('callSpeakerBtn');
  if (btn) { btn.classList.toggle('active'); btn.textContent = state.call.speaker ? '🔊' : '🔈'; }
  if (btn) btn.style.borderColor = state.call.speaker ? 'var(--ink)' : '';
}

var _voiceRec = null;
var _voiceHoldTimer = null;
var _voiceMediaRecorder = null;
var _voiceChunks = [];

function toggleVoice() {
  var R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) { alert('当前浏览器不支持语音识别'); return; }
  if (_voiceRec) { stopVoice(); return; }
  hidePanels();
  var btn = document.getElementById('voiceBtn');
  if (btn) btn.textContent = '🔴';
  var recognition = new R();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  var input = document.getElementById('chatInput');
  var finalText = input ? input.value : '';
  recognition.onresult = function(e) {
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
    }
    if (input) input.value = finalText;
  };
  recognition.onerror = function() { stopVoice(); };
  recognition.onend = function() { _voiceRec = null; var b = document.getElementById('voiceBtn'); if (b) b.textContent = '🎤'; };
  try { recognition.start(); _voiceRec = recognition; } catch (e) { alert('语音启动失败'); }
}

function stopVoice() {
  if (_voiceRec) { try { _voiceRec.stop(); } catch(e) {} _voiceRec = null; }
  var btn = document.getElementById('voiceBtn');
  if (btn) btn.textContent = '🎤';
}

// 长按发语音条
function voiceTouchStart() {
  if (_voiceRec) return;
  window._voiceWasHold = false;
  _voiceHoldTimer = setTimeout(function() {
    _voiceHoldTimer = null;
    window._voiceWasHold = true;
    startVoiceRecord();
  }, 300);
}

function voiceTouchEnd() {
  if (_voiceHoldTimer) { clearTimeout(_voiceHoldTimer); _voiceHoldTimer = null; window._voiceWasHold = false; return; }
  if (_voiceMediaRecorder) { stopVoiceRecord(); }
}

function startVoiceRecord() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { alert('不支持录音'); return; }
  var btn = document.getElementById('voiceBtn');
  if (btn) { btn.textContent = '⏺'; btn.style.color = '#e53935'; }
  var input = document.getElementById('chatInput');
  if (input) input.placeholder = '🎤 录音中... 松开发送';
  _voiceChunks = [];
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    var recorder = new MediaRecorder(stream);
    recorder.ondataavailable = function(e) { if (e.data.size > 0) _voiceChunks.push(e.data); };
    recorder.onstop = function() {
      stream.getTracks().forEach(function(t) { t.stop(); });
      var blob = new Blob(_voiceChunks, { type: 'audio/webm' });
      if (blob.size > 0) sendVoiceMessage(blob);
    };
    recorder.start();
    _voiceMediaRecorder = recorder;
  }).catch(function() { alert('无法访问麦克风'); });
}

function stopVoiceRecord() {
  if (_voiceMediaRecorder) {
    try { _voiceMediaRecorder.stop(); } catch(e) {}
    _voiceMediaRecorder = null;
  }
  var btn = document.getElementById('voiceBtn');
  if (btn) { btn.textContent = '🎤'; btn.style.color = ''; }
  var input = document.getElementById('chatInput');
  if (input) input.placeholder = '发消息...';
}

function sendVoiceMessage(blob) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var dataUrl = ev.target.result;
    appendBubble('user', '[语音消息]', { type: 'audio', src: dataUrl });
    saveState();
  };
  reader.readAsDataURL(blob);
}

// ===== ① 空闲主动找话 =====
// 用户超过 idleMin 分钟没发消息 → 角色主动发一条
let _idleMin = 6;          // 默认多久没人说话算"冷场"（分钟），越短越黏人
let _idleCooldown = 12;    // 主动发完之后至少冷却多少分钟
let _lastProactiveTs = 0;
let _lastProactiveCharId = '';
let _idleMsgTimes = {};    // 每个角色上次主动消息时间

function startIdleProactive() {
  if (_idleProactiveTimer) return;
  _idleProactiveTimer = setInterval(idleProactiveTick, 30000);
}

function idleProactiveTick() {
  if (typeof state === 'undefined' || !state) return;
  if (!state.api.key || !state.api.url || !state.api.model) return;
  if (typeof willowBlocksProactive === 'function' && willowBlocksProactive()) return;
  var chars = state.roles || [];
  var now = Date.now();
  for (var i = 0; i < chars.length; i++) {
    var char = chars[i];
    if (!char) continue;
    if (char.idleProactive === false) continue;
    if (char.chat && char.chat.length === 0) continue;
    // 找最后一条用户消息时间
    var lastUserTs = 0;
    for (var j = char.chat.length - 1; j >= 0; j--) {
      var m = char.chat[j];
      if (m.role === 'user') { lastUserTs = m.ts || Date.parse(m.time || ''); break; }
    }
    if (!lastUserTs || isNaN(lastUserTs)) continue;
    var idle = (now - lastUserTs) / 60000;
    if (idle < _idleMin) continue;
    var lastPro = _idleMsgTimes[char.id] || 0;
    if ((now - lastPro) / 60000 < _idleCooldown) continue;
    // 用户正在聊天窗口里（不管和谁）时不插话
    var cw = document.getElementById('chatWindow');
    if (cw && cw.classList.contains('open')) continue;
    if (chatTyping) continue;
    // 触发主动消息
    _idleMsgTimes[char.id] = now;
    fireProactive(char);
    return; // 每次 tick 只发一个角色，避免刷屏
  }
}

function fireProactive(char) {
  _manualAICall = true;
  setChatTyping(true);
  callAI('', false, true, char).then(function(reply) {
    setChatTyping(false);
    var txt = reply || '……';
    var trans = null;
    if (char.translate && char.lang && char.lang !== '中文') {
      var cleanText = txt.replace(/[（(][^）)]*[）)]/g, '').trim();
      if (cleanText) trans = translateText(cleanText, char.lang).catch(function() { return null; });
    }
    var msg = { role: 'assistant', content: txt, time: new Date().toLocaleString(), ts: Date.now() };
    if (trans) msg.translatedText = trans;
    if (!char.chat) char.chat = [];
    flushThinkBubble(char);
    char.chat.push(msg);
    char.unread = (char.unread || 0) + 1;
    char.read = true;
    var cw = document.getElementById('chatWindow');
    if (cw && (!cw.classList.contains('open') || state.activeRoleId !== char.id)) {
      showMsgNote(char.id, char.name, char.avatar, txt || '发来一条消息');
    }
    saveState();
    if (state.activeRoleId === char.id) renderChat();
  }).catch(function(err) {
    setChatTyping(false);
    if (err.name === 'AbortError') return;
    if (!char.chat) char.chat = [];
    char.chat.push({ role: 'system', content: '（' + char.name + ' 想找你，但信号不太好。）', time: new Date().toLocaleString(), ts: Date.now() });
    saveState();
    if (state.activeRoleId === char.id) renderChat();
  });
}

// 用户主动发消息时，重置空闲计时，避免刚聊完就"冷场"
function touchActiveChar() {
  var char = activeCharacter();
  if (!char) return;
  var cw = document.getElementById('chatWindow');
  var chatOpen = cw && cw.classList.contains('open');
  if (!chatOpen || !chatTyping) return;
  // 用户刚发了消息 → 该角色回到活跃状态，先不主动打扰
  var now = Date.now();
  if (_idleMsgTimes[char.id]) _idleMsgTimes[char.id] = now;
}

function setIdleParams(min, cooldown) {
  if (min && !isNaN(min) && min > 0) _idleMin = min;
  if (cooldown && !isNaN(cooldown) && cooldown > 0) _idleCooldown = cooldown;
}
