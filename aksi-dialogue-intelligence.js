/*!
 * AKSI Dialogue Intelligence Engine v1.0.0
 * Compositional intent parsing, grounded concept reasoning and explicit proof records.
 * Deterministic symbolic layer; not a general-purpose language model.
 */
(function (root) {
  "use strict";
  const VERSION = "1.1.0";
  const norm = value => String(value == null ? "" : value).toLocaleLowerCase("ru-RU")
    .replace(/[ё]/g, "е").replace(/[«»"']/g, "").replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ").trim();
  const clean = (value, max) => String(value == null ? "" : value).trim().slice(0, max || 3000);
  const STOP = new Set(("что как это ли мне ты вы мы они она оно он а и в во на к ко с со о об про для по из от до за при не же бы такое означает объясни расскажи почему зачем когда где какой какая какие чем отличается разница").split(" "));
  function tokens(value) {
    return norm(value).split(" ").filter(x => x.length > 1 && !STOP.has(x));
  }
  function overlap(a, b) {
    const A = new Set(a), B = new Set(b);
    if (!A.size || !B.size) return 0;
    let n = 0; A.forEach(x => { if (B.has(x)) n++; });
    return n / (A.size + B.size - n);
  }
  function bayesUpdate(prior, likelihood, falsePositive) {
    [prior, likelihood, falsePositive].forEach(x => {
      if (!Number.isFinite(x) || x < 0 || x > 1) throw new RangeError("probabilities must be in [0,1]");
    });
    const denominator = prior * likelihood + (1 - prior) * falsePositive;
    return denominator === 0 ? null : prior * likelihood / denominator;
  }
  function entropy(probabilities) {
    if (!Array.isArray(probabilities) || !probabilities.length) throw new TypeError("probabilities array required");
    const sum = probabilities.reduce((a, b) => {
      if (!Number.isFinite(b) || b < 0 || b > 1) throw new RangeError("probabilities must be in [0,1]");
      return a + b;
    }, 0);
    if (Math.abs(sum - 1) > 1e-9) throw new RangeError("probabilities must sum to 1");
    return -probabilities.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  }
  function modusPonens(rule, fact) {
    if (!rule || !rule.if || !rule.then || !fact || !fact.subject || !fact.predicate) {
      return { valid: false, reason: "invalid_premises" };
    }
    const valid = norm(rule.if) === norm(fact.predicate);
    return valid
      ? { valid: true, conclusion: { subject: fact.subject, predicate: rule.then }, rule: "modus_ponens", premises: [fact, rule] }
      : { valid: false, reason: "antecedent_mismatch" };
  }
  function relationClosure(edges, start, target) {
    const graph = new Map();
    edges.forEach(e => {
      if (!e || !e.from || !e.to) return;
      if (!graph.has(norm(e.from))) graph.set(norm(e.from), []);
      graph.get(norm(e.from)).push(norm(e.to));
    });
    const queue = [{ id: norm(start), path: [norm(start)] }], seen = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (current.id === norm(target)) return current.path;
      if (seen.has(current.id)) continue;
      seen.add(current.id);
      (graph.get(current.id) || []).forEach(next => {
        if (!seen.has(next)) queue.push({ id: next, path: current.path.concat(next) });
      });
    }
    return null;
  }
  function resolveConcept(text, semantic) {
    if (!semantic || typeof semantic.resolve !== "function") return null;
    const cleaned = norm(text);
    const variants = [cleaned, cleaned.replace(/ику$/, "ика"), cleaned.replace(/ию$/, "ия"),
      cleaned.replace(/ии$/, "ия"), cleaned.replace(/у$/, "а"), cleaned.replace(/ой$/, "а")];
    for (const variant of variants) {
      const exact = semantic.resolve(variant);
      if (exact) return exact;
    }
    const candidates = (semantic.concepts || []).map(id => ({ id, score: overlap(tokens(cleaned), tokens(id)) }))
      .filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score);
    if (!candidates.length || (candidates[1] && candidates[1].score === candidates[0].score)) return null;
    return candidates[0].id;
  }
  function answerStateless(input) {
    const raw = clean(input, 1200);
    if (!raw) return null;
    const semantic = root.AKSISemanticReasoning;
    const mathPractice = root.AKSIMathPractice;
    if (mathPractice && typeof mathPractice.answer === "function") {
      const mathResult = mathPractice.answer(raw);
      if (mathResult && mathResult.handled) return mathResult;
    }
    const q = norm(raw);
    let match, conceptId;
    // Rephrase common natural-language requests into the existing grounded concept engine.
    match = q.match(/^(?:а теперь |пожалуйста )?(?:объясни проще|простыми словами|объясни по простому|расскажи подробнее)(?: мне)? (.+)$/);
    if (match) {
      conceptId = resolveConcept(match[1], semantic);
      if (!conceptId) return abstain(match[1], "Я распознала просьбу объяснить понятие, но не смогла однозначно определить само понятие.");
      const info = semantic.conceptInfo(conceptId);
      return {
        handled: true, status: "explained", intent: "explain_concept", concept: conceptId,
        text: info.definition + "\n\nПроще говоря: " + simplify(info.definition) +
          (info.features.length ? "\n\nГлавные составляющие: " + info.features.join(", ") + "." : ""),
        proof: [{ type: "grounded_definition", concept: conceptId, source: "AKSI concept graph" }]
      };
    }
    match = q.match(/^(?:почему|зачем) (.+)$/);
    if (match) {
      const tail = match[1].replace(/[?!.]+$/g, "").trim();
      const ids = (semantic && semantic.concepts || []).filter(id => tail.includes(norm(id)));
      if (!ids.length) return abstain(tail, "Вопрос требует причинных сведений. В текущей базе нет подтверждённой причинной модели для этого утверждения.");
      const info = semantic.conceptInfo(ids.sort((a, b) => b.length - a.length)[0]);
      return {
        handled: true, status: "causal_evidence_missing", intent: "why_question",
        text: "Это причинный вопрос. Определение понятия «" + info.id + "» само по себе не объясняет причину.\n\nЧто известно из базы: " + info.definition + "\n\nДля обоснованного ответа нужны наблюдения или проверенная причинная связь; я не буду выдавать ассоциацию за причину.",
        proof: [{ type: "causal_claim_withheld", concept: info.id, reason: "no_causal_evidence" }]
      };
    }
    match = q.match(/^(?:сравни|сопоставь) (.+?) (?:и|с) (.+)$/);
    if (match && semantic) {
      const a = resolveConcept(match[1], semantic), b = resolveConcept(match[2], semantic);
      if (a && b) {
        const result = semantic.answer("сравни " + a + " и " + b);
        if (result && result.handled) return Object.assign({}, result, { intent: "compare", proof: (result.proof || []).concat([{ type: "intent_normalization", from: raw, to: "сравни " + a + " и " + b }]) });
      }
    }
    match = q.match(/^(?:является ли|верно ли что) (.+?) (?:частью|разделом|видом|типом) (.+)$/);
    if (match && semantic) {
      const a = resolveConcept(match[1], semantic), b = resolveConcept(match[2], semantic);
      if (a && b) return Object.assign({}, semantic.answer("является ли " + a + " частью " + b), { intent: "relation_check" });
    }
    // Existing exact semantic answers remain authoritative for the supported concept graph.
    if (semantic && typeof semantic.answer === "function") {
      const base = semantic.answer(raw);
      if (base && base.handled) return Object.assign({}, base, { intent: base.intent || "semantic_lookup" });
    }
    // Identify likely intent without pretending that topic similarity is understanding.
    const words = tokens(raw);
    const known = semantic && semantic.concepts ? semantic.concepts.map(id => ({ id, score: overlap(words, tokens(id)) }))
      .filter(x => x.score >= 0.34).sort((a, b) => b.score - a.score).slice(0, 3) : [];
    if (known.length) {
      return {
        handled: true, status: "needs_clarification", intent: "underspecified_question",
        text: "Я выделила тему «" + known[0].id + "», но пока не определила точную задачу. Ты хочешь получить определение, сравнение, объяснение причин или проверить конкретное утверждение?",
        candidates: known, proof: [{ type: "topic_grounding", candidates: known, note: "Similarity is used for routing only, not truth." }]
      };
    }
    return null;
  }

  // Session context stores only a bounded topic reference, not the full conversation.
  // It is intentionally in-memory: refreshing the page starts a fresh dialogue session.
  let contextTurns = [];
  function answer(input) {
    const raw = clean(input, 1200);
    if (!raw) return null;
    const q = norm(raw);
    const previous = contextTurns.length ? contextTurns[contextTurns.length - 1] : null;
    let routed = raw, usedContext = false;
    const isWhyFollowUp = /^(?:а )?(?:почему|зачем)\s*[?!.]*$/.test(q);
    const isExampleFollowUp = /^(?:а )?(?:пример|а пример|приведи пример)\s*[?!.]*$/.test(q);
    const isSimplifyFollowUp = /^(?:(?:а )?(?:объясни проще|попроще|простыми словами)|что это)\s*[?!.]*$/.test(q);
    const isPracticeFollowUp = /^(?:а )?(?:задачу|дай задачу|практику|упражнение)\s*[?!.]*$/.test(q);
    if (isWhyFollowUp || isExampleFollowUp || isSimplifyFollowUp || isPracticeFollowUp) {
      if (!previous) {
        return abstain(raw, "Я пока не знаю, к какой теме относится этот вопрос. Сначала назови понятие или теорему, а затем задай уточняющий вопрос.");
      }
      usedContext = true;
      if (isExampleFollowUp) routed = "Приведи пример применения " + previous.label;
      else if (isSimplifyFollowUp) routed = "Объясни проще " + previous.label;
      else if (isPracticeFollowUp) routed = "Дай практику по " + previous.label;
      else routed = "Почему " + previous.label;
    }
    const result = answerStateless(routed);
    if (!result || !result.handled) return result;
    const semantic = root.AKSISemanticReasoning;
    const math = root.AKSIMathPractice;
    let topic = result.concept || null;
    let kind = topic ? "concept" : null;
    if (result.theorem) { topic = result.theorem; kind = "theorem"; }
    if (!topic && math && typeof math.find === "function") {
      const item = math.find(routed);
      if (item) { topic = item.id; kind = "theorem"; }
    }
    if (!topic && semantic && typeof semantic.resolve === "function") {
      const resolved = resolveConcept(routed, semantic);
      if (resolved) { topic = resolved; kind = "concept"; }
    }
    if (topic) {
      const theoremRecord = kind === "theorem" && math && typeof math.list === "function"
        ? math.list().find(item => item.id === topic) : null;
      const label = theoremRecord ? theoremRecord.name : topic;
      contextTurns.push({ topic, kind, label, intent: result.intent || "lookup" });
      if (contextTurns.length > 5) contextTurns = contextTurns.slice(-5);
    }
    if (usedContext) {
      result.contextUsed = true;
      result.proof = (result.proof || []).concat([{
        type: "conversation_context",
        topic: previous.topic,
        source: "previous_grounded_turn",
        contextPolicy: "topic_reference_only"
      }]);
    }
    return result;
  }
  function getContext() {
    return contextTurns.map(item => Object.assign({}, item));
  }
  function clearContext() {
    contextTurns = [];
    return { ok: true };
  }
  function simplify(sentence) {
    return sentence.replace(/^([^—:;]+)[—:;]\\s*/, "").replace(/\bсистематическое исследование\b/gi, "последовательное изучение")
      .replace(/\bвычислительная система\b/gi, "система, которая обрабатывает данные")
      .replace(/\bабстрактный объект\b/gi, "понятие, которое описывают правилами")
      .slice(0, 700);
  }
  function abstain(topic, reason) {
    return { handled: true, status: "insufficient_grounding", intent: "abstain", text: reason + "\n\nТема запроса: «" + clean(topic, 180) + "». Нужны дополнительные факты или уточнение.", proof: [{ type: "abstention", reason: "insufficient_grounding" }] };
  }
  root.AKSIDialogueIntelligence = {
    version: VERSION, answer, getContext, clearContext, tokens, overlap, bayesUpdate, entropy, modusPonens, relationClosure,
    status: () => ({ version: VERSION, mode: "bounded-symbolic-dialogue", generalLanguageModel: false })
  };
  if (typeof module === "object" && module.exports) module.exports = root.AKSIDialogueIntelligence;
})(typeof window !== "undefined" ? window : globalThis);
