/**
 * AKSI Sentiment / ADIA classifier
 * Xenova DistilBERT SST-2 via Transformers.js; fallback heuristic + UI warning.
 */
(function (G) {
  "use strict";
  var STATE = { status: "idle", error: null, pipeline: null, warned: false };
  var MODEL_ID = "Xenova/distilbert-base-uncased-finetuned-sst-2-english";
  function heuristicSentiment(text) {
    var t = String(text || "").toLowerCase();
    var pos = (t.match(/хорош|отлично|рад|успех|great|good|excellent|love|helpful|ясн|понятн/g) || []).length;
    var neg = (t.match(/плох|ошиб|не знаю|fail|bad|wrong|ужас|слаб|отказ/g) || []).length;
    if (pos === 0 && neg === 0) return { label: "NEUTRAL", score: 0.5, source: "heuristic" };
    if (pos >= neg) return { label: "POSITIVE", score: Math.min(0.95, 0.55 + pos * 0.08), source: "heuristic" };
    return { label: "NEGATIVE", score: Math.min(0.95, 0.55 + neg * 0.08), source: "heuristic" };
  }
  function notifyFallback(reason) {
    STATE.status = "fallback"; STATE.error = reason || "model unavailable";
    if (!STATE.warned && typeof document !== "undefined") {
      STATE.warned = true;
      try {
        var bar = document.getElementById("modelProgress");
        if (bar) { bar.textContent = "ADIA classifier: эвристика (модель не загружена). Offline-safe."; bar.style.color = "var(--warn, #9a6b1f)"; }
      } catch (e) {}
    }
  }
  async function loadTransformers() {
    if (STATE.status === "ready" && STATE.pipeline) return STATE.pipeline;
    if (STATE.status === "loading") {
      for (var i = 0; i < 90; i++) { await new Promise(function (r) { setTimeout(r, 1000); }); if (STATE.status === "ready") return STATE.pipeline; if (STATE.status === "fallback") return null; }
      return null;
    }
    STATE.status = "loading";
    try {
      if (!navigator.onLine) { notifyFallback("offline"); return null; }
      var bar = typeof document !== "undefined" ? document.getElementById("modelProgress") : null;
      if (bar) bar.textContent = "Загрузка DistilBERT (Transformers.js)…";
      var mod = await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");
      if (mod.env) { mod.env.allowLocalModels = false; mod.env.useBrowserCache = true; }
      var pipe = await mod.pipeline("sentiment-analysis", MODEL_ID, {
        progress_callback: function (p) {
          if (!bar || !p) return;
          if (p.status === "progress" && p.progress != null) bar.textContent = "DistilBERT: " + Math.round(p.progress) + "%";
          else if (p.status) bar.textContent = "DistilBERT: " + p.status;
        }
      });
      STATE.pipeline = pipe; STATE.status = "ready";
      G.AKSI_TRANSFORMERS_PIPE = async function (text) { return pipe(String(text || "").slice(0, 512)); };
      if (bar) { bar.textContent = "ADIA classifier: DistilBERT ready"; bar.style.color = "var(--ok, #2f6b48)"; }
      return pipe;
    } catch (e) { notifyFallback(String(e && e.message || e)); return null; }
  }
  async function analyze(text) {
    try {
      var pipe = STATE.pipeline || (STATE.status === "idle" || STATE.status === "loading" ? await loadTransformers() : null);
      if (pipe) {
        var r = await pipe(String(text || "").slice(0, 512));
        var row = Array.isArray(r) ? r[0] : r;
        return { label: row.label || "NEUTRAL", score: row.score != null ? row.score : 0.5, source: "distilbert" };
      }
    } catch (e) { notifyFallback(String(e && e.message || e)); }
    return heuristicSentiment(text);
  }
  if (typeof window !== "undefined") setTimeout(function () { loadTransformers().catch(function () {}); }, 1200);
  G.AKSI_SENTIMENT = { load: loadTransformers, analyze: analyze, status: function () { return { status: STATE.status, error: STATE.error, model: MODEL_ID }; }, heuristic: heuristicSentiment };
})(typeof window !== "undefined" ? window : globalThis);
