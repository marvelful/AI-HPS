"""
SVC-07 KB Sync — vector store and embedding service.

Uses a numpy-based cosine-similarity store (no FAISS dependency required).
Embedder: sentence-transformers paraphrase-multilingual-MiniLM-L12-v2 (384d).
Falls back to a zero-vector stub when the model is not yet installed,
so the service starts and can be tested even without the ML stack.

Index stored at: backend/kb_index/aihps  (.npy for vectors, .json for metadata)
"""
import json
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np

from shared.config import get_settings
from shared.database import SessionLocal
from shared.models.procedures import ProcedureEntry

settings = get_settings()

_INDEX_DIR  = os.path.join(os.path.dirname(__file__), "..", "..", "kb_index")
_INDEX_BASE = os.path.join(_INDEX_DIR, "aihps")

# ── Chunking ─────────────────────────────────────────────────────────────────
_CHUNK_CHARS   = 2000  # ≈ 500 tokens
_OVERLAP_CHARS = 200   # ≈ 50 tokens


def _chunk_text(text: str) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + _CHUNK_CHARS, len(text))
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = end - _OVERLAP_CHARS
    return [c for c in chunks if c]


# ── Embedder ─────────────────────────────────────────────────────────────────

class _Embedder:
    def __init__(self):
        self._model = None
        self._model_name = "paraphrase-multilingual-MiniLM-L12-v2"
        self._dim = 384

    def _load(self) -> bool:
        if self._model is not None:
            return True
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self._model_name)
            return True
        except Exception as exc:
            print(f"[svc07] Embedder not available: {exc}. Using zero vectors.")
            return False

    @property
    def name(self) -> str:
        return self._model_name if self._model else "stub (zero-vector)"

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not self._load() or not texts:
            return [([0.0] * self._dim) for _ in texts]
        vecs = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return vecs.tolist()

    def embed_one(self, text: str) -> list[float]:
        return self.embed([text])[0]


# ── Numpy vector store ────────────────────────────────────────────────────────

class _VectorStore:
    def __init__(self):
        self._vecs: list[np.ndarray] = []
        self._meta: list[dict]       = []
        self._last_sync: str | None  = None

    def add(self, vec: list[float], meta: dict) -> None:
        self._vecs.append(np.array(vec, dtype=np.float32))
        self._meta.append(meta)

    def remove_entry(self, entry_id: str) -> int:
        kept_v, kept_m = [], []
        removed = 0
        for v, m in zip(self._vecs, self._meta):
            if m.get("entry_id") == entry_id:
                removed += 1
            else:
                kept_v.append(v)
                kept_m.append(m)
        self._vecs, self._meta = kept_v, kept_m
        return removed

    def search(
        self,
        query_vec: list[float],
        k: int = 5,
        stream_target: Optional[str] = None,
        language: Optional[str] = None,
    ) -> list[tuple[float, dict]]:
        if not self._vecs:
            return []

        q = np.array(query_vec, dtype=np.float32)
        matrix = np.stack(self._vecs)   # shape (N, dim)

        # Cosine similarity (vectors are pre-normalised by the embedder)
        scores = matrix @ q

        results = []
        for idx, score in enumerate(scores):
            m = self._meta[idx]
            if stream_target and m.get("stream_target") not in {stream_target, "both"}:
                continue
            if language and m.get("language") != language:
                continue
            results.append((float(score), m))

        results.sort(key=lambda x: x[0], reverse=True)
        return results[:k]

    @property
    def vector_count(self) -> int:
        return len(self._vecs)

    @property
    def unique_procedures(self) -> int:
        return len({m["entry_id"] for m in self._meta})

    def save(self, base_path: str) -> None:
        os.makedirs(os.path.dirname(base_path), exist_ok=True)
        arr = np.stack(self._vecs).astype(np.float32) if self._vecs else np.array([], dtype=np.float32)
        np.save(base_path + ".npy", arr)
        with open(base_path + ".json", "w", encoding="utf-8") as f:
            json.dump(self._meta, f, ensure_ascii=False)
        self._last_sync = datetime.now(timezone.utc).isoformat()

    def load(self, base_path: str) -> None:
        npy = base_path + ".npy"
        jsn = base_path + ".json"
        if os.path.exists(npy) and os.path.exists(jsn):
            arr = np.load(npy)
            self._vecs = [arr[i] for i in range(len(arr))] if arr.ndim == 2 else []
            with open(jsn, "r", encoding="utf-8") as f:
                self._meta = json.load(f)
            print(f"[svc07] Loaded index: {len(self._vecs)} vectors from {base_path}")
        else:
            print(f"[svc07] No existing index at {base_path} — starting fresh")

    @property
    def last_sync_at(self) -> str | None:
        return self._last_sync


