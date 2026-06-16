import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.models.auth import User
from services.svc02_auth import schemas, service
from services.svc02_auth.dependencies import (
    bearer_scheme,
    get_current_user,
    require_admin,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    user, error = service.authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    expire_minutes = service.get_token_expire_minutes(user.role)
    token, _jti, _exp = service.create_access_token(user, expire_minutes)

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user_id=str(user.id),
        role=user.role,
    )


@router.post("/logout", status_code=204)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    try:
        payload = service.decode_token(credentials.credentials)
        jti = payload.get("jti")
        user_id = payload.get("sub")
        exp_ts = payload.get("exp")
        if jti and user_id and exp_ts:
            expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
            service.logout_user(db, jti, user_id, expires_at)
    except JWTError:
        pass  # Already invalid — silently succeed


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(
    body: schemas.CreateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    try:
        return service.create_user(db, body, actor)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or employee ID already exists",
        )


@router.get("/users", response_model=schemas.UserListResponse)
def list_users(
    role: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    items, total = service.list_users(db, role, department_id, is_active, search, skip, limit)
    return schemas.UserListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return service.get_user(db, user_id)


@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(
    user_id: uuid.UUID,
    body: schemas.UpdateUserRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_admin),
):
    try:
        return service.update_user(db, user_id, body, actor)
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email or employee ID already exists",
        )


@router.post("/users/{user_id}/reset-password", status_code=204)
def reset_user_password(
    user_id: uuid.UUID,
    body: schemas.AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    service.admin_reset_password(db, user_id, body)


@router.get("/validate", status_code=200)
def validate_token(
    response: Response,
    current_user: User = Depends(get_current_user),
):
    """Internal endpoint used by Nginx auth_request. Returns 200 + user headers."""
    response.headers["X-User-ID"] = str(current_user.id)
    response.headers["X-User-Role"] = current_user.role


@router.post("/change-password", status_code=204)
def change_password(
    body: schemas.ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok, error = service.change_password(db, current_user, body.current_password, body.new_password)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
