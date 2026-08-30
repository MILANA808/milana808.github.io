/**
 * AKSI Swarm v2 — 1–3 agents, pure-JS offline
 */
(function (G) {
  "use strict";
  var PROFILES = [
    { name: "Precise", temperature: 0.3, style: "precise" },
    { name: "Balanced", temperature: 0.7, style: "balanced" },
    { name: "Creative", temperature: 1.2, style: "creative" }
  ];
  var agentCount = 3;
  try { var saved = localStorage.getItem("aksi_swarm_n"); if (saved) agentCount = Math.max(1, Math.min(3, parseInt(saved, 10) || 3)); } catch (e) {}
  function setAgentCount(n) { agentCount = Math.max(1, Math.min(3, Number(n) || 3)); try { localStorage.setItem("aksi_swarm_n", String(agentCount)); } catch (e) {} return agentCount; }
  function getAgentCount() { return agentCount; }
  function agentText(q, profile) {
    var text = "";
    try { if (G.AKSI_NEURO && typeof G.AKSI_NEURO.think === "function") { var n = G.AKSI_NEURO.think(q); if (n && n.text) text = n.text; } } catch (e) {}
    try { if (G.AKSI_COMPOSE && typeof G.AKSI_COMPOSE.think === "function") { var c = G.AKSI_COMPOSE.think(q); if (c && c.text) { if (!text || profile.style !== "precise") text = c.text; } } } catch (e) {}
    try { if (G.AKSI_SELF_ARCH && typeof G.AKSI_SELF_ARCH.answer === "function") { var sa = G.AKSI_SELF_ARCH.answer(q); if (sa && sa.text && /архитектур|pipeline|adia|протокол|кто ты|статус/i.test(q)) text = sa.text; } } catch (e) {}
    if (!text) text = "Агент «" + profile.name + "» (T=" + profile.temperature + "): опор мало. «запомни: факт» или уточни вопрос.";
    if (profile.temperature <= 0.4) text = text.split("\n").slice(0, 6).join("\n");
    else if (profile.temperature >= 1.0) text = text + "\n\n[creative · T=" + profile.temperature + "]";
    return text;
  }
  function runSwarm(query) {
    query = String(query || "").trim();
    var n = agentCount, profiles = PROFILES.slice(0, n);
    return new Promise(function (resolve) {
      var jobs = profiles.map(function (p) {
        return Promise.resolve().then(function () {
          var text = agentText(query, p);
          var assess = G.AKSI_ADIA_ASSESS && G.AKSI_ADIA_ASSESS.assessSync ? G.AKSI_ADIA_ASSESS.assessSync(text, query) : { score: 50, axes: {}, pass: false };
          if (G.AKSI_SENTIMENT && G.AKSI_SENTIMENT.heuristic) { var s = G.AKSI_SENTIMENT.heuristic(text); if (s.label === "NEGATIVE" && assess.score > 10) assess.score = Math.max(0, assess.score - 5); }
          return { name: p.name, temperature: p.temperature, text: text, assess: assess, rank: (assess.score || 0) / 100 };
        });
      });
      Promise.all(jobs).then(function (cands) {
        cands.sort(function (a, b) { return b.rank - a.rank; });
        var best = cands[0];
        if (best && best.assess && !best.assess.pass && G.AKSI_ADIA_ASSESS) {
          var hint = (G.AKSI_ADIA_ASSESS.REGEN_HINTS && G.AKSI_ADIA_ASSESS.REGEN_HINTS[0]) || "уточни, будь более логичным";
          var regenText = agentText(query + "\n\n[ADIA] " + hint, PROFILES[0]);
          var regenAssess = G.AKSI_ADIA_ASSESS.assessSync(regenText, query);
          if (regenAssess.score > best.assess.score) { best = { name: "Precise-regen", temperature: 0.3, text: regenText, assess: regenAssess, rank: regenAssess.score / 100 }; cands.unshift(best); }
        }
        resolve({ best: best, candidates: cands, agentCount: n });
      }).catch(function () {
        resolve({ best: { name: "fallback", text: agentText(query, PROFILES[1]), assess: { score: 40 }, rank: 0.4 }, candidates: [], agentCount: n });
      });
    });
  }
  G.AKSI_SWARM = { run: runSwarm, profiles: PROFILES, setAgentCount: setAgentCount, getAgentCount: getAgentCount };
})(typeof window !== "undefined" ? window : globalThis);
