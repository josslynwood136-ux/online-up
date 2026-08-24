// ============================================================
// profile-ig.js - IG 风格个人主页
// ============================================================

let selectedProfileAvatar = '🌸';
let selectedProfileAvatarImage = '';
let selectedProfileCoverImage = '';
let pendingPostImage = null;
let viewPostId = null;
let currentProfileTab = 'home';

function showIGToast(msg) {
  const el = $('igToast');
  if (!el) return alert(msg);
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2500);
}

function renderIGProfile() {
  const mc = c();
  if (mc) { mc.style.padding = '0'; mc.style.height = '100%'; mc.style.overflow = 'hidden'; }
  const ah = document.querySelector('.app-header');
  if (ah) ah.classList.add('hidden');
  setTitle('Instagram');
  const p = state.myProfile || (state.myProfile = {
    avatar: '🌸', avatarImage: '', coverImage: '',
    name: '我的名字', username: '@my_username',
    bio: '这个人很懒，什么都没写...', location: '🌍 地球',
    posts: 12, followers: 342, following: 156,
    gallery: ['💖','✨','🎨','🌈','🔥','🎵','📸','🦋','🌟']
  });
  currentProfileTab = 'home';

  c().innerHTML = `
    <div class="ig-app">
      <!-- IG Header -->
      <div class="ig-profile-header">
        <div class="logo-area">
          <svg class="ig-logo-glyph" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" stroke="none"/></svg>
          <span class="logo-text">Instagram</span>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" onclick="closeApp()" title="首页">✕</button>
        </div>
      </div>

      <!-- Panels Container -->
      <div class="ig-panels">
        <!-- Panel 1: Home / Feed -->
        <div class="profile-panel active" id="igPanelHome">
          <div class="feed-container" id="igFeedContainer"></div>
        </div>
        <!-- Panel 2: 角色库 -->
        <div class="profile-panel" id="igPanelSearch">
          <div class="char-lib-container">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="igSearchInput" placeholder="搜索角色名称..." oninput="renderCharLibrary()" />
            </div>
            <div style="padding:0 16px 10px;font-size:12px;color:#8e8e8e;">共 <span id="charLibCount">${state.roles.length}</span> 个角色</div>
            <div class="char-lib-grid" id="igCharLibrary"></div>
          </div>
        </div>
        <!-- Panel 3: DM -->
        <div class="profile-panel" id="igPanelDm">
          <div class="dm-container" id="igDmContainer"></div>
        </div>
        <!-- Panel 4: Profile -->
        <div class="profile-panel" id="igPanelProfile">
          <div class="profile-panel-content" id="igProfileContent"></div>
        </div>
      </div>

      <!-- IG Bottom Navigation -->
      <div class="profile-nav" id="igProfileNav">
        <div class="nav-item active" data-tab="home" onclick="switchProfileTab('home')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v9a1 1 0 001 1h3m-4-5a1 1 0 011-1h2a1 1 0 011 1v5m0 0a1 1 0 001 1h3a1 1 0 001-1v-9"/></svg></span>
          <span class="nav-label">首页</span>
        </div>
        <div class="nav-item" data-tab="search" onclick="switchProfileTab('search')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg></span>
          <span class="nav-label">搜索</span>
        </div>
        <div class="nav-item" data-tab="post" onclick="openPostCreator()">
          <span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg></span>
          <span class="nav-label">发布</span>
        </div>
        <div class="nav-item" data-tab="dm" onclick="switchProfileTab('dm')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></span>
          <span class="nav-label">私信</span>
        </div>
        <div class="nav-item" data-tab="profile" onclick="switchProfileTab('profile')">
          <span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
          <span class="nav-label">我的</span>
        </div>
      </div>
    </div>`;

  renderFeed();
}

// ====== Tab Switching ======
function switchProfileTab(tab) {
  if (tab === 'post') { openPostCreator(); return; }
  currentProfileTab = tab;
  document.querySelectorAll('#igProfileNav .nav-item').forEach(item => item.classList.remove('active'));
  const activeNav = document.querySelector(`#igProfileNav .nav-item[data-tab="${tab}"]`);
  if (activeNav) activeNav.classList.add('active');
  document.querySelectorAll('.ig-panels .profile-panel').forEach(p => p.classList.remove('active'));
  if (tab === 'home') {
    $('igPanelHome').classList.add('active');
    renderFeed();
  } else if (tab === 'search') {
    $('igPanelSearch').classList.add('active');
    renderIGLiveHall();
  } else if (tab === 'dm') {
    $('igPanelDm').classList.add('active');
    renderDmList();
  } else if (tab === 'profile') {
    $('igPanelProfile').classList.add('active');
    renderMyProfileContent();
  }
}

