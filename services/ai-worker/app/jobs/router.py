from __future__ import annotations

import shutil
from typing import Any, List, Optional

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from app.audio_util import to_wav
from app.providers.voiceprint import label_segments_against_you, load_embedding

router = APIRouter(prefix="/jobs")


class AudioJob(BaseModel):
    audio_path: str = Field(..., min_length=1, max_length=1024)
    you_embedding_path: Optional[str] = Field(default=None, max_length=1024)
    fast: bool = False


class SummarizeJob(BaseModel):
    transcript: str = Field(..., min_length=0, max_length=500_000)


class LabelJob(BaseModel):
    audio_path: str = Field(..., min_length=1, max_length=1024)
    you_embedding_path: Optional[str] = None
    segments: List[dict] = Field(default_factory=list)


@router.post("/transcribe")
def transcribe(job: AudioJob, request: Request):
    segments = request.app.state.registry.stt.transcribe(job.audio_path, fast=job.fast)
    if job.you_embedding_path:
        wav, tmp = to_wav(job.audio_path)
        try:
            you = load_embedding(job.you_embedding_path)
            segments = label_segments_against_you(segments, wav, you)
        finally:
            if tmp:
                shutil.rmtree(tmp, ignore_errors=True)
    return {"segments": segments}


@router.post("/diarize")
def diarize(job: AudioJob, request: Request):
    turns = request.app.state.registry.diarization.diarize(job.audio_path)
    return {"turns": turns}


@router.post("/enroll")
def enroll(job: AudioJob, request: Request):
    vector = request.app.state.registry.embedding.embed(job.audio_path)
    return {"ok": True, "dims": len(vector), "vector": vector}


@router.post("/label")
def label_speakers(job: LabelJob):
    wav, tmp = to_wav(job.audio_path)
    try:
        you = load_embedding(job.you_embedding_path)
        labeled = label_segments_against_you(job.segments, wav, you)
        return {"segments": labeled}
    finally:
        if tmp:
            shutil.rmtree(tmp, ignore_errors=True)


@router.post("/summarize")
def summarize(job: SummarizeJob, request: Request):
    notes = request.app.state.registry.llm.complete(
        [
            {
                "role": "user",
                "content": f"TRANSCRIPT:\n{job.transcript}",
            }
        ]
    )
    return notes
