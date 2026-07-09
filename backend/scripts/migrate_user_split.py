"""
Migrate the single `users` table into 3 separate tables:
  - aihps_auth.patients   (role = 'patient')
  - aihps_auth.staff      (role IN staff roles)
  - aihps_auth.admins     (role IN admin roles)

Also drops FK constraints on lockout_records.user_id and
token_blacklist.user_id so those tables accept IDs from any of the 3 tables.

Usage:
    cd backend
    python scripts/migrate_user_split.py

Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS and
INSERT ... ON CONFLICT DO NOTHING.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2

ADMIN_ROLES = ("super_admin", "admin", "department_admin")
PATIENT_ROLES = ("patient",)
# Everything else is staff

DDL = """
ALTER TABLE aihps_auth.users
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- ── patients ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aihps_auth.patients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(50),
    date_of_birth   DATE,
    language        VARCHAR(10) NOT NULL DEFAULT 'fr',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    password_hash   TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until   TIMESTAMPTZ,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── staff ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aihps_auth.staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'doctor',
    employee_id     VARCHAR(50) UNIQUE,
    department_id   UUID,
    phone           VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    password_hash   TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until   TIMESTAMPTZ,
    last_login      TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── admins ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aihps_auth.admins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'admin',
    department_id   UUID,
    phone           VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    password_hash   TEXT NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    lockout_until   TIMESTAMPTZ,
    last_login      TIMESTAMPTZ,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

MIGRATE_PATIENTS = """
INSERT INTO aihps_auth.patients
    (id, email, full_name, phone, date_of_birth, is_active,
     password_hash, failed_attempts, lockout_until, last_login,
     created_at, updated_at)
SELECT
    id, email, full_name, phone, date_of_birth, is_active,
    password_hash, failed_attempts, lockout_until, last_login,
    created_at, updated_at
FROM aihps_auth.users
WHERE role = 'patient'
ON CONFLICT (id) DO NOTHING;
"""

MIGRATE_ADMINS = """
INSERT INTO aihps_auth.admins
    (id, email, full_name, role, department_id, phone, is_active,
     password_hash, failed_attempts, lockout_until, last_login,
     created_at, updated_at)
SELECT
    id, email, full_name, role, department_id, phone, is_active,
    password_hash, failed_attempts, lockout_until, last_login,
    created_at, updated_at
FROM aihps_auth.users
WHERE role IN ('super_admin', 'admin', 'department_admin')
ON CONFLICT (id) DO NOTHING;
"""

MIGRATE_STAFF = """
INSERT INTO aihps_auth.staff
    (id, email, full_name, role, employee_id, department_id, phone, is_active,
     password_hash, failed_attempts, lockout_until, last_login,
     created_at, updated_at)
SELECT
    id, email, full_name, role, employee_id, department_id, phone, is_active,
    password_hash, failed_attempts, lockout_until, last_login,
    created_at, updated_at
FROM aihps_auth.users
WHERE role NOT IN ('patient', 'super_admin', 'admin', 'department_admin')
ON CONFLICT (id) DO NOTHING;
"""

# Drop FK constraints so lockout / blacklist accept IDs from any table
DROP_FOREIGN_KEYS = """
DO $$
BEGIN
    -- lockout_records.user_id FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'aihps_auth'
          AND table_name   = 'lockout_records'
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE aihps_auth.lockout_records DROP CONSTRAINT IF EXISTS lockout_records_user_id_fkey;
    END IF;

    -- token_blacklist.user_id FK
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'aihps_auth'
          AND table_name   = 'token_blacklist'
          AND constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE aihps_auth.token_blacklist DROP CONSTRAINT IF EXISTS token_blacklist_user_id_fkey;
    END IF;
END $$;
"""


def main():
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgresql:postgresql@localhost:5432/AIHPS",
    )

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("Creating patients, staff, admins tables…")
    cur.execute(DDL)
    print("  Tables created (IF NOT EXISTS)")

    print("Migrating patients…")
    cur.execute(MIGRATE_PATIENTS)
    cur.execute("SELECT COUNT(*) FROM aihps_auth.patients")
    print(f"  patients table: {cur.fetchone()[0]} rows")

    print("Migrating admins…")
    cur.execute(MIGRATE_ADMINS)
    cur.execute("SELECT COUNT(*) FROM aihps_auth.admins")
    print(f"  admins table: {cur.fetchone()[0]} rows")

    print("Migrating staff…")
    cur.execute(MIGRATE_STAFF)
    cur.execute("SELECT COUNT(*) FROM aihps_auth.staff")
    print(f"  staff table: {cur.fetchone()[0]} rows")

    print("Dropping FK constraints on lockout_records and token_blacklist…")
    cur.execute(DROP_FOREIGN_KEYS)
    print("  FK constraints dropped")

    cur.close()
    conn.close()

    print("\nMigration complete.")
    print("New login endpoints are now live:")
    print("  POST /api/auth/patient/login")
    print("  POST /api/auth/staff/login")
    print("  POST /api/auth/admin/login")
    print("The old /api/auth/login endpoint continues to work for backward compat.")


if __name__ == "__main__":
    main()
