// ============================================================
// groupchat.js - 群聊 + 角色关系图谱
// ============================================================

let groupMode = false;
let groupMembers = [];
let groupMessages = [];
let groupTyping = {};
let groupTypingTimer = null;
let relationshipData = {};

// ====== 进群 ======
function openGroupChat(memberIds) {
  var chars;
  if (memberIds && memberIds.length >= 2) {
    chars = memberIds.map(function(id) { return getRole(id); }).filter(Boolean);
  } else {
    chars = state.roles.filter(function(r) { return r.id !== 'role-default' && r.id !== state.activeRoleId; });
  }
  if (chars.length < 2) {
    quickNotice('至少需要 2 个角色才能创建群聊');
    return;
  }
  groupMode = true;
  groupMembers = [state.activeRoleId].concat(chars.map(function(r) { return r.id; }));
  groupMessages = [];
  groupTyping = {};
  relationshipData = loadRelationships();
  var cs = $('chatSettings'); if (cs) cs.classList.remove('open');
  renderGroupChat();
  $('chatWindow').classList.add('open');
  $('chatWindow').classList.add('group-skin');
  $('chatName').innerText = '群聊';
  $('chatRel').innerText = chars.length + ' 人在线';
  $('sendBtn').style.display = '';
  // 群成员按钮
  var hdr = $('chatWindow').querySelector('.chat-header > div:last-child');
  if (hdr && !$('groupMemberBtn')) {
    var btn = document.createElement('button');
    btn.className = 'icon-btn'; btn.id = 'groupMemberBtn';
    btn.title = '群成员'; btn.textContent = '👥';
    btn.onclick = function() { toggleGroupPanel(); };
    hdr.insertBefore(btn, hdr.firstChild);
  }
  // 退出群聊按钮
  var backBtn = $('chatWindow').querySelector('.header-action');
  if (backBtn) {
    backBtn.setAttribute('onclick', '');
    backBtn.onclick = function() { closeGroupChat(); };
  }
}

// ====== 退群 ======
function closeGroupChat() {
  groupMode = false;
  groupMembers = [];
  groupMessages = [];
  groupTyping = {};
  clearTimeout(groupTypingTimer);
  $('chatWindow').classList.remove('group-skin');
  var gbtn = $('groupMemberBtn'); if (gbtn) gbtn.remove();
  var gp = $('groupPanel'); if (gp) gp.style.display = 'none';
  var rp = $('relationshipPanel'); if (rp) rp.style.display = 'none';
  // 恢复返回键
  var backBtn = $('chatWindow').querySelector('.header-action');
  if (backBtn) { backBtn.setAttribute('onclick', 'closeChat()'); backBtn.onclick = null; }
  closeChat();
}

// ====== 渲染聊天消息 ======
function renderGroupChat() {
  if (!groupMode) return;
  var body = $('chatBody');
  if (!body) return;
  var userProf = state.profiles.find(function(p) { return p.id === state.activeProfileId; }) || {};
  var html = '';
  (groupMessages || []).forEach(function(msg) {
    var isUser = msg.role === 'user';
    var member = getRole(msg.charId);
    var name, av;
    if (isUser) {
      name = userProf.name || '我';
      av = userProf.avatar || '';
    } else {
      name = member ? member.name : '未知';
      av = member ? member.avatar : '';
    }
    if (isUser) {
      html += '<div class="msg right">' +
        '<div class="bubble right">' + escapeHTML(msg.content || '') + '</div>' +
        '<div class="msg-sender">' + escapeHTML(name) + '</div>' +
      '</div>';
    } else {
      html += '<div class="msg left">' +
        '<div class="avatar">' + renderAvatar(av, name) + '</div>' +
        '<div class="bubble-col">' +
          '<div class="msg-sender">' + escapeHTML(name) + '</div>' +
          '<div class="bubble left">' + escapeHTML(msg.content || '') + '</div>' +
        '</div>' +
      '</div>';
    }
  });
  // 打字指示器
  var typingKeys = Object.keys(groupTyping).filter(function(k) { return groupTyping[k]; });
  if (typingKeys.length) {
    var tName = (getRole(typingKeys[0]) || {}).name || '有人';
    html += '<div class="msg left">' +
      '<div class="avatar">' + renderAvatar('', tName) + '</div>' +
      '<div class="bubble-col">' +
        '<div class="msg-sender">' + escapeHTML(tName) + '</div>' +
        '<div class="bubble left typing"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>' +
      '</div>' +
    '</div>';
  }
  body.innerHTML = html;
  body.scrollTop = body.scrollHeight;
}

