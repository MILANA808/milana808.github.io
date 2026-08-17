/** AKSI Quantum Core — statevector simulator + optimizer */
(function (global) {
  "use strict";
  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function abs2(a) { return a.re * a.re + a.im * a.im; }
  var ISQ = 1 / Math.SQRT2;

  var GATES = {
    H: [[C(ISQ), C(ISQ)], [C(ISQ), C(-ISQ)]],
    X: [[C(0), C(1)], [C(1), C(0)]],
    Y: [[C(0), C(0, -1)], [C(0, 1), C(0)]],
    Z: [[C(1), C(0)], [C(0), C(-1)]],
    S: [[C(1), C(0)], [C(0), C(0, 1)]],
    T: [[C(1), C(0)], [C(0), C(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]],
    I: [[C(1), C(0)], [C(0), C(1)]]
  };

  function zeros(n) {
    var psi = [];
    for (var i = 0; i < n; i++) psi.push(C());
    return psi;
  }

  function initState(nQ) {
    var psi = zeros(1 << nQ);
    psi[0] = C(1);
    return psi;
  }

  function apply1(psi, nQ, q, M) {
    var dim = 1 << nQ;
    var next = zeros(dim);
    var bit = 1 << (nQ - 1 - q);
    for (var i = 0; i < dim; i++) {
      if (i & bit) continue;
      var j = i | bit;
      var a0 = psi[i], a1 = psi[j];
      next[i] = cadd(cmul(M[0][0], a0), cmul(M[0][1], a1));
      next[j] = cadd(cmul(M[1][0], a0), cmul(M[1][1], a1));
    }
    return next;
  }

  function applyCNOT(psi, nQ, c, t) {
    var dim = 1 << nQ;
    var next = zeros(dim);
    var cb = 1 << (nQ - 1 - c);
    var tb = 1 << (nQ - 1 - t);
    for (var i = 0; i < dim; i++) {
      if (i & cb) next[i ^ tb] = psi[i];
      else next[i] = psi[i];
    }
    return next;
  }

  function applySWAP(psi, nQ, a, b) {
    var dim = 1 << nQ;
    var next = zeros(dim);
    var ba = 1 << (nQ - 1 - a);
    var bb = 1 << (nQ - 1 - b);
    for (var i = 0; i < dim; i++) {
      var j = i;
      var va = (i & ba) ? 1 : 0;
      var vb = (i & bb) ? 1 : 0;
      if (va !== vb) j = i ^ ba ^ bb;
      next[j] = psi[i];
    }
    return next;
  }

  function applyToffoli(psi, nQ, c1, c2, t) {
    var dim = 1 << nQ;
    var next = zeros(dim);
    var b1 = 1 << (nQ - 1 - c1);
    var b2 = 1 << (nQ - 1 - c2);
    var bt = 1 << (nQ - 1 - t);
    for (var i = 0; i < dim; i++) {
      if ((i & b1) && (i & b2)) next[i ^ bt] = psi[i];
      else next[i] = psi[i];
    }
    return next;
  }

  function applyGate(psi, nQ, gate) {
    var g = (gate.g || gate.gate || "").toUpperCase();
    var q = gate.q != null ? gate.q : gate.target;
    var c = gate.c != null ? gate.c : gate.control;
    if (g === "CNOT" || g === "CX") return applyCNOT(psi, nQ, c, q);
    if (g === "SWAP") return applySWAP(psi, nQ, c, q);
    if (g === "TOFFOLI" || g === "CCX") return applyToffoli(psi, nQ, gate.c1, gate.c2, q);
    if (GATES[g]) return apply1(psi, nQ, q, GATES[g]);
    return psi;
  }

  function runCircuit(nQ, gates) {
    var psi = initState(nQ);
    for (var i = 0; i < gates.length; i++) psi = applyGate(psi, nQ, gates[i]);
    return psi;
  }

  function probs(psi) {
    return psi.map(abs2);
  }

  function measure(psi) {
    var p = probs(psi);
    var r = Math.random(), acc = 0, idx = 0;
    for (var i = 0; i < p.length; i++) {
      acc += p[i];
      if (r <= acc) { idx = i; break; }
    }
    return { outcome: idx, bits: idx.toString(2).padStart(Math.log2(p.length) | 0, "0"), probs: p };
  }

  function runAndMeasure(nQ, gates) {
    var psi = runCircuit(nQ, gates);
    var m = measure(psi);
    return { statevector: psi, probabilities: m.probs, measurement: m };
  }

  function optimizeCircuit(gates) {
    var g = gates.map(function (x) { return Object.assign({}, x); });
    var changed = true, steps = [];
    function key(x) {
      return (x.g || "") + ":" + (x.q != null ? x.q : "") + ":" + (x.c != null ? x.c : "") + ":" + (x.c1 != null ? x.c1 : "") + ":" + (x.c2 != null ? x.c2 : "");
    }
    var selfInv = { H: 1, X: 1, Y: 1, Z: 1, CNOT: 1, CX: 1, SWAP: 1 };
    while (changed) {
      changed = false;
      for (var i = 0; i < g.length - 1; i++) {
        var a = g[i], b = g[i + 1];
        var ga = (a.g || "").toUpperCase(), gb = (b.g || "").toUpperCase();
        if (selfInv[ga] && ga === gb && key(a) === key(b)) {
          steps.push("Удалена пара " + ga + " (тождество)");
          g.splice(i, 2);
          changed = true;
          break;
        }
        if (ga === "I") { steps.push("Удалён I"); g.splice(i, 1); changed = true; break; }
      }
    }
    return { gates: g, removed: gates.length - g.length, steps: steps };
  }

  function blochFromQubit(psi, nQ, q) {
    var dim = 1 << nQ;
    var bit = 1 << (nQ - 1 - q);
    var z = 0, x = 0, y = 0;
    for (var i = 0; i < dim; i++) {
      var p = abs2(psi[i]);
      z += (i & bit) ? -p : p;
    }
    for (var i = 0; i < dim; i++) {
      var j = i ^ bit;
      if (i > j) continue;
      var a = psi[i], b = psi[j];
      var re = a.re * b.re + a.im * b.im;
      var im = a.im * b.re - a.re * b.im;
      x += 2 * re;
      y += 2 * im;
    }
    var r = Math.sqrt(x * x + y * y + z * z) || 1;
    return { x: x / r, y: y / r, z: z / r, theta: Math.acos(Math.max(-1, Math.min(1, z / r))), phi: Math.atan2(y, x) };
  }

  global.QuantumCore = {
    C: C, GATES: GATES, initState: initState, runCircuit: runCircuit,
    runAndMeasure: runAndMeasure, probs: probs, optimizeCircuit: optimizeCircuit,
    blochFromQubit: blochFromQubit, applyGate: applyGate
  };
})(typeof window !== "undefined" ? window : globalThis);
