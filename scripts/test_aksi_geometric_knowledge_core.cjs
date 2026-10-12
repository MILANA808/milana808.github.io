const assert = require("node:assert/strict");
const { complex, mobius, invertCircle, eulerCharacteristic, diffuseGraph, sphericalProjection } = require("../aksi-geometric-knowledge-core.js");

const identity = { a: complex(1), b: complex(0), c: complex(0), d: complex(1) };
assert.deepEqual(mobius(complex(2, 3), identity), complex(2, 3), "identity Mobius map preserves a point");

const inversion = invertCircle(complex(2, 0), 2);
assert.ok(Math.abs(inversion.re - 2) < 1e-9 && Math.abs(inversion.im) < 1e-9, "point on inversion circle stays fixed");
assert.deepEqual(invertCircle(complex(0, 0), 2), { infinity: true }, "circle center maps to infinity");

const projected = sphericalProjection(complex(1, 0));
assert.ok(Math.abs(projected.x - 1) < 1e-9);
assert.ok(Math.abs(projected.y) < 1e-9);
assert.ok(Math.abs(projected.z) < 1e-9);

assert.equal(eulerCharacteristic(4, 6, 4), 2, "tetrahedron-like convex polyhedron has Euler characteristic 2");
assert.notEqual(eulerCharacteristic(3, 2, 0), 2, "Euler characteristic is not forced to equal 2 for arbitrary counts");

const graph = {
  nodes: ["a", "b", "c"],
  edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }]
};
const result = diffuseGraph(graph, { a: 1, b: 0, c: 0 }, { alpha: 0.4, steps: 10 });
assert.ok(Math.abs(result.totalMass - 1) < 1e-9, "diffusion preserves normalized total mass");
assert.ok(result.scores.b > 0, "seed mass propagates through graph edges");
assert.ok(result.scores.c > 0, "mass propagates over multiple steps");

const isolated = diffuseGraph({ nodes: ["solo"], edges: [] }, { solo: 3 }, { steps: 3 });
assert.equal(isolated.scores.solo, 1, "isolated node retains normalized mass");

assert.throws(() => invertCircle(complex(0), 0), /radius/);
assert.throws(() => diffuseGraph(graph, { a: -1 }), /non-negative/);
assert.throws(() => diffuseGraph({ nodes: ["a", "a"], edges: [] }, {}), /unique/);

console.log("AKSI Geometric Knowledge Core: all tests passed.");
