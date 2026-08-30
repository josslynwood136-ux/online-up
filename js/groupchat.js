// ============================================================
// groupchat.js - 群聊 + 角色关系图谱
// ============================================================

let groupMode = false;
let groupMembers = [];
let groupMessages = [];
let groupTyping = {};
let groupTypingTimer = null;
let relationshipData = {};
let groupName = '群聊';
let groupCreated = false;
let prevChatState = null;

// 表情面板
function toggleEmoji() { togglePanel('emojiPanel'); }

// @提及面板
function toggleAtPanel() {
  var panel = $('atPanel');
  if (panel.style.display !== 'none') {
    panel.style.display = 'none';
  } else {
    panel.style.display = 'flex';
  }
}

// 粘贴 @ 提及文本到输入框
function insertAt(username) {
  if ($('chatInput')) {
    var start = $('chatInput').selectionStart;
    var end = $('chatInput').selectionEnd;
    var text = $('chatInput').value;
    $('chatInput').value = text.substring(0, start) + '@' + username + ' ' + text.substring(end);
    $('chatInput').focus();
  }
}

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
  // 尝试恢复上次的群聊
  var savedInfo = null;
  try { savedInfo = JSON.parse(localStorage.getItem('groupchat.info') || 'null'); } catch(e) {}
  if (savedInfo && savedInfo.members && savedInfo.members.length >= 2) {
    groupName = savedInfo.name || '群聊';
    groupMembers = savedInfo.members;
    groupCreated = savedInfo.created || false;
  } else {
    groupMembers = [state.activeRoleId].concat(chars.map(function(r) { return r.id; }));
    showGroupCreator();
  }
  groupMode = true;
  groupTyping = {};
  relationshipData = loadRelationships();
  groupMessages = loadGroupMessages();
  loadGroupSettings(); // 加载群组设置
  prevChatState = saveChatState();
  var cs = $('chatSettings'); if (cs) cs.classList.remove('open');
  saveGroupInfo();
  renderGroupChat();
  $('chatWindow').classList.add('open');
  $('chatWindow').classList.add('group-skin');
  updateChatHeader();
  $('sendBtn').style.display = '';
  if ($('chatInput')) $('chatInput').placeholder = '在群聊中发言...';
  var hdr = $('chatWindow').querySelector('.chat-header > div:last-child');
  if (hdr && !$('groupMemberBtn')) {
    var btn = document.createElement('button');
    btn.className = 'icon-btn'; btn.id = 'groupMemberBtn';
    btn.title = '群成员'; btn.textContent = '👥';
    btn.onclick = function() { toggleGroupPanel(); };
    hdr.insertBefore(btn, hdr.firstChild);
  }
  var backBtn = $('chatWindow').querySelector('.header-action');
  if (backBtn) {
    backBtn.onclick = function() { showExitGroupConfirm(); };
  }
}

function saveChatState() {
  return {
    chatWindowOpen: $('chatWindow') ? $('chatWindow').classList.contains('open') : false,
    chatSettingsOpen: $('chatSettings') ? $('chatSettings').classList.contains('open') : false,
    chatName: $('chatName') ? $('chatName').innerText : '',
    chatRel: $('chatRel') ? $('chatRel').innerText : '',
    chatInputPlaceholder: $('chatInput') ? $('chatInput').placeholder : '',
  };
}

function restoreChatState() {
  if (!prevChatState) return;
  if (prevChatState.chatWindowOpen && !$('chatWindow').classList.contains('open')) {
    $('chatWindow').classList.add('open');
  }
  if ($('chatName')) $('chatName').innerText = prevChatState.chatName;
  if ($('chatRel')) $('chatRel').innerText = prevChatState.chatRel;
  if ($('chatInput')) $('chatInput').placeholder = prevChatState.chatInputPlaceholder;
  prevChatState = null;
}

function updateChatHeader() {
  var nameEl = $('chatName');
  var relEl = $('chatRel');
  if (nameEl) nameEl.innerText = groupName;
  if (relEl) relEl.innerText = groupMembers.length + ' 人';
}

