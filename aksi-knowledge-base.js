/* AKSI Local Knowledge Base v1: user-supplied facts + bounded, inspectable graph inference. */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";
  const STORAGE_KEY = "aksi_knowledge_base_v1";
  const MAX_FACTS = 500;
  const ALLOWED = new Set(["is-a", "not-is-a", "has", "part-of", "related-to", "causes", "supports", "contradicts"]);
  const clean = v => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, 240);
  function term(v) {
    let s = clean(v).toLocaleLowerCase("ru").replace(/[ё]/g, "е").replace(/^[«"'(]+|[»"')?.!,;:]+$/g, "").trim();
    const aliases = {
      "животным":"животное", "животном":"животное", "животного":"животное", "животные":"животное", "животных":"животное", "живым существом":"живое существо", "живого существа":"живое существо",
      "человеком":"человек", "человека":"человек", "человеку":"человек",
      "наукой":"наука", "науки":"наука", "науке":"наука",
      "кошкой":"кошка", "кошке":"кошка", "кошку":"кошка", "кошки":"кошка",
      "собакой":"собака", "собаке":"собака", "собаку":"собака",
      "системой":"система", "системе":"система",
      "хвостом":"хвост", "хвоста":"хвост", "хвосте":"хвост"
    };
    return aliases[s] || s;
  }
  function load() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!data || data.schema !== "AKSI-KB/1" || !Array.isArray(data.facts)) return [];
      return data.facts.filter(f => f && clean(f.subject) && ALLOWED.has(f.predicate) && clean(f.object)).slice(-MAX_FACTS);
    } catch (_) { return []; }
  }
  let facts = load();
  function save() {
    try {
      if (!root.localStorage) return false;
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: "AKSI-KB/1", version: VERSION, facts }));
      return true;
    } catch (_) { return false; }
  }
  function parseFact(input) {
    const raw = clean(input);
    const command = raw.match(/^\s*(?:запомни факт|добавь факт|добавь связь)\s*[:：]\s*(.+)$/i);
    if (!command) return null;
    const body = command[1].trim();
    let m = body.match(/^(.+?)\s*--([a-z-]+)-->\s*(.+)$/i);
    if (m) {
      const predicate = m[2].toLowerCase();
      if (!ALLOWED.has(predicate)) return { error: "Неизвестный тип связи «" + predicate + "». Разрешены: " + Array.from(ALLOWED).join(", ") + "." };
      return makeFact(m[1], predicate, m[3]);
    }
    m = body.match(/^(.+?)\s+(?:—|–|-)\s+это\s+(.+)$/i) || body.match(/^(.+?)\s+это\s+(.+)$/i);
    if (m) return makeFact(m[1], "is-a", m[2]);
    m = body.match(/^(.+?)\s+(?:имеет|содержит)\s+(.+)$/i);
    if (m) return makeFact(m[1], "has", m[2]);
    m = body.match(/^(.+?)\s+(?:является причиной|вызывает)\s+(.+)$/i);
    if (m) return makeFact(m[1], "causes", m[2]);
    return { error: "Не смогла однозначно разобрать факт. Пример: «запомни факт: кошка --is-a--> животное» или «запомни факт: кошка — это животное»." };
  }
  function makeFact(subject, predicate, object) {
    subject = term(subject); object = term(object);
    if (!subject || !object) return { error: "У связи должны быть и субъект, и объект." };
    if (subject === object && predicate === "is-a") return { error: "Связь понятия с самим собой не добавлена." };
    return { subject, predicate, object, source: "user_asserted" };
  }
  function add(input) {
    const parsed = parseFact(input);
    if (!parsed) return null;
    if (parsed.error) return { handled: true, status: "invalid_fact", text: parsed.error, proof: [] };
    const exists = facts.some(f => f.subject === parsed.subject && f.predicate === parsed.predicate && f.object === parsed.object);
    if (exists) return { handled: true, status: "already_known", text: "Такая связь уже есть в локальной базе: «" + parsed.subject + " --" + parsed.predicate + "--> " + parsed.object + "». Источник: пользовательское утверждение, независимая проверка не выполнялась.", fact: parsed, proof: [{ type: "duplicate_fact", fact: parsed }] };
    if (facts.length >= MAX_FACTS) facts = facts.slice(-MAX_FACTS + 1);
    const stored = Object.assign({}, parsed, { createdAt: new Date().toISOString() });
    facts.push(stored);
    const persisted = save();
    return {
      handled: true, status: persisted ? "fact_added" : "fact_session_only",
      text: (persisted ? "Добавила связь в локальную базу этого браузера: " : "Добавила связь только в текущую сессию; постоянное сохранение не подтверждено: ") +
        "«" + stored.subject + " --" + stored.predicate + "--> " + stored.object + "».\nЭто утверждение пользователя, а не независимо проверенный факт.",
      fact: stored, proof: [{ type: "user_asserted_fact", fact: stored, persisted }]
    };
  }
  function pathBetween(start, target) {
    const queue = [{ node: start, path: [] }];
    const visited = new Set([start]);
    while (queue.length && visited.size <= MAX_FACTS) {
      const current = queue.shift();
      if (current.node === target) return current.path;
      for (const fact of facts) {
        if (fact.predicate !== "is-a" || term(fact.subject) !== current.node) continue;
        const next = term(fact.object);
        if (visited.has(next)) continue;
        const edge = { type: "user_asserted_edge", subject: fact.subject, predicate: fact.predicate, object: fact.object, source: fact.source || "user_asserted", createdAt: fact.createdAt || null };
        if (next === target) return current.path.concat(edge);
        visited.add(next);
        queue.push({ node: next, path: current.path.concat(edge) });
      }
    }
    return null;
  }
  function knownSubjects() {
    const set = new Set();
    facts.forEach(f => { set.add(term(f.subject)); });
    return Array.from(set).sort((a, b) => b.length - a.length);
  }
  function splitRelation(body) {
    const normalizedBody = clean(body).replace(/[?!.]+$/g, "").trim();
    const subjects = knownSubjects();
    for (const subject of subjects) {
      if (normalizedBody.toLocaleLowerCase("ru").startsWith(subject + " ")) {
        return { subject, object: term(normalizedBody.slice(subject.length).trim()) };
      }
    }
    const at = normalizedBody.lastIndexOf(" ");
    if (at <= 0) return null;
    return { subject: term(normalizedBody.slice(0, at)), object: term(normalizedBody.slice(at + 1)) };
  }
  function factQueryResult(subject, found, mode, label) {
    if (!found.length) return {
      handled: true, status: "no_facts",
      text: "В локальной базе нет записей, позволяющих ответить про «" + subject + "» (" + label + "). Это не означает, что таких связей нет в реальности.",
      proof: [{ type: "no_user_facts", subject, mode, factsChecked: facts.length }]
    };
    return {
      handled: true, status: "facts_listed",
      text: "По сохранённым пользовательским утверждениям, " + label + " для «" + subject + "»:\n" +
        found.map(f => "• " + f.subject + " --" + f.predicate + "--> " + f.object).join("\n") +
        "\nЭто записи локальной базы, а не независимая проверка фактов.",
      facts: found.map(f => Object.assign({}, f)),
      proof: found.map(f => ({ type: "user_asserted_fact", mode, fact: Object.assign({}, f) }))
    };
  }
  function answer(input) {
    const raw = clean(input);
    if (!raw) return null;
    const addResult = add(raw);
    if (addResult) return addResult;
    let m = raw.match(/^\s*(?:является ли|относится ли)\s+(.+?)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const pair = splitRelation(m[1] + " " + m[2]);
      if (!pair || !pair.subject || !pair.object) return null;
      const directNegative = facts.find(f => term(f.subject) === pair.subject && f.predicate === "not-is-a" && term(f.object) === pair.object);
      const directPositive = facts.find(f => term(f.subject) === pair.subject && f.predicate === "is-a" && term(f.object) === pair.object);
      const path = pathBetween(pair.subject, pair.object);
      if (directNegative && (directPositive || path)) return {
        handled: true, status: "contradiction",
        text: "В локальной базе противоречие: есть и положительная, и отрицательная связь между «" + pair.subject + "» и «" + pair.object + "». Обе записи пользовательские; нужно проверить исходные утверждения.",
        proof: [{ type: "contradiction", positive: directPositive || path, negative: directNegative }]
      };
      if (directNegative) return {
        handled: true, status: "explicitly_denied",
        text: "В локальной базе записано отрицание связи «" + pair.subject + "» → «" + pair.object + "». Это пользовательская запись, а не доказательство того, что связь объективно ложна.",
        proof: [{ type: "user_asserted_negative", fact: directNegative }]
      };
      if (path) return {
        handled: true, status: "entailed_by_user_facts",
        text: "По локальной базе связь подтверждается цепочкой пользовательских утверждений: " + [pair.subject].concat(path.map(e => e.object)).join(" → ") + ".\nЭто вывод из записей базы, а не независимая проверка истинности исходных фактов.",
        proof: [{ type: "bounded_graph_path", subject: pair.subject, object: pair.object, edges: path }]
      };
      const known = facts.some(f => term(f.subject) === pair.subject || term(f.object) === pair.object);
      if (known) return {
        handled: true, status: "not_established",
        text: "В локальной базе нет цепочки, подтверждающей связь «" + pair.subject + "» → «" + pair.object + "». Это означает «не установлено по сохранённым записям», а не «ложно».",
        proof: [{ type: "no_path_found", subject: pair.subject, object: pair.object, factsChecked: facts.length }]
      };
      return null;
    }
    m = raw.match(/^\s*(?:что у|что имеет|какие свойства у)\s+(.+?)(?:\s+есть)?\s*[?!.]*\s*$/i);
    if (m) {
      const subject = term(m[1]);
      const found = facts.filter(f => term(f.subject) === subject && ["has", "supports", "related-to"].includes(f.predicate));
      return factQueryResult(subject, found, "outgoing", "свойства или исходящие связи");
    }
    m = raw.match(/^\s*(?:из чего состоит|что входит в)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const whole = term(m[1]);
      const found = facts.filter(f =>
        (term(f.subject) === whole && f.predicate === "has") ||
        (term(f.object) === whole && f.predicate === "part-of")
      );
      return factQueryResult(whole, found, "parts", "состав или части");
    }
    m = raw.match(/^\s*(?:что вызывает|какова причина)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const effect = term(m[1]);
      const found = facts.filter(f => f.predicate === "causes" && term(f.object) === effect);
      return factQueryResult(effect, found, "incoming-causes", "причины");
    }
    m = raw.match(/^\s*(?:что связано с|связи для|связи о)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const subject = term(m[1]);
      const found = facts.filter(f => term(f.subject) === subject || term(f.object) === subject);
      return factQueryResult(subject, found, "incident", "связи");
    }
    m = raw.match(/^\s*(?:что противоречит|какие утверждения противоречат)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const subject = term(m[1]);
      const found = facts.filter(f => f.predicate === "contradicts" && (term(f.subject) === subject || term(f.object) === subject));
      return factQueryResult(subject, found, "contradictions", "противоречащие записи");
    }
    m = raw.match(/^\s*(?:что ты знаешь о|покажи факты о|факты о|что известно о)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const subject = term(m[1]);
      const found = facts.filter(f => term(f.subject) === subject || term(f.object) === subject);
      if (!found.length) return { handled: true, status: "no_facts", text: "В локальной базе пока нет записей о «" + subject + "». Можешь добавить проверяемую связь, например: «запомни факт: " + subject + " --is-a--> понятие».", proof: [] };
      return {
        handled: true, status: "facts_listed",
        text: "Записи, связанные с «" + subject + "», в локальной базе (источник — пользовательские утверждения):\n" +
          found.map(f => "• " + f.subject + " --" + f.predicate + "--> " + f.object).join("\n"),
        facts: found, proof: found.map(f => ({ type: "user_asserted_fact", fact: f }))
      };
    }
    return null;
  }
  function listFacts() { return facts.map(f => Object.assign({}, f)); }
  function clear() { facts = []; return save(); }
  root.AKSIKnowledgeBase = { version: VERSION, answer, add, parseFact, listFacts, clear, pathBetween, normalizeTerm: term };
  if (typeof module === "object" && module.exports) module.exports = root.AKSIKnowledgeBase;
})(typeof window !== "undefined" ? window : globalThis);
