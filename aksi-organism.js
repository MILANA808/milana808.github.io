/**
 * AKSI Organism v1.1 — + π-Contour computational path
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-organism-pi";

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
      piContour: !!(G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process),
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
      organ("piContour", m.piContour),
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
      contact: "aksilove@internet.ru"
    };
  }

  async function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { text: "", source: "empty" };

    var preferPi = /π|\bpi\b|пи\b|контур|формул|theta|угол/i.test(query) || opts.pi === true;
    if (G.AKSI_PI_CONTOUR && typeof G.AKSI_PI_CONTOUR.process === "function" && preferPi) {
      try {
        var pi = await G.AKSI_PI_CONTOUR.process(query, opts);
        if (pi && (pi.answer || pi.text)) {
          return {
            text: pi.answer || pi.text,
            answer: pi.answer || pi.text,
            source: pi.source || "pi-contour",
            scores: pi.scores || null,
            seal: pi.seal || null,
            features: pi.features || null,
            gate: pi.gate || null
          };
        }
      } catch (e) {}
    }

    if (G.AKSI && typeof G.AKSI.think === "function") {
      try {
        var t = await G.AKSI.think(query, opts);
        if (t && (t.text || t.answer)) {
          if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process) {
            try {
              var pe = await G.AKSI_PI_CONTOUR.process(query, {
                candidates: [{ text: t.text || t.answer, source: t.source || "api", score: 0.7 }]
              });
              if (pe && pe.seal) {
                t.seal = t.seal || pe.seal;
                t.scores = t.scores || pe.scores;
                t.features = pe.features;
              }
            } catch (e2) {}
          }
          return {
            text: t.text || t.answer,
            answer: t.text || t.answer,
            source: t.source || "api",
            scores: t.score || t.scores || null,
            seal: t.seal || null,
            features: t.features || null
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

    if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process) {
      try {
        var p2 = await G.AKSI_PI_CONTOUR.process(query, opts);
        if (p2 && p2.answer) {
          return {
            text: p2.answer,
            answer: p2.answer,
            source: "pi-contour",
            scores: p2.scores,
            seal: p2.seal,
            features: p2.features,
            gate: p2.gate
          };
        }
      } catch (e) {}
    }

    return {
      text: "Я АКСИ — offline-организм с π-контуром. Спросите «π» или «формула». Контакт: aksilove@internet.ru",
      answer: "Я АКСИ — offline-организм с π-контуром. Спросите «π» или «формула». Контакт: aksilove@internet.ru",
      source: "organism-fallback"
    };
  }

  async function decide(query, opts) {
    if (G.AKSI_PI_CONTOUR && /π|\bpi\b|пи\b|контур|формул/i.test(String(query || ""))) {
      try {
        var pr = await G.AKSI_PI_CONTOUR.process(query, opts);
        if (pr && pr.answer) {
          return {
            id: "pi-" + Date.now().toString(36),
            answer: pr.answer,
            anti: "π-contour",
            source: pr.source,
            scores: pr.scores,
            gate: pr.gate,
            seal: pr.seal,
            features: pr.features,
            ms: 0,
            version: VER
          };
        }
      } catch (e) {}
    }
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
      features: t.features || null,
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
