import { isDesktopShell } from "../capture/desktopMiniWindow";

/** Desktop DMG builds ship PyAI-only (no Nest / Whisper path). */
export function isDesktopPyaiOnly(): boolean {
  return import.meta.env.VITE_DESKTOP_PYAI_ONLY === "true" || isDesktopShell();
}

export const DESKTOP_API_BASE = "http://127.0.0.1:3002";
