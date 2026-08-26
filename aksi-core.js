/**
 * AKSI Core v5.1 compact — search + local + compose
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var CACHE_KEY = "aksi_core_cache_v1", CACHE_TTL = 18e5, VERSION = "5.1.0";
  function simpleHash(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function cacheGet(q) {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      var e = c[simpleHash(q)];
      if (e && Date.now() - e.ts < CACHE_TTL) return e.data;
    } catch (e) {}
    return null;
  }
  function cacheSet(q, data) {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      c[simpleHash(q)] = { ts: Date.now(), data: data };
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function fetchJson(url, ms) {
    ms = ms || 6500;
    return new Promise(function (resolve, reject) {
      var done = false, ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var t = setTimeout(function () {
        if (done) return; done = true;
        try { if (ctrl) ctrl.abort(); } catch (e) {}
        reject(new Error("timeout"));
      }, ms);
      fetch(url, { headers: { Accept: "application/json" }, signal: ctrl && ctrl.signal })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (j) { if (done) return; done = true; clearTimeout(t); resolve(j); })
        .catch(function (e) { if (done) return; done = true; clearTimeout(t); reject(e); });
    });
  }
  function cleanQuery(q) {
    return String(q || "")
      .replace(/^(найди|поиск|search|wiki\s*:)\s*/i, "")
      .replace(/^(что такое|кто такой|кто такая|расскажи про|расскажи о|объясни)\s+/i, "")
      .replace(/\?+$/g, "").trim() || String(q || "").trim();
  }
  function mskNow() {
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        timeZone: "Europe/Moscow", weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date()) + " (MSK)";
    } catch (e) { return new Date().toLocaleString("ru-RU"); }
  }
  function localKnowledge(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low) return null;
    if (/^(привет|здравств|добрый|hello|hi|hey)\b/.test(low))
      return "Привет. Я АКСИ — суверенное ядро на твоём устройстве.\nСпроси по делу, или: whoami · /demo · что такое …";
    if (/^(пока|до связи|bye)\b/.test(low)) return "На связи. Память и ledger остаются у тебя.";
    if (/спасибо|благодар/.test(low)) return "Всегда пожалуйста.";
    if (/кто ты|что ты такое|who are you/.test(low))
      return "Я АКСИ Core v" + VERSION + ".\nLocal-first: поиск, память, proof-ledger.\nКонтакт: aksilove@internet.ru";
    if (/что умеешь|что можешь|помощь|help|команды/.test(low))
      return "• поиск Wikipedia/DDG\n• память: запомни: …\n• MATRIX: /aksi-matrix/\n• Ollama по желанию";
    if (/время|который час|дата|сегодня/.test(low)) return "Сейчас: " + mskNow() + ".";
    if (/контакт|почта|email/.test(low)) return "aksilove@internet.ru · @AKSILOVE";
    if (/формул|aksi\s*=/.test(low)) return "AKSI = (A × I × S) × (1 + 0.4√n)";
    if (/ollama|llm/.test(low)) return "ollama run llama3.2 → localhost:11434";
    if (/искусственный интеллект|что такое ии\b/.test(low))
      return "ИИ — системы, которые делают то, для чего раньше нужен был ум человека. Я — локальный агент: данные у тебя.";
    return null;
  }
  function searchWiki(q) {
    var term = encodeURIComponent(q);
    var urls = [
      "https://ru.wikipedia.org/api/rest_v1/page/summary/" + term,
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + term
    ];
    return Promise.all(urls.map(function (u) {
      return fetchJson(u, 5000).then(function (j) {
        if (!j || !j.extract) return null;
        return {
          source: "wikipedia", title: j.title || q,
          text: String(j.extract).slice(0, 1100),
          url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
        };
      }).catch(function () { return null; });
    })).then(function (a) { return a.filter(Boolean); });
  }
  function wikiSearch(q) {
    var url = "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) + "&limit=5&namespace=0&format=json&origin=*";
    return fetchJson(url, 5000).then(function (j) {
      if (!Array.isArray(j) || !j[1]) return [];
      var out = [], i;
      for (i = 0; i < j[1].length; i++) {
        out.push({ source: "wiki-search", title: j[1][i], text: (j[2] && j[2][i]) || "", url: (j[3] && j[3][i]) || "" });
      }
      return out;
    }).catch(function () { return []; });
  }
  function searchDdg(q) {
    var api = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1&skip_disambig=1";
    return fetchJson(api, 5500).then(function (j) {
      var out = [];
      if (j.AbstractText) out.push({ source: "duckduckgo", title: j.Heading || q, text: String(j.AbstractText).slice(0, 900), url: j.AbstractURL || "" });
      if (j.Answer) out.push({ source: "duckduckgo-answer", title: "Ответ", text: String(j.Answer).slice(0, 500), url: "" });
      return out;
    }).catch(function () { return []; });
  }
  function composeAnswer(q, hits) {
    hits = (hits || []).slice();
    if (!hits.length) {
      return { ok: false, text: "По «" + q + "» нет ясного ответа. Уточни запрос.", sources: [], hits: [] };
    }
    hits.sort(function (a, b) {
      return ((b.text && b.text.length) || 0) - ((a.text && a.text.length) || 0);
    });
    var main = hits[0], body = String(main.text || "").trim();
    if (body.length > 900) {
      var cut = body.lastIndexOf(".", 900);
      body = cut > 400 ? body.slice(0, cut + 1) : body.slice(0, 900) + "…";
    }
    var lines = [];
    if (main.title && main.title !== "Ответ") lines.push(main.title, "");
    lines.push(body);
    var sources = [];
    hits.forEach(function (h) { if (h.url && sources.indexOf(h.url) === -1) sources.push(h.url); });
    if (sources.length) {
      lines.push("", "Источники:");
      sources.slice(0, 3).forEach(function (u, i) { lines.push((i + 1) + ". " + u); });
    }
    lines.push("", "Если нужно — уточни, копнём глубже.");
    return { ok: true, text: lines.join("\n"), sources: sources, hits: hits, main: main };
  }
  function query(q, opts) {
    q = String(q || "").trim(); opts = opts || {};
    if (!q) return Promise.resolve({ ok: false, text: "Пустой запрос", sources: [], hits: [] });
    var local = localKnowledge(q);
    if (local && !opts.forceNet) {
      return Promise.resolve({ ok: true, text: local, sources: [], hits: [], local: true });
    }
    var searchQ = cleanQuery(q);
    var cached = cacheGet(searchQ);
    if (cached && !opts.noCache) return Promise.resolve(cached);
    return Promise.all([searchWiki(searchQ), wikiSearch(searchQ), searchDdg(searchQ)])
      .then(function (parts) {
        var hits = [];
        parts.forEach(function (arr) { if (Array.isArray(arr)) hits = hits.concat(arr); });
        var result = composeAnswer(q, hits);
        cacheSet(searchQ, result);
        return result;
      })
      .catch(function (err) {
        if (local) return { ok: true, text: local, sources: [], hits: [], local: true };
        return { ok: false, text: "Ядро: сеть недоступна — " + ((err && err.message) || err), sources: [], hits: [] };
      });
  }
  function ask(q) { return query(q); }
  function needsNet(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low || low.length < 2) return false;
    if (/^(запомни|выучи)\s*[:\s]/i.test(low)) return false;
    if (/^(привет|hello|hi|whoami|\/demo)\b/.test(low)) return false;
    if (localKnowledge(q) && low.length < 48) return false;
    if (/^(поиск|найди|что такое|кто такой|кто такая|расскажи)/i.test(low)) return true;
    if (/\?$/.test(low)) return true;
    if (/^(кто|что|как|почему|где|когда|сколько)\s/i.test(low)) return true;
    if (low.split(/\s+/).length >= 5) return true;
    return false;
  }
  var api = {
    query: query, ask: ask, needsNet: needsNet, cleanQuery: cleanQuery,
    localKnowledge: localKnowledge, searchWiki: searchWiki, searchDdg: searchDdg, version: VERSION
  };
  global.AKSI_CORE = api;
  global.AksiCore = api;
})(typeof window !== "undefined" ? window : this);
