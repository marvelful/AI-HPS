"""
Run once after schema.sql to create the initial super admin account.
Usage: python create_superadmin.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from shared.config import get_settings
from shared.database import SessionLocal
from shared.models.auth import User
from services.svc02_auth.service import hash_password

settings = get_settings()

EMAIL = "admin@hgd.cm"
PASSWORD = "admin123"
FULL_NAME = "System Administrator"

db = SessionLocal()
try:
    existing = db.query(User).filter(User.email == EMAIL).first()
    if existing:
        print(f"User {EMAIL} already exists — no changes made.")
        sys.exit(0)

    admin = User(
        email=EMAIL,
        full_name=FULL_NAME,
        password_hash=hash_password(PASSWORD),
        role="super_admin",
    )
    db.add(admin)
    db.commit()
    print(f"✓ Super admin created")
    print(f"  Email:    {EMAIL}")
    print(f"  Password: {PASSWORD}")
finally:
    db.close()
