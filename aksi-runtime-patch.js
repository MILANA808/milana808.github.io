/**
 * AKSI runtime patch — fixes goTab MAIN gate + export + rebind nav
 * Load AFTER app-runtime.js
 * Контакт: aksilove@internet.ru
 */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  var MAIN = { home: 1, chat: 1, local: 1, trust: 1, mem: 1, lab: 1, stats: 1 };
  function goTab(t) {
    t = String(t || "").trim();
    if (!t) return;
    MAIN[t] = 1;
    try {
      document.querySelectorAll(".bnav [data-tab]").forEach(function (b) {
        b.classList.toggle("on", b.getAttribute("data-tab") === t);
      });
      document.querySelectorAll(".stage .panel").forEach(function (p) {
        p.classList.toggle("on", p.id === "tab-" + t);
      });
      var c = $("composer");
      if (c) {
        if (t === "chat") c.classList.add("on");
        else c.classList.remove("on");
      }
      var s = $("stage");
      if (s) s.scrollTop = 0;
      if (t === "stats") {
        try {
          if (window.AKSI_STATS && $("statsBox")) AKSI_STATS.renderInto($("statsBox"));
        } catch (e) {}
        try {
          if (window.AKSI_PULSE && $("pulseBox")) AKSI_PULSE.renderInto($("pulseBox"));
        } catch (e) {}
      }
    } catch (err) {
      console.warn("goTab patch", err);
    }
  }
  window.goTab = goTab;
  function bind() {
    document.querySelectorAll(".bnav [data-tab], button[data-tab]").forEach(function (btn) {
      if (btn.getAttribute("data-rt-patch") === "1") return;
      btn.setAttribute("data-rt-patch", "1");
      btn.addEventListener(
        "click",
        function (e) {
          var id = btn.getAttribute("data-tab");
          if (!id) return;
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (err) {}
          goTab(id);
        },
        true
      );
    });
  }
  function boot() {
    bind();
    setTimeout(bind, 300);
    setTimeout(bind, 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
