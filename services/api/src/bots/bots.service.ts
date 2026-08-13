import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DataStore, MeetingRecord, TranscriptTurn } from '../store/data.store';
import { WorkerClient } from '../common/worker.client';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { MeetingBotRegistry } from './meeting-bot.registry';
import { assertSupportedMeetingUrl } from './meeting-bot.providers';

type SimLine = {
  delayMs: number;
  speaker: string;
  kind: 'you' | 'other' | 'guest';
  text: string;
};

const SIM_SCRIPT: SimLine[] = [
  {
    delayMs: 1200,
    speaker: 'Notewise',
    kind: 'guest',
    text: 'Notewise joined the lobby and is waiting to be admitted.',
  },
  {
    delayMs: 2200,
    speaker: 'Host',
    kind: 'you',
    text: 'Thanks everyone — let’s kick off the weekly delivery review.',
  },
  {
    delayMs: 2800,
    speaker: 'Alex',
    kind: 'other',
    text: 'Sprint board looks green. Two stories slipped from checkout into QA.',
  },
  {
    delayMs: 2600,
    speaker: 'Host',
    kind: 'you',
    text: 'Can we lock a ship date for the customer portal release?',
  },
  {
    delayMs: 3000,
    speaker: 'Jordan',
    kind: 'other',
    text: 'If QA signs off tomorrow, we can release Thursday after the freeze window.',
  },
  {
    delayMs: 2500,
    speaker: 'Alex',
    kind: 'other',
    text: 'I’ll own the regression pack and update the status channel by EOD.',
  },
  {
    delayMs: 2700,
    speaker: 'Host',
    kind: 'you',
    text: 'Action: Jordan drafts the release notes; Alex runs regression; Host notifies CS.',
  },
  {
    delayMs: 2400,
    speaker: 'Jordan',
    kind: 'other',
    text: 'Risks: payment webhook edge case and the legacy SSO timeout. I’ll flag both.',
  },
  {
    delayMs: 2200,
    speaker: 'Host',
    kind: 'you',
    text: 'Great. We’ll reconvene Thursday 10:00 if blockers appear. Thanks all.',
  },
];

