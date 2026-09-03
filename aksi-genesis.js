/**
 * AKSI GENESIS v2.1 — improved cognitive engine
 * SENSE → BIND → SUPERPOSE → COLLAPSE → SYNTHESIZE → Q-GATE → CRITIQUE → LEARN → ATTEST
 * GenesisScore=(R×C×G×Q)×(1+0.3√n)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.1.0-genesis";
  var CORTEX = "aksi_genesis_cortex_v21";
  var LEDGER = "aksi_genesis_ledger_v21";
  var DERIVED = "aksi_genesis_derived_v21";
  var PAIR = "aksi_genesis_pairs_v21";
  function now() { return Date.now(); }
  function uid() { return "g" + now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clamp(x, a, b) { x = +x; if (isNaN(x)) return a; return x < a ? a : x > b ? b : x; }
  function round(x, d) { var p = Math.pow(10, d == null ? 3 : d); return Math.round(+x * p) / p; }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function overlap(a, b) {
    var s = {}, i, n = 0; for (i = 0; i < b.length; i++) s[b[i]] = 1;
    for (i = 0; i < a.length; i++) if (s[a[i]]) n++; return a.length ? n / a.length : 0;
  }
  function fnv(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function load(key) { try { var a = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(key, a) { try { localStorage.setItem(key, JSON.stringify(a.slice(-900))); } catch (e) {} }
  var SEED = [
    { k: ["кто ты", "who are you", "что такое акси", "what is aksi"], t: "Я АКСИ Genesis — суверенный offline-движок. sense→…→attest. aksilove@internet.ru" },
    { k: ["genesis", "дженезис", "алгоритм"], t: "Genesis v2.1: GenesisScore=(R×C×G×Q)×(1+0.3√n), cortex, derived, печать." },
    { k: ["квант", "quantum", "qcli", "q-gate"], t: "Quantum gate — state-vector/QCLI. При AKSI_QPIPE ответ прогоняется через симулятор." },
    { k: ["запомни", "обуч", "learn", "память", "cortex"], t: "«запомни: факт». Высокий score → auto pair. derived — правила." },
    { k: ["крипто", "подпис", "seal", "attest"], t: "Attest: AKSI_CRYPTO или FNV-ledger." },
    { k: ["модул", "что уме", "функци"], t: "Genesis, AI, Cipher, SPA, MATRIX, Local AI, Quantum, Proof, Globe, Net, Protocol, ADIA, Bot." },
    { k: ["как польз", "help", "с чего"], t: "1) Бот 2) /genesis/ 3) /ai/ 4) /crypto/ 5) /matrix/ 6) «запомни:»" },
    { k: ["matrix", "webllm", "llm"], t: "MATRIX — opt-in WebLLM+RAG. Genesis работает без LLM." },
    { k: ["сеть", "контур"], t: "АКСИ-Сеть: Chat↔Mem↔Trust↔Quantum↔Bot↔Genesis." }
  ];
  function qcliFromText(text) {
    var s = String(text || ""), i, h = 0, unique = {};
    for (i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; unique[s.charAt(i)] = 1; }
    var entropy = Object.keys(unique).length / Math.max(32, Math.min(s.length, 128));
    var phase = (h % 628) / 100;
    var amp = clamp(0.35 + entropy * 0.5, 0.2, 0.95);
    var z = ((h % 2000) / 1000) - 1;
    return { qcli: round(amp * (0.55 + 0.45 * Math.abs(Math.cos(phase))), 3), phase: round(phase, 3), z: round(z, 3), entropy: round(entropy, 3) };
  }
  function answerGate(question, answer) {
    var q = qcliFromText(question), a = qcliFromText(answer);
    var resonance = clamp(1 - Math.abs(q.phase - a.phase) / 6.28, 0, 1);
    var gate = round(clamp(0.4 * a.qcli + 0.35 * resonance + 0.25 * (1 - Math.abs(a.z) * 0.3), 0, 1), 3);
    return { gate: gate, pass: gate >= 0.42, qcli_q: q.qcli, qcli_a: a.qcli, resonance: round(resonance, 3), backend: "local-sv-lite" };
  }
  function sense(input) {
    var raw = String(input || "").trim();
    return { raw: raw, tokens: tok(raw), lang: /[а-яё]/i.test(raw) ? "ru" : "en", teach: /^\s*(запомни|remember|learn)\s*[:：]/i.test(raw), derive: /выведи|derive|синтез|новое знание/i.test(raw) };
  }
  function bind(s) {
    var hits = [], i, j, score, item;
    for (i = 0; i < SEED.length; i++) {
      item = SEED[i]; score = 0;
      for (j = 0; j < item.k.length; j++) {
        if (s.raw.toLowerCase().indexOf(item.k[j]) !== -1) score += 0.55;
        score += overlap(s.tokens, tok(item.k[j])) * 0.45;
      }
      score += overlap(s.tokens, tok(item.t)) * 0.15;
      if (score > 0.12) hits.push({ text: item.t, score: score, src: "seed" });
    }
    var cortex = load(CORTEX);
    for (i = 0; i < cortex.length; i++) {
      item = cortex[i]; score = overlap(s.tokens, tok(item.text));
      if (score > 0.1) hits.push({ text: item.text, score: score + 0.05, src: "cortex" });
    }
    var der = load(DERIVED);
    for (i = 0; i < der.length; i++) {
      item = der[i]; score = overlap(s.tokens, tok(item.text)) * 1.15;
      if (score > 0.1) hits.push({ text: item.text, score: score, src: "derived" });
    }
    var pairs = load(PAIR);
    for (i = 0; i < pairs.length; i++) {
      item = pairs[i]; score = overlap(s.tokens, tok(item.q || ""));
      if (score > 0.2) hits.push({ text: item.a, score: score + 0.2, src: "pair" });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    var out = [], seen = {};
    for (i = 0; i < hits.length; i++) {
      var key = (hits[i].text || "").slice(0, 40);
      if (seen[key]) continue; seen[key] = 1; out.push(hits[i]); if (out.length >= 8) break;
    }
    return out;
  }
  function superpose(s, hits) {
    if (s.teach) return [{ kind: "teach", text: null, amp: 0.99 }];
    if (!hits.length) return [{ kind: "gap", text: s.lang === "ru" ? "Нет опоры. «запомни: факт»" : "No match. remember: …", amp: 0.45 }];
    var cands = [{ kind: "primary", text: hits[0].text, amp: clamp(hits[0].score + 0.28, 0.4, 0.99), src: hits[0].src }];
    if (hits[1] && hits[1].score > 0.18) cands.push({ kind: "alt", text: hits[1].text, amp: clamp(hits[1].score + 0.12, 0.3, 0.9), src: hits[1].src });
    if (hits.length >= 2) {
      var parts = [hits[0].text];
      if (hits[1].text !== hits[0].text) parts.push(hits[1].text.slice(0, 180));
      if (hits[2] && hits[2].score > 0.25) parts.push(hits[2].text.slice(0, 120));
      cands.push({ kind: "fusion", text: parts.join("\n\n"), amp: clamp((hits[0].score + hits[1].score) / 2 + 0.22, 0.35, 0.95), src: "fusion" });
    }
    return cands;
  }
  function collapse(cands) {
    var best = cands[0], i;
    for (i = 1; i < cands.length; i++) if (cands[i].amp + (cands[i].kind === "fusion" ? 0.04 : 0) > best.amp) best = cands[i];
    return best;
  }
  function synthesize(s, chosen, hits) {
    if (chosen.kind === "teach") {
      var fact = s.raw.replace(/^\s*(запомни|remember|learn)\s*[:：]\s*/i, "").trim();
      if (!fact) return { answer: "Формат: запомни: факт", kind: "clarify", derived: null };
      var cortex = load(CORTEX); cortex.push({ text: fact, ts: now(), id: uid() }); save(CORTEX, cortex);
      return { answer: "Cortex: «" + fact.slice(0, 220) + "». n=" + cortex.length, kind: "learned", derived: null };
    }
    var answer = chosen.text || "—", derived = null;
    if (s.derive || (chosen.kind === "fusion" && hits.length >= 2 && hits[0].score > 0.28)) {
      derived = { id: uid(), ts: now(), text: "Правило: «" + s.tokens.slice(0, 4).join(" ") + "» → " + (hits[0].text || "").slice(0, 140) };
      var d = load(DERIVED); d.push(derived); save(DERIVED, d);
    }
    return { answer: answer, kind: chosen.kind === "gap" ? "gap" : (chosen.kind || "answer"), derived: derived };
  }
  function critique(synth, hits, qgate) {
    var R = hits.length ? clamp(hits[0].score, 0, 1) : 0.18;
    var C = synth.answer && synth.answer.length > 28 ? 0.82 : 0.48;
    var G = hits.length ? clamp(hits[0].score + 0.18, 0, 1) : 0.2;
    if (synth.kind === "learned") R = C = G = 1;
    var Q = qgate ? qgate.gate : 0.5;
    var n = load(LEDGER).length;
    var score = clamp((R * C * G * (0.5 + 0.5 * Q)) * (1 + 0.3 * Math.sqrt(Math.min(n, 64) / 8)), 0, 1.6);
    return { R: round(R), C: round(C), G: round(G), Q: round(Q), score: round(score), ok: score >= 0.34 || synth.kind === "learned", policy: score >= 0.55 ? "strict-pass" : score >= 0.34 ? "pass" : "low" };
  }
  async function runQuantum(question, answer, baseGate) {
    var gate = baseGate || answerGate(question, answer);
    if (G.AKSI_QPIPE && typeof G.AKSI_QPIPE.processAnswer === "function") {
      try {
        var qr = await G.AKSI_QPIPE.processAnswer(question, answer);
        gate.qpipe = qr; gate.backend = "qpipe";
        if (qr && typeof qr.gate === "number") gate.gate = round(clamp(0.5 * gate.gate + 0.5 * qr.gate, 0, 1), 3);
        else if (qr && typeof qr.qcli === "number") gate.gate = round(clamp(0.55 * gate.gate + 0.45 * qr.qcli, 0, 1), 3);
        gate.pass = gate.gate >= 0.42;
      } catch (e) { gate.qpipeErr = String(e.message || e); }
    } else if (G.AKSI_QUANTUM && G.AKSI_QUANTUM.answerGate) {
      try {
        var ag = G.AKSI_QUANTUM.answerGate(question, answer);
        gate.quantumEngine = ag; gate.backend = "aksi-quantum";
        if (ag && typeof ag.score === "number") { gate.gate = round(clamp(0.5 * gate.gate + 0.5 * ag.score, 0, 1), 3); gate.pass = gate.gate >= 0.42; }
      } catch (e) { gate.quantumErr = String(e.message || e); }
    }
    return gate;
  }
  async function attest(body) {
    if (G.AKSI_CRYPTO && G.AKSI_CRYPTO.sealJson) { try { return await G.AKSI_CRYPTO.sealJson(body); } catch (e) {} }
    var h = fnv(JSON.stringify(body)), chain = load(LEDGER), prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var entry = { i: chain.length, ts: now(), hash: fnv(prev + h), prev: prev, bodyHash: h };
    chain.push(entry); save(LEDGER, chain);
    return { payload: body, seal: { alg: "FNV-chain", hash: entry.hash, prev: prev, label: "GENESIS", suite: VER } };
  }
  function autoLearn(s, answer, crit) {
    if (crit.score < 0.6 || s.teach || !answer || answer.length < 20) return;
    var pairs = load(PAIR); pairs.push({ q: s.raw.slice(0, 200), a: answer.slice(0, 400), score: crit.score, ts: now() }); save(PAIR, pairs);
  }
  async function think(input, opts) {
    opts = opts || {};
    var t0 = now(), s = sense(input), hits = bind(s), cands = superpose(s, hits), chosen = collapse(cands), synth = synthesize(s, chosen, hits);
    var qgate = await runQuantum(s.raw, synth.answer || "", answerGate(s.raw, synth.answer || ""));
    var crit = critique(synth, hits, qgate);
    if (opts.autoLearn !== false) autoLearn(s, synth.answer, crit);
    var body = {
      id: uid(), version: VER, input: s.raw, answer: synth.answer, kind: synth.kind, derived: synth.derived,
      thought: [{ s: "sense" }, { s: "bind", hits: hits.length }, { s: "superpose", cands: cands.length }, { s: "collapse", kind: chosen.kind }, { s: "quantum_gate", gate: qgate.gate, backend: qgate.backend }, { s: "critique", score: crit.score }],
      quantum: qgate, critique: crit,
      hits: hits.slice(0, 4).map(function (h) { return { src: h.src, score: round(h.score), preview: (h.text || "").slice(0, 70) }; }),
      ms: now() - t0
    };
    return await attest(body);
  }
  function teach(fact) {
    fact = String(fact || "").trim(); if (!fact) return { ok: false };
    var c = load(CORTEX); c.push({ text: fact, ts: now(), id: uid() }); save(CORTEX, c); return { ok: true, n: c.length };
  }
  G.AKSI_GENESIS = {
    version: VER, think: think, teach: teach,
    cortex: function () { return load(CORTEX); }, derived: function () { return load(DERIVED); }, pairs: function () { return load(PAIR); },
    clearAll: function () { save(CORTEX, []); save(DERIVED, []); save(LEDGER, []); save(PAIR, []); return { ok: true }; },
    stages: ["sense", "bind", "superpose", "collapse", "synthesize", "quantum_gate", "critique", "learn", "attest"],
    formula: "GenesisScore=(R×C×G×Q)×(1+0.3√n)"
  };
  if (!G.AKSI_AI) G.AKSI_AI = {};
  G.AKSI_AI.genesis = G.AKSI_GENESIS;
})(typeof window !== "undefined" ? window : globalThis);
