import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas import DebateState, DebaterOutput
from app.models import get_debater_a_model, get_debater_b_model
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider


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
    api_keys = state["api_keys"]

    if agent == "debater_a":
        model_id = get_debater_a_model(tier)
        base_model = anthropic_provider.get_model(model_id, api_keys["anthropic"])
    else:
        model_id = get_debater_b_model(tier)
        base_model = google_provider.get_model(model_id, api_keys["google"])

    structured = base_model.with_structured_output(DebaterOutput)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_prompt(state, agent)),
    ]
    response: DebaterOutput = structured.invoke(messages)

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
    }


def debater_a_node(state: DebateState) -> dict:
    return _run_debater(state, "debater_a")


def debater_b_node(state: DebateState) -> dict:
    return _run_debater(state, "debater_b")
