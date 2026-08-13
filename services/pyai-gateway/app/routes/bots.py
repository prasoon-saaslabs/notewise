from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/bots", tags=["bots"])


class JoinBody(BaseModel):
    meetingUrl: str
    title: str | None = None


@router.post("/join")
async def join(_body: JoinBody):
    """Bot join stays on Nest/Meeting BaaS. PyAI gateway is notes/STT only."""
    raise HTTPException(
        501,
        "Meeting bot join is not available on the PyAI gateway. "
        "Point VITE_API_URL at the Nest API (:3001) for bot join, "
        "or re-run Path B+D on a downloaded recording here.",
    )


@router.post("/{meeting_id}/stop")
async def stop(meeting_id: str):
    raise HTTPException(501, "Bot stop not available on pyai-gateway")


@router.post("/{meeting_id}/sync")
async def sync(meeting_id: str):
    raise HTTPException(501, "Bot sync not available on pyai-gateway")
