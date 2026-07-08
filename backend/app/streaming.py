import asyncio
from typing import AsyncGenerator

from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel

from app.models import get_debater_a_model, get_debater_b_model, get_judge_model
from app.nodes.debater import SYSTEM_PROMPT as DEBATER_SYSTEM, _build_prompt as build_debater_prompt
from app.nodes.judge import SYSTEM_PROMPT as JUDGE_SYSTEM, _build_prompt as build_judge_prompt
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider
from app.providers import openai as openai_provider
from app.schemas import DebateState, DebaterOutput, Verdict


class DebateRequest(BaseModel):
    question: str
    tier: str = "balanced"
    max_rounds: int = 3
    judge_vendor: str = "anthropic"
    api_keys: dict[str, str] = {}


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
        "api_keys": req.api_keys,
        "last_a_disputes": [],
        "last_b_disputes": [],
    }


def _get_model(state: DebateState, role: str):
    tier = state["tier"]
    keys = state["api_keys"]
    if role == "debater_a":
        return anthropic_provider.get_model(get_debater_a_model(tier), keys.get("anthropic", ""))
    if role == "debater_b":
        return google_provider.get_model(get_debater_b_model(tier), keys.get("google", ""))
    # judge
    vendor = state["judge_vendor"]
    model_id = get_judge_model(tier, vendor)
    match vendor:
        case "openai":
            return openai_provider.get_model(model_id, keys.get("openai", ""))
        case "anthropic":
            return anthropic_provider.get_model(model_id, keys.get("anthropic", ""))
        case "google":
            return google_provider.get_model(model_id, keys.get("google", ""))
        case _:
            raise ValueError(f"Unknown judge vendor: {vendor}")


async def _run_debater(state: DebateState, agent: str, queue: asyncio.Queue) -> dict:
    base_model = _get_model(state, agent)
    structured = base_model.with_structured_output(DebaterOutput)
    messages = [
        SystemMessage(content=DEBATER_SYSTEM),
        HumanMessage(content=build_debater_prompt(state, agent)),
    ]

    try:
        response: DebaterOutput = await structured.ainvoke(messages)
    except Exception as e:
        await queue.put({"event": "error", "data": {"agent": agent, "message": str(e)}})
        raise

    # Emit position text as token stream, yielding between each word for typing effect
    words = response.position.split()
    for i, word in enumerate(words):
        sep = " " if i < len(words) - 1 else ""
        await queue.put({"event": "token", "data": {"agent": agent, "text": word + sep}})
        await asyncio.sleep(0.04)

    turn = {
        "agent": agent,
        "round": state["round_count"] + 1,
        "content": response.position,
        "disputes": [d.model_dump() for d in response.disputes],
        "concessions": response.concessions,
        "confidence": response.confidence,
    }

    await queue.put({
        "event": "turn_complete",
        "data": {
            "agent": agent,
            "disputes": [d.model_dump() for d in response.disputes],
            "confidence": response.confidence,
        },
    })

    return turn


async def _run_judge(state: DebateState, queue: asyncio.Queue) -> dict:
    base_model = _get_model(state, "judge")
    structured = base_model.with_structured_output(Verdict)
    messages = [
        SystemMessage(content=JUDGE_SYSTEM),
        HumanMessage(content=build_judge_prompt(state)),
    ]

    try:
        verdict: Verdict = await structured.ainvoke(messages)
    except Exception as e:
        await queue.put({"event": "error", "data": {"agent": "judge", "message": str(e)}})
        raise

    words = verdict.recommendation.split()
    for i, word in enumerate(words):
        sep = " " if i < len(words) - 1 else ""
        await queue.put({"event": "token", "data": {"agent": "judge", "text": word + sep}})
        await asyncio.sleep(0.04)

    return verdict.model_dump()


async def _orchestrate(req: DebateRequest, queue: asyncio.Queue) -> None:
    state = _build_initial_state(req)

    try:
        while True:
            round_num = state["round_count"] + 1
            await queue.put({"event": "round_start", "data": {"round": round_num}})

            # Both debaters run concurrently; each pushes token events to the shared queue
            turn_a, turn_b = await asyncio.gather(
                _run_debater(state, "debater_a", queue),
                _run_debater(state, "debater_b", queue),
            )

            # Manual state update (mirrors LangGraph reducers)
            state["transcript"].append(turn_a)
            state["transcript"].append(turn_b)
            state["last_a_disputes"] = turn_a["disputes"]
            state["last_b_disputes"] = turn_b["disputes"]
            state["round_count"] += 1

            all_claims = {d["claim"] for d in turn_a["disputes"] + turn_b["disputes"]}
            state["open_disputes"] = list(all_claims)

            converged = not turn_a["disputes"] and not turn_b["disputes"]
            await queue.put({
                "event": "convergence",
                "data": {"converged": converged, "open_disputes": len(state["open_disputes"])},
            })

            if converged or state["round_count"] >= state["max_rounds"]:
                break

        await queue.put({"event": "judge_start", "data": {}})
        verdict = await _run_judge(state, queue)

        await queue.put({"event": "verdict", "data": verdict})
        await queue.put({"event": "done", "data": {"total_tokens": 0, "estimated_cost_usd": 0.0}})

    except Exception as e:
        await queue.put({"event": "error", "data": {"message": str(e)}})

    finally:
        await queue.put(None)  # sentinel — signals generator to stop


async def run_debate_stream(req: DebateRequest) -> AsyncGenerator[dict, None]:
    queue: asyncio.Queue[dict | None] = asyncio.Queue()
    task = asyncio.create_task(_orchestrate(req, queue))

    try:
        while True:
            item = await queue.get()
            if item is None:
                break
            yield item
    finally:
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