// ====== IG 搜索页 = 直播间大厅 ======
var _igHallTimer = null;
function renderIGLiveHall() {
  _igLiveMode = true;
  const panel = $('igPanelSearch');
  if (!panel) return;
  const char = activeCharacter();
  var cats = ['全部', '唱歌', '聊天', '美食', '学习'];
  panel.innerHTML = `
    <div class="hall-scroll ig-hall-embed">
      <div class="hall-bg"></div>
      <div class="hall-head">
        <div class="hall-title">啵啵间${paperName()}</div>
        <div class="hall-now">— · —</div>
      </div>
      <div class="hall-feature" onclick="openLiveRoom('')">
        <div class="hall-feat-live">LIVE</div>
        <div class="hall-feat-info">
          <div class="hall-feat-avatar" onclick="event.stopPropagation();liveOpenProfile('')" title="我的主页">${renderAvatar(char.avatar, char.name)}</div>
          <div class="hall-feat-mid">
            <div class="hall-feat-head">今 日 头 条</div>
            <div class="hall-feat-title">${escapeHTML(char.name)} 的直播间</div>
            <div class="hall-feat-sub">${escapeHTML(char.relation || '我们的主播')} · 进去聊聊</div>
          </div>
          <div class="hall-feat-right">
            <div class="hall-feat-viewers">观众 <b>${state.live.viewer || 12}</b> 人</div>
            <button class="hall-enter-btn">进场</button>
          </div>
        </div>
      </div>
      <div class="hall-cats">${cats.map(function (c2) { return '<span class="hall-cat' + (c2 === '全部' ? ' on' : '') + '" data-cat="' + c2 + '" onclick="filterHall(\'' + c2 + '\')">' + c2 + '</span>'; }).join('')}</div>
      <div class="hall-grid" id="hallGrid"></div>
    </div>`;
  updateRoomSchedule();
  renderHallRooms('全部');
  refreshHallMasthead();
  if (_igHallTimer) clearInterval(_igHallTimer);
  _igHallTimer = setInterval(hallTicker, 3200);
}

// ====== Feed / Home ======
function getCharInfo(charId) {
  return (state.roles || []).find(function(r) { return r.id === charId; });
}

var _genPostPending = false;

function ensureCharAutoPosts() {
  if (typeof willowBlocksProactive === 'function' && willowBlocksProactive()) return;
  (state.roles || []).forEach(function(char) {
    if (!char.autoPost) return;
    if (!char.igPosts) char.igPosts = [];
    var today = new Date().toDateString();
    var hasToday = char.igPosts.some(function(p) { return new Date(p.time).toDateString() === today; });
    if (hasToday) return;
    generateCharPost(char);
  });
}

async function generateCharPost(char) {
  var ap = state.apiProfiles && state.activeApiProfile
    ? state.apiProfiles.find(function(p) { return p.id === state.activeApiProfile; }) : null;
  var cfg = ap || state.api;
  if (!cfg.key || !cfg.url || !cfg.model) return;
  var prompt = '你是一个角色。根据以下角色设定，发一条 Instagram 动态（一句话 + 一个emoji）。只输出动态内容，不要解释，不要加引号。\n\n角色名：' + char.name + '\n性格：' + (char.personality || '普通') + '\n说话风格：' + (char.style || '普通') + '\n背景：' + (char.background || '无');
  var memText = '';
  if (typeof pickRelevantMemories === 'function') {
    var mems = pickRelevantMemories(char, '').slice(0, 6);
    if (mems.length) memText = '\n【你对用户的记忆】\n' + mems.map(function(m) { return '- ' + (m.title ? m.title + '：' : '') + m.text; }).join('\n');
  }
  prompt += '\n\n这些记忆是你和对方之间真实发生过 / 对方说过的。如果合适，可以基于其中一条发一条动态（比如「路过那家你说想去的店啦🏪」），自然地让粉丝看到你们的小故事；也可以完全不提记忆，发当下随感。\n\n示例输出：\n今天天气真好，出去走走🌤️';
  if (memText) prompt += '\n\n' + memText;
  var wishCtx = (typeof willowContextText === 'function') ? willowContextText() : '';
  if (wishCtx) prompt += '\n\n' + wishCtx;
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 15000);
  try {
    var res = await aiRequest(joinUrl(cfg.url, 'chat/completions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key },
      signal: controller.signal,
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 80,
        temperature: 0.8
      })
    });
    var data = await res.json().catch(function() { return {}; });
    if (!res.ok) return;
    var text = (data.choices?.[0]?.message?.content || '').trim();
    if (!text) return;
    var emojiMatch = text.match(/([\u2600-\u27ff\u{1F000}-\u{1FFFF}]|[\u2700-\u27BF])/u);
    var caption = text;
    var emoji = '💬';
    if (emojiMatch) {
      emoji = emojiMatch[0];
      caption = text.replace(emoji, '').replace(/\s*\n\s*/g, ' ').trim();
    }
    if (!char.igPosts) char.igPosts = [];
    char.igPosts.push({
      id: 'cp_' + char.id + '_' + Date.now(),
      caption: caption,
      emoji: (emoji ? emoji[0] : '💬'),
      time: Date.now() - Math.floor(Math.random() * 3600000),
      likes: Math.floor(Math.random() * 18) + 1,
      liked: false
    });
    saveState();
    renderFeed();
  } catch (e) {
    // 忽略失败
  } finally {
    clearTimeout(timer);
  }
}

