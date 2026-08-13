import { Injectable, Logger } from '@nestjs/common';

export type TranscribeResult = {
  segments: Array<{
    text: string;
    startMs: number;
    endMs: number;
    speaker?: string;
    kind?: string;
  }>;
};

export type SummarizeResult = {
  title?: string;
  executiveSummary?: string;
  takeaways?: string[];
  actions?: Array<{ text: string; owner?: string; priority?: 'high' | 'med' | 'low' }>;
  openQuestions?: string[];
  risks?: string[];
};

export type EnrollResult = {
  ok: boolean;
  dims: number;
  vector?: number[];
};

@Injectable()
export class WorkerClient {
  private readonly logger = new Logger(WorkerClient.name);
  private readonly baseUrl = (process.env.AI_WORKER_URL ?? 'http://localhost:8001').replace(
    /\/$/,
    '',
  );

  async health(): Promise<'ok' | 'down'> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok ? 'ok' : 'down';
    } catch {
      return 'down';
    }
  }

  async transcribe(audioPath: string, youEmbeddingPath?: string, fast = false): Promise<TranscribeResult> {
    return this.post('/jobs/transcribe', {
      audio_path: audioPath,
      you_embedding_path: youEmbeddingPath ?? null,
      fast,
    });
  }

  async diarize(audioPath: string) {
    return this.post('/jobs/diarize', { audio_path: audioPath });
  }

  async enroll(audioPath: string): Promise<EnrollResult> {
    return this.post('/jobs/enroll', { audio_path: audioPath });
  }

  async label(
    audioPath: string,
    segments: TranscribeResult['segments'],
    youEmbeddingPath?: string,
  ): Promise<TranscribeResult> {
    return this.post('/jobs/label', {
      audio_path: audioPath,
      segments,
      you_embedding_path: youEmbeddingPath ?? null,
    });
  }

  async summarize(transcript: string): Promise<SummarizeResult> {
    return this.post('/jobs/summarize', { transcript });
  }

  private async post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Worker ${path} failed: ${res.status}`);
      throw new Error(`AI worker error ${res.status}: ${text.slice(0, 200)}`);
    }
    return (await res.json()) as T;
  }
}
