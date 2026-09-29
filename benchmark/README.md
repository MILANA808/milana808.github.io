# AKSI Verification Benchmark v0.1

This benchmark is deliberately narrow. It does not claim to measure general intelligence.

Hypothesis:
AKSI should distinguish claims supported by supplied evidence from claims that are not.

Metrics:
- claim_count — extracted claims.
- supported — deterministic lexical support >= 0.55.
- partial — support from 0.28 to <0.55.
- unsupported — support <0.28.
- coverage = (supported + 0.5 * partial) / claim_count.

This is a verification signal, not a truth oracle. A bad source can support a false claim; paraphrases can also be missed.

Required experiment:
1. Baseline: agent final answer without AKSI verification.
2. AKSI: same answer + supplied evidence + independent verifier.

Record for every task:
claims, supported, partial, unsupported, false-supported claims, false-unsupported claims, completion status, time, and human interventions.

Anti-cheating rules:
- Freeze the task set before running.
- Do not change thresholds after seeing results.
- Keep baseline and AKSI outputs.
- Keep source URLs and text snapshots.
- Do not count a hash as proof of truth.
- Do not allow the verifier to rewrite the answer before measurement.

Minimum first experiment:
10 fixed tasks: 4 factual, 2 conflicting-source, 2 multi-step web, 2 action/result verification.

A null result is valid. The goal is measurement, not a marketing score.
