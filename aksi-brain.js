/**
 * AKSI BRAIN — Offline Language Engine v1.1
 * Без интернета · без GPU · CPU/JS only
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (global) {
  "use strict";
  var VER = "1.1.0-offline";
  var HIST_KEY = "aksi:brain:hist:v1";
  var KB_EXTRA = "aksi:brain:kb:v1";
  var KB = [
    { t: "акси aksi кто ты", a: "Я АКСИ — суверенный local-first Decision Integrity Runtime. В браузере: Brain, Quantum, Trust, Overlay AOP/1, DKV, proof-ledger. Данные остаются у вас. Контакт: aksilove@internet.ru." },
    { t: "миссия aksi суверенность", a: "Миссия АКСИ: цифровой суверенитет — идентичность, память и рассуждение без обязательной облачной привязки. Целостность (proof) важнее «магии» чужого API." },
    { t: "eqs метрики формула", a: "EQS ≈ 0.30·H + 0.35·rel + 0.25·coh + 0.10·age. Формула продукта: AKSI = (A×I×S)×(1+0.4√n). H — энтропия Шеннона ответа." },
    { t: "proof ledger цепочка хеш", a: "Proof ledger — append-only цепочка SHA/FNV-хешей. Подмена записи ломает prev. Это аудит целостности диалога, не токен-блокчейн." },
    { t: "trust compiler доверие", a: "Trust Compiler проверяет ответы: политики, аномалии, attestation. При пороге срабатывает safe-mode (self-obsolescence), пока не сбросите во вкладке Trust." },
    { t: "quantum квантовый симулятор qcli", a: "Quantum Engine — state-vector 1–8 кубитов в JS: H,X,Y,Z,CNOT, Rx/Ry/Rz, shots, Bloch, CHSH. LIVE делает shot перед ответом; QCLI/resonance — метрики резонанса." },
    { t: "overlay сеть aop net", a: "Overlay AOP/1 — слой поверх интернета: L0 BroadcastChannel, L1 WebSocket relay, L2 WebRTC. Конверты с prev-hash. Не замена TCP/IP, а агентский fabric." },
    { t: "dkv верификатор документ", a: "DKV режет текст на утверждения, хеширует, сверяет с локальной базой фактов, рисует граф (confirmed/refuted/unknown). Для юристов и фактчекеров offline-first." },
    { t: "p2p peer mesh комната", a: "P2P/Mesh: комнаты PeerJS + local bus. Текст чата может идти data-channel. Нужен STUN/TURN за NAT; L0 работает без сервера в одной вкладке." },
    { t: "ollama локальная модель llm", a: "Опционально: Ollama на 127.0.0.1:11434. Без Ollama работает Brain offline." },
    { t: "что такое ии искусственный интеллект", a: "ИИ — системы, решающие задачи, раньше требовавшие ума: язык, зрение, планирование. Чаще статистические модели на данных, а не сознание. АКСИ — runtime + integrity, не «облачный оракул»." },
    { t: "машинное обучение нейросеть", a: "ML — подгонка параметров под данные. Нейросеть — слои; обучение градиентами. Малые модели и retrieval работают на CPU без GPU — так устроен Brain." },
    { t: "квантовая физика кубит запутанность", a: "Кубит: суперпозиция |0⟩+|1⟩. Запутанность связывает системы. Симулятор АКСИ классический (state-vector), не квантовое железо." },
    { t: "теория относительности эйнштейн", a: "СТО: c постоянна в инерциальных системах. ОТО: гравитация = кривизна пространства-времени. GPS учитывает релятивистские поправки." },
    { t: "эволюция дарвин отбор", a: "Естественный отбор: изменчивость + наследственность + отбор. ДНК — носитель наследственности у земной жизни." },
    { t: "вселенная космос большой взрыв", a: "Вселенная расширяется; CMB — след ранней эпохи. Тёмная материя и энергия — рабочие гипотезы наблюдательной космологии." },
    { t: "климат парниковый co2", a: "Парниковые газы удерживают тепло. Рост CO₂ связан с антропогенным потеплением. Климат — долгосрочная статистика погоды." },
    { t: "криптография подпись ed25519", a: "Цифровая подпись доказывает авторство без раскрытия ключа. В браузере: Web Crypto. Приватный ключ не должен покидать устройство." },
    { t: "local first офлайн приватность", a: "Local-first: сначала локальное хранилище, сеть — опция. АКСИ отвечает offline из Brain; облако не обязательно." },
    { t: "контакт почта email", a: "Публичный контакт: aksilove@internet.ru · X @AKSILOVE." },
    { t: "b2b продукт лицензия enterprise", a: "Коммерческий угол: Decision Integrity Platform — runtime + protocol IP. /product/ на сайте." },
    { t: "demo команды whoami", a: "В чате: /demo — список; whoami — DID. Вкладки Quantum, Net, Trust, Whole — лаборатория модулей." },
    { t: "память запомни выучи", a: "Команды: «запомни: факт», «что ты помнишь», «забудь всё». Память в localStorage." },
    { t: "время час msk", a: "Время в шапке (MSK). Спросите «время» в чате." },
    { t: "github pages деплой", a: "Сайт: milana808.github.io. Статика + cache-bust. Relay/TURN — отдельный VPS." },
    { t: "безопасность safe mode", a: "При аномалиях Trust может включить safe-mode. Сброс — вкладка Trust." },
    { t: "спасибо", a: "Пожалуйста. Команда «запомни: …» пишет в память и offline-базу." },
  ];
  function norm(s) {
    return String(s || "").toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/gi, " ").replace(/\s+/g, " ").trim();
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
    var et = tokens(entry.t + " " + (entry.a || "").slice(0, 80));
    if (!queryTok.length || !et.length) return 0;
    var set = {}; et.forEach(function (w) { set[w] = 1; });
    var hit = 0;
    queryTok.forEach(function (w) { if (set[w]) hit++; });
    return hit / queryTok.length * 0.7 + (hit / Math.sqrt(et.length)) * 0.3;
  }
  function retrieve(q, topN) {
    var qt = tokens(q);
    return allKB().map(function (e) { return { e: e, s: score(qt, e) }; })
      .filter(function (x) { return x.s > 0.12; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, topN || 3);
  }
  function tryMath(q) {
    var m = String(q).replace(/\s/g, "").match(/^(\d+(?:[.,]\d+)?)\s*([+\-*/×÷])\s*(\d+(?:[.,]\d+)?)\s*\??$/);
    if (!m) return null;
    var a = parseFloat(m[1].replace(",", ".")), b = parseFloat(m[3].replace(",", ".")), op = m[2], r = null;
    if (op === "+") r = a + b;
    else if (op === "-") r = a - b;
    else if (op === "*" || op === "×") r = a * b;
    else if ((op === "/" || op === "÷") && b !== 0) r = a / b;
    if (r == null || !isFinite(r)) return null;
    return a + " " + op + " " + b + " = " + (Math.round(r * 1e8) / 1e8);
  }
  function mskNow() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "medium", timeStyle: "medium" }).format(new Date()) + " (MSK)";
    } catch (e) { return new Date().toISOString(); }
  }
  function synthesize(q, hits) {
    if (!hits || !hits.length) return null;
    var best = hits[0];
    if (best.s < 0.18) return null;
    var text = best.e.a;
    if (hits.length > 1 && hits[1].s > 0.22) text += "\n\nЕщё: " + hits[1].e.a.slice(0, 180) + (hits[1].e.a.length > 180 ? "…" : "");
    return text;
  }
  function personaFallback(q) {
    var low = norm(q);
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет. Я АКСИ Brain — offline без GPU. Спросите о модулях, науке или «запомни: факт». Вкладки: Quantum · Trust · Net · Whole.";
    if (/кто ты|что ты/.test(low))
      return "Локальный мозг АКСИ: retrieval + синтез. Не облачный GPT. Большая модель — опционально Ollama на вашем ПК.";
    if (/что умеешь|помощь|help|функци/.test(low))
      return "Offline: база знаний, арифметика, память. Pipeline: Quantum → Brain → Trust. Сеть: Overlay/P2P. Документы: DKV. Команда /demo в чате.";
    if (/время|час|time/.test(low)) return "Сейчас: " + mskNow();
    if (/gpu|offline|без интернета/.test(low))
      return "Да: Brain работает без интернета и без GPU. Ollama/облако — только если вы явно подключите.";
    return null;
  }
  function tryNeuro(q) {
    try {
      if (!global.AKSI_NEURO || typeof global.AKSI_NEURO.generate !== "function") return null;
      var g = global.AKSI_NEURO.generate(q, 48, 0.55);
      if (g && String(g).trim().length > 12) return String(g).trim();
    } catch (e) {}
    return null;
  }
  function pushHist(role, content) {
    var h = loadJSON(HIST_KEY, []);
    if (!Array.isArray(h)) h = [];
    h.push({ role: role, content: String(content).slice(0, 500), ts: Date.now() });
    saveJSON(HIST_KEY, h.slice(-40));
  }
  function complete(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос.", meta: "brain", offline: true };
    var math = tryMath(q);
    if (math) return { text: math, meta: "brain·math", offline: true };
    var persona = personaFallback(q);
    if (persona && /^(привет|кто ты|что умеешь|время|gpu|offline|помощь|help)/i.test(norm(q).slice(0, 28)))
      return { text: persona, meta: "brain·persona", offline: true };
    if (persona && /время|час/.test(norm(q))) return { text: persona, meta: "brain·time", offline: true };
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
        return { text: ng, meta: "brain·neuro", offline: true };
      }
    }
    if (persona) return { text: persona, meta: "brain·persona", offline: true };
    return {
      text: "В offline-базе нет точного совпадения.\n· переформулируйте\n· «запомни: …»\n· вкладка Whole / Brain",
      meta: "brain·fallback", offline: true,
    };
  }
  function teach(text) {
    text = String(text || "").trim();
    if (text.length < 8) return false;
    var extra = extraKB();
    extra.push({ t: text.slice(0, 120).toLowerCase(), a: text.slice(0, 800) });
    saveJSON(KB_EXTRA, extra.slice(-80));
    return true;
  }
  function stats() {
    return { version: VER, kb: KB.length, extra: extraKB().length, offline: true };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>AKSI Brain · v' + VER + '</h2>' +
      '<p class="muted">Offline retrieval · KB ' + KB.length + '+</p>' +
      '<textarea id="brIn" placeholder="Вопрос offline…"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="brAsk">Спросить</button>' +
      '<button type="button" class="btn" id="brTeach">Выучить</button></div>' +
      '<pre id="brOut" class="out">—</pre></div>';
    document.getElementById("brAsk").onclick = function () {
      var r = complete(document.getElementById("brIn").value);
      document.getElementById("brOut").textContent = r.text + "\n[" + r.meta + "]";
    };
    document.getElementById("brTeach").onclick = function () {
      var ok = teach(document.getElementById("brIn").value);
      document.getElementById("brOut").textContent = ok ? "Выучила в local KB." : "Слишком коротко.";
    };
  }
  global.AKSI_BRAIN = {
    version: VER, complete: complete, retrieve: retrieve, teach: teach, stats: stats, mount: mount, KB_SIZE: KB.length,
  };
})(typeof window !== "undefined" ? window : this);
