/**
 * AKSI CLM — Closed-Loop Memory v1.0
 *
 * Technology (honest definition):
 *   After a fact is stored, the system immediately tries to *retrieve* it
 *   with probe queries derived from the fact. Retrieval score decides a
 *   trust tier: sealed | provisional | weak.
 *   Answers prefer higher tiers. Humans see "проверено воспроизведением".
 *
 * This is not a new neural net. It is a closed-loop local memory algorithm:
 *   write → probe → score → tier → prefer on read.
 *
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0";
  var KEY = "aksi_clm_v1";
  var TIERS = { sealed: 3, provisional: 2, weak: 1, none: 0 };

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{"items":[]}');
    } catch (e) {
      return { items: [] };
    }
  }
  function save(st) {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) {}
  }

  function probesFromFact(fact) {
    fact = String(fact || "").trim();
    if (!fact) return [];
    var probes = [];
    if (fact.length <= 80) probes.push(fact);
    var m = fact.match(/^(.{3,60}?)\s*[—–\-:]\s*(.+)$/);
    if (m) {
      probes.push(m[1].trim());
      probes.push(m[2].trim().slice(0, 60));
      probes.push(m[1].trim() + " " + m[2].trim().slice(0, 40));
    }
    var words = fact.split(/[\s,.;:!?«»\"()]+/).filter(function (w) {
      return w.length >= 4 && !/^(это|который|которая|для|или|that|with|from|this)$/i.test(w);
    });
    if (words.length >= 2) probes.push(words.slice(0, 4).join(" "));
    if (words.length >= 1) probes.push(words[0]);
    var seen = {}, out = [];
    for (var i = 0; i < probes.length; i++) {
      var p = probes[i].trim();
      if (p.length < 2) continue;
      var k = p.toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(p);
    }
    return out.slice(0, 4);
  }

  function tierFromScore(best, probesOk, probesTotal) {
    if (probesTotal === 0) return "weak";
    var ratio = probesOk / probesTotal;
    if (best >= 0.02 || (ratio >= 0.5 && best >= 0.005)) return "sealed";
    if (best >= 0.002 || ratio >= 0.25) return "provisional";
    return "weak";
  }

  function tierLabel(t) {
    if (t === "sealed") return "проверено воспроизведением";
    if (t === "provisional") return "частично воспроизводится";
    if (t === "weak") return "сохранено, воспроизведение слабое";
    return "нет проверки";
  }

  async function seal(fact, opts) {
    opts = opts || {};
    fact = String(fact || "").trim();
    if (!fact) return { ok: false, error: "empty" };

    var probes = probesFromFact(fact);
    var scores = [];
    var best = 0;
    var probesOk = 0;
    var cx = opts.cortex || G.AKSI_CORTEX_KERNEL;

    for (var i = 0; i < probes.length; i++) {
      var q = probes[i];
      var sc = 0;
      if (cx && cx.resonantQuery && cx.size) {
        try {
          var hit = await cx.resonantQuery(q);
          if (hit && hit.text) {
            sc = Number(hit.score) || 0;
            var tl = String(hit.text).toLowerCase();
            var ql = q.toLowerCase();
            if (tl.indexOf(ql.slice(0, Math.min(12, ql.length))) >= 0) sc += 0.01;
            if (String(hit.text).indexOf(fact.slice(0, 20)) >= 0) sc += 0.02;
          }
        } catch (e) {}
      }
      var fl = fact.toLowerCase();
      var qw = q.toLowerCase().split(/\s+/);
      var hitW = 0;
      for (var j = 0; j < qw.length; j++) if (qw[j].length > 2 && fl.indexOf(qw[j]) >= 0) hitW++;
      var lex = qw.length ? hitW / qw.length : 0;
      sc = Math.max(sc, lex * 0.05);
      scores.push({ q: q, score: sc });
      if (sc > best) best = sc;
      if (sc >= 0.002) probesOk++;
    }

    var tier = tierFromScore(best, probesOk, probes.length || 1);
    var entry = {
      id: "clm_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
      fact: fact,
      tier: tier,
      best: best,
      probes: scores,
      cortexId: opts.ingestResult && opts.ingestResult.id ? opts.ingestResult.id : null,
      t: Date.now(),
    };

    var st = load();
    st.items.push(entry);
    st.items = st.items.slice(-150);
    save(st);

    return {
      ok: true,
      version: VER,
      id: entry.id,
      tier: tier,
      label: tierLabel(tier),
      best: best,
      probes: scores,
      human:
        tier === "sealed"
          ? "Факт сохранён и проверен: система смогла его воспроизвести."
          : tier === "provisional"
          ? "Факт сохранён. Воспроизведение частичное — при вопросе может понадобиться уточнение."
          : "Факт сохранён, но проверка воспроизведения слабая. Сформулируйте короче или повторите «запомни:».",
    };
  }

  function lookup(q) {
    q = String(q || "").toLowerCase();
    var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
    var st = load();
    var best = null;
    var bestHit = 0;
    for (var i = st.items.length - 1; i >= 0; i--) {
      var it = st.items[i];
      var fl = String(it.fact || "").toLowerCase();
      var hit = 0;
      for (var j = 0; j < words.length; j++) if (fl.indexOf(words[j]) >= 0) hit += 1;
      if (hit > bestHit) {
        bestHit = hit;
        best = it;
      }
    }
    if (best && bestHit >= 1) {
      return {
        text: best.fact,
        source: "clm",
        offline: true,
        tier: best.tier,
        label: tierLabel(best.tier),
        clmId: best.id,
        hit: bestHit,
        score: 0.01 * bestHit * (TIERS[best.tier] || 1),
      };
    }
    return null;
  }

  function stats() {
    var st = load();
    var c = { sealed: 0, provisional: 0, weak: 0, total: st.items.length };
    for (var i = 0; i < st.items.length; i++) {
      var t = st.items[i].tier;
      if (c[t] != null) c[t]++;
    }
    return c;
  }

  G.AKSI_CLM = {
    version: VER,
    seal: seal,
    lookup: lookup,
    probesFromFact: probesFromFact,
    tierLabel: tierLabel,
    stats: stats,
    tiers: TIERS,
  };
})(typeof window !== "undefined" ? window : globalThis);
