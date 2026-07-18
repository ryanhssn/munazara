"""Offline eval runner.

Usage:
    uv run python -m evals.runner

Runs each fixture through the debate graph with mocked LLM providers,
collects SSE events, and applies all scorers. Prints a scored report.
Real LLM calls are NOT made — this validates structural behaviour and
convergence logic, not LLM quality.

To run against real LLMs (slower, costs money):
    uv run python -m evals.runner --real
"""
import asyncio
import json
import sys
from unittest.mock import AsyncMock, MagicMock

from dotenv import load_dotenv
load_dotenv()

from evals.fixtures import FIXTURES
from evals.scorers import ALL_SCORERS
from app.schemas import DebaterOutput, Verdict, TldrBlock, UnresolvedDispute
from app.streaming import DebateRequest, run_debate_stream


def _make_mock_model(debater_output=None, verdict_output=None):
    """Build a mock model returning a pre-baked structured output."""
    def _wrapped_output(schema, **_):
        target = debater_output if debater_output is not None else verdict_output
        chain = MagicMock()
        chain.ainvoke = AsyncMock(return_value={
            "parsed": target,
            "raw": MagicMock(usage_metadata={"input_tokens": 50, "output_tokens": 100}),
            "parsing_error": None,
        })
        return chain

    model = MagicMock()
    model.with_structured_output = _wrapped_output
    return model


def _make_fixtures_mocks():
    """One debater model + one judge model, reused for all fixtures."""
    debater_out = DebaterOutput(
        title="My structured position",
        position="Position text for this round.",
        concessions=["Opponent raised a valid point about cost."],
        disputes=[],
        confidence=0.85,
    )
    judge_out = Verdict(
        tldr=TldrBlock(
            recommendation="Proceed cautiously with a pilot.",
            why="Both sides agree on fundamentals but differ on risk tolerance.",
            confidence=0.78,
        ),
        agreements=["Both agree documentation matters"],
        unresolved_disputes=[
            UnresolvedDispute(
                topic="Operational risk",
                a_position="High risk",
                b_position="Manageable risk",
                ruling="Manageable with guardrails",
                reasoning="Evidence supports structured rollout",
            )
        ],
        confidence=0.78,
        winner="tie",
    )
    debater_model = _make_mock_model(debater_output=debater_out)
    judge_model = _make_mock_model(verdict_output=judge_out)
    return debater_model, judge_model


async def _run_fixture(fixture: dict, use_real: bool = False) -> list[dict]:
    req = DebateRequest(
        question=fixture["question"],
        tier=fixture["tier"],
        max_rounds=fixture["max_rounds"],
        debater_a_vendor="anthropic",
        debater_b_vendor="google",
        judge_vendor="openai",
    )

    events: list[dict] = []

    if use_real:
        async for ev in run_debate_stream(req):
            events.append(ev)
        return events

    debater_model, judge_model = _make_fixtures_mocks()

    from unittest.mock import patch
    with (
        patch("app.providers.anthropic.get_model", return_value=debater_model),
        patch("app.providers.google.get_model", return_value=debater_model),
        patch("app.providers.openai.get_model", return_value=judge_model),
    ):
        async for ev in run_debate_stream(req):
            events.append(ev)

    return events


def _print_report(results: list[dict]) -> bool:
    all_passed = True
    print("\n" + "=" * 60)
    print("MUNAZARA EVAL REPORT")
    print("=" * 60)

    for result in results:
        fid = result["fixture_id"]
        scores = result["scores"]
        print(f"\n▶ {fid}: {result['question'][:50]}")

        fixture_passed = True
        for name, score_result in scores.items():
            icon = "✓" if score_result["pass"] else "✗"
            detail = score_result["detail"]
            print(f"  {icon} {name:<25} score={score_result['score']:.2f}  {detail}")
            if not score_result["pass"]:
                fixture_passed = False

        overall = "PASS" if fixture_passed else "FAIL"
        print(f"  → {overall}")
        if not fixture_passed:
            all_passed = False

    print("\n" + "=" * 60)
    final = "ALL PASSED" if all_passed else "SOME FAILED"
    print(f"RESULT: {final}")
    print("=" * 60 + "\n")
    return all_passed


async def main(use_real: bool = False):
    results = []
    for fixture in FIXTURES:
        print(f"Running: {fixture['id']}...", end=" ", flush=True)
        try:
            events = await _run_fixture(fixture, use_real=use_real)
            scores = {}
            for name, scorer in ALL_SCORERS:
                if name == "cost_sanity":
                    scores[name] = scorer(events, max_cost_usd=fixture["expect"]["max_cost_usd"])
                else:
                    scores[name] = scorer(events)
            results.append({
                "fixture_id": fixture["id"],
                "question": fixture["question"],
                "scores": scores,
            })
            print("done")
        except Exception as exc:
            print(f"ERROR: {exc}")
            results.append({
                "fixture_id": fixture["id"],
                "question": fixture["question"],
                "scores": {name: {"score": 0.0, "pass": False, "detail": str(exc)} for name, _ in ALL_SCORERS},
            })

    passed = _print_report(results)
    return 0 if passed else 1


if __name__ == "__main__":
    use_real = "--real" in sys.argv
    exit_code = asyncio.run(main(use_real=use_real))
    sys.exit(exit_code)