function showExitGroupConfirm() {
  if (!groupCreated) {
    closeGroupChat();
    return;
  }
  var existing = $('exitGroupConfirm');
  if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'exitGroupConfirm';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="background:#fdfaf6;border-radius:18px;padding:24px;width:min(300px,80vw);text-align:center;box-shadow:0 16px 48px rgba(60,50,40,.28);">' +
      '<div style="font-size:20px;font-weight:700;color:#4a3f35;margin-bottom:8px;">退出群聊？</div>' +
      '<div style="font-size:13px;color:#6a5d4f;margin-bottom:16px;">聊天记录将保留在本地</div>' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button onclick="document.getElementById(\'exitGroupConfirm\').remove()" style="flex:1;padding:10px;border:none;border-radius:12px;background:#e8e3db;color:#7a6b5c;font-weight:600;cursor:pointer;">取消</button>' +
        '<button onclick="closeGroupChat()" style="flex:1;padding:10px;border:none;border-radius:12px;background:#e53935;color:#fff;font-weight:600;cursor:pointer;">退出</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
}

// ====== 退群 ======
function closeGroupChat() {
  var ec = $('exitGroupConfirm'); if (ec) ec.remove();
  groupMode = false;
  clearTimeout(groupTypingTimer);
  groupTyping = {};
  $('chatWindow').classList.remove('group-skin');
  var gbtn = $('groupMemberBtn'); if (gbtn) gbtn.remove();
  var gp = $('groupPanel'); if (gp) gp.style.display = 'none';
  var rp = $('relationshipPanel'); if (rp) rp.style.display = 'none';
  var gc = $('groupCreator'); if (gc) gc.style.display = 'none';
  if ($('chatInput')) $('chatInput').placeholder = '发消息...';
  restoreChatState();
  closeChat();
  saveGroupMessages();
}

// ====== 创建群名 ======
function showGroupCreator() {
  if (groupCreated) return;
  var existing = $('groupCreator'); if (existing) existing.remove();
  var overlay = document.createElement('div');
  overlay.id = 'groupCreator';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div class="group-panel-sheet" style="text-align:center;">' +
      '<div style="font-size:18px;font-weight:700;color:#4a3f35;margin-bottom:12px;">命名群聊</div>' +
      '<input id="groupNameInput" type="text" placeholder="给群聊起个名字" style="width:80%;border:1.5px solid #d8cfc4;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;text-align:center;margin-bottom:16px;" onkeydown="if(event.key===\'Enter\')confirmGroupName()">' +
      '<div style="display:flex;gap:8px;justify-content:center;">' +
        '<button onclick="document.getElementById(\'groupCreator\').remove()" style="padding:10px 20px;border:none;border-radius:12px;background:#e8e3db;color:#7a6b5c;font-weight:600;cursor:pointer;">取消</button>' +
        '<button onclick="confirmGroupName()" style="padding:10px 20px;border:none;border-radius:12px;background:#7b4bd6;color:#fff;font-weight:600;cursor:pointer;">确定</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  setTimeout(function() { var inp = $('groupNameInput'); if (inp) inp.focus(); }, 100);
}

function confirmGroupName() {
  var inp = $('groupNameInput');
  if (!inp) return;
  var name = inp.value.trim();
  if (name) groupName = name;
  groupCreated = true;
  var gc = $('groupCreator'); if (gc) gc.remove();
  updateChatHeader();
  saveGroupInfo();
}

function saveGroupInfo() {
  try {
    localStorage.setItem('groupchat.info', JSON.stringify({ name: groupName, members: groupMembers, created: groupCreated }));
  } catch(e) {}
}
function loadGroupInfo() {
  try {
    var info = JSON.parse(localStorage.getItem('groupchat.info'));
    if (info && info.members && info.members.length >= 2) {
      groupName = info.name || '群聊';
      groupMembers = info.members;
      groupCreated = info.created || false;
      return true;
    }
  } catch(e) {}
  return false;
}

