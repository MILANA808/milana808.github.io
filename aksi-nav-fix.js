/**
 * AKSI Nav Fix v3 — нижние вкладки всегда работают
 * Из коммитов: nav-fix, runtime-patch, fix suite, index bnav pointer-events
 * Контакт: aksilove@internet.ru
 */
(function () {
  "use strict";
  var TABS = { home: 1, chat: 1, local: 1, trust: 1, mem: 1, lab: 1, stats: 1 };

  function panels(t) {
    document.querySelectorAll(".bnav [data-tab]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-tab") === t);
    });
    document.querySelectorAll(".stage .panel").forEach(function (p) {
      var on = p.id === "tab-" + t;
      p.classList.toggle("on", on);
      try { p.style.display = on ? "block" : "none"; } catch (e) {}
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
    TABS[t] = 1;
    try {
      if (typeof window.goTab === "function" && !window.goTab.__aksiNavSimple) {
        window.goTab(t);
        return;
      }
    } catch (e) {
      console.warn("goTab", e);
    }
    try {
      panels(t);
    } catch (err) {
      console.warn("nav-fix panels", err);
    }
  }

  window.AKSI_NAV_GO = go;

  if (typeof window.goTab !== "function") {
    window.goTab = go;
    window.goTab.__aksiNavSimple = true;
  }

  function hardenBtn(btn) {
    if (!btn || btn.getAttribute("data-aksi-nav") === "1") return;
    btn.setAttribute("data-aksi-nav", "1");
    try {
      btn.style.pointerEvents = "auto";
      btn.style.cursor = "pointer";
      btn.style.zIndex = "2";
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
    btn.addEventListener(
      "touchend",
      function (e) {
        var id = btn.getAttribute("data-tab");
        if (!id) return;
        try {
          e.preventDefault();
        } catch (err) {}
        go(id);
      },
      { passive: false, capture: true }
    );
  }

  function bind() {
    var nav = document.getElementById("bnav");
    if (nav) {
      try {
        nav.style.pointerEvents = "auto";
        nav.style.zIndex = "80";
      } catch (e) {}
    }
    var nodes = document.querySelectorAll(".bnav [data-tab], button[data-tab], a[data-tab], [data-tab]");
    for (var i = 0; i < nodes.length; i++) hardenBtn(nodes[i]);
  }

  function boot() {
    bind();
    setTimeout(bind, 50);
    setTimeout(bind, 200);
    setTimeout(bind, 800);
    setTimeout(bind, 2000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
