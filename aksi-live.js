/**
 * AKSI LIVE RUNTIME v1.0.1 — Quantum → Brain/Core/LLM → Trust
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (G) {
  "use strict";
  var VER = "1.0.1-live";
  function modules() {
    return {
      quantum: !!G.AKSI_QUANTUM, brain: !!G.AKSI_BRAIN, trust: !!G.AKSI_TRUST, one: !!G.AKSI_ONE,
      core: !!(G.AKSI_CORE || G.AksiCore), llm: !!G.AKSI_LLM, pq: !!G.AKSI_PQ, neuro: !!G.AKSI_NEURO,
      relay: !!G.AKSI_RELAY, p2p: !!G.AKSI_P2P, mesh: !!G.AKSI_MESH,
    };
  }
  function quantumContext(q) {
    if (!G.AKSI_QUANTUM || typeof G.AKSI_QUANTUM.shot !== "function")
      return { resonance: 0.55, QCLI: 0.5, bits: "—", label: "no-qsim" };
    return G.AKSI_QUANTUM.shot(q);
  }
  function formatQuantumFooter(qx) {
    return "\n\n——\n⟨QSim⟩ " + (qx.bits || "?") + " · QCLI " + (qx.QCLI != null ? qx.QCLI : "—") +
      " · resonance " + (qx.resonance != null ? qx.resonance : "—") + " · H=" + (qx.entropy != null ? qx.entropy : "—");
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "live", quantum: null });
    var qx = quantumContext(q);
    var preferLocal = qx.resonance >= 0.45;
    function fromBrain() {
      if (G.AKSI_BRAIN && G.AKSI_BRAIN.complete) {
        try {
          var r = G.AKSI_BRAIN.complete(q);
          if (r && r.text) return Promise.resolve({ text: r.text, meta: r.meta || "brain", offline: true });
        } catch (e) {}
      }
      return Promise.resolve(null);
    }
    function fromCore() {
      var c = G.AKSI_CORE || G.AksiCore;
      if (!c || typeof c.query !== "function") return Promise.resolve(null);
      return Promise.race([c.query(q), new Promise(function (r) { setTimeout(function () { r(null); }, 8000); })])
        .then(function (res) {
          if (res && res.ok && res.text) return { text: res.text, meta: res.local ? "core·local" : "core·net" };
          return null;
        }).catch(function () { return null; });
    }
    function fromLLM() {
      if (G.AKSI_LLM && G.AKSI_LLM.complete) {
        return Promise.race([
          G.AKSI_LLM.complete(q).then(function (r) { return r && r.text ? { text: r.text, meta: r.providerId || "llm" } : null; }),
          new Promise(function (r) { setTimeout(function () { r(null); }, 8000); }),
        ]).catch(function () { return null; });
      }
      return Promise.resolve(null);
    }
    function fromNeuro() {
      try {
        if (G.AKSI_NEURO && G.AKSI_NEURO.generate) {
          var g = G.AKSI_NEURO.generate(q, 40, 0.5 + qx.QCLI * 0.5);
          if (g && String(g).trim().length > 8) return { text: String(g).trim(), meta: "neuro·rwkv" };
        }
      } catch (e) {}
      return null;
    }
    var chain = preferLocal
      ? fromBrain().then(function (b) {
          if (b) return b;
          return fromCore().then(function (c) {
            if (c) return c;
            var n = fromNeuro();
            return n || fromLLM();
          });
        })
      : fromCore().then(function (c) {
          if (c) return c;
          return fromBrain().then(function (b) {
            if (b) return b;
            var n = fromNeuro();
            return n || fromLLM();
          });
        });
    return chain.then(function (res) {
      if (!res || !res.text) {
        res = { text: "QSim " + (qx.bits || "?") + ", модули без ответа. Brain / Ollama.", meta: "live·empty" };
      }
      var done = function (tr) {
        var meta = (res.meta || "live") + " · q:" + (qx.bits || "?");
        if (tr && tr.trust) meta += " · trust:" + tr.trust;
        var text = String(res.text || "");
        if (text.indexOf("⟨QSim⟩") === -1 && text.length < 1200) text = text + formatQuantumFooter(qx);
        return { text: text, meta: meta, quantum: qx, trust: tr || null, offline: !!res.offline };
      };
      if (G.AKSI_TRUST && G.AKSI_TRUST.verifyResponse) {
        return G.AKSI_TRUST.verifyResponse(q, res.text, { source: "live" }).then(done).catch(function () { return done(null); });
      }
      return done(null);
    });
  }
  function status() {
    return {
      version: VER, architecture: "Quantum → Intelligence → Trust → UI",
      modules: modules(), quantumSample: G.AKSI_QUANTUM ? G.AKSI_QUANTUM.shot("status") : null,
      mission: "sovereign local-first · resonance · proof", contact: "aksilove@internet.ru",
    };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>AKSI LIVE · v' + VER + '</h2>' +
      '<p class="muted">QSim → Brain/Core/LLM → Trust</p>' +
      '<pre id="lvSt" class="out">…</pre>' +
      '<textarea id="lvIn" placeholder="Вопрос через квантовый runtime…" style="margin-top:10px"></textarea>' +
      '<div class="row"><button type="button" class="btn p" id="lvAsk">Shot + Answer</button>' +
      '<button type="button" class="btn" id="lvStBtn">Status</button></div>' +
      '<pre id="lvOut" class="out" style="margin-top:10px;max-height:260px">—</pre></div>';
    function show(x) { var el = document.getElementById("lvOut"); if (el) el.textContent = typeof x === "string" ? x : JSON.stringify(x, null, 2); }
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
  G.AKSI.quantum = function (q) { return quantumContext(q || "ping"); };
  G.AKSI.trust = function () { return G.AKSI_TRUST; };
  G.AKSI.brain = function () { return G.AKSI_BRAIN; };
  function hookOne() {
    if (!G.AKSI_ONE) return;
    G.AKSI_ONE.think = function (q) {
      return think(q).then(function (r) {
        return { text: r.text, meta: r.meta, trust: r.trust, quantum: r.quantum };
      });
    };
    G.AKSI_ONE.live = true;
    G.AKSI_ONE.version = (G.AKSI_ONE.version || "") + "+live";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(hookOne, 50); });
  else setTimeout(hookOne, 50);
})(typeof window !== "undefined" ? window : this);
