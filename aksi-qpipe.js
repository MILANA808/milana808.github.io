/**
 * AKSI Quantum Pipeline v4.0 — real-time answer → state-vector sim → optional hardware
 * local-sv: browser state-vector (default, offline)
 * ibm-runtime: optional IBM Quantum Runtime (user token + network)
 */
(function (G) {
  "use strict";
  var VER = "4.0.0";
  var listeners = [];
  var lastResult = null;
  var backend = "local-sv";

  function emit(ev, data) {
    var i, payload = { event: ev, t: Date.now(), data: data || {} };
    for (i = 0; i < listeners.length; i++) {
      try { listeners[i](payload); } catch (e) {}
    }
    try {
      if (typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("aksi-quantum", { detail: payload }));
      }
    } catch (e) {}
    return payload;
  }

  function on(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function off() {
      listeners = listeners.filter(function (x) { return x !== fn; });
    };
  }

  function getBackend() {
    try {
      return localStorage.getItem("aksi_q_backend") || backend;
    } catch (e) {
      return backend;
    }
  }
  function setBackend(name) {
    backend = name === "ibm-runtime" ? "ibm-runtime" : "local-sv";
    try { localStorage.setItem("aksi_q_backend", backend); } catch (e) {}
    emit("backend", { backend: backend });
    return backend;
  }

  function drawLive(canvas, qx) {
    if (!canvas || !qx) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = canvas.width, h = canvas.height, cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.38;
    ctx.fillStyle = "#12100e";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#6b4f35";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#3d342c";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    var b = qx.bloch0 || { x: 0, y: 0, z: 1 };
    var px = cx + (b.x || 0) * r;
    var py = cy - (b.z || 0) * r * 0.9;
    ctx.strokeStyle = "#c4a574";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = "#e8d4a8";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a6544";
    ctx.font = "11px system-ui,sans-serif";
    ctx.fillText("QCLI " + (qx.QCLI != null ? qx.QCLI : "—"), 8, 16);
    ctx.fillText((qx.backend || "local-sv"), 8, h - 10);
  }

  function logLine(msg) {
    var el = document.getElementById("qPipeLog") || document.getElementById("labMetrics");
    if (!el) return;
    var prev = el.textContent || "";
    if (prev === "—") prev = "";
    el.textContent = String(msg) + (prev ? "\n" + prev.slice(0, 500) : "");
  }

  function processAnswer(query, answer, opts) {
    opts = opts || {};
    var text = String(answer || "");
    var q = String(query || "");
    emit("start", { query: q.slice(0, 80), len: text.length });
    logLine("quantum pipeline · start");

    return new Promise(function (resolve) {
      setTimeout(function () {
        var qx = null;
        var be = getBackend();

        function finishLocal() {
          if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
            qx = AKSI_QUANTUM.answerGate(q, text);
          } else {
            qx = {
              QCLI: 0.5, resonance: 0.5, entropy: 0, purity: 1,
              backend: "fallback", circuit: "H·CNOT",
              bloch0: { x: 0, y: 0, z: 1, r: 1 }
            };
          }
          qx.backend = qx.backend || "local-sv";
          lastResult = qx;
          emit("sim", qx);
          logLine("local-sv · QCLI " + qx.QCLI + " · R " + qx.resonance);
          var canvas = document.getElementById("hrrGlCanvas") || document.getElementById("qBloch");
          drawLive(canvas, qx);
          if (document.getElementById("kvEqs")) {
            document.getElementById("kvEqs").textContent = String(qx.QCLI);
          }
          var meta = "QCLI " + qx.QCLI + " · " + (qx.backend || "local-sv");
          emit("done", { quantum: qx, meta: meta });
          resolve({
            text: text, quantum: qx, meta: meta,
            backend: qx.backend, QCLI: qx.QCLI, sealed: true
          });
        }

        finishLocal();

        if (be === "ibm-runtime" && G.AKSI_QUANTUM && AKSI_QUANTUM.runHardware) {
          emit("hardware-start", { backend: "ibm-runtime" });
          logLine("ibm-runtime request…");
          try {
            var p = AKSI_QUANTUM.runHardware(q + "||" + text.slice(0, 200));
            if (p && typeof p.then === "function") {
              p.then(function (hw) {
                emit("hardware-done", hw);
                logLine("ibm · " + (hw && (hw.backend || hw.note || "done")));
                if (hw && lastResult) lastResult.hardware = hw;
              }).catch(function (err) {
                emit("hardware-error", { error: String(err && err.message || err) });
                logLine("ibm error: " + (err && err.message || err));
              });
            }
          } catch (e) {
            logLine("ibm: " + (e.message || e));
          }
        }
      }, 16);
    });
  }

  function status() {
    var token = "";
    try {
      if (G.AKSI_QUANTUM && AKSI_QUANTUM.getIbmToken) token = AKSI_QUANTUM.getIbmToken() || "";
    } catch (e) {}
    return {
      version: VER,
      backend: getBackend(),
      ibmToken: !!token,
      lastQCLI: lastResult && lastResult.QCLI,
      engine: (G.AKSI_QUANTUM && AKSI_QUANTUM.version) || null,
      note: "local-sv = real state-vector simulation; ibm-runtime needs token + network"
    };
  }

  function wireLabUI() {
    var btn = document.getElementById("btnMetrics");
    if (btn && !btn.__qpipe) {
      btn.__qpipe = 1;
      btn.addEventListener("click", function () {
        processAnswer("lab-self-test", "AKSI quantum pipeline live", { force: true }).then(function (r) {
          var el = document.getElementById("labMetrics");
          if (el && r.quantum) {
            el.textContent = [
              "Quantum Pipeline " + VER,
              "backend: " + r.backend,
              "QCLI: " + r.QCLI,
              "resonance: " + (r.quantum.resonance || "—"),
              "entropy: " + (r.quantum.entropy || "—"),
              "purity: " + (r.quantum.purity || "—"),
              r.quantum.circuit || "",
              "",
              "Hardware mode: " + getBackend() + (status().ibmToken ? " · token OK" : " · no IBM token"),
              "Local sim always runs. IBM is optional cloud QPU."
            ].join("\n");
          }
        });
      });
    }
  }

  function boot() {
    wireLabUI();
    setTimeout(wireLabUI, 500);
    emit("ready", status());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  G.AKSI_QPIPE = {
    version: VER,
    processAnswer: processAnswer,
    on: on,
    status: status,
    setBackend: setBackend,
    getBackend: getBackend,
    drawLive: drawLive,
    last: function () { return lastResult; }
  };
})(typeof window !== "undefined" ? window : globalThis);
