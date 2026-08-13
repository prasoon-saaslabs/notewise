from __future__ import annotations

from fastapi import APIRouter

from app.config import settings
from app.pyai.client import PyAIError, require_api_key
from app.store.file_store import store

router = APIRouter(tags=["health"])

_PROVIDERS = {
    "stt": "pyai-hear",
    "llm": "pyai-recap",
    "tts": "pyai-cast",
    "clone": "pyai-clone",
    "trace": "pyai-trace",
    "diarization": "pyai-hear-batch",
    "meetingBot": "disabled",
    "backend": "pyai-gateway",
}


@router.get("/health")
async def health():
    try:
        require_api_key()
        status = "ok"
        detail = "pyai"
    except PyAIError:
        status = "degraded"
        detail = "missing_pyai_api_key"
    return {
        "status": status,
        "api": "pyai-gateway",
        "worker": detail,
        "providers": _PROVIDERS,
        "marginDir": str(settings.margin_dir),
        "dbPath": store.db_path(),
    }


@router.get("/providers")
async def providers():
    return _PROVIDERS
