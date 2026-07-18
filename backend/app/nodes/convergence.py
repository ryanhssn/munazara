from app.schemas import DebateState

_CONFIDENCE_THRESHOLD = 0.85


def convergence_node(state: DebateState) -> dict:
    # Only place round_count is incremented.
    new_round = state["round_count"] + 1

    all_disputes: set[str] = set()
    for d in state["last_a_disputes"]:
        all_disputes.add(d.get("claim", ""))
    for d in state["last_b_disputes"]:
        all_disputes.add(d.get("claim", ""))

    return {
        "round_count": new_round,
        "open_disputes": list(all_disputes),
    }


def should_continue(state: DebateState) -> str:
    if state["round_count"] >= state["max_rounds"]:
        return "judge"

    no_disputes = not state["last_a_disputes"] and not state["last_b_disputes"]
    if no_disputes:
        return "judge"

    # Early exit: both debaters are highly confident and have been debating
    # at least one round — no point continuing.
    if (
        state["round_count"] >= 1
        and state.get("last_a_confidence", 0.0) >= _CONFIDENCE_THRESHOLD
        and state.get("last_b_confidence", 0.0) >= _CONFIDENCE_THRESHOLD
    ):
        return "judge"

    return "debater_a"
