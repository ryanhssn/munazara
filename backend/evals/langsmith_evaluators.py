"""LangSmith experiment runner for Munazara — real debate traces.

Runs every fixture through the real debate graph (real LLM calls) and uploads
the runs, scores, and experiment to LangSmith. Local mock testing lives in
`evals.runner`; this file exists only for the thing runner can't do — real
LLM traces with scores and history in the LangSmith UI.

  1. Creates (or reuses) a dataset from `evals.fixtures.FIXTURES`.
  2. Runs each fixture as the target function (real providers).
  3. `langsmith.evaluate()` uploads everything to the LangSmith UI.
  4. Scores reuse the trace-level scorers in `evals.scorers`.

Usage:
    uv run python -m evals.langsmith_evaluators

Requires: LANGSMITH_API_KEY (+ optional LANGSMITH_PROJECT) and the vendor API
keys used by the debate (ANTHROPIC/GOOGLE/OPENAI). Costs money — real calls.
"""
import asyncio
import os
import sys

from dotenv import load_dotenv
load_dotenv()

from evals.fixtures import FIXTURES
from evals.runner import _run_fixture
from evals.scorers import ALL_SCORERS

DATASET_NAME = os.environ.get("LANGSMITH_DATASET", "munazara-fixtures")


def _require_client():
    if not os.environ.get("LANGSMITH_API_KEY"):
        print("LANGSMITH_API_KEY not set. Add it to .env to upload experiments.", file=sys.stderr)
        sys.exit(1)
    try:
        from langsmith import Client
    except ImportError:
        print("langsmith not installed. Run: uv add langsmith", file=sys.stderr)
        sys.exit(1)
    return Client()


def _sync_dataset(client):
    """Create the dataset from fixtures if absent; return its id. Idempotent."""
    if client.has_dataset(dataset_name=DATASET_NAME):
        return client.read_dataset(dataset_name=DATASET_NAME).id

    dataset = client.create_dataset(
        dataset_name=DATASET_NAME,
        description="Munazara debate fixtures — structure/cost/convergence checks.",
    )
    client.create_examples(
        dataset_id=dataset.id,
        inputs=[
            {"id": f["id"], "question": f["question"], "tier": f["tier"], "max_rounds": f["max_rounds"]}
            for f in FIXTURES
        ],
        outputs=[f["expect"] for f in FIXTURES],  # reference outputs for evaluators
    )
    return dataset.id


def _target(inputs: dict) -> dict:
    """Run one fixture through the real debate graph. Called per example."""
    events = asyncio.run(_run_fixture(inputs, use_real=True))
    verdicts = [e for e in events if e["event"] == "verdict"]
    round_starts = [e for e in events if e["event"] == "round_start"]
    return {
        "events": events,
        "verdict": verdicts[-1]["data"] if verdicts else None,
        "num_rounds": max((e["data"].get("round", 0) for e in round_starts), default=0),
    }


def _make_evaluator(name, scorer):
    """Wrap a scorer as a LangSmith evaluator over the target's output."""
    def _eval(run, example):
        events = (run.outputs or {}).get("events", [])
        expect = example.outputs or {}
        if name == "cost_sanity":
            result = scorer(events, max_cost_usd=expect.get("max_cost_usd", 0.5))
        else:
            result = scorer(events)
        return {"key": name, "score": float(result["score"]), "comment": str(result["detail"])}

    _eval.__name__ = f"eval_{name}"
    return _eval


EVALUATORS = [_make_evaluator(name, scorer) for name, scorer in ALL_SCORERS]


def run_experiment():
    from langsmith import evaluate

    client = _require_client()
    _sync_dataset(client)

    print(f"Running experiment against '{DATASET_NAME}' (real LLMs)...")
    results = evaluate(
        _target,
        data=DATASET_NAME,
        evaluators=EVALUATORS,
        experiment_prefix="munazara-real",
        client=client,
    )

    url = getattr(results, "experiment_url", None)
    print(f"\nDone. Experiment uploaded (dataset: {DATASET_NAME}).")
    print(f"View: {url}" if isinstance(url, str) else "View at: https://smith.langchain.com")
    return results


if __name__ == "__main__":
    run_experiment()
