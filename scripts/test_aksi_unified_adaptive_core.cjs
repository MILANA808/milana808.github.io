const assert = require("node:assert/strict");
const store = new Map();
global.window = {
  localStorage: {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  AKSI_WEBLLM: {
    ready: () => true,
    complete: async (q, options) => ({ text: "Тестовый ответ на: " + q, source: "webllm", model: "test-model", systemIncludesCore: options.system.includes("адаптивная память") })
  }
};
const Core = require("../aksi-unified-adaptive-core.js");
(async () => {
  assert.equal(Core.version, "0.1.0");
  assert.deepEqual(Core.semanticAddress("акси"), Core.semanticAddress("акси"));
  const l = Core.lorenz("test", 100);
  assert.equal(l.stable, true);
  assert.ok(Number.isFinite(l.signature));
  const prepared = Core.prepare("Что такое память AKSI?");
  assert.ok(prepared.system.includes("не доказательство смысла"));
  const answer = await Core.answer("Что такое память AKSI?", { system: "Тестовый system", temperature: 0 });
  assert.match(answer.text, /Тестовый ответ/);
  assert.equal(answer.core, "AKSI Unified Adaptive Core 0.1.0");
  assert.equal(Core.stats().episodes, 1);
  const good = Core.feedback("Что такое память AKSI?", answer.text, 1);
  assert.equal(good.ok, true);
  assert.equal(Core.stats().feedbackCount, 1);
  assert.equal(Core.feedback("Что такое память AKSI?", answer.text, 1).changed, false);
  const bad = Core.feedback("Что такое память AKSI?", answer.text, -1);
  assert.equal(bad.ok, true);
  assert.equal(Core.stats().feedbackCount, 2);
  assert.ok(store.has("aksi_unified_core_v1"), "memory should persist in localStorage");
  Core.clearMemory();
  assert.equal(Core.stats().episodes, 0);
  console.log("AKSI Unified Adaptive Core: all tests passed.");
})().catch(err => { console.error(err); process.exitCode = 1; });
