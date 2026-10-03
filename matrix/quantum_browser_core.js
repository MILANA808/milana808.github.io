/**
 * AKSI MATRIX — quantum_browser_core.js v2
 * Pure-JS statevector (4–6 qubits). Hash → RX/RY chaos → CZ/CX → entropy → collapse.
 * No NPM, no server.
 */
(function (global) {
  "use strict";

  function clampQubits(n) {
    n = n | 0;
    if (n < 4) n = 4;
    if (n > 6) n = 6;
    return n;
  }

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function hashStream(str, need) {
    var out = [];
    var block = str;
    while (out.length < need) {
      var h = fnv1a(block);
      out.push(h & 0xff, (h >>> 8) & 0xff, (h >>> 16) & 0xff, (h >>> 24) & 0xff);
      block = block + "|" + h.toString(16);
    }
    return out.slice(0, need);
  }

  function Complex(re, im) {
    this.re = re;
    this.im = im;
  }
  Complex.prototype.abs2 = function () {
    return this.re * this.re + this.im * this.im;
  };
  Complex.prototype.mul = function (o) {
    return new Complex(this.re * o.re - this.im * o.im, this.re * o.im + this.im * o.re);
  };
  Complex.prototype.add = function (o) {
    return new Complex(this.re + o.re, this.im + o.im);
  };

  function QuantumBrowserCore(numQubits) {
    this.n = clampQubits(numQubits == null ? 6 : numQubits);
    this.dim = 1 << this.n;
    this.state = null;
    this.query = "";
    this.symbols = [];
    this.lastEntropy = 0;
    this.lastTop = [];
    this._probs = null;
  }

  QuantumBrowserCore.prototype._resetState = function () {
    var dim = this.dim;
    var s = new Array(dim);
    for (var i = 0; i < dim; i++) s[i] = new Complex(0, 0);
    s[0] = new Complex(1, 0);
    this.state = s;
  };

  QuantumBrowserCore.prototype._applySingle = function (qubit, m00, m01, m10, m11) {
    var dim = this.dim;
    var s = this.state;
    var step = 1 << qubit;
    var next = new Array(dim);
    for (var i = 0; i < dim; i++) next[i] = s[i];
    for (var base = 0; base < dim; base++) {
      if ((base & step) !== 0) continue;
      var i0 = base;
      var i1 = base | step;
      var a = s[i0];
      var b = s[i1];
      next[i0] = m00.mul(a).add(m01.mul(b));
      next[i1] = m10.mul(a).add(m11.mul(b));
    }
    this.state = next;
  };

  QuantumBrowserCore.prototype._H = function (q) {
    var s = Math.SQRT1_2;
    this._applySingle(q, new Complex(s, 0), new Complex(s, 0), new Complex(s, 0), new Complex(-s, 0));
  };

  QuantumBrowserCore.prototype._RX = function (q, theta) {
    var c = Math.cos(theta / 2);
    var si = Math.sin(theta / 2);
    this._applySingle(q, new Complex(c, 0), new Complex(0, -si), new Complex(0, -si), new Complex(c, 0));
  };

  QuantumBrowserCore.prototype._RY = function (q, theta) {
    var c = Math.cos(theta / 2);
    var si = Math.sin(theta / 2);
    this._applySingle(q, new Complex(c, 0), new Complex(-si, 0), new Complex(si, 0), new Complex(c, 0));
  };

  QuantumBrowserCore.prototype._RZ = function (q, theta) {
    var e0 = new Complex(Math.cos(-theta / 2), Math.sin(-theta / 2));
    var e1 = new Complex(Math.cos(theta / 2), Math.sin(theta / 2));
    this._applySingle(q, e0, new Complex(0, 0), new Complex(0, 0), e1);
  };

  QuantumBrowserCore.prototype._CX = function (c, t) {
    var dim = this.dim;
    var next = this.state.slice();
    var cm = 1 << c;
    var tm = 1 << t;
    for (var i = 0; i < dim; i++) {
      if ((i & cm) !== 0) {
        var j = i ^ tm;
        if (i < j) {
          var tmp = next[i];
          next[i] = next[j];
          next[j] = tmp;
        }
      }
    }
    this.state = next;
  };

  QuantumBrowserCore.prototype._CZ = function (a, b) {
    var s = this.state;
    var am = 1 << a;
    var bm = 1 << b;
    for (var i = 0; i < this.dim; i++) {
      if ((i & am) && (i & bm)) s[i] = new Complex(-s[i].re, -s[i].im);
    }
  };

  QuantumBrowserCore.prototype._buildSymbols = function (text) {
    var seen = {};
    var sym = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch.trim() === "") continue;
      if (!seen[ch]) {
        seen[ch] = 1;
        sym.push(ch);
      }
    }
    var pool =
      "абвгдежзийклмнопрстуфхцчшщыьэюяabcdefghijklmnopqrstuvwxyz0123456789 ·-_,.:;!?";
    var stream = hashStream(text + "#sym", 128);
    var k = 0;
    while (sym.length < 64) {
      sym.push(pool[stream[k % stream.length] % pool.length]);
      k++;
    }
    this.symbols = sym;
  };

  QuantumBrowserCore.prototype.encode = function (query) {
    this.query = String(query || "");
    this._buildSymbols(this.query);
    this._resetState();
    var n = this.n;
    var i;
    for (i = 0; i < n; i++) this._H(i);
    var bytes = hashStream(this.query, n * 4);
    for (i = 0; i < n; i++) {
      this._RX(i, (bytes[2 * i] / 255) * Math.PI * 2);
      this._RY(i, (bytes[2 * i + 1] / 255) * Math.PI * 2);
    }
    var b2 = hashStream(this.query + "|chaos2", n * 2);
    for (i = 0; i < n; i++) {
      this._RZ(i, (b2[i] / 255) * Math.PI * 2);
      if (i + 1 < n) this._CX(i, i + 1);
    }
    for (i = 0; i < n; i++) this._CZ(i, (i + 1) % n);
    for (i = 0; i < n - 1; i += 2) {
      this._CX(i, i + 1);
      this._RZ(i + 1, Math.PI / (2 + (i % 5)));
      this._CX(i, i + 1);
    }
    return this.spectrum(12);
  };

  QuantumBrowserCore.prototype.spectrum = function (topK) {
    topK = topK || 12;
    var s = this.state;
    var dim = this.dim;
    var probs = new Array(dim);
    var sum = 0;
    var i;
    for (i = 0; i < dim; i++) {
      probs[i] = s[i].abs2();
      sum += probs[i];
    }
    if (sum > 0) for (i = 0; i < dim; i++) probs[i] /= sum;
    var entropy = 0;
    for (i = 0; i < dim; i++) {
      if (probs[i] > 1e-18) entropy -= probs[i] * Math.log2(probs[i]);
    }
    this.lastEntropy = entropy;
    var idx = [];
    for (i = 0; i < dim; i++) idx.push(i);
    idx.sort(function (a, b) {
      return probs[b] - probs[a];
    });
    var top = [];
    for (i = 0; i < Math.min(topK, dim); i++) {
      var j = idx[i];
      if (probs[j] < 1e-15) break;
      top.push({
        bitstring: j.toString(2).padStart(this.n, "0"),
        index: j,
        probability: probs[j],
        re: s[j].re,
        im: s[j].im,
      });
    }
    this.lastTop = top;
    this._probs = probs;
    return { entropy: entropy, top: top, dim: dim, n: this.n };
  };

  QuantumBrowserCore.prototype.collapse = function () {
    if (!this._probs) this.spectrum(8);
    var probs = this._probs;
    var dim = this.dim;
    var r = Math.random();
    var acc = 0;
    var chosen = dim - 1;
    for (var i = 0; i < dim; i++) {
      acc += probs[i];
      if (r <= acc) {
        chosen = i;
        break;
      }
    }
    var bitstring = chosen.toString(2).padStart(this.n, "0");
    return {
      bitstring: bitstring,
      index: chosen,
      probability: probs[chosen],
      answer: this._decode(bitstring),
      entropyBefore: this.lastEntropy,
      query: this.query,
    };
  };

  QuantumBrowserCore.prototype._decode = function (bitstring) {
    var symbols = this.symbols;
    if (!symbols.length) symbols = ["?"];
    var bits = bitstring;
    while (bits.length % 6 !== 0) bits += "0";
    var chars = [];
    for (var i = 0; i < bits.length; i += 6) {
      chars.push(symbols[parseInt(bits.slice(i, i + 6), 2) % symbols.length]);
    }
    var seed = parseInt(bitstring, 2);
    for (var k = chars.length - 1; k > 0; k--) {
      var j = (seed + k * 2654435761) % (k + 1);
      var t = chars[k];
      chars[k] = chars[j];
      chars[j] = t;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    }
    var text = chars.join("").trim();
    return text || symbols[parseInt(bitstring, 2) % symbols.length];
  };

  QuantumBrowserCore.prototype.solve = function (query) {
    var before = this.encode(query);
    var after = this.collapse();
    return { before: before, collapse: after, answer: after.answer };
  };

  QuantumBrowserCore.savePermit = function (payload) {
    try {
      var data = {
        v: 1,
        ts: new Date().toISOString(),
        bitstring: payload.bitstring,
        symbol: payload.answer,
        entropy: payload.entropyBefore,
        query: payload.query || "",
        probability: payload.probability,
      };
      localStorage.setItem("aksi_matrix_permit", JSON.stringify(data));
      return data;
    } catch (e) {
      return null;
    }
  };

  QuantumBrowserCore.loadPermit = function () {
    try {
      var raw = localStorage.getItem("aksi_matrix_permit");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };

  global.QuantumBrowserCore = QuantumBrowserCore;
})(typeof window !== "undefined" ? window : globalThis);
