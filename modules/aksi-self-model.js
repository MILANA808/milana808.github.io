/* AKSI Self Model 0.1.0
 * A factual, runtime-derived description of the capabilities and limits that
 * are actually registered in the current browser session. No consciousness claims.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSISelfModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "0.1.0";
  const LIMITATIONS = Object.freeze([
    "Это программная система в браузере, а не самостоятельная операционная система.",
    "Наличие действия и успешная проверка его формата не доказывают истинность ответа.",
    "Модель не обладает подтверждённым сознанием, собственными желаниями или самосознанием.",
    "Она не может менять собственный код во время выполнения; изменения проходят через разработку и проверку.",
    "Возможности зависят от реально загруженных модулей, доступной сети и разрешений пользователя."
  ]);
  function create(providers) {
    const source = providers || {};
    if (typeof source.getKernelStatus !== "function" || typeof source.getAgentStatus !== "function") {
      throw new TypeError("Self model requires runtime status providers");
    }
    function inspect() {
      const kernel = source.getKernelStatus() || {};
      const agent = source.getAgentStatus() || {};
      const modules = Array.isArray(kernel.modules) ? kernel.modules.map(item => ({
        id: String(item.id || "unknown"),
        version: String(item.version || "unknown"),
        state: String(item.state || "unknown"),
        capabilities: Array.isArray(item.capabilities) ? item.capabilities.map(String) : []
      })) : [];
      const actions = Array.isArray(agent.registered_actions) ? agent.registered_actions.map(item => ({
        id: String(item.id || "unknown"),
        requires_approval: item.requires_approval === true,
        verifiable: item.verifiable === true
      })) : [];
      const availableModules = modules.filter(item => item.state === "available");
      const degradedModules = modules.filter(item => item.state === "degraded");
      return {
        schema: "aksi-self-model/1.0",
        version: VERSION,
        identity: { name: "AKSI MATRIX", kind: "browser-first experimental AI system" },
        runtime: {
          state: String(kernel.kernel && kernel.kernel.state || "unknown"),
          kernel_version: String(kernel.kernel && kernel.kernel.version || "unknown"),
          modules_total: modules.length,
          modules_available: availableModules.length,
          modules_degraded: degradedModules.length,
          actions_registered: actions.length
        },
        modules,
        actions,
        declared_capabilities: [...new Set(modules.flatMap(item => item.capabilities))].sort(),
        capabilities: [...new Set(availableModules.flatMap(item => item.capabilities))].sort(),
        limitations: LIMITATIONS.slice()
      };
    }
    function describe(report) {
      const data = report || inspect();
      const moduleText = data.modules.length
        ? data.modules.map(item => "- " + item.id + " (" + item.version + "): " + item.state).join("\n")
        : "- Сведения о модулях пока недоступны.";
      const actionText = data.actions.length
        ? data.actions.map(item => "- " + item.id + (item.requires_approval ? " — требуется подтверждение" : "") + (item.verifiable ? " — есть проверка результата" : " — без валидатора")).join("\n")
        : "- Зарегистрированные действия не обнаружены.";
      return [
        "Я — AKSI MATRIX: экспериментальная browser-first AI-система.",
        "Состояние runtime: " + data.runtime.state + ". Модули: " + data.runtime.modules_available + "/" + data.runtime.modules_total + " доступны; действий: " + data.runtime.actions_registered + ".",
        "",
        "Зарегистрированные модули:",
        moduleText,
        "",
        "Действия агента:",
        actionText,
        "",
        "Ограничения:",
        data.limitations.map(item => "- " + item).join("\n")
      ].join("\n");
    }
    return Object.freeze({ version: VERSION, inspect, describe });
  }
  return Object.freeze({ version: VERSION, create });
});
