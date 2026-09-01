/** AKSI Bot v2.1 — local answers always; optional API */
(function (G) {
  "use strict";
  var API = "https://milana-backend.replit.app";
  try { var s = localStorage.getItem("aksi_api"); if (s) API = s.replace(/\/$/, ""); } catch (e) {}

  function localAnswer(q) {
    q = String(q || "").trim();
    var low = q.toLowerCase();
    if (/\u043a\u0442\u043e \u0442\u044b|what are you|who are you/.test(low))
      return { text: "\u042f \u0410\u041a\u0421\u0418-\u0431\u043e\u0442 \u2014 \u0430\u0433\u0435\u043d\u0442 \u0441\u0443\u0432\u0435\u0440\u0435\u043d\u043d\u043e\u0433\u043e \u0418\u0418.\nLocal-first. \u041c\u043e\u0434\u0443\u043b\u0438: \u0447\u0430\u0442, \u043f\u0430\u043c\u044f\u0442\u044c, \u0434\u043e\u0432\u0435\u0440\u0438\u0435, \u043a\u0432\u0430\u043d\u0442, MATRIX.\naksilove@internet.ru", source: "identity" };
    if (/\u043a\u0430\u043a \u043f\u043e\u043b\u044c\u0437|how to use/.test(low))
      return { text: "1. \u041c\u043e\u0434\u0443\u043b\u044c \u043d\u0430 \u0433\u043b\u0430\u0432\u043d\u043e\u0439\n2. \u0427\u0430\u0442 / \u0431\u043e\u0442\n3. MATRIX\n4. Trust \u2014 \u0448\u0438\u0444\u0440\u043e\u0432\u0430\u043d\u0438\u0435", source: "guide" };
    if (/\u043c\u043e\u0434\u0443\u043b|\u0447\u0442\u043e \u0443\u043c\u0435|capabilit/.test(low))
      return { text: "\u041c\u043e\u0434\u0443\u043b\u0438: \u0427\u0430\u0442, Local AI, MATRIX, \u041a\u0432\u0430\u043d\u0442, Proof, Globe, Net, Protocol, ADIA, Bot.\n\u0423\u0437\u043b\u044b \u0432\u0430\u0448\u0435\u0439 \u0441\u0435\u0442\u0438.", source: "caps" };
    if (/\u043a\u0432\u0430\u043d\u0442|quantum|qcli/.test(low))
      return { text: "\u041a\u0432\u0430\u043d\u0442 \u0410\u041a\u0421\u0418 \u2014 state-vector \u0441\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 (QCLI), \u043d\u0435 \u0444\u0438\u0437\u0438\u0447\u0435\u0441\u043a\u0438\u0439 QPU.\n/quantum/", source: "quantum" };
    if (/\u0441\u0435\u0442\u044c|\u0438\u043d\u0442\u0435\u0440\u043d\u0435\u0442|net/.test(low))
      return { text: "\u0410\u041a\u0421\u0418-\u0421\u0435\u0442\u044c: Chat\u2194Mem\u2194Trust\u2194Quantum\u2194Bot.\n\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u043f\u043e\u0438\u0441\u043a \u2014 \u043e\u043f\u0446\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e.", source: "net" };
    if (G.AKSI_PRIORITY_ANSWER) {
      try { var a = G.AKSI_PRIORITY_ANSWER(q); if (a && a.text) return { text: String(a.text), source: a.source || "priority", offline: true }; } catch (e) {}
    }
    return { text: "\u041f\u0440\u0438\u043d\u044f\u0442\u043e: \u00ab" + q.slice(0, 100) + "\u00bb.\n\u0421\u043f\u0440\u043e\u0441\u0438\u0442\u0435: \u043a\u0442\u043e \u0442\u044b \u00b7 \u043c\u043e\u0434\u0443\u043b\u0438 \u00b7 \u043a\u0432\u0430\u043d\u0442 \u00b7 \u0441\u0435\u0442\u044c", source: "fallback", offline: true };
  }

  async function capabilities() {
    try {
      var r = await fetch(API + "/", { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      var j = await r.json(); j.offline = false; return j;
    } catch (e) {
      return { offline: true, local: true, agent: "2.1", error: String(e.message || e) };
    }
  }

  async function searchWeb(q) {
    var r = await fetch(API + "/api/world/search?q=" + encodeURIComponent(q), { signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error("search " + r.status);
    return r.json();
  }

  async function ask(q, opts) {
    opts = opts || {};
    q = String(q || "").trim();
    if (!q) return { text: "", source: "empty" };
    var local = localAnswer(q);
    local.offline = true;
    if (opts.alsoSearch) {
      try { local.web = await searchWeb(q); local.offline = false; } catch (e) { local.webError = String(e.message || e); }
    }
    return local;
  }

  G.AKSIAgent = { version: "2.1.0", get API() { return API; }, capabilities: capabilities, searchWeb: searchWeb, ask: ask, localAnswer: localAnswer };
})(typeof window !== "undefined" ? window : globalThis);
