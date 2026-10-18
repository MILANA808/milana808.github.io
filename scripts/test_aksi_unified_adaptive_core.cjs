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
  ],
  dispatchEvent: () => true
};
require("../aksi-calculator.js");
require("../aksi-core-v3.js");
require("../aksi-visible-neural-lab.js");
window.AKSI_DNA_TOPOLOGY = require("../aksi-dna-topology-engine.js");
window.AKSICognitiveCore = require("../aksi-cognitive-core.js");
window.AKSIWaveBayesianEngine = require("../aksi-wave-bayesian-engine.js");
window.AKSIGeometricKnowledgeCore = require("../aksi-geometric-knowledge-core.js");
const Core = require("../aksi-unified-adaptive-core.js");
(async () => {
  assert.equal(Core.version, "0.1.0");
  const status = Core.inspect();
  assert.equal(status.schema, "AKSI-CORE-STATUS/1");
  assert.equal(status.modules.decisionCoreV3, true);
  assert.equal(status.modules.visibleNeuralLab, true);
  assert.equal(status.modules.nativeGenerator, true);
  assert.equal(status.modules.intentRouter, true);
  assert.equal(status.modules.evidenceAssessor, true);
  assert.equal(status.modules.geometricGraph, true);
  const decision = await Core.decide("choose a reproducible candidate", [
    { text: "Candidate A", evidence: 0.9, coherence: 0.9, agreement: 0.9, freshness: 0.9, provenance: 0.9, type: "inference", source: { url: "https://example.test/a" } },
    { text: "Candidate B", evidence: 0.4, coherence: 0.5, agreement: 0.4, freshness: 0.5, provenance: 0.3, type: "uncertain" },
    { text: "Candidate C", evidence: 0.7, coherence: 0.6, agreement: 0.7, freshness: 0.8, provenance: 0.7, type: "inference" }
  ], { mode: "deterministic", remember: false });
  assert.equal(decision.protocol, "AKSI-CORE/3");
  assert.equal(decision.receipt.receipt_hash.length, 64);
  assert.equal(Core.getTrace()[0].type, "decision");
  Core.clearTrace();
  const noteSaved = Core.remember("project", "AKSI unifies evidence, memory and calculations");
  assert.equal(noteSaved.ok, true);
  assert.equal(Core.recall("project")[0].value, "AKSI unifies evidence, memory and calculations");
  assert.ok(Core.prepare("AKSI project", []).context.notes.length > 0, "saved notes should enter relevant context");
  assert.equal(Core.listNotes().length, 1);
  const neuralRequest = await Core.answer("нейросеть: тест", {});
  assert.equal(neuralRequest.source, "aksi-visible-neural-lab");
  assert.equal(neuralRequest.integration.modelReady, false, "untrained model should not be represented as ready");
  assert.equal(Core.getTrace()[0].type, "neural_request");
  Core.clearTrace();
  const mathResult = await Core.answer("посчитай sqrt(81) + 2^3", {});
  assert.equal(mathResult.source, "aksi-calculator");
  assert.equal(mathResult.calculation.value, 17);
  assert.equal(mathResult.integration.generator, "aksi-calculator");
  assert.equal(Core.getTrace()[0].type, "calculation");
  const badMath = await Core.answer("вычисли 1/0", {});
  assert.equal(badMath.calculation.ok, false);
  assert.match(badMath.text, /Деление на ноль/);
  Core.clearTrace();
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
  assert.equal(Core.getTrace()[0].receiptDigest, answer.receipt, "answer trace must reference the generated evidence receipt");
  Core.clearTrace();
  assert.equal(Core.getTrace().length, 0);
  assert.match(answer.receipt, /^[a-f0-9]{64}$/);
  assert.equal(answer.model, "AKSI Native Generator 0.1.0");
  assert.equal(Core.stats().episodes, 2, "successful calculation and answer should both be recorded");
  const contestedAnswer = await Core.answer("claim under test", {
    evidence: [
      { stance: "supports", text: "support", url: "https://a.example/evidence", reliability: 0.8, sourceGroup: "a" },
      { stance: "refutes", text: "refutation", url: "https://b.example/evidence", reliability: 0.8, sourceGroup: "b" }
    ]
  });
  assert.equal(contestedAnswer.integration.evidence.status, "contested");
  assert.equal(contestedAnswer.receiptAssessmentStatus, "contested", "receipt must bind the same assessment shown by the answer");
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
