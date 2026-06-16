from datetime import datetime
from pydantic import BaseModel


class KBStatusResponse(BaseModel):
    vector_count: int
    unique_procedures: int
    last_sync_at: str | None
    embedder: str
    index_path: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    stream_target: str | None = None   # "A", "B", or None (no filter)
    language: str | None = None


class SearchHit(BaseModel):
    entry_id: str
    chunk_index: int
    score: float
    title: str
    chunk_preview: str
    stream_target: str
    applicable_roles: list[str]
    risk_level: str
    language: str
    department_id: str | None


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]
    total_vectors_searched: int
