/*!
 * AKSI Mathematical Practice Library v1.0.0
 * Curated theorem cards with explicit assumptions, proof sketches and worked examples.
 * Educational reference material; not a theorem prover.
 */
(function (root) {
  "use strict";
  const entries = [
    {
      id: "pythagoras",
      name: "теорема пифагора",
      aliases: ["пифагор", "пифагора", "теорема пифагора"],
      field: "евклидова геометрия",
      statement: "В прямоугольном треугольнике квадрат длины гипотенузы равен сумме квадратов длин катетов: c² = a² + b².",
      assumptions: ["Треугольник евклидов", "Один угол равен 90°", "a и b — катеты, c — гипотенуза"],
      proof: "Опустим высоту из прямого угла на гипотенузу. Два получившихся треугольника подобны исходному. Из отношений подобия следуют равенства a² = c·p и b² = c·q, где p и q — отрезки гипотенузы. Складывая, получаем a² + b² = c(p+q) = c².",
      example: "Если катеты равны 3 и 4, то c² = 3² + 4² = 9 + 16 = 25, поэтому c = 5.",
      exercise: "Катеты прямоугольного треугольника равны 5 и 12. Найди гипотенузу.",
      answer: "13, потому что √(5² + 12²) = √169 = 13.",
      tags: ["треугольник", "геометрия", "длина", "катеты", "гипотенуза"]
    },
    {
      id: "bayes",
      name: "формула байеса",
      aliases: ["байес", "байеса", "теорема байеса", "формула байеса"],
      field: "теория вероятностей",
      statement: "Для события A и наблюдения B при P(B)>0: P(A|B) = P(B|A)·P(A) / P(B). В бинарной модели P(B) = P(B|A)P(A) + P(B|¬A)P(¬A).",
      assumptions: ["События и условные вероятности определены в одной вероятностной модели", "P(B) > 0", "Условные вероятности и базовая частота заданы корректно"],
      proof: "По определению условной вероятности P(A∩B)=P(A|B)P(B)=P(B|A)P(A). Приравниваем выражения и делим на P(B).",
      example: "Пусть распространённость состояния 1%, чувствительность теста 90%, ложноположительная доля 5%. Тогда P(A|+) = 0,9·0,01 / (0,9·0,01 + 0,05·0,99) ≈ 15,4%. Положительный тест сам по себе не означает 90%-ную вероятность состояния.",
      exercise: "Событие встречается у 10% объектов. Тест положителен у 80% объектов с событием и у 20% без него. Какова вероятность события при положительном тесте?",
      answer: "≈ 30,8%: 0,8·0,1 / (0,8·0,1 + 0,2·0,9) = 0,08/0,26.",
      tags: ["вероятность", "условная вероятность", "тест", "данные", "априорная вероятность"]
    },
    {
      id: "modus-ponens",
      name: "правило modus ponens",
      aliases: ["modus ponens", "модус поненс", "утверждение основания"],
      field: "формальная логика",
      statement: "Если истинно «если P, то Q» и истинно P, то можно заключить Q: (P → Q), P ⊢ Q.",
      assumptions: ["Импликация P → Q принята как посылка", "P установлено как посылка", "Используется классическая логика высказываний"],
      proof: "По таблице истинности импликация P → Q ложна только в случае P=истина и Q=ложь. При истинных P и P → Q вариант Q=ложь исключён; значит, Q истинно.",
      example: "Если число делится на 4, то оно чётное. Число 12 делится на 4. Следовательно, 12 чётное.",
      exercise: "Дано: если фигура — квадрат, то у неё четыре стороны равны. Фигура — квадрат. Что следует?",
      answer: "У фигуры четыре стороны равны.",
      tags: ["логика", "вывод", "посылка", "импликация", "доказательство"]
    },
    {
      id: "entropy",
      name: "формула энтропии шеннона",
      aliases: ["энтропия", "энтропии", "энтропия шеннона", "формула шеннона"],
      field: "теория информации",
      statement: "Для дискретного распределения вероятностей p₁,…,pₙ энтропия H = −Σ pᵢ log₂ pᵢ. При pᵢ=0 соответствующее слагаемое принимают равным 0.",
      assumptions: ["pᵢ ≥ 0", "Сумма вероятностей равна 1", "Логарифм по основанию 2 даёт единицы бит"],
      proof: "Энтропия определяется как математическое ожидание −log₂ p(X): H=E[−log₂p(X)]=−Σpᵢlog₂pᵢ.",
      example: "Для двух равновероятных исходов H=−2·0,5·log₂0,5=1 бит. Если один исход имеет вероятность 1, энтропия равна 0 бит.",
      exercise: "Найди энтропию распределения [0,5; 0,25; 0,25] в битах.",
      answer: "1,5 бита: −0,5·log₂0,5 − 2·0,25·log₂0,25 = 0,5 + 0,5 + 0,5.",
      tags: ["информация", "неопределенность", "вероятность", "бит", "распределение"]
    }
  ];
  function norm(value) {
    return String(value == null ? "" : value).toLocaleLowerCase("ru-RU")
      .replace(/[ё]/g, "е").replace(/[«»"'?!.,:;()]/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function find(query) {
    const q = norm(query);
    return entries.find(item => [item.name].concat(item.aliases).some(alias => q === norm(alias) || q.includes(norm(alias)))) || null;
  }
  function answer(query) {
    const q = norm(query);
    if (/^(?:покажи|перечисли|какие есть|список) теорем/.test(q)) {
      return { handled: true, status: "catalog", intent: "list_theorems", text: "В учебной библиотеке АКСИ сейчас есть:\n" + entries.map((x,i) => (i+1)+". "+x.name+" — "+x.field).join("\n"), proof: [{type:"curated_catalog", count:entries.length}] };
    }
    const isPractice = /(?:практика|задач[ауи]|упражнени[ея]|проверь меня)/.test(q);
    const isExample = /(?:пример|применени[ея])/.test(q);
    const isTheorem = /(?:теорем|формул|правил|объясни|докажи|что такое)/.test(q);
    if (!isPractice && !isExample && !isTheorem) return null;
    const item = find(q);
    if (!item) return null;
    const sections = ["**" + item.name + "** (" + item.field + ")", item.statement,
      "Условия: " + item.assumptions.join("; ") + "."];
    if (isPractice) sections.push("Задача для тебя: " + item.exercise, "Проверка ответа: " + item.answer);
    else if (isExample) sections.push("Пример: " + item.example, "Попробуй самостоятельно: " + item.exercise);
    else sections.push("Идея доказательства: " + item.proof, "Пример: " + item.example, "Задача для закрепления: " + item.exercise);
    return { handled: true, status: "grounded_math_reference", intent: isPractice ? "math_practice" : isExample ? "math_example" : "theorem_explanation",
      text: sections.join("\n\n"), theorem: item.id,
      proof: [{type:"curated_theorem_record", id:item.id, assumptions:item.assumptions.slice(), source:"AKSI Mathematical Practice Library v1.0.0", proofStatus:"proof_sketch_not_machine_verified"}] };
  }
  root.AKSIMathPractice = { version:"1.0.0", answer, find, list: () => entries.map(({id,name,field}) => ({id,name,field})) };
  if (typeof module === "object" && module.exports) module.exports = root.AKSIMathPractice;
})(typeof window !== "undefined" ? window : globalThis);
