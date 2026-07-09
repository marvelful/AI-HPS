"""
AGENT-P — Procedure & Knowledge Retrieval Agent.

Retrieval strategy:
  1. Semantic search  → svc07_kb_sync vector store  (weight 0.7)
  2. Full-text search → PostgreSQL knowledge_chunks  (weight 0.3)
  3. Merge, threshold, take top-K
  4. LLM grounded generation (Groq, fallback Gemini)

Stream A → patient-friendly answer with key steps and when-to-seek-help.
Stream B → clinical detail with steps, compliance notes, risk level.
"""
import json
import re
from typing import Optional

from agents.state import AIHPSState
from shared.config import get_settings

settings = get_settings()

_NO_RESULT = {
    "EN": (
        "No matching information was found in the hospital knowledge base. "
        "Please consult a healthcare professional or contact the relevant department directly."
    ),
    "FR": (
        "Aucune information correspondante n'a été trouvée dans la base de connaissances. "
        "Veuillez consulter un professionnel de santé ou contacter directement le département concerné."
    ),
}

# ── RAG prompts ───────────────────────────────────────────────────────────────

_SYSTEM_A = (
    "You are a hospital knowledge assistant for Hôpital Général de Douala, helping patients and visitors. "
    "Answer the question ONLY using the provided knowledge chunks. "
    "Be clear, simple and reassuring. Never speculate. "
    "Always cite the source document. "
    "JSON only (no markdown fences):\n"
    '{"disclaimer":"This information is for guidance only. Always follow medical staff instructions.",'
    '"answer":"...","key_steps":["..."],"when_to_seek_help":"...","source":"..."}'
)

_SYSTEM_B = (
    "You are a clinical knowledge assistant for hospital staff at Hôpital Général de Douala. "
    "Answer ONLY from the provided knowledge chunks. Include all relevant clinical details. "
    "Never speculate beyond the source content. "
    "JSON only (no markdown fences):\n"
    '{"disclaimer":"AI-assisted summary. Verify against official procedure documents.",'
    '"answer":"...","steps":[{"step":1,"instruction":"..."}],'
    '"compliance_notes":["..."],"risk_level":"...","source":"..."}'
)


# ── Search ────────────────────────────────────────────────────────────────────

_PATIENT_ALLOWED_DOCUMENTS = {
    "infection_control_who_guidelines_on_hand_hygiene_in_health_care",
}


def _is_patient_allowed(meta: dict) -> bool:
    document_id = str(meta.get("document_id") or "").lower()
    source = str(meta.get("source") or "").lower()
    citation = str(meta.get("citation") or "").lower()
    return (
        document_id in _PATIENT_ALLOWED_DOCUMENTS
        or "who guidelines on hand hygiene in health care" in source
        or "who guidelines on hand hygiene in health care" in citation
    )


def _filter_for_stream(items: list, stream: str) -> list:
    if stream != "A":
        return items
    filtered = []
    for item in items:
        meta = item[1] if isinstance(item, tuple) else item
        if _is_patient_allowed(meta):
            filtered.append(item)
    return filtered


def _semantic_search(query: str, language: Optional[str], top_k: int, stream: str) -> list[tuple[float, dict]]:
    try:
        from services.svc07_kb_sync.service import search
        return _filter_for_stream(search(query, top_k=top_k, language=language), stream)
    except Exception as exc:
        print(f"[agent_p] Semantic search error: {exc}")
        return []


def _translate_to_en(text: str) -> str:
    """Translate a non-English query to English via Groq so FTS can match English documents."""
    try:
        from agents.shared.groq_client import call_groq
        result = call_groq(
            messages=[{"role": "user", "content": f"Translate to English (output the translation only, no explanation):\n{text}"}],
            max_tokens=120,
            temperature=0,
        )
        return result.strip()
    except Exception:
        return text


def _fts_search(query: str, language: Optional[str], top_k: int, stream: str) -> list[dict]:
    from sqlalchemy import text as sql_text
    from shared.database import SessionLocal

    # FR queries need English keywords to match the English-language document KB
    search_query = _translate_to_en(query) if language == "FR" else query
    safe_q = re.sub(r"[^\w\s]", " ", search_query).strip() or "hospital procedure"

    sql = """
        SELECT chunk_id, document_id, source, title, content, section, knowledge_domain,
               department, language, citation, page,
               ts_rank(search_vector, plainto_tsquery(:q)) AS rank
        FROM aihps_procedures.knowledge_chunks
        WHERE approval_status = 'approved'
          AND search_vector @@ plainto_tsquery(:q)
        ORDER BY rank DESC
        LIMIT :top_k
    """
    db = SessionLocal()
    try:
        rows = db.execute(sql_text(sql), {"q": safe_q, "top_k": top_k}).fetchall()
        return [
            {
                "chunk_id":        r.chunk_id,
                "document_id":     r.document_id,
                "source":          r.source,
                "title":           r.title,
                "content":         r.content[:1000],
                "section":         r.section,
                "knowledge_domain": r.knowledge_domain,
                "department":      r.department,
                "language":        r.language,
                "citation":        r.citation,
                "page":            r.page,
                "fts_rank":        float(r.rank),
            }
            for r in rows
            if stream != "A" or _is_patient_allowed({"document_id": r.document_id, "source": r.source, "citation": r.citation})
        ]
    except Exception as exc:
        print(f"[agent_p] FTS error: {exc}")
        return []
    finally:
        db.close()


