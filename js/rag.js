// ============================================================
// rag.js - RAG 检索增强 + 向量化存储 + 时间线摘要
// ============================================================

const RAG_STORAGE_KEY = 'rag.timelines';
const RAG_EMBED_KEY = 'rag.embeddings';
const TIMELINE_SUMMARY_KEY = 'rag.timelineSummaries';

// ===== 时间线系统 =====
function addTimelineEntry(entry) {
  let timelines = loadTimelines();
  timelines.unshift({
    id: 'tl-' + Date.now(),
    date: new Date().toISOString(),
    time: new Date().toLocaleString(),
    type: entry.type || 'chat',
    role: entry.role || '',
    charId: entry.charId || '',
    content: entry.content || '',
    summary: '',
    mood: entry.mood || ''
  });
  if (timelines.length > 500) timelines = timelines.slice(0, 500);
  saveTimelines(timelines);
  return timelines[0];
}

function loadTimelines() {
  try { return JSON.parse(localStorage.getItem(RAG_STORAGE_KEY) || '[]'); } catch(e) { return []; }
}
function saveTimelines(data) {
  try { localStorage.setItem(RAG_STORAGE_KEY, JSON.stringify(data)); } catch(e) {}
}

// ===== 自动生成时间线摘要 =====
function generateTimelineSummary() {
  const timelines = loadTimelines();
  if (timelines.length < 3) return;
  const recent = timelines.slice(0, 20);
  const chatEntries = recent.filter(function(e) { return e.type === 'chat'; });
  if (chatEntries.length < 3) return;
  let summaries = loadTimelineSummaries();
  const lastSummary = summaries.length > 0 ? summaries[0] : null;
  const lastDate = lastSummary ? (lastSummary.date || '').slice(0, 10) : '';
  const today = new Date().toISOString().slice(0, 10);
  if (lastDate === today && lastSummary) return;
  const userMsgs = chatEntries.filter(function(e) { return e.role === 'user'; }).slice(0, 10);
  const assistantMsgs = chatEntries.filter(function(e) { return e.role === 'assistant'; }).slice(0, 5);
  if (userMsgs.length < 2) return;
  const userTopics = userMsgs.map(function(m) { return m.content; }).join(' ');
  const summaryText = `今日摘要：用户与角色进行了${chatEntries.length}次对话。用户话题包括「${userTopics.slice(0, 200)}」。`;
  summaries.unshift({
    id: 'ts-' + Date.now(),
    date: today,
    time: new Date().toLocaleString(),
    summary: summaryText,
    chatCount: chatEntries.length,
    chars: Array.from(new Set(chatEntries.map(function(e) { return e.charId; })))
  });
  if (summaries.length > 100) summaries = summaries.slice(0, 100);
  saveTimelineSummaries(summaries);
}

function loadTimelineSummaries() {
  try { return JSON.parse(localStorage.getItem(TIMELINE_SUMMARY_KEY) || '[]'); } catch(e) { return []; }
}
function saveTimelineSummaries(data) {
  try { localStorage.setItem(TIMELINE_SUMMARY_KEY, JSON.stringify(data)); } catch(e) {}
}

// ===== 简易向量嵌入（基于关键词的特征向量） =====
function simpleEmbed(text) {
  const words = (text || '').toLowerCase().split(/\W+/).filter(function(w) { return w.length > 1; });
  const vec = new Array(64).fill(0);
  words.forEach(function(w) {
    const hash = simpleHash(w);
    vec[hash % 64] += 1;
  });
  const max = Math.max.apply(null, vec.concat([1]));
  return vec.map(function(v) { return v / max; });
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ===== 记忆检索（RAG） =====
function searchMemories(query, charId, topK) {
  topK = topK || 5;
  const char = getRole(charId);
  const memories = char ? (char.memories || []) : [];
  if (!memories.length) return [];
  const queryVec = simpleEmbed(query);
  const scored = memories.map(function(mem) {
    const memVec = simpleEmbed((mem.title || '') + ' ' + (mem.text || '') + ' ' + (mem.tags || '').join(' '));
    const sim = cosineSimilarity(queryVec, memVec);
    const textSim = textSimilarity(query, mem.text);
    const combined = sim * 0.6 + textSim * 0.4;
    return Object.assign({}, mem, { score: combined });
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, topK);
}

function textSimilarity(query, text) {
  if (!query || !text) return 0;
  const qWords = query.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 1; });
  const tWords = text.toLowerCase().split(/\W+/).filter(function(w) { return w.length > 1; });
  if (!qWords.length || !tWords.length) return 0;
  let hits = 0;
  qWords.forEach(function(q) { tWords.forEach(function(t) { if (q === t) hits++; }); });
  return hits / Math.sqrt(qWords.length * tWords.length);
}

function pickRelevantMemories(char, query, limit) {
  limit = limit || 6;
  if (!query || !query.trim()) {
    const mems = char ? (char.memories || []) : [];
    return mems.sort(function(a, b) { return (b.weight || 3) - (a.weight || 3); }).slice(0, limit);
  }
  return searchMemories(query, char ? char.id : '', limit);
}

function getAllMemories() {
  const all = [];
  (state.roles || []).forEach(function(r) {
    (r.memories || []).forEach(function(m) {
      all.push(Object.assign({}, m, { charId: r.id, charName: r.name }));
    });
  });
  return all;
}

