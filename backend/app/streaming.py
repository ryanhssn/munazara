import asyncio
import os
import time
from typing import AsyncGenerator, Optional

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.graph import graph as _default_graph, build_graph
from app.models import estimate_cost, get_model_for_vendor, get_judge_model
from app.schemas import DebateState

Tier = Literal["fast", "balanced", "deep"]
Vendor = Literal["anthropic", "google", "openai"]

# Guardrails: the request body is the untrusted edge. These bounds stop a
# single request from triggering runaway token spend or degenerate prompts.
MAX_QUESTION_CHARS = 4000
MAX_ROUNDS_CAP = 10
MAX_PRIOR_TURNS = 50


class DebateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)
    tier: Tier = "balanced"
    max_rounds: int = Field(default=3, ge=1, le=MAX_ROUNDS_CAP)
    judge_vendor: Vendor = "anthropic"
    debater_a_vendor: Vendor = "anthropic"
    debater_b_vendor: Vendor = "google"
    prior_transcript: list[dict] = Field(default_factory=list, max_length=MAX_PRIOR_TURNS)
    enable_rag: bool = False

    @field_validator("question")
    @classmethod
    def _question_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("question must not be blank")
        return v


def _build_initial_state(req: DebateRequest) -> DebateState:
    return {
        "question": req.question,
        "images": [],
        "round_count": 0,
        "max_rounds": req.max_rounds,
        "transcript": list(req.prior_transcript),
        "agreements": [],
        "open_disputes": [],
        "verdict": None,
        "exhibit_card": None,
        "tier": req.tier,
        "judge_vendor": req.judge_vendor,
        "debater_a_vendor": req.debater_a_vendor,
        "debater_b_vendor": req.debater_b_vendor,
        "last_a_disputes": [],
        "last_b_disputes": [],
        "last_a_confidence": 0.5,
        "last_b_confidence": 0.5,
        "enable_rag": req.enable_rag,
        "api_keys": {
            "anthropic": os.environ.get("ANTHROPIC_API_KEY", ""),
            "google":    os.environ.get("GOOGLE_API_KEY", ""),
            "openai":    os.environ.get("OPENAI_API_KEY", ""),
        },
    }


class _FieldExtractor:
    """Extract a JSON string field from streaming tool-call argument deltas.

    Handles both OpenAI/Google (tool_call_chunks.args) and Anthropic
    (content[].input) chunk formats. Extracts the first occurrence of
    `"<field>": "..."` and decodes JSON escape sequences on the fly.
    """

    def __init__(self, field: str) -> None:
        self._trigger = f'"{field}": "'
        self._buf = ""
        self._cursor = 0
        self._in_field = False
        self._done = False

    def reset(self) -> None:
        self._buf = ""
        self._cursor = 0
        self._in_field = False
        self._done = False

    def feed(self, delta: str) -> str:
        if self._done or not delta:
            return ""
        self._buf += delta
        if not self._in_field:
            idx = self._buf.find(self._trigger)
            if idx == -1:
                return ""
            self._in_field = True
            self._cursor = idx + len(self._trigger)
        out: list[str] = []
        i = self._cursor
        buf = self._buf
        while i < len(buf):
            c = buf[i]
            if c == "\\" and i + 1 < len(buf):
                nc = buf[i + 1]
                out.append({"n": "\n", "t": "\t", '"': '"', "\\": "\\"}.get(nc, nc))
                i += 2
            elif c == "\\":
                break  # incomplete escape — wait for next delta
            elif c == '"':
                self._done = True
                i += 1
                break
            else:
                out.append(c)
                i += 1
        self._cursor = i
        return "".join(out)


def _llm_delta(chunk) -> str:
    """Extract tool-call JSON argument delta from an AIMessageChunk."""
    # OpenAI / Google: tool_call_chunks with .args
    for tc in getattr(chunk, "tool_call_chunks", None) or []:
        args = tc.get("args") if isinstance(tc, dict) else getattr(tc, "args", None)
        if args:
            return args
    # Anthropic: content list with tool_use blocks
    for block in chunk.content if isinstance(chunk.content, list) else []:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            inp = block.get("input", "")
            if inp:
                return inp
    return ""


