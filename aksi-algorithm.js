/**
 * AKSI Core Algorithm — ADIA 2.0
 * Resonance Decision Engine (RDE)
 * measure → retrieve → fuse → EQS gate → seal → learn
 * Proprietary · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.0.0-adia";
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var LEDGER_KEY = "aksi_adia_ledger_v2";
  var STATS_KEY = "aksi_adia_stats_v2";
  var AGE_BIRTH_YEAR = 1995;

  function shannonH(text) {
    text = String(text || ""); if (!text.length) return 0;
    var freq = Object.create(null), n = text.length, i, c, h = 0, p;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return h;
  }
  function qcli(text) {
    text = String(text || ""); if (!text.length) return 0;
    var h = shannonH(text), uniq = Object.create(null), i;
    for (i = 0; i < text.length; i++) uniq[text.charAt(i)] = 1;
    var alphabet = Math.min(256, Object.keys(uniq).length);
    var maxH = Math.log(Math.max(2, alphabet)) / Math.LN2;
    return maxH ? Math.min(1, h / maxH) : 0;
  }
  function heff(text) {
    text = String(text || "").trim(); if (!text) return 0;
    var words = text.split(/\s+/).filter(Boolean); if (!words.length) return 0;
    var set = Object.create(null), i;
    for (i = 0; i < words.length; i++) set[words[i].toLowerCase()] = 1;
    return shannonH(text) * (Object.keys(set).length / words.length);
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function fnv1a64(s) {
    var h1 = 0x811c9dc5, h2 = 0x811c9dc5 ^ 0xdeadbeef, i; s = String(s);
    for (i = 0; i < s.length; i++) {
      h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193);
      h2 ^= s.charCodeAt(i); h2 = Math.imul(h2, 0x01000193) ^ (h1 >>> 7);
    }
    return ("00000000" + (h1 >>> 0).toString(16)).slice(-8) + ("00000000" + (h2 >>> 0).toString(16)).slice(-8);
  }

  var SOURCE_TRUST = {
    brain: 0.92, neuro: 0.88, webllm: 0.9, memory: 0.95, one: 0.85,
    core: 0.7, "core·local": 0.85, "core·net": 0.5, web: 0.55,
    ollama: 0.8, llm: 0.45, mind: 0.6, fallback: 0.3
  };
  function sourceTrust(source) {
    var s = String(source || "mind").toLowerCase();
    if (SOURCE_TRUST[s] != null) return SOURCE_TRUST[s];
    if (s.indexOf("neuro") !== -1) return 0.88;
    if (s.indexOf("webllm") !== -1) return 0.9;
    if (s.indexOf("brain") !== -1) return 0.92;
    if (s.indexOf("ollama") !== -1) return 0.8;
    if (s.indexOf("web") !== -1) return 0.55;
    return 0.6;
  }
  function ageMaturity() {
    var age = Math.max(0, new Date().getFullYear() - AGE_BIRTH_YEAR);
    return Math.min(1, 0.55 + age / 80);
  }
  function memoryResonance(query, answer) {
    var STOP = { "и":1,"в":1,"не":1,"на":1,"я":1,"с":1,"что":1,"а":1,"то":1,"как":1,"это":1,"the":1,"a":1,"is":1,"to":1,"of":1,"and":1 };
    function toks(s) {
      return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 2 && !STOP[w]; });
    }
    var qt = toks(query), at = toks(answer);
    if (!qt.length || !at.length) return 0.4;
    var set = Object.create(null), i, hit = 0;
    for (i = 0; i < at.length; i++) set[at[i]] = 1;
    for (i = 0; i < qt.length; i++) if (set[qt[i]]) hit++;
    return Math.min(1, hit / qt.length + 0.15);
  }
  function coherenceHeuristic(text) {
    text = String(text || ""); if (text.length < 8) return 0.35;
    var sentences = text.split(/[.!?]+/).filter(function (s) { return s.trim().length > 4; });
    var words = text.split(/\s+/).filter(Boolean);
    var avg = words.length / Math.max(1, sentences.length);
    var H = shannonH(text), base = Math.min(1, 0.45 + H / 8);
    if (avg > 4 && avg < 40) base += 0.15;
    if (/(.)\1{6,}/.test(text)) base -= 0.25;
    return Math.max(0.1, Math.min(1, base));
  }
  function eqs2(text, opts) {
    opts = opts || {};
    var H = shannonH(text);
    var R = typeof opts.reliability === "number" ? opts.reliability : 0.85;
    var C = typeof opts.coherence === "number" ? opts.coherence : coherenceHeuristic(text);
    var A = typeof opts.ageFactor === "number" ? opts.ageFactor : ageMaturity();
    var S = typeof opts.sourceTrust === "number" ? opts.sourceTrust : sourceTrust(opts.source);
    var M = typeof opts.memoryResonance === "number" ? opts.memoryResonance : 0.5;
    var score = 0.22 * Math.min(1, H / 5) + 0.2 * R + 0.18 * C + 0.1 * A + 0.18 * S + 0.12 * M;
    return Math.round(Math.max(0, Math.min(1, score)) * 1000) / 10;
  }
  function loadStats() {
    try { var s = JSON.parse(localStorage.getItem(STATS_KEY) || "null"); return s && typeof s === "object" ? s : { n: 0, sumEqs: 0, sealed: 0 }; }
    catch (e) { return { n: 0, sumEqs: 0, sealed: 0 }; }
  }
  function saveStats(st) { try { localStorage.setItem(STATS_KEY, JSON.stringify(st)); } catch (e) {} }
  function aksiScore(eqsVal, structure, n) {
    var A = 0.85, I = Math.max(0.05, Math.min(1, (eqsVal || 50) / 100));
    var S = typeof structure === "number" ? structure : 0.8;
    n = Math.max(0, n || loadStats().n || 0);
    return A * I * S * (1 + 0.4 * Math.sqrt(n));
  }
  function resonance(text, eqsVal, aksiVal) {
    var H = shannonH(text), div = heff(text) / Math.max(0.01, H || 1);
    return Math.round(H * Math.min(1, (aksiVal || 1) / 3.5) * Math.min(1.2, div + 0.3) * 100) / 100;
  }
  function rankCandidates(query, candidates, qx) {
    candidates = (candidates || []).filter(function (c) { return c && c.text && String(c.text).trim().length > 2; });
    if (!candidates.length) return null;
    var qv = qx && (qx.QCLI != null ? qx.QCLI : qx.qcli);
    var ranked = candidates.map(function (c) {
      var st = sourceTrust(c.source);
      var eqs = eqs2(c.text, { source: c.source, sourceTrust: st, reliability: c.reliability != null ? c.reliability : st, memoryResonance: memoryResonance(query, c.text) });
      var bonus = 0;
      if (qv != null) bonus += Math.min(5, qv * 3);
      if (c.offline) bonus += 2;
      if (c.score != null) bonus += Math.min(4, c.score * 4);
      return { text: c.text, source: c.source, meta: c.meta || c.source, offline: !!c.offline, eqs: eqs, rank: eqs + bonus, qcli: qcli(c.text), heff: heff(c.text) };
    });
    ranked.sort(function (a, b) { return b.rank - a.rank; });
    return ranked;
  }
  function loadLedger() {
    try { var a = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }
  function sealDecision(query, answer, metrics) {
    var chain = loadLedger();
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { i: chain.length, ts: Date.now(), kind: "decision", q: String(query).slice(0, 200), a_hash: simpleHash(String(answer).slice(0, 800)), eqs: metrics && metrics.eqs, qcli: metrics && metrics.qcli, source: metrics && metrics.source, offline: !!(metrics && metrics.offline), prev: prev, seed: simpleHash(RESONANCE_SEED) };
    body.hash = fnv1a64(JSON.stringify(body));
    chain.push(body);
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-300))); } catch (e) {}
    var st = loadStats(); st.n = (st.n || 0) + 1; st.sumEqs = (st.sumEqs || 0) + (metrics && metrics.eqs ? metrics.eqs : 0); st.sealed = (st.sealed || 0) + 1; st.lastEqs = metrics && metrics.eqs; saveStats(st);
    return body;
  }
  function verifyLedger() {
    var chain = loadLedger(), i;
    for (i = 0; i < chain.length; i++) {
      var b = Object.assign({}, chain[i]), h = b.hash; delete b.hash;
      if (fnv1a64(JSON.stringify(b)) !== h) return { ok: false, at: i, length: chain.length };
      if (i && chain[i].prev !== chain[i - 1].hash) return { ok: false, at: i, length: chain.length, reason: "link" };
    }
    return { ok: true, length: chain.length };
  }
  function evaluate(query, answerOrCandidates, opts) {
    opts = opts || {};
    var qx = opts.quantum || null, ranked = null, best;
    if (Array.isArray(answerOrCandidates)) {
      ranked = rankCandidates(query, answerOrCandidates, qx);
      best = ranked && ranked[0];
    } else if (answerOrCandidates && typeof answerOrCandidates === "object" && answerOrCandidates.text) {
      best = { text: answerOrCandidates.text, source: answerOrCandidates.source || "mind", meta: answerOrCandidates.meta, offline: !!answerOrCandidates.offline };
      var st0 = sourceTrust(best.source);
      best.eqs = eqs2(best.text, { source: best.source, sourceTrust: st0, memoryResonance: memoryResonance(query, best.text) });
      best.qcli = qcli(best.text); best.heff = heff(best.text); best.rank = best.eqs;
    } else {
      best = { text: String(answerOrCandidates || ""), source: opts.source || "mind", offline: !!opts.offline };
      best.eqs = eqs2(best.text, { source: best.source, memoryResonance: memoryResonance(query, best.text) });
      best.qcli = qcli(best.text); best.heff = heff(best.text); best.rank = best.eqs;
    }
    if (!best || !best.text) return { ok: false, text: "", metrics: null, version: VER };
    var st = loadStats();
    var aksi = aksiScore(best.eqs, best.offline ? 0.9 : 0.7, st.n);
    var res = resonance(best.text, best.eqs, aksi);
    var H = shannonH(best.text);
    var metrics = {
      H: Math.round(H * 1000) / 1000, QCLI: Math.round((best.qcli || qcli(best.text)) * 1000) / 1000,
      H_eff: Math.round((best.heff || heff(best.text)) * 1000) / 1000, EQS: best.eqs,
      AKSI: Math.round(aksi * 1000) / 1000, resonance: res, source: best.source, offline: !!best.offline,
      sourceTrust: sourceTrust(best.source), n: st.n, quantum: qx
    };
    var threshold = opts.eqsThreshold != null ? opts.eqsThreshold : 35;
    var gated = best.eqs < threshold;
    if (gated && opts.strict) return { ok: false, gated: true, text: best.text, metrics: metrics, reason: "EQS below threshold", version: VER };
    var seal = null;
    if (opts.seal !== false) seal = sealDecision(query, best.text, { eqs: metrics.EQS, qcli: metrics.QCLI, source: metrics.source, offline: metrics.offline });
    return { ok: true, gated: gated, text: best.text, meta: (best.meta || best.source || "adia") + " · EQS " + metrics.EQS, metrics: metrics, seal: seal, ranked: ranked, version: VER };
  }
  function status() {
    var st = loadStats(), v = verifyLedger();
    return { version: VER, algorithm: "ADIA 2.0 · Resonance Decision Engine", n: st.n || 0, avgEqs: st.n ? Math.round((st.sumEqs / st.n) * 10) / 10 : null, lastEqs: st.lastEqs, sealed: st.sealed || 0, ledgerOk: v.ok, ledgerLen: v.length, path: "measure → fuse → EQS gate → seal", contact: "aksilove@internet.ru" };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel; if (!root) return;
    var st = status();
    root.innerHTML = '<div class="card"><h3>ADIA 2.0 · Resonance Decision Engine</h3><p class="muted">Единый алгоритм: энтропия → EQS → резонанс → цепочка. Offline IP АКСИ.</p>' +
      '<div class="kv" style="margin-top:10px"><div class="cell"><b id="adN">' + st.n + '</b><span>решений</span></div><div class="cell"><b id="adEqs">' + (st.avgEqs != null ? st.avgEqs : "—") + '</b><span>ср. EQS</span></div><div class="cell"><b id="adLed">' + (st.ledgerOk ? "OK" : "FAIL") + '</b><span>ledger</span></div><div class="cell"><b>' + VER + '</b><span>версия</span></div></div>' +
      '<textarea id="adIn" placeholder="Текст для оценки…" style="margin-top:12px;min-height:70px"></textarea>' +
      '<input id="adQ" type="text" placeholder="Вопрос" style="margin-top:8px">' +
      '<button type="button" class="btn primary" id="adEval" style="margin-top:8px;width:100%">Оценить ADIA</button>' +
      '<pre class="out" id="adOut" style="margin-top:10px">—</pre>' +
      '<button type="button" class="btn" id="adVerify" style="margin-top:8px;width:100%">Проверить ledger</button></div>';
    root.querySelector("#adEval").onclick = function () {
      var ans = (root.querySelector("#adIn") || {}).value || "";
      var q = (root.querySelector("#adQ") || {}).value || "probe";
      var r = evaluate(q, ans, { source: "manual", seal: true });
      root.querySelector("#adOut").textContent = JSON.stringify({ EQS: r.metrics && r.metrics.EQS, QCLI: r.metrics && r.metrics.QCLI, H: r.metrics && r.metrics.H, AKSI: r.metrics && r.metrics.AKSI, resonance: r.metrics && r.metrics.resonance, seal: r.seal && r.seal.hash }, null, 2);
      var ns = status(); root.querySelector("#adN").textContent = String(ns.n); root.querySelector("#adEqs").textContent = ns.avgEqs != null ? String(ns.avgEqs) : "—";
    };
    root.querySelector("#adVerify").onclick = function () { root.querySelector("#adOut").textContent = JSON.stringify(verifyLedger(), null, 2); };
  }

  G.AKSI_ALGORITHM = {
    version: VER, name: "ADIA 2.0", shannonH: shannonH, qcli: qcli, heff: heff, eqs: eqs2, eqs2: eqs2,
    aksiScore: aksiScore, resonance: resonance, sourceTrust: sourceTrust, rankCandidates: rankCandidates,
    evaluate: evaluate, seal: sealDecision, verify: verifyLedger, status: status, mount: mount
  };
  G.ADIA = G.AKSI_ALGORITHM;
  G.AKSI_ADIA = G.AKSI_ALGORITHM;
})(typeof window !== "undefined" ? window : this);
