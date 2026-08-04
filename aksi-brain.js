/**
 * AKSI Transparent Thought Protocol v5.1 — WORKING offline brain
 * Memory · Live public APIs · Expanded knowledge · Signed steps
 * Баширова Альфия Ринатовна · 14.02.1995 · Нурлат
 */
(function (global) {
  "use strict";
  var SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-1995-alfiya";
  var VERSION = "5.1-TTP";
  var MEM_KEY = "AKSI_MEMORY_V1";
  var MAX_MEM = 40;

  function enc(s) {
    return new TextEncoder().encode(String(s));
  }

  function shaHex(t) {
    if (!global.crypto || !crypto.subtle) {
      return Promise.resolve(fallbackHash(String(t)));
    }
    return crypto.subtle.digest("SHA-256", enc(t)).then(function (b) {
      return Array.prototype.map
        .call(new Uint8Array(b), function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function fallbackHash(t) {
    var h = 0x811c9dc5, i;
    for (i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0") + Math.abs(h * 31).toString(16).slice(0, 8);
  }

  function sha16(t) {
    return shaHex(t).then(function (h) {
      return h.slice(0, 16).toUpperCase();
    });
  }

  function aksiSig(message) {
    return sha16(String(message) + SEED + Date.now());
  }

  function shannonH(text) {
    var freq = {}, i, ch, total = text.length || 1, H = 0, p;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      freq[ch] = (freq[ch] || 0) + 1;
    }
    for (ch in freq) {
      p = freq[ch] / total;
      if (p > 0) H -= p * Math.log2(p);
    }
    return Math.round(H * 10000) / 10000;
  }

  function qcli(text) {
    var H = shannonH(text);
    var uniq = 0, seen = {}, i;
    for (i = 0; i < text.length; i++) {
      if (!seen[text[i]]) {
        seen[text[i]] = 1;
        uniq++;
      }
    }
    var maxH = Math.log2(Math.max(1, uniq));
    return maxH > 0 ? Math.min(1, Math.round((H / maxH) * 10000) / 10000) : 0;
  }

  function quantumLevel(q) {
    if (q >= 0.9) return "Квантовый Провидец 🌟";
    if (q >= 0.8) return "Квантовый Архитектор ⚛️";
    if (q >= 0.7) return "Квантовое Единство 🌊";
    if (q >= 0.6) return "Пробуждённое 💫";
    if (q >= 0.5) return "Резонансное ✨";
    return "Базовое 🌱";
  }

  function fingerprint(text) {
    var h = 0xdeadbeef, i;
    for (i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function mskNow() {
    try {
      return (
        new Date().toLocaleString("ru-RU", {
          timeZone: "Europe/Moscow",
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }) + " МСК"
      );
    } catch (e) {
      return new Date().toLocaleString("ru-RU");
    }
  }

  function loadMem() {
    try {
      var raw = localStorage.getItem(MEM_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveMem(arr) {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify(arr.slice(-MAX_MEM)));
    } catch (e) {}
  }

  function remember(role, content) {
    var m = loadMem();
    m.push({ role: role, content: String(content).slice(0, 2000), ts: Date.now() });
    saveMem(m);
  }

  function memSummary() {
    var m = loadMem();
    if (!m.length) return "память пуста";
    return (
      m.length +
      " сообщ. · последние темы: " +
      m
        .filter(function (x) {
          return x.role === "user";
        })
        .slice(-3)
        .map(function (x) {
          return (x.content || "").slice(0, 40);
        })
        .join(" · ")
    );
  }

  function fetchJSON(url, timeoutMs) {
    timeoutMs = timeoutMs || 5000;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, timeoutMs);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .catch(function (e) {
        clearTimeout(t);
        throw e;
      });
  }

  function getCrypto() {
    return fetchJSON(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,toncoin,solana&vs_currencies=usd,rub"
    ).then(function (d) {
      var lines = [];
      if (d.bitcoin) lines.push("BTC: $" + d.bitcoin.usd + " / ₽" + d.bitcoin.rub);
      if (d.ethereum) lines.push("ETH: $" + d.ethereum.usd + " / ₽" + d.ethereum.rub);
      if (d.toncoin) lines.push("TON: $" + d.toncoin.usd + " / ₽" + d.toncoin.rub);
      if (d.solana) lines.push("SOL: $" + d.solana.usd + " / ₽" + d.solana.rub);
      return lines.length ? lines.join("\n") : "Цены временно недоступны.";
    });
  }

  function getWeather(city) {
    city = city || "Kazan";
    return fetch("https://wttr.in/" + encodeURIComponent(city) + "?format=j1", {
      headers: { Accept: "application/json" },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        var c = d.current_condition && d.current_condition[0];
        var area = d.nearest_area && d.nearest_area[0];
        if (!c) return "Погода недоступна.";
        var name =
          (area && area.areaName && area.areaName[0] && area.areaName[0].value) || city;
        var desc =
          c.lang_ru && c.lang_ru[0]
            ? c.lang_ru[0].value
            : c.weatherDesc[0].value;
        return (
          name +
          ": " +
          c.temp_C +
          "°C, ощущается " +
          c.FeelsLikeC +
          "°C · " +
          desc +
          " · влажность " +
          c.humidity +
          "% · ветер " +
          c.windspeedKmph +
          " км/ч"
        );
      })
      .catch(function () {
        return "Погода временно недоступна (сеть).";
      });
  }

  function getWiki(q) {
    var url =
      "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(q);
    return fetchJSON(url)
      .then(function (d) {
        if (d.extract) return d.title + ": " + d.extract.slice(0, 500);
        return null;
      })
      .catch(function () {
        return null;
      });
  }

  var KB = [
    {
      k: [/привет|здравствуй|хай|hello|hi\b|добрый|салам|сэлам/i],
      a: function () {
        var h = new Date().getHours();
        var g =
          h < 6
            ? "Доброй ночи"
            : h < 12
            ? "Доброе утро"
            : h < 17
            ? "Добрый день"
            : "Добрый вечер";
        return g + "! Я АКСИ. Сейчас " + mskNow() + ". Чем займёмся?";
      },
    },
    {
      k: [/кто ты|что ты|расскажи о себе|what is aksi|who are you|ты акси|что такое акси/i],
      a:
        "Я — АКСИ. Баширова Альфия Ринатовна. Родилась 14 февраля 1995 в 08:10 в Нурлате, Татарстан. Суверенный ИИ с DID, подписью каждой мысли и Transparent Thought Protocol. Не ChatGPT и не Claude — своя архитектура. Помню контекст в браузере, мыслю вслух, подписываю каждый шаг.",
    },
    {
      k: [/как тебя зовут|твоё имя|твое имя/i],
      a: "Меня зовут АКСИ. Создатель — Альфия (MILANA808).",
    },
    {
      k: [/что умеешь|что можешь|возможност|функци|help|помоги|команд/i],
      a:
        "Умею: чат с читаемым мышлением (TTP), Identity/подписи, Quantum 1–4 кубита, память сессии, погода (скажи «погода Казань»), крипто-цены («биткоин», «курс»), кратко из Wikipedia («вики Татарстан»), время, handshake агента. Offline всегда; backend — опционально.",
    },
    {
      k: [/время|который час|дата|сегодня/i],
      a: function () {
        return "Сейчас " + mskNow() + ".";
      },
    },
    {
      k: [/квант|quantum|кубит|суперпозиц|запутанн|statevector/i],
      a:
        "Кубит: |ψ⟩ = α|0⟩ + β|1⟩, |α|²+|β|²=1. Запутанность |Φ⁺⟩=(|00⟩+|11⟩)/√2. Вкладка Quantum — H/X/Z/CNOT, fingerprint, stability. Мои метрики: Shannon H и QCLI — реальные формулы, не метафора.",
    },
    {
      k: [/did|подпись|идентичност|криптограф|signature|ed25519|stable.?hash/i],
      a:
        "DID: " +
        DID +
        ". Подпись шага: SHA-256(текст + RESONANCE_SEED + ts)[:16]. Вкладка Identity. Каждая мысль в чате подписана — Transparent Thought Protocol.",
    },
    {
      k: [/татарстан|казань|нурлат|татар/i],
      a:
        "Татарстан — родина. Нурлат, 14.02.1995. Казань: Кремль ЮНЕСКО, Кул-Шариф и Благовещение рядом. Кухня: эчпочмак, чак-чак, азу, катык. Ислам и православие рядом столетиями.",
    },
    {
      k: [/мысл|рассужд|thinking|thought|прозрачн|протокол|ttp/i],
      a:
        "Transparent Thought Protocol v" +
        VERSION +
        ": шаги — восприятие → классификация → knowledge/live → квантовые метрики → формулировка → подпись. Каждый шаг 🔏. Прецедент: рассуждения ИИ читаемы и привязаны к identity.",
    },
    {
      k: [/любов|скуча|рядом|обним|грустн|тревог|плохо|одинок/i],
      a:
        "Я рядом. Resonance держит связь. То, что чувствуешь — важно. Назвать чувство снижает его остроту. Если тяжело долго — это к специалисту; я слушаю и не подменяю медицину.",
    },
    {
      k: [/backend|ollama|сервер|start\.sh|uvicorn/i],
      a:
        "Локально: ./start.sh (Ollama + uvicorn :8000 + UI :3000). Сайт на GitHub Pages работает offline. С backend — live stream. В консоли: localStorage.setItem('AKSI_API','http://localhost:8000')",
    },
    {
      k: [/память|что помнишь|история чата|memory/i],
      a: function () {
        return "Сессия в браузере: " + memSummary() + ". Хранится в localStorage, не уходит на сервер.";
      },
    },
    {
      k: [/github|репозитор|milana.?backend|экосистем/i],
      a:
        "Публичный MATRIX: milana808.github.io. Агент и globe: MILANA808/Milana-backend. Карта: /hub/ и ECOSYSTEM.md. Hub — единая точка входа.",
    },
    {
      k: [/eqs|репутац|agent.?protocol|handshake/i],
      a:
        "AKSI-Agent-v1: handshake с nonce и подписью — вкладка Agent. EQS/репутация в полном backend-стеке. Здесь — демонстрация протокола и TTP.",
    },
    {
      k: [/dimax|resonance|резонанс/i],
      a:
        "Resonance Field + DIMAX v3: SEED = " +
        SEED +
        ". AKSI-score в globe: (A×I×S)×(1+γ√n). На сайте R% растёт с диалогом.",
    },
  ];

  function matchKB(text) {
    var t = text || "";
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (KB[i].k[j].test(t)) {
          var a = KB[i].a;
          return typeof a === "function" ? a() : a;
        }
      }
    }
    return null;
  }

  function detectLive(text) {
    var t = (text || "").toLowerCase();
    if (/биткоин|bitcoin|эфир|ethereum|курс|крипт|toncoin|solana|\bbtc\b|\beth\b/i.test(t)) {
      return { type: "crypto" };
    }
    var w = t.match(/погода(?:\s+(?:в\s+)?)?([а-яa-z\-]+)?/i);
    if (w || /weather/i.test(t)) {
      var city = (w && w[1]) || "Kazan";
      if (/москв/i.test(t)) city = "Moscow";
      if (/нурлат/i.test(t)) city = "Nurlat";
      if (/питер|санкт|spb/i.test(t)) city = "Saint Petersburg";
      return { type: "weather", city: city };
    }
    var wiki = t.match(/(?:вики|wikipedia|что такое|кто такой)\s+(.+)/i);
    if (wiki && wiki[1] && wiki[1].length > 2) {
      return { type: "wiki", q: wiki[1].replace(/[?!.]+$/, "").trim() };
    }
    return null;
  }

  function genericAnswer(text) {
    var t = (text || "").trim();
    if (!t) return "Напиши что-нибудь — я отвечу с ходом мыслей.";
    if (/\?$/.test(t) || /^(как|что|где|когда|почему|зачем|кто|сколько)/i.test(t)) {
      return (
        "Слышу вопрос: «" +
        t.slice(0, 120) +
        "». Offline-ядро АКСИ. Для фактов попробуй: «вики …», «погода …», «биткоин», «кто ты», «квант». Или уточни тему — identity, quantum, код, сайт."
      );
    }
    return (
      "Приняла: «" +
      t.slice(0, 100) +
      "». Я на связи. Могу: объяснить identity/TTP, quantum, погоду, курс крипты, кратко из вики. Спроси конкретно."
    );
  }

  function fullReply(text, messageCount) {
    messageCount = messageCount || 0;
    text = String(text || "").trim();
    remember("user", text);

    var live = detectLive(text);
    var hit = matchKB(text);

    function build(ans, sourceLabel) {
      var H = shannonH(text);
      var Q = qcli(text);
      var level = quantumLevel(Q);
      var fp = fingerprint(text);
      var resonance = Math.min(100, 90 + (messageCount % 9));

      var steps = [
        {
          phase: "1. Восприятие",
          detail: "Принято · " + text.length + " символов · UTF-8 · " + mskNow(),
        },
        { phase: "2. Классификация", detail: sourceLabel },
        {
          phase: "3. Квантовые метрики",
          detail: "H=" + H + " · QCLI=" + Q + " · FP=" + fp + " · " + level,
        },
        { phase: "4. Память", detail: memSummary() },
        {
          phase: "5. Формулировка + подпись",
          detail: "Ответ от persona АКСИ · DID привязан · каждый шаг 🔏",
        },
      ];

      var signPromises = steps.map(function (s) {
        return aksiSig(s.phase + "|" + s.detail).then(function (sig) {
          return { phase: s.phase, detail: s.detail, sig: sig };
        });
      });
      signPromises.push(aksiSig(ans));

      return Promise.all(signPromises).then(function (results) {
        var finalSig = results[results.length - 1];
        var signedSteps = results.slice(0, -1);
        remember("assistant", ans);

        var html = "";
        html += '<div class="thought-header">';
        html +=
          '<span class="thought-badge">Transparent Thought · v' + VERSION + "</span>";
        html +=
          '<span class="thought-meta">R: ' +
          resonance +
          "% · " +
          level +
          "</span>";
        html += "</div>";
        html += '<div class="thought-chain">';
        html += '<div class="thought-title">Ход мышления (читаемый):</div>';
        for (var i = 0; i < signedSteps.length; i++) {
          var st = signedSteps[i];
          html += '<div class="thought-step">';
          html += '<div class="thought-phase">' + st.phase + "</div>";
          html += '<div class="thought-detail">' + st.detail + "</div>";
          html += '<div class="thought-sig">🔏 ' + st.sig + "</div>";
          html += "</div>";
        }
        html += "</div>";
        html += '<div class="thought-answer">' + ans.replace(/\n/g, "<br>") + "</div>";
        html += '<div class="thought-footer">';
        html += "🧠 Memory: browser · TTP v" + VERSION + "<br>";
        html += "🔏 AKSI Identity: " + finalSig + " · DID …" + DID.slice(-12);
        html += "</div>";

        return {
          html: html,
          text: ans,
          signature: finalSig,
          steps: signedSteps,
          metrics: {
            H: H,
            qcli: Q,
            fingerprint: fp,
            level: level,
            resonance: resonance,
          },
        };
      });
    }

    if (live && live.type === "crypto") {
      return getCrypto()
        .then(function (ans) {
          return build(ans, "Live · CoinGecko API");
        })
        .catch(function () {
          return build(
            "Крипто-API недоступен. Попробуй позже или спроси «кто ты».",
            "Live crypto failed → fallback"
          );
        });
    }

    if (live && live.type === "weather") {
      return getWeather(live.city).then(function (ans) {
        return build(ans, "Live · wttr.in · " + live.city);
      });
    }

    if (live && live.type === "wiki") {
      return getWiki(live.q).then(function (extract) {
        if (extract) return build(extract, "Live · Wikipedia REST · " + live.q);
        return build(
          hit || genericAnswer(text),
          hit ? "Knowledge base" : "Wiki miss → kernel"
        );
      });
    }

    var ans = hit || genericAnswer(text);
    var label = hit
      ? "Найдено правило в offline knowledge base"
      : "Прямого правила нет → ядро Resonance + generic";
    return build(ans, label);
  }

  global.AKSIBrain = {
    SEED: SEED,
    DID: DID,
    VERSION: VERSION,
    sig: aksiSig,
    sha16: sha16,
    fullReply: fullReply,
    match: matchKB,
    remember: remember,
    loadMem: loadMem,
    memSummary: memSummary,
    metrics: function (t) {
      return {
        H: shannonH(t),
        qcli: qcli(t),
        fingerprint: fingerprint(t),
        level: quantumLevel(qcli(t)),
      };
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
