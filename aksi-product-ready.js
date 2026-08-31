/**
 * AKSI Product Ready v54
 * Arbitrary chat answers (Mind L2 → Neuro → Core), Local progress, Stats refresh
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v54";

  function $(id) { return document.getElementById(id); }

  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    if (!q) return null;

    try {
      if (G.AKSI_MIND_L2 && AKSI_MIND_L2.think) {
        var r = AKSI_MIND_L2.think(q);
        if (r && r.text) {
          if (r.confidence >= 0.85 || (r.intent && r.intent !== "general")) {
            return { text: r.text, source: r.meta || "mind-l2" };
          }
        }
      }
    } catch (e) {}

    try {
      if (G.AKSI_NEURO && AKSI_NEURO.think) {
        var n = AKSI_NEURO.think(q);
        if (n && n.text && String(n.text).length > 20) {
          return { text: String(n.text), source: "neuro · " + (n.mode || "v5") };
        }
      }
    } catch (e2) {}

    try {
      if (G.AKSI_CORE_AI && AKSI_CORE_AI.think) {
        var c = AKSI_CORE_AI.think(q);
        if (c && c.text && String(c.text).length > 12) {
          return { text: c.text, source: c.meta || "core" };
        }
      }
    } catch (e3) {}

    return null;
  };

  function refreshHome() {
    try {
      var mods = 0;
      ["AKSI_MIND_L2", "AKSI_NEURO", "AKSI_RAG", "AKSI_WEBLLM", "AKSI_TRUST_VAULT", "AKSI_ORGANISM", "AKSI_ALGORITHM"].forEach(function (k) {
        if (G[k]) mods++;
      });
      if ($("kvMods")) $("kvMods").textContent = String(mods);
      if ($("kvNeuro")) $("kvNeuro").textContent = G.AKSI_MIND_L2 ? "L2" : (G.AKSI_NEURO ? "on" : "—");
      if ($("kvMem") && G.AKSI_RAG && AKSI_RAG.status) {
        $("kvMem").textContent = String(AKSI_RAG.status().docs || 0);
      }
      if ($("kvEqs") && G.AKSI_MIND_L2 && AKSI_MIND_L2.formula) {
        $("kvEqs").textContent = String(AKSI_MIND_L2.formula().display || "—");
      }
      if ($("memN") && G.AKSI_RAG && AKSI_RAG.status) {
        $("memN").textContent = String(AKSI_RAG.status().docs || 0);
      }
    } catch (e) {}
  }

  function refreshStats() {
    var box = $("statsBox");
    if (!box) return;
    var lines = [];
    try {
      if (G.AKSI_PERF && AKSI_PERF.snapshot) {
        lines.push("Perf: " + JSON.stringify(AKSI_PERF.snapshot()));
      } else if (G.AKSI_PERF && AKSI_PERF.renderInto) {
        AKSI_PERF.renderInto(box);
        return;
      }
    } catch (e) {}
    try {
      if (G.AKSI_WEBLLM && AKSI_WEBLLM.status) {
        var w = AKSI_WEBLLM.status();
        lines.push("LLM: " + (w.ready ? "ready" : (w.loading ? "loading " + (w.progress || 0) + "%" : "off")) +
          (w.model ? " · " + w.model : ""));
      }
    } catch (e2) {}
    try {
      if (G.AKSI_NEURO && AKSI_NEURO.status) {
        var n = AKSI_NEURO.status();
        lines.push("Neuro: " + (n.ver || n.arch) + " · seed " + (n.seed || 0) + " · mem " + (n.mem || 0));
      }
    } catch (e3) {}
    try {
      if (G.AKSI_RAG && AKSI_RAG.status) {
        lines.push("RAG docs: " + (AKSI_RAG.status().docs || 0));
      }
    } catch (e4) {}
    lines.push("WebGPU: " + (navigator.gpu ? "yes" : "no"));
    lines.push("Product: " + VER);
    if (lines.length) box.textContent = lines.join("\n");
    try {
      if (G.AKSI_STATS && AKSI_STATS.renderInto && $("pulseBox")) {
        AKSI_STATS.renderInto($("pulseBox"));
      }
    } catch (e5) {}
  }

  function wireChips() {
    document.querySelectorAll("[data-q]").forEach(function (chip) {
      if (chip.__aksiReady) return;
      chip.__aksiReady = 1;
      chip.addEventListener("click", function () {
        var q = chip.getAttribute("data-q");
        if (!q) return;
        if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        var inp = $("inp");
        if (inp) inp.value = q;
        setTimeout(function () {
          var send = $("send");
          if (send) send.click();
        }, 40);
      });
    });
  }

  function enhanceLocalUX() {
    var loadBtn = $("wlLoad");
    if (loadBtn && !loadBtn.__aksi54) {
      loadBtn.__aksi54 = 1;
      loadBtn.addEventListener("click", function () {
        var out = $("wlOut");
        if (out) out.textContent = "Старт загрузки WebLLM…\nНужен Chrome/Edge + WebGPU. Первый раз — скачивание весов.";
        if ($("wlState")) $("wlState").textContent = "…";
      }, true);
    }
    var caps = $("localCaps");
    if (caps) {
      caps.textContent = navigator.gpu
        ? "WebGPU OK · выбери модель → Загрузить LLM"
        : "WebGPU нет · Chat работает offline (Mind L2 + Neuro)";
    }
    if ($("wlGpu")) $("wlGpu").textContent = navigator.gpu ? "yes" : "no";
  }

  function wireLab() {
    var btn = $("btnMetrics");
    if (!btn || btn.__aksiLab) return;
    btn.__aksiLab = 1;
    btn.addEventListener("click", function () {
      var out = $("labMetrics");
      if (!out) return;
      out.textContent = "…";
      try {
        if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
          var r = AKSI_ALGORITHM.evaluate("что такое АКСИ", "АКСИ local-first Mind L2 offline", { offline: true, seal: false });
          out.textContent = JSON.stringify(r.metrics || r, null, 2);
          return;
        }
        out.textContent = "algorithm missing";
      } catch (e) {
        out.textContent = String(e.message || e);
      }
    });
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th) return;
    if (th.children.length === 1) {
      var t = th.textContent || "";
      if (/v35|Pulse|v5[0-3]/.test(t) && !/v54/.test(t)) th.innerHTML = "";
    }
    if (th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML =
      '<div class="bub">АКСИ v54 · offline продукт\n' +
      "Пиши любой вопрос — Mind L2 + Neuro отвечают без сервера.\n" +
      "Local = LLM (WebGPU). Mem = Учить. Trust = .aksi\n" +
      "aksilove@internet.ru</div>";
    th.appendChild(d);
  }

  function hookTabRefresh() {
    var prev = G.AKSI_SHOW_TAB;
    if (typeof prev !== "function" || prev.__aksi54) return;
    var wrapped = function (t) {
      prev(t);
      if (t === "stats") refreshStats();
      if (t === "home") refreshHome();
      if (t === "mem") refreshHome();
    };
    wrapped.__aksi54 = 1;
    G.AKSI_SHOW_TAB = wrapped;
    G.AKSI_NAV_GO = wrapped;
  }

  function boot() {
    wireChips();
    wireLab();
    enhanceLocalUX();
    patchWelcome();
    refreshHome();
    hookTabRefresh();
    setTimeout(wireChips, 300);
    setTimeout(refreshHome, 500);
    setTimeout(refreshHome, 1500);
    setTimeout(hookTabRefresh, 100);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v54 · готовый продукт · Mind L2 + Neuro";
    if (document.title) document.title = "АКСИ v54";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  G.AKSI_PRODUCT = { version: VER, refreshHome: refreshHome, refreshStats: refreshStats };
})(typeof window !== "undefined" ? window : globalThis);
