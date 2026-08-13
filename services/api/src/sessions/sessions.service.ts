import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  DataStore,
  type NotesPayload,
  type TranscriptTurn,
} from '../store/data.store';
import { WorkerClient } from '../common/worker.client';
import { CreateSessionDto } from './dto/create-session.dto';

const PLACEHOLDER_TITLE =
  /^(recording…?|recording\.\.\.|untitled( meeting)?|meeting notes|new meeting|capture · .+|setup smoke|test|quick sync|[a-z]{3} sync)$/i;

const TITLE_STOPWORDS = new Set(
  `
  a an the and or but if in on at to for of is are was were be been being
  have has had do does did will would could should may might must can
  this that these those i we you they he she it my our your their
  with from about into over after before just also very really so then
  than too there here what when where which who how not no yes ok okay
  um uh hey hi hello yeah yep well got get getting going go went
  discussion covered turns meeting meetings notes note call calls today
  tomorrow week next last some any something anything everything stuff
  kind sort thing things one two three need needs needed want wants
  `.trim().split(/\s+/),
);

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly uploadsDir: string;

  constructor(
    private readonly store: DataStore,
    private readonly worker: WorkerClient,
  ) {
    this.uploadsDir =
      process.env.NOTEWISE_UPLOAD_DIR ?? path.join(process.cwd(), '.data', 'uploads');
    fs.mkdirSync(this.uploadsDir, { recursive: true });
  }

  create(dto: CreateSessionDto) {
    const { session, meeting } = this.store.createSession(dto.source, dto.title);
    return { sessionId: session.id, meetingId: meeting.id };
  }

  addChunk(sessionId: string, file: Express.Multer.File | undefined, sequence: number) {
    const session = this.store.getSession(sessionId);
    if (!session || session.finalized) {
      throw new NotFoundException('Session not found or already finalized');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio chunk required');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Chunk too large');
    }
    const ext = this.guessExt(file.mimetype, file.originalname);
    const safeName = `${sessionId}-${String(sequence).padStart(5, '0')}-${randomUUID()}.${ext}`;
    const dest = path.join(this.uploadsDir, safeName);
    fs.writeFileSync(dest, file.buffer);
    this.store.bumpChunk(sessionId);
    return { ok: true, sequence };
  }

  /** Partial STT while recording — does not finalize the session. */
  async liveTranscribe(sessionId: string, file: Express.Multer.File | undefined) {
    const session = this.store.getSession(sessionId);
    if (!session || session.finalized) {
      throw new NotFoundException('Session not found or already finalized');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio chunk required');
    }
    if (file.size > 25 * 1024 * 1024) {
      throw new BadRequestException('Chunk too large');
    }
    const ext = this.guessExt(file.mimetype, file.originalname);
    const dest = path.join(this.uploadsDir, `live-${sessionId}-${randomUUID()}.${ext}`);
    fs.writeFileSync(dest, file.buffer);
    try {
      const tx = await this.worker.transcribe(dest, undefined, true);
      const segments = (tx.segments ?? [])
        .map((s) => ({
          text: (s.text || '').trim(),
          startMs: s.startMs ?? 0,
          endMs: s.endMs ?? 0,
        }))
        .filter((s) => s.text.length > 0);
      return { segments, text: segments.map((s) => s.text).join(' ') };
    } finally {
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
    }
  }

  async finalize(sessionId: string) {
    const result = this.store.finalizeSession(sessionId);
    if (!result?.meeting) throw new NotFoundException('Session not found');
    const meeting = result.meeting;

    void this.processMeeting(meeting.id, sessionId).catch((err: Error) => {
      this.logger.warn(`Processing failed for ${meeting.id}: ${err.message}`);
      const m = this.store.getMeeting(meeting.id);
      if (m) {
        m.status = 'failed';
        m.notes = {
          executiveSummary: `Processing failed: ${err.message.slice(0, 160)}`,
          takeaways: [],
          actions: [],
        };
        this.store.saveMeeting(m);
      }
    });

    return { meetingId: meeting.id, status: meeting.status };
  }

  private guessExt(mime?: string, name?: string) {
    const lower = `${mime || ''} ${name || ''}`.toLowerCase();
    if (lower.includes('mp4') || lower.includes('m4a')) return 'm4a';
    if (lower.includes('ogg')) return 'ogg';
    if (lower.includes('wav')) return 'wav';
    return 'webm';
  }

  private async resolveAudioPath(sessionId: string): Promise<string | null> {
    const chunks = fs
      .readdirSync(this.uploadsDir)
      .filter((f) => f.startsWith(`${sessionId}-`))
      .sort();
    if (chunks.length === 0) return null;
    if (chunks.length === 1) return path.join(this.uploadsDir, chunks[0]);

    const ranked = chunks
      .map((f) => {
        const full = path.join(this.uploadsDir, f);
        return { full, size: fs.statSync(full).size };
      })
      .sort((a, b) => b.size - a.size);
    return ranked[0]?.full ?? null;
  }

  private async processMeeting(meetingId: string, sessionId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting) return;

    const audioPath = await this.resolveAudioPath(sessionId);
    const enrollment = this.store.getEnrollment();
    const youPath = enrollment.embeddingPath;

    if (audioPath) {
      meeting.audioPath = audioPath;
      meeting.audioUrl = `/meetings/${meetingId}/audio`;
      this.store.saveMeeting(meeting);
    }

    let transcriptText = '';

    try {
      if (audioPath) {
        const tx = await this.worker.transcribe(audioPath, youPath);
        let segments = tx.segments ?? [];

        // If STT didn't label and we have a voiceprint, run explicit labeling.
        const needsLabel =
          Boolean(youPath) &&
          segments.some((s) => !s.kind || (!s.speaker && !s.kind));
        if (youPath && (needsLabel || segments.every((s) => !s.kind))) {
          try {
            const labeled = await this.worker.label(audioPath, segments, youPath);
            segments = labeled.segments ?? segments;
          } catch (err) {
            this.logger.warn(
              `Speaker label failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }

        meeting.transcript = segments.map((seg, i) => {
          const kind =
            seg.kind === 'you' || seg.speaker === 'You' || seg.speaker === 'you'
              ? 'you'
              : 'other';
          return {
            id: `${meetingId}-${i}`,
            speaker: kind === 'you' ? 'You' : seg.speaker && seg.speaker !== 'you' ? seg.speaker : 'Other',
            kind,
            text: seg.text,
            startMs: seg.startMs,
            endMs: seg.endMs,
          };
        });
        transcriptText = meeting.transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');
        this.store.saveMeeting(meeting);
      }
    } catch (err) {
      this.logger.warn(
        `Transcribe failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      meeting.transcript = [
        {
          id: `${meetingId}-0`,
          speaker: 'You',
          kind: 'you',
          text: 'Recording saved, but transcription failed. Check the AI worker and Whisper install.',
          startMs: 0,
          endMs: 2000,
        },
      ];
      transcriptText = meeting.transcript[0].text;
      this.store.saveMeeting(meeting);
    }

    try {
      const notes = await this.worker.summarize(
        transcriptText || 'Empty transcript — no speech detected.',
      );
      meeting.notes = notes;
      meeting.snippet = notes.executiveSummary?.slice(0, 160);
      const nextTitle = this.pickMeetingTitle(meeting.title, notes, meeting.transcript);
      if (nextTitle) {
        meeting.title = nextTitle;
        meeting.notes = { ...notes, title: nextTitle };
      }
    } catch (err) {
      this.logger.warn(
        `Summarize failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      meeting.notes = {
        title: meeting.title,
        executiveSummary:
          'Transcript is ready. Notes generation failed — ensure Ollama is running (LLM_PROVIDER=ollama).',
        takeaways: meeting.transcript.slice(0, 3).map((t) => t.text),
        actions: [],
      };
      meeting.snippet = meeting.notes.executiveSummary?.slice(0, 160);
    }

    meeting.status = 'ready';
    meeting.durationSec = Math.max(
      1,
      Math.round((meeting.transcript.at(-1)?.endMs ?? 1000) / 1000),
    );
    this.store.saveMeeting(meeting);
  }

  /** 2–3 word topic from summary / notes / transcript. */
  private pickMeetingTitle(
    current: string | undefined,
    notes: NotesPayload | null | undefined,
    transcript: TranscriptTurn[],
  ): string | null {
    const sources = [
      notes?.title,
      notes?.executiveSummary,
      current,
      ...(notes?.takeaways ?? []),
      ...transcript.map((t) => t.text),
    ];
    for (const src of sources) {
      if (!src?.trim() || PLACEHOLDER_TITLE.test(src.trim())) continue;
      const short = this.topicPhrase(src);
      if (short) return short;
    }
    return null;
  }

  private topicPhrase(text: string, maxWords = 3): string | null {
    const first = text.split(/(?<=[.!?])\s+|\n+/)[0]?.trim() || text.trim();
    const cleaned = first
      .replace(/^(um+|uh+|yeah|ok(ay)?|so|well|hey|hi|hello)\b[\s,.-]*/i, '')
      .trim();
    const words = (cleaned.match(/[A-Za-z][A-Za-z0-9'/-]*/g) || []).filter(
      (w) => w.length > 2 && !TITLE_STOPWORDS.has(w.toLowerCase()),
    );
    if (!words.length) return null;
    return words
      .slice(0, maxWords)
      .map((w) =>
        w.length <= 4 && w === w.toUpperCase()
          ? w
          : w[0].toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join(' ');
  }
}
