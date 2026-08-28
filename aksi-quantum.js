/**
 * AKSI Quantum Simulator v1 — 2-qubit engine for the answer path
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-qsim";
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  function complex(re, im) { return { re: re || 0, im: im || 0 }; }
  function cadd(a, b) { return complex(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cabs2(a) { return a.re * a.re + a.im * a.im; }
  function cscale(a, s) { return complex(a.re * s, a.im * s); }
  function zeroState() { return [complex(1, 0), complex(0, 0), complex(0, 0), complex(0, 0)]; }
  function normalize(st) {
    var n = 0, i; for (i = 0; i < 4; i++) n += cabs2(st[i]);
    n = Math.sqrt(n) || 1;
    return st.map(function (c) { return cscale(c, 1 / n); });
  }
  function applyU(st, U) {
    var out = [complex(), complex(), complex(), complex()], i, j;
    for (i = 0; i < 4; i++) {
      var s = complex();
      for (j = 0; j < 4; j++) s = cadd(s, cmul(U[i][j], st[j]));
      out[i] = s;
    }
    return normalize(out);
  }
  var H1 = 1 / Math.SQRT2, I = complex(1, 0), Z = complex(0, 0);
  function gateH0(st) {
    return applyU(st, [[complex(H1), complex(H1), Z, Z], [complex(H1), complex(-H1), Z, Z], [Z, Z, complex(H1), complex(H1)], [Z, Z, complex(H1), complex(-H1)]]);
  }
  function gateH1(st) {
    return applyU(st, [[complex(H1), Z, complex(H1), Z], [Z, complex(H1), Z, complex(H1)], [complex(H1), Z, complex(-H1), Z], [Z, complex(H1), Z, complex(-H1)]]);
  }
  function gateX0(st) {
    return applyU(st, [[Z, I, Z, Z], [I, Z, Z, Z], [Z, Z, Z, I], [Z, Z, I, Z]]);
  }
  function gateCNOT(st) {
    return applyU(st, [[I, Z, Z, Z], [Z, I, Z, Z], [Z, Z, Z, I], [Z, Z, I, Z]]);
  }
  function probs(st) { return st.map(function (c) { return cabs2(c); }); }
  function measure(st) {
    var p = probs(st), r = Math.random(), acc = 0, i;
    for (i = 0; i < 4; i++) {
      acc += p[i];
      if (r <= acc) {
        var collapsed = [complex(), complex(), complex(), complex()];
        collapsed[i] = complex(1, 0);
        return { outcome: i, bits: ((i >> 1) & 1) + "" + (i & 1), probs: p, state: collapsed };
      }
    }
    return { outcome: 0, bits: "00", probs: p, state: st };
  }
  function hashAngles(s) {
    var h = 2166136261;
    s = String(s || "") + "|" + RESONANCE_SEED;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    var u = (h >>> 0) / 4294967296, v = ((h * 2654435761) >>> 0) / 4294967296;
    return { theta: u * Math.PI, phi: v * 2 * Math.PI, seed: h >>> 0 };
  }
  function encodeQuery(st, q) {
    var a = hashAngles(q);
    st = gateH0(st); st = gateH1(st); st = gateCNOT(st);
    if (a.seed & 1) st = gateX0(st);
    if (a.seed & 2) st = gateH0(st);
    return { state: normalize(st), angles: a };
  }
  function shot(query) {
    var prep = encodeQuery(zeroState(), query);
    var m = measure(prep.state);
    var p = m.probs, purity = 0, entropy = 0, i;
    for (i = 0; i < 4; i++) purity += p[i] * p[i];
    for (i = 0; i < 4; i++) if (p[i] > 1e-12) entropy -= p[i] * Math.log2(p[i]);
    var qcli = Math.min(1, entropy / 2);
    var resonance = Math.round((0.4 * qcli + 0.35 * (1 - Math.abs(purity - 0.5)) + 0.25 * (m.outcome / 3)) * 1000) / 1000;
    return {
      version: VER, bits: m.bits, outcome: m.outcome,
      probs: p.map(function (x) { return Math.round(x * 1000) / 1000; }),
      entropy: Math.round(entropy * 1000) / 1000, purity: Math.round(purity * 1000) / 1000,
      QCLI: Math.round(qcli * 1000) / 1000, resonance: resonance, angles: prep.angles,
      label: "AKSI-QSim·2q", seed: RESONANCE_SEED,
    };
  }
  function bellPair() {
    var st = zeroState(); st = gateH1(st); st = gateCNOT(st);
    return { state: st, probs: probs(st), name: "Φ+" };
  }
  G.AKSI_QUANTUM = { version: VER, shot: shot, measure: measure, bellPair: bellPair, zeroState: zeroState, RESONANCE_SEED: RESONANCE_SEED, encodeQuery: encodeQuery };
})(typeof window !== "undefined" ? window : this);