function bindStoryItems() {
  document.querySelectorAll('.ig-story-item[data-char]').forEach(function(item) {
    if (item._igBound) return;
    item._igBound = true;
    var charId = item.getAttribute('data-char');
    var timer = null, held = false;
    function start(ev) {
      if (ev.touches && ev.touches.length > 1) return;
      held = false;
      timer = setTimeout(function() { held = true; window._igHeld = true; openCharFromLib(charId); }, 520);
    }
    function cancel() {
      if (timer) { clearTimeout(timer); timer = null; }
    }
    item.addEventListener('touchstart', start, { passive: true });
    item.addEventListener('touchend', cancel);
    item.addEventListener('touchmove', cancel);
    item.addEventListener('touchcancel', cancel);
    item.addEventListener('mousedown', start);
    item.addEventListener('mouseup', cancel);
    item.addEventListener('mouseleave', cancel);
    item.addEventListener('click', function(ev) {
      cancel();
      if (window._igHeld) { window._igHeld = false; ev.preventDefault(); ev.stopPropagation(); return; }
      ev.preventDefault();
      openIGStory(charId);
    });
  });
}

function renderFeed() {
  var container = $('igFeedContainer');
  if (!container) return;
  var chars = state.roles || [];
  var myProfile = state.myProfile || {};

  ensureCharAutoPosts();

  // Stories
  var storyUsers = [{ id: '_self', avatar: myProfile.avatarImage || myProfile.avatar || '👤', name: '你的快拍', isSelf: true }];
  chars.forEach(function(char) {
    if (char && char.name) storyUsers.push({ id: char.id, avatar: char.avatar, name: char.name });
  });
  var viewed = state.viewedStories || {};
  var storiesHtml = '<div class="ig-stories"><div class="ig-stories-track">';
  storyUsers.forEach(function(u) {
    var isImg = u.avatar && u.avatar.startsWith && (u.avatar.startsWith('http') || u.avatar.startsWith('data:'));
    var avatarContent = isImg ? '<img src="' + u.avatar + '" />' : escapeHTML(u.avatar || '👤');
    var ringCls = u.isSelf ? 'story-ring-self' : (viewed[u.id] ? 'story-ring-viewed' : 'story-ring-new');
    var dataAttr = u.isSelf ? '' : 'data-char="' + u.id + '"';
    storiesHtml += '<div class="ig-story-item" ' + dataAttr + '><div class="ig-story-ring ' + ringCls + '"><div class="ig-story-avatar">' + avatarContent + '</div></div><div class="ig-story-name">' + escapeHTML(u.isSelf ? '你的快拍' : (u.name || '')) + '</div></div>';
  });
  // 加角色按钮（右侧）
  storiesHtml += '<div class="ig-story-item" onclick="createCharFromLib()"><div class="ig-story-ring ig-story-ring-add"><div class="ig-story-avatar ig-story-add-avatar">＋</div></div><div class="ig-story-name">添加</div></div>';
  storiesHtml += '</div></div>';

  // 汇总所有帖子
  var allPosts = [];
  var myImg = myProfile.avatarImage || '';
  var myAvatarHtml = myImg ? '<img src="' + myImg + '" />' : escapeHTML(myProfile.avatar || '👤');
  var myDisplayName = myProfile.username || '@my_username';

  (state.profilePosts || []).forEach(function(p) {
    allPosts.push({
      type: 'self', id: p.id,
      avatarHtml: myAvatarHtml, displayName: myDisplayName,
      content: p.image ? '<img src="' + p.image + '" style="filter:' + (p.filter || 'none') + '" />' : '<div style="font-size:80px;display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg-gray,#f0ede8);">📝</div>',
      caption: p.caption || '', time: p.time, likes: 0, liked: false
    });
  });

  chars.forEach(function(char) {
    if (!char.autoPost || !char.igPosts) return;
    var isImg = char.avatar && char.avatar.startsWith && (char.avatar.startsWith('http') || char.avatar.startsWith('data:'));
    var avatarHtml = isImg ? '<img src="' + char.avatar + '" />' : escapeHTML(char.avatar || '👤');
    char.igPosts.forEach(function(p) {
      allPosts.push({
        type: 'char', id: p.id, charId: char.id,
        avatarHtml: avatarHtml, displayName: char.name || char.username || '用户',
        content: '<div style="font-size:80px;display:flex;align-items:center;justify-content:center;height:100%;background:var(--bg-gray,#f0ede8);">' + p.emoji + '</div>',
        caption: p.caption || '', time: p.time, likes: p.likes, liked: p.liked
      });
    });
  });

  allPosts.sort(function(a, b) { return b.time - a.time; });

  if (allPosts.length === 0) {
    container.innerHTML = storiesHtml + '<div class="feed-empty">📷 还没有帖子<br><span style="font-size:12px;color:#bbb;">点击底部 + 发布第一条动态</span></div>';
    bindStoryItems();
    return;
  }

  var feedHtml = '';
  allPosts.forEach(function(post) {
    var likeBtn = post.liked ? '❤️' : '♡';
    var likeCls = post.liked ? 'action-btn liked' : 'action-btn';
    var likeHandler = post.type === 'self'
      ? 'showIGToast(\'❤️ 已赞\')'
      : 'igLikeAutoPost(\'' + post.id + '\',\'' + post.charId + '\')';
    feedHtml += '<div class="feed-post">';
    feedHtml += '<div class="feed-post-header"><div class="feed-avatar">' + post.avatarHtml + '</div><span class="feed-username">' + escapeHTML(post.displayName) + '</span><button class="feed-more">⋯</button></div>';
    feedHtml += '<div class="feed-post-image">' + post.content + '</div>';
    feedHtml += '<div class="feed-post-actions"><button class="' + likeCls + '" onclick="' + likeHandler + '">' + likeBtn + '</button><button class="action-btn" onclick="showIGToast(\'💬 评论\')">💬</button><button class="action-btn save-btn" onclick="showIGToast(\'已保存\')">🏷️</button></div>';
    feedHtml += '<div class="feed-post-likes">❤️ ' + post.likes + ' 次赞</div>';
    feedHtml += '<div class="feed-post-caption"><span class="cap-user">' + escapeHTML(post.displayName) + '</span>' + escapeHTML(post.caption) + '</div>';
    feedHtml += '<div class="feed-post-time">' + formatPostTime(post.time) + '</div></div>';
  });
  container.innerHTML = storiesHtml + feedHtml;
  bindStoryItems();
}

