/** AKSI Policy Gate v1 — explicit, deny-by-default decision authority. */
(function (G) {
  "use strict";
  var DEFAULT = { name: "default-deny", version: "1.0", require_human_for_action: true, max_uncertainty: 0.45, min_eqs: 50, allowed_actions: [] };
  function normalize(p) { p = p || {}; return Object.assign({}, DEFAULT, p, { allowed_actions: Array.isArray(p.allowed_actions) ? p.allowed_actions.slice() : DEFAULT.allowed_actions.slice() }); }
  function evaluate(decision, policy) {
    var p = normalize(policy), s = decision && decision.evaluation || decision && decision.scores || {};
    var uncertainty = Number(decision && decision.uncertainty != null ? decision.uncertainty : s.uncertainty != null ? s.uncertainty : 1);
    var eqs = Number(s.eqs != null ? s.eqs : 0);
    var action = decision && decision.action ? decision.action.type : null;
    var reasons = [];
    if (eqs < p.min_eqs) reasons.push("EQS below policy minimum");
    if (uncertainty > p.max_uncertainty) reasons.push("uncertainty above policy maximum");
    if (action && p.allowed_actions.indexOf(action) < 0) reasons.push("action not allowlisted");
    if (p.require_human_for_action && action) reasons.push("human authorization required");
    return { ok: reasons.length === 0, policy: p, reasons: reasons, action: action, requires_human: !!(action && p.require_human_for_action) };
  }
  G.AKSI_POLICY = { version: "1.0.0", defaults: DEFAULT, normalize: normalize, evaluate: evaluate };
})(typeof window !== "undefined" ? window : globalThis);
