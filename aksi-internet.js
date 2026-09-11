/**
 * AKSI Internet v2.1 — find evidence without private server
 * Primary: Wikipedia deep extracts + DuckDuckGo Instant
 * Optional: Jina reader for organic DDG (when available)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.1.0-find";
  var JINA = "https://r.jina.ai/";

  function abs(s) {
    return String(s || "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]\(https?:\/\/duckduckgo\.com[^)]*\)/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqPush(list, item) {
    if (!item || !(item.text || item.snippet || item.title)) return;
    var key = (item.url || item.title || "").toLowerCase().slice(0, 100);
    for (var i = 0; i < list.length; i++) {
      if (key && key === (list[i].url || list[i].title || "").toLowerCase().slice(0, 100)) return;
    }
    list.push(item);
  }

  async function fetchJSON(url) {
    var r = await fetch(url, { mode: "cors", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }

  async function fetchText(url, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () {
      try { if (ctrl) ctrl.abort(); } catch (e) {}
    }, timeoutMs || 12000);
    try {
      var r = await fetch(url, { mode: "cors", signal: ctrl ? ctrl.signal : undefined });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function wikiSearch(lang, q, limit) {
    var url =
      "https://" + lang + ".wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(q) + "&srlimit=" + (limit || 5) +
      "&srprop=snippet|titlesnippet&format=json&origin=*";
    var d = await fetchJSON(url);
    return ((d.query && d.query.search) || []).map(function (x) {
      return { title: x.title, snippet: abs(x.snippet || ""), pageid: x.pageid, source: "wikipedia-" + lang };
    });
  }

  async function wikiExtract(lang, title) {
    var url =
      "https://" + lang + ".wikipedia.org/w/api.php?action=query&prop=extracts&exintro=0&explaintext=1&exchars=1200&titles=" +
      encodeURIComponent(title) + "&format=json&origin=*";
    var d = await fetchJSON(url);
    var pages = (d.query && d.query.pages) || {};
    var keys = Object.keys(pages);
    if (!keys.length) return null;
    var p = pages[keys[0]];
    if (!p || p.missing != null) return null;
    return {
      title: p.title || title,
      text: abs(p.extract || ""),
      url: "https://" + lang + ".wikipedia.org/wiki/" + encodeURIComponent(String(p.title || title).replace(/ /g, "_")),
      source: "wikipedia-" + lang
    };
  }

  async function wikiSummary(lang, title) {
    var url =
      "https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(String(title).replace(/ /g, "_"));
    var r = await fetch(url, { mode: "cors" });
    if (!r.ok) return null;
    var d = await r.json();
    return {
      title: d.title || title,
      text: abs(d.extract || ""),
      url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || "",
      source: "wikipedia-" + lang
    };
  }

  async function ddgInstant(q) {
    try {
      var url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_html=1&skip_disambig=1";
      var r = await fetch(url, { mode: "cors" });
      if (!r.ok) return [];
      var d = await r.json();
      var out = [];
      if (d.AbstractText) {
        out.push({ title: d.Heading || "DuckDuckGo", text: abs(d.AbstractText), url: d.AbstractURL || "", source: "ddg-instant" });
      }
      (d.RelatedTopics || []).forEach(function (t) {
        if (out.length >= 6) return;
        if (t.Text && t.FirstURL) {
          out.push({ title: abs(t.Text).slice(0, 90), text: abs(t.Text), url: t.FirstURL, source: "ddg-related" });
        }
      });
      return out;
    } catch (e) {
      return [];
    }
  }

  function unwrapDdgUrl(url) {
    try {
      var m = String(url || "").match(/[?&]uddg=([^&]+)/);
      if (!m) return url;
      var decoded = decodeURIComponent(m[1]);
      if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
        try { decoded = decodeURIComponent(decoded); } catch (e) {}
      }
      return decoded;
    } catch (e) {
      return url;
    }
  }

  async function ddgWebOptional(q) {
    try {
      var target = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
      var md = await fetchText(JINA + target, 10000);
      var evidence = [];
      var re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
      var m, seen = {};
      while ((m = re.exec(md)) && evidence.length < 10) {
        var title = abs(m[1]);
        if (!title || /^Image/i.test(title)) continue;
        var url = unwrapDdgUrl(m[2]);
        if (!url || /duckduckgo\.com/i.test(url) || seen[url]) continue;
        seen[url] = 1;
        var after = abs(md.slice(m.index + m[0].length, m.index + m[0].length + 300));
        evidence.push({ title: title.slice(0, 140), text: after.slice(0, 400), url: url, source: "web-ddg" });
      }
      return evidence;
    } catch (e) {
      return [];
    }
  }

  async function gather(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, evidence: [], error: "empty" };
    var evidence = [];
    var errors = [];

    try {
      var ruHits = await wikiSearch("ru", query, 5);
      for (var i = 0; i < Math.min(3, ruHits.length); i++) {
        var ex = await wikiExtract("ru", ruHits[i].title);
        if (ex && ex.text && ex.text.length > 40) uniqPush(evidence, ex);
        else {
          var sum = await wikiSummary("ru", ruHits[i].title);
          if (sum && sum.text) uniqPush(evidence, sum);
          else
            uniqPush(evidence, {
              title: ruHits[i].title,
              text: ruHits[i].snippet,
              url: "https://ru.wikipedia.org/wiki/" + encodeURIComponent(ruHits[i].title.replace(/ /g, "_")),
              source: "wikipedia-ru"
            });
        }
      }
    } catch (e) {
      errors.push("wiki-ru: " + (e.message || e));
    }

    if (evidence.length < 2) {
      try {
        var enHits = await wikiSearch("en", query, 4);
        for (var j = 0; j < Math.min(2, enHits.length); j++) {
          var ex2 = await wikiExtract("en", enHits[j].title);
          if (ex2 && ex2.text) uniqPush(evidence, ex2);
        }
      } catch (e2) {
        errors.push("wiki-en: " + (e2.message || e2));
      }
    }

    try {
      var inst = await ddgInstant(query);
      for (var k = 0; k < inst.length; k++) uniqPush(evidence, inst[k]);
    } catch (e3) {
      errors.push("ddg: " + (e3.message || e3));
    }

    if (opts.mode !== "lite") {
      try {
        var web = await ddgWebOptional(query);
        for (var w = 0; w < web.length; w++) uniqPush(evidence, web[w]);
      } catch (e4) {
        errors.push("web-optional: " + (e4.message || e4));
      }
    }

    return {
      ok: evidence.length > 0,
      query: query,
      evidence: evidence.slice(0, 12),
      errors: errors,
      version: VER,
      mode: "find-wiki-ddg"
    };
  }

  async function research(query, opts) {
    var pack = await gather(query, opts);
    if (G.AKSI_COMPREHEND && G.AKSI_COMPREHEND.comprehend) {
      var c = await G.AKSI_COMPREHEND.comprehend(query, { evidence: pack.evidence });
      return {
        ok: pack.ok,
        answer: c.answer,
        text: c.answer,
        source: c.source,
        evidence: pack.evidence,
        errors: pack.errors,
        version: VER,
        query: query,
        comprehend: c.mode
      };
    }
    var lines = ["По источникам:"];
    for (var i = 0; i < Math.min(3, pack.evidence.length); i++) {
      lines.push(abs(pack.evidence[i].text).slice(0, 400));
    }
    return {
      ok: pack.ok,
      answer: lines.join("\n\n"),
      text: lines.join("\n\n"),
      source: "internet-raw",
      evidence: pack.evidence,
      errors: pack.errors,
      version: VER,
      query: query
    };
  }

  async function deep(query, opts) {
    return research(query, opts);
  }

  G.AKSI_INTERNET = {
    version: VER,
    gather: gather,
    research: research,
    deep: deep
  };
})(typeof window !== "undefined" ? window : globalThis);
