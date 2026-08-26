(function () {
  "use strict";

  /*
   * AKSI Answer Quality Layer
   *
   * Inspired by public research patterns such as retrieval-then-critique
   * (SELF-RAG) and structured output validation (Guardrails), but implemented
   * locally with no third-party runtime dependency. This layer does NOT replace
   * AKSI Core v5 and never upgrades an unverified claim to "true".
   */
  var VERSION = "AQ-1.0";
  var STORAGE = "AKSI_ANSWER_QUALITY_V1";
  var STOP = {"и":1,"в":1,"не":1,"на":1,"я":1,"с":1,"что":1,"а":1,"то":1,"как":1,"это":1,"по":1,"из":1,"у":1,"за":1,"от":1,"для":1,"или":1,"но":1,"the":1,"a":1,"is":1,"to":1,"of":1,"and":1,"in":1};

  function words(text) {
    return String(text || "").toLowerCase().match(/[a-zа-яё0-9]{3,}/gi) || [];
  }
  function signature(text) {
    var out = {}, ws = words(text), i, w;
    for (i = 0; i < ws.length; i++) { w = ws[i]; if (!STOP[w]) out[w] = (out[w] || 0) + 1; }
    return out;
  }
  function overlap(a, b) {
    var sa = signature(a), sb = signature(b), ka = Object.keys(sa), hit = 0, i;
    if (!ka.length) return 0;
    for (i = 0; i < ka.length; i++) if (sb[ka[i]]) hit++;
    return Math.min(1, hit / Math.max(3, ka.length));
  }
  function assess(text) {
    text = String(text || "").trim();
    var lower = text.toLowerCase();
    var hedges = /не уверен|не могу подтвердить|вероятно|возможно|похоже|по имеющимся данным|неизвестно/.test(lower);
    var absolute = /точно|гарантированно|безусловно|100%|всегда|никогда|доказано/.test(lower);
    var lengthScore = Math.min(1, text.length / 240);
    var structure = /(^|\n)([-*•]|\d+[.)])\s/.test(text) ? 1 : 0.35;
    var confidence = 0.45 + lengthScore * 0.18 + structure * 0.12 + (hedges ? 0.15 : 0) - (absolute ? 0.18 : 0);
    confidence = Math.max(0.05, Math.min(0.95, confidence));
    var status = hedges ? "uncertain" : (absolute ? "needs-verification" : "unverified");
    return {
      version: VERSION,
      status: status,
      confidence: Math.round(confidence * 100),
      evidence: "not-attached",
      retrieval: "not-required",
      critique: absolute ? "Абсолютная формулировка требует внешней проверки." : "Автоматическая эвристическая проверка пройдена; это не доказательство истины.",
      words: words(text).length,
      overlap: 0
    };
  }
  function readState() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "[]"); } catch (e) { return []; }
  }
  function writeState(item) {
    try {
      var all = readState();
      all.unshift(item);
      localStorage.setItem(STORAGE, JSON.stringify(all.slice(0, 100)));
    } catch (e) {}
  }
  function addBadge(node) {
    if (!node || node.querySelector(".aksi-quality")) return;
    var text = node.textContent || "";
    if (!text.trim()) return;
    var result = assess(text);
    var badge = document.createElement("div");
    badge.className = "aksi-quality";
    badge.setAttribute("data-quality-version", VERSION);
    badge.style.cssText = "margin-top:8px;padding:7px 9px;border:1px solid rgba(139,92,246,.28);border-radius:9px;font:10px/1.35 system-ui,sans-serif;color:#a1a1aa;background:rgba(18,18,20,.72)";
    badge.textContent = "Контроль ответа · " + result.status + " · уверенность эвристики " + result.confidence + "%";
    var note = document.createElement("div");
    note.style.cssText = "margin-top:3px;color:#71717a";
    note.textContent = result.critique;
    badge.appendChild(note);
    node.appendChild(badge);
    writeState({ts: Date.now(), result: result, fingerprint: text.slice(0, 160)});
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll(".msg.ai .bub").forEach(addBadge);
    root.querySelectorAll(".bubble.bot").forEach(addBadge);
  }
  function init() {
    scan(document);
    var observer = new MutationObserver(function (list) {
      list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) { addBadge(n); scan(n); } }); });
    });
    observer.observe(document.body, {childList:true, subtree:true});
    window.AKSIAnswerQuality = {
      version: VERSION,
      assess: assess,
      overlap: overlap,
      history: readState,
      scan: function () { scan(document); }
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
