import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    port: int = int(os.getenv("AI_WORKER_PORT", "8001"))
    stt_provider: str = os.getenv("STT_PROVIDER", "whisper_cli")
    diarization_provider: str = os.getenv("DIARIZATION_PROVIDER", "stub")
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "stub")
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    whisper_model: str = os.getenv("WHISPER_MODEL", "base")
    # Fast path for live partials while recording.
    whisper_live_model: str = os.getenv("WHISPER_LIVE_MODEL", "tiny.en")
    hf_token: str = os.getenv("HF_TOKEN", "")


settings = Settings()
