/**
 * AKSI Web — internet intelligence
 * Wikipedia RU/EN · OpenSearch · DuckDuckGo · always meaningful
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-web";
  var CACHE = "aksi:web:cache:v1";
  function utf8len(s) { return String(s || "").length; }
  function cacheGet(k) {
    try {
      var all = JSON.parse(localStorage.getItem(CACHE) || "{}");
      var e = all[k];
      if (e && Date.now() - e.ts < 1000 * 60 * 30) return e.data;
    } catch (e) {}
    return null;
  }
  function cacheSet(k, data) {
    try {
      var all = JSON.parse(localStorage.getItem(CACHE) || "{}");
      all[k] = { ts: Date.now(), data: data };
      var keys = Object.keys(all);
      if (keys.length > 40) {
        keys.sort(function (a, b) { return all[a].ts - all[b].ts; });
        keys.slice(0, keys.length - 30).forEach(function (x) { delete all[x]; });
      }
      localStorage.setItem(CACHE, JSON.stringify(all));
    } catch (e) {}
  }
  function fetchJson(url, ms) {
    ms = ms || 7000;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, ms);
    return fetch(url, { headers: { Accept: "application/json" }, signal: ctrl && ctrl.signal })
      .then(function (r) {
        clearTimeout(t);
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function (e) { clearTimeout(t); throw e; });
  }
  function clean(q) {
    return String(q || "")
      .replace(/^(найди|поиск|search|в интернете|в сети|google|гугл)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  function wikiSummary(lang, title) {
    var url = "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title);
    return fetchJson(url, 6000).then(function (j) {
      if (!j || j.type === "disambiguation") return null;
      var text = j.extract || (j.description ? String(j.description) : "");
      if (!text) return null;
      return {
        source: "wikipedia:" + lang,
        title: j.title || title,
        text: String(text).slice(0, 1200),
        url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || "",
      };
    }).catch(function () { return null; });
  }
  function wikiOpenSearch(lang, q) {
    var url =
      "https://" + lang +
      ".wikipedia.org/w/api.php?action=opensearch&limit=5&namespace=0&format=json&origin=*&search=" +
      encodeURIComponent(q);
    return fetchJson(url, 6000).then(function (j) {
      var out = [];
      if (!j || !j[1]) return out;
      for (var i = 0; i < j[1].length; i++) {
        out.push({
          source: "wiki-search:" + lang,
          title: j[1][i],
          text: (j[2] && j[2][i]) || "",
          url: (j[3] && j[3][i]) || "",
        });
      }
      return out;
    }).catch(function () { return []; });
  }
  function ddg(q) {
    var url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1&skip_disambig=1";
    return fetchJson(url, 6500).then(function (j) {
      var out = [];
      if (!j) return out;
      if (j.AbstractText)
        out.push({ source: "duckduckgo", title: j.Heading || q, text: String(j.AbstractText).slice(0, 1000), url: j.AbstractURL || "" });
      if (j.Answer)
        out.push({ source: "ddg-answer", title: "Краткий ответ", text: String(j.Answer).slice(0, 600), url: "" });
      if (j.Definition)
        out.push({ source: "ddg-def", title: "Определение", text: String(j.Definition).slice(0, 600), url: j.DefinitionURL || "" });
      (j.RelatedTopics || []).slice(0, 4).forEach(function (t) {
        if (t && t.Text)
          out.push({ source: "ddg-related", title: (t.FirstURL || "").split("/").pop() || "related", text: String(t.Text).slice(0, 400), url: t.FirstURL || "" });
      });
      return out;
    }).catch(function () { return []; });
  }
  function compose(q, hits) {
    hits = (hits || []).filter(function (h) { return h && (h.text || h.title); });
    if (!hits.length) {
      return {
        ok: false,
        text: "По запросу «" + q + "» в открытых источниках сейчас нет ясного материала. Уточните формулировку — отвечу из локальных знаний, если смогу.",
        sources: [],
        offline_hint: true,
      };
    }
    hits.sort(function (a, b) { return utf8len(b.text) - utf8len(a.text); });
    var main = hits[0];
    var body = String(main.text || "").trim();
    if (body.length > 1000) {
      var cut = body.lastIndexOf(".", 1000);
      body = cut > 350 ? body.slice(0, cut + 1) : body.slice(0, 1000) + "…";
    }
    var lines = [];
    if (main.title && main.title !== "Краткий ответ" && main.title !== "Определение") {
      lines.push("«" + main.title + "»", "");
    }
    lines.push(body);
    var extra = hits.slice(1, 3).filter(function (h) {
      return h.text && h.text !== main.text && h.text.length > 40;
    });
    if (extra.length) {
      lines.push("");
      extra.forEach(function (h) {
        lines.push("• " + String(h.text).slice(0, 220) + (h.text.length > 220 ? "…" : ""));
      });
    }
    var sources = [];
    hits.forEach(function (h) {
      if (h.url && sources.indexOf(h.url) === -1) sources.push(h.url);
    });
    if (sources.length) {
      lines.push("", "Источники:");
      sources.slice(0, 4).forEach(function (u, i) { lines.push(i + 1 + ". " + u); });
    }
    return { ok: true, text: lines.join("\n"), sources: sources, hits: hits.slice(0, 8), meta: "web·" + (main.source || "net") };
  }
  function search(q, opts) {
    opts = opts || {};
    q = clean(q);
    if (!q) return Promise.resolve({ ok: false, text: "Напишите, что искать в сети.", sources: [] });
    var ck = q.toLowerCase();
    if (!opts.noCache) {
      var cached = cacheGet(ck);
      if (cached) return Promise.resolve(Object.assign({ cached: true }, cached));
    }
    var term = q.split(/\s+/).slice(0, 8).join(" ");
    return Promise.all([
      wikiSummary("ru", term),
      wikiSummary("en", term),
      wikiOpenSearch("ru", term),
      wikiOpenSearch("en", term),
      ddg(term),
    ]).then(function (parts) {
      var hits = [];
      parts.forEach(function (p) {
        if (!p) return;
        if (Array.isArray(p)) hits = hits.concat(p);
        else hits.push(p);
      });
      var topTitle = null;
      for (var i = 0; i < hits.length; i++) {
        if (hits[i].source && hits[i].source.indexOf("wiki-search") === 0 && hits[i].title) {
          topTitle = hits[i].title;
          break;
        }
      }
      var enrich = Promise.resolve(null);
      if (topTitle && topTitle.toLowerCase() !== term.toLowerCase()) {
        enrich = wikiSummary("ru", topTitle).then(function (s) { return s || wikiSummary("en", topTitle); });
      }
      return enrich.then(function (more) {
        if (more) hits.unshift(more);
        var result = compose(q, hits);
        if (result.ok) cacheSet(ck, result);
        return result;
      });
    }).catch(function () {
      return {
        ok: false,
        text: "Сейчас нет доступа к сети или источники не ответили. Могу ответить из локальных знаний — переформулируйте вопрос или подключите Ollama в Настройках.",
        sources: [],
        offline: true,
      };
    });
  }
  function needsWeb(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low || low.length < 2) return false;
    if (/^(запомни|выучи)\s*[:\s]/i.test(low)) return false;
    if (/^(привет|hello|hi|whoami|\/demo|статус)\b/.test(low)) return false;
    if (/^(найди|поиск|в интернете|что такое|кто такой|кто такая|расскажи о|новости)/i.test(low)) return true;
    if (/\?$/.test(low)) return true;
    if (/^(кто|что|как|почему|где|когда|сколько|какой|какая)\s/i.test(low)) return true;
    if (low.split(/\s+/).length >= 4) return true;
    return false;
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>Сеть · поиск</h2>' +
      '<p class="muted">Wikipedia + DuckDuckGo</p>' +
      '<input id="webIn" placeholder="Что найти в интернете?">' +
      '<div class="row"><button type="button" class="btn primary" id="webGo">Найти</button></div>' +
      '<pre class="out" id="webOut">—</pre></div>';
    document.getElementById("webGo").onclick = function () {
      var q = document.getElementById("webIn").value;
      document.getElementById("webOut").textContent = "Ищу…";
      search(q).then(function (r) {
        document.getElementById("webOut").textContent = r.text + (r.meta ? "\n\n[" + r.meta + "]" : "");
      });
    };
  }
  G.AKSI_WEB = { version: VER, search: search, needsWeb: needsWeb, clean: clean, mount: mount };
})(typeof window !== "undefined" ? window : this);
