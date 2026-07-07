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
    """Legacy unified login — tries users table first, then new split tables."""
    user, error = service.authenticate_user(db, body.email, body.password)
    if not user:
        # Fallback: try new split tables in case data was migrated
        user, error = service.authenticate_admin(db, body.email, body.password)
    if not user:
        user, error = service.authenticate_staff(db, body.email, body.password)
    if not user:
        user, error = service.authenticate_patient(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    role = user.role
    user_type = getattr(user, "__tablename__", "users")
    expire_minutes = service.get_token_expire_minutes(role)
    token, _jti, _exp = service.create_access_token(user, expire_minutes, user_type=user_type)

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=schemas.UserResponse.model_validate(user),
    )


@router.post("/patient/login", response_model=schemas.TokenResponse)
def patient_login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Patient-specific login endpoint. Only accepts users in the patients table."""
    patient, error = service.authenticate_patient(db, body.email, body.password)
    if not patient:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    expire_minutes = service.get_token_expire_minutes("patient")
    token, _jti, _exp = service.create_access_token(patient, expire_minutes, user_type="patients")

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=schemas.UserResponse.model_validate(patient),
    )


@router.post("/staff/login", response_model=schemas.TokenResponse)
def staff_login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Staff-specific login endpoint. Only accepts users in the staff table."""
    staff, error = service.authenticate_staff(db, body.email, body.password)
    if not staff:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    expire_minutes = service.get_token_expire_minutes(staff.role)
    token, _jti, _exp = service.create_access_token(staff, expire_minutes, user_type="staff")

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=schemas.UserResponse.model_validate(staff),
    )


@router.post("/admin/login", response_model=schemas.TokenResponse)
def admin_login(body: schemas.LoginRequest, db: Session = Depends(get_db)):
    """Admin-specific login endpoint. Only accepts users in the admins table."""
    admin, error = service.authenticate_admin(db, body.email, body.password)
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=error)

    expire_minutes = service.get_token_expire_minutes(admin.role)
    token, _jti, _exp = service.create_access_token(admin, expire_minutes, user_type="admins")

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=schemas.UserResponse.model_validate(admin),
    )


@router.post("/request-otp", status_code=202)
def request_otp(body: schemas.RequestOtpRequest, db: Session = Depends(get_db)):
    """Send a 6-digit OTP to the given email. Used before patient self-registration."""
    service.request_otp(db, str(body.email), body.purpose, body.full_name or "")
    return {"message": "Verification code sent. Please check your email."}


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register_patient(body: schemas.PatientRegisterRequest, db: Session = Depends(get_db)):
    """Patient self-registration. Requires a valid OTP sent to the same email."""
    try:
        user = service.register_patient_v2(db, body)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration failed: a conflicting record already exists. Please try again or use a different email.",
        )

    expire_minutes = service.get_token_expire_minutes(user.role)
    token, _jti, _exp = service.create_access_token(user, expire_minutes, user_type="patients")

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expire_minutes * 60,
        user=schemas.UserResponse.model_validate(user),
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
        pass


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/patients", response_model=schemas.UserListResponse)
def list_patients(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """List patient accounts — queries legacy users table (role=patient)."""
    from shared.models.auth import Patient as PatientModel
    results = []
    seen_ids: set = set()

    # Try new patients table (post-migration)
    try:
        q = db.query(PatientModel)
        if is_active is not None:
            q = q.filter(PatientModel.is_active == is_active)
        if search:
            like = f"%{search}%"
            q = q.filter((PatientModel.full_name.ilike(like)) | (PatientModel.email.ilike(like)))
        for p in q.order_by(PatientModel.full_name).all():
            seen_ids.add(p.id)
            results.append(p)
    except Exception:
        pass

    # Legacy users table
    try:
        uq = db.query(User).filter(User.role == "patient")
        if is_active is not None:
            uq = uq.filter(User.is_active == is_active)
        if search:
            like = f"%{search}%"
            uq = uq.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
        for u in uq.order_by(User.full_name).all():
            if u.id not in seen_ids:
                results.append(u)
    except Exception:
        pass

    total = len(results)
    results = sorted(results, key=lambda x: x.full_name)
    return schemas.UserListResponse(items=results[skip:skip + limit], total=total, skip=skip, limit=limit)


@router.patch("/patients/{patient_id}", response_model=schemas.UserResponse)
def update_patient_status(
    patient_id: uuid.UUID,
    body: schemas.UpdateUserRequest,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    """Update patient account (activate/deactivate). Tries patients table then users table."""
    from shared.models.auth import Patient as PatientModel

    # Try new patients table
    try:
        patient = db.query(PatientModel).filter(PatientModel.id == patient_id).first()
        if patient:
            updates = body.model_dump(exclude_unset=True)
            for field, value in updates.items():
                if hasattr(patient, field):
                    setattr(patient, field, value)
            db.commit()
            db.refresh(patient)
            return patient
    except Exception:
        pass

    # Fall back to legacy users table
    user = db.query(User).filter(User.id == patient_id, User.role == "patient").first()
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found")
    updates = body.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if hasattr(user, field):
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/users", response_model=schemas.UserResponse, status_code=201)
def create_user(
    body: schemas.CreateUserRequest,
    db: Session = Depends(get_db),
    actor=Depends(require_admin),
):
    """Create a new user. Routes to the correct split table based on role."""
    try:
        # Route to the correct table based on role
        admin_roles = {"super_admin", "admin", "department_admin"}
        if body.role in admin_roles:
            return service.create_user(db, body, actor)  # legacy users table (or create Admin)
        else:
            return service.create_staff_member(db, body, actor)
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
    _=Depends(require_admin),
):
    items, total = service.list_users_combined(db, role, department_id, is_active, search, skip, limit)
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
