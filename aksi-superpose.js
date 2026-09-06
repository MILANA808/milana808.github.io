/**
 * AKSI Superpose Engine v2.1
 * Multi-candidate answers → amplitudes → Born collapse → seal
 * Fixed: awaits async Zero / Decision
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "2.1.0-superpose";
  var listeners = [];
  var lastSession = null;
  var MEMORY_KEY = "aksi.superpose.memory.v1";
  var MAX_MEMORY = 100;

  function emit(ev, data) {
    var p = { event: ev, t: Date.now(), data: data || {} };
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](p); } catch (e) {}
    }
    try {
      if (typeof CustomEvent !== "undefined") {
        window.dispatchEvent(new CustomEvent("aksi-superpose", { detail: p }));
      }
    } catch (e) {}
    return p;
  }
  function on(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
  }
  function clamp01(x) { x = +x; if (isNaN(x)) return 0; return x < 0 ? 0 : x > 1 ? 1 : x; }
  function round(x, d) { var p = Math.pow(10, d == null ? 4 : d); return Math.round(+x * p) / p; }
  function fnv(s) {
    var h = 0x811c9dc5, i; s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function tok(s) {
    return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " ").split(/\s+/).filter(function (w) { return w.length > 1; });
  }
  function overlap(a, b) {
    var s = {}, i, n = 0;
    for (i = 0; i < b.length; i++) s[b[i]] = 1;
    for (i = 0; i < a.length; i++) if (s[a[i]]) n++;
    return a.length ? n / a.length : 0;
  }
  function maybe(v) { return v && typeof v.then === "function" ? v : Promise.resolve(v); }

  function readMemory() {
    try {
      var x = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
      return Array.isArray(x) ? x : [];
    } catch (e) { return []; }
  }
  function writeMemory(list) {
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(list.slice(-MAX_MEMORY))); return true; } catch (e) { return false; }
  }
  function saveMemory(item) {
    item = item || lastSession;
    if (!item) return { ok: false, error: "nothing" };
    var list = readMemory();
    list.push({
      id: "m" + Date.now().toString(36),
      ts: Date.now(),
      query: item.query,
      answer: item.answer,
      source: item.source,
      scores: item.scores
    });
    writeMemory(list);
    emit("memory-changed", { count: list.length });
    return { ok: true, count: list.length };
  }
  function removeMemory(id) {
    var list = readMemory().filter(function (x) { return x.id !== id; });
    writeMemory(list);
    emit("memory-changed", { count: list.length });
    return list;
  }
  function clearMemory() { writeMemory([]); emit("memory-changed", { count: 0 }); }

  function scoreCandidate(q, text, hint) {
    var conf = hint && hint.conf != null ? +hint.conf : 0.55;
    var o = overlap(tok(q), tok(text));
    var len = String(text || "").length;
    var structure = clamp01(0.3 + Math.min(0.4, len / 400));
    var eqs = conf * 0.55 + o * 0.25 + structure * 0.2;
    var qx = null, qcli = 0.5;
    try {
      if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
        qx = AKSI_QUANTUM.answerGate(q, text);
        if (qx && qx.QCLI != null) qcli = +qx.QCLI;
        if (qx && qx.resonance != null) eqs = clamp01(eqs * 0.7 + (+qx.resonance) * 0.3);
      }
    } catch (e) {}
    try {
      if (G.AKSI_ALGORITHM && AKSI_ALGORITHM.evaluate) {
        var ev = AKSI_ALGORITHM.evaluate(q, text, {});
        var e2 = ev && (ev.eqs != null ? ev.eqs : (ev.metrics && ev.metrics.eqs));
        if (e2 != null) eqs = clamp01(Number(e2) > 1 ? Number(e2) / 100 : Number(e2));
      }
    } catch (e) {}
    var amp = Math.sqrt(clamp01(eqs) * (0.35 + 0.65 * qcli));
    return {
      text: text,
      source: (hint && hint.source) || "cand",
      conf: round(conf, 3),
      eqs: round(eqs, 4),
      qcli: round(qcli, 4),
      amp: amp,
      quantum: qx
    };
  }

  function normalizeAmps(cands) {
    var sum = 0, i;
    for (i = 0; i < cands.length; i++) sum += cands[i].amp * cands[i].amp;
    if (sum < 1e-12) {
      var u = 1 / Math.sqrt(Math.max(1, cands.length));
      for (i = 0; i < cands.length; i++) {
        cands[i].amp = u;
        cands[i].prob = 1 / cands.length;
      }
      return cands;
    }
    var inv = 1 / Math.sqrt(sum);
    for (i = 0; i < cands.length; i++) {
      cands[i].amp = cands[i].amp * inv;
      cands[i].prob = cands[i].amp * cands[i].amp;
    }
    return cands;
  }

  function collapse(cands, mode) {
    mode = mode || "born";
    normalizeAmps(cands);
    var i, best = 0, bestP = -1;
    for (i = 0; i < cands.length; i++) {
      if (cands[i].prob > bestP) { bestP = cands[i].prob; best = i; }
    }
    if (mode === "max") return { index: best, method: "max-amp", picked: cands[best] };
    var r = Math.random(), acc = 0, idx = best;
    for (i = 0; i < cands.length; i++) {
      acc += cands[i].prob;
      if (r <= acc) { idx = i; break; }
    }
    if (cands[idx].prob < cands[best].prob * 0.35) idx = best;
    return { index: idx, method: "born+bias", picked: cands[idx] };
  }

  function localCandidates(q) {
    var out = [], seen = {};
    function add(text, source, conf) {
      text = String(text || "").trim();
      if (!text || text.length < 8) return;
      var k = text.slice(0, 100);
      if (seen[k]) return;
      seen[k] = 1;
      out.push({ text: text, source: source, conf: conf });
    }
    var jobs = [];
    try {
      if (G.AKSI_ZERO && AKSI_ZERO.think) {
        jobs.push(maybe(AKSI_ZERO.think(q)).then(function (z) {
          if (z) add(z.answer || z.text, "zero", z.confidence != null ? z.confidence : 0.65);
        }).catch(function () {}));
      }
    } catch (e) {}
    try {
      if (G.AKSI_NEURO && AKSI_NEURO.think) {
        jobs.push(maybe(AKSI_NEURO.think(q)).then(function (n) {
          if (n) add(n.text || n.answer, "neuro", n.score != null ? n.score : 0.55);
        }).catch(function () {}));
      }
    } catch (e) {}
    try {
      if (G.AKSI_COMPOSE && AKSI_COMPOSE.think) {
        jobs.push(maybe(AKSI_COMPOSE.think(q)).then(function (c) {
          if (c) add(c.text, c.mode || "compose", c.confidence != null ? c.confidence : 0.6);
        }).catch(function () {}));
      }
    } catch (e) {}
    try {
      if (G.AKSI_DECISION && AKSI_DECISION.decide) {
        jobs.push(maybe(AKSI_DECISION.decide(q)).then(function (d) {
          if (d && d.answer) add(d.answer, "decision", 0.72);
        }).catch(function () {}));
      }
    } catch (e) {}
    return Promise.all(jobs).then(function () {
      add("АКСИ локальный базис: несколько ответов оцениваются по релевантности, структуре и QCLI.", "aksi-local", 0.55);
      return out;
    });
  }

  function llmCandidates(q, n) {
    n = Math.min(4, Math.max(1, n || 3));
    if (!G.AKSI_WEBLLM || !AKSI_WEBLLM.ready || !AKSI_WEBLLM.ready()) return Promise.resolve([]);
    var temps = [0.15, 0.45, 0.8];
    var prompts = [q, "Ответь иначе, строго по фактам:\n" + q, "Дай практический вариант:\n" + q];
    var jobs = [];
    for (var i = 0; i < n; i++) {
      (function (idx) {
        jobs.push(
          AKSI_WEBLLM.complete(prompts[idx] || q, { temperature: temps[idx] || 0.7, max_tokens: 280 })
            .then(function (r) {
              return r && r.text ? { text: r.text, source: "webllm-t" + (temps[idx] || 0.7), conf: 0.82 - idx * 0.04 } : null;
            })
            .catch(function () { return null; })
        );
      })(i);
    }
    return Promise.all(jobs).then(function (a) { return a.filter(Boolean); });
  }

  function ask(query, opts) {
    opts = opts || {};
    var q = String(query || "").trim();
    if (!q) return Promise.resolve({ ok: false, error: "empty" });
    var t0 = Date.now();
    emit("start", { query: q });
    emit("phase", { phase: "basis", note: "собираю кандидаты" });

    var localP = opts.includeLocal === false ? Promise.resolve([]) : localCandidates(q);

    return localP.then(function (local) {
      emit("candidates-local", { count: local.length });
      return llmCandidates(q, opts.n || 3).then(function (llm) {
        emit("candidates-llm", { count: llm.length });
        var raw = local.concat(llm);
        if (!raw.length) {
          raw = [{ text: "Нет кандидатов. Загрузите WebLLM или используйте Zero.", source: "empty", conf: 0.3 }];
        }
        emit("phase", { phase: "superpose", note: "амплитуды" });
        var scored = raw.map(function (c) { return scoreCandidate(q, c.text, c); });
        normalizeAmps(scored);
        emit("superposition", {
          states: scored.map(function (c, i) {
            return { i: i, source: c.source, prob: round(c.prob, 4), amp: round(c.amp, 4), eqs: c.eqs, qcli: c.qcli, preview: c.text.slice(0, 160) };
          })
        });
        emit("phase", { phase: "collapse", note: "измерение" });
        var col;
        if (opts.selectedIndex != null) {
          var ix = Math.max(0, Math.min(scored.length - 1, +opts.selectedIndex));
          col = { index: ix, method: "user-selection", picked: scored[ix] };
        } else {
          col = collapse(scored, opts.mode || "born");
        }
        var picked = col.picked;
        var finalQx = null;

        function finish() {
          var seal = {
            alg: "FNV-superpose-2",
            hash: fnv(q + "|" + picked.text + "|" + col.index),
            did: "did:aksi:local:superpose",
            ts: Date.now()
          };
          var session = {
            ok: true,
            version: VER,
            query: q,
            answer: picked.text,
            source: picked.source,
            collapse: { index: col.index, method: col.method, prob: round(picked.prob, 4) },
            scores: { eqs: picked.eqs, qcli: picked.qcli, amp: round(picked.amp, 4) },
            superposition: scored.map(function (c, i) {
              return {
                i: i, source: c.source, prob: round(c.prob, 4), eqs: c.eqs, qcli: c.qcli,
                text: c.text, selected: i === col.index
              };
            }),
            quantum: finalQx,
            seal: seal,
            offline: !(G.AKSI_WEBLLM && AKSI_WEBLLM.ready && AKSI_WEBLLM.ready()),
            ms: Date.now() - t0
          };
          lastSession = session;
          emit("collapsed", session);
          emit("done", { ms: session.ms, index: col.index });
          return session;
        }

        try {
          if (G.AKSI_QPIPE && AKSI_QPIPE.processAnswer) {
            return AKSI_QPIPE.processAnswer(q, picked.text, { force: true }).then(function (qp) {
              finalQx = qp && (qp.quantum || qp);
              return finish();
            }).catch(function () { return finish(); });
          }
          if (G.AKSI_QUANTUM && AKSI_QUANTUM.answerGate) {
            finalQx = AKSI_QUANTUM.answerGate(q, picked.text);
          }
        } catch (e) {}
        return finish();
      });
    });
  }

  function status() {
    return {
      version: VER,
      webllm: G.AKSI_WEBLLM ? AKSI_WEBLLM.status() : null,
      quantum: !!(G.AKSI_QUANTUM || G.AKSI_QPIPE),
      memory: readMemory().length,
      last: lastSession && {
        query: lastSession.query,
        index: lastSession.collapse && lastSession.collapse.index,
        ms: lastSession.ms
      }
    };
  }

  G.AKSI_SUPERPOSE = {
    version: VER,
    ask: ask,
    on: on,
    status: status,
    last: function () { return lastSession; },
    memory: function () { return readMemory(); },
    saveMemory: saveMemory,
    clearMemory: clearMemory,
    removeMemory: removeMemory
  };
})(typeof window !== "undefined" ? window : globalThis);
