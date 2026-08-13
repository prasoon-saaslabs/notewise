from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.jobs.router import router as jobs_router
from app.providers.registry import ProviderRegistry


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm live Whisper daemon so first spoken words aren't waiting on model load.
    try:
        from app.providers.adapters import _ensure_live_daemon

        _ensure_live_daemon()
    except Exception:  # noqa: BLE001
        pass
    yield


app = FastAPI(title="Notewise AI Worker", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

registry = ProviderRegistry()
app.state.registry = registry

app.include_router(jobs_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "providers": registry.describe(),
    }
