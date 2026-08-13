from __future__ import annotations

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.store.file_store import store

router = APIRouter(prefix="/enrollment", tags=["enrollment"])


@router.get("")
async def get_enrollment():
    e = store.get_enrollment()
    return {
        "enrolled": e.enrolled,
        "samples": e.samples,
        "updatedAt": e.updatedAt,
        "hasVoiceprint": False,  # PyAI has no voiceprint; check-in bind instead
        "consentAccepted": e.consentAccepted,
        "consentAt": e.consentAt,
    }


@router.post("/samples")
async def enroll_sample(file: UploadFile = File(...)):
    """Count an enrollment sample for UX. Audio is not stored (PRD: no audio at rest)."""
    data = await file.read()
    _ = data
    e = store.get_enrollment()
    updated = store.set_enrollment(
        enrolled=True,
        samples=e.samples + 1,
        hasVoiceprint=False,
        samplePath=None,
    )
    return {
        "enrolled": updated.enrolled,
        "samples": updated.samples,
        "updatedAt": updated.updatedAt,
        "hasVoiceprint": False,
    }


@router.delete("")
async def clear_enrollment():
    store.clear_enrollment()
    return {"enrolled": False, "samples": 0, "hasVoiceprint": False}


class ConsentBody(BaseModel):
    accepted: bool = True


@router.post("/consent")
async def accept_consent(body: ConsentBody | None = None):
    from datetime import datetime, timezone

    accepted = True if body is None else body.accepted
    updated = store.set_enrollment(
        consentAccepted=accepted,
        consentAt=datetime.now(timezone.utc).isoformat() if accepted else None,
    )
    return {"consentAccepted": updated.consentAccepted, "consentAt": updated.consentAt}
