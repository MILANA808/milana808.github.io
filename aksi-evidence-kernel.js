/*!
 * AKSI Evidence Kernel v0.1.0
 * Provenance-aware symbolic claims and bounded, explainable is-a inference.
 * Deterministic component; not a language model or open-domain reasoner.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const KINDS = new Set(["observation", "source", "user_input", "hypothesis", "inference"]);
  const MAX_TEXT = 4096;
  function normalize(value, field) {
    if (typeof value !== "string") throw new TypeError(field + " must be a string");
    const result = value.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!result) throw new TypeError(field + " must not be empty");
    if (result.length > MAX_TEXT) throw new RangeError(field + " exceeds the text limit");
    return result;
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function createEvidenceKernel(options) {
    options = options || {};
    const maxClaims = options.maxClaims === undefined ? 10000 : options.maxClaims;
    const maxInferenceDepth = options.maxInferenceDepth === undefined ? 32 : options.maxInferenceDepth;
    if (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 100000) throw new RangeError("maxClaims must be an integer from 1 to 100000");
    if (!Number.isInteger(maxInferenceDepth) || maxInferenceDepth < 1 || maxInferenceDepth > 256) throw new RangeError("maxInferenceDepth must be an integer from 1 to 256");
    const claims = [];
    const byId = new Map();
    let nextId = 1;
    function addClaim(input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("claim must be an object");
      if (claims.length >= maxClaims) throw new RangeError("claim capacity reached");
      const subject = normalize(input.subject, "subject");
      const predicate = normalize(input.predicate, "predicate");
      const object = normalize(input.object, "object");
      const source = normalize(input.source, "source");
      const truth = input.truth === undefined ? true : input.truth;
      if (typeof truth !== "boolean") throw new TypeError("truth must be Boolean");
      const confidence = input.confidence === undefined ? 1 : input.confidence;
      if (typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RangeError("confidence must be a finite number from 0 to 1");
      const kind = input.kind === undefined ? "source" : input.kind;
      if (!KINDS.has(kind)) throw new TypeError("unsupported claim kind: " + kind);
      const id = input.id === undefined ? "claim-" + nextId++ : normalize(input.id, "id");
      if (byId.has(id)) throw new Error("duplicate claim id: " + id);
      const claim = Object.freeze({ id, subject, predicate, object, truth, confidence, kind, source,
        observedAt: input.observedAt === undefined ? null : normalize(input.observedAt, "observedAt") });
      claims.push(claim); byId.set(id, claim);
      return clone(claim);
    }
    function matches(claim, pattern) {
      return (!pattern.subject || claim.subject === pattern.subject) &&
        (!pattern.predicate || claim.predicate === pattern.predicate) &&
        (!pattern.object || claim.object === pattern.object);
    }
    function findIsAPath(start, target) {
      const queue = [{ node: start, path: [], confidence: 1 }];
      const visited = new Set([start]);
      while (queue.length) {
        const current = queue.shift();
        if (current.path.length >= maxInferenceDepth) continue;
        const edges = claims.filter(c => c.truth && c.predicate === "is_a" && c.subject === current.node);
        for (const edge of edges) {
          const path = current.path.concat(edge.id);
          const confidence = Math.min(current.confidence, edge.confidence);
          if (edge.object === target) return { path, confidence };
          if (!visited.has(edge.object)) { visited.add(edge.object); queue.push({ node: edge.object, path, confidence }); }
        }
      }
      return null;
    }
    function query(input) {
      const pattern = input || {};
      if (!pattern || typeof pattern !== "object" || Array.isArray(pattern)) throw new TypeError("query must be an object");
      const normalized = {};
      for (const field of ["subject", "predicate", "object"]) {
        if (pattern[field] !== undefined && pattern[field] !== null && pattern[field] !== "") normalized[field] = normalize(pattern[field], field);
      }
      const direct = claims.filter(c => matches(c, normalized));
      const inference = [];
      if (normalized.predicate === "is_a" && normalized.subject && normalized.object) {
        const path = findIsAPath(normalized.subject, normalized.object);
        if (path && !direct.some(c => c.truth)) inference.push({
          id: "inference:is_a:" + normalized.subject + ":" + normalized.object,
          subject: normalized.subject, predicate: "is_a", object: normalized.object,
          truth: true, confidence: path.confidence, kind: "inference",
          source: "AKSI Evidence Kernel " + VERSION, premises: path.path
        });
      }
      const positive = direct.some(c => c.truth) || inference.length > 0;
      const negative = direct.some(c => !c.truth);
      const status = positive && negative ? "conflicted" : positive ? "supported" : negative ? "refuted" : "unknown";
      return Object.freeze({ status, claims: clone(direct), inferences: clone(inference), known: status !== "unknown", conflict: status === "conflicted" });
    }
    function explain(input) {
      const result = query(input);
      return {
        status: result.status,
        conclusion: result.status === "supported" ? "supported by recorded claims or an explicit inference rule" :
          result.status === "refuted" ? "a contrary claim is recorded" :
          result.status === "conflicted" ? "both supporting and contrary claims are recorded" :
          "no matching claim or supported inference is recorded",
        evidence: result.claims,
        derivations: result.inferences.map(item => ({ rule: "is_a_transitivity", premises: item.premises,
          conclusion: { subject: item.subject, predicate: item.predicate, object: item.object }, confidence: item.confidence })),
        limitations: [
          "unknown means not recorded; it does not mean false",
          "confidence is copied conservatively as the minimum premise confidence, not a calibrated probability",
          "only transitive is_a inference is implemented",
          "claims are in-memory and are not persisted automatically"
        ]
      };
    }
    function snapshot() {
      return Object.freeze({ schema: "AKSI-EVIDENCE-GRAPH/1", version: VERSION, claims: clone(claims) });
    }
    return Object.freeze({ version: VERSION, addClaim, query, explain, snapshot, get size() { return claims.length; } });
  }
  const api = Object.freeze({ version: VERSION, createEvidenceKernel });
  root.AKSIEvidenceKernel = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
