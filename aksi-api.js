/**
 * AKSI Product API v1.0 — unified browser API for the sovereign stack
 * Wraps Decision · ADIA · Neuro · Zero · Superpose · WebLLM
 * Offline-first. Contact: aksilove@internet.ru
 *
 * Usage:
 *   const r = await AKSI.decide("Кто ты?");
 *   const t = await AKSI.think("формула AKSI");
 *   const s = AKSI.evaluate("q", "answer text");
 *   AKSI.learn("запомни: факт");
 *   console.log(AKSI.status());
 */
(function (G) {
  "use strict";

  var VERSION = "1.0.0-product";
  var FORMULA = "AKSI=(A×I×S)×(1+0.4√n)";

  function has(name, fn) {
    var o = G[name];
    return !!(o && (typeof o[fn] === "function" || (fn == null && o)));
  }

  function modules() {
    return {
      decision: has("AKSI_DECISION", "decide"),
      adia: !!(G.AKSI_ALGORITHM || G.ADIA || G.AKSI_ADIA),
      neuro: has("AKSI_NEURO", "think"),
      zero: has("AKSI_ZERO", "think"),
      superpose: has("AKSI_SUPERPOSE", "ask"),
      webllm: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()),
      quantum: !!(G.AKSI_QUANTUM || G.AKSI_QPIPE),
      compose: has("AKSI_COMPOSE", "think"),
      integrity: !!G.AKSI_INTEGRITY,
      knowledge: !!G.AKSI_KNOWLEDGE
    };
  }

  function status() {
    return {
      version: VERSION,
      formula: FORMULA,
      offline: true,
      modules: modules(),
      contact: "aksilove@internet.ru",
      product: "AKSI Contour + ADIA + Neuro"
    };
  }

  /** Rank / seal answer with ADIA */
  function evaluate(query, answer, opts) {
    opts = opts || {};
    var eng = G.AKSI_ALGORITHM || G.AKSI_ADIA || G.ADIA;
    if (eng && typeof eng.evaluate === "function") {
      return eng.evaluate(query, answer, opts);
    }
    if (eng && typeof eng.process === "function") {
      return eng.process(query, [{ text: String(answer || ""), source: opts.source || "api" }], opts);
    }
    var text = String(answer || "");
    var len = text.length;
    var eqs = Math.min(95, 40 + Math.min(40, len / 8));
    return {
      eqs: eqs,
      aksi: (0.9 * (eqs / 100) * 0.85) * (1 + 0.4 * Math.sqrt(0)),
      source: "api-lite",
      version: VERSION
    };
  }

  /** Full decision packet: engines → gate → seal */
  function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) {
      return Promise.resolve({ ok: false, error: "empty query", answer: "" });
    }
    if (G.AKSI_DECISION && typeof G.AKSI_DECISION.decide === "function") {
      return Promise.resolve(G.AKSI_DECISION.decide(query)).then(function (r) {
        if (r && r.answer && !r.scores && (G.AKSI_ALGORITHM || G.AKSI_ADIA)) {
          try {
            var ev = evaluate(query, r.answer, { source: r.source });
            r.scores = r.scores || ev;
          } catch (e) {}
        }
        return r;
      });
    }
    return think(query, opts).then(function (t) {
      var answer = t.text || t.answer || "";
      var scores = evaluate(query, answer, { source: t.source || "api" });
      var aksi = scores.aksi != null ? scores.aksi : scores.eqs / 100;
      var gateOk = aksi >= 0.55 || (scores.eqs != null && scores.eqs >= 55);
      return {
        ok: true,
        id: "api-" + Date.now().toString(36),
        answer: answer,
        anti: t.anti || "API path without Decision Runtime.",
        source: t.source || "api",
        scores: {
          aksi: typeof aksi === "number" ? Math.round(aksi * 1000) / 1000 : aksi,
          eqs: scores.eqs,
          phi: scores.phi,
          qcli: scores.qcli
        },
        gate: { ok: !!gateOk, reason: gateOk ? "api-pass" : "below-tau" },
        seal: scores.seal || { alg: "api-lite", t: Date.now() },
        version: VERSION,
        offline: true
      };
    });
  }

  /** Mind-style answer path */
  function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return Promise.resolve({ text: "", source: "empty" });

    function fromNeuro() {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        return Promise.resolve(G.AKSI_NEURO.think(query)).then(function (n) {
          if (n && (n.text || n.answer)) {
            return { text: n.text || n.answer, answer: n.text || n.answer, source: "neuro", score: n.score };
          }
          return null;
        }).catch(function () { return null; });
      }
      return Promise.resolve(null);
    }

    function fromZero() {
      if (G.AKSI_ZERO && typeof G.AKSI_ZERO.think === "function") {
        return Promise.resolve(G.AKSI_ZERO.think(query)).then(function (z) {
          if (z && (z.answer || z.text)) {
            return { text: z.answer || z.text, answer: z.answer || z.text, source: "zero", confidence: z.confidence };
          }
          return null;
        }).catch(function () { return null; });
      }
      return Promise.resolve(null);
    }

    function fromWebLLM() {
      if (G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready() && G.AKSI_WEBLLM.complete) {
        return G.AKSI_WEBLLM.complete(query, { temperature: 0.4, max_tokens: 280 }).then(function (w) {
          if (w && w.text) return { text: w.text, answer: w.text, source: "webllm" };
          return null;
        }).catch(function () { return null; });
      }
      return Promise.resolve(null);
    }

    return fromZero().then(function (z) {
      if (z) return z;
      return fromNeuro();
    }).then(function (n) {
      if (n) return n;
      return fromWebLLM();
    }).then(function (w) {
      if (w) return w;
      return {
        text: "АКСИ API online. Модули Decision/Neuro ещё загружаются. Спросите «кто ты» или «формула». Контакт: aksilove@internet.ru",
        answer: "АКСИ API online. Модули Decision/Neuro ещё загружаются. Спросите «кто ты» или «формула». Контакт: aksilove@internet.ru",
        source: "api-bootstrap"
      };
    });
  }

  /** Superposition of candidates */
  function superpose(query, opts) {
    opts = opts || {};
    if (G.AKSI_SUPERPOSE && typeof G.AKSI_SUPERPOSE.ask === "function") {
      return Promise.resolve(G.AKSI_SUPERPOSE.ask(query, opts));
    }
    return decide(query, opts).then(function (d) {
      return {
        answer: d.answer,
        source: d.source || "decision",
        scores: d.scores,
        seal: d.seal,
        superposition: [{ i: 0, text: d.answer, source: d.source, prob: 1, selected: true }]
      };
    });
  }

  /** Teach local memory */
  function learn(fact) {
    fact = String(fact || "").trim();
    if (!fact) return Promise.resolve({ ok: false });
    if (!/^запомни\s*[:：]/i.test(fact) && !/^remember\s*[:：]/i.test(fact)) {
      fact = "запомни: " + fact;
    }
    if (G.AKSI_DECISION && G.AKSI_DECISION.decide) {
      return Promise.resolve(G.AKSI_DECISION.decide(fact));
    }
    if (G.AKSI_NEURO && G.AKSI_NEURO.learn) {
      G.AKSI_NEURO.learn(fact.replace(/^запомни\s*[:：]\s*/i, ""));
      return Promise.resolve({ ok: true, source: "neuro" });
    }
    try {
      var key = "aksi_api_mem_v1";
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ t: Date.now(), text: fact });
      localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      return Promise.resolve({ ok: true, source: "localStorage", n: arr.length });
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e.message || e) });
    }
  }

  function loadWebLLM(modelId, onProgress) {
    if (!G.AKSI_WEBLLM || !G.AKSI_WEBLLM.load) {
      return Promise.reject(new Error("aksi-webllm.js not loaded"));
    }
    return G.AKSI_WEBLLM.load(modelId || null, onProgress);
  }

  G.AKSI = {
    version: VERSION,
    formula: FORMULA,
    status: status,
    modules: modules,
    decide: decide,
    think: think,
    evaluate: evaluate,
    superpose: superpose,
    learn: learn,
    loadWebLLM: loadWebLLM,
    ask: think,
    chat: think
  };

  G.AKSI_API = G.AKSI;
})(typeof window !== "undefined" ? window : globalThis);
