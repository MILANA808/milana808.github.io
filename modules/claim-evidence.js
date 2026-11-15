/**
 * AKSI Claim Evidence — conservative, replayable evidence assessment.
 * This module never infers truth from retrieval scores or source existence.
 * A passage counts only after a reviewer records an exact quotation and relation.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIClaimEvidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.0.0";
  const RELATIONS = new Set(["supports", "contradicts", "unclear"]);

  function clean(value, limit) {
    return String(value == null ? "" : value).trim().slice(0, limit);
  }

  function validateClaim(claim) {
    if (!claim || typeof claim !== "object") throw new TypeError("Требуется объект утверждения.");
    const id = clean(claim.id, 120);
    const text = clean(claim.text, 4000);
    if (!id || !text) throw new TypeError("У утверждения должны быть id и text.");
    return { id, text };
  }

  function validateAssessment(item, claimId) {
    if (!item || typeof item !== "object") throw new TypeError("Оценка основания должна быть объектом.");
    const relation = clean(item.relation, 20);
    if (!RELATIONS.has(relation)) throw new TypeError("Недопустимая связь основания: " + relation);
    const passage = clean(item.passage, 12000);
    const quote = clean(item.quote, 2000);
    const url = clean(item.url, 2000);
    const title = clean(item.title, 300);
    const reviewer = clean(item.reviewedBy, 200);
    const reviewedAt = clean(item.reviewedAt, 80);
    if (!passage || !quote || !passage.includes(quote)) {
      throw new TypeError("Цитата должна дословно присутствовать в сохранённом фрагменте.");
    }
    if (!url || !/^https?:\/\//i.test(url)) throw new TypeError("Требуется HTTP(S)-ссылка на источник.");
    if (!reviewer || !Number.isFinite(Date.parse(reviewedAt))) {
      throw new TypeError("Требуются reviewer и корректная дата ручной проверки.");
    }
    return {
      claim_id: claimId,
      relation,
      source: { title, url, retrieved_at: item.retrievedAt ? clean(item.retrievedAt, 80) : null },
      passage,
      quote,
      review: { reviewer, reviewed_at: new Date(reviewedAt).toISOString() }
    };
  }

  function prepareCandidates(claimInput, retrievedInput) {
    const claim = validateClaim(claimInput);
    if (!Array.isArray(retrievedInput)) throw new TypeError("Найденные материалы должны быть массивом.");
    const candidates = retrievedInput.slice(0, 8).map((item, index) => {
      if (!item || typeof item !== "object") throw new TypeError("Материал источника должен быть объектом.");
      const url = clean(item.url, 2000);
      if (!url || !/^https?:\/\//i.test(url)) throw new TypeError("У материала должна быть HTTP(S)-ссылка.");
      const passage = clean(item.text || item.snippet || item.summary, 4000);
      return {
        candidate_id: claim.id + "-source-" + (index + 1),
        claim_id: claim.id,
        source: { title: clean(item.title, 300), url, provider: clean(item.provider, 80) || null },
        passage,
        retrieval: "unverified",
        review_status: "not_reviewed"
      };
    }).filter(item => item.passage);
    return {
      schema: "aksi-claim-evidence-candidates/1.0",
      claim,
      status: "insufficient",
      reason: "Найденные фрагменты ещё не проверены на логическую связь с утверждением.",
      candidates,
      limitations: [
        "Поисковая релевантность и наличие ссылки не подтверждают истинность.",
        "Автоматическое выделение атомарных утверждений и проверка соответствия фрагментов пока не реализованы.",
        "Для статуса supported/contradicted/mixed требуется отдельная проверка точной цитаты."
      ]
    };
  }

  function assess(claimInput, evidenceInput) {
    const claim = validateClaim(claimInput);
    if (!Array.isArray(evidenceInput)) throw new TypeError("Основания должны быть массивом.");
    const evidence = evidenceInput.slice(0, 30).map(item => validateAssessment(item, claim.id));
    const hasSupport = evidence.some(item => item.relation === "supports");
    const hasContradiction = evidence.some(item => item.relation === "contradicts");
    let status = "insufficient";
    if (hasSupport && hasContradiction) status = "mixed";
    else if (hasSupport) status = "supported";
    else if (hasContradiction) status = "contradicted";
    return {
      schema: "aksi-claim-evidence/1.0",
      version: VERSION,
      claim,
      status,
      assessment_basis: "human-reviewed exact quotations; retrieval rank is not treated as truth",
      evidence,
      limitations: [
        "This status summarizes recorded reviewer assessments, not objective proof of truth.",
        "A source may be incomplete, outdated, mistaken or misinterpreted.",
        "No evidence means insufficient, not false."
      ]
    };
  }

  return { version: VERSION, assess, prepareCandidates, validateClaim };
});
