// ============================================================
// mq.js - 薄荷绿治愈系 QQ 系统
// ============================================================
let mqView = 'msg';
let mqChatId = null;
let mqEditRole = null;

function mqApiOk() {
  return state.api && state.api.key && state.api.url && state.api.model;
}
function mqAva(url, name) {
  if (url) return '<div class="mq-ava"><img src="' + escapeHTML(url) + '"></div>';
  return '<div class="mq-ava">' + escapeHTML((name || '?').slice(0, 1)) + '</div>';
}
function mqRole(id) { return state.mq.roles.find(r => r.id === id); }
function mqEnsureMem(roleId) {
  const r = mqRole(roleId);
  if (r && !r.memory) r.memory = [];
  return r ? r.memory : null;
}
function mqAddMem(roleId, text, who) {
  const m = mqEnsureMem(roleId);
  if (!m) return;
  m.push({ t: Date.now(), who: who || 'user', text: text });
  if (m.length > 200) m.shift();
  saveState();
}
function mqSearchMem(roleId, kw) {
  const m = mqEnsureMem(roleId);
  if (!m || !kw) return [];
  const keys = kw.toLowerCase().split(/\s+/).filter(Boolean);
  return m.map(x => {
    const s = (x.text || '').toLowerCase();
    let score = 0;
    keys.forEach(k => { if (s.includes(k)) score += 1; });
    return { x, score };
  }).filter(o => o.score > 0).sort((a, b) => b.score - a.score || b.x.t - a.x.t).slice(0, 5).map(o => o.x);
}
function mqCallAI(prompt) {
  return fetch(joinUrl(state.api.url, 'chat/completions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + state.api.key },
    body: JSON.stringify({ model: state.api.model, messages: [{ role: 'user', content: prompt }], stream: false })
  }).then(r => r.json()).then(d => {
    if (d.error) throw new Error(d.error.message || 'API错误');
    const c = d.choices && d.choices[0] && d.choices[0].message ? d.choices[0].message.content : '';
    return c.trim();
  });
}

function renderMQ() {
  if (!mqApiOk()) {
    if (mqView === 'chat') mqView = 'msg';
  }
  const tabs = ['消息', '联系人', '动态', '我的'];
  const html = '<div class="mq-app' + (mqView === 'chat' ? ' chat' : '') + (mqEditRole ? ' editing' : '') + '"><div class="mq-topbar"><button class="mq-back" onclick="mqBack()">‹ 返回</button><span class="mq-title" id="mqTopTitle"></span></div><div class="mq-body" id="mqBody"></div><div class="mq-tabs">' +
    tabs.map(t => '<div class="mq-tab ' + ((t === '消息' && mqView === 'msg') || (t === '联系人' && mqView === 'contact') || (t === '动态' && mqView === 'moment') || (t === '我的' && mqView === 'me') ? 'on' : '') + '" onclick="mqSwitch(\'' + ({ '消息': 'msg', '联系人': 'contact', '动态': 'moment', '我的': 'me' }[t]) + '\')">' + t + '</div>').join('') +
    '</div></div>';
  c().innerHTML = html;
  mqRenderBody();
  mqHeaderMenu();
}

function toggleHeaderMenu() {
  const menu = document.getElementById('headerMenu');
  if (!menu) return;
  if (menu.style.display === 'flex') { menu.style.display = 'none'; return; }
  menu.style.display = 'flex';
}

function mqHeaderMenu() {
  const menu = document.getElementById('headerMenu');
  if (!menu) return;
  if (mqView === 'contact') menu.innerHTML = '<div class="header-menu-item" onclick="mqNewRole()">新建角色</div>';
  else menu.innerHTML = '';
}

function mqSwitch(v) { mqView = v; mqChatId = null; renderMQ(); }
function mqBack() {
  if (mqEditRole) { mqEditRole = null; renderMQ(); return; }
  if (mqView === 'chat') { mqView = 'msg'; mqChatId = null; renderMQ(); }
  else closeApp();
}

function mqRenderBody() {
  const b = document.getElementById('mqBody');
  if (!b) return;
  b.className = '';
  const tt = document.getElementById('mqTopTitle'); if (tt) tt.textContent = '';
  const app = document.querySelector('.mq-app'); if (app) app.classList.remove('chat');
  const tb = document.querySelector('.mq-topbar'); if (tb) tb.classList.remove('chat');
  if (mqView === 'msg') mqRenderMsg(b);
  else if (mqView === 'contact') mqRenderContact(b);
  else if (mqView === 'moment') mqRenderMoment(b);
  else if (mqView === 'me') mqRenderMe(b);
}

