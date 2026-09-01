/** AKSI Bot bridge — restored agent for browser */
(function (G) {
  "use strict";
  var API = (G.AKSI_API_BASE || (typeof localStorage !== "undefined" && localStorage.getItem("aksi_api")) || "https://milana-backend.replit.app").replace(/\/$/, "");

  async function capabilities() {
    try {
      var r = await fetch(API + "/", { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      return { offline: true, error: String(e.message || e), local: true };
    }
  }

  async function searchWeb(q) {
    var url = API + "/api/world/search?q=" + encodeURIComponent(q);
    var r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error("search " + r.status);
    return r.json();
  }

  async function chatRemote(message) {
    var r = await fetch(API + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, text: message }),
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) throw new Error("chat " + r.status);
    return r.json();
  }

  function chatLocal(q) {
    q = String(q || "").trim();
    if (G.AKSI_PRIORITY_ANSWER) {
      var a = G.AKSI_PRIORITY_ANSWER(q);
      if (a && a.text) return Promise.resolve({ text: a.text, source: a.source || "local", offline: true });
    }
    if (G.AKSI_MIND_L2 && G.AKSI_MIND_L2.think) {
      try {
        var m = G.AKSI_MIND_L2.think(q);
        if (m && m.text) return Promise.resolve({ text: String(m.text), source: "mind-l2", offline: true });
      } catch (e) {}
    }
    return Promise.resolve({
      text: "АКСИ-бот local. API недоступен — отвечаю ядром. Спросите «кто ты» или откройте модули.",
      source: "bot-fallback",
      offline: true
    });
  }

  async function ask(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "", source: "empty" };
    if (opts.remote) {
      try {
        var remote = await chatRemote(q);
        var text = remote.text || remote.answer || remote.message || JSON.stringify(remote).slice(0, 500);
        return { text: text, source: "remote", raw: remote };
      } catch (e) {
        var loc = await chatLocal(q);
        loc.note = "remote failed: " + (e.message || e);
        return loc;
      }
    }
    var local = await chatLocal(q);
    if (opts.alsoSearch) {
      try { local.web = await searchWeb(q); } catch (e) { local.webError = String(e.message || e); }
    }
    return local;
  }

  G.AKSIAgent = Object.freeze({
    version: "2.0.0",
    get API() { return API; },
    setApi: function (u) {
      API = String(u || "").replace(/\/$/, "");
      try { localStorage.setItem("aksi_api", API); } catch (e) {}
    },
    capabilities: capabilities,
    searchWeb: searchWeb,
    chatRemote: chatRemote,
    chatLocal: chatLocal,
    ask: ask
  });
})(typeof window !== "undefined" ? window : globalThis);
