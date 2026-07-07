import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, Integer, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, TSVECTOR
from shared.database import Base


class Department(Base):
    __tablename__ = "departments"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name_fr: Mapped[str | None] = mapped_column(String(255), nullable=True)
    informal_names: Mapped[list] = mapped_column(ARRAY(Text), nullable=False, default=list)
    services: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    operating_hours: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    knowledge_domain: Mapped[str] = mapped_column(String(60), nullable=False, default="clinical_procedure")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.categories.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class KnowledgeSource(Base):
    """Tracks every ingested source document."""
    __tablename__ = "knowledge_sources"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    original_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_type: Mapped[str] = mapped_column(String(20), nullable=False, default="pdf")
    knowledge_domain: Mapped[str] = mapped_column(String(60), nullable=False, default="who_guideline")
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.departments.id", ondelete="SET NULL"), nullable=True
    )
    language: Mapped[str] = mapped_column(String(2), nullable=False, default="EN")
    source_organization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    citation: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), nullable=False, default="approved")
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_chunks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_ingested_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class KnowledgeChunk(Base):
    """A single semantic chunk extracted from a knowledge source."""
    __tablename__ = "knowledge_chunks"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.knowledge_sources.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(String(150), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(60), nullable=False, default="who_guideline")
    knowledge_domain: Mapped[str] = mapped_column(String(60), nullable=False, default="who_guideline")
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.departments.id", ondelete="SET NULL"), nullable=True
    )
    source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    language: Mapped[str] = mapped_column(String(2), nullable=False, default="EN")
    document_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    procedure_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="public")
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="all")
    page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    section: Mapped[str | None] = mapped_column(Text, nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    citation: Mapped[str | None] = mapped_column(Text, nullable=True)
    approval_status: Mapped[str] = mapped_column(String(20), nullable=False, default="approved")
    last_updated: Mapped[date | None] = mapped_column(Date, nullable=True)
    version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_table: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ProcedureEntry(Base):
    __tablename__ = "procedure_entries"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    compliance_annotations: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    knowledge_domain: Mapped[str] = mapped_column(String(60), nullable=False, default="clinical_procedure")
    stream_target: Mapped[str] = mapped_column(String(4), nullable=False, default="both")
    applicable_roles: Mapped[list] = mapped_column(ARRAY(Text), nullable=False, default=list)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False, default="low")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    department_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.departments.id", ondelete="SET NULL"), nullable=True
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.categories.id", ondelete="SET NULL"), nullable=True
    )
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.knowledge_sources.id", ondelete="SET NULL"), nullable=True
    )
    language: Mapped[str] = mapped_column(String(2), nullable=False, default="EN")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_auth.users.id"), nullable=False
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_auth.users.id"), nullable=True
    )
    document_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class ProcedureVersion(Base):
    __tablename__ = "procedure_versions"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.procedure_entries.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_auth.users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ProcedureApproval(Base):
    __tablename__ = "procedure_approvals"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.procedure_entries.id", ondelete="CASCADE"), nullable=False
    )
    approver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_auth.users.id"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class NavigationPath(Base):
    __tablename__ = "navigation_paths"
    __table_args__ = {"schema": "aihps_procedures"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_location: Mapped[str] = mapped_column(String(255), nullable=False)
    to_department_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("aihps_procedures.departments.id", ondelete="CASCADE"), nullable=False
    )
    language: Mapped[str] = mapped_column(String(2), nullable=False, default="EN")
    steps: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    estimated_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
