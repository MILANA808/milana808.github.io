/*!
 * AKSI Semantic Reasoning Engine v1.0.0
 * Deterministic concept graph, typed relations, definition retrieval and explicit inference.
 * This is a bounded symbolic component, not a general language model.
 */
(function (root) {
  "use strict";
  const VERSION = "1.0.0";
  const concepts = {
    "математика": { aliases: ["математика"], kind: "область знания", definition: "Математика изучает структуры, количества, пространства, изменения и отношения с помощью определений, логики и доказательств.", parents: ["наука"], features: ["формальные модели", "доказательства", "вычисления"] },
    "логика": { aliases: ["логика"], kind: "метод рассуждения", definition: "Логика изучает правила корректного вывода: какие заключения следуют из заданных посылок.", parents: ["метод рассуждения"], features: ["посылки", "правила вывода", "заключения"] },
    "число": { aliases: ["число", "числа"], kind: "математический объект", definition: "Число — абстрактный объект, используемый для счёта, измерения и описания количественных отношений.", parents: ["математический объект"], features: ["количество", "порядок", "операции"] },
    "алгоритм": { aliases: ["алгоритм", "алгоритмы"], kind: "метод", definition: "Алгоритм — конечная, определённая последовательность шагов для решения задачи или вычисления результата.", parents: ["метод"], features: ["шаги", "правила", "результат"] },
    "искусственный интеллект": { aliases: ["ии", "искусственный интеллект", "ai", "нейросеть", "нейронная сеть"], kind: "вычислительная система", definition: "Искусственный интеллект — система, выполняющая задачи вроде распознавания, прогнозирования, планирования или генерации ответов. Само название не гарантирует понимания или истинности ответов.", parents: ["вычислительная система"], features: ["обработка данных", "вывод или прогноз", "оценка результата"] },
    "языковая модель": { aliases: ["языковая модель", "большая языковая модель", "llm"], kind: "вычислительная модель", definition: "Языковая модель вычисляет вероятности языковых последовательностей и использует их для обработки или генерации текста. Без дополнительных механизмов это не гарантирует проверку фактов.", parents: ["вычислительная модель"], features: ["текст", "статистические закономерности", "генерация"] },
    "доказательство": { aliases: ["доказательство", "математическое доказательство"], kind: "обоснование", definition: "Доказательство — последовательность допустимых шагов, показывающая, что утверждение следует из аксиом, определений и ранее установленных результатов.", parents: ["обоснование"], features: ["посылки", "допустимые шаги", "заключение"] },
    "гипотеза": { aliases: ["гипотеза"], kind: "утверждение", definition: "Гипотеза — утверждение, которое рассматривают как возможное объяснение или предположение и которое ещё требует проверки.", parents: ["утверждение"], features: ["предположение", "проверка", "возможное опровержение"] },
    "факт": { aliases: ["факт", "факты"], kind: "утверждение о положении дел", definition: "В этой системе факт — утверждение, принятое как исходное данное или поддержанное указанными свидетельствами. Его статус зависит от качества основания.", parents: ["утверждение"], features: ["основание", "источник", "проверяемость"] },
    "наука": { aliases: ["наука"], kind: "система исследования", definition: "Наука — систематическое исследование мира через наблюдения, модели, проверяемые объяснения и публичную проверку результатов.", parents: ["система исследования"], features: ["наблюдения", "модели", "проверка"] },
    "компьютер": { aliases: ["компьютер"], kind: "вычислительная система", definition: "Компьютер — устройство, которое выполняет операции над данными по заданным программам.", parents: ["вычислительная система"], features: ["данные", "программы", "вычисления"] },
    "геометрия": { aliases: ["геометрия"], kind: "раздел математики", definition: "Геометрия изучает формы, размеры, положения и отношения объектов в пространстве.", parents: ["математика"], features: ["форма", "расстояние", "пространственные отношения"] },
    "вероятность": { aliases: ["вероятность"], kind: "математическая величина", definition: "Вероятность численно описывает степень возможности события в рамках заданной модели, обычно от 0 до 1.", parents: ["математическая величина"], features: ["событие", "модель", "значение от 0 до 1"] }
  };
  const parentDefinitions = {
    "наука": "систематическое исследование с проверяемыми моделями и свидетельствами",
    "метод рассуждения": "способ организовать переход от посылок к заключениям",
    "математический объект": "абстрактный объект, заданный математическими определениями",
    "метод": "описанный способ выполнить задачу",
    "вычислительная система": "система, преобразующая данные по определённым процедурам",
    "вычислительная модель": "формальная модель, выполняющая вычисления над представлениями данных",
    "обоснование": "основание, связывающее утверждение с посылками или свидетельствами",
    "утверждение": "высказывание, которому можно приписывать истинностный статус",
    "система исследования": "организованный процесс получения и проверки знаний",
    "раздел математики": "часть математики, изучающая определённый класс структур или отношений",
    "математическая величина": "величина, определяемая математической моделью"
  };
  const aliasToId = new Map();
  Object.keys(concepts).forEach(id => concepts[id].aliases.forEach(a => aliasToId.set(norm(a), id)));
  Object.keys(parentDefinitions).forEach(id => aliasToId.set(norm(id), id));
  [["наукой","наука"],["науки","наука"],["математикой","математика"],["геометрии","геометрия"],["логики","логика"],["числа","число"],["алгоритма","алгоритм"],["доказательства","доказательство"],["гипотезы","гипотеза"],["факта","факт"],["вероятности","вероятность"],["компьютера","компьютер"],["языковой модели","языковая модель"],["искусственного интеллекта","искусственный интеллект"]].forEach(([a,id]) => aliasToId.set(norm(a), id));
  function norm(value) {
    return String(value == null ? "" : value).toLocaleLowerCase("ru")
      .replace(/[ё]/g, "е").replace(/[—–]/g, "-")
      .replace(/[?!.,:;«»"'()]/g, " ").replace(/\s+/g, " ").trim();
  }
  function resolve(value) {
    const n = norm(value);
    if (concepts[n]) return n;
    if (aliasToId.has(n)) return aliasToId.get(n);
    // Exact concept phrase within a longer noun phrase is accepted only when it is unique.
    const hits = Object.keys(concepts).filter(id => n === id || n.endsWith(" " + id));
    return hits.length === 1 ? hits[0] : null;
  }
  function ancestors(id, seen) {
    seen = seen || new Set();
    if (!id || seen.has(id)) return seen;
    seen.add(id);
    (concepts[id] && concepts[id].parents || []).forEach(p => {
      const parent = concepts[p] ? p : null;
      if (parent) ancestors(parent, seen);
      else seen.add(p);
    });
    return seen;
  }
  function conceptInfo(id) {
    const c = concepts[id];
    if (!c) return null;
    return { id, kind: c.kind, definition: c.definition, parents: c.parents.slice(), features: c.features.slice() };
  }
  function answer(input) {
    const raw = String(input == null ? "" : input).trim();
    if (!raw) return null;
    let m = raw.match(/^\s*(?:что такое|дай определение|определи)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const id = resolve(m[1]);
      if (!id) return { handled: true, status: "unknown_concept", text: "Я пока не знаю достаточно об этом понятии, чтобы дать обоснованное определение: «" + m[1].trim() + "». Добавь определение или связанные факты в базу знаний — я не буду заменять пробел догадкой.", proof: [], concept: null };
      const c = concepts[id];
      return { handled: true, status: "defined", text: c.definition + "\n\nТип: " + c.kind + ".\nСвязи: " + c.parents.join(", ") + ".\nПризнаки: " + c.features.join("; ") + ".", proof: [{ type: "definition_lookup", concept: id, source: "AKSI built-in concept graph v1.0.0" }], concept: conceptInfo(id) };
    }
    m = raw.match(/^\s*(?:чем отличается|в чем разница между|сравни)\s+(.+?)\s+и\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const a = resolve(m[1]), b = resolve(m[2]);
      if (!a || !b) return { handled: true, status: "unknown_concept", text: "Для сравнения нужны определения обоих понятий. Сейчас я не могу надёжно разобрать: «" + (!a ? m[1].trim() : m[2].trim()) + "».", proof: [] };
      const ca = concepts[a], cb = concepts[b];
      const shared = ca.features.filter(x => cb.features.includes(x));
      const onlyA = ca.features.filter(x => !cb.features.includes(x));
      const onlyB = cb.features.filter(x => !ca.features.includes(x));
      return { handled: true, status: "compared", text: "«" + a + "»: " + ca.definition + "\n\n«" + b + "»: " + cb.definition + "\n\nОбщие признаки: " + (shared.join(", ") || "в этой базе не установлены") + ".\nПризнаки только первого в базе: " + (onlyA.join(", ") || "не установлены") + ".\nПризнаки только второго в базе: " + (onlyB.join(", ") || "не установлены") + ".", proof: [{ type: "feature_comparison", concepts: [a,b], shared, onlyA, onlyB }], concepts: [conceptInfo(a), conceptInfo(b)] };
    }
    m = raw.match(/^\s*(?:является ли|это ли|относится ли)\s+(.+?)\s+(?:видом|типом|разновидностью|частью|разделом|примером)\s+(?:понятия\s+)?(.+?)\s*[?!.]*\s*$/i);
    if (!m) m = raw.match(/^\s*(?:является ли|верно ли что)\s+(.+?)\s+(?:это|есть|является)\s+(.+?)\s*[?!.]*\s*$/i);
    if (m) {
      const child = resolve(m[1]), parent = resolve(m[2]);
      if (!child || !parent) return { handled: true, status: "unknown_relation", text: "Я не могу подтвердить или опровергнуть эту связь по текущей базе. Неизвестная связь не равна ложной.", proof: [] };
      const c = concepts[child];
      const known = ancestors(child).has(parent) || (c.parents || []).includes(parent);
      return { handled: true, status: known ? "entailed" : "not_established", text: known ? "Да, по графу понятий «" + child + "» относится к «" + parent + "». Цепочка оснований: " + Array.from(ancestors(child)).join(" → ") + "." : "В текущем графе нет пути, подтверждающего, что «" + child + "» относится к «" + parent + "». Это означает «не установлено», а не автоматически «ложно».", proof: [{ type: known ? "graph_path" : "no_graph_path", subject: child, object: parent, path: Array.from(ancestors(child)) }] };
    }
    return null;
  }
  root.AKSISemanticReasoning = { version: VERSION, answer, resolve, conceptInfo, concepts: Object.keys(concepts) };
  if (typeof module === "object" && module.exports) module.exports = root.AKSISemanticReasoning;
})(typeof window !== "undefined" ? window : globalThis);
