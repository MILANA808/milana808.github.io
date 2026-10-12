const assert = require("node:assert/strict");
const { AKSIWaveBayesianEngine, featureVector } = require("../aksi-wave-bayesian-engine.js");

const engine = new AKSIWaveBayesianEngine();

const greeting = engine.analyze("привет");
assert.equal(greeting.accepted, true, JSON.stringify(greeting));
assert.equal(greeting.intent, "greeting");

const math = engine.analyze("посчитай математический пример");
assert.equal(math.intent, "math", JSON.stringify(math));

const code = engine.analyze("помоги исправить ошибку в javascript коде");
assert.equal(code.intent, "code", JSON.stringify(code));

const empty = engine.analyze("   ");
assert.equal(empty.accepted, false);
assert.equal(empty.reason, "empty_input");

const unknown = engine.analyze("кварцевый фиолетовый горизонтальный предмет");
assert.equal(unknown.accepted, false, JSON.stringify(unknown));

const v1 = featureVector("привет акси", 64);
const v2 = featureVector("привет акси", 64);
assert.deepEqual(v1, v2, "feature encoding must be deterministic");
assert.ok(Math.abs(Math.sqrt(v1.reduce((s, x) => s + x * x, 0)) - 1) < 1e-9, "non-empty vectors should be normalized");

for (const result of [greeting, math, code]) {
  const sum = result.posterior.reduce((s, item) => s + item.posterior, 0);
  assert.ok(Math.abs(sum - 1) < 1e-5, "posterior values should sum to 1");
}

console.log("AKSI Wave-Bayesian Engine: all tests passed.");
