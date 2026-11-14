const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("aksi-trust.js", "utf8");

test("Trust randomness control is honestly labelled as a CSPRNG smoke test", () => {
  assert.match(source, /function secureRandomBytes\(n\)/);
  assert.match(source, /crypto\.getRandomValues\(u\)/);
  assert.match(source, /function randomnessSmokeTest\(samples\)/);
  assert.match(source, /adjacent-bit correlation smoke test/);
  assert.match(source, /alg: "CSPRNG-SHA256-v1"/);
  assert.match(source, /id="trRandomness">Тест CSPRNG/);
  assert.doesNotMatch(source, /QRNG|Bell inequality|AKSI-Q-hybrid|bellTest|qrngBytes/);
});

test("randomness smoke test is not described as proof of entropy or quantum origin", () => {
  assert.match(source, /randomnessCheck: randomnessCheck/);
  assert.match(source, /randomnessSmokeTest: randomnessSmokeTest/);
  assert.doesNotMatch(source, /quantum random|quantum entropy|Bell-stat/);
});
