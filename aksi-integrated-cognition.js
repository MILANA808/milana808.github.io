/*!
 * AKSI Integrated Cognition Runtime v0.1.0
 * Connects the bounded evidence graph and Russian claim bridge to durable,
 * explicit user-controlled browser storage and the homepage dialogue.
 * This is deterministic symbolic functionality, not general intelligence.
 */
(function (root) {
  "use strict";
  const VERSION = "0.1.0";
  const STORAGE_KEY = "aksi-cognition-graph-v1";
  const MAX_PERSISTED = 5000;

  function create(options) {
    options = options || {};
    const storage = options.storage || (root && root.localStorage) || null;
    const kernelApi = options.kernelApi || root.AKSIEvidenceKernel;
    const bridgeApi = options.bridgeApi || root.AKSILanguageClaimBridge;
    if (!kernelApi || typeof kernelApi.createEvidenceKernel !== "function") {
      throw new Error("AKSI Evidence Kernel is not loaded");
    }
    if (!bridgeApi || typeof bridgeApi.createBridge !== "function") {
      throw new Error("AKSI Language Claim Bridge is not loaded");
    }
    const kernel = kernelApi.createEvidenceKernel({ maxClaims: MAX_PERSISTED });
    const bridge = bridgeApi.createBridge(kernel);
    let persistence = "memory-only";
    let persistenceError = null;

    function persist() {
      if (!storage || typeof storage.setItem !== "function") {
        persistence = "memory-only";
        return false;
      }
      try {
        const snapshot = kernel.snapshot();
        storage.setItem(STORAGE_KEY, JSON.stringify({
          schema: "AKSI-COGNITION-STORE/1",
          version: VERSION,
          claims: snapshot.claims.slice(-MAX_PERSISTED)
        }));
        persistence = "local-storage";
        persistenceError = null;
        return true;
      } catch (error) {
        persistence = "memory-only";
        persistenceError = String(error && error.message || error);
        return false;
      }
    }

    function restore() {
      if (!storage || typeof storage.getItem !== "function") return;
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved || saved.schema !== "AKSI-COGNITION-STORE/1" || !Array.isArray(saved.claims)) return;
        saved.claims.slice(-MAX_PERSISTED).forEach(claim => {
          try {
            kernel.addClaim({
              id: claim.id, subject: claim.subject, predicate: claim.predicate,
              object: claim.object, truth: claim.truth, confidence: claim.confidence,
              kind: claim.kind, source: claim.source, observedAt: claim.observedAt || undefined
            });
          } catch (_) { /* Ignore malformed/duplicate records; preserve valid entries. */ }
        });
        persistence = "local-storage";
      } catch (error) {
        persistenceError = String(error && error.message || error);
      }
    }

    restore();

    function ingest(text) {
      const result = bridge.ingest(text);
      if (result.accepted) {
        const durable = persist();
        return {
          accepted: true,
          claim: result.stored,
          count: kernel.size,
          persisted: durable,
          message: "Записала пользовательское утверждение. Это сохранённый ввод, а не независимо проверенный факт."
        };
      }
      if (result.requiresReview) {
        return {
          accepted: false,
          requiresReview: true,
          message: "Распознала гипотезу, но не добавила её в базу знаний автоматически."
        };
      }
      return { accepted: false, reason: result.parsed && result.parsed.reason || "not_recognized" };
    }

    function parseQuestion(text) {
      const input = String(text || "").normalize("NFKC").trim()
        .replace(/[?!.]+$/g, "").replace(/\s+/g, " ");
      const patterns = [
        /^является ли\s+(.+?)\s+(.+)$/i,
        /^верно ли что\s+(.+?)\s+(?:это|является)\s+(.+)$/i,
        /^(.+?)\s+(?:это|является)\s+(.+)$/i
      ];
      for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1].trim() && match[2].trim()) {
          return { subject: match[1].trim(), predicate: "is_a", object: match[2].trim() };
        }
      }
      return null;
    }

    function answer(text) {
      const pattern = parseQuestion(text);
      if (!pattern) return { handled: false };
      let result;
      try { result = kernel.explain(pattern); }
      catch (_) { return { handled: false }; }
      const claimLines = result.evidence.map(item =>
        "• " + item.subject + (item.truth ? " — это " : " — не является ") +
        item.object + " [источник: " + item.source + "; ID: " + item.id + "]"
      );
      const derivationLines = result.derivations.map(item =>
        "• Вывод по правилу транзитивности is_a; основания: " +
        item.premises.join(" → ") + "; уверенность перенесена как минимум по цепочке."
      );
      const statusText = {
        supported: "СВЯЗЬ ПОДДЕРЖАНА СОХРАНЁННЫМИ УТВЕРЖДЕНИЯМИ",
        refuted: "ЕСТЬ СОХРАНЁННОЕ ПРОТИВОПОЛОЖНОЕ УТВЕРЖДЕНИЕ",
        conflicted: "ОБНАРУЖЕНО ПРОТИВОРЕЧИЕ",
        unknown: "НЕДОСТАТОЧНО ДАННЫХ"
      }[result.status];
      const textOut = statusText + "\n" +
        (result.status === "supported" ? "В текущем графе есть путь подтверждения." :
         result.status === "refuted" ? "В графе есть отрицательное утверждение." :
         result.status === "conflicted" ? "В графе одновременно есть положительная и отрицательная записи." :
         "В сохранённой базе нет достаточного основания. Это не означает, что утверждение ложно.") +
        (claimLines.length ? "\n\nЗаписи:\n" + claimLines.join("\n") : "") +
        (derivationLines.length ? "\n\nХод вывода:\n" + derivationLines.join("\n") : "") +
        "\n\nГраница достоверности: база содержит пользовательские утверждения; AKSI не проверила их во внешнем мире.";
      return {
        handled: true, status: result.status, text: textOut,
        proof: result.evidence.concat(result.derivations),
        graphSize: kernel.size
      };
    }

    function status() {
      return {
        version: VERSION, claims: kernel.size, persistence,
        persistenceError, inference: "bounded transitive is_a",
        limitations: ["user assertions are not independently verified", "no general Russian language understanding", "no autonomous web research"]
      };
    }

    return Object.freeze({ version: VERSION, ingest, answer, status, snapshot: () => kernel.snapshot() });
  }

  const api = Object.freeze({ version: VERSION, create });
  root.AKSIIntegratedCognition = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
