"""
AI-HPS Agent Pipeline Service — FastAPI entrypoint.
Run: uvicorn agents.main:app --port 8020 --reload
Docs: http://localhost:8020/docs
"""
import asyncio
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from agents.state import initial_state
from agents.graph import get_pipeline
from agents.agent_e import warm_cache
from agents.shared.embeddings import load as load_embeddings


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()
    # Load dept embeddings, warm emergency cache, compile graph
    await loop.run_in_executor(None, load_embeddings)
    await loop.run_in_executor(None, warm_cache)
    # Load the KB vector index (SVC-07)
    try:
        from services.svc07_kb_sync.service import load_index
        await loop.run_in_executor(None, load_index)
    except Exception as exc:
        print(f"[pipeline] KB index load failed (non-fatal): {exc}")
    get_pipeline()  # compile LangGraph
    print("[pipeline] Ready — dept embeddings, emergency cache, KB index loaded")
    yield


app = FastAPI(
    title="AI-HPS Agent Pipeline",
    version="3.0.0",
    description="LangGraph-based AI pipeline for hospital procedure queries.",
    lifespan=lifespan,
)


class QueryRequest(BaseModel):
    raw_query: str
    platform: str = "web"        # whatsapp | sms | ussd | mobile | web
    stream: str = "A"            # A | B
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    session_id: Optional[str] = None
    chatbot_mode: bool = False


class QueryResponse(BaseModel):
    output: Any
    output_type: str
    is_emergency: bool
    had_result: bool
    language: str
    intent: Optional[str] = None
    error: Optional[str] = None


@app.post("/pipeline/query", response_model=QueryResponse)
async def query_pipeline(req: QueryRequest):
    if not req.raw_query or not req.raw_query.strip():
        raise HTTPException(status_code=422, detail="raw_query must not be empty")

    state = initial_state(
        raw_query=req.raw_query.strip(),
        platform=req.platform,
        stream=req.stream,
        user_id=req.user_id,
        user_role=req.user_role,
        session_id=req.session_id,
        chatbot_mode=req.chatbot_mode,
    )

    loop = asyncio.get_event_loop()
    pipeline = get_pipeline()
    try:
        result = await loop.run_in_executor(None, pipeline.invoke, state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")

    return QueryResponse(
        output=result.get("formatted_output"),
        output_type=result.get("output_type") or "text",
        is_emergency=result.get("is_emergency", False),
        had_result=result.get("had_result", False),
        language=result.get("language", "EN"),
        intent=result.get("intent"),
        error=result.get("error"),
    )


@app.get("/pipeline/health")
def health():
    return {"status": "ok", "service": "svc-agents", "version": "3.0.0"}
