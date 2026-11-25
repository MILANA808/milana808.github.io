const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const registered = new Map();
const actions = new Map();
const kernel = {
  register(module) { registered.set(module.id, module); },
  createKernel() {},
  runTask(_name, fn) { return Promise.resolve(fn({}, { signal: { aborted: false }, emit() {}, taskId: "test-task" })); },
  subscribe() {},
  status() { return { kernel: { state: "ready", version: "test" }, modules: [], capabilities: [], tasks: {}, limits: {} }; }
};
const context = {
  console,
  document: { readyState: "loading", addEventListener() {} },
  AKSISystemKernel: { createKernel: () => kernel },
  AKSIAgentReflection: {
    create() {
      return {
        classify(result) { return result && result.status === "verification_failed" ? "verification_failed" : "execution_error"; },
        decide() { return { allowed: false, reason: "test_reflection_disabled" }; }
      };
    }
  },
  AKSIAgentOrchestrator: {
    version: "test",
    create() {
      return {
        registerAction(id, action) { actions.set(id, action); },
        execute() {},
        status() { return {}; }
      };
    }
  },
  AKSISelfModel: {
    create() {
      return {
        version: "0.1.0",
        inspect() { return { schema: "aksi-self-model/1.0", runtime: { state: "ready" }, modules: [], actions: [], limitations: [] }; },
        describe() { return "AKSI MATRIX runtime self-inspection"; }
      };
    }
  },
  AKSIAnswerRouter: {
    version: "2.0.0",
    async answer(prompt, options) {
      return { handled: true, route: "router", text: "fallback:" + prompt, options };
    }
  },
  AKSICalculator: {
    evaluate(expression) {
      if (expression === "2+") return { ok: false, expression, error: "Ожидалось число после знака +." };
      return { ok: true, expression, value: 4, formatted: "4" };
    }
  },
  AKSIKnowledgeBase: {
    answer(prompt) {
      if (prompt === "запомни факт: кот") return { handled: true, status: "invalid_fact", text: "Укажите субъект и проверяемое утверждение." };
      return prompt.startsWith("запомни факт:") ? { handled: true, status: "fact_added", text: "saved" } : null;
    }
  },
  AKSISemanticReasoning: {
    version: "1.2.0",
    answer(prompt) {
      if (prompt.includes("неизвестное")) return { handled: true, status: "unknown_concept", text: "unknown", proof: [{ type: "unknown_concept" }] };
      if (prompt.includes("сравни математику с физикой")) return { handled: true, status: "compared", text: "Сравнение математики и физики по признакам базы.", proof: [{ type: "feature_comparison", concepts: ["математика", "физика"], shared: [], onlyA: [], onlyB: [] }] };
      return { handled: true, status: "defined", text: "known definition", proof: [{ type: "definition_lookup", concept: "математика" }] };
    }
  },
  AKSISemanticEvidenceLedger: {
    create(prompt, semantic, engine) {
      return { ok: true, ledger: { schema: "aksi-semantic-evidence-ledger/1.0", prompt, evidence: semantic.proof || [] } };
    },
    verify(prompt, semantic, ledger) {
      return { ok: Boolean(ledger && ledger.schema === "aksi-semantic-evidence-ledger/1.0" && ledger.prompt === prompt), status: "ledger_recomputed", evidence_count: (ledger && ledger.evidence || []).length, detail: "mock ledger check" };
    }
  },
  AKSISemanticProofValidator: {
    stable(value) { return JSON.stringify(value); },
    validate(prompt, result, engine) {
      const expected = engine.answer(prompt);
      const ok = JSON.stringify(result) === JSON.stringify(expected);
      return { ok, status: ok ? "recomputed" : "proof_mismatch", detail: "mock recomputation" };
    }
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("system/aksi-boot.js", "utf8"), context);
(async () => {
  const agentModule = registered.get("agent.orchestrator");
  assert.ok(agentModule, "agent orchestrator module registered");
  await agentModule.init();
  const self = await actions.get("self.inspect").run({});
  assert.equal(self.selfModel.schema, "aksi-self-model/1.0");
  assert.equal(actions.get("self.inspect").verify(self).ok, true);

  const math = await actions.get("math.calculate").run({ expression: "2+2" });
  assert.equal(math.handled, true);
  assert.equal(math.text, "2+2 = 4");
  assert.equal(actions.get("math.calculate").verify(math).ok, true);
  const invalidMath = await actions.get("math.calculate").run({ expression: "2+" });
  assert.equal(invalidMath.calculation.ok, false);
  assert.equal(actions.get("math.calculate").verify(invalidMath).ok, true);

  const semantic = actions.get("semantic.query");
  const known = await semantic.run({ prompt: "что такое математика?" });
  assert.equal(known.route, "semantic-reasoning");
  assert.equal(semantic.verify(known, { prompt: "что такое математика?" }).ok, true);
  assert.equal(known.evidence.schema, "aksi-semantic-evidence-ledger/1.0");
  const tamperedLedger = { ...known, evidence: { ...known.evidence, prompt: "подмена" } };
  assert.equal(semantic.verify(tamperedLedger, { prompt: "что такое математика?" }).ok, false);
  assert.equal(semantic.verify({ ...known, handled: false }, { prompt: "что такое математика?" }).proof_status, "wrapper_mismatch");
  assert.equal(semantic.verify({ ...known, text: "Подменённый текст" }, { prompt: "что такое математика?" }).proof_status, "wrapper_mismatch");
  assert.equal(semantic.verify({ ...known, proof: [{ type: "forged" }] }, { prompt: "что такое математика?" }).proof_status, "wrapper_mismatch");
  assert.equal(semantic.verify({ ...known, version: "9.9.9" }, { prompt: "что такое математика?" }).proof_status, "wrapper_mismatch");

  const unsupported = await semantic.run({ prompt: "сравни математику с физикой" });
  assert.equal(unsupported.semantic.status, "compared");
  assert.match(unsupported.text, /Сравнение математики/);
  assert.equal(semantic.verify(unsupported, { prompt: "сравни математику с физикой" }).ok, true);

  const unknown = await semantic.run({ prompt: "что такое неизвестное понятие?", options: { useWeb: true } });
  assert.equal(unknown.route, "semantic-reasoning");
  assert.equal(unknown.semantic.status, "unknown_concept");
  assert.equal(unknown.text, "unknown");
  assert.equal(semantic.verify(unknown, { prompt: "что такое неизвестное понятие?" }).ok, true);

  const write = actions.get("knowledge.write");
  assert.equal(write.requiresApproval, true);
  assert.equal((await write.run({ prompt: "запомни факт: кошка — это животное" })).status, "fact_added");
  const read = actions.get("knowledge.read");
  assert.equal(read.fallbackAction, "answer.respond");
  assert.equal(read.fallbackSafe, true);
  assert.equal(write.verify(await write.run({ prompt: "запомни факт: кошка — это животное" })).ok, true);
  const invalidFact = await write.run({ prompt: "запомни факт: кот" });
  assert.equal(invalidFact.status, "invalid_fact");
  assert.equal(write.verify(invalidFact).ok, true);

  console.log("AKSI agent action contract tests: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
