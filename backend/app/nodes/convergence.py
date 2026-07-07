from app.schemas import DebateState


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
    if not state["last_a_disputes"] and not state["last_b_disputes"]:
        return "judge"
    return "debater_a"
