/*!
 * AKSI Symbolic Inference v1.0.0
 * Small forward-chaining reasoner with explicit aliases, relations, and single-premise variables.
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
    const aliases = [];
    const relations = [];
    let query = "";
    for (const clause of clauses) {
      const relation = clause.match(/^отношение\s*[:：]\s*(.+?)\s*--([\p{L}\p{N}_-]+)-->\s*(.+)$/iu);
      if (relation) {
        const subject = clean(relation[1]);
        const predicate = clean(relation[2]);
        const object = clean(relation[3]);
        if (!subject || !predicate || !object) return { ok: false, error: "Отношение должно содержать субъект, тип и объект." };
        relations.push({ subject, predicate, object, statement: subject + " " + predicate + " " + object });
        facts.push(subject + " " + predicate + " " + object);
        continue;
      }
      const alias = clause.match(/^(?:синоним|понятие)\s*[:：]\s*(.+?)\s*(?:=|—|->)\s*(.+)$/i);
      if (alias) { aliases.push({ alias: clean(alias[1]), canonical: clean(alias[2]) }); continue; }
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
    // Semantic equivalence is never guessed: users must declare aliases explicitly.
    const aliasMap = new Map(aliases.filter(a => a.alias && a.canonical).map(a => [a.alias, a.canonical]));
    function canonical(value) {
      // Alias replacement is token-level, explicit, and deterministic.
      return clean(value).split(" ").map(token => {
        let current = token;
        const visited = new Set();
        while (aliasMap.has(current) && !visited.has(current)) { visited.add(current); current = aliasMap.get(current); }
        return current;
      }).join(" ");
    }
    const normalizedRules = rules.map(rule => ({ antecedent: canonical(rule.antecedent), consequent: canonical(rule.consequent), text: "если " + canonical(rule.antecedent) + ", то " + canonical(rule.consequent) }));
    const normalizedFacts = Array.from(new Set(facts.map(canonical)));
    query = canonical(query);
    return { ok: true, rules: normalizedRules, facts: normalizedFacts, aliases, relations, query };
  }

  function infer(input) {
    const parsed = parse(input);
    if (!parsed.ok) return { ok: false, version: VERSION, status: "invalid_input", text: parsed.error };
    const known = new Set(parsed.facts);
    const proof = new Map(parsed.facts.map(f => [f, [{ type: "fact", statement: f }]]));
    const maxRounds = parsed.rules.length + 1;
    let changed = true;
    let rounds = 0;
    function escapeRegex(value) {
      return Array.from(value).map(ch => "\\.^$|?*+()[]{}".includes(ch) ? "\\" + ch : ch).join("");
    }
    function matchPattern(pattern, statement) {
      const names = [];
      let source = "";
      let cursor = 0;
      const token = new RegExp("\\{([a-z][a-z0-9_]*)\\}", "gi");
      let match;
      while ((match = token.exec(pattern))) {
        source += escapeRegex(pattern.slice(cursor, match.index));
        const name = match[1].toLowerCase();
        if (names.includes(name)) source += "\\k<" + name + ">";
        else { names.push(name); source += "(?<" + name + ">.+?)"; }
        cursor = match.index + match[0].length;
      }
      source += escapeRegex(pattern.slice(cursor));
      if (!names.length) return statement === pattern ? {} : null;
      const found = statement.match(new RegExp("^" + source + "$", "u"));
      if (!found) return null;
      const bindings = {};
      for (const name of names) bindings[name] = found.groups[name];
      return bindings;
    }
    function instantiate(pattern, bindings) {
      return pattern.replace(new RegExp("\\{([a-z][a-z0-9_]*)\\}", "gi"), (_, name) => bindings[name.toLowerCase()] || "");
    }
    while (changed && rounds < maxRounds) {
      changed = false;
      rounds++;
      for (const rule of parsed.rules) {
        const candidates = Array.from(known);
        for (const statement of candidates) {
          const bindings = matchPattern(rule.antecedent, statement);
          if (bindings === null) continue;
          const conclusion = instantiate(rule.consequent, bindings);
          if (!conclusion || known.has(conclusion)) continue;
          known.add(conclusion);
          proof.set(conclusion, (proof.get(statement) || [{ type: "fact", statement }]).concat([{
            type: "rule", statement: rule.text, from: statement, to: conclusion, bindings
          }]));
          changed = true;
        }
      }
    }
    // Detect only explicit lexical negation pairs; do not infer contradiction from topic similarity.
    const contradictions = [];
    for (const statement of known) {
      const opposite = statement.startsWith("не ") ? statement.slice(3) : "не " + statement;
      if (known.has(opposite) && statement < opposite) {
        const positive = statement.startsWith("не ") ? opposite : statement;
        const negative = statement.startsWith("не ") ? statement : opposite;
        contradictions.push({ positive, negative, positiveProof: proof.get(positive) || [], negativeProof: proof.get(negative) || [] });
      }
    }
    const common = {
      version: VERSION, query: parsed.query, facts: parsed.facts, rules: parsed.rules,
      aliases: parsed.aliases || [], relations: parsed.relations || [], rounds, contradictions
    };
    if (known.has(parsed.query)) {
      const steps = proof.get(parsed.query) || [];
      return {
        ok: true, ...common, status: contradictions.length ? "proven_with_contradictions" : "proven",
        proof: steps,
        text: contradictions.length
          ? "Вывод «" + parsed.query + "» получен, но система обнаружила явные противоречия во входных данных. Проверь список противоречий перед использованием результата."
          : "Вывод получен из предоставленных фактов и правил: «" + parsed.query + "»."
      };
    }
    return {
      ok: true, ...common, status: contradictions.length ? "contradiction_detected" : "not_derived", proof: [],
      text: contradictions.length
        ? "Обнаружены явно противоречащие утверждения. Запрошенный вывод отдельно не получен."
        : "Не удалось вывести «" + parsed.query + "» из предоставленных фактов и правил. Это не доказывает, что утверждение ложно."
    };
  }

  root.AKSISymbolicInference = { version: VERSION, parse, infer };
  if (typeof module === "object" && module.exports) module.exports = root.AKSISymbolicInference;
})(typeof window !== "undefined" ? window : globalThis);
