from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from shared.config import get_settings
from services.svc07_kb_sync import service as kb, subscriber
from services.svc07_kb_sync.router import router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    kb.load_index()           # load existing index from disk
    subscriber.start()        # start Redis Pub/Sub listener thread
    yield
    subscriber.stop()


app = FastAPI(
    title="AI-HPS — KB Sync (SVC-07)",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
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
    status = kb.get_status()
    return {
        "status": "ok",
        "service": "svc07-kb-sync",
        "version": settings.APP_VERSION,
        "vectors": status["vector_count"],
        "embedder": status["embedder"],
    }
