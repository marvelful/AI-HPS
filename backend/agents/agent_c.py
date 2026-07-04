"""
AGENT-C — Conversational Agent + Department Information Retrieval.

Two responsibilities (FR-C-01–08, FR-DI-01–05):
  1. information intent → direct dept DB lookup (no LLM)
  2. chatbot_mode=True → load Redis session, LLM reformulation (Gemini/Mistral),
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


def _extract_json(text: str) -> dict:
    """Strip markdown fences then parse JSON; raise on failure."""
    import re as _re
    text = _re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=_re.DOTALL)
    return json.loads(text)


def _reformulate(query: str, history: list) -> tuple[str, float]:
    grok_key = settings.XAI_API_KEY
    gemini_key = settings.GEMINI_API_KEY

    chat_messages = [{"role": "system", "content": _REFORMULATION_PROMPT}]
    chat_messages.extend(history[-6:])
    chat_messages.append({"role": "user", "content": query})

    # Try Grok (xAI) first
    if grok_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=grok_key, base_url="https://api.x.ai/v1")
            resp = client.chat.completions.create(
                model="grok-3",
                messages=chat_messages,
                max_tokens=120,
                temperature=0,
            )
            data = _extract_json(resp.choices[0].message.content)
            return data.get("reformulated_query", query), float(data.get("confidence", 1.0))
        except Exception as exc:
            print(f"[agent_c] Grok reformulation failed: {exc}")

    # Fallback to Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(
                "gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            full_prompt = "\n".join([f"{m['role']}: {m['content']}" for m in chat_messages])
            resp = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(max_output_tokens=120, temperature=0),
            )
            data = _extract_json(resp.text)
            return data.get("reformulated_query", query), float(data.get("confidence", 1.0))
        except Exception as exc:
            print(f"[agent_c] Gemini reformulation failed: {exc}")

    # Fallback to original query
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
