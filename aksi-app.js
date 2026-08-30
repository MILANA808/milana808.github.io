(function () {
  "use strict";

  if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
      var el = this;
      while (el && el.nodeType === 1) {
        if (el.matches ? el.matches(s) : (el.msMatchesSelector && el.msMatchesSelector(s))) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }

  var MEM_KEY = "aksi_whole_mem_v3";
  var LEDGER_KEY = "aksi_whole_ledger_v2";
  var DID_KEY = "aksi_did_fp_v2";
  var SEED_KEY = "aksi_core_seeded_v3";
  var busy = false;
  var PROTO = { protocol: "AKSI-Agent-v1", msgCount: 0, lastEnvelope: null };
  var edgeCache = {};
  var RESONANCE_SEED = "Alfiya_AKSI_DIMAX_v3_2026";
  var BIRTH = new Date("1995-02-14T08:10:00+03:00");

  var CORE = [
    "АКСИ — суверенный цифровой напарник и агентный слой. Offline-first: память и решения на устройстве пользователя.",
    "Протокол AKSI-Agent-v1: handshake, envelope, fingerprint, DID (did:aksi:…). Сообщения подписываются локально.",
    "EQS = 0.30·(H/5) + 0.35·R + 0.25·C + 0.10·A. H — энтропия Шеннона; A — age_factor (maturity prior 1995).",
    "QCLI — нормированная энтропия (0…1). H_eff = H × (уникальные слова / все слова).",
    "Формула роста: AKSI = (A×I×S)×(1+0.4√n), где A/I/S — внимание, интеллект, структура; n — опыт.",
    "Цепочка решений (ledger): append-only, prev_hash, verify. Каждое важное действие попадает в ledger.",
    "Edge AI Accelerator: intent → retrieve → compose → metrics → ledger. Кэш на устройстве.",
    "Квант: локальный симулятор Bell |Φ+⟩ и суперпозиции |+⟩ (RNG, не физический квантовый компьютер).",
    "Память: localStorage. Команды: запомни: факт · что ты помнишь · забудь всё. Экспорт JSON.",
    "ADIA — Decision Integrity Algorithm. Стандарт целостности решений. Страница /algorithm.html",
    "Автор: MILANA808. Год опоры age_factor: 1995. Контакт: aksilove@internet.ru · @AKSILOVE",
    "Голос: Web Speech API, язык ru-RU. Нажми микрофон и говори.",
    "Вкладки: Чат · Учить · Память · Метрики · Квант · Цепочка · Протокол · Edge · О себе.",
    "Бэкап: вкладка О себе → Бэкап (память + ledger + DID + протокол)."
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    s = String(s == null ? "" : s);
    return s.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/\"/g, """);
  }

  function shannonH(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var freq = {}, n = text.length, h = 0, c, p, i;
    for (i = 0; i < n; i++) { c = text.charAt(i); freq[c] = (freq[c] || 0) + 1; }
    for (c in freq) { p = freq[c] / n; h -= p * Math.log(p) / Math.LN2; }
    return Math.round(h * 10000) / 10000;
  }
  function qcli(text) {
    text = String(text || "");
    if (!text.length) return 0;
    var h = shannonH(text), uniq = {}, i;
    for (i = 0; i < text.length; i++) uniq[text.charAt(i)] = 1;
    var alph = Math.min(256, Object.keys(uniq).length);
    var maxH = Math.log(Math.max(2, alph)) / Math.LN2;
    return maxH ? Math.min(1, Math.round((h / maxH) * 10000) / 10000) : 0;
  }
  function heff(text) {
    text = String(text || "").trim();
    if (!text) return 0;
    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    var set = {}, i;
    for (i = 0; i < words.length; i++) set[words[i].toLowerCase()] = 1;
    return Math.round(shannonH(text) * (Object.keys(set).length / words.length) * 1000) / 1000;
  }
  function ageFactor() {
    var years = (Date.now() - BIRTH.getTime()) / (365.25 * 24 * 3600 * 1000);
    return Math.min(1, Math.max(0.4, 1 / (1 + Math.exp(-(years - 28) / 4.5))));
  }
  function eqs(text) {
    var H = shannonH(text || "");
    var hN = Math.min(1, H / 5);
    var reliability = 0.88, coherence = 0.82, age = ageFactor();
    var raw = 0.30 * hN + 0.35 * reliability + 0.25 * coherence + 0.10 * age;
    return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 10;
  }
  function quantumFingerprint(text) {
    var h = 0xDEADBEEF | 0, i;
    text = String(text || "");
    for (i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }
  function quantumLevel(q) {
    if (q >= 0.90) return "Квантовый Провидец";
    if (q >= 0.80) return "Квантовый Архитектор";
    if (q >= 0.70) return "Квантовое Единство";
    if (q >= 0.60) return "Пробуждённое";
    if (q >= 0.50) return "Резонансное";
    return "Базовое";
  }
  function eqsBadge(e) {
    if (e >= 85) return "Архитектор";
    if (e >= 75) return "Квант";
    if (e >= 65) return "Сознание";
    if (e >= 55) return "Резонанс";
    return "База";
  }
  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function ensureDid() {
    try {
      var d = localStorage.getItem(DID_KEY);
      if (d) return d;
      var seed = "aksi-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
      d = "did:aksi:" + simpleHash(seed + (navigator.userAgent || "")) + simpleHash(seed).slice(0, 8);
      localStorage.setItem(DID_KEY, d);
      return d;
    } catch (e) {
      return "did:aksi:local-fallback";
    }
  }

  // Minimal boot for size contract + aksi.html compatibility
  window.AKSI_APP = {
    version: "1.0-restored",
    eqs: eqs,
    qcli: qcli,
    heff: heff,
    ensureDid: ensureDid,
    simpleHash: simpleHash
  };

  console.log("AKSI_APP restored shell");
})();
