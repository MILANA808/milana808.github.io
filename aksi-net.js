/**
 * AKSI Net Core v1.1 — Wikipedia/DDG/Wikidata → answer
 * window.AKSI_CORE
 */
(function (global) {
  "use strict";
  var CACHE_KEY = "aksi_core_cache_v1";
  var CACHE_TTL = 1000 * 60 * 30;

  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
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

  function fetchJson(url, timeoutMs) {
    timeoutMs = timeoutMs || 5000;
    return new Promise(function (resolve, reject) {
      var done = false;
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        try { if (ctrl) ctrl.abort(); } catch (e) {}
        reject(new Error("timeout"));
      }, timeoutMs);
      fetch(url, { headers: { Accept: "application/json" }, signal: ctrl && ctrl.signal })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (j) {
          if (done) return;
          done = true; clearTimeout(t); resolve(j);
        })
        .catch(function (e) {
          if (done) return;
          done = true; clearTimeout(t); reject(e);
        });
    });
  }

  function cleanQuery(q) {
    return String(q || "")
      .replace(/^(найди|поиск|search|wiki\s*:)\s*/i, "")
      .replace(/^(что такое|кто такой|кто такая|расскажи про|расскажи о)\s+/i, "")
      .replace(/\?+$/g, "")
      .trim() || q;
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

  function enrichWikiTitle(title) {
    if (!title) return Promise.resolve(null);
    return fetchJson("https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title), 4500)
      .then(function (j) {
        if (!j || !j.extract) return null;
        return {
          source: "wikipedia",
          title: j.title || title,
          text: String(j.extract).slice(0, 1000),
          url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
        };
      }).catch(function () { return null; });
  }

  function searchWikidata(q) {
    var url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
      encodeURIComponent(q) + "&language=ru&uselang=ru&limit=4&format=json&origin=*";
    return fetchJson(url, 4000).then(function (j) {
      if (!j || !Array.isArray(j.search)) return [];
      return j.search.map(function (s) {
        return { source: "wikidata", title: s.label || s.id, text: s.description || "", url: "https://www.wikidata.org/wiki/" + s.id };
      });
    }).catch(function () { return []; });
  }

  function composeAnswer(q, hits) {
    hits = (hits || []).filter(function (h) { return h && (h.text || h.title); });
    if (!hits.length) {
      return { ok: false, text: "", sources: [], hits: [] };
    }
    var main = hits[0];
    var lines = ["【Ядро АКСИ】"];
    if (main.title) lines.push("Тема: " + main.title);
    lines.push("");
    lines.push(main.text || main.title || "");
    if (hits.length > 1) {
      lines.push("");
      lines.push("— ещё —");
      hits.slice(1, 3).forEach(function (h, i) {
        var bit = (h.text || h.title || "").slice(0, 200);
        if (bit) lines.push((i + 1) + ") " + bit);
      });
    }
    var sources = [];
    hits.forEach(function (h) {
      if (h.url && sources.indexOf(h.url) === -1) sources.push(h.url);
    });
    if (sources.length) {
      lines.push("");
      lines.push("Источники:");
      sources.slice(0, 3).forEach(function (u, i) { lines.push((i + 1) + ". " + u); });
    }
    return { ok: true, text: lines.join("\n"), sources: sources, hits: hits, main: main };
  }

  function query(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ ok: false, text: "", hits: [] });
    var cached = cacheGet(q);
    if (cached) return Promise.resolve(cached);

    var searchQ = cleanQuery(q);

    return Promise.all([wikiSearch(searchQ), searchWikidata(searchQ)]).then(function (parts) {
      var hits = [];
      parts.forEach(function (a) { if (Array.isArray(a)) hits = hits.concat(a); });
      var top = hits[0];
      var enrich = top && top.title ? enrichWikiTitle(top.title) : Promise.resolve(null);
      return enrich.then(function (extra) {
        if (extra) hits.unshift(extra);
        var result = composeAnswer(q, hits);
        if (result.ok) cacheSet(q, result);
        return result;
      });
    }).catch(function () {
      return { ok: false, text: "", hits: [] };
    });
  }

  function needsNet(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low || low.length < 2) return false;
    if (/^(запомни|выучи)\s*[:\s]/i.test(low)) return false;
    if (/забудь всё|что ты помнишь|что ты знаешь/i.test(low)) return false;
    if (/^(привет|здравствуй|добрый|hello|hi)\b/.test(low)) return false;
    if (/кто ты|что умеешь|что можешь|формул|протокол|eqs|метрик|квант|помощь|help|контакт/i.test(low) && low.length < 55) return false;
    if (/^(поиск|найди|search|кто такой|что такое|wiki\s*:)/i.test(low)) return true;
    if (/^(кто|что|как|где|когда|сколько|почему)\s+/i.test(low) && low.split(/\s+/).length >= 3) return true;
    return false;
  }

  global.AKSI_CORE = {
    query: query,
    ask: query,
    needsNet: needsNet,
    version: "1.1.0"
  };
})(typeof window !== "undefined" ? window : this);

/* Transparent answer-quality layer: loaded after the stable network core. */
(function () {
  "use strict";
  function load() {
    if (document.querySelector('script[data-aksi-quality]')) return;
    var s = document.createElement("script");
    s.src = "aksi-answer-quality.js?v=1";
    s.async = true;
    s.setAttribute("data-aksi-quality", "1");
    (document.head || document.documentElement).appendChild(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();