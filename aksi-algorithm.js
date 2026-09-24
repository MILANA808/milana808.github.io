/**
 * AKSI MODEL / ADIA 4.0.1 — unified decision core
 * score → rank → claim-throttle → gate → seal
 * Formula: AKSI=(A×I×S)×(1+0.4√n)
 * Not AGI. aksilove@internet.ru
 */
(function (G) {
  'use strict';
  var VERSION = '4.0.1';
  var LEDGER_KEY = 'aksi_adia4_ledger';
  var POLICY = { companion: 55, lab: 70, strict: 80 };
  var CLEAT_POLICY = {
    companion: { minG: 0.12, maxAbsRate: 0.55, vetoG: 0.02 },
    lab: { minG: 0.35, maxAbsRate: 0.3, vetoG: 0.12 },
    strict: { minG: 0.5, maxAbsRate: 0.18, vetoG: 0.2 }
  };
  function clamp01(x) { x = Number(x); if (isNaN(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  function round(x, d) { d = d == null ? 3 : d; var p = Math.pow(10, d); return Math.round(Number(x) * p) / p; }
  function entropy(s) {
    s = String(s || ''); if (!s) return 0;
    var f = {}, n = s.length, h = 0, i, c, p;
    for (i = 0; i < n; i++) { c = s.charAt(i); f[c] = (f[c] || 0) + 1; }
    for (c in f) { p = f[c] / n; h -= p * Math.log2(p); }
    return h;
  }
  function qcli(s) {
    s = String(s || ''); if (!s) return 0;
    var u = {}, i; for (i = 0; i < s.length; i++) u[s.charAt(i)] = 1;
    return clamp01(entropy(s) / Math.log2(Math.max(2, Math.min(256, Object.keys(u).length))));
  }
  function tokenize(s) {
    return String(s || '').toLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(function (x) { return x.length > 2; });
  }
  function overlap(q, a) {
    var qv = tokenize(q), av = tokenize(a), set = {}, hit = 0, i;
    for (i = 0; i < av.length; i++) set[av[i]] = 1;
    for (i = 0; i < qv.length; i++) if (set[qv[i]]) hit++;
    return qv.length ? clamp01(hit / qv.length) : 0;
  }
  function coherence(s) {
    s = String(s || ''); if (s.length < 8) return 0.35;
    var w = s.split(/\s+/).filter(Boolean);
    var sent = s.split(/[.!?…]+/).filter(function (x) { return x.trim().length > 4; });
    var avg = w.length / Math.max(1, sent.length);
    var v = 0.45 + entropy(s) / 8;
    if (avg > 4 && avg < 40) v += 0.15;
    if (/(.)\1{6,}/.test(s)) v -= 0.25;
    return clamp01(v);
  }
  function eqs(text, o) {
    o = o || {};
    var H = Math.min(1, entropy(text) / 5);
    var R = typeof o.reliability === 'number' ? clamp01(o.reliability) : 0.78;
    var C = typeof o.coherence === 'number' ? clamp01(o.coherence) : coherence(text);
    var T = typeof o.sourceTrust === 'number' ? clamp01(o.sourceTrust) : 0.7;
    var M = typeof o.memoryResonance === 'number' ? clamp01(o.memoryResonance) : overlap(o.query || '', text);
    var w = o.weights || { H: 0.18, R: 0.22, C: 0.22, T: 0.2, M: 0.18 };
    return round(Math.max(0, Math.min(100, 100 * (w.H * H + w.R * R + w.C * C + w.T * T + w.M * M))), 1);
  }
  function aksiScore(eqsValue, structure, n) {
    return round(0.9 * clamp01((eqsValue || 0) / 100) * (typeof structure === 'number' ? clamp01(structure) : 0.82) * (1 + 0.4 * Math.sqrt(Math.max(0, n || 0))), 3);
  }
  function fnv(s) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < String(s).length; i++) { h ^= String(s).charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function loadLedger() { try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]'); } catch (e) { return []; } }
  function saveLedger(a) { try { localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-400))); } catch (e) {} }
  function seal(query, answer, metrics) {
    var a = loadLedger(); var prev = a.length ? a[a.length - 1].hash : 'GENESIS';
    var body = { i: a.length, ts: Date.now(), q: String(query || '').slice(0, 180), answerHash: fnv(String(answer || '')), metrics: { EQS: metrics.EQS, AKSI: metrics.AKSI }, prev: prev };
    body.hash = fnv(JSON.stringify(body)); a.push(body); saveLedger(a); return body;
  }
  function structureOf(text) {
    text = String(text || ''); var len = text.length; if (len < 12) return 0.4;
    var s = 0.55; if (len > 60) s += 0.1; if (len > 160) s += 0.08;
    if (/[-•*]|\d+[.)]/.test(text)) s += 0.12; if (text.split(/\n/).length > 1) s += 0.08;
    return clamp01(s);
  }
  function sourceTrustOf(source) {
    source = String(source || 'local').toLowerCase();
    if (source.indexOf('webllm') >= 0 || source.indexOf('llm') >= 0) return 0.88;
    if (source.indexOf('mem') >= 0) return 0.84; if (source.indexOf('fallback') >= 0) return 0.55;
    return 0.75;
  }
  function score(query, answer, opts) {
    opts = opts || {};
    var text = typeof answer === 'string' ? answer : (answer && (answer.text || answer.content)) || '';
    var source = (answer && answer.source) || opts.source || 'local';
    var trust = typeof opts.sourceTrust === 'number' ? opts.sourceTrust : sourceTrustOf(source);
    var n = loadLedger().length;
    var mem = typeof opts.memoryResonance === 'number' ? opts.memoryResonance : overlap(query, text);
    var coh = coherence(text);
    var EQS = eqs(text, { query: query, coherence: coh, sourceTrust: trust, memoryResonance: mem });
    var struct = typeof opts.structure === 'number' ? opts.structure : structureOf(text);
    var m = { EQS: EQS, QCLI: round(qcli(text), 3), coherence: round(coh, 3), sourceTrust: trust, memoryResonance: round(mem, 3), structure: round(struct, 3), source: source, n: n };
    m.AKSI = aksiScore(m.EQS, struct, n);
    return m;
  }
  var ABS_RE = [/безусловно/i, /гарантированно/i, /всегда\b/i, /точно известно/i, /\balways\b/i, /\bguaranteed\b/i];
  var HEDGE_RE = [/возможно/i, /вероятно/i, /кажется/i, /\bmight\b/i, /\bmaybe\b/i];
  function segmentClaims(answer) {
    var t = String(answer || '').trim(); if (!t) return [];
    var parts = t.split(/(?<=[.!?…])\s+|\n+/), out = [], i, p;
    for (i = 0; i < parts.length; i++) { p = parts[i].replace(/^[\s•\-]+/, '').trim(); if (p.length >= 12) out.push(p); }
    if (!out.length && t) out = [t]; return out.slice(0, 24);
  }
  function evidenceBlob(evidence) {
    if (!evidence || !evidence.length) return '';
    return evidence.map(function (e) { return typeof e === 'string' ? e : [e.title, e.text, e.snippet].filter(Boolean).join(' '); }).join('\n');
  }
  function claimThrottle(answer, evidence, policy) {
    var P = CLEAT_POLICY[policy] || CLEAT_POLICY.companion;
    var blob = evidenceBlob(evidence);
    var claims = segmentClaims(answer), scored = [], i, c, support, abs, hedge, g, kind, absHits, hHits, j;
    for (i = 0; i < claims.length; i++) {
      c = claims[i]; support = blob ? overlap(c, blob) : 0.35; absHits = 0; hHits = 0;
      for (j = 0; j < ABS_RE.length; j++) if (ABS_RE[j].test(c)) absHits++;
      for (j = 0; j < HEDGE_RE.length; j++) if (HEDGE_RE[j].test(c)) hHits++;
      abs = clamp01(absHits / 2); hedge = clamp01(hHits / 2);
      g = clamp01(0.7 * support + 0.15 * hedge + 0.15 * (support > 0.12 ? 1 : 0) - 0.35 * abs * (1 - support));
      kind = support >= 0.22 && abs < 0.3 ? 'GROUNDED' : abs > 0.3 && support < 0.1 ? 'OVERCLAIM' : !blob ? 'LOCAL' : 'CLAIM';
      scored.push({ text: c.slice(0, 240), support: round(support, 4), g: round(g, 4), kind: kind });
    }
    var G = 0, over = 0;
    if (scored.length) { for (i = 0; i < scored.length; i++) { G += scored[i].g; if (scored[i].kind === 'OVERCLAIM') over++; } G /= scored.length; }
    var verdict = 'BIND';
    if (G < P.vetoG || (over >= 2 && G < P.minG)) verdict = 'VETO';
    else if (G < P.minG) verdict = 'THROTTLE';
    var gate = verdict === 'BIND' ? 'ALLOW' : verdict === 'THROTTLE' ? 'DEFER' : 'BLOCK';
    return { G: round(G, 4), verdict: verdict, gate: gate, claim_count: scored.length, overclaim_n: over, claims: scored.slice(0, 12) };
  }
  function process(query, candidates, opts) {
    opts = opts || {};
    var policy = opts.policy || 'companion';
    var threshold = POLICY[policy] != null ? POLICY[policy] : POLICY.companion;
    var list = Array.isArray(candidates) ? candidates : [candidates];
    var ranked = [], i, c, text, src, m;
    for (i = 0; i < list.length; i++) {
      c = list[i]; if (c == null) continue;
      text = typeof c === 'string' ? c : c.text || c.content || '';
      src = typeof c === 'string' ? opts.source || 'local' : c.source || opts.source || 'local';
      if (!String(text).trim()) continue;
      m = score(query, { text: text, source: src }, opts);
      ranked.push({ text: text, source: src, metrics: m, pass: m.EQS >= threshold, EQS: m.EQS });
    }
    ranked.sort(function (a, b) {
      if (b.metrics.EQS !== a.metrics.EQS) return b.metrics.EQS - a.metrics.EQS;
      return b.metrics.AKSI - a.metrics.AKSI;
    });
    var best = ranked[0] || null;
    var throttle = null;
    var gate = { decision: 'BLOCK', reason: 'no_candidate' };
    if (best) {
      throttle = claimThrottle(best.text, opts.evidence || [], policy);
      if (!best.pass) {
        gate = { decision: policy === 'strict' ? 'BLOCK' : 'DEFER', reason: 'eqs_below_policy' };
      } else if (throttle.verdict === 'VETO' && policy === 'companion') {
        gate = { decision: 'DEFER', reason: 'throttle_soft' };
      } else {
        gate = { decision: throttle.gate, reason: throttle.verdict };
      }
    }
    var sealed = null;
    if (best && opts.seal !== false) sealed = seal(query, best.text, best.metrics);
    return {
      ok: !!best, version: VERSION, model: 'AKSI', algorithm: 'ADIA 4.0.1',
      policy: policy, threshold: threshold, query: String(query || '').slice(0, 300),
      best: best, ranked: ranked, throttle: throttle, gate: gate, seal: sealed,
      formula: 'AKSI=(A×I×S)×(1+0.4√n); gate←EQS+claimThrottle',
      pipeline: 'score→rank→claimThrottle→gate→seal'
    };
  }
  function evaluate(query, answer, opts) {
    opts = opts || {};
    var text = typeof answer === 'string' ? answer : (answer && answer.text) || '';
    var r = process(query, [{ text: text, source: (answer && answer.source) || opts.source }], opts);
    return { ok: !!text, text: text, metrics: r.best ? r.best.metrics : score(query, text, opts), throttle: r.throttle, gate: r.gate, seal: r.seal, version: VERSION, process: r };
  }
  function status() {
    return { version: VERSION, name: 'AKSI / ADIA 4.0.1', model: 'unified', pipeline: 'score→rank→claimThrottle→gate→seal', policies: POLICY };
  }
  G.AKSI_ALGORITHM = {
    version: VERSION, name: 'AKSI ADIA 4.0.1', model: 'AKSI',
    process: process, evaluate: evaluate, score: score, claimThrottle: claimThrottle,
    status: status, seal: seal, POLICY: POLICY
  };
  G.AKSI_MODEL = G.AKSI_ALGORITHM;
  G.AKSI_METRICS = G.AKSI_ALGORITHM;
  G.AKSI_ADIA = G.AKSI_ALGORITHM;
})(typeof window !== 'undefined' ? window : this);
