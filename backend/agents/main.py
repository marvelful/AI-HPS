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
from agents.shared.embeddings import load as load_embeddings


@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_event_loop()

    # Load department embedding index (non-fatal)
    try:
        await loop.run_in_executor(None, load_embeddings)
    except Exception as exc:
        print(f"[pipeline] Dept embeddings load failed (non-fatal): {exc}")

    # Load vector KB index (non-fatal — will be empty if rebuild-kb not yet run)
    try:
        from services.svc07_kb_sync.service import load_index
        await loop.run_in_executor(None, load_index)
    except Exception as exc:
        print(f"[pipeline] KB index load failed (non-fatal): {exc}")

    # Warm up the embedding model now so kb-status shows the real name
    try:
        from services.svc07_kb_sync.service import embedder
        await loop.run_in_executor(None, embedder.embed, ["warm"])
        print(f"[pipeline] Embedder ready: {embedder.name}")
    except Exception as exc:
        print(f"[pipeline] Embedder warm-up failed (semantic search degraded): {exc}")

    get_pipeline()  # compile LangGraph

    from shared.config import get_settings as _gs
    key = _gs().GROQ_API_KEY
    if not key:
        print("\n[pipeline] WARNING: GROQ_API_KEY not set — AI answers will be unavailable.\n")
    elif not key.startswith("gsk_"):
        print(f"\n[pipeline] WARNING: GROQ_API_KEY starts with '{key[:4]}…' — expected 'gsk_…'\n")

    print("[pipeline] Ready")
    yield


app = FastAPI(
    title="AI-HPS Agent Pipeline",
    version="4.0.0",
    description="LangGraph-based RAG pipeline for hospital knowledge queries.",
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
    platform: str = "web"        # web | mobile | whatsapp | sms | ussd
    stream: str = "A"            # A (patient) | B (staff)
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
    knowledge_domain: Optional[str] = None
    error: Optional[str] = None


def _write_query_event(req: QueryRequest, result: dict, elapsed_ms: int) -> None:
    from shared.database import SessionLocal
    from shared.models.analytics import QueryEvent
    db = SessionLocal()
    try:
        evt = QueryEvent(
            session_id=req.session_id,
            user_id=uuid.UUID(req.user_id) if req.user_id else None,
            query=req.raw_query[:2000],
            intent=result.get("intent"),
            agent=result.get("intent") or "unknown",
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
        import traceback
        print(f"[pipeline] Query error:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {type(exc).__name__}: {exc}")

    elapsed_ms = int((time.time() - t0) * 1000)
    threading.Thread(
        target=_write_query_event, args=(req, result, elapsed_ms), daemon=True
    ).start()

    return QueryResponse(
        output=result.get("formatted_output"),
        output_type=result.get("output_type") or "text",
        is_emergency=result.get("is_emergency", False),
        had_result=result.get("had_result", False),
        language=result.get("language", "EN"),
        intent=result.get("intent"),
        knowledge_domain=result.get("knowledge_domain"),
        error=result.get("error"),
    )


@app.get("/pipeline/health")
def health():
    return {"status": "ok", "service": "svc-agents", "version": "4.0.0"}


@app.get("/pipeline/kb-status")
def kb_status():
    try:
        from services.svc07_kb_sync.service import get_status
        return get_status()
    except Exception as exc:
        return {"error": str(exc)}


@app.post("/pipeline/rebuild-kb")
def rebuild_kb():
    """
    Embed all chunks from knowledge_chunks.jsonl and rebuild the vector index.
    Run this after the ingestion pipeline has produced the JSONL file.
    """
    try:
        from services.svc07_kb_sync.service import rebuild_from_jsonl, get_status
        count = rebuild_from_jsonl()
        return {"ok": True, "vectors_indexed": count, **get_status()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        return {"ok": False, "error": str(exc), "detail": traceback.format_exc()}


@app.get("/pipeline/test-llm")
def test_llm():
    from agents.shared.groq_client import smoke_test
    from shared.config import get_settings as _gs
    s = _gs()
    result = smoke_test()
    result["rag_top_k"] = s.RAG_TOP_K
    result["rag_min_similarity"] = s.RAG_MIN_SIMILARITY
    result["model"] = s.LLM_MODEL
    return result