async def run_debate_stream(
    req: DebateRequest,
    graph=None,
    thread_id: Optional[str] = None,
) -> AsyncGenerator[dict, None]:
    if graph is None:
        graph = _default_graph
    state = _build_initial_state(req)
    current_round = 0
    tok: dict[str, dict[str, int]] = {
        "debater_a": {"in": 0, "out": 0},
        "debater_b": {"in": 0, "out": 0},
        "judge":     {"in": 0, "out": 0},
    }
    node_start_times: dict[str, float] = {}
    current_transcript: list[dict] = list(req.prior_transcript)

    # Real-streaming state: track which graph node is active so we
    # can route on_chat_model_stream events to the right extractor.
    current_node: str | None = None
    extractors: dict[str, _FieldExtractor] = {
        "debater_a": _FieldExtractor("position"),
        "debater_b": _FieldExtractor("position"),
        "judge":     _FieldExtractor("recommendation"),
    }

    def _running_stats() -> dict:
        total = sum(v["in"] + v["out"] for v in tok.values())
        cost = (
            estimate_cost(get_model_for_vendor(req.tier, req.debater_a_vendor), tok["debater_a"]["in"], tok["debater_a"]["out"])
            + estimate_cost(get_model_for_vendor(req.tier, req.debater_b_vendor), tok["debater_b"]["in"], tok["debater_b"]["out"])
            + estimate_cost(get_judge_model(req.tier, req.judge_vendor), tok["judge"]["in"], tok["judge"]["out"])
        )
        return {"total_tokens": total, "estimated_cost_usd": round(cost, 6)}

    ls_config: dict = {
        "run_name": f"debate · {req.tier} · {req.question[:60]}",
        "metadata": {
            "tier": req.tier,
            "question": req.question,
            "debater_a_vendor": req.debater_a_vendor,
            "debater_b_vendor": req.debater_b_vendor,
            "judge_vendor": req.judge_vendor,
            "max_rounds": req.max_rounds,
        },
    }
    if thread_id:
        ls_config["configurable"] = {"thread_id": thread_id}

    async for event in graph.astream_events(state, config=ls_config, version="v2"):
        kind = event["event"]
        name = event.get("name", "")

        if kind == "on_chain_start":
            if name == "debater_a":
                current_node = "debater_a"
                extractors["debater_a"].reset()
                node_start_times["debater_a"] = time.monotonic()
                round_num = event["data"].get("input", {}).get("round_count", 0) + 1
                if round_num != current_round:
                    current_round = round_num
                    yield {"event": "round_start", "data": {"round": current_round}}

            elif name == "debater_b":
                current_node = "debater_b"
                extractors["debater_b"].reset()
                node_start_times["debater_b"] = time.monotonic()

            elif name == "judge":
                current_node = "judge"
                extractors["judge"].reset()
                yield {"event": "judge_start", "data": {}}

        elif kind == "on_chat_model_stream":
            if current_node in extractors:
                chunk = event["data"].get("chunk")
                if chunk is not None:
                    delta = _llm_delta(chunk)
                    text = extractors[current_node].feed(delta)
                    if text:
                        yield {"event": "token", "data": {"agent": current_node, "text": text}}

        elif kind == "on_chain_end":
            if name in extractors:
                current_node = None

            output = event["data"].get("output", {})

            if name == "exhibit" and output.get("exhibit_card"):
                yield {"event": "exhibit", "data": output["exhibit_card"]}

            elif name == "debater_a" and output.get("transcript"):
                elapsed_ms = int((time.monotonic() - node_start_times.get("debater_a", 0)) * 1000)
                turn_in = output.get("total_input_tokens", 0)
                turn_out = output.get("total_output_tokens", 0)
                tok["debater_a"]["in"] += turn_in
                tok["debater_a"]["out"] += turn_out
                turn = output["transcript"][-1]
                current_transcript.append(turn)
                if output.get("evidence"):
                    yield {"event": "evidence_fetched", "data": {"agent": "debater_a", "round": current_round, "query": output.get("evidence_query", ""), "sources": output["evidence"]}}
                # Real streaming via _FieldExtractor fires during on_chat_model_stream.
                # If it didn't capture anything (structured output didn't stream), fall
                # back to word-by-word so the UI always shows a typing effect.
                if not extractors["debater_a"]._done:
                    words = turn["content"].split()
                    for i, word in enumerate(words):
                        sep = " " if i < len(words) - 1 else ""
                        yield {"event": "token", "data": {"agent": "debater_a", "text": word + sep}}
                        await asyncio.sleep(0.06)
                yield {
                    "event": "turn_complete",
                    "data": {
                        "agent": "debater_a",
                        "title": turn.get("title", ""),
                        "disputes": turn["disputes"],
                        "confidence": turn["confidence"],
                        "turn_input_tokens": turn_in,
                        "turn_output_tokens": turn_out,
                        "elapsed_ms": elapsed_ms,
                        **_running_stats(),
                    },
                }

            elif name == "debater_b" and output.get("transcript"):
                elapsed_ms = int((time.monotonic() - node_start_times.get("debater_b", 0)) * 1000)
                turn_in = output.get("total_input_tokens", 0)
                turn_out = output.get("total_output_tokens", 0)
                tok["debater_b"]["in"] += turn_in
                tok["debater_b"]["out"] += turn_out
                turn = output["transcript"][-1]
                current_transcript.append(turn)
                if output.get("evidence"):
                    yield {"event": "evidence_fetched", "data": {"agent": "debater_b", "round": current_round, "query": output.get("evidence_query", ""), "sources": output["evidence"]}}
                if not extractors["debater_b"]._done:
                    words = turn["content"].split()
                    for i, word in enumerate(words):
                        sep = " " if i < len(words) - 1 else ""
                        yield {"event": "token", "data": {"agent": "debater_b", "text": word + sep}}
                        await asyncio.sleep(0.06)
                yield {
                    "event": "turn_complete",
                    "data": {
                        "agent": "debater_b",
                        "title": turn.get("title", ""),
                        "disputes": turn["disputes"],
                        "confidence": turn["confidence"],
                        "turn_input_tokens": turn_in,
                        "turn_output_tokens": turn_out,
                        "elapsed_ms": elapsed_ms,
                        **_running_stats(),
                    },
                }

            elif name == "convergence":
                open_disputes = output.get("open_disputes", [])
                converged = len(open_disputes) == 0
                yield {
                    "event": "convergence",
                    "data": {"converged": converged, "open_disputes": len(open_disputes)},
                }

            elif name == "judge" and output.get("verdict"):
                tok["judge"]["in"] += output.get("total_input_tokens", 0)
                tok["judge"]["out"] += output.get("total_output_tokens", 0)
                verdict = output["verdict"]
                # Stream tldr text word-by-word if real streaming didn't fire
                if not extractors["judge"]._done:
                    tldr = verdict.get("tldr") or {}
                    stream_text = tldr.get("recommendation", "")
                    if tldr.get("why"):
                        stream_text = stream_text.rstrip(" .") + ". " + tldr["why"]
                    words = stream_text.split()
                    for i, word in enumerate(words):
                        sep = " " if i < len(words) - 1 else ""
                        yield {"event": "token", "data": {"agent": "judge", "text": word + sep}}
                        await asyncio.sleep(0.06)
                yield {"event": "verdict", "data": verdict}
                done_payload = {**_running_stats(), "transcript": current_transcript}
                if thread_id:
                    done_payload["thread_id"] = thread_id
                yield {"event": "done", "data": done_payload}
