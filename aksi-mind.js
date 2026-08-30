/**
 * AKSI MIND v1.6 — offline-first + ADIA 2.0 + quantum answerGate
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.6.0-mind+quantum";
  function has(name, fn) {
    var o = G[name];
    if (!o) return false;
    if (!fn) return true;
    return typeof o[fn] === "function";
  }
  function quantumShot(q) {
    if (!has("AKSI_QUANTUM")) return null;
    try {
      var qx = null;
      if (typeof G.AKSI_QUANTUM.shot === "function") qx = G.AKSI_QUANTUM.shot(String(q || "ping").slice(0, 200));
      if (qx && qx.qcli == null && qx.QCLI != null) qx.qcli = qx.QCLI;
      if (qx && qx.QCLI == null && qx.qcli != null) qx.QCLI = qx.qcli;
      return qx;
    } catch (e) { return null; }
  }
  function quantumAnswerGate(q, text) {
    if (!has("AKSI_QUANTUM")) return null;
    try {
      if (typeof G.AKSI_QUANTUM.answerGate === "function") {
        var qx = G.AKSI_QUANTUM.answerGate(String(q || "").slice(0, 300), String(text || "").slice(0, 800));
        if (qx && qx.qcli == null && qx.QCLI != null) qx.qcli = qx.QCLI;
        if (qx && qx.QCLI == null && qx.qcli != null) qx.QCLI = qx.qcli;
        return qx;
      }
      return quantumShot(q);
    } catch (e) { return quantumShot(q); }
  }
  function fromBrain(q) {
    if (!has("AKSI_BRAIN", "complete")) return null;
    try {
      var r = G.AKSI_BRAIN.complete(q);
      if (r && r.text) return { text: r.text, meta: r.meta || "brain", source: "brain", weak: !!r.weak };
    } catch (e) {}
    return null;
  }
  function fromNeuro(q) {
    if (!has("AKSI_NEURO")) return null;
    try {
      if (typeof G.AKSI_NEURO.think === "function") {
        var r = G.AKSI_NEURO.think(q);
        if (r && r.text) return { text: r.text, meta: r.mode || r.meta || "neuro", source: "neuro", offline: true };
      }
    } catch (e) {}
    return null;
  }
  function fromWebLLM(q) {
    if (!has("AKSI_WEBLLM", "complete")) return Promise.resolve(null);
    if (!G.AKSI_WEBLLM.ready || !G.AKSI_WEBLLM.ready()) return Promise.resolve(null);
    return G.AKSI_WEBLLM.complete(q).then(function (r) {
      return r && r.text ? { text: r.text, meta: r.meta || "webllm", source: "webllm" } : null;
    }).catch(function () { return null; });
  }
  function fromWeb(q) {
    if (!has("AKSI_WEB") || !G.AKSI_WEB.isEnabled || !G.AKSI_WEB.isEnabled()) return Promise.resolve(null);
    if (typeof G.AKSI_WEB.search === "function") {
      return G.AKSI_WEB.search(q).then(function (r) {
        return r && r.text ? { text: r.text, meta: r.meta || "web", source: "web", ok: true } : null;
      }).catch(function () { return null; });
    }
    return Promise.resolve(null);
  }
  function intent(q) {
    var s = String(q || "").toLowerCase().trim();
    if (/^\/demo|^demo$/.test(s)) return "demo";
    if (/^whoami|кто ты\s*\?*$/.test(s) && /whoami/.test(s)) return "identity";
    if (/^статус$|^status$/.test(s)) return "status";
    if (/^(запомни|выучи|remember)\b/.test(s)) return "remember";
    return "chat";
  }
  function rememberCmd(q) {
    var m = String(q).match(/^(запомни|выучи|remember)\s*[:\s]+(.+)/i);
    if (!m) return null;
    var fact = m[2].trim();
    if (has("AKSI_NEURO", "learn")) try { G.AKSI_NEURO.learn(fact); } catch (e) {}
    if (has("AKSI_ONE", "remember")) try { G.AKSI_ONE.remember(fact, "user"); } catch (e) {}
    if (has("AKSI_BRAIN", "teach")) try { G.AKSI_BRAIN.teach(fact); } catch (e) {}
    return { text: "Запомнила:\n«" + fact + "»", meta: "memory", source: "memory", offline: true };
  }
  function snapshot() {
    var online = [];
    if (has("AKSI_NEURO")) online.push("neuro");
    if (has("AKSI_ALGORITHM")) online.push("adia");
    if (has("AKSI_QUANTUM")) online.push("quantum");
    if (has("AKSI_WEBLLM") && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready()) online.push("webllm");
    return { online: online, path: "Brain→WebLLM?→Neuro→ADIA→Q-gate→Web?" };
  }
  function meaningfulFallback(q) {
    return { text: "Пока нет точного факта. Напишите «запомни: …» или Lab → Neuro. Offline.", meta: "fallback", source: "mind", offline: true };
  }
  function trustWrap(q, payload, qx) {
    var text = payload.text, meta = payload.meta || "mind", sources = payload.sources || [payload.source || "mind"];
    var qxGate = quantumAnswerGate(q, text);
    if (qxGate) qx = qxGate;
    var qv = qx && (qx.QCLI != null ? qx.QCLI : qx.qcli);
    if (qv != null) meta += " · Q" + qv;
    var adiaMetrics = null, adiaSeal = null;
    if (has("AKSI_ALGORITHM", "evaluate")) {
      try {
        var ev = G.AKSI_ALGORITHM.evaluate(q, { text: text, source: payload.source || sources[0] || "mind", offline: !!payload.offline, meta: payload.meta }, { quantum: qx, seal: true });
        if (ev && ev.metrics) {
          adiaMetrics = ev.metrics; adiaSeal = ev.seal;
          if (ev.metrics.EQS != null) meta += " · EQS" + ev.metrics.EQS;
          if (ev.metrics.resonance != null) meta += " · R" + ev.metrics.resonance;
        }
      } catch (e) {}
    }
    return Promise.resolve({
      text: text, meta: meta, quantum: qx, trust: null, sources: sources,
      offline: !!payload.offline, mind: VER, adia: adiaMetrics, seal: adiaSeal
    });
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "mind", offline: true });
    var qx = quantumShot(q), it = intent(q);
    if (it === "demo") return trustWrap(q, { text: "AKSI · whoami · запомни: · статус · Lab→ADIA/Quantum/WebLLM", meta: "mind·demo", source: "mind", offline: true }, qx);
    if (it === "identity") {
      var did = "did:aksi:local";
      try { did = localStorage.getItem("aksi_did_v1") || did; } catch (e) {}
      return trustWrap(q, { text: "DID: " + did + "\nlocal-first · aksilove@internet.ru", meta: "mind·id", source: "mind", offline: true }, qx);
    }
    if (it === "status") {
      var snap = snapshot();
      return trustWrap(q, { text: "Активно: " + snap.online.join(", ") + "\n" + snap.path, meta: "mind·status", source: "mind", offline: true }, qx);
    }
    if (it === "remember") {
      var rm = rememberCmd(q);
      if (rm) return trustWrap(q, rm, qx);
    }
    var br = fromBrain(q);
    if (br && !br.weak) return trustWrap(q, { text: br.text, meta: br.meta, source: br.source, offline: true, sources: ["brain"] }, qx);
    return fromWebLLM(q).then(function (wllm) {
      if (wllm && wllm.text) return trustWrap(q, { text: wllm.text, meta: wllm.meta, source: "webllm", offline: true, sources: ["webllm"] }, qx);
      var neuro = fromNeuro(q);
      if (neuro && neuro.text) return trustWrap(q, { text: neuro.text, meta: neuro.meta || "neuro", source: "neuro", offline: true, sources: ["neuro"] }, qx);
      return fromWeb(q).then(function (web) {
        if (web && web.ok && web.text) return trustWrap(q, { text: web.text, meta: web.meta, source: "web", sources: ["web"] }, qx);
        if (neuro && neuro.text) return trustWrap(q, { text: neuro.text, meta: neuro.meta, source: "neuro", offline: true, sources: ["neuro"] }, qx);
        if (br && br.text) return trustWrap(q, { text: br.text, meta: br.meta, source: "brain", offline: true, sources: ["brain"] }, qx);
        return trustWrap(q, meaningfulFallback(q), qx);
      });
    });
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    var snap = snapshot();
    root.innerHTML = '<div class="card"><h2>MIND · v' + VER + '</h2><p class="muted">' + snap.path + '</p><pre class="out">' + JSON.stringify(snap, null, 2) + '</pre></div>';
  }
  G.AKSI_MIND = { version: VER, think: think, ask: think, mount: mount, snapshot: snapshot };
})(typeof window !== "undefined" ? window : this);
