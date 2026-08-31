/**
 * Patch: add completeStream to AKSI_WEBLLM if missing
 */
(function (G) {
  "use strict";
  function patch() {
    var W = G.AKSI_WEBLLM;
    if (!W || W.completeStream) return;
    W.completeStream = function (prompt, opts) {
      opts = opts || {};
      var p = prompt;
      if (opts.context) {
        p = "\u041a\u043e\u043d\u0442\u0435\u043a\u0441\u0442 \u0438\u0437 \u043b\u043e\u043a\u0430\u043b\u044c\u043d\u043e\u0439 \u043f\u0430\u043c\u044f\u0442\u0438:\n" + String(opts.context).slice(0, 2500) + "\n\n\u0412\u043e\u043f\u0440\u043e\u0441: " + prompt;
      }
      return W.complete(p, {
        system: opts.system,
        max_tokens: opts.max_tokens,
        temperature: opts.temperature
      }).then(function (r) {
        if (r && r.text && opts.onDelta) opts.onDelta(r.text, r.text);
        if (r && G.AKSI_PERF && AKSI_PERF.recordInference) {
          var tokens = Math.ceil(String(r.text || "").length / 4);
          AKSI_PERF.recordInference({ tokens: tokens, ms: 1, tps: 0, model: r.model });
        }
        return r || { text: "", meta: "webllm" };
      });
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", patch);
  else patch();
  setTimeout(patch, 300);
  setTimeout(patch, 1200);
})(typeof window !== "undefined" ? window : globalThis);
