import json
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.schemas import DebateState, DebaterOutput
from app.models import get_debater_a_model, get_debater_b_model
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider
from app.providers import openai as openai_provider

_PROVIDERS = {
    "anthropic": anthropic_provider,
    "google": google_provider,
    "openai": openai_provider,
}

SYSTEM_PROMPT = """You are participating in a structured intellectual debate. Engage rigorously.
Concede points where your opponent is correct. Dispute claims you disagree with, citing evidence.
Do not repeat arguments already made. Build on each round."""


def _build_prompt(state: DebateState, agent: str) -> str:
    opponent = "debater_b" if agent == "debater_a" else "debater_a"
    opponent_turns = [t for t in state["transcript"] if t["agent"] == opponent]

    lines = [f"DEBATE QUESTION: {state['question']}", ""]

    if state["transcript"]:
        lines.append("=== TRANSCRIPT ===")
        for turn in state["transcript"]:
            lines.append(f"\n[{turn['agent'].upper()} — Round {turn['round']}]")
            lines.append(f"Position: {turn['content']}")
            if turn.get("concessions"):
                lines.append(f"Concessions: {', '.join(turn['concessions'])}")
            if turn.get("disputes"):
                lines.append(f"Disputes: {json.dumps(turn['disputes'])}")
        lines.append("=== END TRANSCRIPT ===\n")

    if not opponent_turns:
        lines.append("Round 1. State your initial position on the question.")
    else:
        lines.append(
            f"Round {state['round_count'] + 1} of {state['max_rounds']}. "
            "Respond to your opponent's latest argument. Update concessions and disputes accordingly."
        )

    return "\n".join(lines)


def _run_debater(state: DebateState, agent: str) -> dict:
    tier = state["tier"]
    vendor = state["debater_a_vendor"] if agent == "debater_a" else state["debater_b_vendor"]
    api_key = state["api_keys"].get(vendor) or None
    model_id = get_debater_a_model(tier) if agent == "debater_a" else get_debater_b_model(tier)
    base_model = _PROVIDERS[vendor].get_model(model_id, api_key)
    structured = base_model.with_structured_output(DebaterOutput, include_raw=True)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_prompt(state, agent)),
    ]
    result = structured.invoke(messages)
    if result["parsed"] is None:
        # one repair retry
        raw_msg = result["raw"]
        raw_text = raw_msg.content if raw_msg else ""
        tool_results = [
            ToolMessage(content="parse_error", tool_call_id=tc["id"])
            for tc in (getattr(raw_msg, "tool_calls", None) or [])
        ]
        repair_messages = messages + [raw_msg] + tool_results + [
            HumanMessage(content=f"Your response failed to parse. Return valid JSON matching the required schema. Raw output was:\n{raw_text}"),
        ]
        result = structured.invoke(repair_messages)
    if result["parsed"] is None:
        raise ValueError(f"{agent} structured output parse failed: {result.get('parsing_error')}")
    response: DebaterOutput = result["parsed"]
    usage = (result["raw"].usage_metadata or {}) if result.get("raw") else {}

    turn = {
        "agent": agent,
        "round": state["round_count"] + 1,
        "content": response.position,
        "disputes": [d.model_dump() for d in response.disputes],
        "concessions": response.concessions,
        "confidence": response.confidence,
    }
    disputes_key = "last_a_disputes" if agent == "debater_a" else "last_b_disputes"

    return {
        "transcript": [turn],
        disputes_key: [d.model_dump() for d in response.disputes],
        "total_input_tokens": usage.get("input_tokens", 0),
        "total_output_tokens": usage.get("output_tokens", 0),
    }


def debater_a_node(state: DebateState) -> dict:
    return _run_debater(state, "debater_a")


def debater_b_node(state: DebateState) -> dict:
    return _run_debater(state, "debater_b")
