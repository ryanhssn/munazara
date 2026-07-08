import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from app.streaming import DebateRequest, run_debate_stream

app = FastAPI(title="Munazara API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/debate")
async def debate(req: DebateRequest):
    async def generator():
        try:
            async for event in run_debate_stream(req):
                yield {"event": event["event"], "data": json.dumps(event["data"])}
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": str(e)})}

    return EventSourceResponse(generator())
