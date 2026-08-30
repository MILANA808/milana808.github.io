/**
 * AKSI HRR — Holographic Resonant Retrieval
 * Комплексное поле 64×64 + 2D DFT-прокси (без обязательного fft-wasm).
 */
(function (G) {
  "use strict";
  function HolographicMemory(n) {
    this.N = n || 64;
    this.re = new Float32Array(this.N * this.N);
    this.im = new Float32Array(this.N * this.N);
    this.traces = [];
  }
  HolographicMemory.prototype._hash = function (s) {
    var h = 2166136261 >>> 0; s = String(s || "");
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  HolographicMemory.prototype._encode = function (text) {
    var N = this.N, re = new Float32Array(N * N), im = new Float32Array(N * N);
    var tokens = String(text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!tokens.length) tokens = ["\u2205"];
    var inv = 1 / Math.sqrt(tokens.length);
    for (var ti = 0; ti < tokens.length; ti++) {
      var h = this._hash(tokens[ti]);
      for (var k = 0; k < 12; k++) {
        var x = (h + k * 97 + ti * 13) % N;
        var y = (Math.imul(h, 31 + k) + ti * 17) % N;
        var idx = y * N + x;
        var phase = ((h >>> (k % 16)) & 0xff) / 255 * Math.PI * 2;
        var amp = inv * (1 - k * 0.04);
        re[idx] += amp * Math.cos(phase); im[idx] += amp * Math.sin(phase);
        var j = ((N - y) % N) * N + ((N - x) % N);
        re[j] += amp * Math.cos(-phase) * 0.35; im[j] += amp * Math.sin(-phase) * 0.35;
      }
    }
    return { re: re, im: im };
  };
  HolographicMemory.prototype._dft1d = function (re, im, inv) {
    var n = re.length, outRe = new Float32Array(n), outIm = new Float32Array(n), scale = inv ? 1 / n : 1;
    for (var k = 0; k < n; k++) {
      var sr = 0, si = 0;
      for (var t = 0; t < n; t++) {
        var ang = (inv ? 1 : -1) * 2 * Math.PI * k * t / n, c = Math.cos(ang), s = Math.sin(ang);
        sr += re[t] * c - im[t] * s; si += re[t] * s + im[t] * c;
      }
      outRe[k] = sr * scale; outIm[k] = si * scale;
    }
    return { re: outRe, im: outIm };
  };
  HolographicMemory.prototype._fft2 = function (re, im, inverse) {
    var N = this.N, tmpRe = new Float32Array(N * N), tmpIm = new Float32Array(N * N), y, x, r;
    for (y = 0; y < N; y++) {
      r = this._dft1d(re.subarray(y * N, y * N + N), im.subarray(y * N, y * N + N), inverse);
      tmpRe.set(r.re, y * N); tmpIm.set(r.im, y * N);
    }
    var outRe = new Float32Array(N * N), outIm = new Float32Array(N * N);
    for (x = 0; x < N; x++) {
      var colRe = new Float32Array(N), colIm = new Float32Array(N);
      for (y = 0; y < N; y++) { colRe[y] = tmpRe[y * N + x]; colIm[y] = tmpIm[y * N + x]; }
      r = this._dft1d(colRe, colIm, inverse);
      for (y = 0; y < N; y++) { outRe[y * N + x] = r.re[y]; outIm[y * N + x] = r.im[y]; }
    }
    return { re: outRe, im: outIm };
  };
  HolographicMemory.prototype.add = function (text, weight) {
    weight = weight == null ? 1 : weight;
    var enc = this._encode(text), n = this.N * this.N;
    for (var i = 0; i < n; i++) { this.re[i] += enc.re[i] * weight; this.im[i] += enc.im[i] * weight; }
    this.traces.push({ text: String(text), weight: weight });
    if (this.traces.length > 300) this.traces.shift();
  };
  HolographicMemory.prototype.clear = function () { this.re.fill(0); this.im.fill(0); this.traces = []; };
  HolographicMemory.prototype.resonance = function (query) {
    var q = this._encode(query), n = this.N * this.N, spatial = 0, normA = 0, normB = 0, i;
    for (i = 0; i < n; i++) {
      spatial += this.re[i] * q.re[i] + this.im[i] * q.im[i];
      normA += this.re[i] * this.re[i] + this.im[i] * this.im[i];
      normB += q.re[i] * q.re[i] + q.im[i] * q.im[i];
    }
    spatial = normA > 0 && normB > 0 ? spatial / Math.sqrt(normA * normB) : 0;
    var F = this._fft2(this.re, this.im, false), Q = this._fft2(q.re, q.im, false);
    var PRe = new Float32Array(n), PIm = new Float32Array(n);
    for (i = 0; i < n; i++) { PRe[i] = F.re[i] * Q.re[i] + F.im[i] * Q.im[i]; PIm[i] = F.im[i] * Q.re[i] - F.re[i] * Q.im[i]; }
    var corr = this._fft2(PRe, PIm, true), peak = 0;
    for (i = 0; i < n; i++) { var mag = Math.sqrt(corr.re[i] * corr.re[i] + corr.im[i] * corr.im[i]); if (mag > peak) peak = mag; }
    var spectral = Math.min(1, peak * 8);
    var score = Math.max(0, Math.min(1, spatial * 0.55 + spectral * 0.45));
    var best = null, bestS = 0;
    var qTok = String(query || "").toLowerCase().split(/\s+/).filter(function (t) { return t.length > 2; });
    this.traces.forEach(function (tr) {
      var t = tr.text.toLowerCase(), s = 0;
      qTok.forEach(function (w) { if (t.indexOf(w) !== -1) s++; });
      if (s > bestS) { bestS = s; best = tr.text; }
    });
    return { score: score, spatial: spatial, spectral: spectral, known: score >= 0.22 || bestS >= 2, fact: best, n: this.traces.length };
  };
  var singleton = null;
  G.AKSI_HRR = { HolographicMemory: HolographicMemory, get: function () { if (!singleton) singleton = new HolographicMemory(64); return singleton; } };
})(typeof window !== "undefined" ? window : globalThis);
