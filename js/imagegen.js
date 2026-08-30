// ============================================================
// imagegen.js - AI 绘图/生图 (SDXL / Flux / Midjourney)
// ============================================================

let imageGenLoading = false;
let imageGenHistory = [];

function loadImageGenHistory() {
  try { return JSON.parse(localStorage.getItem('imagegen.history') || '[]'); } catch(e) { return []; }
}
function saveImageGenHistory() {
  try { localStorage.setItem('imagegen.history', JSON.stringify(imageGenHistory.slice(0, 50))); } catch(e) {}
}

// ===== 生成模式 =====
async function generateImage(prompt, mode, charId) {
  if (imageGenLoading) { quickNotice('正在生成中…'); return; }
  imageGenLoading = true;
  const btn = document.getElementById('imageGenBtn');
  if (btn) { btn.textContent = '⏳ 生成中…'; btn.disabled = true; }

  try {
    const res = await fetch('/api/imagegen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt,
        model: mode || 'sdxl',
        width: 1024,
        height: 1024,
        charId: charId || ''
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || '生成失败');
    }
    const data = await res.json();
    const imageUrl = data.imageUrl;
    const result = {
      id: 'img-' + Date.now(),
      prompt: prompt,
      mode: mode || 'sdxl',
      url: imageUrl,
      timestamp: Date.now()
    };
    imageGenHistory.unshift(result);
    saveImageGenHistory();
    showGeneratedImage(imageUrl, prompt, mode);
    quickNotice('🎨 生成成功！');
  } catch(e) {
    quickNotice('生成失败：' + (e.message || '未知错误'));
  } finally {
    imageGenLoading = false;
    if (btn) { btn.textContent = '🎨 AI 生图'; btn.disabled = false; }
  }
}

// ===== 在聊天中生成 =====
function genImageInChat() {
  const char = activeCharacter();
  const name = char ? char.name : '角色';
  uiPrompt('想生成什么图片？描述越详细越好：', '').then(function(imgPrompt) {
    if (!imgPrompt || !imgPrompt.trim()) return;
    const mode = 'sdxl';
    appendBubble('user', '[正在用AI生成图片：' + imgPrompt.trim() + ']', null);
    generateImage(imgPrompt.trim(), mode, char ? char.id : '');
  });
}

// ===== 在IG发帖时生成配图 =====
function genImageForPost() {
  uiPrompt('想生成什么图片作为封面？', '').then(function(imgPrompt) {
    if (!imgPrompt || !imgPrompt.trim()) return;
    generateImage(imgPrompt.trim(), 'sdxl', '');
  });
}

function showGeneratedImage(url, prompt, mode) {
  const existing = $('imageGenPreview');
  if (existing) existing.remove();
  const preview = document.createElement('div');
  preview.id = 'imageGenPreview';
  preview.className = 'image-gen-preview';
  preview.innerHTML = `
    <div class="image-gen-overlay" onclick="this.remove()"></div>
    <div class="image-gen-card">
      <img src="${url}" alt="AI生成" style="width:100%;max-height:70vh;object-fit:contain;border-radius:12px">
      <div class="image-gen-info">
        <span>${escapeHTML(prompt)}</span>
        <span class="image-gen-mode">${mode.toUpperCase()}</span>
      </div>
      <div class="image-gen-actions">
        <button class="primary-btn" onclick="saveGenImage()">💾 保存</button>
        <button class="ghost-btn" onclick="$('imageGenPreview').remove()">✕</button>
      </div>
    </div>
  `;
  document.body.appendChild(preview);
}

function saveGenImage() {
  const url = $('imageGenPreview') ? $('imageGenPreview').querySelector('img')?.src : '';
  if (!url) return;
  const prompt = prompt('给这张图片加个标题：');
  state.profilePosts.unshift({
    id: 'img-' + Date.now(),
    image: url,
    caption: prompt || 'AI生成',
    time: Date.now(),
    likes: 0,
    liked: false,
    comments: []
  });
  saveState();
  renderMyProfileContent();
  renderFeed();
  quickNotice('已保存到帖子 ✨');
  const preview = $('imageGenPreview');
  if (preview) preview.remove();
}

// ===== 历史记录 =====
function showImageGenHistory() {
  const history = loadImageGenHistory();
  const container = $('imageGenHistory');
  if (!container) return;
  if (!history.length) {
    container.innerHTML = '<div class="empty">还没有生成记录</div>';
    return;
  }
  container.innerHTML = history.map(function(item) {
    return `<div class="history-item">
      <img src="${item.url}" alt="${escapeHTML(item.prompt)}" onerror="this.style.display='none'">
      <div class="history-info">
        <div class="history-prompt">${escapeHTML(item.prompt)}</div>
        <div class="history-mode">${item.mode.toUpperCase()}</div>
      </div>
      <button class="ghost-btn" onclick="useGenImage('${item.url}')">使用</button>
    </div>`;
  }).join('');
}

function useGenImage(url) {
  const input = document.createElement('input');
  input.type = 'hidden';
  input.id = 'genImageInput';
  document.body.appendChild(input);
  // 直接将图片 URL 作为数据传递
  $('genImageInput').value = url;
}

// ===== 模型选择 =====
function renderImageGenOptions() {
  const container = $('imageGenOptions');
  if (!container) return;
  container.innerHTML = `
    <div class="image-gen-models">
      <label class="model-opt"><input type="radio" name="imgModel" value="sdxl" checked> SDXL</label>
      <label class="model-opt"><input type="radio" name="imgModel" value="flux"> Flux</label>
      <label class="model-opt"><input type="radio" name="imgModel" value="midjourney"> Midjourney</label>
      <label class="model-opt"><input type="radio" name="imgModel" value="stable-diffusion"> Stable Diffusion</label>
    </div>
  `;
}

// ===== 暴露全局 =====
window.generateImage = generateImage;
window.genImageInChat = genImageInChat;
window.genImageForPost = genImageForPost;
window.showImageGenHistory = showImageGenHistory;
window.useGenImage = useGenImage;
window.renderImageGenOptions = renderImageGenOptions;
window.loadImageGenHistory = loadImageGenHistory;