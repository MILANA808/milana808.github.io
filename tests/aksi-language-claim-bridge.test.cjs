const assert = require("node:assert/strict");
const bridgeModule = require("../aksi-language-claim-bridge.js");
const evidence = require("../aksi-evidence-kernel.js");

const parsed = bridgeModule.parse("Кошка — это животное.");
assert.equal(parsed.recognized, true);
assert.equal(parsed.claim.subject, "Кошка");
assert.equal(parsed.claim.predicate, "is_a");
assert.equal(parsed.claim.object, "животное");
assert.equal(parsed.claim.truth, true);
assert.equal(parsed.claim.kind, "user_input");

const negative = bridgeModule.parse("Кошка не является рептилией");
assert.equal(negative.recognized, true);
assert.equal(negative.claim.truth, false);
assert.equal(negative.classification, "negated_assertion");

const hypothesis = bridgeModule.parse("Гипотеза: кошка — это млекопитающее");
assert.equal(hypothesis.recognized, true);
assert.equal(hypothesis.requiresReview, true);
assert.equal(hypothesis.claim.kind, "hypothesis");

for (const phrase of [
  "Привет!",
  "Является ли кошка животным?",
  "Кошка, возможно, животное",
  "Кошка — это животное, потому что она млекопитающее",
  "",
  "x".repeat(513)
]) {
  assert.equal(bridgeModule.parse(phrase).recognized, false, phrase.slice(0, 30));
}

const kernel = evidence.createEvidenceKernel();
const bridge = bridgeModule.createBridge(kernel);
const accepted = bridge.ingest("Кошка — это животное.");
assert.equal(accepted.accepted, true);
assert.equal(accepted.stored.source, "user input via AKSI language bridge");
assert.equal(kernel.query({subject:"Кошка",predicate:"is_a",object:"животное"}).status, "supported");

const rejectedHypothesis = bridge.ingest("Возможно, кошка — это млекопитающее.");
assert.equal(rejectedHypothesis.accepted, false);
assert.equal(rejectedHypothesis.requiresReview, true);
assert.equal(kernel.size, 1, "hypotheses must not silently enter the evidence store");

const unknown = bridge.ingest("Утверждение без известной структуры");
assert.equal(unknown.accepted, false);
assert.equal(kernel.size, 1);
console.log("AKSI language claim bridge tests: OK");
