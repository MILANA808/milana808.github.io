const assert = require("node:assert/strict");
const engine = require("../aksi-semantic-reasoning.js");
const ledgerApi = require("../modules/aksi-semantic-evidence-ledger.js");

const prompt = "Что такое математика?";
const semantic = engine.answer(prompt);
const created = ledgerApi.create(prompt, semantic, engine);
assert.equal(created.ok, true);
assert.equal(created.ledger.schema, "aksi-semantic-evidence-ledger/1.0");
assert.equal(created.ledger.evidence_count, 1);
assert.equal(created.ledger.evidence[0].epistemic_status, "curated_definition");
assert.equal(created.ledger.evidence[0].source, "aksi-semantic-reasoning.js");
assert.equal(ledgerApi.verify(prompt, semantic, created.ledger, engine).ok, true);

const tampered = JSON.parse(JSON.stringify(created.ledger));
tampered.evidence[0].source = "external-peer-reviewed-source";
const rejected = ledgerApi.verify(prompt, semantic, tampered, engine);
assert.equal(rejected.ok, false);
assert.equal(rejected.status, "ledger_mismatch");

const unsupportedPrompt = "Что такое флуксометр?";
const unsupported = engine.answer(unsupportedPrompt);
const unknownLedger = ledgerApi.create(unsupportedPrompt, unsupported, engine);
assert.equal(unknownLedger.ok, true);
assert.equal(unknownLedger.ledger.evidence_count, 0);
assert.equal(unknownLedger.ledger.result_status, "unknown_concept");

const comparisonPrompt = "Сравни математику с физикой";
const comparison = engine.answer(comparisonPrompt);
const comparisonLedger = ledgerApi.create(comparisonPrompt, comparison, engine);
assert.equal(comparisonLedger.ledger.evidence[0].epistemic_status, "derived_from_curated_features");

const wrongPrompt = ledgerApi.verify("Что такое физика?", semantic, created.ledger, engine);
assert.equal(wrongPrompt.ok, false);
console.log("AKSI semantic evidence ledger tests: OK");
