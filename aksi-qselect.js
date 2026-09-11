/**
 * AKSI Q-Select v1.1 — superposition + collapse; prefers comprehended answers
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.1.0-qselect";

  var backends = {
    "local-sim": {
      id: "local-sim",
      label: "Локальный квантовый симулятор",
      collapse: async function (amps, rng) {
        var r = (rng || Math.random)();
        var acc = 0;
        for (var i = 0; i < amps.length; i++) {
          acc += amps[i];
          if (r <= acc) return i;
        }
        return amps.length - 1;
      }
    },
    ibm: {
      id: "ibm",
      label: "IBM Quantum (подключение)",
      collapse: async function () {
        throw new Error("IBM Quantum: позже. Сейчас — local-sim.");
      }
    },
    hpc: {
      id: "hpc",
      label: "HPC (подключение)",
      collapse: async function () {
        throw new Error("HPC: позже. Сейчас — local-sim.");
      }
    }
  };

  function hash01(s) {
    var h = 2166136261;
    s = String(s || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
  }

  function normalize(weights) {
    var sum = 0;
    for (var i = 0; i < weights.length; i++) sum += Math.max(0, weights[i]);
    if (sum <= 0) {
      var u = 1 / Math.max(1, weights.length);
      return weights.map(function () { return u; });
    }
    return weights.map(function (w) { return Math.max(0, w) / sum; });
  }

  function scoreCandidate(c, query) {
    var t = String(c.text || c.answer || "");
    var q = String(query || "").toLowerCase();
    var s = 0.35;
    if (c.conf != null) s += Number(c.conf) * 0.4;
    if (c.score != null) s += Number(c.score) * 0.2;
    var words = q.split(/\s+/).filter(function (w) { return w.length > 2; });
    var low = t.toLowerCase();
    for (var i = 0; i < words.length; i++) if (low.indexOf(words[i]) !== -1) s += 0.05;
    if (t.length > 40 && t.length < 1200) s += 0.08;
    if (c.source === "internet-synthesis" || c.source === "internet") s += 0.1;
    if (String(c.source).indexOf("comprehend") !== -1) s += 0.2;
    if (c.source === "kb" || c.source === "core-kb") s += 0.05;
    s += hash01(q + "|" + t.slice(0, 80)) * 0.08;
    return Math.max(0.01, Math.min(1, s));
  }

  async function gatherCandidates(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    var cands = [];
    var layers = [];

    function push(text, source, conf) {
      text = String(text || "").trim();
      if (!text || text.length < 2) return;
      var key = text.slice(0, 60);
      for (var i = 0; i < cands.length; i++) {
        if (String(cands[i].text).slice(0, 60) === key) return;
      }
      cands.push({ text: text, source: source || "?", conf: conf != null ? conf : 0.55 });
    }

    try {
      if (G.AKSI_BRAIN && G.AKSI_BRAIN.decide) {
        var b = await G.AKSI_BRAIN.decide(query);
        if (b && (b.answer || b.text)) {
          push(b.answer || b.text, b.source || "brain", 0.7);
          layers.push("brain");
        }
      } else if (G.AKSI_CORE && G.AKSI_CORE.decide) {
        var c = await G.AKSI_CORE.decide(query);
        if (c && c.answer) push(c.answer, "core", 0.55);
      }
    } catch (e) {}

    try {
      if (G.AKSI_NEURO && G.AKSI_NEURO.think) {
        var n = await Promise.resolve(G.AKSI_NEURO.think(query));
        if (n && (n.text || n.answer)) {
          push(n.text || n.answer, "neuro", n.score != null ? n.score : 0.55);
          layers.push("neuro");
        }
      }
    } catch (e) {}

    try {
      var K = G.AKSI_KNOWLEDGE || G.AKSIKnowledge;
      if (K && K.search) {
        var k = K.search(query);
        if (k && k.body) {
          push(k.title + "\n\n" + k.body, "knowledge", 0.65);
          layers.push("knowledge");
        }
      }
    } catch (e) {}

    try {
      if (G.AKSI_CRYSTAL && G.AKSI_CRYSTAL.associate) {
        var cr = await G.AKSI_CRYSTAL.associate(query, { k: 3 });
        if (cr && cr.answer && cr.associations && cr.associations.length)
          push(cr.answer, "crystal", 0.5);
      }
    } catch (e) {}

    if (opts.internet !== false) {
      try {
        if (G.AKSI_COMPREHEND && G.AKSI_COMPREHEND.answer) {
          var ca = await G.AKSI_COMPREHEND.answer(query, { useLLM: opts.useLLM !== false });
          if (ca && ca.answer) {
            push(ca.answer, ca.source || "comprehend", 0.9);
            layers.push("comprehend");
          }
        } else if (G.AKSI_INTERNET && G.AKSI_INTERNET.research) {
          var ir = await G.AKSI_INTERNET.research(query);
          if (ir && ir.ok && ir.answer) {
            push(ir.answer, ir.source || "internet", 0.75);
            layers.push("internet");
          }
        }
      } catch (e) {}
    }

    try {
      if (G.AKSI_ZERO && G.AKSI_ZERO.think) {
        var z = await Promise.resolve(G.AKSI_ZERO.think(query));
        if (z && (z.text || z.answer)) push(z.text || z.answer, "zero", 0.5);
      }
    } catch (e) {}

    try {
      if (G.AKSI && G.AKSI.decide) {
        var a = await G.AKSI.decide(query);
        if (a && (a.answer || a.text)) push(a.answer || a.text, a.source || "api", 0.6);
      }
    } catch (e) {}

    if (!cands.length) {
      push("АКСИ пока не собрала кандидатов. Переформулируйте или включите «Полный веб».\naksilove@internet.ru", "fallback", 0.3);
    }

    return { candidates: cands, layers: layers };
  }

  async function select(query, opts) {
    opts = opts || {};
    query = String(query || "").trim();
    if (!query) return { ok: false, answer: "", error: "empty" };

    var backendId = opts.backend || "local-sim";
    try {
      if (!opts.backend && typeof localStorage !== "undefined")
        backendId = localStorage.getItem("AKSI_Q_BACKEND") || backendId;
    } catch (e) {}
    var backend = backends[backendId] || backends["local-sim"];

    var gathered = await gatherCandidates(query, opts);
    var cands = gathered.candidates;

    var weights = cands.map(function (c) { return scoreCandidate(c, query); });
    var amps = normalize(weights);

    var qmeta = null;
    try {
      if (G.AKSI_QUANTUM && typeof G.AKSI_QUANTUM.answerGate === "function") {
        var topIdx = 0;
        for (var i = 1; i < amps.length; i++) if (amps[i] > amps[topIdx]) topIdx = i;
        qmeta = G.AKSI_QUANTUM.answerGate(query, cands[topIdx].text);
      }
    } catch (e) {}

    var idx;
    try {
      if (backendId !== "local-sim" && backends[backendId]) {
        try {
          idx = await backends[backendId].collapse(amps);
        } catch (be) {
          idx = await backends["local-sim"].collapse(amps);
          backend = backends["local-sim"];
          backend._note = String(be.message || be);
        }
      } else {
        idx = await backends["local-sim"].collapse(amps);
      }
    } catch (e) {
      idx = 0;
    }
    idx = Math.max(0, Math.min(cands.length - 1, idx | 0));

    var chosen = cands[idx];
    var seal = null;
    try {
      if (G.AKSI_ALGORITHM && typeof G.AKSI_ALGORITHM.seal === "function") {
        seal = G.AKSI_ALGORITHM.seal(query, chosen.text, { eqs: amps[idx] });
      }
    } catch (e) {}

    var superposition = cands.map(function (c, i) {
      return {
        i: i,
        source: c.source,
        probability: +amps[i].toFixed(4),
        preview: String(c.text).slice(0, 120),
        selected: i === idx
      };
    });

    return {
      ok: true,
      answer: chosen.text,
      text: chosen.text,
      source: "qselect:" + chosen.source,
      collapsedFrom: chosen.source,
      index: idx,
      probability: +amps[idx].toFixed(4),
      superposition: superposition,
      layers: gathered.layers,
      backend: backend.id,
      backendLabel: backend.label,
      backendNote: backend._note || null,
      quantum: qmeta
        ? { entropy: qmeta.entropy, purity: qmeta.purity, QCLI: qmeta.QCLI || qmeta.qcli, circuit: qmeta.circuit, nQubits: qmeta.nQubits }
        : null,
      seal: seal,
      version: VER,
      query: query
    };
  }

  function setBackend(id) {
    if (!backends[id]) return false;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("AKSI_Q_BACKEND", id);
    } catch (e) {}
    return true;
  }

  function listBackends() {
    return Object.keys(backends).map(function (k) {
      return { id: k, label: backends[k].label };
    });
  }

  function registerBackend(id, label, collapseFn) {
    backends[id] = { id: id, label: label || id, collapse: collapseFn };
  }

  G.AKSI_QSELECT = {
    version: VER,
    select: select,
    gather: gatherCandidates,
    setBackend: setBackend,
    listBackends: listBackends,
    registerBackend: registerBackend,
    backends: backends
  };
})(typeof window !== "undefined" ? window : globalThis);
