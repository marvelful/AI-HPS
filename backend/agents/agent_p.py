"""
AGENT-P — Procedure Intelligence Agent.

Hard constraints:
  - Internal content filters applied before every retrieval (stream_target, role, status)
  - Similarity threshold 0.40: no answer generated below it
  - LLM (Gemini/Mistral) grounds output strictly in retrieved content
  - Stream A: no role filter; Stream B: applicable_roles filter applied
"""
import json
import re
import threading
from datetime import datetime, timezone
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


def _extract_json(text: str) -> dict:
    """Strip markdown fences then parse JSON; raise on failure."""
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL)
    return json.loads(text)


def _generate(query: str, chunks: list[dict], stream: str, language: str) -> dict:
    grok_key = settings.XAI_API_KEY
    gemini_key = settings.GEMINI_API_KEY
    system = (_PROMPT_B if stream == "B" else _PROMPT_A).format(language=language)

    context = "\n\n---\n\n".join(
        f"[{i+1}] {c['meta'].get('title', 'Procedure')}\n"
        f"{c['meta'].get('chunk_text', c['meta'].get('content', ''))}"
        for i, c in enumerate(chunks)
    )
    user_msg = f"Query: {query}\n\nRetrieved content:\n{context[:4000]}"

    last_error = "No LLM API key configured."

    # Try Grok (xAI) first
    if grok_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=grok_key, base_url="https://api.x.ai/v1")
            resp = client.chat.completions.create(
                model="grok-3",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_msg},
                ],
                max_tokens=1200,
                temperature=0,
            )
            return _extract_json(resp.choices[0].message.content)
        except Exception as exc:
            last_error = f"Grok: {exc}"
            print(f"[agent_p] Grok generation error: {exc}")

    # Fallback to Gemini
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            model = genai.GenerativeModel(
                "gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            full_prompt = f"{system}\n\n{user_msg}"
            resp = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(max_output_tokens=1200, temperature=0),
            )
            return _extract_json(resp.text)
        except Exception as exc:
            last_error = f"Gemini: {exc}"
            print(f"[agent_p] Gemini generation error: {exc}")

    # Raw content fallback — surface the real error so it's visible in the response
    top = chunks[0]["meta"]
    return {
        "disclaimer": f"AI generation unavailable — {last_error}",
        "summary": (top.get("chunk_text") or top.get("content") or "")[:600],
    }


# ── Agent node ────────────────────────────────────────────────────────────────

_NO_RESULT = {
    "EN": "No matching procedure found. Please consult a healthcare professional or contact the department.",
    "FR": "Aucune procédure trouvée. Veuillez consulter un professionnel de santé ou contacter le département.",
}


# ── Content gap tracker ───────────────────────────────────────────────────────

def _write_gap(query: str) -> None:
    from shared.models.analytics import ContentGap
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        existing = db.query(ContentGap).filter(ContentGap.query == query).first()
        if existing:
            existing.occurrence_count += 1
            existing.last_seen = now
        else:
            db.add(ContentGap(query=query, occurrence_count=1, first_seen=now, last_seen=now))
        db.commit()
    except Exception as exc:
        print(f"[agent_p] Content gap log failed (non-fatal): {exc}")
    finally:
        db.close()


def _log_content_gap(query: str) -> None:
    threading.Thread(target=_write_gap, args=(query[:500],), daemon=True).start()


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
        _log_content_gap(query)
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
