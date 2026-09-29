/**
 * AKSI Authority Runtime v2.1.0-mandate
 * GOAL→…→PROOF with optional AKSI_MANDATE ECDSA receipt
 * Contact: aksilove@internet.ru · not AGI
 */
(function (G) {
  "use strict";
  var VER = "2.1.0-mandate";
  var PROTOCOL = "AKSI-AUTHORITY/2";
  var STORE = "aksi_authority_reports_v2";
  var IDENTITY = "АКСИ";
  function now() { return new Date().toISOString(); }
  function uid() { return "ar2_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8); }
  function enc(s) { return new TextEncoder().encode(String(s)); }
  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function sha256(s) {
    if (G.crypto && G.crypto.subtle) {
      var d = await G.crypto.subtle.digest("SHA-256", enc(s));
      return toHex(d);
    }
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function canon(o) {
    if (o === null || typeof o !== "object") return JSON.stringify(o);
    if (Array.isArray(o)) return "[" + o.map(canon).join(",") + "]";
    var ks = Object.keys(o).filter(function (k) { return o[k] !== undefined; }).sort();
    return "{" + ks.map(function (k) { return JSON.stringify(k) + ":" + canon(o[k]); }).join(",") + "}";
  }
  function loadReports() {
    try { return JSON.parse(G.localStorage.getItem(STORE) || "[]"); } catch (e) { return []; }
  }
  function saveReport(rep) {
    try {
      var all = loadReports();
      all.unshift(rep);
      if (all.length > 40) all = all.slice(0, 40);
      G.localStorage.setItem(STORE, JSON.stringify(all));
    } catch (e) {}
  }
  function plan(goal) {
    var g = String(goal || "").trim();
    var kind = "general";
    if (/запомн|remember|сохрани|выучи/i.test(g)) kind = "memory";
    else if (/исслед|research|найди|сравни|изучи/i.test(g)) kind = "research";
    else if (/можно ли|разреш|реши|decide|permit|отправ|вызов|действу/i.test(g)) kind = "action";
    else if (/кто ты|что ты|что такое акси|who are you/i.test(g)) kind = "identity";
    return { kind: kind, steps: ["PLAN", "RESEARCH", "ALGO_AKSI", "QUANTUM", "GATE", "REPORT"], goal: g, engine: "algorithmic+quantum", no_llm: true, ts: now() };
  }
  function hitText(h) {
    if (typeof h === "string") return h.slice(0, 400);
    if (!h) return "";
    if (h.fact) return String(h.fact).slice(0, 400);
    if (h.text) return String(h.text).slice(0, 400);
    if (h.answer) return String(h.answer).slice(0, 400);
    return JSON.stringify(h).slice(0, 400);
  }
  function research(goal) {
    var evidence = [], memoryHits = [], epistemeHits = [];
    if (G.AKSI_CLM && typeof G.AKSI_CLM.lookup === "function") {
      try {
        var lr = G.AKSI_CLM.lookup(goal);
        if (lr && lr.items) memoryHits = lr.items;
        else if (Array.isArray(lr)) memoryHits = lr;
        else if (lr) memoryHits = [lr];
      } catch (e) {}
    }
    if (G.AKSI_EPISTEME && typeof G.AKSI_EPISTEME.ask === "function") {
      try {
        var er = G.AKSI_EPISTEME.ask(goal);
        if (er) epistemeHits = Array.isArray(er) ? er : [er];
      } catch (e) {}
    }
    memoryHits.forEach(function (h, i) {
      evidence.push({ title: "CLM#" + i, url: "local://clm", text: hitText(h), source: "clm", tier: (h && h.tier) || null });
    });
    epistemeHits.forEach(function (h, i) {
      evidence.push({ title: "Episteme#" + i, url: "local://episteme", text: hitText(h), source: "episteme" });
    });
    return { evidence: evidence, memoryHits: memoryHits, epistemeHits: epistemeHits, offline: true, ts: now() };
  }
  function algorithmicAnswer(goal, planObj, researchObj) {
    var g = String(goal || "").trim();
    var parts = [], origin = "template", score = 0.4;
    if (planObj.kind === "identity" || /кто ты|что ты|who are you|что такое акси/i.test(g)) {
      return { text: "Я АКСИ — локальный Authority Runtime. Алгоритмы + gate ALLOW/BLOCK + Mandate ECDSA. Не облачная LLM. Contact: aksilove@internet.ru", origin: "identity", score: 0.95, speaker: IDENTITY };
    }
    if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
      try {
        var nr = G.AKSI_NEURO.think(g);
        if (nr && nr.text && String(nr.text).length > 8) {
          parts.push(String(nr.text).trim());
          origin = "neuro-seed";
          score = Math.max(score, typeof nr.score === "number" ? nr.score : 0.55);
        }
      } catch (e) {}
    }
    var sealed = (researchObj.memoryHits || []).filter(function (h) { return h && (h.tier === "sealed" || h.tier === "provisional"); });
    if (sealed.length) {
      parts.push("Из памяти (CLM): " + hitText(sealed[0]));
      origin = origin === "neuro-seed" ? "neuro+clm" : "clm";
      score = Math.max(score, sealed[0].tier === "sealed" ? 0.8 : 0.6);
    }
    if (researchObj.epistemeHits && researchObj.epistemeHits.length) {
      parts.push("Episteme: " + hitText(researchObj.epistemeHits[0]));
      score = Math.max(score, 0.58);
    }
    if (planObj.kind === "memory") {
      var fact = g.replace(/^(запомни|remember|сохрани|выучи)\s*:?\s*/i, "").trim() || g;
      return { text: "Я АКСИ. Приму факт в CLM: «" + fact.slice(0, 200) + "».", origin: "memory-intent", score: 0.7, speaker: IDENTITY, factToSeal: fact };
    }
    if (planObj.kind === "action") {
      var hasStrong = sealed.length > 0 || score >= 0.7;
      return { text: hasStrong ? "Я АКСИ. Есть evidence. Действие только при ALLOW + Permit." : "Я АКСИ. Для действия нужны факты — вероятен BLOCK.", origin: "action-policy", score: hasStrong ? 0.65 : 0.35, speaker: IDENTITY };
    }
    if (parts.length) return { text: "Я АКСИ. " + parts.join(" · "), origin: origin, score: score, speaker: IDENTITY };
    return { text: "Я АКСИ. Локальных фактов мало. Могу запомнить («запомни: …») или отказать в действии. Не генеративная модель.", origin: "gap-honest", score: 0.25, speaker: IDENTITY };
  }
  function quantumGate(goal, answer) {
    if (G.AKSI_QUANTUM && typeof G.AKSI_QUANTUM.answerGate === "function") {
      try { return G.AKSI_QUANTUM.answerGate(goal, answer); } catch (e) { return { error: String(e), backend: "failed" }; }
    }
    var h = 0, t = String(goal) + "|" + String(answer);
    for (var i = 0; i < t.length; i++) h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
    var qcli = 0.35 + (Math.abs(h) % 50) / 100;
    return { version: "surrogate", backend: "hash-surrogate", QCLI: +qcli.toFixed(3), qcli: +qcli.toFixed(3), band: qcli >= 0.72 ? "high" : qcli >= 0.45 ? "mid" : "low" };
  }
  function decide(goal, planObj, algo, qx, researchObj) {
    var gate = "ALLOW", reason = "aksi-algorithmic";
    var conf = typeof algo.score === "number" ? algo.score : 0.4;
    var qcli = (qx && (qx.QCLI || qx.qcli)) || 0.4;
    var eqs = Math.min(1, 0.5 * conf + 0.5 * qcli);
    var lowEv = !(researchObj.evidence && researchObj.evidence.length);
    var text = algo.text || "";
    if (G.AKSI_FLY_GATE && typeof G.AKSI_FLY_GATE.evaluate === "function") {
      try {
        var fg = G.AKSI_FLY_GATE.evaluate({ confidence: conf, eqs: eqs, policy: planObj.kind === "action" ? "strict" : "companion", lowEvidence: lowEv, text: text });
        if (fg && (fg.veto || fg.decision === "DEFERRED")) { gate = "BLOCK"; reason = "fly-gate:" + (fg.reason || "veto"); }
      } catch (e) {}
    }
    if (planObj.kind === "action" && (lowEv || conf < 0.55 || qcli < 0.4)) { gate = "BLOCK"; reason = "action-default-deny-weak-evidence"; }
    if (algo.origin === "gap-honest" && planObj.kind === "action") { gate = "BLOCK"; reason = "gap-cannot-authorize-action"; }
    if (qx && qx.band === "low" && planObj.kind === "action") { gate = "BLOCK"; reason = "quantum-band-low-action"; }
    return { gate: gate, reason: reason, conf: +conf.toFixed(3), qcli: +qcli.toFixed(3), eqs: +eqs.toFixed(3), policy: planObj.kind === "action" ? "strict" : "companion", speaker: IDENTITY, ts: now() };
  }
  async function issuePermit(goal, decision, algo) {
    var id = uid();
    var body = {
      protocol: PROTOCOL, id: id, type: decision.gate === "ALLOW" ? "PERMIT" : "BLOCK_PROOF",
      goal: goal, gate: decision.gate, reason: decision.reason, speaker: IDENTITY, origin: algo.origin, qcli: decision.qcli,
      not_before: now(), not_after: new Date(Date.now() + 3600 * 1000).toISOString(),
      scope: decision.gate === "ALLOW" ? ["memory", "export", "ui"] : [], action: decision.gate === "ALLOW" ? "report_memory_export" : "none"
    };
    body.hash = await sha256(canon(body));
    return body;
  }
  async function memoryWrite(algo, permit) {
    if (permit.gate !== "ALLOW") return { skipped: true, reason: permit.reason };
    var fact = algo.factToSeal || algo.text;
    if (G.AKSI_CLM && typeof G.AKSI_CLM.seal === "function") {
      try { return G.AKSI_CLM.seal(String(fact).slice(0, 500), {}); } catch (e) { return { error: String(e) }; }
    }
    return { local_note: String(fact).slice(0, 200) };
  }
  async function proof(goal, answer, researchObj, decision, permit, qx) {
    var bond = null;
    if (G.AKSI_BOND && typeof G.AKSI_BOND.createBond === "function") {
      try {
        if (typeof G.AKSI_BOND.registerEvidence === "function" && researchObj.evidence) await G.AKSI_BOND.registerEvidence(researchObj.evidence);
        bond = await G.AKSI_BOND.createBond({ query: goal, answer: answer, gate: decision.gate, source: "authority-v2" });
      } catch (e) { bond = { error: String(e) }; }
    }
    var receipt = {
      protocol: PROTOCOL, speaker: IDENTITY, goal: goal, answer_hash: await sha256(String(answer || "")),
      gate: decision.gate, reason: decision.reason, permit_id: permit.id, permit_type: permit.type,
      qcli: decision.qcli, quantum_backend: (qx && qx.backend) || null, evidence_count: (researchObj.evidence || []).length, no_llm: true, ts: now()
    };
    receipt.integrity = await sha256(canon(receipt));
    var mandate = null;
    if (G.AKSI_MANDATE && typeof G.AKSI_MANDATE.create === "function") {
      try {
        var ev = (researchObj.evidence || []).map(function (e, i) {
          return { id: e.id || "ev_" + (i + 1), source: e.source || "authority", tier: e.tier || "ok", snippet: String(e.text || e.snippet || "").slice(0, 400) };
        });
        if (decision.gate === "ALLOW" && !ev.length) {
          ev = [{ id: "ev_algo", source: "authority-algo", tier: "ok", snippet: "algorithmic path ALLOW" }];
        }
        var mres = await G.AKSI_MANDATE.create({
          goal: goal, action: goal, answer: answer,
          policy: decision.gate === "ALLOW" ? "companion" : "strict",
          evidence: decision.gate === "ALLOW" ? ev : []
        });
        mandate = {
          gate: mres.gate, allowed: mres.allowed,
          receipt_id: mres.receipt && mres.receipt.id,
          payload_hash: mres.receipt && mres.receipt.payload_hash,
          alg: mres.receipt && mres.receipt.alg,
          signature: mres.receipt && mres.receipt.signature,
          publicJwk: mres.receipt && mres.receipt.publicJwk,
          reasons: mres.receipt && mres.receipt.reasons
        };
      } catch (e) { mandate = { error: String(e && e.message || e) }; }
    }
    return { bond: bond, receipt: receipt, mandate: mandate };
  }
  async function run(goal, opts) {
    opts = opts || {};
    var trace = [];
    function step(name, data) { trace.push({ step: name, ts: now(), data: data }); }
    var g = String(goal || "").trim();
    if (!g) return { ok: false, error: "empty_goal" };
    var planObj = plan(g);
    step("PLAN", { kind: planObj.kind, no_llm: true });
    var researchObj = research(g);
    step("RESEARCH", { evidence: researchObj.evidence.length });
    var algo = algorithmicAnswer(g, planObj, researchObj);
    step("ALGO_ANSWER_AKSI", { origin: algo.origin, score: algo.score, preview: String(algo.text).slice(0, 160) });
    var qx = quantumGate(g, algo.text);
    step("QUANTUM_ANSWER_GATE", { backend: qx.backend, QCLI: qx.QCLI || qx.qcli, band: qx.band });
    var answer = algo.text;
    if (qx && qx.QCLI != null) answer += "\n[Q" + qx.QCLI + " · " + (qx.band || "") + " · " + (qx.backend || "sim") + "]";
    var decision = decide(g, planObj, algo, qx, researchObj);
    step("DECISION", decision);
    var permit = await issuePermit(g, decision, algo);
    step(permit.type, { id: permit.id, hash: permit.hash });
    var mem = await memoryWrite(algo, permit);
    step("MEMORY", mem);
    var pr = await proof(g, answer, researchObj, decision, permit, qx);
    step("PROOF", { integrity: pr.receipt.integrity, mandate: pr.mandate && pr.mandate.alg });
    var report = {
      ok: true, protocol: PROTOCOL, version: VER, id: uid(), speaker: IDENTITY, no_llm: true, goal: g, plan: planObj,
      research: { evidence_count: researchObj.evidence.length, offline: true },
      algorithmic: { origin: algo.origin, score: algo.score },
      quantum: { backend: qx.backend, QCLI: qx.QCLI || qx.qcli, band: qx.band },
      decision: decision, permit: permit, answer: answer, memory: mem, proof: pr, trace: trace, ts: now(),
      contact: "aksilove@internet.ru", principle: "technology_serves_human"
    };
    report.report_hash = await sha256(canon(report));
    saveReport(report);
    step("REPORT", { report_hash: report.report_hash });
    return report;
  }
  function status() {
    return {
      version: VER, protocol: PROTOCOL, speaker: IDENTITY, no_llm: true,
      hasCLM: !!(G.AKSI_CLM && G.AKSI_CLM.lookup),
      hasEpisteme: !!(G.AKSI_EPISTEME && G.AKSI_EPISTEME.ask),
      hasNeuro: !!(G.AKSI_NEURO && G.AKSI_NEURO.think),
      hasQuantum: !!(G.AKSI_QUANTUM && G.AKSI_QUANTUM.answerGate),
      hasBond: !!(G.AKSI_BOND && G.AKSI_BOND.createBond),
      hasMandate: !!(G.AKSI_MANDATE && G.AKSI_MANDATE.create),
      hasFlyGate: !!(G.AKSI_FLY_GATE && G.AKSI_FLY_GATE.evaluate),
      hasADIA: !!(G.AKSI_ALGORITHM && G.AKSI_ALGORITHM.process),
      reports: loadReports().length
    };
  }
  G.AKSI_AUTHORITY = { version: VER, protocol: PROTOCOL, speaker: IDENTITY, run: run, plan: plan, status: status, listReports: loadReports };
  if (typeof module !== "undefined" && module.exports) module.exports = G.AKSI_AUTHORITY;
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
