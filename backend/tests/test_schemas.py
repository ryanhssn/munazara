import pytest
from pydantic import ValidationError
from app.schemas import DebaterOutput, Verdict, DisputeItem, UnresolvedDispute


def test_debater_output_valid():
    out = DebaterOutput(
        position="AI should be regulated",
        concessions=["Training costs are genuinely high"],
        disputes=[DisputeItem(claim="AI is safe", counter="Several incidents show otherwise", evidence="EU AI Act")],
        confidence=0.8,
    )
    assert len(out.disputes) == 1
    assert out.confidence == 0.8


def test_debater_output_defaults_empty_lists():
    out = DebaterOutput(position="Some position", confidence=0.5)
    assert out.concessions == []
    assert out.disputes == []


def test_debater_output_rejects_bad_confidence():
    with pytest.raises(ValidationError):
        DebaterOutput(position="x", confidence=1.5)


def test_dispute_item_requires_all_fields():
    with pytest.raises(ValidationError):
        DisputeItem(claim="only claim")


def test_verdict_valid():
    v = Verdict(
        agreements=["Both agree regulation is needed"],
        unresolved_disputes=[
            UnresolvedDispute(
                topic="Scope",
                a_position="Broad",
                b_position="Narrow",
                ruling="Narrow wins",
                reasoning="Evidence supports targeted regulation",
            )
        ],
        recommendation="Narrow AI regulation framework",
        confidence=0.75,
        dissent_notes="Neither addressed training data adequately",
    )
    assert len(v.unresolved_disputes) == 1
    assert v.confidence == 0.75


def test_verdict_default_empty_fields():
    v = Verdict(recommendation="Do it", confidence=0.5)
    assert v.agreements == []
    assert v.unresolved_disputes == []
    assert v.dissent_notes == ""
