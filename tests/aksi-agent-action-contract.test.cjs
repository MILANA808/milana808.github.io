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
      return prompt.includes("неизвестное") ? { handled: true, status: "unknown_concept", text: "unknown" } :
        { handled: true, status: "defined", text: "known definition", proof: [] };
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
  assert.equal(semantic.verify(known).ok, true);

  const fallback = await semantic.run({ prompt: "что такое неизвестное понятие?", options: { useWeb: true } });
  assert.equal(fallback.route, "router");
  assert.equal(fallback.options.useWeb, true);
  assert.equal(semantic.verify(fallback).ok, true);

  const write = actions.get("knowledge.write");
  assert.equal(write.requiresApproval, true);
  assert.equal((await write.run({ prompt: "запомни факт: кошка — это животное" })).status, "fact_added");
  assert.equal(write.verify(await write.run({ prompt: "запомни факт: кошка — это животное" })).ok, true);
  const invalidFact = await write.run({ prompt: "запомни факт: кот" });
  assert.equal(invalidFact.status, "invalid_fact");
  assert.equal(write.verify(invalidFact).ok, true);

  console.log("AKSI agent action contract tests: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
