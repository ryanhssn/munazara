import json
import logging
import os
import uuid
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.logging_config import setup_logging, new_request_id
from app.streaming import DebateRequest, run_debate_stream
from app.graph import build_graph

setup_logging(level=os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

_REQUIRED_KEYS = ("ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY")

# Shared checkpointed graph — created at startup, torn down at shutdown.
_checkpointed_graph = None


def _check_config() -> dict[str, str]:
    return {
        k.replace("_API_KEY", "").lower(): ("ok" if os.environ.get(k) else "missing")
        for k in _REQUIRED_KEYS
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _checkpointed_graph
    db_path = os.environ.get("DEBATE_DB_PATH", "debate.sqlite")
    try:
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
        async with AsyncSqliteSaver.from_conn_string(db_path) as checkpointer:
            _checkpointed_graph = build_graph(checkpointer=checkpointer)
            logger.info("checkpointer_ready", extra={"db": db_path})
            yield
    except Exception as exc:
        logger.warning("checkpointer_unavailable", extra={"error": str(exc)})
        _checkpointed_graph = None
        yield
    finally:
        _checkpointed_graph = None


app = FastAPI(title="Munazara API", lifespan=lifespan)

_cors_origin = os.environ.get("CORS_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_cors_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.get("/health")
async def health(response: Response):
    providers = _check_config()
    all_ok = all(v == "ok" for v in providers.values())
    if not all_ok:
        response.status_code = 503
    return {
        "status": "ok" if all_ok else "degraded",
        "providers": providers,
        "persistence": "ok" if _checkpointed_graph is not None else "unavailable",
    }


@app.post("/api/debate")
async def debate(req: DebateRequest):
    new_request_id()
    thread_id = str(uuid.uuid4())
    logger.info("debate_start", extra={
        "thread_id": thread_id,
        "question_len": len(req.question),
        "tier": req.tier,
        "max_rounds": req.max_rounds,
        "debater_a": req.debater_a_vendor,
        "debater_b": req.debater_b_vendor,
        "judge": req.judge_vendor,
    })

    graph = _checkpointed_graph
    tid = thread_id if graph is not None else None

    async def generator():
        try:
            async for event in run_debate_stream(req, graph=graph, thread_id=tid):
                yield {"event": event["event"], "data": json.dumps(event["data"])}
            logger.info("debate_done", extra={"thread_id": thread_id})
        except Exception as e:
            logger.exception("debate_error", extra={"thread_id": thread_id, "error": str(e)})
            yield {"event": "error", "data": json.dumps({"message": "Debate failed. Check server logs."})}

    return EventSourceResponse(generator())


@app.get("/api/debate/{thread_id}")
async def get_debate(thread_id: str):
    """Retrieve a stored debate verdict by thread_id."""
    if _checkpointed_graph is None:
        raise HTTPException(status_code=503, detail="Persistence unavailable")
    try:
        state = await _checkpointed_graph.aget_state({"configurable": {"thread_id": thread_id}})
    except Exception as exc:
        logger.exception("get_debate_error", extra={"thread_id": thread_id})
        raise HTTPException(status_code=500, detail="Internal server error")
    if state is None or not state.values:
        raise HTTPException(status_code=404, detail="Debate not found")
    values = state.values
    return {
        "thread_id": thread_id,
        "question": values.get("question"),
        "verdict": values.get("verdict"),
        "transcript": values.get("transcript", []),
        "agreements": values.get("agreements", []),
        "open_disputes": values.get("open_disputes", []),
        "round_count": values.get("round_count"),
    }
