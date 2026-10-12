/*!
 * AKSI Wave-Bayesian Engine v0.1.0
 * CPU-only deterministic intent routing using Fourier-style features and Bayesian normalization.
 * This is a classical signal-processing simulation, not a quantum computer or a language model.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSIWaveBayesianEngine = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_INTENTS = [
    { id: "greeting", label: "Приветствие", examples: ["привет", "здравствуй", "доброе утро", "добрый день", "hello", "hi"] },
    { id: "identity", label: "AKSI", examples: ["кто ты", "что такое акси", "расскажи об aksi", "aksi matrix", "акси"] },
    { id: "math", label: "Математика", examples: ["посчитай", "реши пример", "математика", "сколько будет", "calculate", "solve equation"] },
    { id: "code", label: "Программирование", examples: ["напиши код", "ошибка в коде", "javascript", "python", "программирование", "исправь программу"] },
    { id: "evidence", label: "Проверка утверждения", examples: ["проверь факт", "найди доказательства", "это правда", "опровергни утверждение", "источники и доказательства"] },
    { id: "memory", label: "Память", examples: ["запомни это", "что ты помнишь", "сохрани информацию", "вспомни прошлый разговор"] }
  ];

  function hash32(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function tokens(text) {
    return String(text || "").toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];
  }

  function featureVector(text, dimensions) {
    const vector = new Array(dimensions * 2).fill(0);
    const words = tokens(text);
    if (!words.length) return vector;
    for (const word of words) {
      const h = hash32(word);
      const bin = h % dimensions;
      const omega = 2 * Math.PI * ((h >>> 8) % 10007) / 10007;
      vector[bin * 2] += Math.cos(omega);
      vector[bin * 2 + 1] += Math.sin(omega);
    }
    let norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (norm > 0) for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    return vector;
  }

  function dot(a, b) {
    let total = 0;
    for (let i = 0; i < a.length; i++) total += a[i] * b[i];
    return total;
  }

  function softmax(scores, temperature) {
    const t = Math.max(0.01, temperature);
    const values = scores.map(s => s / t);
    const peak = Math.max(...values);
    const exps = values.map(v => Math.exp(v - peak));
    const total = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / total);
  }

  class AKSIWaveBayesianEngine {
    constructor(options = {}) {
      this.dimensions = Number.isInteger(options.dimensions) ? Math.max(16, options.dimensions) : 128;
      this.temperature = Number.isFinite(options.temperature) ? options.temperature : 0.18;
      this.minScore = Number.isFinite(options.minScore) ? options.minScore : 0.12;
      this.minMargin = Number.isFinite(options.minMargin) ? options.minMargin : 0.035;
      this.intents = (options.intents || DEFAULT_INTENTS).map(intent => {
        if (!intent || typeof intent.id !== "string" || !Array.isArray(intent.examples) || !intent.examples.length) {
          throw new TypeError("Each intent needs an id and at least one example.");
        }
        const examples = intent.examples.map(String);
        const vectors = examples.map(example => featureVector(example, this.dimensions));
        const centroid = new Array(this.dimensions * 2).fill(0);
        for (const v of vectors) for (let i = 0; i < v.length; i++) centroid[i] += v[i] / vectors.length;
        const norm = Math.sqrt(dot(centroid, centroid)) || 1;
        for (let i = 0; i < centroid.length; i++) centroid[i] /= norm;
        return { id: intent.id, label: intent.label || intent.id, prior: Number.isFinite(intent.prior) && intent.prior > 0 ? intent.prior : 1, centroid };
      });
      if (!this.intents.length) throw new TypeError("At least one intent is required.");
    }

    analyze(input) {
      const text = String(input || "").trim();
      if (!text) return { accepted: false, intent: null, label: "Недостаточно данных", score: 0, posterior: [], reason: "empty_input", method: "classical_fourier_features+bayesian_normalization" };
      const vector = featureVector(text, this.dimensions);
      const raw = this.intents.map(intent => {
        const similarity = Math.max(-1, Math.min(1, dot(vector, intent.centroid)));
        return { id: intent.id, label: intent.label, similarity, prior: intent.prior };
      });
      // Similarities provide likelihood-like scores; these are not calibrated truth probabilities.
      const posterior = softmax(raw.map(item => item.similarity + Math.log(item.prior)), this.temperature);
      const ranked = raw.map((item, index) => ({ ...item, posterior: posterior[index] })).sort((a, b) => b.posterior - a.posterior);
      const best = ranked[0];
      const margin = best.posterior - (ranked[1] ? ranked[1].posterior : 0);
      const accepted = best.similarity >= this.minScore && margin >= this.minMargin;
      return {
        accepted,
        intent: accepted ? best.id : null,
        label: accepted ? best.label : "Неопределённый интент",
        score: Number(best.similarity.toFixed(6)),
        margin: Number(margin.toFixed(6)),
        posterior: ranked.map(item => ({ id: item.id, label: item.label, similarity: Number(item.similarity.toFixed(6)), posterior: Number(item.posterior.toFixed(6)) })),
        reason: accepted ? "best_match_above_threshold" : "low_similarity_or_ambiguous",
        method: "classical_fourier_features+bayesian_normalization",
        limitations: ["Классификатор выбирает только среди заданных интентов.", "posterior — нормализованный модельный балл, а не вероятность истинности утверждения.", "Это не квантовое вычисление и не генеративная языковая модель."]
      };
    }
  }

  return { AKSIWaveBayesianEngine, featureVector, DEFAULT_INTENTS };
});