// ====== 打字中指示器 ======
function setGroupTyping(charId, val) {
  groupTyping[charId] = val;
  renderGroupChat();
}

// ====== 成员面板 ======
function toggleGroupPanel() {
  var panel = $('groupPanel');
  if (panel && panel.style.display !== 'none') {
    panel.style.display = 'none';
    return;
  }
  renderGroupPanel();
}

function renderGroupPanel() {
  var panel = $('groupPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'groupPanel';
    panel.className = 'group-panel';
    var overlay = document.createElement('div');
    overlay.className = 'group-panel-overlay';
    overlay.onclick = function() { panel.style.display = 'none'; };
    panel.appendChild(overlay);
    var sheet = document.createElement('div');
    sheet.className = 'group-panel-sheet';
    sheet.id = 'groupPanelSheet';
    panel.appendChild(sheet);
    document.body.appendChild(panel);
  }
  panel.style.display = 'flex';
  var members = groupMembers.map(function(id) { return getRole(id); }).filter(Boolean);
  var sheet = $('groupPanelSheet');
  if (!sheet) return;
  sheet.innerHTML =
    '<div class="group-panel-header">' +
      '<h3>群聊成员 (' + members.length + ')</h3>' +
      '<button class="group-close-btn" onclick="$("groupPanel").style.display=\'none\'">✕</button>' +
    '</div>' +
    '<div class="group-panel-members">' +
      members.map(function(m) {
        var rel = relationshipData[m.id] || {};
        var isYou = m.id === state.activeRoleId;
        return '<div class="group-member-card">' +
          '<div class="avatar">' + renderAvatar(m.avatar, m.name) + '</div>' +
          '<div class="group-member-info">' +
            '<div class="group-member-name">' + escapeHTML(m.name) + (isYou ? ' (我)' : '') + '</div>' +
            '<div class="group-member-rel">' + (rel.label || '好友') + (rel.weight ? ' · 亲密度 ' + rel.weight : '') + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>';
}

// ====== 发消息 ======
function sendGroupMessage() {
  var input = $('chatInput');
  var text = input ? input.value.trim() : '';
  if (!text) return;
  var msg = { role: 'user', charId: state.activeRoleId, content: text, time: new Date().toLocaleString(), ts: Date.now() };
  groupMessages.push(msg);
  if (input) input.value = '';
  hidePanels();
  renderGroupChat();
  saveGroupMessages();
  // AI 回复
  var aiMembers = groupMembers.filter(function(id) { return id !== state.activeRoleId; });
  if (aiMembers.length) {
    var randChar = aiMembers[Math.floor(Math.random() * aiMembers.length)];
    setGroupTyping(randChar, true);
    groupTypingTimer = setTimeout(function() {
      generateGroupReply();
    }, 1200 + Math.random() * 1500);
  }
}

// ====== AI 回复 ======
async function generateGroupReply() {
  var aiMembers = groupMembers.filter(function(id) { return id !== state.activeRoleId; });
  if (!aiMembers.length) return;
  var memberNames = aiMembers.map(function(id) { return (getRole(id) || {}).name || '角色'; });
  // 每个角色的性格信息
  var charInfos = aiMembers.map(function(id) {
    var c = getRole(id);
    if (!c) return '';
    return c.name + (c.personality ? '(性格：' + c.personality.slice(0, 50) + ')' : '') +
           (c.relation ? '(关系：' + c.relation + ')' : '');
  }).join('、');
  var chatContext = (groupMessages || []).slice(-15).map(function(m) {
    var sender = getRole(m.charId);
    var name = m.role === 'user' ? ((state.profiles.find(function(p) { return p.id === state.activeProfileId; }) || {}).name || '我') : (sender ? sender.name : '未知');
    return name + ': ' + m.content;
  }).join('\n');
  var prompt = '你是一个群聊模拟器。现在有' + memberNames.length + '个角色在群聊中：' + charInfos + '。\n\n' +
    '聊天记录：\n' + chatContext + '\n\n' +
    '请选择一个最可能回复的角色（不要选用户），用该角色的口吻回复一条消息（15-60字），要符合该角色的性格。' +
    (typeof willowContextText === 'function' ? '\n\n' + willowContextText() : '') + '\n\n' +
    '请严格按以下JSON格式回复（不要输出其他内容）：\n{"name":"角色名","content":"回复内容"}';
  var cfg = resolveApiConfig(true);
  if (!cfg.key || !cfg.url || !cfg.model) {
    setGroupTyping(aiMembers[0], false);
    quickNotice('还没连上，先去设置里连接');
    return;
  }
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 15000);
    var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      signal: controller.signal,
      body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }], max_tokens: 150, temperature: 0.85 })
    });
    clearTimeout(timer);
    if (!res.ok) { setGroupTyping(aiMembers[0], false); return; }
    var data = await res.json().catch(function() { return {}; });
    var raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    // 解析JSON回复
    var replyName = '', replyContent = raw;
    try {
      var parsed = JSON.parse(raw);
      replyName = parsed.name || '';
      replyContent = parsed.content || raw;
    } catch(e) {
      // 解析失败，随机分配角色
      var fallback = aiMembers[Math.floor(Math.random() * aiMembers.length)];
      replyName = (getRole(fallback) || {}).name || '';
    }
    // 找到对应角色
    var charId = aiMembers[0];
    if (replyName) {
      var found = aiMembers.find(function(id) {
        var c = getRole(id);
        return c && c.name === replyName;
      });
      if (found) charId = found;
    } else {
      charId = aiMembers[Math.floor(Math.random() * aiMembers.length)];
    }
    setGroupTyping(charId, false);
    if (!replyContent) return;
    var msg = { role: 'assistant', charId: charId, content: replyContent, time: new Date().toLocaleString(), ts: Date.now() };
    groupMessages.push(msg);
    var c = getRole(charId); if (c) { c.unread = (c.unread || 0) + 1; c.read = true; }
    saveGroupMessages();
    renderGroupChat();
  } catch (e) {
    setGroupTyping(aiMembers[0], false);
    quickNotice('群聊回复失败');
  }
}

