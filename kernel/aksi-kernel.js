/**
 * AKSI Microkernel — registers isolated modules, routes via Context Bus
 */
(function (global) {
  "use strict";
  var modules = {};

  function register(mod) {
    if (!mod || !mod.id) throw new Error("module.id required");
    modules[mod.id] = mod;
    if (typeof mod.init === "function") mod.init(global.AksiBus);
    if (global.AksiBus) {
      global.AksiBus.emit("kernel.module.registered", "kernel", { id: mod.id, name: mod.name || mod.id });
    }
    return mod;
  }

  function get(id) {
    return modules[id] || null;
  }

  function list() {
    return Object.keys(modules).map(function (k) {
      var m = modules[k];
      return { id: m.id, name: m.name || m.id, version: m.version || "0.1" };
    });
  }

  global.AksiKernel = {
    register: register,
    get: get,
    list: list,
  };
})(typeof window !== "undefined" ? window : self);
