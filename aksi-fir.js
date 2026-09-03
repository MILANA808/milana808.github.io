/**
 * AKSI FIR — Full Intelligence Runtime v1.0
 * PLAN → RETRIEVE → GENERATE/FUSE → Q-GATE → ADIA → LEARN → ATTEST
 * Layers: NEURO, MIND, GENESIS, AI, WEBLLM, QPIPE, ADIA, CRYPTO
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-fir";
  var TRACE_KEY = "aksi_fir_trace_v1";
  var MEM_KEY = "aksi_fir_memory_v1";
  function now() { return Date.now(); }
  function uid() { return "fir" + now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function round(x, d) { var p = Math.pow(10, d == null ? 3 : d); return Math.round(+x * p) / p; }
  function load(k) { try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(k, a) { try { localStorage.setItem(k, JSON.stringify(a.slice(-100))); } catch (e) {} }
  function plan(q) {
    var low = String(q || "").toLowerCase();
    return { raw: String(q || "").trim(), teach: /^\s*(запомни|remember|learn)\s*[:：]/i.test(low), wantLlm: /подробн|развёрн|разверн|explain in detail|напиши код/.test(low), lang: /[а-яё]/i.test(q || "") ? "ru" : "en" };
  }
  function callNeuro(q) {
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        var r = G.AKSI_NEURO.think(q);
        if (r && (r.text || r.answer)) return { text: String(r.text || r.answer), source: "neuro", score: r.score != null ? r.score : 0.7, raw: r };
      }
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.ask === "function") {
        var r2 = G.AKSI_NEURO.ask(q);
        if (r2 && (r2.text || typeof r2 === "string")) return { text: String(r2.text || r2), source: "neuro", score: 0.65, raw: r2 };
      }
    } catch (e) {}
    return null;
  }
  function callMind(q) {
    try {
      if (G.AKSI_MIND_L2 && typeof G.AKSI_MIND_L2.think === "function") {
        var r = G.AKSI_MIND_L2.think(q);
        if (r && r.text) return { text: String(r.text), source: "mind-l2", score: 0.6, raw: r };
      }
    } catch (e) {}
    return null;
  }
  async function callGenesis(q) {
    try {
      if (G.AKSI_GENESIS && G.AKSI_GENESIS.think) {
        var g = await G.AKSI_GENESIS.think(q);
        var p = g.payload || g;
        return { text: p.answer || "", source: "genesis", score: p.critique && p.critique.score != null ? p.critique.score : 0.5, seal: g.seal, quantum: p.quantum, critique: p.critique, thought: p.thought, derived: p.derived, raw: g };
      }
    } catch (e) {}
    return null;
  }
  async function callAi(q) {
    try {
      if (G.AKSI_AI && G.AKSI_AI.think) {
        var r = await G.AKSI_AI.think(q);
        var p = r.payload || r;
        return { text: p.answer || "", source: "aksi-ai", score: (p.critique && p.critique.score) || 0.5, seal: r.seal, raw: r };
      }
    } catch (e) {}
    return null;
  }
  async function callWebLLM(q) {
    try {
      if (G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) {
        var r = await G.AKSI_WEBLLM.complete(q, { system: "Ты АКСИ — local-first ИИ. Отвечай по языку вопроса. Кратко и честно." });
        if (r && r.text) return { text: r.text, source: "webllm", score: 0.85, model: r.model, raw: r };
      }
    } catch (e) {}
    return null;
  }
  function fuseTexts(cands) {
    var best = null, i, second = null;
    for (i = 0; i < cands.length; i++) {
      if (!cands[i] || !cands[i].text) continue;
      if (!best || (cands[i].score || 0) > (best.score || 0)) best = cands[i];
    }
    if (!best) return null;
    for (i = 0; i < cands.length; i++) {
      if (!cands[i] || cands[i] === best || !cands[i].text) continue;
      if (cands[i].source !== best.source && (cands[i].score || 0) > 0.45) {
        if (!second || cands[i].score > second.score) second = cands[i];
      }
    }
    var text = best.text;
    if (second && second.text && second.text.slice(0, 80) !== best.text.slice(0, 80)) {
      var add = second.text.slice(0, 200);
      if (text.indexOf(add.slice(0, 40)) === -1) text = text + "\n\n—\n" + add;
    }
    return { text: text, source: best.source + (second ? "+" + second.source : ""), score: best.score, primary: best, secondary: second };
  }
  function teachLocal(fact) {
    var m = load(MEM_KEY); m.push({ text: fact, ts: now(), id: uid() }); save(MEM_KEY, m);
    if (G.AKSI_GENESIS && G.AKSI_GENESIS.teach) G.AKSI_GENESIS.teach(fact);
    try { if (G.AKSI_NEURO && G.AKSI_NEURO.teach) G.AKSI_NEURO.teach(fact); } catch (e) {}
    return m.length;
  }
  async function think(input, opts) {
    opts = opts || {};
    var t0 = now(), p = plan(input), steps = [];
    function step(name, detail) { steps.push({ s: name, t: now() - t0, detail: detail || null }); }
    if (!p.raw) return { answer: "Пустой запрос", source: "fir", kind: "empty", thought: steps, ms: 0 };
    step("plan", { teach: p.teach, wantLlm: p.wantLlm });
    if (p.teach) {
      var fact = p.raw.replace(/^\s*(запомни|remember|learn)\s*[:：]\s*/i, "").trim();
      var n = teachLocal(fact || p.raw);
      step("learn", { n: n });
      return { id: uid(), version: VER, answer: "Обучено. FIR-память: " + n, kind: "learned", source: "fir-learn", thought: steps, ms: now() - t0 };
    }
    var cands = [];
    var neuro = callNeuro(p.raw); if (neuro) { cands.push(neuro); step("neuro", { score: neuro.score }); }
    var mind = callMind(p.raw); if (mind) { cands.push(mind); step("mind", { score: mind.score }); }
    var gen = await callGenesis(p.raw); if (gen && gen.text) { cands.push(gen); step("genesis", { score: gen.score }); }
    var ai = await callAi(p.raw); if (ai && ai.text) { cands.push(ai); step("aksi-ai", { score: ai.score }); }
    var bestScore = cands.reduce(function (m, c) { return Math.max(m, c.score || 0); }, 0);
    if (opts.useWebLLM !== false && (p.wantLlm || bestScore < 0.45 || opts.forceLlm)) {
      var llm = await callWebLLM(p.raw); if (llm) { cands.push(llm); step("webllm", { score: llm.score }); }
    }
    var mem = load(MEM_KEY), i;
    for (i = 0; i < mem.length; i++) {
      var t = (mem[i].text || "").toLowerCase();
      if (t && p.raw.toLowerCase().split(/\s+/).some(function (w) { return w.length > 3 && t.indexOf(w) !== -1; }))
        cands.push({ text: mem[i].text, source: "fir-mem", score: 0.55 });
    }
    var fused = fuseTexts(cands);
    step("fuse", { n: cands.length, pick: fused && fused.source });
    if (!fused || !fused.text) {
      fused = { text: p.lang === "ru" ? "Недостаточно опоры. «запомни: …» или WebLLM в /matrix/." : "Low support. remember: … or WebLLM.", source: "fir-gap", score: 0.2 };
      step("gap", null);
    }
    var quantum = gen && gen.quantum || null;
    if (!quantum && G.AKSI_QPIPE && G.AKSI_QPIPE.processAnswer) {
      try { quantum = await G.AKSI_QPIPE.processAnswer(p.raw, fused.text); step("qpipe", null); } catch (e) { step("qpipe-err", String(e.message || e)); }
    }
    var adia = null;
    try {
      var AD = G.AKSI_ADIA || G.ADIA || G.AKSI_ALGORITHM;
      if (AD && typeof AD.evaluate === "function") { adia = AD.evaluate({ query: p.raw, answer: fused.text }); step("adia", adia && (adia.eqs || adia.score)); }
      else if (AD && typeof AD.process === "function") { adia = AD.process({ query: p.raw, answer: fused.text }); step("adia", null); }
    } catch (e) {}
    var body = {
      id: uid(), version: VER, input: p.raw, answer: fused.text, kind: fused.source === "fir-gap" ? "gap" : "answer",
      source: fused.source, score: round(fused.score || 0),
      layers: cands.map(function (c) { return { source: c.source, score: round(c.score || 0), preview: String(c.text || "").slice(0, 50) }; }),
      quantum: quantum, adia: adia, seal: gen && gen.seal || null, thought: steps, ms: now() - t0
    };
    if (G.AKSI_CRYPTO && G.AKSI_CRYPTO.sealJson) {
      try {
        var sealed = await G.AKSI_CRYPTO.sealJson(body);
        body.seal = sealed.seal || sealed; step("attest-crypto", null);
        save(TRACE_KEY, load(TRACE_KEY).concat([{ id: body.id, ts: t0, score: body.score }]));
        return Object.assign({ payload: body }, sealed.seal ? { seal: sealed.seal } : {});
      } catch (e) {}
    }
    save(TRACE_KEY, load(TRACE_KEY).concat([{ id: body.id, ts: t0, score: body.score }]));
    return { payload: body, answer: body.answer, source: body.source, thought: steps, ms: body.ms, layers: body.layers, quantum: quantum, seal: body.seal };
  }
  async function status() {
    return {
      version: VER, neuro: !!G.AKSI_NEURO, genesis: !!(G.AKSI_GENESIS && G.AKSI_GENESIS.think),
      aksi_ai: !!(G.AKSI_AI && G.AKSI_AI.think), mind: !!(G.AKSI_MIND_L2 || G.AKSI_MIND),
      webllm: !!(G.AKSI_WEBLLM && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()), webllm_present: !!G.AKSI_WEBLLM,
      qpipe: !!G.AKSI_QPIPE, crypto: !!G.AKSI_CRYPTO, adia: !!(G.AKSI_ADIA || G.ADIA), memory: load(MEM_KEY).length
    };
  }
  G.AKSI_FIR = {
    version: VER, think: think, status: status,
    teach: function (f) { return { ok: true, n: teachLocal(String(f || "")) }; },
    memory: function () { return load(MEM_KEY); },
    layers: ["neuro", "mind", "genesis", "aksi-ai", "webllm", "qpipe", "adia", "crypto"]
  };
  if (G.AKSIAgent && G.AKSIAgent.ask) {
    var _ask = G.AKSIAgent.ask;
    G.AKSIAgent.ask = async function (q, opts) {
      if (opts && opts.skipFir) return _ask.call(G.AKSIAgent, q, opts);
      try {
        var r = await think(q, opts); var p = r.payload || r;
        return { text: p.answer || r.answer, source: p.source || "fir", offline: true, critique: { score: p.score }, quantum: p.quantum, seal: r.seal || p.seal, thought: p.thought, layers: p.layers, ms: p.ms };
      } catch (e) { return _ask.call(G.AKSIAgent, q, opts); }
    };
  }
})(typeof window !== "undefined" ? window : globalThis);
