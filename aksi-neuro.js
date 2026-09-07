/**
 * AKSI-Neuro v5.0.1-max — offline browser LLM (CPU, pure JS)
 * SEED loaded from /aksi-neuro-seed.js into window.__AKSI_NEURO_SEED
 * Contact: aksilove@internet.ru
 */
(function (global) {
  "use strict";
  var VER = "5.0.1-max";
  var MEM_KEY = "aksi_rwkv_mem_v5";
  var SEED = (typeof window !== "undefined" && window.__AKSI_NEURO_SEED) ? window.__AKSI_NEURO_SEED.slice() : [];
  var extra = [];
  try {
    var raw = localStorage.getItem(MEM_KEY);
    if (raw) extra = JSON.parse(raw) || [];
  } catch (e) {}
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function scorePair(qTok, pair) {
    var t = tok(pair);
    var hit = 0, i;
    for (i = 0; i < qTok.length; i++) if (t.indexOf(qTok[i]) >= 0) hit++;
    return qTok.length ? hit / qTok.length : 0;
  }
  function parseQA(s) {
    var m = String(s).match(/Вопрос:\s*(.+?)\s*Ответ:\s*([\s\S]+)/i) || String(s).match(/Q:\s*(.+?)\s*A:\s*([\s\S]+)/i);
    if (m) return { q: m[1].trim(), a: m[2].trim() };
    return { q: s.slice(0, 40), a: s };
  }
  function retrieve(q, k) {
    k = k || 5;
    var qTok = tok(q), pool = SEED.concat(extra), scored = [];
    for (var i = 0; i < pool.length; i++) {
      var sc = scorePair(qTok, pool[i]);
      if (sc > 0.05) scored.push({ s: pool[i], sc: sc });
    }
    scored.sort(function (a, b) { return b.sc - a.sc; });
    return scored.slice(0, k);
  }
  function think(q) {
    q = String(q || "").trim();
    if (!q) return { text: "Спросите что-нибудь. Я АКСИ — offline Neuro.", score: 0.2, mode: "empty" };
    if (!SEED.length && typeof window !== "undefined" && window.__AKSI_NEURO_SEED) SEED = window.__AKSI_NEURO_SEED.slice();
    var hits = retrieve(q, 5);
    if (!hits.length) {
      return {
        text: "Я АКСИ — локальный offline-first компаньон (Neuro v" + VER + "). SEED=" + SEED.length + ". Спросите про АКСИ, ADIA, квант, формулу, Gate. Или «запомни: факт».",
        score: 0.35,
        mode: "fallback",
        seed: SEED.length
      };
    }
    var best = parseQA(hits[0].s);
    var text = best.a;
    if (hits.length > 1 && hits[1].sc > 0.35) {
      var second = parseQA(hits[1].s);
      if (second.a && second.a !== text) text = text + "\n\n· " + second.a.slice(0, 180);
    }
    return { text: text, answer: text, score: Math.min(0.98, 0.45 + hits[0].sc * 0.5), mode: "resonance", hits: hits.length, seed: SEED.length };
  }
  function learn(fact) {
    fact = String(fact || "").trim();
    if (!fact) return false;
    if (fact.indexOf("Вопрос:") < 0 && fact.indexOf("Ответ:") < 0) fact = "Вопрос: " + fact.slice(0, 40) + " Ответ: " + fact;
    extra.push(fact);
    if (extra.length > 200) extra = extra.slice(-200);
    try { localStorage.setItem(MEM_KEY, JSON.stringify(extra)); } catch (e) {}
    return true;
  }
  function status() {
    return { version: VER, seed: SEED.length, memory: extra.length, ready: true };
  }
  global.AKSI_NEURO = {
    version: VER,
    arch: "RWKV-hybrid-v5",
    think: think,
    ask: think,
    complete: function (q) { var r = think(q); return { text: r.text }; },
    generate: function (q) { return think(q).text; },
    learn: learn,
    retrieve: retrieve,
    status: status,
    ready: function () { return true; },
    ensure: function () { return {}; },
    seedCount: function () { return SEED.length; },
    bootstrap: function () { return Promise.resolve(status()); },
    save: function () { return true; },
    reset: function () { extra = []; try { localStorage.removeItem(MEM_KEY); } catch (e) {} return true; }
  };
  global.AKSI_LOCAL_LLM = global.AKSI_NEURO;
})(typeof window !== "undefined" ? window : this);
