/** Multi-source public search — Wiki, arXiv, DuckDuckGo HTML-lite via wiki primary */
(function (g) {
  "use strict";

  function fetchJSON(url, ms) {
    ms = ms || 7000;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () {
      if (ctrl) ctrl.abort();
    }, ms);
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

  function wiki(q) {
    var clean = String(q)
      .replace(/^(что такое|who is|what is|расскажи про)\s+/i, "")
      .trim();
    var url =
      "https://ru.wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(clean) +
      "&limit=1&namespace=0&format=json&origin=*";
    return fetchJSON(url).then(function (data) {
      var title = data && data[1] && data[1][0];
      if (!title) return null;
      return fetchJSON(
        "https://ru.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title)
      ).then(function (s) {
        if (!s || !s.extract) return null;
        return {
          text: s.title + ". " + s.extract.slice(0, 600),
          source: "Wikipedia",
          url: (s.content_urls && s.content_urls.desktop && s.content_urls.desktop.page) || "",
        };
      });
    });
  }

  function arxiv(q) {
    var url =
      "https://export.arxiv.org/api/query?search_query=all:" +
      encodeURIComponent(String(q).slice(0, 80)) +
      "&start=0&max_results=2";
    return fetch(url)
      .then(function (r) {
        return r.text();
      })
      .then(function (xml) {
        var titles = xml.match(/<title>[^<]+<\/title>/g) || [];
        // first title is feed name
        var paper = titles[1] ? titles[1].replace(/<\/?title>/g, "") : null;
        if (!paper) return null;
        var id = (xml.match(/<id>(https:\/\/arxiv.org\/abs\/[^<]+)<\/id>/) || [])[1];
        return {
          text: "arXiv: " + paper,
          source: "arXiv",
          url: id || "https://arxiv.org",
        };
      })
      .catch(function () {
        return null;
      });
  }

  function searchWorld(q) {
    var sources = [];
    return wiki(q)
      .catch(function () {
        return null;
      })
      .then(function (w) {
        var parts = [];
        if (w) {
          parts.push(w.text);
          sources.push(w.source + (w.url ? " " + w.url : ""));
        }
        var needScience = /квант|физик|neural|машинн|algorithm|theorem|arxiv|науч/i.test(q);
        if (!needScience) {
          return { text: parts.join("\n\n") || null, sources: sources };
        }
        return arxiv(q).then(function (a) {
          if (a) {
            parts.push(a.text);
            sources.push(a.source + (a.url ? " " + a.url : ""));
          }
          return { text: parts.join("\n\n") || null, sources: sources };
        });
      });
  }

  g.AksiWorld = { search: searchWorld, wiki: wiki, arxiv: arxiv };
})(typeof window !== "undefined" ? window : globalThis);
