/**
 * Desktop-only permission checks via Tauri commands.
 * Uses native macOS APIs to verify microphone and screen recording access.
 */

import { isDesktopShell } from "../capture/desktopMiniWindow";

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

function getTauriInvoke(): TauriInvoke | null {
  if (!isDesktopShell()) return null;
  const w = window as unknown as { __TAURI_INVOKE__?: TauriInvoke };
  return w.__TAURI_INVOKE__ ?? null;
}

export type PermissionStatus = "authorized" | "denied" | "restricted" | "notDetermined" | "unknown";

export async function checkMicrophonePermission(): Promise<PermissionStatus> {
  const invoke = getTauriInvoke();
  if (!invoke) return "unknown";
  try {
    return await invoke<PermissionStatus>("check_microphone_permission");
  } catch {
    return "unknown";
  }
}

export async function requestMicrophonePermission(): Promise<void> {
  const invoke = getTauriInvoke();
  if (!invoke) return;
  try {
    await invoke("request_microphone_permission");
  } catch (err) {
    console.warn("Failed to request microphone permission:", err);
  }
}

export async function checkScreenRecordingPermission(): Promise<boolean> {
  const invoke = getTauriInvoke();
  if (!invoke) return false;
  try {
    return await invoke<boolean>("check_screen_recording_permission");
  } catch {
    return false;
  }
}

export async function requestScreenRecordingPermission(): Promise<boolean> {
  const invoke = getTauriInvoke();
  if (!invoke) return false;
  try {
    return await invoke<boolean>("request_screen_recording_permission");
  } catch {
    return false;
  }
}

export async function openSystemSettings(pane: "microphone" | "screen"): Promise<void> {
  const invoke = getTauriInvoke();
  if (!invoke) return;
  try {
    await invoke("open_system_settings", { pane });
  } catch (err) {
    console.warn("Failed to open system settings:", err);
  }
}

/**
 * Check all required permissions for audio recording on desktop.
 * Returns null if all granted, otherwise a user-facing error message.
 */
export async function checkAudioCapturePermissions(needsSystemAudio: boolean): Promise<string | null> {
  if (!isDesktopShell()) return null;

  const micStatus = await checkMicrophonePermission();
  if (micStatus === "denied") {
    return "Microphone access denied. Open System Settings → Privacy & Security → Microphone and enable Notewise.";
  }
  if (micStatus === "restricted") {
    return "Microphone access is restricted by system policy.";
  }
  if (micStatus === "notDetermined") {
    // Will trigger system prompt when getUserMedia is called
    return null;
  }

  if (needsSystemAudio) {
    const screenOk = await checkScreenRecordingPermission();
    if (!screenOk) {
      return "Screen Recording permission required for system audio. Click to open System Settings → Privacy & Security → Screen Recording and enable Notewise.";
    }
  }

  return null;
}
