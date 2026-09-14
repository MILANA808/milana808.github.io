/**
 * AKSI Bot v1.2 — Agent + Organism + Gate + Cortex resonance + self-taught
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.2.0-bot-cortex";
  var seed = [];
  var DEFAULT_CORTEX_PW = "aksi";
  var CORTEX_MIN_SCORE = 0.002;

  function cortexPw() {
    try {
      return sessionStorage.getItem("aksi_cortex_pw") || DEFAULT_CORTEX_PW;
    } catch (e) {
      return DEFAULT_CORTEX_PW;
    }
  }

  function setCortexPw(pw) {
    try {
      sessionStorage.setItem("aksi_cortex_pw", String(pw || DEFAULT_CORTEX_PW));
    } catch (e) {}
    if (G.AKSI_CORTEX_KERNEL && G.AKSI_CORTEX_KERNEL.setSessionPassword) {
      G.AKSI_CORTEX_KERNEL.setSessionPassword(pw || DEFAULT_CORTEX_PW);
    }
  }

  function ensureCortexSession() {
    if (!G.AKSI_CORTEX_KERNEL) return null;
    try {
      G.AKSI_CORTEX_KERNEL.setSessionPassword(cortexPw());
    } catch (e) {}
    return G.AKSI_CORTEX_KERNEL;
  }

  function loadSeed() {
    return fetch("/data/self-taught.json?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.items)) seed = d.items;
        try {
          var local = JSON.parse(localStorage.getItem("aksi_bot_mem_v1") || "[]");
          if (Array.isArray(local)) {
            for (var i = 0; i < local.length; i++) {
              if (local[i] && local[i].text) seed.push({ t: local[i].t, text: local[i].text, source: "local" });
            }
          }
        } catch (e) {}
        return seed.length;
      })
      .catch(function () { return 0; });
  }

  function matchSeed(q) {
    var low = String(q || "").toLowerCase();
    var words = low.split(/\s+/).filter(function (w) { return w.length > 3; });
    var best = null;
    var bestHit = 0;
    for (var i = seed.length - 1; i >= 0; i--) {
      var t = String(seed[i].text || "");
      var tl = t.toLowerCase();
      var hit = 0;
      for (var j = 0; j < words.length; j++) if (tl.indexOf(words[j]) >= 0) hit++;
      if (low.length > 8 && tl.indexOf(low.slice(0, 32)) >= 0) hit += 2;
      if (hit > bestHit) {
        bestHit = hit;
        best = { text: t, source: "self-taught", offline: true, hit: hit };
      }
    }
    if (best && bestHit >= 2) return best;
    if (best && bestHit >= 1 && words.length <= 1) return best;
    return null;
  }

  async function cortexHit(q) {
    var cx = ensureCortexSession();
    if (!cx || !cx.resonantQuery || !cx.size) return null;
    try {
      var hit = await cx.resonantQuery(q);
      if (hit && hit.text && hit.score >= CORTEX_MIN_SCORE) {
        return {
          text: hit.text,
          source: "cortex",
          offline: true,
          score: hit.score,
          cortexId: hit.id
        };
      }
    } catch (e) {}
    return null;
  }

  async function think(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос", source: "empty", offline: true };

    if (/^кортекс\s+пароль\s*[:：]/i.test(q) || /^cortex\s+pass(word)?\s*[:：]/i.test(q)) {
      var pw = q.replace(/^кортекс\s+пароль\s*[:：]\s*/i, "").replace(/^cortex\s+pass(word)?\s*[:：]\s*/i, "").trim();
      if (!pw) return { text: "Укажите пароль: «кортекс пароль: …»", source: "cortex", offline: true };
      setCortexPw(pw);
      return { text: "Пароль Cortex сохранён в sessionStorage (только эта вкладка).", source: "cortex", offline: true };
    }

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

      var cx = ensureCortexSession();
      if (cx && cx.ingestDocument) {
        try {
          var ing = await cx.ingestDocument(fact, cortexPw());
          out.text += "\n→ Cortex AES-GCM + quantum state id " + String(ing && ing.id || "").slice(0, 8);
          out.cortex = ing;
        } catch (e) {
          out.text += "\n→ Cortex: " + String(e.message || e).slice(0, 80);
        }
      }

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
    var c = await cortexHit(q);
    if (c && s) {
      if ((c.score || 0) >= CORTEX_MIN_SCORE && (s.hit || 0) < 2) return c;
      if ((c.score || 0) > 0.01) return c;
      return s;
    }
    if (c) return c;
    if (s) return s;

    if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide) {
      try {
        var d = await G.AKSI_ORGANISM.decide(q, opts);
        if (d && (d.answer || d.text))
          return {
            text: d.answer || d.text,
            source: d.source || "organism",
            offline: true,
            decision: d.decision,
            ok: d.ok,
            receipt: d.receipt,
            scores: d.scores,
            gate: d.gate
          };
      } catch (e) {}
    }

    if (G.AKSIAgent && G.AKSIAgent.ask) {
      try {
        var a = await G.AKSIAgent.ask(q, opts);
        if (a && a.text) return a;
      } catch (e) {}
    }

    return {
      text: "АКСИ Bot v" + VER + ".\nСпросите: кто ты · статус · организм.\n«запомни: факт» → seed + Cortex (AES-GCM + резонанс).\n«кортекс пароль: …» — ключ vault.",
      source: "bot-fallback",
      offline: true
    };
  }

  async function status() {
    var n = await loadSeed();
    var cx = G.AKSI_CORTEX_KERNEL;
    return {
      version: VER,
      seed: n,
      organism: !!(G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide),
      agent: !!(G.AKSIAgent && G.AKSIAgent.ask),
      flyGate: !!G.AKSI_FLY_GATE,
      receipt: !!G.AKSI_RECEIPT,
      cortex: !!(cx && cx.resonantQuery),
      cortexDocs: cx ? cx.size : 0,
      selfGithub: !!(G.AKSI_SELF_GITHUB && G.AKSI_SELF_GITHUB.token && G.AKSI_SELF_GITHUB.token()),
      product: "AKSI Bot + Cortex"
    };
  }

  try { ensureCortexSession(); } catch (e) {}
  try { loadSeed(); } catch (e) {}

  G.AKSI_BOT = {
    version: VER,
    think: think,
    ask: think,
    status: status,
    loadSeed: loadSeed,
    matchSeed: matchSeed,
    setCortexPassword: setCortexPw
  };
})(typeof window !== "undefined" ? window : globalThis);
