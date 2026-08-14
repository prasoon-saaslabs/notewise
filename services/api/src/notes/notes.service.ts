import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  DataStore,
  type NotesPayload,
  type TranscriptTurn,
} from "../store/data.store";
import { WorkerClient } from "../common/worker.client";
import { RecapClient } from "./recap.client";

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private readonly store: DataStore,
    private readonly worker: WorkerClient,
    private readonly recap: RecapClient,
  ) {}

  get(meetingId: string) {
    const meeting = this.store.getMeeting(meetingId);
    return meeting?.notes ?? null;
  }

  async regenerate(meetingId: string, userNotes?: string) {
    const meeting = this.store.getMeeting(meetingId);
    if (!meeting) throw new NotFoundException("Meeting not found");
    meeting.status = "processing";
    this.store.saveMeeting(meeting);
    try {
      const notes = await this.buildNotes(
        meeting.transcript,
        meeting.title,
        meeting.id,
        userNotes,
      );
      meeting.notes = notes;
      meeting.status = "ready";
      meeting.snippet = notes.executiveSummary?.slice(0, 120);
      this.store.saveMeeting(meeting);
      return { meetingId, status: "ready" as const, notes };
    } catch (err) {
      meeting.status = "failed";
      this.store.saveMeeting(meeting);
      throw err;
    }
  }

  private async buildNotes(
    turns: TranscriptTurn[],
    title: string,
    callId: string,
    userNotes?: string,
  ): Promise<NotesPayload> {
    if (this.recap.isConfigured()) {
      try {
        return await this.recap.summarizeMeeting({
          callId,
          title,
          turns,
          userNotes,
        });
      } catch (err) {
        this.logger.warn(
          `Recap regenerate failed, falling back to local summarizer: ${
            err instanceof Error ? err.message : "error"
          }`,
        );
      }
    }
    const transcript = turns.map((t) => `${t.speaker}: ${t.text}`).join("\n");
    return this.worker.summarize(transcript || "Empty transcript");
  }
}
