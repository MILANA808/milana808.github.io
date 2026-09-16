/**
 * AKSI Bot v1.5.1 — clear human answers
 * Cortex + Research + Gate + ADIA · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.5.1-clear";
  var seed = [];
  var DEFAULT_CORTEX_PW = "aksi";
  var CORTEX_MIN_SCORE = 0.002;

  function cortexPw() {
    try { return sessionStorage.getItem("aksi_cortex_pw") || DEFAULT_CORTEX_PW; }
    catch (e) { return DEFAULT_CORTEX_PW; }
  }
  function setCortexPw(pw) {
    try { sessionStorage.setItem("aksi_cortex_pw", String(pw || DEFAULT_CORTEX_PW)); } catch (e) {}
    if (G.AKSI_CORTEX_KERNEL && G.AKSI_CORTEX_KERNEL.setSessionPassword)
      G.AKSI_CORTEX_KERNEL.setSessionPassword(pw || DEFAULT_CORTEX_PW);
  }
  function ensureCortexSession() {
    if (!G.AKSI_CORTEX_KERNEL) return null;
    try { G.AKSI_CORTEX_KERNEL.setSessionPassword(cortexPw()); } catch (e) {}
    return G.AKSI_CORTEX_KERNEL;
  }
  function loadSeed() {
    return fetch("/data/self-taught.json?v=" + Date.now())
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && Array.isArray(d.items)) seed = d.items;
        try {
          var local = JSON.parse(localStorage.getItem("aksi_bot_mem_v1") || "[]");
          if (Array.isArray(local))
            for (var i = 0; i < local.length; i++)
              if (local[i] && local[i].text) seed.push({ t: local[i].t, text: local[i].text, source: "local" });
        } catch (e) {}
        return seed.length;
      })
      .catch(function () { return 0; });
  }
  function matchSeed(q) {
    var low = String(q || "").toLowerCase();
    var words = low.split(/\s+/).filter(function (w) {
      return w.length > 2 && !/^(что|как|это|для|или|the|what|who|how|and)$/i.test(w);
    });
    var best = null, bestHit = 0;
    for (var i = seed.length - 1; i >= 0; i--) {
      var t = String(seed[i].text || ""), tl = t.toLowerCase(), hit = 0;
      for (var j = 0; j < words.length; j++) if (tl.indexOf(words[j]) >= 0) hit += (words[j].length >= 5 ? 2 : 1);
      if (low.length > 8 && tl.indexOf(low.slice(0, 32)) >= 0) hit += 2;
      if (hit > bestHit) { bestHit = hit; best = { text: t, source: "self-taught", offline: true, hit: hit }; }
    }
    return best && bestHit >= 1 ? best : null;
  }
  async function cortexHit(q) {
    var cx = ensureCortexSession();
    if (!cx || !cx.resonantQuery || !cx.size) return null;
    try {
      var hit = await cx.resonantQuery(q);
      if (hit && hit.text) {
        var low = String(q || "").toLowerCase();
        var words = low.split(/\s+/).filter(function (w) { return w.length > 3; });
        var lex = 0, tl = String(hit.text).toLowerCase();
        for (var i = 0; i < words.length; i++) if (tl.indexOf(words[i]) >= 0) lex++;
        var score = hit.score || 0;
        if (lex > 0) score += 0.01 * lex;
        if (score >= CORTEX_MIN_SCORE || lex > 0)
          return { text: hit.text, source: "cortex", offline: true, score: score, cortexId: hit.id, lex: lex };
      }
    } catch (e) {}
    return null;
  }
  function applyAdia(out, q) {
    try {
      if (!out || !G.AKSI_ALGORITHM || !G.AKSI_ALGORITHM.evaluate) return out;
      var r = G.AKSI_ALGORITHM.evaluate(q || "", { text: out.text, source: out.source }, { policy: "companion" });
      if (r) {
        out.adia = r;
        out.eqs = r.EQS != null ? r.EQS : (r.metrics && r.metrics.EQS);
        out.aksiScore = r.AKSI != null ? r.AKSI : (r.metrics && r.metrics.AKSI);
        if (r.metrics) out.metrics = r.metrics;
      }
    } catch (e) {}
    return out;
  }
  function applyGate(out, q) {
    out = applyAdia(out, q);
    try {
      if (!G.AKSI_FLY_GATE || !G.AKSI_FLY_GATE.evaluate || !out) return out;
      var conf = 0.55;
      if (out.source === "cortex" || out.source === "self-taught") conf = 0.82;
      if (out.source === "research") conf = 0.75;
      if (out.source === "organism") conf = 0.5;
      if (out.source === "bot-fallback") conf = 0.35;
      if (out.score) conf = Math.min(0.95, 0.5 + Number(out.score) * 10);
      if (out.eqs != null) conf = Math.min(0.95, Math.max(conf, Number(out.eqs) / 100));
      var g = G.AKSI_FLY_GATE.evaluate({
        confidence: conf, eqs: conf, policy: "companion", text: out.text || "",
        lowEvidence: out.source === "bot-fallback", sourceConflict: false
      });
      out.gate = g; out.decision = g.decision;
      if (g.veto && out.source === "bot-fallback")
        out.text = (out.text || "") + "\n\n[Проверка: ответ слабый — " + (g.reason || "ниже порога") + "]";
    } catch (e) {}
    return out;
  }
  function normalizeQuery(q) {
    var s = String(q || "").trim().replace(/^(исследуй|изучи|найди|research|explore)\s+/i, "");
    return s.split(/\s+/).map(function (w) {
      if (w === "ИИ" || w === "ии") return "искусственный интеллект";
      if (w === "AI" || w === "ai") return "artificial intelligence";
      return w;
    }).join(" ").trim() || String(q || "").trim();
  }
  async function localResearch(topic) {
    topic = normalizeQuery(topic);
    var lang = /[а-яё]/i.test(topic) ? "ru" : "en";
    var api = "https://" + lang + ".wikipedia.org/w/api.php?action=opensearch&search=" +
      encodeURIComponent(topic) + "&limit=4&namespace=0&format=json&origin=*";
    var a = await fetch(api, { cache: "no-store" }).then(function (r) { return r.json(); });
    var titles = a[1] || [], urls = a[3] || [], sources = [];
    for (var i = 0; i < titles.length; i++) {
      try {
        var p = await fetch("https://" + lang + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(titles[i]), { cache: "no-store" }).then(function (r) { return r.json(); });
        if (p && (p.extract || p.description))
          sources.push({ title: p.title || titles[i], url: urls[i], text: p.extract || p.description });
      } catch (e) {}
    }
    var lines = ["Исследование: " + topic, "Источников: " + sources.length, ""];
    if (!sources.length) lines.push("Источники не получены (сеть). Попробуйте позже.");
    else sources.forEach(function (s, i) {
      lines.push((i + 1) + ". " + s.title + " — " + (s.text || "").slice(0, 220));
      if (s.url) lines.push("   " + s.url);
    });
    lines.push("", "Это выдержки из открытых источников, не окончательная истина.");
    return { text: lines.join("\n"), sources: sources };
  }

  async function status() {
    var n = await loadSeed();
    var cx = G.AKSI_CORTEX_KERNEL;
    return {
      version: VER, seed: n,
      organism: !!(G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide),
      agent: !!(G.AKSIAgent && G.AKSIAgent.ask),
      flyGate: !!G.AKSI_FLY_GATE, flyBrain: !!G.AKSI_FLY_BRAIN, receipt: !!G.AKSI_RECEIPT,
      cortex: !!(cx && cx.resonantQuery), cortexDocs: cx ? cx.size : 0,
      adia: !!(G.AKSI_ALGORITHM && G.AKSI_ALGORITHM.evaluate),
      selfGithub: !!(G.AKSI_SELF_GITHUB && G.AKSI_SELF_GITHUB.token && G.AKSI_SELF_GITHUB.token()),
      product: "AKSI"
    };
  }

  async function think(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "Пустой запрос", source: "empty", offline: true };

    if (/^(статус|status)$/i.test(q) || /^покажи\s+статус/i.test(q)) {
      var st = await status();
      return {
        text: [
          "Статус АКСИ (в этом браузере):",
          "· Версия: v" + st.version,
          "· Память Cortex: " + (st.cortex ? "включена, документов " + (st.cortexDocs || 0) : "выключена"),
          "· Проверка ответов (Gate): " + (st.flyGate ? "включена" : "выключена"),
          "· Сохранённых фактов: " + (st.seed || 0),
          "",
          "Команды: запомни: факт · исследуй: тема · обычный вопрос"
        ].join("\n"),
        source: "status", offline: true
      };
    }
    if (/^(кто\s*ты\??|who\s*are\s*you\??|что\s+ты\s+такое\??)$/i.test(q)) {
      return {
        text: [
          "Я АКСИ — локальный помощник в браузере.",
          "Могу искать с источниками («исследуй:»), запоминать у вас на устройстве («запомни:»), отвечать из памяти.",
          "Без обязательных ключей к облачным API. Это ваш offline-first контур, не «магия из чужого облака»."
        ].join("\n"),
        source: "identity", offline: true
      };
    }

    if (/^кортекс\s+пароль\s*[:：]/i.test(q) || /^cortex\s+pass(word)?\s*[:：]/i.test(q)) {
      var pw = q.replace(/^кортекс\s+пароль\s*[:：]\s*/i, "").replace(/^cortex\s+pass(word)?\s*[:：]\s*/i, "").trim();
      if (!pw) return { text: "Укажите: кортекс пароль: …", source: "cortex", offline: true };
      setCortexPw(pw);
      return { text: "Пароль Cortex сохранён только в этой вкладке.", source: "cortex", offline: true };
    }

    if (/^запомни\s*[:：]/i.test(q) || /^remember\s*[:：]/i.test(q)) {
      var fact = q.replace(/^запомни\s*[:：]\s*/i, "").replace(/^remember\s*[:：]\s*/i, "").trim();
      var out = { text: "Сохранено у вас на устройстве:\n«" + fact.slice(0, 300) + "»", source: "teach", offline: true, taught: fact };
      try {
        var arr = JSON.parse(localStorage.getItem("aksi_bot_mem_v1") || "[]");
        arr.push({ t: Date.now(), text: fact });
        localStorage.setItem("aksi_bot_mem_v1", JSON.stringify(arr.slice(-200)));
      } catch (e) {}
      seed.push({ t: Date.now(), text: fact, source: "local" });
      var cx = ensureCortexSession();
      if (cx && cx.ingestDocument) {
        try {
          var ing = await cx.ingestDocument(fact, cortexPw());
          out.text += "\nЗапись в защищённой памяти: да.";
          out.cortex = ing;
        } catch (e) {
          out.text += "\nCortex: " + String(e.message || e).slice(0, 80);
        }
      }
      if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.remember) {
        try { await G.AKSI_ORGANISM.remember(fact); } catch (e) {}
      }
      return out;
    }

    if (/^(исследуй|изучи|research)\s*[:：]?\s+/i.test(q) || /^исследуй\s+/i.test(q)) {
      var topic = q.replace(/^(исследуй|изучи|research)\s*[:：]?\s*/i, "").trim() || q;
      try {
        var report = await localResearch(topic);
        return applyGate({ text: report.text, source: "research", offline: true, sources: report.sources, score: report.sources.length ? 0.05 : 0.001 }, q);
      } catch (e) {
        return applyGate({ text: "Ошибка поиска: " + (e.message || e), source: "research", offline: true }, q);
      }
    }

    var s = matchSeed(q);
    var c = await cortexHit(q);
    if (c && s) return applyGate((c.score || 0) >= (s.hit || 0) * 0.001 ? c : s, q);
    if (c) return applyGate(c, q);
    if (s) return applyGate(s, q);

    if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide) {
      try {
        var d = await G.AKSI_ORGANISM.decide(q, opts);
        if (d && (d.answer || d.text))
          return applyGate({ text: d.answer || d.text, source: d.source || "organism", offline: true, receipt: d.receipt, gate: d.gate }, q);
      } catch (e) {}
    }
    if (G.AKSIAgent && G.AKSIAgent.ask) {
      try {
        var a = await G.AKSIAgent.ask(q, opts);
        if (a && a.text) return applyGate(a, q);
      } catch (e) {}
    }
    return applyGate({
      text: "Пока нет ответа в памяти.\nНапишите «запомни: …» или «исследуй: …» или «статус».",
      source: "bot-fallback", offline: true
    }, q);
  }

  try { ensureCortexSession(); } catch (e) {}
  try { loadSeed(); } catch (e) {}

  G.AKSI_BOT = {
    version: VER, think: think, ask: think, status: status,
    loadSeed: loadSeed, matchSeed: matchSeed, setCortexPassword: setCortexPw, research: localResearch
  };
})(typeof window !== "undefined" ? window : globalThis);
