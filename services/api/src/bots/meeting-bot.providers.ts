import { BadRequestException, Logger } from '@nestjs/common';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export type BotStartResult = {
  botId: string;
  status: 'joining' | 'live';
  mode: 'meetingbaas' | 'recall' | 'simulation';
  message?: string;
};

export interface MeetingBotProvider {
  readonly name: string;
  start(meetingUrl: string, meetingId: string): Promise<BotStartResult>;
  stop(botId: string): Promise<void>;
  /** Optional: poll vendor for status / transcript when webhooks aren't reachable. */
  fetchStatus?(botId: string): Promise<{
    status?: string;
    inCall?: boolean;
    waitingRoom?: boolean;
    ended?: boolean;
    transcriptionPending?: boolean;
    transcriptText?: string;
    segments?: Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }>;
    audioRemoteUrl?: string;
    videoRemoteUrl?: string;
  } | null>;
  /** Optional: download call recording into destDir; returns absolute file path. */
  downloadRecording?(botId: string, destDir: string, fileStem: string): Promise<string | null>;
}

export function detectMeetingPlatform(meetingUrl: string): 'google_meet' | 'zoom' | 'teams' | 'unknown' {
  try {
    const host = new URL(meetingUrl).hostname.toLowerCase();
    if (host.includes('meet.google.com') || host === 'meet.google.com') return 'google_meet';
    if (host.includes('zoom.us') || host.includes('zoom.com')) return 'zoom';
    if (host.includes('teams.microsoft.com') || host.includes('teams.live.com')) return 'teams';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function assertSupportedMeetingUrl(meetingUrl: string) {
  const platform = detectMeetingPlatform(meetingUrl);
  if (platform === 'unknown') {
    throw new BadRequestException(
      'Unsupported meeting URL. Use a Google Meet, Zoom, or Microsoft Teams link.',
    );
  }
  return platform;
}

/** Local ERP simulation — streams live turns without joining the real call. */
export class SimulationMeetingBotProvider implements MeetingBotProvider {
  readonly name = 'simulation';

  async start(_meetingUrl: string, meetingId: string): Promise<BotStartResult> {
    return {
      botId: `sim-${meetingId.slice(0, 8)}`,
      status: 'joining',
      mode: 'simulation',
      message:
        'Sandbox bot active (no Meeting BaaS API key). Live notes will stream here; a real Notewise participant will not appear in Meet/Zoom until MEETING_BOT_API_KEY is set.',
    };
  }

  async stop(_botId: string): Promise<void> {
    return;
  }
}

/**
 * Meeting BaaS — production bots for Meet / Zoom / Teams.
 * Defaults to API v2 (`/v2/bots`) — keys starting with `mb-` are v2.
 * Docs: https://docs.meetingbaas.com/api-v2/migration-guide
 */
export class MeetingBaasProvider implements MeetingBotProvider {
  readonly name = 'meetingbaas';
  private readonly logger = new Logger(MeetingBaasProvider.name);
  private readonly version: 'v1' | 'v2';

  constructor(
    private readonly apiKey: string,
    private readonly apiUrl: string,
    private readonly webhookUrl?: string,
    version?: string,
  ) {
    const v = (version || process.env.MEETING_BOT_API_VERSION || 'v2').toLowerCase();
    this.version = v === 'v1' ? 'v1' : 'v2';
  }

  private base() {
    return this.apiUrl.replace(/\/$/, '');
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-meeting-baas-api-key': this.apiKey,
    };
  }

  private createPath() {
    return this.version === 'v2' ? `${this.base()}/v2/bots` : `${this.base()}/bots`;
  }

  private parseCreateResponse(text: string): string {
    const raw = JSON.parse(text) as Record<string, unknown>;
    // v2: { success, data: { bot_id } }
    if (raw && typeof raw === 'object' && raw.data && typeof raw.data === 'object') {
      const data = raw.data as Record<string, unknown>;
      const id = data.bot_id || data.id;
      if (typeof id === 'string' && id) return id;
    }
    const id = raw.bot_id || raw.id;
    if (typeof id === 'string' && id) return id;
    throw new BadRequestException('Meeting bot provider returned no bot id');
  }

  private friendlyAuthError(status: number, body: string): string {
    if (status === 401 || status === 403) {
      return (
        `Meeting BaaS rejected the API key (${status}). ` +
        `Confirm the key at https://meetingbaas.com (Dashboard → API keys), ` +
        `keep MEETING_BOT_API_VERSION=v2 for keys that start with mb-, and restart the API.`
      );
    }
    let detail = '';
    try {
      const j = JSON.parse(body) as { message?: string; error?: string; code?: string };
      detail = [j.message || j.error, j.code].filter(Boolean).join(' · ');
    } catch {
      detail = body.slice(0, 160);
    }
    return `Meeting bot provider rejected join (${status})${detail ? `: ${detail}` : ''}. Check API key and meeting URL.`;
  }

  async start(meetingUrl: string, meetingId: string): Promise<BotStartResult> {
    const body: Record<string, unknown> =
      this.version === 'v2'
        ? {
            meeting_url: meetingUrl,
            bot_name: 'Notewise',
            recording_mode: 'speaker_view',
            entry_message: 'Notewise joined to capture notes for this meeting.',
            transcription_enabled: true,
            transcription_config: { provider: 'gladia' },
            extra: { meetingId, source: 'notewise' },
            automatic_leave: {
              waiting_room_timeout: 600,
              noone_joined_timeout: 600,
            },
          }
        : {
            meeting_url: meetingUrl,
            bot_name: 'Notewise',
            reserved: false,
            recording_mode: 'speaker_view',
            entry_message: 'Notewise joined to capture notes for this meeting.',
            speech_to_text: { provider: 'Default' },
            extra: { meetingId, source: 'notewise' },
            automatic_leave: {
              waiting_room_timeout: 600,
              noone_joined_timeout: 600,
            },
          };

    if (this.webhookUrl) {
      if (this.version === 'v2') {
        body.callback_enabled = true;
        body.callback_config = {
          url: this.webhookUrl,
          method: 'POST',
        };
      } else {
        body.webhook_url = this.webhookUrl;
      }
    }

    const res = await fetch(this.createPath(), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.warn(`MeetingBaas start failed (${this.version}): ${res.status} ${text.slice(0, 240)}`);
      throw new BadRequestException(this.friendlyAuthError(res.status, text));
    }

    let botId: string;
    try {
      botId = this.parseCreateResponse(text);
    } catch {
      throw new BadRequestException('Meeting bot provider returned invalid JSON');
    }

    return {
      botId,
      status: 'joining',
      mode: 'meetingbaas',
      message: this.webhookUrl
        ? 'Notewise bot dispatched via Meeting BaaS. Admit the bot if prompted.'
        : 'Notewise bot dispatched via Meeting BaaS. Polling for live status (webhooks optional). Admit the bot if prompted.',
    };
  }

  async stop(botId: string): Promise<void> {
    const url =
      this.version === 'v2'
        ? `${this.base()}/v2/bots/${encodeURIComponent(botId)}/leave`
        : `${this.base()}/bots/${encodeURIComponent(botId)}`;
    const res = await fetch(url, {
      method: this.version === 'v2' ? 'POST' : 'DELETE',
      headers: this.headers(),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to stop MeetingBaas bot: ${res.status}`);
    }
  }

  async fetchStatus(botId: string) {
    try {
      const url =
        this.version === 'v2'
          ? `${this.base()}/v2/bots/${encodeURIComponent(botId)}`
          : `${this.base()}/bots/meeting_data?bot_id=${encodeURIComponent(botId)}`;
      const res = await fetch(url, {
        headers: this.headers(),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return null;
      const raw = (await res.json()) as Record<string, unknown>;
      const data =
        raw.data && typeof raw.data === 'object'
          ? (raw.data as Record<string, unknown>)
          : raw;

      const status = String(data.status ?? data.bot_status ?? '');
      const ended = /ended|complete|done|failed|call_ended|bot_done|fatal/i.test(status);
      const waitingRoom = /waiting_room|waiting room|in_waiting_room/i.test(status);
      const inCall = /in_call|recording|joined|live|in_meeting|in_waiting_room|waiting_room/i.test(
        status,
      );

      // Lightweight status for transcription readiness (v2).
      let transcriptionPending = false;
      if (this.version === 'v2') {
        try {
          const sRes = await fetch(`${this.base()}/v2/bots/${encodeURIComponent(botId)}/status`, {
            headers: this.headers(),
            signal: AbortSignal.timeout(15_000),
          });
          if (sRes.ok) {
            const sRaw = (await sRes.json()) as Record<string, unknown>;
            const sData =
              sRaw.data && typeof sRaw.data === 'object'
                ? (sRaw.data as Record<string, unknown>)
                : sRaw;
            const txStatus = String(sData.transcription_status ?? '');
            transcriptionPending =
              !!txStatus && !/done|complete|succeeded|success|failed|error/i.test(txStatus);
            if (/not-started|pending|processing|running|in_progress/i.test(txStatus)) {
              transcriptionPending = true;
            }
          }
        } catch {
          /* optional */
        }
      }

      // If call completed but artifact URLs are missing, Gladia is still running.
      const hasArtifact =
        (typeof data.transcription === 'string' && data.transcription.startsWith('http')) ||
        (typeof data.raw_transcription === 'string' &&
          data.raw_transcription.startsWith('http'));
      if (ended && !hasArtifact) transcriptionPending = true;

      let segments = this.extractSegments(data);

      // v2 stores transcription as a presigned S3 URL — download when available.
      if (segments.length === 0 && (ended || hasArtifact)) {
        segments = await this.loadSegmentsFromArtifact(data.transcription);
        if (segments.length === 0) {
          segments = await this.loadSegmentsFromArtifact(data.raw_transcription);
        }
      }

      if (segments.length > 0) transcriptionPending = false;

      // Prefer diarization speaker names when available.
      if (segments.length && typeof data.diarization === 'string' && data.diarization.startsWith('http')) {
        segments = await this.applyDiarizationNames(segments, data.diarization);
      }

      return {
        status,
        inCall,
        waitingRoom,
        ended,
        transcriptionPending,
        transcriptText: segments.map((s) => `${s.speaker || 'Guest'}: ${s.text}`).join('\n'),
        segments,
        audioRemoteUrl:
          typeof data.audio === 'string' && data.audio.startsWith('http') ? data.audio : undefined,
        videoRemoteUrl:
          typeof data.video === 'string' && data.video.startsWith('http') ? data.video : undefined,
      };
    } catch (err) {
      this.logger.warn(`MeetingBaas poll failed: ${(err as Error).message}`);
      return null;
    }
  }

  private extractSegments(
    data: Record<string, unknown>,
  ): Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }> {
    const rawTranscript = data.transcript ?? data.transcription ?? data.transcriptions;
    if (!Array.isArray(rawTranscript)) return [];
    const segments: Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }> = [];
    for (const row of rawTranscript) {
      const item = row as Record<string, unknown>;
      const words = item.words as Array<{ text?: string; word?: string }> | undefined;
      const text =
        String(item.text ?? item.transcript ?? '') ||
        (words
          ? words.map((w) => w.text ?? w.word ?? '').join(' ').trim()
          : '');
      if (!text) continue;
      const start = Number(item.start_time ?? item.start ?? 0);
      const end = Number(item.end_time ?? item.end ?? 0);
      segments.push({
        speaker: String(item.speaker ?? item.speaker_name ?? 'Guest'),
        text,
        startMs: Math.round(start < 1000 && start > 0 ? start * 1000 : start),
        endMs: Math.round(end < 1000 && end > 0 ? end * 1000 : end),
      });
    }
    return segments;
  }

  private async loadSegmentsFromArtifact(
    artifact: unknown,
  ): Promise<Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }>> {
    if (typeof artifact !== 'string' || !artifact.startsWith('http')) return [];
    try {
      const res = await fetch(artifact, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) return [];
      const payload = (await res.json()) as Record<string, unknown>;
      const result = (payload.result as Record<string, unknown> | undefined) ?? payload;
      let utterances =
        (result.utterances as unknown[]) ||
        (payload.utterances as unknown[]) ||
        [];

      // raw_transcription.json shape: { transcriptions: [{ payload: { transcription: { utterances }}}]}
      if ((!utterances || utterances.length === 0) && Array.isArray(payload.transcriptions)) {
        const collected: unknown[] = [];
        for (const t of payload.transcriptions as Array<Record<string, unknown>>) {
          const p = (t.payload as Record<string, unknown> | undefined) ?? t;
          const tx = (p.transcription as Record<string, unknown> | undefined) ?? p;
          const u = tx.utterances;
          if (Array.isArray(u)) collected.push(...u);
        }
        utterances = collected;
      }

      const segments: Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }> =
        [];
      for (const row of utterances) {
        const item = row as Record<string, unknown>;
        const text = String(item.text ?? '').trim();
        if (!text) continue;
        const start = Number(item.start ?? item.start_time ?? 0);
        const end = Number(item.end ?? item.end_time ?? 0);
        segments.push({
          speaker: String(item.speaker ?? item.speaker_name ?? 'Guest'),
          text,
          startMs: Math.round(start * 1000),
          endMs: Math.round(end * 1000),
        });
      }
      return segments;
    } catch (err) {
      this.logger.warn(`Failed to download MeetingBaas transcription: ${(err as Error).message}`);
      return [];
    }
  }

  private async applyDiarizationNames(
    segments: Array<{ speaker?: string; text: string; startMs?: number; endMs?: number }>,
    diarizationUrl: string,
  ) {
    try {
      const res = await fetch(diarizationUrl, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return segments;
      const text = await res.text();
      const rows = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l) as { speaker?: string; start_time?: number; end_time?: number };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{ speaker?: string; start_time?: number; end_time?: number }>;
      if (!rows.length) return segments;

      return segments.map((seg) => {
        const mid = ((seg.startMs ?? 0) + (seg.endMs ?? 0)) / 2000;
        const hit = rows.find(
          (r) => mid >= (r.start_time ?? 0) - 0.25 && mid <= (r.end_time ?? 0) + 0.25,
        );
        if (hit?.speaker) return { ...seg, speaker: hit.speaker };
        return seg;
      });
    } catch {
      return segments;
    }
  }

  async downloadRecording(botId: string, destDir: string, fileStem: string): Promise<string | null> {
    try {
      const url = `${this.base()}/v2/bots/${encodeURIComponent(botId)}`;
      const res = await fetch(url, {
        headers: this.headers(),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return null;
      const raw = (await res.json()) as Record<string, unknown>;
      const data =
        raw.data && typeof raw.data === 'object'
          ? (raw.data as Record<string, unknown>)
          : raw;

      const audioUrl =
        typeof data.audio === 'string' && data.audio.startsWith('http') ? data.audio : null;
      const videoUrl =
        typeof data.video === 'string' && data.video.startsWith('http') ? data.video : null;
      const remote = audioUrl || videoUrl;
      if (!remote) {
        this.logger.warn(`MeetingBaas bot ${botId} has no audio/video artifact yet`);
        return null;
      }

      const ext = audioUrl ? '.flac' : '.mp4';
      fs.mkdirSync(destDir, { recursive: true });
      const dest = path.join(destDir, `${fileStem}${ext}`);
      const media = await fetch(remote, { signal: AbortSignal.timeout(300_000) });
      if (!media.ok) {
        this.logger.warn(`MeetingBaas media download failed: ${media.status}`);
        return null;
      }
      const buf = Buffer.from(await media.arrayBuffer());
      fs.writeFileSync(dest, buf);

      if (ext === '.flac') {
        const ffmpeg = whichBin('ffmpeg');
        if (ffmpeg) {
          const m4a = path.join(destDir, `${fileStem}.m4a`);
          const proc = spawnSync(
            ffmpeg,
            ['-y', '-i', dest, '-c:a', 'aac', '-b:a', '128k', m4a],
            { encoding: 'utf8', timeout: 180_000 },
          );
          if (proc.status === 0 && fs.existsSync(m4a) && fs.statSync(m4a).size > 0) {
            try {
              fs.unlinkSync(dest);
            } catch {
              /* keep flac */
            }
            return m4a;
          }
        }
      }
      return dest;
    } catch (err) {
      this.logger.warn(`MeetingBaas downloadRecording failed: ${(err as Error).message}`);
      return null;
    }
  }
}

function whichBin(bin: string): string | null {
  const probe = spawnSync('which', [bin], { encoding: 'utf8' });
  const out = (probe.stdout || '').trim();
  return probe.status === 0 && out ? out : null;
}

/**
 * Recall.ai-compatible adapter.
 * Requires MEETING_BOT_API_URL + MEETING_BOT_API_KEY.
 */
export class RecallStyleMeetingBotProvider implements MeetingBotProvider {
  readonly name = 'recall';
  private readonly logger = new Logger(RecallStyleMeetingBotProvider.name);

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly webhookUrl?: string,
  ) {}

  async start(meetingUrl: string, meetingId: string): Promise<BotStartResult> {
    const body: Record<string, unknown> = {
      meeting_url: meetingUrl,
      bot_name: 'Notewise',
      metadata: { meetingId },
      transcription_options: { provider: 'default' },
    };
    if (this.webhookUrl) {
      body.real_time_transcription = {
        destination_url: this.webhookUrl,
      };
    }

    const res = await fetch(`${this.apiUrl.replace(/\/$/, '')}/bot`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`Recall start failed: ${res.status} ${text.slice(0, 200)}`);
      throw new BadRequestException(`Recall bot provider error: ${res.status}`);
    }
    const data = (await res.json()) as { id?: string };
    if (!data.id) throw new BadRequestException('Recall returned no bot id');
    return {
      botId: data.id,
      status: 'joining',
      mode: 'recall',
      message: 'Notewise bot dispatched via Recall.ai. Admit the bot if prompted.',
    };
  }

  async stop(botId: string): Promise<void> {
    const res = await fetch(`${this.apiUrl.replace(/\/$/, '')}/bot/${encodeURIComponent(botId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Token ${this.apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to stop Recall bot: ${res.status}`);
    }
  }
}

/** Backward-compatible alias for older MEETING_BOT_PROVIDER=stub configs. */
export class StubMeetingBotProvider implements MeetingBotProvider {
  readonly name = 'stub';
  private readonly inner = new SimulationMeetingBotProvider();

  start(meetingUrl: string, meetingId: string) {
    return this.inner.start(meetingUrl, meetingId);
  }

  stop(botId: string) {
    return this.inner.stop(botId);
  }
}
