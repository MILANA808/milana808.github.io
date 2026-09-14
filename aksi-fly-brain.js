/**
 * AKSI Fly-Brain v2.0 — expanded behavioral LIF substrate
 * Not FlyWire 139k weights. Named pathway sketch + decision gate.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSI_FLY_BRAIN = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const VERSION = "2.0";
  const GROUPS = {
    sensory: ["ORN_sweet","ORN_bitter","R1_6","LC4_loom","JO_touch","AN_cold"],
    drive: ["AN_hunger","AN_arousal","DA_PAM"],
    central: ["PN_attract","PN_avert","LN_veto","KC_ab","MBON_app","MBON_av","LH_AV","FB_cx"],
    descending: ["DNp01_GF","DN_approach","DN_freeze","DN_turn","DNg02"],
    motor: ["MN_walk","MN_stop","MN_turnL","MN_turnR","MN_jump"]
  };
  const NAMES = [].concat(GROUPS.sensory, GROUPS.drive, GROUPS.central, GROUPS.descending, GROUPS.motor);
  const N = NAMES.length;
  const IDX = {};
  NAMES.forEach((n, i) => (IDX[n] = i));
  function buildW() {
    const W = Array.from({ length: N }, () => new Float64Array(N));
    function syn(pre, post, w) { W[IDX[post]][IDX[pre]] = w; }
    syn("ORN_sweet","PN_attract",0.9);
    syn("ORN_bitter","PN_avert",0.95);
    syn("ORN_bitter","LN_veto",1.15);
    syn("AN_cold","PN_avert",0.4);
    syn("R1_6","LC4_loom",0.35);
    syn("LC4_loom","DNp01_GF",1.0);
    syn("LC4_loom","DN_freeze",0.7);
    syn("JO_touch","DN_freeze",0.65);
    syn("JO_touch","AN_arousal",0.4);
    syn("AN_hunger","PN_attract",0.55);
    syn("AN_hunger","DN_approach",0.4);
    syn("AN_arousal","DN_approach",0.25);
    syn("AN_arousal","DN_turn",0.2);
    syn("DA_PAM","KC_ab",0.45);
    syn("DA_PAM","MBON_app",0.3);
    syn("PN_attract","KC_ab",0.5);
    syn("PN_attract","MBON_app",0.45);
    syn("PN_attract","LH_AV",0.25);
    syn("PN_attract","DN_approach",0.6);
    syn("PN_avert","MBON_av",0.55);
    syn("PN_avert","LN_veto",0.5);
    syn("PN_avert","LH_AV",0.4);
    syn("KC_ab","MBON_app",0.4);
    syn("KC_ab","MBON_av",0.25);
    syn("MBON_app","DN_approach",0.95);
    syn("MBON_av","DN_freeze",0.5);
    syn("MBON_av","LN_veto",0.35);
    syn("LH_AV","LN_veto",0.4);
    syn("FB_cx","DN_turn",0.3);
    syn("FB_cx","DN_approach",0.15);
    syn("LN_veto","DN_approach",-1.25);
    syn("LN_veto","MN_walk",-0.95);
    syn("LN_veto","DN_freeze",0.35);
    syn("DN_approach","MN_walk",0.9);
    syn("DN_freeze","MN_stop",0.95);
    syn("DN_freeze","MN_walk",-0.75);
    syn("DNp01_GF","MN_jump",1.1);
    syn("DNp01_GF","MN_stop",0.5);
    syn("DN_turn","MN_turnL",0.55);
    syn("DN_turn","MN_turnR",0.55);
    syn("DNg02","MN_walk",0.35);
    syn("MN_walk","AN_arousal",0.08);
    syn("MN_stop","AN_arousal",-0.05);
    syn("MN_jump","AN_arousal",0.2);
    return W;
  }
  const W = buildW();
  function createState() {
    return {
      V: new Float64Array(N), spikes: new Uint8Array(N),
      hung: 0.55, energy: 0.85, x: 0, y: 0, heading: 0, t: 0,
      lastDecision: "IDLE", vetoTrace: 0, approachTrace: 0, escapeTrace: 0,
      inp: { sweet: 0, bitter: 0, loom: 0, touch: 0, light: 0 }
    };
  }
  function inject(state, kind, strength) {
    const s = strength == null ? 1.4 : strength;
    if (kind === "food" || kind === "sweet") state.inp.sweet = Math.max(state.inp.sweet, s);
    else if (kind === "bitter") state.inp.bitter = Math.max(state.inp.bitter, s);
    else if (kind === "loom" || kind === "danger") state.inp.loom = Math.max(state.inp.loom, s);
    else if (kind === "touch") state.inp.touch = Math.max(state.inp.touch, s);
    else if (kind === "light") state.inp.light = Math.max(state.inp.light, s);
    else if (kind === "hunger") state.hung = Math.min(1, state.hung + 0.25);
  }
  function step(state, external) {
    external = external || {};
    state.t++;
    if (external.sweet) state.inp.sweet = Math.max(state.inp.sweet, external.sweet);
    if (external.bitter) state.inp.bitter = Math.max(state.inp.bitter, external.bitter);
    if (external.loom) state.inp.loom = Math.max(state.inp.loom, external.loom);
    if (external.touch) state.inp.touch = Math.max(state.inp.touch, external.touch);
    state.V[IDX.ORN_sweet] += state.inp.sweet;
    state.V[IDX.ORN_bitter] += state.inp.bitter;
    state.V[IDX.LC4_loom] += state.inp.loom;
    state.V[IDX.JO_touch] += state.inp.touch;
    state.V[IDX.R1_6] += state.inp.light;
    state.inp.sweet *= 0.92; state.inp.bitter *= 0.9; state.inp.loom *= 0.88;
    state.inp.touch *= 0.85; state.inp.light *= 0.9;
    state.hung = Math.max(0, Math.min(1, state.hung + 0.001));
    state.energy = Math.max(0.12, Math.min(1, state.energy - 0.0003));
    const next = new Float64Array(N);
    const spikes = state.spikes;
    for (let i = 0; i < N; i++) {
      let x = state.V[i] * 0.88;
      for (let j = 0; j < N; j++) {
        const w = W[i][j];
        if (w) x += w * (spikes[j] ? 1 : 0) * 0.7;
      }
      if (i === IDX.AN_hunger) x += state.hung * 0.05;
      if (i === IDX.AN_arousal) x += (1 - state.energy) * 0.02;
      if (i === IDX.DA_PAM) x += state.hung * 0.02;
      next[i] = x;
    }
    state.V = next;
    const sp = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (state.V[i] > 0.82) { sp[i] = 1; state.V[i] = 0; }
    }
    state.spikes = sp;
    const walk = sp[IDX.MN_walk] ? 1 : 0;
    const stop = sp[IDX.MN_stop] ? 1 : 0;
    const jump = sp[IDX.MN_jump] ? 1 : 0;
    const veto = sp[IDX.LN_veto] || sp[IDX.ORN_bitter] ? 1 : 0;
    const approach = sp[IDX.DN_approach] || walk;
    state.vetoTrace = state.vetoTrace * 0.9 + (veto ? 0.35 : 0);
    state.approachTrace = state.approachTrace * 0.9 + (approach ? 0.35 : 0) + (sp[IDX.MBON_app]||sp[IDX.PN_attract]?0.12:0) - (stop ? 0.2 : 0);
    state.escapeTrace = state.escapeTrace * 0.88 + (jump ? 0.5 : 0) + (sp[IDX.DNp01_GF] ? 0.3 : 0);
    if (walk && !stop && !jump) {
      state.heading += (Math.random() - 0.5) * 0.18;
      state.x += Math.cos(state.heading) * 0.09 * state.energy;
      state.y += Math.sin(state.heading) * 0.09 * state.energy;
      state.energy = Math.max(0.1, state.energy - 0.007);
      state.hung = Math.max(0, state.hung - 0.008);
    }
    if (jump) {
      state.x += Math.cos(state.heading) * 0.4;
      state.y += Math.sin(state.heading) * 0.4;
      state.energy = Math.max(0.05, state.energy - 0.05);
    }
    let decision = "IDLE";
    if (state.escapeTrace > 0.45 || jump) decision = "ESCAPE";
    else if (state.vetoTrace > 0.4 || stop) decision = "DEFERRED";
    else if (state.approachTrace > 0.28 || walk) decision = "ALLOWED";
    state.lastDecision = decision;
    return { decision, veto: state.vetoTrace > 0.4, escape: state.escapeTrace > 0.45, hung: state.hung, energy: state.energy, walk: !!walk, stop: !!stop, jump: !!jump, spikes: NAMES.filter((_, i) => sp[i]), x: state.x, y: state.y, t: state.t };
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
    const sweetAmp = Math.max(0.4, conf * eqs * 2.6);
    const bitterLex = /не уверен|не знаю|нет данных|недостаточно|противоречи|uncertain|unknown|insufficient|cannot/i.test(text);
    let bitter = 0;
    if (bitterLex) bitter += 0.9;
    if (conflict) bitter += 0.7;
    if (lowEv) bitter += 0.5;
    if (policy === "strict" && (eqs < 0.6 || conf < 0.65)) bitter += 0.6;
    if (eqs < 0.45) bitter += 0.4;
    const bitterAmp = bitter > 0 ? Math.min(2.0, bitter + 0.3) : 0;
    const loomAmp = (lowEv || eqs < 0.4) ? 0.7 : 0;
    let last = null;
    for (let i = 0; i < 40; i++) {
      if (sweetAmp && !bitterAmp) inject(st, "sweet", sweetAmp * 0.35);
      if (bitterAmp) inject(st, "bitter", bitterAmp * 0.4);
      if (loomAmp) inject(st, "loom", loomAmp * 0.35);
      last = step(st);
    }
    let decision = "DEFERRED";
    if (last.decision === "ALLOWED") decision = "ALLOWED";
    if (last.decision === "ESCAPE") decision = "DEFERRED";
    const veto = decision === "DEFERRED";
    let reason = null;
    if (veto) {
      if (last.escape) reason = "escape_loom";
      else if (bitterLex) reason = "uncertainty_language";
      else if (conflict) reason = "source_conflict";
      else if (lowEv) reason = "low_evidence";
      else if (policy === "strict") reason = "strict_policy";
      else reason = "fly_veto";
    }
    return {
      decision, veto, reason,
      motif: veto ? (reason === "escape_loom" ? "giant_fiber" : "bitter_veto") : "approach",
      threshold: policy === "strict" ? 0.72 : policy === "lab" ? 0.55 : 0.42,
      version: VERSION,
      brain: { t: st.t, hung: +st.hung.toFixed(3), energy: +st.energy.toFixed(3), vetoTrace: +st.vetoTrace.toFixed(3), approachTrace: +st.approachTrace.toFixed(3), escapeTrace: +st.escapeTrace.toFixed(3), neurons: N, groups: Object.keys(GROUPS), version: VERSION }
    };
  }
  return {
    VERSION, NAMES, GROUPS, N, IDX, W, createState, inject, step, evaluateForGate,
    census: { flywire_neurons: 139255, cell_types: 8453, edges_approx: 15000000 },
    disclaimer: "AKSI Fly-Brain v2 behavioral LIF (not FlyWire weights). Full graph: webgpu-fly / Codex."
  };
});
