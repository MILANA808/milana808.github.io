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
  root.AKSIKernel = kernel;

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
      "\n\nГРАНИЦЫ: это runtime-ядро внутри браузера, не отдельная загрузочная ОС. Оно не управляет ОС устройства, драйверами или памятью вне вкладки.";
  }

  kernel.subscribe(function (event) {
    if (event.type === "task.failed" || event.type === "module.failed" || event.type === "module.health") render(kernel.status());
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
