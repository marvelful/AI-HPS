"""
AI-HPS Agent Pipeline Service — FastAPI entrypoint.
Run: uvicorn agents.main:app --port 8020 --reload
Docs: http://localhost:8020/docs
"""
import asyncio
import threading
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:3004", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


def _intent_to_agent(intent: Optional[str], is_emergency: bool) -> str:
    if is_emergency:
        return "agent_e"
    return {"navigation": "agent_n", "information": "agent_c", "procedure": "agent_p"}.get(intent or "", "agent_o")


def _write_query_event(req: "QueryRequest", result: dict, elapsed_ms: int) -> None:
    from shared.database import SessionLocal
    from shared.models.analytics import QueryEvent
    db = SessionLocal()
    try:
        evt = QueryEvent(
            session_id=req.session_id,
            user_id=uuid.UUID(req.user_id) if req.user_id else None,
            query=req.raw_query[:2000],
            intent=result.get("intent"),
            agent=_intent_to_agent(result.get("intent"), result.get("is_emergency", False)),
            had_result=result.get("had_result", False),
            response_time_ms=elapsed_ms,
            platform=req.platform,
            stream=req.stream,
        )
        db.add(evt)
        db.commit()
    except Exception as exc:
        print(f"[pipeline] Analytics log failed (non-fatal): {exc}")
    finally:
        db.close()


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
    t0 = time.time()
    try:
        result = await loop.run_in_executor(None, pipeline.invoke, state)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {exc}")
    elapsed_ms = int((time.time() - t0) * 1000)

    # Fire-and-forget analytics (non-blocking)
    threading.Thread(target=_write_query_event, args=(req, result, elapsed_ms), daemon=True).start()

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


@app.get("/pipeline/test-llm")
def test_llm():
    """Quick smoke-test: calls Grok with a single message and returns the raw result or error."""
    from shared.config import get_settings as _gs
    s = _gs()
    key = s.XAI_API_KEY
    if not key:
        return {"ok": False, "error": "XAI_API_KEY is empty — check your .env file"}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=key, base_url="https://api.x.ai/v1")
        resp = client.chat.completions.create(
            model="grok-3",
            messages=[{"role": "user", "content": "Reply with the single word: OK"}],
            max_tokens=10,
            temperature=0,
        )
        return {"ok": True, "response": resp.choices[0].message.content}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
