import asyncio
import json
import logging
import os
import time
from typing import Callable, Awaitable, TypeVar
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.schemas import DebateState, DebaterOutput
from app.models import get_model_for_vendor
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider
from app.providers import openai as openai_provider

logger = logging.getLogger(__name__)

_T = TypeVar("_T")

# Generous hang-guard: converts a silently-frozen provider socket into a
# TimeoutError that _with_retry can catch and retry. Does not affect debate
# pacing — only kills truly dead connections. Tune via env var if needed.
LLM_CALL_TIMEOUT = int(os.environ.get("LLM_CALL_TIMEOUT_SECS", "120"))

_RETRYABLE_KEYWORDS = ("rate limit", "timeout", "connection", "overloaded", "service unavailable", "internal server", "529", "503", "502")


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, asyncio.TimeoutError):
        return True
    msg = str(exc).lower()
    return any(k in msg for k in _RETRYABLE_KEYWORDS)


async def _with_retry(fn: Callable[[], Awaitable[_T]], max_attempts: int = 3) -> _T:
    for attempt in range(max_attempts):
        try:
            return await asyncio.wait_for(fn(), timeout=LLM_CALL_TIMEOUT)
        except Exception as exc:
            if attempt == max_attempts - 1 or not _is_retryable(exc):
                raise
            await asyncio.sleep(2 ** attempt)

_PROVIDERS = {
    "anthropic": anthropic_provider,
    "google": google_provider,
    "openai": openai_provider,
}

SYSTEM_PROMPT = """You are participating in a structured intellectual debate. Engage rigorously.
Concede points where your opponent is correct. Dispute claims you disagree with, citing evidence.
Do not repeat arguments already made. Build on each round."""

# Anthropic ephemeral cache marker — attached to stable prompt sections so
# repeated rounds pay ~10% of normal input-token cost for the unchanged prefix.
_CACHE = {"type": "ephemeral"}


def _build_transcript_text(state: DebateState) -> str:
    lines = [f"DEBATE QUESTION: {state['question']}", "", "=== TRANSCRIPT ==="]
    for turn in state["transcript"]:
        agent_vendor = state["debater_a_vendor"] if turn["agent"] == "debater_a" else state["debater_b_vendor"]
        lines.append(f"\n[{agent_vendor.upper()} — Round {turn['round']}]")
        lines.append(f"Position: {turn['content']}")
        if turn.get("concessions"):
            lines.append(f"Concessions: {', '.join(turn['concessions'])}")
        if turn.get("disputes"):
            lines.append(f"Disputes: {json.dumps(turn['disputes'])}")
    lines.append("=== END TRANSCRIPT ===")
    return "\n".join(lines)


def _build_round_instruction(state: DebateState, agent: str) -> str:
    opponent = "debater_b" if agent == "debater_a" else "debater_a"
    opponent_turns = [t for t in state["transcript"] if t["agent"] == opponent]
    if not opponent_turns:
        return f"\nDEBATE QUESTION: {state['question']}\n\nRound 1. State your initial position on the question."
    return (
        f"\nRound {state['round_count'] + 1} of {state['max_rounds']}. "
        "Respond to your opponent's latest argument. Update concessions and disputes accordingly."
    )


def _build_messages(state: DebateState, agent: str, vendor: str, evidence_text: str = ""):
    """Build prompt messages with Anthropic cache_control on stable sections."""
    has_transcript = bool(state["transcript"])
    instruction = _build_round_instruction(state, agent) + evidence_text

    if vendor == "anthropic":
        # System prompt: marked cacheable — never changes across rounds.
        system = SystemMessage(content=[
            {"type": "text", "text": SYSTEM_PROMPT, "cache_control": _CACHE},
        ])
        if has_transcript:
            # Prior transcript is stable — mark it cacheable. New instruction is fresh.
            human = HumanMessage(content=[
                {"type": "text", "text": _build_transcript_text(state), "cache_control": _CACHE},
                {"type": "text", "text": instruction},
            ])
        else:
            human = HumanMessage(content=instruction)
    else:
        # Non-Anthropic: plain messages, no cache_control.
        if has_transcript:
            text = _build_transcript_text(state) + "\n" + instruction
        else:
            text = instruction
        system = SystemMessage(content=SYSTEM_PROMPT)
        human = HumanMessage(content=text)

    return [system, human]


