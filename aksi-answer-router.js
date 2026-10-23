/* AKSI Answer Router v2: explicit intents, evidence-aware generation, honest abstention. */
(function (root) {
  "use strict";
  const VERSION = "2.0.0";
  const clean = value => String(value == null ? "" : value)
    .replace(/^\s*(?:(?:команда)\s*[-—:]\s*|(?:акси)\s*[,!:]?\s*|(?:пожалуйста)\s*[,!:]?\s*)/i, "")
    .trim();
  const norm = value => clean(value).toLocaleLowerCase("ru").replace(/[ё]/g, "е").replace(/[—–]/g, "-").replace(/[?!.,:;«»"'()]/g, " ").replace(/\s+/g, " ").trim();
  function mathExpression(query) {
    const q = clean(query).replace(/[?=]+\s*$/, "").trim();
    const match = q.match(/^(?:(?:сколько\s+(?:будет|получится)|посчитай|вычисли|реши|calculate)\s*[:：]?\s*)?([\d\s().,+\-*/^eE]+)$/i);
    if (!match) return null;
    const expression = (match[1] || match[0]).trim().replace(/,/g, ".");
    return /\d/.test(expression) && /[+*/^()-]/.test(expression) ? expression : null;
  }
  function isExplicitSearch(query) {
    return /^(?:найди|поищи|поиск|узнай|проверь в интернете|найди в интернете|последние новости|актуальные новости)(?=\s|$)/i.test(clean(query));
  }
  function sourcesText(evidence, query) {
    if (!evidence.length) return "Я не нашла доступных источников по запросу «" + query + "». Попробуй переформулировать запрос или проверь подключение к интернету. Я не буду придумывать результат поиска.";
    return "Нашла материалы по запросу «" + query + "». Это выдержки из источников, а не автоматически проверенный вывод:\n\n" +
      evidence.slice(0, 5).map((item, i) => {
        const title = String(item.title || "Источник " + (i + 1));
        const text = String(item.text || item.snippet || "").replace(/\s+/g, " ").trim().slice(0, 650);
        return (i + 1) + ". " + title + (text ? "\n" + text : "") + (item.url ? "\nИсточник: " + item.url : "");
      }).join("\n\n");
  }
  async function answer(query, options) {
    options = options || {};
    const raw = String(query == null ? "" : query).trim();
    const q = clean(raw);
    if (!q) return { handled: false, version: VERSION };
    const weather = root.AKSIWeather;
    if (weather && typeof weather.detect === "function" && weather.detect(raw)) {
      const result = await weather.answer(raw);
      return Object.assign({ version: VERSION, route: "weather", handled: true }, result, { statusText: result && result.error ? "Не удалось получить актуальную погоду из онлайн-источника." : "Погодные данные получены онлайн из Open-Meteo." });
    }
    if (/^(?:логика|выведи)\s*[:：]/i.test(q)) {
      const symbolic = root.AKSISymbolicInference;
      if (symbolic && typeof symbolic.infer === "function") {
        const result = symbolic.infer(q);
        return { handled: true, version: VERSION, route: "symbolic-inference", statusText: "Символический вывод по явно заданным фактам и правилам.", text: result.text, proof: result.proof || [], inference: result };
      }
    }
    const semantic = root.AKSISemanticReasoning;
    if (semantic && typeof semantic.answer === "function") {
      const result = semantic.answer(q);
      if (result && result.handled && !["unknown_concept", "unknown_relation"].includes(result.status)) return {
        handled: true, version: VERSION, route: "semantic-reasoning",
        statusText: "Ответ по локальному графу понятий; основания указаны в тексте.",
        text: result.text, proof: result.proof || [], semantic: result
      };
    }
    const expression = mathExpression(q);
    if (expression && root.AKSICalculator && typeof root.AKSICalculator.evaluate === "function") {
      const result = root.AKSICalculator.evaluate(expression);
      if (result.ok || /^(?:посчитай|вычисли|реши|сколько\s+(?:будет|получится))/i.test(q)) {
        return {
          handled: true, version: VERSION, route: "calculator",
          statusText: result.ok ? "Вычисление выполнено детерминированным парсером." : "Выражение не удалось вычислить.",
          text: result.ok ? expression + " = " + result.formatted : "Не удалось вычислить выражение: " + result.error,
          calculation: result, proof: result.ok ? [{ type: "calculation", expression, value: result.value, method: "AKSICalculator" }] : []
        };
      }
    }
    if (/^(?:кто ты|представься|что такое aksi|что такое акси)$/i.test(norm(q))) {
      return {
        handled: true, version: VERSION, route: "identity",
        statusText: "Информация о текущей реализации AKSI.",
        text: "Я АКСИ — браузерный прототип проекта AKSI MATRIX. Сейчас у меня есть локальная память, детерминированный калькулятор, небольшой граф понятий, проверяемый символический вывод, погодный обработчик и возможность использовать языковую модель, если она загружена и поддерживается устройством. Без загруженной модели я не являюсь универсальным интеллектом и не должна изображать его."
      };
    }
    const webApi = root.AKSI_INTERNET;
    const explicitSearch = isExplicitSearch(q);
    const useWeb = options.useWeb === true || explicitSearch;
    let evidence = [];
    let searchError = null;
    if (useWeb) {
      if (!webApi || typeof webApi.gather !== "function") {
        searchError = "Модуль веб-поиска не загружен.";
      } else {
        try {
          const searchQuery = explicitSearch ? q.replace(/^(?:проверь в интернете|найди в интернете|поищи в интернете|последние новости|актуальные новости|найди|поищи|поиск|узнай)\s*/i, "") : q;
          const pack = await webApi.gather(searchQuery, { mode: explicitSearch ? "full" : "lite" });
          evidence = Array.isArray(pack && pack.evidence) ? pack.evidence.slice(0, 6) : [];
          if (pack && Array.isArray(pack.errors) && pack.errors.length && !evidence.length) searchError = pack.errors.join("; ");
        } catch (error) {
          searchError = String(error && error.message || error);
        }
      }
    }
    const llm = root.AKSI_WEBLLM;
    if (llm && typeof llm.ready === "function" && llm.ready() && typeof llm.complete === "function") {
      const evidenceContext = evidence.length
        ? "\n\nМатериалы найденных источников. Используй их осторожно, не считай каждую фразу доказанным фактом; при утверждениях укажи номера источников:\n" +
          evidence.map((x, i) => "[" + (i + 1) + "] " + String(x.title || "Источник") + "\n" + String(x.text || x.snippet || "").slice(0, 900) + "\nURL: " + String(x.url || "")).join("\n\n")
        : "";
      const system = [
        "Ты — АКСИ, русскоязычный помощник. Отвечай прямо на вопрос, а не описывай внутренние алгоритмы.",
        "Не выдумывай факты, ссылки, цитаты или выполненные действия. Отделяй сведения источников от собственных выводов. Если контекста недостаточно, скажи, что именно неизвестно.",
        "Не выводи диагностические поля, отпечатки, топологические признаки или внутренние квитанции в обычный ответ.",
        String(options.system || ""),
        evidenceContext
      ].filter(Boolean).join("\n\n");
      const modelResult = await llm.complete(q, {
        system,
        history: Array.isArray(options.history) ? options.history : [],
        max_tokens: options.max_tokens || 700,
        temperature: 0.35
      });
      if (modelResult && typeof modelResult.text === "string" && modelResult.text.trim()) {
        const citations = evidence.length ? "\n\nИсточники для проверки:\n" + evidence.slice(0, 5).map((x, i) => "[" + (i + 1) + "] " + String(x.title || "Источник") + (x.url ? " — " + x.url : "")).join("\n") : "";
        return {
          handled: true, version: VERSION, route: useWeb ? "webllm+evidence" : "webllm",
          statusText: "Локальная языковая модель: " + (modelResult.model || "модель браузера") + (evidence.length ? " · источников: " + evidence.length : " · без веб-источников") + ". Факты не прошли независимую проверку.",
          text: modelResult.text.trim() + citations, evidence, model: modelResult.model || null,
          proof: [{ type: "generation", model: modelResult.model || "browser-local", evidenceCount: evidence.length, independentlyVerified: false }]
        };
      }
      if (!evidence.length && !useWeb) {
        return { handled: true, version: VERSION, route: "model-unavailable", statusText: "Локальная языковая модель не вернула ответ.", text: "Модель не смогла сформировать ответ. Проверь её состояние или повтори запрос." };
      }
    }
    if (useWeb) {
      return {
        handled: true, version: VERSION, route: "web-evidence",
        statusText: evidence.length ? "Поиск завершён · найденные материалы не являются автоматически проверенным ответом." : "Поиск не дал источников.",
        text: searchError && !evidence.length ? "Не удалось выполнить веб-поиск: " + searchError + "\nПроверь соединение или повтори запрос. Я не буду выдумывать результат." : sourcesText(evidence, q),
        evidence, searchError,
        proof: evidence.map((x, i) => ({ type: "retrieved_source", index: i + 1, url: x.url || null, title: x.title || null }))
      };
    }
    return {
      handled: true, version: VERSION, route: "honest-abstention",
      statusText: "Для свободного ответа нужна загруженная локальная модель или разрешённый веб-поиск.",
      text: "Я пока не могу надёжно ответить на этот вопрос в текущем режиме: локальная языковая модель не загружена, а веб-поиск выключен.\n\nМожешь загрузить доступную модель в блоке «Локальная модель» или включить «Искать источники в интернете». Тогда я смогу сформировать ответ на основе модели или показать найденные материалы. Я не буду подменять ответ случайным шаблоном."
    };
  }
  root.AKSIAnswerRouter = { version: VERSION, answer, clean, mathExpression, isExplicitSearch };
  if (typeof module === "object" && module.exports) module.exports = root.AKSIAnswerRouter;
})(typeof window !== "undefined" ? window : globalThis);
