/**
 * AKSI-AI v1 — Full cognitive algorithm (offline-first)
 * INPUT → PERCEIVE → INTENT → RETRIEVE → REASON → GENERATE → CRITIQUE → LEARN? → SEAL → OUTPUT
 * score = (relevance × coherence × groundedness) × (1 + 0.25√steps)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0";
  var MEM_KEY = "aksi_ai_memory_v1";
  var TRACE_KEY = "aksi_ai_traces_v1";

  function now() { return Date.now(); }
  function uid() { return "t" + now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function clamp(x, a, b) { x = Number(x); if (isNaN(x)) return a; return x < a ? a : x > b ? b : x; }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function uniq(a) { var o = {}, r = [], i; for (i = 0; i < a.length; i++) if (!o[a[i]]) { o[a[i]] = 1; r.push(a[i]); } return r; }
  function overlap(a, b) {
    var sb = {}, i, n = 0; for (i = 0; i < b.length; i++) sb[b[i]] = 1;
    for (i = 0; i < a.length; i++) if (sb[a[i]]) n++;
    return a.length ? n / a.length : 0;
  }
  function loadMem() { try { var m = JSON.parse(localStorage.getItem(MEM_KEY) || "[]"); return Array.isArray(m) ? m : []; } catch (e) { return []; } }
  function saveMem(m) { try { localStorage.setItem(MEM_KEY, JSON.stringify(m.slice(-500))); } catch (e) {} }
  function pushTrace(tr) {
    try { var a = JSON.parse(localStorage.getItem(TRACE_KEY) || "[]"); if (!Array.isArray(a)) a = []; a.push(tr); localStorage.setItem(TRACE_KEY, JSON.stringify(a.slice(-50))); } catch (e) {}
  }
  function round3(x) { return Math.round(x * 1000) / 1000; }

  var SEED = [
    { t: "identity", q: ["кто ты", "что такое акси", "who are you", "what is aksi"],
      a: "Я АКСИ — суверенный локальный ИИ-контур. Offline-first: восприятие → намерение → память → рассуждение → ответ → проверка. aksilove@internet.ru" },
    { t: "arch", q: ["архитектура", "как устроен", "pipeline", "структура"],
      a: "Структура АКСИ-AI: PERCEIVE → INTENT → RETRIEVE → REASON → GENERATE → CRITIQUE → LEARN → SEAL." },
    { t: "guide", q: ["как пользоваться", "help", "с чего начать"],
      a: "1) /ai/ или бот\n2) «запомни: …»\n3) Модули на главной\n4) /crypto/\n5) /spa/" },
    { t: "crypto", q: ["крипто", "подпис", "шифрован", "post-quantum", "pq"],
      a: "Cipher Suite: ECDSA/Ed25519, ECDH, AES-256-GCM, SHA-256; опционально ML-KEM. Печать: hash + signature + DID." },
    { t: "quantum", q: ["квант", "quantum", "qcli"],
      a: "Квант АКСИ — state-vector симулятор (QCLI), не физический QPU." },
    { t: "memory", q: ["память", "запомни", "memory"],
      a: "Память локальная. «запомни: текст» добавляет факт в RETRIEVE." },
    { t: "net", q: ["сеть", "интернет", "модул"],
      a: "АКСИ-Сеть: Chat↔Mem↔Trust↔Quantum↔Bot — ваш контур." }
  ];

  function perceive(input) {
    var text = String(input || "").trim();
    var tokens = uniq(tok(text));
    return { raw: text, tokens: tokens, lang: /[а-яё]/i.test(text) ? "ru" : "en", len: text.length, teach: /^\s*(запомни|remember)\s*[:：]/i.test(text) };
  }
  function intentOf(p) {
    var t = p.raw.toLowerCase();
    if (p.teach) return { type: "teach", conf: 0.95 };
    if (/^(привет|hello|hi|здравств)/i.test(t)) return { type: "greet", conf: 0.9 };
    if (/кто ты|what are you|who are you|что такое акси/i.test(t)) return { type: "identity", conf: 0.92 };
    if (/как польз|help|с чего/i.test(t)) return { type: "guide", conf: 0.9 };
    if (/почему|how does|как работ/i.test(t)) return { type: "explain", conf: 0.75 };
    if (/\?|что|как|где|когда|who|what|why|how/.test(t)) return { type: "question", conf: 0.7 };
    if (t.length < 3) return { type: "empty", conf: 1 };
    return { type: "chat", conf: 0.55 };
  }
  function retrieve(p, intent) {
    var hits = [], mem = loadMem(), i, j, score, item;
    for (i = 0; i < SEED.length; i++) {
      item = SEED[i]; score = 0;
      for (j = 0; j < item.q.length; j++) {
        if (p.raw.toLowerCase().indexOf(item.q[j]) !== -1) score += 0.5;
        score += overlap(p.tokens, tok(item.q[j])) * 0.5;
      }
      if (intent.type === item.t) score += 0.35;
      if (score > 0.15) hits.push({ source: "seed", topic: item.t, text: item.a, score: score });
    }
    for (i = 0; i < mem.length; i++) {
      item = mem[i];
      score = overlap(p.tokens, tok(item.text || item.fact || ""));
      if (score > 0.12) hits.push({ source: "memory", topic: "user", text: item.text || item.fact, score: score });
    }
    if (G.AKSI_PRIORITY_ANSWER) {
      try { var pr = G.AKSI_PRIORITY_ANSWER(p.raw); if (pr && pr.text) hits.push({ source: "priority", topic: "core", text: String(pr.text), score: 0.85 }); } catch (e) {}
    }
    if (G.AKSI_MIND_L2 && G.AKSI_MIND_L2.think) {
      try { var m = G.AKSI_MIND_L2.think(p.raw); if (m && m.text && String(m.text).length > 10) hits.push({ source: "mind-l2", topic: "mind", text: String(m.text), score: 0.65 }); } catch (e) {}
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    return hits.slice(0, 6);
  }
  function reason(p, intent, hits) {
    var steps = [];
    steps.push({ s: 1, name: "perceive", note: "tokens=" + p.tokens.length + " lang=" + p.lang });
    steps.push({ s: 2, name: "intent", note: intent.type + " conf=" + intent.conf });
    steps.push({ s: 3, name: "retrieve", note: "hits=" + hits.length + (hits[0] ? " top=" + hits[0].source : "") });
    var plan = "synthesize";
    if (intent.type === "teach") plan = "store";
    else if (intent.type === "empty") plan = "clarify";
    else if (intent.type === "greet") plan = "greet";
    else if (!hits.length) plan = "admit_gap";
    steps.push({ s: 4, name: "plan", note: plan });
    return { steps: steps, plan: plan };
  }
  function generate(p, intent, hits, reasoning) {
    if (reasoning.plan === "store") {
      var fact = p.raw.replace(/^\s*(запомни|remember)\s*[:：]\s*/i, "").trim();
      if (!fact) return { text: "Напишите: запомни: ваш факт", kind: "clarify" };
      var mem = loadMem(); mem.push({ text: fact, ts: now(), id: uid() }); saveMem(mem);
      return { text: "Запомнила: «" + fact.slice(0, 200) + "». Фактов: " + mem.length, kind: "taught" };
    }
    if (reasoning.plan === "greet") return { text: p.lang === "ru" ? "Здравствуйте. Я АКСИ-AI." : "Hello. I am AKSI-AI.", kind: "greet" };
    if (reasoning.plan === "clarify") return { text: "Пустой запрос.", kind: "clarify" };
    if (reasoning.plan === "admit_gap") return { text: "Нет уверенного знания по «" + p.raw.slice(0, 80) + "». Используйте «запомни: …»", kind: "gap" };
    var top = hits[0], text = top.text, extra = [], i;
    for (i = 1; i < hits.length && i < 3; i++) if (hits[i].score > 0.35 && hits[i].text !== top.text) extra.push(hits[i].text);
    if (extra.length && intent.type === "explain") text += "\n\n—\n" + extra[0].slice(0, 280);
    return { text: text, kind: "answer", sources: hits.slice(0, 3).map(function (h) { return h.source; }) };
  }
  function critique(p, answer, hits, reasoning) {
    var rel = hits.length ? clamp(hits[0].score, 0, 1) : 0.15;
    var coh = answer.text && answer.text.length > 20 ? 0.75 : 0.4;
    if (answer.kind === "gap") coh = 0.6;
    var grounded = hits.length ? clamp((hits[0].score || 0) + 0.2, 0, 1) : 0.25;
    if (answer.kind === "taught" || answer.kind === "greet") { rel = 1; coh = 1; grounded = 1; }
    var score = (rel * coh * grounded) * (1 + 0.25 * Math.sqrt(reasoning.steps.length));
    score = clamp(score, 0, 1.5);
    return { relevance: round3(rel), coherence: round3(coh), groundedness: round3(grounded), score: round3(score), ok: score >= 0.35 || answer.kind === "taught" || answer.kind === "greet", policy: score >= 0.35 ? "pass" : "low_confidence" };
  }
  async function maybeSeal(payload) {
    if (G.AKSI_CRYPTO && G.AKSI_CRYPTO.sealJson) { try { return await G.AKSI_CRYPTO.sealJson(payload); } catch (e) {} }
    var s = JSON.stringify(payload), h = 0x811c9dc5, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return { payload: payload, seal: { alg: "FNV-1a-32", hash: ("00000000" + (h >>> 0).toString(16)).slice(-8), label: "AKSI-AI", note: "integrity marker" } };
  }

  async function think(input, opts) {
    opts = opts || {};
    var t0 = now(), p = perceive(input), intent = intentOf(p), hits = retrieve(p, intent), reasoning = reason(p, intent, hits), answer = generate(p, intent, hits, reasoning), crit = critique(p, answer, hits, reasoning);
    var qmeta = null;
    if (G.AKSI_QPIPE && G.AKSI_QPIPE.processAnswer && opts.quantum !== false) {
      try { qmeta = await G.AKSI_QPIPE.processAnswer(p.raw, answer.text); } catch (e) { qmeta = { error: String(e.message || e) }; }
    }
    var body = { id: uid(), version: VER, input: p.raw, intent: intent, answer: answer.text, kind: answer.kind, sources: answer.sources || [], critique: crit, thought: reasoning.steps, hits: hits.map(function (h) { return { source: h.source, score: round3(h.score), topic: h.topic }; }), quantum: qmeta, ms: now() - t0 };
    var sealed = await maybeSeal(body);
    pushTrace({ id: body.id, ts: t0, intent: intent.type, score: crit.score });
    return sealed;
  }
  function teach(fact) {
    fact = String(fact || "").trim(); if (!fact) return { ok: false };
    var mem = loadMem(); mem.push({ text: fact, ts: now(), id: uid() }); saveMem(mem); return { ok: true, n: mem.length };
  }

  G.AKSI_AI = { version: VER, think: think, teach: teach, memory: loadMem, clearMemory: function () { saveMem([]); return { ok: true }; }, traces: function () { try { return JSON.parse(localStorage.getItem(TRACE_KEY) || "[]"); } catch (e) { return []; } }, stages: ["perceive", "intent", "retrieve", "reason", "generate", "critique", "seal"] };
})(typeof window !== "undefined" ? window : globalThis);
