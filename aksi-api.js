/**
 * AKSI Product API v1.4.1 — offline-first
 * decide/think/learn + Reality enrichDecision
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VERSION = "1.4.1-reality";
  function has(name, method) {
    var o = G[name];
    return !!(o && (!method || typeof o[method] === "function"));
  }
  function status() {
    return {
      version: VERSION,
      modules: {
        organism: !!G.AKSI_ORGANISM,
        decision: has("AKSI_DECISION", "decide"),
        neuro: has("AKSI_NEURO", "think"),
        zero: has("AKSI_ZERO", "think"),
        pi: has("AKSI_PI_CONTOUR", "process"),
        vault: has("AKSI_VAULT", "learn"),
        superpose: has("AKSI_SUPERPOSE", "ask"),
        reality: !!G.AKSI_REALITY,
        mind: !!G.AKSI_MIND,
        crystal: !!G.AKSI_CRYSTAL,
        webllm: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready())
      },
      ts: Date.now()
    };
  }
  function learn(fact) {
    fact = String(fact || "").trim();
    if (!fact) return Promise.resolve({ ok: false, error: "empty" });
    if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.remember === "function") return Promise.resolve(G.AKSI_ORGANISM.remember(fact));
    if (G.AKSI_VAULT && typeof G.AKSI_VAULT.learn === "function") return Promise.resolve(G.AKSI_VAULT.learn(fact));
    if (G.AKSI_CRYSTAL && typeof G.AKSI_CRYSTAL.remember === "function") return Promise.resolve(G.AKSI_CRYSTAL.remember(fact));
    try {
      var key = "aksi_api_mem_v1";
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ t: Date.now(), text: fact });
      localStorage.setItem(key, JSON.stringify(arr.slice(-120)));
      return Promise.resolve({ ok: true, source: "localStorage", n: arr.length });
    } catch (e) {
      return Promise.resolve({ ok: false, error: String(e.message || e) });
    }
  }
  function localThink(query) {
    var q = String(query || "").toLowerCase();
    var a;
    if (/кто ты|who are you|привет/.test(q)) a = "Я АКСИ — sovereign offline runtime. Decision · Mind · Reality. Контакт: aksilove@internet.ru";
    else if (/формул|formula/.test(q)) a = "AKSI = (A × I × S) × (1 + 0.4√n). A — agency, I — integrity, S — structure, n — sealed history.";
    else if (/π|\bpi\b|пи\b|контур/.test(q)) a = "π-Contour: query → SHA-256 → θ ∈ [0, 2π) → FNV seal.";
    else if (/reality|реальн/.test(q)) a = "Reality Layer: opt-in наблюдения → RealityEvent (observe-only). /reality/";
    else a = "АКСИ API v" + VERSION + ". Спросите: кто ты, формула, π, reality. aksilove@internet.ru";
    return { text: a, answer: a, source: "api-local" };
  }
  function thinkFallback(query) {
    if (G.AKSI_MIND && typeof G.AKSI_MIND.reason === "function") return Promise.resolve(G.AKSI_MIND.reason(query));
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      return Promise.resolve(G.AKSI_NEURO.think(query)).then(function (n) {
        if (n && (n.text || n.answer)) return { text: n.text || n.answer, answer: n.text || n.answer, source: "neuro", score: n.score };
        return localThink(query);
      }).catch(function () { return localThink(query); });
    }
    return Promise.resolve(localThink(query));
  }
  function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return Promise.resolve({ text: "", answer: "", source: "empty" });
    if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.think === "function") {
      return Promise.resolve(G.AKSI_ORGANISM.think(query, opts)).then(function (t) {
        if (t && (t.text || t.answer)) return t;
        return thinkFallback(query);
      }).catch(function () { return thinkFallback(query); });
    }
    return thinkFallback(query);
  }
  function wrapDecision(t) {
    var answer = (t && (t.answer || t.text)) || "";
    var packet = {
      ok: true, id: "api-" + Date.now().toString(36), answer: answer,
      anti: "api · " + ((t && t.source) || "local"), source: (t && t.source) || "api",
      scores: (t && t.scores) || { aksi: 0.6, eqs: 60, phi: 0.5, qcli: 0.5 },
      gate: (t && t.gate) || { ok: true, reason: "api-pass" },
      seal: (t && t.seal) || { kind: "api", t: Date.now() }, version: VERSION
    };
    try { if (G.AKSI_REALITY && typeof G.AKSI_REALITY.enrichDecision === "function") packet = G.AKSI_REALITY.enrichDecision(packet); } catch (e) {}
    return packet;
  }
  function decideCore(query, opts) {
    if (G.AKSI_ORGANISM && typeof G.AKSI_ORGANISM.decide === "function") {
      return Promise.resolve(G.AKSI_ORGANISM.decide(query, opts)).then(function (d) {
        if (d && d.answer) {
          try { if (G.AKSI_REALITY && G.AKSI_REALITY.enrichDecision) d = G.AKSI_REALITY.enrichDecision(d); } catch (e) {}
          return d;
        }
        return think(query, opts).then(wrapDecision);
      }).catch(function () { return think(query, opts).then(wrapDecision); });
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
          ok: !!(lr && lr.ok !== false), id: "learn-" + Date.now().toString(36),
          answer: (lr && lr.ok !== false) ? ("Сохранено · " + (lr.source || "memory")) : "Не удалось сохранить",
          anti: "learn", source: "learn", scores: { aksi: 0.7, eqs: 70, phi: 0.5, qcli: 0.5 },
          gate: { ok: true, reason: "learn" }, seal: { kind: "learn", t: Date.now() }, version: VERSION, learn: lr
        };
      });
    }
    if (G.AKSI_PI_CONTOUR && typeof G.AKSI_PI_CONTOUR.process === "function" && /π|\bpi\b|пи\b|контур/i.test(query)) {
      return Promise.resolve(G.AKSI_PI_CONTOUR.process(query)).then(function (pr) {
        if (pr && pr.answer) {
          var packet = {
            ok: true, id: "pi-" + Date.now().toString(36), answer: pr.answer, anti: "π-contour", source: "pi-contour",
            scores: pr.scores || { aksi: 0.82, eqs: 82, phi: 0.72, qcli: 0.68 },
            gate: pr.gate || { ok: true, reason: "pi-pass" }, seal: pr.seal || null, features: pr.features || null, version: VERSION
          };
          try { if (G.AKSI_REALITY && G.AKSI_REALITY.enrichDecision) packet = G.AKSI_REALITY.enrichDecision(packet); } catch (e) {}
          return packet;
        }
        return decideCore(query, opts);
      }).catch(function () { return decideCore(query, opts); });
    }
    return decideCore(query, opts);
  }
  function superpose(query, opts) {
    opts = opts || {};
    if (G.AKSI_SUPERPOSE && typeof G.AKSI_SUPERPOSE.ask === "function") return Promise.resolve(G.AKSI_SUPERPOSE.ask(query, opts));
    return decide(query, opts).then(function (d) {
      d.superposition = [{ i: 0, source: d.source, prob: 1, text: d.answer, selected: true }];
      return d;
    });
  }
  G.AKSI = { version: VERSION, decide: decide, think: think, learn: learn, superpose: superpose, status: status, evaluate: decide, ask: think, chat: think };
})(typeof window !== "undefined" ? window : globalThis);
