# AKSI-COUNTERFACTUAL/1

## Purpose

A reproducible, local-first scenario calculator for comparing user-defined alternatives under bounded uncertainty. It is not an AI model, forecast, or probability estimator.

## Input model

Each alternative has four scores in [0,100]: benefit, feasibility, cost, and risk. User weights are normalized to sum to one. If all weights are zero, equal weights are used.

## Utility function

`U(x,w) = benefit*w_benefit + feasibility*w_feasible - cost*w_cost - risk*w_risk`

Each score is independently perturbed by a seeded uniform draw in `[-100u, +100u]`, where `u` is the uncertainty fraction, then clamped to [0,100]. The winner is the first maximum in input order. The displayed win share is the fraction of simulations won by an alternative under this model; it is not a real-world probability.

## Sensitivity check

Each criterion weight is multiplied by 0.75 and 1.25 in separate runs, then all weights are renormalized. Stability is the fraction of these eight perturbations that retain the original top-ranked alternative. This is a small diagnostic, not a full sensitivity analysis.

## Receipt and integrity

The JSON receipt records input scores, normalized weights, seed, run count, uncertainty, simulation results, sensitivity results, and algorithm identifier. SHA-256 is computed over UTF-8 bytes of `JSON.stringify(receipt_without_integrity)`. It detects content changes relative to a known digest; it does not prove truth, authorship, or a trusted creation time. No digital signature is produced.

## Reproducibility caveats

The seeded PRNG and algorithm identifier are implementation details, not a cross-language standard. Exact reproduction requires the same implementation, input order, seed, run count, and floating-point semantics. The creation timestamp changes between runs. Do not compare receipts by their full-file hash if timestamps differ.

## Privacy and limits

The page performs calculations in the browser and makes no external API calls. A user can explicitly save a draft to localStorage; drafts are not encrypted. No personal or confidential information should be entered on a shared device.

## Intended use

Use the model to expose assumptions and compare alternatives. Validate inputs against evidence and real outcomes before using it for consequential decisions.