function igLikeAutoPost(postId, charId) {
  var chars = state.roles || [];
  for (var c = 0; c < chars.length; c++) {
    var char = chars[c];
    if (char.id !== charId || !char.igPosts) continue;
    for (var i = 0; i < char.igPosts.length; i++) {
      if (char.igPosts[i].id === postId) {
        char.igPosts[i].liked = !char.igPosts[i].liked;
        char.igPosts[i].likes += char.igPosts[i].liked ? 1 : -1;
        saveState();
        renderFeed();
        return;
      }
    }
  }
}

var IG_STORY_ITEMS = [
  { emoji: '🌅', text: '早安' }, { emoji: '🍜', text: '美食' },
  { emoji: '🏃', text: '运动' }, { emoji: '📖', text: '读书' },
  { emoji: '🎵', text: '音乐' }, { emoji: '☕', text: '咖啡' },
  { emoji: '🌙', text: '晚安' }, { emoji: '✈️', text: '旅行' }
];
function openIGStory(charId) {
  if (!state.viewedStories) state.viewedStories = {};
  state.viewedStories[charId] = true;
  var char = getCharInfo(charId);
  if (!char) return;
  var overlay = document.createElement('div');
  overlay.className = 'ig-story-viewer';
  overlay.innerHTML = '<div class="ig-story-bg" style="background:' + (char.color || '#333') + '"></div><div class="ig-story-content"><div class="ig-story-top-bar"><span class="ig-story-top-name">' + escapeHTML(char.name || '') + '</span><button class="ig-story-close" onclick="this.closest(\'.ig-story-viewer\').remove()">✕</button></div><div class="ig-story-main" style="font-size:96px">' + IG_STORY_ITEMS[Math.floor(Math.random() * IG_STORY_ITEMS.length)].emoji + '</div><div class="ig-story-hint">点击关闭</div></div>';
  overlay.onclick = function(e) { if (e.target === overlay || e.target.classList.contains('ig-story-bg') || e.target.classList.contains('ig-story-main') || e.target.classList.contains('ig-story-hint')) overlay.remove(); };
  document.body.appendChild(overlay);
  renderFeed();
}

// ====== 角色库 ======
function renderCharLibrary() {
  const grid = $('igCharLibrary');
  const count = $('charLibCount');
  if (!grid) return;
  const query = ($('igSearchInput') && $('igSearchInput').value || '').toLowerCase();
  const roles = state.roles || [];
  const filtered = query ? roles.filter(r => (r.name || '').toLowerCase().includes(query)) : roles;
  if (count) count.textContent = filtered.length;
  if (filtered.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:#999;padding:60px 20px;font-size:14px;">🔍 没有匹配的角色<br><span style="font-size:12px;color:#bbb;">试试其他关键词</span></div>';
    return;
  }
  grid.innerHTML = filtered.map(char => `
    <div class="char-lib-avatar-wrap" onclick="openCharFromLib('${char.id}')" title="${escapeHTML(char.name)}">
      <div class="char-lib-avatar">${renderAvatar(char.avatar, char.name)}</div>
      <div class="char-lib-name">${escapeHTML(char.name)}</div>
    </div>
  `).join('') + `
    <div class="char-lib-add-card" onclick="createCharFromLib()">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#c7c7c7" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
    </div>`;
}

function openCharFromLib(charId) {
  igEditingCharId = charId;
  renderIGCharEditor();
}

function createCharFromLib() {
  igEditingCharId = null;
  renderIGCharEditor();
}

let igEditingCharId = null;
let igCharAvatarData = '';

