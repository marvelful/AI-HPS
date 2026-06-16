"""
AGENT-N — Navigation Agent.
Fully deterministic: no LLM. Resolves destination via shared embedding index,
then retrieves authored steps from navigation_paths table.
"""
from agents.state import AIHPSState
from agents.shared.embeddings import find_department
from shared.database import SessionLocal
from shared.models.procedures import NavigationPath

_NO_MATCH = {
    "EN": "Department not found. Please ask at the main reception desk.",
    "FR": "Département introuvable. Veuillez vous adresser à l'accueil principal.",
}
_NO_PATH = {
    "EN": "Directions for this department are not yet available. Please ask at reception.",
    "FR": "Les indications pour ce département ne sont pas encore disponibles. Veuillez demander à l'accueil.",
}


def agent_n(state: AIHPSState) -> dict:
    query = state.get("raw_query", "")
    language = state.get("language", "EN")

    dept = find_department(query, threshold=0.65)
    if dept is None:
        return {"navigation_result": {"found": False, "message": _NO_MATCH.get(language, _NO_MATCH["EN"])}}

    db = SessionLocal()
    try:
        # Preferred language first, then any language
        path = (
            db.query(NavigationPath)
            .filter(
                NavigationPath.to_department_id == dept["id"],
                NavigationPath.language == language,
            )
            .first()
        )
        if path is None:
            path = (
                db.query(NavigationPath)
                .filter(NavigationPath.to_department_id == dept["id"])
                .first()
            )

        if path is None:
            return {"navigation_result": {"found": False, "message": _NO_PATH.get(language, _NO_PATH["EN"])}}

        return {
            "navigation_result": {
                "found": True,
                "department": dept["name"],
                "from_location": path.from_location,
                "steps": path.steps or [],
                "estimated_time_minutes": path.estimated_time_minutes,
                "language": path.language,
            }
        }
    finally:
        db.close()
