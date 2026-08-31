/**
 * AKSI Product Ready v55 — Mem↔Neuro · P2P · tok/s
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v55";
  function $(id) { return document.getElementById(id); }

  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    if (!q) return null;
    var teach = q.match(/^(?:запомни|выучи|remember)\s*[:：]\s*(.+)$/i);
    if (teach && teach[1]) {
      var fact = teach[1].trim();
      try { if (G.AKSI_RAG && AKSI_RAG.add) AKSI_RAG.add(fact); } catch (e) {}
      try { if (G.AKSI_NEURO && AKSI_NEURO.learn) AKSI_NEURO.learn(fact); } catch (e2) {}
      try { if (G.AKSI_PRODUCT && AKSI_PRODUCT.refreshHome) AKSI_PRODUCT.refreshHome(); } catch (e3) {}
      return { text: "Запомнила в Mem + Neuro: " + fact.slice(0, 200), source: "mem·teach" };
    }
    try {
      if (G.AKSI_MIND_L2 && AKSI_MIND_L2.think) {
        var r = AKSI_MIND_L2.think(q);
        if (r && r.text && (r.confidence >= 0.85 || (r.intent && r.intent !== "general")))
          return { text: r.text, source: r.meta || "mind-l2" };
      }
    } catch (e) {}
    try {
      if (G.AKSI_NEURO && AKSI_NEURO.think) {
        var n = AKSI_NEURO.think(q);
        if (n && n.text && String(n.text).length > 20)
          return { text: String(n.text), source: "neuro · " + (n.mode || "v5") };
      }
    } catch (e2) {}
    try {
      if (G.AKSI_CORE_AI && AKSI_CORE_AI.think) {
        var c = AKSI_CORE_AI.think(q);
        if (c && c.text && String(c.text).length > 12)
          return { text: c.text, source: c.meta || "core" };
      }
    } catch (e3) {}
    return null;
  };

  function refreshHome() {
    try {
      var mods = 0;
      ["AKSI_MIND_L2", "AKSI_NEURO", "AKSI_RAG", "AKSI_WEBLLM", "AKSI_TRUST_VAULT", "AKSI_P2P"].forEach(function (k) { if (G[k]) mods++; });
      if ($("kvMods")) $("kvMods").textContent = String(mods);
      if ($("kvNeuro")) $("kvNeuro").textContent = G.AKSI_MIND_L2 ? "L2" : (G.AKSI_NEURO ? "on" : "—");
      var docs = (G.AKSI_RAG && AKSI_RAG.status) ? (AKSI_RAG.status().docs || 0) : 0;
      if ($("kvMem")) $("kvMem").textContent = String(docs);
      if ($("memN")) $("memN").textContent = String(docs);
      if ($("kvEqs") && G.AKSI_MIND_L2 && AKSI_MIND_L2.formula) $("kvEqs").textContent = String(AKSI_MIND_L2.formula().display || "—");
    } catch (e) {}
  }

  function refreshStats() {
    var box = $("statsBox");
    if (!box) return;
    var lines = [];
    try {
      if (G.AKSI_PERF && AKSI_PERF.snapshot) {
        var p = AKSI_PERF.snapshot();
        lines.push("tok/s: " + (p.tps != null ? p.tps : "—") + " · tokens: " + (p.tokens != null ? p.tokens : "—"));
      } else if (G.AKSI_PERF && AKSI_PERF.renderInto) { AKSI_PERF.renderInto(box); }
    } catch (e) {}
    try {
      if (G.AKSI_WEBLLM && AKSI_WEBLLM.status) {
        var w = AKSI_WEBLLM.status();
        lines.push("LLM: " + (w.ready ? "ready" : (w.loading ? "loading " + (w.progress || 0) + "%" : "off")));
      }
    } catch (e2) {}
    try {
      if (G.AKSI_NEURO && AKSI_NEURO.status) {
        var n = AKSI_NEURO.status();
        lines.push("Neuro seed " + (n.seed || 0) + " · mem " + (n.mem || 0));
      }
    } catch (e3) {}
    try { if (G.AKSI_RAG && AKSI_RAG.status) lines.push("RAG: " + (AKSI_RAG.status().docs || 0) + " docs"); } catch (e4) {}
    try {
      if (G.AKSI_P2P && AKSI_P2P.status) {
        var s = AKSI_P2P.status();
        lines.push("P2P: " + (s.pc || "?") + " · ch " + (s.channel || "?"));
      }
    } catch (e5) {}
    lines.push("WebGPU: " + (navigator.gpu ? "yes" : "no"));
    lines.push("Product: " + VER);
    if (lines.length) box.textContent = lines.join("\n");
  }

  function wireTeach() {
    var btn = $("btnTeach");
    if (!btn) return;
    btn.onclick = async function () {
      var v = (($("teachIn") && $("teachIn").value) || "").replace(/^(запомни|выучи)\s*[:：]\s*/i, "").trim();
      if (!v) return;
      btn.disabled = true;
      try {
        if (G.AKSI_RAG && AKSI_RAG.add) await AKSI_RAG.add(v);
        if (G.AKSI_NEURO && AKSI_NEURO.learn) AKSI_NEURO.learn(v);
        if ($("teachIn")) $("teachIn").value = "";
        refreshHome();
        var list = $("memList");
        if (list) { var line = document.createElement("div"); line.textContent = "✓ " + v.slice(0, 120); list.insertBefore(line, list.firstChild); }
        alert("Выучила: " + v.slice(0, 80) + "\nСпроси в Chat — Neuro подхватит.");
      } catch (e) { alert(e.message || e); }
      btn.disabled = false;
    };
  }

  function wireP2P() {
    var logEl = $("sdpLog");
    function slog(m) { if (logEl) logEl.textContent = String(m) + "\n" + (logEl.textContent || "").slice(0, 400); }
    if (!G.AKSI_P2P) { if (logEl) logEl.textContent = "P2P не загружен"; return; }
    if (G.AKSI_P2P.setLog) G.AKSI_P2P.setLog(slog);
    if ($("sdpOffer")) $("sdpOffer").onclick = async function () {
      try { slog("create offer…"); var sdp = await AKSI_P2P.createOffer(); if ($("sdpBox")) $("sdpBox").value = sdp; slog("Offer готов — скопируй второй стороне"); }
      catch (e) { slog(String(e.message || e)); }
    };
    if ($("sdpAnswer")) $("sdpAnswer").onclick = async function () {
      try {
        var raw = ($("sdpBox") && $("sdpBox").value) || "";
        if (!raw.trim()) return slog("вставь remote SDP");
        slog("accept…");
        var out = await AKSI_P2P.acceptRemote(raw);
        if (out && $("sdpBox")) $("sdpBox").value = typeof out === "string" ? out : JSON.stringify(out);
        slog("Answer/setRemote OK");
      } catch (e) { slog(String(e.message || e)); }
    };
    if ($("sdpEmbed")) $("sdpEmbed").onclick = function () {
      try {
        var text = prompt("Текст embedding:", "AKSI hello");
        if (text == null) return;
        var msg = AKSI_P2P.sendEmbedding(text, { from: "aksi" });
        if ($("sdpBox") && msg) $("sdpBox").value = JSON.stringify(msg, null, 2);
        slog("embedding ready");
      } catch (e) { slog(String(e.message || e)); }
    };
    G.AKSI_P2P_ON_EMBED = function (data) { slog("recv embedding dim=" + (data.vec && data.vec.length)); };
  }

  function wireChips() {
    document.querySelectorAll("[data-q]").forEach(function (chip) {
      if (chip.__aksiReady) return;
      chip.__aksiReady = 1;
      chip.addEventListener("click", function () {
        var q = chip.getAttribute("data-q");
        if (!q) return;
        if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        if ($("inp")) $("inp").value = q;
        setTimeout(function () { if ($("send")) $("send").click(); }, 40);
      });
    });
  }

  function wireLab() {
    var btn = $("btnMetrics");
    if (!btn || btn.__aksiLab) return;
    btn.__aksiLab = 1;
    btn.addEventListener("click", function () {
      var out = $("labMetrics");
      if (!out) return;
      try {
        if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
          var r = AKSI_ALGORITHM.evaluate("что такое АКСИ", "АКСИ local-first offline", { offline: true, seal: false });
          out.textContent = JSON.stringify(r.metrics || r, null, 2);
        } else out.textContent = "algorithm missing";
      } catch (e) { out.textContent = String(e.message || e); }
    });
  }

  function hookTabs() {
    var prev = G.AKSI_SHOW_TAB;
    if (typeof prev !== "function" || prev.__aksi55) return;
    var w = function (t) { prev(t); if (t === "stats") refreshStats(); if (t === "home" || t === "mem") refreshHome(); };
    w.__aksi55 = 1; G.AKSI_SHOW_TAB = w; G.AKSI_NAV_GO = w;
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th) return;
    if (th.children.length === 1) {
      var t = th.textContent || "";
      if (/v35|v5[0-4]/.test(t) && !/v55/.test(t)) th.innerHTML = "";
    }
    if (th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML = '<div class="bub">АКСИ v55\n• Chat: любой вопрос · «запомни: факт»\n• Mem → Учить → Neuro\n• Local: WebLLM + tok/s\n• Stats: P2P Offer/Answer\naksilove@internet.ru</div>';
    th.appendChild(d);
  }

  function boot() {
    wireChips(); wireTeach(); wireLab(); wireP2P();
    if ($("wlGpu")) $("wlGpu").textContent = navigator.gpu ? "yes" : "no";
    if ($("localCaps")) $("localCaps").textContent = navigator.gpu ? "WebGPU OK · LLM → tok/s в Stats" : "WebGPU нет · Chat offline";
    patchWelcome(); refreshHome(); hookTabs();
    document.addEventListener("aksi-perf", refreshStats);
    setTimeout(wireChips, 300); setTimeout(refreshHome, 600); setTimeout(hookTabs, 80); setTimeout(wireP2P, 200);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v55 · Mem↔Neuro · P2P · tok/s";
    if (document.title) document.title = "АКСИ v55";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  G.AKSI_PRODUCT = { version: VER, refreshHome: refreshHome, refreshStats: refreshStats };
})(typeof window !== "undefined" ? window : globalThis);
