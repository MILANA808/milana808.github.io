/**
 * AKSI Nav Fix v2 — нижние вкладки всегда работают
 * Контакт: aksilove@internet.ru
 */
(function () {
  "use strict";
  function panels(t) {
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
  }
  function go(t) {
    t = String(t || "").trim();
    if (!t) return;
    try {
      if (typeof window.goTab === "function") {
        window.goTab(t);
        return;
      }
    } catch (e) {
      console.warn("goTab", e);
    }
    try {
      panels(t);
    } catch (err) {
      console.warn("nav-fix", err);
    }
  }
  window.AKSI_NAV_GO = go;
  function bind() {
    var nodes = document.querySelectorAll(".bnav [data-tab], button[data-tab], a[data-tab], [data-tab]");
    for (var i = 0; i < nodes.length; i++) {
      (function (btn) {
        if (btn.getAttribute("data-aksi-nav") === "1") return;
        btn.setAttribute("data-aksi-nav", "1");
        try {
          btn.style.pointerEvents = "auto";
          btn.style.cursor = "pointer";
        } catch (e) {}
        btn.addEventListener(
          "click",
          function (e) {
            var id = btn.getAttribute("data-tab");
            if (!id) return;
            try {
              e.preventDefault();
              e.stopPropagation();
            } catch (err) {}
            go(id);
          },
          true
        );
      })(nodes[i]);
    }
  }
  function boot() {
    bind();
    setTimeout(bind, 100);
    setTimeout(bind, 500);
    setTimeout(bind, 1500);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
