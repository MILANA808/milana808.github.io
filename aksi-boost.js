/** AKSI boost v8 — LLM-class synthesis + DDG · aksilove@internet.ru */
(function () {
  "use strict";
  var BOOST = "8.0.0-boost";
  function withTimeout(p, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var t = setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      p.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } })
       .catch(function () { if (!done) { done = true; clearTimeout(t); resolve(null); } });
    });
  }
  async function fetchDDG(q) {
    try {
      var url = "https://api.duckduckgo.com/?q=" + encodeURIComponent(q) + "&format=json&no_redirect=1&no_html=1";
      var r = await withTimeout(fetch(url, { mode: "cors" }).then(function (res) { return res.json(); }), 2500);
      if (!r) return null;
      var text = r.AbstractText || r.Answer || "";
      if (!text && r.RelatedTopics && r.RelatedTopics[0]) text = r.RelatedTopics[0].Text || "";
      if (!text || text.length < 40) return null;
      return { title: r.Heading || "DuckDuckGo", text: text, url: r.AbstractURL || "", source: "web", conf: 0.78 };
    } catch (e) { return null; }
  }
  function synthesize(q, facts) {
    if (!facts || !facts.length) return null;
    var ranked = facts.slice().sort(function (a, b) {
      function p(s) {
        s = String(s || "");
        if (s.indexOf("wiki") === 0) return 3;
        if (s === "knowledge" || s === "web") return 2;
        return 1;
      }
      return p(b.source) - p(a.source);
    });
    var primary = ranked[0];
    var body = String(primary.text || "").trim();
    if (body.length < 20) return null;
    var sentences = body.replace(/\s+/g, " ").split(/(?<=[.!?…])\s+/).filter(function (s) { return s && s.length > 15; });
    if (!sentences.length) sentences = [body.slice(0, 400)];
    var lead = sentences[0];
    if (lead.length > 220) lead = lead.slice(0, 217) + "…";
    var points = sentences.slice(1, 4).map(function (s) {
      if (s.length > 180) s = s.slice(0, 177) + "…";
      return "• " + s;
    });
    var out = lead;
    if (points.length) out += "\n\n" + points.join("\n");
    if (primary.url) out += "\n\n→ " + primary.url;
    out += "\n\nИсточник: " + (primary.source || "факт") + (primary.title ? " · " + primary.title : "");
    if (ranked[1] && ranked[1].text && ranked[1].source !== primary.source) {
      var extra = String(ranked[1].text).replace(/\s+/g, " ").slice(0, 150);
      if (extra.length > 40) out += "\nДополнительно (" + ranked[1].source + "): " + extra + (extra.length >= 150 ? "…" : "");
    }
    return { text: out, conf: Math.min(0.94, (primary.conf || 0.8) + 0.08), source: "синтез" };
  }
  function install() {
    if (!window.AKSI || !AKSI.think) { setTimeout(install, 40); return; }
    if (AKSI._boost === BOOST) return;
    var orig = AKSI.think;
    AKSI.think = async function (query, opts) {
      opts = opts || {};
      var r = await orig.call(AKSI, query, opts);
      if (opts.web === false) { if (r && r.version) r.version = (r.version || "") + "+" + BOOST; return r; }
      if (r && (r.source === "пробел" || !r.answer || r.answer.length < 40)) {
        try {
          var ddg = await fetchDDG(query);
          if (ddg) {
            var syn = synthesize(query, [ddg]);
            if (syn) {
              r.answer = syn.text;
              r.source = syn.source;
              r.probability = syn.conf;
            }
          }
        } catch (e) {}
      }
      if (r) r.version = BOOST;
      return r;
    };
    var origAsk = AKSI.ask;
    if (typeof origAsk === "function") {
      AKSI.ask = async function (raw) {
        return origAsk.call(AKSI, raw);
      };
    }
    AKSI._boost = BOOST;
    AKSI.version = BOOST;
    try { var v = document.getElementById("ver"); if (v) v.textContent = "АКСИ " + BOOST; } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
