/* AKSI DKV — clean, browser-safe implementation. */
(function (global) {
  "use strict";

  var LEDGER_KEY = "aksi_dkv_ledger_v1";
  var MEMORY_KEY = "aksi_whole_mem_v3";

  function bytes(s) { return new TextEncoder().encode(String(s)); }
  function hex(buffer) {
    return Array.from(new Uint8Array(buffer), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  function fallbackHash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return (h >>> 0).toString(16).padStart(8, "0") + "-fallback";
  }
  function sha256(text) {
    var s = String(text);
    if (global.crypto && global.crypto.subtle) return global.crypto.subtle.digest("SHA-256", bytes(s)).then(hex);
    return Promise.resolve(fallbackHash(s));
  }
  function simpleHash(s) { return fallbackHash(String(s)).slice(0, 8); }
  function ensureDid() {
    if (global.AKSI_RUNTIME && typeof global.AKSI_RUNTIME.ensureDid === "function") return global.AKSI_RUNTIME.ensureDid();
    try {
      var old = localStorage.getItem("aksi_did_fp_v2");
      if (old) return old;
      var did = "did:aksi:" + simpleHash(Date.now() + ":" + Math.random());
      localStorage.setItem("aksi_did_fp_v2", did);
      return did;
    } catch (e) { return "did:aksi:ephemeral"; }
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function loadLedger() {
    try { var a = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveLedger(a) { try { localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-800))); } catch (e) {} }
  function appendLedgerEntry(type, payload) {
    var chain = loadLedger();
    var body = { type: type, ts: Date.now(), prev: chain.length ? chain[chain.length - 1].hash : "GENESIS", did: ensureDid(), payload: payload };
    return sha256(JSON.stringify(body)).then(function (hash) {
      body.hash = hash; body.id = "dkv_" + chain.length + "_" + hash.slice(0, 12); chain.push(body); saveLedger(chain); return body;
    });
  }
  function verifyLedger() {
    var chain = loadLedger();
    for (var i = 0; i < chain.length; i++) {
      if (chain[i].prev !== (i ? chain[i - 1].hash : "GENESIS")) return { ok: false, msg: "разрыв #" + i, n: chain.length };
      if (!chain[i].hash) return { ok: false, msg: "нет hash #" + i, n: chain.length };
    }
    return { ok: true, msg: chain.length ? "OK · " + chain.length + " событий" : "пусто", n: chain.length };
  }
  function extractClaims(raw) {
    var text = String(raw || "").replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
    if (!text) return [];
    var lines = text.split(/\n+/), parts = [];
    lines.forEach(function (line) {
      line = line.replace(/^[\s•\-*]+/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (!line) return;
      var sentences = line.split(/(?<=[.!?…;])\s+(?=[A-ZА-ЯЁ«"0-9])/u);
      if (sentences.length === 1 && line.length > 160) sentences = line.split(/\s+(?:однако|впрочем|кроме того|более того)\s+/i);
      sentences.forEach(function (s) { if (s.trim()) parts.push(s.trim()); });
    });
    var seen = {}, out = [];
    parts.forEach(function (s) {
      s = s.replace(/^["«]+|["»]+$/g, "").trim();
      if (s.length < 18 || /^[\d\s.,;:\-–—%]+$/.test(s)) return;
      if (s.length > 900) s = s.slice(0, 897) + "…";
      var key = s.toLowerCase().replace(/\s+/g, " ");
      if (seen[key]) return; seen[key] = true;
      out.push({ index: out.length, text: s, hash: null, status: "unknown", matchedFactId: null, matchedFactText: null, score: 0, risk: 0 });
    });
    return out;
  }
  function tokens(s) { return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/gi, " ").split(/\s+/).filter(function (w) { return w.length > 2; }); }
  function similarity(a, b) {
    var A = {}, B = {}, hit = 0, total = 0;
    tokens(a).forEach(function (x) { A[x] = true; }); tokens(b).forEach(function (x) { B[x] = true; });
    Object.keys(A).forEach(function (x) { total++; if (B[x]) hit++; });
    Object.keys(B).forEach(function (x) { if (!A[x]) total++; });
    return total ? hit / total : 0;
  }
  function loadAgentFacts() {
    try {
      var raw = localStorage.getItem(MEMORY_KEY) || localStorage.getItem("aksi_mem_v1") || "[]";
      var a = JSON.parse(raw); if (!Array.isArray(a)) return [];
      return a.map(function (f, i) { return { id: f.id || "mem_" + i, text: typeof f === "string" ? f : (f.t || f.text || ""), status: "confirmed" }; }).filter(function (f) { return f.text.length > 10; });
    } catch (e) { return []; }
  }
  function matchClaim(text, facts) {
    var best = { status: "unknown", factId: null, score: 0, factText: null };
    (facts || []).forEach(function (f) {
      var score = similarity(text, f.text);
      var a = text.toLowerCase(), b = String(f.text).toLowerCase();
      if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) score = Math.max(score, 0.88);
      if (score > best.score) best = { status: score >= 0.32 ? (f.status || "confirmed") : "unknown", factId: f.id || null, score: score, factText: f.text };
    });
    if (best.score < 0.32) best.status = "unknown";
    return best;
  }
  function risk(c) { return c.status === "refuted" ? 0.9 : c.status === "unknown" ? 0.45 : 0.1; }
  function pushMemory(text) {
    try {
      var a = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]"); if (!Array.isArray(a)) a = [];
      a.push({ id: "dkv_" + simpleHash(text), t: String(text).slice(0, 400), ts: Date.now(), src: "dkv" });
      localStorage.setItem(MEMORY_KEY, JSON.stringify(a.slice(-200))); return true;
    } catch (e) { return false; }
  }

  function DKVEngine(options) {
    options = options || {}; this.facts = options.facts || []; this.claims = []; this.prevClaims = null; this.docHash = null; this.docName = null; this.warning = null; this.onProgress = options.onProgress || function () {};
  }
  DKVEngine.prototype.setFacts = function (facts) { this.facts = Array.isArray(facts) ? facts : ((facts || {}).facts || []); };
  DKVEngine.prototype.mergeAgentMemory = function () { var m = loadAgentFacts(), ids = {}; this.facts.forEach(function (f) { ids[f.id] = true; }); m.forEach(function (f) { if (!ids[f.id]) this.facts.push(f); }); return m.length; };
  DKVEngine.prototype.loadFactsFromUrl = function (url) { var self = this; return fetch(url).then(function (r) { return r.json(); }).then(function (j) { self.setFacts(j); return self.facts.length; }).catch(function () { return 0; }); };
  DKVEngine.prototype.verifyText = function (text, meta) {
    var self = this; meta = meta || {}; if (self.claims.length) self.prevClaims = self.claims.slice(); self.docName = meta.name || "document"; self.warning = meta.warning || null; self.claims = extractClaims(text); self.onProgress({ phase: "extract", n: self.claims.length });
    return sha256(text).then(function (h) { self.docHash = h; return appendLedgerEntry("dkv_document", { name: self.docName, docHash: h, claimCount: self.claims.length }); }).then(function () {
      var p = Promise.resolve(); self.claims.forEach(function (c, i) { p = p.then(function () { return sha256(c.text).then(function (h) { var m = matchClaim(c.text, self.facts); c.hash = h; c.status = m.status; c.matchedFactId = m.factId; c.matchedFactText = m.factText; c.score = m.score; c.risk = risk(c); self.onProgress({ phase: "claim", i: i, n: self.claims.length }); return appendLedgerEntry("dkv_claim", { docHash: self.docHash, index: i, claimHash: h, status: c.status, score: c.score, risk: c.risk }); }); }); });
      return p.then(function () { return appendLedgerEntry("dkv_batch_complete", { docHash: self.docHash, claims: self.claims.map(function (c) { return { i: c.index, h: c.hash, status: c.status }; }) }); }).then(function () { self.onProgress({ phase: "done", n: self.claims.length }); return self.claims; });
    });
  };
  DKVEngine.prototype.verifyFile = function (file) { var self = this; return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { self.verifyText(r.result, { name: file.name }).then(resolve, reject); }; r.onerror = reject; r.readAsText(file); }); };
  DKVEngine.prototype.getSummary = function () { var s = { total: this.claims.length, confirmed: 0, refuted: 0, unknown: 0, riskAvg: 0, docHash: this.docHash, docName: this.docName }, sum = 0; this.claims.forEach(function (c) { if (c.status === "confirmed") s.confirmed++; else if (c.status === "refuted") s.refuted++; else s.unknown++; sum += c.risk || 0; }); s.riskAvg = s.total ? Math.round(sum / s.total * 100) / 100 : 0; return s; };
  DKVEngine.prototype.diffWithPrevious = function () { var p = this.prevClaims || [], c = this.claims, P = {}, same = 0, added = 0, removed = 0; p.forEach(function (x) { P[x.hash || x.text] = true; }); c.forEach(function (x) { var k = x.hash || x.text; if (P[k]) same++; else added++; }); var C = {}; c.forEach(function (x) { C[x.hash || x.text] = true; }); Object.keys(P).forEach(function (k) { if (!C[k]) removed++; }); return { added: added, removed: removed, same: same }; };
  DKVEngine.prototype.exportReport = function () { return { v: 2, module: "AKSI-DKV", did: ensureDid(), docName: this.docName, docHash: this.docHash, warning: this.warning, summary: this.getSummary(), diff: this.diffWithPrevious(), claims: this.claims, ledgerVerify: verifyLedger(), ts: Date.now() }; };

  function ClaimGraph(canvas) {
    this.canvas = canvas; this.ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null; this.nodes = []; this.selected = null; this.onSelect = null;
    if (!canvas) return; var self = this; canvas.addEventListener("click", function (ev) { var r = canvas.getBoundingClientRect(), x = (ev.clientX - r.left) * canvas.width / r.width, y = (ev.clientY - r.top) * canvas.height / r.height, hit = null; self.nodes.forEach(function (n) { if ((n.x - x) ** 2 + (n.y - y) ** 2 <= n.r ** 2) hit = n; }); self.selected = hit; self.draw(); if (self.onSelect) self.onSelect(hit ? hit.claim : null); });
  }
  ClaimGraph.prototype.setClaims = function (claims) { this.nodes = []; if (!this.canvas) return; var cx = this.canvas.width / 2, cy = this.canvas.height / 2, R = Math.min(cx, cy) - 36; claims.forEach(function (c, i) { var a = i / Math.max(claims.length, 1) * Math.PI * 2 - Math.PI / 2, r = claims.length === 1 ? 0 : R * .75; this.nodes.push({ claim: c, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, r: 14 }); }, this); this.draw(); };
  ClaimGraph.prototype.draw = function () { if (!this.ctx) return; var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height, cx = w / 2, cy = h / 2; ctx.clearRect(0, 0, w, h); ctx.fillStyle = "#0a0a0c"; ctx.fillRect(0, 0, w, h); this.nodes.forEach(function (n) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.strokeStyle = "#2a2a30"; ctx.stroke(); }); ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2); ctx.fillStyle = "#6d28d9"; ctx.fill(); this.nodes.forEach(function (n) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fillStyle = n.claim.status === "confirmed" ? "#34d399" : n.claim.status === "refuted" ? "#f87171" : "#71717a"; ctx.fill(); }); };

  var DEMO_TEXT = "АКСИ — персональная local-first когнитивная система.\nSHA-256 — криптографическая хеш-функция с выходом 256 бит.\nАКСИ является облачным AGI от OpenAI.\nЗемля плоская.\nВода кипит при 100 градусах Цельсия при нормальном атмосферном давлении.";
  var DEFAULT_FACTS = [
    { id: "e1", text: "АКСИ — персональная local-first когнитивная система.", status: "confirmed" },
    { id: "e2", text: "SHA-256 — криптографическая хеш-функция с выходом 256 бит.", status: "confirmed" },
    { id: "e3", text: "АКСИ является облачным AGI от OpenAI.", status: "refuted" },
    { id: "e4", text: "Земля плоская.", status: "refuted" },
    { id: "e5", text: "Вода кипит при 100 градусах Цельсия при нормальном атмосферном давлении.", status: "confirmed" }
  ];

  function mount(target, options) {
    options = options || {}; var root = typeof target === "string" ? document.querySelector(target) : target; if (!root) throw new Error("DKV.mount: target not found");
    root.innerHTML = '<div class="dkv" style="font:14px/1.5 system-ui;color:#f4f4f5;background:#0a0a0c;border:1px solid #2a2a30;border-radius:14px;padding:14px"><h2>DKV · Верификатор знаний</h2><p style="color:#a1a1aa">Claims → SHA-256 → ledger → сверка с базой.</p><div style="display:flex;gap:7px;flex-wrap:wrap"><input id="dkv-file" type="file" accept=".txt,.md,.json,.csv,.pdf,.docx"><button id="dkv-run">Проверить</button><button id="dkv-demo">Демо</button><button id="dkv-mem">+ память</button><button id="dkv-verify">Verify</button><button id="dkv-export">Отчёт</button></div><textarea id="dkv-text" style="width:100%;min-height:90px;margin-top:8px;background:#121214;color:#fff;border:1px solid #2a2a30;border-radius:10px" placeholder="Вставьте текст…"></textarea><p id="dkv-ledger-msg" style="color:#a1a1aa"></p><canvas id="dkv-canvas" width="880" height="260" style="width:100%;border:1px solid #2a2a30;border-radius:10px"></canvas><div id="dkv-list" style="margin-top:8px"></div></div>';
    var engine = new DKVEngine({ facts: options.facts || DEFAULT_FACTS.slice() }), graph = new ClaimGraph(root.querySelector("#dkv-canvas"));
    function render() { var s = engine.getSummary(); root.querySelector("#dkv-ledger-msg").textContent = "claims: " + s.total + " · ok: " + s.confirmed + " · refuted: " + s.refuted + " · unknown: " + s.unknown + " · risk: " + s.riskAvg + " · " + verifyLedger().msg; graph.setClaims(engine.claims); root.querySelector("#dkv-list").innerHTML = engine.claims.map(function (c) { return '<div style="padding:8px;border:1px solid #2a2a30;border-radius:9px;margin:5px 0"><b>#' + (c.index + 1) + ' ' + escapeHtml(c.status) + '</b> · ' + escapeHtml(c.text) + '<div style="font-size:11px;color:#71717a">' + escapeHtml(c.hash || "") + '</div></div>'; }).join(""); }
    root.querySelector("#dkv-run").onclick = function () { engine.verifyText(root.querySelector("#dkv-text").value, { name: "pasted.txt" }).then(render); };
    root.querySelector("#dkv-demo").onclick = function () { root.querySelector("#dkv-text").value = DEMO_TEXT; engine.verifyText(DEMO_TEXT, { name: "demo.txt" }).then(render); };
    root.querySelector("#dkv-mem").onclick = function () { root.querySelector("#dkv-ledger-msg").textContent = "Память: +" + engine.mergeAgentMemory() + " фактов"; };
    root.querySelector("#dkv-verify").onclick = function () { root.querySelector("#dkv-ledger-msg").textContent = verifyLedger().msg; };
    root.querySelector("#dkv-export").onclick = function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(engine.exportReport(), null, 2)], { type: "application/json" })); a.download = "aksi-dkv-report.json"; a.click(); };
    root.querySelector("#dkv-file").onchange = function (e) { var f = e.target.files && e.target.files[0]; if (f) engine.verifyFile(f).then(render); e.target.value = ""; };
    graph.onSelect = function (claim) { if (claim) root.querySelector("#dkv-ledger-msg").textContent = claim.text; };
    render(); return { engine: engine, graph: graph };
  }

  var API = { DKVEngine: DKVEngine, ClaimGraph: ClaimGraph, extractClaims: extractClaims, sha256: sha256, verifyLedger: verifyLedger, loadLedger: loadLedger, loadAgentFacts: loadAgentFacts, mount: mount, DEMO_TEXT: DEMO_TEXT, version: "1.3.0" };
  global.DKV = API; global.AKSI_DKV = API;
})(typeof window !== "undefined" ? window : this);
