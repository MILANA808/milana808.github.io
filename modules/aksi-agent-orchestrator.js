(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIAgentOrchestrator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "0.1.0";
  const TERMINAL = new Set(["completed", "failed", "blocked", "verification_failed", "cancelled"]);

  function safeError(error) {
    return {
      name: error && error.name ? String(error.name) : "Error",
      message: error && error.message ? String(error.message).slice(0, 400) : "Unknown error"
    };
  }

  function create(options) {
    const config = options || {};
    const kernel = config.kernel;
    const reflection = config.reflection && typeof config.reflection.decide === "function"
      ? config.reflection : null;
    const maxSteps = Number.isInteger(config.maxSteps) ? config.maxSteps : 12;
    if (!kernel || typeof kernel.runTask !== "function") throw new TypeError("A running AKSI kernel is required");
    if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 50) throw new TypeError("maxSteps must be an integer from 1 to 50");

    const actions = new Map();
    const history = [];
    let sequence = 0;

    function registerAction(id, descriptor) {
      const key = String(id || "").trim();
      if (!/^[a-z][a-z0-9.-]{1,63}$/.test(key)) throw new TypeError("Invalid action id");
      if (!descriptor || typeof descriptor.run !== "function") throw new TypeError("Action run() is required");
      if (actions.has(key)) throw new Error("Action already registered: " + key);
      const action = Object.freeze({
        id: key,
        run: descriptor.run,
        verify: typeof descriptor.verify === "function" ? descriptor.verify : null,
        requiresApproval: descriptor.requiresApproval === true,
        sideEffect: descriptor.sideEffect === true,
        fallbackSafe: descriptor.fallbackSafe === true,
        fallbackAction: typeof descriptor.fallbackAction === "string" ? descriptor.fallbackAction : null
      });
      actions.set(key, action);
      return { id: key, requires_approval: action.requiresApproval, verifiable: Boolean(action.verify) };
    }

    function validatePlan(plan) {
      if (!Array.isArray(plan) || plan.length < 1 || plan.length > maxSteps) {
        throw new TypeError("Plan must contain between 1 and " + maxSteps + " steps");
      }
      const ids = new Set();
      return plan.map((step, index) => {
        if (!step || typeof step !== "object" || Array.isArray(step)) throw new TypeError("Invalid plan step at index " + index);
        const id = String(step.id || "step-" + (index + 1));
        const action = String(step.action || "");
        if (!/^[a-zA-Z0-9._-]{1,64}$/.test(id) || ids.has(id)) throw new TypeError("Invalid or duplicate step id: " + id);
        if (!actions.has(action)) throw new Error("Unknown action: " + action);
        ids.add(id);
        return Object.freeze({ id, action, input: step.input });
      });
    }

    async function invoke(action, input, context) {
      const value = await action.run(input, context);
      let verification = { status: "not_configured" };
      if (action.verify) {
        const checked = await action.verify(value, input, context);
        const ok = checked === true || Boolean(checked && checked.ok === true);
        verification = { status: ok ? "passed" : "failed", detail: checked && typeof checked === "object" ? checked.detail || null : null };
        if (!ok) return { ok: false, status: "verification_failed", value, verification };
      }
      return { ok: true, value, verification };
    }

    async function execute(plan, options) {
      const steps = validatePlan(plan);
      const opts = options || {};
      const runId = "plan-" + (++sequence);
      const startedAt = new Date().toISOString();
      const results = [];
      const taskPromise = kernel.runTask("agent.plan", async function (_input, taskContext) {
        let state = "completed";
        for (const step of steps) {
          if (taskContext.signal.aborted) {
            state = "cancelled";
            break;
          }
          const action = actions.get(step.action);
          taskContext.emit("step.started", { plan_id: runId, step_id: step.id, action: action.id });
          if (action.requiresApproval) {
            if (typeof opts.approve !== "function") {
              results.push({ id: step.id, action: action.id, status: "blocked", reason: "explicit_approval_required" });
              state = "blocked";
              break;
            }
            let approved = false;
            try { approved = (await opts.approve({ planId: runId, stepId: step.id, action: action.id, input: step.input })) === true; }
            catch (error) {
              results.push({ id: step.id, action: action.id, status: "blocked", reason: "approval_callback_failed", error: safeError(error) });
              state = "blocked";
              break;
            }
            if (!approved) {
              results.push({ id: step.id, action: action.id, status: "blocked", reason: "approval_denied" });
              state = "blocked";
              break;
            }
          }
          try {
            const context = Object.freeze({
              taskId: taskContext.taskId,
              planId: runId,
              stepId: step.id,
              signal: taskContext.signal,
              emit: (name, detail) => taskContext.emit("step." + String(name), { plan_id: runId, step_id: step.id, detail: detail || null })
            });
            let outcome;
            try {
              outcome = await invoke(action, step.input, context);
            } catch (error) {
              outcome = { ok: false, status: "failed", error: safeError(error) };
            }
            if (taskContext.signal.aborted) {
              results.push({ id: step.id, action: action.id, status: "cancelled" });
              state = "cancelled";
              break;
            }
            if (!outcome.ok) {
              const failureCode = reflection && typeof reflection.classify === "function"
                ? reflection.classify({ status: outcome.status })
                : outcome.status === "verification_failed" ? "verification_failed" : "execution_error";
              const fallback = action.fallbackAction ? actions.get(action.fallbackAction) : null;
              const decision = reflection
                ? reflection.decide({ failureCode, action, fallback, fallbackAttempted: false })
                : { allowed: false, reason: "reflection_unavailable" };
              if (decision.allowed && fallback) {
                taskContext.emit("step.reflection", { plan_id: runId, step_id: step.id, failure_code: failureCode, fallback_action: fallback.id });
                try {
                  const fallbackOutcome = await invoke(fallback, step.input, context);
                  if (fallbackOutcome.ok && !taskContext.signal.aborted) {
                    results.push({
                      id: step.id, action: fallback.id, requested_action: action.id,
                      status: "completed", value: fallbackOutcome.value,
                      verification: fallbackOutcome.verification,
                      reflection: { failure_code: failureCode, fallback_action: fallback.id, attempts: 1 }
                    });
                    taskContext.emit("step.completed", { plan_id: runId, step_id: step.id, verification: fallbackOutcome.verification.status, fallback: true });
                    continue;
                  }
                  results.push({
                    id: step.id, action: action.id, status: taskContext.signal.aborted ? "cancelled" : (fallbackOutcome.status || "verification_failed"),
                    value: outcome.value, error: outcome.error || null, verification: outcome.verification || null,
                    reflection: { failure_code: failureCode, fallback_action: fallback.id, fallback_status: fallbackOutcome.status || "verification_failed", attempts: 1 }
                  });
                  state = taskContext.signal.aborted ? "cancelled" : (fallbackOutcome.status || "verification_failed");
                  break;
                } catch (fallbackError) {
                  results.push({
                    id: step.id, action: action.id, status: outcome.status,
                    value: outcome.value, error: outcome.error || null, verification: outcome.verification || null,
                    reflection: { failure_code: failureCode, fallback_action: fallback.id, fallback_status: "failed", fallback_error: safeError(fallbackError), attempts: 1 }
                  });
                  state = outcome.status;
                  break;
                }
              }
              results.push({
                id: step.id, action: action.id, status: outcome.status,
                value: outcome.value, error: outcome.error || null, verification: outcome.verification || null,
                reflection: { failure_code: failureCode, fallback_attempted: false, fallback_reason: decision.reason }
              });
              state = outcome.status;
              break;
            }
            results.push({ id: step.id, action: action.id, status: "completed", value: outcome.value, verification: outcome.verification });
            taskContext.emit("step.completed", { plan_id: runId, step_id: step.id, verification: outcome.verification.status });
          } catch (error) {
            results.push({ id: step.id, action: action.id, status: "failed", error: safeError(error) });
            state = "failed";
            break;
          }
        }
        const report = {
          schema: "aksi-agent-plan/1.0",
          plan_id: runId,
          status: state,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          total_steps: steps.length,
          completed_steps: results.filter(item => item.status === "completed").length,
          results
        };
        history.push(report);
        if (history.length > 50) history.shift();
        taskContext.emit("plan.finished", { plan_id: runId, status: state, completed_steps: report.completed_steps, total_steps: steps.length });
        return report;
      }, null);
      return taskPromise;
    }

    function status() {
      return {
        version: VERSION,
        max_steps: maxSteps,
        registered_actions: [...actions.values()].map(action => ({
          id: action.id,
          requires_approval: action.requiresApproval,
          verifiable: Boolean(action.verify),
          side_effect: action.sideEffect,
          fallback_action: action.fallbackAction
        })),
        recent_plans: history.slice(-10).map(item => ({
          plan_id: item.plan_id,
          status: item.status,
          completed_steps: item.completed_steps,
          total_steps: item.total_steps
        }))
      };
    }

    return Object.freeze({ version: VERSION, registerAction, execute, status });
  }

  return Object.freeze({ version: VERSION, create });
});
