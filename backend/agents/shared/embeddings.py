"""
In-memory department name embedding index.
Shared by AGENT-N (destination resolution) and AGENT-C (dept info lookup).
Loaded once at startup, thread-safe.
"""
import threading
from typing import Optional

import numpy as np

from shared.database import SessionLocal
from shared.models.procedures import Department

_lock = threading.Lock()
_dept_records: list[dict] = []
_dept_vecs: Optional[np.ndarray] = None
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is not None:
        return _embedder
    try:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        return _embedder
    except Exception as exc:
        print(f"[embeddings] sentence-transformers unavailable: {exc}")
        return None


def load(force: bool = False) -> None:
    """Load or reload the department embedding index from DB."""
    global _dept_records, _dept_vecs
    with _lock:
        if _dept_vecs is not None and not force:
            return

        db = SessionLocal()
        try:
            depts = db.query(Department).filter(Department.is_active == True).all()
        finally:
            db.close()

        records: list[dict] = []
        texts: list[str] = []

        for d in depts:
            names = [d.name] + list(d.informal_names or [])
            for name in names:
                records.append({
                    "id": str(d.id),
                    "name": d.name,
                    "services": d.services,
                    "operating_hours": d.operating_hours,
                    "location": d.location,
                    "contact_details": d.contact_details,
                })
                texts.append(name)

        if not texts:
            _dept_records = []
            _dept_vecs = np.zeros((0, 384), dtype=np.float32)
            return

        model = _get_embedder()
        if model is not None:
            vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            _dept_vecs = np.array(vecs, dtype=np.float32)
        else:
            _dept_vecs = np.zeros((len(texts), 384), dtype=np.float32)

        _dept_records = records
        print(f"[embeddings] Loaded {len(texts)} department name variants for {len(depts)} departments")


def find_department(query: str, threshold: float = 0.65) -> Optional[dict]:
    """Return best-matching department dict, or None if below threshold.

    Strategy:
    1. Direct substring match (catches 'icu' in 'what are the icu hours')
    2. Semantic cosine similarity as fallback
    """
    if _dept_vecs is None:
        load()
    if len(_dept_records) == 0:
        return None

    query_lower = query.lower()

    # Step 1: substring check against all name variants
    seen_ids: set[str] = set()
    for i, rec in enumerate(_dept_records):
        # _dept_records maps 1-to-1 with _dept_texts built at load time
        # We stored the name variant text indirectly via the records list;
        # use department name + informal names for substring matching
        dept_name = rec["name"].lower()
        if dept_name in query_lower:
            return rec
        # Also check each word of the dept name individually (length > 2)
        for word in dept_name.split():
            if len(word) > 2 and word in query_lower and rec["id"] not in seen_ids:
                seen_ids.add(rec["id"])
                return rec

    # Step 2: semantic similarity
    model = _get_embedder()
    if model is None:
        return None

    q_vec = model.encode([query], normalize_embeddings=True, show_progress_bar=False)[0]
    scores = _dept_vecs @ q_vec.astype(np.float32)
    best_idx = int(np.argmax(scores))
    best_score = float(scores[best_idx])

    if best_score >= threshold:
        return _dept_records[best_idx]
    return None
