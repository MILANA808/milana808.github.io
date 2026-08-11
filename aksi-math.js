/**
 * AKSI Response Algorithm (classical, auditable)
 * -----------------------------------------
 * Score(q, candidate) =
 *   α·cos_sim(tf(q), tf(c)) + β·(1 − H_norm(q)) + γ·recency + δ·identity_boost
 *
 * Route:
 *   if live_signal(q) → external API
 *   else if KB match → KB
 *   else if retrieve(q) → Wikipedia
 *   else → generative_template(q)
 *
 * Signature: σ = SHA256(step ‖ seed ‖ ts)[:16]
 * EQS = 0.30*(H_avg/5) + 0.35*rel + 0.25*coh + 0.10*age
 */
(function (g) {
  "use strict";

  var ALPHA = 0.45, BETA = 0.2, GAMMA = 0.15, DELTA = 0.2;

  function tokenize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function tf(tokens) {
    var m = {}, i, t, n = tokens.length || 1;
    for (i = 0; i < tokens.length; i++) {
      t = tokens[i];
      m[t] = (m[t] || 0) + 1 / n;
    }
    return m;
  }

  function cosSim(a, b) {
    var k, dot = 0, na = 0, nb = 0;
    for (k in a) {
      na += a[k] * a[k];
      if (b[k]) dot += a[k] * b[k];
    }
    for (k in b) nb += b[k] * b[k];
    if (!na || !nb) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }

  function shannonNorm(text) {
    var freq = {}, i, ch, total = text.length || 1, H = 0, p, uniq = 0;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (!freq[ch]) uniq++;
      freq[ch] = (freq[ch] || 0) + 1;
    }
    for (ch in freq) {
      p = freq[ch] / total;
      if (p > 0) H -= p * Math.log2(p);
    }
    var maxH = Math.log2(Math.max(2, uniq));
    return maxH ? Math.min(1, H / maxH) : 0;
  }

  function scoreQuery(q, candidateText, opts) {
    opts = opts || {};
    var tq = tf(tokenize(q));
    var tc = tf(tokenize(candidateText));
    var sim = cosSim(tq, tc);
    var h = shannonNorm(q);
    var recency = opts.recency != null ? opts.recency : 0.5;
    var idBoost = opts.identity ? 1 : 0;
    var s = ALPHA * sim + BETA * (1 - h) + GAMMA * recency + DELTA * idBoost;
    return {
      score: Math.round(s * 10000) / 10000,
      sim: Math.round(sim * 10000) / 10000,
      H_norm: Math.round(h * 10000) / 10000,
      components: { ALPHA: ALPHA, BETA: BETA, GAMMA: GAMMA, DELTA: DELTA },
    };
  }

  function eqs(hAvg, rel, coh, age) {
    hAvg = hAvg == null ? 3.2 : hAvg;
    rel = rel == null ? 0.85 : rel;
    coh = coh == null ? 0.8 : coh;
    age = age == null ? 0.9 : age;
    return Math.round((0.3 * (Math.min(hAvg, 5) / 5) + 0.35 * rel + 0.25 * coh + 0.1 * age) * 10000) / 10000;
  }

  function route(q) {
    var t = (q || "").toLowerCase();
    if (/биткоин|bitcoin|эфир|курс|\bbtc\b|\beth\b/.test(t)) return "live:crypto";
    if (/погода|weather/.test(t)) return "live:weather";
    if (/кто ты|что ты|акси|did|подпись/.test(t)) return "identity";
    if (/[?]/.test(t) || /^(что|кто|как|почему|what|who|how)/i.test(t)) return "retrieve";
    return "general";
  }

  g.AksiMath = {
    version: "1.0",
    tokenize: tokenize,
    scoreQuery: scoreQuery,
    shannonNorm: shannonNorm,
    eqs: eqs,
    route: route,
    formula: "score = α·sim + β·(1−H) + γ·recency + δ·id",
  };
})(typeof window !== "undefined" ? window : globalThis);
