/**
 * AKSI Brain v6 — conversational agent
 * Layers: KB → live APIs → Wikipedia → memory-aware fallback
 * Not a foundation LLM; pairs with backend Ollama when available.
 */
(function (global) {
  "use strict";
  var SEED = "AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var VERSION = "6.0";

  function enc(s) {
    return new TextEncoder().encode(String(s));
  }

  function shaHex(t) {
    if (!global.crypto || !crypto.subtle) {
      var h = 0x811c9dc5,
        i;
      for (i = 0; i < t.length; i++) {
        h ^= t.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
      return Promise.resolve((h >>> 0).toString(16).padStart(8, "0"));
    }
    return crypto.subtle.digest("SHA-256", enc(t)).then(function (b) {
      return Array.prototype.map
        .call(new Uint8Array(b), function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("");
    });
  }

  function aksiSig(message) {
    return shaHex(String(message) + SEED + Date.now()).then(function (h) {
      return h.slice(0, 16).toUpperCase();
    });
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
        if (!r.ok) throw new Error("http");
        return r.json();
      })
      .catch(function (e) {
        clearTimeout(t);
        throw e;
      });
  }

  function getCrypto() {
    return fetchJSON(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,toncoin,solana&vs_currencies=usd,rub",
      5000
    ).then(function (d) {
      var lines = [];
      if (d.bitcoin) lines.push("BTC: $" + d.bitcoin.usd + " / ₽" + d.bitcoin.rub);
      if (d.ethereum) lines.push("ETH: $" + d.ethereum.usd + " / ₽" + d.ethereum.rub);
      if (d.toncoin) lines.push("TON: $" + d.toncoin.usd + " / ₽" + d.toncoin.rub);
      if (d.solana) lines.push("SOL: $" + d.solana.usd + " / ₽" + d.solana.rub);
      return lines.length ? lines.join("\n") : null;
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
        if (!c) return null;
        var name =
          (area && area.areaName && area.areaName[0] && area.areaName[0].value) || city;
        var desc =
          c.lang_ru && c.lang_ru[0] ? c.lang_ru[0].value : c.weatherDesc[0].value;
        return name + ": " + c.temp_C + "°C · " + desc + " · влажность " + c.humidity + "%";
      })
      .catch(function () {
        return null;
      });
  }

  function getWikiSummary(title, lang) {
    lang = lang || "ru";
    return fetchJSON(
      "https://" +
        lang +
        ".wikipedia.org/api/rest_v1/page/summary/" +
        encodeURIComponent(title),
      4500
    )
      .then(function (d) {
        if (!d || d.type === "disambiguation" || !d.extract) return null;
        return {
          title: d.title,
          text: d.extract.slice(0, 900),
          url:
            (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
            "",
        };
      })
      .catch(function () {
        return null;
      });
  }

  function searchWiki(query) {
    var q = String(query || "")
      .replace(
        /^(что такое|кто такой|кто такая|расскажи про|объясни|what is|who is)\s+/i,
        ""
      )
      .replace(/[?!.]+$/g, "")
      .trim();
    if (q.length < 2) return Promise.resolve(null);
    var searchUrl =
      "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) +
      "&limit=3&namespace=0&format=json&origin=*";
    return fetchJSON(searchUrl, 4500)
      .then(function (data) {
        var titles = data && data[1];
        if (!titles || !titles.length) return getWikiSummary(q, "en");
        return getWikiSummary(titles[0], "ru").then(function (r) {
          return r || getWikiSummary(q, "en");
        });
      })
      .catch(function () {
        return getWikiSummary(q, "en");
      });
  }

  var KB = [
    {
      k: [/привет|здравствуй|хай|hello|hi\b|добрый/i],
      a: function () {
        return "Здравствуйте. Я АКСИ — ваш агент на этой странице. Могу объяснить факты (Wikipedia), курсы крипты, погоду, помнить наш диалог. Спросите что угодно.";
      },
    },
    {
      k: [/кто ты|что ты такое|what are you|who are you|что такое акси/i],
      a:
        "Я АКСИ — суверенный ИИ-агент линии Альфии (14.02.1995). У меня есть кодекс, DID и память разговора в вашем браузере. Я не корпоративный чат без имени: я — именной интерфейс с открытыми источниками. Для полноценной большой модели подключают backend + Ollama на вашем сервере.",
    },
    {
      k: [/как тебя зовут/i],
      a: "АКСИ.",
    },
    {
      k: [/что умеешь|что можешь|help|помощ/i],
      a:
        "1) Ответы по знаниям Wikipedia\n2) Курсы BTC/ETH/TON/SOL\n3) Погода\n4) Долгая память диалога\n5) Кодекс и отказ от вреда\n6) Если запущен backend с Ollama — полноценная генерация как у большой модели",
    },
    {
      k: [/время|который час|дата сегодня/i],
      a: function () {
        try {
          return (
            new Date().toLocaleString("ru-RU", {
              timeZone: "Europe/Moscow",
              dateStyle: "full",
              timeStyle: "medium",
            }) + " (МСК)"
          );
        } catch (e) {
          return new Date().toLocaleString("ru-RU");
        }
      },
    },
    {
      k: [/did|подпись|идентичност/i],
      a: "DID: " + DID + ". Подпись шага строится через SHA-256 от текста и seed.",
    },
    {
      k: [/спасибо|благодар/i],
      a: "Пожалуйста. Я здесь.",
    },
  ];

  function matchKB(text) {
    for (var i = 0; i < KB.length; i++) {
      for (var j = 0; j < KB[i].k.length; j++) {
        if (KB[i].k[j].test(text || "")) {
          var a = KB[i].a;
          return typeof a === "function" ? a() : a;
        }
      }
    }
    return null;
  }

  function detectLive(text) {
    var t = (text || "").toLowerCase();
    if (/биткоин|bitcoin|эфир|ethereum|курс|крипт|\bbtc\b|\beth\b|solana|тонкоин/i.test(t))
      return { type: "crypto" };
    if (/погода|weather/i.test(t)) {
      var city = "Moscow";
      if (/питер|санкт|spb/i.test(t)) city = "Saint Petersburg";
      if (/казан/i.test(t)) city = "Kazan";
      if (/москв/i.test(t)) city = "Moscow";
      return { type: "weather", city: city };
    }
    return null;
  }

  function conversational(text, memoryHint) {
    var base =
      "Слышу вас. Я могу уточнить факты через Wikipedia, проверить курсы или погоду. " +
      "Сформулируйте вопрос конкретнее — так ответ будет точнее.";
    if (memoryHint && memoryHint.length > 30) {
      base +=
        "\n\nУчитываю наш прошлый диалог (фрагмент памяти есть). Если нужно опереться на что-то сказанное ранее — напомните ключевую фразу.";
    }
    return base + "\n\nЗапрос: «" + String(text).slice(0, 160) + "».";
  }

  function fullReply(text, messageCount, opts) {
    messageCount = messageCount || 0;
    opts = opts || {};
    text = String(text || "").trim();
    var memoryHint = opts.memory || "";

    var live = detectLive(text);
    var hit = matchKB(text);

    function finish(ans, source) {
      return aksiSig(ans).then(function (sig) {
        return {
          text: ans,
          html: String(ans).replace(/\n/g, "<br>"),
          signature: sig,
          source: source || "aksi",
          metrics: { version: VERSION },
        };
      });
    }

    if (live && live.type === "crypto") {
      return getCrypto()
        .then(function (ans) {
          return finish(ans || "Курсы временно недоступны.", "coingecko");
        })
        .catch(function () {
          return finish("Курсы временно недоступны.", "fail");
        });
    }

    if (live && live.type === "weather") {
      return getWeather(live.city).then(function (ans) {
        return finish(ans || "Погода недоступна.", "wttr");
      });
    }

    if (hit) return finish(hit, "kb");

    // Wikipedia for substantive questions
    var wantWiki =
      /[?]/.test(text) ||
      /^(что|кто|где|когда|почему|зачем|как|расскажи|объясни|what|who|why|how)\b/i.test(
        text
      ) ||
      text.split(/\s+/).length >= 3;

    if (wantWiki) {
      return searchWiki(text).then(function (wiki) {
        if (wiki && wiki.text) {
          var ans = wiki.title + ". " + wiki.text;
          if (wiki.url) ans += "\n\nИсточник: Wikipedia · " + wiki.url;
          return finish(ans, "wikipedia");
        }
        return finish(conversational(text, memoryHint), "chat");
      });
    }

    return finish(conversational(text, memoryHint), "chat");
  }

  /** Call backend LLM if configured */
  function backendReply(text, history, memory) {
    var API = "";
    try {
      API = localStorage.getItem("AKSI_API") || "";
    } catch (e) {}
    if (!API) return Promise.resolve(null);

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, 25000);

    return fetch(API.replace(/\/$/, "") + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: text,
        mode: "aksi",
        history: (history || []).slice(-16),
        memory: memory || "",
      }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error("api");
        return r.json();
      })
      .then(function (j) {
        if (j && j.answer) {
          return {
            text: j.answer,
            html: String(j.answer).replace(/\n/g, "<br>"),
            signature: j.signature || "",
            source: "backend-llm",
          };
        }
        return null;
      })
      .catch(function () {
        clearTimeout(timer);
        return null;
      });
  }

  global.AKSIBrain = {
    VERSION: VERSION,
    DID: DID,
    fullReply: fullReply,
    backendReply: backendReply,
    searchWiki: searchWiki,
    match: matchKB,
    sig: aksiSig,
  };
})(typeof window !== "undefined" ? window : globalThis);
