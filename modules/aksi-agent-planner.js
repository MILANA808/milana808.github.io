/* AKSI deterministic goal planner v0.2.0.
 * Routes only intents with explicit, testable local capabilities. Unknown goals
 * fall back to the answer router; this planner does not invent multi-step plans.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIAgentPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "0.2.0";
  function plan(goal, options) {
    const prompt = String(goal == null ? "" : goal).trim();
    if (!prompt) throw new TypeError("Goal must be a non-empty string");
    if (prompt.length > 4000) throw new TypeError("Goal must not exceed 4000 characters");
    const q = prompt.replace(/^\s*(?:акси\s*[,!:]?\s*|команда\s*[-—:]\s*)/i, "").trim();
    const normalized = q.toLocaleLowerCase("ru").replace(/ё/g, "е");
    if (/^(?:кто ты|что ты умеешь|расскажи о себе|опиши себя|самодиагностика|проведи самодиагностику|состояние системы|какие модули|какие возможности у тебя)/i.test(normalized)) return {
      planner: VERSION, intent: "self-inspection",
      steps: [{ id: "inspect-self", action: "self.inspect", input: { prompt: q } }]
    };
    const expression = options && typeof options.mathExpression === "function"
      ? options.mathExpression(q) : null;
    if (expression) return {
      planner: VERSION, intent: "calculation",
      steps: [{ id: "calculate", action: "math.calculate", input: { expression } }]
    };
    if (/^(?:запомни факт|добавь факт|добавь связь)\s*[:：]/i.test(q)) return {
      planner: VERSION, intent: "knowledge-write",
      steps: [{ id: "save-knowledge", action: "knowledge.write", input: { prompt: q } }]
    };
    if (/^(?:является ли|относится ли|что у|что имеет|какие свойства у|из чего состоит|что входит в|что вызывает|какова причина|что связано с|связи для|что противоречит|что ты знаешь о|покажи факты о|факты о|что известно о)/i.test(normalized)) return {
      planner: VERSION, intent: "knowledge-query",
      steps: [{ id: "query-knowledge", action: "knowledge.read", input: { prompt: q, options: options || {} } }]
    };
    if (/^(?:что такое|что означает|объясни|расскажи|опиши|дай определение|определи|чем отличается|чем различаются|в чем разница между|сравни|является ли|верно ли что)/i.test(normalized)) return {
      planner: VERSION, intent: "semantic-query",
      steps: [{ id: "query-semantics", action: "semantic.query", input: { prompt: q, options: options || {} } }]
    };
    return {
      planner: VERSION, intent: "general",
      steps: [{ id: "route-answer", action: "answer.respond", input: { prompt, options: options || {} } }]
    };
  }
  return Object.freeze({ version: VERSION, plan });
});
