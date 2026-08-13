import { isDesktopShell } from "../capture/desktopMiniWindow";

export const MIXED_SPEAKERS_KEY = "og-mixed-speakers";

/** Web-only: mic hears laptop speakers (no tab/screen share). Always off on desktop. */
export function isMixedSpeakersEnabled(): boolean {
  if (isDesktopShell()) return false;
  try {
    const stored = localStorage.getItem(MIXED_SPEAKERS_KEY);
    if (stored === null) return true;
    return stored === "1";
  } catch {
    return true;
  }
}

export function setMixedSpeakersEnabled(on: boolean): void {
  try {
    localStorage.setItem(MIXED_SPEAKERS_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
