const DEFAULTS = Object.freeze({
  maxClaims: 100,
  maxEvidencePerClaim: 50,
  maxTextLength: 8000,
  maxTraceEvents: 1000
});

const cleanText = (value, max) => {
  if (typeof value !== "string") throw new TypeError("Expected text");
  const text = value.normalize("NFC").trim();
  if (!text) throw new TypeError("Text must not be empty");
  if (text.length > max) throw new RangeError("Text exceeds configured limit");
  return text;
};

const stableJSON = (value) => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJSON).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stableJSON(value[k])).join(",") + "}";
};

async function sha256(text) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) return null;
  const bytes = new TextEncoder().encode(text);
  const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export function createAKSICore(options = {}) {
  const limits = { ...DEFAULTS, ...options };
  for (const key of Object.keys(DEFAULTS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) {
      throw new RangeError(`Invalid limit: ${key}`);
    }
  }

  let trace = [];
  let head = "GENESIS";

  async function record(event) {
    if (trace.length >= limits.maxTraceEvents) throw new RangeError("Trace limit reached");
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new TypeError("Trace event must be an object");
    }
    const body = { sequence: trace.length + 1, previousHash: head, event };
    const hash = await sha256(stableJSON(body));
    const item = Object.freeze({ ...body, hash });
    trace.push(item);
    if (hash) head = hash;
    else head = "UNHASHED";
    return item;
  }

  async function evaluate(input) {
    if (!input || typeof input !== "object") throw new TypeError("Evaluation input required");
    const claim = cleanText(input.claim, limits.maxTextLength);
    const evidence = input.evidence ?? [];
    const contradictions = input.contradictions ?? [];
    if (!Array.isArray(evidence) || !Array.isArray(contradictions)) {
      throw new TypeError("Evidence and contradictions must be arrays");
    }
    if (evidence.length > limits.maxEvidencePerClaim ||
        contradictions.length > limits.maxEvidencePerClaim) {
      throw new RangeError("Evidence limit exceeded");
    }
    if (trace.length >= limits.maxClaims) throw new RangeError("Evaluation limit reached");

    const normalized = evidence.map((item, index) => {
      if (!item || typeof item !== "object") throw new TypeError(`Invalid evidence at index ${index}`);
      const supports = item.supports;
      if (![true, false, "unknown"].includes(supports)) {
        throw new TypeError("Evidence supports must be true, false, or unknown");
      }
      return {
        id: cleanText(String(item.id ?? `evidence-${index + 1}`), 200),
        text: cleanText(item.text, limits.maxTextLength),
        source: cleanText(String(item.source ?? "unspecified"), 500),
        observedAt: item.observedAt == null ? null : cleanText(String(item.observedAt), 100),
        supports
      };
    });

    const hasSupport = normalized.some(e => e.supports === true);
    const hasRefutation = normalized.some(e => e.supports === false) || contradictions.length > 0;
    let status;
    if (hasSupport && hasRefutation) status = "CONFLICTING_EVIDENCE";
    else if (hasRefutation) status = "REJECTED";
    else if (hasSupport) status = "SUPPORTED";
    else status = "INSUFFICIENT_EVIDENCE";

    const result = Object.freeze({
      schema: "aksi-evaluation-v1",
      claim,
      status,
      evidenceCount: normalized.length,
      supportingEvidenceCount: normalized.filter(e => e.supports === true).length,
      refutingEvidenceCount: normalized.filter(e => e.supports === false).length + contradictions.length,
      contradictionsCount: contradictions.length,
      evidence: normalized,
      limitations: [
        "Evidence annotations are caller-supplied and have not been independently verified.",
        "Status is rule-based, not a probability or proof of real-world truth."
      ]
    });
    await record({ type: "evaluation", result });
    return result;
  }

  function getTrace() {
    return trace.map(item => ({ ...item }));
  }

  async function verifyTrace() {
    if (!globalThis.crypto?.subtle) {
      return { verifiable: false, valid: null, reason: "Web Crypto SHA-256 unavailable" };
    }
    let previousHash = "GENESIS";
    for (let i = 0; i < trace.length; i++) {
      const item = trace[i];
      if (item.sequence !== i + 1 || item.previousHash !== previousHash) {
        return { verifiable: true, valid: false, reason: "Sequence or previous hash mismatch", index: i };
      }
      const { hash, ...body } = item;
      const expected = await sha256(stableJSON(body));
      if (expected !== hash) return { verifiable: true, valid: false, reason: "Hash mismatch", index: i };
      previousHash = hash;
    }
    return { verifiable: true, valid: true, events: trace.length, head: previousHash };
  }

  function reset() {
    trace = [];
    head = "GENESIS";
  }

  return Object.freeze({ evaluate, record, getTrace, verifyTrace, reset });
}

export const AKSI_STATUS = Object.freeze([
  "SUPPORTED",
  "INSUFFICIENT_EVIDENCE",
  "CONFLICTING_EVIDENCE",
  "REJECTED"
]);
