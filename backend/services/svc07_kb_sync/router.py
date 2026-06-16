import uuid

from fastapi import APIRouter, Depends, HTTPException

from shared.models.auth import User
from services.svc02_auth.dependencies import get_current_user, require_admin
from services.svc07_kb_sync import schemas, service

router = APIRouter(tags=["kb"])


@router.get("/status", response_model=schemas.KBStatusResponse)
def get_status(_: User = Depends(get_current_user)):
    return service.get_status()


@router.post("/sync/{entry_id}", response_model=dict)
def sync_one(entry_id: uuid.UUID, _: User = Depends(require_admin)):
    """Manually trigger sync for a single procedure."""
    chunks = service.sync_procedure(str(entry_id))
    return {"entry_id": str(entry_id), "chunks_indexed": chunks}


@router.post("/sync/rebuild", response_model=dict)
def rebuild_index(_: User = Depends(require_admin)):
    """Rebuild the entire vector index from all published procedures."""
    total = service.rebuild_full_index()
    return {"message": "Full rebuild complete", "total_chunks": total}


@router.post("/search", response_model=schemas.SearchResponse)
def search_kb(body: schemas.SearchRequest, _: User = Depends(get_current_user)):
    if not body.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    hits_raw = service.search(
        body.query,
        top_k=body.top_k,
        stream_target=body.stream_target,
        language=body.language,
    )

    hits = [
        schemas.SearchHit(
            entry_id=m["entry_id"],
            chunk_index=m["chunk_index"],
            score=round(score, 4),
            title=m["title"],
            chunk_preview=m["chunk_text"][:200],
            stream_target=m["stream_target"],
            applicable_roles=m["applicable_roles"],
            risk_level=m["risk_level"],
            language=m["language"],
            department_id=m.get("department_id"),
        )
        for score, m in hits_raw
    ]

    return schemas.SearchResponse(
        query=body.query,
        hits=hits,
        total_vectors_searched=service.store.vector_count,
    )
