from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from app.config import settings


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64url_decode(data: str) -> bytes:
    pad = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_access_token(user_id: str, *, extra: dict[str, Any] | None = None) -> str:
    ttl = max(1, settings.auth_jwt_ttl_days) * 86_400
    payload: dict[str, Any] = {
        "sub": user_id,
        "exp": int(time.time()) + ttl,
        "iat": int(time.time()),
    }
    if extra:
        payload.update(extra)
    body = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(
        settings.auth_jwt_secret.encode(),
        body.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{body}.{sig}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        body, sig = token.rsplit(".", 1)
        expected = hmac.new(
            settings.auth_jwt_secret.encode(),
            body.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return None
        payload = json.loads(_b64url_decode(body))
        if int(payload.get("exp") or 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None
