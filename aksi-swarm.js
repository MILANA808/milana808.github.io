/**
 * AKSI Swarm — рой агентов (параллельная генерация + ADIA выбор)
 * 3 профиля pure-JS (Composer / Neuro / Reason) temperature 0.3 / 0.7 / 1.2.
 * WebLLM×3 опционально при наличии (не блокирует offline-демо).
 */
(function (G) {
  "use strict";

  var PROFILES = [
    { name: "Precise", temperature: 0.3, style: "precise" },
    { name: "Balanced", temperature: 0.7, style: "balanced" },
    { name: "Creative", temperature: 1.2, style: "creative" }
  ];

  function agentText(q, profile) {
    var text = "";
    try {
      if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") {
        var n = G.AKSI_NEURO.think(q);
        if (n && n.text) text = n.text;
      }
    } catch (e) {}
    try {
      if (G.AKSI_COMPOSE && typeof G.AKSI_COMPOSE.think === "function") {
        var c = G.AKSI_COMPOSE.think(q);
        if (c && c.text) {
          if (!text || profile.style === "balanced" || profile.style === "creative") text = c.text;
        }
      }
    } catch (e) {}
    try {
      if (G.AKSI_SELF_ARCH && typeof G.AKSI_SELF_ARCH.answer === "function") {
        var sa = G.AKSI_SELF_ARCH.answer(q);
        if (sa && sa.text && /архитектур|pipeline|adia|протокол|кто ты/i.test(q)) text = sa.text;
      }
    } catch (e) {}

    if (!text) {
      text = "Локальный агент «" + profile.name + "» (T=" + profile.temperature +
        "): опор мало. Добавь «запомни: факт» или уточни вопрос.";
    }
    if (profile.temperature <= 0.4) {
      text = text.split("\n").slice(0, 6).join("\n");
    } else if (profile.temperature >= 1.0) {
      text = text + "\n\n[профиль creative · T=" + profile.temperature + "]";
    }
    return text;
  }

  function reasonAgent(q) {
    var parts = [];
    try {
      if (G.AKSI_SELF_ARCH && G.AKSI_SELF_ARCH.answer) {
        var a = G.AKSI_SELF_ARCH.answer(q);
        if (a && a.text) parts.push(a.text);
      }
    } catch (e) {}
    if (!parts.length) parts.push(agentText(q, PROFILES[1]));
    return parts.join("\n");
  }

  function runSwarm(query) {
    query = String(query || "").trim();
    return new Promise(function (resolve) {
      var jobs = PROFILES.map(function (p, idx) {
        return Promise.resolve().then(function () {
          var text = idx === 2 ? reasonAgent(query) : agentText(query, p);
          var assess = G.AKSI_ADIA_ASSESS && G.AKSI_ADIA_ASSESS.assessSync
            ? G.AKSI_ADIA_ASSESS.assessSync(text, query)
            : { score: 50, axes: {}, pass: false };
          return {
            name: p.name,
            temperature: p.temperature,
            text: text,
            assess: assess,
            rank: (assess.score || 0) / 100
          };
        });
      });

      Promise.all(jobs).then(function (cands) {
        cands.sort(function (a, b) { return b.rank - a.rank; });
        var best = cands[0];
        if (best && best.assess && !best.assess.pass && G.AKSI_ADIA_ASSESS) {
          var hint = (G.AKSI_ADIA_ASSESS.REGEN_HINTS && G.AKSI_ADIA_ASSESS.REGEN_HINTS[0]) || "уточни, будь более логичным";
          var regenQ = query + "\n\n[ADIA] " + hint;
          var regenText = agentText(regenQ, PROFILES[0]);
          var regenAssess = G.AKSI_ADIA_ASSESS.assessSync(regenText, query);
          if (regenAssess.score > best.assess.score) {
            best = {
              name: "Precise-regen",
              temperature: 0.3,
              text: regenText,
              assess: regenAssess,
              rank: regenAssess.score / 100
            };
            cands.unshift(best);
          }
        }
        resolve({ best: best, candidates: cands });
      }).catch(function () {
        resolve({
          best: { name: "fallback", text: agentText(query, PROFILES[1]), assess: { score: 40 }, rank: 0.4 },
          candidates: []
        });
      });
    });
  }

  G.AKSI_SWARM = {
    run: runSwarm,
    profiles: PROFILES
  };
})(typeof window !== "undefined" ? window : globalThis);
