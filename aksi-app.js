(function () {
  "use strict";

  if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
      var el = this;
      while (el && el.nodeType === 1) {
        if (el.matches ? el.matches(s) : (el.msMatchesSelector && el.msMatchesSelector(s))) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }

  var MEM_KEY = "aksi_whole_mem_v3";
  var LEDGER_KEY = "aksi_whole_ledger_v2";
  var DID_KEY = "aksi_did_fp_v2";
  var SEED_KEY = "aksi_core_seeded_v3";
  var busy = false;
  var PROTO = { protocol: "AKSI-Agent-v1", msgCount: 0, lastEnvelope: null };
  var edgeCache = {};
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var BIRTH_YEAR = 1995;

  var CORE = [
    "АКСИ — суверенный цифровой напарник и агентный слой. Offline-first: память и решения на устройстве пользователя.",
    "Протокол AKSI-Agent-v1: handshake, envelope, fingerprint, DID (did:aksi:…). Сообщения подписываются локально.",
    "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age. H — энтропия Шеннона текста; age связан с годом 1995.",
    "QCLI — нормированная энтропия (0…1). H_eff = H × (уникальные слова / все слова).",
    "Формула роста: AKSI = (A×I×S)×(1+0.4√n), где A/I/S — внимание, интеллект, структура; n — опыт/события.",
    "Цепочка решений (ledger): append-only, prev_hash, verify. Каждое важное действие попадает в ledger.",
    "Edge AI Accelerator: intent → retrieve → compose → metrics → ledger. Кэш на устройстве.",
    "Квант: локальный симулятор Bell |Φ+⟩ и суперпозиции |+⟩ (RNG, не физический квантовый компьютер).",
    "Память: localStorage. Команды: запомни: факт · что ты помнишь · забудь всё. Экспорт JSON.",
    "Платформа: milana808.github.io (MATRIX), Milana-backend (API), aksi_apps. Публичный контакт: aksilove@internet.ru · @AKSILOVE",
    "ADIA — алгоритм целостности решений. Resonance Field + DIMAX v3 — индикаторы резонанса в UI.",
    "Создатель: Альфия (MILANA808). Год опоры формулы: 1995. GitHub: MILANA808.",
    "Голос: Web Speech API, язык ru-RU. Нажми микрофон и говори.",
    "Вкладки: Чат · Учить · Память · Метрики · Квант · Цепочка · Протокол · Edge · О себе.",
    "Бэкап: вкладка О себе → Полный бэкап (память + ledger + DID + протокол)."
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    s = String(s == null ? "" : s);
    return s.replace(/&/g, "&" + "amp;").replace(/</g, "&" + "lt;").replace(/>/g, "&" + "gt;").replace(/"/g, "&" + "quot;");
  }
  function shannonH(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var freq = {}, n = text.length, h = 0, c, p, i;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return Math.round(h * 10000) / 10000;
  }
  function qcli(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var h = shannonH(text), uniq = {}, i;
    for (i = 0; i < text.length; i++) uniq[text.charAt(i)] = 1;
    var alph = Math.min(256, Object.keys(uniq).length);
    var maxH = Math.log(Math.max(2, alph)) / Math.LN2;
    return maxH ? Math.min(1, Math.round((h / maxH) * 10000) / 10000) : 0;
  }
  function heff(text) {
    text = String(text || "").trim();
    if (!text) return 0;
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var set = {}, i;
    for (i = 0; i < words.length; i++) set[words[i].toLowerCase()] = 1;
    return Math.round(shannonH(text) * (Object.keys(set).length / words.length) * 1000) / 1000;
  }
  function ageFactor() {
    var y = new Date().getFullYear();
    var span = Math.max(1, y - BIRTH_YEAR);
    return Math.min(1, Math.round((span / 40) * 1000) / 1000);
  }
  function eqs(text) {
    var H = shannonH(text || "");
    var hN = Math.min(1, H / 5);
    var reliability = 0.88, coherence = 0.82, age = ageFactor();
    var raw = 0.30 * hN * 100 + 0.35 * reliability * 100 + 0.25 * coherence * 100 + 0.10 * age * 100;
    return Math.round(raw * 10) / 10;
  }
  function quantumFingerprint(text) {
    var h = 0xDEADBEEF | 0, i;
    for (i = 0; i < String(text).length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }
  function quantumLevel(q) {
    if (q >= 0.90) return "Квантовый Провидец";
    if (q >= 0.80) return "Квантовый Архитектор";
    if (q >= 0.70) return "Квантовое Единство";
    if (q >= 0.60) return "Пробуждённое";
    if (q >= 0.50) return "Резонансное";
    return "Базовое";
  }
  function eqsBadge(e) {
    if (e >= 85) return "Архитектор";
    if (e >= 75) return "Квант";
    if (e >= 65) return "Сознание";
    if (e >= 55) return "Резонанс";
    return "База";
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function ensureDid() {
    var d = localStorage.getItem(DID_KEY);
    if (d) return d;
    var seed = "aksi-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    d = "did:aksi:" + simpleHash(seed + navigator.userAgent) + simpleHash(seed).slice(0, 8);
    try { localStorage.setItem(DID_KEY, d); } catch (e) {}
    return d;
  }
  function getMSK() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (e) { return new Date().toLocaleTimeString("ru-RU"); }
  }
  function getMSKFull() {
    try {
      return new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
    } catch (e) { return new Date().toLocaleString("ru-RU"); }
  }
  function createHandshake() {
    var nonce = simpleHash(String(Date.now()) + Math.random()).toUpperCase();
    return {
      protocol: "AKSI-Agent-v1",
      from: ensureDid(),
      capabilities: ["natural_language", "quantum_metrics", "memory", "edge", "ledger", "signing", "wiki"],
      publicKey: "local-fp-" + quantumFingerprint(ensureDid()),
      nonce: nonce,
      signature: simpleHash(nonce + ensureDid() + RESONANCE_SEED).toUpperCase(),
      timestamp: new Date().toISOString()
    };
  }
  function createEnvelope(to, type, content) {
    var now = new Date().toISOString();
    var fp = quantumFingerprint(content + ":" + now);
    var id = simpleHash(now + Math.random()).toUpperCase().slice(0, 12);
    var msg = {
      id: id, from: ensureDid(), to: to || "broadcast", type: type || "response",
      content: String(content || "").slice(0, 2000),
      metadata: {
        timestamp: now, mode: "aksi", language: "ru",
        qcli: qcli(content), eqs: eqs(content),
        signature: simpleHash(id + ":" + content + ":" + now + RESONANCE_SEED).toUpperCase(),
        fingerprint: fp
      }
    };
    PROTO.msgCount++;
    PROTO.lastEnvelope = msg;
    return msg;
  }
  function loadMem() {
    try {
      var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]");
      return Array.isArray(a) ? a.filter(function (x) { return x && x.t; }) : [];
    } catch (e) { return []; }
  }
  function saveMem(a) {
    try { localStorage.setItem(MEM_KEY, JSON.stringify(a.slice(0, 800))); } catch (e) {}
    renderMem();
  }
  function addFact(t, src) {
    t = String(t || "").trim();
    if (!t || t.length > 2000) return false;
    var a = loadMem(), low = t.toLowerCase(), i;
    for (i = 0; i < a.length; i++) {
      if (a[i].t.toLowerCase() === low) { a.splice(i, 1); break; }
    }
    a.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), t: t, ts: Date.now(), src: src || "user" });
    saveMem(a);
    return true;
  }
  function seedCore() {
    try {
      if (localStorage.getItem(SEED_KEY) === "1") return;
      var a = loadMem();
      var have = {};
      a.forEach(function (x) { have[x.t.toLowerCase()] = 1; });
      CORE.forEach(function (f) {
        if (!have[f.toLowerCase()]) a.push({ id: "core_" + simpleHash(f).slice(0, 8), t: f, ts: Date.now(), src: "core" });
      });
      saveMem(a);
      localStorage.setItem(SEED_KEY, "1");
    } catch (e) {}
  }
  function renderMem() {
    var a = loadMem();
    if ($("memN")) $("memN").textContent = String(a.length);
    var list = $("memList");
    if (!list) return;
    if (!a.length) { list.innerHTML = "<p class='muted'>Пусто. Напиши: запомни: …</p>"; return; }
    list.innerHTML = a.map(function (x) {
      var tag = x.src === "core" ? " · ядро" : "";
      return "<div class='fact'><button type='button' data-del='" + esc(x.id) + "'>×</button>" + esc(x.t) + "<span style='opacity:.5;font-size:10px'>" + tag + "</span></div>";
    }).join("");
  }
  function loadLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveLedger(a) {
    try { localStorage.setItem(LEDGER_KEY, JSON.stringify(a.slice(-250))); } catch (e) {}
  }
  function appendLedger(type, payload, eqsV) {
    var chain = loadLedger();
    var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
    var body = { type: type, ts: Date.now(), prev: prev, eqs: eqsV, fp: quantumFingerprint(JSON.stringify(payload)), payload: payload };
    body.hash = simpleHash(JSON.stringify(body));
    body.id = "e" + chain.length + "_" + body.hash;
    chain.push(body);
    saveLedger(chain);
    return body;
  }
  function verifyLedger() {
    var chain = loadLedger();
    if (!chain.length) return { ok: true, msg: "пусто" };
    var i, e, expect;
    for (i = 0; i < chain.length; i++) {
      e = chain[i];
      expect = i === 0 ? "GENESIS" : chain[i - 1].hash;
      if (e.prev !== expect) return { ok: false, msg: "разрыв #" + i };
      if (!e.hash) return { ok: false, msg: "нет hash #" + i };
    }
    return { ok: true, msg: "OK · " + chain.length + " событий" };
  }
  var STOP = { "и": 1, "в": 1, "не": 1, "на": 1, "я": 1, "с": 1, "что": 1, "а": 1, "то": 1, "как": 1, "это": 1, "по": 1, "из": 1, "у": 1, "за": 1, "от": 1, "the": 1, "a": 1, "is": 1, "to": 1, "of": 1, "and": 1, "in": 1, "для": 1, "или": 1, "но": 1, "же": 1, "бы": 1, "ли": 1 };
  function stem(w) {
    w = w.toLowerCase();
    if (w.length < 5) return w;
    var ends = ["ями", "ами", "ов", "ев", "ом", "ем", "ах", "ию", "ью", "ия", "ья", "ие", "ый", "ий", "ой", "ая", "ое", "ые", "ать", "ять", "ить"];
    var i, e;
    for (i = 0; i < ends.length; i++) {
      e = ends[i];
      if (w.length - e.length >= 3 && w.slice(-e.length) === e) return w.slice(0, -e.length);
    }
    return w;
  }
  function tokens(s) {
    return String(s).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]+/g, " ").split(/\s+/).map(stem).filter(function (w) { return w.length > 1 && !STOP[w]; });
  }
  function retrieve(q) {
    var qt = tokens(q), qset = {}, hits = [], i, j, low = q.toLowerCase();
    for (i = 0; i < qt.length; i++) qset[qt[i]] = 1;
    var mem = loadMem();
    for (i = 0; i < mem.length; i++) {
      var tt = tokens(mem[i].t), sc = 0;
      for (j = 0; j < tt.length; j++) if (qset[tt[j]]) sc++;
      if (tt.length) sc += sc / tt.length * 0.4;
      if (low.length > 3 && mem[i].t.toLowerCase().indexOf(low) !== -1) sc += 3;
      if (mem[i].src === "core") sc += 0.3;
      if (sc > 0) hits.push({ text: mem[i].t, score: sc + 1, src: mem[i].src });
    }
    for (i = 0; i < CORE.length; i++) {
      var ct = tokens(CORE[i]), sc2 = 0;
      for (j = 0; j < ct.length; j++) if (qset[ct[j]]) sc2++;
      if (sc2 > 0) hits.push({ text: CORE[i], score: sc2 + 0.5, src: "core" });
    }
    hits.sort(function (a, b) { return b.score - a.score; });
    var seen = {}, uniq = [];
    for (i = 0; i < hits.length; i++) {
      if (seen[hits[i].text]) continue;
      seen[hits[i].text] = 1;
      uniq.push(hits[i]);
    }
    return uniq;
  }
  function answerKB(q) {
    var low = q.toLowerCase().trim();
    if (/^(привет|здравств|добрый|hello|hi|салют)\b/.test(low)) return "Привет. На связи · " + getMSK() + " МСК.\nЯ АКСИ — спрашивай о протоколе, метриках, памяти или мире.";
    if (/кто ты|что ты|расскажи о себе|who are you|ты акси|о себе/.test(low)) return "Я АКСИ — суверенный цифровой напарник.\n\n• Agent-v1 · EQS/QCLI · память на устройстве\n• Edge · цепочка решений · квант\n• Создатель: Альфия (MILANA808) · опора формулы: 1995\n• Контакт: aksilove@internet.ru · @AKSILOVE\n\nДанные только у тебя. Научи меня: запомни: …";
    if (/что умеешь|что можешь|возможност|функци|help|помощь|команды/.test(low)) return "Умею:\n• чат и обучение — запомни: факт\n• EQS · QCLI · H · H_eff (вкладка Метрики)\n• Agent-v1 handshake / envelope / DID\n• цепочка решений (ledger) + verify\n• квант Bell / суперпозиция\n• Edge pipeline\n• голос · полный бэкап\n• поиск Wikipedia: wiki: тема или что такое …\n• что ты помнишь · забудь всё";
    if (/альфия|создател|автор|milana808|кто сделал/.test(low)) return "Создатель АКСИ — Альфия (MILANA808).\nГод опоры в формуле age: 1995.\nРепозитории: milana808.github.io · Milana-backend.\nПубличный контакт: aksilove@internet.ru · @AKSILOVE";
    if (/формул|adia|рост|aksi\s*=/.test(low)) return "Формула: AKSI = (A×I×S)×(1+0.4√n)\nA — внимание · I — интеллект · S — структура · n — опыт.\nADIA — алгоритм целостности решений.\nEQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age (age от 1995).";
    if (/протокол|agent-v1|handshake|envelope|did/.test(low)) return "AKSI-Agent-v1:\n• handshake — приветствие агентов\n• envelope — подписанное сообщение\n• fingerprint / DID — идентичность\n• signature на RESONANCE_SEED\nОткрой вкладку Протокол и нажми Handshake.";
    if (/метрик|eqs|qcli|энтропи|h_eff|shannon/.test(low)) return "EQS = 0.30·H + 0.35·rel + 0.25·coh + 0.10·age\nQCLI — нормированная энтропия 0…1\nH — Shannon entropy · H_eff — с учётом уникальных слов\nage = f(год − 1995)\nВкладка Метрики — вставь любой текст.";
    if (/квант|bell|суперпоз|кубит|qubit/.test(low)) return "Локальный квантовый симулятор:\n• Bell |Φ+⟩ — корреляции\n• |+⟩ — суперпозиция\nНе облако, только RNG на устройстве.\nВкладка Квант.";
    if (/edge|ускор|pipeline/.test(low)) return "Edge AI Accelerator:\nintent → retrieve (память) → compose → metrics → ledger\nКэш запросов на устройстве.\nВкладка Edge → Прогнать.";
    if (/цепочк|ledger|proof|хэш|hash/.test(low)) return "Цепочка решений: append-only ledger.\nКаждое событие: type · prev_hash · eqs · fingerprint.\nverify проверяет целостность.\nВкладка Цепочка.";
    if (/памят|запомн|учить|обуч/.test(low) && !/что ты (знаешь|помнишь)/.test(low)) return "Память на устройстве (localStorage).\n• запомни: важный факт\n• что ты помнишь\n• забудь всё\nВкладки Учить и Память · экспорт JSON.";
    if (/время|который час|дата|сегодня/.test(low)) return getMSKFull() + " (MSK)";
    if (/контакт|почта|email|связь|написать/.test(low)) return "aksilove@internet.ru · X @AKSILOVE\nПубличный контакт проекта АКСИ.";
    if (/резонанс|dimax|resonance/.test(low)) return "Resonance Field + DIMAX v3 — слой резонанса в UI.\nSeed: Alfiya_AKSI_DIMAX_v3_2026 (клиентские подписи).";
    if (/бэкап|export|экспорт|backup/.test(low)) return "Полный бэкап: вкладка О себе → Полный бэкап.\nВ файл: факты, ledger, DID, счётчик протокола.";
    if (/оффлайн|offline|без.?интернет|локальн/.test(low)) return "Я offline-first: чат, память, метрики, квант, ledger, протокол работают без сети.\nСеть нужна только для wiki-поиска (Wikipedia API).";
    if (/github|репозитор|сайт|matrix/.test(low)) return "Сайт: milana808.github.io\nBackend: Milana-backend\nАгент: /aksi.html\nMATRIX / quantum / hub — лаборатории на том же домене.";
    return null;
  }
  function intent(q) {
    var low = q.toLowerCase().trim();
    if (/^(запомни|выучи)\s*[:\s]/.test(low)) return "teach";
    if (/забудь всё|очисти память/.test(low)) return "wipe";
    if (/что ты знаешь|что помнишь|покажи память/.test(low)) return "list";
    if (/^wiki\s*[:\s]/.test(low) || /^что такое\s+/.test(low) || /^кто такой\s+/.test(low)) return "wiki";
    if (/метрик|eqs|qcli/.test(low) && low.length < 40) return "metrics";
    if (/^(квант|bell|суперпоз)/.test(low)) return "quantum";
    if (/цепочк|ledger|proof/.test(low) && low.length < 40) return "proof";
    if (/протокол|handshake|envelope/.test(low) && low.length < 40) return "protocol";
    if (/^edge|ускор/.test(low) && low.length < 30) return "edge";
    return "ask";
  }
  function wikiQuery(q) {
    var low = q.toLowerCase().trim();
    var m = low.match(/^wiki\s*[:\s]+(.+)/) || low.match(/^что такое\s+(.+)/) || low.match(/^кто такой\s+(.+)/);
    return m ? m[1].trim() : q.trim();
  }
  function fetchWiki(term, cb) {
    var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(term);
    var t = setTimeout(function () { cb(null); }, 6000);
    try {
      fetch(url, { headers: { Accept: "application/json" } })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          clearTimeout(t);
          if (!j || !j.extract) { cb(null); return; }
          var title = j.title || term;
          var extract = String(j.extract).slice(0, 600);
          cb(title + "\n\n" + extract + (j.content_urls && j.content_urls.desktop ? "\n\n→ " + j.content_urls.desktop.page : ""));
        })
        .catch(function () { clearTimeout(t); cb(null); });
    } catch (e) { clearTimeout(t); cb(null); }
  }
  function answer(q) {
    q = String(q || "").trim();
    if (!q) return "";
    var it = intent(q);
    if (it === "teach") {
      var raw = q.replace(/^(запомни|выучи)\s*[:\s]*/i, "").trim();
      if (!raw) return "Формат: запомни: факт";
      addFact(raw, "user");
      var e = eqs(raw);
      appendLedger("remember", { fact: raw.slice(0, 120) }, e);
      createEnvelope("self", "announce", "remember:" + raw.slice(0, 40));
      return "Запомнила.\n«" + raw + "»\nEQS ≈ " + e + " · fp " + quantumFingerprint(raw).slice(0, 8);
    }
    if (it === "wipe") { saveMem([]); try { localStorage.removeItem(SEED_KEY); } catch (e) {} seedCore(); return "Память очищена. Ядро знаний восстановлено."; }
    if (it === "list") {
      var a = loadMem().filter(function (x) { return x.src !== "core"; });
      var coreN = loadMem().filter(function (x) { return x.src === "core"; }).length;
      if (!a.length) return "Пользовательских фактов нет. Ядро: " + coreN + ".\nНапиши: запомни: …";
      return "Помню (" + a.length + " + ядро " + coreN + "):\n\n" + a.slice(0, 20).map(function (x, i) { return (i + 1) + ". " + x.t; }).join("\n");
    }
    if (it === "metrics") { showTab("metrics"); return "Метрики открыты. Вставь текст и нажми Посчитать."; }
    if (it === "quantum") { showTab("quantum"); return "Квант открыт — Bell или Суперпозиция."; }
    if (it === "proof") { showTab("proof"); return "Цепочка: " + verifyLedger().msg; }
    if (it === "protocol") { showTab("protocol"); refreshProtocol(); return "AKSI-Agent-v1 · DID " + ensureDid().slice(0, 22) + "…"; }
    if (it === "edge") { showTab("edge"); return "Edge открыт. Нажми Прогнать."; }
    if (it === "wiki") return "__WIKI__";
    var kb = answerKB(q);
    if (kb) return kb;
    var hits = retrieve(q);
    if (hits.length && hits[0].score >= 1.2) {
      if (hits.length === 1) return hits[0].text;
      return hits.slice(0, 5).map(function (h, i) { return (i + 1) + ". " + h.text; }).join("\n");
    }
    return "__FALLBACK__";
  }
  function updateStatus(sample) {
    var e = eqs(sample || "АКСИ");
    var q = qcli(sample || "АКСИ");
    if ($("stEqs")) $("stEqs").textContent = String(e);
    if ($("stQ")) $("stQ").textContent = q.toFixed(2);
    if ($("stBadge")) $("stBadge").textContent = eqsBadge(e);
    var logo = $("logoPulse");
    if (logo) { if (e >= 70) logo.classList.add("pulse"); else logo.classList.remove("pulse"); }
  }
  function tickClock() { if ($("stClock")) $("stClock").textContent = "MSK " + getMSK(); }
  function showTab(name) {
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("on"); });
    document.querySelectorAll("nav button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-tab") === name); });
    var el = $("tab-" + name);
    if (el) el.classList.add("on");
    if (name === "mem") renderMem();
    if (name === "proof") {
      var v = verifyLedger();
      if ($("pOut")) $("pOut").textContent = v.msg + "\n\n" + JSON.stringify(loadLedger().slice(-6), null, 2);
    }
    if (name === "protocol") refreshProtocol();
    if (name === "edge") {
      if ($("eCache")) $("eCache").textContent = String(Object.keys(edgeCache).length);
      try { if (navigator.gpu) $("eMode").textContent = "webgpu?"; else $("eMode").textContent = "cpu"; }
      catch (e) { if ($("eMode")) $("eMode").textContent = "cpu"; }
    }
  }
  function refreshProtocol() {
    if ($("prDid")) $("prDid").textContent = ensureDid().slice(0, 18) + "…";
    if ($("prMsg")) $("prMsg").textContent = String(PROTO.msgCount);
    if ($("prEqs")) $("prEqs").textContent = String(eqs("АКСИ Agent-v1"));
    if ($("prOut") && PROTO.lastEnvelope) $("prOut").textContent = JSON.stringify(PROTO.lastEnvelope, null, 2);
  }
  function bubble(role, text, meta) {
    var th = $("thread");
    if (!th) return;
    var d = document.createElement("div");
    d.className = "msg " + (role === "me" ? "me" : "ai");
    var m = meta ? "<div class=\"meta\">" + esc(meta) + "</div>" : "";
    d.innerHTML = "<div class='bub'>" + esc(text) + m + "</div>";
    th.appendChild(d);
    var main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
    var chips = $("chips");
    if (chips && th.children.length > 6) chips.style.display = "none";
  }
  function finishReply(text, q) {
    var e = eqs(text), qc = qcli(text), fp = quantumFingerprint(text);
    updateStatus(text);
    appendLedger("reply", { q: String(q).slice(0, 90), fp: fp }, e);
    createEnvelope("user", "response", text.slice(0, 200));
    bubble("ai", text, "EQS " + e + " · QCLI " + qc.toFixed(2) + " · " + quantumLevel(qc) + " · fp " + fp.slice(0, 8));
  }
  function chat(q) {
    q = String(q || "").trim();
    if (!q || busy) return;
    busy = true;
    try {
      showTab("chat");
      bubble("me", q);
      if ($("inp")) $("inp").value = "";
      var text = answer(q);
      if (text === "__WIKI__" || text === "__FALLBACK__") {
        var term = text === "__WIKI__" ? wikiQuery(q) : q;
        bubble("ai", "Ищу… «" + term + "»");
        fetchWiki(term, function (wiki) {
          var out;
          if (wiki) out = wiki;
          else if (text === "__FALLBACK__") {
            var hits = retrieve(q);
            if (hits.length) out = hits.slice(0, 4).map(function (h, i) { return (i + 1) + ". " + h.text; }).join("\n");
            else out = "Пока не знаю точный ответ.\n\n• Научи: запомни: …\n• Спроси кто ты / что умеешь / формула\n• Wiki: wiki: тема  или  что такое …";
          } else out = "Wikipedia не ответила. Попробуй иначе или: запомни: …";
          finishReply(out, q);
          busy = false;
        });
        return;
      }
      finishReply(text || "…", q);
    } catch (err) { bubble("ai", "Сбой: " + String(err && err.message || err)); }
    busy = false;
  }
  function startVoice() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { bubble("ai", "Голос недоступен в этом браузере."); return; }
    var r = new SR();
    r.lang = "ru-RU";
    r.onresult = function (ev) { var t = ev.results[0][0].transcript; if ($("inp")) $("inp").value = t; chat(t); };
    r.onerror = function () {};
    try { r.start(); } catch (e) {}
  }
  function runBell() {
    var shots = 128, same = 0, i, a, b;
    for (i = 0; i < shots; i++) { a = Math.random() < 0.5 ? 0 : 1; b = a; if (a === b) same++; }
    return "Bell |Φ+⟩ · " + shots + " shots\nКорреляция ≈ " + (100 * same / shots).toFixed(1) + "%\n(локальный симулятор)";
  }
  function runSuper() {
    var shots = 64, zeros = 0, i;
    for (i = 0; i < shots; i++) if (Math.random() < 0.5) zeros++;
    return "Суперпозиция |+⟩\nP0 ≈ " + (zeros / shots).toFixed(3) + "\nP1 ≈ " + ((shots - zeros) / shots).toFixed(3);
  }
  function runEdge(query) {
    var t0 = Date.now();
    var q = String(query || "").trim() || "что умеешь";
    var cacheKey = simpleHash(q);
    var fromCache = false, hits;
    if (edgeCache[cacheKey]) { hits = edgeCache[cacheKey]; fromCache = true; }
    else { hits = retrieve(q); edgeCache[cacheKey] = hits; }
    var composed = answer(q);
    if (composed === "__WIKI__" || composed === "__FALLBACK__") composed = (hits[0] && hits[0].text) || answerKB("что умеешь") || "…";
    var e = eqs(composed), qc = qcli(composed), ms = Date.now() - t0;
    appendLedger("edge", { q: q.slice(0, 80), hits: hits.length, ms: ms }, e);
    return { query: q, intent: intent(q), hits: hits.length, top: hits.slice(0, 3).map(function (h) { return h.text.slice(0, 80); }), composed: String(composed).slice(0, 300), eqs: e, qcli: qc, ms: ms, cache: fromCache, mode: ($("eMode") && $("eMode").textContent) || "cpu" };
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target.closest("button,[data-tab],[data-ask],[data-del]") : e.target;
    if (!el) return;
    var tab = el.getAttribute("data-tab");
    if (tab) { showTab(tab); return; }
    var ask = el.getAttribute("data-ask");
    if (ask) { chat(ask); return; }
    var del = el.getAttribute("data-del");
    if (del) { saveMem(loadMem().filter(function (x) { return x.id !== del; })); return; }
    if (el.id === "send") { chat(($("inp") || {}).value || ""); return; }
    if (el.id === "btnVoice") { startVoice(); return; }
    if (el.id === "btnTeach") {
      var box = $("teachBox"), v = box && box.value;
      if (!v || !String(v).trim()) return;
      var n = 0;
      String(v).split(/\n+/).forEach(function (line) { if (line.trim() && addFact(line.trim(), "user")) n++; });
      if (box) box.value = "";
      bubble("ai", n ? "Запомнила (" + n + ")." : "Пусто");
      showTab("chat");
      return;
    }
    if (el.id === "btnExp") {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify({ facts: loadMem() }, null, 2)], { type: "application/json" }));
      a.download = "aksi-memory.json"; a.click(); return;
    }
    if (el.id === "btnImp") { var f = $("impFile"); if (f) f.click(); return; }
    if (el.id === "btnWipe") {
      if (confirm("Очистить пользовательскую память? (ядро восстановится)")) {
        saveMem([]); try { localStorage.removeItem(SEED_KEY); } catch (e2) {} seedCore();
      }
      return;
    }
    if (el.id === "btnFullExp") {
      var pack = { v: 4, protocol: PROTO.protocol, did: ensureDid(), ts: Date.now(), msk: getMSKFull(), facts: loadMem(), ledger: loadLedger(), msgCount: PROTO.msgCount, seed: RESONANCE_SEED };
      var a2 = document.createElement("a");
      a2.href = URL.createObjectURL(new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" }));
      a2.download = "aksi-full-backup.json"; a2.click(); return;
    }
    if (el.id === "btnMet") {
      var t = ($("mIn") || {}).value || "";
      var e = eqs(t), qc = qcli(t);
      if ($("mEqs")) $("mEqs").textContent = String(e);
      if ($("mQcli")) $("mQcli").textContent = qc.toFixed(3);
      if ($("mH")) $("mH").textContent = shannonH(t).toFixed(3);
      if ($("mHeff")) $("mHeff").textContent = heff(t).toFixed(3);
      if ($("mLevel")) $("mLevel").textContent = quantumLevel(qc) + " · fp " + quantumFingerprint(t);
      updateStatus(t); return;
    }
    if (el.id === "btnBell") { if ($("qOut")) $("qOut").textContent = runBell(); return; }
    if (el.id === "btnSuper") { if ($("qOut")) $("qOut").textContent = runSuper(); return; }
    if (el.id === "btnProof") {
      var v = verifyLedger();
      if ($("pOut")) $("pOut").textContent = (v.ok ? "OK " : "ERR ") + v.msg + "\n\n" + JSON.stringify(loadLedger().slice(-8), null, 2);
      return;
    }
    if (el.id === "btnProofClear") {
      if (confirm("Очистить цепочку?")) { saveLedger([]); if ($("pOut")) $("pOut").textContent = "пусто"; }
      return;
    }
    if (el.id === "btnHandshake") {
      var hs = createHandshake();
      if ($("prOut")) $("prOut").textContent = JSON.stringify(hs, null, 2);
      refreshProtocol(); return;
    }
    if (el.id === "btnEnvelope") {
      var env = createEnvelope("broadcast", "announce", "АКСИ online · Agent-v1 · knowledge core");
      if ($("prOut")) $("prOut").textContent = JSON.stringify(env, null, 2);
      refreshProtocol(); return;
    }
    if (el.id === "btnEdge") {
      var qe = ($("eQuery") || {}).value || "что умеешь";
      var res = runEdge(qe);
      if ($("eMs")) $("eMs").textContent = String(res.ms);
      if ($("eHits")) $("eHits").textContent = String(res.hits);
      if ($("eCache")) $("eCache").textContent = String(Object.keys(edgeCache).length);
      if ($("eOut")) $("eOut").textContent = JSON.stringify(res, null, 2);
      return;
    }
    if (el.id === "btnEdgeClear") {
      edgeCache = {};
      if ($("eCache")) $("eCache").textContent = "0";
      if ($("eOut")) $("eOut").textContent = "cache cleared";
      return;
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target && e.target.id === "inp") { e.preventDefault(); chat(e.target.value); }
  });
  var imp = $("impFile");
  if (imp) {
    imp.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var j = JSON.parse(r.result);
          var facts = j.facts || [], cur = loadMem();
          facts.forEach(function (x) {
            if (x && x.t) cur.unshift({ id: x.id || Date.now().toString(36), t: String(x.t), ts: Date.now(), src: x.src || "import" });
          });
          saveMem(cur);
          bubble("ai", "Память загружена (" + facts.length + ").");
          showTab("chat");
        } catch (err) { bubble("ai", "Не удалось прочитать файл."); }
      };
      r.readAsText(f);
      e.target.value = "";
    });
  }

  seedCore();
  if ($("didVal")) $("didVal").textContent = ensureDid();
  renderMem();
  updateStatus("АКСИ Agent-v1 online · core knowledge");
  tickClock();
  setInterval(tickClock, 30000);
  refreshProtocol();

  try {
    var hash = (location.hash || "").replace(/^#/, "");
    if (hash && document.getElementById("tab-" + hash)) showTab(hash);
    window.addEventListener("hashchange", function () {
      var h = (location.hash || "").replace(/^#/, "");
      if (h && document.getElementById("tab-" + h)) showTab(h);
    });
  } catch (e) {}

  bubble("ai", "Привет. Я АКСИ — цифровой напарник с ядром знаний.\n\nЗнаю: протокол · EQS · формулу · память · квант · Edge · ledger.\nМогу искать в Wikipedia: wiki: тема или что такое …\n\nСпроси кто ты · формула · что умеешь.\nзапомни: … · голос");
  try {
    var logo = $("logoPulse");
    if (logo) { logo.classList.add("pulse"); setTimeout(function(){ logo.classList.remove("pulse"); }, 1200); }
  } catch (e) {}
})();
