(function () {
  "use strict";

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;
      while (el && el.nodeType === 1) {
        if (el.matches(s)) return el;
        el = el.parentElement;
      }
      return null;
    };
  }

  var MEM_KEY = "aksi_whole_mem_v3";
  var VERSION = "app-restore";

  function loadMem() {
    try {
      var a = JSON.parse(localStorage.getItem(MEM_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function saveMem(a) {
    try {
      localStorage.setItem(MEM_KEY, JSON.stringify((a || []).slice(-200)));
    } catch (e) {}
  }

  var api = {
    version: VERSION,
    loadMem: loadMem,
    saveMem: saveMem
  };
  window.AKSI_APP = api;
})();
