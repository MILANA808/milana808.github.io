(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIEvidencePassport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    return "{" + Object.keys(value).sort().map((key) =>
      JSON.stringify(key) + ":" + canonical(value[key])
    ).join(",") + "}";
  }

  function hex(buffer) {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function sha256(value) {
    if (!globalThis.crypto?.subtle) throw new Error("WebCrypto SHA-256 недоступен в этом контексте.");
    return hex(await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(value))));
  }

  async function create(input = {}) {
    const payload = {
      schema: "aksi-evidence-passport/1.0",
      created_at: new Date().toISOString(),
      request: String(input.request || "").slice(0, 8000),
      answer: String(input.answer || "").slice(0, 20000),
      execution: {
        provider: String(input.provider || "unknown"),
        model: input.model ? String(input.model) : null,
        app_version: String(input.appVersion || "AKSI MATRIX"),
      },
      sources: Array.isArray(input.sources) ? input.sources.slice(0, 30).map((source) => ({
        title: String(source.title || "").slice(0, 300),
        url: String(source.url || "").slice(0, 2000),
        retrieved_at: source.retrieved_at || null,
      })) : [],
      observed_steps: Array.isArray(input.trace) ? input.trace.slice(-50).map((step) => ({
        sequence: Number.isFinite(Number(step.sequence)) ? Number(step.sequence) : null,
        type: String(step.type || "event").slice(0, 100),
        generator: String(step.generator || "").slice(0, 100),
        evidence_status: String(step.evidenceStatus || step.evidence_status || "").slice(0, 100),
        at: step.at || null,
      })) : [],
      verification_scope: {
        digest: "SHA-256 over canonical passport payload",
        proves: "integrity of this exported record after creation",
        does_not_prove: ["truth of the answer", "correctness of reasoning", "identity of the model operator"],
      },
      reasoning: {
        included: false,
        note: "Private internal chain-of-thought is not collected. This passport records observable inputs, output, provider metadata and source references only.",
      },
    };
    return { ...payload, integrity: { algorithm: "SHA-256", digest: await sha256(payload) } };
  }

  async function verify(passport) {
    if (!passport || !passport.integrity || passport.integrity.algorithm !== "SHA-256") {
      return { valid: false, reason: "Unsupported or missing integrity record." };
    }
    const payload = { ...passport };
    delete payload.integrity;
    const digest = await sha256(payload);
    return { valid: digest === passport.integrity.digest, expected: passport.integrity.digest, actual: digest };
  }

  return { canonical, sha256, create, verify, version: "1.0.0" };
});
