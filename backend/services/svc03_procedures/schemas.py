import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, field_validator

VALID_STREAMS   = {"A", "B", "both"}
VALID_RISK      = {"low", "medium", "high", "critical"}
VALID_LANGUAGES = {"EN", "FR"}
VALID_DECISIONS = {"approved", "rejected"}
VALID_DOMAINS   = {
    "clinical_procedure", "administrative", "emergency",
    "department_info", "who_guideline", "public_faq", "policy",
}


# ── Department ──────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    informal_names: list[str] = []
    services: list[Any] = []
    operating_hours: dict = {}
    location: str | None = None
    contact_details: dict = {}


class DepartmentUpdate(BaseModel):
    name: str | None = None
    informal_names: list[str] | None = None
    services: list[Any] | None = None
    operating_hours: dict | None = None
    location: str | None = None
    contact_details: dict | None = None
    is_active: bool | None = None


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    informal_names: list[str]
    services: list[Any]
    operating_hours: dict
    location: str | None
    contact_details: dict
    is_active: bool
    last_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Category ────────────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    parent_id: uuid.UUID | None = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    parent_id: uuid.UUID | None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Navigation Path ─────────────────────────────────────────────────────────

class NavigationPathCreate(BaseModel):
    from_location: str
    to_department_id: uuid.UUID
    language: str = "EN"
    steps: list[dict] = []
    estimated_time_minutes: int | None = None

    @field_validator("language")
    @classmethod
    def chk_lang(cls, v: str) -> str:
        if v not in VALID_LANGUAGES:
            raise ValueError("language must be EN or FR")
        return v


class NavigationPathUpdate(BaseModel):
    from_location: str | None = None
    steps: list[dict] | None = None
    estimated_time_minutes: int | None = None


class NavigationPathResponse(BaseModel):
    id: uuid.UUID
    from_location: str
    to_department_id: uuid.UUID
    language: str
    steps: list[dict]
    estimated_time_minutes: int | None
    last_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Procedure ───────────────────────────────────────────────────────────────

class ProcedureCreate(BaseModel):
    title: str
    summary: str | None = None
    content: str
    steps: list[dict] = []
    compliance_annotations: list[dict] = []
    knowledge_domain: str = "clinical_procedure"
    stream_target: str = "both"
    applicable_roles: list[str] = []
    risk_level: str = "low"
    department_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    language: str = "EN"
    document_url: str | None = None

    @field_validator("knowledge_domain")
    @classmethod
    def chk_domain(cls, v: str) -> str:
        if v not in VALID_DOMAINS:
            raise ValueError(f"knowledge_domain must be one of {VALID_DOMAINS}")
        return v

    @field_validator("stream_target")
    @classmethod
    def chk_stream(cls, v: str) -> str:
        if v not in VALID_STREAMS:
            raise ValueError("stream_target must be A, B, or both")
        return v

    @field_validator("risk_level")
    @classmethod
    def chk_risk(cls, v: str) -> str:
        if v not in VALID_RISK:
            raise ValueError("risk_level must be low, medium, high, or critical")
        return v

    @field_validator("language")
    @classmethod
    def chk_lang(cls, v: str) -> str:
        if v not in VALID_LANGUAGES:
            raise ValueError("language must be EN or FR")
        return v


class ProcedureUpdate(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    steps: list[dict] | None = None
    compliance_annotations: list[dict] | None = None
    knowledge_domain: str | None = None
    stream_target: str | None = None
    applicable_roles: list[str] | None = None
    risk_level: str | None = None
    department_id: uuid.UUID | None = None
    category_id: uuid.UUID | None = None
    document_url: str | None = None


class ProcedureResponse(BaseModel):
    id: uuid.UUID
    title: str
    summary: str | None
    content: str
    steps: list[dict]
    compliance_annotations: list[dict]
    knowledge_domain: str
    stream_target: str
    applicable_roles: list[str]
    risk_level: str
    status: str
    department_id: uuid.UUID | None
    category_id: uuid.UUID | None
    language: str
    version: int
    document_url: str | None
    created_by: uuid.UUID
    updated_by: uuid.UUID | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ApprovalAction(BaseModel):
    decision: str
    comment: str | None = None

    @field_validator("decision")
    @classmethod
    def chk_decision(cls, v: str) -> str:
        if v not in VALID_DECISIONS:
            raise ValueError("decision must be approved or rejected")
        return v


class ApprovalResponse(BaseModel):
    id: uuid.UUID
    entry_id: uuid.UUID
    approver_id: uuid.UUID
    decision: str
    comment: str | None
    decided_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


class ProcedureListResponse(BaseModel):
    items: list[ProcedureResponse]
    total: int
    skip: int
    limit: int
