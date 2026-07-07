import pytest
from app.nodes.convergence import convergence_node, should_continue
from app.schemas import DebateState


def make_state(**overrides) -> DebateState:
    base: DebateState = {
        "question": "Test question",
        "images": [],
        "round_count": 0,
        "max_rounds": 3,
        "transcript": [],
        "agreements": [],
        "open_disputes": [],
        "verdict": None,
        "tier": "balanced",
        "judge_vendor": "openai",
        "api_keys": {},
        "last_a_disputes": [],
        "last_b_disputes": [],
    }
    base.update(overrides)
    return base


def test_convergence_node_increments_round():
    state = make_state(round_count=0)
    result = convergence_node(state)
    assert result["round_count"] == 1


def test_convergence_node_increments_from_any_value():
    state = make_state(round_count=2)
    result = convergence_node(state)
    assert result["round_count"] == 3


def test_convergence_node_collects_disputes_from_both_sides():
    state = make_state(
        last_a_disputes=[{"claim": "claim A", "counter": "c", "evidence": "e"}],
        last_b_disputes=[{"claim": "claim B", "counter": "c", "evidence": "e"}],
    )
    result = convergence_node(state)
    assert len(result["open_disputes"]) == 2


def test_convergence_node_deduplicates_same_claim():
    dispute = {"claim": "shared claim", "counter": "c", "evidence": "e"}
    state = make_state(last_a_disputes=[dispute], last_b_disputes=[dispute])
    result = convergence_node(state)
    assert len(result["open_disputes"]) == 1


def test_should_continue_when_disputes_remain():
    state = make_state(
        round_count=1,
        last_a_disputes=[{"claim": "x", "counter": "y", "evidence": "z"}],
    )
    assert should_continue(state) == "debater_a"


def test_should_go_to_judge_at_max_rounds():
    state = make_state(
        round_count=3,
        last_a_disputes=[{"claim": "x", "counter": "y", "evidence": "z"}],
    )
    assert should_continue(state) == "judge"


def test_should_go_to_judge_at_exactly_max_rounds():
    """Boundary: round_count == max_rounds must route to judge, never loop."""
    state = make_state(round_count=3, max_rounds=3)
    assert should_continue(state) == "judge"


def test_should_go_to_judge_when_both_sides_empty():
    state = make_state(round_count=1, last_a_disputes=[], last_b_disputes=[])
    assert should_continue(state) == "judge"


def test_should_continue_when_only_b_has_disputes():
    state = make_state(
        round_count=1,
        last_a_disputes=[],
        last_b_disputes=[{"claim": "x", "counter": "y", "evidence": "z"}],
    )
    assert should_continue(state) == "debater_a"
