from typing import Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from shared.database import get_db
from shared.models.auth import Admin, Patient, Staff, User
from services.svc02_auth import service

# auto_error=False so a missing/malformed Authorization header yields 401,
# not the default 403 that HTTPBearer raises when auto_error=True.
bearer_scheme = HTTPBearer(auto_error=False)

AnyUser = Union[User, Patient, Staff, Admin]


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AnyUser:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    try:
        payload = service.decode_token(credentials.credentials)
        user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        user_type: str | None = payload.get("user_type")
        if not user_id or not jti:
            raise exc
    except JWTError:
        raise exc

    if service.is_token_revoked(db, jti):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    # Resolve user from the appropriate table based on the user_type claim in JWT
    user: AnyUser | None = None
    if user_type == "patients":
        user = db.query(Patient).filter(Patient.id == user_id).first()
    elif user_type == "staff":
        user = db.query(Staff).filter(Staff.id == user_id).first()
    elif user_type == "admins":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    else:
        # Legacy tokens have no user_type — check all tables for backward compat
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = db.query(Admin).filter(Admin.id == user_id).first()
        if not user:
            user = db.query(Staff).filter(Staff.id == user_id).first()
        if not user:
            user = db.query(Patient).filter(Patient.id == user_id).first()

    if not user or not user.is_active:
        raise exc
    return user


def require_admin(current_user: AnyUser = Depends(get_current_user)) -> AnyUser:
    if current_user.role not in {"super_admin", "admin", "department_admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def require_super_admin(current_user: AnyUser = Depends(get_current_user)) -> AnyUser:
    if current_user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user
