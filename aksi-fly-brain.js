/**
 * AKSI Fly-Brain v1.0 — embedded Drosophila-inspired substrate
 * Not FlyWire 139k. Complete behavioral LIF (sensor→drive→veto→motor) inside AKSI.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSI_FLY_BRAIN = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VERSION = "1.0";
  const GROUPS = {
    sensory: ["ORN_sweet", "ORN_bitter", "ME_loom", "JO_touch"],
    drive: ["AN_hunger", "AN_arousal"],
    central: ["PN_attract", "PN_avert", "LN_veto", "KC_context"],
    descending: ["DN_approach", "DN_freeze", "DN_turn"],
    motor: ["MN_walk", "MN_stop", "MN_turnL", "MN_turnR"],
  };
  const NAMES = [].concat(GROUPS.sensory, GROUPS.drive, GROUPS.central, GROUPS.descending, GROUPS.motor);
  const N = NAMES.length;
  const IDX = {};
  NAMES.forEach((n, i) => (IDX[n] = i));
  function buildW() {
    const W = Array.from({ length: N }, () => new Float64Array(N));
    function syn(pre, post, w) { W[IDX[post]][IDX[pre]] = w; }
    syn("ORN_sweet", "PN_attract", 0.85);
    syn("ORN_bitter", "PN_avert", 0.95);
    syn("ORN_bitter", "LN_veto", 1.1);
    syn("ME_loom", "DN_freeze", 0.9);
    syn("JO_touch", "DN_freeze", 0.75);
    syn("JO_touch", "AN_arousal", 0.4);
    syn("AN_hunger", "PN_attract", 0.5);
    syn("AN_hunger", "DN_approach", 0.45);
    syn("AN_arousal", "DN_approach", 0.25);
    syn("AN_arousal", "DN_turn", 0.2);
    syn("PN_attract", "DN_approach", 0.7);
    syn("PN_attract", "KC_context", 0.35);
    syn("PN_avert", "DN_freeze", 0.55);
    syn("PN_avert", "LN_veto", 0.5);
    syn("LN_veto", "DN_approach", -1.2);
    syn("LN_veto", "MN_walk", -0.9);
    syn("LN_veto", "DN_freeze", 0.4);
    syn("KC_context", "DN_approach", 0.2);
    syn("KC_context", "LN_veto", 0.15);
    syn("DN_approach", "MN_walk", 0.85);
    syn("DN_freeze", "MN_stop", 0.9);
    syn("DN_freeze", "MN_walk", -0.7);
    syn("DN_turn", "MN_turnL", 0.5);
    syn("DN_turn", "MN_turnR", 0.5);
    syn("MN_walk", "AN_arousal", 0.08);
    syn("MN_stop", "AN_arousal", -0.05);
    return W;
  }
  const W = buildW();
  function createState() {
    return { V: new Float64Array(N), spikes: new Uint8Array(N), hung: 0.55, energy: 0.8, x: 0, y: 0, heading: 0, t: 0, lastDecision: "IDLE", vetoTrace: 0, approachTrace: 0 };
  }
  function inject(state, kind, strength) {
    const s = strength == null ? 1.2 : strength;
    if (kind === "food" || kind === "sweet") state.V[IDX.ORN_sweet] += s;
    else if (kind === "bitter") state.V[IDX.ORN_bitter] += s * 1.15;
    else if (kind === "loom" || kind === "danger") state.V[IDX.ME_loom] += s;
    else if (kind === "touch") state.V[IDX.JO_touch] += s;
    else if (kind === "hunger") state.hung = Math.min(1, state.hung + 0.2);
  }
  function step(state, external) {
    external = external || {};
    state.t++;
    if (external.sweet) state.V[IDX.ORN_sweet] += external.sweet;
    if (external.bitter) state.V[IDX.ORN_bitter] += external.bitter;
    if (external.loom) state.V[IDX.ME_loom] += external.loom;
    if (external.touch) state.V[IDX.JO_touch] += external.touch;
    state.hung = Math.max(0, Math.min(1, state.hung + 0.0012));
    state.energy = Math.max(0.15, Math.min(1, state.energy - 0.0004));
    const next = new Float64Array(N);
    const spikes = state.spikes;
    for (let i = 0; i < N; i++) {
      let x = state.V[i] * 0.88;
      for (let j = 0; j < N; j++) {
        const w = W[i][j];
        if (w) x += w * (spikes[j] ? 1 : 0) * 0.5;
      }
      if (i === IDX.AN_hunger) x += state.hung * 0.05;
      if (i === IDX.AN_arousal) x += (1 - state.energy) * 0.02;
      next[i] = x;
    }
    state.V = next;
    const sp = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (state.V[i] > 1.0) { sp[i] = 1; state.V[i] = 0; }
    }
    state.spikes = sp;
    const walk = sp[IDX.MN_walk] ? 1 : 0;
    const stop = sp[IDX.MN_stop] ? 1 : 0;
    const veto = sp[IDX.LN_veto] || sp[IDX.ORN_bitter] ? 1 : 0;
    const approach = sp[IDX.DN_approach] || walk;
    state.vetoTrace = state.vetoTrace * 0.9 + (veto ? 0.35 : 0);
    state.approachTrace = state.approachTrace * 0.9 + (approach ? 0.3 : 0) - (stop ? 0.2 : 0);
    if (walk && !stop) {
      state.heading += (Math.random() - 0.5) * 0.15;
      state.x += Math.cos(state.heading) * 0.08 * state.energy;
      state.y += Math.sin(state.heading) * 0.08 * state.energy;
      state.energy = Math.max(0.1, state.energy - 0.008);
      state.hung = Math.max(0, state.hung - 0.01);
    }
    let decision = "IDLE";
    if (state.vetoTrace > 0.4 || stop) decision = "DEFERRED";
    else if (state.approachTrace > 0.35 || walk) decision = "ALLOWED";
    state.lastDecision = decision;
    return { decision, veto: state.vetoTrace > 0.4, hung: state.hung, energy: state.energy, walk: !!walk, stop: !!stop, spikes: NAMES.filter((_, i) => sp[i]), x: state.x, y: state.y, t: state.t };
  }
  function evaluateForGate(opts) {
    opts = opts || {};
    const conf = Math.max(0, Math.min(1, +opts.confidence || 0.5));
    const eqs = Math.max(0, Math.min(1, +opts.eqs || 0.5));
    const policy = String(opts.policy || "companion").toLowerCase();
    const text = String(opts.text || "").toLowerCase();
    const conflict = !!opts.sourceConflict;
    const lowEv = !!opts.lowEvidence;
    const st = createState();
    inject(st, "sweet", conf * eqs * 1.4);
    const bitterLex = /не уверен|не знаю|нет данных|недостаточно|противоречи|uncertain|unknown|insufficient|cannot/i.test(text);
    let bitter = 0;
    if (bitterLex) bitter += 0.9;
    if (conflict) bitter += 0.7;
    if (lowEv) bitter += 0.5;
    if (policy === "strict" && (eqs < 0.6 || conf < 0.65)) bitter += 0.6;
    if (eqs < 0.45) bitter += 0.4;
    if (bitter > 0) inject(st, "bitter", Math.min(1.8, bitter));
    if (lowEv || eqs < 0.4) inject(st, "loom", 0.5);
    let last = null;
    for (let i = 0; i < 24; i++) last = step(st);
    const decision = last.decision === "ALLOWED" ? "ALLOWED" : "DEFERRED";
    const veto = decision === "DEFERRED";
    let reason = null;
    if (veto) {
      if (bitterLex) reason = "uncertainty_language";
      else if (conflict) reason = "source_conflict";
      else if (lowEv) reason = "low_evidence";
      else if (policy === "strict") reason = "strict_policy";
      else reason = "fly_veto";
    }
    return {
      decision, veto, reason,
      motif: veto ? "bitter_veto" : "approach",
      threshold: policy === "strict" ? 0.72 : policy === "lab" ? 0.55 : 0.42,
      version: VERSION,
      brain: { t: st.t, hung: +st.hung.toFixed(3), energy: +st.energy.toFixed(3), vetoTrace: +st.vetoTrace.toFixed(3), approachTrace: +st.approachTrace.toFixed(3), neurons: N, groups: Object.keys(GROUPS) },
    };
  }
  return { VERSION, NAMES, GROUPS, N, IDX, W, createState, inject, step, evaluateForGate, disclaimer: "AKSI Fly-Brain compact LIF substrate (not FlyWire 140k)." };
});
