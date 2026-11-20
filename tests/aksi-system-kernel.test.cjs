const assert = require("node:assert/strict");
const { createKernel, version } = require("../modules/aksi-system-kernel.js");

(async () => {
  assert.equal(version, "0.1.0");
  const kernel = createKernel({ maxConcurrentTasks: 1, maxQueuedTasks: 2, defaultTimeoutMs: 100 });
  const events = [];
  kernel.subscribe(event => events.push(event.type));

  assert.throws(() => kernel.register({ id: "bad", version: "1", init: true }), /init/);

  let healthy = true;
  kernel.register({ id: "reasoner.core", version: "0.1.0", dependencies: ["memory.core"], capabilities: ["reasoning.basic"], init: async () => ({ available: true }), health: async () => ({ ok: healthy }) });
  kernel.register({ id: "memory.core", version: "1.0.0", capabilities: ["memory.read"], init: async () => ({ available: true }) });
  assert.throws(() => kernel.register({ id: "memory.core", version: "2", init: async () => ({}) }), /already registered/);
  await assert.rejects(kernel.runTask("before-boot", async () => "no"), error => error.code === "KERNEL_NOT_READY");
  const boot = await kernel.boot();
  assert.equal(boot.kernel.state, "ready");
  assert.deepEqual(boot.capabilities.sort(), ["memory.read", "reasoning.basic"]);
  assert.equal(kernel.getModule("reasoner.core").state, "available");
  healthy = false;
  await kernel.checkHealth();
  assert.equal(kernel.getModule("reasoner.core").state, "degraded");
  healthy = true;
  await kernel.checkHealth();
  assert.equal(kernel.getModule("reasoner.core").state, "available");
  assert.equal((await kernel.boot()).kernel.state, "ready", "boot must be idempotent");
  assert.throws(() => kernel.register({ id: "late.module", version: "1", init: async () => ({}) }), /registration is closed/);

  const first = kernel.runTask("echo", async (input, context) => {
    context.emit("started", { safe: true });
    return { echo: input, taskId: context.taskId };
  }, "hello");
  const result = await first;
  assert.equal(result.echo, "hello");
  assert.equal(kernel.listTasks().some(task => task.state === "completed"), true);
  assert.equal(kernel.getTask("task-1").state, "completed");
  assert.equal(kernel.getTask("missing-task"), null);

  await assert.rejects(kernel.runTask("broken", async () => { throw new Error("expected failure"); }), /expected failure/);
  await assert.rejects(kernel.runTask("slow", async (_input, context) => new Promise((resolve, reject) => {
    context.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }), null, { timeoutMs: 10 }), error => error.code === "TASK_TIMEOUT");

  const ignoredSignal = kernel.runTask("ignores-abort", () => new Promise(() => {}), null, { timeoutMs: 10 });
  await assert.rejects(ignoredSignal, error => error.code === "TASK_TIMEOUT");
  const afterTimeout = await kernel.runTask("after-timeout", async () => "slot-released");
  assert.equal(afterTimeout, "slot-released", "timed-out handler must not permanently occupy a task slot");

  // A completed task must release exactly one slot, not two.
  const parallel = createKernel({ maxConcurrentTasks: 2, maxQueuedTasks: 4, defaultTimeoutMs: 1000 });
  parallel.register({ id: "test.parallel", version: "1", init: async () => ({ available: true }) });
  await parallel.boot();
  const gates = [0, 1, 2].map(() => {
    let release;
    const promise = new Promise(resolve => { release = resolve; });
    return { promise, release };
  });
  let activeWorkers = 0;
  let maxActiveWorkers = 0;
  const worker = gate => async () => {
    activeWorkers++;
    maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
    await gate.promise;
    activeWorkers--;
    return "released";
  };
  const p1 = parallel.runTask("parallel-1", worker(gates[0]));
  const p2 = parallel.runTask("parallel-2", worker(gates[1]));
  const p3 = parallel.runTask("parallel-3", worker(gates[2]));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(activeWorkers, 2, "only two workers may start initially");
  gates[0].release();
  await p1;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(activeWorkers, 2, "third worker may start only after one slot is released");
  assert.equal(maxActiveWorkers, 2, "active worker count must never exceed configured concurrency");
  gates[1].release();
  gates[2].release();
  await Promise.all([p2, p3]);

  const eventsStatus = kernel.status();
  assert.equal(eventsStatus.tasks.running, 0);
  assert.ok(events.includes("kernel.boot.completed"));
  assert.ok(events.includes("task.completed"));
  assert.ok(events.includes("task.failed"));
  assert.ok(events.includes("task.timed_out"));

  const brokenDependencies = createKernel();
  brokenDependencies.register({ id: "needs.missing", version: "1", dependencies: ["missing.core"], init: async () => ({}) });
  const brokenStatus = await brokenDependencies.boot();
  assert.equal(brokenStatus.kernel.state, "unavailable");
  assert.equal(brokenDependencies.getModule("needs.missing").state, "failed");

  const degradedInit = createKernel();
  degradedInit.register({ id: "optional.adapter", version: "1", init: async () => ({ available: false, reason: "Missing browser API" }), health: async () => ({ ok: true }) });
  await degradedInit.boot();
  await degradedInit.checkHealth();
  assert.equal(degradedInit.getModule("optional.adapter").state, "degraded", "health success must not hide incomplete initialization");

  const cycle = createKernel();
  cycle.register({ id: "cycle.alpha", version: "1", dependencies: ["cycle.beta"], init: async () => ({}) });
  cycle.register({ id: "cycle.beta", version: "1", dependencies: ["cycle.alpha"], init: async () => ({}) });
  const cycleStatus = await cycle.boot();
  assert.notEqual(cycleStatus.kernel.state, "ready");
  assert.ok(cycleStatus.modules.some(module => module.state === "failed"));

  let disposed = false;
  const disposable = createKernel();
  disposable.register({ id: "test.disposable", version: "1", init: async () => ({}), dispose: async () => { disposed = true; } });
  await disposable.boot();
  await disposable.shutdown();
  assert.equal(disposed, true);
  assert.equal(disposable.status().kernel.state, "stopped");

  console.log("AKSI system kernel tests: OK");
})().catch(error => { console.error(error); process.exitCode = 1; });
