const assert = require("node:assert/strict");
const { createKernel } = require("../modules/aksi-system-kernel.js");
const { create, version } = require("../modules/aksi-agent-orchestrator.js");

(async () => {
  assert.equal(version, "0.1.0");
  const kernel = createKernel({ maxConcurrentTasks: 1, maxQueuedTasks: 4, defaultTimeoutMs: 1000 });
  kernel.register({ id: "test.ready", version: "1", init: async () => ({ available: true }) });
  await kernel.boot();
  const agent = create({ kernel, maxSteps: 4 });
  const order = [];

  agent.registerAction("math.double", {
    run: async input => { order.push("double"); return input.value * 2; },
    verify: value => ({ ok: value === 8, detail: "expected deterministic result 8" })
  });
  agent.registerAction("memory.write", {
    requiresApproval: true,
    run: async input => { order.push("write"); return { saved: input.value }; },
    verify: value => value.saved === "approved"
  });

  const report = await agent.execute([
    { id: "calculate", action: "math.double", input: { value: 4 } },
    { id: "save", action: "memory.write", input: { value: "approved" } }
  ], { approve: async request => request.stepId === "save" });
  assert.equal(report.status, "completed");
  assert.equal(report.completed_steps, 2);
  assert.deepEqual(order, ["double", "write"]);
  assert.equal(report.results[0].verification.status, "passed");
  assert.equal(agent.status().recent_plans[0].status, "completed");

  const blocked = await agent.execute([{ action: "memory.write", input: { value: "no" } }]);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.results[0].reason, "explicit_approval_required");
  assert.equal(order.includes("write"), true);

  const denied = await agent.execute([{ action: "memory.write", input: { value: "denied" } }], { approve: async () => false });
  assert.equal(denied.status, "blocked");
  assert.equal(denied.results[0].reason, "approval_denied");

  const verificationFailure = await agent.execute([{ action: "math.double", input: { value: 3 } }]);
  assert.equal(verificationFailure.status, "verification_failed");
  assert.equal(verificationFailure.completed_steps, 0);

  const actionFailure = create({ kernel });
  actionFailure.registerAction("test.fail", { run: async () => { throw new Error("controlled failure"); } });
  const failed = await actionFailure.execute([{ action: "test.fail" }]);
  assert.equal(failed.status, "failed");
  assert.equal(failed.results[0].error.message, "controlled failure");

  await assert.rejects(agent.execute([{ action: "missing.action" }]), /Unknown action/);
  await assert.rejects(agent.execute([{}, {}, {}, {}, {}]), /between 1 and 4 steps/);
  await assert.rejects(agent.execute([]), /between 1 and 4 steps/);

  const aborting = create({ kernel });
  aborting.registerAction("test.abort", { run: async (_input, context) => {
    context.signal.addEventListener("abort", () => {}, { once: true });
    return "ok";
  } });
  const abortedKernel = await kernel.runTask("test.abort-controller", async (_input, context) => {
    context.signal.throwIfAborted();
    return "abort-signal-exposed";
  });
  assert.equal(abortedKernel, "abort-signal-exposed");

  console.log("AKSI agent orchestrator tests: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
