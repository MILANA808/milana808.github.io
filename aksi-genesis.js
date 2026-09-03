/**
 * AKSI GENESIS v2.0 — Future-oriented cognitive engine (offline-first)
 * SENSE → BIND → SUPERPOSE → COLLAPSE → SYNTHESIZE → CRITIQUE → LEARN → ATTEST
 * GenesisScore = (R×C×G×Q)×(1+0.3√n)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.0.0-genesis";
  var CORTEX = "aksi_genesis_cortex_v2";
  var LEDGER = "aksi_genesis_ledger_v2";
  var DERIVED = "aksi_genesis_derived_v2";
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
  function save(key, a) { try { localStorage.setItem(key, JSON.stringify(a.slice(-800))); } catch (e) {} }
  var SEED = [
    { k: "identity", t: "Я АКСИ Genesis — offline: sense→superpose→collapse→synthesize→learn→attest. aksilove@internet.ru" },
    { k: "future", t: "Будущие ИИ-контуры: локальная память + quantum gate + подпись + обучение на устройстве." },
    { k: "quantum", t: "Квант = state-vector + QCLI. Прозрачность, не мистика. Опционально — мост к QPU." },
    { k: "learn", t: "Обучение: «запомни: факт» или auto-derived. Cortex + derived rules." },
    { k: "seal", t: "Attest: hash + опционально Ed25519/ECDSA (AKSI_CRYPTO)." },
    { k: "formula", t: "GenesisScore=(R×C×G×Q)×(1+0.3√n)" }
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
    return { raw: raw, tokens: tok(raw), lang: /[а-яё]/i.test(raw) ? "ru" : "en", teach: /^\s*(запомни|remember|learn)\s*[:：]/i.test(raw), derive: /выведи|derive|синтез|new knowledge|новое знание/i.test(raw) };
  }
  function bind(s) {
    var cortex = load(CORTEX).concat(SEED.map(function (x) { return { text: x.t, k: x.k, seed: 1 }; }));
    var derived = load(DERIVED), hits = [], i, score, item;
    for (i = 0; i < cortex.length; i++) {
      item = cortex[i]; score = overlap(s.tokens, tok(item.text || ""));
      if (item.k && s.raw.toLowerCase().indexOf(item.k) !== -1) score += 0.4;
      if (score > 0.08) hits.push({ text: item.text, score: score, src: item.seed ? "seed" : "cortex" });
    }
    for (i = 0; i < derived.length; i++) {
      item = derived[i]; score = overlap(s.tokens, tok(item.text)) * 1.1;
      if (score > 0.1) hits.push({ text: item.text, score: score, src: "derived" });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, 8);
  }
  function superpose(s, hits) {
    var cands = [];
    if (s.teach) { cands.push({ kind: "teach", text: null, amp: 0.99 }); return cands; }
    if (!hits.length) {
      cands.push({ kind: "gap", text: s.lang === "ru" ? "Нет опоры. «запомни: …»" : "No cortex. remember: …", amp: 0.5 });
      return cands;
    }
    cands.push({ kind: "primary", text: hits[0].text, amp: clamp(hits[0].score + 0.3, 0.4, 0.98), src: hits[0].src });
    if (hits[1] && hits[1].score > 0.2) cands.push({ kind: "alt", text: hits[1].text, amp: clamp(hits[1].score + 0.15, 0.3, 0.9), src: hits[1].src });
    if (hits.length >= 2) {
      var fused = hits[0].text + (hits[1].text !== hits[0].text ? " \u00b7 " + hits[1].text.slice(0, 160) : "");
      cands.push({ kind: "fusion", text: fused, amp: clamp((hits[0].score + hits[1].score) / 2 + 0.2, 0.35, 0.92), src: "fusion" });
    }
    return cands;
  }
  function collapse(cands) {
    var best = cands[0], i;
    for (i = 1; i < cands.length; i++) if (cands[i].amp + (cands[i].kind === "fusion" ? 0.05 : 0) > best.amp) best = cands[i];
    return best;
  }
  function synthesize(s, chosen, hits) {
    if (chosen.kind === "teach") {
      var fact = s.raw.replace(/^\s*(запомни|remember|learn)\s*[:：]\s*/i, "").trim();
      if (!fact) return { answer: "Формат: запомни: факт", kind: "clarify", derived: null };
      var cortex = load(CORTEX); cortex.push({ text: fact, ts: now(), id: uid() }); save(CORTEX, cortex);
      return { answer: "Cortex+: «" + fact.slice(0, 220) + "». n=" + cortex.length, kind: "learned", derived: null };
    }
    var answer = chosen.text || "—", derived = null;
    if (s.derive || (chosen.kind === "fusion" && hits.length >= 2 && hits[0].score > 0.25)) {
      derived = { id: uid(), ts: now(), text: "Правило Genesis: при «" + s.tokens.slice(0, 3).join(" ") + "» → " + (hits[0].text || "").slice(0, 120) };
      var d = load(DERIVED); d.push(derived); save(DERIVED, d);
    }
    return { answer: answer, kind: chosen.kind === "gap" ? "gap" : (chosen.kind || "answer"), derived: derived };
  }
  function critique(s, synth, hits, qgate) {
    var R = hits.length ? clamp(hits[0].score, 0, 1) : 0.2;
    var C = synth.answer && synth.answer.length > 24 ? 0.78 : 0.45;
    var G = hits.length ? clamp(hits[0].score + 0.15, 0, 1) : 0.2;
    if (synth.kind === "learned") R = C = G = 1;
    var Q = qgate ? qgate.gate : 0.5;
    var n = load(LEDGER).length;
    var score = clamp((R * C * G * (0.5 + 0.5 * Q)) * (1 + 0.3 * Math.sqrt(Math.min(n, 64) / 8)), 0, 1.6);
    return { R: round(R), C: round(C), G: round(G), Q: round(Q), score: round(score), ok: score >= 0.32 || synth.kind === "learned", policy: score >= 0.5 ? "strict-pass" : score >= 0.32 ? "pass" : "low" };
  }
  async function attest(body) {
    if (G.AKSI_CRYPTO && G.AKSI_CRYPTO.sealJson) { try { return await G.AKSI_CRYPTO.sealJson(body); } catch (e) {} }
    var h = fnv(JSON.stringify(body)), chain = load(LEDGER), prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var entry = { i: chain.length, ts: now(), hash: fnv(prev + h), prev: prev, bodyHash: h };
    chain.push(entry); save(LEDGER, chain);
    return { payload: body, seal: { alg: "FNV-chain", hash: entry.hash, prev: prev, label: "GENESIS", suite: VER } };
  }
  async function think(input, opts) {
    opts = opts || {};
    var t0 = now(), s = sense(input), hits = bind(s), cands = superpose(s, hits), chosen = collapse(cands), synth = synthesize(s, chosen, hits);
    var qgate = answerGate(s.raw, synth.answer || "");
    if (G.AKSI_QPIPE && G.AKSI_QPIPE.processAnswer && opts.quantum !== false) {
      try { var qr = await G.AKSI_QPIPE.processAnswer(s.raw, synth.answer); if (qr) qgate.qpipe = qr; } catch (e) { qgate.qpipeErr = String(e.message || e); }
    }
    var crit = critique(s, synth, hits, qgate);
    var body = {
      id: uid(), version: VER, input: s.raw, answer: synth.answer, kind: synth.kind, derived: synth.derived,
      thought: [{ s: "sense" }, { s: "bind", hits: hits.length }, { s: "superpose", cands: cands.length }, { s: "collapse", kind: chosen.kind }, { s: "quantum_gate", gate: qgate.gate }, { s: "critique", score: crit.score }],
      quantum: qgate, critique: crit,
      hits: hits.slice(0, 4).map(function (h) { return { src: h.src, score: round(h.score), preview: (h.text || "").slice(0, 60) }; }),
      ms: now() - t0
    };
    return await attest(body);
  }
  function teach(fact) {
    fact = String(fact || "").trim(); if (!fact) return { ok: false };
    var c = load(CORTEX); c.push({ text: fact, ts: now(), id: uid() }); save(CORTEX, c); return { ok: true, n: c.length };
  }
  G.AKSI_GENESIS = { version: VER, think: think, teach: teach, cortex: function () { return load(CORTEX); }, derived: function () { return load(DERIVED); }, clearAll: function () { save(CORTEX, []); save(DERIVED, []); save(LEDGER, []); return { ok: true }; }, stages: ["sense", "bind", "superpose", "collapse", "synthesize", "critique", "learn", "attest"], formula: "GenesisScore=(R×C×G×Q)×(1+0.3√n)" };
  if (!G.AKSI_AI) G.AKSI_AI = {};
  G.AKSI_AI.genesis = G.AKSI_GENESIS;
})(typeof window !== "undefined" ? window : globalThis);
