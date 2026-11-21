/*!
 * AKSI Language-to-Claim Bridge v0.1.0
 * A deliberately small Russian grammar that converts explicit copular statements
 * into provenance-tagged claims. It abstains on unsupported or ambiguous language.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const MAX_INPUT = 512;

  function cleanTerm(value) {
    const term = String(value || "").normalize("NFKC").trim().replace(/\\s+/g, " ");
    if (!term || term.length > 120 || /[.!?;,:]/.test(term)) return null;
    if (!/^[\\p{L}\\p{N}][\\p{L}\\p{N} _-]*$/u.test(term)) return null;
    return term;
  }

  function parse(text) {
    if (typeof text !== "string") return { recognized: false, reason: "input_must_be_text" };
    const input = text.normalize("NFKC").trim();
    if (!input) return { recognized: false, reason: "empty_input" };
    if (input.length > MAX_INPUT) return { recognized: false, reason: "input_too_long" };

    let body = input.replace(/[.!?]+$/g, "").trim();
    let kind = "user_input";
    let isHypothesis = false;
    const hypothesisPrefix = /^(?:гипотеза|предположение)\\s*:\\s*/i;
    const hedgePrefix = /^(?:возможно|вероятно|предположительно)\\s*,?\\s+/i;
    if (hypothesisPrefix.test(body)) {
      body = body.replace(hypothesisPrefix, "");
      kind = "hypothesis";
      isHypothesis = true;
    } else if (hedgePrefix.test(body)) {
      body = body.replace(hedgePrefix, "");
      kind = "hypothesis";
      isHypothesis = true;
    }

    // Questions and compound sentences are intentionally outside this grammar.
    if (/^(?:является ли|правда ли|верно ли|может ли)\\b/i.test(body) || /[;,:]/.test(body)) {
      return { recognized: false, reason: "question_or_compound_statement" };
    }

    const match = body.match(/^(.+?)\\s+(не\\s+является|является|[-—–]\\s*это|это)\\s+(.+)$/i);
    if (!match) return { recognized: false, reason: "unsupported_sentence_pattern" };
    const subject = cleanTerm(match[1]);
    const relation = match[2].toLowerCase().replace(/\\s+/g, " ");
    const object = cleanTerm(match[3]);
    if (!subject || !object || subject.toLowerCase() === object.toLowerCase()) {
      return { recognized: false, reason: "ambiguous_or_invalid_terms" };
    }

    const truth = relation !== "не является";
    return {
      recognized: true,
      version: VERSION,
      claim: {
        subject,
        predicate: "is_a",
        object,
        truth,
        kind,
        source: "user input via AKSI language bridge"
      },
      classification: isHypothesis ? "hypothesis" : truth ? "assertion" : "negated_assertion",
      requiresReview: isHypothesis,
      explanation: isHypothesis
        ? "Распознано предположение. Оно не записано как подтверждённое знание."
        : "Распознано явное утверждение пользователя; происхождение сохранено как пользовательский ввод."
    };
  }

  function createBridge(kernel) {
    if (!kernel || typeof kernel.addClaim !== "function" || typeof kernel.query !== "function") {
      throw new TypeError("an Evidence Kernel instance is required");
    }
    function ingest(text) {
      const parsed = parse(text);
      if (!parsed.recognized) return { accepted: false, parsed };
      if (parsed.requiresReview) {
        return { accepted: false, requiresReview: true, parsed,
          reason: "hypotheses_are_not_promoted_to_evidence_automatically" };
      }
      const stored = kernel.addClaim(parsed.claim);
      return { accepted: true, parsed, stored, kernelSize: kernel.size };
    }
    return Object.freeze({ version: VERSION, parse, ingest });
  }

  const api = Object.freeze({ version: VERSION, parse, createBridge });
  root.AKSILanguageClaimBridge = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
