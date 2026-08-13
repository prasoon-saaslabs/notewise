from app.config import settings
from app.providers.adapters import (
    FasterWhisperSTTProvider,
    OllamaLLMProvider,
    OpenAILLMProvider,
    PyannoteDiarizationProvider,
    StubDiarizationProvider,
    StubEmbeddingProvider,
    StubLLMProvider,
    StubSTTProvider,
    WeSpeakerEmbeddingProvider,
    WhisperCliSTTProvider,
)
from app.providers.base import (
    DiarizationProvider,
    EmbeddingProvider,
    LLMProvider,
    STTProvider,
)


class ProviderRegistry:
    def __init__(self) -> None:
        self.stt = self._stt(settings.stt_provider)
        self.diarization = self._diar(settings.diarization_provider)
        self.embedding = self._embed(settings.embedding_provider)
        self.llm = self._llm(settings.llm_provider)

    def describe(self) -> dict[str, str]:
        return {
            "stt": self.stt.name,
            "diarization": self.diarization.name,
            "embedding": self.embedding.name,
            "llm": self.llm.name,
        }

    def _stt(self, name: str) -> STTProvider:
        key = (name or "whisper_cli").lower()
        if key in ("whisper_cli", "whisper", "openai_whisper"):
            return WhisperCliSTTProvider()
        if key == "faster_whisper":
            return FasterWhisperSTTProvider()
        if key == "stub":
            return StubSTTProvider()
        return WhisperCliSTTProvider()

    def _diar(self, name: str) -> DiarizationProvider:
        if (name or "").lower() == "pyannote":
            return PyannoteDiarizationProvider()
        return StubDiarizationProvider()

    def _embed(self, name: str) -> EmbeddingProvider:
        key = (name or "mfcc").lower()
        if key in ("wespeaker", "mfcc", "stub"):
            return StubEmbeddingProvider() if key != "wespeaker" else WeSpeakerEmbeddingProvider()
        return StubEmbeddingProvider()

    def _llm(self, name: str) -> LLMProvider:
        key = (name or "ollama").lower()
        if key == "openai":
            return OpenAILLMProvider()
        if key == "stub":
            return StubLLMProvider()
        return OllamaLLMProvider()
