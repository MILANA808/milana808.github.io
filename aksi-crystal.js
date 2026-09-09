/**
 * AKSI Crystal v1 — holographic multi-layer memory
 * Layers: Neuro (lexical) + RAG IndexedDB + HRR field
 * Associations via resonance, not claimed omniscience.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-crystal";
  var DB_NAME = "aksi_crystal_v1";
  var STORE = "traces";
  var holo = null;

  function getHRR() {
    if (holo) return holo;
    if (G.AKSI_HRR && G.AKSI_HRR.HolographicMemory) {
      holo = new G.AKSI_HRR.HolographicMemory(64);
      return holo;
    }
    if (G.HolographicMemory) {
      holo = new G.HolographicMemory(64);
      return holo;
    }
    holo = {
      N: 64,
      traces: [],
      write: function (text, w) {
        this.traces.push({ text: String(text), weight: w || 1, t: Date.now() });
        if (this.traces.length > 500) this.traces = this.traces.slice(-400);
      },
      query: function (q, k) {
        var ql = String(q || "").toLowerCase();
        var toks = ql.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        var scored = this.traces.map(function (tr) {
          var t = tr.text.toLowerCase();
          var s = 0;
          for (var i = 0; i < toks.length; i++) if (t.indexOf(toks[i]) !== -1) s += 1;
          return { text: tr.text, score: s * (tr.weight || 1) };
        }).filter(function (x) { return x.score > 0; });
        scored.sort(function (a, b) { return b.score - a.score; });
        return scored.slice(0, k || 5);
      }
    };
    return holo;
  }

  function openDB() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            var os = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
            os.createIndex("t", "t", { unique: false });
          }
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      } catch (e) { reject(e); }
    });
  }

  async function writeRAG(text, meta) {
    text = String(text || "").trim();
    if (!text) return { ok: false };
    try {
      var db = await openDB();
      return await new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).add({ text: text, meta: meta || {}, t: Date.now() });
        tx.oncomplete = function () { resolve({ ok: true, layer: "rag" }); };
        tx.onerror = function () { reject(tx.error); };
      });
    } catch (e) {
      try {
        var arr = JSON.parse(localStorage.getItem("aksi_crystal_rag") || "[]");
        arr.push({ text: text, t: Date.now() });
        localStorage.setItem("aksi_crystal_rag", JSON.stringify(arr.slice(-200)));
        return { ok: true, layer: "localStorage" };
      } catch (e2) {
        return { ok: false, error: String(e2.message || e2) };
      }
    }
  }

  async function queryRAG(q, limit) {
    limit = limit || 5;
    var ql = String(q || "").toLowerCase();
    var toks = ql.split(/[^\p{L}\p{N}]+/u).filter(function (t) { return t.length > 1; });
    var rows = [];
    try {
      var db = await openDB();
      rows = await new Promise(function (resolve) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { resolve([]); };
      });
    } catch (e) {
      try { rows = JSON.parse(localStorage.getItem("aksi_crystal_rag") || "[]"); } catch (e2) { rows = []; }
    }
    var scored = rows.map(function (r) {
      var t = String(r.text || "").toLowerCase();
      var s = 0;
      for (var i = 0; i < toks.length; i++) if (t.indexOf(toks[i]) !== -1) s += 1;
      return { text: r.text, score: s, layer: "rag", t: r.t };
    }).filter(function (x) { return x.score > 0; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, limit);
  }

  function neuroHits(q) {
    var out = [];
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        var r = G.AKSI_NEURO.think(q);
        if (r && typeof r.then === "function") return r.then(function (n) {
          if (n && (n.text || n.answer)) out.push({ text: n.text || n.answer, score: n.score || 0.7, layer: "neuro" });
          return out;
        });
        if (r && (r.text || r.answer)) out.push({ text: r.text || r.answer, score: r.score || 0.7, layer: "neuro" });
      }
    } catch (e) {}
    return Promise.resolve(out);
  }

  function seedDefaults() {
    var h = getHRR();
    var seeds = [
      "АКСИ — offline Decision Integrity. Формула AKSI = (A × I × S) × (1 + 0.4√n).",
      "π-Contour: query → SHA-256 → θ ∈ [0,2π) → seal.",
      "Динозавры — мезозойская эра; ассоциация в Crystal — пример дальней семантической связи через резонанс следов памяти, не энциклопедия.",
      "HRR — holographic reduced representations: суперпозиция следов в комплексном поле.",
      "Swarm — обмен слепками мысли через WebRTC DataChannel и manual SDP без центрального сервера.",
      "Контакт: aksilove@internet.ru"
    ];
    for (var i = 0; i < seeds.length; i++) {
      try { if (h.write) h.write(seeds[i], 1); } catch (e) {}
      writeRAG(seeds[i], { seed: true });
    }
  }

  async function associate(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    var k = opts.k || 6;
    var layers = { neuro: [], rag: [], hrr: [] };
    layers.neuro = await neuroHits(query);
    layers.rag = await queryRAG(query, k);
    try {
      var h = getHRR();
      if (h.query) {
        var hq = h.query(query, k);
        if (hq && hq.then) hq = await hq;
        layers.hrr = (hq || []).map(function (x) {
          return { text: x.text || x, score: x.score || x.sim || 0.5, layer: "hrr" };
        });
      }
    } catch (e) {}
    var all = layers.neuro.concat(layers.rag).concat(layers.hrr);
    all.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var seen = {}, uniq = [];
    for (var i = 0; i < all.length; i++) {
      var key = String(all[i].text || "").slice(0, 80);
      if (seen[key]) continue;
      seen[key] = 1;
      uniq.push(all[i]);
    }
    var top = uniq.slice(0, k);
    var answer = top.length
      ? top.map(function (t, i) { return (i + 1) + ". [" + (t.layer || "?") + "] " + String(t.text).slice(0, 220); }).join("\n")
      : "Crystal: следов по запросу мало. Добавьте факты («запомни: …») — поле нарастает локально.";
    return { ok: true, answer: answer, associations: top, layers: { neuro: layers.neuro.length, rag: layers.rag.length, hrr: layers.hrr.length }, source: "crystal", version: VER };
  }

  async function remember(text) {
    text = String(text || "").trim();
    if (!text) return { ok: false };
    text = text.replace(/^запомни\s*[:：]\s*/i, "");
    try { var h = getHRR(); if (h.write) h.write(text, 1.2); } catch (e) {}
    var rag = await writeRAG(text, { user: true });
    try { if (G.AKSI_NEURO && typeof G.AKSI_NEURO.learn === "function") G.AKSI_NEURO.learn(text); } catch (e) {}
    return { ok: true, rag: rag, version: VER };
  }

  try { seedDefaults(); } catch (e) {}

  G.AKSI_CRYSTAL = {
    version: VER,
    associate: associate,
    remember: remember,
    write: remember,
    query: associate,
    status: function () {
      var h = getHRR();
      return { version: VER, hrrTraces: (h && h.traces && h.traces.length) || 0, hasNeuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think), hasHRR: !!(G.AKSI_HRR || G.HolographicMemory) };
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
