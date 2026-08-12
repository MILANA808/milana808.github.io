/**
 * AKSI Brain v7 — answers real questions (Wikipedia + local KB)
 */
(function (global) {
  "use strict";
  var SEED = "AKSI_DIMAX_v3_2026";
  var DID = "did:aksi:ed25519:sovereign-2026";
  var VERSION = "7.0";

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
    timeoutMs = timeoutMs || 6000;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () {
      if (ctrl) try { ctrl.abort(); } catch (e) {}
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

  var LOCAL = [
    {
      re: /небо.*голуб|почему.*небо|sky.*blue|почему небо/i,
      a:
        "Небо кажется голубым из‑за рассеяния Рэлея: солнечный свет сталкивается с молекулами воздуха, и синяя часть спектра рассеивается сильнее красной. Поэтому днём мы видим голубой «купол», а на закате — красные и оранжевые тона (луч проходит длиннее и синий уже рассеян).",
    },
    {
      re: /что такое (ии|ai|искусственн\w+ интеллект)/i,
      a:
        "Искусственный интеллект — системы, которые решают задачи, обычно требующие человеческого мышления: распознавание, язык, планирование. Современные чат-модели обучаются на больших текстах и предсказывают следующий токен; это мощный, но не «живой» разум.",
    },
    {
      re: /кто (ты|вы)|что ты такое|что такое акси/i,
      a:
        "Я АКСИ — суверенный ИИ-агент. Работаю в браузере: отвечаю на вопросы, ищу факты в Wikipedia, помню диалог на вашем устройстве. Суверенный агент АКСИ.",
    },
    {
      re: /привет|здравствуй|добрый (день|вечер|утро)|hello|hi\b/i,
      a: "Здравствуйте. Я АКСИ. Спрашивайте — факты, объяснения, курсы, погоду.",
    },
    {
      re: /как дела/i,
      a: "В рабочем режиме. Чем помочь?",
    },
    {
      re: /спасибо|благодар/i,
      a: "Пожалуйста.",
    },
  ];

  function localKnowledge(text) {
    for (var i = 0; i < LOCAL.length; i++) {
      if (LOCAL[i].re.test(text || "")) return LOCAL[i].a;
    }
    return null;
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
      5500
    )
      .then(function (d) {
        if (!d || !d.extract) return null;
        if (d.type === "disambiguation") return null;
        return {
          title: d.title,
          text: String(d.extract).slice(0, 1100),
          url:
            (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
            "",
        };
      })
      .catch(function () {
        return null;
      });
  }

  function toSearchQuery(text) {
    var q = String(text || "")
      .replace(/[?!…]+/g, " ")
      .replace(/^(а |ну |скажи |пожалуйста |мне |то |же )/gi, "")
      .replace(
        /^(что такое|что значит|кто такой|кто такая|кто такие|расскажи (про|о)|объясни|почему|зачем|как работает|как устроен|what is|who is|why is|why are|how does)\s+/i,
        ""
      )
      .replace(/\s+/g, " ")
      .trim();
    if (/небо/i.test(text) && /голуб|син/i.test(text)) return "Рассеяние Рэлея";
    if (/биткоин|bitcoin/i.test(text)) return "Биткойн";
    if (q.length < 2) return String(text || "").slice(0, 80);
    return q.slice(0, 120);
  }

  function searchWiki(query) {
    var q = toSearchQuery(query);
    if (!q || q.length < 2) return Promise.resolve(null);
    var searchUrl =
      "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) +
      "&limit=5&namespace=0&format=json&origin=*";
    return fetchJSON(searchUrl, 5500)
      .then(function (data) {
        var titles = data && data[1];
        if (!titles || !titles.length) {
          return getWikiSummary(q, "ru").then(function (r) {
            return r || getWikiSummary(q, "en");
          });
        }
        function tryAt(i) {
          if (i >= titles.length) return getWikiSummary(q, "en");
          return getWikiSummary(titles[i], "ru").then(function (r) {
            if (r && r.text) return r;
            return tryAt(i + 1);
          });
        }
        return tryAt(0);
      })
      .catch(function () {
        return getWikiSummary(q, "en");
      });
  }

  function detectLive(text) {
    var t = (text || "").toLowerCase();
    if (/биткоин|bitcoin|эфир|ethereum|курс|крипт|\bbtc\b|\beth\b|solana|тонкоин|\bton\b/i.test(t))
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

  function fullReply(text, messageCount, opts) {
    messageCount = messageCount || 0;
    opts = opts || {};
    text = String(text || "").trim();

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

    if (!text) return finish("Напишите вопрос.", "empty");

    var loc = localKnowledge(text);
    if (loc) return finish(loc, "local");

    var live = detectLive(text);
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

    return searchWiki(text).then(function (wiki) {
      if (wiki && wiki.text) {
        var ans = wiki.title + ".\n\n" + wiki.text;
        if (wiki.url) ans += "\n\nИсточник: Wikipedia";
        return finish(ans, "wikipedia");
      }
      return finish(
        "Не нашла точной статьи по запросу «" +
          text.slice(0, 80) +
          "». Переформулируйте короче (например: «рассеяние Рэлея», «Биткойн», «фотосинтез») — или спросите иначе.",
        "miss"
      );
    });
  }

  function backendReply(text, history, memory) {
    var API = "";
    try {
      API = localStorage.getItem("AKSI_API") || "";
    } catch (e) {}
    if (!API) return Promise.resolve(null);
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (ctrl) try { ctrl.abort(); } catch (e) {}
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
        if (j && j.answer)
          return {
            text: j.answer,
            html: String(j.answer).replace(/\n/g, "<br>"),
            signature: j.signature || "",
            source: "backend-llm",
          };
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
    sig: aksiSig,
  };
})(typeof window !== "undefined" ? window : globalThis);
