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
  });
  assert.equal(passport.schema, "aksi-evidence-passport/1.0");
  assert.equal(passport.reasoning.included, false);
  assert.equal((await passportApi.verify(passport)).valid, true);
  const altered = { ...passport, answer: "5" };
  assert.equal((await passportApi.verify(altered)).valid, false);
  console.log("AKSI Evidence Passport tests: OK");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
