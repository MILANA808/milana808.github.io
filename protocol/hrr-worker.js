/* AKSI Protocol — HRR worker: holographic resonant field */
(function () {
  "use strict";
  var N = 64;
  var fieldRe = null;
  var fieldIm = null;

  function ensure(n) {
    N = n || N;
    if (!fieldRe || fieldRe.length !== N * N) {
      fieldRe = new Float32Array(N * N);
      fieldIm = new Float32Array(N * N);
    }
  }

  function hashStr(s) {
    var h = 2166136261 >>> 0;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function encodeTrace(text) {
    var re = new Float32Array(N * N);
    var im = new Float32Array(N * N);
    var tokens = String(text || "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    if (!tokens.length) tokens = ["\u2205"];
    var inv = 1 / Math.sqrt(tokens.length);
    for (var ti = 0; ti < tokens.length; ti++) {
      var h = hashStr(tokens[ti]);
      for (var k = 0; k < 12; k++) {
        var x = (h + k * 97 + ti * 13) % N;
        var y = (Math.imul(h, 31 + k) + ti * 17) % N;
        var idx = y * N + x;
        var phase = ((h >>> (k % 16)) & 0xff) / 255 * Math.PI * 2;
        var amp = inv * (1 - k * 0.04);
        re[idx] += amp * Math.cos(phase);
        im[idx] += amp * Math.sin(phase);
        var j = ((N - y) % N) * N + ((N - x) % N);
        re[j] += amp * Math.cos(-phase) * 0.35;
        im[j] += amp * Math.sin(-phase) * 0.35;
      }
    }
    return { re: re, im: im };
  }

  function dft1d(re, im, n, inv) {
    var outRe = new Float32Array(n);
    var outIm = new Float32Array(n);
    var scale = inv ? 1 / n : 1;
    for (var k = 0; k < n; k++) {
      var sr = 0, si = 0;
      for (var t = 0; t < n; t++) {
        var ang = (inv ? 1 : -1) * 2 * Math.PI * k * t / n;
        var c = Math.cos(ang), s = Math.sin(ang);
        sr += re[t] * c - im[t] * s;
        si += re[t] * s + im[t] * c;
      }
      outRe[k] = sr * scale;
      outIm[k] = si * scale;
    }
    return { re: outRe, im: outIm };
  }

  function fft2Proxy(re, im) {
    var tmpRe = new Float32Array(N * N);
    var tmpIm = new Float32Array(N * N);
    for (var y = 0; y < N; y++) {
      var rowRe = re.subarray(y * N, y * N + N);
      var rowIm = im.subarray(y * N, y * N + N);
      var r = dft1d(rowRe, rowIm, N, false);
      tmpRe.set(r.re, y * N);
      tmpIm.set(r.im, y * N);
    }
    var outRe = new Float32Array(N * N);
    var outIm = new Float32Array(N * N);
    for (var x = 0; x < N; x++) {
      var colRe = new Float32Array(N);
      var colIm = new Float32Array(N);
      for (var yy = 0; yy < N; yy++) {
        colRe[yy] = tmpRe[yy * N + x];
        colIm[yy] = tmpIm[yy * N + x];
      }
      var c = dft1d(colRe, colIm, N, false);
      for (var y2 = 0; y2 < N; y2++) {
        outRe[y2 * N + x] = c.re[y2];
        outIm[y2 * N + x] = c.im[y2];
      }
    }
    return { re: outRe, im: outIm };
  }

  function add(text, weight) {
    ensure();
    weight = weight == null ? 1 : weight;
    var t = encodeTrace(text);
    for (var i = 0; i < fieldRe.length; i++) {
      fieldRe[i] += t.re[i] * weight;
      fieldIm[i] += t.im[i] * weight;
    }
  }

  function clear() {
    ensure();
    fieldRe.fill(0);
    fieldIm.fill(0);
  }

  function resonance(query) {
    ensure();
    var q = encodeTrace(query);
    var num = 0, denQ = 0, denF = 0;
    for (var i = 0; i < fieldRe.length; i++) {
      num += fieldRe[i] * q.re[i] + fieldIm[i] * q.im[i];
      denQ += q.re[i] * q.re[i] + q.im[i] * q.im[i];
      denF += fieldRe[i] * fieldRe[i] + fieldIm[i] * fieldIm[i];
    }
    var denom = Math.sqrt(denQ * denF) || 1e-12;
    var spatial = Math.max(0, Math.min(1, (num / denom + 1) / 2));
    var F = fft2Proxy(fieldRe, fieldIm);
    var Q = fft2Proxy(q.re, q.im);
    var fnum = 0, fdq = 0, fdf = 0;
    for (var j = 0; j < F.re.length; j++) {
      fnum += F.re[j] * Q.re[j] + F.im[j] * Q.im[j];
      fdq += Q.re[j] * Q.re[j] + Q.im[j] * Q.im[j];
      fdf += F.re[j] * F.re[j] + F.im[j] * F.im[j];
    }
    var fden = Math.sqrt(fdq * fdf) || 1e-12;
    var spectral = Math.max(0, Math.min(1, (fnum / fden + 1) / 2));
    var score = spatial * 0.55 + spectral * 0.45;
    return { score: score, spatial: spatial, spectral: spectral, energy: Math.abs(num), known: score >= 0.40, n: N };
  }

  function snapshotMag() {
    ensure();
    var mags = new Float32Array(N * N);
    for (var i = 0; i < mags.length; i++) {
      mags[i] = Math.sqrt(fieldRe[i] * fieldRe[i] + fieldIm[i] * fieldIm[i]);
    }
    return { n: N, mags: Array.from(mags) };
  }

  self.onmessage = function (ev) {
    var msg = ev.data || {};
    try {
      if (msg.type === "init") {
        ensure(msg.n || 64);
        self.postMessage({ type: "ready", n: N });
      } else if (msg.type === "clear") {
        clear();
        self.postMessage({ type: "cleared" });
      } else if (msg.type === "add") {
        add(msg.text, msg.weight);
        self.postMessage({ type: "added" });
      } else if (msg.type === "seed") {
        clear();
        (msg.texts || []).forEach(function (t) { add(t, 1); });
        self.postMessage({ type: "seeded", count: (msg.texts || []).length });
      } else if (msg.type === "resonance") {
        var r = resonance(msg.query);
        self.postMessage({ type: "resonance", result: r, id: msg.id });
      } else if (msg.type === "snapshot") {
        self.postMessage({ type: "snapshot", data: snapshotMag() });
      }
    } catch (e) {
      self.postMessage({ type: "error", message: String(e.message || e) });
    }
  };
})();
