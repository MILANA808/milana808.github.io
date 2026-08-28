/**
 * AKSI BRAIN — Offline Language Engine v1
 * Без интернета · без GPU · CPU/JS only
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";
  var VER = "1.0.0-offline";
  var HIST_KEY = "aksi:brain:hist:v1";
  var KB_EXTRA = "aksi:brain:kb:v1";

  var KB = [
    { t: "акси aksi кто ты", a: "Я АКСИ — суверенный local-first цифровой напарник. Работаю в браузере: память, proof-ledger, PQ-крипто, метрики EQS. Данные остаются у вас. Контакт: aksilove@internet.ru." },
    { t: "миссия aksi суверенность", a: "Миссия АКСИ: цифровой суверенитет — идентичность, память и рассуждение без обязательной облачной привязки. Целостность (proof) важнее «магии» чужого API." },
    { t: "eqs метрики формула", a: "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age. AKSI = (A×I×S)×(1+0.4√n). H — энтропия Шеннона; rel — разнообразие лексики; coh — связность." },
    { t: "proof ledger цепочка", a: "Proof ledger — append-only цепочка хешей. Подмена записи ломает prev_hash. Аудит целостности, не токен-блокчейн." },
    { t: "постквантовое pq шифрование", a: "AKSI-PQ: гибрид ECDH P-256 + опционально ML-KEM-768, AES-256-GCM, Resonance Seal. Релей видит ciphertext." },
    { t: "что такое ии искусственный интеллект", a: "ИИ — системы, которые делают задачи, ранее требовавшие ума: язык, зрение, планирование. Чаще статистические модели на данных, а не «сознание»." },
    { t: "машинное обучение нейросеть", a: "ML — подгонка параметров под данные. Нейросеть — граф слоёв; обучение градиентами. Малые модели работают на CPU без GPU." },
    { t: "квантовая физика кубит", a: "Кубит: суперпозиция |0⟩ и |1⟩. Запутанность связывает системы. Квантовые компьютеры пока узкоспециализированы." },
    { t: "теория относительности эйнштейн", a: "СТО: скорость света постоянна в инерциальных системах. ОТО: гравитация как кривизна пространства-времени. GPS учитывает поправки." },
    { t: "эволюция дарвин", a: "Естественный отбор: изменчивость + отбор. ДНК — носитель наследственности у земной жизни." },
    { t: "днк ген хромосома", a: "ДНК — двойная спираль (A,T,G,C). Ген кодирует продукт. Хромосомы — упакованная ДНК." },
    { t: "вселенная космос", a: "Вселенная расширяется; реликтовое излучение — отпечаток ранней эпохи. Тёмная материя/энергия — рабочие гипотезы." },
    { t: "климат парниковый", a: "Парниковые газы удерживают тепло. Рост CO₂ связан с потеплением. Климат — долгосрочная статистика погоды." },
    { t: "алгоритм сложность", a: "Алгоритм — конечная процедура. O-нотация: рост времени с размером входа. Бинарный поиск O(log n)." },
    { t: "криптография хеш sha256", a: "SHA-256 — криптографический отпечаток. Малое изменение входа → другой хеш. Подпись связывает сообщение с ключом." },
    { t: "http https интернет", a: "HTTP — протокол запросов. HTTPS = HTTP + TLS. DNS имя→IP. Браузер — клиент." },
    { t: "javascript браузер", a: "JS в браузере: DOM, Web Crypto, IndexedDB. WebGPU/WASM ускоряют, но не обязательны для логики агента." },
    { t: "как учиться", a: "Активное воспроизведение, интервалы, сон, связь с известным. Объяснение своими словами сильнее перечитывания." },
    { t: "критическое мышление", a: "Источник, опровержения, факт vs вывод. Уверенный тон ≠ истина." },
    { t: "этика ии", a: "Прозрачность, ответственность, приватность, смещения. Local-first и свои ключи — практика автономии." },
    { t: "здоровье сон", a: "Сон 7–9 ч, вода, движение. Диагнозы — у врача." },
    { t: "пароль безопасность", a: "Менеджер паролей, уникальные пароли, 2FA, не светить API-ключи." },
    { t: "вторая мировая", a: "1939–1945. Разгром нацистской Германии и милитаристской Японии, ООН." },
    { t: "пушкин", a: "Пушкин — норма современного русского литературного языка: лирика, Онегин, проза." },
    { t: "api rest", a: "API — контракт запрос→ответ. REST часто JSON. Ключи храните локально (BYOK)." },
    { t: "git commit", a: "commit — снимок; branch — линия; merge — сборка. Понятные сообщения коммитов." },
    { t: "docker", a: "Контейнер = приложение + зависимости. Удобно для AKSI Relay-сервера." },
    { t: "расскажи шутку", a: "Инженер АКСИ задокументировал «стакан наполовину…» в proof-ledger и пошёл дальше." },
    { t: "спасибо", a: "Пожалуйста. Команда «запомни: …» пишет в память и offline-базу." },
  ];

  function norm(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s+\-*/=?.]/g, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(s) {
    return norm(s).split(" ").filter(function (w) { return w.length > 1; });
  }
  function loadJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function extraKB() { var a = loadJSON(KB_EXTRA, []); return Array.isArray(a) ? a : []; }
  function allKB() { return KB.concat(extraKB()); }

  function score(queryTok, entry) {
    var et = tokens(entry.t + " " + entry.a);
    if (!queryTok.length || !et.length) return 0;
    var set = {}; et.forEach(function (w) { set[w] = 1; });
    var hit = 0, i;
    for (i = 0; i < queryTok.length; i++) if (set[queryTok[i]]) hit++;
    var title = tokens(entry.t), th = 0;
    for (i = 0; i < queryTok.length; i++) if (title.indexOf(queryTok[i]) >= 0) th++;
    return hit / queryTok.length + 0.35 * (th / Math.max(1, queryTok.length));
  }
  function retrieve(q, topN) {
    var qt = tokens(q);
    return allKB().map(function (e) { return { e: e, s: score(qt, e) }; })
      .filter(function (x) { return x.s > 0.12; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, topN || 3);
  }

  function tryMath(q) {
    var m = String(q).replace(/,/g, ".").match(/(?:посчитай|вычисли|сколько будет)?\s*([0-9\s+\-*/().^%]+)\s*\??$/i);
    var expr = m ? m[1] : (/^[0-9+\-*/().^%\s]+$/.test(q.trim()) ? q.trim() : null);
    if (!expr) return null;
    expr = expr.replace(/\^/g, "**").replace(/\s+/g, "");
    if (!/^[0-9+\-*/().%*]+$/.test(expr.replace(/\*\*/g, ""))) return null;
    try {
      var r = Function('"use strict"; return (' + expr + ")")();
      if (typeof r === "number" && isFinite(r)) return "Результат: " + r;
    } catch (e) {}
    return null;
  }

  function mskNow() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date()) + " (MSK)";
    } catch (e) { return new Date().toLocaleString("ru-RU"); }
  }

  function synthesize(q, hits) {
    if (!hits.length) return null;
    var best = hits[0];
    if (best.s < 0.18) return null;
    var parts = [best.e.a];
    if (hits[1] && hits[1].s > 0.28 && hits[1].e.a !== best.e.a) parts.push("Также: " + hits[1].e.a);
    if (best.s < 0.35) parts.push("Если имелось в виду другое — уточните.");
    return parts.join("\n\n");
  }

  function personaFallback(q) {
    var low = norm(q);
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет. Я АКСИ Brain — offline без интернета и GPU. Спросите о науке, АКСИ, безопасности или «запомни: факт».";
    if (/кто ты|что ты/.test(low))
      return "Локальный мозг АКСИ: retrieval + синтез. Не облачный GPT; работает без сети. Большая модель — Ollama на вашем ПК.";
    if (/что умеешь|помощь|help/.test(low))
      return "Offline: база знаний, арифметика, память, RWKV, PQ/ledger. Опционально сеть: LLM Router, Relay.";
    if (/время|дата|час/.test(low)) return "Сейчас: " + mskNow() + ".";
    if (/интернет|offline|оффлайн|без сети/.test(low))
      return "Это offline-мозг. Сеть не нужна. Облако — только если вы сами включите LLM Router.";
    if (/gpu|видеокарт/.test(low))
      return "Без GPU: CPU и JavaScript. WebLLM/Ollama — отдельный контур по желанию.";
    return null;
  }

  function tryNeuro(q) {
    try {
      if (!global.AKSI_NEURO || typeof global.AKSI_NEURO.generate !== "function") return null;
      var g = global.AKSI_NEURO.generate(q, 48, 0.85);
      if (g && String(g).trim().length > 8) return String(g).trim();
    } catch (e) {}
    return null;
  }

  function pushHist(role, content) {
    var h = loadJSON(HIST_KEY, []);
    h.push({ role: role, content: String(content).slice(0, 2000), ts: Date.now() });
    if (h.length > 40) h = h.slice(-40);
    saveJSON(HIST_KEY, h);
  }

  function complete(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос.", meta: "brain", offline: true };
    var math = tryMath(q);
    if (math) return { text: math, meta: "brain·math", offline: true };
    var persona = personaFallback(q);
    if (persona && /^(привет|кто ты|что умеешь|время|gpu|offline)/i.test(norm(q).slice(0, 24)))
      return { text: persona, meta: "brain·persona", offline: true };
    var hits = retrieve(q, 4);
    var syn = synthesize(q, hits);
    if (syn) {
      pushHist("user", q); pushHist("assistant", syn);
      return { text: syn, meta: "brain·kb", offline: true, score: hits[0].s };
    }
    if (!opts.noNeuro) {
      var ng = tryNeuro(q);
      if (ng) {
        pushHist("user", q); pushHist("assistant", ng);
        return { text: ng, meta: "brain·rwkv", offline: true };
      }
    }
    if (persona) return { text: persona, meta: "brain·persona", offline: true };
    var text = "Я offline-мозг АКСИ: по запросу «" + q.slice(0, 80) + "» нет уверенного факта в локальной базе.\n\n• переформулировать\n• «запомни: …»\n• вкладка Нейро — RWKV\n• Ollama на ПК";
    pushHist("user", q); pushHist("assistant", text);
    return { text: text, meta: "brain·fallback", offline: true };
  }

  function teach(text) {
    text = String(text || "").trim();
    if (!text) return false;
    var a = extraKB();
    a.push({ t: tokens(text).slice(0, 12).join(" "), a: text });
    if (a.length > 200) a = a.slice(-200);
    saveJSON(KB_EXTRA, a);
    return true;
  }

  function stats() {
    return { version: VER, kb: KB.length, extra: extraKB().length, offline: true, gpu: false, internet: false };
  }

  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>Offline Brain · v' + VER + '</h2>' +
      '<p class="muted">Без интернета и GPU. База + синтез. «В базу» — выучить факт.</p>' +
      '<pre id="brSt" class="out">' + JSON.stringify(stats(), null, 2) + '</pre>' +
      '<textarea id="brIn" placeholder="Вопрос offline…" style="margin-top:10px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="brAsk">Спросить</button>' +
      '<button type="button" class="btn" id="brTeach">В базу</button></div>' +
      '<pre id="brOut" class="out" style="margin-top:10px;max-height:240px">—</pre></div>';
    document.getElementById("brAsk").onclick = function () {
      var r = complete(document.getElementById("brIn").value);
      document.getElementById("brOut").textContent = r.text + "\n\n[" + r.meta + "]";
    };
    document.getElementById("brTeach").onclick = function () {
      teach(document.getElementById("brIn").value);
      document.getElementById("brSt").textContent = JSON.stringify(stats(), null, 2);
      document.getElementById("brOut").textContent = "Добавлено в offline-базу.";
    };
  }

  global.AKSI_BRAIN = {
    version: VER, complete: complete, retrieve: retrieve, teach: teach, stats: stats, mount: mount, KB_SIZE: KB.length,
  };
})(typeof window !== "undefined" ? window : this);
