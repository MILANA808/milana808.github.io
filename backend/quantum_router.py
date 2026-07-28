"""
Quantum-inspired helpers (CLASSICAL simulation)

Honest limits:
- Grover-style search here is pedagogical O(√N) *iteration count* on small N,
  not hardware quantum speedup.
- Complexity classifier is heuristic + Bayesian-ish score update.
"""
from __future__ import annotations

import math
import random
from typing import Any, Dict, List, Sequence, Tuple


def classify_complexity(text: str) -> Dict[str, Any]:
    """Heuristic complexity → local vs delegate."""
    t = (text or "").strip()
    n = len(t)
    words = t.split()
    score = 0.0
    reasons: List[str] = []

    if n > 400:
        score += 0.35
        reasons.append("длинный запрос")
    if n > 1200:
        score += 0.2
    if any(w in t.lower() for w in ("докажи", "теорема", "оптимиз", "архитектур", "p2p", "федератив")):
        score += 0.25
        reasons.append("системная/теоретическая тема")
    if any(w in t.lower() for w in ("код", "патч", "рефактор", "bug", "ошибк")):
        score += 0.2
        reasons.append("код / отладка")
    if len(words) > 60:
        score += 0.15

    score = min(1.0, score)
    # Bayesian-ish: prior simple 0.6
    p_complex = 0.4 * score + 0.6 * (score ** 0.5)
    level = "simple" if p_complex < 0.35 else ("medium" if p_complex < 0.65 else "complex")
    route = "local" if level != "complex" else "consider_peer"

    return {
        "level": level,
        "score": round(p_complex, 4),
        "route": route,
        "reasons": reasons or ["базовая эвристика"],
        "note": "классификатор классический; не квантовый процессор",
    }


def grover_style_search(
    items: Sequence[str],
    query: str,
    max_iters: int | None = None,
) -> Dict[str, Any]:
    """
    Toy amplitude-amplification metaphor on classical scores.
    Real Grover needs oracle + quantum hardware; this demos √N iterations.
    """
    n = len(items)
    if n == 0:
        return {"matches": [], "iters": 0, "complexity": "O(1)", "note": "empty"}

    q = (query or "").lower()
    # classical relevance scores
    scores = []
    for i, it in enumerate(items):
        s = sum(1 for tok in q.split() if tok and tok in it.lower())
        scores.append((s, i, it))

    # number of oracle-ish probes ~ π/4 * √N
    ideal = max(1, int(math.pi / 4 * math.sqrt(n)))
    iters = min(n, max_iters or ideal)

    # amplify: repeatedly boost high scores (classical stand-in)
    weights = [1.0] * n
    for _ in range(iters):
        mean_w = sum(weights) / n
        for i in range(n):
            # diffusion-like: invert about mean, then boost if score>0
            weights[i] = mean_w - (weights[i] - mean_w)
            if scores[i][0] > 0:
                weights[i] = abs(weights[i]) + scores[i][0]

    ranked = sorted(
        [(weights[i], scores[i][0], items[i]) for i in range(n)],
        key=lambda x: (-x[0], -x[1]),
    )
    matches = [{"text": t, "weight": round(w, 4), "hits": h} for w, h, t in ranked[:5] if h > 0 or w > 0]

    return {
        "matches": matches,
        "iters": iters,
        "n": n,
        "complexity_classical_scan": f"O({n})",
        "complexity_grover_ideal": f"O(√{n})≈{ideal}",
        "note": "симуляция; ускорения железа нет",
    }


def ising_route_score(load: float, latency_ms: float, relevance: float) -> float:
    """Toy energy for routing (lower better) — classical stand-in for anneal."""
    # H ≈ a*load + b*latency - c*relevance
    return 1.2 * load + 0.01 * latency_ms - 1.5 * relevance


def pick_node_ising(nodes: List[Dict[str, Any]], skill: str = "chat") -> Dict[str, Any]:
    best = None
    best_e = float("inf")
    for n in nodes:
        if skill not in (n.get("skills") or []):
            continue
        e = ising_route_score(
            float(n.get("load") or 0),
            float(n.get("latency_ms") or 50),
            1.0 if skill in n.get("skills", []) else 0.3,
        )
        # small thermal noise
        e += random.uniform(-0.05, 0.05)
        if e < best_e:
            best_e = e
            best = n
    return {
        "chosen": best,
        "energy": None if best is None else round(best_e, 4),
        "note": "ising-inspired classical score, not quantum annealer",
    }
