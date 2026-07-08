"""Smoke tests for the FastAPI SSE endpoint (no real LLM calls)."""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import DebaterOutput, Verdict


@pytest.fixture
def fake_debater_output():
    return DebaterOutput(
        position="Test position text.",
        concessions=[],
        disputes=[],
        confidence=0.8,
    )


@pytest.fixture
def fake_verdict():
    return Verdict(
        agreements=["point a"],
        unresolved_disputes=[],
        recommendation="Test recommendation.",
        confidence=0.9,
        dissent_notes="",
    )


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_debate_streams_sse_events(fake_debater_output, fake_verdict):
    structured_debater = AsyncMock(return_value=fake_debater_output)
    structured_judge = AsyncMock(return_value=fake_verdict)

    mock_debater_model = MagicMock()
    mock_debater_model.with_structured_output.return_value = MagicMock(ainvoke=structured_debater)

    mock_judge_model = MagicMock()
    mock_judge_model.with_structured_output.return_value = MagicMock(ainvoke=structured_judge)

    def get_model_side_effect(state, role):
        if role in ("debater_a", "debater_b"):
            return mock_debater_model
        return mock_judge_model

    with patch("app.streaming._get_model", side_effect=get_model_side_effect):
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
                    "judge_vendor": "anthropic",
                    "api_keys": {"anthropic": "key", "google": "key", "openai": "key"},
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
    assert "recommendation" in verdict_event["data"]
