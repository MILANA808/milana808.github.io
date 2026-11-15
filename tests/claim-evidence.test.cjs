const assert = require("node:assert/strict");
const api = require("../modules/claim-evidence.js");

const claim = { id: "c1", text: "Вода замерзает при 0 °C при стандартном давлении." };
const source = {
  title: "Reference",
  url: "https://example.org/reference",
  retrievedAt: "2026-11-16T00:00:00.000Z",
  passage: "При стандартном атмосферном давлении чистая вода замерзает при 0 °C.",
  quote: "чистая вода замерзает при 0 °C",
  reviewedBy: "reviewer-1",
  reviewedAt: "2026-11-16T00:01:00.000Z",
  relation: "supports"
};

const candidates = api.prepareCandidates(claim, [{ title: "Reference", url: "https://example.org/reference", provider: "test", text: source.passage }]);
assert.equal(candidates.status, "insufficient");
assert.equal(candidates.candidates[0].review_status, "not_reviewed");
assert.equal(candidates.candidates[0].retrieval, "unverified");
assert.equal(candidates.schema, "aksi-claim-evidence-candidates/1.1");
assert.equal(candidates.candidates[0].lexical_screen.label, "candidate_relevant");
assert.equal(candidates.candidates[0].lexical_screen.is_probability, false);
assert.equal(candidates.candidates[0].lexical_screen.is_entailment_check, false);
assert.equal(candidates.candidates[0].lexical_screen.method, "normalized-token-overlap-v1");
assert.ok(candidates.candidates[0].lexical_screen.matched_terms.includes("вода"));
assert.match(candidates.reason, /ещё не проверены/);
assert.throws(() => api.prepareCandidates(claim, [{ url: "javascript:alert(1)", text: "x" }]), /HTTP/);
assert.throws(() => api.prepareCandidates(claim, [{ url: "https://", text: "x" }]), /HTTP/);
assert.throws(() => api.assess(claim, [{ ...source, url: "https://user:pass@example.org/" }]), /HTTP/);
const unrelated = api.prepareCandidates(claim, [{ title: "Unrelated", url: "https://example.org/unrelated", text: "Сегодня в городе открылся новый музей современного искусства." }]);
assert.equal(unrelated.candidates[0].lexical_screen.label, "low_overlap");
assert.equal(unrelated.status, "insufficient", "lexical overlap must never upgrade evidence status");
assert.equal(api.lexicalTokens("Ёлка и вода").includes("елка"), true);

const supported = api.assess(claim, [source]);
assert.equal(supported.status, "supported");
assert.equal(supported.evidence[0].claim_id, "c1");
assert.equal(supported.evidence[0].quote, source.quote);

const mixed = api.assess(claim, [
  source,
  { ...source, url: "https://example.org/other", relation: "contradicts", quote: "При стандартном атмосферном давлении чистая вода замерзает при 0 °C." }
]);
assert.equal(mixed.status, "mixed");
assert.equal(api.assess(claim, []).status, "insufficient");
assert.equal(api.assess(claim, [{ ...source, relation: "unclear" }]).status, "insufficient");
assert.equal(api.assess(claim, [{ ...source, relation: "contradicts" }]).status, "contradicted");
assert.throws(() => api.assess(claim, [{ ...source, quote: "несуществующая цитата" }]), /дословно/);
assert.throws(() => api.assess(claim, [{ ...source, reviewedBy: "" }]), /ручной проверки/);
assert.throws(() => api.assess(claim, [{ ...source, url: "javascript:alert(1)" }]), /HTTP/);
assert.throws(() => api.assess({ id: "", text: "x" }, []), /id и text/);

console.log("AKSI claim evidence tests: OK");