function renderIGCharEditor() {
  const isNew = !igEditingCharId;
  const char = isNew ? {} : (state.roles.find(r => r.id === igEditingCharId) || {});
  igCharAvatarData = isNew ? '' : (char.avatar || '');

  const avatarPreview = igCharAvatarData
    ? `<img src="${igCharAvatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : '<span style="color:#c7c7c7;font-size:14px;">📷</span>';

  c().innerHTML = `
    <div class="ig-app">
      <div class="ig-profile-header">
        <div class="logo-area">
          <span class="logo-text ig-title">${isNew ? '新角色' : '编辑角色'}</span>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" onclick="renderIGProfile()" title="返回">✕</button>
        </div>
      </div>
      <div class="ig-char-editor">
        <div class="ig-ce-section">
          <div class="ig-ce-label">头像</div>
          <div class="ig-ce-avatar-row">
            <div class="ig-ce-avatar" id="igCeAvatarDisplay" style="overflow:hidden;font-size:0;">${avatarPreview}</div>
            <div style="flex:1;">
              <button class="ig-ce-upload-btn" type="button" onclick="document.getElementById('igCeAvatarFile').click()">📷 选择图片</button>
              <div style="font-size:11px;color:#c7c7c7;margin-top:4px;">建议正方形图片，会自动压缩</div>
              <input type="file" id="igCeAvatarFile" accept="image/*" style="display:none;" onchange="igHandleAvatarUpload(event)">
              ${igCharAvatarData ? '<button class="ig-ce-upload-btn" style="margin-top:6px;background:#f5f5f5;color:#8e8e8e;" onclick="igClearAvatar()">移除头像</button>' : ''}
            </div>
          </div>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">名称</div>
          <input class="ig-ce-input" id="igCeName" placeholder="角色名字" value="${escapeHTML(char.name || '')}">
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">别名 / 小名</div>
          <input class="ig-ce-input" id="igCeAliases" placeholder="多个别名用逗号隔开" value="${escapeHTML(char.aliases || '')}">
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">关系</div>
          <input class="ig-ce-input" id="igCeRelation" placeholder="朋友 / 恋人 / 搭档..." value="${escapeHTML(char.relation || '')}">
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">性格标签</div>
          <textarea class="ig-ce-textarea" id="igCePersonality" placeholder="冷静、温柔、占有欲、毒舌...">${escapeHTML(char.personality || '')}</textarea>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">说话风格</div>
          <textarea class="ig-ce-textarea" id="igCeStyle" placeholder="短句、口语、会撒娇、少用感叹号...">${escapeHTML(char.style || '')}</textarea>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">背景故事</div>
          <textarea class="ig-ce-textarea" id="igCeBackground" placeholder="角色经历、身份、世界观..." rows="4">${escapeHTML(char.background || '')}</textarea>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">高级设定 Prompt</div>
          <textarea class="ig-ce-textarea" id="igCePrompt" placeholder="额外规则、禁止崩人设、互动边界..." rows="3">${escapeHTML(char.prompt || '')}</textarea>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">示例对话</div>
          <textarea class="ig-ce-textarea" id="igCeExamples" placeholder="写 3~5 段你和角色过去的对话示范，AI 会模仿这种说话方式。每段用「用户：… / 角色：…」表示，段间空一行：
用户：今天好冷
角色：冷你不会早点说

用户：想你了
角色：啧，这会儿想起我来了？" rows="5">${escapeHTML(char.examples || '')}</textarea>
        </div>
        <div class="ig-ce-section">
          <div class="ig-ce-label">开场白</div>
          <textarea class="ig-ce-textarea" id="igCeGreeting" placeholder="第一次聊天时角色说的话" rows="2">${escapeHTML(char.greeting || '')}</textarea>
        </div>
        ${isNew ? '' : `
        <div class="ig-ce-section">
          <div class="ig-ce-label">记忆库</div>
          <input class="ig-ce-input" id="igMemoryTitle" placeholder="记忆标题 / 标签">
          <textarea class="ig-ce-textarea" id="igMemoryText" placeholder="这个角色需要记住什么？" style="margin-top:8px;"></textarea>
          <button class="ig-ce-btn ig-ce-btn-primary" style="width:100%;margin-top:8px;" onclick="igAddMemory()">＋ 加入记忆</button>
          <div style="margin-top:10px;">
            ${renderMemoriesGrouped(char.memories, mem => `
              <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid #efefef;">
                <div style="flex:1;min-width:0;">
                  <b>${escapeHTML(mem.title || '记忆')}</b>
                  <div style="font-size:12px;color:#8e8e8e;margin-top:2px;word-break:break-all;">${escapeHTML(mem.text)}</div>
                </div>
                <button class="ig-ce-btn ig-ce-btn-danger" style="padding:4px 10px;font-size:12px;flex:0 0 auto;" onclick="igDeleteMemory('${mem.id}')">删</button>
              </div>`, '<div style="font-size:12px;color:#8e8e8e;padding:6px 0;">这个角色还没有记忆。</div>')}
          </div>
        </div>`}
        <div style="padding:16px 16px 30px;display:flex;gap:10px;">
          <button class="ig-ce-btn ig-ce-btn-secondary" onclick="renderIGProfile()" style="flex:1;">取消</button>
          <button class="ig-ce-btn ig-ce-btn-primary" onclick="saveIGCharEditor()" style="flex:1;">${isNew ? '创建角色' : '保存'}</button>
        </div>
        ${isNew ? '' : '<div style="padding:0 16px 30px;"><button class="ig-ce-btn ig-ce-btn-danger" onclick="deleteIGChar()" style="width:100%;">删除角色</button></div>'}
      </div>
    </div>`;
  // Highlight selected avatar
  document.querySelectorAll('.ig-avatar-opt').forEach(el => {
    el.style.borderColor = el.dataset.em === igCharAvatar ? '#262626' : 'transparent';
    el.style.background = el.dataset.em === igCharAvatar ? '#f5f5f5' : 'transparent';
  });
}

function igHandleAvatarUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showIGToast('请选择图片'); return; }
  compressAvatar(file).then(dataUrl => {
    igCharAvatarData = dataUrl;
    const display = $('igCeAvatarDisplay');
    if (display) display.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
  }).catch(err => showIGToast('读取失败'));
  event.target.value = '';
}

function igClearAvatar() {
  igCharAvatarData = '';
  const display = $('igCeAvatarDisplay');
  if (display) display.innerHTML = '<span style="color:#c7c7c7;font-size:14px;">📷</span>';
  const fileInput = $('igCeAvatarFile');
  if (fileInput) fileInput.value = '';
}

function igAddMemory() {
  if (!igEditingCharId) return;
  const char = state.roles.find(r => r.id === igEditingCharId);
  if (!char) return;
  const title = $('igMemoryTitle') ? $('igMemoryTitle').value.trim() : '';
  const text = $('igMemoryText') ? $('igMemoryText').value.trim() : '';
  if (!text) return showIGToast('请输入记忆内容');
  if (!Array.isArray(char.memories)) char.memories = [];
  char.memories.unshift({ id: 'mem-' + Date.now(), title: title, text: text, date: new Date().toLocaleString() });
  saveState();
  renderIGCharEditor();
}

function igDeleteMemory(memId) {
  if (!igEditingCharId) return;
  const char = state.roles.find(r => r.id === igEditingCharId);
  if (!char) return;
  char.memories = (char.memories || []).filter(mem => mem.id !== memId);
  saveState();
  renderIGCharEditor();
}

function saveIGCharEditor() {
  const name = $('igCeName').value.trim();
  if (!name) { showIGToast('请输入角色名称'); return; }
  const isNew = !igEditingCharId;
  const char = isNew ? {
    id: 'char-' + Date.now(),
    memories: [],
    chat: [],
    unread: 0,
    read: true,
    pinned: false,
    online: true,
    autoPost: false,
    igPosts: []
  } : state.roles.find(r => r.id === igEditingCharId);
  if (!char) return;
  char.avatar = igCharAvatarData;
  char.name = name;
  char.aliases = $('igCeAliases').value.trim();
  char.relation = $('igCeRelation').value.trim();
  char.personality = $('igCePersonality').value.trim();
  char.style = $('igCeStyle').value.trim();
  char.background = $('igCeBackground').value.trim();
  char.prompt = $('igCePrompt').value.trim();
  char.examples = $('igCeExamples').value.trim();
  char.greeting = $('igCeGreeting').value.trim() || '你好，我是' + name + '。';
  if (!char.chat.length) char.chat = [{ role: 'assistant', content: char.greeting }];
  if (isNew) {
    state.roles.push(char);
    state.activeRoleId = char.id;
  }
  saveState();
  renderIGProfile();
  setTimeout(() => { switchProfileTab('search'); renderCharLibrary(); }, 50);
  showIGToast(isNew ? '角色 ' + name + ' 已创建 ✨' : '角色已更新 ✅');
}

async function deleteIGChar() {
  if (!igEditingCharId) return;
  if (state.roles.length <= 1) { showIGToast('至少保留一个角色'); return; }
  if (!await uiConfirm('删除这个角色？')) return;
  state.roles = state.roles.filter(r => r.id !== igEditingCharId);
  if (state.activeRoleId === igEditingCharId) state.activeRoleId = state.roles[0].id;
  saveState();
  renderIGProfile();
  showIGToast('角色已删除');
}

// ====== DM List ======
function renderDmList() {
  const container = $('igDmContainer');
  if (!container) return;
  container.innerHTML = '';
  if (state.roles.length === 0) {
    container.innerHTML = '<div class="dialog-empty glass-dm-empty">💬 还没有对话<br><span style="font-size:12px;color:#bbb;">去联系人创建角色吧</span></div>';
    return;
  }
  state.roles.forEach(char => {
    const last = (char.chat || [])[char.chat.length - 1];
    const preview = last
      ? last.type === 'redpacket'
        ? '🧧 红包' + (last.note ? '：' + last.note.slice(0, 20) : '')
        : last.content.slice(0, 40) + (last.content.length > 40 ? '...' : '')
      : '还没有聊天记录';
    const time = last && last.time ? formatPostTime(last.time) : '';
    const div = document.createElement('div');
    div.className = 'dialog-item glass-dm-item';
    div.onclick = (e) => {
      e.stopPropagation();
      openChat(char.id, 'comic');
    };
    div.innerHTML = `
      <div class="dialog-avatar">${renderAvatar(char.avatar, char.name)}</div>
      <div class="dialog-info">
        <div class="dialog-name">${escapeHTML(char.name)}</div>
        <div class="dialog-preview">${escapeHTML(preview)}</div>
      </div>
      <div class="dialog-time">${time}</div>
    `;
    container.appendChild(div);
  });
}

// ====== My Profile Content (Panel 4) ======
function renderMyProfileContent() {
  const p = state.myProfile || (state.myProfile = {
    avatar: '🌸', avatarImage: '', coverImage: '',
    name: '我的名字', username: '@my_username',
    bio: '这个人很懒，什么都没写...', location: '🌍 地球',
    posts: 12, followers: 342, following: 156,
    gallery: ['💖','✨','🎨','🌈','🔥','🎵','📸','🦋','🌟']
  });
  const container = $('igProfileContent');
  if (!container) return;
  const postEmojis = p.gallery || ['💖','✨','🎨','🌈','🔥','🎵','📸','🦋','🌟'];

  let avatarHtml = p.avatar || '🌸';
  if (p.avatarImage) avatarHtml = `<img src="${p.avatarImage}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;

  container.innerHTML = `
    <div class="profile-cover${p.coverImage ? '' : ' no-custom-bg'}" style="${p.coverImage ? 'background-image:url(' + p.coverImage.replace(/"/g,'"') + ');' : ''}">
      <div class="profile-avatar" onclick="openProfileEditor()" style="overflow:hidden;font-size:${p.avatarImage ? '0' : '40px'};">${p.avatarImage ? '<img src="' + p.avatarImage + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />' : (p.avatar || '🌸')}</div>
      <div class="profile-name">${escapeHTML(p.name)}</div>
      <div class="profile-username">${escapeHTML(p.username)}</div>
    </div>
    <div class="profile-stats">
      <div class="profile-stat"><div class="num">${postEmojis.length}</div><div class="lbl">帖子</div></div>
      <div class="profile-stat"><div class="num">${p.followers||342}</div><div class="lbl">粉丝</div></div>
      <div class="profile-stat"><div class="num">${p.following||156}</div><div class="lbl">关注</div></div>
    </div>
    <div class="profile-bio">
      <p>${escapeHTML(p.bio)}</p>
      <div class="bio-location">${escapeHTML(p.location)}</div>
    </div>
    <button class="profile-edit-btn" onclick="openProfileEditor()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> 编辑资料</button>
    <button class="profile-edit-btn" onclick="openPostCreator()" style="margin-top:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg> 发动态</button>
    <div class="profile-posts-header"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> 我的帖子</div>
    <div class="profile-posts-grid">
      ${state.profilePosts && state.profilePosts.length > 0
        ? state.profilePosts.slice(0, 9).map(p => `
          <div class="profile-post" onclick="viewPost('${p.id}')" style="background:#f7f5f0;">
            ${p.image ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;filter:${p.filter || 'none'};" />` : '<span style="font-size:24px;color:#fff;opacity:.6">📝</span>'}
          </div>
        `).join('')
        : (postEmojis.map(e => `<div class="profile-post">${e}</div>`).join(''))
      }
    </div>
  `;
}

// ====== Profile Editor ======
function openProfileEditor() {
  const p = state.myProfile || {};
  $('profileEditName').value = p.name || '';
  $('profileEditUsername').value = p.username || '';
  $('profileEditBio').value = p.bio || '';
  $('profileEditLocation').value = p.location || '';
  selectedProfileAvatar = p.avatar || '🌸';
  selectedProfileAvatarImage = p.avatarImage || '';
  selectedProfileCoverImage = p.coverImage || '';

  const ap = $('profileAvatarPreview');
  if (ap) {
    if (p.avatarImage) {
      ap.innerHTML = '<img src="' + p.avatarImage + '" style="width:100%;height:100%;object-fit:cover;" />';
    } else {
      ap.innerHTML = p.avatar || '🌸';
    }
  }
  const coverPreview = $('profileCoverPreview');
  if (coverPreview) {
    if (p.coverImage) {
      coverPreview.style.backgroundImage = 'url(' + p.coverImage + ')';
    } else {
      coverPreview.style.backgroundImage = 'linear-gradient(180deg,#ffffff,#f7f5f0)';
    }
  }
  $('profileModal').classList.add('active');
}

function closeProfileEditor() {
  $('profileModal').classList.remove('active');
}

function handleProfileAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showIGToast('图片不能超过 2MB'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    selectedProfileAvatarImage = e.target.result;
    selectedProfileAvatar = '';
    $('profileAvatarPreview').innerHTML = `<img src="${e.target.result}" />`;
  };
  reader.readAsDataURL(file);
}

function handleProfileCoverUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showIGToast('图片不能超过 2MB'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    selectedProfileCoverImage = e.target.result;
    $('profileCoverPreview').style.backgroundImage = `url(${e.target.result})`;
  };
  reader.readAsDataURL(file);
}

function resetProfileAvatar() {
  selectedProfileAvatarImage = '';
  selectedProfileAvatar = '🌸';
  $('profileAvatarPreview').innerHTML = '🌸';
}

function saveProfile() {
  if (!state.myProfile) state.myProfile = {};
  if (selectedProfileAvatarImage) {
    state.myProfile.avatarImage = selectedProfileAvatarImage;
    state.myProfile.avatar = '🌸';
  } else {
    state.myProfile.avatar = selectedProfileAvatar || '🌸';
    state.myProfile.avatarImage = '';
  }
  state.myProfile.coverImage = selectedProfileCoverImage || '';
  state.myProfile.name = $('profileEditName').value.trim() || '我的名字';
  state.myProfile.username = $('profileEditUsername').value.trim() || '@my_username';
  state.myProfile.bio = $('profileEditBio').value.trim() || '';
  state.myProfile.location = $('profileEditLocation').value.trim() || '';
  var prof = activeProfile();
  if (prof) {
    prof.avatar = state.myProfile.avatarImage || state.myProfile.avatar || '🌸';
    prof.name = state.myProfile.name;
  }
  closeProfileEditor();
  renderMyProfileContent();
  saveState();
  showIGToast('资料已更新 ✅');
}

