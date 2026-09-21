/**
 * AKSI Decision Receipt v1.1 — Pilot integration
 * wrapAnswer(answer, {evidence, policy, goal}) → {gate, receipt}
 */
(function (G) {
  "use strict";
  var VERSION = "1.1.0";
  var SCHEMA = "aksi-decision-receipt/v1";

  function now() { return new Date().toISOString(); }
  function uid() {
    return "dr_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function fnv1a(str) {
    var h = 0x811c9dc5;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function classifyStatement(text, hasEvidence) {
    var t = String(text || "").trim();
    if (!t) return "UNGROUNDED";
    if (!hasEvidence) return "UNGROUNDED";
    if (/^(возможно|вероятно|кажется|допустим|предположим|might|maybe|perhaps)/i.test(t))
      return "HYPOTHESIS";
    if (/^(факт:|известно, что|согласно|по данным|according to)/i.test(t)) return "FACT";
    return "CLAIM";
  }

  function build(input) {
    input = input || {};
    var evidence = (input.evidence || []).map(function (e, i) {
      return {
        id: e.id || "ev_" + (i + 1),
        source: e.source || "unknown",
        url: e.url || null,
        snippet: String(e.snippet || e.text || "").slice(0, 500)
      };
    });
    var evIds = {};
    evidence.forEach(function (e) { evIds[e.id] = 1; });
    var statements = input.statements;
    if ((!statements || !statements.length) && input.answer) {
      statements = [{
        text: input.answer,
        based_on: evidence.slice(0, 3).map(function (e) { return e.id; })
      }];
    }
    statements = (statements || []).map(function (s) {
      var based = s.based_on || s.basedOn || [];
      if (!Array.isArray(based)) based = based ? [based] : [];
      var has = based.some(function (id) { return evIds[id]; });
      var cls = s.class || classifyStatement(s.text, has && based.length > 0);
      if (cls !== "UNGROUNDED" && based.length === 0) cls = "UNGROUNDED";
      if (based.length && !has) cls = "UNGROUNDED";
      return { text: String(s.text || "").slice(0, 2000), class: cls, based_on: based };
    });

    var ungrounded = statements.filter(function (s) { return s.class === "UNGROUNDED"; }).length;
    var policy = String(input.policy || "strict").toLowerCase();
    var allowed =
      policy === "lab" ? true :
      policy === "companion" ? ungrounded < statements.length :
      ungrounded === 0 && statements.length > 0;

    var body = {
      schema: SCHEMA,
      version: VERSION,
      id: uid(),
      created_at: now(),
      goal: String(input.goal || "").slice(0, 500),
      policy: policy,
      gate: allowed ? "ALLOW" : "BLOCK",
      agent: input.agent || "AKSI",
      evidence: evidence,
      statements: statements,
      metrics: {
        evidence_count: evidence.length,
        statement_count: statements.length,
        ungrounded_count: ungrounded,
        fact_count: statements.filter(function (s) { return s.class === "FACT"; }).length,
        hypothesis_count: statements.filter(function (s) { return s.class === "HYPOTHESIS"; }).length,
        claim_count: statements.filter(function (s) { return s.class === "CLAIM"; }).length
      },
      human_note: input.human_note || "Квитанция для аудита. Не заменяет юридическую экспертизу."
    };
    var prev = input.previous_hash || "GENESIS";
    var payload = JSON.stringify({
      id: body.id, goal: body.goal, gate: body.gate,
      statements: body.statements, evidence: body.evidence, prev: prev
    });
    var content_hash = fnv1a(payload);
    body.proof = {
      alg: "fnv1a-32",
      previous_hash: prev,
      content_hash: content_hash,
      chain_hash: fnv1a(prev + content_hash),
      note: "integrity ledger for pilot; enterprise may use Ed25519"
    };
    return body;
  }

  function wrapAnswer(answer, options) {
    options = options || {};
    var receipt = build({
      goal: options.goal || "",
      answer: answer,
      evidence: options.evidence || [],
      policy: options.policy || "strict",
      agent: options.agent || "AKSI",
      previous_hash: options.previous_hash || "GENESIS"
    });
    return { ok: true, allowed: receipt.gate === "ALLOW", gate: receipt.gate, receipt: receipt };
  }

  function toAuditText(receipt) {
    var r = receipt;
    var lines = ["AKSI DECISION RECEIPT " + r.id, "gate: " + r.gate + " | policy: " + r.policy, "goal: " + r.goal, "--- EVIDENCE ---"];
    (r.evidence || []).forEach(function (e) {
      lines.push("[" + e.id + "] " + e.source + (e.url ? " " + e.url : ""));
      if (e.snippet) lines.push("  " + e.snippet.slice(0, 200));
    });
    lines.push("--- STATEMENTS ---");
    (r.statements || []).forEach(function (s, i) {
      lines.push(i + 1 + ". [" + s.class + "] " + s.text);
      lines.push("   based_on: " + (s.based_on || []).join(", "));
    });
    lines.push("--- PROOF ---");
    lines.push(JSON.stringify(r.proof));
    return lines.join("\n");
  }

  function demo(scenario) {
    if (scenario === "block") {
      return build({ goal: "Утвердить сумму штрафа без документов", answer: "Штраф составляет ровно 2.4 млн без оснований", evidence: [], policy: "strict" });
    }
    return build({
      goal: "Что такое Decision Receipt",
      evidence: [{ id: "ev_1", source: "AKSI DIP", url: "https://milana808.github.io/dip/", snippet: "Gate ALLOW/BLOCK" }],
      statements: [
        { text: "Decision Receipt — квитанция к ответу ИИ с классом утверждений и evidence.", class: "CLAIM", based_on: ["ev_1"] },
        { text: "В strict без evidence будет BLOCK.", class: "FACT", based_on: ["ev_1"] }
      ]
    });
  }

  function postToApi(baseUrl, body) {
    baseUrl = (baseUrl || "http://127.0.0.1:8787").replace(/\/$/, "");
    return fetch(baseUrl + "/v1/receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  G.AKSI_RECEIPT = {
    VERSION: VERSION,
    SCHEMA: SCHEMA,
    build: build,
    wrapAnswer: wrapAnswer,
    toAuditText: toAuditText,
    demo: demo,
    classifyStatement: classifyStatement,
    postToApi: postToApi
  };
})(typeof window !== "undefined" ? window : globalThis);
