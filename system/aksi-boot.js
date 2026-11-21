(function (root) {
  "use strict";
  if (!root || !root.AKSISystemKernel) return;
  const kernel = root.AKSISystemKernel.createKernel({
    maxConcurrentTasks: 4, maxQueuedTasks: 32, defaultTimeoutMs: 15000, maxTaskHistory: 200
  });
  kernel.register({
    id: "evidence.core", version: "1.1.0",
    capabilities: ["evidence.candidate-screening", "evidence.manual-assessment"],
    init: async function () {
      if (!root.AKSIClaimEvidence || typeof root.AKSIClaimEvidence.prepareCandidates !== "function") {
        return { available: false, reason: "Модуль оценки источников не загружен." };
      }
      return { available: true };
    },
    health: async function () {
      return { ok: Boolean(root.AKSIClaimEvidence && typeof root.AKSIClaimEvidence.assess === "function") };
    }
  });
  kernel.register({
    id: "answer.router", version: String(root.AKSIAnswerRouter && root.AKSIAnswerRouter.version || "unknown"),
    dependencies: ["evidence.core"],
    capabilities: ["answer.routing", "honest-abstention"],
    init: async function () {
      if (!root.AKSIAnswerRouter || typeof root.AKSIAnswerRouter.answer !== "function") {
        return { available: false, reason: "Маршрутизатор ответов не загружен." };
      }
      return { available: true };
    },
    health: async function () {
      return { ok: Boolean(root.AKSIAnswerRouter && typeof root.AKSIAnswerRouter.answer === "function") };
    }
  });
  kernel.register({
    id: "agent.orchestrator", version: String(root.AKSIAgentOrchestrator && root.AKSIAgentOrchestrator.version || "unknown"),
    dependencies: ["answer.router"],
    capabilities: ["agent.plan.execute", "agent.action.approval", "agent.step.verification"],
    init: async function () {
      if (!root.AKSIAgentOrchestrator || typeof root.AKSIAgentOrchestrator.create !== "function") {
        return { available: false, reason: "Модуль планирования агента не загружен." };
      }
      const agent = root.AKSIAgentOrchestrator.create({ kernel: kernel, maxSteps: 12 });
      agent.registerAction("answer.respond", {
        run: async function (input) {
          return root.AKSIAnswerRouter.answer(String(input && input.prompt || ""), input && input.options || {});
        },
        verify: function (result) {
          return { ok: Boolean(result && result.handled === true && typeof result.text === "string" && result.text.trim()), detail: "Проверена структура ответа маршрутизатора, не истинность его содержания." };
        }
      });
      agent.registerAction("math.calculate", {
        run: async function (input) {
          if (!root.AKSICalculator || typeof root.AKSICalculator.evaluate !== "function") throw new Error("Калькулятор AKSI недоступен.");
          const calculation = root.AKSICalculator.evaluate(String(input && input.expression || ""));
          return {
            handled: true,
            version: "2.0.0",
            route: "calculator",
            statusText: calculation.ok ? "Вычисление выполнено детерминированным парсером." : "Выражение не удалось вычислить.",
            text: calculation.ok
              ? calculation.expression + " = " + calculation.formatted
              : "Не удалось вычислить выражение: " + calculation.error,
            calculation,
            proof: calculation.ok ? [{ type: "calculation", expression: calculation.expression, value: calculation.value, method: "AKSICalculator" }] : []
          };
        },
        verify: function (result) {
          return { ok: Boolean(result && result.handled === true && result.calculation && result.calculation.ok === true && Number.isFinite(result.calculation.value) && typeof result.text === "string" && result.text.trim()), detail: "Проверены структура ответа, успешный статус и конечное числовое значение; это не доказывает корректность самого выражения пользователя." };
        }
      });
      agent.registerAction("knowledge.write", {
        requiresApproval: true,
        run: async function (input) {
          if (!root.AKSIKnowledgeBase || typeof root.AKSIKnowledgeBase.answer !== "function") throw new Error("Локальная база знаний недоступна.");
          return root.AKSIKnowledgeBase.answer(String(input && input.prompt || ""));
        },
        verify: function (result) {
          return { ok: Boolean(result && result.handled === true && ["fact_added", "already_known", "fact_session_only"].includes(result.status)), detail: "Проверен статус записи. Постоянное сохранение зависит от подтверждения браузерного хранилища." };
        }
      });
      agent.registerAction("knowledge.read", {
        run: async function (input) {
          const result = root.AKSIKnowledgeBase && root.AKSIKnowledgeBase.answer(String(input && input.prompt || ""));
          return result || root.AKSIAnswerRouter.answer(String(input && input.prompt || ""), input && input.options || {});
        },
        verify: function (result) {
          return { ok: Boolean(result && result.handled === true && typeof result.text === "string" && result.text.trim()), detail: "Проверена структура ответа локальной базы/резервного маршрутизатора, не истинность пользовательских записей." };
        }
      });
      agent.registerAction("semantic.query", {
        run: async function (input) {
          const prompt = String(input && input.prompt || "");
          const result = root.AKSISemanticReasoning && root.AKSISemanticReasoning.answer(prompt);
          if (result && result.handled && !["unknown_concept", "unknown_relation"].includes(result.status)) {
            return {
              handled: true,
              version: String(root.AKSISemanticReasoning.version || "unknown"),
              route: "semantic-reasoning",
              statusText: "Ответ по локальному графу понятий; основания указаны в тексте.",
              text: result.text,
              proof: result.proof || [],
              semantic: result
            };
          }
          return root.AKSIAnswerRouter.answer(prompt, input && input.options || {});
        },
        verify: function (result) {
          return { ok: Boolean(result && result.handled === true && typeof result.text === "string" && result.text.trim()), detail: "Проверена структура вывода семантического модуля, не истинность определения или классификации." };
        }
      });
      root.AKSIAgent = agent;
      return { available: true };
    },
    health: async function () {
      return { ok: Boolean(root.AKSIAgent && typeof root.AKSIAgent.execute === "function" && typeof root.AKSIAgent.status === "function") };
    }
  });
  root.AKSIKernel = kernel;
  const recentEvents = [];

  function render(status, extra) {
    const panel = root.document && root.document.getElementById("aksiKernelStatus");
    if (!panel) return;
    const state = status.kernel.state;
    const moduleLines = status.modules.map(item =>
      item.id + " · " + item.state + (item.error ? " · " + item.error.message : "")
    );
    const limits = status.limits;
    panel.textContent =
      "СОСТОЯНИЕ ЯДРА: " + state.toUpperCase() + "\n" +
      "Версия API: " + status.kernel.version + "\n" +
      "Модули: " + status.modules.length + " · доступные возможности: " + status.capabilities.length + "\n" +
      "Задачи: выполняются " + status.tasks.running + " · в очереди " + status.tasks.queued + " · история " + status.tasks.total + "\n" +
      "Лимиты: одновременно " + limits.max_concurrent_tasks + " · очередь " + limits.max_queued_tasks +
      " · тайм-аут " + limits.default_timeout_ms + " мс · история до " + limits.max_task_history + "\n\n" +
      (moduleLines.length ? moduleLines.join("\n") : "Модули не зарегистрированы.") +
      (extra ? "\n\n" + extra : "") +
      (recentEvents.length ? "\n\nПОСЛЕДНИЕ СОБЫТИЯ (без содержимого пользовательских запросов):\n" + recentEvents.slice(-8).join("\n") : "") +
      "\n\nГРАНИЦЫ: это runtime-ядро внутри браузера, не отдельная загрузочная ОС. Оно не управляет ОС устройства, драйверами или памятью вне вкладки.";
  }

  kernel.subscribe(function (event) {
    recentEvents.push(event.at.slice(11, 19) + " · " + event.type);
    if (recentEvents.length > 20) recentEvents.shift();
    render(kernel.status());
  });
  function start() {
    kernel.boot().then(status => render(status)).catch(error => render(kernel.status(), "Ошибка запуска: " + error.message));
    const refresh = root.document.getElementById("aksiKernelHealth");
    if (refresh) refresh.addEventListener("click", function () {
      kernel.checkHealth().then(() => render(kernel.status(), "Проверка модулей завершена."));
    });
  }
  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(typeof window !== "undefined" ? window : globalThis);
