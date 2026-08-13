import { Injectable } from '@nestjs/common';

/** Registry of active provider names (env-driven). Adapters live in ai-worker. */
@Injectable()
export class ProvidersService {
  list(): Record<string, string> {
    return {
      stt: process.env.STT_PROVIDER ?? 'faster_whisper',
      diarization: process.env.DIARIZATION_PROVIDER ?? 'pyannote',
      llm: process.env.LLM_PROVIDER ?? 'ollama',
      embedding: process.env.EMBEDDING_PROVIDER ?? 'wespeaker',
      meetingBot: process.env.MEETING_BOT_PROVIDER ?? 'auto',
    };
  }
}
