/**
 * AKSI WHOLE v1.1 — health registry + unified ask()
 * © AKSI · aksilove@internet.ru · Proprietary
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-whole";
  var REGISTRY = [
    { id: "core", global: "AKSI_CORE", also: "AksiCore", role: "wiki/search" },
    { id: "quantum", global: "AKSI_QUANTUM", role: "state-vector QEngine" },
    { id: "overlay", global: "AKSI_OVERLAY", role: "AOP/1 network layer" },
    { id: "live", global: "AKSI_LIVE", role: "Q→Brain→Trust pipeline" },
    { id: "lang", global: "AKSI_LANG", role: "domain language" },
    { id: "trust", global: "AKSI_TRUST", role: "verify_response + chain" },
    { id: "mind", global: "AKSI_MIND", role: "unified mind" },
    { id: "brain", global: "AKSI_BRAIN", role: "offline intelligence" },
    { id: "photo", global: "AKSI_PHOTO", role: "OCR + vision" },
    { id: "seal", global: "AKSI_SEAL", role: "PQ hybrid seal" },
    { id: "vision", global: "AKSI_VISION", role: "camera OCR" },
    { id: "one", global: "AKSI_ONE", role: "UI chat runtime" },
    { id: "dkv", global: "AKSI_DKV", role: "document claim verifier" },
    { id: "p2p", global: "AKSI_P2P", role: "PeerJS rooms" },
    { id: "llm", global: "AKSI_LLM", role: "provider adapter" },
    { id: "pq", global: "AKSI_PQ", role: "post-quantum hybrid" },
    { id: "neuro", global: "AKSI_NEURO", role: "RWKV-style local net" },
    { id: "relay", global: "AKSI_RELAY", role: "WS relay client" },
  ];
  function present(name) { return G[name] != null; }
  function health() {
    var mods = {};
    REGISTRY.forEach(function (r) {
      var ok = present(r.global) || (r.also && present(r.also));
      mods[r.id] = { ok: ok, global: r.global, role: r.role };
    });
    var path = "MIND → Quantum → Brain/Core/LLM → Trust → UI";
    if (mods.overlay && mods.overlay.ok) path = "Overlay∥ " + path;
    return {
      version: VER, product: "AKSI Decision Integrity Runtime", path: path,
      modules: mods, contact: "aksilove@internet.ru", license: "Proprietary", localFirst: true,
    };
  }
  function ask(q) {
    q = String(q || "").trim();
    if (!q) return Promise.resolve({ text: "Пустой запрос.", meta: "whole" });
    if (G.AKSI_MIND && typeof G.AKSI_MIND.think === "function") return G.AKSI_MIND.think(q);
    if (G.AKSI_LIVE && typeof G.AKSI_LIVE.think === "function") return G.AKSI_LIVE.think(q);
    if (G.AKSI_ONE && typeof G.AKSI_ONE.think === "function") return G.AKSI_ONE.think(q);
    if (G.AKSI_BRAIN && typeof G.AKSI_BRAIN.complete === "function") {
      try {
        var r = G.AKSI_BRAIN.complete(q);
        return Promise.resolve(r || { text: "…", meta: "brain" });
      } catch (e) {
        return Promise.resolve({ text: String(e.message || e), meta: "error" });
      }
    }
    return Promise.resolve({ text: "Модули интеллекта не загружены.", meta: "whole·empty" });
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    var h = health();
    var lines = Object.keys(h.modules).map(function (k) {
      var m = h.modules[k];
      return (m.ok ? "✓" : "·") + " " + k + " — " + m.role;
    }).join("\n");
    root.innerHTML = '<div class="card"><h2>AKSI WHOLE · v' + VER + '</h2>' +
      '<p class="muted">' + h.path + '</p>' +
      '<pre class="out" style="white-space:pre-wrap">' + lines + '</pre>' +
      '<p class="muted" style="margin-top:8px">ask() → MIND / LIVE / ONE / Brain</p></div>';
  }
  G.AKSI_WHOLE = { version: VER, health: health, ask: ask, mount: mount, registry: REGISTRY };
  G.AKSI = G.AKSI || {};
  G.AKSI.whole = VER;
  G.AKSI.health = health;
  if (!G.AKSI.ask) G.AKSI.ask = ask;
})(typeof window !== "undefined" ? window : this);
