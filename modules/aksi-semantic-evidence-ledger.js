/*!
 * AKSI Semantic Evidence Ledger v0.1.0
 * Records where a semantic result came from and what its evidence can establish.
 * This is provenance metadata, not an external truth oracle or cryptographic signature.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const SCHEMA = "aksi-semantic-evidence-ledger/1.0";
  const SOURCE = "aksi-semantic-reasoning.js";
  const SOURCE_KIND = "repository_curated_ontology";
  const STATUS_BY_PROOF = {
    definition_lookup: "curated_definition",
    feature_comparison: "derived_from_curated_features",
    ontology_parent_path: "derived_from_curated_parent_links",
    nearest_shared_ancestor: "derived_from_curated_parent_links",
    no_shared_ancestor: "absence_in_current_graph_only",
    graph_path: "derived_from_curated_parent_links",
    no_graph_path: "absence_in_current_graph_only",
    same_concept: "alias_resolution",
    unknown_concept: "unsupported_unknown",
    unknown_relation: "unsupported_unknown"
  };
  function stable(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
  }
  function create(prompt, semantic, engine) {
    if (!semantic || semantic.handled !== true || !engine || typeof engine.answer !== "function") {
      return { ok: false, detail: "Semantic result or reasoning engine is unavailable." };
    }
    const replay = engine.answer(String(prompt == null ? "" : prompt));
    if (!replay || stable(replay) !== stable(semantic)) {
      return { ok: false, detail: "Semantic result differs from deterministic engine replay." };
    }
    const proof = Array.isArray(semantic.proof) ? semantic.proof : [];
    const entries = proof.map((step, index) => {
      const type = step && typeof step.type === "string" ? step.type : "untyped";
      return {
        index,
        proof_type: type,
        epistemic_status: STATUS_BY_PROOF[type] || "unclassified_internal_result",
        source: SOURCE,
        source_kind: SOURCE_KIND,
        source_version: String(engine.version || "unknown")
      };
    });
    return {
      ok: true,
      ledger: {
        schema: SCHEMA,
        version: VERSION,
        prompt: String(prompt == null ? "" : prompt),
        engine_version: String(engine.version || "unknown"),
        result_status: String(semantic.status || "unknown"),
        evidence_count: entries.length,
        evidence: entries,
        limitation: "Записи происходят из встроенного графа AKSI. Это подтверждает происхождение и воспроизводимость внутренних оснований, но не независимую истинность определений или связей."
      }
    };
  }
  function verify(prompt, semantic, ledger, engine) {
    const expected = create(prompt, semantic, engine);
    if (!expected.ok) return { ok: false, status: "replay_failed", detail: expected.detail };
    const matches = stable(expected.ledger) === stable(ledger);
    return {
      ok: matches,
      status: matches ? "ledger_recomputed" : "ledger_mismatch",
      evidence_count: expected.ledger.evidence_count,
      detail: matches ? "Происхождение каждой записи совпало с повторно вычисленным семантическим результатом." : "Реестр происхождения изменён или не соответствует повторному вычислению."
    };
  }
  root.AKSISemanticEvidenceLedger = { version: VERSION, create, verify, stable };
  if (typeof module === "object" && module.exports) module.exports = root.AKSISemanticEvidenceLedger;
})(typeof window !== "undefined" ? window : globalThis);
