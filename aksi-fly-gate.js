/**
 * AKSI Fly-Gate v0.2 — bio-inspired veto heuristic
 *
 * HONEST SCOPE:
 * - Does NOT run the Drosophila connectome (~140k neurons).
 * - Does NOT train or load FlyWire / MaleCNS weights.
 * - Borrows one published design lesson: strong negative evidence
 *   can veto an otherwise active "go" command (bitter-veto motif
 *   in fly feeding / approach circuits; open literature + fly-api demos).
 *
 * Product mapping: veto → DEFERRED + gate_trace on Decision Receipt.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSI_FLY_GATE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const VERSION = "0.2";
  const MOTIF = "bitter_veto";

  function evaluate(opts) {
    const conf = clamp(+opts.confidence || 0);
    const eqs = clamp(+opts.eqs || 0);
    const policy = String(opts.policy || "companion").toLowerCase();
    const conflict = !!opts.sourceConflict;
    const lowEv = !!opts.lowEvidence;
    const text = String(opts.text || "").toLowerCase();

    const thr =
      policy === "strict" ? 0.72 : policy === "lab" ? 0.55 : 0.42;

    const bitterHints =
      /не уверен|не знаю|нет данных|недостаточно|противоречи|возможно ошиб|cannot|uncertain|unknown|no evidence|insufficient/i.test(
        text
      );

    let veto = false;
    let reason = null;
    let motif = "none";

    if (conflict && eqs < 0.75) {
      veto = true;
      reason = "source_conflict";
      motif = MOTIF;
    } else if (lowEv && conf < thr + 0.08) {
      veto = true;
      reason = "low_evidence";
      motif = MOTIF;
    } else if (bitterHints && conf < 0.85) {
      veto = true;
      reason = "uncertainty_language";
      motif = MOTIF;
    } else if (eqs < 0.45 && conf < thr) {
      veto = true;
      reason = "weak_eqs";
      motif = MOTIF;
    }

    if (policy === "strict" && (eqs < 0.6 || conf < 0.65)) {
      veto = true;
      reason = reason || "strict_policy";
      motif = MOTIF;
    }

    const pass = !veto && conf >= thr && eqs >= (policy === "strict" ? 0.55 : 0.4);
    const decision = pass ? "ALLOWED" : "DEFERRED";

    return {
      decision,
      veto,
      reason: decision === "DEFERRED" ? reason || "below_threshold" : null,
      motif: veto ? motif : "none",
      threshold: thr,
      version: VERSION,
    };
  }

  function clamp(x) {
    return Math.max(0, Math.min(1, x));
  }

  function toGateTrace(result) {
    return {
      veto: !!result.veto,
      reason: result.reason || null,
      motif: result.motif || "none",
      threshold: result.threshold,
    };
  }

  return {
    VERSION,
    MOTIF,
    evaluate,
    toGateTrace,
    disclaimer:
      "Fly-Gate is a bio-inspired veto heuristic (bitter-veto motif). Not a running Drosophila connectome.",
  };
});
