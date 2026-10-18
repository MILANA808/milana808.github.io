const assert = require("node:assert/strict");
const store = new Map();
global.window = {
  localStorage: {
    getItem: k => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  },
  __AKSI_SEED: [
    { q: "Что такое память AKSI?", a: "Память AKSI хранит локальные эпизоды и оценки ответов." },
    { q: "Что такое квантовая суперпозиция?", a: "Суперпозиция — математическое описание квантового состояния." }
  ]
};
window.AKSI_DNA_TOPOLOGY = require("../aksi-dna-topology-engine.js");
window.AKSICognitiveCore = require("../aksi-cognitive-core.js");
window.AKSIWaveBayesianEngine = require("../aksi-wave-bayesian-engine.js");
window.AKSIGeometricKnowledgeCore = require("../aksi-geometric-knowledge-core.js");
const Core = require("../aksi-unified-adaptive-core.js");
(async () => {
  assert.equal(Core.version, "0.1.0");
  const status = Core.inspect();
  assert.equal(status.schema, "AKSI-CORE-STATUS/1");
  assert.equal(status.modules.nativeGenerator, true);
  assert.equal(status.modules.intentRouter, true);
  assert.equal(status.modules.evidenceAssessor, true);
  assert.equal(status.modules.geometricGraph, true);
  assert.deepEqual(Core.semanticAddress("акси"), Core.semanticAddress("акси"));
  const l = Core.lorenz("test", 100);
  assert.equal(l.stable, true);
  assert.ok(Number.isFinite(l.signature));
  const prepared = Core.prepare("Что такое память AKSI?", [{ title: "Source", text: "Context", url: "https://example.test" }]);
  assert.ok(prepared.system.includes("не доказательство смысла"));
  assert.ok(prepared.intent, "wave-Bayesian router should be called");
  assert.ok(prepared.diffusion, "geometric graph diffusion should be called");
  const answer = await Core.answer("Что такое память AKSI?", {
    system: "Тестовый system", temperature: 0,
    evidence: [{ title: "Test source", text: "Source context", url: "https://example.test/source" }]
  });
  assert.match(answer.text, /Память AKSI хранит локальные эпизоды/);
  assert.equal(answer.source, "aksi-native-dna-topology");
  assert.equal(answer.core, "AKSI Unified Adaptive Core 0.1.0 + AKSI Native Generator");
  assert.equal(answer.evidenceAudit, "insufficient_evidence", "retrieved source fragments remain context until assessed");
  assert.equal(answer.integration.schema, "AKSI-CORE-RESULT/1");
  assert.equal(answer.integration.generator, "aksi-native-dna-topology");
  assert.equal(answer.integration.evidence.status, "insufficient_evidence");
  const annotated = Core.prepare("claim under test", [
    { stance: "supports", text: "independent supporting source", url: "https://a.example/evidence", reliability: 0.8, sourceGroup: "a" },
    { stance: "refutes", text: "independent refuting source", url: "https://b.example/evidence", reliability: 0.8, sourceGroup: "b" }
  ]);
  assert.equal(annotated.evidenceAssessment.status, "contested", "explicitly annotated opposing evidence must remain contested");
  assert.equal(annotated.evidenceAssessment.supportWeight, 0.8);
  assert.equal(annotated.evidenceAssessment.refuteWeight, 0.8);
  assert.match(annotated.evidenceAssessment.warning, /not a probability of truth/i);
  assert.equal(Core.getTrace().length, 1);
  assert.equal(Core.getTrace()[0].type, "answer");
  Core.clearTrace();
  assert.equal(Core.getTrace().length, 0);
  assert.match(answer.receipt, /^[a-f0-9]{64}$/);
  assert.equal(answer.model, "AKSI Native Generator 0.1.0");
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
