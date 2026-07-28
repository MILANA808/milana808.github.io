/** Quantum sim helpers — safe applyGate H and fingerprint */
window.AKSI_qfix = {
  applyH: function(state, t0, n, Complex) {
    var dim = 1 << n;
    var next = [];
    for (var z = 0; z < dim; z++) next.push([0, 0]);
    var inv = 1 / Math.SQRT2;
    for (var i = 0; i < dim; i++) {
      if (((i >> t0) & 1) !== 0) continue;
      var i1 = i | (1 << t0);
      var a0 = state[i], a1 = state[i1];
      next[i] = Complex.add(Complex.scale(a0, inv), Complex.scale(a1, inv));
      next[i1] = Complex.add(Complex.scale(a0, inv), Complex.scale(a1, -inv));
    }
    return next;
  },
  fp: function(seed) {
    var h = 0xA5C11995;
    for (var i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  },
  esc: function(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};
