/** Bloch + particle art via canvas */
(function (global) {
  "use strict";
  function drawBloch(canvas, bloch) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.38;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0618"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(0,240,255,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath(); ctx.moveTo(cx - R - 4, cy); ctx.lineTo(cx + R + 4, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - R - 4); ctx.lineTo(cx, cy + R + 4); ctx.stroke();
    ctx.fillStyle = "#9ca3c7"; ctx.font = "11px system-ui";
    ctx.fillText("|0⟩", cx + 6, cy - R - 6);
    ctx.fillText("|1⟩", cx + 6, cy + R + 12);
    var x = bloch.x || 0, y = bloch.y || 0, z = bloch.z || 1;
    var sx = cx + R * x;
    var sy = cy - R * z * 0.85 - R * y * 0.2;
    ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.fillStyle = "#00f0ff"; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
  }
  function phase0(psi) {
    if (!psi || !psi[0]) return 0;
    return Math.atan2(psi[0].im, psi[0].re);
  }
  function renderArt(canvas, psi) {
    var ctx = canvas.getContext("2d");
    var W = canvas.width, H = canvas.height;
    var img = ctx.createImageData(W, H);
    var n = psi.length;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = ((x * n / W) | 0) % n;
        var a = psi[i];
        var amp = Math.sqrt(a.re * a.re + a.im * a.im);
        var phase = Math.atan2(a.im, a.re);
        var u = x / W, v = y / H;
        var wave = Math.sin(u * 12 + phase * 3 + v * 8) * amp;
        var r = (80 + 150 * amp + 40 * wave) | 0;
        var g = (40 + 100 * Math.abs(Math.sin(phase)) + 80 * amp) | 0;
        var b = (120 + 100 * Math.cos(phase) + 50 * (1 - amp)) | 0;
        var o = (y * W + x) * 4;
        img.data[o] = Math.max(0, Math.min(255, r));
        img.data[o + 1] = Math.max(0, Math.min(255, g));
        img.data[o + 2] = Math.max(0, Math.min(255, b));
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = "rgba(168,85,247,0.35)";
    for (var k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 40 + k * 28, 18 + k * 10, phase0(psi), 0, Math.PI * 2);
      ctx.stroke();
    }
    return canvas.toDataURL("image/png");
  }
  function hashState(psi) {
    var s = psi.map(function (a) { return a.re.toFixed(6) + "," + a.im.toFixed(6); }).join("|");
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function starfield(canvas) {
    var ctx = canvas.getContext("2d");
    var stars = [];
    function resize() {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
      stars = [];
      for (var i = 0; i < 80; i++) stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, v: 0.15 + Math.random() * 0.5, r: Math.random() * 1.4 });
    }
    resize();
    window.addEventListener("resize", resize);
    (function loop() {
      ctx.fillStyle = "rgba(10,6,24,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0,240,255,0.5)";
      stars.forEach(function (p) {
        p.y -= p.v;
        if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(loop);
    })();
  }
  global.QuantumVisualizer = { drawBloch: drawBloch, renderArt: renderArt, hashState: hashState, starfield: starfield };
})(typeof window !== "undefined" ? window : globalThis);
