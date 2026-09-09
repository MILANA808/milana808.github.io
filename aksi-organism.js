/**
 * AKSI Organism v1.2.1 — no circular API calls; formula ≠ forced pi
 * Path: Pi → Decision → Zero → Neuro → local
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.2.1-organism";

  function modules() {
    return {
      api: !!(G.AKSI && G.AKSI.decide),
      decision: !!(G.AKSI_DECISION && G.AKSI_DECISION.decide),
      neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      zero: !!(G.AKSI_ZERO && G.AKSI_ZERO.think),
      superpose: !!(G.AKSI_SUPERPOSE && G.AKSI_SUPERPOSE.ask),
      algorithm: !!(G.AKSI_ALGORITHM || G.ADIA),
      vault: !!(G.AKSI_VAULT && G.AKSI_VAULT.learn),
      pi: !!(G.PiFractalCrypto || G.AKSI_PI_CRYPTO),
      piContour: !!(G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process),
      webllm: !!(G.AKSI_WEBLLM),
      webllmReady: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()),
      quantum: !!(G.AKSI_QUANTUM || G.AKSI_QPIPE),
      knowledge: !!G.AKSI_KNOWLEDGE
    };
  }

  async function pulse() {
    var m = modules();
    var ok = 0, total = 0, k;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k)) continue;
      total++;
      if (m[k]) ok++;
    }
    return { version: VER, health: ok, total: total, modules: m, ts: Date.now() };
  }

  function localAnswer(query) {
    var q = String(query || "").toLowerCase();
    if (/кто ты|who are you|привет/.test(q))
      return "Я АКСИ — offline Organism. Decision · π-Contour · Vault. Контакт: aksilove@internet.ru";
    if (/формул|formula/.test(q))
      return "AKSI = (A × I × S) × (1 + 0.4√n). A — agency, I — integrity (EQS/100), S — structure, n — sealed history.";
    if (/контур|π|\bpi\b|пи\b/.test(q))
      return "π-Contour — детерминированный вычислительный путь: query → SHA-256 → θ ∈ [0,2π) → seal.";
    if (/gate|гейт/.test(q))
      return "Gate τ ≈ 0.55 — порог принятия решения.";
    if (/статус|status|что умеешь/.test(q))
      return "Organism v" + VER + ": think/decide/remember · Pi · Zero · Neuro · Vault.";
    return "АКСИ Organism v" + VER + ". Спросите: кто ты, формула, π, контур. Контакт: aksilove@internet.ru";
  }

  async function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { text: "", answer: "", source: "empty" };

    if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур/i.test(query)) {
      try {
        var pr = await G.AKSI_PI_CONTOUR.process(query);
        if (pr && pr.answer) {
          return { text: pr.answer, answer: pr.answer, source: "pi-contour", scores: pr.scores, seal: pr.seal, features: pr.features };
        }
      } catch (e) {}
    }

    if (G.AKSI_DECISION && typeof G.AKSI_DECISION.decide === "function") {
      try {
        var d = await Promise.resolve(G.AKSI_DECISION.decide(query));
        if (d && d.answer) {
          return { text: d.answer, answer: d.answer, source: d.source || "decision", scores: d.scores, seal: d.seal, gate: d.gate };
        }
      } catch (e) {}
    }

    if (G.AKSI_ZERO && typeof G.AKSI_ZERO.think === "function") {
      try {
        var z = await Promise.resolve(G.AKSI_ZERO.think(query));
        if (z && (z.answer || z.text)) {
          return { text: z.answer || z.text, answer: z.answer || z.text, source: "zero", confidence: z.confidence, seal: z.seal };
        }
      } catch (e) {}
    }

    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer)) {
          return { text: n.text || n.answer, answer: n.text || n.answer, source: "neuro", score: n.score };
        }
      } catch (e) {}
    }

    var a = localAnswer(query);
    return { text: a, answer: a, source: "organism-local" };
  }

  async function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", error: "empty" };

    if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур/i.test(query)) {
      try {
        var pr = await G.AKSI_PI_CONTOUR.process(query);
        if (pr && pr.answer) {
          return {
            ok: true,
            id: "org-pi-" + Date.now().toString(36),
            answer: pr.answer,
            anti: "π-contour",
            source: "pi-contour",
            scores: pr.scores || { aksi: 0.8, eqs: 80, phi: 0.7, qcli: 0.65 },
            gate: pr.gate || { ok: true, reason: "pi-pass" },
            seal: pr.seal || null,
            features: pr.features || null,
            version: VER
          };
        }
      } catch (e) {}
    }

    if (G.AKSI_DECISION && typeof G.AKSI_DECISION.decide === "function") {
      try {
        var d = await Promise.resolve(G.AKSI_DECISION.decide(query));
        if (d && d.answer) {
          d.ok = true;
          d.version = d.version || VER;
          return d;
        }
      } catch (e) {}
    }

    var t = await think(query, opts);
    var answer = t.answer || t.text || "";
    var eqs = 60;
    if (t.source === "pi-contour") eqs = 80;
    if (t.source === "decision") eqs = 75;
    if (t.source === "zero") eqs = 65;
    if (t.source === "neuro") eqs = 62;
    return {
      ok: true,
      id: "org-" + Date.now().toString(36),
      answer: answer,
      anti: "organism · " + (t.source || "local"),
      source: t.source || "organism",
      scores: t.scores || { aksi: eqs / 100, eqs: eqs, phi: 0.55, qcli: 0.5 },
      gate: t.gate || { ok: true, reason: "organism-pass" },
      seal: t.seal || { kind: "organism", t: Date.now() },
      version: VER
    };
  }

  async function remember(fact) {
    fact = String(fact || "").trim();
    if (!fact) return { ok: false };
    if (!/^запомни\s*[:：]/i.test(fact) && !/^remember\s*[:：]/i.test(fact)) {
      fact = "запомни: " + fact;
    }
    if (G.AKSI_VAULT && typeof G.AKSI_VAULT.learn === "function") {
      try { return await G.AKSI_VAULT.learn(fact); } catch (e) {}
    }
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.learn === "function") {
      try {
        G.AKSI_NEURO.learn(fact.replace(/^запомни\s*[:：]\s*/i, ""));
        return { ok: true, source: "neuro" };
      } catch (e) {}
    }
    try {
      var key = "aksi_organism_mem_v1";
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ t: Date.now(), text: fact });
      localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      return { ok: true, source: "localStorage", n: arr.length };
    } catch (e) {
      return { ok: false, error: String(e.message || e) };
    }
  }

  G.AKSI_ORGANISM = {
    version: VER,
    pulse: pulse,
    modules: modules,
    think: think,
    decide: decide,
    remember: remember,
    status: pulse
  };
})(typeof window !== "undefined" ? window : globalThis);
