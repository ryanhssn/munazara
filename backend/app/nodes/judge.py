import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.schemas import DebateState, Verdict
from app.models import get_judge_model
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider
from app.providers import openai as openai_provider


SYSTEM_PROMPT = """You are an impartial judge evaluating a structured debate.
Analyse both sides carefully. Be fair. Reference specific arguments from the transcript.
Rule on each unresolved dispute and deliver a clear recommendation."""


def _build_prompt(state: DebateState) -> str:
    lines = [f"DEBATE QUESTION: {state['question']}", "", "=== FULL TRANSCRIPT ==="]

    for turn in state["transcript"]:
        lines.append(f"\n[{turn['agent'].upper()} — Round {turn['round']}]")
        lines.append(f"Position: {turn['content']}")
        if turn.get("concessions"):
            lines.append(f"Concessions: {', '.join(turn['concessions'])}")
        if turn.get("disputes"):
            lines.append(f"Disputes: {json.dumps(turn['disputes'])}")
        lines.append(f"Confidence: {turn['confidence']:.0%}")

    lines.extend([
        "=== END TRANSCRIPT ===",
        "",
        f"Rounds completed: {state['round_count']}",
        f"Open disputes: {state['open_disputes']}",
        "",
        "Deliver your verdict.",
    ])

    return "\n".join(lines)


def judge_node(state: DebateState) -> dict:
    tier = state["tier"]
    vendor = state["judge_vendor"]
    model_id = get_judge_model(tier, vendor)
    api_keys = state["api_keys"]

    match vendor:
        case "openai":
            base_model = openai_provider.get_model(model_id, api_keys["openai"])
        case "anthropic":
            base_model = anthropic_provider.get_model(model_id, api_keys["anthropic"])
        case "google":
            base_model = google_provider.get_model(model_id, api_keys["google"])
        case _:
            raise ValueError(f"Unknown judge vendor: {vendor}")

    structured = base_model.with_structured_output(Verdict)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_prompt(state)),
    ]
    verdict: Verdict = structured.invoke(messages)

    return {
        "verdict": verdict.model_dump(),
        "agreements": verdict.agreements,
    }