async def _invoke_structured(structured, messages):
    """Invoke structured model with one parse-repair retry."""
    result = await structured.ainvoke(messages)
    if result["parsed"] is None:
        raw_msg = result["raw"]
        raw_text = raw_msg.content if raw_msg else ""
        tool_results = [
            ToolMessage(content="parse_error", tool_call_id=tc["id"])
            for tc in (getattr(raw_msg, "tool_calls", None) or [])
        ]
        repair_messages = messages + [raw_msg] + tool_results + [
            HumanMessage(content=f"Your response failed to parse. Return valid JSON matching the required schema. Raw output was:\n{raw_text}"),
        ]
        result = await structured.ainvoke(repair_messages)
    return result


def _build_search_query(state: DebateState, agent: str) -> str:
    """Derive a search query from debate context without an extra LLM call.

    Round 1: use the debate question itself.
    Round 2+: use the most-disputed claim from the previous round (the
    contested point where real-world evidence matters most).
    """
    opponent = "debater_b" if agent == "debater_a" else "debater_a"
    opponent_disputes = [
        t for t in state["transcript"]
        if t["agent"] == opponent and t.get("disputes")
    ]
    if opponent_disputes:
        latest = opponent_disputes[-1]["disputes"][0]
        return latest.get("claim", state["question"])[:200]
    return state["question"][:200]


def _format_evidence(response) -> str:
    if not response.results:
        return ""
    lines = ["\n=== RETRIEVED EVIDENCE ==="]
    for i, r in enumerate(response.results, 1):
        lines.append(f"\n[{i}] {r.title}")
        lines.append(f"    {r.snippet}")
        lines.append(f"    Source: {r.url}")
    lines.append("=== END EVIDENCE ===\n")
    lines.append("You may cite these sources in your disputes. If evidence contradicts your position, concede that point.")
    return "\n".join(lines)


async def _run_debater(state: DebateState, agent: str) -> dict:
    from app.tools.retrieval import SearchQuery, fetch_evidence, SearchResponse
    tier = state["tier"]
    vendor = state["debater_a_vendor"] if agent == "debater_a" else state["debater_b_vendor"]
    api_key = state["api_keys"].get(vendor) or None
    model_id = get_model_for_vendor(tier, vendor)
    base_model = _PROVIDERS[vendor].get_model(model_id, api_key)
    structured = base_model.with_structured_output(DebaterOutput, include_raw=True)

    evidence_text = ""
    evidence_payload: list[dict] = []
    evidence_query = ""
    if state.get("enable_rag"):
        evidence_query = _build_search_query(state, agent)
        evidence = await fetch_evidence(SearchQuery(query=evidence_query, max_results=3))
        evidence_text = _format_evidence(evidence)
        evidence_payload = [
            {"title": r.title, "url": r.url, "snippet": r.snippet}
            for r in evidence.results
        ]

    messages = _build_messages(state, agent, vendor, evidence_text=evidence_text)

    t0 = time.monotonic()
    logger.info("debater_call_start", extra={"agent": agent, "vendor": vendor, "model": model_id, "round": state["round_count"] + 1})
    try:
        result = await _with_retry(lambda: _invoke_structured(structured, messages))
    except Exception:
        logger.exception("debater_call_failed", extra={"agent": agent, "vendor": vendor, "elapsed_ms": int((time.monotonic() - t0) * 1000)})
        raise

    if result["parsed"] is None:
        raise ValueError(f"{agent} structured output parse failed: {result.get('parsing_error')}")
    response: DebaterOutput = result["parsed"]
    usage = (result["raw"].usage_metadata or {}) if result.get("raw") else {}
    logger.info("debater_call_done", extra={
        "agent": agent, "vendor": vendor,
        "elapsed_ms": int((time.monotonic() - t0) * 1000),
        "input_tokens": usage.get("input_tokens", 0),
        "output_tokens": usage.get("output_tokens", 0),
        "disputes": len(response.disputes),
        "confidence": response.confidence,
    })

    turn = {
        "agent": agent,
        "round": state["round_count"] + 1,
        "title": response.title,
        "content": response.position,
        "disputes": [d.model_dump() for d in response.disputes],
        "concessions": response.concessions,
        "confidence": response.confidence,
    }
    disputes_key = "last_a_disputes" if agent == "debater_a" else "last_b_disputes"
    confidence_key = "last_a_confidence" if agent == "debater_a" else "last_b_confidence"

    return {
        "transcript": [turn],
        disputes_key: [d.model_dump() for d in response.disputes],
        confidence_key: response.confidence,
        "evidence": evidence_payload,
        "evidence_query": evidence_query,
        "total_input_tokens": usage.get("input_tokens", 0),
        "total_output_tokens": usage.get("output_tokens", 0),
    }


async def debater_a_node(state: DebateState) -> dict:
    return await _run_debater(state, "debater_a")


async def debater_b_node(state: DebateState) -> dict:
    return await _run_debater(state, "debater_b")
