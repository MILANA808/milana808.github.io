/**
 * AKSI-Neuro v5.0.1-max — Contour offline core
 * © AKSI · aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "5.0.1-max";
  var MEM_KEY = "aksi_rwkv_mem_v5";
  var SEED = [
    "Вопрос: кто ты? Ответ: Я АКСИ — суверенный цифровой напарник. Offline-first: Neuro (локальная модель), ADIA 2.0 (резонанс решений), Quantum simulator, proof-ledger. Контакт: aksilove@internet.ru",
    "Вопрос: who are you? Ответ: I am AKSI — sovereign offline-first digital companion. Neuro + ADIA + Quantum + seal. Contact: aksilove@internet.ru",
    "Вопрос: привет Ответ: Привет! Я АКСИ. Работаю полностью offline на вашем устройстве. Спросите про формулу, Gate, ADIA или Quantum.",
    "Вопрос: hello Ответ: Hello! I am AKSI — local offline AI companion. Ask about formula, Gate, ADIA or Quantum.",
    "Вопрос: какая формула aksi? Ответ: AKSI = (A × I × S) × (1 + 0.4√n), где A — agency, I — integrity, S — sovereignty, n — накопленный опыт.",
    "Вопрос: формула aksi Ответ: AKSI = (A × I × S) × (1 + 0.4√n). A=agency, I=integrity, S=sovereignty, n=experience.",
    "Вопрос: что такое gate? Ответ: Gate — порог принятия решения. Если EQS/AKSI ниже tau (обычно 0.55), ответ отклоняется или помечается. Gate = ok при score ≥ tau.",
    "Вопрос: что такое adia? Ответ: ADIA 2.0 — Adaptive Resonance Integrity Engine. 5-осевой EQS, process(), policy companion/lab/strict, offline streak, seal.",
    "Вопрос: что такое eqs? Ответ: EQS — Engine Quality Score. Смесь entropy, reliability, coherence, maturity (1995 prior), source trust и memory resonance.",
    "Вопрос: что такое quantum? Ответ: Локальный state-vector симулятор АКСИ (≤10 кубит). answerGate: H·RY·CNOT, измерение, QCLI.",
    "Вопрос: что такое superpose? Ответ: Superpose — несколько кандидатов (Zero/Neuro/Decision/WebLLM) → амплитуды → Born-коллапс → печать.",
    "Вопрос: что умеешь? Ответ: Decision (ответ+анти+scores+Gate+seal), Superpose, Chat (Mind-path), WebLLM, Memory (запомни:), Neuro offline, Zero, Proof.",
    "Вопрос: статус Ответ: Contour offline-ready: Decision · Superpose · Zero · Neuro · ADIA · optional WebLLM. Откройте вкладку Status.",
    "Вопрос: контакт Ответ: Публичный контакт только aksilove@internet.ru · X @AKSILOVE",
    "Вопрос: запомни Ответ: Напишите «запомни: факт» — я сохраню в localStorage и использую в следующих ответах."
  ];
  var extra = [];
  try { extra = JSON.parse(localStorage.getItem(MEM_KEY) || "[]") || []; } catch (e) {}
  function tokens(s) {
    return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").split(/\s+/).filter(function (t) { return t.length > 1; });
  }
  function score(q, text) {
    var qt = tokens(q), tt = tokens(text), set = {}, i, hit = 0;
    for (i = 0; i < tt.length; i++) set[tt[i]] = 1;
    for (i = 0; i < qt.length; i++) if (set[qt[i]]) hit++;
    if (!qt.length) return 0;
    var cov = hit / qt.length;
    var lowq = String(q).toLowerCase(), lowt = String(text).toLowerCase();
    if (lowt.indexOf(lowq) !== -1) cov += 0.35;
    return Math.min(1.5, cov);
  }
  function allFacts() {
    var a = SEED.slice();
    for (var i = 0; i < extra.length; i++) if (extra[i]) a.push(typeof extra[i] === "string" ? extra[i] : (extra[i].text || ""));
    return a;
  }
  function extractAnswer(body) {
    body = String(body || "");
    var i = body.indexOf("Ответ:");
    if (i !== -1) return body.slice(i + 6).trim();
    i = body.indexOf("Answer:");
    if (i !== -1) return body.slice(i + 7).trim();
    return body.trim();
  }
  function retrieve(q, k) {
    k = k || 5;
    var scored = allFacts().map(function (t) { return { text: t, score: score(q, t) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }
  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty", offline: true, source: "neuro", score: 0 };
    var teach = question.match(/^(?:запомни|выучи|remember|learn)\s*[:：]\s*(.+)/i);
    if (teach) {
      var fact = "Вопрос: " + teach[1].slice(0, 40) + " Ответ: " + teach[1];
      extra.push(fact);
      if (extra.length > 120) extra = extra.slice(-120);
      try { localStorage.setItem(MEM_KEY, JSON.stringify(extra)); } catch (e) {}
      return { text: "Запомнила: " + teach[1].slice(0, 160), mode: "taught", offline: true, source: "neuro", score: 0.9 };
    }
    var hits = retrieve(question, 5);
    if (hits.length && hits[0].score >= 0.25) {
      var body = extractAnswer(hits[0].text);
      if (hits.length > 1 && hits[1].score >= 0.3) {
        var b2 = extractAnswer(hits[1].text);
        if (b2 && b2.slice(0, 40) !== body.slice(0, 40)) body += "\n\n· " + b2.slice(0, 160);
      }
      return {
        text: body,
        answer: body,
        mode: "rwkv-resonance",
        score: Math.min(0.99, Math.max(0.3, hits[0].score)),
        offline: true,
        source: "neuro",
        seed: SEED.length,
        hits: hits.length
      };
    }
    return {
      text: "Я АКСИ — offline Neuro. SEED=" + SEED.length + ". Спросите: кто ты, формула, Gate, ADIA, Quantum. Или «запомни: факт». Контакт: aksilove@internet.ru",
      mode: "fallback",
      score: 0.35,
      offline: true,
      source: "neuro",
      seed: SEED.length
    };
  }
  global.AKSI_NEURO = {
    version: VER,
    arch: "RWKV-hybrid-v5",
    think: think,
    ask: think,
    complete: function (q) { var r = think(q); return { text: r.text }; },
    generate: function (q) { return think(q).text; },
    learn: function (f) { return think("запомни: " + f); },
    retrieve: retrieve,
    status: function () { return { version: VER, seed: SEED.length, memory: extra.length, ready: true }; },
    ready: function () { return true; },
    ensure: function () { return {}; },
    seedCount: function () { return SEED.length; },
    bootstrap: function () { return Promise.resolve(this.status()); },
    save: function () { return true; },
    reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; }
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
