import { isDesktopShell } from "../capture/desktopMiniWindow";
import { DESKTOP_API_BASE } from "./desktopMode";

/** Runtime setup for the Tauri shell (API base, media capability checks). */
export function initDesktopApp(): void {
  if (!isDesktopShell()) return;

  localStorage.setItem("notewise.apiBase", DESKTOP_API_BASE);
  localStorage.setItem("notewise.backendKind", "pyai");

  if (!window.isSecureContext) {
    console.warn(
      "Notewise desktop: insecure context — microphone capture may be blocked by the webview.",
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    console.warn("Notewise desktop: getUserMedia is unavailable in this webview build.");
  }
}