// ====== 渲染聊天消息 ======
function renderGroupChat() {
  if (!groupMode) return;
  var body = $('chatBody');
  if (!body) return;
  var userProf = state.profiles.find(function(p) { return p.id === state.activeProfileId; }) || {};
  var html = '';
  // 时间分隔线
  var lastDate = '';
  (groupMessages || []).forEach(function(msg) {
    var msgDate = new Date(msg.ts || 0).toLocaleDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      html += '<div class="time-divider">' + lastDate + '</div>';
    }
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
    var time = msg.time || new Date(msg.ts || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // 检测 @提及
    var mentionedList = '';
    if (msg.mentioned && msg.mentioned.length > 0) {
      var mentionedNames = msg.mentioned.map(function(id) { return (getRole(id) || {}).name || '未知'; });
      mentionedList = '<div class="msg-mention">@' + mentionedNames.join(' @') + '</div>';
    }
    if (isUser) {
      html += '<div class="msg right">' +
        '<div class="bubble right">' + escapeHTML(msg.content || '') + '</div>' +
        '<div class="msg-sender">' + escapeHTML(name) + ' · ' + time + '</div>' +
        mentionedList +
      '</div>';
    } else {
      html += '<div class="msg left">' +
        '<div class="avatar">' + renderAvatar(av, name) + '</div>' +
        '<div class="bubble-col">' +
          '<div class="msg-sender">' + escapeHTML(name) + ' · ' + time + '</div>' +
          '<div class="bubble left">' + escapeHTML(msg.content || '') + '</div>' +
          '<div class="msg-reactions" style="margin-top:4px;display:flex;gap:4px;align-items:center;padding-top:4px;">' +
            '<span class="reaction-emoji" data-emoji="👍" onclick="addReaction(\'' + msg.charId + '\',this)">👍</span>' +
            '<span class="reaction-emoji" data-emoji="❤️" onclick="addReaction(\'' + msg.charId + '\',this)">❤️</span>' +
            '<span class="reaction-emoji" data-emoji="😂" onclick="addReaction(\'' + msg.charId + '\',this)">😂</span>' +
            '<span class="reaction-emoji" data-emoji="😮" onclick="addReaction(\'' + msg.charId + '\',this)">😮</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  });
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

// 表情反应存储
var reactionData = {}; // { charId: [{emoji, count}] }

// 添加表情反应
function addReaction(charId, emojiEl) {
  if (!reactionData[charId]) reactionData[charId] = [];
  var emoji = emojiEl.dataset.emoji;
  var existing = reactionData[charId].find(function(r) { return r.emoji === emoji; });
  if (existing) {
    existing.count++;
  } else {
    reactionData[charId].push({ emoji: emoji, count: 1 });
  }
  renderReactions(charId);
}

// 渲染表情反应
function renderReactions(charId) {
  var data = reactionData[charId] || [];
  var total = data.reduce(function(sum, r) { return sum + r.count; }, 0);
  var reactionsHtml = data.map(function(r) { return '<span class="reaction-emoji-react">' + r.emoji + '×' + r.count + '</span>'; }).join(' ');
  // 查找对应消息的反应区域
  var reactionsEls = document.querySelectorAll('.msg-reactions');
  if (reactionsEls.length > 0) {
    reactionsEls[0].innerHTML = reactionsHtml;
  }
}

// ====== 打字中指示器 ======
function setGroupTyping(charId, val) {
  groupTyping[charId] = val;
  renderGroupChat();
}

// ====== 群组设置 ======
function showGroupSettings() {
  var existing = $('groupSettingsPanel'); if (existing) existing.remove();
  var panel = document.createElement('div');
  panel.id = 'groupSettingsPanel';
  panel.className = 'group-panel';
  panel.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5)';
  panel.innerHTML =
    '<div class="group-panel-sheet" style="min-width:300px;max-width:90vw;padding:24px 28px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">' +
        '<h3>群聊设置</h3>' +
        '<button class="group-close-btn" onclick="$(\'groupSettingsPanel\').remove()">✕</button>' +
      '</div>' +
      '<div class="cs-section" style="margin-bottom:24px;">' +
        '<div class="cs-row">' +
          '<div class="cs-row-left"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18c1.66 0 3-1.34 3-3H5a3 3 0 003 3z"/><path d="M5 6h10a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2"/></svg>' +
            '<span>群公告</span>' +
          '</div>' +
        '</div>' +
        '<textarea id="groupAnnounce" rows="3" placeholder="在这里输入群公告..."' +
          'style="width:100%;border:1.5px solid #d8cfc4;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;margin-top:6px;"' +
          'oninput="updateGroupAnnounce(this.value)">' +
          (groupAnnounceText || '') +
        '</textarea>' +
      '</div>' +
      '<div class="cs-section" style="margin-bottom:24px;">' +
        '<div class="cs-row"><div class="cs-row-left"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18c1.66 0 3-1.34 3-3H5a3 3 0 003 3z"/><path d="M5 6h10a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2"/></svg>' +
            '<span>群规则</span>' +
          '</div></div>' +
        '<textarea id="groupRules" rows="3" placeholder="在这里输入群规则（一条一条写）..."' +
          'style="width:100%;border:1.5px solid #d8cfc4;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;margin-top:6px;"' +
          'oninput="updateGroupRules(this.value)">' +
          (groupRulesText || '') +
        '</textarea>' +
      '</div>' +
      '<div class="cs-section" style="margin-bottom:24px;">' +
        '<div class="cs-row"><div class="cs-row-left"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 7v3l2 2"/></svg>' +
            '<div>' +
              '<span>成员权限</span>' +
              '<div class="cs-hint">谁可以发言、发图、@所有人</div>' +
            '</div>' +
          '</div></div>' +
        '<select id="memberPermissionSelect" style="width:100%;border:none;background:#f7f5f2;border-radius:8px;padding:8px 10px;font-size:13px;outline:none;margin-top:6px;">' +
          '<option value="all">所有人可发言</option>' +
          '<option value="moderator">仅管理员可发言</option>' +
          '<option value="owner">仅群主可发言</option>' +
        '</select>' +
      '</div>' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">' +
        '<button onclick="$(\'groupSettingsPanel\').remove()" style="flex:1;padding:10px 20px;border:none;border-radius:12px;background:#e8e3db;color:#7a6b5c;font-weight:600;cursor:pointer;">取消</button>' +
        '<button onclick="saveGroupSettings()" style="flex:1;padding:10px 20px;border:none;border-radius:12px;background:#7b4bd6;color:#fff;font-weight:600;cursor:pointer;">保存设置</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(panel);
  setTimeout(function() { panel.style.left = '50%;panel.style.transform = "translateX(-50%)"'; }, 100);
}

// 群组设置数据持久化
var groupAnnounceText = '';
var groupRulesText = '1. 尊重每位成员\n2. 禁止发布违规内容\n3. 保护他人隐私';

// 更新公告
function updateGroupAnnounce(text) {
  groupAnnounceText = text;
}

// 更新规则
function updateGroupRules(text) {
  groupRulesText = text;
}

// 保存设置
function saveGroupSettings() {
  try {
    localStorage.setItem('groupchat.settings', JSON.stringify({
      announce: groupAnnounceText,
      rules: groupRulesText,
      permission: $('memberPermissionSelect').value
    }));
    quickNotice('群组设置已保存');
  } catch(e) { quickNotice('保存失败'); }
  $('groupSettingsPanel').remove();
}

// 加载群组设置
function loadGroupSettings() {
  try {
    var settings = JSON.parse(localStorage.getItem('groupchat.settings'));
    if (settings) {
      groupAnnounceText = settings.announce || '';
      groupRulesText = settings.rules || '';
      if ($('groupAnnounce')) $('groupAnnounce').value = groupAnnounceText;
      if ($('groupRules')) $('groupRules').value = groupRulesText;
      if ($('memberPermissionSelect')) $('memberPermissionSelect').value = settings.permission || 'all';
    }
  } catch(e) {}
}

// ====== 导出/导入按钮 ======
function showExportImportButtons() {
  var existing = $('exportImportPanel'); if (existing) existing.remove();
  var panel = document.createElement('div');
  panel.id = 'exportImportPanel';
  panel.className = 'group-panel-sheet';
  panel.style.cssText = 'background:#fdfaf6;padding:16px 24px;border-radius:12px;width:min(300px,90vw)';
  panel.innerHTML =
    '<div style="display:flex;justify-between;margin-bottom:16px;">' +
      '<h4>配置备份</h4>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:12px;">' +
      '<button onclick="exportGroupConfig()" style="flex:1;padding:8px;border:none;border-radius:8px;background:#7b4bd6;color:#fff;font-weight:600;cursor:pointer;">导出配置</button>' +
      '<button onclick="importGroupConfig()" style="flex:1;padding:8px;border:none;border-radius:8px;background:#e8e3db;color:#7a6b5c;font-weight:600;cursor:pointer;">导入配置</button>' +
    '</div>' +
    '<p style="font-size:11px;color:#b8a99a;margin-top:8px;">配置包含：群名、成员列表、聊天记录、关系图谱、自定义设置</p>';
  document.body.appendChild(panel);
  setTimeout(function() { panel.style.left = '50%;panel.style.transform = "translateX(-50%)"'; }, 100);
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
      '<h3>' + escapeHTML(groupName || '群聊') + '</h3>' +
      '<div style="display:flex;gap:4px;">' +
        '<button class="group-close-btn" onclick="$(\'groupPanel\').style.display=\'none\'">✕</button>' +
        '<button class="icon-btn" onclick="showGroupSettings()" style="width:36px;height:36px;border:none;background:transparent;color:#7b4bd6;font-size:18px;padding:0;cursor:pointer;" title="群组设置">⚙</button>' +
        '<button class="icon-btn" onclick="showExportImportButtons()" style="width:36px;height:36px;border:none;background:transparent;color:#7b4bd6;font-size:18px;padding:0;cursor:pointer;" title="导出/导入">💾</button>' +
      '</div>' +
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
          (isYou || groupMembers.length > 2 ? '<button class="group-close-btn" onclick="removeFromGroup(\'' + m.id + '\')" style="font-size:14px;color:#b8a99a;">✕</button>' : '') +
        '</div>';
      }).join('') +
    '</div>' +
    (groupMembers.length < 10 ?
      '<div class="group-panel-actions">' +
        '<button class="primary-btn" style="flex:1;padding:10px;border:none;border-radius:12px;background:#7b4bd6;color:#fff;font-weight:600;cursor:pointer;" onclick="addToGroup()">＋ 邀请成员</button>' +
        '<button class="icon-btn" style="margin-left:8px;width:36px;height:36px;border:none;background:transparent;color:#7b4bd6;font-size:18px;padding:0;cursor:pointer;" title="群组设置">⚙</button>' +
      '</div>' : '') +
    '<div style="margin-top:12px;text-align:center;">' +
      '<button onclick="clearGroupMessages()" style="border:none;background:none;color:#b8a99a;font-size:12px;cursor:pointer;">清空聊天记录</button>' +
    '</div>';
}

function addToGroup() {
  var available = state.roles.filter(function(r) { return groupMembers.indexOf(r.id) === -1 && r.id !== 'role-default'; });
  if (!available.length) { quickNotice('没有更多可邀请的角色'); return; }
  var char = available[Math.floor(Math.random() * available.length)];
  groupMembers.push(char.id);
  saveGroupInfo();
  renderGroupPanel();
  quickNotice('已邀请 ' + char.name + ' 进群');
}

function removeFromGroup(charId) {
  if (charId === state.activeRoleId) { showExitGroupConfirm(); return; }
  groupMembers = groupMembers.filter(function(id) { return id !== charId; });
  groupTyping[charId] = false;
  saveGroupInfo();
  renderGroupPanel();
  var name = (getRole(charId) || {}).name || '角色';
  quickNotice(name + ' 已退出群聊');
}

function clearGroupMessages() {
  groupMessages = [];
  saveGroupMessages();
  renderGroupChat();
  quickNotice('聊天记录已清空');
}

// ====== 发消息 ======
function sendGroupMessage() {
  var input = $('chatInput');
  var text = input ? input.value.trim() : '';
  if (!text) return;
  // 解析 @提及
  var mentionedIds = [];
  var atMatches = text.match(/@(\w+)/g) || [];
  atMatches.forEach(function(match) {
    var username = match.substring(1); // 去掉 @
    var member = groupMembers.find(function(id) { return getRole(id) && getRole(id).name === username; });
    if (member && mentionedIds.indexOf(member.id) === -1) {
      mentionedIds.push(member.id);
    }
  });
  // 清理 @ 提及文本，用于发送内容
  var cleanText = text.replace(/@\w+\s*/g, '').trim();
  if (!cleanText) {
    quickNotice('消息内容不能为空');
    return;
  }
  var msg = { role: 'user', charId: state.activeRoleId, content: cleanText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ts: Date.now(), mentioned: mentionedIds };
  groupMessages.push(msg);
  if (input) input.value = '';
  hidePanels();
  saveGroupMessages();
  renderGroupChat();
  // AI 回复 - 触发多个角色依次回复
  var aiMembers = groupMembers.filter(function(id) { return id !== state.activeRoleId; });
  if (aiMembers.length) {
    // 根据发送者与成员的关系自动调整亲密度
    var senderRel = relationshipData[state.activeRoleId] || {};
    var delta = (senderRel.weight ? 0 : 1); // 首次互动基础亲密度
    aiMembers.forEach(function(charId) {
      var memberRel = relationshipData[charId] || {};
      if (!memberRel.weight) {
        adjustRelationship(charId, 1, '好友'); // 首次互动设为好友
      }
    });
    triggerGroupReplies(aiMembers);
  }
}

function triggerGroupReplies(aiMembers) {
  var delay = 1200;
  var idx = 0;
  function nextReply() {
    if (!groupMode || idx >= aiMembers.length) return;
    var charId = aiMembers[idx];
    setGroupTyping(charId, true);
    groupTypingTimer = setTimeout(function() {
      if (!groupMode) return;
      generateGroupReply(charId);
      idx++;
      delay += 800 + Math.random() * 1200;
      groupTypingTimer = setTimeout(nextReply, delay);
    }, 600 + Math.random() * 800);
  }
  nextReply();
}

// ====== AI 回复（指定角色） ======
async function generateGroupReply(charId) {
  setGroupTyping(charId, false);
  var member = getRole(charId);
  if (!member) return;
  var aiMembers = groupMembers.filter(function(id) { return id !== state.activeRoleId; });
  var memberNames = aiMembers.map(function(id) { return (getRole(id) || {}).name || '角色'; });
  var charInfos = aiMembers.map(function(id) {
    var c = getRole(id);
    if (!c) return '';
    return c.name + (c.personality ? '(性格：' + c.personality.slice(0, 50) + ')' : '') +
           (c.relation ? '(关系：' + c.relation + ')' : '');
  }).join('、');
  var chatContext = (groupMessages || []).slice(-20).map(function(m) {
    var sender = getRole(m.charId);
    var name = m.role === 'user' ? ((state.profiles.find(function(p) { return p.id === state.activeProfileId; }) || {}).name || '我') : (sender ? sender.name : '未知');
    return name + ': ' + m.content;
  }).join('\n');
  var rel = relationshipData[charId] || {};
  var relHint = (rel.label || '好友') + (rel.weight ? '，亲密度 ' + rel.weight : '');
  // 获取角色长期记忆并构建上下文
  var char = getRole(charId);
  var memories = char ? (char.memories || []) : [];
  var relevantMemories = '';
  if (memories && memories.length > 0) {
    // 取最近最相关的3条记忆
    var recentMemories = memories.slice(-3);
    relevantMemories = recentMemories.map(function(m) {
      var tagInfo = m.tags && m.tags.length > 0 ? ' (标签: ' + m.tags.join(', ') + ')' : '';
      return '记忆: ' + m.title + tagInfo + ' · 内容: ' + (m.text || '').substring(0, 80) + '...';
    }).join('\n');
  }
  var memberNames2 = aiMembers.map(function(id) { return (getRole(id) || {}).name || '角色'; });
  var charInfos2 = aiMembers.map(function(id) {
    var c = getRole(id);
    if (!c) return '';
    return c.name + (c.personality ? '(性格：' + c.personality.slice(0, 50) + ')' : '') +
           (c.relation ? '(关系：' + c.relation + ')' : '');
  }).join('、');
  var prompt = '你是一个群聊模拟器。群名：' + (groupName || '群聊') + '。\n\n现在有以下角色在群聊中：' + charInfos + '。\n\n你扮演的是「' + member.name + '」，这个角色的特点是：' +
    (member.personality ? '性格：' + member.personality + '。' : '') +
    '你与发言者的关系是：' + relHint + '。\n\n聊天记录：\n' + chatContext + '\n\n' +
    (relevantMemories ? '角色长期记忆（可能影响回复风格）：\n' + relevantMemories + '\n\n' : '') +
    '请用「' + member.name + '」的口吻回复一条消息（20-80字），要符合角色性格和与发言者的关系。' +
    (typeof willowContextText === 'function' ? '\n\n' + willowContextText() : '') + '\n\n' +
    '请严格按以下JSON格式回复（不要输出其他内容）：\n{"name":"' + member.name + '","content":"回复内容"}';
  var cfg = resolveApiConfig(true);
  if (!cfg.key || !cfg.url || !cfg.model) {
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
    if (!res.ok) { quickNotice(member.name + ' 没有回复'); return; }
    var data = await res.json().catch(function() { return {}; });
    var raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').trim();
    var replyContent = raw;
    try {
      var parsed = JSON.parse(raw);
      replyContent = parsed.content || raw;
    } catch(e) {}
    if (!replyContent) return;
    // 根据角色回复调整关系：积极互动提升亲密度
    adjustRelationship(charId, 1, rel.label || '好友');
    var msg = { role: 'assistant', charId: charId, content: replyContent, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), ts: Date.now() };
    groupMessages.push(msg);
    var c = getRole(charId); if (c) { c.unread = (c.unread || 0) + 1; c.read = true; }
    saveGroupMessages();
    renderGroupChat();
    // 保存到时间线
    if (typeof addTimelineEntry === 'function') {
      addTimelineEntry({ type: 'group_chat', role: 'assistant', charId: charId, content: replyContent, mood: '' });
    }
    if (typeof autoSaveMemoryWithRAG === 'function') {
      autoSaveMemoryWithRAG(getRole(charId));
    }
  } catch (e) {
    quickNotice(member.name + ' 回复失败');
  }
}

