"""
Prepare realistic Cameroon-context demo data for the production presentation.

The script is idempotent: it can be rerun without duplicating users, analytics,
content gaps, or audit entries.
"""
from __future__ import annotations

import os
import sys
from datetime import date, datetime, timedelta, timezone
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

from shared.database import Base, SessionLocal, engine
from shared.models.analytics import ContentGap, QueryEvent
from shared.models.audit import AuditLog
from shared.models.auth import Admin, Patient, Staff, User
from shared.models.procedures import Department, ProcedureEntry
from services.svc02_auth.service import hash_password
from services.svc06_audit.service import _sign


DEMO_PASSWORD = os.getenv("AIHPS_DEMO_PASSWORD", "HgdDemo#2026")
NOW = datetime.now(timezone.utc)


DEPARTMENTS: list[dict[str, Any]] = [
    {
        "name": "Emergency",
        "name_fr": "Urgences",
        "informal_names": ["urgences", "emergency room", "casualty", "salle d'urgence"],
        "location": "Right wing, after the main gate junction",
        "services": ["Triage", "Trauma stabilization", "Emergency consultation"],
        "operating_hours": {"daily": "24h/24"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Blood Bank",
        "name_fr": "Banque de sang",
        "informal_names": ["blood bank", "banque de sang", "transfusion", "don de sang"],
        "location": "Right clinical corridor, near Radiology and Hemodialysis",
        "services": ["Blood grouping", "Cross matching", "Blood product issue"],
        "operating_hours": {"daily": "24h/24 for emergencies"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "ICU",
        "name_fr": "Reanimation",
        "informal_names": ["reanimation", "intensive care", "soins intensifs", "critical care"],
        "location": "Right wing, close to Surgery and Operating Block",
        "services": ["Critical care", "Post-operative monitoring", "Ventilated patient care"],
        "operating_hours": {"daily": "24h/24"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Surgery",
        "name_fr": "Chirurgie",
        "informal_names": ["chirurgie", "bloc operatoire", "operating theatre", "surgical ward"],
        "location": "Right wing, after Consultations",
        "services": ["General surgery", "Operating block coordination", "Post-operative review"],
        "operating_hours": {"monday_friday": "07:30-15:30", "emergency": "24h/24"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Maternity",
        "name_fr": "Maternite",
        "informal_names": ["maternite", "labour ward", "delivery room", "obstetrics"],
        "location": "Left wing, after Gynecology and Obstetrics",
        "services": ["Antenatal care", "Labour and delivery", "Postnatal care"],
        "operating_hours": {"daily": "24h/24"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Infection Control",
        "name_fr": "Hygiene hospitaliere",
        "informal_names": ["infection control", "hygiene hospitaliere", "ipc", "prevention infections"],
        "location": "Administrative clinical support area",
        "services": ["Hand hygiene monitoring", "IPC training", "Hospital infection surveillance"],
        "operating_hours": {"monday_friday": "07:30-15:30"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Pediatrics",
        "name_fr": "Pediatrie",
        "informal_names": ["pediatrie", "children ward", "child clinic", "paediatrics"],
        "location": "Left wing, first building after the main gate junction",
        "services": ["Child consultation", "Pediatric emergency review", "Vaccination advice"],
        "operating_hours": {"monday_friday": "07:30-15:30"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Gynecology and Obstetrics",
        "name_fr": "Gynecologie et obstetrique",
        "informal_names": ["gynecology", "gynaecology", "obstetrics", "consultation prenatale"],
        "location": "Left wing, between Pediatrics and Maternity",
        "services": ["Gynecology consultation", "Prenatal consultation", "Obstetric review"],
        "operating_hours": {"monday_friday": "07:30-15:30"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Laboratory",
        "name_fr": "Laboratoire",
        "informal_names": ["lab", "laboratoire", "biology lab", "analyses"],
        "location": "Central access corridor, near Reception",
        "services": ["Blood sample collection", "Biochemistry", "Hematology"],
        "operating_hours": {"monday_friday": "07:00-16:00", "emergency": "24h/24"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
    {
        "name": "Radiology",
        "name_fr": "Radiologie",
        "informal_names": ["radiologie", "imaging", "x-ray", "scanner"],
        "location": "Right corridor, between Laboratory and Blood Bank",
        "services": ["X-ray", "Ultrasound", "CT scan orientation"],
        "operating_hours": {"monday_friday": "07:30-15:30", "emergency": "on call"},
        "contact_details": {"phone": "+237 233 50 01 01"},
    },
]


ADMIN_ACCOUNTS = [
    {
        "email": "marie.ngassa1978@gmail.com",
        "full_name": "Dr. Marie Ngassa",
        "role": "super_admin",
        "phone": "237699241603",
        "department": None,
    },
    {
        "email": "patrick.mbarga@yahoo.com",
        "full_name": "Dr. Patrick Mbarga",
        "role": "admin",
        "phone": "237677305814",
        "department": "Surgery",
    },
]


STAFF_ACCOUNTS = [
    {
        "email": "celestine.ekane@gmail.com",
        "full_name": "Dr. Celestine Ekane",
        "role": "department_head",
        "employee_id": "HGD-SUR-014",
        "phone": "237690888084",
        "department": "Surgery",
    },
    {
        "email": "brenda.tchinda@yahoo.com",
        "full_name": "Dr. Brenda Tchinda",
        "role": "department_head",
        "employee_id": "HGD-MAT-022",
        "phone": "237678574116",
        "department": "Maternity",
    },
    {
        "email": "armel.fotso@gmail.com",
        "full_name": "Nurse Armel Fotso",
        "role": "nurse",
        "employee_id": "HGD-ICU-031",
        "phone": "237691447208",
        "department": "ICU",
    },
    {
        "email": "lydia.nkeng@yahoo.com",
        "full_name": "Lydia Nkeng",
        "role": "lab_technician",
        "employee_id": "HGD-LAB-018",
        "phone": "237675118429",
        "department": "Laboratory",
    },
    {
        "email": "serge.nde@gmail.com",
        "full_name": "Dr. Serge Nde",
        "role": "radiologist",
        "employee_id": "HGD-RAD-009",
        "phone": "237696352710",
        "department": "Radiology",
    },
    {
        "email": "florence.ateba@yahoo.com",
        "full_name": "Florence Ateba",
        "role": "infection_control_officer",
        "employee_id": "HGD-IPC-006",
        "phone": "237674530922",
        "department": "Infection Control",
    },
]


PATIENT_ACCOUNTS = [
    {
        "email": "junior.ekotto@gmail.com",
        "full_name": "Junior Ekotto",
        "phone": "237671230984",
        "date_of_birth": date(1996, 4, 18),
        "language": "fr",
    },
    {
        "email": "sandrine.njoh@yahoo.com",
        "full_name": "Sandrine Njoh",
        "phone": "237697456120",
        "date_of_birth": date(1989, 9, 3),
        "language": "fr",
    },
    {
        "email": "emmanuel.foncha@gmail.com",
        "full_name": "Emmanuel Foncha",
        "phone": "237682105447",
        "date_of_birth": date(1978, 12, 27),
        "language": "en",
    },
    {
        "email": "aicha.bello@yahoo.com",
        "full_name": "Aicha Bello",
        "phone": "237670884215",
        "date_of_birth": date(2001, 2, 11),
        "language": "fr",
    },
    {
        "email": "therese.mballa@gmail.com",
        "full_name": "Therese Mballa",
        "phone": "237699612038",
        "date_of_birth": date(1967, 7, 22),
        "language": "fr",
    },
]


CONTENT_GAPS = [
    ("What is the patient preparation protocol for appendectomy at Douala General Hospital?", 9, 6),
    ("What documents should a patient bring before appendectomy admission?", 7, 5),
    ("Quel est le protocole local pour une appendicectomie en urgence?", 6, 4),
    ("Can a visitor donate blood for a relative on the same day?", 5, 4),
    ("Where should a patient pay before a CT scan at Radiology?", 5, 3),
    ("What is the visiting policy for ICU relatives after 6 pm?", 4, 3),
    ("How can I request a medical certificate after consultation?", 4, 2),
    ("Quel est le circuit exact pour un patient venant pour dialyse?", 3, 2),
    ("What are the local steps for discharge after cesarean section?", 3, 2),
    ("Who approves a new operating block procedure before publication?", 3, 1),
]


QUERY_EVENTS = [
    ("How do I get to the Blood Bank from the main entrance?", "navigation", "agent_r", True, 820, "mobile", "A"),
    ("I am at the main entrance. Guide me to Maternity.", "navigation", "agent_r", True, 910, "mobile", "A"),
    ("What is the WHO hand hygiene procedure?", "procedure", "agent_p", True, 1320, "mobile", "A"),
    ("How should staff prepare the WHO surgical safety checklist?", "procedure", "agent_p", True, 1580, "web", "B"),
    ("What is the patient preparation protocol for appendectomy at Douala General Hospital?", "procedure", "agent_p", False, 1460, "web", "B"),
    ("Quel est le protocole local pour une appendicectomie en urgence?", "procedure", "agent_p", False, 1510, "web", "B"),
    ("Can a visitor donate blood for a relative on the same day?", "procedure", "agent_p", False, 1220, "mobile", "A"),
    ("Where is Radiology from Reception?", "navigation", "agent_r", True, 760, "mobile", "A"),
    ("What are the steps for safe blood transfusion?", "procedure", "agent_p", True, 1710, "web", "B"),
    ("What is the visiting policy for ICU relatives after 6 pm?", "information", "agent_p", False, 1180, "mobile", "A"),
    ("Comment aller du laboratoire a la banque de sang?", "navigation", "agent_r", True, 840, "mobile", "A"),
    ("How can I request a medical certificate after consultation?", "information", "agent_p", False, 1010, "mobile", "A"),
]


AUDIT_EVENTS = [
    ("auth.login", "auth", "Staff sign-in from staff/admin portal", {"result": "success"}),
    ("procedure.view", "procedure", "Surgical checklist PDF opened", {"procedure": "WHO Surgical Safety Checklist"}),
    ("procedure.create", "procedure", "Draft procedure created for Operating Block", {"status": "draft"}),
    ("procedure.approval_requested", "approval", "Procedure sent to department heads for review", {"reviewers": 3}),
    ("analytics.content_gap_reviewed", "analytics", "Appendectomy gap reviewed by admin", {"query": "appendectomy"}),
    ("staff.update", "staff", "Staff phone number verified for WhatsApp access", {"channel": "whatsapp"}),
    ("auth.patient_login", "auth", "Patient sign-in from mobile app", {"result": "success"}),
    ("procedure.view", "procedure", "Hand hygiene procedure opened by patient", {"procedure": "WHO Hand Hygiene"}),
]


DEMO_PROCEDURES = [
    {
        "title": "HGD Patient Orientation: Blood Donation Request",
        "department": "Blood Bank",
        "summary": "Local orientation for patients or relatives asking about blood donation support at Douala General Hospital.",
        "content": (
            "Patients or relatives asking about blood donation should first report to Reception or the Blood Bank desk. "
            "Staff confirm the patient file, requested blood product, and donor eligibility. The donor is directed for "
            "screening before any collection decision. Emergency needs are escalated directly to the Blood Bank team."
        ),
        "steps": [
            {"instruction": "Confirm the patient's name and hospital file number."},
            {"instruction": "Direct the donor or relative to the Blood Bank reception point."},
            {"instruction": "Screen for basic eligibility before collection."},
            {"instruction": "Escalate urgent or incompatible cases to the Blood Bank supervisor."},
        ],
        "stream_target": "both",
        "applicable_roles": ["patient", "staff", "nurse", "doctor"],
    },
    {
        "title": "HGD Local Route for Surgical Patient Admission",
        "department": "Surgery",
        "summary": "Cameroon-context admission route for a patient referred to Surgery at Douala General Hospital.",
        "content": (
            "A patient referred for surgical admission should pass through Reception, confirm billing or admission papers, "
            "then proceed to the Surgery service. The surgical team checks identification, consent status, allergies, "
            "and required laboratory or imaging results before ward admission or operating block planning."
        ),
        "steps": [
            {"instruction": "Confirm referral note, patient identity, and contact number."},
            {"instruction": "Verify payment or admission paperwork at the cashier or admission desk."},
            {"instruction": "Send the patient to Surgery with laboratory and imaging results if available."},
            {"instruction": "Record missing documents as a content or workflow gap for follow-up."},
        ],
        "stream_target": "B",
        "applicable_roles": ["staff", "nurse", "doctor"],
    },
    {
        "title": "HGD Maternity Visitor Orientation",
        "department": "Maternity",
        "summary": "Orientation note for visitors looking for Maternity and postnatal care information.",
        "content": (
            "Visitors asking for Maternity should be directed through the left wing after the main gate junction. "
            "For patient safety, staff confirm the ward, patient name, and visiting permission before allowing access."
        ),
        "steps": [
            {"instruction": "Ask the visitor for the patient's full name and ward if known."},
            {"instruction": "Direct the visitor to the left wing toward Gynecology and Maternity."},
            {"instruction": "Ask Maternity staff to confirm whether the visit is allowed."},
        ],
        "stream_target": "both",
        "applicable_roles": ["patient", "staff", "nurse"],
    },
]


def _align_schema(db) -> None:
    Base.metadata.create_all(bind=engine)
    db.execute(text("ALTER TABLE aihps_auth.users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
    db.execute(text("ALTER TABLE aihps_auth.users ADD COLUMN IF NOT EXISTS date_of_birth DATE"))
    db.execute(text("ALTER TABLE aihps_procedures.departments ADD COLUMN IF NOT EXISTS name_fr VARCHAR(255)"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS knowledge_domain VARCHAR(60) NOT NULL DEFAULT 'clinical_procedure'"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS source_id UUID"))
    db.execute(text("ALTER TABLE aihps_procedures.procedure_entries ADD COLUMN IF NOT EXISTS document_url TEXT"))
    db.commit()


def _department(db, name: str) -> Department:
    dept = db.query(Department).filter(Department.name == name).first()
    if dept is None:
        dept = Department(name=name)
        db.add(dept)
        db.flush()
    return dept


def _seed_departments(db) -> dict[str, Department]:
    result = {}
    for item in DEPARTMENTS:
        dept = _department(db, item["name"])
        dept.name_fr = item["name_fr"]
        dept.informal_names = item["informal_names"]
        dept.location = item["location"]
        dept.services = item["services"]
        dept.operating_hours = item["operating_hours"]
        dept.contact_details = item["contact_details"]
        dept.is_active = True
        dept.last_verified_at = NOW
        result[dept.name] = dept
    db.commit()
    return result


def _upsert_user(db, model, data: dict[str, Any], departments: dict[str, Department], role_override: str | None = None):
    account = db.query(model).filter(model.email == data["email"]).first()
    if account is None:
        account = model(email=data["email"], full_name=data["full_name"], password_hash=hash_password(DEMO_PASSWORD))
        db.add(account)
    account.full_name = data["full_name"]
    account.password_hash = hash_password(DEMO_PASSWORD)
    account.phone = data.get("phone")
    account.is_active = True
    account.failed_attempts = 0
    account.lockout_until = None
    if model is not Patient and hasattr(account, "role"):
        account.role = role_override or data.get("role", getattr(account, "role", "staff"))
    if model in (Staff, User):
        account.employee_id = data.get("employee_id")
    if model is not Patient and hasattr(account, "department_id"):
        dept_name = data.get("department")
        account.department_id = departments[dept_name].id if dept_name else None
    if model is Patient:
        account.language = data.get("language", "fr")
        account.date_of_birth = data.get("date_of_birth")
    elif model is User and data.get("date_of_birth") is not None:
        account.date_of_birth = data.get("date_of_birth")
    db.flush()
    return account


def _sanitize_visible_placeholders(db, replacement_admin: dict[str, Any]) -> None:
    replacements = {
        "admin@aihps.tech": {
            "email": "jacques.essomba@yahoo.com",
            "full_name": "Dr. Jacques Essomba",
            "role": "admin",
            "phone": "237675402118",
        },
        "olga@aihps.tech": {
            "email": "olga.emapi@yahoo.com",
            "full_name": "Olga Emapi",
            "role": "department_head",
            "phone": "237678574118",
        },
        "sharma@gmail.com": {
            "email": "mireille.manga@gmail.com",
            "full_name": "Mireille Manga",
            "role": "nurse",
            "phone": "237690888084",
        },
        "efuh@gmail.com": {
            "email": "eric.efuh@yahoo.com",
            "full_name": "Eric Efuh",
            "role": "lab_technician",
            "phone": "237695796769",
        },
        "test@gmail.com": {
            "email": "daniel.talla@yahoo.com",
            "full_name": "Daniel Talla",
            "role": "staff",
            "phone": "237676330901",
        },
        "tess@gmail.com": {
            "email": "estelle.tamo@gmail.com",
            "full_name": "Estelle Tamo",
            "role": "department_admin",
            "phone": "237679603195",
        },
        "patient@example.com": {
            "email": "nadine.kom@gmail.com",
            "full_name": "Nadine Kom",
            "role": "patient",
            "phone": "237681902744",
        },
        "staff@example.com": {
            "email": "alain.mouelle@yahoo.com",
            "full_name": "Alain Mouelle",
            "role": "staff",
            "phone": "237677409633",
        },
        "admin@example.com": {
            "email": "viviane.ngono@gmail.com",
            "full_name": "Viviane Ngono",
            "role": "admin",
            "phone": "237699382510",
        },
    }
    for model in (User, Admin, Staff, Patient):
        for email, replacement in replacements.items():
            account = db.query(model).filter(model.email == email).first()
            if not account:
                continue
            target_exists = db.query(model).filter(model.email == replacement["email"], model.id != account.id).first()
            if target_exists:
                account.email = f"archived.account.{str(account.id)[:8]}@yahoo.com"
                account.full_name = "Archived Account"
                account.is_active = False
                continue
            account.email = replacement["email"]
            account.full_name = replacement["full_name"]
            if model is not Patient and hasattr(account, "role"):
                account.role = "doctor" if model is User and replacement["role"] == "department_head" else replacement["role"]
            account.phone = replacement["phone"]
            account.password_hash = hash_password(DEMO_PASSWORD)
            account.is_active = True
    db.commit()


def _seed_people(db, departments: dict[str, Department]) -> tuple[User, list[Any]]:
    _sanitize_visible_placeholders(db, ADMIN_ACCOUNTS[0])
    all_accounts: list[Any] = []

    primary_admin_user = _upsert_user(db, User, ADMIN_ACCOUNTS[0], departments)
    all_accounts.append(primary_admin_user)
    for admin in ADMIN_ACCOUNTS:
        all_accounts.append(_upsert_user(db, Admin, admin, departments))
        all_accounts.append(_upsert_user(db, User, admin, departments))

    for staff in STAFF_ACCOUNTS:
        all_accounts.append(_upsert_user(db, Staff, staff, departments))

    for patient in PATIENT_ACCOUNTS:
        all_accounts.append(_upsert_user(db, Patient, patient, departments, role_override="patient"))

    db.commit()
    return primary_admin_user, all_accounts


def _seed_demo_procedures(db, admin_user: User, departments: dict[str, Department]) -> int:
    count = 0
    for item in DEMO_PROCEDURES:
        proc = db.query(ProcedureEntry).filter(ProcedureEntry.title == item["title"]).first()
        if proc is None:
            proc = ProcedureEntry(title=item["title"], content=item["content"], created_by=admin_user.id)
            db.add(proc)
        proc.summary = item["summary"]
        proc.content = item["content"]
        proc.steps = item["steps"]
        proc.compliance_annotations = []
        proc.knowledge_domain = "clinical_procedure"
        proc.stream_target = item["stream_target"]
        proc.applicable_roles = item["applicable_roles"]
        proc.risk_level = "medium"
        proc.status = "published"
        proc.department_id = departments[item["department"]].id
        proc.language = "EN"
        proc.updated_by = admin_user.id
        proc.published_at = NOW
        count += 1
    db.commit()
    return count


def _seed_content_gaps(db) -> int:
    count = 0
    for query, occurrences, days_ago in CONTENT_GAPS:
        gap = db.query(ContentGap).filter(ContentGap.query == query).first()
        if gap is None:
            gap = ContentGap(query=query)
            db.add(gap)
        gap.occurrence_count = occurrences
        gap.first_seen = NOW - timedelta(days=days_ago)
        gap.last_seen = NOW - timedelta(hours=max(1, days_ago * 3))
        count += 1
    db.commit()
    return count


def _seed_query_events(db, demo_user: User) -> int:
    db.query(QueryEvent).filter(QueryEvent.session_id.like("demo-cm-%")).delete(synchronize_session=False)
    base = NOW - timedelta(hours=30)
    for idx, (query, intent, agent, had_result, response_ms, platform, stream) in enumerate(QUERY_EVENTS, start=1):
        db.add(QueryEvent(
            session_id=f"demo-cm-{idx:02d}",
            user_id=demo_user.id if idx % 3 == 0 else None,
            query=query,
            intent=intent,
            agent=agent,
            had_result=had_result,
            response_time_ms=response_ms,
            platform=platform,
            stream=stream,
            created_at=base + timedelta(hours=idx * 2),
        ))
    db.commit()
    return len(QUERY_EVENTS)


def _seed_audit_events(db, demo_user: User) -> int:
    existing = db.query(AuditLog).filter(AuditLog.event_metadata["demo_seed"].astext == "cameroon_presentation").count()
    if existing:
        return existing
    base = NOW - timedelta(hours=18)
    for idx, (event_type, entity_type, label, changes) in enumerate(AUDIT_EVENTS, start=1):
        signed_at = (base + timedelta(hours=idx)).isoformat()
        metadata = {
            "demo_seed": "cameroon_presentation",
            "label": label,
            "signed_at": signed_at,
            "hmac_sha256": _sign(event_type, str(demo_user.id), None, signed_at),
        }
        db.add(AuditLog(
            event_type=event_type,
            user_id=demo_user.id,
            entity_type=entity_type,
            entity_id=None,
            changes=changes,
            event_metadata=metadata,
            ip_address="196.202.196.24",
            created_at=base + timedelta(hours=idx),
        ))
    db.commit()
    return len(AUDIT_EVENTS)


def main() -> None:
    db = SessionLocal()
    try:
        _align_schema(db)
        departments = _seed_departments(db)
        admin_user, _accounts = _seed_people(db, departments)
        procedure_count = _seed_demo_procedures(db, admin_user, departments)
        gap_count = _seed_content_gaps(db)
        query_count = _seed_query_events(db, admin_user)
        audit_count = _seed_audit_events(db, admin_user)
        print(
            "cameroon_demo_ready "
            f"departments={len(departments)} "
            f"procedures={procedure_count} "
            f"content_gaps={gap_count} "
            f"query_events={query_count} "
            f"audit_events={audit_count} "
            f"demo_password={DEMO_PASSWORD}"
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
