/**
 * Cross-webview capture sync for Tauri mini-capture window.
 * BroadcastChannel does not bridge separate WKWebView instances.
 */
import { isDesktopShell } from "./desktopMiniWindow";
import type { CaptureSyncCommand, CaptureSyncState } from "./miniCaptureSync";

const STATE_EVENT = "notewise://capture-state";
const COMMAND_EVENT = "notewise://capture-command";

export async function publishDesktopCaptureState(state: CaptureSyncState): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(STATE_EVENT, state);
  } catch {
    /* ignore */
  }
}

export async function listenDesktopCaptureState(
  onState: (state: CaptureSyncState) => void,
): Promise<() => void> {
  if (!isDesktopShell()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  return listen<CaptureSyncState>(STATE_EVENT, (event) => {
    if (event.payload) onState(event.payload);
  });
}

export async function sendDesktopCaptureCommand(command: CaptureSyncCommand): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(COMMAND_EVENT, command);
  } catch {
    /* ignore */
  }
}

export async function listenDesktopCaptureCommand(
  onCommand: (command: CaptureSyncCommand) => void,
): Promise<() => void> {
  if (!isDesktopShell()) return () => undefined;
  const { listen } = await import("@tauri-apps/api/event");
  return listen<CaptureSyncCommand>(COMMAND_EVENT, (event) => {
    if (event.payload) onCommand(event.payload);
  });
}
