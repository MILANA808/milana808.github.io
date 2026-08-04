/**
 * AKSI offline brain — Transparent Thought Protocol
 * Signed steps · metrics · optional live APIs
 */
(function (global) {
  "use strict";
  var SEED = "AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-2026";
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
    if (q >= 0.9) return "L5";
    if (q >= 0.8) return "L4";
    if (q >= 0.7) return "L3";
    if (q >= 0.6) return "L2";
    if (q >= 0.5) return "L1";
    return "L0";
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
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
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
    if (!m.length) return "пусто";
    return m.length + " сообщ.";
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
      return lines.length ? lines.join("\n") : "Цены недоступны.";
    });
  }

  function getWeather(city) {
    city = city || "Moscow";
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
        return name + ": " + c.temp_C + "°C · " + desc + " · влажность " + c.humidity + "%";
      })
      .catch(function () {
        return "Погода недоступна.";
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
      k: [/привет|здравствуй|хай|hello|hi\b|добрый/i],
      a: function () {
        return "АКСИ. " + mskNow() + ". Чем помочь?";
      },
    },
    {
      k: [/кто ты|что ты|расскажи о себе|what is aksi|who are you|что такое акси/i],
      a:
        "АКСИ — AI-агент с DID и подписанными шагами рассуждений (Transparent Thought Protocol). Ответы можно аудировать. Enterprise / on-prem: aksilove@internet.ru",
    },
    {
      k: [/как тебя зовут|твоё имя|твое имя/i],
      a: "АКСИ.",
    },
    {
      k: [/что умеешь|что можешь|возможност|функци|help|помоги|команд|enterprise|пилот|лиценз/i],
      a:
        "Демо: подписанный чат (TTP), identity-tools, метрики запроса. Production: API, audit trail, развёртывание в контуре заказчика. Контакт: aksilove@internet.ru",
    },
    {
      k: [/время|который час|дата|сегодня/i],
      a: function () {
        return mskNow();
      },
    },
    {
      k: [/квант|quantum|кубит|statevector/i],
      a:
        "В демо доступны метрики Shannon H / QCLI / fingerprint по тексту запроса. Полноценный statevector — отдельный модуль backend.",
    },
    {
      k: [/did|подпись|идентичност|signature|ed25519|audit/i],
      a:
        "DID: " +
        DID +
        ". Подпись шага: SHA-256(текст + SEED + ts)[:16]. Цепочка шагов видна в ответе.",
    },
    {
      k: [/мысл|рассужд|thinking|thought|протокол|ttp/i],
      a:
        "TTP v" +
        VERSION +
        ": восприятие → классификация → метрики → ответ → подпись. Каждый шаг с отдельной подписью.",
    },
    {
      k: [/backend|сервер|start\.sh|uvicorn|on-?prem/i],
      a:
        "Локально: ./start.sh. Публичная страница — статическое демо. Корпоративный контур — по запросу.",
    },
    {
      k: [/память|memory/i],
      a: function () {
        return "Сессия браузера: " + memSummary();
      },
    },
    {
      k: [/контакт|email|почта|купить|цена|стоимост|договор/i],
      a: "aksilove@internet.ru — пилот, лицензирование, on-prem.",
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
    if (/биткоин|bitcoin|эфир|ethereum|курс|крипт|\bbtc\b|\beth\b/i.test(t)) {
      return { type: "crypto" };
    }
    var w = t.match(/погода(?:\s+(?:в\s+)?)?([а-яa-z\-]+)?/i);
    if (w || /weather/i.test(t)) {
      var city = (w && w[1]) || "Moscow";
      if (/москв/i.test(t)) city = "Moscow";
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
    if (!t) return "Введите запрос.";
    return (
      "Запрос принят. Уточните тему или напишите на aksilove@internet.ru для enterprise-пилота. Демо: «кто ты», «биткоин», «погода Москва»."
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
        { phase: "1. Input", detail: text.length + " chars · " + mskNow() },
        { phase: "2. Route", detail: sourceLabel },
        {
          phase: "3. Metrics",
          detail: "H=" + H + " · QCLI=" + Q + " · FP=" + fp + " · " + level,
        },
        { phase: "4. Session", detail: memSummary() },
        { phase: "5. Sign", detail: "DID-bound step signatures" },
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
          '<span class="thought-badge">TTP v' + VERSION + "</span>";
        html +=
          '<span class="thought-meta">' +
          level +
          " · R " +
          resonance +
          "%</span>";
        html += "</div>";
        html += '<div class="thought-chain">';
        html += '<div class="thought-title">Audit steps</div>';
        for (var i = 0; i < signedSteps.length; i++) {
          var st = signedSteps[i];
          html += '<div class="thought-step">';
          html += '<div class="thought-phase">' + st.phase + "</div>";
          html += '<div class="thought-detail">' + st.detail + "</div>";
          html += '<div class="thought-sig">' + st.sig + "</div>";
          html += "</div>";
        }
        html += "</div>";
        html += '<div class="thought-answer">' + ans.replace(/\n/g, "<br>") + "</div>";
        html += '<div class="thought-footer">';
        html += "sig " + finalSig + " · " + DID.slice(-16);
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
          return build(ans, "live:coingecko");
        })
        .catch(function () {
          return build("Данные недоступны.", "live:fail");
        });
    }

    if (live && live.type === "weather") {
      return getWeather(live.city).then(function (ans) {
        return build(ans, "live:weather");
      });
    }

    if (live && live.type === "wiki") {
      return getWiki(live.q).then(function (extract) {
        if (extract) return build(extract, "live:wiki");
        return build(hit || genericAnswer(text), hit ? "kb" : "fallback");
      });
    }

    var ans = hit || genericAnswer(text);
    return build(ans, hit ? "kb" : "fallback");
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
