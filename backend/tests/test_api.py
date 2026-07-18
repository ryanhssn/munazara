"""Smoke tests for the FastAPI SSE endpoint (no real LLM calls)."""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import DebaterOutput, Verdict, TldrBlock


@pytest.fixture
def fake_debater_output():
    return DebaterOutput(
        title="Test position title",
        position="Test position text.",
        concessions=[],
        disputes=[],
        confidence=0.8,
    )


@pytest.fixture
def fake_verdict():
    return Verdict(
        tldr=TldrBlock(recommendation="Test recommendation.", why="Because test", confidence=0.9),
        agreements=["point a"],
        unresolved_disputes=[],
        confidence=0.9,
        dissent_notes="",
    )


def _make_mock_model(structured_return):
    """Build a mock LangChain model whose .with_structured_output() returns a mock
    that .ainvoke()-s the given value wrapped in the include_raw=True envelope."""
    ainvoke_result = {"parsed": structured_return, "raw": MagicMock(usage_metadata={"input_tokens": 10, "output_tokens": 20}), "parsing_error": None}
    structured_chain = MagicMock()
    structured_chain.ainvoke = AsyncMock(return_value=ainvoke_result)
    model = MagicMock()
    model.with_structured_output.return_value = structured_chain
    return model


@pytest.mark.asyncio
async def test_health_returns_provider_status():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    # Status 200 if all keys present, 503 if any missing — both are valid in test env.
    data = resp.json()
    assert data["status"] in ("ok", "degraded")
    assert "providers" in data
    assert set(data["providers"].keys()) == {"anthropic", "google", "openai"}


@pytest.mark.asyncio
async def test_debate_streams_sse_events(fake_debater_output, fake_verdict):
    mock_debater_model = _make_mock_model(fake_debater_output)
    mock_judge_model = _make_mock_model(fake_verdict)

    with (
        patch("app.providers.anthropic.get_model", return_value=mock_debater_model),
        patch("app.providers.google.get_model", return_value=mock_debater_model),
        patch("app.providers.openai.get_model", return_value=mock_judge_model),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            async with client.stream(
                "POST",
                "/api/debate",
                json={
                    "question": "Is water wet?",
                    "tier": "fast",
                    "max_rounds": 1,
                    "judge_vendor": "openai",
                    "debater_a_vendor": "anthropic",
                    "debater_b_vendor": "google",
                },
                headers={"Accept": "text/event-stream"},
            ) as resp:
                assert resp.status_code == 200
                assert "text/event-stream" in resp.headers["content-type"]

                events = []
                current_event = None
                async for line in resp.aiter_lines():
                    line = line.strip()
                    if line.startswith("event:"):
                        current_event = line.split(":", 1)[1].strip()
                    elif line.startswith("data:") and current_event:
                        data = json.loads(line.split(":", 1)[1].strip())
                        events.append({"event": current_event, "data": data})
                        current_event = None

    event_types = [e["event"] for e in events]
    assert "round_start" in event_types
    assert "turn_complete" in event_types
    assert "convergence" in event_types
    assert "judge_start" in event_types
    assert "verdict" in event_types
    assert "done" in event_types

    verdict_event = next(e for e in events if e["event"] == "verdict")
    assert "tldr" in verdict_event["data"]


@pytest.mark.asyncio
async def test_debate_rejects_blank_question():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/debate", json={"question": "   "})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_debate_rejects_bad_vendor():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/debate", json={"question": "q", "judge_vendor": "mistral"})
    assert resp.status_code == 422
