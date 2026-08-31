/**
 * AKSI Product Ready v53 — chat reliability, home metrics, lab, local UX
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v53";

  function $(id) { return document.getElementById(id); }

  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    if (!q) return null;
    try {
      if (G.AKSI_MIND_L2 && AKSI_MIND_L2.think) {
        var r = AKSI_MIND_L2.think(q);
        if (r && r.text && (r.confidence >= 0.88 || (r.intent && r.intent !== "general"))) {
          return { text: r.text, source: r.meta || "mind-l2" };
        }
      }
    } catch (e) {}
    try {
      if (G.AKSI_CORE_AI && AKSI_CORE_AI.think) {
        var c = AKSI_CORE_AI.think(q);
        if (c && c.text && c.intent && c.intent !== "general") {
          return { text: c.text, source: c.meta || "core" };
        }
      }
    } catch (e2) {}
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
        var f = AKSI_MIND_L2.formula();
        $("kvEqs").textContent = String(f.display || "—");
      }
    } catch (e) {}
  }

  function wireChips() {
    document.querySelectorAll("[data-q]").forEach(function (chip) {
      if (chip.__aksiReady) return;
      chip.__aksiReady = 1;
      chip.addEventListener("click", function () {
        var q = chip.getAttribute("data-q");
        if (!q) return;
        if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        else if (typeof G.goTab === "function") try { G.goTab("chat"); } catch (e) {}
        var inp = $("inp");
        if (inp) inp.value = q;
        setTimeout(function () {
          var send = $("send");
          if (send) send.click();
        }, 50);
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
      out.textContent = "…";
      try {
        if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
          var sample = "АКСИ local-first Mind L2 offline agent";
          var r = AKSI_ALGORITHM.evaluate("что такое АКСИ", sample, { offline: true, seal: false });
          out.textContent = JSON.stringify(r.metrics || r, null, 2);
          if ($("kvEqs") && r.metrics && r.metrics.EQS != null) {
            $("kvEqs").textContent = String(Math.round(Number(r.metrics.EQS) * 100) / 100);
          }
          return;
        }
        if (G.AKSI_MIND_L2) {
          var st = AKSI_MIND_L2.think("статус");
          out.textContent = (st && st.text) || "Mind L2 OK";
          return;
        }
        out.textContent = "algorithm not loaded";
      } catch (e) {
        out.textContent = String(e.message || e);
      }
    });
  }

  function improveLocalHints() {
    var caps = $("localCaps");
    if (!caps) return;
    if (!navigator.gpu) {
      caps.textContent = "WebGPU нет — используй Chat (Mind L2) или Neuro offline";
    }
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th) return;
    if (th.children.length === 1) {
      var t = th.textContent || "";
      if (/v35|Pulse \u00b7 Skills/.test(t)) th.innerHTML = "";
    }
    if (th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML =
      '<div class="bub">АКСИ v53 · готовый offline-продукт\n' +
      "• Chat — Mind L2 (\u043a\u0442\u043e \u0442\u044b / \u0430\u0440\u0445\u0438\u0442\u0435\u043a\u0442\u0443\u0440\u0430 / \u0441\u0442\u0430\u0442\u0443\u0441)\n" +
      "• Local — WebLLM \u043f\u0440\u0438 WebGPU\n" +
      "• Mem — \u0423\u0447\u0438\u0442\u044c \u0444\u0430\u043a\u0442\u044b (RAG)\n" +
      "• Trust — Export .aksi \u0441 \u043f\u0430\u0440\u043e\u043b\u0435\u043c\n" +
      "\u041a\u043e\u043d\u0442\u0430\u043a\u0442: aksilove@internet.ru</div>";
    th.appendChild(d);
  }

  function boot() {
    wireChips();
    wireLab();
    improveLocalHints();
    patchWelcome();
    refreshHome();
    setTimeout(wireChips, 400);
    setTimeout(refreshHome, 600);
    setTimeout(refreshHome, 2000);
    var sub = document.querySelector(".sub");
    if (sub) sub.textContent = "v53 \u00b7 \u0433\u043e\u0442\u043e\u0432\u044b\u0439 \u043f\u0440\u043e\u0434\u0443\u043a\u0442 \u00b7 Mind L2";
    var title = document.querySelector("title");
    if (title) title.textContent = "\u0410\u041a\u0421\u0418 v53";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  G.AKSI_PRODUCT = { version: VER, refreshHome: refreshHome };
})(typeof window !== "undefined" ? window : globalThis);