function mqRenderMsg(b) {
  const roles = state.mq.roles;
  if (!roles.length) { b.innerHTML = '<div class="mq-card"><div class="mq-empty">还没有角色</div><button class="mq-btn" style="width:100%;margin-top:10px" onclick="mqSwitch(\'contact\')">去「联系人」创建角色</button></div>'; return; }
  b.innerHTML = roles.map(r => {
    const id = r.id;
    const chat = state.mq.chats[id] || [];
    const last = chat.length ? chat[chat.length - 1].text : '（暂无消息）';
    return '<div class="mq-row" onclick="mqOpenChat(\'' + id + '\')">' + mqAva(r.avatar, r.name) +
      '<div><div class="mq-name">' + escapeHTML(r.name) + '</div><div class="mq-sub">' + escapeHTML(last) + '</div></div></div>';
  }).join('');
}

function mqOpenChat(id) {
  mqChatId = id; mqView = 'chat';
  const r = mqRole(id);
  const chat = state.mq.chats[id] || [];
  const body = document.getElementById('mqBody');
  body.className = 'mq-chatmode';
  const app = document.querySelector('.mq-app'); if (app) app.classList.add('chat');
  const tb = document.querySelector('.mq-topbar'); if (tb) tb.classList.add('chat');
  const tt = document.getElementById('mqTopTitle'); if (tt) tt.textContent = r.name;
  const meAva = state.mq.me.avatar;
  const avHtml = who => {
    const a = who === 'me' ? meAva : r.avatar;
    return '<div class="ava">' + (a ? '<img src="' + escapeHTML(a) + '">' : escapeHTML(who === 'me' ? (state.mq.me.name || '我') : r.name)) + '</div>';
  };
  body.innerHTML =
    '<div id="mqChat" class="mq-chat-list">' +
    chat.map(m => '<div class="mq-bub ' + (m.who === 'me' ? 'me' : '') + '">' + avHtml(m.who) + '<div class="b">' + escapeHTML(m.text) + '</div></div>').join('') +
    '</div>' +
    '<div class="mq-chat-input"><textarea id="mqInput" style="height:34px;overflow-y:auto" placeholder="对' + escapeHTML(r.name) + '说点什么…"></textarea><button class="mq-btn" onclick="mqSend()">发送</button></div>';
  const cc = document.getElementById('mqChat'); if (cc) cc.scrollTop = cc.scrollHeight;
}

function mqSend() {
  const id = mqChatId; if (!id) return;
  const ta = document.getElementById('mqInput'); if (!ta) return;
  const text = ta.value.trim(); if (!text) return;
  if (!mqApiOk()) { return; }
  if (!state.mq.chats[id]) state.mq.chats[id] = [];
  state.mq.chats[id].push({ who: 'me', text: text });
  mqAddMem(id, text, 'user');
  ta.value = '';
  mqOpenChat(id);
  const r = mqRole(id);
  const mem = mqSearchMem(id, text).map(m => (m.who === 'me' ? '用户' : r.name) + '：' + m.text).join('\n');
  const prompt = '你是' + r.name + '，设定：' + (r.desc || '温柔治愈的朋友') + '。\n相关记忆：\n' + (mem || '（无）') + '\n用户说：' + text + '\n请以' + r.name + '的口吻简短回复：';
  mqCallAI(prompt).then(rep => {
    state.mq.chats[id].push({ who: 'ai', text: rep });
    mqAddMem(id, rep, 'ai');
    mqOpenChat(id);
  }).catch(e => {
    state.mq.chats[id].push({ who: 'ai', text: '（连接失败：' + e.message + '）' });
    mqOpenChat(id);
  });
}

