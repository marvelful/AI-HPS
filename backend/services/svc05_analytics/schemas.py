from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class QueryEventResponse(BaseModel):
    id: str
    session_id: Optional[str]
    user_id: Optional[str]
    query: str
    intent: Optional[str]
    agent: Optional[str]
    had_result: Optional[bool]
    response_time_ms: Optional[int]
    platform: Optional[str]
    stream: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class QueryEventListResponse(BaseModel):
    items: list[QueryEventResponse]
    total: int
    skip: int
    limit: int


class ContentGapResponse(BaseModel):
    id: str
    query: str
    occurrence_count: int
    first_seen: datetime
    last_seen: datetime

    model_config = {"from_attributes": True}


class ContentGapListResponse(BaseModel):
    items: list[ContentGapResponse]
    total: int


class AnalyticsSummary(BaseModel):
    total_queries: int
    successful_queries: int
    success_rate_pct: float
    avg_response_ms: Optional[float]
    top_intents: dict[str, int]
    top_platforms: dict[str, int]
    content_gap_count: int
    unique_unanswered_queries: int
