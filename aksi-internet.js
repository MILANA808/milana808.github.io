/**
 * AKSI Internet v1.1 — browser-native research (no backend required)
 * Wikipedia RU/EN + optional DDG abstract via public endpoints
 * Deep path: evidence → Russian synthesis
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-browser";

  function abs(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  async function wikiOpenSearch(lang, q, limit) {
    limit = limit || 5;
    var url =
      "https://" +
      lang +
      ".wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) +
      "&limit=" +
      limit +
      "&namespace=0&format=json&origin=*";
    var r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("wiki opensearch " + r.status);
    var data = await r.json();
    var titles = data[1] || [];
    var descs = data[2] || [];
    var urls = data[3] || [];
    var out = [];
    for (var i = 0; i < titles.length; i++) {
      out.push({
        title: titles[i],
        snippet: descs[i] || "",
        url: urls[i] || "",
        source: "wikipedia-" + lang
      });
    }
    return out;
  }

  async function wikiSummary(lang, title) {
    var url =
      "https://" +
      lang +
      ".wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(title.replace(/ /g, "_"));
    var r = await fetch(url, { mode: "cors", headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    var d = await r.json();
    return {
      title: d.title || title,
      text: abs(d.extract || ""),
      url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || d.url || "",
      source: "wikipedia-" + lang,
      thumbnail: d.thumbnail && d.thumbnail.source
    };
  }

  async function ddgLite(q) {
    try {
      var url =
        "https://api.duckduckgo.com/?q=" +
        encodeURIComponent(q) +
        "&format=json&no_html=1&skip_disambig=1";
      var r = await fetch(url, { mode: "cors" });
      if (!r.ok) return [];
      var d = await r.json();
      var out = [];
      if (d.AbstractText) {
        out.push({
          title: d.Heading || "DuckDuckGo",
          text: abs(d.AbstractText),
          url: d.AbstractURL || "",
          source: "duckduckgo"
        });
      }
      var topics = d.RelatedTopics || [];
      for (var i = 0; i < topics.length && out.length < 5; i++) {
        var t = topics[i];
        if (t.Text && t.FirstURL) {
          out.push({
            title: abs(t.Text).slice(0, 80),
            text: abs(t.Text),
            url: t.FirstURL,
            source: "duckduckgo"
          });
        } else if (t.Topics) {
          for (var j = 0; j < t.Topics.length && out.length < 5; j++) {
            var u = t.Topics[j];
            if (u.Text && u.FirstURL) {
              out.push({
                title: abs(u.Text).slice(0, 80),
                text: abs(u.Text),
                url: u.FirstURL,
                source: "duckduckgo"
              });
            }
          }
        }
      }
      return out;
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
      var ru = await wikiOpenSearch("ru", query, opts.limit || 4);
      for (var i = 0; i < Math.min(3, ru.length); i++) {
        var sum = await wikiSummary("ru", ru[i].title);
        if (sum && sum.text) evidence.push(sum);
        else
          evidence.push({
            title: ru[i].title,
            text: ru[i].snippet || "",
            url: ru[i].url,
            source: "wikipedia-ru"
          });
      }
    } catch (e) {
      errors.push("wiki-ru: " + (e.message || e));
    }

    if (evidence.length < 2) {
      try {
        var en = await wikiOpenSearch("en", query, 3);
        for (var j = 0; j < Math.min(2, en.length); j++) {
          var sum2 = await wikiSummary("en", en[j].title);
          if (sum2 && sum2.text) evidence.push(sum2);
        }
      } catch (e2) {
        errors.push("wiki-en: " + (e2.message || e2));
      }
    }

    try {
      var ddg = await ddgLite(query);
      for (var k = 0; k < ddg.length; k++) {
        if (ddg[k].text && ddg[k].text.length > 40) evidence.push(ddg[k]);
      }
    } catch (e3) {
      errors.push("ddg: " + (e3.message || e3));
    }

    var seen = {};
    var uniq = [];
    for (var m = 0; m < evidence.length; m++) {
      var key = (evidence[m].url || evidence[m].title || "").toLowerCase();
      if (!key || seen[key]) continue;
      seen[key] = 1;
      uniq.push(evidence[m]);
    }

    return {
      ok: uniq.length > 0,
      query: query,
      evidence: uniq.slice(0, 8),
      errors: errors,
      version: VER,
      mode: "browser-native"
    };
  }

  function synthesize(query, pack) {
    var ev = (pack && pack.evidence) || [];
    if (!ev.length) {
      return {
        answer:
          "Не удалось получить открытые источники по запросу «" +
          query +
          "».\nПроверьте сеть. Попробуйте более точную формулировку.\n(браузерный интернет: Wikipedia RU/EN)",
        source: "internet-empty"
      };
    }
    var lines = [];
    lines.push("Глубинный обзор по открытым источникам:");
    lines.push("");
    for (var i = 0; i < Math.min(4, ev.length); i++) {
      var e = ev[i];
      var body = abs(e.text || e.snippet || "").slice(0, 420);
      lines.push(i + 1 + ") " + (e.title || "Источник"));
      if (body) lines.push(body + (body.length >= 420 ? "…" : ""));
      if (e.url) lines.push("→ " + e.url);
      lines.push("");
    }
    lines.push("—");
    lines.push(
      "Синтез АКСИ: выше — факты из публичных страниц (Wikipedia и др.). Это не закрытый «всезнающий» ответ; проверяйте первоисточники."
    );
    lines.push("Режим: browser-internet · " + VER);
    return { answer: lines.join("\n"), source: "internet-synthesis", evidence: ev };
  }

  async function research(query, opts) {
    var pack = await gather(query, opts);
    var syn = synthesize(query, pack);
    return {
      ok: pack.ok,
      answer: syn.answer,
      text: syn.answer,
      source: syn.source,
      evidence: pack.evidence,
      errors: pack.errors,
      version: VER,
      query: query
    };
  }

  async function deep(query, opts) {
    var r = await research(query, opts);
    var local = null;
    try {
      if (G.AKSI_BRAIN && G.AKSI_BRAIN.decide) {
        local = await G.AKSI_BRAIN.decide(query);
      } else if (G.AKSI_CORE && G.AKSI_CORE.decide) {
        local = await G.AKSI_CORE.decide(query);
      }
    } catch (e) {}
    if (local && local.answer && r.ok) {
      var merged =
        r.answer +
        "\n\n——\nЛокальный слой АКСИ:\n" +
        String(local.answer).slice(0, 600);
      return {
        ok: true,
        answer: merged,
        text: merged,
        source: "deep:" + (local.source || "brain") + "+internet",
        evidence: r.evidence,
        version: VER
      };
    }
    return r;
  }

  G.AKSI_INTERNET = {
    version: VER,
    gather: gather,
    research: research,
    deep: deep,
    synthesize: synthesize
  };
})(typeof window !== "undefined" ? window : globalThis);
