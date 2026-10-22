/*!
 * AKSI Symbolic Inference v1.0.0
 * Small forward-chaining reasoner with explicitly declared concept aliases.
 * It is not a general natural-language reasoner or a truth oracle.
 */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";
  const clean = value => String(value == null ? "" : value)
    .toLocaleLowerCase()
    .replace(/[.!?؟]+$/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  function parse(input) {
    const raw = String(input == null ? "" : input).trim();
    const match = raw.match(/^\s*(?:логика|выведи)\s*[:：]\s*([\s\S]+)$/i);
    if (!match) return { ok: false, error: "Используй формат «логика: если ..., то ...; ...; следует ли ...?»." };
    const clauses = match[1].split(/[;\n]+/).map(x => x.trim()).filter(Boolean);
    const rules = [];
    const facts = [];
    let query = "";
    for (const clause of clauses) {
      const q = clause.match(/^(?:следует ли|выведи ли|докажи)\s+(.+)$/i);
      if (q) {
        if (query) return { ok: false, error: "В одном запросе поддерживается только один вопрос." };
        query = clean(q[1]);
        continue;
      }
      const rule = clause.match(/^если\s+(.+?),\s*то\s+(.+)$/i);
      if (rule) {
        const antecedent = clean(rule[1]);
        const consequent = clean(rule[2]);
        if (!antecedent || !consequent) return { ok: false, error: "Правило содержит пустое условие или заключение." };
        rules.push({ antecedent, consequent, text: "если " + antecedent + ", то " + consequent });
      } else {
        const fact = clean(clause.replace(/^факт\s*[:：]?\s*/i, ""));
        if (fact) facts.push(fact);
      }
    }
    if (!query) return { ok: false, error: "Добавь вопрос в конце: «следует ли ...?»." };
    if (!facts.length && !rules.length) return { ok: false, error: "Не найдены факты или правила для вывода." };
    return { ok: true, rules, facts: Array.from(new Set(facts)), query };
  }

  function infer(input) {
    const parsed = parse(input);
    if (!parsed.ok) return { ok: false, version: VERSION, status: "invalid_input", text: parsed.error };
    const known = new Set(parsed.facts);
    const proof = new Map(parsed.facts.map(f => [f, [{ type: "fact", statement: f }]]));
    const maxRounds = parsed.rules.length + 1;
    let changed = true;
    let rounds = 0;
    while (changed && rounds < maxRounds) {
      changed = false;
      rounds++;
      for (const rule of parsed.rules) {
        if (known.has(rule.antecedent) && !known.has(rule.consequent)) {
          known.add(rule.consequent);
          proof.set(rule.consequent, (proof.get(rule.antecedent) || []).concat([{
            type: "rule", statement: rule.text, from: rule.antecedent, to: rule.consequent
          }]));
          changed = true;
        }
      }
    }
    if (known.has(parsed.query)) {
      const steps = proof.get(parsed.query) || [];
      return {
        ok: true, version: VERSION, status: "proven", query: parsed.query,
        facts: parsed.facts, rules: parsed.rules, rounds,
        proof: steps,
        text: "Вывод получен из предоставленных фактов и правил: «" + parsed.query + "»."
      };
    }
    return {
      ok: true, version: VERSION, status: "not_derived", query: parsed.query,
      facts: parsed.facts, rules: parsed.rules, rounds, proof: [],
      text: "Не удалось вывести «" + parsed.query + "» из предоставленных фактов и правил. Это не доказывает, что утверждение ложно."
    };
  }

  root.AKSISymbolicInference = { version: VERSION, parse, infer };
  if (typeof module === "object" && module.exports) module.exports = root.AKSISymbolicInference;
})(typeof window !== "undefined" ? window : globalThis);
