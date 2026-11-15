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
