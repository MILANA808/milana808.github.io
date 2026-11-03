const assert = require("node:assert/strict");
const { webcrypto } = require("node:crypto");
globalThis.crypto = webcrypto;
const passportApi = require("../modules/evidence-passport.js");

(async () => {
  const passport = await passportApi.create({
    request: "2 + 2",
    answer: "4",
    provider: "AKSI deterministic calculator",
    model: null,
    sources: [],
    trace: [{ sequence: 7, type: "answer", generator: "semantic-core", evidenceStatus: "unverified", receiptHash: "abc123", at: "2026-11-04T00:00:00.000Z" }],
  });
  assert.equal(passport.schema, "aksi-evidence-passport/1.0");
  assert.equal(passport.reasoning.included, false);
  assert.equal(passport.observed_steps[0].sequence, 7);
  assert.equal(passport.observed_steps[0].receipt_hash, "abc123");
  assert.equal((await passportApi.verify(passport)).valid, true);
  const altered = { ...passport, answer: "5" };
  assert.equal((await passportApi.verify(altered)).valid, false);
  console.log("AKSI Evidence Passport tests: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
