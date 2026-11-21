const assert = require("node:assert/strict");
const { create, version } = require("../modules/aksi-self-model.js");
assert.equal(version, "0.1.0");
assert.throws(() => create({}), /status providers/);
let kernel = {
  kernel: { state: "degraded", version: "0.1.0" },
  modules: [
    { id: "answer.router", version: "2.0.0", state: "available", capabilities: ["answer.routing"] },
    { id: "agent.orchestrator", version: "0.1.0", state: "degraded", capabilities: ["agent.plan.execute"] }
  ]
};
let agent = { registered_actions: [
  { id: "answer.respond", requires_approval: false, verifiable: true },
  { id: "knowledge.write", requires_approval: true, verifiable: true }
] };
const self = create({ getKernelStatus: () => kernel, getAgentStatus: () => agent });
const report = self.inspect();
assert.equal(report.schema, "aksi-self-model/1.0");
assert.equal(report.runtime.state, "degraded");
assert.equal(report.runtime.modules_available, 1);
assert.equal(report.runtime.modules_degraded, 1);
assert.equal(report.runtime.actions_registered, 2);
assert.deepEqual(report.capabilities, ["agent.plan.execute", "answer.routing"]);
assert.equal(report.actions[1].requires_approval, true);
const text = self.describe(report);
assert.match(text, /AKSI MATRIX/);
assert.match(text, /не обладает подтверждённым сознанием/);
assert.match(text, /knowledge.write — требуется подтверждение/);
kernel = { kernel: { state: "ready", version: "0.1.0" }, modules: [] };
agent = { registered_actions: [] };
assert.equal(self.inspect().runtime.state, "ready");
assert.match(self.describe(), /Зарегистрированные действия не обнаружены/);
console.log("AKSI self model tests: OK");
