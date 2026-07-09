import random
import uuid
from datetime import datetime, date, timedelta, timezone
from typing import Optional

import bcrypt
import redis as redis_lib
from jose import jwt
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from shared.config import get_settings
from shared.models.auth import Admin, LockoutRecord, OtpCode, Patient, Staff, TokenBlacklist, User
from services.svc02_auth.schemas import (
    AdminResetPasswordRequest,
    CreateUserRequest,
    PatientRegisterRequest,
    UpdateUserRequest,
)

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


def create_access_token(user: User, expire_minutes: int, user_type: str | None = None) -> tuple[str, str, datetime]:
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
    if user_type:
        payload["user_type"] = user_type
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token, jti, exp


# ── Multi-table authentication helpers ────────────────────────────────────────

def _authenticate_from_table(db: Session, model, email: str, password: str, lockout_model=None) -> tuple:
    """Generic authenticate against any user-like table."""
    entity = db.query(model).filter(model.email == email).first()
    if not entity:
        return None, "Invalid credentials"

    if not entity.is_active:
        return None, "Account is deactivated. Contact your administrator."

    now = datetime.now(timezone.utc)
    if entity.lockout_until and entity.lockout_until.replace(tzinfo=timezone.utc) > now:
        remaining = int((entity.lockout_until.replace(tzinfo=timezone.utc) - now).total_seconds() / 60) + 1
        return None, f"Account locked due to too many failed attempts. Try again in {remaining} minute(s)."

    if not verify_password(password, entity.password_hash):
        entity.failed_attempts += 1
        if entity.failed_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            entity.lockout_until = now + timedelta(minutes=settings.LOCKOUT_MINUTES)
        db.commit()
        return None, "Invalid credentials"

    entity.failed_attempts = 0
    entity.lockout_until = None
    entity.last_login = now
    db.commit()
    return entity, ""


def authenticate_patient(db: Session, email: str, password: str) -> tuple[Optional[Patient], str]:
    return _authenticate_from_table(db, Patient, email, password)


def authenticate_staff(db: Session, email: str, password: str) -> tuple[Optional[Staff], str]:
    return _authenticate_from_table(db, Staff, email, password)


def authenticate_admin(db: Session, email: str, password: str) -> tuple[Optional[Admin], str]:
    return _authenticate_from_table(db, Admin, email, password)


def create_staff_member(db: Session, data: "CreateUserRequest", actor: "Admin | User") -> Staff:
    """Admin creates a staff member in the staff table."""
    if data.role in ADMIN_ROLES and getattr(actor, "role", None) != "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only a super admin can assign admin-tier roles")
    staff = Staff(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role=data.role,
        employee_id=data.employee_id,
        department_id=data.department_id,
        phone=getattr(data, "phone", None),
        created_by=actor.id,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


def register_patient_v2(db: Session, data: "PatientRegisterRequest") -> Patient:
    """Register a patient into the patients table (new flow)."""
    existing = db.query(Patient).filter(Patient.email == data.email).first()
    if not existing:
        existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists.")

    if not verify_otp(db, data.email, data.otp_code, "register"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification code. Please request a new one.")

    from datetime import date as date_type
    dob = None
    if data.date_of_birth:
        try:
            dob = date_type.fromisoformat(data.date_of_birth)
        except ValueError:
            pass

    patient = Patient(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        phone=data.phone,
        date_of_birth=dob,
        is_active=True,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


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
        pass


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
        phone=data.phone,
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


def list_users_combined(
    db: Session,
    role: Optional[str] = None,
    department_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list, int]:
    """List users from all 3 split tables (admin + staff + legacy users), excluding patients."""
    results = []

    def _apply_filters(q, model):
        if role:
            # Patient model has role as property, skip if role='patient' but model!=Patient
            if model == Patient and role != "patient":
                return q.filter(False)
            if model != Patient:
                q = q.filter(model.role == role)
        if department_id and hasattr(model, "department_id"):
            q = q.filter(model.department_id == department_id)
        if is_active is not None:
            q = q.filter(model.is_active == is_active)
        if search:
            like = f"%{search}%"
            q = q.filter((model.full_name.ilike(like)) | (model.email.ilike(like)))
        return q

    # Staff table (non-admin, non-patient staff)
    staff_q = _apply_filters(db.query(Staff), Staff)
    # Legacy users table (for backward compat)
    users_q = db.query(User).filter(User.role != "patient")
    users_q = _apply_filters(users_q, User)

    # Combine: prefer new table records; use set of IDs to avoid duplicates
    seen_emails: set[str] = set()

    for s in staff_q.order_by(Staff.full_name).all():
        seen_emails.add(s.email)
        results.append(s)

    # Add legacy users not already in staff table
    for u in users_q.order_by(User.full_name).all():
        if u.email not in seen_emails:
            results.append(u)
            seen_emails.add(u.email)

    # Admin table
    admin_q = _apply_filters(db.query(Admin), Admin)
    for a in admin_q.order_by(Admin.full_name).all():
        if a.email not in seen_emails:
            results.append(a)
            seen_emails.add(a.email)

    total = len(results)
    results = sorted(results, key=lambda x: x.full_name)
    return results[skip:skip + limit], total


def get_user(db: Session, user_id: uuid.UUID) -> User:
    user = (
        db.query(User).filter(User.id == user_id).first()
        or db.query(Staff).filter(Staff.id == user_id).first()
        or db.query(Admin).filter(Admin.id == user_id).first()
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


def update_user(db: Session, user_id: uuid.UUID, data: UpdateUserRequest, actor: User) -> User:
    user = get_user(db, user_id)
    updates = data.model_dump(exclude_unset=True)
    if "role" in updates:
        _require_no_escalation(actor, updates["role"])
    for field, value in updates.items():
        if hasattr(user, field):
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


# ── OTP ───────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    return f"{random.randint(0, 999999):06d}"


def request_otp(db: Session, email: str, purpose: str, full_name: str = "") -> None:
    from services.svc02_auth.email_service import send_otp_email

    # Invalidate any existing unused OTPs for this email+purpose
    db.query(OtpCode).filter(
        OtpCode.email == email,
        OtpCode.purpose == purpose,
        OtpCode.used == False,  # noqa: E712
    ).update({"used": True})
    db.commit()

    code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
    otp = OtpCode(email=email, code=code, purpose=purpose, expires_at=expires_at)
    db.add(otp)
    db.commit()

    try:
        send_otp_email(to_email=email, otp_code=code, full_name=full_name)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send OTP email. Please try again. ({exc})",
        )


def verify_otp(db: Session, email: str, code: str, purpose: str) -> bool:
    now = datetime.now(timezone.utc)
    otp: Optional[OtpCode] = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == email,
            OtpCode.code == code,
            OtpCode.purpose == purpose,
            OtpCode.used == False,  # noqa: E712
            OtpCode.expires_at > now,
        )
        .first()
    )
    if not otp:
        return False
    otp.used = True
    db.commit()
    return True


def register_patient(db: Session, data: PatientRegisterRequest) -> User:
    # Check email before consuming the OTP so the OTP remains usable on conflict
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    if not verify_otp(db, data.email, data.otp_code, "register"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one.",
        )

    dob: Optional[date] = None
    if data.date_of_birth:
        try:
            dob = date.fromisoformat(data.date_of_birth)
        except ValueError:
            pass

    user = User(
        email=data.email,
        full_name=data.full_name,
        password_hash=hash_password(data.password),
        role="patient",
        phone=data.phone,
        date_of_birth=dob,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
