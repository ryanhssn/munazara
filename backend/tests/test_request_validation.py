"""Input-validation guardrails on the debate request (the untrusted edge)."""
import pytest
from pydantic import ValidationError

from app.streaming import DebateRequest, MAX_QUESTION_CHARS, MAX_ROUNDS_CAP


def test_valid_request_ok():
    req = DebateRequest(question="  Is water wet?  ", max_rounds=2)
    assert req.question == "Is water wet?"  # trimmed
    assert req.max_rounds == 2


def test_blank_question_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="   ")


def test_empty_question_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="")


def test_oversized_question_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="x" * (MAX_QUESTION_CHARS + 1))


@pytest.mark.parametrize("rounds", [0, -1, MAX_ROUNDS_CAP + 1, 1_000_000])
def test_out_of_range_rounds_rejected(rounds):
    with pytest.raises(ValidationError):
        DebateRequest(question="q", max_rounds=rounds)


def test_bad_vendor_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="q", judge_vendor="mistral")


def test_bad_tier_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="q", tier="turbo")


def test_too_many_prior_turns_rejected():
    with pytest.raises(ValidationError):
        DebateRequest(question="q", prior_transcript=[{"x": 1}] * 999)
