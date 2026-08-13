from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional


class STTProvider(ABC):
    name: str

    @abstractmethod
    def transcribe(self, audio_path: str, *, fast: bool = False) -> list[dict[str, Any]]:
        """Return segments: {text, startMs, endMs, speaker?}"""


class DiarizationProvider(ABC):
    name: str

    @abstractmethod
    def diarize(self, audio_path: str) -> list[dict[str, Any]]:
        """Return turns: {speaker, startMs, endMs}"""


class EmbeddingProvider(ABC):
    name: str

    @abstractmethod
    def embed(self, audio_path: str) -> list[float]:
        """Return speaker embedding vector."""


class LLMProvider(ABC):
    name: str

    @abstractmethod
    def complete(
        self,
        messages: list[dict[str, str]],
        schema: Optional[dict] = None,
    ) -> dict[str, Any]:
        """Return structured notes JSON."""
