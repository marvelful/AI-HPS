"""
SVC-05 Analytics Service — read-only query event and content gap reporting.
Run: uvicorn services.svc05_analytics.main:app --port 8005 --reload
Docs: http://localhost:8005/docs
"""
from fastapi import FastAPI
from services.svc05_analytics.router import router

app = FastAPI(
    title="AI-HPS Analytics",
    version="1.0.0",
    description="Query event tracking and content gap analysis for AI-HPS.",
)

app.include_router(router, prefix="/analytics")


@app.get("/health")
def health():
    return {"status": "ok", "service": "svc-05-analytics", "version": "1.0.0"}
