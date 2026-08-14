import { isDesktopShell } from "../capture/desktopMiniWindow";

export const MIXED_SPEAKERS_KEY = "og-mixed-speakers";

/** Web-only: mic hears laptop speakers (no tab/screen share). Always off on desktop. */
export function isMixedSpeakersEnabled(): boolean {
  if (isDesktopShell()) return false;
  return true;
}

/** @deprecated Mixed capture is always on for web; kept for call-site compatibility. */
export function setMixedSpeakersEnabled(_on: boolean): void {
  /* no-op */
}
