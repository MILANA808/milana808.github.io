(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSISystemKernel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "0.1.0";
  const MODULE_STATES = new Set(["registered", "initializing", "available", "degraded", "unavailable", "failed"]);
  const TASK_STATES = new Set(["queued", "running", "completed", "failed", "cancelled", "timed_out"]);
  const now = () => new Date().toISOString();

  function safeError(error) {
    return {
      name: error && error.name ? String(error.name) : "Error",
      message: error && error.message ? String(error.message).slice(0, 500) : "Unknown error"
    };
  }

  function createKernel(options) {
    const config = Object.assign({ maxConcurrentTasks: 4, maxQueuedTasks: 32, defaultTimeoutMs: 15000 }, options || {});
    for (const key of ["maxConcurrentTasks", "maxQueuedTasks", "defaultTimeoutMs"]) {
      if (!Number.isInteger(config[key]) || config[key] < 1) throw new TypeError(key + " must be a positive integer");
    }

    const modules = new Map();
    const tasks = new Map();
    const queue = [];
    const listeners = new Set();
    let sequence = 0;
    let activeCount = 0;
    let kernelState = "created";
    let bootPromise = null;

    function emit(type, detail) {
      const event = Object.freeze({ type, at: now(), detail: detail || null });
      for (const listener of listeners) {
        try { listener(event); } catch (_) { /* Observers must not break the kernel. */ }
      }
      return event;
    }

    function subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function register(descriptor) {
      if (!descriptor || typeof descriptor !== "object") throw new TypeError("Module descriptor is required");
      const id = String(descriptor.id || "").trim();
      const version = String(descriptor.version || "").trim();
      if (!/^[a-z][a-z0-9.-]{1,63}$/.test(id)) throw new TypeError("Invalid module id");
      if (!version) throw new TypeError("Module version is required");
      if (modules.has(id)) throw new Error("Module already registered: " + id);
      if (typeof descriptor.init !== "function") throw new TypeError("Module init() is required");
      const dependencies = Array.isArray(descriptor.dependencies) ? descriptor.dependencies.map(String) : [];
      const capabilities = Array.isArray(descriptor.capabilities) ? descriptor.capabilities.map(String) : [];
      const record = {
        id, version, dependencies, capabilities,
        init: descriptor.init,
        health: typeof descriptor.health === "function" ? descriptor.health : null,
        dispose: typeof descriptor.dispose === "function" ? descriptor.dispose : null,
        state: "registered", error: null, initializedAt: null, lastHealth: null
      };
      modules.set(id, record);
      emit("module.registered", { id, version, dependencies, capabilities });
      return moduleSnapshot(record);
    }

    function moduleSnapshot(record) {
      return {
        id: record.id, version: record.version, dependencies: record.dependencies.slice(),
        capabilities: record.capabilities.slice(), state: record.state,
        error: record.error, initializedAt: record.initializedAt, lastHealth: record.lastHealth
      };
    }

    async function boot() {
      if (bootPromise) return bootPromise;
      bootPromise = (async () => {
        kernelState = "booting";
        emit("kernel.boot.started", { module_count: modules.size });
        for (const record of modules.values()) {
          record.state = "initializing";
          try {
            const missing = record.dependencies.filter(id => !modules.has(id) || modules.get(id).state !== "available");
            if (missing.length) throw new Error("Dependencies unavailable: " + missing.join(", "));
            const result = await record.init({ kernel: publicApi, emit });
            if (result && result.available === false) {
              record.state = "degraded";
              record.error = result.reason ? { name: "Degraded", message: String(result.reason).slice(0, 500) } : null;
            } else {
              record.state = "available";
              record.error = null;
            }
            record.initializedAt = now();
            emit("module.initialized", { id: record.id, state: record.state, error: record.error });
          } catch (error) {
            record.state = "failed";
            record.error = safeError(error);
            record.initializedAt = now();
            emit("module.failed", { id: record.id, error: record.error });
          }
        }
        const states = [...modules.values()].map(item => item.state);
        kernelState = states.length && states.every(state => state === "available") ? "ready"
          : states.some(state => state === "available" || state === "degraded") ? "degraded"
          : "unavailable";
        emit("kernel.boot.completed", { state: kernelState });
        return status();
      })();
      try { return await bootPromise; }
      catch (error) { bootPromise = null; kernelState = "failed"; throw error; }
    }

    function status() {
      const moduleList = [...modules.values()].map(moduleSnapshot);
      return {
        schema: "aksi-system-status/1.0", kernel: { version: VERSION, state: kernelState },
        modules: moduleList,
        tasks: { queued: queue.length, running: activeCount, total: tasks.size },
        limits: {
          max_concurrent_tasks: config.maxConcurrentTasks,
          max_queued_tasks: config.maxQueuedTasks,
          default_timeout_ms: config.defaultTimeoutMs
        },
        capabilities: [...new Set(moduleList.filter(item => item.state === "available").flatMap(item => item.capabilities))],
        generated_at: now()
      };
    }

    function getModule(id) {
      const record = modules.get(String(id));
      return record ? moduleSnapshot(record) : null;
    }

    function taskSnapshot(task) {
      return {
        id: task.id, type: task.type, state: task.state, created_at: task.createdAt,
        started_at: task.startedAt, finished_at: task.finishedAt, error: task.error,
        result: task.state === "completed" ? task.result : undefined
      };
    }

    function runTask(type, handler, input, options) {
      const taskType = String(type || "").trim();
      if (!taskType || typeof handler !== "function") return Promise.reject(new TypeError("Task type and handler are required"));
      if (queue.length >= config.maxQueuedTasks && activeCount >= config.maxConcurrentTasks) {
        return Promise.reject(Object.assign(new Error("Task queue is full"), { code: "TASK_QUEUE_FULL" }));
      }
      const opts = options || {};
      const timeoutMs = opts.timeoutMs == null ? config.defaultTimeoutMs : opts.timeoutMs;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 300000) {
        return Promise.reject(new TypeError("timeoutMs must be an integer from 1 to 300000"));
      }
      const id = "task-" + (++sequence);
      let resolveTask, rejectTask;
      const promise = new Promise((resolve, reject) => { resolveTask = resolve; rejectTask = reject; });
      const controller = new AbortController();
      const task = {
        id, type: taskType, state: "queued", createdAt: now(), startedAt: null, finishedAt: null,
        error: null, result: undefined, controller, handler, input, timeoutMs,
        resolve: resolveTask, reject: rejectTask, timer: null
      };
      tasks.set(id, task);
      queue.push(task);
      emit("task.queued", { id, type: taskType });
      pump();
      return promise;
    }

    function finish(task, state, value) {
      if (!TASK_STATES.has(state) || ["completed", "failed", "cancelled", "timed_out"].includes(task.state)) return;
      clearTimeout(task.timer);
      task.state = state;
      task.finishedAt = now();
      if (state === "completed") {
        task.result = value;
        task.resolve(value);
      } else {
        task.error = value;
        task.reject(Object.assign(new Error(value.message || state), { code: value.code || state.toUpperCase(), taskId: task.id }));
      }
      emit("task." + state, { id: task.id, type: task.type, error: task.error });
    }

    function pump() {
      while (activeCount < config.maxConcurrentTasks && queue.length) {
        const task = queue.shift();
        if (task.state !== "queued") continue;
        activeCount++;
        task.state = "running";
        task.startedAt = now();
        emit("task.started", { id: task.id, type: task.type });
        task.timer = setTimeout(() => {
          task.controller.abort();
          finish(task, "timed_out", { code: "TASK_TIMEOUT", message: "Task exceeded " + task.timeoutMs + " ms" });
        }, task.timeoutMs);
        Promise.resolve().then(() => task.handler(task.input, {
          taskId: task.id, signal: task.controller.signal,
          emit: (name, detail) => emit("task.progress", { id: task.id, name: String(name), detail: detail || null })
        })).then(
          result => finish(task, "completed", result),
          error => finish(task, "failed", safeError(error))
        ).finally(() => {
          activeCount = Math.max(0, activeCount - 1);
          pump();
        });
      }
    }

    function cancelTask(id, reason) {
      const task = tasks.get(String(id));
      if (!task || ["completed", "failed", "cancelled", "timed_out"].includes(task.state)) return false;
      task.controller.abort();
      if (task.state === "queued") {
        const index = queue.indexOf(task);
        if (index >= 0) queue.splice(index, 1);
      }
      finish(task, "cancelled", { code: "TASK_CANCELLED", message: String(reason || "Cancelled by caller").slice(0, 300) });
      if (task.state === "cancelled" && task.startedAt) {
        // Running work is cooperative: handlers must observe the AbortSignal.
      }
      pump();
      return true;
    }

    async function shutdown() {
      kernelState = "shutting_down";
      for (const task of tasks.values()) {
        if (["queued", "running"].includes(task.state)) cancelTask(task.id, "Kernel shutdown");
      }
      const records = [...modules.values()].reverse();
      for (const record of records) {
        if (record.state === "available" || record.state === "degraded") {
          try { if (record.dispose) await record.dispose(); }
          catch (error) { record.error = safeError(error); record.state = "failed"; }
        }
      }
      kernelState = "stopped";
      emit("kernel.stopped", null);
      return status();
    }

    const publicApi = Object.freeze({ register, boot, status, getModule, subscribe, runTask, cancelTask, shutdown });
    return publicApi;
  }

  return Object.freeze({ version: VERSION, createKernel });
});
