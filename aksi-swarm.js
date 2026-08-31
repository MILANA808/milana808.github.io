/**
 * AKSI Swarm — parallel offline agents (1–5), ADIA ranks best
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "3.1-swarm";
  var agentCount = 3;
  try {
    var saved = localStorage.getItem("aksi_swarm_n");
    if (saved) agentCount = Math.max(1, Math.min(5, parseInt(saved, 10) || 3));
  } catch (e) {}

  function setAgentCount(n) {
    agentCount = Math.max(1, Math.min(5, Number(n) || 3));
    try { localStorage.setItem("aksi_swarm_n", String(agentCount)); } catch (e) {}
    return agentCount;
  }
  function getAgentCount() { return agentCount; }

  function profiles() {
    return [
      { name: "Neuro", weight: 1.0, run: function (q) {
        if (G.AKSI_NEURO && AKSI_NEURO.think) {
          var r = AKSI_NEURO.think(q);
          return Promise.resolve({ text: (r && r.text) || "", meta: "swarm·neuro", score: 0.55 });
        }
        return Promise.resolve({ text: "", meta: "swarm·neuro·miss", score: 0.1 });
      }},
      { name: "Composer", weight: 0.95, run: function (q) {
        if (G.AKSI_COMPOSE && AKSI_COMPOSE.think) {
          return Promise.resolve(AKSI_COMPOSE.think(q)).then(function (r) {
            return { text: (r && r.text) || "", meta: "swarm·compose", score: 0.5 };
          });
        }
        return Promise.resolve({ text: "", meta: "swarm·compose·miss", score: 0.1 });
      }},
      { name: "Resonance", weight: 0.9, run: function (q) {
        if (G.AKSI_CORE_AI && AKSI_CORE_AI.think) {
          var r = AKSI_CORE_AI.think(q);
          return Promise.resolve({ text: (r && r.text) || "", meta: "swarm·core", score: 0.6 });
        }
        if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.process) {
          var a = AKSI_ALGORITHM.process(q, "swarm resonance", { offline: true, seal: false });
          return Promise.resolve({ text: JSON.stringify(a.metrics || a).slice(0, 400), meta: "swarm·adia", score: 0.4 });
        }
        return Promise.resolve({ text: "", meta: "swarm·res·miss", score: 0.1 });
      }},
      { name: "SelfArch", weight: 0.85, run: function (q) {
        if (G.AKSI_SELF_ARCH && AKSI_SELF_ARCH.answer) {
          var r = AKSI_SELF_ARCH.answer(q);
          return Promise.resolve({ text: (r && r.text) || String(r || ""), meta: "swarm·self", score: 0.5 });
        }
        return Promise.resolve({ text: "", meta: "swarm·self·miss", score: 0.1 });
      }},
      { name: "Knowledge", weight: 0.8, run: function (q) {
        var K = G.AKSIKnowledge || G.AKSI_KNOWLEDGE;
        if (K && K.search) {
          var r = K.search(q);
          var t = (r && (r.text || r.answer || r.snippet)) || "";
          return Promise.resolve({ text: String(t), meta: "swarm·know", score: t ? 0.55 : 0.1 });
        }
        return Promise.resolve({ text: "", meta: "swarm·know·miss", score: 0.1 });
      }}
    ];
  }

  function scoreWithAdia(text, q) {
    try {
      if (G.AKSI_ADIA_ASSESS && AKSI_ADIA_ASSESS.assessSync) {
        var a = AKSI_ADIA_ASSESS.assessSync(text, { query: q });
        return (a && a.score != null) ? a.score / 100 : 0.4;
      }
      if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.process) {
        var m = AKSI_ALGORITHM.process(q, text, { offline: true, seal: false });
        return (m && m.metrics && m.metrics.EQS) || 0.4;
      }
    } catch (e) {}
    return Math.min(1, (text || "").length / 400);
  }

  async function run(query) {
    var q = String(query || "").trim();
    var n = agentCount;
    var list = profiles().slice(0, n);
    var results = await Promise.all(list.map(function (p) {
      return p.run(q).then(function (r) {
        var text = (r && r.text) || "";
        var sc = scoreWithAdia(text, q) * (p.weight || 1);
        return { name: p.name, text: text, meta: (r && r.meta) || p.name, score: sc };
      }).catch(function (e) {
        return { name: p.name, text: "", meta: "error", score: 0, error: String(e && e.message || e) };
      });
    }));
    results.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    var best = results[0] || { text: "", meta: "empty", score: 0 };
    return { best: best, candidates: results, agentCount: n, version: VER };
  }

  G.AKSI_SWARM = {
    version: VER,
    run: run,
    setAgentCount: setAgentCount,
    getAgentCount: getAgentCount,
    profiles: function () { return profiles().map(function (p) { return p.name; }); }
  };
})(typeof window !== "undefined" ? window : globalThis);
