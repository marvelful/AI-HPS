import uuid
from datetime import datetime
from pydantic import BaseModel


class AuditEventIn(BaseModel):
    event_type: str
    user_id: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    changes: dict = {}
    metadata: dict = {}
    timestamp: str | None = None


class AuditEventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    user_id: uuid.UUID | None
    entity_type: str | None
    entity_id: uuid.UUID | None
    changes: dict
    event_metadata: dict
    ip_address: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class VerifyResponse(BaseModel):
    id: uuid.UUID
    valid: bool
    message: str
