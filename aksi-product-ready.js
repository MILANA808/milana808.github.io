/**
 * AKSI Product Ready — chat priority Mind L2 + chips + welcome
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "product-v52";

  G.AKSI_PRIORITY_ANSWER = function (q) {
    q = String(q || "").trim();
    if (!q) return null;
    try {
      if (G.AKSI_MIND_L2 && AKSI_MIND_L2.think) {
        var r = AKSI_MIND_L2.think(q);
        if (r && r.text && r.confidence >= 0.85) {
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

  function $(id) { return document.getElementById(id); }

  function wireChips() {
    document.querySelectorAll("[data-q]").forEach(function (chip) {
      if (chip.__aksiReady) return;
      chip.__aksiReady = 1;
      chip.addEventListener("click", function () {
        var q = chip.getAttribute("data-q");
        if (!q) return;
        if (typeof G.AKSI_SHOW_TAB === "function") G.AKSI_SHOW_TAB("chat");
        else if (typeof G.goTab === "function") G.goTab("chat");
        var inp = $("inp");
        if (inp) inp.value = q;
        var send = $("send");
        if (send) send.click();
      });
    });
  }

  function patchWelcome() {
    var th = $("thread");
    if (!th || th.children.length) return;
    var d = document.createElement("div");
    d.className = "msg ai";
    d.innerHTML =
      '<div class="bub">АКСИ v52 · Mind L2 · Local Client\n' +
      "Offline-first. Спроси: кто ты · архитектура · статус\n" +
      "Local → WebLLM (WebGPU). Mem → Учить. Trust → Export .aksi\n" +
      "Контакт: aksilove@internet.ru</div>";
    th.appendChild(d);
  }

  function boot() {
    wireChips();
    patchWelcome();
    setTimeout(wireChips, 400);
    var sub = document.querySelector(".sub");
    if (sub && /v5[012]|v47|v35/.test(sub.textContent)) {
      sub.textContent = "v52 · готовый продукт · Mind L2";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  G.AKSI_PRODUCT = { version: VER };
})(typeof window !== "undefined" ? window : globalThis);
