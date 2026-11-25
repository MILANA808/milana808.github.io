(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIAgentReflection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "0.1.0";
  const RETRYABLE = new Set(["execution_error", "verification_failed"]);

  function classify(result) {
    const item = result || {};
    if (item.status === "blocked") {
      return item.reason === "explicit_approval_required" || item.reason === "approval_denied"
        ? "approval_required" : "approval_error";
    }
    if (item.status === "cancelled") return "cancelled";
    if (item.status === "verification_failed") return "verification_failed";
    if (item.status === "failed") return "execution_error";
    if (item.status === "completed") return "none";
    return "unknown_failure";
  }

  function create() {
    function decide(input) {
      const data = input || {};
      const action = data.action || {};
      const fallback = data.fallback || null;
      const code = String(data.failureCode || "unknown_failure");
      if (!RETRYABLE.has(code)) return { allowed: false, reason: "failure_not_retryable" };
      if (data.fallbackAttempted === true) return { allowed: false, reason: "fallback_already_attempted" };
      if (action.requiresApproval === true || action.sideEffect === true) {
        return { allowed: false, reason: "primary_action_may_have_side_effects" };
      }
      if (action.fallbackSafe !== true || !action.fallbackAction) {
        return { allowed: false, reason: "no_explicit_safe_fallback" };
      }
      if (!fallback || fallback.id !== action.fallbackAction) {
        return { allowed: false, reason: "fallback_not_registered" };
      }
      if (fallback.requiresApproval === true || fallback.sideEffect === true || typeof fallback.run !== "function" || typeof fallback.verify !== "function") {
        return { allowed: false, reason: "fallback_not_safe_and_verifiable" };
      }
      return { allowed: true, action: fallback.id, reason: "single_verified_fallback_allowed" };
    }
    return Object.freeze({ version: VERSION, classify, decide });
  }

  return Object.freeze({ version: VERSION, create, classify });
});
