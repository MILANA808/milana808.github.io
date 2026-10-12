/*!
 * AKSI Geometric Knowledge Core v0.1.0
 * CPU-only classical geometry and graph-diffusion primitives.
 * Not a quantum computer, truth oracle, or language model.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AKSIGeometricKnowledgeCore = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPS = 1e-12;

  function complex(re, im = 0) {
    if (!Number.isFinite(re) || !Number.isFinite(im)) throw new TypeError("Complex coordinates must be finite.");
    return { re, im };
  }

  function mobius(z, coefficients) {
    const { a, b, c, d } = coefficients || {};
    for (const k of ["a", "b", "c", "d"]) {
      if (!coefficients || !coefficients[k] || !Number.isFinite(coefficients[k].re) || !Number.isFinite(coefficients[k].im)) {
        throw new TypeError("Mobius coefficients a, b, c, d must be finite complex numbers.");
      }
    }
    const mul = (x, y) => complex(x.re * y.re - x.im * y.im, x.re * y.im + x.im * y.re);
    const add = (x, y) => complex(x.re + y.re, x.im + y.im);
    const sub = (x, y) => complex(x.re - y.re, x.im - y.im);
    const div = (x, y) => {
      const den = y.re * y.re + y.im * y.im;
      if (den < EPS) return { infinity: true };
      return complex((x.re * y.re + x.im * y.im) / den, (x.im * y.re - x.re * y.im) / den);
    };
    const numerator = add(mul(a, z), b);
    const denominator = add(mul(c, z), d);
    return div(numerator, denominator);
  }

  // Inversion in a circle: z' = center + R^2 * (z-center) / |z-center|^2.
  // The center maps to infinity, represented explicitly rather than as NaN/Infinity coordinates.
  function invertCircle(z, radius, center = complex(0, 0)) {
    if (!Number.isFinite(radius) || radius <= 0) throw new RangeError("radius must be positive and finite.");
    const dx = z.re - center.re;
    const dy = z.im - center.im;
    const r2 = dx * dx + dy * dy;
    if (r2 < EPS) return { infinity: true };
    const scale = radius * radius / r2;
    return complex(center.re + scale * dx, center.im + scale * dy);
  }

  function eulerCharacteristic(vertices, edges, faces) {
    for (const [name, value] of Object.entries({ vertices, edges, faces })) {
      if (!Number.isInteger(value) || value < 0) throw new RangeError(name + " must be a non-negative integer.");
    }
    return vertices - edges + faces;
  }

  /*
   * Diffusion on a finite undirected weighted graph.
   * Each step preserves total mass up to floating-point error when the graph is
   * undirected, weights are non-negative, and alpha is in [0, 1].
   * This does not require or imply Euler characteristic = 2.
   */
  function diffuseGraph(graph, seedScores, options = {}) {
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) throw new TypeError("graph.nodes and graph.edges are required.");
    const alpha = options.alpha === undefined ? 0.35 : options.alpha;
    const steps = options.steps === undefined ? 8 : options.steps;
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) throw new RangeError("alpha must be between 0 and 1.");
    if (!Number.isInteger(steps) || steps < 0 || steps > 10000) throw new RangeError("steps must be an integer from 0 to 10000.");

    const ids = graph.nodes.map(n => typeof n === "string" ? n : n && n.id);
    if (ids.some(id => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) throw new TypeError("Nodes need unique non-empty string ids.");
    const known = new Set(ids);
    const adjacency = new Map(ids.map(id => [id, []]));
    for (const edge of graph.edges) {
      if (!edge || !known.has(edge.from) || !known.has(edge.to)) throw new TypeError("Every edge must reference existing nodes.");
      const weight = edge.weight === undefined ? 1 : edge.weight;
      if (!Number.isFinite(weight) || weight < 0) throw new RangeError("Edge weights must be finite and non-negative.");
      if (edge.from === edge.to || weight === 0) continue;
      adjacency.get(edge.from).push({ id: edge.to, weight });
      adjacency.get(edge.to).push({ id: edge.from, weight });
    }

    let scores = ids.map(id => {
      const v = seedScores && seedScores[id] !== undefined ? seedScores[id] : 0;
      if (!Number.isFinite(v) || v < 0) throw new RangeError("Seed scores must be finite and non-negative.");
      return v;
    });
    const totalBefore = scores.reduce((sum, v) => sum + v, 0);
    if (totalBefore > 0) scores = scores.map(v => v / totalBefore);

    for (let step = 0; step < steps; step++) {
      const next = scores.map(v => (1 - alpha) * v);
      ids.forEach((id, i) => {
        const neighbors = adjacency.get(id);
        const degree = neighbors.reduce((sum, e) => sum + e.weight, 0);
        if (degree > 0) {
          for (const edge of neighbors) {
            const j = ids.indexOf(edge.id);
            next[j] += alpha * scores[i] * edge.weight / degree;
          }
        } else {
          next[i] += alpha * scores[i];
        }
      });
      const sum = next.reduce((a, b) => a + b, 0);
      scores = sum > 0 ? next.map(v => v / sum) : next;
    }
    return {
      scores: Object.fromEntries(ids.map((id, i) => [id, Number(scores[i].toFixed(12))])),
      totalMass: Number(scores.reduce((a, b) => a + b, 0).toFixed(12)),
      steps,
      alpha,
      method: "classical_weighted_graph_diffusion",
      limitations: ["Diffusion ranks graph nodes; it does not establish truth.", "Euler's formula applies only when the graph has the required planar/polyhedral embedding assumptions.", "Results depend on graph construction and edge weights."]
    };
  }

  function sphericalProjection(z) {
    const r2 = z.re * z.re + z.im * z.im;
    const denominator = 1 + r2;
    return { x: 2 * z.re / denominator, y: 2 * z.im / denominator, z: (r2 - 1) / denominator };
  }

  return { complex, mobius, invertCircle, eulerCharacteristic, diffuseGraph, sphericalProjection };
});
