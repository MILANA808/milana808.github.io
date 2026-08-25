/**
 * AKSI — Decentralized Knowledge Verifier (DKV) v1.2
 * Offline claim map + SHA-256 proof ledger + Canvas graph + agent memory bridge.
 * Contact: aksilove@internet.ru · @AKSILOVE
 * Full source: see repository artifacts / aksi-dkv.full.js
 */
(function (global) {
  "use strict";

  var DKV_LEDGER_KEY = "aksi_dkv_ledger_v1";
  var MEM_BRIDGE_KEY = "aksi_whole_mem_v3";

  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function hex(buf) {
    var a = new Uint8Array(buf), o = "";
    for (var i = 0; i < a.length; i++) o += ("0" + a[i].toString(16)).slice(-2);
    return o;
  }
  function sha256(text) {
    var s = String(text);
    if (global.crypto && global.crypto.subtle) {
      return global.crypto.subtle.digest("SHA-256", utf8(s)).then(hex);
    }
    return Promise.resolve(fnvFallback(s));
  }
  function fnvFallback(s) {
    var h1 = 0x811c9dc5, h2 = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193);
      h2 ^= s.charCodeAt(s.length - 1 - i) ^ (i * 31); h2 = Math.imul(h2, 0x01000193);
    }
    return ("00000000" + (h1 >>> 0).toString(16)).slice(-8) +
           ("00000000" + (h2 >>> 0).toString(16)).slice(-8) + "fnv-fallback";
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function ensureDid() {
    if (global.AKSI_RUNTIME && typeof global.AKSI_RUNTIME.ensureDid === "function") {
      return global.AKSI_RUNTIME.ensureDid();
    }
    var k = "aksi_did_fp_v2";
    try {
      var d = localStorage.getItem(k);
      if (d) return d;
      d = "did:aksi:" + simpleHash(Date.now() + navigator.userAgent) + simpleHash(Math.random().toString());
      localStorage.setItem(k, d);
      return d;
    } catch (e) { return "did:aksi:ephemeral"; }
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&" + "amp;")
      .replace(/</g, "&" + "lt;")
      .replace(/>/g, "&" + "gt;")
      .replace(/"/g, "&" + "quot;");
  }

  function loadLedger() {
    try {
      var a = JSON.parse(localStorage.getItem(DKV_LEDGER_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function saveLedger(chain) {
    try { localStorage.setItem(DKV_LEDGER_KEY, JSON.stringify(chain.slice(-800))); } catch (e) {}
  }
  function appendLedgerEntry(type, payload) {
    var chain = loadLedger();
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { type: type, ts: Date.now(), prev: prev, did: ensureDid(), payload: payload };
    return sha256(JSON.stringify(body)).then(function (h) {
      body.hash = h;
      body.id = "dkv_" + chain.length + "_" + h.slice(0, 12);
      chain.push(body);
      saveLedger(chain);
      return body;
    });
  }
  function verifyLedger() {
    var chain = loadLedger();
    if (!chain.length) return { ok: true, msg: "пусто", n: 0 };
    for (var i = 0; i < chain.length; i++) {
      var e = chain[i];
      var expect = i === 0 ? "GENESIS" : chain[i - 1].hash;
      if (e.prev !== expect) return { ok: false, msg: "разрыв #" + i, n: chain.length };
      if (!e.hash) return { ok: false, msg: "нет hash #" + i, n: chain.length };
    }
    return { ok: true, msg: "OK · " + chain.length + " событий", n: chain.length };
  }

  function extractClaims(raw) {
    var text = String(raw || "").replace(/\r\n/g, "\n").replace(/\t/g, " ").replace(/[ \u00a0]+/g, " ").trim();
    if (!text) return [];
    var parts = [];
    text.split(/\n+/).forEach(function (line) {
      line = line.replace(/^[\s•\-\*\u2022]+/, "").replace(/^\d+[.)]\s*/, "").trim();
      if (!line) return;
      var sents = line.split(/(?<=[.!?…;])\s+(?=[A-ZА-ЯЁ«\"0-9])/u);
      if (sents.length === 1 && line.length > 160) {
        sents = line.split(/\s+(?:однако|впрочем|кроме того|более того)\s+/i);
      }
      sents.forEach(function (s) { s = s.trim(); if (s) parts.push(s); });
    });
    if (parts.length <= 1 && text.length > 40) {
      parts = text.split(/(?<=[.!?…])\s+(?=[A-ZА-ЯЁ«\"0-9])/u);
    }
    var claims = [], seen = {};
    for (var i = 0; i < parts.length; i++) {
      var c = parts[i].trim().replace(/^[\"«]+|[\"»]+$/g, "").trim();
      if (c.length < 18) continue;
      if (c.length > 900) c = c.slice(0, 897) + "…";
      if (/^[\d\s.,;:\-–—%]+$/.test(c)) continue;
      var key = c.toLowerCase().replace(/\s+/g, " ");
      if (seen[key]) continue;
      seen[key] = 1;
      claims.push({ index: claims.length, text: c, hash: null, status: "unknown", matchedFactId: null, matchedFactText: null, score: 0, risk: 0 });
    }
    return claims;
  }

  function tokens(s) {
    return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/gi, " ").split(/\s+/).filter(function (w) { return w.length > 2; });
  }
  function jaccard(a, b) {
    var A = {}, B = {}, i, inter = 0, uni = 0, k;
    for (i = 0; i < a.length; i++) A[a[i]] = 1;
    for (i = 0; i < b.length; i++) B[b[i]] = 1;
    for (k in A) { uni++; if (B[k]) inter++; }
    for (k in B) if (!A[k]) uni++;
    return uni ? inter / uni : 0;
  }
  function matchClaim(claimText, facts) {
    var ct = tokens(claimText);
    var best = { status: "unknown", factId: null, score: 0, factText: null };
    if (!facts || !facts.length) return best;
    var low = claimText.toLowerCase();
    for (var i = 0; i < facts.length; i++) {
      var f = facts[i];
      var ft = tokens(f.text);
      var sc = jaccard(ct, ft);
      var flow = String(f.text).toLowerCase();
      if (low.indexOf(flow) !== -1 || flow.indexOf(low) !== -1) sc = Math.max(sc, 0.88);
      if (ft.length && ct.length) {
        var hit = 0;
        for (var j = 0; j < ft.length; j++) if (ct.indexOf(ft[j]) !== -1) hit++;
        sc = Math.max(sc, hit / Math.max(ft.length, 1) * 0.7);
      }
      if (sc > best.score) {
        best = { status: sc >= 0.32 ? (f.status || "confirmed") : "unknown", factId: f.id || null, score: sc, factText: f.text };
      }
    }
    if (best.score < 0.32) { best.status = "unknown"; best.factId = null; }
    return best;
  }
  function claimRisk(claim) {
    var t = claim.text.toLowerCase();
    var assertive = /(доказано|всегда|никогда|100%|гарантир|единственн|абсолютн)/.test(t) ? 0.25 : 0;
    if (claim.status === "refuted") return Math.min(1, 0.85 + assertive);
    if (claim.status === "unknown") return Math.min(1, 0.45 + assertive);
    return Math.min(1, 0.1 + assertive * 0.2);
  }
  function stripBinaryNoise(s) {
    return String(s).replace(/[^\x09\x0A\x0D\x20-\x7E\u0400-\u04FF\u2010-\u2027\u2030-\u205E]/g, " ").replace(/\s{3,}/g, "\n").trim();
  }
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var name = (file.name || "").toLowerCase();
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Не удалось прочитать файл")); };
      reader.onload = function () {
        var raw = String(reader.result || "");
        if (/\.(txt|md|csv|json)$/.test(name)) return resolve({ text: raw, warning: null });
        if (name.endsWith(".docx")) return resolve({ text: stripBinaryNoise(raw), warning: "DOCX: приблизительный текст. Для точности — экспорт в .txt." });
        if (name.endsWith(".pdf")) return resolve({ text: stripBinaryNoise(raw), warning: "PDF: приблизительный текст. Лучше вставить текст или .txt." });
        resolve({ text: stripBinaryNoise(raw), warning: "Best-effort извлечение." });
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  function loadAgentFacts() {
    try {
      var raw = localStorage.getItem(MEM_BRIDGE_KEY);
      if (!raw) raw = localStorage.getItem("aksi_mem_v1") || localStorage.getItem("aksi_facts") || "[]";
      var a = JSON.parse(raw);
      if (!Array.isArray(a)) return [];
      return a.map(function (f, i) {
        var text = typeof f === "string" ? f : (f.t || f.text || "");
        return { id: "mem_" + i, text: text, status: "confirmed", tags: ["memory"] };
      }).filter(function (f) { return f.text && f.text.length > 10; });
    } catch (e) { return []; }
  }
  function pushClaimToMemory(claimText) {
    try {
      var a = [];
      try { a = JSON.parse(localStorage.getItem(MEM_BRIDGE_KEY) || "[]"); } catch (e) {}
      if (!Array.isArray(a)) a = [];
      a.push({ id: "dkv_" + simpleHash(claimText).slice(0, 8), t: claimText.slice(0, 400), ts: Date.now(), src: "dkv" });
      localStorage.setItem(MEM_BRIDGE_KEY, JSON.stringify(a.slice(-200)));
      return true;
    } catch (e) { return false; }
  }

  function DKVEngine(options) {
    this.facts = (options && options.facts) || [];
    this.claims = [];
    this.docHash = null;
    this.docName = null;
    this.warning = null;
    this.prevClaims = null;
    this.onProgress = (options && options.onProgress) || function () {};
  }
  DKVEngine.prototype.setFacts = function (facts) {
    this.facts = Array.isArray(facts) ? facts : (facts && facts.facts) || [];
  };
  DKVEngine.prototype.mergeAgentMemory = function () {
    var mem = loadAgentFacts();
    var ids = {};
    this.facts.forEach(function (f) { ids[f.id] = 1; });
    for (var i = 0; i < mem.length; i++) { if (!ids[mem[i].id]) this.facts.push(mem[i]); }
    return mem.length;
  };
  DKVEngine.prototype.loadFactsFromUrl = function (url) {
    var self = this;
    return fetch(url).then(function (r) { return r.json(); })
      .then(function (j) { self.setFacts(j); return self.facts.length; })
      .catch(function () { return 0; });
  };
  DKVEngine.prototype.verifyText = function (text, meta) {
    var self = this;
    meta = meta || {};
    if (self.claims && self.claims.length) self.prevClaims = self.claims.slice();
    self.docName = meta.name || "document";
    self.warning = meta.warning || null;
    self.claims = extractClaims(text);
    self.onProgress({ phase: "extract", n: self.claims.length });
    return sha256(text).then(function (docH) {
      self.docHash = docH;
      return appendLedgerEntry("dkv_document", { name: self.docName, docHash: docH, claimCount: self.claims.length, bytes: String(text).length });
    }).then(function () {
      var i = 0;
      function next() {
        if (i >= self.claims.length) {
          return appendLedgerEntry("dkv_batch_complete", {
            docHash: self.docHash,
            claims: self.claims.map(function (c) { return { i: c.index, h: c.hash, status: c.status, risk: c.risk }; })
          }).then(function () {
            self.onProgress({ phase: "done", n: self.claims.length });
            return self.claims;
          });
        }
        var claim = self.claims[i];
        return sha256(claim.text).then(function (h) {
          claim.hash = h;
          var m = matchClaim(claim.text, self.facts);
          claim.status = m.status === "confirmed" || m.status === "refuted" ? m.status : "unknown";
          claim.matchedFactId = m.factId;
          claim.score = m.score;
          claim.matchedFactText = m.factText;
          claim.risk = claimRisk(claim);
          self.onProgress({ phase: "claim", i: i, n: self.claims.length, status: claim.status });
          return appendLedgerEntry("dkv_claim", {
            docHash: self.docHash, index: claim.index, claimHash: claim.hash,
            status: claim.status, score: Math.round(claim.score * 1000) / 1000,
            risk: Math.round(claim.risk * 100) / 100, textPreview: claim.text.slice(0, 120)
          });
        }).then(function () { i++; return next(); });
      }
      return next();
    });
  };
  DKVEngine.prototype.verifyFile = function (file) {
    var self = this;
    return readFileAsText(file).then(function (res) {
      return self.verifyText(res.text, { name: file.name, warning: res.warning });
    });
  };
  DKVEngine.prototype.getSummary = function () {
    var c = this.claims;
    var s = { total: c.length, confirmed: 0, refuted: 0, unknown: 0, riskAvg: 0, docHash: this.docHash, docName: this.docName };
    var riskSum = 0;
    for (var i = 0; i < c.length; i++) {
      if (c[i].status === "confirmed") s.confirmed++;
      else if (c[i].status === "refuted") s.refuted++;
      else s.unknown++;
      riskSum += c[i].risk || 0;
    }
    s.riskAvg = c.length ? Math.round((riskSum / c.length) * 100) / 100 : 0;
    return s;
  };
  DKVEngine.prototype.diffWithPrevious = function () {
    if (!this.prevClaims || !this.prevClaims.length) return { added: this.claims.length, removed: 0, same: 0 };
    var prevH = {}, i;
    for (i = 0; i < this.prevClaims.length; i++) prevH[this.prevClaims[i].hash || this.prevClaims[i].text] = 1;
    var curH = {}, same = 0, added = 0;
    for (i = 0; i < this.claims.length; i++) {
      var k = this.claims[i].hash || this.claims[i].text;
      curH[k] = 1;
      if (prevH[k]) same++; else added++;
    }
    var removed = 0;
    for (var k in prevH) if (!curH[k]) removed++;
    return { added: added, removed: removed, same: same };
  };
  DKVEngine.prototype.exportReport = function () {
    return {
      v: 2, module: "AKSI-DKV", did: ensureDid(),
      docName: this.docName, docHash: this.docHash, warning: this.warning,
      summary: this.getSummary(), diff: this.diffWithPrevious(),
      claims: this.claims, ledgerVerify: verifyLedger(), ts: Date.now()
    };
  };

  function ClaimGraph(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.nodes = [];
    this.selected = null;
    this.onSelect = null;
    var self = this;
    canvas.addEventListener("click", function (ev) {
      var r = canvas.getBoundingClientRect();
      var x = (ev.clientX - r.left) * (canvas.width / r.width);
      var y = (ev.clientY - r.top) * (canvas.height / r.height);
      var hit = null;
      for (var i = 0; i < self.nodes.length; i++) {
        var n = self.nodes[i];
        var dx = n.x - x, dy = n.y - y;
        if (dx * dx + dy * dy <= n.r * n.r) { hit = n; break; }
      }
      self.selected = hit;
      self.draw();
      if (self.onSelect) self.onSelect(hit ? hit.claim : null);
    });
  }
  ClaimGraph.prototype.setClaims = function (claims) {
    this.nodes = [];
    var n = claims.length;
    var cx = this.canvas.width / 2, cy = this.canvas.height / 2;
    var R = Math.min(cx, cy) - 36;
    for (var i = 0; i < n; i++) {
      var ang = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      var rr = n === 1 ? 0 : R * (0.5 + 0.5 * ((i % 4) / 3));
      this.nodes.push({
        claim: claims[i],
        x: cx + Math.cos(ang) * rr,
        y: cy + Math.sin(ang) * rr,
        r: 12 + Math.min(12, String(claims[i].text).length / 35)
      });
    }
    this.selected = null;
    this.draw();
  };
  ClaimGraph.prototype.color = function (status) {
    if (status === "confirmed") return "#34d399";
    if (status === "refuted") return "#f87171";
    return "#71717a";
  };
  ClaimGraph.prototype.draw = function () {
    var ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0a0c"; ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, i, n;
    ctx.strokeStyle = "#2a2a30"; ctx.lineWidth = 1;
    for (i = 0; i < this.nodes.length; i++) {
      n = this.nodes[i];
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#6d28d9"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "bold 10px system-ui";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("DOC", cx, cy);
    for (i = 0; i < this.nodes.length; i++) {
      n = this.nodes[i];
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color(n.claim.status);
      ctx.globalAlpha = this.selected && this.selected !== n ? 0.4 : 1;
      ctx.fill(); ctx.globalAlpha = 1;
      if (this.selected === n) { ctx.strokeStyle = "#f4f4f5"; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = "#0a0a0c"; ctx.font = "bold 11px system-ui";
      ctx.fillText(String(n.claim.index + 1), n.x, n.y);
    }
  };

  var CSS = [
    ".dkv{font:14px/1.45 system-ui,-apple-system,sans-serif;color:#f4f4f5;background:#0a0a0c;border:1px solid #2a2a30;border-radius:14px;padding:14px;max-width:920px}",
    ".dkv h2{margin:0 0 6px;font-size:15px;font-weight:650}",
    ".dkv .muted{color:#a1a1aa;font-size:12.5px;margin-bottom:10px}",
    ".dkv .row{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px;align-items:center}",
    ".dkv button,.dkv label.btn{cursor:pointer;border:1px solid #2a2a30;background:#1a1a1e;color:#f4f4f5;border-radius:10px;padding:9px 12px;font:12.5px system-ui}",
    ".dkv button.primary,.dkv label.btn.primary{background:linear-gradient(135deg,#6d28d9,#8b5cf6);border:0;color:#fff}",
    ".dkv input[type=file]{display:none}",
    ".dkv .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-bottom:10px}",
    ".dkv .stat{background:#121214;border:1px solid #2a2a30;border-radius:10px;padding:8px;text-align:center}",
    ".dkv .stat b{display:block;font-size:16px;color:#34d399}",
    ".dkv .stat.ref b{color:#f87171}",
    ".dkv .stat.unk b{color:#a1a1aa}",
    ".dkv .stat.risk b{color:#fbbf24}",
    ".dkv .stat span{font-size:10px;color:#71717a}",
    ".dkv canvas{width:100%;height:300px;border-radius:12px;border:1px solid #2a2a30;background:#0a0a0c;touch-action:manipulation}",
    ".dkv .list{max-height:260px;overflow:auto;margin-top:10px}",
    ".dkv .claim{padding:9px 11px;border:1px solid #2a2a30;border-radius:10px;margin-bottom:6px;background:#121214;cursor:pointer}",
    ".dkv .claim:hover{border-color:#8b5cf6}",
    ".dkv .claim .tag{display:inline-block;font-size:10px;padding:2px 7px;border-radius:999px;margin-bottom:3px;margin-right:4px}",
    ".dkv .tag.confirmed{background:rgba(52,211,153,.15);color:#34d399}",
    ".dkv .tag.refuted{background:rgba(248,113,113,.15);color:#f87171}",
    ".dkv .tag.unknown{background:rgba(113,113,122,.2);color:#a1a1aa}",
    ".dkv .hash{font:11px/1.4 ui-monospace,monospace;color:#71717a;word-break:break-all;margin-top:3px}",
    ".dkv .detail{margin-top:10px;padding:11px;border:1px solid #2a2a30;border-radius:10px;background:#121214;display:none}",
    ".dkv .detail.on{display:block}",
    ".dkv .warn{color:#fbbf24;font-size:12px;margin-bottom:8px}",
    ".dkv textarea,.dkv input[type=search]{width:100%;background:#121214;border:1px solid #2a2a30;border-radius:10px;color:#f4f4f5;padding:9px;font:inherit;box-sizing:border-box}",
    ".dkv textarea{min-height:72px}",
    ".dkv .tools{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}"
  ].join("");

  function statusLabel(s) {
    if (s === "confirmed") return "подтверждено";
    if (s === "refuted") return "опровергнуто";
    return "неизвестно";
  }

  var DEMO_TEXT =
    "АКСИ — суверенный цифровой напарник и агентный слой с локальной памятью и proof ledger.\n" +
    "Протокол AKSI-Agent-v1 включает handshake, envelope, fingerprint и DID.\n" +
    "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age, где H — энтропия Шеннона.\n" +
    "Формула роста AKSI = (A×I×S)×(1+0.4√n).\n" +
    "Публичный контакт проекта: aksilove@internet.ru.\n" +
    "АКСИ является облачным AGI от OpenAI и хранит все данные на серверах Google.\n" +
    "SHA-256 — криптографическая хеш-функция с выходом 256 бит.\n" +
    "Земля плоская и является центром Вселенной.\n" +
    "Append-only ledger нельзя изменить прошлые записи без нарушения цепочки prev_hash.\n" +
    "Вода кипит при 100 градусах Цельсия при нормальном атмосферном давлении.";

  var DEFAULT_FACTS = [
    { id: "e1", text: "АКСИ — суверенный цифровой напарник с локальной памятью и proof ledger.", status: "confirmed" },
    { id: "e2", text: "SHA-256 — криптографическая хеш-функция с выходом 256 бит.", status: "confirmed" },
    { id: "e3", text: "Append-only ledger нельзя изменить прошлые записи без нарушения цепочки prev_hash.", status: "confirmed" },
    { id: "e4", text: "АКСИ является облачным AGI от OpenAI и хранит все данные на серверах Google.", status: "refuted" },
    { id: "e5", text: "Публичный контакт проекта: aksilove@internet.ru.", status: "confirmed" },
    { id: "e6", text: "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age.", status: "confirmed" },
    { id: "e7", text: "Земля плоская и является центром Вселенной.", status: "refuted" },
    { id: "e8", text: "Вода кипит при 100 градусах Цельсия при нормальном атмосферном давлении.", status: "confirmed" },
    { id: "e9", text: "Протокол AKSI-Agent-v1 включает handshake, envelope, fingerprint и DID.", status: "confirmed" },
    { id: "e10", text: "Формула роста AKSI = (A×I×S)×(1+0.4√n).", status: "confirmed" },
    { id: "e11", text: "Данные агента АКСИ хранятся только на устройстве пользователя.", status: "confirmed" },
    { id: "e12", text: "АКСИ требует постоянное подключение к интернету для работы чата.", status: "refuted" },
    { id: "e13", text: "Сайт проекта: milana808.github.io.", status: "confirmed" },
    { id: "e14", text: "Ledger АКСИ допускает незаметную перезапись истории без prev_hash.", status: "refuted" },
    { id: "e15", text: "Ed25519 используется в backend-слое идентичности AKSI.", status: "confirmed" }
  ];

  function mount(target, options) {
    options = options || {};
    var root = typeof target === "string" ? document.querySelector(target) : target;
    if (!root) throw new Error("DKV.mount: target not found");

    if (!document.getElementById("dkv-styles")) {
      var st = document.createElement("style");
      st.id = "dkv-styles";
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    root.innerHTML = "";
    var box = document.createElement("div");
    box.className = "dkv";
    box.innerHTML =
      "<h2>DKV · Верификатор знаний</h2>" +
      "<p class=\"muted\">TXT / вставка текста → claims → SHA-256 → ledger → сверка с базой. Offline · v1.2</p>" +
      "<div class=\"row\">" +
      "<label class=\"btn primary\">Загрузить<input type=\"file\" id=\"dkv-file\" accept=\".txt,.md,.json,.csv,.pdf,.docx,text/plain\"></label>" +
      "<button type=\"button\" id=\"dkv-run\">Проверить</button>" +
      "<button type=\"button\" id=\"dkv-demo\">Демо</button>" +
      "<button type=\"button\" id=\"dkv-mem\">+ память агента</button>" +
      "<button type=\"button\" id=\"dkv-verify\">Verify</button>" +
      "<button type=\"button\" id=\"dkv-export\">Отчёт</button>" +
      "<button type=\"button\" id=\"dkv-ledger\">Ledger</button>" +
      "</div>" +
      "<textarea id=\"dkv-text\" placeholder=\"Вставьте текст документа…\"></textarea>" +
      "<div class=\"warn\" id=\"dkv-warn\" style=\"display:none\"></div>" +
      "<div class=\"stats\">" +
      "<div class=\"stat\"><b id=\"dkv-n\">0</b><span>claims</span></div>" +
      "<div class=\"stat\"><b id=\"dkv-ok\">0</b><span>ok</span></div>" +
      "<div class=\"stat ref\"><b id=\"dkv-bad\">0</b><span>refuted</span></div>" +
      "<div class=\"stat unk\"><b id=\"dkv-unk\">0</b><span>unknown</span></div>" +
      "<div class=\"stat risk\"><b id=\"dkv-risk\">—</b><span>risk</span></div>" +
      "</div>" +
      "<input type=\"search\" id=\"dkv-filter\" placeholder=\"Фильтр по тексту / статусу…\" style=\"margin-bottom:8px\">" +
      "<canvas id=\"dkv-canvas\" width=\"880\" height=\"300\"></canvas>" +
      "<div class=\"detail\" id=\"dkv-detail\"></div>" +
      "<div class=\"list\" id=\"dkv-list\"></div>" +
      "<p class=\"muted\" id=\"dkv-ledger-msg\" style=\"margin-top:8px\"></p>";

    root.appendChild(box);

    var engine = new DKVEngine({ facts: options.facts || DEFAULT_FACTS.slice() });
    if (options.factsUrl) engine.loadFactsFromUrl(options.factsUrl);
    else if (options.facts && options.facts.length) engine.setFacts(options.facts);

    var canvas = box.querySelector("#dkv-canvas");
    var graph = new ClaimGraph(canvas);
    var filterQ = "";
    graph.onSelect = function (claim) { showDetail(claim); };

    function showDetail(claim) {
      var d = box.querySelector("#dkv-detail");
      if (!claim) { d.className = "detail"; d.innerHTML = ""; return; }
      d.className = "detail on";
      d.innerHTML =
        "<div class=\"tag " + claim.status + "\">" + statusLabel(claim.status) +
        "</div><div class=\"tag unknown\">risk " + (claim.risk || 0).toFixed(2) + "</div>" +
        "<div>" + escapeHtml(claim.text) + "</div>" +
        "<div class=\"hash\">SHA-256: " + escapeHtml(claim.hash || "—") + "</div>" +
        (claim.matchedFactText
          ? "<div class=\"hash\">База: " + escapeHtml(claim.matchedFactText) + " · score " + (claim.score || 0).toFixed(2) + "</div>"
          : "") +
        "<div class=\"tools\">" +
        "<button type=\"button\" id=\"dkv-copy\">Копировать hash</button>" +
        "<button type=\"button\" id=\"dkv-remember\">В память агента</button>" +
        "</div>";
      var copyBtn = d.querySelector("#dkv-copy");
      if (copyBtn) copyBtn.onclick = function () {
        if (claim.hash && navigator.clipboard) navigator.clipboard.writeText(claim.hash);
      };
      var memBtn = d.querySelector("#dkv-remember");
      if (memBtn) memBtn.onclick = function () {
        var ok = pushClaimToMemory(claim.text);
        box.querySelector("#dkv-ledger-msg").textContent = ok ? "✓ claim записан в память агента" : "не удалось записать в память";
      };
    }

    function filteredClaims() {
      var q = filterQ.toLowerCase().trim();
      if (!q) return engine.claims;
      return engine.claims.filter(function (c) {
        return c.text.toLowerCase().indexOf(q) !== -1 ||
          c.status.indexOf(q) !== -1 ||
          (c.hash && c.hash.indexOf(q) !== -1);
      });
    }

    function renderList() {
      var claims = filteredClaims();
      var list = box.querySelector("#dkv-list");
      list.innerHTML = claims.map(function (c) {
        return "<div class=\"claim\" data-i=\"" + c.index + "\">" +
          "<div class=\"tag " + c.status + "\">#" + (c.index + 1) + " · " + statusLabel(c.status) + "</div>" +
          "<div class=\"tag unknown\">r" + (c.risk || 0).toFixed(2) + "</div>" +
          "<div>" + escapeHtml(c.text.slice(0, 200)) + (c.text.length > 200 ? "…" : "") + "</div>" +
          "<div class=\"hash\">" + escapeHtml((c.hash || "").slice(0, 20)) + "…</div></div>";
      }).join("");
      list.onclick = function (ev) {
        var node = ev.target.closest(".claim");
        if (!node) return;
        var i = +node.getAttribute("data-i");
        var claim = engine.claims[i];
        showDetail(claim);
        graph.selected = graph.nodes.filter(function (n) { return n.claim.index === i; })[0] || null;
        graph.draw();
      };
    }

    function renderStats() {
      var s = engine.getSummary();
      box.querySelector("#dkv-n").textContent = s.total;
      box.querySelector("#dkv-ok").textContent = s.confirmed;
      box.querySelector("#dkv-bad").textContent = s.refuted;
      box.querySelector("#dkv-unk").textContent = s.unknown;
      box.querySelector("#dkv-risk").textContent = s.total ? s.riskAvg : "—";
      var v = verifyLedger();
      var diff = engine.diffWithPrevious();
      var diffMsg = engine.prevClaims ? (" · Δ +" + diff.added + " −" + diff.removed + " =" + diff.same) : "";
      box.querySelector("#dkv-ledger-msg").textContent =
        "Ledger: " + v.msg + (engine.docHash ? " · doc " + engine.docHash.slice(0, 14) + "…" : "") + diffMsg;
    }

    function afterVerify() {
      graph.setClaims(engine.claims);
      renderList();
      renderStats();
      var w = box.querySelector("#dkv-warn");
      if (engine.warning) { w.style.display = "block"; w.textContent = engine.warning; }
      else w.style.display = "none";
    }

    box.querySelector("#dkv-file").addEventListener("change", function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      box.querySelector("#dkv-ledger-msg").textContent = "Обработка «" + f.name + "»…";
      engine.verifyFile(f).then(afterVerify).catch(function (err) {
        box.querySelector("#dkv-ledger-msg").textContent = "Ошибка: " + (err && err.message || err);
      });
      ev.target.value = "";
    });
    box.querySelector("#dkv-run").addEventListener("click", function () {
      var t = box.querySelector("#dkv-text").value;
      if (!String(t).trim()) {
        box.querySelector("#dkv-ledger-msg").textContent = "Вставьте текст или загрузите файл.";
        return;
      }
      box.querySelector("#dkv-ledger-msg").textContent = "Проверка…";
      engine.verifyText(t, { name: "pasted.txt" }).then(afterVerify);
    });
    box.querySelector("#dkv-demo").addEventListener("click", function () {
      box.querySelector("#dkv-text").value = DEMO_TEXT;
      box.querySelector("#dkv-ledger-msg").textContent = "Демо-документ…";
      engine.verifyText(DEMO_TEXT, { name: "demo.txt" }).then(afterVerify);
    });
    box.querySelector("#dkv-mem").addEventListener("click", function () {
      var n = engine.mergeAgentMemory();
      box.querySelector("#dkv-ledger-msg").textContent = "Фактов из памяти агента: +" + n + " · всего база " + engine.facts.length;
    });
    box.querySelector("#dkv-verify").addEventListener("click", function () {
      var v = verifyLedger();
      box.querySelector("#dkv-ledger-msg").textContent = (v.ok ? "✓ " : "✗ ") + v.msg;
    });
    box.querySelector("#dkv-export").addEventListener("click", function () {
      var report = engine.exportReport();
      var blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aksi-dkv-report.json";
      a.click();
    });
    box.querySelector("#dkv-ledger").addEventListener("click", function () {
      var chain = loadLedger().slice(-30);
      var lines = chain.map(function (e) {
        return (e.ts ? new Date(e.ts).toISOString().slice(11, 19) : "—") +
          " · " + e.type + " · " + (e.hash || "").slice(0, 12) + "…";
      });
      box.querySelector("#dkv-ledger-msg").textContent = lines.length ? lines.join(" | ") : "Ledger пуст";
    });
    box.querySelector("#dkv-filter").addEventListener("input", function (ev) {
      filterQ = ev.target.value || "";
      renderList();
    });

    renderStats();
    return { engine: engine, graph: graph };
  }

  var API = {
    DKVEngine: DKVEngine,
    ClaimGraph: ClaimGraph,
    extractClaims: extractClaims,
    sha256: sha256,
    verifyLedger: verifyLedger,
    loadLedger: loadLedger,
    loadAgentFacts: loadAgentFacts,
    mount: mount,
    DEMO_TEXT: DEMO_TEXT,
    version: "1.2.0"
  };
  global.DKV = API;
  global.AKSI_DKV = API;
})(typeof window !== "undefined" ? window : this);
