"""
AGENT-C — Conversational Agent + Department Information Retrieval.

Two responsibilities (FR-C-01–08, FR-DI-01–05):
  1. information intent → direct dept DB lookup (no LLM)
  2. chatbot_mode=True → load Redis session, GPT-4o-mini reformulation,
     save history, pass reformulated_query to AGENT-P
"""
import json
from typing import Optional

import redis as redis_lib

from agents.state import AIHPSState
from agents.shared.embeddings import find_department
from shared.config import get_settings

settings = get_settings()

_REDIS: Optional[redis_lib.Redis] = None
_SESSION_TTL = 1800  # 30 minutes
_MAX_HISTORY = 10    # messages kept (sliding window)
_CONFIDENCE_THRESHOLD = 0.60


def _get_redis() -> redis_lib.Redis:
    global _REDIS
    if _REDIS is None:
        _REDIS = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _REDIS


def _session_key(session_id: str) -> str:
    return f"aihps:session:{session_id}"


def _load_history(session_id: str) -> list:
    try:
        raw = _get_redis().get(_session_key(session_id))
        if raw:
            return json.loads(raw)
    except Exception:
        pass
    return []


def _save_history(session_id: str, history: list) -> None:
    try:
        _get_redis().setex(
            _session_key(session_id),
            _SESSION_TTL,
            json.dumps(history[-_MAX_HISTORY:]),
        )
    except Exception as exc:
        print(f"[agent_c] Session save failed: {exc}")


_REFORMULATION_PROMPT = (
    "You are a clinical query assistant in a hospital system. "
    "Reformulate the user's question into a precise, searchable medical query.\n"
    "Rules:\n"
    "- Do NOT add clinical assumptions or change medical intent\n"
    "- Preserve all clinical specifics (medications, conditions, procedures)\n"
    "- Output a clean, unambiguous search query\n"
    "- If the intent is already clear, return it as-is\n"
    "Respond ONLY with JSON: {\"reformulated_query\": \"...\", \"confidence\": 0.0}"
)


def _reformulate(query: str, history: list) -> tuple[str, float]:
    api_key = settings.OPENAI_API_KEY
    if not api_key:
        return query, 1.0
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        messages = [{"role": "system", "content": _REFORMULATION_PROMPT}]
        messages.extend(history[-6:])  # last 3 turns for context
        messages.append({"role": "user", "content": query})
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"},
            max_tokens=120,
            temperature=0,
        )
        data = json.loads(resp.choices[0].message.content)
        return data.get("reformulated_query", query), float(data.get("confidence", 1.0))
    except Exception as exc:
        print(f"[agent_c] Reformulation failed: {exc}")
        return query, 1.0


_CLARIFY = {
    "EN": "Could you clarify your question? More details will help me give you a better answer.",
    "FR": "Pourriez-vous préciser votre question ? Plus de détails m'aideront à mieux vous répondre.",
}


def agent_c(state: AIHPSState) -> dict:
    intent = state.get("intent")
    language = state.get("language", "EN")
    query = state.get("raw_query", "")

    # ── Path 1: department information lookup (no LLM) ────────────────────────
    if intent == "information":
        dept = find_department(query, threshold=0.65)
        if dept:
            return {"dept_info": dept}
        return {
            "dept_info": {
                "found": False,
                "message": (
                    "Department not found. Please contact the main reception for assistance."
                    if language == "EN"
                    else "Département non trouvé. Veuillez contacter l'accueil principal."
                ),
            }
        }

    # ── Path 2: chatbot query reformulation ───────────────────────────────────
    session_id = state.get("session_id") or ""
    history = _load_history(session_id) if session_id else []

    reformulated, confidence = _reformulate(query, history)

    # Add user turn before deciding
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
