import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { DataStore } from '../store/data.store';

@Injectable()
export class MeetingsService {
  constructor(private readonly store: DataStore) {}

  list() {
    return this.store.listMeetings().map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      source: m.source,
      backend: m.backend ?? 'nest',
      createdAt: m.createdAt,
      durationSec: m.durationSec,
      snippet: m.snippet ?? m.notes?.executiveSummary?.slice(0, 120),
    }));
  }

  get(id: string) {
    const meeting = this.store.getMeeting(id);
    if (!meeting) return null;
    return {
      ...meeting,
      backend: meeting.backend ?? 'nest',
      audioUrl: meeting.audioPath ? `/meetings/${meeting.id}/audio` : meeting.audioUrl ?? null,
      // Never expose filesystem paths to clients
      audioPath: undefined,
    };
  }

  remove(id: string) {
    return this.store.deleteMeeting(id);
  }

  update(id: string, patch: { title?: string }) {
    const meeting = this.store.getMeeting(id);
    if (!meeting) return null;
    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw new Error('Title cannot be empty');
      if (title.length > 200) throw new Error('Title too long');
      meeting.title = title;
      if (meeting.notes) {
        meeting.notes = { ...meeting.notes, title };
      }
    }
    return this.get(this.store.saveMeeting(meeting).id);
  }

  resolveAudio(id: string): { path: string; mime: string; size: number } | null {
    const meeting = this.store.getMeeting(id);
    if (!meeting?.audioPath || !fs.existsSync(meeting.audioPath)) return null;
    const ext = path.extname(meeting.audioPath).toLowerCase();
    const mime =
      ext === '.wav'
        ? 'audio/wav'
        : ext === '.m4a' || ext === '.mp4'
          ? 'audio/mp4'
          : ext === '.flac'
            ? 'audio/flac'
            : ext === '.ogg'
              ? 'audio/ogg'
              : 'audio/webm';
    const size = fs.statSync(meeting.audioPath).size;
    return { path: meeting.audioPath, mime, size };
  }
}
