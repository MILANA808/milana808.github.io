/**
 * AksiCore product v1 — offline-first brain
 * window.AksiCore — always answers; optional wiki / LLM backend
 */
(function (global) {
  "use strict";
  if (global.AksiProductCore) return;

  var VERSION = "1.0.0";
  var DID_DEFAULT = "did:aksi:ed25519:sovereign-2026";
  var SEED = "AKSI_CORE_v1_2026";
  var DB_NAME = "aksi_product_v1";
  var db = null, memFacts = [], sessionMsgs = [];
  var config = { backendUrl: "", llmEnabled: false, offlineOnly: false, lang: "ru" };

  function esc(s) {
    var a = String.fromCharCode(38);
    return String(s).replace(/&/g, a + "amp;").replace(/</g, a + "lt;").replace(/>/g, a + "gt;").replace(/"/g, a + "quot;");
  }
  function sha256Hex(str) {
    if (!global.crypto || !crypto.subtle) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return Promise.resolve(("00000000" + (h >>> 0).toString(16)).slice(-8));
    }
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  function openDB() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains("facts")) d.createObjectStore("facts", { keyPath: "id", autoIncrement: true });
        };
        req.onsuccess = function (e) { db = e.target.result; resolve(db); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  function loadFacts() {
    return openDB().then(function () {
      if (!db) {
        try { memFacts = JSON.parse(localStorage.getItem("aksi_product_facts") || "[]"); } catch (e) { memFacts = []; }
        return memFacts;
      }
      return new Promise(function (resolve) {
        var r = db.transaction("facts", "readonly").objectStore("facts").getAll();
        r.onsuccess = function () { memFacts = r.result || []; resolve(memFacts); };
        r.onerror = function () { resolve([]); };
      });
    });
  }
  function saveFact(text) {
    text = (text || "").trim();
    if (!text) return Promise.resolve(null);
    var item = { text: text, ts: Date.now() };
    memFacts.unshift(item);
    if (memFacts.length > 500) memFacts = memFacts.slice(0, 500);
    try { localStorage.setItem("aksi_product_facts", JSON.stringify(memFacts.slice(0, 200))); } catch (e) {}
    if (!db) return Promise.resolve(item);
    return new Promise(function (resolve) {
      db.transaction("facts", "readwrite").objectStore("facts").add(item);
      resolve(item);
    });
  }

  var KB = [
    { q: ["кто ты", "что ты", "представься", "ты кто"], a: "Я АКСИ — суверенный локальный помощник.\n\nРаботаю в браузере. Данные по умолчанию не уходят на чужие серверы. Показываю ход мысли и подпись. Если не знаю — говорю прямо." },
    { q: ["что умеешь", "возможности", "функции"], a: "• ответы и объяснения\n• Википедия (если есть сеть)\n• счёт\n• память на устройстве\n• квант-демо (учебное)\n• опциональный backend (Ollama / OpenAI-compatible)" },
    { q: ["помощь", "как пользоваться", "инструкция"], a: "1. Вопрос в чат\n2. «запомни: текст»\n3. Формулы — локально\n4. Без сети: KB + память + счёт\n5. Backend — если указан URL в настройках" },
    { q: ["что такое ии", "искусственный интеллект"], a: "ИИ — программы для задач, обычно требующих мышления. Я offline-first помощник с прозрачным ходом мысли." },
    { q: ["запутанность", "белл", "bell"], a: null, special: "quantum-bell" },
    { q: ["суперпозиция"], a: null, special: "quantum-super" },
    { q: ["привет", "здравствуй", "добрый день", "доброе утро"], a: "Здравствуйте. Я АКСИ. Чем помочь?" },
    { q: ["контакт", "почта", "email"], a: "aksilove@internet.ru" },
    { q: ["правда", "врёшь", "галлюцинац"], a: "Не выдумываю намеренно. Источник указываю. Не знаю — говорю. Подпись — целостность ответа, не истина мира." }
  ];

  function matchKB(text) {
    var t = (text || "").toLowerCase().replace(/ё/g, "е"), best = null, score = 0;
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].q.length; j++) {
        var key = KB[i].q[j];
        if (t === key) return KB[i];
        if (t.indexOf(key) !== -1 && key.length > score) { score = key.length; best = KB[i]; }
      }
    }
    return best;
  }
  function safeMath(expr) {
    var s = (expr || "").replace(/,/g, ".").replace(/\s+/g, "");
    if (!/^[\d+\-*/().^%]+$/.test(s)) return null;
    s = s.replace(/\^/g, "**");
    try {
      var v = new Function("return (" + s + ")")();
      return (typeof v === "number" && isFinite(v)) ? Math.round(v * 1e12) / 1e12 : null;
    } catch (e) { return null; }
  }
  function searchWiki(query) {
    if (config.offlineOnly) return Promise.reject(new Error("offline"));
    return fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(query.trim()))
      .then(function (r) { if (!r.ok) throw new Error("nf"); return r.json(); })
      .then(function (j) {
        var extract = (j.extract || "").trim();
        if (!extract) throw new Error("empty");
        return { title: j.title || query, text: extract.slice(0, 1200), url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || "" };
      });
  }
  function callBackend(messages) {
    if (!config.backendUrl || !config.llmEnabled) return Promise.reject(new Error("no backend"));
    return fetch(config.backendUrl.replace(/\/$/, "") + "/v1/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "local", messages: messages, temperature: 0.4, stream: false })
    }).then(function (r) { if (!r.ok) throw new Error("be"); return r.json(); })
      .then(function (j) {
        var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if (!c) throw new Error("empty");
        return String(c);
      });
  }
  function signAnswer(text, thoughts) {
    return sha256Hex(text + "|" + (thoughts || []).join(";") + "|" + SEED + "|" + Date.now()).then(function (h) {
      return { sig: h.slice(0, 16), did: localStorage.getItem("aksi_did") || DID_DEFAULT, algo: "SHA-256" };
    });
  }

  function answer(raw) {
    var q = (raw || "").trim(), thoughts = [];
    function step(s) { thoughts.push(s); }
    if (!q) return Promise.resolve({ text: "Напишите вопрос.", thoughts: ["пусто"], source: "local" });
    sessionMsgs.push({ role: "user", content: q, ts: Date.now() });
    if (sessionMsgs.length > 40) sessionMsgs = sessionMsgs.slice(-40);

    if (/^(очисти|очистить)\s*(чат)?$/i.test(q))
      return Promise.resolve({ text: "Готово.", thoughts: ["очистка"], source: "local", clearChat: true });

    var m = q.match(/^(запомни|запомнить)\s*[:\-]?\s*(.+)$/i);
    if (m && m[2]) {
      step("память");
      return saveFact(m[2]).then(function () {
        return signAnswer(m[2], thoughts).then(function (sig) {
          return { text: "Запомнила:\n«" + m[2].trim() + "»\n\nТолько на устройстве.", thoughts: thoughts, source: "memory", signature: sig };
        });
      });
    }
    if (/^[\d\s+\-*/().^,]+$/.test(q) || /посчитай|вычисли/i.test(q)) {
      var expr = q.replace(/посчитай|вычисли|сколько будет/gi, "").trim() || q;
      var val = safeMath(expr);
      if (val !== null) {
        step("math");
        return signAnswer(String(val), thoughts).then(function (sig) {
          return { text: "Результат: " + val, thoughts: thoughts, source: "math", signature: sig };
        });
      }
    }
    var hit = matchKB(q);
    if (hit) {
      step("KB");
      if (hit.special === "quantum-bell")
        return signAnswer("bell", thoughts).then(function (sig) {
          return { text: "Запутанность (Белл): H→CNOT. |00⟩≈50%, |11⟩≈50%. Учебная симуляция, не физ. квант-компьютер.", thoughts: thoughts.concat(["quantum"]), source: "quantum", signature: sig };
        });
      if (hit.special === "quantum-super")
        return signAnswer("super", thoughts).then(function (sig) {
          return { text: "Суперпозиция (H): до измерения «и 0 и 1». Учебная симуляция.", thoughts: thoughts.concat(["quantum"]), source: "quantum", signature: sig };
        });
      return signAnswer(hit.a, thoughts).then(function (sig) {
        return { text: hit.a, thoughts: thoughts, source: "kb", signature: sig };
      });
    }
    var low = q.toLowerCase(), words = low.split(/\s+/).filter(function (w) { return w.length > 3; });
    var found = memFacts.filter(function (f) {
      var ft = (f.text || "").toLowerCase();
      return ft.indexOf(low) !== -1 || words.some(function (w) { return ft.indexOf(w) !== -1; });
    }).slice(0, 5);
    if (found.length) {
      step("memory-search");
      var body = "Из памяти:\n• " + found.map(function (f) { return f.text; }).join("\n• ");
      return signAnswer(body, thoughts).then(function (sig) {
        return { text: body, thoughts: thoughts, source: "memory", signature: sig };
      });
    }
    if (config.llmEnabled && config.backendUrl && !config.offlineOnly) {
      step("llm");
      var msgs = [{ role: "system", content: "Ты АКСИ. По-русски, кратко, честно. Не выдумывай." }];
      sessionMsgs.slice(-8).forEach(function (x) { msgs.push({ role: x.role === "user" ? "user" : "assistant", content: x.content }); });
      return callBackend(msgs).then(function (content) {
        return signAnswer(content, thoughts).then(function (sig) {
          return { text: content, thoughts: thoughts, source: "llm", signature: sig };
        });
      }).catch(function () { return wikiOrFallback(q, thoughts); });
    }
    return wikiOrFallback(q, thoughts);
  }

  function wikiOrFallback(q, thoughts) {
    if (config.offlineOnly) {
      thoughts.push("offline");
      return signAnswer("no", thoughts).then(function (sig) {
        return { text: "В локальной базе нет ответа. Переформулируйте, «запомни: …» или отключите «только офлайн».", thoughts: thoughts, source: "local", signature: sig };
      });
    }
    thoughts.push("wiki");
    return searchWiki(q).then(function (res) {
      var text = res.title + "\n\n" + res.text + (res.url ? "\n\nИсточник: " + res.url : "") + "\n\n— Кратко из Википедии.";
      return signAnswer(text, thoughts).then(function (sig) {
        return { text: text, thoughts: thoughts, source: "wiki", signature: sig };
      });
    }).catch(function () {
      return signAnswer("miss", thoughts).then(function (sig) {
        return { text: "Точного ответа нет. Переформулируйте или подключите backend.", thoughts: thoughts, source: "local", signature: sig };
      });
    });
  }

  var api = {
    version: VERSION,
    init: function () { return loadFacts().then(function () { return { ok: true, version: VERSION }; }); },
    setConfig: function (c) {
      c = c || {};
      if (c.backendUrl !== undefined) config.backendUrl = c.backendUrl;
      if (c.llmEnabled !== undefined) config.llmEnabled = !!c.llmEnabled;
      if (c.offlineOnly !== undefined) config.offlineOnly = !!c.offlineOnly;
      try { localStorage.setItem("aksi_product_cfg", JSON.stringify(config)); } catch (e) {}
    },
    getConfig: function () { return Object.assign({}, config); },
    answer: answer,
    clearSession: function () { sessionMsgs = []; },
    exportAll: function () {
      return { version: VERSION, facts: memFacts, config: config, did: localStorage.getItem("aksi_did") || DID_DEFAULT, exportedAt: new Date().toISOString() };
    },
    esc: esc
  };
  try {
    var saved = JSON.parse(localStorage.getItem("aksi_product_cfg") || "{}");
    if (saved.backendUrl) config.backendUrl = saved.backendUrl;
    if (typeof saved.llmEnabled === "boolean") config.llmEnabled = saved.llmEnabled;
    if (typeof saved.offlineOnly === "boolean") config.offlineOnly = saved.offlineOnly;
  } catch (e) {}
  global.AksiCore = api;
  global.AksiProductCore = api;
})(typeof window !== "undefined" ? window : self);
