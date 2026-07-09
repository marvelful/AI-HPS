from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.models.auth import User
from services.svc02_auth.dependencies import require_staff_or_admin
from services.svc05_analytics import schemas, service

router = APIRouter(tags=["analytics"])


@router.get("/queries", response_model=schemas.QueryEventListResponse)
def list_queries(
    platform: Optional[str] = None,
    stream: Optional[str] = None,
    had_result: Optional[bool] = None,
    intent: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=1000),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    items, total = service.list_query_events(db, platform, stream, had_result, intent, skip, limit)
    return schemas.QueryEventListResponse(
        items=[schemas.QueryEventResponse(
            id=str(e.id), session_id=e.session_id,
            user_id=str(e.user_id) if e.user_id else None,
            query=e.query, intent=e.intent, agent=e.agent,
            had_result=e.had_result, response_time_ms=e.response_time_ms,
            platform=e.platform, stream=e.stream, created_at=e.created_at,
        ) for e in items],
        total=total, skip=skip, limit=limit,
    )


@router.get("/gaps", response_model=schemas.ContentGapListResponse)
def list_gaps(
    min_occurrences: int = 1,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    items, total = service.list_content_gaps(db, min_occurrences, skip, limit)
    return schemas.ContentGapListResponse(
        items=[schemas.ContentGapResponse(
            id=str(g.id), query=g.query,
            occurrence_count=g.occurrence_count,
            first_seen=g.first_seen, last_seen=g.last_seen,
        ) for g in items],
        total=total,
    )


@router.get("/summary", response_model=schemas.AnalyticsSummary)
def get_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_staff_or_admin),
):
    return service.get_summary(db)
