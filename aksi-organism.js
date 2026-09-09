/**
 * AKSI Organism v1 — единый живой runtime
 * Связывает: API · Decision · Neuro · Zero · Vault π · Crypto · WebLLM · Quantum
 * Offline-first. Один pulse() — состояние всего организма.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-organism";

  function organ(name, ok, detail) {
    return { name: name, ok: !!ok, detail: detail || null };
  }

  function modules() {
    return {
      api: !!(G.AKSI && G.AKSI.decide),
      decision: !!(G.AKSI_DECISION && G.AKSI_DECISION.decide),
      neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      zero: !!(G.AKSI_ZERO && G.AKSI_ZERO.think),
      superpose: !!(G.AKSI_SUPERPOSE && G.AKSI_SUPERPOSE.ask),
      algorithm: !!(G.AKSI_ALGORITHM || G.ADIA),
      vault: !!(G.AKSI_VAULT && G.AKSI_VAULT.learn),
      pi: !!(G.PiFractalCrypto || (G.AKSI_PI_CRYPTO && G.AKSI_PI_CRYPTO.PiFractalCrypto)),
      ciphersuite: !!(G.AKSI_CRYPTO && G.AKSI_CRYPTO.boot),
      pq: !!(G.AKSI_PQ),
      webllm: !!(G.AKSI_WEBLLM),
      webllmReady: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()),
      quantum: !!(G.AKSI_QUANTUM || G.AKSI_QPIPE),
      knowledge: !!(G.AKSI_KNOWLEDGE)
    };
  }

  async function pulse() {
    var m = modules();
    var organs = [
      organ("api", m.api),
      organ("decision", m.decision),
      organ("neuro", m.neuro),
      organ("zero", m.zero),
      organ("superpose", m.superpose),
      organ("algorithm", m.algorithm),
      organ("vault", m.vault),
      organ("pi", m.pi),
      organ("ciphersuite", m.ciphersuite),
      organ("webllm", m.webllm, m.webllmReady ? "ready" : "optional"),
      organ("quantum", m.quantum)
    ];
    var alive = organs.filter(function (o) { return o.ok; }).length;
    var vaultSt = null;
    try {
      if (G.AKSI_VAULT && G.AKSI_VAULT.status) vaultSt = await G.AKSI_VAULT.status();
    } catch (e) {
      vaultSt = { error: String(e.message || e) };
    }
    var cryptoSt = null;
    try {
      if (G.AKSI_CRYPTO && G.AKSI_CRYPTO.status) cryptoSt = G.AKSI_CRYPTO.status();
    } catch (e) {}
    return {
      version: VER,
      formula: "AKSI = (A × I × S) × (1 + 0.4√n)",
      time: new Date().toISOString(),
      alive: alive,
      total: organs.length,
      health: Math.round((alive / organs.length) * 100),
      organs: organs,
      modules: m,
      vault: vaultSt,
      crypto: cryptoSt,
      contact: "aksilove@internet.ru"
    };
  }

  async function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { text: "", source: "empty" };

    if (G.AKSI && typeof G.AKSI.think === "function") {
      try {
        var t = await G.AKSI.think(query, opts);
        if (t && (t.text || t.answer)) {
          return {
            text: t.text || t.answer,
            answer: t.text || t.answer,
            source: t.source || "api",
            scores: t.score || t.scores || null,
            seal: t.seal || null
          };
        }
      } catch (e) {}
    }

    if (G.AKSI_DECISION && G.AKSI_DECISION.decide) {
      try {
        var d = await Promise.resolve(G.AKSI_DECISION.decide(query));
        if (d && d.answer) {
          return {
            text: d.answer,
            answer: d.answer,
            source: d.source || "decision",
            scores: d.scores || null,
            seal: d.seal || null,
            gate: d.gate || null
          };
        }
      } catch (e) {}
    }

    if (G.AKSI_ZERO && G.AKSI_ZERO.think) {
      try {
        var z = await Promise.resolve(G.AKSI_ZERO.think(query));
        if (z && (z.answer || z.text)) {
          return { text: z.answer || z.text, answer: z.answer || z.text, source: "zero" };
        }
      } catch (e) {}
    }

    if (G.AKSI_NEURO && G.AKSI_NEURO.think) {
      try {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer)) {
          return { text: n.text || n.answer, answer: n.text || n.answer, source: "neuro" };
        }
      } catch (e) {}
    }

    if (opts.allowWebLLM && G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
      try {
        var w = await G.AKSI_WEBLLM.complete(query, {
          temperature: 0.45,
          max_tokens: 512,
          system: "Ты — АКСИ. Отвечай полностью на русском."
        });
        if (w && w.text) return { text: w.text, answer: w.text, source: "webllm" };
      } catch (e) {}
    }

    return {
      text: "Я АКСИ — суверенный offline-организм. Decision, Vault π, Crypto, Neuro. Спросите «кто ты» или «запомни: факт». Контакт: aksilove@internet.ru",
      answer: "Я АКСИ — суверенный offline-организм. Decision, Vault π, Crypto, Neuro. Спросите «кто ты» или «запомни: факт». Контакт: aksilove@internet.ru",
      source: "organism-fallback"
    };
  }

  async function decide(query, opts) {
    if (G.AKSI && G.AKSI.decide) {
      try {
        var p = await G.AKSI.decide(query, opts);
        if (p && p.answer) return p;
      } catch (e) {}
    }
    var t = await think(query, opts);
    return {
      id: "org-" + Date.now().toString(36),
      answer: t.answer || t.text,
      anti: "organism path",
      source: t.source,
      scores: t.scores || { aksi: 0.6, eqs: 60, phi: 0.5, qcli: 0.5 },
      gate: t.gate || { ok: true, reason: "organism" },
      seal: t.seal || { kind: "organism", t: Date.now() },
      ms: 0,
      version: VER
    };
  }

  async function remember(fact, password) {
    fact = String(fact || "").trim();
    if (!fact) return { ok: false, error: "empty" };
    if (G.AKSI_VAULT && G.AKSI_VAULT.learn) {
      try {
        var v = await G.AKSI_VAULT.learn(fact, password || null);
        if (v && v.ok) return v;
      } catch (e) {}
    }
    if (G.AKSI && G.AKSI.learn) {
      try {
        return await G.AKSI.learn(fact);
      } catch (e) {}
    }
    if (G.AKSI_NEURO && G.AKSI_NEURO.learn) {
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
    learn: remember
  };

  if (!G.AKSI) {
    G.AKSI = {
      version: VER + "-bridge",
      decide: decide,
      think: think,
      learn: remember,
      status: function () {
        return { version: VER, via: "organism" };
      }
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
