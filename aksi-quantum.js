/** AKSI Quantum Engine v3.0.0-ideal · answerGate · QFT · Grover · IBM optional · © AKSI */
(function (G) {
  "use strict";
  var VER = "3.0.0-ideal";
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var MAX_QUBITS = 10;
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
  function cloneState(st) {
    var o = new Array(st.length), i;
    for (i = 0; i < st.length; i++) o[i] = C(st[i].re, st[i].im);
    return o;
  }
  function normalize(st) {
    var nrm = 0, i;
    for (i = 0; i < st.length; i++) nrm += cabs2(st[i]);
    nrm = Math.sqrt(nrm);
    if (nrm < 1e-15) return st;
    for (i = 0; i < st.length; i++) st[i] = cscale(st[i], 1 / nrm);
    return st;
  }
  function probs(st) {
    var p = new Array(st.length), i;
    for (i = 0; i < st.length; i++) p[i] = cabs2(st[i]);
    return p;
  }
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
    X: [C(0, 0), C(1, 0), C(1, 0), C(0, 0)],
    Y: [C(0, 0), C(0, -1), C(0, 1), C(0, 0)],
    Z: [C(1, 0), C(0, 0), C(0, 0), C(-1, 0)],
    H: [C(SQRT2_INV, 0), C(SQRT2_INV, 0), C(SQRT2_INV, 0), C(-SQRT2_INV, 0)],
    S: [C(1, 0), C(0, 0), C(0, 0), C(0, 1)],
    T: [C(1, 0), C(0, 0), C(0, 0), cexp_i(Math.PI / 4)]
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
  function Circuit(nQubits) {
    this.n = Math.max(1, Math.min(MAX_QUBITS, nQubits | 0));
    this.state = zeroState(this.n);
    this.ops = [];
  }
  Circuit.prototype._gate1 = function (name, mat, q) {
    q = q | 0;
    if (q < 0 || q >= this.n) return this;
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
  Circuit.prototype.cnot = function (control, target) {
    this.state = applyCtrl1(this.state, this.n, control, target, GATES.X[0], GATES.X[1], GATES.X[2], GATES.X[3]);
    this.ops.push({ gate: "CX", qubits: [control, target] });
    return this;
  };
  Circuit.prototype.cz = function (control, target) {
    this.state = applyCtrl1(this.state, this.n, control, target, GATES.Z[0], GATES.Z[1], GATES.Z[2], GATES.Z[3]);
    this.ops.push({ gate: "CZ", qubits: [control, target] });
    return this;
  };
  Circuit.prototype.swap = function (a, b) { return this.cnot(a, b).cnot(b, a).cnot(a, b); };
  Circuit.prototype.ccx = function (c0, c1, t) {
    var st = this.state, d = st.length, out = cloneState(st), i;
    var m0 = 1 << c0, m1 = 1 << c1, mt = 1 << t;
    for (i = 0; i < d; i++) {
      if ((i & m0) && (i & m1) && !(i & mt)) {
        var j = i | mt, tmp = out[i]; out[i] = out[j]; out[j] = tmp;
      }
    }
    this.state = normalize(out);
    this.ops.push({ gate: "CCX", qubits: [c0, c1, t] });
    return this;
  };
  Circuit.prototype.probs = function () { return probs(this.state); };
  Circuit.prototype.entropy = function () { return shannonEntropy(this.probs()); };
  Circuit.prototype.purity = function () { return purityFromProbs(this.probs()); };
  Circuit.prototype.measure = function (rng) {
    rng = rng || Math.random;
    var p = this.probs(), r = rng(), acc = 0, i, bits = "", n = this.n, k;
    for (i = 0; i < p.length; i++) {
      acc += p[i];
      if (r <= acc || i === p.length - 1) {
        for (k = 0; k < n; k++) bits = ((i >> k) & 1) + bits;
        return { outcome: i, bits: bits, prob: p[i] };
      }
    }
    return { outcome: 0, bits: "0", prob: 1 };
  };
  Circuit.prototype.sample = function (shots, rng) {
    shots = shots || 1024; rng = rng || Math.random;
    var counts = {}, i, m, hist = [], key;
    for (i = 0; i < shots; i++) {
      m = this.measure(rng);
      counts[m.bits] = (counts[m.bits] || 0) + 1;
    }
    for (key in counts) hist.push({ bits: key, count: counts[key], p: counts[key] / shots });
    hist.sort(function (a, b) { return b.count - a.count; });
    return { shots: shots, histogram: hist, top: hist[0] };
  };
  Circuit.prototype.bloch = function (q) {
    var st = this.state, d = st.length, mask = 1 << q, i, j;
    var rho00 = C(0,0), rho01 = C(0,0), rho11 = C(0,0);
    for (i = 0; i < d; i++) {
      for (j = 0; j < d; j++) {
        if (((i ^ j) & ~mask) !== 0) continue;
        var bi = (i & mask) ? 1 : 0, bj = (j & mask) ? 1 : 0;
        var amp = cmul(st[i], cconj(st[j]));
        if (bi === 0 && bj === 0) rho00 = cadd(rho00, amp);
        else if (bi === 0 && bj === 1) rho01 = cadd(rho01, amp);
        else if (bi === 1 && bj === 1) rho11 = cadd(rho11, amp);
      }
    }
    var x = 2 * rho01.re, y = -2 * rho01.im, z = rho00.re - rho11.re;
    var r = Math.sqrt(x * x + y * y + z * z);
    return { x: +x.toFixed(6), y: +y.toFixed(6), z: +z.toFixed(6), r: +r.toFixed(6) };
  };
  Circuit.prototype.circuitString = function () {
    var lines = [], i, n = this.n;
    for (i = 0; i < n; i++) lines[i] = "q" + i + ": ";
    this.ops.forEach(function (op) {
      if (op.qubits.length === 1) lines[op.qubits[0]] += "[" + op.gate + "]─";
      else if (op.gate === "CX") { lines[op.qubits[0]] += "•─"; lines[op.qubits[1]] += "⊕─"; }
      else op.qubits.forEach(function (q) { lines[q] += "[" + op.gate + "]─"; });
    });
    return lines.join("\n");
  };
  Circuit.prototype.summary = function () {
    var p = this.probs();
    return { n: this.n, ops: this.ops.length, entropy: +shannonEntropy(p).toFixed(4), purity: +purityFromProbs(p).toFixed(4), probs: p.map(function (x) { return +x.toFixed(4); }), circuit: this.circuitString() };
  };
  Circuit.prototype.qft = function () {
    var n = this.n, i, j;
    for (i = 0; i < n; i++) {
      this.h(i);
      for (j = i + 1; j < n; j++) {
        var phi = Math.PI / Math.pow(2, j - i);
        this.state = applyCtrl1(this.state, n, j, i, C(1,0), C(0,0), C(0,0), cexp_i(phi));
        this.ops.push({ gate: "CP", qubits: [j, i] });
      }
    }
    for (i = 0; i < Math.floor(n / 2); i++) this.swap(i, n - 1 - i);
    return this;
  };
  Circuit.prototype.groverDiffuser = function () {
    var n = this.n, i;
    for (i = 0; i < n; i++) this.h(i).x(i);
    if (n === 2) this.cz(0, 1);
    else if (n >= 3) { this.h(n - 1); this.ccx(0, 1, n - 1); this.h(n - 1); }
    for (i = 0; i < n; i++) this.x(i).h(i);
    return this;
  };
  function create(n) { return new Circuit(n); }
  function bell(pair) {
    pair = pair || "phi+";
    var c = create(2).h(0).cnot(0, 1);
    if (pair === "phi-") c.z(0);
    if (pair === "psi+") c.x(1);
    if (pair === "psi-") { c.x(1); c.z(0); }
    return c;
  }
  function grover(n, iterations) {
    n = Math.max(2, Math.min(4, n || 2));
    iterations = iterations || Math.max(1, Math.floor(Math.PI / 4 * Math.sqrt(dim(n))));
    var c = create(n), i, k;
    for (i = 0; i < n; i++) c.h(i);
    for (k = 0; k < iterations; k++) {
      for (i = 0; i < n; i++) c.x(i);
      if (n === 2) c.cz(0, 1);
      else { c.h(n - 1); c.ccx(0, 1, n - 1); c.h(n - 1); }
      for (i = 0; i < n; i++) c.x(i);
      c.groverDiffuser();
    }
    return c;
  }
  function chsh(shots) {
    shots = shots || 4096;
    function corr(angleA, angleB) {
      var c = bell("phi+"); c.ry(0, -angleA); c.ry(1, -angleB);
      var s = c.sample(shots), e = 0, total = 0;
      s.histogram.forEach(function (h) {
        var a = h.bits[1] === "1" ? 1 : -1, b = h.bits[0] === "1" ? 1 : -1;
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
    var p = c.probs(), bloch0 = c.bloch(0), m = c.measure(rng);
    var ent = shannonEntropy(p), pur = purityFromProbs(p);
    var qcli = Math.min(1, Math.max(0, 0.35 * (ent / 2) + 0.35 * (1 - Math.abs(pur - 0.5)) * 2 + 0.3 * bloch0.r));
    var resonance = +((0.4 * qcli + 0.35 * (1 - Math.abs(pur - 0.5)) + 0.25 * ((m.outcome % 4) / 3)).toFixed(3));
    return { version: VER, bits: m.bits, outcome: m.outcome, probs: p.map(function (x) { return +x.toFixed(4); }), entropy: +ent.toFixed(3), purity: +pur.toFixed(3), QCLI: +qcli.toFixed(3), qcli: +qcli.toFixed(3), resonance: resonance, circuit: c.circuitString(), ops: c.ops.length, bloch0: bloch0, label: "AKSI-QEngine·2q", seed: RESONANCE_SEED, engine: VER, backend: "local-ideal" };
  }
  function answerGate(query, answer) {
    var text = String(query || "") + "||" + String(answer || "");
    var seed = hashU32(text), rng = mulberry32(seed), c = create(3);
    var a0 = ((seed % 1000) / 1000) * Math.PI;
    var a1 = (((seed >>> 8) % 1000) / 1000) * Math.PI;
    var a2 = (((seed >>> 16) % 1000) / 1000) * Math.PI;
    c.h(0).h(1).h(2);
    c.ry(0, a0).ry(1, a1).ry(2, a2);
    c.cnot(0, 1).cnot(1, 2).cnot(0, 2);
    c.rz(0, a0 * 0.5).rz(1, a1 * 0.5).rz(2, a2 * 0.5);
    c.cnot(2, 1).cnot(1, 0);
    var p = c.probs(), ent = shannonEntropy(p), pur = purityFromProbs(p), m = c.measure(rng), bloch0 = c.bloch(0);
    var qcli = Math.min(1, Math.max(0, 0.25 * (ent / 3) + 0.25 * pur + 0.25 * bloch0.r + 0.25 * (1 - Math.abs(0.5 - p[0]))));
    var resonance = +((0.45 * qcli + 0.3 * pur + 0.25 * (m.prob || 0.25)).toFixed(3));
    var band = qcli >= 0.72 ? "high" : qcli >= 0.45 ? "mid" : "low";
    return { version: VER, backend: "local-ideal", bits: m.bits, outcome: m.outcome, prob: +(m.prob || 0).toFixed(4), entropy: +ent.toFixed(3), purity: +pur.toFixed(3), QCLI: +qcli.toFixed(3), qcli: +qcli.toFixed(3), resonance: resonance, band: band, circuit: c.circuitString(), ops: c.ops.length, bloch0: bloch0, nQubits: 3, label: "answerGate·3q", seed: RESONANCE_SEED, engine: VER };
  }
  function sealAnswer(query, answer) {
    var qx = answerGate(query, answer);
    return { text: String(answer || ""), meta: "Q" + qx.QCLI + " · R" + qx.resonance + " · " + qx.bits + " · " + qx.backend, quantum: qx, QCLI: qx.QCLI, resonance: qx.resonance };
  }
  function getIbmToken() { try { return localStorage.getItem("aksi_ibm_token") || ""; } catch (e) { return ""; } }
  function setIbmToken(t) { try { if (t) localStorage.setItem("aksi_ibm_token", String(t).trim()); else localStorage.removeItem("aksi_ibm_token"); return true; } catch (e) { return false; } }
  function runHardware(query) {
    var token = getIbmToken();
    var netOn = G.AKSI_WEB && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled();
    var local = shot(query); local.backend = "local-ideal";
    if (!token || !netOn) {
      local.note = !token ? "no IBM token (Lab→Quantum)" : "network off";
      return Promise.resolve(local);
    }
    return fetch("https://runtime-us-east.quantum-computing.ibm.com/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ program_id: "sampler", backend: "ibm_kyiv", params: { circuit: "h q[0]; cx q[0],q[1]; measure", shots: 128, query: String(query || "").slice(0, 80) } })
    }).then(function (r) {
      if (!r.ok) throw new Error("IBM HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      local.backend = "ibm-runtime"; local.ibm = { id: j.id || j.job_id || null }; local.note = "submitted to IBM Quantum"; return local;
    }).catch(function (e) {
      local.backend = "local-ideal"; local.note = "IBM unreachable: " + String(e.message || e) + " — local ideal"; return local;
    });
  }
  function drawBloch(canvas, bloch) {
    if (!canvas || !bloch) return;
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(167,139,250,.35)";
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    var px = cx + (bloch.x || 0) * R, py = cy - (bloch.z || 0) * R;
    ctx.strokeStyle = "#c4b5fd"; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = "#a78bfa"; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>Quantum Engine v' + VER + '</h2><p class="muted">Локальный идеальный симулятор · answerGate · IBM optional</p>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">' +
      '<button type="button" class="btn primary" data-q="bell">Bell</button>' +
      '<button type="button" class="btn" data-q="chsh">CHSH</button>' +
      '<button type="button" class="btn" data-q="qft">QFT-3</button>' +
      '<button type="button" class="btn" data-q="grover">Grover</button>' +
      '<button type="button" class="btn" data-q="gate">answerGate</button>' +
      '<button type="button" class="btn" data-q="hw">IBM/local</button></div>' +
      '<input type="password" id="qToken" placeholder="IBM Quantum API token" style="margin-top:10px">' +
      '<button type="button" class="btn" id="qSaveToken" style="margin-top:8px">Сохранить token</button>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">' +
      '<canvas id="qBloch" width="160" height="160" style="border-radius:12px;background:#0d0b14;border:1px solid rgba(167,139,250,.2)"></canvas>' +
      '<pre id="qOut" class="out" style="flex:1;min-width:180px;margin:0;max-height:240px">—</pre></div>' +
      '<pre id="qCirc" class="out" style="margin-top:10px">circuit</pre></div>';
    function show(obj, circ) {
      var el = document.getElementById("qOut"); if (el) el.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
      var c = document.getElementById("qCirc"); if (c && circ) c.textContent = circ;
    }
    var saveBtn = document.getElementById("qSaveToken");
    if (saveBtn) saveBtn.onclick = function () {
      var v = (document.getElementById("qToken") || {}).value || "";
      setIbmToken(v); show({ ok: true, hasToken: !!getIbmToken() });
    };
    root.querySelectorAll("[data-q]").forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-q");
        if (k === "bell") { var c = bell("phi+"); drawBloch(document.getElementById("qBloch"), c.bloch(0)); show(c.summary(), c.circuitString()); }
        else if (k === "chsh") show(chsh(2048), "CHSH");
        else if (k === "qft") { var qf = create(3).x(0).qft(); drawBloch(document.getElementById("qBloch"), qf.bloch(0)); show(qf.summary(), qf.circuitString()); }
        else if (k === "grover") { var gr = grover(2, 1); drawBloch(document.getElementById("qBloch"), gr.bloch(0)); show(gr.summary(), gr.circuitString()); }
        else if (k === "gate") { var ag = answerGate("Кто ты?", "Я АКСИ"); show(ag, ag.circuit); if (ag.bloch0) drawBloch(document.getElementById("qBloch"), ag.bloch0); }
        else if (k === "hw") { show("running…"); runHardware("ping").then(function (r) { show(r, r.circuit || ""); if (r.bloch0) drawBloch(document.getElementById("qBloch"), r.bloch0); }); }
      };
    });
    var boot = bell("phi+"); drawBloch(document.getElementById("qBloch"), boot.bloch(0)); show(boot.summary(), boot.circuitString());
  }
  G.AKSI_QUANTUM = {
    version: VER, MAX_QUBITS: MAX_QUBITS, RESONANCE_SEED: RESONANCE_SEED,
    create: create, Circuit: Circuit, bell: bell, chsh: chsh, shot: shot,
    answerGate: answerGate, sealAnswer: sealAnswer, grover: grover,
    runHardware: runHardware, getIbmToken: getIbmToken, setIbmToken: setIbmToken,
    measure: function () { return create(2).measure(); },
    bellPair: function () { var c = bell("phi+"); return { probs: c.probs(), name: "Φ+", circuit: c.circuitString() }; },
    zeroState: function (n) { return zeroState(n || 2); },
    C: C, complex: C, mount: mount
  };
})(typeof window !== "undefined" ? window : this);