# ── Public singleton interface ────────────────────────────────────────────────

embedder = _Embedder()
store    = _VectorStore()


def load_index() -> None:
    store.load(_INDEX_BASE)


def get_status() -> dict:
    return {
        "vector_count":       store.vector_count,
        "unique_procedures":  store.unique_procedures,
        "last_sync_at":       store.last_sync_at,
        "embedder":           embedder.name,
        "index_path":         _INDEX_BASE,
    }


def sync_procedure(entry_id: str) -> int:
    """Fetch a published procedure from the DB, embed its chunks, update the store."""
    db = SessionLocal()
    try:
        entry: Optional[ProcedureEntry] = (
            db.query(ProcedureEntry)
            .filter(ProcedureEntry.id == entry_id, ProcedureEntry.status == "published")
            .first()
        )
        if not entry:
            removed = store.remove_entry(entry_id)
            if removed:
                store.save(_INDEX_BASE)
            return 0

        # Remove stale chunks for this entry
        store.remove_entry(entry_id)

        # Build text to embed
        parts = [entry.title]
        if entry.summary:
            parts.append(entry.summary)
        parts.append(entry.content)
        if entry.steps:
            steps_text = " ".join(
                s.get("instruction", "") or s.get("text", "") or str(s)
                for s in entry.steps
            )
            parts.append(steps_text)
        full_text = "\n\n".join(p for p in parts if p)

        chunks = _chunk_text(full_text)
        if not chunks:
            return 0

        vecs = embedder.embed(chunks)
        for i, (chunk, vec) in enumerate(zip(chunks, vecs)):
            store.add(vec, {
                "entry_id":       str(entry.id),
                "chunk_index":    i,
                "chunk_text":     chunk[:300],
                "title":          entry.title,
                "stream_target":  entry.stream_target,
                "applicable_roles": list(entry.applicable_roles or []),
                "risk_level":     entry.risk_level,
                "language":       entry.language,
                "status":         entry.status,
                "department_id":  str(entry.department_id) if entry.department_id else None,
            })

        store.save(_INDEX_BASE)
        print(f"[svc07] Synced {entry_id}: {len(chunks)} chunks")
        return len(chunks)
    finally:
        db.close()


def remove_procedure(entry_id: str) -> int:
    removed = store.remove_entry(entry_id)
    if removed:
        store.save(_INDEX_BASE)
    return removed


def rebuild_full_index() -> int:
    """Re-embed all published procedures from scratch."""
    db = SessionLocal()
    try:
        entries = (
            db.query(ProcedureEntry)
            .filter(ProcedureEntry.status == "published")
            .all()
        )
        # Reset store
        store._vecs.clear()
        store._meta.clear()
        total_chunks = 0
        for entry in entries:
            # Reuse sync logic but don't re-open DB
            parts = [entry.title]
            if entry.summary:
                parts.append(entry.summary)
            parts.append(entry.content)
            full_text = "\n\n".join(p for p in parts if p)
            chunks = _chunk_text(full_text)
            if not chunks:
                continue
            vecs = embedder.embed(chunks)
            for i, (chunk, vec) in enumerate(zip(chunks, vecs)):
                store.add(vec, {
                    "entry_id":       str(entry.id),
                    "chunk_index":    i,
                    "chunk_text":     chunk[:300],
                    "title":          entry.title,
                    "stream_target":  entry.stream_target,
                    "applicable_roles": list(entry.applicable_roles or []),
                    "risk_level":     entry.risk_level,
                    "language":       entry.language,
                    "status":         entry.status,
                    "department_id":  str(entry.department_id) if entry.department_id else None,
                })
            total_chunks += len(chunks)

        store.save(_INDEX_BASE)
        print(f"[svc07] Full rebuild: {len(entries)} procedures, {total_chunks} chunks")
        return total_chunks
    finally:
        db.close()


def search(
    query: str,
    top_k: int = 5,
    stream_target: Optional[str] = None,
    language: Optional[str] = None,
) -> list[tuple[float, dict]]:
    q_vec = embedder.embed_one(query)
    return store.search(q_vec, k=top_k, stream_target=stream_target, language=language)
