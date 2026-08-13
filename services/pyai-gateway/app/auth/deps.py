from __future__ import annotations

from fastapi import Header, HTTPException

from app.auth.jwt_tokens import decode_access_token
from app.store.file_store import store
from app.store.models import User


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def get_optional_user(authorization: str | None = Header(default=None)) -> User | None:
    token = _bearer_token(authorization)
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = str(payload.get("sub") or "")
    if not user_id:
        return None
    return store.get_user(user_id)


def require_user(authorization: str | None = Header(default=None)) -> User:
    user = get_optional_user(authorization)
    if not user:
        raise HTTPException(401, "Authentication required")
    return user
