/**
 * AKSI Core AI — local generation kernel (Mind L2 companion)
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "core-v51";
  var nXP = 0;
  try { nXP = Number(localStorage.getItem("aksi_core_xp") || 0) || 0; } catch (e) {}

  function bump() {
    nXP++;
    try { localStorage.setItem("aksi_core_xp", String(nXP)); } catch (e) {}
  }

  function norm(q) {
    return String(q || "").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function intentOf(q) {
    var s = norm(q);
    if (/кто ты|who are you|что ты/.test(s)) return "identity";
    if (/архитектур|как устроен|модул/.test(s)) return "architecture";
    if (/статус|как дела|health/.test(s)) return "status";
    if (/умеешь|возможност|features/.test(s)) return "capabilities";
    if (/привет|hello|здравств/.test(s)) return "greeting";
    if (/запомни|выучи|remember/.test(s)) return "memory";
    return "general";
  }

  function patternAnswer(intent) {
    if (intent === "greeting") return "Привет. Я АКСИ — local-first напарник. Спроси «кто ты» или задачу.";
    if (intent === "identity") return "Я АКСИ — offline-first агент в браузере. Данные у тебя. Формула: (A\u00d7I\u00d7S)\u00d7(1+0.4\u221an). Контакт: aksilove@internet.ru";
    if (intent === "architecture") return "Стек: Mind L2 → Neuro → Core → WebLLM(opt-in) → RAG → ADIA → Trust AES. Вкладки Home·Chat·Local·Trust·Mem·Lab·Stats.";
    if (intent === "capabilities") return "Offline ответы, RAG-память, WebLLM на GPU, AES .aksi экспорт, ADIA-оценка, Stats tok/s.";
    if (intent === "status") {
      var mods = 0;
      ["AKSI_MIND_L2", "AKSI_NEURO", "AKSI_RAG", "AKSI_WEBLLM", "AKSI_TRUST_VAULT"].forEach(function (k) { if (G[k]) mods++; });
      return "Core " + VER + " · модули " + mods + " · xp " + nXP + " · WebGPU " + (navigator.gpu ? "да" : "нет");
    }
    if (intent === "memory") return "Mem → «Учить» или «запомни: …» в чате.";
    return null;
  }

  function think(query) {
    var q = String(query || "").trim();
    if (!q) return { text: "Напиши вопрос.", meta: "core\u00b7empty", source: "core" };
    var intent = intentOf(q);
    var pat = patternAnswer(intent);
    if (pat) { bump(); return { text: pat, meta: "core · " + intent, source: "core", intent: intent }; }
    if (G.AKSI_NEURO && AKSI_NEURO.think) {
      try {
        var nr = AKSI_NEURO.think(q);
        if (nr && nr.text && String(nr.text).length > 20) {
          bump();
          return { text: String(nr.text), meta: "core\u2192neuro", source: "neuro", intent: intent };
        }
      } catch (e) {}
    }
    bump();
    return {
      text: "Core принял: «" + q.slice(0, 120) + "». Уточни цель или открой Local для LLM.",
      meta: "core · " + intent,
      source: "core",
      intent: intent
    };
  }

  G.AKSI_CORE_AI = {
    version: VER,
    think: think,
    intentOf: intentOf,
    formula: "AKSI=(A\u00d7I\u00d7S)\u00d7(1+0.4\u221an)"
  };
})(typeof window !== "undefined" ? window : globalThis);
