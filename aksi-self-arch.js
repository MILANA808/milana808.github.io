/**
 * AKSI Self-Architecture — offline presentation knowledge
 * АКСИ отвечает на любой вопрос про свою архитектуру без сети.
 * Контакт: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0";

  var CARDS = [
    {
      id: "what",
      tags: ["кто ты", "что такое акси", "what is aksi", "продукт", "описание", "смысл"],
      title: "Что такое АКСИ",
      body:
        "АКСИ — локальный offline-first runtime: цифровой напарник + слой Decision Integrity.\n\n" +
        "Не облачный чат-бот. Не AGI. Работает в браузере на устройстве пользователя.\n\n" +
        "Ядро: Composer (RU) + Neuro (pure-JS) + ADIA (метрики/seal) + память + hybrid crypto.\n" +
        "Сеть — только по явному согласию. Данные не уходят на сервер по умолчанию.\n\n" +
        "Публичный контакт: aksilove@internet.ru"
    },
    {
      id: "product",
      tags: ["продукт", "понятный", "как пользоваться", "вкладки", "ui", "интерфейс"],
      title: "Понятный продукт",
      body:
        "Главная https://milana808.github.io — бежевый SPA с вкладками:\n" +
        "• Home — статус модулей\n" +
        "• Чат — быстрые ответы offline\n" +
        "• Local — видимый pipeline (6 шагов)\n" +
        "• Trust — ECDSA + optional ML-KEM (PQ)\n" +
        "• Память — «запомни: факт»\n" +
        "• Lab — ссылки на MATRIX, Quantum, Proof, Protocol\n\n" +
        "Protocol /protocol/ — «Живой Разум»: HRR, рой, гиперграф, WebRTC, тьютор, OCR."
    },
    {
      id: "pipeline",
      tags: ["pipeline", "пайплайн", "контур", "как работает", "цепочка", "путь ответа"],
      title: "Путь ответа (pipeline)",
      body:
        "Запрос → память (IndexedDB / localStorage) → ядро (Composer / Neuro) → " +
        "квант-мета (опц.) → ADIA метрики (EQS и др.) → integrity (FNV ledger) → " +
        "криптоподпись (ECDSA / hybrid PQ при Trust).\n\n" +
        "Вкладка Local показывает шаги: 1.Ввод 2.Память 3.Ядро 4.Квант 5.Метрики 6.Проверка.\n" +
        "Mind-порядок: Brain → WebLLM? → Neuro → ADIA seal → Web? → Core."
    },
    {
      id: "modules",
      tags: ["модули", "компоненты", "что внутри", "стек", "файлы"],
      title: "Модули стека",
      body:
        "• aksi-compose.js — Resonance Composer v2 RU (намерение → доказательства → текст)\n" +
        "• aksi-neuro.js — pure-JS offline (SEED + lexical + knowledge resonance)\n" +
        "• aksi-algorithm.js — ADIA / Metrics Engine (EQS, QCLI, H_eff…)\n" +
        "• aksi-pq.js — Web Crypto ECDH/ECDSA P-256 + AES-GCM + optional ML-KEM-768\n" +
        "• aksi-quantum.js — симулятор + QCLI meta\n" +
        "• aksi-knowledge.js — offline primer topics\n" +
        "• app-runtime.js — оболочка вкладок и маршрутизация\n" +
        "• protocol/* — Living Mind (HRR worker, graph-db, swarm, WebRTC)"
    },
    {
      id: "adia",
      tags: ["adia", "eqs", "метрики", "seal", "integrity", "резонанс решений"],
      title: "ADIA — Decision Integrity",
      body:
        "ADIA — Resonance Decision Engine (именованный algorithm IP).\n\n" +
        "На ответ накладываются инженерные сигналы: EQS, coherence, source trust, memory resonance.\n" +
        "Integrity ledger на главной поверхности = FNV-hash chain (локальная целостность телеметрии).\n" +
        "Настоящая криптоподпись = ECDSA P-256 / Ed25519 в Trust и MATRIX.\n\n" +
        "Это не «истина вселенной», а измеримые сигналы продукта. Честность важнее красивых цифр."
    },
    {
      id: "neuro",
      tags: ["neuro", "нейро", "модель", "seed", "offline llm", "rwkv"],
      title: "Neuro offline",
      body:
        "Neuro — pure-JS offline ядро без загрузки тяжёлой модели.\n" +
        "SEED-пары + лексический retrieve + knowledge resonance + обучение «запомни:».\n" +
        "Всегда доступен на CPU. Не претендует на AGI: при слабом резонансе честно говорит «мало фактов»."
    },
    {
      id: "protocol",
      tags: ["protocol", "протокол", "живой разум", "hrr", "рой", "гиперграф", "10 столпов"],
      title: "Protocol — Живой Разум",
      body:
        "Поверхность /protocol/ — 10 столпов offline:\n" +
        "1. HRR — голографическое поле 64×64 (Worker, spatial+spectral)\n" +
        "2. Рой — Composer / Neuro / Core / Reason + ADIA ranking\n" +
        "3. Гиперграф — IndexedDB + embeddings + optional AES-GCM\n" +
        "4. ADIA critic — 5 осей (logic, relevance, completeness, empathy, originality)\n" +
        "5. WebRTC — обмен обезличенными слепками\n" +
        "6. Сократический тьютор\n" +
        "7. OCR (Tesseract)\n" +
        "8. Privacy / wipe / SW\n" +
        "9. UI 10 вкладок\n" +
        "10. Эволюция — анализ сессии"
    },
    {
      id: "crypto",
      tags: ["crypto", "крипто", "pq", "post-quantum", "ecdsa", "did", "trust", "подпись"],
      title: "Криптография и Trust",
      body:
        "Trust-вкладка: Web Crypto ECDH/ECDSA P-256, AES-256-GCM.\n" +
        "Post-quantum: optional hybrid ML-KEM-768 (если доступен в окружении).\n" +
        "DID локальный. Ключи не отправляются на сервер.\n" +
        "Seal/Open — конверты между идентичностями. Это реальная криптография браузера, не «квантовый компьютер»."
    },
    {
      id: "memory",
      tags: ["память", "запомни", "обучение", "indexeddb", "rag"],
      title: "Память и обучение",
      body:
        "Команда «запомни: факт» пишет на устройство (localStorage / IndexedDB).\n" +
        "Факты участвуют в retrieve при следующих вопросах.\n" +
        "В Protocol — гиперграф узлов и связей; опционально AES-GCM пароль.\n" +
        "RAG / файлы — в MATRIX. Wipe очищает локальные данные."
    },
    {
      id: "limits",
      tags: ["границы", "не умеет", "честность", "не agi", "ограничения", "ошибки"],
      title: "Границы и честность",
      body:
        "АКСИ — не AGI и не «все знания человечества».\n" +
        "При слабой опоре отвечает «не знаю» / «мало фактов», а не выдумывает.\n" +
        "Метрики — инженерные сигналы, не научная «истина».\n" +
        "Решения за человеком. Медицина/право/безопасность — к специалистам.\n" +
        "Сеть opt-in. Цены на публичной поверхности не показываются."
    },
    {
      id: "routes",
      tags: ["ссылки", "маршруты", "где что", "matrix", "local-ai", "algorithm"],
      title: "Карта поверхностей",
      body:
        "• / — продукт SPA (вкладки)\n" +
        "• /local-ai/ — полный видимый pipeline\n" +
        "• /matrix/ — lab: WebLLM opt-in, RAG, DID, Bloch\n" +
        "• /protocol/ — Living Mind (10 столпов)\n" +
        "• /algorithm.html + ALGORITHM.md — ADIA спецификация\n" +
        "• /quantum/ · /proof/ · PRECEDENT.json\n" +
        "Контакт: aksilove@internet.ru"
    },
    {
      id: "formula",
      tags: ["формула", "aksi formula", "качество", "score"],
      title: "Формула качества (ориентир)",
      body:
        "Семейство: AKSI ≈ (A × I × S) × (1 + 0.4√n)\n" +
        "A — alignment/coherence, I — integrity/source trust, S — substance, n — накопленная память/опыт.\n" +
        "На практике runtime использует ADIA evaluate + EQS-сигналы, а не одну магическую цифру."
    }
  ];

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreCard(q, card) {
    var nq = norm(q);
    if (!nq) return 0;
    var s = 0;
    var title = norm(card.title);
    var blob = norm(card.title + " " + card.body + " " + (card.tags || []).join(" "));
    (card.tags || []).forEach(function (t) {
      var nt = norm(t);
      if (!nt) return;
      if (nq === nt) s += 14;
      else if (nq.indexOf(nt) !== -1) s += 8;
      else if (nt.indexOf(nq) !== -1 && nq.length > 4) s += 5;
    });
    nq.split(" ").forEach(function (w) {
      if (w.length < 3) return;
      if (title.indexOf(w) !== -1) s += 4;
      if (blob.indexOf(w) !== -1) s += 1;
    });
    if (/adia|eqs|метрик|seal|integrity|резонанс решений/.test(nq) && card.id === "adia") s += 12;
    if (/pipeline|пайплайн|контур|цепочк|как работает/.test(nq) && card.id === "pipeline") s += 10;
    if (/протокол|живой разум|hrr|гиперграф|рой агент/.test(nq) && card.id === "protocol") s += 10;
    if (/крипто|ecdsa|post.?quantum|pq|did|trust|подпис/.test(nq) && card.id === "crypto") s += 10;
    if (/границ|не agi|огранич|честност|не знаю/.test(nq) && card.id === "limits") s += 10;
    if (/модул|стек|компонент|из чего|файлы/.test(nq) && card.id === "modules") s += 8;
    if (/памят|запомни|обучен|rag/.test(nq) && card.id === "memory") s += 8;
    if (/кто ты|что такое акси|what is aksi|продукт акси/.test(nq) && card.id === "what") s += 10;
    if (/архитектур|как устроен|как устроена/.test(nq) && (card.id === "what" || card.id === "pipeline" || card.id === "modules")) s += 5;
    return s;
  }

  function search(q) {
    var best = null;
    var score = 0;
    for (var i = 0; i < CARDS.length; i++) {
      var sc = scoreCard(q, CARDS[i]);
      if (sc > score) {
        score = sc;
        best = CARDS[i];
      }
    }
    if (best && score >= 4) return { card: best, score: score };
    return null;
  }

  function answer(q) {
    var hit = search(q);
    if (!hit) return null;
    return {
      text: hit.card.title + "\n\n" + hit.card.body,
      meta: "self-arch · " + hit.card.id,
      id: hit.card.id,
      score: hit.score,
      offline: true
    };
  }

  function overview() {
    return (
      "АКСИ — offline runtime на устройстве.\n\n" +
      "1) Чат / Local — Composer + Neuro + память\n" +
      "2) ADIA — метрики и целостность ответа\n" +
      "3) Trust — ECDSA + optional PQ\n" +
      "4) Protocol — HRR, рой, гиперграф, WebRTC\n\n" +
      "Спроси: «как устроена АКСИ», «что такое ADIA», «pipeline», «протокол», «границы».\n" +
      "Контакт: aksilove@internet.ru"
    );
  }

  function all() {
    return CARDS.map(function (c) {
      return { id: c.id, title: c.title, tags: c.tags.slice() };
    });
  }

  G.AKSI_SELF_ARCH = {
    version: VER,
    search: search,
    answer: answer,
    overview: overview,
    all: all,
    cards: CARDS
  };
})(typeof window !== "undefined" ? window : globalThis);
