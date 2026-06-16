"""
AGENT-P — Procedure Intelligence Agent (RAG + internal filtering + grounded generation).

Hard constraints:
  - Internal content filters applied before every retrieval (stream_target, role, status)
  - Similarity threshold 0.40: no answer generated below it
  - GPT-4o-mini grounds output strictly in retrieved content
  - Stream A: no role filter; Stream B: applicable_roles filter applied
"""
import json
import re
from typing import Optional

from agents.state import AIHPSState
from shared.config import get_settings
from shared.database import SessionLocal

settings = get_settings()

_THRESHOLD = 0.40


# ── Filter builder ────────────────────────────────────────────────────────────

def _build_filters(state: AIHPSState) -> dict:
    return {
        "stream": state.get("stream", "A"),
        "user_role": state.get("user_role") if state.get("stream") == "B" else None,
        "language": state.get("language", "EN"),
    }


# ── Semantic search (via SVC-07) ──────────────────────────────────────────────

def _semantic_search(query: str, filters: dict, top_k: int = 20) -> list[tuple[float, dict]]:
    try:
        from services.svc07_kb_sync.service import search
        results = search(
            query,
            top_k=top_k,
            stream_target=filters["stream"],
            language=filters["language"],
        )
        # Role filter for Stream B
        role = filters.get("user_role")
        if role:
            results = [
                (score, meta) for score, meta in results
                if not meta.get("applicable_roles") or role in meta["applicable_roles"]
            ]
        return results
    except Exception as exc:
        print(f"[agent_p] Semantic search error: {exc}")
        return []


# ── Full-text search (PostgreSQL TSVECTOR) ────────────────────────────────────

def _fts_search(query: str, filters: dict, top_k: int = 10) -> list[dict]:
    from sqlalchemy import text as sql_text
    stream = filters["stream"]
    language = filters["language"]
    role = filters.get("user_role")

    safe_query = re.sub(r"[^\w\s]", " ", query).strip() or "hospital"
    sql = """
        SELECT id, title, content, summary, steps, risk_level, applicable_roles,
               stream_target, department_id,
               ts_rank(search_vector, plainto_tsquery(:query)) AS rank
        FROM aihps_procedures.procedure_entries
        WHERE status = 'published'
          AND stream_target IN ('both', :stream)
          AND search_vector @@ plainto_tsquery(:query)
        ORDER BY rank DESC
        LIMIT :top_k
    """
    db = SessionLocal()
    try:
        rows = db.execute(
            sql_text(sql),
            {"query": safe_query, "stream": stream, "top_k": top_k},
        ).fetchall()
        results = []
        for row in rows:
            applicable_roles = row.applicable_roles or []
            if stream == "B" and role and applicable_roles and role not in applicable_roles:
                continue
            results.append({
                "entry_id": str(row.id),
                "title": row.title,
                "content": (row.content or "")[:1500],
                "summary": row.summary,
                "steps": row.steps or [],
                "risk_level": row.risk_level,
                "department_id": str(row.department_id) if row.department_id else None,
                "fts_rank": float(row.rank),
            })
        return results
    except Exception as exc:
        print(f"[agent_p] FTS search error: {exc}")
        return []
    finally:
        db.close()


# ── Result merge (0.7 semantic + 0.3 FTS) ────────────────────────────────────

def _merge(
    semantic: list[tuple[float, dict]],
    fts: list[dict],
    top_k: int = 5,
) -> list[dict]:
    merged: dict[str, dict] = {}

    for score, meta in semantic:
        eid = meta["entry_id"]
        if eid not in merged:
            merged[eid] = {"entry_id": eid, "score": 0.0, "meta": meta}
        merged[eid]["score"] += 0.7 * score

    max_fts = max((r["fts_rank"] for r in fts), default=1.0) or 1.0
    for row in fts:
        eid = row["entry_id"]
        norm = row["fts_rank"] / max_fts
        if eid not in merged:
            merged[eid] = {"entry_id": eid, "score": 0.0, "meta": row}
        merged[eid]["score"] += 0.3 * norm

    ranked = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
    return ranked[:top_k]


# ── LLM generation ────────────────────────────────────────────────────────────

_PROMPT_A = (
    "You are a hospital information assistant for patients and visitors. "
    "Answer ONLY from the provided procedure content. Be clear and concise.\n"
    "RULES: Ground every statement in the retrieved content. No speculation.\n"
    "Respond in {language} with JSON (escape all braces in your response):\n"
    '{{"disclaimer":"This information is for guidance only. Always follow medical staff instructions.",'
    '"summary":"...","key_steps":["..."],"when_to_seek_help":"..."}}'
)

_PROMPT_B = (
    "You are a clinical procedure assistant for hospital staff. "
    "Provide a structured response grounded ONLY in the retrieved procedure content.\n"
    "RULES: No speculation. Include all approvals and compliance notes from the content.\n"
    "Respond in {language} with JSON:\n"
    '{{"disclaimer":"AI-assisted summary. Verify against official procedure documents.",'
    '"summary":"...","steps":[{{"step":1,"instruction":"...","approval_required":false}}],'
    '"compliance_notes":["..."],"risk_level":"...","escalation":"...","citations":["..."]}}'
)


def _generate(query: str, chunks: list[dict], stream: str, language: str) -> dict:
    api_key = settings.OPENAI_API_KEY
    system = (_PROMPT_B if stream == "B" else _PROMPT_A).format(language=language)

    context = "\n\n---\n\n".join(
        f"[{i+1}] {c['meta'].get('title', 'Procedure')}\n"
        f"{c['meta'].get('chunk_text', c['meta'].get('content', ''))}"
        for i, c in enumerate(chunks)
    )
    user_msg = f"Query: {query}\n\nRetrieved content:\n{context[:4000]}"

    if not api_key:
        # Raw content fallback
        top = chunks[0]["meta"]
        return {
            "disclaimer": "AI generation unavailable. Raw content shown.",
            "summary": (top.get("chunk_text") or top.get("content") or "")[:600],
        }

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            max_tokens=1200,
            temperature=0,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as exc:
        print(f"[agent_p] LLM generation error: {exc}")
        top = chunks[0]["meta"]
        return {
            "disclaimer": "AI generation temporarily unavailable.",
            "summary": (top.get("chunk_text") or top.get("content") or "")[:600],
        }


# ── Agent node ────────────────────────────────────────────────────────────────

_NO_RESULT = {
    "EN": "No matching procedure found. Please consult a healthcare professional or contact the department.",
    "FR": "Aucune procédure trouvée. Veuillez consulter un professionnel de santé ou contacter le département.",
}


def agent_p(state: AIHPSState) -> dict:
    query = state.get("reformulated_query") or state.get("raw_query", "")
    stream = state.get("stream", "A")
    language = state.get("language", "EN")

    filters = _build_filters(state)
    semantic = _semantic_search(query, filters)
    fts = _fts_search(query, filters)
    top_chunks = _merge(semantic, fts, top_k=5)

    # Hard threshold check
    if not top_chunks or top_chunks[0]["score"] < _THRESHOLD:
        return {
            "procedure_result": {
                "found": False,
                "message": _NO_RESULT.get(language, _NO_RESULT["EN"]),
            },
            "had_result": False,
        }

    generated = _generate(query, top_chunks, stream, language)
    risk = top_chunks[0]["meta"].get("risk_level", "low")

    return {
        "procedure_result": {
            "found": True,
            "data": generated,
            "top_entry_id": top_chunks[0]["entry_id"],
            "risk_level": risk,
        },
        "had_result": True,
    }
