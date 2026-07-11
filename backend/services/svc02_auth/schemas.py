import uuid
from datetime import datetime, date
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, field_validator, model_validator

VALID_ROLES = {
    "super_admin", "admin", "department_admin", "department_head",
    "doctor", "clinician", "nurse", "pharmacist", "lab_technician",
    "radiologist", "infection_control_officer", "staff",
    "patient",
}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    employee_id: str | None
    department_id: uuid.UUID | None
    phone: str | None = None
    date_of_birth: date | None = None
    language: str | None = None
    is_active: bool
    last_login: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class CreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "staff"
    employee_id: str | None = None
    department_id: uuid.UUID | None = None
    phone: str | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class PatientRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    otp_code: str
    otp_channel: Literal["email", "sms"] = "email"
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None  # accepts "YYYY-MM-DD"

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("otp_code")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        if not v.strip().isdigit() or len(v.strip()) != 6:
            raise ValueError("OTP must be a 6-digit number")
        return v.strip()

    @model_validator(mode="after")
    def validate_sms_phone(self):
        if self.otp_channel == "sms" and not (self.phone or "").strip():
            raise ValueError("Phone number is required for SMS OTP")
        return self


class RequestOtpRequest(BaseModel):
    email: EmailStr
    purpose: Literal["register", "reset_password"] = "register"
    full_name: Optional[str] = None
    channel: Literal["email", "sms"] = "email"
    phone: Optional[str] = None

    @model_validator(mode="after")
    def validate_sms_phone(self):
        if self.channel == "sms" and not (self.phone or "").strip():
            raise ValueError("Phone number is required for SMS OTP")
        return self


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str
    purpose: Literal["register", "reset_password"] = "register"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    skip: int
    limit: int


class UpdateUserRequest(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    employee_id: str | None = None
    department_id: uuid.UUID | None = None
    phone: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {', '.join(sorted(VALID_ROLES))}")
        return v


class AdminResetPasswordRequest(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("New password must be at least 8 characters")
        return v


class WhatsAppIdentityResponse(BaseModel):
    matched: bool
    user_id: uuid.UUID | None = None
    full_name: str | None = None
    role: str | None = None
    account_type: Literal["admin", "staff", "patient", "anonymous"] = "anonymous"
    stream: Literal["A", "B"] = "A"
    is_active: bool = False
