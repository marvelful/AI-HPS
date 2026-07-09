"""
SVC-07 KB Sync — vector knowledge base service.

Source of truth: backend/knowledge/knowledge_chunks.jsonl
Embedding model: paraphrase-multilingual-MiniLM-L12-v2 (384-dim, multilingual)
Index stored at: backend/kb_index/aihps  (.npy vectors + .json metadata)

Workflow:
  1. Run ingestion pipeline  → produces knowledge_chunks.jsonl
  2. Call rebuild_from_jsonl() → embeds all chunks → saves numpy index
  3. search() → cosine similarity over embedded query
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np

from shared.config import get_settings

settings = get_settings()

_KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge"
_JSONL_PATH = _KNOWLEDGE_DIR / "knowledge_chunks.jsonl"
_INDEX_DIR = Path(__file__).parent.parent.parent / "kb_index"
_INDEX_BASE = str(_INDEX_DIR / "aihps")

_EMBED_BATCH = 64


# ── Embedder ──────────────────────────────────────────────────────────────────

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
            print(f"[svc07] Embedder unavailable: {exc}")
            return False

    @property
    def name(self) -> str:
        return self._model_name if self._model else "stub (no sentence-transformers)"

    @property
    def dim(self) -> int:
        return self._dim

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if not self._load():
            return [[0.0] * self._dim for _ in texts]
        vecs = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return vecs.tolist()

    def embed_one(self, text: str) -> list[float]:
        result = self.embed([text])
        return result[0] if result else [0.0] * self._dim


# ── Vector store ──────────────────────────────────────────────────────────────

class _VectorStore:
    def __init__(self):
        self._vecs: list[np.ndarray] = []
        self._meta: list[dict] = []
        self._last_sync: Optional[str] = None

    def clear(self) -> None:
        self._vecs.clear()
        self._meta.clear()

    def add(self, vec: list[float], meta: dict) -> None:
        self._vecs.append(np.array(vec, dtype=np.float32))
        self._meta.append(meta)

    def search(
        self,
        query_vec: list[float],
        k: int = 5,
        knowledge_domain: Optional[str] = None,
        department: Optional[str] = None,
        language: Optional[str] = None,
        role: Optional[str] = None,
    ) -> list[tuple[float, dict]]:
        if not self._vecs:
            return []

        q = np.array(query_vec, dtype=np.float32)
        matrix = np.stack(self._vecs)
        scores = matrix @ q  # cosine similarity (vectors are pre-normalised)

        results = []
        for i, score in enumerate(scores):
            m = self._meta[i]
            if knowledge_domain and m.get("knowledge_domain") != knowledge_domain:
                continue
            if department and m.get("department", "").lower() != department.lower():
                continue
            if language and m.get("language") != language:
                continue
            if role and m.get("role") not in {"all", role}:
                continue
            results.append((float(score), m))

        results.sort(key=lambda x: x[0], reverse=True)
        return results[:k]

    @property
    def vector_count(self) -> int:
        return len(self._vecs)

    @property
    def unique_documents(self) -> int:
        return len({m.get("document_id", "") for m in self._meta})

    def save(self, base_path: str) -> None:
        os.makedirs(os.path.dirname(base_path), exist_ok=True)
        if self._vecs:
            arr = np.stack(self._vecs).astype(np.float32)
        else:
            arr = np.zeros((0, embedder.dim), dtype=np.float32)
        np.save(base_path + ".npy", arr)
        with open(base_path + ".json", "w", encoding="utf-8") as f:
            json.dump(self._meta, f, ensure_ascii=False)
        self._last_sync = datetime.now(timezone.utc).isoformat()
        print(f"[svc07] Saved: {len(self._vecs)} vectors → {base_path}")

    def load(self, base_path: str) -> None:
        npy = base_path + ".npy"
        jsn = base_path + ".json"
        if os.path.exists(npy) and os.path.exists(jsn):
            arr = np.load(npy)
            self._vecs = [arr[i] for i in range(len(arr))] if arr.ndim == 2 and len(arr) > 0 else []
            with open(jsn, "r", encoding="utf-8") as f:
                self._meta = json.load(f)
            self._last_sync = datetime.now(timezone.utc).isoformat()
            print(f"[svc07] Loaded index: {len(self._vecs)} vectors")
        else:
            print(f"[svc07] No index at {base_path} — run POST /pipeline/rebuild-kb to build it")

    @property
    def last_sync_at(self) -> Optional[str]:
        return self._last_sync


embedder = _Embedder()
store = _VectorStore()


# ── Public API ─────────────────────────────────────────────────────────────────

def load_index() -> None:
    store.load(_INDEX_BASE)


def get_status() -> dict:
    return {
        "vector_count":    store.vector_count,
        "unique_documents": store.unique_documents,
        "last_sync_at":    store.last_sync_at,
        "embedder":        embedder.name,
        "jsonl_path":      str(_JSONL_PATH),
        "jsonl_exists":    _JSONL_PATH.exists(),
        "index_path":      _INDEX_BASE,
    }


def rebuild_from_jsonl() -> int:
    """
    Load knowledge_chunks.jsonl, embed every chunk, save numpy index.
    Must be called after the ingestion pipeline produces the JSONL.
    """
    if not _JSONL_PATH.exists():
        raise FileNotFoundError(
            f"knowledge_chunks.jsonl not found at {_JSONL_PATH}.\n"
            "Run the ingestion pipeline first:\n"
            "  cd backend && python -m ingestion.cli"
        )

    chunks: list[dict] = []
    with open(_JSONL_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                chunks.append(json.loads(line))

    if not chunks:
        raise ValueError("knowledge_chunks.jsonl is empty — re-run the ingestion pipeline")

    print(f"[svc07] Embedding {len(chunks)} chunks...")

    # Build text to embed: title + section + first 800 chars of content
    texts = [
        " ".join(filter(None, [
            c.get("title", ""),
            c.get("section", ""),
            c.get("content", "")[:800],
        ]))
        for c in chunks
    ]

    all_vecs: list[list[float]] = []
    for i in range(0, len(texts), _EMBED_BATCH):
        batch = texts[i: i + _EMBED_BATCH]
        all_vecs.extend(embedder.embed(batch))
        done = min(i + _EMBED_BATCH, len(texts))
        if done % 320 == 0 or done == len(texts):
            print(f"  [{done}/{len(texts)}]")

    store.clear()
    for chunk, vec in zip(chunks, all_vecs):
        store.add(vec, {
            # Identity
            "chunk_id":        chunk["chunk_id"],
            "document_id":     chunk["document_id"],
            "source":          chunk.get("source", ""),
            # Display / citation
            "title":           chunk.get("title", ""),
            "section":         chunk.get("section", ""),
            "citation":        chunk.get("citation", ""),
            "page":            chunk.get("page", 0),
            # Routing / filtering
            "knowledge_domain": chunk["knowledge_domain"],
            "department":      chunk["department"],
            "language":        chunk["language"],
            "role":            chunk.get("role", "all"),
            "approval_status": chunk.get("approval_status", "approved"),
            "is_table":        chunk.get("is_table", False),
            # Content preview for LLM context (truncated to save RAM)
            "content":         chunk["content"][:1000],
        })

    store.save(_INDEX_BASE)
    print(f"[svc07] Index ready: {store.vector_count} vectors across {store.unique_documents} documents")
    return store.vector_count


def search(
    query: str,
    top_k: int = 5,
    knowledge_domain: Optional[str] = None,
    department: Optional[str] = None,
    language: Optional[str] = None,
    role: Optional[str] = None,
) -> list[tuple[float, dict]]:
    q_vec = embedder.embed_one(query)
    return store.search(
        q_vec,
        k=top_k,
        knowledge_domain=knowledge_domain,
        department=department,
        language=language,
        role=role,
    )
