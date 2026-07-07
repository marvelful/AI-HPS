"""
SVC-06 audit service.

Each audit record is signed with HMAC-SHA256 over its core fields.
The signature is stored inside event_metadata so it travels with the record.
"""
import hashlib
import hmac
import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from shared.config import get_settings
from shared.models.audit import AuditLog
from services.svc06_audit.schemas import AuditEventIn

settings = get_settings()

_HMAC_KEY = settings.SECRET_KEY.encode("utf-8")


def _sign(event_type: str, user_id: str | None, entity_id: str | None, ts: str) -> str:
    """Compute HMAC-SHA256 over deterministic canonical string."""
    canonical = f"{event_type}|{user_id or ''}|{entity_id or ''}|{ts}"
    return hmac.new(_HMAC_KEY, canonical.encode(), hashlib.sha256).hexdigest()


def _safe_uuid(value: str | None) -> uuid.UUID | None:
    if not value:
        return None
    try:
        return uuid.UUID(str(value))
    except (ValueError, AttributeError):
        return None


def write_audit_event(db: Session, event: AuditEventIn, ip_address: Optional[str] = None) -> AuditLog:
    ts = event.timestamp or datetime.now(timezone.utc).isoformat()
    sig = _sign(event.event_type, event.user_id, event.entity_id, ts)

    meta = dict(event.metadata or {})
    meta["hmac_sha256"] = sig
    meta["signed_at"] = ts

    record = AuditLog(
        event_type=event.event_type,
        user_id=_safe_uuid(event.user_id),
        entity_type=event.entity_type,
        entity_id=_safe_uuid(event.entity_id),
        changes=event.changes or {},
        event_metadata=meta,
        ip_address=ip_address,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def verify_record(db: Session, record_id: uuid.UUID) -> tuple[bool, str]:
    record = db.query(AuditLog).filter(AuditLog.id == record_id).first()
    if not record:
        return False, "Record not found"

    stored_sig = record.event_metadata.get("hmac_sha256", "")
    signed_at  = record.event_metadata.get("signed_at", "")

    expected = _sign(
        record.event_type,
        str(record.user_id) if record.user_id else None,
        str(record.entity_id) if record.entity_id else None,
        signed_at,
    )

    if hmac.compare_digest(stored_sig, expected):
        return True, "Signature valid — record has not been tampered with"
    return False, "Signature MISMATCH — record may have been tampered with"


def list_events(
    db: Session,
    event_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    q = db.query(AuditLog)
    if event_type:
        q = q.filter(AuditLog.event_type == event_type)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return items, total
