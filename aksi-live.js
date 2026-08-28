/**
 * AKSI LIVE v1.1.0 — Quantum → Brain/ONE → Trust
 * Does NOT patch ONE.think (race-safe). ONE.think calls LIVE when present.
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0";
  function modules() {
    return {
      quantum: !!G.AKSI_QUANTUM, brain: !!G.AKSI_BRAIN, trust: !!G.AKSI_TRUST,
      one: !!G.AKSI_ONE, core: !!(G.AKSI_CORE || G.AksiCore), overlay: !!G.AKSI_OVERLAY,
    };
  }
  function quantumContext(q) {
    if (!G.AKSI_QUANTUM || typeof G.AKSI_QUANTUM.shot !== "function") return null;
    try { return G.AKSI_QUANTUM.shot(String(q || "ping").slice(0, 200)); }
    catch (e) { return { error: String(e.message || e) }; }
  }
  function tryBrain(q) {
    if (!G.AKSI_BRAIN || typeof G.AKSI_BRAIN.complete !== "function") return Promise.resolve(null);
    try {
      var r = G.AKSI_BRAIN.complete(q);
      if (r && r.text) return Promise.resolve(r);
    } catch (e) {}
    return Promise.resolve(null);
  }
  function tryOneLocal(q) {
    if (G.AKSI_ONE && typeof G.AKSI_ONE.thinkLocal === "function") {
      try {
        G.AKSI_ONE.think._viaLive = true;
        return G.AKSI_ONE.thinkLocal(q).finally(function () {
          try { G.AKSI_ONE.think._viaLive = false; } catch (e) {}
        });
      } catch (e) {
        try { G.AKSI_ONE.think._viaLive = false; } catch (e2) {}
      }
    }
    return Promise.resolve(null);
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "live", quantum: null });
    var qx = quantumContext(q);
    return tryBrain(q).then(function (br) {
      if (br && br.text && String(br.meta || "").indexOf("fallback") === -1) {
        return { text: br.text, meta: br.meta || "brain", offline: true, quantum: qx };
      }
      return tryOneLocal(q).then(function (oneRes) {
        if (oneRes && oneRes.text)
          return { text: oneRes.text, meta: oneRes.meta || "one", offline: !!oneRes.offline, quantum: qx };
        if (br && br.text)
          return { text: br.text, meta: br.meta || "brain", offline: true, quantum: qx };
        return {
          text: "LIVE: нет ответа из Brain/ONE. Откройте Whole или «запомни: факт».",
          meta: "live·empty", quantum: qx,
        };
      });
    }).then(function (res) {
      var text = res.text;
      var meta = res.meta || "live";
      if (qx && qx.qcli != null) meta += " · Q" + qx.qcli;
      if (!G.AKSI_TRUST || typeof G.AKSI_TRUST.verifyResponse !== "function") {
        return { text: text, meta: meta, quantum: qx, trust: null, offline: !!res.offline };
      }
      var plain = String(text).split("\n——\n")[0];
      return G.AKSI_TRUST.verifyResponse(q, plain, { source: "live" }).then(function (tr) {
        if (tr && tr.trust) meta += " · trust:" + tr.trust;
        return { text: text, meta: meta, quantum: qx, trust: tr || null, offline: !!res.offline };
      }).catch(function () {
        return { text: text, meta: meta, quantum: qx, trust: null, offline: !!res.offline };
      });
    });
  }
  function status() {
    return {
      version: VER, modules: modules(),
      quantumSample: G.AKSI_QUANTUM ? G.AKSI_QUANTUM.shot("status") : null,
      product: "AKSI LIVE pipeline", contact: "aksilove@internet.ru",
    };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>AKSI LIVE · v' + VER + '</h2>' +
      '<p class="muted">QSim → Brain/ONE → Trust</p>' +
      '<pre id="lvSt" class="out">…</pre>' +
      '<textarea id="lvIn" placeholder="Вопрос…" style="margin-top:10px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="lvAsk">Shot + Answer</button>' +
      '<button type="button" class="btn" id="lvStBtn">Status</button></div>' +
      '<pre id="lvOut" class="out" style="margin-top:10px;max-height:260px">—</pre></div>';
    function show(x) {
      var el = document.getElementById("lvOut");
      if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2);
    }
    document.getElementById("lvStBtn").onclick = function () {
      var s = status();
      document.getElementById("lvSt").textContent = JSON.stringify(s, null, 2);
      show(s);
    };
    document.getElementById("lvAsk").onclick = function () {
      show("quantum shot…");
      think(document.getElementById("lvIn").value).then(function (r) {
        show(r.text + "\n\n[" + r.meta + "]");
        document.getElementById("lvSt").textContent = JSON.stringify({ quantum: r.quantum, trust: r.trust && r.trust.trust }, null, 2);
      });
    };
    document.getElementById("lvStBtn").onclick();
  }
  G.AKSI_LIVE = { version: VER, think: think, ask: think, status: status, modules: modules, mount: mount };
  G.AKSI = G.AKSI || {};
  G.AKSI.version = VER; G.AKSI.think = think; G.AKSI.ask = think; G.AKSI.status = status; G.AKSI.modules = modules;
})(typeof window !== "undefined" ? window : this);
