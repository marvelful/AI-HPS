from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from services.svc02_auth.router import router

settings = get_settings()

app = FastAPI(
    title="AI-HPS — Auth & RBAC Service (SVC-02)",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
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
    return {"status": "ok", "service": "svc02-auth", "version": settings.APP_VERSION}
