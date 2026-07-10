import json
from typing import TypedDict, Literal, Annotated, Any
from operator import add
from pydantic import BaseModel, Field, field_validator


class DisputeItem(BaseModel):
    claim: str
    counter: str
    evidence: str


class DebaterOutput(BaseModel):
    position: str
    concessions: list[str] = Field(default_factory=list)
    disputes: list[DisputeItem] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)

    @field_validator("disputes", "concessions", mode="before")
    @classmethod
    def coerce_json_string(cls, v: Any) -> Any:
        if isinstance(v, str):
            return json.loads(v)
        return v


class UnresolvedDispute(BaseModel):
    topic: str
    a_position: str
    b_position: str
    ruling: str
    reasoning: str


class ActionItem(BaseModel):
    category: Literal["ask_now", "worth_pursuing", "let_go", "revisit"]
    content: str
    timing: str


class Verdict(BaseModel):
    agreements: list[str] = Field(default_factory=list)
    unresolved_disputes: list[UnresolvedDispute] = Field(default_factory=list)
    recommendation: str
    confidence: float = Field(ge=0.0, le=1.0)
    dissent_notes: str = ""
    action_items: list[ActionItem] = Field(default_factory=list)
    winner: Literal["debater_a", "debater_b", "tie"] = "tie"
    suggested_path: str = ""


class DebateState(TypedDict):
    question: str
    images: list[str]
    round_count: int
    max_rounds: int
    transcript: Annotated[list[dict], add]   # nodes return [new_turn]; LangGraph appends
    agreements: Annotated[list[str], add]
    open_disputes: list[str]
    verdict: dict | None
    tier: Literal["fast", "balanced", "deep"]
    judge_vendor: str
    last_a_disputes: list[dict]              # replaced each round, read by convergence_node
    last_b_disputes: list[dict]
    api_keys: dict[str, str]