// ===== 向量化记忆（IndexedDB 存储） =====
function openRagDB() {
  return new Promise(function(resolve, reject) {
    const req = indexedDB.open('aiPhoneRAG', 1);
    req.onupgradeneeded = function(e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('embeddings')) db.createObjectStore('embeddings', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('memories')) db.createObjectStore('memories', { keyPath: 'id' });
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

async function storeEmbedding(memId, vec) {
  const db = await openRagDB();
  return new Promise(function(resolve, reject) {
    const tx = db.transaction('embeddings', 'readwrite');
    tx.objectStore('embeddings').put({ id: memId, vec: vec, ts: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

async function getEmbedding(memId) {
  const db = await openRagDB();
  return new Promise(function(resolve) {
    const tx = db.transaction('embeddings', 'readonly');
    const req = tx.objectStore('embeddings').get(memId);
    req.onsuccess = function() { resolve(req.result ? req.result.vec : null); };
    req.onerror = function() { resolve(null); };
  });
}

async function batchEmbedMemories() {
  const memories = getAllMemories();
  let count = 0;
  for (const mem of memories) {
    const vec = simpleEmbed((mem.title || '') + ' ' + (mem.text || '') + ' ' + (mem.tags || '').join(' '));
    await storeEmbedding(mem.id, vec);
    count++;
  }
  return count;
}

// ===== 时间线视图 =====
function renderTimeline() {
  const timelines = loadTimelines();
  const summaries = loadTimelineSummaries();
  const container = $('timelineContainer');
  if (!container) return;
  let html = '<div class="timeline-header"><h3>📅 对话时间线</h3>';
  if (summaries.length) {
    html += '<div class="timeline-summaries">';
    summaries.slice(0, 10).forEach(function(s) {
      html += `<div class="timeline-summary-card"><div class="tl-date">${escapeHTML(s.date)}</div><div class="tl-summary">${escapeHTML(s.summary)}</div><div class="tl-count">${s.chatCount} 次对话</div></div>`;
    });
    html += '</div>';
  }
  html += '</div><div class="timeline-entries">';
  timelines.slice(0, 50).forEach(function(t) {
    const char = getRole(t.charId);
    html += `<div class="tl-entry ${t.role || ''}">
      <div class="tl-time">${escapeHTML(t.time || '')}</div>
      <div class="tl-content">${escapeHTML((t.content || '').slice(0, 100))}</div>
      ${char ? `<div class="tl-char">${escapeHTML(char.name)}</div>` : ''}
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ===== RAG 增强的 AI 消息构建 =====
function buildAIMessagesWithRAG(userMsg, char) {
  const mems = searchMemories(userMsg, char ? char.id : '', 6);
  const base = [buildSystemPrompt(char)];
  if (mems.length) {
    base.push({ role: 'system', content: '【相关记忆】' + mems.map(function(m) { return (m.title ? m.title + '：' : '') + m.text; }).join('；') });
  }
  const recentChat = (char ? char.chat : []).slice(-20);
  recentChat.forEach(function(m) {
    base.push({ role: m.role, content: m.content || '' });
  });
  base.push({ role: 'user', content: userMsg });
  return base;
}

// ===== 手动触发记忆总结 =====
function triggerMemorySummary() {
  const mems = getAllMemories();
  if (!mems.length) { quickNotice('记忆库为空'); return; }
  generateTimelineSummary();
  batchEmbedMemories().then(function(count) {
    quickNotice('已生成时间线摘要 + 向量化 ' + count + ' 条记忆');
  }).catch(function() {
    quickNotice('时间线摘要生成完成');
  });
}

// ===== 导出 =====
function exportTimelines() {
  const data = { timelines: loadTimelines(), summaries: loadTimelineSummaries(), relationships: loadRelationships() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'rag-timelines-' + todayKey() + '.json'; a.click();
  URL.revokeObjectURL(url);
}

// ===== 挂载到 state.js 的自动记忆流程 =====
function autoSaveMemoryWithRAG(char) {
  if (!char) return;
  const chats = char.chat || [];
  if (!chats.length) return;
  const lastChat = chats[chats.length - 1];
  if (lastChat && lastChat.role === 'assistant' && lastChat.content) {
    addTimelineEntry({
      type: 'chat',
      role: 'assistant',
      charId: char.id,
      content: lastChat.content,
      mood: char.mood || ''
    });
    if ((char.memories || []).length > 0) {
      const mems = searchMemories(lastChat.content, char.id, 3);
      if (mems.length > 0) {
        addTimelineEntry({
          type: 'memory_hit',
          charId: char.id,
          content: '检索到记忆：' + mems.map(function(m) { return m.title; }).join(', '),
          mood: ''
        });
      }
    }
    generateTimelineSummary();
  }
  if (Math.random() < 0.1) {
    batchEmbedMemories().catch(function() {});
  }
}

window.addTimelineEntry = addTimelineEntry;
window.loadTimelines = loadTimelines;
window.renderTimeline = renderTimeline;
window.searchMemories = searchMemories;
window.pickRelevantMemories = pickRelevantMemories;
window.triggerMemorySummary = triggerMemorySummary;
window.exportTimelines = exportTimelines;
window.autoSaveMemoryWithRAG = autoSaveMemoryWithRAG;