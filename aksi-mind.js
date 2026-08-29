/**
 * AKSI MIND v1.4 — unified offline-first mind
 * Intent → Quantum → Brain → WebLLM? → Neuro → Web? → Core/LLM → Trust
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.4.0-mind";
  function has(name, method) {
    var m = G[name]; if (!m) return false;
    if (!method) return true;
    return typeof m[method] === "function";
  }
  function quantumShot(q) {
    if (!has("AKSI_QUANTUM", "shot")) return null;
    try {
      var qx = G.AKSI_QUANTUM.shot(String(q || "ping").slice(0, 200));
      if (qx && qx.qcli == null && qx.QCLI != null) qx.qcli = qx.QCLI;
      if (qx && qx.QCLI == null && qx.qcli != null) qx.QCLI = qx.qcli;
      return qx;
    } catch (e) { return { error: String(e.message || e) }; }
  }
  function fromBrain(q) {
    if (!has("AKSI_BRAIN", "complete")) return Promise.resolve(null);
    try {
      var r = G.AKSI_BRAIN.complete(q);
      if (r && r.text && String(r.meta || "").indexOf("fallback") === -1)
        return Promise.resolve({ text: r.text, meta: r.meta || "brain", source: "brain", offline: true, score: r.score });
      if (r && r.text)
        return Promise.resolve({ text: r.text, meta: r.meta || "brain", source: "brain", offline: true, weak: true });
    } catch (e) {}
    return Promise.resolve(null);
  }
  function fromCore(q) {
    var c = G.AKSI_CORE || G.AksiCore;
    if (!c || typeof c.query !== "function") return Promise.resolve(null);
    return Promise.race([c.query(q), new Promise(function (r) { setTimeout(function () { r(null); }, 10000); })])
      .then(function (res) {
        if (res && (res.ok || res.text) && res.text)
          return { text: String(res.text), meta: res.local ? "core·local" : "core·net", source: "core" };
        return null;
      }).catch(function () { return null; });
  }
  function fromWeb(q) {
    if (!has("AKSI_WEB", "search")) return fromCore(q);
    return Promise.race([
      G.AKSI_WEB.search(q).then(function (r) {
        if (r && r.text) return { text: r.text, meta: r.meta || (r.ok ? "web" : "web·empty"), source: "web", offline: !!r.offline, ok: !!r.ok };
        return null;
      }).catch(function () { return null; }),
      new Promise(function (r) { setTimeout(function () { r(null); }, 12000); })
    ]);
  }
  function meaningfulFallback(q) {
    return {
      text: "Пока нет точного ответа на «" + String(q).slice(0, 80) + "».\n\nЯ offline-first. Попробуйте: «кто ты?», «запомни: …», Lab → WebLLM / Ollama.",
      meta: "mind·guide", source: "mind", offline: true
    };
  }
  function fromLLM(q) {
    if (has("AKSI_LLM", "complete")) {
      return Promise.race([
        G.AKSI_LLM.complete(q).then(function (r) {
          return r && r.text ? { text: r.text, meta: r.providerId || r.providerLabel || "llm", source: "llm" } : null;
        }).catch(function () { return null; }),
        new Promise(function (r) { setTimeout(function () { r(null); }, 45000); })
      ]);
    }
    return Promise.resolve(null);
  }
  function fromNeuro(q) {
    if (!has("AKSI_NEURO")) return null;
    try {
      if (typeof G.AKSI_NEURO.think === "function") {
        var r = G.AKSI_NEURO.think(q);
        if (r && r.text && String(r.text).trim().length > 4)
          return { text: String(r.text).trim(), meta: (r.mode || "neuro") + (r.steps != null ? " · " + r.steps : ""), source: "neuro", offline: true, mode: r.mode, score: r.score };
      }
      if (typeof G.AKSI_NEURO.generate === "function") {
        var g = G.AKSI_NEURO.generate(q, 48, 0.55);
        if (g && String(g).trim().length > 12) return { text: String(g).trim(), meta: "neuro", source: "neuro", offline: true };
      }
    } catch (e) {}
    return null;
  }
  function fromWebLLM(q) {
    if (!has("AKSI_WEBLLM") || !G.AKSI_WEBLLM.ready || !G.AKSI_WEBLLM.ready()) return Promise.resolve(null);
    try {
      return G.AKSI_WEBLLM.complete(q).then(function (r) {
        if (r && r.text && String(r.text).trim().length > 4)
          return { text: String(r.text).trim(), meta: r.meta || "webllm", source: "webllm", offline: true, model: r.model };
        return null;
      }).catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function intent(q) {
    var low = String(q || "").toLowerCase().trim();
    if (/^\/demo\b|^demo$/i.test(low)) return "demo";
    if (/^whoami$/i.test(low)) return "identity";
    if (/^(запомни|выучи)\s*[:\s]/i.test(low)) return "remember";
    if (/что ты помнишь|что ты знаешь|забудь всё/i.test(low)) return "memory";
    if (/^[0-9\s+\-*/×÷.,()]+\??$/.test(low) || /посчитай|сколько будет/i.test(low)) return "math";
    if (/^(привет|здравств|hello|hi)\b/.test(low)) return "greet";
    if (/кто ты|что ты такое/i.test(low)) return "persona";
    if (/статус|health|модул/i.test(low)) return "status";
    if (/документ|проверить текст|dkv/i.test(low)) return "dkv";
    if (/комната|overlay|p2p|сеть/i.test(low)) return "net";
    return "general";
  }
  function demoText() { return "AKSI · whoami · /demo · запомни: факт · статус · Lab→WebLLM"; }
  function identityText() {
    var did = "did:aksi:local"; try { did = localStorage.getItem("aksi_did_v1") || did; } catch (e) {}
    return "DID: " + did + "\nКлючи local-first · aksilove@internet.ru";
  }
  function statusSnapshot() {
    var mods = {
      quantum: has("AKSI_QUANTUM"), brain: has("AKSI_BRAIN"),
      core: !!(G.AKSI_CORE || G.AksiCore), trust: has("AKSI_TRUST"),
      neuro: has("AKSI_NEURO"), webllm: has("AKSI_WEBLLM") && G.AKSI_WEBLLM.ready && G.AKSI_WEBLLM.ready(),
      web: has("AKSI_WEB"), llm: has("AKSI_LLM"), mind: true
    };
    var on = Object.keys(mods).filter(function (k) { return mods[k]; });
    return { version: VER, product: "AKSI Unified Mind", modules: mods, online: on,
      path: "Intent → Brain → WebLLM? → Neuro → Web? → Core/LLM → Trust", contact: "aksilove@internet.ru" };
  }
  function rememberCmd(q) {
    var m = String(q).match(/^(запомни|выучи)\s*[:\s]+(.+)/i);
    if (!m) return null;
    var fact = m[2].trim();
    if (has("AKSI_ONE", "remember")) try { G.AKSI_ONE.remember(fact, "user"); } catch (e) {}
    if (has("AKSI_BRAIN", "teach")) try { G.AKSI_BRAIN.teach(fact); } catch (e) {}
    if (has("AKSI_NEURO", "learn")) try { G.AKSI_NEURO.learn(fact); } catch (e) {}
    return { text: "Запомнила:\n«" + fact + "»", meta: "mind·memory", source: "memory", offline: true };
  }
  function trustWrap(q, payload, qx) {
    var text = payload.text, meta = payload.meta || "mind", sources = payload.sources || [payload.source || "mind"];
    var qv = qx && (qx.QCLI != null ? qx.QCLI : qx.qcli);
    if (qv != null) meta += " · Q" + qv;
    if (qx && qx.resonance != null) meta += " · R" + qx.resonance;
    function pack(tr) {
      if (tr && tr.trust) meta += " · trust:" + tr.trust;
      return { text: text, meta: meta, quantum: qx, trust: tr || null, sources: sources, offline: !!payload.offline, mind: VER };
    }
    if (!has("AKSI_TRUST", "verifyResponse")) return Promise.resolve(pack(null));
    return G.AKSI_TRUST.verifyResponse(q, String(text).split("\n\u2014\u2014\n")[0], { source: "mind" }).then(pack).catch(function () { return pack(null); });
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Напишите вопрос.", meta: "mind", mind: VER });
    var qx = quantumShot(q), it = intent(q);
    if (it === "demo") return trustWrap(q, { text: demoText(), meta: "mind·demo", source: "mind", offline: true }, qx);
    if (it === "identity") return trustWrap(q, { text: identityText(), meta: "mind·id", source: "mind", offline: true }, qx);
    if (it === "status") {
      var snap = statusSnapshot();
      return trustWrap(q, { text: "Активно: " + snap.online.join(", ") + "\n" + snap.path, meta: "mind·status", source: "mind", offline: true }, qx);
    }
    if (it === "remember") { var rm = rememberCmd(q); if (rm) return trustWrap(q, rm, qx); }
    return fromBrain(q).then(function (br) {
      if (br && !br.weak) return trustWrap(q, { text: br.text, meta: br.meta, source: br.source, offline: true, sources: ["brain"] }, qx);
      return fromWebLLM(q).then(function (wllm) {
        if (wllm && wllm.text) return trustWrap(q, { text: wllm.text, meta: wllm.meta, source: "webllm", offline: true, sources: ["webllm"] }, qx);
        var neuro = fromNeuro(q);
        if (neuro && neuro.text && String(neuro.text).length > 8)
          return trustWrap(q, { text: neuro.text, meta: neuro.meta || "neuro", source: "neuro", offline: true, sources: ["neuro"] }, qx);
        var wantWeb = has("AKSI_WEB") && G.AKSI_WEB.isEnabled && G.AKSI_WEB.isEnabled();
        var webP = wantWeb ? fromWeb(q) : Promise.resolve(null);
        return webP.then(function (web) {
          if (web && web.ok && web.text) return trustWrap(q, { text: web.text, meta: web.meta, source: "web", sources: ["web"] }, qx);
          return fromCore(q).then(function (core) {
            if (core && core.text) return trustWrap(q, { text: core.text, meta: core.meta, source: core.source, sources: ["core"] }, qx);
            return fromLLM(q).then(function (llm) {
              if (llm && llm.text) return trustWrap(q, { text: llm.text, meta: llm.meta, source: llm.source, sources: ["llm"] }, qx);
              if (neuro && neuro.text) return trustWrap(q, { text: neuro.text, meta: neuro.meta, source: "neuro", offline: true, sources: ["neuro"] }, qx);
              if (br && br.text) return trustWrap(q, { text: br.text, meta: br.meta, source: "brain", offline: true, sources: ["brain"] }, qx);
              return trustWrap(q, meaningfulFallback(q), qx);
            });
          });
        });
      });
    });
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel; if (!root) return;
    var snap = statusSnapshot();
    root.innerHTML = '<div class="card"><h2>AKSI MIND · v' + VER + '</h2><p class="muted">' + snap.path + '</p>' +
      '<pre id="mindSt" class="out">' + JSON.stringify(snap, null, 2) + '</pre>' +
      '<textarea id="mindIn" placeholder="Вопрос…" style="margin-top:10px"></textarea>' +
      '<div class="row"><button type="button" class="btn primary" id="mindAsk">Think</button></div>' +
      '<pre id="mindOut" class="out" style="margin-top:10px">—</pre></div>';
    document.getElementById("mindAsk").onclick = function () {
      document.getElementById("mindOut").textContent = "thinking…";
      think(document.getElementById("mindIn").value).then(function (r) {
        document.getElementById("mindOut").textContent = r.text + "\n\n[" + r.meta + "]";
      });
    };
  }
  function hookOne() {
    if (!G.AKSI_ONE || typeof G.AKSI_ONE.think !== "function") return;
    if (G.AKSI_ONE._mindHooked) return;
    var prev = G.AKSI_ONE.think;
    G.AKSI_ONE.think = function (q) {
      if (G.AKSI_ONE.think._viaMind) return prev(q);
      return think(q);
    };
    G.AKSI_ONE._mindHooked = true;
  }
  G.AKSI_MIND = { version: VER, think: think, ask: think, status: statusSnapshot, intent: intent, mount: mount };
  G.AKSI = G.AKSI || {}; G.AKSI.mind = VER; G.AKSI.think = think;
  if (typeof document !== "undefined") {
    function tryHook(n) { n = n || 0; hookOne(); if (!G.AKSI_ONE || !G.AKSI_ONE._mindHooked) { if (n < 25) setTimeout(function () { tryHook(n + 1); }, 100); } }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { tryHook(0); }); else tryHook(0);
  }
})(typeof window !== "undefined" ? window : this);
