/**
 * ADIA 3.0 — Unified Resonance Decision Engine (AKSI Product Algorithm)
 * One pipeline: candidates → score → rank → optional seal
 * Formula: AKSI=(A×I×S)×(1+0.4√n)
 * Quantum block = deterministic client simulation (not physical QPU)
 */
(function (G) {
  'use strict';
  var VERSION = '3.0.0';
  var LEDGER_KEY = 'aksi_adia3_ledger';
  var POLICY = { companion: 55, lab: 70, strict: 80 };

  function clamp01(x) {
    x = Number(x);
    if (isNaN(x)) return 0;
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function round(x, d) {
    d = d == null ? 3 : d;
    var p = Math.pow(10, d);
    return Math.round(Number(x) * p) / p;
  }
  function entropy(s) {
    s = String(s || '');
    if (!s) return 0;
    var f = {}, n = s.length, h = 0, i, c, p;
    for (i = 0; i < n; i++) {
      c = s.charAt(i);
      f[c] = (f[c] || 0) + 1;
    }
    for (c in f) {
      p = f[c] / n;
      h -= p * Math.log2(p);
    }
    return h;
  }
  function qcli(s) {
    s = String(s || '');
    if (!s) return 0;
    var u = {}, i;
    for (i = 0; i < s.length; i++) u[s.charAt(i)] = 1;
    var alphabet = Math.min(256, Object.keys(u).length);
    var maxH = Math.log2(Math.max(2, alphabet));
    return clamp01(entropy(s) / maxH);
  }
  function heff(s) {
    s = String(s || '').trim();
    if (!s) return 0;
    var w = s.split(/\s+/).filter(Boolean);
    if (!w.length) return 0;
    var u = {}, i;
    for (i = 0; i < w.length; i++) u[w[i].toLowerCase()] = 1;
    return entropy(s) * (Object.keys(u).length / w.length);
  }
  function tokenize(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(function (x) {
        return x.length > 2;
      });
  }
  function overlap(q, a) {
    var qv = tokenize(q),
      av = tokenize(a),
      set = {},
      hit = 0,
      i;
    for (i = 0; i < av.length; i++) set[av[i]] = 1;
    for (i = 0; i < qv.length; i++) if (set[qv[i]]) hit++;
    return qv.length ? clamp01(hit / qv.length) : 0;
  }
  function coherence(s) {
    s = String(s || '');
    if (s.length < 8) return 0.35;
    var w = s.split(/\s+/).filter(Boolean);
    var sent = s.split(/[.!?\u2026]+/).filter(function (x) {
      return x.trim().length > 4;
    });
    var avg = w.length / Math.max(1, sent.length);
    var v = 0.45 + entropy(s) / 8;
    if (avg > 4 && avg < 40) v += 0.15;
    if (/(.)\1{6,}/.test(s)) v -= 0.25;
    if (s.length > 40 && sent.length === 0) v -= 0.1;
    return clamp01(v);
  }
  function eqs(text, o) {
    o = o || {};
    var H = Math.min(1, entropy(text) / 5);
    var R = typeof o.reliability === 'number' ? clamp01(o.reliability) : 0.78;
    var C = typeof o.coherence === 'number' ? clamp01(o.coherence) : coherence(text);
    var T = typeof o.sourceTrust === 'number' ? clamp01(o.sourceTrust) : 0.7;
    var M =
      typeof o.memoryResonance === 'number'
        ? clamp01(o.memoryResonance)
        : overlap(o.query || '', text);
    var w = o.weights || { H: 0.18, R: 0.22, C: 0.22, T: 0.2, M: 0.18 };
    var score = 100 * (w.H * H + w.R * R + w.C * C + w.T * T + w.M * M);
    return round(Math.max(0, Math.min(100, score)), 1);
  }
  function aksiScore(eqsValue, structure, n) {
    var A = 0.9;
    var I = clamp01((eqsValue || 0) / 100);
    var S = typeof structure === 'number' ? clamp01(structure) : 0.82;
    var N = Math.max(0, n || 0);
    return round(A * I * S * (1 + 0.4 * Math.sqrt(N)), 3);
  }
  function resonance(text, aksiVal) {
    var H = entropy(text);
    var D = heff(text) / Math.max(0.01, H || 1);
    return round(H * Math.min(1, (aksiVal || 1) / 3.5) * Math.min(1.2, D + 0.3), 2);
  }
  function fnv(s) {
    var h = 0x811c9dc5,
      i;
    for (i = 0; i < String(s).length; i++) {
      h ^= String(s).charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ('00000000' + (h >>> 0).toString(16)).slice(-8);
  }
  function quantumSim(seed) {
    var h = fnv(String(seed || 'aksi'));
    var bits = [];
    var i,
      n = parseInt(h, 16);
    for (i = 0; i < 8; i++) bits.push((n >> i) & 1);
    var ones = bits.reduce(function (a, b) {
      return a + b;
    }, 0);
    var p = ones / 8 || 0.001;
    var ent =
      p > 0 && p < 1 ? -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)) : 0;
    return {
      seed: h,
      bits: bits.join(''),
      ones: ones,
      entropy: round(ent, 3),
      mode: 'deterministic-client-simulation',
      note: 'Not a physical quantum computer'
    };
  }
  function loadLedger() {
    try {
      return JSON.parse(localStorage.getItem(LEDGER_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }
  function saveLedger(a) {
    try {
      localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-400)));
    } catch (e) {}
  }
  function seal(query, answer, metrics) {
    var a = loadLedger();
    var prev = a.length ? a[a.length - 1].hash : 'GENESIS';
    var body = {
      i: a.length,
      ts: Date.now(),
      q: String(query || '').slice(0, 180),
      answerHash: fnv(String(answer || '')),
      metrics: {
        EQS: metrics.EQS,
        QCLI: metrics.QCLI,
        AKSI: metrics.AKSI,
        DIMAX: metrics.DIMAX
      },
      prev: prev
    };
    body.hash = fnv(JSON.stringify(body));
    a.push(body);
    saveLedger(a);
    return body;
  }
  function verifyLedger() {
    var a = loadLedger(),
      i,
      b,
      h;
    for (i = 0; i < a.length; i++) {
      b = Object.assign({}, a[i]);
      h = b.hash;
      delete b.hash;
      if (fnv(JSON.stringify(b)) !== h)
        return { ok: false, at: i, length: a.length };
      if (i && a[i].prev !== a[i - 1].hash)
        return { ok: false, at: i, length: a.length, reason: 'link' };
    }
    return { ok: true, length: a.length };
  }
  function dimax(m) {
    var eq = (m.EQS || 0) / 100;
    var q = m.QCLI || 0;
    var co = m.coherence || 0;
    var src = m.sourceTrust || 0;
    return round(100 * (0.35 * eq + 0.25 * q + 0.2 * co + 0.2 * src), 1);
  }
  function structureOf(text) {
    text = String(text || '');
    var len = text.length;
    if (len < 12) return 0.4;
    var hasList = /[-\u2022*]|\d+[.)]/.test(text);
    var hasPara = text.split(/\n/).length > 1;
    var s = 0.55;
    if (len > 60) s += 0.1;
    if (len > 160) s += 0.08;
    if (hasList) s += 0.12;
    if (hasPara) s += 0.08;
    return clamp01(s);
  }
  function sourceTrustOf(source) {
    source = String(source || 'local').toLowerCase();
    if (source.indexOf('webllm') >= 0 || source.indexOf('llm') >= 0) return 0.88;
    if (source.indexOf('mind') >= 0) return 0.9;
    if (source.indexOf('neuro') >= 0) return 0.86;
    if (source.indexOf('rag') >= 0 || source.indexOf('mem') >= 0) return 0.84;
    if (source.indexOf('core') >= 0) return 0.8;
    if (source.indexOf('fallback') >= 0) return 0.55;
    return 0.75;
  }
  function score(query, answer, opts) {
    opts = opts || {};
    var text =
      typeof answer === 'string'
        ? answer
        : (answer && (answer.text || answer.content)) || '';
    var source = (answer && answer.source) || opts.source || 'local';
    var trust =
      typeof opts.sourceTrust === 'number'
        ? opts.sourceTrust
        : sourceTrustOf(source);
    var n = loadLedger().length;
    var mem =
      typeof opts.memoryResonance === 'number'
        ? opts.memoryResonance
        : overlap(query, text);
    var coh = coherence(text);
    var EQS = eqs(text, {
      query: query,
      reliability: opts.reliability,
      coherence: coh,
      sourceTrust: trust,
      memoryResonance: mem,
      weights: opts.weights
    });
    var struct = typeof opts.structure === 'number' ? opts.structure : structureOf(text);
    var m = {
      H: round(entropy(text), 3),
      QCLI: round(qcli(text), 3),
      H_eff: round(heff(text), 3),
      EQS: EQS,
      coherence: round(coh, 3),
      sourceTrust: trust,
      memoryResonance: round(mem, 3),
      structure: round(struct, 3),
      source: source,
      offline: opts.offline !== false,
      n: n
    };
    m.AKSI = aksiScore(m.EQS, struct, n);
    m.resonance = resonance(text, m.AKSI);
    m.DIMAX = dimax(m);
    m.quantum = quantumSim(String(query || '') + '|' + text.slice(0, 200));
    return m;
  }
  function process(query, candidates, opts) {
    opts = opts || {};
    var policy = opts.policy || 'companion';
    var threshold = POLICY[policy] != null ? POLICY[policy] : POLICY.companion;
    var list = Array.isArray(candidates) ? candidates : [candidates];
    var ranked = [];
    var i, c, text, src, m, entry;
    for (i = 0; i < list.length; i++) {
      c = list[i];
      if (c == null) continue;
      text = typeof c === 'string' ? c : c.text || c.content || '';
      src = typeof c === 'string' ? opts.source || 'local' : c.source || opts.source || 'local';
      if (!String(text).trim()) continue;
      m = score(query, { text: text, source: src }, opts);
      entry = {
        text: text,
        source: src,
        metrics: m,
        pass: m.EQS >= threshold
      };
      ranked.push(entry);
    }
    ranked.sort(function (a, b) {
      if (b.metrics.EQS !== a.metrics.EQS) return b.metrics.EQS - a.metrics.EQS;
      if (b.metrics.AKSI !== a.metrics.AKSI) return b.metrics.AKSI - a.metrics.AKSI;
      return b.metrics.QCLI - a.metrics.QCLI;
    });
    var best = ranked[0] || null;
    var sealed = null;
    if (best && opts.seal !== false) {
      sealed = seal(query, best.text, best.metrics);
    }
    return {
      ok: !!best,
      version: VERSION,
      algorithm: 'ADIA 3.0 Unified Resonance Decision Engine',
      policy: policy,
      threshold: threshold,
      query: String(query || '').slice(0, 300),
      best: best,
      ranked: ranked,
      seal: sealed,
      formula: 'AKSI=(A×I×S)×(1+0.4√n)'
    };
  }
  function evaluate(query, answer, opts) {
    opts = opts || {};
    var text =
      typeof answer === 'string'
        ? answer
        : (answer && answer.text) || '';
    var r = process(query, [{ text: text, source: (answer && answer.source) || opts.source }], opts);
    var m = r.best ? r.best.metrics : score(query, text, opts);
    return {
      ok: !!text,
      text: text,
      metrics: m,
      seal: r.seal,
      version: VERSION,
      process: r
    };
  }
  function status() {
    var v = verifyLedger();
    return {
      version: VERSION,
      name: 'ADIA 3.0',
      algorithm: 'Unified Resonance Decision Engine',
      formula: 'AKSI=(A×I×S)×(1+0.4√n)',
      ledgerOk: v.ok,
      ledgerLen: v.length,
      policies: POLICY,
      metrics: ['H', 'QCLI', 'H_eff', 'EQS', 'AKSI', 'resonance', 'DIMAX', 'quantumSim']
    };
  }

  G.AKSI_ALGORITHM = {
    version: VERSION,
    name: 'ADIA 3.0',
    process: process,
    evaluate: evaluate,
    score: score,
    status: status,
    verify: verifyLedger,
    seal: seal,
    quantum3: quantumSim,
    quantumSim: quantumSim,
    entropy: entropy,
    qcli: qcli,
    heff: heff,
    overlap: overlap,
    coherence: coherence,
    eqs: eqs,
    aksi: aksiScore,
    POLICY: POLICY
  };
  G.AKSI_METRICS = G.AKSI_ALGORITHM;
  G.AKSI_ADIA = G.AKSI_ALGORITHM;
})(typeof window !== 'undefined' ? window : this);
