const assert = require("node:assert/strict");
const { createKernel } = require("../modules/aksi-system-kernel.js");
const { create: createReflection, classify } = require("../modules/aksi-agent-reflection.js");
const { create: createAgent } = require("../modules/aksi-agent-orchestrator.js");

(async () => {
  assert.equal(classify({ status: "completed" }), "none");
  assert.equal(classify({ status: "failed" }), "execution_error");
  assert.equal(classify({ status: "verification_failed" }), "verification_failed");
  assert.equal(classify({ status: "blocked", reason: "explicit_approval_required" }), "approval_required");
  assert.equal(classify({ status: "cancelled" }), "cancelled");

  const kernel = createKernel({ maxConcurrentTasks: 1, maxQueuedTasks: 4, defaultTimeoutMs: 1000 });
  kernel.register({ id: "test.ready", version: "1", init: async () => ({ available: true }) });
  await kernel.boot();

  const reflection = createReflection();
  const agent = createAgent({ kernel, reflection, maxSteps: 3 });
  let fallbackCalls = 0;
  agent.registerAction("lookup.primary", {
    fallbackSafe: true,
    fallbackAction: "answer.fallback",
    run: async () => { throw new Error("lookup source unavailable"); }
  });
  agent.registerAction("answer.fallback", {
    run: async input => { fallbackCalls += 1; return { handled: true, text: "fallback:" + input.prompt }; },
    verify: result => ({ ok: result && result.handled === true && typeof result.text === "string" && result.text.length > 0 })
  });
  const recovered = await agent.execute([{ id: "lookup", action: "lookup.primary", input: { prompt: "question" } }]);
  assert.equal(recovered.status, "completed");
  assert.equal(recovered.completed_steps, 1);
  assert.equal(recovered.results[0].action, "answer.fallback");
  assert.equal(recovered.results[0].requested_action, "lookup.primary");
  assert.deepEqual(recovered.results[0].reflection, {
    failure_code: "execution_error", fallback_action: "answer.fallback", attempts: 1
  });
  assert.equal(fallbackCalls, 1);

  const unsafe = createAgent({ kernel, reflection });
  let unsafeFallbackCalls = 0;
  unsafe.registerAction("memory.write", {
    sideEffect: true,
    fallbackSafe: true,
    fallbackAction: "answer.safe",
    run: async () => { throw new Error("write outcome uncertain"); }
  });
  unsafe.registerAction("answer.safe", {
    run: async () => { unsafeFallbackCalls += 1; return { handled: true, text: "should not run" }; },
    verify: value => Boolean(value && value.handled)
  });
  const blockedRecovery = await unsafe.execute([{ action: "memory.write" }]);
  assert.equal(blockedRecovery.status, "failed");
  assert.equal(unsafeFallbackCalls, 0);
  assert.equal(blockedRecovery.results[0].reflection.fallback_reason, "primary_action_may_have_side_effects");

  const noRetry = createAgent({ kernel, reflection });
  noRetry.registerAction("source.once", {
    fallbackSafe: true,
    fallbackAction: "answer.bad",
    run: async () => { throw new Error("first failure"); }
  });
  noRetry.registerAction("answer.bad", {
    run: async () => { throw new Error("fallback failure"); },
    verify: () => true
  });
  const failedFallback = await noRetry.execute([{ action: "source.once" }]);
  assert.equal(failedFallback.status, "failed");
  assert.equal(failedFallback.results[0].reflection.attempts, 1);
  assert.equal(failedFallback.results[0].reflection.fallback_status, "failed");

  const approval = reflection.decide({
    failureCode: "execution_error",
    action: { id: "memory.write", requiresApproval: true, fallbackSafe: true, fallbackAction: "answer.safe" },
    fallback: { id: "answer.safe", run() {}, verify() {} }
  });
  assert.equal(approval.allowed, false);
  assert.equal(approval.reason, "primary_action_may_have_side_effects");

  console.log("AKSI bounded reflection tests: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
