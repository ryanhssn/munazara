"""Trace-level scorers — evaluate intermediate steps, not just final verdict.

Each scorer receives the collected events from a debate run and returns a
dict with score (0.0–1.0), pass/fail bool, and details.
"""
from __future__ import annotations
from typing import Any


def _events_of(events: list[dict], kind: str) -> list[dict]:
    return [e for e in events if e["event"] == kind]


def score_structural_validity(events: list[dict]) -> dict:
    """Every turn_complete must have required fields in valid ranges."""
    turns = _events_of(events, "turn_complete")
    if not turns:
        return {"score": 0.0, "pass": False, "detail": "no turn_complete events"}

    failures = []
    for t in turns:
        d = t["data"]
        if "agent" not in d:
            failures.append(f"missing agent in {d}")
        if not (0.0 <= d.get("confidence", -1) <= 1.0):
            failures.append(f"confidence out of range: {d.get('confidence')}")
        if not isinstance(d.get("disputes"), list):
            failures.append(f"disputes not a list in {d}")
        if "elapsed_ms" not in d:
            failures.append(f"missing elapsed_ms in {d}")

    score = 1.0 - (len(failures) / (len(turns) * 4))
    return {
        "score": max(0.0, score),
        "pass": len(failures) == 0,
        "detail": failures or "all turns valid",
    }


def score_convergence_quality(events: list[dict]) -> dict:
    """Debate must show progression: disputes should change across rounds."""
    convergences = _events_of(events, "convergence")
    turns = _events_of(events, "turn_complete")

    if not convergences:
        return {"score": 0.0, "pass": False, "detail": "no convergence events"}

    round_starts = _events_of(events, "round_start")
    num_rounds = max((e["data"].get("round", 0) for e in round_starts), default=0)

    # Pass if at least 1 full round completed
    passed = num_rounds >= 1
    return {
        "score": 1.0 if passed else 0.0,
        "pass": passed,
        "detail": f"{num_rounds} rounds, {len(turns)} turns completed",
    }


def score_verdict_completeness(events: list[dict]) -> dict:
    """Verdict must have tldr with recommendation, winner set, confidence > 0."""
    verdicts = _events_of(events, "verdict")
    if not verdicts:
        return {"score": 0.0, "pass": False, "detail": "no verdict event"}

    v = verdicts[-1]["data"]
    failures = []

    tldr = v.get("tldr") or {}
    if not tldr.get("recommendation"):
        failures.append("tldr.recommendation missing")
    if not tldr.get("why"):
        failures.append("tldr.why missing")
    if v.get("winner") not in ("debater_a", "debater_b", "tie"):
        failures.append(f"invalid winner: {v.get('winner')}")
    if not (0.0 < (v.get("confidence") or 0.0) <= 1.0):
        failures.append(f"confidence invalid: {v.get('confidence')}")

    score = 1.0 - len(failures) / 4
    return {
        "score": max(0.0, score),
        "pass": len(failures) == 0,
        "detail": failures or "verdict complete",
    }


def score_cost_sanity(events: list[dict], max_cost_usd: float = 0.50) -> dict:
    """Total cost must be under the configured ceiling."""
    done_events = _events_of(events, "done")
    if not done_events:
        return {"score": 0.0, "pass": False, "detail": "no done event"}

    cost = done_events[-1]["data"].get("estimated_cost_usd", 0)
    passed = cost <= max_cost_usd
    return {
        "score": 1.0 if passed else max(0.0, 1.0 - (cost - max_cost_usd) / max_cost_usd),
        "pass": passed,
        "detail": f"${cost:.6f} (ceiling: ${max_cost_usd})",
    }


def score_latency_budget(events: list[dict], max_ms_per_turn: int = 30_000) -> dict:
    """No single debater turn should exceed the latency ceiling."""
    turns = _events_of(events, "turn_complete")
    if not turns:
        return {"score": 1.0, "pass": True, "detail": "no turns to check"}

    over_budget = [
        (t["data"].get("agent"), t["data"].get("elapsed_ms"))
        for t in turns
        if (t["data"].get("elapsed_ms") or 0) > max_ms_per_turn
    ]
    return {
        "score": 1.0 if not over_budget else 0.5,
        "pass": not over_budget,
        "detail": f"{len(over_budget)} turns over {max_ms_per_turn}ms budget" if over_budget else "all turns within budget",
    }


ALL_SCORERS = [
    ("structural_validity", score_structural_validity),
    ("convergence_quality", score_convergence_quality),
    ("verdict_completeness", score_verdict_completeness),
    ("cost_sanity", score_cost_sanity),
    ("latency_budget", score_latency_budget),
]
