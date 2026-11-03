/* AKSI Native Language Core v0.1.0
 * Deterministic, evidence-bounded Russian answer composition.
 * It does not imitate a general LLM: every substantive claim is grounded in the built-in concept graph.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const STOP = new Set(["что","такое","это","объясни","объяснить","мне","пожалуйста","расскажи","рассказать","про","о","об","как","работает","работают","устроен","устроена","устроено","для","чего","нужен","нужна","нужно","зачем","понятие","опиши","определение","дай","смысл","значит","означает","почему","какова","каков","какие","какой","какая","какое","функции","роль","у","этого","этой","этот","ли","в","на","и","или"]);
  const norm = value => String(value || "").toLocaleLowerCase("ru").replace(/ё/g,"е").replace(/[?!.,:;«»"'()]/g," ").replace(/\s+/g," ").trim();
  function pickConcept(query, semantic) {
    if (!semantic || typeof semantic.resolve !== "function" || !Array.isArray(semantic.concepts)) return null;
    const q = norm(query);
    const candidates = semantic.concepts.slice().sort((a,b)=>b.length-a.length);
    for (const id of candidates) {
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      if (new RegExp("(^| )"+escaped+"($| )","i").test(q)) {
        const info = semantic.conceptInfo(id);
        if (info) return info;
      }
    }
    const tokens = q.split(" ").filter(t=>t && !STOP.has(t) && t.length>2);
    for (const token of tokens) {
      const id = semantic.resolve(token);
      if (id) {
        const info = semantic.conceptInfo(id);
        if (info) return info;
      }
    }
    return null;
  }
  function classify(query) {
    const q = norm(query);
    if (/^(?:что такое|что означает|объясни|расскажи|опиши|дай определение|в чем смысл)/.test(q)) return "explain";
    if (/^(?:как работает|как устроен|как устроена|как устроено|принцип работы)/.test(q)) return "operation";
    if (/^(?:для чего|зачем нужен|зачем нужна|зачем нужно|какова роль|какие функции)/.test(q)) return "purpose";
    if (/^(?:почему|из за чего|по какой причине)/.test(q)) return "cause";
    return null;
  }
  function answer(query) {
    const intent = classify(query);
    if (!intent) return null;
    const semantic = root.AKSISemanticReasoning;
    const concept = pickConcept(query, semantic);
    if (!concept) return {
      handled: true, status: "unknown_concept", route: "native-language-core",
      text: "Я поняла тип вопроса, но пока не могу надёжно определить, о каком понятии идёт речь. Назови предмет точнее или добавь его описание в локальную базу знаний.",
      proof: [{type:"intent_parse",intent,conceptResolved:false}]
    };
    const base = "«" + concept.id + "» — " + concept.definition;
    let text;
    if (intent === "explain") {
      text = base + "\n\nВ моей локальной модели это относится к категории «" + concept.kind + "».";
    } else if (intent === "operation") {
      text = base + "\n\nЧто именно известно из локальной модели: " +
        (concept.features.length ? concept.features.join(", ") + "." : "подробный механизм пока не описан.") +
        "\n\nВажно: у меня нет достаточного описания внутренних этапов работы этого объекта, поэтому я не буду придумывать пошаговый механизм.";
    } else if (intent === "purpose") {
      text = base + "\n\nВ рамках этого определения его назначение связано со следующим: " +
        (concept.features.length ? concept.features.join(", ") + "." : "назначение в текущей базе отдельно не описано.") +
        "\nЭто вывод из формулировки определения, а не независимая проверка всех возможных применений.";
    } else {
      text = "В текущей базе нет причинной цепочки, которая объясняет, почему происходит то, о чём ты спрашиваешь, применительно к «" + concept.id + "».\n\nЯ могу дать определение: " + concept.definition + "\nНо для ответа о причине нужны конкретное явление и подтверждённые причинные связи.";
    }
    return {
      handled: true, status: "grounded_composition", route: "native-language-core",
      text,
      concept,
      proof: [{type:"grounded_language_composition",intent,concept:concept.id,source:"AKSISemanticReasoning v"+semantic.version,claims:["definition","kind"].concat(intent==="operation"||intent==="purpose"?["features"]:[])}]
    };
  }
  root.AKSINativeLanguageCore = {version:VERSION,answer,classify};
  if (typeof module === "object" && module.exports) module.exports = root.AKSINativeLanguageCore;
})(typeof window !== "undefined" ? window : globalThis);
