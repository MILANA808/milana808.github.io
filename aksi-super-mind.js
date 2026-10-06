/** AKSI Super Mind v2 — полные русские объяснения через fabric + optional WebLLM */
(function (G) {
  "use strict";
  var VERSION = "mind-2.0.0";
  function hash(s) {
    var h = 2166136261 >>> 0, t = String(s), i;
    for (i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function tryMath(q) {
    var s = String(q).toLowerCase().replace(/,/g, ".").replace(/\s+/g, " ").trim();
    var m, n, r, x, p, base, v, expr, val;
    m = s.match(/x\s*\^\s*2\s*=\s*([0-9.]+)|x\s*\*\*\s*2\s*=\s*([0-9.]+)|x²\s*=\s*([0-9.]+)|x\s*\^\s*2\s*-\s*([0-9.]+)\s*=\s*0/i);
    if (m) {
      n = parseFloat(m[1] || m[2] || m[3] || m[4]); r = Math.sqrt(n);
      return { ok: true, kind: "quad", value: [r, -r], steps: [
        "Дано уравнение вида x² = " + n + ".",
        "Берём квадратный корень из обеих частей: |x| = √" + n + ".",
        "√" + n + " = " + r + ".",
        "Значит x = " + r + " или x = " + (-r) + ".",
        "Проверка: (" + r + ")² = " + (r * r) + ", (−" + r + ")² = " + (r * r) + "."
      ]};
    }
    m = s.match(/(?:корень|sqrt)\s*(?:из\s*)?([0-9.]+)/i);
    if (m) {
      x = parseFloat(m[1]); r = Math.sqrt(x);
      return { ok: true, kind: "sqrt", value: r, steps: [
        "Нужно найти √" + x + " — число, квадрат которого равен " + x + ".",
        "Вычисление: √" + x + " ≈ " + r + ".",
        "Проверка: " + r + " × " + r + " = " + (r * r) + "."
      ]};
    }
    m = s.match(/([0-9.]+)\s*%\s*(?:от\s*)?([0-9.]+)/);
    if (m) {
      p = parseFloat(m[1]); base = parseFloat(m[2]); v = base * p / 100;
      return { ok: true, kind: "pct", value: v, steps: [
        "Нужно взять " + p + "% от числа " + base + ".",
        "Формула: значение = число × процент / 100.",
        base + " × " + p + " / 100 = " + v + "."
      ]};
    }
    m = s.match(/(?:посчитай|вычисли|сколько\s*будет)?\s*([0-9.]+\s*[+\-*/^]\s*[0-9.]+(?:\s*[+\-*/^]\s*[0-9.]+)*)/i);
    if (m) {
      try {
        expr = m[1].replace(/\^/g, "**").replace(/\s+/g, "");
        if (!/^[\d.+\-*/()]+$/.test(expr.replace(/\*\*/g, ""))) return null;
        val = Function('"use strict"; return (' + expr + ")")();
        if (typeof val === "number" && isFinite(val))
          return { ok: true, kind: "arith", value: val, steps: [
            "Выражение: " + m[1].trim() + ".",
            "Считаем по правилам арифметики (сначала × и ÷, потом + и −).",
            "Результат: " + val + "."
          ]};
      } catch (e) {}
    }
    return null;
  }
  var KB = [
    { re: /суперпозиц|superpos/i, title: "Суперпозиция", explain: [
      "Суперпозиция — это когда квантовая система одновременно описывается несколькими возможными состояниями, пока мы её не измерили.",
      "Формально состояние кубита записывают так: |ψ⟩ = α|0⟩ + β|1⟩, где α и β — комплексные амплитуды, и |α|² + |β|² = 1.",
      "Вероятность получить при измерении «0» равна |α|², вероятность «1» — |β|². До измерения нельзя сказать, что система «уже выбрала» один вариант.",
      "В симуляторе АКСИ на Super это видно как statevector: массив амплитуд. После коллапса (один shot) выбирается один базисный исход.",
      "Простая аналогия: монета в воздухе — математическое описание обоих исходов с весами, пока монета не упала."
    ]},
    { re: /кубит|qubit/i, title: "Кубит", explain: [
      "Кубит — единица квантовой информации. В отличие от обычного бита (только 0 или 1), кубит может быть в суперпозиции α|0⟩ + β|1⟩.",
      "Один кубит — двумерное комплексное пространство. n кубитов — 2ⁿ амплитуд.",
      "На Super fabric АКСИ для сида используется компактный 4-кубитный симулятор (16 амплитуд).",
      "Важно: браузерный симулятор — классическая математика амплитуд на JS, а не физический кубит в лаборатории."
    ]},
    { re: /permit|пермит|допуск|разрешен/i, title: "Permit (допуск действия)", explain: [
      "Permit — правило «по умолчанию запрещено»: агент не выполняет действие, пока контур явно не сказал ALLOW.",
      "Зачем: чат-бот может писать что угодно, а агент с инструментами может удалить или отправить данные. Permit отделяет текст от опасного действия.",
      "В АКСИ: цель → план → мандат → Permit → если ALLOW, то чек (receipt) с подписью. Если BLOCK — действие не выполняется.",
      "Для человека это контроль: система не «сама нажала кнопку», а прошла через явный допуск."
    ]},
    { re: /экзокортекс|exocortex/i, title: "Экзокортекс", explain: [
      "Экзокортекс АКСИ — внешний слой: память, цель, опыт человека, квантовый сид, Permit и криптографические чеки.",
      "Состояние агента — вектор S (нормированный). Новый опыт меняет S. Это явная математика, а не скрытые веса.",
      "Цепочка чеков связывается через prev→id и подписывается (ECDSA). verifyChain проверяет целостность.",
      "Идея: не верить голосу модели на слово, а иметь доказуемый след."
    ]},
    { re: /\bакси\b|aksi|что ты|кто ты/i, title: "АКСИ", explain: [
      "АКСИ — суверенный контур: локальный runtime, quantum seed, Super fabric, Permit, чеки, опционально WebLLM.",
      "Принцип: технология служит человеку. Ответ можно разобрать по стадиям; действие — только после ALLOW.",
      "Это не «ещё один ChatGPT». Ставка на прозрачность, offline-first и контроль действий.",
      "На Super вопрос идёт как job: quantum → compute → mind (или WebLLM) → Permit → receipt."
    ]},
    { re: /энтропи|entropy/i, title: "Энтропия", explain: [
      "Энтропия Шеннона: S = −Σ pᵢ log₂ pᵢ.",
      "Если одно состояние почти наверняка, энтропия близка к нулю. Если все исходы равновероятны — энтропия максимальна.",
      "В квантовом сиде АКСИ энтропия считается по |амплитуда|² после вентилей."
    ]},
    { re: /коллапс|collapse|измерен/i, title: "Коллапс (измерение)", explain: [
      "Коллапс — выбор одного базисного исхода с вероятностью |амплитуда|².",
      "Алгоритм: строим pᵢ = |aᵢ|², берём случайное число, находим интервал — получаем битовую строку.",
      "В pipeline результат становится сидом для следующих шагов. Это математика + генератор случайных чисел."
    ]},
    { re: /суперкомпьютер|fabric|кластер|gpu|super/i, title: "Supercomputer Fabric", explain: [
      "AKSI Super — виртуальный кластер в браузере: ноды, GPU-слоты, очередь, планировщик, память-ledger.",
      "Нагрузка на устройстве: matmul, quantum-сид, Mind или WebLLM. Это оркестратор pipeline, не дата-центр.",
      "Все задумки АКСИ проходят через один компьютер: цель, счёт, допуск, ответ, чек."
    ]},
    { re: /веб\s*ллм|webllm|нейросет|языков\w+\s*модел|llm/i, title: "WebLLM", explain: [
      "WebLLM — настоящие сжатые веса модели (Qwen/Llama), загружаемые в браузер через WebGPU.",
      "Путь «большой язык на телефоне»: не без весов, а с квантованными весами (q4), которые умещаются в память.",
      "На АКСИ WebLLM — workload: если GPU есть — живой текст; если нет — Super Mind даёт структурированное объяснение."
    ]},
    { re: /математик|уравнен|посчита|вычисл/i, title: "Математика на Super", explain: [
      "Контур умеет арифметику, проценты, квадратный корень, уравнения вида x² = n.",
      "Каждый шаг проговаривается по-русски: что дано, формула, результат, проверка."
    ]},
    { re: /памят|memory|запомн/i, title: "Память", explain: [
      "На Super память — append-only ledger в localStorage с хэшами событий.",
      "В Экзокортексе память связана с вектором S и цепочкой чеков. Экспорт JSON — ваш."
    ]}
  ];
  function extractKeys(q) {
    var stop = /^(и|в|на|по|что|как|это|для|или|при|про|the|a|an|is|are|what|how|why)$/i;
    return String(q).toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(function (w) {
      return w.length > 2 && !stop.test(w);
    }).slice(0, 14);
  }
  function intent(q) {
    var s = String(q).toLowerCase();
    if (/как\s+работ|как\s+устроен|как\s+сдела/i.test(s)) return "how";
    if (/почему|зачем/i.test(s)) return "why";
    if (/что\s+такое|что\s+это|кто\s+ты|расскажи|объясни/i.test(s)) return "what";
    if (/посчита|вычисл|сколько|корень|x\s*\^/i.test(s)) return "math";
    return "general";
  }
  function matchTopics(q) {
    var out = [];
    KB.forEach(function (t) { if (t.re.test(q)) out.push(t); });
    return out;
  }
  function synthesize(q, quantum) {
    var keys = extractKeys(q);
    var bits = quantum && quantum.bits ? quantum.bits : "----";
    var seed = quantum && quantum.seed ? quantum.seed : hash(q);
    var path = seed % 5;
    var topics = matchTopics(q);
    var math = tryMath(q);
    var it = intent(q);
    var lines = [];
    lines.push("АКСИ Super Mind отвечает через суперкомпьютер-симулятор.");
    lines.push("Квантовый сид этого ответа: |" + bits + "⟩ (path " + path + ").");
    lines.push("");
    if (math && math.ok) {
      lines.push("— Математический разбор —");
      math.steps.forEach(function (s) { lines.push(s); });
      lines.push("Итог: " + (Array.isArray(math.value) ? math.value.join(" и ") : math.value) + ".");
      lines.push("");
    }
    if (topics.length) {
      topics.forEach(function (t) {
        lines.push("— " + t.title + " —");
        t.explain.forEach(function (p) { lines.push(p); lines.push(""); });
      });
    }
    if (!math && !topics.length) {
      lines.push("— Как я понял вопрос —");
      if (keys.length) lines.push("Ключевые слова: " + keys.join(", ") + ".");
      else lines.push("Формулировка короткая; точного узла знаний не сработало.");
      lines.push("");
      lines.push("Я могу подробно объяснить: суперпозицию, кубит, Permit, Экзокортекс, АКСИ, энтропию, коллапс, Super fabric, WebLLM, простую математику.");
      lines.push("Спросите, например: «что такое суперпозиция?» или «посчитай 12*12» или «зачем нужен Permit?».");
      lines.push("");
    }
    lines.push("— Как это связано с Super —");
    if (it === "how")
      lines.push("Вопрос про «как» обработан как job на fabric: GPU-слот, quantum-сид, Mind собрал объяснение, Permit зафиксировал шаг.");
    else if (it === "why")
      lines.push("Вопрос «зачем/почему» разобран через смысл АКСИ: контроль, прозрачность, доказуемый след.");
    else
      lines.push("Ответ собран локально: стадии quantum → compute → mind → permit видны в журнале. Это не облачный чёрный ящик.");
    lines.push("");
    lines.push("— Важно понимать —");
    lines.push("Полный «гигантский LLM без весов» физически не существует: языковой модели нужны параметры. На телефоне их сжимают (q4) и грузят через WebLLM/WebGPU.");
    lines.push("Сейчас вы получили прозрачный математико-смысловой ответ АКСИ. Если WebLLM загружен, Super может делегировать живую генерацию ему.");
    lines.push("");
    lines.push("— mind " + VERSION + " · русский объясняющий контур · через Super —");
    return { text: lines.join("\n"), math: math, topics: topics.map(function (t) { return t.title; }), keys: keys, path: path, intent: it };
  }
  async function answer(q, quantum) {
    var W = G.AKSI_WEBLLM;
    if (W && typeof W.complete === "function" && W.status && W.status().ready) {
      try {
        var sys = "Ты АКСИ. Отвечай только на русском, подробно и понятно, как хороший учитель. Объясняй шаг за шагом. Если вопрос математический — считай и проверяй. Не выдумывай источники.";
        var r = await W.complete(String(q), { system: sys, max_tokens: 400 });
        var text = (r && (r.text || r.content || r.message)) || "";
        if (!text && r && r.choices && r.choices[0] && r.choices[0].message) text = r.choices[0].message.content || "";
        if (text && String(text).trim().length > 20) {
          return {
            text: String(text).trim() + "\n\n— через Super · WebLLM · сид |" + (quantum && quantum.bits || "----") + "⟩ —",
            source: "webllm", math: tryMath(q),
            topics: matchTopics(q).map(function (t) { return t.title; }),
            path: (quantum && quantum.seed ? quantum.seed : hash(q)) % 5
          };
        }
      } catch (e) {}
    }
    var syn = synthesize(q, quantum);
    syn.source = "mind";
    return syn;
  }
  G.AKSI_SUPER_MIND = {
    version: VERSION, synthesize: synthesize, answer: answer,
    tryMath: tryMath, extractKeys: extractKeys, matchTopics: matchTopics
  };
})(typeof window !== "undefined" ? window : globalThis);