// ===== 联系人 =====
function mqRenderContact(b) {
  if (mqEditRole) { b.innerHTML = mqRoleForm(); return; }
  let h = '<button class="mq-btn" style="width:100%;margin-bottom:10px" onclick="mqNewRole()">＋ 新建角色</button>';
  if (!state.mq.roles.length) {
    h += '<div class="mq-card"><div class="mq-empty">还没有角色，点上面按钮新建</div></div>';
  } else {
    h += state.mq.roles.map(r => '<div class="mq-card" style="margin-bottom:10px">' +
      '<div class="mq-row" style="border:none;padding:4px 0" onclick="mqEditRoleView(\'' + r.id + '\')">' + mqAva(r.avatar, r.name) +
      '<div style="flex:1"><div class="mq-name">' + escapeHTML(r.name) + '</div><div class="mq-sub">' + escapeHTML(r.desc || '暂无设定') + '</div></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:6px">' +
      '<button class="mq-btn" style="flex:1" onclick="event.stopPropagation();mqOpenChat(\'' + r.id + '\')">发消息</button>' +
      '<button class="mq-btn ghost" style="flex:1" onclick="event.stopPropagation();mqDelRole(\'' + r.id + '\')">删除</button>' +
      '</div></div>').join('');
  }
  b.innerHTML = h;
}

function mqNewRole() { mqEditRole = { id: 'r' + Date.now(), name: '', avatar: '', desc: '' }; renderMQ(); }
function mqEditRoleView(id) { mqEditRole = JSON.parse(JSON.stringify(mqRole(id))); renderMQ(); }

function mqRoleForm() {
  const r = mqEditRole;
  return '<div class="mq-form">' +
    '<div class="mq-form-title">' + (!state.mq.roles.some(x => x.id === r.id) ? '新建角色' : '编辑角色') + '</div>' +
    '<div class="mq-field"><label class="mq-label">头像</label>' +
    '<div class="mq-ava-pick" onclick="document.getElementById(\'mqRAvaFile\').click()">' +
    (r.avatar ? '<img src="' + escapeHTML(r.avatar) + '">' : '<span>＋ 选择图片</span>') +
    '</div>' +
    '<input type="file" id="mqRAvaFile" accept="image/*" style="display:none" onchange="mqRolePickAva(this)">' +
    '<input type="hidden" id="mqRAva" value="' + escapeHTML(r.avatar) + '">' +
    '</div>' +
    '<div class="mq-field"><label class="mq-label">名称</label><input class="mq-field-input" id="mqRName" value="' + escapeHTML(r.name) + '" placeholder="给角色起个名字"></div>' +
    '<div class="mq-field"><label class="mq-label">设定</label><textarea class="mq-field-input" id="mqRDesc" rows="3" placeholder="性格 / 背景 / 口头禅">' + escapeHTML(r.desc) + '</textarea></div>' +
    '<div class="mq-field"><label class="mq-label">别名</label><input class="mq-field-input" id="mqRAlias" value="' + escapeHTML(r.alias || '') + '" placeholder="其他称呼（可空）"></div>' +
    '<div class="mq-field"><label class="mq-label">国籍</label><input class="mq-field-input" id="mqRNation" value="' + escapeHTML(r.nationality || '') + '" placeholder="如：中国（可空）"></div>' +
    '<div class="mq-field"><label class="mq-label">母语</label><input class="mq-field-input" id="mqRLang" value="' + escapeHTML(r.nativeLang || '') + '" placeholder="如：中文（可空）"></div>' +
    '<div class="mq-field"><label class="mq-label">性格</label><input class="mq-field-input" id="mqRPersona" value="' + escapeHTML(r.personality || '') + '" placeholder="如：温柔但毒舌（可空）"></div>' +
    '<div class="mq-field"><label class="mq-label">个人故事</label><textarea class="mq-field-input" id="mqRStory" rows="4" placeholder="背景经历 / 小传">' + escapeHTML(r.story || '') + '</textarea></div>' +
    '<div class="mq-form-actions"><button class="mq-btn ghost" onclick="mqEditRole=null;renderMQ()">取消</button><button class="mq-btn" onclick="mqSaveRole()">保存</button></div>' +
    '</div>';
}

function mqRolePickAva(input) {
  const f = input.files && input.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = e => {
    document.getElementById('mqRAva').value = e.target.result;
    const box = document.querySelector('.mq-ava-pick');
    if (box) box.innerHTML = '<img src="' + e.target.result + '">';
  };
  rd.readAsDataURL(f); input.value = '';
}

