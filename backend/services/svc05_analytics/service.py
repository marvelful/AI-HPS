from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from shared.models.analytics import QueryEvent, ContentGap


def list_query_events(
    db: Session,
    platform: Optional[str] = None,
    stream: Optional[str] = None,
    had_result: Optional[bool] = None,
    intent: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[QueryEvent], int]:
    q = db.query(QueryEvent)
    if platform:
        q = q.filter(QueryEvent.platform == platform)
    if stream:
        q = q.filter(QueryEvent.stream == stream)
    if had_result is not None:
        q = q.filter(QueryEvent.had_result == had_result)
    if intent:
        q = q.filter(QueryEvent.intent == intent)
    total = q.count()
    items = q.order_by(QueryEvent.created_at.desc()).offset(skip).limit(limit).all()
    return items, total


def list_content_gaps(
    db: Session,
    min_occurrences: int = 1,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[ContentGap], int]:
    q = db.query(ContentGap).filter(ContentGap.occurrence_count >= min_occurrences)
    total = q.count()
    items = q.order_by(ContentGap.occurrence_count.desc()).offset(skip).limit(limit).all()
    return items, total


def get_summary(db: Session) -> dict:
    total = db.query(func.count(QueryEvent.id)).scalar() or 0
    successful = db.query(func.count(QueryEvent.id)).filter(QueryEvent.had_result == True).scalar() or 0
    avg_ms_row = db.query(func.avg(QueryEvent.response_time_ms)).scalar()
    avg_ms = float(avg_ms_row) if avg_ms_row is not None else None

    intent_rows = (
        db.query(QueryEvent.intent, func.count(QueryEvent.id))
        .filter(QueryEvent.intent.isnot(None))
        .group_by(QueryEvent.intent)
        .all()
    )
    platform_rows = (
        db.query(QueryEvent.platform, func.count(QueryEvent.id))
        .filter(QueryEvent.platform.isnot(None))
        .group_by(QueryEvent.platform)
        .all()
    )

    gap_count = db.query(func.sum(ContentGap.occurrence_count)).scalar() or 0
    unique_gaps = db.query(func.count(ContentGap.id)).scalar() or 0

    return {
        "total_queries": total,
        "successful_queries": successful,
        "success_rate_pct": round(successful / total * 100, 1) if total else 0.0,
        "avg_response_ms": round(avg_ms, 1) if avg_ms is not None else None,
        "top_intents": {row[0]: row[1] for row in intent_rows},
        "top_platforms": {row[0]: row[1] for row in platform_rows},
        "content_gap_count": int(gap_count),
        "unique_unanswered_queries": int(unique_gaps),
    }
