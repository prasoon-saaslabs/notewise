from __future__ import annotations

import logging
import os

import httpx

from app.config import settings

log = logging.getLogger("sandbox")


async def ensure_api_key() -> str | None:
    """Mint a sandbox key if PYAI_API_KEY is empty. Never logs or returns the key."""
    if settings.pyai_api_key:
        return "set"
    mint_path = (os.getenv("PYAI_SANDBOX_MINT_PATH") or "/sandbox/keys").strip()
    url = f"{settings.pyai_base_url}{mint_path if mint_path.startswith('/') else '/' + mint_path}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(url, json={"product": "opengranola"})
        if res.status_code >= 400:
            log.warning("sandbox mint skipped: HTTP %s", res.status_code)
            return None
        result = res.json() if res.content else {}
    except Exception as e:
        log.warning("sandbox mint skipped: %s", e)
        return None
    key = None
    if isinstance(result, dict):
        key = result.get("key") or result.get("api_key") or result.get("token")
    if not key or not isinstance(key, str):
        return None
    settings.pyai_api_key = key.strip()
    env_path = Path_env()
    try:
        existing = env_path.read_text(encoding="utf-8") if env_path.exists() else ""
        if "PYAI_API_KEY=" not in existing:
            env_path.parent.mkdir(parents=True, exist_ok=True)
            with env_path.open("a", encoding="utf-8") as f:
                f.write(f"\nPYAI_API_KEY={settings.pyai_api_key}\n")
    except Exception as e:
        log.warning("could not persist minted key to .env: %s", e)
    return "minted"


def Path_env():
    from pathlib import Path

    return Path(__file__).resolve().parents[1] / ".env"
