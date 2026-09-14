/**
 * AKSI Organism v1.3 — unified nervous system
 * Cascade: Pi → Decision → Zero → Neuro → local + Fly-Gate · organs · bus
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.3-organism";
  var CHANNEL = "aksi-organism-v1";
  var ORGANS = {
    cortex: { id: "cortex", name: "Cortex", href: "/ask.html", role: "решение", pulse: "idle" },
    brainstem: { id: "brainstem", name: "Brainstem", href: "/brain.html", role: "Fly-Gate", pulse: "idle" },
    sensory: { id: "sensory", name: "Sensory", href: "/ask.html", role: "KB", pulse: "idle" },
    memory: { id: "memory", name: "Memory", href: "/contour/", role: "Vault/IDB", pulse: "idle" },
    trust: { id: "trust", name: "Trust", href: "/verify.html", role: "Receipt", pulse: "idle" },
    lab: { id: "lab", name: "Lab", href: "/brain.html", role: "4096+140k", pulse: "idle" },
    matrix: { id: "matrix", name: "MATRIX", href: "/matrix/", role: "WebLLM", pulse: "idle" },
    protocol: { id: "protocol", name: "Protocol", href: "/protocol/", role: "HRR", pulse: "idle" }
  };
  var bus = null;
  try { bus = new BroadcastChannel(CHANNEL); } catch (e) {}
  var listeners = [];
  function emit(type, payload) {
    var msg = { type: type, payload: payload, t: Date.now(), version: VER };
    try { localStorage.setItem("aksi_organism_last", JSON.stringify(msg)); } catch (e) {}
    if (bus) try { bus.postMessage(msg); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(msg); } catch (e) {} });
  }
  function on(fn) {
    listeners.push(fn);
    if (bus) bus.onmessage = function (ev) { listeners.forEach(function (f) { try { f(ev.data); } catch (e) {} }); };
    return function () { var i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
  }
  function setPulse(id, state) {
    if (ORGANS[id]) ORGANS[id].pulse = state || "idle";
    emit("pulse", { organ: id, state: state, organs: snapshot() });
  }
  function snapshot() {
    var o = {}, k;
    for (k in ORGANS) if (Object.prototype.hasOwnProperty.call(ORGANS, k))
      o[k] = { id: ORGANS[k].id, name: ORGANS[k].name, href: ORGANS[k].href, role: ORGANS[k].role, pulse: ORGANS[k].pulse };
    return o;
  }
  function modules() {
    return {
      api: !!(G.AKSI && G.AKSI.decide),
      decision: !!(G.AKSI_DECISION && G.AKSI_DECISION.decide),
      neuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      zero: !!(G.AKSI_ZERO && G.AKSI_ZERO.think),
      piContour: !!(G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process),
      vault: !!(G.AKSI_VAULT && G.AKSI_VAULT.learn),
      webllm: !!G.AKSI_WEBLLM,
      flyBrain: !!G.AKSI_FLY_BRAIN,
      flyGate: !!G.AKSI_FLY_GATE,
      receipt: !!G.AKSI_RECEIPT,
      knowledge: !!G.AKSI_KNOWLEDGE
    };
  }
  async function pulse() {
    var m = modules(), ok = 0, total = 0, k;
    for (k in m) { if (!Object.prototype.hasOwnProperty.call(m, k)) continue; total++; if (m[k]) ok++; }
    if (m.flyBrain) setPulse("brainstem", "alive");
    if (m.flyGate || m.decision) setPulse("cortex", "alive");
    if (m.receipt) setPulse("trust", "alive");
    setPulse("sensory", "alive");
    setPulse("lab", m.flyBrain ? "alive" : "idle");
    setPulse("matrix", m.webllm ? "alive" : "idle");
    var out = { version: VER, health: ok, total: total, modules: m, organs: snapshot(), ts: Date.now() };
    emit("heartbeat", out);
    return out;
  }
  function localAnswer(query) {
    var q = String(query || "").toLowerCase();
    if (/организм|organism/.test(q)) return "АКСИ Organism v" + VER + " — нервная система: Cortex→Brainstem(Fly-Gate)→Trust. Ask · Brain · Verify · Contour · MATRIX. aksilove@internet.ru";
    if (/кто ты|who are you|привет/.test(q)) return "Я АКСИ Organism — offline организм решения. Decision · Fly-Gate · Receipt. aksilove@internet.ru";
    if (/формул|formula/.test(q)) return "AKSI = (A × I × S) × (1 + 0.4√n). A — agency, I — integrity, S — structure, n — sealed history.";
    if (/контур|π|\bpi\b|пи\b/.test(q)) return "π-Contour — query → SHA-256 → θ ∈ [0,2π) → seal.";
    if (/мозг|мух|fly|brain/.test(q)) return "Lab: pathway + 4096 LIF + SOTA ~140k. Gate ALLOWED/DEFERRED. /brain.html";
    if (/gate|гейт|veto/.test(q)) return "Fly-Gate: при слабых данных — DEFERRED (честный отказ).";
    if (/статус|status|что умеешь/.test(q)) return "Organism v" + VER + ": Pi · Decision · Zero · Neuro · Fly-Gate · Vault.";
    if (/фишинг/.test(q)) return "Фишинг — мошенничество через поддельные сайты/письма. Проверяйте адрес, не вводите пароли по ссылкам из писем.";
    if (/как пользоваться|help/.test(q)) return "1) Спросите здесь 2) Смотрите decision 3) Brain — наука 4) Verify — Receipt.";
    return "АКСИ Organism v" + VER + ". Спросите: организм, формула, мозг, π, статус. aksilove@internet.ru";
  }
  function applyFlyGate(answer, eqs) {
    if (!G.AKSI_FLY_GATE) return { decision: eqs >= 0.55 ? "ALLOWED" : "DEFERRED", gate_trace: { veto: eqs < 0.55 } };
    var g = G.AKSI_FLY_GATE.evaluate({ confidence: eqs, eqs: eqs, text: answer, policy: "companion", lowEvidence: eqs < 0.5 });
    setPulse("brainstem", g.veto ? "veto" : "pass");
    return { decision: g.decision, gate_trace: G.AKSI_FLY_GATE.toGateTrace ? G.AKSI_FLY_GATE.toGateTrace(g) : { veto: !!g.veto, motif: g.motif } };
  }
  async function think(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { text: "", answer: "", source: "empty" };
    setPulse("cortex", "thinking"); setPulse("sensory", "active");
    if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process && /π|\bpi\b|пи\b|контур/i.test(query)) {
      try { var pr = await G.AKSI_PI_CONTOUR.process(query); if (pr && pr.answer) { setPulse("cortex", "allowed"); return { text: pr.answer, answer: pr.answer, source: "pi-contour", scores: pr.scores, seal: pr.seal }; } } catch (e) {}
    }
    if (G.AKSI_DECISION && typeof G.AKSI_DECISION.decide === "function") {
      try { var d = await Promise.resolve(G.AKSI_DECISION.decide(query)); if (d && d.answer) { setPulse("cortex", "allowed"); return { text: d.answer, answer: d.answer, source: d.source || "decision", scores: d.scores, seal: d.seal, gate: d.gate }; } } catch (e) {}
    }
    if (G.AKSI_ZERO && typeof G.AKSI_ZERO.think === "function") {
      try { var z = await Promise.resolve(G.AKSI_ZERO.think(query)); if (z && (z.answer || z.text)) { setPulse("cortex", "allowed"); return { text: z.answer || z.text, answer: z.answer || z.text, source: "zero", confidence: z.confidence }; } } catch (e) {}
    }
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try { var n = await Promise.resolve(G.AKSI_NEURO.think(query)); if (n && (n.text || n.answer)) { setPulse("cortex", "allowed"); return { text: n.text || n.answer, answer: n.text || n.answer, source: "neuro", score: n.score }; } } catch (e) {}
    }
    var a = localAnswer(query);
    var eqs = /акси|организм|формул|мозг|фишинг|статус|пользоваться/i.test(query) ? 0.88 : 0.42;
    var gate = applyFlyGate(a, eqs);
    setPulse("cortex", gate.decision === "ALLOWED" ? "allowed" : "deferred");
    return { text: a, answer: a, source: "organism-local", eqs: eqs, decision: gate.decision, gate_trace: gate.gate_trace };
  }
  async function decide(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", error: "empty" };
    var t = await think(query, opts);
    var answer = t.answer || t.text || "";
    var eqs = 60;
    if (t.source === "pi-contour") eqs = 80;
    if (t.source === "decision") eqs = 75;
    if (t.source === "zero") eqs = 65;
    if (t.source === "neuro") eqs = 62;
    if (t.source === "organism-local") eqs = Math.round((t.eqs || 0.5) * 100);
    var gate = t.gate_trace ? { ok: !(t.gate_trace.veto), reason: t.gate_trace.motif || "fly" } : (t.gate || { ok: true, reason: "organism-pass" });
    if (t.decision === "DEFERRED") gate = { ok: false, reason: "fly-veto" };
    var receipt = null;
    if (G.AKSI_RECEIPT && gate.ok && typeof G.AKSI_RECEIPT.generateKeyPair === "function") {
      try {
        var kp = await G.AKSI_RECEIPT.generateKeyPair();
        receipt = await G.AKSI_RECEIPT.seal({ query: query, decision: "ALLOWED", final_answer: answer, confidence: eqs / 100, eqs: eqs / 100, mode: "organism", n: 0, sources: [t.source], policy: "companion", gate_trace: t.gate_trace || {} }, kp.privateKey, kp.pubHex);
        setPulse("trust", "sealed");
      } catch (e) {}
    }
    var out = { ok: !!gate.ok, id: "org-" + Date.now().toString(36), answer: answer, anti: "organism · " + (t.source || "local"), source: t.source || "organism", scores: t.scores || { aksi: eqs / 100, eqs: eqs, phi: 0.55, qcli: 0.5 }, gate: gate, seal: t.seal || (receipt ? { kind: "receipt", id: receipt.receipt_id } : { kind: "organism", t: Date.now() }), receipt: receipt, decision: gate.ok ? "ALLOWED" : "DEFERRED", version: VER };
    emit("decision", out);
    return out;
  }
  async function remember(fact) {
    fact = String(fact || "").trim();
    if (!fact) return { ok: false };
    if (!/^запомни\s*[:：]/i.test(fact) && !/^remember\s*[:：]/i.test(fact)) fact = "запомни: " + fact;
    if (G.AKSI_VAULT && typeof G.AKSI_VAULT.learn === "function") { try { return await G.AKSI_VAULT.learn(fact); } catch (e) {} }
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.learn === "function") { try { G.AKSI_NEURO.learn(fact.replace(/^запомни\s*[:：]\s*/i, "")); return { ok: true, source: "neuro" }; } catch (e) {} }
    try {
      var key = "aksi_organism_mem_v1";
      var arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push({ t: Date.now(), text: fact });
      localStorage.setItem(key, JSON.stringify(arr.slice(-100)));
      setPulse("memory", "alive");
      return { ok: true, source: "localStorage", n: arr.length };
    } catch (e) { return { ok: false, error: String(e.message || e) }; }
  }
  G.AKSI_ORGANISM = {
    version: VER, VERSION: VER, ORGANS: ORGANS,
    pulse: pulse, modules: modules, think: think, decide: decide, remember: remember, status: pulse,
    snapshot: snapshot, setPulse: setPulse, on: on, emit: emit,
    manifesto: "АКСИ Organism — ощущает → думает (cascade + Fly-Gate) → отвечает или отказывает → оставляет след."
  };
})(typeof window !== "undefined" ? window : globalThis);