// ====== 群聊消息持久化 ======
function saveGroupMessages() {
  try { localStorage.setItem('groupchat.messages', JSON.stringify(groupMessages)); } catch(e) {}
}
function loadGroupMessages() {
  try { return JSON.parse(localStorage.getItem('groupchat.messages') || '[]'); } catch(e) { return []; }
}

// 关系标签定义
var relLabels = ['好友', '恋人', '搭档', '家人', '同学', '同事', '竞争对手', '同事', '邻居', '陌生人'];
var relEmojis = ['👥', '❤️', '🤝', '🏠', '🎓', '💼', '⚔️', '💼', '🏘️', '❓'];

// ====== 关系图谱 ======
function loadRelationships() {
  try { return JSON.parse(localStorage.getItem('groupchat.relationships') || '{}'); } catch(e) { return {}; }
}
function saveRelationships(data) {
  try { localStorage.setItem('groupchat.relationships', JSON.stringify(data)); } catch(e) {}
}
// 动态关系变化：通过互动调整亲密度和标签
function adjustRelationship(charId, deltaWeight, newLabel) {
  if (!relationshipData[charId]) relationshipData[charId] = {};
  // 累计亲密度变化，范围 0-5
  var currentWeight = relationshipData[charId].weight || 0;
  var newWeight = Math.max(0, Math.min(5, currentWeight + deltaWeight));
  if (newLabel) relationshipData[charId].label = newLabel;
  relationshipData[charId].weight = newWeight;
  saveRelationships(relationshipData);
  renderRelationshipGraph();
  var name = (getRole(charId) || {}).name || '角色';
  quickNotice(name + ' 关系更新：' + (newLabel || '好友') + ' · 亲密度 ' + newWeight);
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
  var safeCount = Math.max(chars.length, 3);
  var angleStep = (Math.PI * 2) / safeCount;
  var radius = 30;
  sheet.innerHTML =
    '<div class="relationship-header">' +
      '<h3>角色关系图谱</h3>' +
      '<button class="group-close-btn" onclick="$(\'relationshipPanel\').style.display=\'none\'">✕</button>' +
    '</div>' +
    '<div class="relationship-legend">' +
      relLabels.map(function(label, i) { return '<span class="rel-legend-item"><span class="rel-dot">' + relEmojis[i] + '</span>' + label + '</span>'; }).join('') +
    '</div>' +
    '<div class="relationship-canvas" id="relationshipCanvas">' +
      chars.map(function(c, i) {
        var angle = i * angleStep - Math.PI / 2;
        var x = 50 + Math.cos(angle) * radius;
        var y = 50 + Math.sin(angle) * radius;
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
            relLabels.map(function(l, idx) { return '<option value="' + l + '"' + (rel.label === l ? ' selected' : '') + '>' + l + '</option>'; }).join('') +
          '</select>' +
          '<input type="range" min="0" max="5" value="' + (rel.weight || 0) + '" onchange="setRel(\'' + c.id + '\',\'weight\',this.value)" title="亲密度">' +
          '<span class="rel-weight-val">' + (rel.weight || 0) + '</span>' +
        '</div>';
      }).join('') +
    '</div>' +
    // 动态变化提示区域
    '<div class="rel-dynamic-tips" style="margin-top:12px;padding:8px;background:#f0ede8;border-radius:8px;font-size:12px;color:#6a5d4f;">' +
      '关系会根据聊天互动自动调整（亲密度+1/-1，标签可手动编辑），' +
      '频繁互动会提升亲密度，重要事件会改变关系标签。' +
    '</div>';
}