def _merge(
    semantic: list[tuple[float, dict]],
    fts: list[dict],
    top_k: int,
    min_score: float,
) -> list[dict]:
    merged: dict[str, dict] = {}

    for score, meta in semantic:
        cid = meta.get("chunk_id", "")
        if not cid:
            continue
        merged.setdefault(cid, {"meta": meta, "score": 0.0})
        merged[cid]["score"] += 0.7 * score

    max_fts = max((r["fts_rank"] for r in fts), default=1.0) or 1.0
    for row in fts:
        cid = row.get("chunk_id", "")
        norm = row["fts_rank"] / max_fts
        if cid not in merged:
            merged[cid] = {"meta": row, "score": 0.0}
        merged[cid]["score"] += 0.3 * norm

    ranked = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
    return [r for r in ranked if r["score"] >= min_score][:top_k]


# ── Generation ────────────────────────────────────────────────────────────────

def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        meta = c["meta"]
        parts.append(
            f"[Source {i}] {meta.get('title', '')} — "
            f"{meta.get('department', '')} (page {meta.get('page', '?')})\n"
            f"{meta.get('content', '')}"
        )
    return "\n\n---\n\n".join(parts)


def _generate(query: str, chunks: list[dict], stream: str, language: str) -> dict:
    from agents.shared.groq_client import call_groq, GroqError

    system = _SYSTEM_B if stream == "B" else _SYSTEM_A
    context = _build_context(chunks)
    user_msg = (
        f"Question: {query}\n\n"
        f"Knowledge chunks:\n{context[:3500]}\n\n"
        f"Respond in {'French' if language == 'FR' else 'English'}."
    )

    try:
        raw = call_groq(
            messages=[{"role": "user", "content": user_msg}],
            system=system,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
        )
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip(), flags=re.DOTALL)
        return json.loads(raw)
    except GroqError as exc:
        print(f"[agent_p] Groq generation error: {exc}")
    except (json.JSONDecodeError, ValueError) as exc:
        print(f"[agent_p] JSON parse error: {exc}")

    # Gemini fallback
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(
                "gemini-1.5-flash",
                generation_config={"response_mime_type": "application/json"},
            )
            resp = model.generate_content(
                f"{system}\n\n{user_msg}",
                generation_config=genai.types.GenerationConfig(max_output_tokens=800, temperature=0),
            )
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", resp.text.strip(), flags=re.DOTALL)
            return json.loads(raw)
        except Exception as exc:
            print(f"[agent_p] Gemini fallback error: {exc}")

    # Raw content fallback
    top = chunks[0]["meta"]
    return {
        "answer": top.get("content", "")[:600],
        "source": top.get("citation", ""),
        "disclaimer": "AI generation unavailable — showing raw source content.",
    }


# ── Agent node ────────────────────────────────────────────────────────────────

def agent_p(state: AIHPSState) -> dict:
    query = state.get("reformulated_query") or state.get("raw_query", "")
    language = state.get("language", "EN")
    stream = state.get("stream", "A")
    top_k = settings.RAG_TOP_K
    # Cross-lingual queries score slightly lower — be a bit more lenient for FR
    min_score = settings.RAG_MIN_SIMILARITY * 0.8 if language == "FR" else settings.RAG_MIN_SIMILARITY

    # Pass language=None so the multilingual model returns results regardless of
    # how the chunk language field was stored (en/EN/english/etc.)
    semantic = _semantic_search(query, None, top_k * 3, stream)
    fts = _fts_search(query, language, top_k * 2, stream)
    top_chunks = _merge(semantic, fts, top_k=top_k, min_score=min_score)

    # If nothing passes the threshold, relax it once before giving up
    if not top_chunks and semantic:
        top_chunks = _merge(semantic, fts, top_k=top_k, min_score=min_score * 0.5)

    if not top_chunks:
        return {
            "procedure_result": {
                "found": False,
                "message": _NO_RESULT.get(language, _NO_RESULT["EN"]),
            },
            "had_result": False,
        }

    generated = _generate(query, top_chunks, stream, language)

    return {
        "retrieved_chunks": [c["meta"] for c in top_chunks],
        "procedure_result": {"found": True, "data": generated},
        "had_result": True,
    }
