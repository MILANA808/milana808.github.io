/**
 * AKSI-Neuro v3.2 — offline browser LLM layer (CPU, pure JS)
 * Hybrid: lexical retrieve (SEED + memory)
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "3.2.1-hybrid";
  var MEM_KEY = "aksi_rwkv_mem_v3";
  var SEED = [
    "Вопрос: привет Ответ: Привет! Я АКСИ — локальный offline ИИ. Спросите что угодно.",
    "Вопрос: hello Ответ: Hello! I am AKSI — local offline AI companion.",
    "Вопрос: как дела? Ответ: Работаю локально, offline-first. Готова помочь.",
    "Вопрос: статус Ответ: Neuro ready · ADIA 2.0 · Quantum Engine · offline by default.",
    "Вопрос: кто ты? Ответ: Я АКСИ — offline-first суверенный цифровой напарник в браузере. Работаю локально на CPU.",
    "Вопрос: who are you? Ответ: I am AKSI — an offline-first sovereign digital companion in the browser. Local CPU.",
    "Вопрос: что такое АКСИ? Ответ: АКСИ — локальный ИИ-компаньон с алгоритмом ADIA 2.0, Neuro, памятью и quantum seal.",
    "Вопрос: what is AKSI? Ответ: AKSI is a local AI companion with ADIA 2.0, Neuro offline LLM, memory and quantum seal.",
    "Вопрос: работает ли без интернета? Ответ: Да. По умолчанию offline. Сеть включается только после вашего согласия.",
    "Вопрос: does it work offline? Ответ: Yes. Offline by default. Network only after your explicit consent.",
    "Вопрос: как доказать offline? Ответ: Нажмите «Докажи offline» на Home и откройте PRECEDENT.json.",
    "Вопрос: где контакт? Ответ: aksilove@internet.ru · X @AKSILOVE",
    "Вопрос: contact? Ответ: aksilove@internet.ru · X @AKSILOVE",
    "Вопрос: что такое RWKV? Ответ: Рекуррентная архитектура: линейное время, постоянная память, без KV-cache, работает на CPU.",
    "Вопрос: что такое ADIA? Ответ: ADIA 2.0 — Resonance Decision Engine: EQS, резонанс памяти, ranking и integrity seal.",
    "Вопрос: что такое EQS? Ответ: Entropy-Quantum-Integrity Score — измеримое качество ответа и решения.",
    "Вопрос: квант Ответ: Каждый ответ АКСИ проходит через локальный Quantum Engine (answerGate) — QCLI и resonance.",
    "АКСИ — суверенный цифровой напарник. Offline-first. Контакт: aksilove@internet.ru.",
    "Сеть включается только после явного согласия пользователя.",
    "PRECEDENT.json — проверяемый прецедент offline-first политики АКСИ.",
    "Память АКСИ хранится локально. Факты: запомни: …"
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
    if (/вопрос:|question:/.test(lowt) && lowt.indexOf(lowq.slice(0, Math.min(18, lowq.length))) !== -1) cov += 0.3;
    return cov;
  }
  function allFacts() {
    var a = SEED.slice(), i;
    for (i = 0; i < extra.length; i++) if (extra[i] && extra[i].text) a.push(extra[i].text);
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 100).forEach(function (x) { if (x && x.t) a.push(x.t); });
    } catch (e) {}
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
    k = k || 4;
    var scored = allFacts().map(function (t) { return { text: t, score: score(q, t) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }
  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty", offline: true, source: "neuro" };
    var hits = retrieve(question, 5), top = hits[0];
    if (top && top.score >= 0.22) {
      var body = extractAnswer(top.text);
      if (hits[1] && hits[1].score > 0.35) {
        var ex = extractAnswer(hits[1].text);
        if (ex && ex !== body && ex.length < 160) body += "\n\n" + ex;
      }
      return { text: body, mode: "rwkv-retrieve", score: top.score, offline: true, source: "neuro", arch: "RWKV-hybrid", steps: SEED.length + extra.length };
    }
    return {
      text: "Локальная модель мало знает по этой теме. Напишите «запомни: факт» или Lab → Neuro → Выучить. Offline by default.",
      mode: "rwkv-weak", offline: true, source: "neuro", arch: "RWKV-hybrid", steps: SEED.length + extra.length
    };
  }
  function learn(text) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    extra.push({ text: text });
    if (extra.length > 200) extra = extra.slice(-200);
    try { localStorage.setItem(MEM_KEY, JSON.stringify(extra)); } catch (e) {}
    return { ok: true, n: extra.length };
  }
  function complete(q) {
    return Promise.resolve((function () {
      var r = think(q);
      return { text: r.text, content: r.text, mode: r.mode, provider: "neuro-hybrid", offline: true, meta: r.mode, source: "neuro" };
    })());
  }
  function generate(prompt) { return think(String(prompt || "")).text || ""; }
  function seedTrain() { return { steps: SEED.length, loss: 0, seeded: SEED.length, arch: "RWKV-hybrid", ver: VER }; }
  function status() {
    return { arch: "RWKV-hybrid", ver: VER, ready: true, steps: SEED.length + extra.length, offline: true, device: "CPU · pure JS", memIndex: allFacts().length };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>АКСИ-Neuro · offline</h2><p class=\"muted\">Локальные ответы без сети.</p>";
    var ask = document.createElement("textarea"); ask.id = "nAsk"; ask.placeholder = "Вопрос…";
    var train = document.createElement("textarea"); train.id = "nTrain"; train.placeholder = "запомни: факт"; train.style.marginTop = "8px";
    var out = document.createElement("pre"); out.className = "out"; out.id = "nOut"; out.textContent = "ready · offline · " + VER;
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn primary"; b1.textContent = "Спросить";
    var b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn"; b2.textContent = "Выучить";
    b1.onclick = function () { var r = think(ask.value || ""); out.textContent = "[" + r.mode + "]\n\n" + r.text; };
    b2.onclick = function () { learn(train.value || ""); out.textContent = "Выучила: " + String(train.value || "").slice(0, 120); };
    card.appendChild(ask); card.appendChild(b1); card.appendChild(train); card.appendChild(b2); card.appendChild(out);
    root.appendChild(card);
  }
  global.AKSI_NEURO = {
    version: VER, arch: "RWKV-hybrid",
    think: think, ask: think, complete: complete, generate: generate,
    learn: learn, seedTrain: seedTrain, retrieve: retrieve, status: status, mount: mount,
    bootstrap: function () { return Promise.resolve(status()); },
    save: function () { return true; },
    reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; },
    ready: function () { return true; }, ensure: function () { return {}; }
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
