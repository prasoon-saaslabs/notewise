from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.auth.deps import get_optional_user, require_user
from app.auth.jwt_tokens import create_access_token
from app.calendar.google import (
    exchange_code,
    fetch_userinfo,
    google_auth_url,
    google_configured,
    sync_user_calendar,
)
from app.config import settings
from app.store.file_store import store
from app.store.models import User

router = APIRouter(prefix="/auth", tags=["auth"])

_oauth_states: dict[str, str] = {}


class GuestBody(BaseModel):
    name: str = Field(default="Guest", min_length=1, max_length=80)


def _public_user(user: User) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "provider": user.provider,
        "picture": user.picture,
        "calendarConnected": user.calendarConnected,
        "createdAt": user.createdAt,
    }


@router.get("/providers")
def auth_providers():
    return {
        "google": {"enabled": google_configured(), "scopes": settings.google_scopes.split()},
        "microsoft": {"enabled": False, "reason": "coming_soon"},
        "guest": {"enabled": True},
    }


@router.get("/me")
def auth_me(user: User | None = Depends(get_optional_user)):
    if not user:
        return {"authenticated": False, "user": None}
    return {"authenticated": True, "user": _public_user(user)}


@router.post("/guest")
def auth_guest(body: GuestBody):
    user = store.create_guest_user(body.name)
    token = create_access_token(user.id, extra={"provider": "guest"})
    return {"token": token, "user": _public_user(user)}


@router.get("/google/url")
def google_url(user: User | None = Depends(get_optional_user)):
    if not google_configured():
        raise HTTPException(503, "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")
    state = secrets.token_urlsafe(24)
    _oauth_states[state] = user.id if user else ""
    return {"url": google_auth_url(state=state)}


@router.get("/google/callback")
async def google_callback(code: str = Query(...), state: str = Query(...)):
    if not google_configured():
        raise HTTPException(503, "Google OAuth not configured")
    expected = _oauth_states.pop(state, None)
    if expected is None:
        raise HTTPException(400, "Invalid OAuth state")
    try:
        tokens = await exchange_code(code)
        access = tokens.get("access_token")
        refresh = tokens.get("refresh_token")
        if not access:
            raise HTTPException(400, "No access token from Google")
        profile = await fetch_userinfo(access)
        email = str(profile.get("email") or "")
        name = str(profile.get("name") or email.split("@")[0] or "Google user")
        picture = profile.get("picture")
        user = store.get_user_by_email(email) if email else None
        if not user and expected:
            user = store.get_user(expected)
        if not user:
            from uuid import uuid4

            user = User(
                id=str(uuid4()),
                email=email or None,
                name=name,
                provider="google",
                picture=picture,
                createdAt=datetime.now(timezone.utc).isoformat(),
                calendarConnected=True,
            )
        else:
            user = user.model_copy(
                update={
                    "email": email or user.email,
                    "name": name or user.name,
                    "picture": picture or user.picture,
                    "provider": "google",
                    "calendarConnected": True,
                }
            )
        store.put_user(user)
        if refresh:
            store.set_google_refresh_token(user.id, refresh)
        try:
            await sync_user_calendar(user)
        except Exception:
            pass
        token = create_access_token(user.id, extra={"provider": "google"})
        return RedirectResponse(f"{settings.web_app_url}/auth/callback?token={token}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Google sign-in failed: {e}") from e


@router.post("/logout")
def auth_logout(_user: User = Depends(require_user)):
    return {"ok": True}


@router.get("/microsoft/url")
def microsoft_url():
    raise HTTPException(503, "Microsoft sign-in is coming soon")
