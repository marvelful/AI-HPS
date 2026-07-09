"""
SVC-03 business logic.

Approval state machine:
  draft ──(submit)──► pending ──(2 distinct approvals)──► published
    ▲                    │                                      │
    └──────(reject)──────┘                          (archive)──►archived
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from shared.models.auth import Admin, Staff, User
from shared.models.procedures import (
    Category, Department, NavigationPath,
    ProcedureApproval, ProcedureEntry, ProcedureVersion,
)
from services.svc03_procedures import schemas

ADMIN_ROLES = {"super_admin", "admin", "department_admin"}
HEAD_ROLES = {"department_head", "department_admin"}
CREATOR_ROLES = ADMIN_ROLES | {"department_head"}
APPROVER_ROLES = ADMIN_ROLES | {"department_head"}
REQUIRED_APPROVALS = 2


# ── helpers ─────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _require_admin(user: User) -> None:
    if user.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")


def _require_procedure_creator(user: User) -> None:
    if user.role not in CREATOR_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only department heads and admins can create procedures")


def _require_approver(user: User) -> None:
    if user.role not in APPROVER_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Approver role required")


def _get_entry_or_404(db: Session, entry_id: uuid.UUID) -> ProcedureEntry:
    entry = db.query(ProcedureEntry).filter(ProcedureEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Procedure not found")
    return entry


def _find_user_like(db: Session, user_id: uuid.UUID):
    return (
        db.query(User).filter(User.id == user_id).first()
        or db.query(Admin).filter(Admin.id == user_id).first()
        or db.query(Staff).filter(Staff.id == user_id).first()
    )


def _create_requested_approvals(db: Session, entry: ProcedureEntry, approver_ids: list[uuid.UUID]) -> int:
    seen: set[uuid.UUID] = set()
    created = 0
    for approver_id in approver_ids:
        if approver_id in seen or approver_id == entry.created_by:
            continue
        seen.add(approver_id)
        approver = _find_user_like(db, approver_id)
        if not approver or approver.role not in APPROVER_ROLES:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Selected approver must be an active department head or admin")
        existing = (
            db.query(ProcedureApproval)
            .filter(ProcedureApproval.entry_id == entry.id, ProcedureApproval.approver_id == approver_id)
            .first()
        )
        if not existing:
            db.add(ProcedureApproval(entry_id=entry.id, approver_id=approver_id, decision="pending"))
            created += 1
    return created


# ── Departments ──────────────────────────────────────────────────────────────

def list_departments(db: Session, active_only: bool = True) -> list[Department]:
    q = db.query(Department)
    if active_only:
        q = q.filter(Department.is_active.is_(True))
    return q.order_by(Department.name).all()


def get_department(db: Session, dept_id: uuid.UUID) -> Department:
    obj = db.query(Department).filter(Department.id == dept_id).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return obj


def create_department(db: Session, data: schemas.DepartmentCreate, actor: User) -> Department:
    _require_admin(actor)
    obj = Department(
        name=data.name,
        informal_names=data.informal_names,
        services=data.services,
        operating_hours=data.operating_hours,
        location=data.location,
        contact_details=data.contact_details,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_department(db: Session, dept_id: uuid.UUID, data: schemas.DepartmentUpdate, actor: User) -> Department:
    _require_admin(actor)
    obj = get_department(db, dept_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def verify_department(db: Session, dept_id: uuid.UUID, actor: User) -> Department:
    _require_admin(actor)
    obj = get_department(db, dept_id)
    obj.last_verified_at = _now()
    db.commit()
    db.refresh(obj)
    return obj


# ── Categories ───────────────────────────────────────────────────────────────

def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name).all()


def create_category(db: Session, data: schemas.CategoryCreate, actor: User) -> Category:
    _require_admin(actor)
    obj = Category(name=data.name, description=data.description, parent_id=data.parent_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Navigation Paths ─────────────────────────────────────────────────────────

def list_navigation_paths(
    db: Session, dept_id: Optional[uuid.UUID] = None, language: Optional[str] = None
) -> list[NavigationPath]:
    q = db.query(NavigationPath)
    if dept_id:
        q = q.filter(NavigationPath.to_department_id == dept_id)
    if language:
        q = q.filter(NavigationPath.language == language)
    return q.all()


def create_navigation_path(db: Session, data: schemas.NavigationPathCreate, actor: User) -> NavigationPath:
    _require_admin(actor)
    obj = NavigationPath(
        from_location=data.from_location,
        to_department_id=data.to_department_id,
        language=data.language,
        steps=data.steps,
        estimated_time_minutes=data.estimated_time_minutes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_navigation_path(
    db: Session, path_id: uuid.UUID, data: schemas.NavigationPathUpdate, actor: User
) -> NavigationPath:
    _require_admin(actor)
    obj = db.query(NavigationPath).filter(NavigationPath.id == path_id).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Navigation path not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    obj.last_verified_at = _now()
    db.commit()
    db.refresh(obj)
    return obj


def delete_navigation_path(db: Session, path_id: uuid.UUID, actor: User) -> None:
    _require_admin(actor)
    obj = db.query(NavigationPath).filter(NavigationPath.id == path_id).first()
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Navigation path not found")
    db.delete(obj)
    db.commit()


# ── Procedures — CRUD ────────────────────────────────────────────────────────

def list_procedures(
    db: Session,
    status_filter: Optional[str] = None,
    stream_filter: Optional[str] = None,
    dept_id: Optional[uuid.UUID] = None,
    language: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    actor: User | None = None,
) -> tuple[list[ProcedureEntry], int]:
    q = db.query(ProcedureEntry)
    if actor and actor.role == "patient":
        q = q.filter(ProcedureEntry.stream_target.in_(["A", "both"]))
    if actor and status_filter == "pending" and actor.role not in ADMIN_ROLES:
        q = q.join(ProcedureApproval, ProcedureApproval.entry_id == ProcedureEntry.id).filter(
            ProcedureApproval.approver_id == actor.id,
            ProcedureApproval.decision == "pending",
        )
    if status_filter:
        q = q.filter(ProcedureEntry.status == status_filter)
    if stream_filter:
        q = q.filter(ProcedureEntry.stream_target == stream_filter)
    if dept_id:
        q = q.filter(ProcedureEntry.department_id == dept_id)
    if language:
        q = q.filter(ProcedureEntry.language == language)
    total = q.count()
    items = q.order_by(ProcedureEntry.updated_at.desc()).offset(skip).limit(limit).all()
    return items, total


def get_procedure(db: Session, entry_id: uuid.UUID) -> ProcedureEntry:
    return _get_entry_or_404(db, entry_id)


def create_procedure(db: Session, data: schemas.ProcedureCreate, actor: User) -> ProcedureEntry:
    _require_procedure_creator(actor)
    entry = ProcedureEntry(
        title=data.title,
        summary=data.summary,
        content=data.content,
        steps=data.steps,
        compliance_annotations=data.compliance_annotations,
        knowledge_domain=data.knowledge_domain,
        stream_target=data.stream_target,
        applicable_roles=data.applicable_roles,
        risk_level=data.risk_level,
        department_id=data.department_id,
        category_id=data.category_id,
        language=data.language,
        document_url=data.document_url,
        created_by=actor.id,
        status="draft",
        version=1,
    )
    db.add(entry)
    db.flush()
    if data.approver_ids:
        _create_requested_approvals(db, entry, data.approver_ids)
        entry.status = "pending"
    db.commit()
    db.refresh(entry)
    return entry


def update_procedure(
    db: Session, entry_id: uuid.UUID, data: schemas.ProcedureUpdate, actor: User
) -> ProcedureEntry:
    entry = _get_entry_or_404(db, entry_id)
    if entry.status != "draft":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Only draft procedures can be edited (current status: {entry.status})",
        )
    if entry.created_by != actor.id and actor.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author or an admin may edit this procedure")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_by = actor.id
    db.commit()
    db.refresh(entry)
    return entry


def delete_procedure(db: Session, entry_id: uuid.UUID, actor: User) -> None:
    """Hard delete is only allowed for drafts by the author or admin."""
    _require_procedure_creator(actor)
    entry = _get_entry_or_404(db, entry_id)
    if entry.status not in {"draft", "archived"}:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Only draft or archived procedures can be deleted",
        )
    db.delete(entry)
    db.commit()


# ── Procedures — Approval State Machine ─────────────────────────────────────

def submit_for_approval(
    db: Session, entry_id: uuid.UUID, actor: User, data: schemas.SubmitApprovalRequest | None = None
) -> ProcedureEntry:
    entry = _get_entry_or_404(db, entry_id)
    if entry.status != "draft":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only draft procedures can be submitted")
    if entry.created_by != actor.id and actor.role not in ADMIN_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author or admin may submit this procedure")
    requested = data.approver_ids if data else []
    if not requested:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Select at least one department head or admin approver")

    # Snapshot current version before it enters review
    snapshot = ProcedureVersion(
        entry_id=entry.id,
        version=entry.version,
        title=entry.title,
        content=entry.content,
        steps=entry.steps,
        snapshot={
            "summary": entry.summary,
            "stream_target": entry.stream_target,
            "applicable_roles": entry.applicable_roles,
            "risk_level": entry.risk_level,
            "compliance_annotations": entry.compliance_annotations,
        },
        created_by=actor.id,
    )
    db.add(snapshot)
    _create_requested_approvals(db, entry, requested)

    entry.status = "pending"
    entry.updated_by = actor.id
    db.commit()
    db.refresh(entry)
    return entry


def approve_procedure(
    db: Session, entry_id: uuid.UUID, action: schemas.ApprovalAction, actor: User
) -> ProcedureEntry:
    _require_approver(actor)
    entry = _get_entry_or_404(db, entry_id)

    if entry.status != "pending":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Cannot approve a procedure with status '{entry.status}'"
        )
    if entry.created_by == actor.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Authors cannot approve their own procedures")

    existing = (
        db.query(ProcedureApproval)
        .filter(
            ProcedureApproval.entry_id == entry_id,
            ProcedureApproval.approver_id == actor.id,
        )
        .first()
    )
    requested_count = db.query(ProcedureApproval).filter(ProcedureApproval.entry_id == entry_id).count()
    if requested_count and not existing:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This procedure was not assigned to you for approval")
    if existing and existing.decision != "pending":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You have already acted on this procedure")

    if action.decision == "rejected":
        return _reject_procedure(db, entry, action, actor)

    if existing:
        existing.decision = "approved"
        existing.comment = action.comment
        existing.decided_at = _now()
    else:
        approval = ProcedureApproval(
            entry_id=entry.id,
            approver_id=actor.id,
            decision="approved",
            comment=action.comment,
            decided_at=_now(),
        )
        db.add(approval)
    db.flush()

    # Count approvals for this cycle
    approval_count = (
        db.query(ProcedureApproval)
        .filter(
            ProcedureApproval.entry_id == entry_id,
            ProcedureApproval.decision == "approved",
        )
        .count()
    )

    required = requested_count or REQUIRED_APPROVALS
    if approval_count >= required:
        entry.status = "published"
        entry.published_at = _now()
        entry.version += 1
        entry.updated_by = actor.id

    db.commit()
    db.refresh(entry)
    return entry


def _reject_procedure(
    db: Session, entry: ProcedureEntry, action: schemas.ApprovalAction, actor: User
) -> ProcedureEntry:
    existing = (
        db.query(ProcedureApproval)
        .filter(ProcedureApproval.entry_id == entry.id, ProcedureApproval.approver_id == actor.id)
        .first()
    )
    if existing:
        existing.decision = "rejected"
        existing.comment = action.comment
        existing.decided_at = _now()
    else:
        db.add(ProcedureApproval(
            entry_id=entry.id,
            approver_id=actor.id,
            decision="rejected",
            comment=action.comment,
            decided_at=_now(),
        ))
    # Clear prior approvals for this cycle so it restarts clean
    db.query(ProcedureApproval).filter(
        ProcedureApproval.entry_id == entry.id,
        ProcedureApproval.decision == "approved",
    ).delete(synchronize_session=False)

    entry.status = "draft"
    entry.updated_by = actor.id
    db.commit()
    db.refresh(entry)
    return entry


def archive_procedure(db: Session, entry_id: uuid.UUID, actor: User) -> ProcedureEntry:
    _require_admin(actor)
    entry = _get_entry_or_404(db, entry_id)
    if entry.status not in {"published", "pending"}:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Cannot archive a procedure with status '{entry.status}'"
        )
    entry.status = "archived"
    entry.updated_by = actor.id
    db.commit()
    db.refresh(entry)
    return entry


def get_approvals(db: Session, entry_id: uuid.UUID) -> list[ProcedureApproval]:
    _get_entry_or_404(db, entry_id)
    return (
        db.query(ProcedureApproval)
        .filter(ProcedureApproval.entry_id == entry_id)
        .order_by(ProcedureApproval.created_at.desc())
        .all()
    )