// ====== 导出群组配置 ======
function exportGroupConfig() {
  var config = {
    name: groupName,
    members: groupMembers,
    messages: groupMessages,
    relationships: relationshipData,
    created: groupCreated,
    mode: groupMode
  };
  var jsonStr = JSON.stringify(config, null, 2);
  var blob = new Blob([jsonStr], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'groupchat-config-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  quickNotice('配置导出成功，可在文件中备份');
}

// ====== 导入群组配置 ======
function importGroupConfig() {
  // 创建文件输入框
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var config = JSON.parse(e.target.result);
        // 验证必需字段
        if (!config.name || !config.members || config.members.length < 2) {
          quickNotice('无效的群组配置文件：缺少必要字段');
          return;
        }
        // 确认覆盖
        if (!confirm('这将覆盖当前群组配置？所有现有数据将被替换。')) return;
        // 应用导入的配置
        groupName = config.name;
        groupMembers = config.members;
        groupMessages = config.messages || [];
        relationshipData = config.relationships || {};
        groupCreated = config.created || false;
        groupMode = config.mode || false;
        
        // 保存到 localStorage
        saveGroupInfo();
        saveGroupMessages();
        saveRelationships(relationshipData);
        
        // 重新渲染界面
        updateChatHeader();
        renderGroupPanel();
        renderRelationshipGraph();
        quickNotice('群组配置已成功导入');
      } catch(ex) {
        quickNotice('配置文件解析失败: ' + ex.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
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
window.showGroupCreator = showGroupCreator;
window.confirmGroupName = confirmGroupName;
window.addToGroup = addToGroup;
window.removeFromGroup = removeFromGroup;
window.clearGroupMessages = clearGroupMessages;
window.showExitGroupConfirm = showExitGroupConfirm;
window.exportGroupConfig = exportGroupConfig;
window.importGroupConfig = importGroupConfig;
window.toggleAtPanel = toggleAtPanel;
window.insertAt = insertAt;
window.showGroupSettings = showGroupSettings;
window.showExportImportButtons = showExportImportButtons;
window.saveGroupSettings = saveGroupSettings;
window.updateGroupAnnounce = updateGroupAnnounce;
window.updateGroupRules = updateGroupRules;
window.adjustRelationship = adjustRelationship;
window.addReaction = addReaction;
window.renderReactions = renderReactions;
window.renderGroupChat = renderGroupChat;

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

// ====== 初始化：恢复上次群聊 ======
(function initGroupChat() {
  if (loadGroupInfo() && groupMembers.length >= 2) {
    // 有保存的群信息，但不自动进入
  }
})();