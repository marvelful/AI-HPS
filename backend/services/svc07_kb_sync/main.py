from fastapi import FastAPI

from services.svc07_kb_sync.router import router

app = FastAPI(title="AI-HPS KB Sync Service", version="1.0.0")


@app.get("/health")
def health():
    return {"status": "ok", "service": "svc07-kb-sync", "version": "1.0.0"}


app.include_router(router)
