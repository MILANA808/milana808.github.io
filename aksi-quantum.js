/** AKSI Quantum Engine v2.0.1-engine · 1..8 qubits · state-vector · © AKSI proprietary */
(function (G) {
  "use strict";
  var VER = "2.0.1-engine";
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var MAX_QUBITS = 8;
  var SQRT2_INV = 1 / Math.SQRT2;
  function C(re, im) { return { re: re || 0, im: im || 0 }; }
  function cadd(a, b) { return C(a.re + b.re, a.im + b.im); }
  function cmul(a, b) { return C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function cscale(a, s) { return C(a.re * s, a.im * s); }
  function cconj(a) { return C(a.re, -a.im); }
  function cabs2(a) { return a.re * a.re + a.im * a.im; }
  function cexp_i(theta) { return C(Math.cos(theta), Math.sin(theta)); }
  function dim(n) { return 1 << n; }
  function zeroState(n) {
    var d = dim(n), st = new Array(d), i;
    for (i = 0; i < d; i++) st[i] = C(0, 0);
    st[0] = C(1, 0);
    return st;
  }
  function cloneState(st) { return st.map(function (c) { return C(c.re, c.im); }); }
  function normalize(st) {
    var nrm = 0, i;
    for (i = 0; i < st.length; i++) nrm += cabs2(st[i]);
    nrm = Math.sqrt(nrm);
    if (nrm < 1e-15) return st;
    for (i = 0; i < st.length; i++) st[i] = cscale(st[i], 1 / nrm);
    return st;
  }
  function probs(st) { return st.map(function (c) { return cabs2(c); }); }
  function shannonEntropy(p) {
    var h = 0, i;
    for (i = 0; i < p.length; i++) if (p[i] > 1e-15) h -= p[i] * Math.log2(p[i]);
    return h;
  }
  function purityFromProbs(p) {
    var s = 0, i;
    for (i = 0; i < p.length; i++) s += p[i] * p[i];
    return s;
  }
  function apply1(st, n, target, u00, u01, u10, u11) {
    var d = st.length, step = 1 << target, out = new Array(d), i;
    for (i = 0; i < d; i++) out[i] = C(0, 0);
    for (i = 0; i < d; i++) {
      if ((i & step) !== 0) continue;
      var j = i | step, a = st[i], b = st[j];
      out[i] = cadd(cmul(u00, a), cmul(u01, b));
      out[j] = cadd(cmul(u10, a), cmul(u11, b));
    }
    return normalize(out);
  }
  function applyCtrl1(st, n, control, target, u00, u01, u10, u11) {
    var d = st.length, cbit = 1 << control, tbit = 1 << target, out = cloneState(st), i;
    for (i = 0; i < d; i++) {
      if ((i & cbit) === 0) continue;
      if ((i & tbit) !== 0) continue;
      var j = i | tbit, a = st[i], b = st[j];
      out[i] = cadd(cmul(u00, a), cmul(u01, b));
      out[j] = cadd(cmul(u10, a), cmul(u11, b));
    }
    return normalize(out);
  }
  var GATES = {
    I: [C(1, 0), C(0, 0), C(0, 0), C(1, 0)],
    X: [C(0, 0), C(1, 0), C(1, 0), C(0, 0)],
    Y: [C(0, 0), C(0, -1), C(0, 1), C(0, 0)],
    Z: [C(1, 0), C(0, 0), C(0, 0), C(-1, 0)],
    H: [C(SQRT2_INV, 0), C(SQRT2_INV, 0), C(SQRT2_INV, 0), C(-SQRT2_INV, 0)],
    S: [C(1, 0), C(0, 0), C(0, 0), C(0, 1)],
    T: [C(1, 0), C(0, 0), C(0, 0), cexp_i(Math.PI / 4)],
  };
  function Rx(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return [C(c, 0), C(0, -s), C(0, -s), C(c, 0)];
  }
  function Ry(theta) {
    var c = Math.cos(theta / 2), s = Math.sin(theta / 2);
    return [C(c, 0), C(-s, 0), C(s, 0), C(c, 0)];
  }
  function Rz(theta) {
    return [cexp_i(-theta / 2), C(0, 0), C(0, 0), cexp_i(theta / 2)];
  }
  function Phase(phi) {
    return [C(1, 0), C(0, 0), C(0, 0), cexp_i(phi)];
  }
  function Circuit(nQubits) {
    nQubits = nQubits | 0;
    if (nQubits < 1) nQubits = 1;
    if (nQubits > MAX_QUBITS) nQubits = MAX_QUBITS;
    this.n = nQubits;
    this.state = zeroState(nQubits);
    this.ops = [];
  }
  Circuit.prototype._gate1 = function (name, mat, q) {
    q = q | 0;
    if (q < 0 || q >= this.n) throw new Error("qubit out of range: " + q);
    this.state = apply1(this.state, this.n, q, mat[0], mat[1], mat[2], mat[3]);
    this.ops.push({ gate: name, qubits: [q] });
    return this;
  };
  Circuit.prototype.x = function (q) { return this._gate1("X", GATES.X, q); };
  Circuit.prototype.y = function (q) { return this._gate1("Y", GATES.Y, q); };
  Circuit.prototype.z = function (q) { return this._gate1("Z", GATES.Z, q); };
  Circuit.prototype.h = function (q) { return this._gate1("H", GATES.H, q); };
  Circuit.prototype.s = function (q) { return this._gate1("S", GATES.S, q); };
  Circuit.prototype.t = function (q) { return this._gate1("T", GATES.T, q); };
  Circuit.prototype.rx = function (q, theta) { return this._gate1("Rx", Rx(theta), q); };
  Circuit.prototype.ry = function (q, theta) { return this._gate1("Ry", Ry(theta), q); };
  Circuit.prototype.rz = function (q, theta) { return this._gate1("Rz", Rz(theta), q); };
  Circuit.prototype.p = function (q, phi) { return this._gate1("P", Phase(phi), q); };
  Circuit.prototype.cnot = function (control, target) {
    control |= 0; target |= 0;
    if (control === target) throw new Error("CNOT: control === target");
    this.state = applyCtrl1(this.state, this.n, control, target, GATES.X[0], GATES.X[1], GATES.X[2], GATES.X[3]);
    this.ops.push({ gate: "CNOT", qubits: [control, target] });
    return this;
  };
  Circuit.prototype.cz = function (control, target) {
    this.state = applyCtrl1(this.state, this.n, control, target, GATES.Z[0], GATES.Z[1], GATES.Z[2], GATES.Z[3]);
    this.ops.push({ gate: "CZ", qubits: [control, target] });
    return this;
  };
  Circuit.prototype.swap = function (a, b) {
    this.cnot(a, b); this.cnot(b, a); this.cnot(a, b);
    this.ops.push({ gate: "SWAP", qubits: [a, b] });
    return this;
  };
  Circuit.prototype.ccx = function (c0, c1, t) {
    c0 |= 0; c1 |= 0; t |= 0;
    var d = this.state.length, m0 = 1 << c0, m1 = 1 << c1, mt = 1 << t, out = cloneState(this.state), i;
    for (i = 0; i < d; i++) {
      if ((i & m0) && (i & m1) && !(i & mt)) {
        var j = i | mt, tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
    }
    this.state = normalize(out);
    this.ops.push({ gate: "CCX", qubits: [c0, c1, t] });
    return this;
  };
  Circuit.prototype.reset = function () { this.state = zeroState(this.n); this.ops = []; return this; };
  Circuit.prototype.probs = function () { return probs(this.state); };
  Circuit.prototype.entropy = function () { return shannonEntropy(this.probs()); };
  Circuit.prototype.purity = function () { return purityFromProbs(this.probs()); };
  Circuit.prototype.measure = function (rng) {
    rng = rng || Math.random;
    var p = this.probs(), r = rng(), acc = 0, i, outcome = 0;
    for (i = 0; i < p.length; i++) { acc += p[i]; if (r <= acc) { outcome = i; break; } }
    var collapsed = zeroState(this.n); collapsed[outcome] = C(1, 0); this.state = collapsed;
    var bits = ""; for (i = this.n - 1; i >= 0; i--) bits += (outcome >> i) & 1 ? "1" : "0";
    return { outcome: outcome, bits: bits, probs: p };
  };
  Circuit.prototype.sample = function (shots, rng) {
    shots = shots || 1024; rng = rng || Math.random;
    var p = this.probs(), counts = {}, i, k;
    for (i = 0; i < p.length; i++) counts[i] = 0;
    for (i = 0; i < shots; i++) {
      var r = rng(), acc = 0, hit = 0;
      for (k = 0; k < p.length; k++) { acc += p[k]; if (r <= acc) { hit = k; break; } }
      counts[hit]++;
    }
    var hist = [];
    for (k = 0; k < p.length; k++) {
      if (!counts[k]) continue;
      var bits = ""; for (i = this.n - 1; i >= 0; i--) bits += (k >> i) & 1 ? "1" : "0";
      hist.push({ bits: bits, count: counts[k], prob: counts[k] / shots, ideal: p[k] });
    }
    hist.sort(function (a, b) { return b.count - a.count; });
    return { shots: shots, histogram: hist, idealProbs: p };
  };
  Circuit.prototype.reducedQubit = function (q) {
    q |= 0; var p = this.state, d = p.length, rho = [C(0,0),C(0,0),C(0,0),C(0,0)], mask = 1 << q, i, j;
    for (i = 0; i < d; i++) for (j = 0; j < d; j++) {
      if ((i & ~mask) !== (j & ~mask)) continue;
      var bi = (i & mask) ? 1 : 0, bj = (j & mask) ? 1 : 0;
      rho[bi * 2 + bj] = cadd(rho[bi * 2 + bj], cmul(p[i], cconj(p[j])));
    }
    return [[rho[0], rho[1]], [rho[2], rho[3]]];
  };
  Circuit.prototype.bloch = function (q) {
    var rho = this.reducedQubit(q);
    var rx = 2 * rho[0][1].re, ry = 2 * rho[1][0].im, rz = rho[0][0].re - rho[1][1].re;
    return { x: +rx.toFixed(6), y: +ry.toFixed(6), z: +rz.toFixed(6), r: +Math.sqrt(rx*rx+ry*ry+rz*rz).toFixed(6) };
  };
  Circuit.prototype.circuitString = function () {
    var lines = [], i;
    for (i = 0; i < this.n; i++) lines.push("q" + i + ": ");
    this.ops.forEach(function (op) {
      if (op.qubits.length === 1) lines[op.qubits[0]] += "[" + op.gate + "]─";
      else if (op.gate === "CNOT") { lines[op.qubits[0]] += "•─"; lines[op.qubits[1]] += "⊕─"; }
      else op.qubits.forEach(function (q) { lines[q] += "[" + op.gate + "]─"; });
    });
    return lines.join("\n");
  };
  Circuit.prototype.summary = function () {
    return { n: this.n, ops: this.ops.length, entropy: +this.entropy().toFixed(4), purity: +this.purity().toFixed(4),
      probs: this.probs().map(function (x) { return +x.toFixed(4); }), circuit: this.circuitString() };
  };
  function create(n) { return new Circuit(n || 2); }
  function bell(pair) {
    pair = pair || "phi+";
    var c = create(2).h(0).cnot(0, 1);
    if (pair === "phi-") c.z(0);
    if (pair === "psi+") c.x(1);
    if (pair === "psi-") { c.x(1); c.z(0); }
    return c;
  }
  function chsh(shots) {
    shots = shots || 4096;
    function corr(angleA, angleB) {
      var c = bell("phi+"); c.ry(0, -angleA); c.ry(1, -angleB);
      var s = c.sample(shots), e = 0, total = 0;
      s.histogram.forEach(function (h) {
        var a = h.bits[0] === "1" ? 1 : -1, b = h.bits[1] === "1" ? 1 : -1;
        e += a * b * h.count; total += h.count;
      });
      return total ? e / total : 0;
    }
    var S = corr(0, Math.PI/4) + corr(0, -Math.PI/4) + corr(Math.PI/2, Math.PI/4) - corr(Math.PI/2, -Math.PI/4);
    return { S: +S.toFixed(3), classicalBound: 2, quantumBound: +(2*Math.SQRT2).toFixed(3), violates: Math.abs(S) > 2, shots: shots };
  }
  function hashU32(s) {
    var h = 2166136261; s = String(s || "") + "|" + RESONANCE_SEED;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shot(query) {
    var seed = hashU32(query), rng = mulberry32(seed), c = create(2);
    var th0 = ((seed % 1000) / 1000) * Math.PI, th1 = (((seed >>> 10) % 1000) / 1000) * Math.PI;
    c.h(0).h(1).cnot(0, 1);
    if (seed & 1) c.x(0);
    if (seed & 2) c.rz(0, th0);
    if (seed & 4) c.ry(1, th1);
    if (seed & 8) c.h(0);
    var p = c.probs();
    var bloch0 = c.bloch(0);
    var circ = c.circuitString();
    var nops = c.ops.length;
    var ent = shannonEntropy(p), pur = purityFromProbs(p);
    var m = c.measure(rng);
    var qcli = Math.min(1, ent / 2);
    var resonance = +((0.4 * qcli + 0.35 * (1 - Math.abs(pur - 0.5)) + 0.25 * (m.outcome / 3)).toFixed(3));
    return {
      version: VER, bits: m.bits, outcome: m.outcome,
      probs: p.map(function (x) { return +x.toFixed(3); }),
      entropy: +ent.toFixed(3), purity: +pur.toFixed(3), QCLI: +qcli.toFixed(3), resonance: resonance,
      circuit: circ, ops: nops, bloch0: bloch0,
      label: "AKSI-QEngine·2q", seed: RESONANCE_SEED, engine: VER,
    };
  }
  function drawBloch(canvas, bloch) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height, cx = w/2, cy = h/2, R = Math.min(w,h)*0.38;
    ctx.clearRect(0,0,w,h); ctx.fillStyle = "#0d0b14"; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = "rgba(167,139,250,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx,cy,R,R*0.28,0,0,Math.PI*2); ctx.strokeStyle = "rgba(167,139,250,0.2)"; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy+R); ctx.stroke();
    var bx = bloch.x*R, by = -bloch.y*R*0.28 - bloch.z*R;
    ctx.strokeStyle = "#a78bfa"; ctx.fillStyle = "#c4b5fd"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+bx,cy+by); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx+bx,cy+by,4,0,Math.PI*2); ctx.fill();
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>AKSI Quantum Engine · v'+VER+'</h2>'+
      '<p class="muted">State-vector · gates · shots · Bloch · CHSH</p>'+
      '<div class="row" style="gap:6px;flex-wrap:wrap">'+
      '<button type="button" class="btn p" data-q="bell">Bell Φ+</button>'+
      '<button type="button" class="btn" data-q="ghz">GHZ-3</button>'+
      '<button type="button" class="btn" data-q="chsh">CHSH</button>'+
      '<button type="button" class="btn" data-q="shot">shot</button>'+
      '<button type="button" class="btn" data-q="sample">1024 shots</button></div>'+
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">'+
      '<canvas id="qBloch" width="160" height="160" style="border-radius:12px;background:#0d0b14;border:1px solid rgba(167,139,250,.2)"></canvas>'+
      '<pre id="qOut" class="out" style="flex:1;min-width:180px;margin:0;max-height:220px">—</pre></div>'+
      '<pre id="qCirc" class="out" style="margin-top:10px;font-family:ui-monospace,monospace">circuit</pre></div>';
    function show(obj, circ) {
      var el = document.getElementById("qOut"); if (el) el.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
      var c = document.getElementById("qCirc"); if (c && circ) c.textContent = circ;
    }
    root.querySelectorAll("[data-q]").forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-q");
        if (k === "bell") { var c = bell("phi+"); drawBloch(document.getElementById("qBloch"), c.bloch(0)); show(c.summary(), c.circuitString()); }
        else if (k === "ghz") { var g = create(3).h(0).cnot(0,1).cnot(0,2); drawBloch(document.getElementById("qBloch"), g.bloch(0)); show(g.summary(), g.circuitString()); }
        else if (k === "chsh") show(chsh(2048), "CHSH");
        else if (k === "shot") { var s = shot("demo"); show(s, s.circuit); if (s.bloch0) drawBloch(document.getElementById("qBloch"), s.bloch0); }
        else if (k === "sample") { var cs = bell("phi+"); show(cs.sample(1024), cs.circuitString()); drawBloch(document.getElementById("qBloch"), cs.bloch(0)); }
      };
    });
    var boot = bell("phi+"); drawBloch(document.getElementById("qBloch"), boot.bloch(0)); show(boot.summary(), boot.circuitString());
  }
  G.AKSI_QUANTUM = {
    version: VER, MAX_QUBITS: MAX_QUBITS, RESONANCE_SEED: RESONANCE_SEED,
    create: create, Circuit: Circuit, bell: bell, chsh: chsh, shot: shot,
    measure: function (st) { var c = create(2); if (st) c.state = st; return c.measure(); },
    bellPair: function () { var c = bell("phi+"); return { state: c.state, probs: c.probs(), name: "Φ+", circuit: c.circuitString() }; },
    zeroState: function (n) { return zeroState(n || 2); },
    C: C, complex: C, mount: mount,
  };
})(typeof window !== "undefined" ? window : this);
