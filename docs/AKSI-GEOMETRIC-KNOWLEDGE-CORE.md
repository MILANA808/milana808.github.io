# AKSI Geometric Knowledge Core (CPU)

This experimental module implements small, classical geometry and graph algorithms in dependency-free JavaScript.

## Included primitives

- **Complex/projective geometry:** a Möbius transform and stereographic projection to the Riemann sphere.
- **Circle inversion:** (z' = c + R^2(z-c)/|z-c|^2), with the center represented explicitly as the point at infinity.
- **Graph topology:** Euler characteristic calculation (V-E+F). The caller must establish whether a planar/polyhedral embedding satisfies the theorem's assumptions.
- **Graph diffusion:** weighted, undirected propagation of normalized seed scores with a mass-preserving update under the implemented assumptions.

## Explicit non-claims

- These operations do not infer meaning from geometry automatically.
- Euler's formula does not make an arbitrary knowledge graph a convex polyhedron or guarantee truth.
- Diffusion produces relevance scores, not evidence that a proposition is true.
- Circle inversion does not separate superficial from deep meaning without a separately validated criterion.
- The module does not train a language model, perform quantum computation, or guarantee lower energy use.
- It is CPU-compatible, but speed and power use must be measured on target devices.

## Test

```sh
node scripts/test_aksi_geometric_knowledge_core.cjs
```

## Validation plan

Before wiring this into the public UI, benchmark on a labeled graph/query dataset and compare with simple baselines: keyword overlap, cosine similarity, and non-diffused seed ranking. Record ranking quality, latency, memory, and abstention/uncertainty behavior.
