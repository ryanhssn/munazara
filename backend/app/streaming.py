import asyncio
import os
from typing import AsyncGenerator

from pydantic import BaseModel

from app.graph import graph
from app.schemas import DebateState


class DebateRequest(BaseModel):
    question: str
    tier: str = "balanced"
    max_rounds: int = 3
    judge_vendor: str = "anthropic"
    debater_a_vendor: str = "anthropic"
    debater_b_vendor: str = "google"


def _build_initial_state(req: DebateRequest) -> DebateState:
    return {
        "question": req.question,
        "images": [],
        "round_count": 0,
        "max_rounds": req.max_rounds,
        "transcript": [],
        "agreements": [],
        "open_disputes": [],
        "verdict": None,
        "tier": req.tier,
        "judge_vendor": req.judge_vendor,
        "debater_a_vendor": req.debater_a_vendor,
        "debater_b_vendor": req.debater_b_vendor,
        "last_a_disputes": [],
        "last_b_disputes": [],
        "api_keys": {
            "anthropic": os.environ.get("ANTHROPIC_API_KEY", ""),
            "google":    os.environ.get("GOOGLE_API_KEY", ""),
            "openai":    os.environ.get("OPENAI_API_KEY", ""),
        },
    }


async def run_debate_stream(req: DebateRequest) -> AsyncGenerator[dict, None]:
    state = _build_initial_state(req)
    current_round = 0

    async for event in graph.astream_events(state, version="v2"):
        kind = event["event"]
        name = event.get("name", "")

        if kind == "on_chain_start":
            if name == "debater_a":
                round_num = event["data"].get("input", {}).get("round_count", 0) + 1
                if round_num != current_round:
                    current_round = round_num
                    yield {"event": "round_start", "data": {"round": current_round}}

            elif name == "judge":
                yield {"event": "judge_start", "data": {}}

        elif kind == "on_chain_end":
            output = event["data"].get("output", {})

            if name == "debater_a" and output.get("transcript"):
                turn = output["transcript"][-1]
                words = turn["content"].split()
                for i, word in enumerate(words):
                    sep = " " if i < len(words) - 1 else ""
                    yield {"event": "token", "data": {"agent": "debater_a", "text": word + sep}}
                    await asyncio.sleep(0.04)
                yield {
                    "event": "turn_complete",
                    "data": {
                        "agent": "debater_a",
                        "disputes": turn["disputes"],
                        "confidence": turn["confidence"],
                    },
                }

            elif name == "debater_b" and output.get("transcript"):
                turn = output["transcript"][-1]
                words = turn["content"].split()
                for i, word in enumerate(words):
                    sep = " " if i < len(words) - 1 else ""
                    yield {"event": "token", "data": {"agent": "debater_b", "text": word + sep}}
                    await asyncio.sleep(0.04)
                yield {
                    "event": "turn_complete",
                    "data": {
                        "agent": "debater_b",
                        "disputes": turn["disputes"],
                        "confidence": turn["confidence"],
                    },
                }

            elif name == "convergence":
                open_disputes = output.get("open_disputes", [])
                converged = len(open_disputes) == 0
                yield {
                    "event": "convergence",
                    "data": {"converged": converged, "open_disputes": len(open_disputes)},
                }

            elif name == "judge" and output.get("verdict"):
                verdict = output["verdict"]
                words = verdict.get("recommendation", "").split()
                for i, word in enumerate(words):
                    sep = " " if i < len(words) - 1 else ""
                    yield {"event": "token", "data": {"agent": "judge", "text": word + sep}}
                    await asyncio.sleep(0.04)
                yield {"event": "verdict", "data": verdict}
                yield {"event": "done", "data": {"total_tokens": 0, "estimated_cost_usd": 0.0}}
