"""
Ingest procedure PDFs from PROCEDURES/ into the database, then rebuild the KB index.

Run from D:\\AI-HPS\\backend\\ :
    ..\\venv\\Scripts\\python scripts\\ingest_procedures.py

Requires pdfplumber:
    ..\\venv\\Scripts\\pip install pdfplumber
"""
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Make shared modules importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.config import get_settings
from shared.database import SessionLocal
from shared.models.auth import User
from shared.models.procedures import Department, ProcedureEntry

settings = get_settings()

PROCEDURES_DIR = Path(__file__).parent.parent.parent / "PROCEDURES"

# Map folder names → canonical department name in DB
FOLDER_TO_DEPT: dict[str, str | None] = {
    "BLOODBANK": "Blood Bank",
    "ICU": "ICU",
    "Infection Control Department": "Infection Control",
    "MATERNITY": "Maternity",
    "SURGERY": "Surgery",
    "EMERGENCY": None,  # emergency content is seeded via schema.sql, not PDFs
}

DEPT_RISK: dict[str, str] = {
    "Blood Bank": "high",
    "ICU": "critical",
    "Infection Control": "medium",
    "Maternity": "high",
    "Surgery": "critical",
}


def extract_text(pdf_path: Path) -> str:
    try:
        import pdfplumber
    except ImportError:
        print("\n[!] pdfplumber not installed. Run:")
        print("    ..\\venv\\Scripts\\pip install pdfplumber")
        sys.exit(1)

    try:
        pages: list[str] = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text and text.strip():
                    pages.append(text.strip())
        return "\n\n".join(pages)
    except Exception as exc:
        print(f"  [!] Extraction failed for {pdf_path.name}: {exc}")
        return ""


def get_admin_id(db) -> uuid.UUID:
    user = (
        db.query(User)
        .filter(User.role == "super_admin", User.is_active == True)
        .first()
    )
    if user is None:
        user = db.query(User).filter(User.is_active == True).first()
    if user is None:
        raise RuntimeError("No active users in DB. Run create_superadmin.py first.")
    return user.id


def get_dept_id(db, dept_name: str) -> uuid.UUID | None:
    dept = db.query(Department).filter(Department.name == dept_name).first()
    if dept is None:
        # Partial match on first word
        dept = (
            db.query(Department)
            .filter(Department.name.ilike(f"%{dept_name.split()[0]}%"))
            .first()
        )
    return dept.id if dept else None


def ingest() -> None:
    print("=" * 60)
    print("AI-HPS Procedure Ingestion")
    print(f"Source: {PROCEDURES_DIR}")
    print("=" * 60)

    db = SessionLocal()
    try:
        admin_id = get_admin_id(db)
        print(f"Admin user: {admin_id}\n")

        total_created = 0
        total_skipped = 0

        for folder_name, dept_name in FOLDER_TO_DEPT.items():
            folder_path = PROCEDURES_DIR / folder_name
            if not folder_path.exists():
                print(f"[skip] {folder_name}/ not found")
                continue
            if dept_name is None:
                print(f"[skip] {folder_name}/ — emergency content managed via DB seed")
                continue

            dept_id = get_dept_id(db, dept_name)
            risk = DEPT_RISK.get(dept_name, "medium")

            pdfs = sorted(folder_path.glob("*.pdf"))
            if not pdfs:
                print(f"[skip] {folder_name}/ — no PDFs")
                continue

            print(f"\n{folder_name}/ -> {dept_name}  (risk={risk}, dept_id={dept_id})")
            print("-" * 50)

            for pdf_path in pdfs:
                print(f"  {pdf_path.name} … ", end="", flush=True)

                # Build a stable title from filename
                title = (
                    pdf_path.stem
                    .replace("-", " ")
                    .replace("_", " ")
                    .title()
                    .strip()
                )
                # Prefix with dept for clarity
                full_title = f"[{dept_name}] {title}"

                existing = (
                    db.query(ProcedureEntry)
                    .filter(ProcedureEntry.title == full_title)
                    .first()
                )
                if existing:
                    print(f"already exists ({existing.id})")
                    total_skipped += 1
                    continue

                text = extract_text(pdf_path)
                if not text or len(text) < 200:
                    print("SKIP — insufficient text extracted")
                    continue

                summary = " ".join(text[:400].split())[:300]
                entry = ProcedureEntry(
                    id=uuid.uuid4(),
                    title=full_title,
                    summary=summary,
                    content=text[:60_000],   # hard cap to stay within DB limits
                    steps=[],
                    compliance_annotations=[],
                    stream_target="B",        # WHO guidelines are staff-facing
                    applicable_roles=[],      # accessible to all roles
                    risk_level=risk,
                    status="published",
                    department_id=dept_id,
                    language="EN",
                    version=1,
                    created_by=admin_id,
                    published_at=datetime.now(timezone.utc),
                )
                db.add(entry)
                db.commit()
                db.refresh(entry)
                char_count = len(text)
                print(f"created  {entry.id}  ({char_count:,} chars)")
                total_created += 1

        print(f"\n{'=' * 60}")
        print(f"Ingestion complete: {total_created} created, {total_skipped} skipped")

        # Rebuild KB vector index
        print("\nRebuilding KB index (embedding may take several minutes) …")
        try:
            from services.svc07_kb_sync.service import rebuild_full_index
            chunks = rebuild_full_index()
            print(f"KB index rebuilt: {chunks} chunks indexed")
        except Exception as exc:
            print(f"[!] KB rebuild failed: {exc}")
            print("    Start SVC-07 and call POST /kb/rebuild manually.")

    finally:
        db.close()


if __name__ == "__main__":
    ingest()
