"""
AGENT-E — Emergency Agent (LangGraph interrupt priority).

Hard constraints (SRS FR-E-05, FR-E-06):
  - Zero LLM calls on this path
  - Emergency content pre-cached in Redis at startup (≤3s SLA)
  - Every activation logged to SVC-06 audit
  - AGENT-O never compresses emergency output
"""
import json
from typing import Optional

import redis as redis_lib

from agents.state import AIHPSState
from agents.shared.audit import emit
from shared.config import get_settings
from shared.database import SessionLocal
from shared.models.procedures import EmergencyContent

settings = get_settings()

_CACHE_PREFIX = "aihps:emergency:"
_CACHE_TTL = 3600

_redis: Optional[redis_lib.Redis] = None


def _get_redis() -> redis_lib.Redis:
    global _redis
    if _redis is None:
        _redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


def warm_cache() -> None:
    """Pre-load all emergency_content rows into Redis at startup."""
    db = SessionLocal()
    try:
        rows = db.query(EmergencyContent).all()
        r = _get_redis()
        for row in rows:
            key = f"{_CACHE_PREFIX}{row.language}:{row.stream}"
            r.setex(key, _CACHE_TTL, json.dumps({
                "content": row.content,
                "contacts": row.contacts or [],
                "directions": row.directions,
            }))
        print(f"[agent_e] Emergency cache warmed: {len(rows)} rows")
    except Exception as exc:
        print(f"[agent_e] Cache warm failed (non-fatal): {exc}")
    finally:
        db.close()


def _fetch(language: str, stream: str) -> Optional[dict]:
    # Try Redis first
    try:
        r = _get_redis()
        raw = r.get(f"{_CACHE_PREFIX}{language}:{stream}")
        if raw:
            return json.loads(raw)
        # Also try 'both' stream
        raw = r.get(f"{_CACHE_PREFIX}{language}:both")
        if raw:
            return json.loads(raw)
    except Exception:
        pass

    # DB fallback
    db = SessionLocal()
    try:
        row = (
            db.query(EmergencyContent)
            .filter(
                EmergencyContent.language == language,
                EmergencyContent.stream.in_([stream, "both"]),
            )
            .first()
        )
        if row:
            return {
                "content": row.content,
                "contacts": row.contacts or [],
                "directions": row.directions,
            }
    finally:
        db.close()
    return None


_FALLBACK = {
    "EN": "EMERGENCY: Please go immediately to the Emergency Department. Call for help.",
    "FR": "URGENCE : Rendez-vous immédiatement aux Urgences. Appelez à l'aide.",
}


def agent_e(state: AIHPSState) -> dict:
    language = state.get("language", "EN")
    stream = state.get("stream", "A")

    content = _fetch(language, stream)
    if content is None:
        # Try English fallback before using hardcoded message
        content = _fetch("EN", stream) or {
            "content": _FALLBACK.get(language, _FALLBACK["EN"]),
            "contacts": [],
            "directions": None,
        }

    emit(
        "emergency_activation",
        user_id=state.get("user_id"),
        entity_type="emergency_query",
        metadata={
            "platform": state.get("platform"),
            "stream": stream,
            "language": language,
            "raw_query": (state.get("raw_query") or "")[:200],
        },
    )

    return {"emergency_content": content}