// ====== 群聊消息持久化 ======
function saveGroupMessages() {
  try { localStorage.setItem('groupchat.messages', JSON.stringify(groupMessages)); } catch(e) {}
}
function loadGroupMessages() {
  try { return JSON.parse(localStorage.getItem('groupchat.messages') || '[]'); } catch(e) { return []; }
}

// ====== 关系图谱 ======
function loadRelationships() {
  try { return JSON.parse(localStorage.getItem('groupchat.relationships') || '{}'); } catch(e) { return {}; }
}
function saveRelationships(data) {
  try { localStorage.setItem('groupchat.relationships', JSON.stringify(data)); } catch(e) {}
}
function setRel(charId, key, value) {
  if (!relationshipData[charId]) relationshipData[charId] = {};
  relationshipData[charId][key] = value;
  saveRelationships(relationshipData);
  renderRelationshipGraph();
}
function showMemberProfile(charId) {
  var char = getRole(charId);
  if (!char) return;
  var rel = relationshipData[charId] || {};
  quickNotice(char.name + ' · ' + (rel.label || '好友') + ' · 亲密度 ' + (rel.weight || 0) + (rel.note ? '\n' + rel.note : ''));
}
function renderRelationshipGraph() {
  var panel = $('relationshipPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'relationshipPanel';
    panel.className = 'relationship-panel';
    var overlay = document.createElement('div');
    overlay.className = 'relationship-overlay';
    overlay.onclick = function() { panel.style.display = 'none'; };
    panel.appendChild(overlay);
    var sheet = document.createElement('div');
    sheet.className = 'relationship-sheet';
    panel.appendChild(sheet);
    document.body.appendChild(panel);
  }
  panel.style.display = 'flex';
  var sheet = $('relationshipSheet');
  if (!sheet) return;
  var chars = state.roles.filter(function(r) { return r.id !== 'role-default'; });
  sheet.innerHTML =
    '<div class="relationship-header">' +
      '<h3>角色关系图谱</h3>' +
      '<button class="group-close-btn" onclick="$("relationshipPanel").style.display=\'none\'">✕</button>' +
    '</div>' +
    '<div class="relationship-canvas" id="relationshipCanvas">' +
      chars.map(function(c, i) {
        var angle = (i / chars.length) * Math.PI * 2 - Math.PI / 2;
        var x = 50 + Math.cos(angle) * 28;
        var y = 50 + Math.sin(angle) * 28;
        var rel = relationshipData[c.id] || {};
        return '<div class="rel-node" style="left:' + x + '%;top:' + y + '%" onclick="showMemberProfile(\'' + c.id + '\')" title="' + escapeHTML(c.name) + ' (' + (rel.label || '好友') + ')">' +
          '<div class="rel-avatar">' + renderAvatar(c.avatar, c.name) + '</div>' +
          '<div class="rel-name">' + escapeHTML(c.name) + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="relationship-editor">' +
      '<div class="rel-edit-title">编辑关系</div>' +
      chars.map(function(c) {
        var rel = relationshipData[c.id] || {};
        return '<div class="rel-edit-row">' +
          '<span>' + escapeHTML(c.name) + '</span>' +
          '<select onchange="setRel(\'' + c.id + '\',\'label\',this.value)">' +
            '<option value="好友"' + (rel.label === '好友' ? ' selected' : '') + '>好友</option>' +
            '<option value="恋人"' + (rel.label === '恋人' ? ' selected' : '') + '>恋人</option>' +
            '<option value="搭档"' + (rel.label === '搭档' ? ' selected' : '') + '>搭档</option>' +
            '<option value="家人"' + (rel.label === '家人' ? ' selected' : '') + '>家人</option>' +
            '<option value="对手"' + (rel.label === '对手' ? ' selected' : '') + '>对手</option>' +
            '<option value="陌生人"' + (rel.label === '陌生人' ? ' selected' : '') + '>陌生人</option>' +
          '</select>' +
          '<input type="range" min="0" max="5" value="' + (rel.weight || 0) + '" onchange="setRel(\'' + c.id + '\',\'weight\',this.value)" title="亲密度">' +
          '<span class="rel-weight-val">' + (rel.weight || 0) + '</span>' +
        '</div>';
      }).join('') +
    '</div>';
}

// ====== 暴露全局 ======
window.openGroupChat = openGroupChat;
window.closeGroupChat = closeGroupChat;
window.sendGroupMessage = sendGroupMessage;
window.generateGroupReply = generateGroupReply;
window.renderRelationshipGraph = renderRelationshipGraph;
window.renderGroupPanel = renderGroupPanel;
window.toggleGroupPanel = toggleGroupPanel;
window.setRel = setRel;

// ====== 群聊时间线自动记录 ======
setInterval(function() {
  if (!groupMode || !groupMessages.length) return;
  var last = groupMessages[groupMessages.length - 1];
  if (last.role === 'assistant') {
    if (typeof addTimelineEntry === 'function') {
      addTimelineEntry({ type: 'group_chat', role: last.role, charId: last.charId, content: last.content, mood: '' });
    }
    if (typeof autoSaveMemoryWithRAG === 'function') {
      autoSaveMemoryWithRAG(getRole(last.charId));
    }
  }
}, 5000);
