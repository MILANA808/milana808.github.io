/**
 * AKSI Bot v1.0 — unified product facade
 * Agent + Organism + Fly-Gate + self-taught + optional GitHub teach
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-bot";
  var seed = [];
  function loadSeed() {
    return fetch("/data/self-taught.json?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.items)) seed = d.items;
        return seed.length;
      })
      .catch(function () { return 0; });
  }
  function matchSeed(q) {
    var low = String(q || "").toLowerCase();
    var words = low.split(/\s+/).filter(function (w) { return w.length > 3; });
    for (var i = seed.length - 1; i >= 0; i--) {
      var t = String(seed[i].text || "");
      var tl = t.toLowerCase();
      var hit = 0;
      for (var j = 0; j < words.length; j++) if (tl.indexOf(words[j]) >= 0) hit++;
      if (hit >= 1 || (low.length > 5 && tl.indexOf(low.slice(0, 24)) >= 0))
        return { text: t, source: "self-taught", offline: true };
    }
    return null;
  }
  async function think(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос", source: "empty", offline: true };
    if (/^запомни\s*[:：]/i.test(q) || /^remember\s*[:：]/i.test(q)) {
      var fact = q.replace(/^запомни\s*[:：]\s*/i, "").replace(/^remember\s*[:：]\s*/i, "").trim();
      var out = { text: "Запомнила локально: " + fact.slice(0, 200), source: "teach", offline: true, taught: fact };
      try {
        var key = "aksi_bot_mem_v1";
        var arr = JSON.parse(localStorage.getItem(key) || "[]");
        arr.push({ t: Date.now(), text: fact });
        localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
      } catch (e) {}
      seed.push({ t: Date.now(), text: fact, source: "local" });
      if (G.AKSI_SELF_GITHUB && G.AKSI_SELF_GITHUB.token && G.AKSI_SELF_GITHUB.token()) {
        try {
          var gh = await G.AKSI_SELF_GITHUB.teachToGitHub(fact, { via: "aksi-bot" });
          out.text += "\n→ GitHub commit " + String(gh.commit || "").slice(0, 7);
          out.github = gh;
        } catch (e) {
          out.text += "\n→ GitHub: " + String(e.message || e).slice(0, 80);
        }
      } else {
        out.text += "\n(Для записи в git: /autopilot.html → PAT)";
      }
      if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.remember) {
        try { await G.AKSI_ORGANISM.remember(fact); } catch (e) {}
      }
      return out;
    }
    var s = matchSeed(q);
    if (s) return s;
    if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide) {
      try {
        var d = await G.AKSI_ORGANISM.decide(q, opts);
        if (d && (d.answer || d.text))
          return { text: d.answer || d.text, source: d.source || "organism", offline: true, decision: d.decision, ok: d.ok, receipt: d.receipt, scores: d.scores, gate: d.gate };
      } catch (e) {}
    }
    if (G.AKSIAgent && G.AKSIAgent.ask) {
      try {
        var a = await G.AKSIAgent.ask(q, opts);
        if (a && a.text) return a;
      } catch (e) {}
    }
    return { text: "АКСИ Bot v" + VER + ". Спросите: кто ты · организм · мозг · статус. Или «запомни: факт».", source: "bot-fallback", offline: true };
  }
  async function status() {
    var n = await loadSeed();
    return {
      version: VER, seed: n,
      organism: !!(G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide),
      agent: !!(G.AKSIAgent && G.AKSIAgent.ask),
      flyGate: !!G.AKSI_FLY_GATE,
      receipt: !!G.AKSI_RECEIPT,
      selfGithub: !!(G.AKSI_SELF_GITHUB && G.AKSI_SELF_GITHUB.token && G.AKSI_SELF_GITHUB.token()),
      product: "AKSI Bot — one surface"
    };
  }
  G.AKSI_BOT = { version: VER, think: think, ask: think, status: status, loadSeed: loadSeed, matchSeed: matchSeed };
})(typeof window !== "undefined" ? window : globalThis);
