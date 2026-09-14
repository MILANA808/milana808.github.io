/**
 * AKSI Fly-Gate v1.0 — gate adapter over AKSI Fly-Brain
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSI_FLY_GATE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VERSION = "1.0";
  const MOTIF = "bitter_veto";
  function evaluate(opts) {
    if (typeof AKSI_FLY_BRAIN !== "undefined" && AKSI_FLY_BRAIN.evaluateForGate) {
      return AKSI_FLY_BRAIN.evaluateForGate(opts);
    }
    const conf = Math.max(0, Math.min(1, +opts.confidence || 0));
    const eqs = Math.max(0, Math.min(1, +opts.eqs || 0));
    const policy = String(opts.policy || "companion").toLowerCase();
    const conflict = !!opts.sourceConflict;
    const lowEv = !!opts.lowEvidence;
    const text = String(opts.text || "").toLowerCase();
    const thr = policy === "strict" ? 0.72 : policy === "lab" ? 0.55 : 0.42;
    const bitter = /не уверен|не знаю|нет данных|недостаточно|противоречи|uncertain|unknown|insufficient/i.test(text);
    let veto = false, reason = null;
    if (conflict && eqs < 0.75) { veto = true; reason = "source_conflict"; }
    else if (lowEv && conf < thr + 0.08) { veto = true; reason = "low_evidence"; }
    else if (bitter && conf < 0.85) { veto = true; reason = "uncertainty_language"; }
    else if (eqs < 0.45 && conf < thr) { veto = true; reason = "weak_eqs"; }
    if (policy === "strict" && (eqs < 0.6 || conf < 0.65)) { veto = true; reason = reason || "strict_policy"; }
    const pass = !veto && conf >= thr && eqs >= (policy === "strict" ? 0.55 : 0.4);
    return { decision: pass ? "ALLOWED" : "DEFERRED", veto: !pass, reason: pass ? null : reason || "below_threshold", motif: !pass ? MOTIF : "none", threshold: thr, version: VERSION };
  }
  function toGateTrace(result) {
    return { veto: !!result.veto, reason: result.reason || null, motif: result.motif || "none", threshold: result.threshold, brain: result.brain || null };
  }
  return { VERSION, MOTIF, evaluate, toGateTrace, disclaimer: "Fly-Gate uses AKSI Fly-Brain LIF substrate when loaded (not full Drosophila connectome)." };
});
