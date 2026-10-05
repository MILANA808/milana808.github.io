/**
 * AKSI Exocortex Core v1.0
 * Mathematically grounded digital exocortex:
 * - State vector S in R^D (experience embedding)
 * - Quantum seed for non-deterministic choice
 * - Permit gate (default-deny)
 * - Receipt chain (Web Crypto ECDSA P-256) + hash chain
 * Invariants: ||S||≈1, Σp=1, receipt chain links, verify() offline
 */
(function (G) {
  "use strict";
  var D = 32;
  var VERSION = "exocortex-1.0.0";

  function zeros(n) { var a = new Float64Array(n); return a; }
  function clone(a) { return new Float64Array(a); }
  function norm(v) {
    var s = 0, i;
    for (i = 0; i < v.length; i++) s += v[i] * v[i];
    s = Math.sqrt(s) || 1;
    for (i = 0; i < v.length; i++) v[i] /= s;
    return v;
  }
  function dot(a, b) {
    var s = 0, i, n = Math.min(a.length, b.length);
    for (i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  }
  function addScaled(a, b, k) {
    var i, out = clone(a);
    for (i = 0; i < out.length; i++) out[i] += (b[i] || 0) * k;
    return norm(out);
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0, i, t = String(s);
    for (i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  async function sha256(text) {
    var buf = new TextEncoder().encode(String(text));
    var dig = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(dig)).map(function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }

  function qZeros(n) {
    var a = new Float64Array((1 << n) * 2);
    a[0] = 1;
    return a;
  }
  function qNorm(sv, dim) {
    var s = 0, i;
    for (i = 0; i < dim; i++) s += sv[2 * i] * sv[2 * i] + sv[2 * i + 1] * sv[2 * i + 1];
    s = Math.sqrt(s) || 1;
    for (i = 0; i < dim; i++) { sv[2 * i] /= s; sv[2 * i + 1] /= s; }
    return sv;
  }
  function qH(sv, q, n) {
    var dim = 1 << n, inv = Math.SQRT1_2, step = 1 << q, out = new Float64Array(sv);
    var base, i, i0, i1, a0r, a0i, a1r, a1i;
    for (base = 0; base < dim; base += step << 1) {
      for (i = 0; i < step; i++) {
        i0 = base + i; i1 = base + i + step;
        a0r = sv[2 * i0]; a0i = sv[2 * i0 + 1]; a1r = sv[2 * i1]; a1i = sv[2 * i1 + 1];
        out[2 * i0] = inv * (a0r + a1r); out[2 * i0 + 1] = inv * (a0i + a1i);
        out[2 * i1] = inv * (a0r - a1r); out[2 * i1 + 1] = inv * (a0i - a1i);
      }
    }
    return out;
  }
  function qRY(sv, q, theta, n) {
    var dim = 1 << n, c = Math.cos(theta / 2), si = Math.sin(theta / 2), step = 1 << q;
    var out = new Float64Array(sv), base, i, i0, i1, a0r, a0i, a1r, a1i;
    for (base = 0; base < dim; base += step << 1) {
      for (i = 0; i < step; i++) {
        i0 = base + i; i1 = base + i + step;
        a0r = sv[2 * i0]; a0i = sv[2 * i0 + 1]; a1r = sv[2 * i1]; a1i = sv[2 * i1 + 1];
        out[2 * i0] = c * a0r - si * a1r; out[2 * i0 + 1] = c * a0i - si * a1i;
        out[2 * i1] = si * a0r + c * a1r; out[2 * i1 + 1] = si * a0i + c * a1i;
      }
    }
    return out;
  }
  function qCNOT(sv, c, t, n) {
    var dim = 1 << n, out = new Float64Array(sv), seen = new Uint8Array(dim);
    var cm = 1 << c, tm = 1 << t, i, j;
    for (i = 0; i < dim; i++) {
      if (seen[i]) continue;
      if (i & cm) {
        j = i ^ tm;
        out[2 * i] = sv[2 * j]; out[2 * i + 1] = sv[2 * j + 1];
        out[2 * j] = sv[2 * i]; out[2 * j + 1] = sv[2 * i + 1];
        seen[i] = seen[j] = 1;
      }
    }
    return out;
  }
  function quantumCollapse(seedText) {
    var n = 4, dim = 1 << n;
    var h = 2166136261 >>> 0, s = String(seedText), i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    var sv = qZeros(n);
    for (i = 0; i < n; i++) {
      sv = qH(sv, i, n);
      sv = qRY(sv, i, ((h >>> (i * 5)) % 1000) / 1000 * Math.PI, n);
    }
    for (i = 0; i < n - 1; i++) sv = qCNOT(sv, i, i + 1, n);
    sv = qNorm(sv, dim);
    var p = new Float64Array(dim), sum = 0, e = 0;
    for (i = 0; i < dim; i++) {
      p[i] = sv[2 * i] * sv[2 * i] + sv[2 * i + 1] * sv[2 * i + 1];
      sum += p[i];
    }
    for (i = 0; i < dim; i++) if (p[i] > 1e-15) e -= p[i] * Math.log(p[i]) / Math.LN2;
    var r = Math.random(), acc = 0, idx = dim - 1;
    for (i = 0; i < dim; i++) { acc += p[i]; if (r <= acc) { idx = i; break; } }
    return { n: n, idx: idx, bits: ("0000" + idx.toString(2)).slice(-4), entropy: e, sumP: sum, seed: h >>> 0 };
  }

  function embed(text) {
    var v = zeros(D), t = String(text || "").toLowerCase(), i, j, h;
    for (i = 0; i < t.length; i++) {
      h = (t.charCodeAt(i) * 131 + i * 17) % D;
      v[h] += 1;
      if (i + 1 < t.length) {
        j = ((t.charCodeAt(i) << 8) + t.charCodeAt(i + 1)) % D;
        v[j] += 0.5;
      }
    }
    return norm(v);
  }

  function Exocortex(opts) {
    opts = opts || {};
    this.dim = D;
    this.S = zeros(D);
    this.S[0] = 1;
    this.trace = [];
    this.receipts = [];
    this.mandate = opts.mandate || {
      allowed_actions: ["observe", "recall", "plan", "report", "quantum_seed"],
      denied_actions: ["spend", "delete_all", "exfiltrate"],
      max_steps: 64
    };
    this.keys = null;
    this.goal = null;
    this.stepCount = 0;
  }

  Exocortex.prototype.initKeys = async function () {
    var pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
    this.keys = pair;
    var pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
    return { jwk: pub, alg: "ECDSA-P256" };
  };

  Exocortex.prototype.observe = function (humanText) {
    var emb = embed(humanText);
    this.S = addScaled(this.S, emb, 0.35);
    var ev = {
      type: "human_observe",
      t: Date.now(),
      text: String(humanText).slice(0, 2000),
      resonance: dot(this.S, emb),
      S_hash: hashStr(Array.from(this.S).map(function (x) { return x.toFixed(5); }).join(","))
    };
    this.trace.push(ev);
    return ev;
  };

  Exocortex.prototype.setGoal = function (goal) {
    this.goal = String(goal || "").slice(0, 2000);
    var emb = embed(this.goal);
    this.S = addScaled(this.S, emb, 0.5);
    var ev = { type: "goal", t: Date.now(), text: this.goal, S_hash: hashStr(Array.from(this.S).map(function (x) { return x.toFixed(5); }).join(",")) };
    this.trace.push(ev);
    return ev;
  };

  Exocortex.prototype.permit = function (action, payload) {
    action = String(action || "");
    if (this.mandate.denied_actions.indexOf(action) >= 0) {
      return { allow: false, reason: "DENIED_BY_MANDATE:" + action };
    }
    if (this.mandate.allowed_actions.indexOf(action) < 0) {
      return { allow: false, reason: "NOT_IN_ALLOWLIST:" + action };
    }
    if (this.stepCount >= this.mandate.max_steps) {
      return { allow: false, reason: "MAX_STEPS" };
    }
    if (this.goal && payload) {
      var r = Math.abs(dot(this.S, embed(String(payload))));
      if (r < 0.02 && action !== "observe" && action !== "quantum_seed") {
        return { allow: false, reason: "LOW_RESONANCE:" + r.toFixed(4) };
      }
    }
    return { allow: true, reason: "OK" };
  };

  Exocortex.prototype.issueReceipt = async function (action, payload, permit, quantum) {
    if (!this.keys) await this.initKeys();
    var prev = this.receipts.length ? this.receipts[this.receipts.length - 1].id : "GENESIS";
    var body = {
      v: VERSION,
      t: new Date().toISOString(),
      action: action,
      payload: String(payload || "").slice(0, 1500),
      permit: permit,
      quantum: quantum || null,
      prev: prev,
      S_hash: hashStr(Array.from(this.S).map(function (x) { return x.toFixed(5); }).join(",")),
      step: this.stepCount
    };
    var canonical = JSON.stringify(body);
    var id = await sha256(canonical);
    body.id = id;
    var sigBuf = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      this.keys.privateKey,
      new TextEncoder().encode(id)
    );
    body.signature = Array.from(new Uint8Array(sigBuf)).map(function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
    this.receipts.push(body);
    this.stepCount += 1;
    this.trace.push({ type: "receipt", t: Date.now(), id: id, action: action });
    return body;
  };

  Exocortex.prototype.verifyReceipt = async function (receipt) {
    if (!this.keys || !receipt || !receipt.id || !receipt.signature) return { ok: false, reason: "missing" };
    var hex = receipt.signature;
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    var ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      this.keys.publicKey,
      bytes,
      new TextEncoder().encode(receipt.id)
    );
    var idx = this.receipts.indexOf(receipt);
    var chainOk = true;
    if (idx > 0) chainOk = receipt.prev === this.receipts[idx - 1].id;
    if (idx === 0) chainOk = receipt.prev === "GENESIS";
    return { ok: ok && chainOk, sig: ok, chain: chainOk };
  };

  Exocortex.prototype.verifyChain = async function () {
    var results = [];
    for (var i = 0; i < this.receipts.length; i++) {
      results.push(await this.verifyReceipt(this.receipts[i]));
    }
    var all = results.every(function (r) { return r.ok; });
    return { ok: all, count: results.length, results: results };
  };

  Exocortex.prototype.step = async function (action, payload) {
    var q = quantumCollapse(action + "|" + payload + "|" + this.stepCount);
    var perm = this.permit(action, payload);
    if (!perm.allow) {
      var blocked = await this.issueReceipt("BLOCK:" + action, payload, perm, q);
      return { status: "BLOCK", receipt: blocked, quantum: q, permit: perm };
    }
    if (payload) this.S = addScaled(this.S, embed(payload), 0.2);
    var rec = await this.issueReceipt(action, payload, perm, q);
    return { status: "ALLOW", receipt: rec, quantum: q, permit: perm };
  };

  Exocortex.prototype.snapshot = function () {
    var s = 0, i;
    for (i = 0; i < this.S.length; i++) s += this.S[i] * this.S[i];
    return {
      version: VERSION,
      dim: this.dim,
      goal: this.goal,
      steps: this.stepCount,
      receipts: this.receipts.length,
      normS: Math.sqrt(s),
      S_preview: Array.from(this.S).slice(0, 8).map(function (x) { return +x.toFixed(4); }),
      trace_len: this.trace.length
    };
  };

  Exocortex.prototype.exportJSON = function () {
    return {
      version: VERSION,
      goal: this.goal,
      mandate: this.mandate,
      S: Array.from(this.S),
      trace: this.trace,
      receipts: this.receipts,
      snapshot: this.snapshot()
    };
  };

  G.AKSI_EXOCORTEX = {
    version: VERSION,
    Exocortex: Exocortex,
    embed: embed,
    quantumCollapse: quantumCollapse,
    hashStr: hashStr
  };
})(typeof window !== "undefined" ? window : globalThis);
