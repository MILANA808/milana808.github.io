const assert = require("node:assert/strict");
const engine = require("../aksi-semantic-reasoning.js");
const validator = require("../modules/aksi-semantic-proof-validator.js");

const cases = [
  "Что такое математика?",
  "Является ли математика наукой?",
  "Чем отличается математика и логика?",
  "Является ли флуксометр наукой?"
];
for (const prompt of cases) {
  const result = engine.answer(prompt);
  assert.ok(result && result.handled, "fixture must be handled: " + prompt);
  const checked = validator.validate(prompt, result, engine);
  assert.equal(checked.ok, true, prompt);
  assert.equal(checked.status, "recomputed");
}

const original = engine.answer("Является ли математика наукой?");
const forgedText = { ...original, text: "Да, потому что я так решила." };
assert.equal(validator.validate("Является ли математика наукой?", forgedText, engine).status, "proof_mismatch");
const forgedProof = { ...original, proof: [{ type: "invented_proof", claim: "certain" }] };
assert.equal(validator.validate("Является ли математика наукой?", forgedProof, engine).status, "proof_mismatch");
const wrongPrompt = validator.validate("Является ли геометрия разделом математики?", original, engine);
assert.equal(wrongPrompt.ok, false);
assert.equal(wrongPrompt.status, "proof_mismatch");
assert.equal(validator.validate("unknown", original, null).status, "validator_unavailable");
assert.equal(validator.validate("unknown", {}, engine).status, "invalid_result_shape");

console.log("AKSI semantic proof validator tests: OK");
