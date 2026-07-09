"""
Idempotently align and seed the production database.

This keeps production useful after a fresh deploy by:
  - creating missing SQLAlchemy-managed knowledge tables,
  - aligning older schema.sql installs with newer model columns,
  - loading knowledge_chunks.jsonl into PostgreSQL,
  - publishing one procedure entry per source PDF with a document_url.
"""
from __future__ import annotations

import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from shared.database import Base, SessionLocal, engine
from shared.models.auth import User
from shared.models.procedures import Department, KnowledgeChunk, KnowledgeSource, ProcedureEntry
from services.svc02_auth.service import hash_password


ADMIN_EMAIL = os.getenv("AIHPS_SEED_ADMIN_EMAIL", "admin@aihps.tech")
ADMIN_PASSWORD = os.getenv("AIHPS_SEED_ADMIN_PASSWORD", "AihpsAdmin#2026!")

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
KNOWLEDGE_JSONL = BACKEND_ROOT / "knowledge" / "knowledge_chunks.jsonl"
GDRIVE_MAP = BACKEND_ROOT / "scripts" / "gdrive_procedures_map.json"
PROCEDURES_DIR = PROJECT_ROOT / "PROCEDURES"
PUBLIC_DOCS_BASE = os.getenv("AIHPS_PUBLIC_DOCS_BASE", "https://aihps.tech/procedure-docs")


DEPARTMENT_ALIASES = {
    "blood bank": "Blood Bank",
    "blood_bank": "Blood Bank",
    "bloodbank": "Blood Bank",
    "icu": "ICU",
    "infection control": "Infection Control",
    "infection_control": "Infection Control",
    "maternity": "Maternity",
    "surgery": "Surgery",
    "emergency": "Emergency",
}

PROCEDURE_FOLDER_BY_DEPARTMENT = {
    "Blood Bank": "BLOODBANK",
    "ICU": "ICU",
    "Infection Control": "Infection Control Department",
    "Maternity": "MATERNITY",
    "Surgery": "SURGERY",
    "Emergency": "EMERGENCY",
}


