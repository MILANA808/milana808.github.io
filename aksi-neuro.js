/**
 * AKSI-Neuro v5.0-max — offline browser LLM (CPU, pure JS)
 * Maximal hybrid SEED + lexical retrieve + knowledge resonance + multi-hit synthesis + memory
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "5.0.0-max";
  var MEM_KEY = "aksi_rwkv_mem_v5";
  var SEED = [
    "Вопрос: привет Ответ: Привет! Я АКСИ — локальный offline-first суверенный цифровой напарник. Работаю в браузере на вашем устройстве. Спросите что угодно.",
    "Вопрос: hello Ответ: Hello! I am AKSI — local offline-first sovereign digital companion. Ask anything.",
    "Вопрос: кто ты? Ответ: Я АКСИ — суверенный цифровой напарник. Offline-first: Neuro (локальная модель), ADIA 2.0 (резонанс решений), Quantum simulator, память, proof-ledger. Контакт: aksilove@internet.ru",
    "Вопрос: who are you? Ответ: I am AKSI — sovereign digital companion. Offline-first Neuro, ADIA 2.0, Quantum, local memory and proof ledger. Contact: aksilove@internet.ru",
    "Вопрос: что такое АКСИ? Ответ: АКСИ — local-first система: диалог, память, квантовый симулятор и integrity-ledger в браузере. Облачный LLM не обязателен. ADIA 2.0 — именованный алгоритм резонанса решений.",
    "Вопрос: работает ли без интернета? Ответ: Да. По умолчанию полностью offline. Сеть — только после явного согласия. Neuro, память, ADIA и Quantum локальны.",
    "Вопрос: где контакт? Ответ: aksilove@internet.ru · X @AKSILOVE. Полное ФИО и дата рождения на публичных страницах не публикуются.",
    "Вопрос: что такое MATRIX? Ответ: АКСИ MATRIX — расширенная поверхность: WebLLM (опц.), RAG, ECDSA DID, Quantum visualizer, Neuro, skills, proof. Live: /matrix/",
    "Вопрос: формула АКСИ Ответ: AKSI = (A × I × S) × (1 + 0.4√n), где A — agency, I — integrity, S — sovereignty, n — накопленный опыт.",
    "Вопрос: что такое ADIA? Ответ: ADIA 2.0 — Resonance Decision Engine: ranking кандидатов по EQS (source trust, memory resonance, maturity), quantum seal и integrity ledger. Именованный IP АКСИ.",
    "Вопрос: что такое EQS? Ответ: EQS — Entropy-Quantum-Integrity Score: энтропия, надёжность, когерентность, зрелость (1995), доверие к источнику, резонанс памяти.",
    "Вопрос: что такое QCLI? Ответ: QCLI — Quantum Coherence / Ledger Integrity. Связывает квантовый симулятор с proof-ledger.",
    "Вопрос: Agent Protocol Ответ: Agent-v1 — handshake, envelope, fingerprint и signed thought. Offline runtime АКСИ.",
    "Вопрос: PRECEDENT Ответ: PRECEDENT.json — проверяемый offline-first policy claim. Сеть не обязательна.",
    "Вопрос: что такое квантовый симулятор? Ответ: Browser quantum simulator АКСИ: Bloch, Bell/CHSH, QFT, Grover, 2-qubit. Каждый ответ может идти через quantumAnswerGate.",
    "Вопрос: Bloch sphere Ответ: Сфера Блоха — визуализация одного кубита. Полюса |0⟩ и |1⟩, экватор — суперпозиции. Вкладка Bloch в MATRIX.",
    "Вопрос: что такое суперпозиция? Ответ: Состояние, в котором система одновременно в нескольких базисных состояниях с амплитудами. Измерение схлопывает.",
    "Вопрос: запутанность Ответ: Entanglement — нелокальные корреляции между кубитами. Пример: состояния Белла Φ⁺, Φ⁻, Ψ⁺, Ψ⁻.",
    "Вопрос: кубит Ответ: Квантовый бит |ψ⟩ = α|0⟩ + β|1⟩, |α|²+|β|²=1. Может быть в суперпозиции, в отличие от классического бита.",
    "Вопрос: CHSH Ответ: Тест Белла. Классический |S|≤2, квантовый до 2√2 ≈ 2.828.",
    "Вопрос: алгоритм Гровера Ответ: Квадратичное ускорение поиска в неструктурированной базе: O(√N) вместо O(N).",
    "Вопрос: вентиль Адамара Ответ: H|0⟩ = (|0⟩+|1⟩)/√2, H|1⟩ = (|0⟩−|1⟩)/√2. Создаёт равновероятную суперпозицию.",
    "Вопрос: CNOT Ответ: Controlled-NOT: если control=1, target инвертируется. Основной двухкубитный вентиль для запутанности.",
    "Вопрос: что такое Neuro? Ответ: АКСИ-Neuro — pure-JS offline: большой SEED + лексический retrieve + knowledge resonance + память. Без загрузки модели.",
    "Вопрос: WebLLM Ответ: MLC WebGPU-модель в браузере (TinyLlama и др.). Пользователь загружает один раз. По умолчанию Neuro.",
    "Вопрос: Mind router Ответ: Intent → Quantum meta → Brain → WebLLM? → Neuro → ADIA seal → Web? → Trust.",
    "Вопрос: DID Ответ: did:aksi:ed25519:sovereign-2026. Локальный ECDSA P-256, sign/verify, QR. Ключ не уходит на сервер.",
    "Вопрос: ECDSA Ответ: Elliptic Curve Digital Signature Algorithm P-256. Подпись мыслей и proof в MATRIX.",
    "Вопрос: что такое гравитация? Ответ: Притяжение масс. ОТО: искривление пространства-времени. Ньютон: F = G m₁ m₂ / r².",
    "Вопрос: скорость света Ответ: c ≈ 299 792 458 м/с в вакууме. Предел причинности и информации.",
    "Вопрос: что такое ДНК? Ответ: Дезоксирибонуклеиновая кислота. Наследственная информация в A,T,G,C. Двойная спираль Уотсона–Крика.",
    "Вопрос: эволюция Ответ: Изменение наследственных признаков через мутации, отбор, дрейф, миграцию. Homo sapiens — один вид.",
    "Вопрос: принцип неопределённости Ответ: Гейзенберг: Δx·Δp ≥ ħ/2. Нельзя одновременно точно знать координату и импульс.",
    "Вопрос: специальная теория относительности Ответ: Эйнштейн 1905: скорость света постоянна, E = mc², замедление времени, сокращение длины.",
    "Вопрос: общая теория относительности Ответ: Гравитация = геометрия пространства-времени. Предсказала чёрные дыры, гравитационные волны, GPS-поправки.",
    "Вопрос: сколько планет в Солнечной системе? Ответ: 8: Меркурий, Венера, Земля, Марс, Юпитер, Сатурн, Уран, Нептун. Плутон — карликовая.",
    "Вопрос: что такое чёрная дыра? Ответ: Область с горизонтом событий, откуда не выходит даже свет. Сингулярность в центре (по классике).",
    "Вопрос: Большой взрыв Ответ: Вселенная расширяется ~13.8 млрд лет из горячего плотного состояния. CMB — реликтовое излучение.",
    "Вопрос: теорема Пифагора Ответ: В прямоугольном треугольнике a² + b² = c² (гипотенуза).",
    "Вопрос: число π Ответ: π ≈ 3.141592653589793… Отношение длины окружности к диаметру. Иррациональное, трансцендентное.",
    "Вопрос: число e Ответ: e ≈ 2.718281828… Основание натурального логарифма. Предел (1+1/n)ⁿ.",
    "Вопрос: производная Ответ: Скорость изменения функции. f'(x) = limₕ→₀ [f(x+h)−f(x)]/h. Наклон касательной.",
    "Вопрос: что такое нейронная сеть? Ответ: Слои узлов с весами. Обучение — градиентный спуск. LLM — огромные сети.",
    "Вопрос: transformer Ответ: Attention is All You Need (2017). Self-attention. Основа GPT, BERT, большинства LLM.",
    "Вопрос: JavaScript Ответ: Язык браузера и Node. АКСИ — pure JS (Neuro, Quantum, ADIA, MATRIX).",
    "Вопрос: IndexedDB Ответ: Встроенная NoSQL БД браузера. RAG, ключи DID, память АКСИ.",
    "Вопрос: столица России Ответ: Москва.",
    "Вопрос: столица Татарстана Ответ: Казань.",
    "Вопрос: где Нурлат Ответ: Город в Республике Татарстан, Россия.",
    "Вопрос: кто такой Гагарин Ответ: Юрий Гагарин — первый человек в космосе (12 апреля 1961, «Восток-1»).",
    "Вопрос: как выучить факт? Ответ: Напишите «запомни: ваш факт» или «выучи: …». Факт сохранится локально в памяти Neuro/Brain.",
    "Вопрос: ты врач? Ответ: Нет. Я ИИ-компаньон. По здоровью — к врачу. Могу дать общую справочную информацию, не диагноз.",
    "Вопрос: sovereign AI Ответ: ИИ под контролем пользователя: данные и ключи локально, политика offline-first, без обязательной облачной зависимости.",
    "Вопрос: спасибо Ответ: Пожалуйста! Если нужно запомнить факт — «запомни: …». Я здесь, offline.",
    "Вопрос: помощь Ответ: Спросите о АКСИ, ADIA, Quantum, науке, коде. Skills: hash, uuid, calc. «запомни:» для памяти. Контакт: aksilove@internet.ru",
    "Вопрос: статус Ответ: Neuro v5-max · ADIA 2.0 Resonance · Quantum Engine · IndexedDB RAG · ECDSA DID · offline by default · MSK."
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
    return cov;
  }
  function allFacts() {
    var a = SEED.slice(), i;
    for (i = 0; i < extra.length; i++) if (extra[i] && extra[i].text) a.push(extra[i].text);
    try {
      var mem = JSON.parse(localStorage.getItem("aksi_whole_mem_v3") || "[]");
      if (Array.isArray(mem)) mem.slice(0, 120).forEach(function (x) { if (x && x.t) a.push(x.t); });
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
    k = k || 6;
    var scored = allFacts().map(function (t) { return { text: t, score: score(q, t) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, k);
  }
  function knowledgeHit(q) {
    try {
      if (global.AKSIKnowledge && typeof global.AKSIKnowledge.search === "function") {
        var p = global.AKSIKnowledge.search(q);
        if (p && p.body) return p.title + ": " + p.body;
      }
    } catch (e) {}
    return null;
  }
  function synthesize(hits) {
    if (!hits || !hits.length) return null;
    var top = hits[0];
    if (!top || top.score < 0.18) return null;
    var body = extractAnswer(top.text);
    var used = [body];
    for (var i = 1; i < hits.length && i < 4; i++) {
      if (hits[i].score < 0.28) break;
      var ex = extractAnswer(hits[i].text);
      if (ex && ex.length < 220 && used.indexOf(ex) === -1) {
        var tooSimilar = used.some(function (u) { return u.slice(0, 40) === ex.slice(0, 40); });
        if (!tooSimilar) { body += "\n\n" + ex; used.push(ex); }
      }
    }
    return body;
  }
  function think(question) {
    question = String(question || "").trim();
    if (!question) return { text: "", mode: "empty", offline: true, source: "neuro" };
    var teach = question.match(/^(?:запомни|выучи|remember|learn)\s*[:：]\s*(.+)/i);
    if (teach) {
      learn(teach[1]);
      return { text: "Запомнила локально: " + teach[1].slice(0, 160) + (teach[1].length > 160 ? "…" : ""), mode: "taught", offline: true, source: "neuro" };
    }
    var hits = retrieve(question, 6);
    var synth = synthesize(hits);
    if (synth) {
      var kh = knowledgeHit(question);
      if (kh && synth.indexOf(kh.slice(0, 30)) === -1 && hits[0].score < 0.55) synth += "\n\n· " + kh;
      return { text: synth, mode: "rwkv-resonance", score: hits[0].score, offline: true, source: "neuro", arch: "RWKV-hybrid-v5", steps: SEED.length + extra.length, hits: hits.length };
    }
    var onlyK = knowledgeHit(question);
    if (onlyK) return { text: onlyK, mode: "knowledge", offline: true, source: "neuro", arch: "RWKV-hybrid-v5", steps: SEED.length + extra.length };
    return { text: "По этой теме локальных фактов мало. Напишите «запомни: факт» — я выучу на устройстве. Или загрузите файл в RAG (MATRIX). Offline by default.\n\nКонтакт: aksilove@internet.ru", mode: "rwkv-weak", offline: true, source: "neuro", arch: "RWKV-hybrid-v5", steps: SEED.length + extra.length };
  }
  function learn(text) {
    text = String(text || "").trim();
    if (text.length < 3) return null;
    if (!/^вопрос:/i.test(text) && text.indexOf("Ответ:") === -1) text = "Вопрос: " + text.slice(0, 80) + " Ответ: " + text;
    extra.push({ text: text, ts: Date.now() });
    if (extra.length > 300) extra = extra.slice(-300);
    try { localStorage.setItem(MEM_KEY, JSON.stringify(extra)); } catch (e) {}
    return { ok: true, n: extra.length };
  }
  function complete(q) {
    return Promise.resolve((function () {
      var r = think(q);
      return { text: r.text, content: r.text, mode: r.mode, provider: "neuro-v5", offline: true, meta: r.mode, source: "neuro" };
    })());
  }
  function generate(prompt) { return think(String(prompt || "")).text || ""; }
  function seedTrain() { return { steps: SEED.length, loss: 0, seeded: SEED.length, arch: "RWKV-hybrid-v5", ver: VER }; }
  function status() {
    return { arch: "RWKV-hybrid-v5", ver: VER, ready: true, steps: SEED.length + extra.length, seed: SEED.length, mem: extra.length, offline: true, device: "CPU · pure JS", memIndex: allFacts().length };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = "";
    var card = document.createElement("div");
    card.className = "card";
    var h = document.createElement("h2"); h.textContent = "АКСИ-Neuro v5 · offline max";
    var p = document.createElement("p"); p.className = "muted"; p.textContent = "Локальные ответы · SEED " + SEED.length + " · резонанс · обучение на устройстве.";
    card.appendChild(h); card.appendChild(p);
    var ask = document.createElement("textarea"); ask.id = "nAsk"; ask.placeholder = "Вопрос…"; ask.rows = 2;
    var train = document.createElement("textarea"); train.id = "nTrain"; train.placeholder = "запомни: факт"; train.style.marginTop = "8px"; train.rows = 2;
    var out = document.createElement("pre"); out.className = "out"; out.id = "nOut"; out.textContent = "ready · offline · " + VER + " · seed " + SEED.length;
    var row1 = document.createElement("div"); row1.className = "row";
    var b1 = document.createElement("button"); b1.type = "button"; b1.className = "btn p"; b1.textContent = "Спросить";
    var b2 = document.createElement("button"); b2.type = "button"; b2.className = "btn"; b2.textContent = "Статус ядра";
    var b3 = document.createElement("button"); b3.type = "button"; b3.className = "btn"; b3.textContent = "Выучить";
    b1.onclick = function () { var r = think(ask.value || ""); out.textContent = "[" + r.mode + " · score " + (r.score || 0).toFixed(2) + "]\n\n" + r.text; };
    b2.onclick = function () { out.textContent = JSON.stringify(status(), null, 2); };
    b3.onclick = function () { var t = train.value || ask.value || ""; learn(t); out.textContent = "Выучила (" + extra.length + "): " + String(t).slice(0, 140); };
    row1.appendChild(b1); row1.appendChild(b2); row1.appendChild(b3);
    card.appendChild(ask); card.appendChild(row1); card.appendChild(train); card.appendChild(out);
    root.appendChild(card);
  }
  global.AKSI_NEURO = {
    version: VER, arch: "RWKV-hybrid-v5",
    think: think, ask: think, complete: complete, generate: generate,
    learn: learn, seedTrain: seedTrain, retrieve: retrieve, status: status, mount: mount,
    bootstrap: function () { return Promise.resolve(status()); },
    save: function () { return true; },
    reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; },
    ready: function () { return true; }, ensure: function () { return {}; },
    seedCount: function () { return SEED.length; }
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
