"""
Seeds the database with procedures that link directly to PDFs stored in Google Drive.

Usage:
    cd backend
    python scripts/seed_from_gdrive.py

The JSON file (gdrive_procedures_map.json) should contain entries like:

[
  {
    "title": "Clinic-Cancellation-Escalation-SOP",
    "summary": "Standard operating procedure for clinic cancellation and escalation.",
    "department_name": "Outpatients",
    "stream_target": "both",
    "risk_level": "high",
    "language": "EN",
    "document_url": "https://drive.google.com/file/d/1EUAatbxEVCGbcLy2wwnuBRH04qm9dLkf/view?usp=drive_link",
    "knowledge_domain": "clinical_procedure"
  }
]

The script will:
  - Create a procedure entry for each item in the JSON.
  - Set status to "published".
  - Store the provided document_url.
  - Update existing procedures (matched by title) instead of creating duplicates.
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import psycopg2
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shared.models.procedures import Department, ProcedureEntry
from shared.models.auth import User


def ensure_document_url_column(db_url: str) -> None:
    """Add document_url column if it does not already exist."""
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            "ALTER TABLE aihps_procedures.procedure_entries "
            "ADD COLUMN IF NOT EXISTS document_url TEXT;"
        )
        cur.close()
        conn.close()
        print("Column check: document_url column ensured on procedure_entries.")
    except Exception as exc:
        print(f"WARNING: Could not run column migration: {exc}")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MAP_FILE = os.path.join(SCRIPT_DIR, "gdrive_procedures_map.json")


def main():
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgresql:postgresql@localhost:5432/AIHPS"
    )

    # Ensure the document_url column exists before we try to use it
    ensure_document_url_column(db_url)

    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    db = Session()

    try:
        with open(MAP_FILE, "r", encoding="utf-8") as f:
            entries = json.load(f)

        # Find an admin user to assign as creator
        system_user = (
            db.query(User)
            .filter(User.role.in_(["super_admin", "admin"]))
            .first()
        )

        if not system_user:
            print("ERROR: No admin user found in the database.")
            print("Create at least one admin user first.")
            return

        print(f"Using admin user: {system_user.email} ({system_user.id})")

        # Department lookup
        departments = db.query(Department).all()
        dept_map = {dept.name: dept.id for dept in departments}

        created = 0
        updated = 0
        skipped = 0

        for item in entries:

            title = item.get("title", "").strip()
            if not title:
                print("  SKIP (missing title)")
                skipped += 1
                continue

            document_url = item.get("document_url", "").strip()

            if not document_url:
                print(f"  SKIP (no document URL): {title}")
                skipped += 1
                continue

            department_name = item.get("department_name", "").strip()
            department_id = dept_map.get(department_name)

            if department_name and department_id is None:
                print(
                    f"  WARN: Department '{department_name}' not found. "
                    "Procedure will be created without a department."
                )

            # Check if procedure already exists
            existing = (
                db.query(ProcedureEntry)
                .filter(ProcedureEntry.title == title)
                .first()
            )

            if existing:
                existing.summary = item.get("summary")
                existing.content = item.get("summary") or title
                existing.document_url = document_url
                existing.department_id = department_id
                existing.stream_target = "B"
                existing.risk_level = item.get("risk_level", "medium")
                existing.language = item.get("language", "EN")
                existing.knowledge_domain = item.get(
                    "knowledge_domain",
                    "clinical_procedure"
                )
                existing.updated_by = system_user.id

                db.commit()

                print(f"  UPDATED: {title}")
                updated += 1

            else:
                procedure = ProcedureEntry(
                    title=title,
                    summary=item.get("summary"),
                    content=item.get("summary") or title,
                    steps=[],
                    compliance_annotations=[],
                    applicable_roles=[],
                    knowledge_domain=item.get(
                        "knowledge_domain",
                        "clinical_procedure"
                    ),
                    stream_target="B",
                    risk_level=item.get("risk_level", "medium"),
                    status="published",
                    department_id=department_id,
                    language=item.get("language", "EN"),
                    document_url=document_url,
                    created_by=system_user.id,
                    published_at=datetime.now(timezone.utc),
                    version=1,
                )

                db.add(procedure)
                db.commit()

                print(f"  CREATED: {title}")
                created += 1

        print(
            f"\nDone. Created={created}, Updated={updated}, Skipped={skipped}"
        )

    except FileNotFoundError:
        print(f"ERROR: {MAP_FILE} not found.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
