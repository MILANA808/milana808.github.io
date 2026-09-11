/**
 * AKSI API v1.5.0-comprehend — decide via Q-Select (find	o understand	o answer	o collapse)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.5.0-comprehend";

  function status() {
    return {
      version: VERSION,
      brain: !!(G.AKSI_BRAIN && G.AKSI_BRAIN.decide),
      qselect: !!(G.AKSI_QSELECT && G.AKSI_QSELECT.select),
      comprehend: !!(G.AKSI_COMPREHEND && G.AKSI_COMPREHEND.answer),
      internet: !!(G.AKSI_INTERNET && G.AKSI_INTERNET.research)
    };
  }

  function learn(query) {
    query = String(query || "").trim();
    var fact = query.replace(/^(запомни|remember)\s*[:：]\s*/i, "");
    return Promise.resolve().then(function () {
      if (G.AKSI_CRYSTAL && G.AKSI_CRYSTAL.remember) return G.AKSI_CRYSTAL.remember(fact);
      return { ok: true, source: "local" };
    }).then(function (r) {
      return { ok: true, source: (r && r.source) || "memory", fact: fact };
    }).catch(function () {
      return { ok: false };
    });
  }

  function think(query, opts) {
    opts = opts || {};
    if (G.AKSI_BRAIN && typeof G.AKSI_BRAIN.decide === "function") {
      return Promise.resolve(G.AKSI_BRAIN.decide(query, opts));
    }
    return Promise.resolve({ ok: true, answer: "АКСИ API " + VERSION, source: "api-fallback" });
  }

  function wrapDecision(d) {
    if (!d) d = {};
    return {
      ok: d.ok !== false,
      id: d.id || ("api-" + Date.now().toString(36)),
      answer: d.answer || d.text || "",
      anti: d.anti || d.source || "api",
      source: d.source || "api",
      scores: d.scores || { aksi: 0.7, eqs: 70, phi: 0.5, qcli: 0.5 },
      gate: d.gate || { ok: true, reason: "pass" },
      seal: d.seal || null,
      version: VERSION
    };
  }

  function decideCore(query, opts) {
    if (G.AKSI_BRAIN && typeof G.AKSI_BRAIN.decide === "function") {
      return Promise.resolve(G.AKSI_BRAIN.decide(query, opts)).then(wrapDecision);
    }
    if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function") {
      return Promise.resolve(G.AKSI_ORGANISM.decide(query, opts)).then(function (d) {
        if (d && d.answer) return wrapDecision(d);
        return think(query, opts).then(wrapDecision);
      }).catch(function () {
        return think(query, opts).then(wrapDecision);
      });
    }
    return think(query, opts).then(wrapDecision);
  }

  function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return Promise.resolve({ ok: false, error: "empty query", answer: "" });
    if (/^запомни\s*[:：]/i.test(query) || /^remember\s*[:：]/i.test(query)) {
      return learn(query).then(function (lr) {
        return {
          ok: !!(lr && lr.ok !== false),
          id: "learn-" + Date.now().toString(36),
          answer: (lr && lr.ok !== false) ? ("Сохранено · " + (lr.source || "memory")) : "Не удалось сохранить",
          anti: "learn",
          source: "learn",
          scores: { aksi: 0.7, eqs: 70, phi: 0.5, qcli: 0.5 },
          gate: { ok: true, reason: "learn" },
          seal: { kind: "learn", t: Date.now() },
          version: VERSION,
          learn: lr
        };
      });
    }
    if (G.AKSI_PI_CONTOUR && typeof G.AKSI_PI_CONTOUR.process === "function" && /π|\bpi\b|пи\b|контур/i.test(query)) {
      return Promise.resolve(G.AKSI_PI_CONTOUR.process(query)).then(function (pr) {
        if (pr && pr.answer) {
          return {
            ok: true,
            id: "pi-" + Date.now().toString(36),
            answer: pr.answer,
            anti: "π-contour",
            source: "pi-contour",
            scores: pr.scores || { aksi: 0.82, eqs: 82, phi: 0.72, qcli: 0.68 },
            gate: pr.gate || { ok: true, reason: "pi-pass" },
            seal: pr.seal || null,
            version: VERSION
          };
        }
        return decideCore(query, opts);
      }).catch(function () {
        return decideCore(query, opts);
      });
    }
    if (G.AKSI_QSELECT && typeof G.AKSI_QSELECT.select === "function" && opts.qselect !== false) {
      return G.AKSI_QSELECT.select(query, Object.assign({ internet: true }, opts)).then(function (r) {
        if (r && r.answer) {
          return {
            ok: true,
            id: "qs-" + Date.now().toString(36),
            answer: r.answer,
            anti: "qselect",
            source: r.source || "qselect",
            scores: {
              aksi: 0.85,
              eqs: Math.round((r.probability || 0.7) * 100),
              phi: 0.7,
              qcli: (r.quantum && r.quantum.QCLI) || 0.6
            },
            gate: { ok: true, reason: "qselect-collapse" },
            seal: r.seal || null,
            superposition: r.superposition || null,
            version: VERSION
          };
        }
        return decideCore(query, opts);
      }).catch(function () {
        return decideCore(query, opts);
      });
    }
    return decideCore(query, opts);
  }

  function superpose(query, opts) {
    return decide(query, opts).then(function (d) {
      if (!d.superposition) {
        d.superposition = [{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }];
      }
      return d;
    });
  }

  G.AKSI = {
    version: VERSION,
    decide: decide,
    think: think,
    learn: learn,
    superpose: superpose,
    status: status,
    evaluate: decide,
    ask: think,
    chat: think
  };
})(typeof window !== "undefined" ? window : globalThis);
