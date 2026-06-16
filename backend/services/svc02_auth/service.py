import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import redis as redis_lib
from jose import jwt
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from shared.config import get_settings
from shared.models.auth import LockoutRecord, TokenBlacklist, User
from services.svc02_auth.schemas import AdminResetPasswordRequest, CreateUserRequest, UpdateUserRequest

settings = get_settings()

ADMIN_ROLES = {"super_admin", "admin", "department_admin"}


def _redis():
    return redis_lib.from_url(settings.REDIS_URL, decode_responses=True)


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def get_token_expire_minutes(role: str) -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES_ADMIN if role in ADMIN_ROLES else settings.ACCESS_TOKEN_EXPIRE_MINUTES_STAFF


def create_access_token(user: User, expire_minutes: int) -> tuple[str, str, datetime]:
    jti = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=expire_minutes)
    payload = {
        "sub": str(user.id),
        "jti": jti,
        "role": user.role,
        "email": user.email,
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti, exp


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def authenticate_user(db: Session, email: str, password: str) -> tuple[Optional[User], str]:
    user: Optional[User] = db.query(User).filter(User.email == email).first()
    if not user:
        return None, "Invalid credentials"

    if not user.is_active:
        return None, "Account is deactivated. Contact your administrator."

    now = datetime.now(timezone.utc)
    if user.lockout_until and user.lockout_until.replace(tzinfo=timezone.utc) > now:
        remaining = int((user.lockout_until.replace(tzinfo=timezone.utc) - now).total_seconds() / 60) + 1
        return None, f"Account locked due to too many failed attempts. Try again in {remaining} minute(s)."

    if not verify_password(password, user.password_hash):
        user.failed_attempts += 1
        if user.failed_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.lockout_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
            db.add(LockoutRecord(user_id=user.id, reason="Too many failed login attempts"))
        db.commit()
        return None, "Invalid credentials"

    user.failed_attempts = 0
    user.lockout_until = None
    user.last_login = now
    db.commit()
    return user, ""


def logout_user(db: Session, jti: str, user_id: str, expires_at: datetime) -> None:
    record = TokenBlacklist(
        jti=jti,
        user_id=uuid.UUID(user_id),
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    try:
        r = _redis()
        ttl = max(1, int((expires_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).total_seconds()))
        r.setex(f"blacklist:token:{jti}", ttl, "1")
    except Exception:
        pass  # DB is authoritative; Redis is a fast-path cache


def is_token_revoked(db: Session, jti: str) -> bool:
    try:
        r = _redis()
        if r.exists(f"blacklist:token:{jti}"):
            return True
    except Exception:
        pass
    return db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first() is not None


def _require_no_escalation(actor: User, target_role: str | None) -> None:
    if target_role in ADMIN_ROLES and actor.role != "super_admin":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Only a super admin can assign admin-tier roles",
        )


def create_user(db: Session, data: CreateUserRequest, actor: User) -> User:
    _require_no_escalation(actor, data.role)
    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role,
        employee_id=data.employee_id,
        department_id=data.department_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session,
    role: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[User], int]:
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    if department_id:
        q = q.filter(User.department_id == department_id)
    if is_active is not None:
        q = q.filter(User.is_active == is_active)
    if search:
        like = f"%{search}%"
        q = q.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
    total = q.count()
    items = q.order_by(User.full_name).offset(skip).limit(limit).all()
    return items, total


def get_user(db: Session, user_id: uuid.UUID) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


def update_user(db: Session, user_id: uuid.UUID, data: UpdateUserRequest, actor: User) -> User:
    user = get_user(db, user_id)
    updates = data.model_dump(exclude_unset=True)
    if "role" in updates:
        _require_no_escalation(actor, updates["role"])
    for field, value in updates.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def admin_reset_password(db: Session, user_id: uuid.UUID, data: AdminResetPasswordRequest) -> None:
    user = get_user(db, user_id)
    user.password_hash = hash_password(data.new_password)
    user.failed_attempts = 0
    user.lockout_until = None
    db.commit()


def change_password(db: Session, user: User, current_password: str, new_password: str) -> tuple[bool, str]:
    if not verify_password(current_password, user.password_hash):
        return False, "Current password is incorrect"
    user.password_hash = hash_password(new_password)
    db.commit()
    return True, ""