function mqSaveRole() {
  const r = mqEditRole;
  r.name = document.getElementById('mqRName').value.trim();
  r.avatar = document.getElementById('mqRAva').value.trim();
  r.desc = document.getElementById('mqRDesc').value.trim();
  r.alias = document.getElementById('mqRAlias').value.trim();
  r.nationality = document.getElementById('mqRNation').value.trim();
  r.nativeLang = document.getElementById('mqRLang').value.trim();
  r.personality = document.getElementById('mqRPersona').value.trim();
  r.story = document.getElementById('mqRStory').value.trim();
  if (!r.name) { alert('名字不能为空'); return; }
  const i = state.mq.roles.findIndex(x => x.id === r.id);
  if (i >= 0) state.mq.roles[i] = r; else state.mq.roles.push(r);
  if (!state.mq.chats[r.id]) state.mq.chats[r.id] = [];
  mqEditRole = null; saveState(); mqView = 'msg'; mqChatId = null; renderMQ();
}

function mqDelRole(id) {
  if (!confirm('删除该角色及所有记忆？')) return;
  state.mq.roles = state.mq.roles.filter(r => r.id !== id);
  delete state.mq.chats[id];
  saveState(); mqRenderContact(document.getElementById('mqBody'));
}

// ===== 动态 / 朋友圈 =====
function mqRenderMoment(b) {
  let h = '<div class="mq-cover"></div>';
  if (!state.mq.moments.length) h += '<div class="mq-empty">还没有动态，点右上角 ＋ 发一条吧</div>';
  h += state.mq.moments.slice().reverse().map(m => {
    let c = '<div class="mq-moment"><div style="display:flex;align-items:center;gap:10px">' + mqAva(state.mq.me.avatar, state.mq.me.name) +
      '<div style="flex:1"><div class="mq-name">' + escapeHTML(state.mq.me.name) + '</div>' + (m.time ? '<div style="font-size:11px;color:#9bb3a8">' + escapeHTML(m.time) + '</div>' : '') + '</div></div>' +
      '<div style="margin-top:8px;line-height:1.6">' + escapeHTML(m.text) + '</div>' +
      (m.imgs && m.imgs.length ? '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' + m.imgs.map(src => '<img src="' + escapeHTML(src) + '" style="width:31%;aspect-ratio:1/1;object-fit:cover;border-radius:8px">').join('') + '</div>' : '');
    if (m.comments && m.comments.length) c += '<div style="margin-top:8px;border-top:1px solid #f0f4f2;padding-top:6px">' + m.comments.map(cm => '<div class="mq-comment" style="background:transparent;padding:3px 0">' + escapeHTML(cm.by) + '：' + escapeHTML(cm.text) + '</div>').join('') + '</div>';
    if (state.mq.roles.length) {
      c += '<div style="margin-top:8px"><select id="mqInv' + m.id + '" class="mq-input" style="flex:1">' +
        state.mq.roles.map(r => '<option value="' + r.id + '">' + escapeHTML(r.name) + '</option>').join('') +
        '</select><button class="mq-btn ghost" onclick="mqInvite(\'' + m.id + '\')">邀角色评</button></div>';
    }
    c += '</div>';
    return c;
  }).join('');
  b.innerHTML = h;
}

function mqMomentEditor() {
  let mask = document.getElementById('mqEditorMask');
  if (!mask) {
    mask = document.createElement('div');
    mask.id = 'mqEditorMask';
    mask.className = 'mq-editor-mask';
    document.body.appendChild(mask);
  }
  const hm = document.getElementById('headerMenu'); if (hm) hm.innerHTML = '';
  mask.innerHTML =
    '<div class="mq-pub-top"><span class="mq-pub-cancel" onclick="mqCloseEditor()">取消</span>' +
    '<span class="mq-pub-send" id="mqPubSend" onclick="mqPublish()">发表</span></div>' +
    '<div class="mq-pub-body"><textarea id="mqMomentText" class="mq-pub-text" placeholder="这一刻的想法…"></textarea>' +
    '<div class="mq-pub-imgrow" id="mqPubImgRow"></div>' +
    '<div class="mq-pub-add" onclick="document.getElementById(\'mqFile\').click()">＋</div>' +
    '<input type="file" id="mqFile" accept="image/*" style="display:none" onchange="mqPickImage(this)"></div>';
  mask.style.display = 'flex';
  setTimeout(() => { const t = document.getElementById('mqMomentText'); if (t) t.focus(); }, 50);
}

function mqPickImage(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = e => {
    const b64 = e.target.result;
    let arr = JSON.parse(document.getElementById('mqPubImgRow').getAttribute('data-imgs') || '[]');
    arr.push(b64);
    const row = document.getElementById('mqPubImgRow');
    row.setAttribute('data-imgs', JSON.stringify(arr));
    row.innerHTML = arr.map(src => '<img src="' + src + '" style="width:64px;height:64px;object-fit:cover;border-radius:8px">').join('');
  };
  rd.readAsDataURL(f);
  input.value = '';
}

