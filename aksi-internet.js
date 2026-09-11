/**
 * AKSI Internet v2.0-fullweb — browser full-web research (no private server)
 * Sources: DuckDuckGo API · DDG HTML via Jina · Wikipedia RU/EN · page extract via Jina
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.0.0-fullweb";
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
    var key = (item.url || item.title || "").toLowerCase().slice(0, 120);
    for (var i = 0; i < list.length; i++) {
      var k2 = (list[i].url || list[i].title || "").toLowerCase().slice(0, 120);
      if (key && key === k2) return;
    }
    list.push(item);
  }

  async function fetchText(url, timeoutMs) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () {
      try {
        if (ctrl) ctrl.abort();
      } catch (e) {}
    }, timeoutMs || 14000);
    try {
      var r = await fetch(url, {
        mode: "cors",
        signal: ctrl ? ctrl.signal : undefined,
        headers: { Accept: "text/plain, application/json, */*" }
      });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function wikiOpenSearch(lang, q, limit) {
    limit = limit || 4;
    var url =
      "https://" +
      lang +
      ".wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(q) +
      "&limit=" +
      limit +
      "&namespace=0&format=json&origin=*";
    var r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("wiki " + r.status);
    var data = await r.json();
    var out = [];
    var titles = data[1] || [];
    var descs = data[2] || [];
    var urls = data[3] || [];
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
      encodeURIComponent(String(title).replace(/ /g, "_"));
    var r = await fetch(url, { mode: "cors", headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    var d = await r.json();
    return {
      title: d.title || title,
      text: abs(d.extract || ""),
      url:
        (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) ||
        "",
      source: "wikipedia-" + lang
    };
  }

  async function ddgInstant(q) {
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
          source: "ddg-instant"
        });
      }
      var topics = d.RelatedTopics || [];
      for (var i = 0; i < topics.length && out.length < 6; i++) {
        var t = topics[i];
        if (t.Text && t.FirstURL) {
          out.push({
            title: abs(t.Text).slice(0, 90),
            text: abs(t.Text),
            url: t.FirstURL,
            source: "ddg-related"
          });
        } else if (t.Topics) {
          for (var j = 0; j < t.Topics.length && out.length < 6; j++) {
            var u = t.Topics[j];
            if (u.Text && u.FirstURL) {
              out.push({
                title: abs(u.Text).slice(0, 90),
                text: abs(u.Text),
                url: u.FirstURL,
                source: "ddg-related"
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

  function unwrapDdgUrl(url) {
    try {
      if (!url) return "";
      var m = url.match(/[?&]uddg=([^&]+)/);
      if (m) {
        var decoded = decodeURIComponent(m[1]);
        if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
          try {
            decoded = decodeURIComponent(decoded);
          } catch (e) {}
        }
        return decoded;
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  async function ddgWeb(q) {
    var target = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q);
    var md = await fetchText(JINA + target, 18000);
    var evidence = [];
    var re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    var m;
    var seen = {};
    while ((m = re.exec(md)) && evidence.length < 12) {
      var title = abs(m[1].replace(/\*\*/g, ""));
      if (!title || title.length < 3) continue;
      if (/^Image\s*\d/i.test(title)) continue;
      var url = unwrapDdgUrl(m[2]);
      if (!url || !/^https?:\/\//i.test(url)) continue;
      if (/duckduckgo\.com/i.test(url)) continue;
      if (/javascript:/i.test(url)) continue;
      if (seen[url]) continue;
      seen[url] = 1;
      var after = md.slice(m.index + m[0].length, m.index + m[0].length + 320);
      after = abs(after.replace(/\*\*/g, "")).replace(/^[\s\-\|]+/, "");
      evidence.push({
        title: title.slice(0, 160),
        text: after.slice(0, 450),
        url: url,
        source: "web-ddg"
      });
    }
    if (evidence.length === 0 && md.length > 100) {
      evidence.push({
        title: "Web overview",
        text: abs(md).slice(0, 900),
        url: target,
        source: "web-ddg-raw"
      });
    }
    return evidence;
  }

  async function deepenPages(items, limit) {
    limit = limit || 3;
    var out = [];
    var n = 0;
    for (var i = 0; i < items.length && n < limit; i++) {
      var it = items[i];
      if (!it.url || !/^https?:\/\//i.test(it.url)) continue;
      if (/wikipedia\.org/i.test(it.url) && it.text && it.text.length > 100) {
        out.push(it);
        n++;
        continue;
      }
      try {
        var body = await fetchText(JINA + it.url, 16000);
        var text = abs(body).slice(0, 1800);
        if (text.length > 80) {
          out.push({
            title: it.title || it.url,
            text: text,
            url: it.url,
            source: (it.source || "web") + "+page"
          });
          n++;
        } else {
          out.push(it);
          n++;
        }
      } catch (e) {
        out.push(it);
        n++;
      }
    }
    return out;
  }

  async function gather(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, evidence: [], error: "empty" };

    var evidence = [];
    var errors = [];
    var mode = opts.mode || "full";

    try {
      var inst = await ddgInstant(query);
      for (var i = 0; i < inst.length; i++) uniqPush(evidence, inst[i]);
    } catch (e) {
      errors.push("ddg-instant: " + (e.message || e));
    }

    try {
      var web = await ddgWeb(query);
      for (var j = 0; j < web.length; j++) uniqPush(evidence, web[j]);
    } catch (e2) {
      errors.push("ddg-web: " + (e2.message || e2));
    }

    try {
      var ru = await wikiOpenSearch("ru", query, 3);
      for (var k = 0; k < Math.min(2, ru.length); k++) {
        var sum = await wikiSummary("ru", ru[k].title);
        if (sum && sum.text) uniqPush(evidence, sum);
        else
          uniqPush(evidence, {
            title: ru[k].title,
            text: ru[k].snippet,
            url: ru[k].url,
            source: "wikipedia-ru"
          });
      }
    } catch (e3) {
      errors.push("wiki-ru: " + (e3.message || e3));
    }

    if (evidence.length < 3) {
      try {
        var en = await wikiOpenSearch("en", query, 3);
        for (var m = 0; m < Math.min(2, en.length); m++) {
          var sum2 = await wikiSummary("en", en[m].title);
          if (sum2 && sum2.text) uniqPush(evidence, sum2);
        }
      } catch (e4) {
        errors.push("wiki-en: " + (e4.message || e4));
      }
    }

    if (mode === "full" && evidence.length) {
      try {
        var deep = await deepenPages(evidence.slice(0, 5), opts.deepPages || 3);
        for (var d = 0; d < deep.length; d++) {
          var replaced = false;
          for (var x = 0; x < evidence.length; x++) {
            if (evidence[x].url && deep[d].url && evidence[x].url === deep[d].url) {
              if ((deep[d].text || "").length > (evidence[x].text || "").length) evidence[x] = deep[d];
              replaced = true;
              break;
            }
          }
          if (!replaced) uniqPush(evidence, deep[d]);
        }
      } catch (e5) {
        errors.push("deepen: " + (e5.message || e5));
      }
    }

    return {
      ok: evidence.length > 0,
      query: query,
      evidence: evidence.slice(0, 12),
      errors: errors,
      version: VER,
      mode: "fullweb-browser"
    };
  }

  function synthesize(query, pack) {
    var ev = (pack && pack.evidence) || [];
    if (!ev.length) {
      return {
        answer:
          "Не удалось получить веб-источники по запросу «" +
          query +
          "».\nПроверьте сеть.\n(АКСИ Internet fullweb: DDG + Wikipedia + Jina)",
        source: "internet-empty"
      };
    }
    var lines = [];
    lines.push("Обзор по открытому вебу:");
    lines.push("");
    for (var i = 0; i < Math.min(6, ev.length); i++) {
      var e = ev[i];
      var body = abs(e.text || e.snippet || "").slice(0, 480);
      lines.push(i + 1 + ") " + (e.title || "Источник") + " [" + (e.source || "?") + "]");
      if (body) lines.push(body + (body.length >= 480 ? "…" : ""));
      if (e.url) lines.push("→ " + e.url);
      lines.push("");
    }
    lines.push("—");
    lines.push(
      "Синтез АКСИ: факты из публичного веба (DDG / Wikipedia / страницы через Jina). Проверяйте первоисточники."
    );
    lines.push("Режим: " + VER);
    return { answer: lines.join("\n"), source: "internet-fullweb", evidence: ev };
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
      if (G.AKSI_BRAIN && G.AKSI_BRAIN.decide) local = await G.AKSI_BRAIN.decide(query);
      else if (G.AKSI_CORE && G.AKSI_CORE.decide) local = await G.AKSI_CORE.decide(query);
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
        source: "deep:" + (local.source || "brain") + "+fullweb",
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
