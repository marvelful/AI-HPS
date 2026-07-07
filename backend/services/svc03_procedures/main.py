from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from services.svc03_procedures.router import router

settings = get_settings()

app = FastAPI(
    title="AI-HPS — Procedure Management (SVC-03)",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "svc03-procedures", "version": settings.APP_VERSION}
