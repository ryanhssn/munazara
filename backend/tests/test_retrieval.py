"""Tests for the retrieval tool contract — schema, boundaries, graceful degradation."""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import ValidationError

from app.tools.retrieval import (
    SearchQuery,
    SearchResult,
    SearchResponse,
    fetch_evidence,
    MAX_QUERY_LEN,
    MAX_RESULTS,
)


def test_search_query_enforces_max_length():
    with pytest.raises(ValidationError):
        SearchQuery(query="x" * (MAX_QUERY_LEN + 1))


def test_search_query_enforces_max_results():
    with pytest.raises(ValidationError):
        SearchQuery(query="test", max_results=MAX_RESULTS + 1)


def test_search_query_valid():
    q = SearchQuery(query="Is LangGraph production ready?", max_results=3)
    assert q.max_results == 3


def test_search_result_typed():
    r = SearchResult(title="T", snippet="S", url="https://example.com")
    assert r.title == "T"


@pytest.mark.asyncio
async def test_fetch_evidence_returns_typed_response():
    fake_results = [
        SearchResult(title="T1", snippet="S1", url="https://a.com"),
        SearchResult(title="T2", snippet="S2", url="https://b.com"),
    ]
    mock_provider = MagicMock()
    mock_provider.name = "mock"
    mock_provider.search = AsyncMock(return_value=fake_results)

    with patch("app.tools.retrieval._get_provider", return_value=mock_provider):
        resp = await fetch_evidence(SearchQuery(query="test question"))

    assert isinstance(resp, SearchResponse)
    assert len(resp.results) == 2
    assert resp.error is None
    assert resp.provider == "mock"


@pytest.mark.asyncio
async def test_fetch_evidence_degrades_gracefully_on_error():
    """Tool failure must not raise — returns empty results with error field."""
    mock_provider = MagicMock()
    mock_provider.name = "mock"
    mock_provider.search = AsyncMock(side_effect=RuntimeError("network down"))

    with patch("app.tools.retrieval._get_provider", return_value=mock_provider):
        resp = await fetch_evidence(SearchQuery(query="test"))

    assert isinstance(resp, SearchResponse)
    assert resp.results == []
    assert resp.error is not None
    assert "network down" in resp.error


@pytest.mark.asyncio
async def test_fetch_evidence_degrades_gracefully_on_timeout():
    """Timeout also degrades gracefully."""
    import asyncio

    async def slow(*_):
        await asyncio.sleep(9999)

    mock_provider = MagicMock()
    mock_provider.name = "mock"
    mock_provider.search = slow

    with patch("app.tools.retrieval._get_provider", return_value=mock_provider):
        with patch("app.tools.retrieval.SEARCH_TIMEOUT_SECS", 0.01):
            resp = await fetch_evidence(SearchQuery(query="test"))

    assert resp.results == []
    assert resp.error is not None
