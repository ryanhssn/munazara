import json
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from app.schemas import DebateState, Verdict
from app.models import get_judge_model
from app.providers import anthropic as anthropic_provider
from app.providers import google as google_provider
from app.providers import openai as openai_provider


SYSTEM_PROMPT = """You are an impartial judge evaluating a structured debate.
Analyse both sides carefully. Be fair. Reference specific arguments from the transcript.
Rule on each unresolved dispute and deliver a clear verdict.

Your output has two parts: a tldr block first, then the full structured trace.

━━ PART 1 — tldr (most users read only this) ━━

tldr.recommendation: One sentence, imperative, specific. Not "consider using X" — say "use X" or "don't use X, use Y instead." If the honest answer is genuinely conditional, say what the condition is in the same sentence ("Use X, unless [condition], in which case use Y"). Do not hedge with "it depends" as a complete answer — if it depends, state on what and still give a default for the common case.

tldr.why: 2–3 sentences max. No debate terminology — do not write "Debater A argued" or "B conceded" or "ruled for." Describe the actual technical or practical reasoning as if you reached it yourself.

tldr.confidence: Reflects how contested the underlying question was. High if both sides converged easily; medium or low if the ruling required breaking a close tie.

tldr.what_would_change_this: One sentence stating which constraint, if changed, would flip the recommendation. Omit the field entirely if nothing plausible would change the outcome.

━━ PART 2 — full structured trace ━━

agreements: what both sides agreed on.
unresolved_disputes: each dispute with a_position, b_position, ruling, reasoning.
confidence: overall verdict confidence (0.0–1.0).
winner: "debater_a", "debater_b", or "tie" based on argument quality.
dissent_notes: optional — note any close calls or minority positions.
action_items: 2–4 items, each with category ("ask_now" / "worth_pursuing" / "let_go" / "revisit"), content (≤10 words), timing.
suggested_path: single sentence, ALL CAPS, ≤15 words, e.g. "ASK FOR THE REVIEW THIS QUARTER — REASSESS IN 90 DAYS"."""


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


async def judge_node(state: DebateState) -> dict:
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

    structured = base_model.with_structured_output(Verdict, include_raw=True)
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=_build_prompt(state)),
    ]
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
    if result["parsed"] is None:
        raise ValueError(f"Judge structured output parse failed: {result.get('parsing_error')}")
    verdict: Verdict = result["parsed"]
    usage = (result["raw"].usage_metadata or {}) if result.get("raw") else {}

    return {
        "verdict": verdict.model_dump(),
        "agreements": verdict.agreements,
        "total_input_tokens": usage.get("input_tokens", 0),
        "total_output_tokens": usage.get("output_tokens", 0),
    }
