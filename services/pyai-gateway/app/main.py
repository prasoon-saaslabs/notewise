from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load .env before Settings is used by routers
_env = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_env)

from app.config import settings  # noqa: E402
from app.routes import (  # noqa: E402
    auth,
    bots,
    calendar,
    enrollment,
    health,
    live,
    meetings,
    memory,
    notes,
    samples,
    sessions,
    trust,
)
from app.audio_playback import delete_playback  # noqa: E402
from app.meeting_filters import is_test_meeting  # noqa: E402
from app.sandbox import ensure_api_key  # noqa: E402
from app.store.file_store import store  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(title="Notewise PyAI Gateway", version="0.2.0")

# Bearer-token auth only — never use credentialed CORS (breaks wildcard / tauri origins).
if settings.is_desktop_gateway:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*|tauri://.*",
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(calendar.router)
app.include_router(sessions.router)
app.include_router(meetings.router)
app.include_router(enrollment.router)
app.include_router(notes.router)
app.include_router(bots.router)
app.include_router(memory.router)
app.include_router(live.router)
app.include_router(trust.router)
app.include_router(samples.router)


@app.on_event("startup")
async def startup() -> None:
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    settings.margin_dir.mkdir(parents=True, exist_ok=True)
    (settings.data_dir / "playback").mkdir(parents=True, exist_ok=True)

    log = logging.getLogger("pyai")
    if settings.is_desktop_gateway and settings.auth_jwt_secret == "dev-change-me-local-only":
        log.warning(
            "AUTH_JWT_SECRET is unset — set a strong value in gateway.env for production desktop installs"
        )
    if settings.is_desktop_gateway and not settings.google_client_id:
        log.info("Google OAuth not configured — add GOOGLE_CLIENT_ID/SECRET to gateway.env for sign-in")

    purged = 0
    for m in store.list_meetings():
        if is_test_meeting(m):
            store.delete_meeting(m.id)
            delete_playback(m.id)
            purged += 1
    if purged:
        logging.getLogger("pyai").info("purged %s test/sample meetings from library", purged)
    minted = await ensure_api_key()
    logging.getLogger("pyai").info(
        "pyai-gateway ready port=%s data=%s margin=%s key=%s",
        settings.port,
        settings.data_dir,
        settings.margin_dir,
        minted or ("set" if settings.pyai_api_key else "MISSING"),
    )


def run() -> None:
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=int(os.getenv("PYAI_GATEWAY_PORT", settings.port)),
        reload=False,
    )


if __name__ == "__main__":
    run()
