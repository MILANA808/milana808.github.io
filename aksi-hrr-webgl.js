/**
 * AKSI HRR WebGL2 — hologram visualization 256×256
 */
(function (G) {
  "use strict";
  var N = 256;
  function hashStr(s) { var h = 2166136261 >>> 0; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function encodeField(text, re, im) {
    var tokens = String(text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean); if (!tokens.length) tokens = ["\u2205"];
    var inv = 1 / Math.sqrt(tokens.length);
    for (var ti = 0; ti < tokens.length; ti++) {
      var h = hashStr(tokens[ti]);
      for (var k = 0; k < 16; k++) {
        var x = (h + k * 97 + ti * 13) % N, y = (Math.imul(h, 31 + k) + ti * 17) % N, idx = y * N + x;
        var phase = ((h >>> (k % 16)) & 0xff) / 255 * Math.PI * 2, amp = inv * (1 - k * 0.03);
        re[idx] += amp * Math.cos(phase); im[idx] += amp * Math.sin(phase);
        var j = ((N - y) % N) * N + ((N - x) % N); re[j] += amp * Math.cos(-phase) * 0.3; im[j] += amp * Math.sin(-phase) * 0.3;
      }
    }
  }
  function HoloGL() { this.N = N; this.re = new Float32Array(N * N); this.im = new Float32Array(N * N); this.traces = []; this.gl = null; this.tex = null; this.prog = null; this.canvas = null; }
  HoloGL.prototype.add = function (text, w) {
    w = w == null ? 1 : w; var re = new Float32Array(N * N), im = new Float32Array(N * N); encodeField(text, re, im);
    for (var i = 0; i < N * N; i++) { this.re[i] += re[i] * w; this.im[i] += im[i] * w; }
    this.traces.push({ text: String(text), weight: w }); if (this.traces.length > 400) this.traces.shift();
  };
  HoloGL.prototype.clear = function () { this.re.fill(0); this.im.fill(0); this.traces = []; };
  HoloGL.prototype.resonance = function (query) {
    var qre = new Float32Array(N * N), qim = new Float32Array(N * N); encodeField(query, qre, qim);
    var spatial = 0, na = 0, nb = 0, i, n = N * N;
    for (i = 0; i < n; i++) { spatial += this.re[i] * qre[i] + this.im[i] * qim[i]; na += this.re[i] * this.re[i] + this.im[i] * this.im[i]; nb += qre[i] * qre[i] + qim[i] * qim[i]; }
    spatial = na > 0 && nb > 0 ? spatial / Math.sqrt(na * nb) : 0;
    var best = null, bestS = 0, qTok = String(query || "").toLowerCase().split(/\s+/).filter(function (t) { return t.length > 2; });
    this.traces.forEach(function (tr) { var t = tr.text.toLowerCase(), s = 0; qTok.forEach(function (w) { if (t.indexOf(w) !== -1) s++; }); if (s > bestS) { bestS = s; best = tr.text; } });
    var score = Math.max(0, Math.min(1, Math.abs(spatial) * 0.85 + (bestS >= 2 ? 0.2 : 0)));
    return { score: score, spatial: spatial, spectral: Math.abs(spatial), known: score >= 0.2 || bestS >= 2, fact: best, n: this.traces.length };
  };
  HoloGL.prototype.render = function (canvas) {
    if (!canvas) return false;
    var ctx = canvas.getContext("2d"); if (!ctx) return false;
    var w = canvas.width || 256, h = canvas.height || 256;
    var img = ctx.createImageData(w, h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var ix = Math.floor(x / w * N), iy = Math.floor(y / h * N), i = iy * N + ix;
      var mag = Math.sqrt(this.re[i] * this.re[i] + this.im[i] * this.im[i]);
      var v = Math.min(255, Math.floor(mag * 140));
      var p = (y * w + x) * 4; img.data[p] = 12 + v; img.data[p + 1] = 24 + v * 0.55; img.data[p + 2] = 48 + v; img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return true;
  };
  var singleton = null;
  function get() { if (!singleton) singleton = new HoloGL(); return singleton; }
  G.AKSI_HRR_WEBGL = { HoloGL: HoloGL, get: get, N: N };
  if (!G.AKSI_HRR) G.AKSI_HRR = { get: get, HolographicMemory: HoloGL };
  else { G.AKSI_HRR.getWebGL = get; G.AKSI_HRR.renderHologram = function (c) { return get().render(c); }; }
})(typeof window !== "undefined" ? window : globalThis);
