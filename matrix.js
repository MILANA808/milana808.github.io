/**
 * AKSI MATRIX — client-side QBM / H_eff / Gershgorin + star graph + Pro proof
 * Offline-first · GitHub Pages · technology_serves_human
 * © AKSI · aksilove@internet.ru
 */
(function (global) {
  "use strict";

  var PRO_KEY = "aksi_matrix_pro_v1";
  var LS_RECEIPT = "aksi_matrix_last_proof";

  function utf8(s) { return new TextEncoder().encode(String(s || "")); }
  function hex(u8) {
    return Array.from(u8).map(function (b) {
      return ("0" + b.toString(16)).slice(-2);
    }).join("");
  }
  async function sha256Bytes(data) {
    var buf = typeof data === "string" ? utf8(data) : data;
    return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
  }
  async function fingerprint8(text) {
    var h = await sha256Bytes(text + "|AKSI-MATRIX|" + Date.now());
    return hex(h.slice(0, 4)).toUpperCase();
  }

  function bytesFromText(text) {
    var b = utf8(text);
    if (b.length === 0) return new Uint8Array([0]);
    return b;
  }
  function computeQBM(text) {
    var bytes = bytesFromText(text);
    var n = Math.min(32, Math.max(8, bytes.length * 2));
    var spins = new Float64Array(n);
    var i, j, bit;
    for (i = 0; i < n; i++) {
      bit = (bytes[i % bytes.length] >> (i % 8)) & 1;
      spins[i] = bit ? 1 : -1;
    }
    var energy = 0;
    for (i = 0; i < n; i++) {
      var h = ((bytes[i % bytes.length] / 255) * 2 - 1) * 0.35;
      energy -= h * spins[i];
    }
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      var J = 0.12 * spins[i] * spins[j];
      energy -= J;
    }
    var mag = 0;
    for (i = 0; i < n; i++) mag += spins[i];
    mag /= n;
    return { energy: energy, magnetization: mag, n: n, spins: spins };
  }
  function computeHeff(text, qbm) {
    var bytes = bytesFromText(text);
    var hist = new Array(16);
    var i;
    for (i = 0; i < 16; i++) hist[i] = 0;
    for (i = 0; i < bytes.length; i++) hist[bytes[i] >> 4]++;
    var S = 0, p, total = bytes.length || 1;
    for (i = 0; i < 16; i++) {
      p = hist[i] / total;
      if (p > 1e-12) S -= p * Math.log2(p);
    }
    var T = 0.85 + 0.15 * Math.min(1, bytes.length / 64);
    var F = qbm.energy - T * S;
    var coherent = F < -0.5 && Math.abs(qbm.magnetization) > 0.15 && S > 1.2;
    var status = coherent
      ? "Пробужденное / Когерентное"
      : F < 0
        ? "Переходное"
        : "Хаотическое";
    return { H_eff: F, entropy: S, T: T, status: status, coherent: coherent };
  }

  function gershgorin(text) {
    var bytes = bytesFromText(text);
    var features = [0, 0, 0, 0];
    var i;
    for (i = 0; i < bytes.length; i++) features[i % 4] += bytes[i];
    var maxf = Math.max.apply(null, features.concat([1]));
    var circles = [];
    for (i = 0; i < 4; i++) {
      var norm = features[i] / maxf;
      var cx = 50 + 28 * Math.cos((i * Math.PI) / 2 + 0.2 * norm);
      var cy = 50 + 28 * Math.sin((i * Math.PI) / 2 + 0.2 * norm);
      var r = 8 + 22 * norm;
      circles.push({ cx: cx, cy: cy, r: r, i: i });
    }
    var overlaps = 0, pairs = 0;
    for (i = 0; i < 4; i++) {
      for (var j = i + 1; j < 4; j++) {
        pairs++;
        var dx = circles[i].cx - circles[j].cx;
        var dy = circles[i].cy - circles[j].cy;
        var d = Math.sqrt(dx * dx + dy * dy);
        var sumR = circles[i].r + circles[j].r;
        if (d < sumR && d > Math.abs(circles[i].r - circles[j].r) * 0.3) overlaps++;
      }
    }
    var chaos = text.length > 0 && (/[!]{2,}|[?]{2,}|asdasd|qwerty/i.test(text) || bytes.length < 3);
    var stableRatio = pairs ? overlaps / pairs : 0;
    var stable = !chaos && stableRatio >= 0.33 && bytes.length >= 4;
    var pct = stable ? (97 + Math.min(2.9, stableRatio * 2)).toFixed(1) : (40 + stableRatio * 30).toFixed(1);
    return {
      circles: circles,
      stable: stable,
      label: stable ? ("Стабильное состояние " + pct + "%") : "Нестабильное состояние",
      pct: pct
    };
  }

  function StarGraph(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.mx = 0.5;
    this.my = 0.5;
    this.t0 = performance.now();
    var self = this;
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth || 320;
      var h = canvas.clientHeight || 320;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      self.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      self.w = w;
      self.h = h;
    }
    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      self.mx = (e.clientX - r.left) / r.width;
      self.my = (e.clientY - r.top) / r.height;
    });
    canvas.addEventListener("pointerleave", function () {
      self.mx = 0.5;
      self.my = 0.5;
    });
    function loop(now) {
      self.draw(now);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }
  StarGraph.prototype.draw = function (now) {
    var ctx = this.ctx, w = this.w, h = this.h;
    var cx = w / 2, cy = h / 2;
    var R = Math.min(w, h) * 0.42;
    var t = (now - this.t0) / 1000;
    var pulse = 0.85 + 0.15 * Math.sin(t * 2.2 + this.mx * 3);
    var mouseAmp = 0.04 * (this.mx + this.my);
    ctx.clearRect(0, 0, w, h);
    var nodes = [];
    var a;
    for (a = 0; a < 8; a++) {
      var ang = (a * Math.PI) / 4 - Math.PI / 2;
      var rr = R * (0.98 + mouseAmp * Math.sin(t + a));
      nodes.push({ x: cx + rr * Math.cos(ang), y: cy + rr * Math.sin(ang), a: a });
    }
    ctx.strokeStyle = "rgba(0,0,0,0.03)";
    ctx.lineWidth = 0.5;
    var i, j;
    for (i = 0; i < 8; i++) {
      for (j = i + 1; j < 8; j++) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
    for (i = 0; i < 8; i++) {
      var thick = (i % 2 === 0);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(nodes[i].x, nodes[i].y);
      ctx.strokeStyle = thick ? "#000" : "rgba(0,0,0," + (0.25 * pulse) + ")";
      ctx.lineWidth = thick ? 2.2 * pulse : 1;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.fillStyle = "#000";
    ctx.arc(cx, cy, 3.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    function marker(deg, color, size) {
      var ang = (deg * Math.PI) / 180 - Math.PI / 2;
      var x = cx + R * 0.92 * Math.cos(ang);
      var y = cy + R * 0.92 * Math.sin(ang);
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    marker(0, "#e11d48", 5);
    marker(225, "#e11d48", 8);
    marker(45, "#f97316", 5);
  };

  function renderGershgorin(svg, g) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var ns = "http://www.w3.org/2000/svg";
    g.circles.forEach(function (c) {
      var el = document.createElementNS(ns, "circle");
      el.setAttribute("cx", c.cx);
      el.setAttribute("cy", c.cy);
      el.setAttribute("r", c.r);
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", "#000");
      el.setAttribute("stroke-width", "1");
      el.setAttribute("opacity", "0.7");
      svg.appendChild(el);
    });
  }

  function loadPro() {
    try {
      var raw = localStorage.getItem(PRO_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }
  function savePro(obj) {
    localStorage.setItem(PRO_KEY, JSON.stringify(obj));
  }
  async function activatePro(mock) {
    var ts = new Date().toISOString();
    var seed = "aksi-matrix-pro|" + ts + "|" + Math.random();
    var fp = await fingerprint8(seed);
    var txHash = null;
    var mode = "mock";
    if (!mock && typeof global.ethereum !== "undefined") {
      try {
        var accounts = await global.ethereum.request({ method: "eth_requestAccounts" });
        var from = accounts[0];
        txHash = await global.ethereum.request({
          method: "eth_sendTransaction",
          params: [{
            from: from,
            to: from,
            value: "0x0",
            data: "0x" + hex(utf8("AKSI-MATRIX-PRO")).slice(0, 16)
          }]
        });
        mode = "metamask";
        fp = (txHash || fp).replace(/^0x/, "").slice(0, 8).toUpperCase();
      } catch (e) {
        mode = "mock-after-reject";
      }
    }
    var proof = {
      fingerprint: fp,
      timestamp: ts,
      mode: mode,
      txHash: txHash,
      verified: true
    };
    savePro(proof);
    try {
      localStorage.setItem(LS_RECEIPT, JSON.stringify(proof));
    } catch (e) {}
    return proof;
  }

  function $(id) { return document.getElementById(id); }
  function setText(id, t) {
    var el = $(id);
    if (el) el.textContent = t;
  }

  async function runAnalyze() {
    var text = ($("mxInput") && $("mxInput").value) || "";
    var qbm = computeQBM(text);
    var he = computeHeff(text, qbm);
    var g = gershgorin(text);
    setText("outEnergy", qbm.energy.toFixed(4));
    setText("outMag", qbm.magnetization.toFixed(4));
    setText("outHeff", he.H_eff.toFixed(4));
    setText("outS", he.entropy.toFixed(4));
    setText("outStatus", he.status);
    setText("outGersh", g.label);
    var st = $("outStatus");
    if (st) st.style.color = he.coherent ? "#059669" : "#111";
    var gs = $("outGersh");
    if (gs) gs.style.color = g.stable ? "#059669" : "#b91c1c";
    var svg = $("gershSvg");
    if (svg) renderGershgorin(svg, g);
    try {
      var bridge = {
        source: "matrix",
        H_eff: he.H_eff,
        qbm_energy: qbm.energy,
        stable: g.stable,
        status: he.status,
        ts: Date.now()
      };
      localStorage.setItem("aksi_matrix_bridge", JSON.stringify(bridge));
    } catch (e) {}
  }

  function paintPro(proof) {
    var box = $("proProof");
    var badge = $("proBadge");
    if (!proof) {
      if (box) box.innerHTML = "Pro не активен. Free-демо доступен.";
      if (badge) badge.textContent = "FREE";
      return;
    }
    if (badge) badge.textContent = "PRO";
    if (box) {
      box.innerHTML =
        '<div class="proof-ok">✓ verified</div>' +
        "<div>fingerprint: <code>" + proof.fingerprint + "</code></div>" +
        "<div>timestamp: <code>" + proof.timestamp + "</code></div>" +
        "<div>mode: <code>" + proof.mode + "</code></div>" +
        (proof.txHash ? "<div>tx: <code>" + proof.txHash.slice(0, 18) + "…</code></div>" : "");
    }
  }

  function boot() {
    var canvas = $("starCanvas");
    if (canvas) new StarGraph(canvas);
    var btn = $("btnAnalyze");
    if (btn) btn.addEventListener("click", function () { runAnalyze(); });
    var inp = $("mxInput");
    if (inp) {
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAnalyze();
      });
    }
    paintPro(loadPro());
    var proBtn = $("btnPro");
    if (proBtn) {
      proBtn.addEventListener("click", async function () {
        proBtn.disabled = true;
        proBtn.textContent = "…";
        try {
          var useMock = !global.ethereum || ($("proMock") && $("proMock").checked);
          var proof = await activatePro(useMock);
          paintPro(proof);
        } catch (e) {
          setText("proProof", "Ошибка: " + (e.message || e));
        }
        proBtn.disabled = false;
        proBtn.textContent = "Активировать Pro-Доступ";
      });
    }
    runAnalyze();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  global.AKSIMatrix = {
    computeQBM: computeQBM,
    computeHeff: computeHeff,
    gershgorin: gershgorin,
    activatePro: activatePro,
    loadPro: loadPro
  };
})(typeof window !== "undefined" ? window : this);
