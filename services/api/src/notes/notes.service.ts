import { Injectable, NotFoundException } from '@nestjs/common';
import { DataStore } from '../store/data.store';
import { WorkerClient } from '../common/worker.client';

@Injectable()
export class NotesService {
  constructor(
    private readonly store: DataStore,
    private readonly worker: WorkerClient,
  ) {}

  get(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    return meeting?.notes ?? null;
  }

  async regenerate(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting) throw new NotFoundException('Meeting not found');
    const transcript = meeting.transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n');
    meeting.status = 'processing';
    this.store.saveMeeting(meeting);
    const notes = await this.worker.summarize(transcript || 'Empty transcript');
    meeting.notes = notes;
    meeting.status = 'ready';
    meeting.snippet = notes.executiveSummary?.slice(0, 120);
    this.store.saveMeeting(meeting);
    return notes;
  }
}
