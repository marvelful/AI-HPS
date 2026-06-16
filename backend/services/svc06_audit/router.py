import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.models.auth import User
from services.svc02_auth.dependencies import get_current_user, require_admin
from services.svc06_audit import schemas, service

router = APIRouter(tags=["audit"])


@router.post("/events/", response_model=schemas.AuditEventResponse, status_code=201)
def write_event(
    body: schemas.AuditEventIn,
    request: Request,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Directly write an audit event (admin use / internal services)."""
    ip = request.client.host if request.client else None
    return service.write_audit_event(db, body, ip)


@router.get("/events/", response_model=dict)
def list_events(
    event_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    items, total = service.list_events(db, event_type, entity_type, skip, limit)
    return {
        "items": [schemas.AuditEventResponse.model_validate(i) for i in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/events/{record_id}", response_model=schemas.AuditEventResponse)
def get_event(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from fastapi import HTTPException
    from shared.models.audit import AuditLog
    record = db.query(AuditLog).filter(AuditLog.id == record_id).first()
    if not record:
        raise HTTPException(404, "Audit record not found")
    return record


@router.get("/events/{record_id}/verify", response_model=schemas.VerifyResponse)
def verify_event(
    record_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    valid, msg = service.verify_record(db, record_id)
    return schemas.VerifyResponse(id=record_id, valid=valid, message=msg)
