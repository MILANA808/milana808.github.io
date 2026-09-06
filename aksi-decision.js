/**
 * AKSI Decision Runtime v1.0
 * Product core: answer + anti + scores + gate + seal + verify
 * Offline-first. Server OFF by default.
 * Formula: AKSI = (A × I × S) × (1 + 0.4√n)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-decision";
  var CHAIN_KEY = "aksi_decision_chain_v1";
  var KNOW_KEY = "aksi_decision_knowledge_v1";
  var GAMMA = 0.4;
  var GATE_TAU = 0.55;
  var U_MAX = 0.45;

  function now() { return Date.now(); }
  function uid() { return "d" + now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clamp01(x) { x = Number(x); if (isNaN(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  function round(x, d) { d = d == null ? 3 : d; var p = Math.pow(10, d); return Math.round(Number(x) * p) / p; }
  function load(k) { try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(k, a) { try { localStorage.setItem(k, JSON.stringify((a || []).slice(-200))); } catch (e) {} }
  function tok(s) { return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; }); }
  function overlap(a, b) { var s = {}, i, n = 0; for (i = 0; i < b.length; i++) s[b[i]] = 1; for (i = 0; i < a.length; i++) if (s[a[i]]) n++; return a.length ? n / a.length : 0; }
  function entropy(s) { s = String(s || ""); if (!s) return 0; var f = {}, n = s.length, h = 0, i, c, p; for (i = 0; i < n; i++) { c = s.charAt(i); f[c] = (f[c] || 0) + 1; } for (c in f) { p = f[c] / n; h -= p * Math.log2(p); } return h; }
  function qcli(s) { s = String(s || ""); if (!s) return 0; var u = {}, i; for (i = 0; i < s.length; i++) u[s.charAt(i)] = 1; var alphabet = Math.min(256, Object.keys(u).length); var maxH = Math.log2(Math.max(2, alphabet)); return clamp01(entropy(s) / maxH); }
  function fnv(s) { var h = 0x811c9dc5, i; s = String(s); for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return ("00000000" + (h >>> 0).toString(16)).slice(-8); }
  function structure(s) { s = String(s || "").trim(); if (!s) return 0.2; var lines = s.split(/\n/).filter(Boolean).length; var words = s.split(/\s+/).filter(Boolean).length; var hasList = /[-•*]|\d\./.test(s) ? 0.1 : 0; return clamp01(0.35 + Math.min(0.4, words / 80) + Math.min(0.15, lines / 10) + hasList); }

  var KB = [
    "Я АКСИ Decision Runtime — локальный агент решений. Offline · score · gate · seal.",
    "Формула: AKSI = (A × I × S) × (1 + 0.4√n). A — агентность, I — качество, S — структура, n — глубина цепи.",
    "ADIA отбирает ответы по EQS и порогам. В знание попадает только то, что прошло Gate.",
    "Печать — FNV-цепь (integrity). Ed25519 доступен при aksi-ciphersuite.js.",
    "Сервер выключен по умолчанию. LLM не обязательна.",
    "Напишите «запомни: факт» — сохранится только при прохождении Gate.",
    "Verify проверяет hash и parent цепочки на этом устройстве.",
    "Контакт: aksilove@internet.ru · не облачный чат, а decision runtime.",
    "I am AKSI Decision Runtime: offline answers with score, gate and seal.",
    "Teach with remember: fact — stored only if Gate passes."
  ];

  function getAnswer(q) {
    var text = "", source = "local", conf = 0.5;
    try {
      if (G.AKSI_ZERO && typeof G.AKSI_ZERO.think === "function") {
        var z = G.AKSI_ZERO.think(q);
        if (z && (z.answer || z.text)) { text = String(z.answer || z.text); source = "zero"; conf = z.confidence != null ? Number(z.confidence) : 0.65; }
      }
    } catch (e) {}
    if (!text) {
      try {
        if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
          var n = G.AKSI_NEURO.think(q);
          if (n && (n.text || n.answer)) { text = String(n.text || n.answer); source = "neuro"; conf = n.score != null ? Number(n.score) : 0.6; }
        }
      } catch (e2) {}
    }
    if (!text) {
      var qt = tok(q), best = KB[0], bestO = 0, i, o, docs;
      docs = KB.slice();
      load(KNOW_KEY).forEach(function (k) { if (k && k.text) docs.push(k.text); });
      for (i = 0; i < docs.length; i++) { o = overlap(qt, tok(docs[i])); if (o > bestO) { bestO = o; best = docs[i]; } }
      text = bestO > 0.05 ? best : "Приняла вопрос. Decision Runtime offline: уточните или сохраните факт через «запомни: …».";
      conf = bestO > 0.15 ? 0.55 + bestO * 0.3 : 0.4;
      source = "kb";
    }
    return { text: text, source: source, conf: clamp01(conf) };
  }

  function makeAnti(q, answer) {
    var low = String(q || "").toLowerCase();
    var hints = [];
    if (answer.length < 40) hints.push("Ответ короткий — возможна потеря деталей.");
    if (!/\d|факт|потому|because|например/i.test(answer)) hints.push("Мало опоры на конкретные факты — стоит проверить источники.");
    if (/всегда|никогда|100%|гарантир/i.test(answer)) hints.push("Категоричные формулировки часто ломаются на исключениях.");
    if (overlap(tok(q), tok(answer)) < 0.1) hints.push("Слабая связь с формулировкой вопроса — возможен уход от темы.");
    if (!hints.length) { hints.push("Альтернатива: ответ может быть верен только в узком контексте."); hints.push("Нужна внешняя проверка, если решение критично."); }
    if (/кто ты|what is aksi|что такое/.test(low)) hints = ["Это продуктовый runtime, не «доказательство сознания».", "Без LLM глубина ответа ограничена локальной базой."];
    return hints.slice(0, 3).join(" ");
  }

  function scoreAnswer(q, answer, conf) {
    var S = structure(answer);
    var I = clamp01((conf != null ? conf : 0.5) * 0.7 + qcli(answer) * 0.3);
    var eqs = round(I * 100, 1);
    var qv = qcli(answer);
    try {
      if (G.AKSI_ADIA && typeof G.AKSI_ADIA.evaluate === "function") {
        var ev = G.AKSI_ADIA.evaluate(answer, { query: q });
        if (ev && ev.eqs != null) eqs = Number(ev.eqs);
        if (ev && ev.qcli != null) qv = Number(ev.qcli);
      } else if (G.AKSI_ALGORITHM && typeof G.AKSI_ALGORITHM.score === "function") {
        var sc = G.AKSI_ALGORITHM.score(q, answer);
        if (sc && sc.eqs != null) eqs = Number(sc.eqs);
      }
    } catch (e) {}
    var A = 0.9;
    I = clamp01(eqs / 100);
    var chain = load(CHAIN_KEY);
    var n = chain.length;
    var aksi = (A * I * S) * (1 + GAMMA * Math.sqrt(n));
    var evidence = overlap(tok(q), tok(answer));
    var uncertainty = clamp01(1 - I * 0.6 - evidence * 0.4);
    var phi = I * (1 - uncertainty) * (1 + GAMMA * Math.sqrt(n / (n + 10)));
    return { A: round(A, 3), I: round(I, 3), S: round(S, 3), n: n, eqs: round(eqs, 1), qcli: round(qv, 3), aksi: round(aksi, 4), phi: round(phi, 4), evidence: round(evidence, 3), uncertainty: round(uncertainty, 3) };
  }

  function gateOf(scores) {
    var ok = scores.phi >= GATE_TAU && scores.evidence > 0.05 && scores.uncertainty <= U_MAX && scores.eqs >= 50;
    return { ok: !!ok, tau: GATE_TAU, reason: ok ? "Φ ≥ τ, evidence>0, uncertainty в норме — можно в знание" : "Порог не пройден — в официальную память не пишем" };
  }

  function sealPacket(body) {
    var chain = load(CHAIN_KEY);
    var prev = chain.length ? chain[chain.length - 1].hash : "genesis";
    var payload = JSON.stringify({ id: body.id, q: body.query, a: body.answer, aksi: body.scores.aksi, eqs: body.scores.eqs, gate: body.gate.ok, prev: prev });
    var hash = fnv(prev + "|" + payload);
    return { alg: "FNV-chain", hash: hash, prev: prev, ts: now(), suite: VER, did: "did:aksi:local:decision" };
  }

  function commitChain(record) {
    var chain = load(CHAIN_KEY);
    chain.push({ id: record.id, hash: record.seal.hash, prev: record.seal.prev, aksi: record.scores.aksi, gate: record.gate.ok, ts: record.seal.ts });
    save(CHAIN_KEY, chain);
  }

  function decide(query) {
    var t0 = now();
    var q = String(query || "").trim();
    if (!q) return { ok: false, error: "empty", answer: "", anti: "", scores: {}, gate: { ok: false }, seal: null };
    var teachMatch = /^\s*(запомни|выучи|remember|learn)\s*[:：]\s*(.+)$/i.exec(q);
    var ans;
    if (teachMatch) ans = { text: "Принято к проверке Gate: «" + teachMatch[2].trim() + "»", source: "teach", conf: 0.75 };
    else ans = getAnswer(q);
    var scores = scoreAnswer(q, ans.text, ans.conf);
    var anti = makeAnti(q, ans.text);
    var gate = gateOf(scores);
    var id = uid();
    var packet = { ok: true, id: id, version: VER, offline: true, server: false, query: q, answer: ans.text, anti: anti, source: ans.source, scores: scores, gate: gate, learned: false, trace: ["retrieve:" + ans.source, "score:adia-aksi", "anti", "gate", "seal"], ms: 0 };
    packet.seal = sealPacket(packet);
    packet.ms = now() - t0;
    if (teachMatch) {
      var fact = teachMatch[2].trim();
      scores = scoreAnswer(fact, fact, 0.8);
      scores.evidence = Math.max(scores.evidence, 0.2);
      gate = gateOf(scores);
      packet.scores = scores;
      packet.gate = gate;
      packet.answer = gate.ok ? "Факт сохранён в знание (Gate OK): «" + fact + "»" : "Факт НЕ сохранён — Gate не пройден. Усильте формулировку или контекст.";
      packet.anti = gate.ok ? "Даже принятый факт стоит перепроверить позже." : "Попробуйте более конкретный факт с ясными словами.";
      packet.seal = sealPacket(packet);
      if (gate.ok) { var know = load(KNOW_KEY); know.push({ text: fact, ts: now(), sealed: true, hash: packet.seal.hash }); save(KNOW_KEY, know); packet.learned = true; }
    }
    commitChain(packet);
    packet.proof = { schema: "aksi-decision-proof-1", id: packet.id, query: packet.query, answer: packet.answer, anti: packet.anti, scores: packet.scores, gate: packet.gate, seal: packet.seal, offline: true, ts: packet.seal.ts };
    return packet;
  }

  function verify(proof) {
    try {
      if (typeof proof === "string") proof = JSON.parse(proof);
      if (!proof || !proof.seal) return { ok: false, reason: "no seal" };
      var prev = proof.seal.prev || "genesis";
      var payload = JSON.stringify({ id: proof.id, q: proof.query, a: proof.answer, aksi: proof.scores && proof.scores.aksi, eqs: proof.scores && proof.scores.eqs, gate: proof.gate && proof.gate.ok, prev: prev });
      var expect = fnv(prev + "|" + payload);
      var match = proof.seal.hash === expect;
      var chain = load(CHAIN_KEY);
      var inChain = chain.some(function (c) { return c.hash === proof.seal.hash; });
      return { ok: match, hash_match: match, in_local_chain: inChain, expect: expect, got: proof.seal.hash, alg: proof.seal.alg };
    } catch (e) { return { ok: false, reason: String(e && e.message ? e.message : e) }; }
  }

  function status() {
    return { version: VER, chain: load(CHAIN_KEY).length, knowledge: load(KNOW_KEY).length, offline: true, server: false, formula: "AKSI=(A×I×S)×(1+0.4√n)", gate_tau: GATE_TAU };
  }

  function exportProof(packet) {
    var blob = new Blob([JSON.stringify(packet.proof || packet, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aksi-decision-" + (packet.id || "proof") + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  G.AKSI_DECISION = { version: VER, decide: decide, verify: verify, status: status, exportProof: exportProof, gateTau: GATE_TAU };
})(typeof window !== "undefined" ? window : globalThis);
