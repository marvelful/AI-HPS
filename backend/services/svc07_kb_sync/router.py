"""SVC-07 router — KB management endpoints."""
from fastapi import APIRouter, HTTPException

from services.svc07_kb_sync import service

router = APIRouter(tags=["kb"])


@router.get("/kb/status")
def kb_status():
    return service.get_status()


@router.post("/kb/rebuild")
def kb_rebuild():
    """Re-embed all chunks from knowledge_chunks.jsonl and save the vector index."""
    try:
        count = service.rebuild_from_jsonl()
        return {"ok": True, "vectors_indexed": count, **service.get_status()}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=500, detail=f"{exc}\n{traceback.format_exc()}")


@router.post("/kb/search-test")
def kb_search_test(query: str = "blood transfusion procedure", top_k: int = 3):
    """Quick smoke-test: run a search and return the top chunks."""
    results = service.search(query, top_k=top_k)
    return {
        "query": query,
        "results": [
            {"score": round(score, 4), "chunk_id": m["chunk_id"], "title": m["title"],
             "department": m["department"], "content_preview": m["content"][:200]}
            for score, m in results
        ],
    }
