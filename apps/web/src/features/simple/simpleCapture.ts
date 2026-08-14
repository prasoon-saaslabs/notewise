import type { ProcessPhase } from "../../hooks/useRecorder";
import { isCaptureActive } from "../../capture/miniCaptureSync";

export const SIMPLE_HOME_PATH = "/";
export const SIMPLE_NOTE_PATH = "/simple/note";
export const SIMPLE_CAPTURE_KEY = "og-simple-capture";

export function markSimpleCapture() {
  try {
    sessionStorage.setItem(SIMPLE_CAPTURE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearSimpleCapture() {
  try {
    sessionStorage.removeItem(SIMPLE_CAPTURE_KEY);
  } catch {
    /* ignore */
  }
}

export function isSimpleCaptureSession() {
  try {
    return sessionStorage.getItem(SIMPLE_CAPTURE_KEY) === "1";
  } catch {
    return false;
  }
}

const PROCESSING: ProcessPhase[] = [
  "uploading",
  "transcribing",
  "speakers",
  "notes",
];

export function isSimpleSessionInProgress(session: {
  recording: boolean;
  paused: boolean;
  phase: ProcessPhase;
}) {
  if (!isSimpleCaptureSession()) return false;
  return isCaptureActive(session) || PROCESSING.includes(session.phase);
}

export function isSimpleNoteSurface(pathname: string) {
  return pathname === SIMPLE_NOTE_PATH;
}

export function isSimpleHomeSurface(pathname: string) {
  return pathname === SIMPLE_HOME_PATH;
}

export function isEmptyTranscriptError(error: string | null | undefined) {
  if (!error) return false;
  return (
    error.includes("EMPTY_TRANSCRIPT") ||
    /no transcript produced/i.test(error) ||
    /no speech was captured/i.test(error)
  );
}
