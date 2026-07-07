"""
Metadata builder.
Attaches the full 20-field metadata schema to every chunk.
"""
import re
from datetime import datetime
from pathlib import Path

# ── Department mapping ────────────────────────────────────────────────────────

DEPT_MAP: dict[str, str] = {
    "bloodbank":                   "Blood Bank",
    "blood_bank":                  "Blood Bank",
    "blood bank":                  "Blood Bank",
    "icu":                         "ICU",
    "intensive care":              "ICU",
    "surgery":                     "Surgery",
    "maternity":                   "Maternity",
    "obstetrics":                  "Maternity",
    "infection control department":"Infection Control",
    "infection control":           "Infection Control",
    "infection_control":           "Infection Control",
}


def resolve_department(folder_name: str) -> str:
    key = folder_name.strip().lower()
    return DEPT_MAP.get(key, folder_name.title())


# ── Citation registry ─────────────────────────────────────────────────────────
# Maps a keyword from the PDF filename to (citation string, version string).

_CITATIONS: list[tuple[str, str, str]] = [
    ("who-clinical use of blood",
     "WHO (2002). The Clinical Use of Blood. World Health Organization, Geneva.",
     "2002"),
    ("guidelines-and-principles-for-safe-blood-transfusion",
     "WHO. Guidelines and Principles for Safe Blood Transfusion Practice. World Health Organization.",
     "1.0"),
    ("guidelines-and-principles-for-safe-blood-transfudion",
     "WHO. Guidelines and Principles for Safe Blood Transfusion Practice. World Health Organization.",
     "1.0"),
    ("patient-blood-management",
     "WHO (2022). Patient Blood Management. World Health Organization, Geneva.",
     "2022"),
    ("guidance on implementation of a quality system",
     "WHO. Guidance on Implementation of a Quality System in Blood Establishments. WHO.",
     "1.0"),
    ("implementing cross-border transfer",
     "WHO. Implementing Cross-Border Transfer of Domestic Plasma. World Health Organization.",
     "1.0"),
    ("guidelines on core components of infection prevention",
     "WHO (2016). Guidelines on Core Components of Infection Prevention and Control Programmes. WHO.",
     "2016"),
    ("health 2020",
     "WHO (2013). Health 2020: A European Policy Framework. WHO Regional Office for Europe.",
     "2013"),
    ("who guidelines on hand hygiene",
     "WHO (2009). WHO Guidelines on Hand Hygiene in Health Care. World Health Organization, Geneva.",
     "2009"),
    ("essential surgery",
     "Debas HT et al. (2015). Essential Surgery. Disease Control Priorities, Third Edition. World Bank.",
     "3rd Ed."),
    ("global guidelines for the prevention of surgical site infection",
     "WHO (2016). Global Guidelines for the Prevention of Surgical Site Infection. WHO, Geneva.",
     "2016"),
    ("implementation manual who surgical safety checklist",
     "WHO (2009). Implementation Manual WHO Surgical Safety Checklist 2009. WHO, Geneva.",
     "2009"),
    ("consolidated guidelines for the prevention, diagnosis and treatment of postpartum",
     "WHO (2023). Consolidated Guidelines: Prevention, Diagnosis and Treatment of Postpartum Haemorrhage. WHO.",
     "2023"),
    ("managing complications in pregnancy and childbirth",
     "WHO (2017). Managing Complications in Pregnancy and Childbirth. World Health Organization.",
     "2017"),
    ("who recommendations on care for women with diabetes during pregnancy",
     "WHO (2024). WHO Recommendations on Care for Women with Diabetes During Pregnancy. WHO.",
     "2024"),
]


def get_citation(pdf_stem: str) -> tuple[str, str]:
    stem_lower = pdf_stem.lower()
    for keyword, citation, version in _CITATIONS:
        if keyword in stem_lower:
            return citation, version
    return f"WHO. {pdf_stem}. World Health Organization.", "1.0"


# ── Procedure type inference ──────────────────────────────────────────────────

def _infer_procedure_type(department: str, section: str) -> str:
    dept = department.lower()
    sec = section.lower()
    if "blood" in dept or "transfusion" in sec:
        return "blood_management"
    if "icu" in dept or "intensive" in dept or "intensive" in sec:
        return "critical_care"
    if "infection" in dept or "hygiene" in sec or "hand" in sec:
        return "infection_control"
    if "surgery" in dept or "surgical" in sec or "checklist" in sec or "incision" in sec:
        return "surgical_procedure"
    if "maternity" in dept or "pregnancy" in sec or "childbirth" in sec or "haemorrhage" in sec:
        return "maternal_care"
    return "general_clinical"


# ── Language detection ────────────────────────────────────────────────────────

_FR_MARKERS = {
    "le", "la", "les", "de", "du", "des", "et", "est", "pour", "dans",
    "une", "sur", "qui", "par", "pas", "plus", "avec", "son", "sa",
}


def _detect_language(text: str) -> str:
    words = set(re.findall(r"\b[a-záàâéèêëîïôùûç]+\b", text.lower())[:120])
    return "FR" if len(words & _FR_MARKERS) >= 4 else "EN"


# ── Slugifier ─────────────────────────────────────────────────────────────────

def slugify(text: str, max_len: int = 60) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    text = re.sub(r"\s+", "_", text.strip())
    return text[:max_len]


# ── Main builder ──────────────────────────────────────────────────────────────

def build_chunk_metadata(
    chunk: dict,
    pdf_path: Path,
    department: str,
    document_id: str,
    citation: str,
    version: str,
    is_table: bool = False,
) -> dict:
    """Return the full metadata dict for one chunk."""
    text = chunk["text"]
    language = _detect_language(text)
    section = chunk.get("section", "General") or "General"

    return {
        # Identity
        "chunk_id":        f"{document_id}_{chunk['chunk_index']:04d}",
        "document_id":     document_id,
        # Content descriptors
        "title":           section if section != "General" else pdf_path.stem[:200],
        "category":        "who_guideline",
        "knowledge_domain":"who_guideline",
        "department":      department,
        "source":          pdf_path.name,
        "language":        language,
        "document_type":   "pdf",
        "procedure_type":  _infer_procedure_type(department, section),
        # Access control
        "visibility":      "public",
        "role":            "all",
        # Location within source
        "page":            chunk.get("start_page", 0),
        "section":         section,
        "chunk_index":     chunk["chunk_index"],
        # Provenance
        "citation":        citation,
        "approval_status": "approved",
        "last_updated":    datetime.utcnow().strftime("%Y-%m-%d"),
        "version":         version,
        # Flags
        "is_table":        is_table,
        # Actual text (JSONL output)
        "content":         text,
    }
