/**
 * AKSI — Decentralized Knowledge Verifier (DKV) v1.2
 * Stable browser-safe claim verifier. Core AKSI is intentionally untouched.
 */
(function (global) {
  "use strict";

  var LEDGER_KEY = "aksi_dkv_ledger_v1";
  var MEM_KEY = "aksi_whole_mem_v3";

  function text(s) { return String(s == null ? "" : s); }
  function utf8(s) { return new TextEncoder().encode(text(s)); }
  function hex(buf) {
    var a = new Uint8Array(buf), out = "";
    for (var i = 0; i < a.length; i++) out += ("0" + a[i].toString(16)).slice(-2);
    return out;
  }
  function hash(s) {
    if (global.crypto && global.crypto.subtle) return global.crypto.subtle.digest("SHA-256", utf8(s)).then(hex);
    var h = 2166136261;
    s = text(s);
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return Promise.resolve((h >>> 0).toString(16).padStart(8, "0") + "-noncrypto-fallback");
  }
  function simpleHash(s) {
    var h = 2166136261, i;
    s = text(s);
    for (i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16).padStart(8, "0");
  }
  function did() {
    try {
      if (global.AKSI_RUNTIME && typeof global.AKSI_RUNTIME.ensureDid === "function") return global.AKSI_RUNTIME.ensureDid();
      var key = "aksi_did_fp_v2", old = localStorage.getItem(key);
      if (old) return old;
      var value = "did:aksi:" + simpleHash(Date.now() + ":" + (navigator.userAgent || "browser"));
      localStorage.setItem(key, value);
      return value;
    } catch (e) { return "did:aksi:ephemeral"; }
  }
  function escapeHtml(s) {
    return text(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  }
  function loadLedger() {
    try {
      var value = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (e) { return []; }
  }
  function saveLedger(chain) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-800))); } catch (e) {}
  }
  function appendLedger(type, payload) {
    var chain = loadLedger();
    var body = { type: type, ts: Date.now(), prev: chain.length ? chain[chain.length - 1].hash : "GENESIS", did: did(), payload: payload };
    return hash(JSON.stringify(body)).then(function (h) {
      body.hash = h;
      body.id = "dkv_" + chain.length + "_" + h.slice(0, 12);
      chain.push(body);
      saveLedger(chain);
      return body;
    });
  }
  function verifyLedger() {
    var chain = loadLedger();
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].prev !== (i ? chain[i - 1].hash : "GENESIS") || !chain[i].hash) return { ok: false, msg: "разрыв #" + i, n: chain.length };
    }
    return { ok: true, msg: chain.length ? "OK · " + chain.length + " событий" : "пусто", n: chain.length };
  }

  // Deliberately avoids lookbehind and escaped identity characters so this file
  // parses consistently across supported Node/browser JavaScript engines.
  function splitSentences(raw) {
    var source = text(raw).replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ \u00a0]+/g, " ").trim();
    if (!source) return [];
    var lines = source.split(/\n+/), parts = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^[\s•\-*\u2022]+/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (!line) continue;
      var chunks = line.split(/[.!?…;]+\s+/);
      for (var j = 0; j < chunks.length; j++) {
        var part = chunks[j].trim();
        if (part) parts.push(part);
      }
    }
    return parts;
  }
  function tokens(s) {
    return text(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/gi, " ").split(/\s+/).filter(function (w) { return w.length > 2; });
  }
  function similarity(a, b) {
    var A = {}, B = {}, common = 0, total = 0, i, k;
    a = tokens(a); b = tokens(b);
    for (i = 0; i < a.length; i++) A[a[i]] = true;
    for (i = 0; i < b.length; i++) B[b[i]] = true;
    for (k in A) { total++; if (B[k]) common++; }
    for (k in B) if (!A[k]) total++;
    return total ? common / total : 0;
  }
  function factsFromMemory() {
    try {
      var raw = localStorage.getItem(MEM_KEY) || "[]", list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.map(function (item, i) { return { id: item.id || "mem_" + i, text: text(item.t || item.text), status: "confirmed" }; }).filter(function (f) { return f.text.length > 10; });
    } catch (e) { return []; }
  }
  function risk(claim, status) {
    var strong = /(доказано|всегда|никогда|100%|гарантир|единственн|абсолютн)/i.test(claim) ? 0.25 : 0;
    if (status === "refuted") return Math.min(1, 0.85 + strong);
    if (status === "unknown") return Math.min(1, 0.45 + strong);
    return Math.min(1, 0.1 + strong * 0.2);
  }

  function DKVEngine(options) {
    options = options || {};
    this.facts = Array.isArray(options.facts) ? options.facts.slice() : [];
    this.claims = [];
    this.docHash = null;
    this.docName = null;
    this.warning = null;
    this.prevClaims = null;
    this.onProgress = typeof options.onProgress === "function" ? options.onProgress : function () {};
  }
  DKVEngine.prototype.setFacts = function (facts) { this.facts = Array.isArray(facts) ? facts : []; };
  DKVEngine.prototype.mergeAgentMemory = function () {
    var memory = factsFromMemory(), known = {};
    this.facts.forEach(function (f) { known[f.id] = true; });
    for (var i = 0; i < memory.length; i++) if (!known[memory[i].id]) this.facts.push(memory[i]);
    return memory.length;
  };
  DKVEngine.prototype.loadFactsFromUrl = function (url) {
    var self = this;
    return fetch(url).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }).then(function (data) { self.setFacts(Array.isArray(data) ? data : data.facts); return self.facts.length; }).catch(function () { return 0; });
  };
  DKVEngine.prototype.verifyText = function (raw, meta) {
    var self = this, source = text(raw);
    meta = meta || {};
    self.prevClaims = self.claims.length ? self.claims.slice() : null;
    self.docName = meta.name || "document";
    self.warning = meta.warning || null;
    var parts = splitSentences(source), claims = [], seen = {};
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].replace(/^[\"«]+|[\"»]+$/g, "").trim();
      if (c.length < 18 || /^[\d\s.,;:\-–—%]+$/.test(c)) continue;
      if (c.length > 900) c = c.slice(0, 897) + "…";
      var key = c.toLowerCase().replace(/\s+/g, " ");
      if (seen[key]) continue;
      seen[key] = true;
      claims.push({ index: claims.length, text: c, hash: null, status: "unknown", matchedFactId: null, matchedFactText: null, score: 0, risk: 0 });
    }
    self.claims = claims;
    self.onProgress({ phase: "extract", n: claims.length });
    return hash(source).then(function (docHash) {
      self.docHash = docHash;
      return appendLedger("dkv_document", { name: self.docName, docHash: docHash, claimCount: claims.length, bytes: source.length });
    }).then(function () {
      var index = 0;
      function next() {
        if (index >= self.claims.length) {
          return appendLedger("dkv_batch_complete", { docHash: self.docHash, claims: self.claims.map(function (c) { return { i: c.index, h: c.hash, status: c.status, risk: c.risk }; }) }).then(function () {
            self.onProgress({ phase: "done", n: self.claims.length });
            return self.claims;
          });
        }
        var claim = self.claims[index++], best = { score: 0, fact: null };
        for (var f = 0; f < self.facts.length; f++) {
          var score = similarity(claim.text, self.facts[f].text);
          if (text(claim.text).toLowerCase().indexOf(text(self.facts[f].text).toLowerCase()) !== -1 || text(self.facts[f].text).toLowerCase().indexOf(text(claim.text).toLowerCase()) !== -1) score = Math.max(score, 0.88);
          if (score > best.score) best = { score: score, fact: self.facts[f] };
        }
        claim.score = best.score;
        claim.matchedFactId = best.fact ? best.fact.id : null;
        claim.matchedFactText = best.fact ? best.fact.text : null;
        claim.status = best.score >= 0.32 && best.fact ? (best.fact.status || "confirmed") : "unknown";
        claim.risk = risk(claim.text, claim.status);
        return hash(claim.text).then(function (h) { claim.hash = h; return appendLedger("dkv_claim", { docHash: self.docHash, index: claim.index, claimHash: h, status: claim.status, score: Math.round(claim.score * 1000) / 1000, risk: Math.round(claim.risk * 100) / 100 }); }).then(function () { self.onProgress({ phase: "claim", i: index - 1, n: self.claims.length, status: claim.status }); return next(); });
      }
      return next();
    });
  };
  DKVEngine.prototype.getSummary = function () {
    var out = { total: this.claims.length, confirmed: 0, refuted: 0, unknown: 0, riskAvg: 0, docHash: this.docHash, docName: this.docName }, sum = 0;
    this.claims.forEach(function (c) { if (c.status === "confirmed") out.confirmed++; else if (c.status === "refuted") out.refuted++; else out.unknown++; sum += c.risk || 0; });
    out.riskAvg = this.claims.length ? Math.round(sum / this.claims.length * 100) / 100 : 0;
    return out;
  };
  DKVEngine.prototype.diffWithPrevious = function () {
    var prev = {}, cur = {}, same = 0, added = 0, removed = 0, i, k;
    (this.prevClaims || []).forEach(function (c) { prev[c.hash || c.text] = true; });
    this.claims.forEach(function (c) { cur[c.hash || c.text] = true; if (prev[c.hash || c.text]) same++; else added++; });
    for (k in prev) if (!cur[k]) removed++;
    return { added: added, removed: removed, same: same };
  };
  DKVEngine.prototype.exportReport = function () { return { v: 2, module: "AKSI-DKV", did: did(), docName: this.docName, docHash: this.docHash, warning: this.warning, summary: this.getSummary(), diff: this.diffWithPrevious(), claims: this.claims, ledgerVerify: verifyLedger(), ts: Date.now() }; };
  DKVEngine.prototype.verifyFile = function (file) { var self = this; return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onerror = function () { reject(new Error("Не удалось прочитать файл")); }; reader.onload = function () { self.verifyText(reader.result, { name: file.name }); resolve(self.claims); }; reader.readAsText(file, "UTF-8"); }); };

  function ClaimGraph(canvas) {
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    this.nodes = [];
    this.selected = null;
    this.onSelect = null;
  }
  ClaimGraph.prototype.setClaims = function (claims) { this.nodes = (claims || []).map(function (claim, i) { return { claim: claim, x: 0, y: 0, r: 12 + Math.min(12, claim.text.length / 35), i: i }; }); this.draw(); };
  ClaimGraph.prototype.color = function (status) { return status === "confirmed" ? "#34d399" : status === "refuted" ? "#f87171" : "#71717a"; };
  ClaimGraph.prototype.draw = function () {
    if (!this.ctx || !this.canvas) return;
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i], angle = i / Math.max(1, this.nodes.length) * Math.PI * 2 - Math.PI / 2, radius = Math.min(cx, cy) - 36;
      n.x = cx + Math.cos(angle) * (this.nodes.length === 1 ? 0 : radius * 0.7); n.y = cy + Math.sin(angle) * (this.nodes.length === 1 ? 0 : radius * 0.7);
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = this.color(n.claim.status); ctx.fill();
    }
  };

  function mount(target, options) {
    options = options || {};
    var root = typeof target === "string" ? document.querySelector(target) : target;
    if (!root) throw new Error("DKV.mount: target not found");
    root.textContent = "";
    var title = document.createElement("h2"); title.textContent = "DKV · Верификатор знаний";
    var input = document.createElement("textarea"); input.placeholder = "Вставьте текст документа…"; input.style.cssText = "width:100%;min-height:100px;box-sizing:border-box";
    var run = document.createElement("button"); run.type = "button"; run.textContent = "Проверить";
    var status = document.createElement("pre"); status.style.whiteSpace = "pre-wrap";
    root.appendChild(title); root.appendChild(input); root.appendChild(run); root.appendChild(status);
    var engine = new DKVEngine({ facts: options.facts || [] });
    run.onclick = function () { engine.verifyText(input.value).then(function () { status.textContent = JSON.stringify(engine.getSummary(), null, 2); }); };
    return { engine: engine };
  }

  global.AKSI_DKV = {
    DKVEngine: DKVEngine,
    ClaimGraph: ClaimGraph,
    mount: mount,
    verifyLedger: verifyLedger,
    sha256: hash
  };
})(typeof window !== "undefined" ? window : globalThis);
