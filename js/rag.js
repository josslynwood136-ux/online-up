// ============================================================
// rag.js - RAG 检索增强 + 向量化存储
// ============================================================

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

window.searchMemories = searchMemories;
window.pickRelevantMemories = pickRelevantMemories;
window.batchEmbedMemories = batchEmbedMemories;