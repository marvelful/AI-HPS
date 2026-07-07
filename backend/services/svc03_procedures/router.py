"""SVC-03 router — all procedure management endpoints."""
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.events import publish_audit, publish_redis
from shared.models.auth import User
from services.svc02_auth.dependencies import get_current_user, require_admin
from services.svc03_procedures import schemas, service

router = APIRouter(tags=["procedures"])


# ── Departments ──────────────────────────────────────────────────────────────

@router.get("/departments", response_model=list[schemas.DepartmentResponse])
def list_departments(
    active_only: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service.list_departments(db, active_only)


@router.post("/departments", response_model=schemas.DepartmentResponse, status_code=201)
def create_department(
    body: schemas.DepartmentCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.create_department(db, body, actor)
    bg.add_task(
        publish_audit, "department.created", str(actor.id), "department", str(obj.id),
        {"name": obj.name}, {},
    )
    return obj


@router.get("/departments/{dept_id}", response_model=schemas.DepartmentResponse)
def get_department(
    dept_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service.get_department(db, dept_id)


@router.put("/departments/{dept_id}", response_model=schemas.DepartmentResponse)
def update_department(
    dept_id: uuid.UUID,
    body: schemas.DepartmentUpdate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.update_department(db, dept_id, body, actor)
    bg.add_task(
        publish_audit, "department.updated", str(actor.id), "department", str(dept_id),
        body.model_dump(exclude_unset=True), {},
    )
    return obj


@router.post("/departments/{dept_id}/verify", response_model=schemas.DepartmentResponse)
def verify_department(
    dept_id: uuid.UUID,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.verify_department(db, dept_id, actor)
    bg.add_task(
        publish_audit, "department.verified", str(actor.id), "department", str(dept_id), {}, {},
    )
    return obj


# ── Categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[schemas.CategoryResponse])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return service.list_categories(db)


@router.post("/categories", response_model=schemas.CategoryResponse, status_code=201)
def create_category(
    body: schemas.CategoryCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.create_category(db, body, actor)
    bg.add_task(
        publish_audit, "category.created", str(actor.id), "category", str(obj.id),
        {"name": obj.name}, {},
    )
    return obj


# ── Navigation Paths ─────────────────────────────────────────────────────────

@router.get("/navigation", response_model=list[schemas.NavigationPathResponse])
def list_navigation(
    dept_id: Optional[uuid.UUID] = None,
    language: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service.list_navigation_paths(db, dept_id, language)


@router.post("/navigation", response_model=schemas.NavigationPathResponse, status_code=201)
def create_navigation(
    body: schemas.NavigationPathCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.create_navigation_path(db, body, actor)
    bg.add_task(
        publish_audit, "navigation.created", str(actor.id), "navigation_path", str(obj.id),
        {"from": obj.from_location, "dept": str(obj.to_department_id)}, {},
    )
    bg.add_task(publish_redis, "navigation.updated", {"path_id": str(obj.id)})
    return obj


@router.put("/navigation/{path_id}", response_model=schemas.NavigationPathResponse)
def update_navigation(
    path_id: uuid.UUID,
    body: schemas.NavigationPathUpdate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    obj = service.update_navigation_path(db, path_id, body, actor)
    bg.add_task(
        publish_audit, "navigation.updated", str(actor.id), "navigation_path", str(path_id),
        body.model_dump(exclude_unset=True), {},
    )
    bg.add_task(publish_redis, "navigation.updated", {"path_id": str(path_id)})
    return obj


@router.delete("/navigation/{path_id}", status_code=204)
def delete_navigation(
    path_id: uuid.UUID,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service.delete_navigation_path(db, path_id, actor)
    bg.add_task(
        publish_audit, "navigation.deleted", str(actor.id), "navigation_path", str(path_id), {}, {},
    )


# ── Procedures — CRUD ────────────────────────────────────────────────────────

@router.get("/procedures", response_model=schemas.ProcedureListResponse)
def list_procedures(
    proc_status: Optional[str] = Query(None, alias="status"),
    stream: Optional[str] = None,
    dept_id: Optional[uuid.UUID] = None,
    language: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = service.list_procedures(db, proc_status, stream, dept_id, language, skip, limit)
    return schemas.ProcedureListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/procedures", response_model=schemas.ProcedureResponse, status_code=201)
def create_procedure(
    body: schemas.ProcedureCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    entry = service.create_procedure(db, body, actor)
    bg.add_task(
        publish_audit, "procedure.created", str(actor.id), "procedure", str(entry.id),
        {"title": entry.title, "status": "draft"}, {},
    )
    return entry


@router.get("/procedures/{entry_id}", response_model=schemas.ProcedureResponse)
def get_procedure(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service.get_procedure(db, entry_id)


@router.put("/procedures/{entry_id}", response_model=schemas.ProcedureResponse)
def update_procedure(
    entry_id: uuid.UUID,
    body: schemas.ProcedureUpdate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    entry = service.update_procedure(db, entry_id, body, actor)
    bg.add_task(
        publish_audit, "procedure.updated", str(actor.id), "procedure", str(entry_id),
        body.model_dump(exclude_unset=True), {},
    )
    return entry


@router.delete("/procedures/{entry_id}", status_code=204)
def delete_procedure(
    entry_id: uuid.UUID,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    service.delete_procedure(db, entry_id, actor)
    bg.add_task(
        publish_audit, "procedure.deleted", str(actor.id), "procedure", str(entry_id), {}, {},
    )


# ── Procedures — Approval Workflow ────────────────────────────────────────────

@router.post("/procedures/{entry_id}/submit", response_model=schemas.ProcedureResponse)
def submit_for_approval(
    entry_id: uuid.UUID,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    entry = service.submit_for_approval(db, entry_id, actor)
    bg.add_task(
        publish_audit, "procedure.submitted", str(actor.id), "procedure", str(entry_id),
        {"status": "pending"}, {},
    )
    return entry


@router.post("/procedures/{entry_id}/approve", response_model=schemas.ProcedureResponse)
def approve_procedure(
    entry_id: uuid.UUID,
    body: schemas.ApprovalAction,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    entry = service.approve_procedure(db, entry_id, body, actor)

    event = "procedure.approved" if body.decision == "approved" else "procedure.rejected"
    bg.add_task(
        publish_audit, event, str(actor.id), "procedure", str(entry_id),
        {"decision": body.decision, "new_status": entry.status}, {},
    )

    if entry.status == "published":
        bg.add_task(
            publish_redis, "procedure.published",
            {"entry_id": str(entry_id), "version": entry.version},
        )

    return entry


@router.post("/procedures/{entry_id}/archive", response_model=schemas.ProcedureResponse)
def archive_procedure(
    entry_id: uuid.UUID,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    entry = service.archive_procedure(db, entry_id, actor)
    bg.add_task(
        publish_audit, "procedure.archived", str(actor.id), "procedure", str(entry_id),
        {"status": "archived"}, {},
    )
    bg.add_task(publish_redis, "procedure.archived", {"entry_id": str(entry_id)})
    return entry


@router.get("/procedures/{entry_id}/approvals", response_model=list[schemas.ApprovalResponse])
def get_approvals(
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return service.get_approvals(db, entry_id)
