"""Retrieval tool for debate evidence gathering.

Contract: strictly typed I/O, security boundaries (query length cap, result
count cap, no arbitrary URL fetching), and graceful degradation on failure.
Provider is swappable behind the RetrievalProvider interface.
"""
import asyncio
import logging
import os
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Security boundaries — keep these conservative.
MAX_QUERY_LEN = 200
MAX_RESULTS = 5
SEARCH_TIMEOUT_SECS = 10


class SearchQuery(BaseModel):
    query: str = Field(max_length=MAX_QUERY_LEN, description="Fact-check query for the debate claim")
    max_results: int = Field(default=3, ge=1, le=MAX_RESULTS)


class SearchResult(BaseModel):
    title: str
    snippet: str
    url: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    provider: str
    error: str | None = None


# ── Provider interface ────────────────────────────────────────────────────────

class RetrievalProvider:
    """Implement this for each search backend."""
    name: str = "base"

    async def search(self, query: SearchQuery) -> list[SearchResult]:
        raise NotImplementedError


class TavilyProvider(RetrievalProvider):
    name = "tavily"

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def search(self, query: SearchQuery) -> list[SearchResult]:
        import httpx
        async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT_SECS) as client:
            resp = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": self._api_key,
                    "query": query.query,
                    "max_results": query.max_results,
                    "include_answer": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        return [
            SearchResult(
                title=r.get("title", ""),
                snippet=r.get("content", "")[:400],
                url=r.get("url", ""),
            )
            for r in data.get("results", [])[: query.max_results]
        ]


class DuckDuckGoProvider(RetrievalProvider):
    name = "duckduckgo"

    async def search(self, query: SearchQuery) -> list[SearchResult]:
        from ddgs import DDGS

        def _sync_search():
            with DDGS() as ddgs:
                return list(ddgs.text(query.query, max_results=query.max_results))

        results = await asyncio.get_event_loop().run_in_executor(None, _sync_search)
        return [
            SearchResult(
                title=r.get("title", ""),
                snippet=r.get("body", "")[:400],
                url=r.get("href", ""),
            )
            for r in results
        ]


# ── Public API ────────────────────────────────────────────────────────────────

def _get_provider() -> RetrievalProvider:
    """Return best available provider: Tavily if key set, else DuckDuckGo."""
    tavily_key = os.environ.get("TAVILY_API_KEY")
    if tavily_key:
        return TavilyProvider(api_key=tavily_key)
    return DuckDuckGoProvider()


async def fetch_evidence(query: SearchQuery) -> SearchResponse:
    """Execute a search and return typed results. Never raises — degrades gracefully."""
    provider = _get_provider()
    try:
        results = await asyncio.wait_for(
            provider.search(query),
            timeout=SEARCH_TIMEOUT_SECS,
        )
        logger.info("retrieval_ok", extra={
            "provider": provider.name,
            "query": query.query,
            "results": len(results),
        })
        return SearchResponse(query=query.query, results=results, provider=provider.name)
    except Exception as exc:
        logger.warning("retrieval_failed", extra={
            "provider": provider.name,
            "query": query.query,
            "error": str(exc),
        })
        return SearchResponse(
            query=query.query,
            results=[],
            provider=provider.name,
            error=str(exc),
        )
