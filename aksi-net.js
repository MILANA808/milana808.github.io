/**
 * AKSI Net Core — sovereign internet brain
 * Search → process → answer (Wikipedia, DuckDuckGo, Wikidata)
 * window.AKSI_CORE · Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var LEDGER_KEY = "aksi_core_ledger_v1";
  var CACHE_KEY = "aksi_core_cache_v1";
  var CACHE_TTL = 1000 * 60 * 30;

  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function appendCoreEvent(type, payload) {
    try {
      var chain = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]");
      if (!Array.isArray(chain)) chain = [];
      var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
      var body = { type: type, ts: Date.now(), prev: prev, payload: payload };
      body.hash = simpleHash(JSON.stringify(body));
      chain.push(body);
      localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-100)));
    } catch (e) {}
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
      var keys = Object.keys(c);
      if (keys.length > 40) {
        keys.sort(function (a, b) { return c[a].ts - c[b].ts; });
        keys.slice(0, keys.length - 30).forEach(function (k) { delete c[k]; });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function fetchJson(url, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (!done) { done = true; reject(new Error("timeout")); }
      }, timeoutMs);
      fetch(url, { headers: { Accept: "application/json" } })
        .then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .then(function (j) {
          if (!done) { done = true; clearTimeout(t); resolve(j); }
        })
        .catch(function (e) {
          if (!done) { done = true; clearTimeout(t); reject(e); }
        });
    });
  }
  function searchWiki(q) {
    var term = encodeURIComponent(q);
    var urls = [
      "https://ru.wikipedia.org/api/rest_v1/page/summary/" + term,
      "https://en.wikipedia.org/api/rest_v1/page/summary/" + term
    ];
    return Promise.all(urls.map(function (u) {
      return fetchJson(u, 6000).then(function (j) {
        if (!j || !j.extract) return null;
        return {
          source: "wikipedia",
          title: j.title || q,
          text: String(j.extract).slice(0, 900),
          url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
        };
      }).catch(function () { return null; });
    })).then(function (arr) { return arr.filter(Boolean); });
  }
  function wikiSearch(q) {
    var url = "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) + "&limit=5&namespace=0&format=json&origin=*";
    return fetchJson(url, 6000).then(function (j) {
      if (!Array.isArray(j) || !j[1]) return [];
      var out = [], i;
      for (i = 0; i < j[1].length; i++) {
        out.push({
          source: "wiki-search",
          title: j[1][i],
          text: (j[2] && j[2][i]) || "",
          url: (j[3] && j[3][i]) || ""
        });
      }
      return out;
    }).catch(function () { return []; });
  }
  function searchDdg(q) {
    var api = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1&skip_disambig=1";
    var proxies = [
      api,
      "https://api.allorigins.win/raw?url=" + encodeURIComponent(api),
      "https://corsproxy.io/?" + encodeURIComponent(api)
    ];
    function tryOne(i) {
      if (i >= proxies.length) return Promise.resolve([]);
      return fetchJson(proxies[i], 7000).then(function (j) {
        var out = [];
        if (j.AbstractText) {
          out.push({
            source: "duckduckgo",
            title: j.Heading || q,
            text: String(j.AbstractText).slice(0, 900),
            url: j.AbstractURL || ""
          });
        }
        if (j.Answer) {
          out.push({
            source: "duckduckgo-answer",
            title: "Ответ",
            text: String(j.Answer).slice(0, 500),
            url: ""
          });
        }
        if (Array.isArray(j.RelatedTopics)) {
          j.RelatedTopics.slice(0, 4).forEach(function (t) {
            if (t && t.Text) {
              out.push({
                source: "duckduckgo-related",
                title: (t.FirstURL || "").split("/").pop() || "related",
                text: String(t.Text).slice(0, 400),
                url: t.FirstURL || ""
              });
            } else if (t && t.Topics) {
              t.Topics.slice(0, 2).forEach(function (x) {
                if (x && x.Text) {
                  out.push({
                    source: "duckduckgo-related",
                    title: "related",
                    text: String(x.Text).slice(0, 400),
                    url: x.FirstURL || ""
                  });
                }
              });
            }
          });
        }
        return out.length ? out : tryOne(i + 1);
      }).catch(function () { return tryOne(i + 1); });
    }
    return tryOne(0);
  }
  function searchWikidata(q) {
    var url = "https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" +
      encodeURIComponent(q) + "&language=ru&uselang=ru&limit=5&format=json&origin=*";
    return fetchJson(url, 6000).then(function (j) {
      if (!j || !Array.isArray(j.search)) return [];
      return j.search.map(function (s) {
        return {
          source: "wikidata",
          title: s.label || s.id,
          text: s.description || "",
          url: "https://www.wikidata.org/wiki/" + s.id
        };
      }).filter(function (x) { return x.text || x.title; });
    }).catch(function () { return []; });
  }
  function enrichWikiTitle(title) {
    if (!title) return Promise.resolve(null);
    return fetchJson(
      "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title),
      5000
    ).then(function (j) {
      if (!j || !j.extract) return null;
      return {
        source: "wikipedia",
        title: j.title || title,
        text: String(j.extract).slice(0, 1000),
        url: (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ""
      };
    }).catch(function () { return null; });
  }
  function scoreHit(hit, q) {
    var low = q.toLowerCase();
    var t = ((hit.title || "") + " " + (hit.text || "")).toLowerCase();
    var sc = 0, words = low.split(/\s+/).filter(function (w) { return w.length > 2; });
    words.forEach(function (w) { if (t.indexOf(w) !== -1) sc += 2; });
    if (hit.source === "wikipedia") sc += 3;
    if (hit.source === "duckduckgo") sc += 2;
    if (hit.source === "duckduckgo-answer") sc += 4;
    if (hit.text && hit.text.length > 80) sc += 1;
    return sc;
  }
  function composeAnswer(q, hits) {
    hits = (hits || []).slice().sort(function (a, b) {
      return scoreHit(b, q) - scoreHit(a, q);
    });
    var seen = {}, uniq = [];
    hits.forEach(function (h) {
      var key = String(h.text || h.title || "").slice(0, 60).toLowerCase();
      if (!key || seen[key]) return;
      seen[key] = 1;
      uniq.push(h);
    });
    hits = uniq.slice(0, 6);
    if (!hits.length) {
      return {
        ok: false,
        text: "Ядро не нашло данных в сети по запросу «" + q + "».\nУточни формулировку.",
        sources: [],
        hits: []
      };
    }
    var main = hits[0];
    var lines = [];
    lines.push("【Ядро АКСИ】");
    if (main.title && main.title !== "Ответ") lines.push("Тема: " + main.title);
    lines.push("");
    lines.push(main.text || "");
    if (hits.length > 1) {
      lines.push("");
      lines.push("— ещё из сети —");
      hits.slice(1, 4).forEach(function (h, i) {
        var bit = (h.text || h.title || "").slice(0, 220);
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
      sources.slice(0, 4).forEach(function (u, i) {
        lines.push((i + 1) + ". " + u);
      });
    }
    return { ok: true, text: lines.join("\n"), sources: sources, hits: hits, main: main };
  }
  function query(q, opts) {
    q = String(q || "").trim();
    opts = opts || {};
    if (!q) return Promise.resolve({ ok: false, text: "Пустой запрос", sources: [], hits: [] });
    var cached = cacheGet(q);
    if (cached && !opts.noCache) {
      appendCoreEvent("core_cache_hit", { q: q.slice(0, 80) });
      return Promise.resolve(cached);
    }
    appendCoreEvent("core_search", { q: q.slice(0, 80) });
    return Promise.all([searchWiki(q), wikiSearch(q), searchDdg(q), searchWikidata(q)]).then(function (parts) {
      var hits = [];
      parts.forEach(function (arr) { if (Array.isArray(arr)) hits = hits.concat(arr); });
      var needEnrich = hits.filter(function (h) {
        return h.source === "wiki-search" && (!h.text || h.text.length < 40);
      })[0];
      var enrichP = needEnrich ? enrichWikiTitle(needEnrich.title) : Promise.resolve(null);
      return enrichP.then(function (extra) {
        if (extra) hits.unshift(extra);
        var result = composeAnswer(q, hits);
        cacheSet(q, result);
        appendCoreEvent("core_answer", { q: q.slice(0, 80), ok: result.ok, n: result.hits.length });
        return result;
      });
    }).catch(function (err) {
      return { ok: false, text: "Ядро: сбой сети — " + (err && err.message || err), sources: [], hits: [] };
    });
  }
  function ask(q) {
    return query(q).then(function (result) {
      if (!result.ok) return result;
      if (global.AKSI_LLM && typeof global.AKSI_LLM.call === "function") {
        var ctx = result.hits.slice(0, 4).map(function (h, i) {
          return (i + 1) + ". [" + h.source + "] " + (h.title || "") + ": " + (h.text || "").slice(0, 350);
        }).join("\n");
        var prompt =
          "На основе данных из интернета ответь на вопрос по-русски, ясно и по делу.\n" +
          "Вопрос: " + q + "\n\nДанные:\n" + ctx +
          "\n\nНе выдумывай факты сверх данных.";
        return global.AKSI_LLM.call(prompt).then(function (llm) {
          if (llm && llm.text) {
            var text = llm.text;
            if (result.sources && result.sources.length) {
              text += "\n\nИсточники:\n" + result.sources.slice(0, 4).map(function (u, i) {
                return (i + 1) + ". " + u;
              }).join("\n");
            }
            return { ok: true, text: text, sources: result.sources, hits: result.hits, refined: true };
          }
          return result;
        }).catch(function () { return result; });
      }
      return result;
    });
  }
  function needsNet(q) {
    var low = String(q || "").toLowerCase().trim();
    if (!low || low.length < 2) return false;
    if (/^(запомни|выучи)\s*[:\s]/i.test(low)) return false;
    if (/забудь всё|что ты помнишь|что ты знаешь/i.test(low)) return false;
    if (/^(привет|здравствуй|добрый|hello|hi)\b/.test(low) && low.length < 20) return false;
    if (/^(поиск|найди|search|кто такой|что такое|когда|где|сколько|новости)/i.test(low)) return true;
    if (/wiki\s*:/i.test(low)) return true;
    if (/\?$/.test(low) || /^(кто|что|как|почему|зачем|какой|какая|какое|где|когда|сколько)\s/i.test(low)) return true;
    if (low.split(/\s+/).length >= 4) return true;
    return false;
  }
  global.AKSI_CORE = {
    query: query,
    ask: ask,
    needsNet: needsNet,
    searchWiki: searchWiki,
    searchDdg: searchDdg,
    version: "1.0.0"
  };
})(typeof window !== "undefined" ? window : this);