function mqCloseEditor() {
  const mask = document.getElementById('mqEditorMask');
  if (mask) mask.style.display = 'none';
  mqView = 'moment'; renderMQ();
}

function mqPublish() {
  const t = document.getElementById('mqMomentText').value.trim();
  if (!t) { alert('说点什么吧'); return; }
  const row = document.getElementById('mqPubImgRow');
  const imgs = row ? JSON.parse(row.getAttribute('data-imgs') || '[]') : [];
  const d = new Date();
  const time = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  state.mq.moments.push({ id: 'm' + Date.now(), text: t, imgs: imgs, time: time, comments: [] });
  saveState(); mqCloseEditor(); mqView = 'moment'; renderMQ();
}

function mqInvite(mid) {
  const sel = document.getElementById('mqInv' + mid);
  const rid = sel.value;
  const r = mqRole(rid); if (!r) return;
  if (!mqApiOk()) { return; }
  const m = state.mq.moments.find(x => x.id === mid); if (!m) return;
  const mem = mqSearchMem(rid, m.text).map(x => (x.who === 'me' ? '用户' : r.name) + '：' + x.text).join('\n');
  const prompt = '你是' + r.name + '，设定：' + (r.desc || '温柔治愈的朋友') + '。\n相关记忆：\n' + (mem || '（无）') + '\n用户发了一条动态：' + m.text + '\n请以' + r.name + '的口吻写一句治愈系评论（不超过30字）：';
  mqCallAI(prompt).then(rep => {
    m.comments.push({ by: r.name, text: rep });
    mqAddMem(rid, '动态评论：' + rep, 'ai');
    saveState(); mqRenderMoment(document.getElementById('mqBody'));
  }).catch(e => { alert('评论生成失败：' + e.message); });
}

// ===== 我的 =====
function mqRenderMe(b) {
  let h = '<div class="mq-card"><div class="mq-name">我的</div>' +
    '<div style="margin-top:8px">昵称<input class="mq-input" style="margin-top:4px" id="mqMeName" value="' + escapeHTML(state.mq.me.name) + '"></div>' +
    '<div style="margin-top:8px">头像URL<input class="mq-input" style="margin-top:4px" id="mqMeAva" value="' + escapeHTML(state.mq.me.avatar) + '"></div>' +
    '<button class="mq-btn" style="margin-top:10px" onclick="mqSaveMe()">保存资料</button></div>';
  h += '<div class="mq-card"><div class="mq-name">角色记忆库</div>' +
    (state.mq.roles.length ? state.mq.roles.map(r => '<div class="mq-row" onclick="mqShowMem(\'' + r.id + '\')" style="cursor:pointer"><div class="mq-name">' + escapeHTML(r.name) + '</div><div class="mq-sub">查看/管理记忆</div></div>').join('') : '<div class="mq-empty">暂无角色</div>') + '</div>';
  b.innerHTML = h;
}

function mqSaveMe() {
  state.mq.me.name = document.getElementById('mqMeName').value.trim() || '我';
  state.mq.me.avatar = document.getElementById('mqMeAva').value.trim();
  saveState(); mqRenderMe(document.getElementById('mqBody'));
}

function mqShowMem(id) {
  const r = mqRole(id); if (!r) return;
  const mem = (r.memory || []);
  const body = document.getElementById('mqBody');
  body.innerHTML = '<div class="mq-card"><div class="mq-row" onclick="mqRenderMe(document.getElementById(\'mqBody\'))" style="border:none;cursor:pointer"><span>‹ 返回</span></div>' +
    '<div class="mq-name">' + escapeHTML(r.name) + ' 的记忆（' + mem.length + '）</div>' +
    (mem.length ? mem.slice().reverse().map(m => '<div class="mq-mem">[' + (m.who === 'me' ? '用户' : r.name) + '] ' + escapeHTML(m.text) + '</div>').join('') : '<div class="mq-empty">暂无记忆</div>') +
    '<button class="mq-btn ghost" style="margin-top:10px" onclick="mqClearMem(\'' + id + '\')">清空该角色记忆</button></div>';
}

function mqClearMem(id) {
  if (!confirm('确定清空该角色全部记忆？')) return;
  const r = mqRole(id); if (r) r.memory = [];
  saveState(); mqShowMem(id);
}
