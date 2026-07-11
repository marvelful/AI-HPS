"""
AGENT-C — Conversational context agent.

Two responsibilities:
  1. dept_info intent  → look up department in the embedding index (no LLM)
  2. chatbot_mode=True → load Redis session, LLM-reformulate query, save history
"""
import json
from typing import Optional

import redis as redis_lib

from agents.state import AIHPSState
from agents.navigation_mock import find_navigation_answer
from agents.shared.embeddings import find_department
from shared.config import get_settings

settings = get_settings()

_SESSION_TTL = 1800   # 30 minutes
_MAX_HISTORY = 10
_CONFIDENCE_THRESHOLD = 0.60

_REDIS: Optional[redis_lib.Redis] = None


def _get_redis() -> redis_lib.Redis:
    global _REDIS
    if _REDIS is None:
        _REDIS = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _REDIS


def _session_key(sid: str) -> str:
    return f"aihps:session:{sid}"


def _load_history(sid: str) -> list:
    try:
        raw = _get_redis().get(_session_key(sid))
        return json.loads(raw) if raw else []
    except Exception:
        return []


def _save_history(sid: str, history: list) -> None:
    try:
        _get_redis().setex(_session_key(sid), _SESSION_TTL, json.dumps(history[-_MAX_HISTORY:]))
    except Exception as exc:
        print(f"[agent_c] Session save failed: {exc}")


_REFORMULATION_PROMPT = (
    "You are a clinical query assistant in a hospital knowledge system. "
    "Reformulate the user's question into a precise, searchable query. "
    "Rules: do NOT add clinical assumptions; preserve all medical specifics; "
    "output a clean, unambiguous search query; if the intent is already clear, return it as-is. "
    "JSON only: {\"reformulated_query\": \"...\", \"confidence\": 0.0}"
)

_CLARIFY = {
    "EN": "Could you clarify your question? More details will help me give you a better answer.",
    "FR": "Pourriez-vous préciser votre question ? Plus de détails m'aideront à mieux vous répondre.",
}


def _extract_json(text: str) -> dict:
    import re
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL)
    return json.loads(text)


def _reformulate(query: str, history: list) -> tuple[str, float]:
    msgs = list(history[-6:])
    msgs.append({"role": "user", "content": query})
    try:
        from agents.shared.groq_client import call_groq
        raw = call_groq(msgs, system=_REFORMULATION_PROMPT, max_tokens=120, temperature=0)
        d = _extract_json(raw)
        return d.get("reformulated_query", query), float(d.get("confidence", 1.0))
    except Exception as exc:
        print(f"[agent_c] Reformulation failed: {exc}")
    return query, 1.0


def agent_c(state: AIHPSState) -> dict:
    intent = state.get("intent")
    language = state.get("language", "EN")
    query = state.get("raw_query", "")

    # ── Path 1: department info lookup ───────────────────────────────────────
    if intent == "dept_info":
        route = find_navigation_answer(query, language)
        if route:
            return {
                "procedure_result": {
                    "found": True,
                    "data": route,
                },
                "had_result": True,
            }

        try:
            dept = find_department(query, threshold=0.65)
        except Exception as exc:
            print(f"[agent_c] find_department error: {exc}")
            dept = None
        if dept:
            # Format dept info as a procedure_result so agent_o can render it
            hours = dept.get("operating_hours") or {}
            contacts = dept.get("contact_details") or {}
            summary = (
                f"{dept.get('name', 'Department')}\n"
                f"Location: {dept.get('location') or 'N/A'}\n"
                f"Hours: {hours}\nContact: {contacts}"
            )
            return {
                "procedure_result": {
                    "found": True,
                    "data": {"answer": summary, "source": "", "disclaimer": ""},
                },
                "had_result": True,
            }
        return {
            "procedure_result": {
                "found": False,
                "message": (
                    "Department not found. Please contact main reception."
                    if language == "EN"
                    else "Département non trouvé. Veuillez contacter l'accueil principal."
                ),
            },
            "had_result": False,
        }

    # ── Path 2: chatbot query reformulation ──────────────────────────────────
    session_id = state.get("session_id") or ""
    history = _load_history(session_id) if session_id else []

    reformulated, confidence = _reformulate(query, history)
    history.append({"role": "user", "content": query})

    if confidence < _CONFIDENCE_THRESHOLD:
        clarification = _CLARIFY.get(language, _CLARIFY["EN"])
        history.append({"role": "assistant", "content": clarification})
        if session_id:
            _save_history(session_id, history)
        return {
            "formatted_output": clarification,
            "output_type": "text",
            "chat_history": history,
        }

    if session_id:
        _save_history(session_id, history)

    return {"reformulated_query": reformulated, "chat_history": history}
