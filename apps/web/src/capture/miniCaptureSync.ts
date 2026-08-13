import type { NotesPayload } from "@notewise/api-client";
import type { ProcessPhase } from "../hooks/useRecorder";

export const CAPTURE_CHANNEL = "notewise.capture";
export const CAPTURE_STORAGE_KEY = "notewise.capture.snapshot";

export type CaptureTurn = {
  id: string;
  speaker: string;
  kind: "you" | "other";
  text: string;
  live?: boolean;
};

/** Non-sensitive UI state mirrored to mini windows (no tokens). */
export type CaptureSyncState = {
  recording: boolean;
  paused: boolean;
  busy: boolean;
  elapsed: number;
  meetingId: string | null;
  turns: CaptureTurn[];
  notes: NotesPayload | null;
  error: string | null;
  statusLine: string;
  phase: ProcessPhase;
  interim: string;
  userNotes: string;
  liveSupported: boolean;
  updatedAt: number;
};

export type CaptureSyncCommand =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "stop" }
  | { type: "start" }
  | { type: "notes"; payload: string }
  | { type: "focus-main" }
  | { type: "ping" };

export type CaptureSyncMessage =
  | { kind: "state"; state: CaptureSyncState }
  | { kind: "command"; command: CaptureSyncCommand };

export function isCaptureActive(state: Pick<CaptureSyncState, "recording" | "paused">) {
  return state.recording || state.paused;
}

export function createCaptureChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    return new BroadcastChannel(CAPTURE_CHANNEL);
  } catch {
    return null;
  }
}

export function publishCaptureSnapshot(state: CaptureSyncState) {
  try {
    sessionStorage.setItem(CAPTURE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readCaptureSnapshot(): CaptureSyncState | null {
  try {
    const raw = sessionStorage.getItem(CAPTURE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CaptureSyncState;
  } catch {
    return null;
  }
}

export function clearCaptureSnapshot() {
  try {
    sessionStorage.removeItem(CAPTURE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