// ====== Post Creator ======
function openPostCreator() {
  pendingPostImage = null;
  $('postCreator').classList.add('active');
  $('postCreatorPlaceholder').style.display = 'block';
  $('postCreatorImage').style.display = 'none';
  $('postCreatorFilters').style.display = 'none';
  $('postCreatorCaptionArea').classList.add('active');
  $('postCreatorNext').textContent = '发布';
  $('postCreatorNext').classList.add('ready');
  $('postCreatorCaption').value = '';
  setTimeout(() => $('postCreatorCaption').focus(), 100);
}

function closePostCreator() {
  $('postCreator').classList.remove('active');
  pendingPostImage = null;
}

function handlePostImageSelect(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    pendingPostImage = e.target.result;
    var img = $('postCreatorImage');
    img.src = pendingPostImage;
    img.style.display = 'block';
    img.style.filter = 'none';
    $('postCreatorPlaceholder').style.display = 'none';
    $('postCreatorFilters').style.display = 'flex';
    $('postCreatorNext').classList.add('ready');
    document.querySelectorAll('#postCreatorFilters .filter-option').forEach(function(f) { f.classList.remove('active'); });
    var first = document.querySelector('#postCreatorFilters .filter-option[data-filter="none"]');
    if (first) first.classList.add('active');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function setPostFilter(filter) {
  var img = $('postCreatorImage');
  if (img) img.style.filter = filter;
  document.querySelectorAll('#postCreatorFilters .filter-option').forEach(function(f) { f.classList.remove('active'); });
  var opt = document.querySelector('#postCreatorFilters .filter-option[data-filter="' + filter + '"]');
  if (opt) opt.classList.add('active');
}

function postCreatorNext() {
  publishPost();
}

function publishPost() {
  var caption = $('postCreatorCaption').value.trim();
  var filter = pendingPostImage ? ($('postCreatorImage').style.filter || 'none') : 'none';
  if (!caption && !pendingPostImage) { showIGToast('写点什么吧'); return; }
  state.profilePosts.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    image: pendingPostImage || '',
    filter: filter,
    caption: caption,
    time: Date.now()
  });
  $('postCreatorCaption').value = '';
  closePostCreator();
  saveState();
  renderMyProfileContent();
  renderFeed();
  showIGToast('已发布 ✨');
}

// ====== Post Detail ======
function viewPost(postId) {
  var post = state.profilePosts.find(function(p) { return p.id === postId; });
  if (!post) return;
  viewPostId = postId;
  $('postDetailImg').innerHTML = post.image ? '<img src="' + post.image + '" style="filter:' + (post.filter || 'none') + ';" />' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:80px;color:rgba(255,255,255,.2)">📝</div>';
  $('postDetailCaption').textContent = post.caption || '无标题';
  $('postDetailTime').textContent = formatPostTime(post.time);
  $('postDetailDelete').style.display = 'block';
  $('postDetail').classList.add('active');
}

function closePostDetail() {
  $('postDetail').classList.remove('active');
  viewPostId = null;
}

async function deletePost() {
  if (!viewPostId) return;
  if (!await uiConfirm('确定删除这条帖子？')) return;
  state.profilePosts = state.profilePosts.filter(function(p) { return p.id !== viewPostId; });
  closePostDetail();
  saveState();
  renderMyProfileContent();
  renderFeed();
  showIGToast('已删除');
}

// ====== Utils ======
function formatPostTime(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  var now = new Date();
  var diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
  var month = d.getMonth() + 1;
  var day = d.getDate();
  return month + '/' + day;
}
