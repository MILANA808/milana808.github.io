(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSISemanticProofValidator = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const VERSION = "0.1.0";

  function stable(value) {
    if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
    if (value && typeof value === "object") {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
    }
    return JSON.stringify(value);
  }

  function validate(prompt, result, engine) {
    if (!engine || typeof engine.answer !== "function") {
      return { ok: false, status: "validator_unavailable", detail: "Семантический движок недоступен для независимого пересчёта." };
    }
    if (!result || result.handled !== true || typeof result.status !== "string" ||
        typeof result.text !== "string" || !result.text.trim() || !Array.isArray(result.proof)) {
      return { ok: false, status: "invalid_result_shape", detail: "Ответ не содержит обязательной структуры и массива оснований." };
    }
    let recomputed;
    try { recomputed = engine.answer(String(prompt == null ? "" : prompt)); }
    catch (_) { return { ok: false, status: "recomputation_failed", detail: "Повторный расчёт основания завершился ошибкой." }; }
    if (!recomputed || recomputed.handled !== true) {
      return { ok: false, status: "not_reproducible", detail: "Движок не воспроизвёл семантический ответ для исходного запроса." };
    }
    const fields = ["status", "text", "proof"];
    for (const field of fields) {
      if (stable(result[field]) !== stable(recomputed[field])) {
        return { ok: false, status: "proof_mismatch", field, detail: "Повторный расчёт не совпал с ответом по полю «" + field + "»." };
      }
    }
    return {
      ok: true,
      status: "recomputed",
      detail: "Статус, текст и цепочка оснований побайтно воспроизведены тем же детерминированным семантическим движком.",
      proof_count: recomputed.proof.length,
      engine_version: engine.version || "unknown"
    };
  }

  return Object.freeze({ version: VERSION, validate, stable });
});
