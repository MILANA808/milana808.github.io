/**
 * AKSI Nav Fix — гарантирует работу нижних кнопок
 * Контакт: aksilove@internet.ru
 */
(function () {
  "use strict";
  function go(t) {
    t = String(t || "").trim();
    if (!t) return;
    try {
      if (typeof window.goTab === "function") {
        window.goTab(t);
        return;
      }
    } catch (e) {}
    try {
      document.querySelectorAll(".bnav [data-tab]").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-tab") === t);
      });
      document.querySelectorAll(".stage .panel").forEach(function (p) {
        p.classList.toggle("on", p.id === "tab-" + t);
      });
      var c = document.getElementById("composer");
      if (c) {
        if (t === "chat") c.classList.add("on");
        else c.classList.remove("on");
      }
      var s = document.getElementById("stage");
      if (s) s.scrollTop = 0;
    } catch (err) {
      console.warn("nav-fix", err);
    }
  }
  window.AKSI_NAV_GO = go;
  function bind() {
    var nodes = document.querySelectorAll(".bnav [data-tab], button[data-tab], [data-tab]");
    nodes.forEach(function (btn) {
      if (btn.__aksiNavBound) return;
      btn.__aksiNavBound = true;
      btn.style.pointerEvents = "auto";
      btn.style.cursor = "pointer";
      btn.addEventListener(
        "click",
        function (e) {
          var id = btn.getAttribute("data-tab");
          if (!id) return;
          e.preventDefault();
          e.stopPropagation();
          go(id);
        },
        true
      );
    });
  }
  function boot() {
    bind();
    setTimeout(bind, 200);
    setTimeout(bind, 800);
    setTimeout(bind, 2000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
