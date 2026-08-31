/**
 * AKSI Perf — tokens/sec, load progress, memory hints
 */
(function (G) {
  "use strict";
  var state = { loadProgress: 0, loadMsg: "", lastTps: 0, lastTokens: 0, lastMs: 0, model: null, history: [] };
  function setLoadProgress(p, msg) {
    state.loadProgress = Number(p) || 0;
    if (msg) state.loadMsg = String(msg).slice(0, 120);
    emit();
  }
  function recordInference(info) {
    info = info || {};
    state.lastTps = info.tps || 0;
    state.lastTokens = info.tokens || 0;
    state.lastMs = info.ms || 0;
    state.model = info.model || state.model;
    state.history.push({ t: Date.now(), tps: state.lastTps, tokens: state.lastTokens });
    if (state.history.length > 40) state.history = state.history.slice(-40);
    emit();
  }
  function estimateMemory() {
    var out = { jsHeap: null, deviceMemory: null, hardwareConcurrency: null };
    try {
      if (performance && performance.memory) {
        out.jsHeap = Math.round(performance.memory.usedJSHeapSize / 1048576);
        out.jsHeapLimit = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
      }
    } catch (e) {}
    try {
      out.deviceMemory = navigator.deviceMemory || null;
      out.hardwareConcurrency = navigator.hardwareConcurrency || null;
    } catch (e2) {}
    return out;
  }
  function snapshot() {
    return { loadProgress: state.loadProgress, loadMsg: state.loadMsg, tps: state.lastTps, tokens: state.lastTokens, ms: state.lastMs, model: state.model, mem: estimateMemory(), webgpu: !!(navigator.gpu) };
  }
  function emit() {
    try { document.dispatchEvent(new CustomEvent("aksi-perf", { detail: snapshot() })); } catch (e) {}
  }
  function renderInto(el) {
    if (!el) return;
    var s = snapshot(), mem = s.mem || {};
    el.innerHTML = '<div class="kv">' +
      '<div class="cell"><b>' + (s.tps || "—") + '</b><span>tok/s</span></div>' +
      '<div class="cell"><b>' + (s.tokens || "—") + '</b><span>tokens</span></div>' +
      '<div class="cell"><b>' + (s.loadProgress || 0) + '%</b><span>load</span></div>' +
      '<div class="cell"><b>' + (mem.jsHeap != null ? mem.jsHeap + "MB" : "—") + '</b><span>JS heap</span></div></div>' +
      '<p class="muted" style="margin-top:8px">WebGPU: ' + (s.webgpu ? "yes" : "no") +
      (s.model ? " · " + String(s.model).split("-")[0] : "") +
      (mem.deviceMemory ? " · RAM ~" + mem.deviceMemory + "GB" : "") +
      (s.loadMsg ? "<br>" + s.loadMsg : "") + "</p>";
  }
  G.AKSI_PERF = { setLoadProgress: setLoadProgress, recordInference: recordInference, snapshot: snapshot, renderInto: renderInto, estimateMemory: estimateMemory };
})(typeof window !== "undefined" ? window : globalThis);
