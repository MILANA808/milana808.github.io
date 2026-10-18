/*!
 * AKSI Unified Adaptive Core v0.1.0
 * Browser-local classical adaptive memory + geometric features + Lorenz exploration.
 * Answer generation is delegated to an explicitly loaded language model (e.g. AKSI_WEBLLM).
 * No quantum advantage, consciousness, or truth oracle is claimed.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const STORAGE_KEY = "aksi_unified_core_v1";
  const MAX_ITEMS = 300;
  const MAX_CHARS = 1200;
  const DEFAULT_STATE = () => ({ schema: "AKSI-UNIFIED-MEMORY/1", version: VERSION, concepts: {}, links: {}, episodes: [], feedbackCount: 0 });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const clean = (v, max) => String(v == null ? "" : v).trim().slice(0, max || MAX_CHARS);
  function tokens(s) {
    return (clean(s, 5000).toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu) || [])
      .filter(t => t.length > 1).slice(0, 100);
  }
  function hash32(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Aperiodic-inspired semantic address: deterministic multiscale angles, not a literal
  // infinite Penrose tiling and not a claim of infinite information capacity.
  function semanticAddress(token) {
    const h = hash32(token);
    const phi = (1 + Math.sqrt(5)) / 2;
    const angle = ((h % 100003) * (2 * Math.PI / phi)) % (2 * Math.PI);
    const radius = 1 + Math.log1p((h >>> 7) % 4096);
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle), layer: h % 7 };
  }
  function loadState() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_STATE();
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schema !== "AKSI-UNIFIED-MEMORY/1") return DEFAULT_STATE();
      return Object.assign(DEFAULT_STATE(), parsed);
    } catch (_) { return DEFAULT_STATE(); }
  }
  let state = loadState();
  function save() {
    try { root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch (_) { return false; }
  }
  function ensureConcept(token) {
    if (!state.concepts[token]) {
      const p = semanticAddress(token);
      state.concepts[token] = { x: p.x, y: p.y, layer: p.layer, conductance: 0.5, seen: 0 };
    }
    return state.concepts[token];
  }
  function linkKey(a, b) { return a < b ? a + "|" + b : b + "|" + a; }
  function contextFor(query) {
    const ts = Array.from(new Set(tokens(query)));
    const matches = [];
    for (const episode of state.episodes.slice(-MAX_ITEMS).reverse()) {
      const epTokens = new Set(episode.tokens || []);
      let overlap = 0;
      for (const t of ts) if (epTokens.has(t)) overlap++;
      const score = ts.length ? overlap / Math.max(1, new Set([...ts, ...epTokens]).size) : 0;
      if (score > 0.12) matches.push({ score, episode });
    }
    matches.sort((a, b) => b.score - a.score);
    const related = matches.slice(0, 3).map(x => ({
      score: Number(x.score.toFixed(3)), query: x.episode.query, answer: x.episode.answer,
      feedback: x.episode.feedback || 0
    }));
    const concepts = ts.map(t => {
      const c = ensureConcept(t);
      return { token: t, conductance: Number(c.conductance.toFixed(3)), seen: c.seen, layer: c.layer };
    });
    return { tokens: ts, concepts, related };
  }
  // Lorenz integration supplies reproducible exploratory features only. The end point
  // is not used as a truth score or as the answer itself.
  function lorenz(seed, steps) {
    let x = 0.1 + ((hash32(seed) % 1000) / 1000) * 0.8;
    let y = 0.1 + ((hash32(seed + ":y") % 1000) / 1000) * 0.8;
    let z = 0.1 + ((hash32(seed + ":z") % 1000) / 1000) * 0.8;
    const sigma = 10, rho = 28, beta = 8 / 3, dt = 0.005;
    let energy = 0, turns = 0, previousSign = Math.sign(x);
    for (let i = 0; i < (steps || 240); i++) {
      const dx = sigma * (y - x), dy = x * (rho - z) - y, dz = x * y - beta * z;
      x += dx * dt; y += dy * dt; z += dz * dt;
      if (![x, y, z].every(Number.isFinite) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6 || Math.abs(z) > 1e6) {
        return { stable: false, turns, signature: 0 };
      }
      const sign = Math.sign(x);
      if (sign && previousSign && sign !== previousSign) turns++;
      if (sign) previousSign = sign;
      energy += Math.sqrt(x * x + y * y + z * z);
    }
    return { stable: true, turns, signature: Number(((energy / (steps || 240)) % 1).toFixed(6)) };
  }
  function prepare(query, evidence) {
    const ctx = contextFor(query);
    const trajectory = lorenz(clean(query, 500));
    let intent = null, diffusion = null, evidenceAssessment = null, evidenceRecord = null;
    try {
      if (root.AKSIWaveBayesianEngine && root.AKSIWaveBayesianEngine.AKSIWaveBayesianEngine) {
        intent = new root.AKSIWaveBayesianEngine.AKSIWaveBayesianEngine().analyze(query);
      }
    } catch (_) {}
    try {
      const geo = root.AKSIGeometricKnowledgeCore;
      if (geo && ctx.tokens.length) {
        const allTokens = Object.keys(state.concepts).slice(-100);
        const ids = Array.from(new Set(allTokens.concat(ctx.tokens))).slice(0, 100);
        const allowed = new Set(ids);
        const edges = Object.values(state.links).filter(e => allowed.has(e.a) && allowed.has(e.b)).map(e => ({ from: e.a, to: e.b, weight: e.weight }));
        const seeds = {};
        ctx.tokens.forEach(t => { if (allowed.has(t)) seeds[t] = 1; });
        diffusion = geo.diffuseGraph({ nodes: ids, edges }, seeds, { steps: 4, alpha: 0.3 });
        ctx.relatedConcepts = Object.entries(diffusion.scores).filter(([k]) => !ctx.tokens.includes(k)).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([token,score])=>({token,score}));
      }
    } catch (_) {}
    try {
      const audit = root.AKSICognitiveCore;
      if (audit && Array.isArray(evidence) && evidence.length) {
        evidenceRecord = audit.createCase(query);
        evidence.slice(0, 6).forEach(item => audit.addEvidence(evidenceRecord, {
          // Retrieved material is context by default. It counts as support/refutation
          // only when an upstream reviewer explicitly supplies stance.
          stance: ["supports", "refutes", "context"].includes(item.stance) ? item.stance : "context",
          text: item.text || item.snippet || item.title || "Retrieved source",
          url: item.url || "",
          sourceGroup: item.sourceGroup || item.url || item.title || "unattributed-source",
          reliability: Number.isFinite(item.reliability) && item.reliability >= 0 && item.reliability <= 1 ? item.reliability : 0.5,
          observedAt: item.observedAt || ""
        }));
        evidenceAssessment = audit.assess(evidenceRecord);
      }
    } catch (_) {}
    const hints = [
      "Классическая адаптивная память: веса связей обновляются только по явной обратной связи пользователя.",
      "Геометрические адреса понятий — детерминированная ассоциативная эвристика, а не доказательство смысла.",
      "Динамический хаос используется только для разнообразия исследовательских признаков; не считай его критерием истины.",
      "Если локальные эпизоды противоречат источникам или запросу, явно укажи это; не выдавай память за проверенный факт."
    ];
    if (ctx.related.length) {
      hints.push("Похожие прошлые эпизоды (не обязательно верны; учитывай только как контекст):\n" +
        ctx.related.map((e, i) => (i + 1) + ". Запрос: " + e.query + "\nОтвет: " + e.answer +
          "\nОбратная связь: " + (e.feedback > 0 ? "полезно" : e.feedback < 0 ? "неполезно" : "не оценено")).join("\n\n"));
    }
    if (intent && intent.accepted) hints.push("Маршрутизация задачи (эвристика, не оценка истины): " + intent.label + " / " + intent.intent + "; сходство=" + intent.score);
    if (ctx.relatedConcepts && ctx.relatedConcepts.length) hints.push("Геометрическое распространение активации (классический графовый ранг, не доказательство): " + JSON.stringify(ctx.relatedConcepts));
    if (evidenceAssessment) hints.push("Аудит найденных материалов: " + evidenceAssessment.status + "; источниковых фрагментов=" + evidenceAssessment.evidenceCount + ". Они зарегистрированы как контекст, не как подтверждение или опровержение.");
    hints.push("Текущие признаки: " + JSON.stringify({ conceptCount: ctx.concepts.length, feedbackCount: state.feedbackCount, exploration: trajectory }));
    return { context: ctx, trajectory, intent, diffusion, evidenceRecord, evidenceAssessment, system: hints.join("\n\n") };
  }
  function extractMathExpression(query) {
    const original = clean(query, 200);
    const command = original.match(/^(?:вычисли|посчитай|реши|сколько будет|calculate|compute|evaluate)\s+(.+)$/i);
    const expression = (command ? command[1] : original).trim();
    if (!expression || !/^[\d\s()+\-*/.^a-zA-Z]+$/.test(expression)) return null;
    if (!/[+\-*/^()]|\b(?:sqrt|abs|sin|cos|tan|ln|log|exp)\s*\(/i.test(expression)) return null;
    return { expression, explicitlyRequested: !!command };
  }
  async function answer(query, options) {
    options = options || {};
    const prepared = prepare(query, options.evidence || []);
    const math = extractMathExpression(query);
    if (math && root.AKSICalculator && typeof root.AKSICalculator.evaluate === "function") {
      const calculation = root.AKSICalculator.evaluate(math.expression);
      if (calculation.ok || math.explicitlyRequested) {
        const text = calculation.ok
          ? math.expression + " = " + calculation.formatted
          : "Не удалось вычислить выражение: " + calculation.error;
        if (calculation.ok) {
          state.episodes.push({ query: clean(query), answer: clean(text, 5000), tokens: prepared.context.tokens, feedback: 0, at: new Date().toISOString(), source: "aksi-calculator" });
          if (state.episodes.length > MAX_ITEMS) state.episodes = state.episodes.slice(-MAX_ITEMS);
          for (const t of prepared.context.tokens) ensureConcept(t).seen++;
          save();
        }
        const result = {
          text, source: "aksi-calculator", model: "AKSI Calculator " + (calculation.version || "1.0.0"),
          core: "AKSI Unified Adaptive Core " + VERSION, calculation,
          reasoning: ["Выражение обработано парсером арифметики без eval и без исполнения произвольного кода."],
          evidenceAudit: "not_applicable_to_arithmetic",
          integration: {
            schema: "AKSI-CORE-RESULT/1", coreVersion: VERSION, generator: "aksi-calculator",
            intent: prepared.intent ? { id: prepared.intent.intent, accepted: !!prepared.intent.accepted, method: prepared.intent.method || null } : null,
            graph: prepared.diffusion ? { used: true, method: "classical-weighted-graph-diffusion" } : { used: false },
            evidence: { status: "not_applicable_to_arithmetic", count: 0 },
            modules: inspect().modules
          }
        };
        recordTrace({ type: "calculation", generator: "aksi-calculator", expression: math.expression, ok: !!calculation.ok, graphUsed: !!prepared.diffusion });
        return result;
      }
    }
    // Native offline generation is the primary path; WebLLM is deliberately not called.
    if (root.AKSI_DNA_TOPOLOGY && typeof root.AKSI_DNA_TOPOLOGY.generate === "function") {
      const native = root.AKSI_DNA_TOPOLOGY.generate(query, options);
      const extra = [];
      if (prepared.intent && prepared.intent.accepted) extra.push("Маршрут интента: " + prepared.intent.label);
      if (prepared.context.related.length) extra.push("Похожие локальные эпизоды учтены как контекст: " + prepared.context.related.length);
      if (prepared.diffusion) extra.push("Графовая диффузия: вычислена классическим алгоритмом.");
      if (Array.isArray(options.evidence) && options.evidence.length) extra.push("Найденные источники: " + options.evidence.length + " (не встроены в ответ автоматически; проверь их отдельно).");
      native.core = "AKSI Unified Adaptive Core " + VERSION + " + AKSI Native Generator";
      state.episodes.push({ query: clean(query), answer: clean(native.text, 5000), tokens: prepared.context.tokens, feedback: 0, at: new Date().toISOString(), source: "aksi-native-dna-topology" });
      if (state.episodes.length > MAX_ITEMS) state.episodes = state.episodes.slice(-MAX_ITEMS);
      for (const t of prepared.context.tokens) ensureConcept(t).seen++;
      save();
      native.reasoning = extra;
      native.evidenceAudit = prepared.evidenceAssessment ? prepared.evidenceAssessment.status : "no_sources";
      native.exploration = prepared.trajectory;
      native.integration = {
        schema: "AKSI-CORE-RESULT/1",
        coreVersion: VERSION,
        generator: "aksi-native-dna-topology",
        intent: prepared.intent ? { id: prepared.intent.intent, accepted: !!prepared.intent.accepted, method: prepared.intent.method || null } : null,
        graph: prepared.diffusion ? { used: true, method: "classical-weighted-graph-diffusion" } : { used: false },
        evidence: prepared.evidenceAssessment ? {
          status: prepared.evidenceAssessment.status,
          count: prepared.evidenceAssessment.evidenceCount,
          supportWeight: prepared.evidenceAssessment.supportWeight,
          refuteWeight: prepared.evidenceAssessment.refuteWeight,
          warning: prepared.evidenceAssessment.warning
        } : { status: "no_sources", count: 0 },
        modules: inspect().modules
      };
      recordTrace({
        type: "answer",
        generator: "aksi-native-dna-topology",
        intent: prepared.intent ? prepared.intent.intent : null,
        evidenceStatus: native.evidenceAudit,
        evidenceCount: (options.evidence || []).length,
        graphUsed: !!prepared.diffusion
      });
      try {
        const audit = root.AKSICognitiveCore;
        if (audit) {
          const record = prepared.evidenceRecord || audit.createCase(query);
          if (!prepared.evidenceRecord) {
            (options.evidence || []).slice(0, 6).forEach(item => audit.addEvidence(record, {
              stance: ["supports", "refutes", "context"].includes(item.stance) ? item.stance : "context",
              text: item.text || item.snippet || item.title || "Retrieved source",
              url: item.url || "", sourceGroup: item.sourceGroup || item.url || item.title || "unattributed-source",
              reliability: Number.isFinite(item.reliability) && item.reliability >= 0 && item.reliability <= 1 ? item.reliability : 0.5,
              observedAt: item.observedAt || ""
            }));
          }
          const assessment = prepared.evidenceAssessment || audit.assess(record);
          const receipt = await audit.receipt(record, assessment);
          native.receipt = receipt.digest;
          native.receiptSchema = receipt.schema;
          native.receiptAssessmentStatus = assessment.status;
        }
      } catch (_) { native.receipt = null; }
      return native;
    }
    const api = root.AKSI_WEBLLM;
    if (!api || typeof api.complete !== "function" || !api.ready()) {
      return { text: "Встроенный генератор АКСИ не загрузился. Обнови страницу и проверь подключение aksi-dna-topology-engine.js.", source: "native-core-error", error: "AKSI_DNA_TOPOLOGY unavailable", core: "AKSI Unified Adaptive Core " + VERSION };
    }
    const system = [String(options.system || ""), prepared.system].filter(Boolean).join("\n\n");
    const llmOptions = Object.assign({}, options, { system });
    delete llmOptions.evidence;
    const result = await api.complete(query, llmOptions);
    if (result && result.text) {
      state.episodes.push({ query: clean(query), answer: clean(result.text, 5000), tokens: prepared.context.tokens, feedback: 0, at: new Date().toISOString() });
      if (state.episodes.length > MAX_ITEMS) state.episodes = state.episodes.slice(-MAX_ITEMS);
      for (const t of prepared.context.tokens) ensureConcept(t).seen++;
      save();
      let receipt = null;
      try {
        const audit = root.AKSICognitiveCore;
        if (audit) {
          const record = prepared.evidenceRecord || audit.createCase(query);
          if (!prepared.evidenceRecord) {
            (options.evidence || []).slice(0, 6).forEach(item => audit.addEvidence(record, {
              stance: ["supports", "refutes", "context"].includes(item.stance) ? item.stance : "context",
              text: item.text || item.snippet || item.title || "Retrieved source",
              url: item.url || "", sourceGroup: item.sourceGroup || item.url || item.title || "unattributed-source",
              reliability: Number.isFinite(item.reliability) && item.reliability >= 0 && item.reliability <= 1 ? item.reliability : 0.5,
              observedAt: item.observedAt || ""
            }));
          }
          receipt = await audit.receipt(record, prepared.evidenceAssessment || audit.assess(record));
        }
      } catch (_) {}
      const combined = Object.assign({}, result, {
        core: "AKSI Unified Adaptive Core " + VERSION,
        adaptiveContext: prepared.context.related.length,
        exploration: prepared.trajectory,
        intent: prepared.intent && prepared.intent.accepted ? prepared.intent.intent : null,
        evidenceAudit: prepared.evidenceAssessment ? prepared.evidenceAssessment.status : "no_sources",
        receipt: receipt ? receipt.digest : null,
        integration: {
          schema: "AKSI-CORE-RESULT/1",
          coreVersion: VERSION,
          generator: "AKSI_WEBLLM",
          intent: prepared.intent ? { id: prepared.intent.intent, accepted: !!prepared.intent.accepted, method: prepared.intent.method || null } : null,
          graph: prepared.diffusion ? { used: true, method: "classical-weighted-graph-diffusion" } : { used: false },
          evidence: prepared.evidenceAssessment ? {
            status: prepared.evidenceAssessment.status,
            count: prepared.evidenceAssessment.evidenceCount,
            supportWeight: prepared.evidenceAssessment.supportWeight,
            refuteWeight: prepared.evidenceAssessment.refuteWeight,
            warning: prepared.evidenceAssessment.warning
          } : { status: "no_sources", count: 0 },
          modules: inspect().modules
        }
      });
      recordTrace({
        type: "answer",
        generator: "AKSI_WEBLLM",
        intent: prepared.intent ? prepared.intent.intent : null,
        evidenceStatus: combined.evidenceAudit,
        evidenceCount: (options.evidence || []).length,
        graphUsed: !!prepared.diffusion
      });
      return combined;
    }
    return result;
  }
  // Explicit feedback performs the actual online weight update. Generating an answer
  // alone never treats that answer as true and never strengthens its own claims.
  function feedback(query, answerText, rating) {
    rating = Number(rating);
    if (rating !== 1 && rating !== -1) throw new RangeError("rating must be 1 (helpful) or -1 (not helpful).");
    const q = clean(query), a = clean(answerText, 5000);
    const episode = state.episodes.slice().reverse().find(e => e.query === q && (e.answer === a || a.indexOf(e.answer) === 0));
    if (!episode) return { ok: false, reason: "episode_not_found" };
    if (episode.feedback === rating) return { ok: true, changed: false, feedbackCount: state.feedbackCount };
    const previous = Number(episode.feedback) || 0;
    const delta = rating - previous;
    const ts = Array.from(new Set(tokens(q))).slice(0, 24);
    const as = Array.from(new Set(tokens(a))).slice(0, 24);
    for (const t of ts) {
      const c = ensureConcept(t);
      c.conductance = clamp(c.conductance + 0.04 * delta, 0.02, 0.98);
    }
    for (const t of as) {
      const c = ensureConcept(t);
      c.conductance = clamp(c.conductance + 0.015 * delta, 0.02, 0.98);
    }
    for (const x of ts) for (const y of as) {
      if (x === y) continue;
      const k = linkKey(x, y);
      const link = state.links[k] || { a: x, b: y, weight: 0.5, updates: 0 };
      link.weight = clamp(link.weight + 0.02 * delta, 0.01, 0.99);
      link.updates++;
      state.links[k] = link;
    }
    episode.feedback = rating;
    episode.feedbackAt = new Date().toISOString();
    state.feedbackCount++;
    const persisted = save();
    return { ok: true, changed: true, persisted, feedbackCount: state.feedbackCount, conceptsUpdated: ts.length + as.length, linksUpdated: Object.keys(state.links).length };
  }
  function stats() {
    return { version: VERSION, concepts: Object.keys(state.concepts).length, links: Object.keys(state.links).length, episodes: state.episodes.length, feedbackCount: state.feedbackCount, storageKey: STORAGE_KEY, modelReady: !!(root.AKSI_WEBLLM && root.AKSI_WEBLLM.ready && root.AKSI_WEBLLM.ready()) };
  }
  function clearMemory() { state = DEFAULT_STATE(); return { ok: true, persisted: save() }; }
  // A single, inspectable orchestration contract over the modules that already exist.
  // Trace is diagnostic metadata, not a signed or tamper-proof audit log.
  const trace = [];
  const MAX_TRACE = 200;
  function recordTrace(entry) {
    trace.push(Object.assign({
      sequence: trace.length + 1,
      at: new Date().toISOString(),
      coreVersion: VERSION
    }, entry));
    if (trace.length > MAX_TRACE) {
      trace.splice(0, trace.length - MAX_TRACE);
      trace.forEach((item, index) => { item.sequence = index + 1; });
    }
    return trace[trace.length - 1];
  }
  function inspect() {
    const modules = {
      adaptiveMemory: true,
      decisionCoreV3: !!(root.AKSICoreV3 && typeof root.AKSICoreV3.run === "function"),
      nativeGenerator: !!(root.AKSI_DNA_TOPOLOGY && typeof root.AKSI_DNA_TOPOLOGY.generate === "function"),
      intentRouter: !!(root.AKSIWaveBayesianEngine && root.AKSIWaveBayesianEngine.AKSIWaveBayesianEngine),
      evidenceAssessor: !!(root.AKSICognitiveCore && typeof root.AKSICognitiveCore.assess === "function"),
      geometricGraph: !!(root.AKSIGeometricKnowledgeCore && typeof root.AKSIGeometricKnowledgeCore.diffuseGraph === "function"),
      calculator: !!(root.AKSICalculator && typeof root.AKSICalculator.evaluate === "function"),
      sourceLookup: !!(root.AKSI_INTERNET && typeof root.AKSI_INTERNET.gather === "function")
    };
    return {
      schema: "AKSI-CORE-STATUS/1",
      version: VERSION,
      mode: "classical-browser-orchestrator",
      modules,
      activeModuleCount: Object.values(modules).filter(Boolean).length,
      limitations: [
        "Module presence does not prove every runtime path is correct.",
        "Intent and graph scores are heuristics, not truth probabilities.",
        "Retrieved sources default to context; support/refutation requires explicit annotation.",
        "Trace is in-memory diagnostic data, not a signed audit receipt."
      ]
    };
  }
  async function decide(task, candidates, options) {
    const engine = root.AKSICoreV3;
    if (!engine || typeof engine.run !== "function") {
      throw new Error("AKSI Core v3 is unavailable; load aksi-core-v3.js before the unified adaptive core.");
    }
    const result = await engine.run(task, candidates, options || {});
    recordTrace({
      type: "decision",
      generator: "aksi-core-v3",
      mode: result.mode,
      candidateCount: Array.isArray(candidates) ? candidates.length : 0,
      abstained: !!(result.result && result.result.abstained),
      receiptHash: result.receipt && result.receipt.receipt_hash || null
    });
    return result;
  }
  function getTrace() { return trace.map(item => Object.assign({}, item)); }
  function clearTrace() { trace.length = 0; return { ok: true }; }
  root.AKSI_UNIFIED_CORE = { version: VERSION, answer, decide, prepare, feedback, stats, clearMemory, semanticAddress, lorenz, inspect, getTrace, clearTrace };
  if (typeof module === "object" && module.exports) module.exports = root.AKSI_UNIFIED_CORE;
})(typeof window !== "undefined" ? window : globalThis);
