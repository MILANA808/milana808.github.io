/**
 * AKSI Product Core v1.1
 * Offline-first мозг. Подпись через aksi-core.js (Ed25519), иначе SHA-256.
 * Подключать ПОСЛЕ aksi-core.js:
 *   <script src="/aksi-core.js"></script>
 *   <script src="/aksi-product-core.js"></script>
 */
(function (global) {
  "use strict";
  if (global.AksiProduct) return;

  var VERSION = "1.1.0";
  var DID_FALLBACK = "did:aksi:ed25519:sovereign-2026";
  var DB_NAME = "aksi_product_v11";
  var FACTS_KEY = "aksi_product_facts_v11";
  var CFG_KEY = "aksi_product_cfg_v11";

  var db = null;
  var facts = [];
  var session = [];
  var cfg = { backendUrl: "", llmEnabled: false, offlineOnly: false };

  function esc(s) {
    var a = String.fromCharCode(38);
    return String(s)
      .replace(/&/g, a + "amp;")
      .replace(/</g, a + "lt;")
      .replace(/>/g, a + "gt;")
      .replace(/"/g, a + "quot;");
  }

  function sha256Hex(str) {
    if (!global.crypto || !crypto.subtle) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8));
    }
    return crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(String(str)))
      .then(function (buf) {
        return Array.from(new Uint8Array(buf))
          .map(function (b) { return b.toString(16).padStart(2, "0"); })
          .join("");
      });
  }

  /** Ed25519 через aksi-core.js, иначе SHA-256 */
  function signPayload(text, steps) {
    var payload = String(text) + "|" + (steps || []).join(";") + "|" + Date.now();
    var core = global.AksiCore;
    if (core && typeof core.sign === "function") {
      return core.sign(payload).then(function (sig) {
        if (core.identity) {
          return core.identity().then(function (id) {
            return {
              sig: sig,
              algo: "Ed25519",
              did: DID_FALLBACK,
              publicKey: id && id.publicKey ? id.publicKey : null,
              realCrypto: true
            };
          });
        }
        return { sig: sig, algo: "Ed25519", did: DID_FALLBACK, realCrypto: true };
      }).catch(function () {
        return sha256Hex(payload).then(function (h) {
          return { sig: h.slice(0, 32), algo: "SHA-256", did: DID_FALLBACK, realCrypto: false };
        });
      });
    }
    return sha256Hex(payload).then(function (h) {
      return { sig: h.slice(0, 32), algo: "SHA-256", did: DID_FALLBACK, realCrypto: false };
    });
  }

  function appendLedger(type, subject, source) {
    var core = global.AksiCore;
    if (core && typeof core.append === "function") {
      return core.append(type, subject, source || "product", "observed").catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function openDB() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains("facts"))
            d.createObjectStore("facts", { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = function (e) { db = e.target.result; resolve(db); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function loadFacts() {
    return openDB().then(function () {
      if (!db) {
        try { facts = JSON.parse(localStorage.getItem(FACTS_KEY) || "[]"); } catch (e) { facts = []; }
        return facts;
      }
      return new Promise(function (resolve) {
        var r = db.transaction("facts", "readonly").objectStore("facts").getAll();
        r.onsuccess = function () { facts = r.result || []; resolve(facts); };
        r.onerror = function () { resolve([]); };
      });
    });
  }

  function saveFact(text, meta) {
    text = String(text || "").trim();
    if (!text) return Promise.resolve(null);
    var item = { text: text.slice(0, 8000), meta: meta || {}, ts: Date.now() };
    facts.unshift(item);
    if (facts.length > 400) facts = facts.slice(0, 400);
    try { localStorage.setItem(FACTS_KEY, JSON.stringify(facts.slice(0, 150))); } catch (e) {}
    if (!db) return Promise.resolve(item);
    return new Promise(function (resolve) {
      try { db.transaction("facts", "readwrite").objectStore("facts").add(item); } catch (e) {}
      resolve(item);
    });
  }

  function searchFacts(q) {
    var low = String(q || "").toLowerCase();
    var words = low.split(/\s+/).filter(function (w) { return w.length > 2; });
    return facts.filter(function (f) {
      var t = String(f.text || "").toLowerCase();
      if (t.indexOf(low) !== -1) return true;
      return words.some(function (w) { return t.indexOf(w) !== -1; });
    }).slice(0, 6);
  }

  var KB = [
    { q: ["кто ты", "что ты", "представься", "ты кто", "как тебя зовут"], a: "Я АКСИ — суверенный локальный помощник.\n\nРаботаю в браузере (offline-first). По умолчанию ваши данные не уходят на чужие серверы. Показываю ход мысли и криптографическую подпись ответа. Если не знаю — говорю прямо." },
    { q: ["что умеешь", "возможности", "функции", "что можешь"], a: "Умею:\n• отвечать по-русски и объяснять\n• помнить заметки на устройстве («запомни: …»)\n• считать выражения\n• искать в Википедии при наличии сети\n• учебные квантовые примеры\n• подключать ваш backend (Ollama / OpenAI-compatible)\n• экспорт памяти одним файлом\n\nНапишите «помощь» для инструкции." },
    { q: ["помощь", "как пользоваться", "инструкция", "справка"], a: "1. Задайте вопрос в чат.\n2. «запомни: текст» — сохранить на устройство.\n3. Формулы: 25*4 или «посчитай (3+2)^2».\n4. Без сети: KB, память, счёт.\n5. С сетью: краткий ответ из Википедии.\n6. Настройки: backend URL и режим «только офлайн»." },
    { q: ["что такое ии", "искусственный интеллект", "объясни ии"], a: "Искусственный интеллект — программы, которые решают задачи, обычно требующие мышления: язык, поиск, подсказки.\n\nЯ — offline-first помощник с прозрачным ходом мысли. Это не «живой» разум." },
    { q: ["суверен", "офлайн", "приват", "данные", "local-first"], a: "Суверенный режим: чат и память на устройстве.\nСеть — только Википедия (если не «только офлайн») или ваш backend.\nЭкспорт — кнопка в интерфейсе." },
    { q: ["запутанность", "белл", "bell", "запутай", "покажи запутанность"], a: null, special: "quantum-bell" },
    { q: ["суперпозиция", "адамар"], a: null, special: "quantum-super" },
    { q: ["привет", "здравствуй", "добрый день", "доброе утро", "добрый вечер", "hello"], a: "Здравствуйте. Я АКСИ. Чем помочь?" },
    { q: ["спасибо", "благодарю"], a: "Пожалуйста." },
    { q: ["контакт", "почта", "email"], a: "Публичный контакт: aksilove@internet.ru" },
    { q: ["правда", "врёшь", "галлюцинац", "достоверн"], a: "Стараюсь не выдумывать.\n• Локальная база — источник «kb».\n• Википедия — ссылка.\n• Не знаю — говорю.\n• Подпись — Ed25519 (если aksi-core подключён), иначе SHA-256." },
    { q: ["did", "идентичность", "подпись"], a: "DID: did:aksi:ed25519:sovereign-2026.\nПодпись: Ed25519 через aksi-core.js, иначе SHA-256." }
  ];

  function matchKB(text) {
    var t = String(text || "").toLowerCase().replace(/ё/g, "е");
    var best = null, score = 0;
    for (var i = 0; i < KB.length; i++) {
      var item = KB[i];
      for (var j = 0; j < item.q.length; j++) {
        var key = item.q[j];
        if (t === key) return item;
        if (t.indexOf(key) !== -1 && key.length > score) { score = key.length; best = item; }
      }
    }
    return best;
  }

  function safeMath(expr) {
    var s = String(expr || "").replace(/,/g, ".").replace(/\s+/g, "");
    if (!/^[\d+\-*/().^%]+$/.test(s)) return null;
    s = s.replace(/\^/g, "**");
    try {
      var v = new Function("return (" + s + ")")();
      if (typeof v !== "number" || !isFinite(v)) return null;
      return Math.round(v * 1e12) / 1e12;
    } catch (e) { return null; }
  }

  function quantumBell() {
    return {
      text: "Запутанность (Белл, 2 кубита):\n• H → CNOT\n• |00⟩ ≈ 50%, |11⟩ ≈ 50%\n• если первый 0 — второй тоже 0\n\nУчебная симуляция statevector, не физический квантовый компьютер.",
      step: "quantum → Bell H+CNOT"
    };
  }
  function quantumSuper() {
    return {
      text: "Суперпозиция (гейт H):\nдо измерения — «и 0, и 1»; после — 0 или 1 ≈ 50%.\n\nУчебная симуляция.",
      step: "quantum → Hadamard"
    };
  }

  function searchWiki(query) {
    if (cfg.offlineOnly) return Promise.reject(new Error("offline"));
    if (typeof navigator !== "undefined" && navigator.onLine === false)
      return Promise.reject(new Error("offline"));
    var q = String(query || "").replace(/^(что такое|кто такой|кто такая|расскажи про|объясни)\s+/i, "").trim();
    if (q.length < 2) return Promise.reject(new Error("short"));
    var url = "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q);
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("not found");
      return r.json();
    }).then(function (j) {
      var extract = (j.extract || "").trim();
      if (!extract || j.type === "disambiguation") throw new Error("empty");
      return {
        title: j.title || q,
        text: extract.slice(0, 1200),
        url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
      };
    });
  }

  function callBackend(messages) {
    if (!cfg.backendUrl || !cfg.llmEnabled) return Promise.reject(new Error("no backend"));
    var url = cfg.backendUrl.replace(/\/$/, "") + "/v1/chat/completions";
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "local", messages: messages, temperature: 0.4, stream: false })
    }).then(function (r) {
      if (!r.ok) throw new Error("backend " + r.status);
      return r.json();
    }).then(function (j) {
      var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!c) throw new Error("empty llm");
      return String(c);
    });
  }

  function answer(raw) {
    var q = String(raw || "").trim();
    var steps = [];
    function step(s) { steps.push(s); }

    function finish(text, source) {
      return signPayload(text, steps).then(function (sig) {
        session.push({ role: "assistant", content: text, ts: Date.now() });
        if (session.length > 50) session = session.slice(-50);
        appendLedger("product-reply", text.slice(0, 200), source);
        return { text: text, steps: steps, source: source || "local", signature: sig, version: VERSION };
      });
    }

    if (!q) {
      step("пустой ввод");
      return finish("Напишите вопрос — отвечу по-русски.", "local");
    }

    session.push({ role: "user", content: q, ts: Date.now() });
    if (session.length > 50) session = session.slice(-50);

    if (/^(очисти|очистить)\s*(чат)?$/i.test(q)) {
      step("очистка чата");
      session = [];
      return finish("Чат очищен.", "local").then(function (r) { r.clearChat = true; return r; });
    }
    if (/^(очисти|очистить)\s*память$/i.test(q)) {
      step("очистка памяти");
      facts = [];
      try { localStorage.removeItem(FACTS_KEY); } catch (e) {}
      return finish("Память очищена на этом устройстве.", "local");
    }

    var m = q.match(/^(запомни|запомнить|remember)\s*[:\-]?\s*(.+)$/i);
    if (m && m[2]) {
      step("намерение: сохранить в память");
      return saveFact(m[2]).then(function () {
        step("запись IndexedDB/localStorage");
        return finish("Запомнила:\n«" + m[2].trim() + "»\n\nТолько на этом устройстве.", "memory");
      });
    }

    if (/^[\d\s+\-*/().^,]+$/.test(q) || /посчитай|вычисли|сколько будет|чему равно/i.test(q)) {
      step("намерение: вычисление");
      var expr = q.replace(/посчитай|вычисли|сколько будет|чему равно/gi, "").trim() || q;
      var val = safeMath(expr);
      if (val !== null) {
        step("локальный безопасный расчёт");
        return finish("Результат: " + val, "math");
      }
    }

    var hit = matchKB(q);
    if (hit) {
      step("локальная база знаний");
      if (hit.special === "quantum-bell") {
        var qb = quantumBell();
        steps.push(qb.step);
        return finish(qb.text, "quantum");
      }
      if (hit.special === "quantum-super") {
        var qs = quantumSuper();
        steps.push(qs.step);
        return finish(qs.text, "quantum");
      }
      return finish(hit.a, "kb");
    }

    var found = searchFacts(q);
    if (found.length) {
      step("поиск по памяти устройства");
      var body = "Из вашей памяти:\n• " + found.map(function (f) { return f.text; }).join("\n• ");
      return finish(body, "memory");
    }

    if (cfg.llmEnabled && cfg.backendUrl && !cfg.offlineOnly) {
      step("попытка backend LLM");
      var msgs = [{ role: "system", content: "Ты АКСИ — суверенный помощник. Отвечай по-русски, кратко и честно. Не выдумывай факты." }];
      session.slice(-10).forEach(function (x) {
        msgs.push({ role: x.role === "user" ? "user" : "assistant", content: x.content });
      });
      return callBackend(msgs).then(function (content) {
        step("ответ backend");
        return finish(content, "llm");
      }).catch(function () {
        step("backend недоступен → fallback");
        return wikiOrFallback(q, steps);
      });
    }

    return wikiOrFallback(q, steps);
  }

  function wikiOrFallback(q, steps) {
    function finish(text, source) {
      return signPayload(text, steps).then(function (sig) {
        session.push({ role: "assistant", content: text, ts: Date.now() });
        appendLedger("product-reply", text.slice(0, 200), source);
        return { text: text, steps: steps, source: source || "local", signature: sig, version: VERSION };
      });
    }
    if (cfg.offlineOnly) {
      steps.push("режим только офлайн");
      return finish("В локальной базе нет точного ответа.\n\nМожно:\n• переформулировать\n• «запомни: …»\n• отключить «только офлайн»\n• подключить backend", "local");
    }
    steps.push("поиск ru.wikipedia.org");
    return searchWiki(q).then(function (res) {
      steps.push("найдено: " + res.title);
      var text = res.title + "\n\n" + res.text + (res.url ? "\n\nИсточник: " + res.url : "") +
        "\n\n— Кратко из Википедии. При необходимости проверьте.";
      return finish(text, "wiki");
    }).catch(function () {
      steps.push("поиск без результата");
      return finish("Точного ответа пока нет.\n\nПопробуйте переформулировать, «запомни: …» или backend.", "local");
    });
  }

  function loadCfg() {
    try {
      var s = JSON.parse(localStorage.getItem(CFG_KEY) || "{}");
      if (s.backendUrl) cfg.backendUrl = s.backendUrl;
      if (typeof s.llmEnabled === "boolean") cfg.llmEnabled = s.llmEnabled;
      if (typeof s.offlineOnly === "boolean") cfg.offlineOnly = s.offlineOnly;
    } catch (e) {}
  }

  var api = {
    version: VERSION,
    init: function (opts) {
      opts = opts || {};
      loadCfg();
      if (opts.backendUrl) cfg.backendUrl = opts.backendUrl;
      if (typeof opts.llmEnabled === "boolean") cfg.llmEnabled = opts.llmEnabled;
      if (typeof opts.offlineOnly === "boolean") cfg.offlineOnly = opts.offlineOnly;
      return loadFacts().then(function () {
        var hasEd = !!(global.AksiCore && typeof global.AksiCore.sign === "function");
        return { ok: true, version: VERSION, facts: facts.length, ed25519: hasEd };
      });
    },
    setConfig: function (c) {
      c = c || {};
      if (c.backendUrl !== undefined) cfg.backendUrl = String(c.backendUrl || "");
      if (c.llmEnabled !== undefined) cfg.llmEnabled = !!c.llmEnabled;
      if (c.offlineOnly !== undefined) cfg.offlineOnly = !!c.offlineOnly;
      try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) {}
    },
    getConfig: function () {
      return { backendUrl: cfg.backendUrl, llmEnabled: cfg.llmEnabled, offlineOnly: cfg.offlineOnly };
    },
    answer: answer,
    saveFact: saveFact,
    getFacts: function () { return facts.slice(); },
    clearSession: function () { session = []; },
    getSession: function () { return session.slice(); },
    exportAll: function () {
      var coreState = null;
      try {
        if (global.AksiCore && global.AksiCore.exportState) coreState = global.AksiCore.exportState();
      } catch (e) {}
      return {
        schema: "AKSI-PRODUCT-1",
        version: VERSION,
        exportedAt: new Date().toISOString(),
        facts: facts,
        session: session,
        config: api.getConfig(),
        core: coreState
      };
    },
    importAll: function (data) {
      if (!data || typeof data !== "object") return Promise.resolve(false);
      if (Array.isArray(data.facts)) {
        facts = data.facts;
        try { localStorage.setItem(FACTS_KEY, JSON.stringify(facts.slice(0, 150))); } catch (e) {}
      }
      if (data.config) api.setConfig(data.config);
      return Promise.resolve(true);
    },
    esc: esc
  };

  loadCfg();
  global.AksiProduct = api;
  if (!global.AksiProductCore) global.AksiProductCore = api;
})(typeof window !== "undefined" ? window : self);
