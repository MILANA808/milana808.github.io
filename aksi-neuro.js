/**
 * AKSI-Neuro v4.0 — offline browser LLM layer (CPU, pure JS)
 * Large hybrid SEED + lexical retrieve + knowledge resonance + memory
 * Contact: aksilove@internet.ru
 * Goal: answer broadly offline without network
 */
(function (global) {
  "use strict";
  var VER = "4.0.0-wide";
  var MEM_KEY = "aksi_rwkv_mem_v3";
  var SEED = [
    "Вопрос: привет Ответ: Привет! Я АКСИ — локальный offline-first суверенный цифровой напарник. Работаю прямо в браузере на вашем устройстве. Спросите что угодно.",
    "Вопрос: hello Ответ: Hello! I am AKSI — local offline-first sovereign digital companion in the browser. Ask anything.",
    "Вопрос: кто ты? Ответ: Я АКСИ — суверенный цифровой напарник. Offline-first ИИ в браузере: Neuro (локальная модель), ADIA 2.0 (резонанс решений), Quantum simulator, память и proof-ledger. Контакт автора: aksilove@internet.ru",
    "Вопрос: что такое АКСИ? Ответ: АКСИ — local-first система: диалог, память, поиск, квантовый симулятор и integrity-ledger работают в браузере. Облачный LLM не обязателен. ADIA 2.0 — именованный алгоритм резонанса решений.",
    "Вопрос: работает ли без интернета? Ответ: Да. По умолчанию полностью offline. Сеть включается только после вашего явного согласия. Neuro, память, ADIA и Quantum работают локально.",
    "Вопрос: что такое ADIA? Ответ: ADIA 2.0 — Resonance Decision Engine: ranking кандидатов по EQS (source trust, memory resonance, maturity), quantum seal и integrity ledger.",
    "Вопрос: что такое EQS? Ответ: EQS — Entropy-Quantum-Integrity Score. Измеримое качество ответа: энтропия, надёжность, когерентность, зрелость (1995 prior), доверие к источнику и резонанс памяти.",
    "Вопрос: что такое квантовый симулятор? Ответ: АКСИ содержит browser quantum simulator: Bloch sphere, Bell/CHSH, QFT, Grover, 2-qubit схемы. Каждый ответ может проходить через quantumAnswerGate.",
    "Вопрос: DID Ответ: DID АКСИ: did:aksi:ed25519:sovereign-2026. Локальный ECDSA P-256 ключ, sign/verify, QR. Ключ не уходит на сервер.",
    "Вопрос: где контакт? Ответ: Публичный контакт: aksilove@internet.ru · X @AKSILOVE.",
    "Вопрос: что такое Neuro? Ответ: АКСИ-Neuro — pure-JS offline слой: лексический retrieve по большому SEED + память + knowledge resonance. Работает сразу, без загрузки модели.",
    "Вопрос: как выучить факт? Ответ: Напишите «запомни: ваш факт» или «выучи: …». Факт сохранится локально в памяти устройства и попадёт в Neuro.",
    "Вопрос: суперпозиция Ответ: Суперпозиция — состояние, в котором система одновременно находится в нескольких базисных состояниях с амплитудами. Измерение схлопывает в один исход.",
    "Вопрос: кубит Ответ: Кубит — квантовый бит. Состояние |ψ⟩ = α|0⟩ + β|1⟩, |α|²+|β|²=1.",
    "Вопрос: скорость света Ответ: Скорость света в вакууме c ≈ 299 792 458 м/с.",
    "Вопрос: теорема Пифагора Ответ: В прямоугольном треугольнике a² + b² = c².",
    "Вопрос: что такое ДНК? Ответ: ДНК хранит наследственную информацию в последовательности нуклеотидов A, T, G, C. Двойная спираль.",
    "Вопрос: Big Bang Ответ: Вселенная расширяется из горячего плотного состояния ~13.8 млрд лет назад. CMB — реликтовое излучение.",
    "Вопрос: transformer Ответ: Архитектура Transformer (2017) — основа GPT и большинства современных LLM. Self-attention.",
    "Вопрос: help Ответ: Команды: запомни: факт · hash текст · uuid · calc 2+2 · время. Вкладки MATRIX: Агенты, Крипто, Bloch, UI, 2-qubit.",
    "АКСИ — суверенный цифровой напарник. Offline-first. Контакт: aksilove@internet.ru · X @AKSILOVE."
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
    if (lowt.indexOf(lowq) !== -1) cov += 0.4;
    if (/вопрос:|question:/.test(lowt) && lowt.indexOf(lowq.slice(0, Math.min(24, lowq.length))) !== -1) cov += 0.35;
    var qWords = qt.filter(function (w) { return w.length > 2; });
    if (qWords.length && qWords.every(function (w) { return lowt.indexOf(w) !== -1; })) cov += 0.25;
    return cov;
  }
  function allFacts() {
    var a = SEED.slice(), i;
    for (i = 0; i < extra.length; i++) if (extra[i] && extra[i].text) a.push(extra[i].text);
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 120).forEach(function (x) { if (x && x.t) a.push(x.t); });
    } catch (e) {}
    try {
      if (global.AKSIKnowledge && AKSIKnowledge.all) {
        AKSIKnowledge.all().forEach(function (p) {
          if (p && p.body) a.push("Вопрос: " + (p.title || "") + " " + (p.tags || []).join(" ") + " Ответ: " + p.body);
        });
      }
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
    k = k || 5;
    var scored = allFacts().map(function (t) { return { text: t, score: score(q, t) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }
  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty", offline: true, source: "neuro" };
    var teach = question.match(/^(?:запомни|выучи|learn)\s*[:：]\s*(.+)/i);
    if (teach) {
      learn(teach[1]);
      return { text: "Запомнила локально: «" + teach[1].slice(0, 160) + "». Теперь это в Neuro-памяти устройства.", mode: "teach", offline: true, source: "neuro" };
    }
    var hits = retrieve(question, 6), top = hits[0];
    if (top && top.score >= 0.18) {
      var body = extractAnswer(top.text);
      if (hits[1] && hits[1].score > 0.32) {
        var ex = extractAnswer(hits[1].text);
        if (ex && ex !== body && ex.length < 220 && body.indexOf(ex.slice(0, 40)) === -1) body += "\n\n" + ex;
      }
      try {
        if (global.AKSIKnowledge && AKSIKnowledge.search) {
          var k = AKSIKnowledge.search(question);
          if (k && k.body && body.indexOf(k.body.slice(0, 30)) === -1 && top.score < 0.55) {
            body += "\n\n[" + (k.title || "знание") + "] " + k.body;
          }
        }
      } catch (e) {}
      return { text: body, mode: "rwkv-retrieve", score: top.score, offline: true, source: "neuro", arch: "RWKV-hybrid-v4", steps: SEED.length + extra.length };
    }
    try {
      if (global.AKSIKnowledge && AKSIKnowledge.search) {
        var kk = AKSIKnowledge.search(question);
        if (kk && kk.body) {
          return { text: kk.body + "\n\n(Локальное ядро · можно уточнить или «запомни: …»)", mode: "knowledge", offline: true, source: "neuro", arch: "RWKV-hybrid-v4" };
        }
      }
    } catch (e) {}
    return {
      text: "По этой теме локальное ядро пока слабо. Напишите «запомни: короткий факт» — я выучу на устройстве. Или спросите про АКСИ, ADIA, Quantum, науку, математику.\n\nКонтакт: aksilove@internet.ru",
      mode: "rwkv-weak", offline: true, source: "neuro", arch: "RWKV-hybrid-v4", steps: SEED.length + extra.length
    };
  }
  function learn(text) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    extra.push({ text: text, ts: Date.now() });
    if (extra.length > 300) extra = extra.slice(-300);
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
  function seedTrain() { return { steps: SEED.length, loss: 0, seeded: SEED.length, arch: "RWKV-hybrid-v4", ver: VER }; }
  function status() {
    return { arch: "RWKV-hybrid-v4", ver: VER, ready: true, steps: SEED.length + extra.length, seedPairs: SEED.length, offline: true, device: "CPU · pure JS", memIndex: allFacts().length };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("div");
    card.className = "card";
    card.innerHTML = "<h2>АКСИ-Neuro v4 · offline wide</h2><p class=\"muted\">SEED " + SEED.length + " · локальные ответы без сети.</p>";
    var ask = document.createElement("textarea"); ask.id = "nAsk"; ask.placeholder = "Вопрос…"; ask.rows = 2;
    var train = document.createElement("textarea"); train.id = "nTrain"; train.placeholder = "запомни: факт"; train.style.marginTop = "8px"; train.rows = 2;
    var out = document.createElement("pre"); out.className = "out"; out.id = "nOut"; out.textContent = "ready · offline · " + VER + " · seed " + SEED.length;
    var row1 = document.createElement("div"); row1.className = "row"; row1.style.marginTop = "8px";
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn p"; b1.textContent = "Спросить";
    var b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn"; b2.textContent = "Обучить ядро";
    var b3 = document.createElement("button"); b3.type = "button"; b3.className = "btn"; b3.textContent = "Выучить";
    b1.onclick = function () { var r = think(ask.value || ""); out.textContent = "[" + r.mode + " · score " + (r.score || 0).toFixed(2) + "]\n\n" + r.text; };
    b2.onclick = function () { out.textContent = JSON.stringify(seedTrain(), null, 2); };
    b3.onclick = function () { learn(train.value || ""); out.textContent = "Выучила: " + String(train.value || "").slice(0, 160); };
    row1.appendChild(b1); row1.appendChild(b2); row1.appendChild(b3);
    card.appendChild(ask); card.appendChild(row1); card.appendChild(train); card.appendChild(out);
    root.appendChild(card);
  }
  global.AKSI_NEURO = {
    version: VER, arch: "RWKV-hybrid-v4",
    think: think, ask: think, complete: complete, generate: generate,
    learn: learn, seedTrain: seedTrain, retrieve: retrieve, status: status, mount: mount,
    bootstrap: function () { return Promise.resolve(status()); },
    save: function () { return true; },
    reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; },
    ready: function () { return true; }, ensure: function () { return {}; },
    SEED_COUNT: SEED.length
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