def _align_schema(db) -> None:
    Base.metadata.create_all(bind=engine)
    db.execute(text("ALTER TABLE aihps_auth.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
    db.execute(text("ALTER TABLE aihps_auth.users ADD COLUMN IF NOT EXISTS date_of_birth DATE"))
    db.execute(text("ALTER TABLE aihps_procedures.departments ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255)"))
    db.execute(text("ALTER TABLE aihps_procedures.categories ADD COLUMN IF NOT EXISTS knowledge_domain VARCHAR(60) NOT NULL DEFAULT 'clinical_procedure'"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS knowledge_domain VARCHAR(60) NOT NULL DEFAULT 'clinical_procedure'"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS source_id UUID"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS document_url TEXT"))
    db.execute(text("CREATE INDEX IF NOT EXISTS idx_kchunks_search ON aihps_procedures.knowledge_chunks USING GIN(search_vector)"))
    db.execute(text("ALTER TABLE aihps_auth.lockout_records DROP CONSTRAINT IF EXISTS lockout_records_user_id_fkey"))
    db.execute(text("ALTER TABLE aihps_auth.token_blacklist DROP CONSTRAINT IF EXISTS token_blacklist_user_id_fkey"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries DROP CONSTRAINT IF EXISTS procedure_entries_created_by_fkey"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries DROP CONSTRAINT IF EXISTS procedure_entries_updated_by_fkey"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_versions DROP CONSTRAINT IF EXISTS procedure_versions_created_by_fkey"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_approvals DROP CONSTRAINT IF EXISTS procedure_approvals_approver_id_fkey"))
    db.commit()


def _ensure_admin_user(db) -> User:
    admin = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if admin is None:
        admin = User(
            email=ADMIN_EMAIL,
            full_name="AI-HPS Super Admin",
            password_hash=hash_password(ADMIN_PASSWORD),
            role="super_admin",
            is_active=True,
        )
        db.add(admin)
    else:
        admin.full_name = "AI-HPS Super Admin"
        admin.role = "super_admin"
        admin.is_active = True
        admin.failed_attempts = 0
        admin.lockout_until = None
        admin.password_hash = hash_password(ADMIN_PASSWORD)
    db.commit()
    db.refresh(admin)
    return admin


def _department_map(db) -> dict[str, Department]:
    departments = db.query(Department).all()
    by_name = {d.name.lower(): d for d in departments}
    for raw, canonical in DEPARTMENT_ALIASES.items():
        if canonical.lower() in by_name:
            by_name[raw] = by_name[canonical.lower()]
    return by_name


def _pdf_url_by_filename() -> dict[str, str]:
    urls: dict[str, str] = {}
    if not PROCEDURES_DIR.exists():
        return urls
    for pdf in PROCEDURES_DIR.rglob("*.pdf"):
        rel = pdf.relative_to(PROCEDURES_DIR).as_posix()
        urls[pdf.name.lower()] = f"{PUBLIC_DOCS_BASE}/{quote(rel)}"
    return urls


def _document_url(first_chunk: dict, pdf_urls: dict[str, str]) -> str | None:
    source_name = str(first_chunk.get("source") or "").strip()
    if not source_name:
        return None
    existing = pdf_urls.get(source_name.lower())
    if existing:
        return existing
    department = DEPARTMENT_ALIASES.get(str(first_chunk.get("department", "")).lower(), str(first_chunk.get("department", "")))
    folder = PROCEDURE_FOLDER_BY_DEPARTMENT.get(department)
    if not folder:
        return None
    return f"{PUBLIC_DOCS_BASE}/{quote(f'{folder}/{source_name}')}"


def _google_drive_preview_url(url: str) -> str:
    if "drive.google.com" not in url:
        return url
    parts = url.split("/d/", 1)
    if len(parts) == 2:
        file_id = parts[1].split("/", 1)[0]
        if file_id:
            return f"https://drive.google.com/file/d/{file_id}/preview"
    return url


def _load_chunks() -> list[dict]:
    if not KNOWLEDGE_JSONL.exists():
        raise FileNotFoundError(f"Missing knowledge source: {KNOWLEDGE_JSONL}")
    chunks: list[dict] = []
    with KNOWLEDGE_JSONL.open("r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))
    return chunks


def _seed_knowledge(db, chunks: list[dict], dept_by_name: dict[str, Department]) -> dict[str, KnowledgeSource]:
    now = datetime.now(timezone.utc)
    docs: dict[str, list[dict]] = defaultdict(list)
    for chunk in chunks:
        docs[chunk["document_id"]].append(chunk)

    sources: dict[str, KnowledgeSource] = {}
    for doc_id, doc_chunks in docs.items():
        first = doc_chunks[0]
        dept = dept_by_name.get(str(first.get("department", "")).lower())
        source = db.query(KnowledgeSource).filter(KnowledgeSource.document_id == doc_id).first()
        if source is None:
            source = KnowledgeSource(document_id=doc_id, filename=first.get("source", doc_id))
            db.add(source)
        source.original_path = str(PROCEDURES_DIR)
        source.document_type = first.get("document_type") or "pdf"
        source.knowledge_domain = first.get("knowledge_domain") or "who_guideline"
        source.department_id = dept.id if dept else None
        source.language = first.get("language") or "EN"
        source.source_organization = "World Health Organization"
        source.citation = first.get("citation")
        source.approval_status = first.get("approval_status") or "approved"
        source.version = str(first.get("version") or "1.0")
        source.total_chunks = len(doc_chunks)
        source.last_ingested_at = now
        db.flush()

        db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc_id).delete(synchronize_session=False)
        for c in doc_chunks:
            db.add(KnowledgeChunk(
                chunk_id=c["chunk_id"],
                source_id=source.id,
                document_id=c["document_id"],
                title=(c.get("title") or source.filename)[:500],
                content=c.get("content") or "",
                category=c.get("category") or "who_guideline",
                knowledge_domain=c.get("knowledge_domain") or "who_guideline",
                department=c.get("department"),
                department_id=dept.id if dept else None,
                source=(c.get("source") or source.filename)[:500],
                language=c.get("language") or "EN",
                document_type=c.get("document_type") or "pdf",
                procedure_type=c.get("procedure_type"),
                visibility=c.get("visibility") or "public",
                role=c.get("role") or "all",
                page=c.get("page"),
                section=(c.get("section") or "")[:500] or None,
                chunk_index=int(c.get("chunk_index") or 0),
                citation=c.get("citation"),
                approval_status=c.get("approval_status") or "approved",
                version=str(c.get("version") or "1.0"),
                is_table=bool(c.get("is_table", False)),
            ))
        sources[doc_id] = source
    db.commit()
    db.execute(text("""
        UPDATE aihps_procedures.knowledge_chunks
        SET search_vector =
            setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(section, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(content, '')), 'C')
    """))
    db.commit()
    return sources


def _seed_procedures(db, docs: dict[str, list[dict]], sources: dict[str, KnowledgeSource], admin: User, dept_by_name: dict[str, Department]) -> int:
    pdf_urls = _pdf_url_by_filename()
    count = 0
    for doc_id, doc_chunks in docs.items():
        first = doc_chunks[0]
        source = sources[doc_id]
        existing = db.query(ProcedureEntry).filter(ProcedureEntry.source_id == source.id).first()
        dept = dept_by_name.get(str(first.get("department", "")).lower())
        content = "\n\n".join(c.get("content", "") for c in doc_chunks[:8]).strip()
        summary = (first.get("content") or "").replace("\n", " ").strip()[:700]
        document_url = _document_url(first, pdf_urls)
        if existing is None:
            existing = ProcedureEntry(
                title=(first.get("source") or first.get("title") or doc_id).replace(".pdf", "").strip()[:500],
                content=content or first.get("title") or doc_id,
                created_by=admin.id,
            )
            db.add(existing)
        existing.summary = summary
        existing.content = content or existing.content
        existing.steps = []
        existing.compliance_annotations = []
        existing.knowledge_domain = first.get("knowledge_domain") or "who_guideline"
        is_patient_facing = (first.get("source") or "").lower() == "who guidelines on hand hygiene in health care.pdf"
        existing.stream_target = "both" if is_patient_facing else "B"
        existing.applicable_roles = ["doctor", "nurse", "staff"] + (["patient"] if is_patient_facing else [])
        existing.risk_level = "medium"
        existing.status = "published"
        existing.department_id = dept.id if dept else None
        existing.category_id = None
        existing.source_id = source.id
        existing.language = first.get("language") or "EN"
        existing.document_url = document_url
        existing.published_at = datetime.now(timezone.utc)
        count += 1
    db.commit()
    return count


def _seed_gdrive_procedures(db, admin: User, dept_by_name: dict[str, Department]) -> int:
    if not GDRIVE_MAP.exists():
        return 0
    entries = json.loads(GDRIVE_MAP.read_text(encoding="utf-8"))
    count = 0
    for item in entries:
        title = str(item.get("title") or "").strip()
        document_url = _google_drive_preview_url(str(item.get("document_url") or "").strip())
        if not title or not document_url:
            continue

        dept = dept_by_name.get(str(item.get("department_name") or "").lower())
        existing = db.query(ProcedureEntry).filter(ProcedureEntry.title == title).first()
        if existing is None:
            existing = ProcedureEntry(
                title=title,
                content=item.get("summary") or title,
                created_by=admin.id,
                version=1,
            )
            db.add(existing)

        existing.summary = item.get("summary")
        existing.content = item.get("summary") or title
        existing.steps = []
        existing.compliance_annotations = []
        existing.knowledge_domain = item.get("knowledge_domain") or "clinical_procedure"
        existing.stream_target = "B"
        existing.applicable_roles = ["doctor", "nurse", "staff"]
        existing.risk_level = item.get("risk_level") or "medium"
        existing.status = "published"
        existing.department_id = dept.id if dept else None
        existing.category_id = None
        existing.language = item.get("language") or "EN"
        existing.document_url = document_url
        existing.updated_by = admin.id
        existing.published_at = datetime.now(timezone.utc)
        count += 1
    db.commit()
    return count


def main() -> None:
    db = SessionLocal()
    try:
        _align_schema(db)
        admin = _ensure_admin_user(db)
        dept_by_name = _department_map(db)
        chunks = _load_chunks()
        docs: dict[str, list[dict]] = defaultdict(list)
        for chunk in chunks:
            docs[chunk["document_id"]].append(chunk)
        sources = _seed_knowledge(db, chunks, dept_by_name)
        procedure_count = _seed_procedures(db, docs, sources, admin, dept_by_name)
        gdrive_count = _seed_gdrive_procedures(db, admin, dept_by_name)
        print(f"knowledge_chunks={len(chunks)} knowledge_sources={len(sources)} procedures={procedure_count} gdrive_procedures={gdrive_count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
