/**
 * AKSI Brain — offline knowledge + plain answers
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.2.0-brain";
  var KB_EXTRA = "aksi:brain:kb:v1";
  var KB = [
    { t: "акси aksi кто ты", a: "Я АКСИ — ваш помощник в браузере. Отвечаю на вопросы, могу запомнить заметки и прочитать текст с фото. Данные остаются у вас на устройстве. Контакт: aksilove@internet.ru" },
    { t: "миссия aksi суверенность", a: "Миссия АКСИ: цифровой суверенитет — ваши данные и рассуждения без обязательной облачной привязки." },
    { t: "что такое ии искусственный интеллект", a: "ИИ — программы, которые помогают с языком, зрением, поиском. АКСИ — помощник в браузере; «большую» модель можно подключить через Ollama на вашем компьютере." },
    { t: "local first офлайн приватность", a: "По умолчанию АКСИ работает без отправки ваших сообщений на чужие серверы. Память хранится в этом браузере." },
    { t: "ollama модель llm", a: "Ollama — программа на вашем ПК. Установите с ollama.com, затем: ollama pull llama3.2. Для фото: ollama pull llava. Подключение — во вкладке Настройки." },
    { t: "фото ocr vision", a: "Кнопка 📷 или вкладка Фото: АКСИ читает текст с картинки. Если есть llava — может описать, что на снимке." },
    { t: "память запомни", a: "Напишите «запомни: ваш факт» — АКСИ сохранит в локальную память. Посмотреть — вкладка Память." },
  ];
  function loadJSON(k, fb) {
    try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? fb : v; } catch (e) { return fb; }
  }
  function saveJSON(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function extraKB() { var a = loadJSON(KB_EXTRA, []); return Array.isArray(a) ? a : []; }
  function allKB() { return KB.concat(extraKB()); }
  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, " ").replace(/\s+/g, " ").trim(); }
  function score(q, e) {
    var qw = norm(q).split(" ").filter(Boolean);
    var tw = norm(e.t + " " + e.a).split(" ");
    if (!qw.length) return 0;
    var hit = 0;
    qw.forEach(function (w) { if (tw.indexOf(w) !== -1 || norm(e.t).indexOf(w) !== -1) hit++; });
    return hit / qw.length;
  }
  function retrieve(q, n) {
    n = n || 3;
    return allKB().map(function (e) { return { e: e, s: score(q, e) }; })
      .filter(function (x) { return x.s > 0.15; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, n);
  }
  function personaFallback(q) {
    var low = String(q || "").toLowerCase().trim();
    if (/^(привет|здравств|добрый|hello|hi)\b/.test(low))
      return "Привет! Я АКСИ — помощник прямо в браузере. Напишите вопрос или нажмите 📷 для фото.";
    if (/кто ты|что ты/.test(low))
      return "Я АКСИ — локальный помощник. Работаю без обязательного интернета, храню память у вас на устройстве. Для более умных ответов подключите Ollama в Настройках.";
    if (/что умеешь|помощь|help|функци/.test(low))
      return "Умею: отвечать на вопросы, запоминать («запомни: …»), читать текст с фото, проверять ответы. Откройте вкладку «Помощь» — там всё по шагам.";
    if (/время|который час/.test(low)) {
      try {
        return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", dateStyle: "medium", timeStyle: "short" }).format(new Date()) + " (Москва)";
      } catch (e) { return new Date().toLocaleString("ru-RU"); }
    }
    return null;
  }
  function complete(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Напишите вопрос.", meta: "brain·empty", offline: true };
    var persona = personaFallback(q);
    if (persona && /^(привет|кто ты|что умеешь|время|помощь|help)/i.test(norm(q).slice(0, 32)))
      return { text: persona, meta: "brain·persona", offline: true };
    var hits = retrieve(q, 2);
    if (hits.length && hits[0].s >= 0.35)
      return { text: hits[0].e.a, meta: "brain·kb", offline: true, score: hits[0].s };
    if (hits.length && hits[0].s >= 0.2)
      return { text: hits[0].e.a, meta: "brain·kb·weak", offline: true, score: hits[0].s, weak: true };
    if (persona) return { text: persona, meta: "brain·persona", offline: true };
    return {
      text: "Пока нет точного ответа в локальной базе. Попробуйте переформулировать, напишите «запомни: факт» или подключите Ollama в Настройках.",
      meta: "brain·fallback", offline: true, weak: true,
    };
  }
  function teach(text) {
    text = String(text || "").trim();
    if (text.length < 3) return false;
    var extra = extraKB();
    extra.push({ t: text.slice(0, 80), a: text });
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
      '<div class="card"><h2>Локальные знания</h2>' +
      '<p class="muted">Ответы без интернета · база ' + KB.length + '+</p>' +
      '<textarea id="brIn" placeholder="Вопрос или факт…"></textarea>' +
      '<div class="row"><button type="button" class="btn primary" id="brAsk">Спросить</button>' +
      '<button type="button" class="btn" id="brTeach">Выучить</button></div>' +
      '<pre class="out" id="brOut">—</pre></div>';
    document.getElementById("brAsk").onclick = function () {
      var r = complete(document.getElementById("brIn").value);
      document.getElementById("brOut").textContent = r.text + "\n\n[" + r.meta + "]";
    };
    document.getElementById("brTeach").onclick = function () {
      var ok = teach(document.getElementById("brIn").value);
      document.getElementById("brOut").textContent = ok ? "Сохранила в память знаний." : "Слишком коротко.";
    };
  }
  G.AKSI_BRAIN = { version: VER, complete: complete, retrieve: retrieve, teach: teach, stats: stats, mount: mount };
})(typeof window !== "undefined" ? window : this);
