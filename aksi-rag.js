/**
 * AKSI Local RAG — in-browser vector memory
 * Embeddings: Transformers.js MiniLM (opt-in) or deterministic local fallback
 * Search: cosine similarity (no server)
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";

  var STORE_KEY = "aksi_rag_v1";
  var MAX_DOCS = 500;
  var DIM_FALLBACK = 64;
  var embedder = null;
  var embedStatus = "idle";
  var docs = [];

  function loadDocs() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      docs = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(docs)) docs = [];
    } catch (e) { docs = []; }
    return docs;
  }

  function saveDocs() {
    try {
      if (docs.length > MAX_DOCS) docs = docs.slice(-MAX_DOCS);
      localStorage.setItem(STORE_KEY, JSON.stringify(docs));
    } catch (e) {
      try {
        docs = docs.slice(-Math.floor(MAX_DOCS / 2));
        localStorage.setItem(STORE_KEY, JSON.stringify(docs));
      } catch (e2) {}
    }
  }

  function hashEmbed(text) {
    var t = String(text || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
    var vec = new Float32Array(DIM_FALLBACK);
    for (var i = 0; i < t.length; i++) {
      var w = t[i], h = 2166136261;
      for (var j = 0; j < w.length; j++) { h ^= w.charCodeAt(j); h = Math.imul(h, 16777619); }
      var idx = Math.abs(h) % DIM_FALLBACK;
      vec[idx] += 1; vec[(idx + 7) % DIM_FALLBACK] += 0.5;
    }
    var norm = 0; for (var k = 0; k < vec.length; k++) norm += vec[k] * vec[k];
    norm = Math.sqrt(norm) || 1;
    for (var k2 = 0; k2 < vec.length; k2++) vec[k2] /= norm;
    return Array.from(vec);
  }

  async function loadEmbedder(onProgress) {
    if (embedder) return embedder;
    embedStatus = "loading";
    try {
      var mod = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      if (onProgress) onProgress({ status: "download", text: "MiniLM embeddings…" });
      var pipe = await mod.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        progress_callback: function (p) { if (onProgress && p) onProgress(p); }
      });
      embedder = pipe; embedStatus = "ready"; return embedder;
    } catch (e) { embedStatus = "fallback"; embedder = null; return null; }
  }

  async function embed(text, onProgress) {
    text = String(text || "").slice(0, 4000);
    if (!text) return hashEmbed("");
    try {
      if (!embedder && embedStatus !== "fallback") await loadEmbedder(onProgress);
      if (embedder) {
        var out = await embedder(text, { pooling: "mean", normalize: true });
        return Array.from(out.data || out);
      }
    } catch (e) { embedStatus = "fallback"; }
    return hashEmbed(text);
  }

  function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    var dot = 0, na = 0, nb = 0;
    for (var i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
    var d = Math.sqrt(na) * Math.sqrt(nb);
    return d ? dot / d : 0;
  }

  async function add(text, meta) {
    text = String(text || "").trim();
    if (!text) throw new Error("Пустой текст");
    var vec = await embed(text);
    var doc = { id: "d" + Date.now() + "_" + Math.random().toString(36).slice(2, 7), text: text.slice(0, 8000), vec: vec, ts: Date.now(), meta: meta || null };
    loadDocs(); docs.push(doc); saveDocs(); return doc;
  }

  async function search(query, k) {
    k = k || 4; loadDocs();
    if (!docs.length) return [];
    var qv = await embed(query);
    var scored = docs.map(function (d) { return { doc: d, score: cosine(qv, d.vec) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k).filter(function (x) { return x.score > 0.05; });
  }

  async function buildContext(query, k) {
    var hits = await search(query, k || 4);
    if (!hits.length) return { context: "", hits: [] };
    var ctx = hits.map(function (h, i) { return "[" + (i + 1) + "] (sim " + h.score.toFixed(2) + ") " + h.doc.text; }).join("\n");
    return { context: ctx, hits: hits };
  }

  function list() { loadDocs(); return docs.map(function (d) { return { id: d.id, text: d.text, ts: d.ts, dim: (d.vec && d.vec.length) || 0 }; }); }
  function remove(id) { loadDocs(); docs = docs.filter(function (d) { return d.id !== id; }); saveDocs(); }
  function clear() { docs = []; saveDocs(); }
  function exportPlain() { loadDocs(); return { version: 1, type: "aksi-rag", exportedAt: Date.now(), docs: docs }; }
  function importPlain(payload) {
    if (!payload || !Array.isArray(payload.docs)) throw new Error("Неверный формат RAG");
    docs = payload.docs.filter(function (d) { return d && d.text && Array.isArray(d.vec); });
    saveDocs(); return docs.length;
  }
  function status() { return { docs: (loadDocs(), docs.length), embed: embedStatus, store: STORE_KEY }; }
  loadDocs();
  G.AKSI_RAG = { add: add, search: search, buildContext: buildContext, list: list, remove: remove, clear: clear, embed: embed, loadEmbedder: loadEmbedder, exportPlain: exportPlain, importPlain: importPlain, status: status };
})(typeof window !== "undefined" ? window : globalThis);