@Injectable()
export class BotsService implements OnModuleInit {
  private readonly logger = new Logger(BotsService.name);
  private readonly simTimers = new Map<string, NodeJS.Timeout[]>();
  private readonly pollTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly store: DataStore,
    private readonly bots: MeetingBotRegistry,
    private readonly worker: WorkerClient,
  ) {}

  onModuleInit() {
    // Resume vendor polling after API restarts; recover finished bots with missing notes/audio.
    for (const m of this.store.listMeetings()) {
      if (m.source !== 'bot' || !m.botId) continue;
      if (m.botProvider === 'simulation') continue;
      if (m.status === 'bot_joining' || m.status === 'bot_live' || m.status === 'processing') {
        this.startVendorPolling(m.id, m.botId);
      } else if (
        (m.status === 'failed' || m.status === 'ready') &&
        (!m.transcript?.length || !m.notes || !m.audioPath)
      ) {
        void this.recoverFromProvider(m.id);
      }
    }
  }

  /** Pull latest transcript/notes from Meeting BaaS for an existing bot meeting. */
  async sync(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting?.botId) throw new NotFoundException('Bot meeting not found');
    await this.recoverFromProvider(meetingId);
    return this.store.getMeeting(meetingId);
  }

  async join(dto: JoinMeetingDto) {
    const meetingUrl = dto.meetingUrl.trim();
    const platform = assertSupportedMeetingUrl(meetingUrl);
    const meetingId = randomUUID();
    const createdAt = new Date().toISOString();
    const title =
      dto.title?.trim() ||
      `${platform === 'google_meet' ? 'Google Meet' : platform === 'zoom' ? 'Zoom' : 'Teams'} · ${new Date().toLocaleString()}`;

    const provider = this.bots.get();
    const start = await provider.start(meetingUrl, meetingId);

    const meeting = this.store.saveMeeting({
      id: meetingId,
      title,
      status: 'bot_joining',
      source: 'bot',
      backend: 'nest',
      createdAt,
      transcript: [],
      notes: null,
      botId: start.botId,
      meetingUrl,
      botProvider: start.mode,
      botMessage: start.message,
      platform,
    });

    if (start.mode === 'simulation' || provider.name === 'simulation' || provider.name === 'stub') {
      this.runSimulation(meetingId);
    } else {
      this.startVendorPolling(meetingId, start.botId);
    }

    return {
      meetingId: meeting.id,
      botId: start.botId,
      status: meeting.status,
      mode: start.mode,
      message: start.message,
      platform,
    };
  }

  async stop(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');

    this.clearSimulation(meetingId);
    this.clearPoll(meetingId);

    if (meeting.botId) {
      try {
        await this.bots.get().stop(meeting.botId);
      } catch (err) {
        this.logger.warn(`Stop bot failed: ${(err as Error).message}`);
      }
    }

    if (meeting.status === 'ready' || meeting.status === 'failed') {
      return { status: meeting.status };
    }

    meeting.status = 'processing';
    meeting.botMessage = 'Bot left the call — generating notes…';
    this.store.saveMeeting(meeting);
    void this.finalizeFromTranscript(meetingId);
    return { status: meeting.status };
  }

  async handleWebhook(provider: string, secret: string | undefined, body: unknown, apiKeyHeader?: string) {
    const expected = process.env.MEETING_BOT_WEBHOOK_SECRET;
    const baasKey = process.env.MEETING_BOT_API_KEY;

    if (provider === 'meetingbaas' && baasKey) {
      // Meeting BaaS sends x-meeting-baas-api-key
      if (apiKeyHeader && apiKeyHeader !== baasKey) {
        throw new UnauthorizedException('Invalid Meeting BaaS webhook key');
      }
    } else if (expected) {
      if (!secret || secret !== expected) {
        throw new UnauthorizedException('Invalid webhook secret');
      }
    } else if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    this.logger.log(`Webhook from ${provider}`);
    const payload = (body ?? {}) as Record<string, unknown>;
    const event = String(payload.event ?? payload.type ?? '');

    if (provider === 'meetingbaas') {
      await this.handleMeetingBaasWebhook(event, payload);
      return { ok: true };
    }

    // Generic / Recall-shaped
    const meetingId =
      (payload.meetingId as string | undefined) ||
      ((payload.metadata as { meetingId?: string } | undefined)?.meetingId);

    if (meetingId && /transcript|complete|done/i.test(event)) {
      const transcript =
        (payload.transcript as string | undefined) ||
        this.extractTranscriptText(payload);
      if (transcript) {
        const meeting = this.store.getMeeting(meetingId);
        if (meeting) {
          this.applyTextTranscript(meeting, transcript);
          meeting.status = 'processing';
          this.store.saveMeeting(meeting);
          await this.finalizeFromTranscript(meetingId);
        }
      }
    }

    if (meetingId && /join|in_call|recording|live/i.test(event)) {
      const meeting = this.store.getMeeting(meetingId);
      if (meeting && meeting.status === 'bot_joining') {
        meeting.status = 'bot_live';
        meeting.botMessage = 'Bot is in the call — capturing…';
        this.store.saveMeeting(meeting);
      }
    }

    return { ok: true };
  }

  private async handleMeetingBaasWebhook(event: string, payload: Record<string, unknown>) {
    const data = (payload.data as Record<string, unknown> | undefined) ?? payload;
    const botId = String(data.bot_id ?? data.botId ?? payload.bot_id ?? '');
    const meeting = botId
      ? this.store.listMeetings().find((m) => m.botId === botId)
      : undefined;
    if (!meeting) {
      this.logger.warn(`Webhook for unknown bot ${botId || '(none)'}`);
      return;
    }

    if (/status_change|bot\.status/i.test(event)) {
      const status = String(data.status ?? data.code ?? '');
      if (/in_call|recording|joined/i.test(status)) {
        meeting.status = 'bot_live';
        meeting.botMessage = `Bot status: ${status || 'in call'}`;
        this.store.saveMeeting(meeting);
      } else if (/joining|waiting/i.test(status)) {
        meeting.status = 'bot_joining';
        meeting.botMessage = `Bot status: ${status}`;
        this.store.saveMeeting(meeting);
      }
      return;
    }

    if (/complete|transcription_complete/i.test(event)) {
      this.clearPoll(meeting.id);
      const segments = this.normalizeBaasSegments(data);
      if (segments.length) {
        meeting.transcript = segments;
      } else {
        const text = this.extractTranscriptText(data);
        if (text) this.applyTextTranscript(meeting, text);
      }
      meeting.status = 'processing';
      meeting.botMessage = 'Call ended — generating ERP notes…';
      this.store.saveMeeting(meeting);
      await this.finalizeFromTranscript(meeting.id);
    }

    if (/failed/i.test(event)) {
      meeting.status = 'failed';
      meeting.botMessage = String(data.error ?? data.message ?? 'Bot failed to join or record');
      this.store.saveMeeting(meeting);
      this.clearPoll(meeting.id);
    }
  }

  private startVendorPolling(meetingId: string, botId: string) {
    const provider = this.bots.get();
    if (!provider.fetchStatus) return;

    let ticks = 0;
    const timer = setInterval(() => {
      void (async () => {
        ticks += 1;
        if (ticks > 180) {
          this.clearPoll(meetingId);
          return;
        }
        const meeting = this.store.getMeeting(meetingId);
        if (!meeting || meeting.status === 'ready' || meeting.status === 'failed') {
          this.clearPoll(meetingId);
          return;
        }
        const snap = await provider.fetchStatus?.(botId);
        if (!snap) return;

        if (snap.inCall && meeting.status === 'bot_joining') {
          meeting.status = 'bot_live';
          meeting.botMessage = snap.waitingRoom
            ? 'Notewise is in the Google Meet waiting room — admit the bot (People → waiting).'
            : 'Bot is in the call — capturing. Transcript finalizes when the call ends.';
          this.store.saveMeeting(meeting);
        } else if (snap.waitingRoom) {
          meeting.status = 'bot_live';
          meeting.botMessage =
            'Notewise is in the Google Meet waiting room — admit the bot (People → waiting).';
          this.store.saveMeeting(meeting);
        } else if (snap.inCall && !snap.waitingRoom && meeting.status === 'bot_live') {
          if (
            meeting.botMessage?.includes('waiting room') ||
            meeting.botMessage?.includes('dispatched')
          ) {
            meeting.botMessage =
              'Bot is in the call — capturing. Transcript finalizes when the call ends.';
            this.store.saveMeeting(meeting);
          }
        }

        if (snap.segments?.length) {
          meeting.transcript = snap.segments.map((s, i) => ({
            id: `${meetingId}-p-${i}`,
            speaker: s.speaker || 'Guest',
            kind:
              (s.speaker || '').toLowerCase() === 'you' ||
              (s.speaker || '').toLowerCase() === 'host'
                ? 'you'
                : 'other',
            text: s.text,
            startMs: s.startMs ?? i * 1000,
            endMs: s.endMs ?? i * 1000 + 800,
          }));
          meeting.snippet = meeting.transcript.at(-1)?.text?.slice(0, 120);
          if (!snap.ended) meeting.status = 'bot_live';
          this.store.saveMeeting(meeting);
        }

        if (snap.ended) {
          if (snap.transcriptionPending && !snap.segments?.length && !snap.transcriptText) {
            meeting.status = 'processing';
            meeting.botMessage = 'Call ended — waiting for Meeting BaaS transcription…';
            this.store.saveMeeting(meeting);
            return;
          }
          this.clearPoll(meetingId);
          if (snap.segments?.length) {
            meeting.transcript = snap.segments.map((s, i) => ({
              id: `${meetingId}-p-${i}`,
              speaker: s.speaker || 'Guest',
              kind: 'other' as const,
              text: s.text,
              startMs: s.startMs ?? i * 1000,
              endMs: s.endMs ?? i * 1000 + 800,
            }));
          } else if (snap.transcriptText && meeting.transcript.length === 0) {
            this.applyTextTranscript(meeting, snap.transcriptText);
          }
          meeting.status = 'processing';
          meeting.botMessage = 'Call ended — generating notes…';
          this.store.saveMeeting(meeting);
          await this.finalizeFromTranscript(meetingId);
        }
      })();
    }, 4000);
    this.pollTimers.set(meetingId, timer);
    // Immediate first poll
    void this.pollOnce(meetingId, botId);
  }

  private async pollOnce(meetingId: string, botId: string) {
    const provider = this.bots.get();
    if (!provider.fetchStatus) return;
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting || meeting.status === 'ready') return;
    // Allow recovery even when previously marked failed.
    const snap = await provider.fetchStatus(botId);
    if (!snap) return;

    if (snap.waitingRoom) {
      meeting.status = 'bot_live';
      meeting.botMessage =
        'Notewise is in the Google Meet waiting room — admit the bot (People → waiting).';
      this.store.saveMeeting(meeting);
    } else if (snap.inCall && !snap.ended) {
      meeting.status = 'bot_live';
      meeting.botMessage =
        'Bot is in the call — capturing. Transcript finalizes when the call ends.';
      this.store.saveMeeting(meeting);
    }

    if (snap.segments?.length) {
      meeting.transcript = snap.segments.map((s, i) => ({
        id: `${meetingId}-p-${i}`,
        speaker: s.speaker || 'Guest',
        kind: 'other' as const,
        text: s.text,
        startMs: s.startMs ?? i * 1000,
        endMs: s.endMs ?? i * 1000 + 800,
      }));
      this.store.saveMeeting(meeting);
    }

    if (snap.ended) {
      if (snap.transcriptionPending && !snap.segments?.length && !snap.transcriptText) {
        meeting.status = 'processing';
        meeting.botMessage = 'Call ended — waiting for Meeting BaaS transcription…';
        this.store.saveMeeting(meeting);
        this.startVendorPolling(meetingId, botId);
        return;
      }
      this.clearPoll(meetingId);
      if (snap.segments?.length) {
        meeting.transcript = snap.segments.map((s, i) => ({
          id: `${meetingId}-p-${i}`,
          speaker: s.speaker || 'Guest',
          kind: 'other' as const,
          text: s.text,
          startMs: s.startMs ?? i * 1000,
          endMs: s.endMs ?? i * 1000 + 800,
        }));
      } else if (snap.transcriptText) {
        this.applyTextTranscript(meeting, snap.transcriptText);
      }
      meeting.status = 'processing';
      meeting.botMessage = 'Call ended — generating notes…';
      this.store.saveMeeting(meeting);
      await this.finalizeFromTranscript(meetingId);
    }
  }

  private async attachBotRecording(meeting: MeetingRecord) {
    if (!meeting.botId) return;
    if (meeting.audioPath && fs.existsSync(meeting.audioPath)) return;
    const provider = this.bots.get();
    if (!provider.downloadRecording) return;
    const uploadsDir =
      process.env.NOTEWISE_UPLOAD_DIR ?? path.join(process.cwd(), '.data', 'uploads');
    const saved = await provider.downloadRecording(meeting.botId, uploadsDir, `bot-${meeting.id}`);
    if (!saved) return;
    meeting.audioPath = saved;
    meeting.audioUrl = `/meetings/${meeting.id}/audio`;
    this.store.saveMeeting(meeting);
    this.logger.log(`Saved bot recording for ${meeting.id}`);
  }

  private async recoverFromProvider(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting?.botId) return;
    const provider = this.bots.get();
    if (!provider.fetchStatus) return;
    this.logger.log(`Recovering bot meeting ${meetingId} from provider`);

    // If we already have notes but no audio, only fetch the recording.
    if (meeting.transcript?.length && meeting.notes && !meeting.audioPath) {
      meeting.botMessage = 'Downloading meeting audio from Meeting BaaS…';
      this.store.saveMeeting(meeting);
      await this.attachBotRecording(meeting);
      meeting.botMessage = meeting.audioPath ? 'Notes ready' : meeting.botMessage;
      this.store.saveMeeting(meeting);
      return;
    }

    meeting.status = 'processing';
    meeting.botMessage = 'Syncing transcript from Meeting BaaS…';
    this.store.saveMeeting(meeting);

    // Gladia often finishes 15–60s after hangup — retry instead of hard-failing.
    let snap: Awaited<ReturnType<NonNullable<typeof provider.fetchStatus>>> = null;
    for (let attempt = 1; attempt <= 8; attempt++) {
      snap = await provider.fetchStatus(meeting.botId);
      if (snap?.segments?.length || snap?.transcriptText) break;
      if (snap && !snap.ended && !snap.transcriptionPending) {
        // Still in call — keep polling via vendor poller.
        meeting.status = 'bot_live';
        meeting.botMessage = snap.waitingRoom
          ? 'Notewise is in the Google Meet waiting room — admit the bot (People → waiting).'
          : 'Bot is still in the call — sync again after it leaves, or click Stop bot.';
        this.store.saveMeeting(meeting);
        this.startVendorPolling(meetingId, meeting.botId);
        return;
      }
      meeting.botMessage = `Waiting for Meeting BaaS transcription… (try ${attempt}/8)`;
      this.store.saveMeeting(meeting);
      await new Promise((r) => setTimeout(r, 3000));
    }

    if (!snap?.segments?.length && !snap?.transcriptText) {
      meeting.status = 'failed';
      meeting.botMessage =
        'Transcript not ready yet from Meeting BaaS. Wait ~30s after the call ends, then click Sync from bot again.';
      this.store.saveMeeting(meeting);
      return;
    }
    if (snap.segments?.length) {
      meeting.transcript = snap.segments.map((s, i) => ({
        id: `${meetingId}-p-${i}`,
        speaker: s.speaker || 'Guest',
        kind: 'other' as const,
        text: s.text,
        startMs: s.startMs ?? i * 1000,
        endMs: s.endMs ?? i * 1000 + 800,
      }));
    } else if (snap.transcriptText) {
      this.applyTextTranscript(meeting, snap.transcriptText);
    }
    this.store.saveMeeting(meeting);
    await this.attachBotRecording(meeting);
    await this.finalizeFromTranscript(meetingId);
  }

  private runSimulation(meetingId: string) {
    const timers: NodeJS.Timeout[] = [];
    let elapsed = 0;

    timers.push(
      setTimeout(() => {
        const m = this.store.getMeeting(meetingId);
        if (!m || m.status === 'ready' || m.status === 'failed') return;
        m.status = 'bot_live';
        m.botMessage = 'Sandbox bot is live — streaming transcript…';
        this.store.saveMeeting(m);
      }, 900),
    );

    SIM_SCRIPT.forEach((line, index) => {
      elapsed += line.delayMs;
      timers.push(
        setTimeout(() => {
          const m = this.store.getMeeting(meetingId);
          if (!m || m.status === 'ready' || m.status === 'failed' || m.status === 'processing') {
            return;
          }
          const turn: TranscriptTurn = {
            id: `${meetingId}-sim-${index}`,
            speaker: line.speaker,
            kind: line.kind,
            text: line.text,
            startMs: elapsed - line.delayMs,
            endMs: elapsed,
          };
          m.transcript = [...m.transcript, turn];
          m.status = 'bot_live';
          m.snippet = line.text.slice(0, 120);
          this.store.saveMeeting(m);
        }, elapsed),
      );
    });

    timers.push(
      setTimeout(() => {
        const m = this.store.getMeeting(meetingId);
        if (!m || m.status === 'ready' || m.status === 'failed') return;
        m.status = 'processing';
        m.botMessage = 'Sandbox session complete — generating notes…';
        this.store.saveMeeting(m);
        void this.finalizeFromTranscript(meetingId);
      }, elapsed + 1800),
    );

    this.simTimers.set(meetingId, timers);
  }

  private clearSimulation(meetingId: string) {
    const timers = this.simTimers.get(meetingId);
    if (!timers) return;
    for (const t of timers) clearTimeout(t);
    this.simTimers.delete(meetingId);
  }

  private clearPoll(meetingId: string) {
    const t = this.pollTimers.get(meetingId);
    if (t) clearInterval(t);
    this.pollTimers.delete(meetingId);
  }

  private applyTextTranscript(meeting: MeetingRecord, text: string) {
    const lines = text
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    meeting.transcript = lines.map((line, i) => {
      const m = line.match(/^([^:]{1,40}):\s*(.+)$/);
      const speaker = m?.[1]?.trim() || 'Guest';
      const body = m?.[2]?.trim() || line;
      return {
        id: `${meeting.id}-tx-${i}`,
        speaker,
        kind: speaker.toLowerCase() === 'you' || speaker.toLowerCase() === 'host' ? 'you' : 'other',
        text: body,
        startMs: i * 2000,
        endMs: i * 2000 + 1500,
      } as TranscriptTurn;
    });
  }

  private normalizeBaasSegments(data: Record<string, unknown>): TranscriptTurn[] {
    const raw = data.transcript ?? data.transcription;
    if (!Array.isArray(raw)) return [];
    const meetingId = String(data.meetingId ?? 'baas');
    return raw
      .map((row, i) => {
        const item = row as Record<string, unknown>;
        const words = item.words as Array<{ text?: string }> | undefined;
        const text =
          String(item.text ?? item.transcript ?? '') ||
          (words ? words.map((w) => w.text ?? '').join(' ').trim() : '');
        if (!text) return null;
        return {
          id: `${meetingId}-baas-${i}`,
          speaker: String(item.speaker ?? item.speaker_name ?? 'Guest'),
          kind: 'other' as const,
          text,
          startMs: Math.round(Number(item.start_time ?? item.start ?? i) * (Number(item.start_time) < 1000 ? 1000 : 1)),
          endMs: Math.round(Number(item.end_time ?? item.end ?? i + 1) * (Number(item.end_time) < 1000 ? 1000 : 1)),
        };
      })
      .filter(Boolean) as TranscriptTurn[];
  }

  private extractTranscriptText(data: Record<string, unknown>): string {
    if (typeof data.transcript === 'string') return data.transcript;
    if (typeof data.transcription === 'string') return data.transcription;
    if (Array.isArray(data.transcript)) {
      return (data.transcript as Array<Record<string, unknown>>)
        .map((row) => {
          const speaker = row.speaker ?? row.speaker_name ?? 'Guest';
          const text = row.text ?? row.transcript ?? '';
          return `${speaker}: ${text}`;
        })
        .join('\n');
    }
    return '';
  }

  private async finalizeFromTranscript(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting) return;

    if (meeting.source === 'bot' && meeting.botId) {
      await this.attachBotRecording(meeting);
    }

    const text = meeting.transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    if (!text.trim()) {
      meeting.status = 'failed';
      meeting.botMessage = 'No transcript captured from the meeting bot.';
      this.store.saveMeeting(meeting);
      return;
    }

    try {
      meeting.notes = await this.worker.summarize(text);
      meeting.status = 'ready';
      meeting.durationSec = Math.max(
        1,
        Math.round((meeting.transcript.at(-1)?.endMs ?? 0) / 1000),
      );
      meeting.snippet = meeting.notes.executiveSummary?.slice(0, 120);
      meeting.botMessage = 'Notes ready';
      if (meeting.notes.title) meeting.title = meeting.notes.title;
      this.store.saveMeeting(meeting);
    } catch (err) {
      this.logger.warn(`Summarize failed: ${(err as Error).message}`);
      meeting.notes = {
        executiveSummary: text.slice(0, 280),
        takeaways: meeting.transcript.slice(0, 5).map((t) => t.text),
        actions: [{ text: 'Review full transcript in Library', priority: 'med' }],
      };
      meeting.status = 'ready';
      meeting.botMessage = 'Notes ready (fallback summarizer)';
      this.store.saveMeeting(meeting);
    } finally {
      this.clearSimulation(meetingId);
      this.clearPoll(meetingId);
    }
  }
}
