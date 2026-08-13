import { isDesktopShell } from "../capture/desktopMiniWindow";
import {
  diagnosticsReady,
  getGatewayDiagnostics,
  type GatewayDiagnostics,
} from "./desktopGateway";

export type DesktopMicStatus = "granted" | "denied" | "restricted" | "unknown";

export type DesktopPermissionKind = "microphone" | "screen_recording" | "pyai_api_key";

export type DesktopPermissionSnapshot = {
  microphone: { granted: boolean; status: DesktopMicStatus };
  screenRecording: { granted: boolean };
  gateway: GatewayDiagnostics;
  missing: DesktopPermissionKind[];
  readyToRecord: boolean;
};

export type DesktopMicEnsureResult = {
  ok: boolean;
  status: DesktopMicStatus;
  message?: string;
};

const MIC_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_Microphone";
const SCREEN_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?Privacy_ScreenCapture";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function pollPermission(
  check: () => Promise<boolean>,
  attempts = 30,
  delayMs = 100,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await check()) return true;
    await sleep(delayMs);
  }
  return false;
}

async function macosPermissionsApi() {
  return import("tauri-plugin-macos-permissions-api");
}

async function openSystemUrl(url: string): Promise<void> {
  const { open } = await import("@tauri-apps/plugin-shell");
  await open(url);
}

/** Native TCC microphone state (macOS only). */
export async function getNativeMicrophoneStatus(): Promise<DesktopMicStatus> {
  if (!isDesktopShell()) return "granted";
  try {
    const { checkMicrophonePermission } = await macosPermissionsApi();
    const granted = Boolean(await checkMicrophonePermission());
    return granted ? "granted" : "denied";
  } catch {
    return "unknown";
  }
}

/** Prompt macOS for microphone access via AVFoundation (must run on user gesture). */
export async function requestNativeMicrophoneAccess(): Promise<boolean> {
  if (!isDesktopShell()) return true;
  try {
    const { requestMicrophonePermission, checkMicrophonePermission } = await macosPermissionsApi();
    await requestMicrophonePermission();
    return pollPermission(async () => Boolean(await checkMicrophonePermission()));
  } catch {
    return false;
  }
}

export async function openMicrophoneSettings(): Promise<void> {
  if (!isDesktopShell()) return;
  await openSystemUrl(MIC_SETTINGS_URL);
}

export async function openScreenRecordingSettings(): Promise<void> {
  if (!isDesktopShell()) return;
  await openSystemUrl(SCREEN_SETTINGS_URL);
}

export async function getNativeScreenRecordingStatus(): Promise<boolean> {
  if (!isDesktopShell()) return true;
  try {
    const { checkScreenRecordingPermission } = await macosPermissionsApi();
    return Boolean(await checkScreenRecordingPermission());
  } catch {
    return false;
  }
}

export async function requestNativeScreenRecordingAccess(): Promise<boolean> {
  if (!isDesktopShell()) return true;
  try {
    const { requestScreenRecordingPermission, checkScreenRecordingPermission } =
      await macosPermissionsApi();
    await requestScreenRecordingPermission();
    return pollPermission(async () => Boolean(await checkScreenRecordingPermission()));
  } catch {
    return false;
  }
}

export function screenRecordingHelpMessage(): string {
  return "Enable Screen Recording for Notewise in System Settings → Privacy & Security → Screen Recording. This captures meeting audio from your speakers — no tab or window sharing prompt.";
}

const MEETING_AUDIO_SKIP_KEY = "notewise.meeting-audio.skip";

/** User chose mic-only during onboarding — never prompt Screen Recording on Start. */
export function isMeetingAudioSkipped(): boolean {
  try {
    return localStorage.getItem(MEETING_AUDIO_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function setMeetingAudioSkipped(skipped: boolean): void {
  try {
    localStorage.setItem(MEETING_AUDIO_SKIP_KEY, skipped ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Only attempt SCK when TCC is already granted — avoids the modal on every Start. */
export async function shouldUseMeetingAudio(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  if (isMeetingAudioSkipped()) return false;
  return getNativeScreenRecordingStatus();
}

/**
 * Desktop capture pipeline: native TCC first, then a short WKWebView getUserMedia probe.
 * Matches Meet/Zoom — OS permission is authoritative; webview follows.
 */
export async function ensureDesktopMicrophoneAccess(
  opts?: { skipProbe?: boolean },
): Promise<DesktopMicEnsureResult> {
  if (!isDesktopShell()) return { ok: true, status: "granted" };

  if (!window.isSecureContext) {
    return {
      ok: false,
      status: "unknown",
      message:
        "Microphone capture needs a secure context. Restart Notewise or reinstall the desktop app.",
    };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      status: "unknown",
      message: "Microphone capture is unavailable in this Notewise build.",
    };
  }

  let status = await getNativeMicrophoneStatus();
  if (status !== "granted") {
    const granted = await requestNativeMicrophoneAccess();
    status = granted ? "granted" : "denied";
  }
  if (status !== "granted") {
    return {
      ok: false,
      status,
      message: micBlockedMessage(),
    };
  }

  if (opts?.skipProbe) {
    return { ok: true, status: "granted" };
  }

  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
    return { ok: true, status: "granted" };
  } catch (err) {
    const dom = err instanceof DOMException ? err.name : "";
    if (dom === "NotAllowedError" || dom === "PermissionDeniedError") {
      return { ok: false, status: "denied", message: micBlockedMessage() };
    }
    if (dom === "NotReadableError" || dom === "AbortError") {
      return {
        ok: false,
        status: "restricted",
        message:
          "Microphone is in use by another app. Close other meeting apps and try again.",
      };
    }
    return {
      ok: false,
      status: "unknown",
      message: err instanceof Error ? err.message : "Could not open the microphone.",
    };
  }
}

export function micBlockedMessage(): string {
  return "Microphone access is required. Allow Notewise in System Settings → Privacy & Security → Microphone, then try again.";
}

/** Read current desktop permission + gateway state (no prompts). */
export async function detectDesktopPermissions(): Promise<DesktopPermissionSnapshot> {
  if (!isDesktopShell()) {
    return {
      microphone: { granted: true, status: "granted" },
      screenRecording: { granted: true },
      gateway: {
        running: true,
        reachable: true,
        hasApiKey: true,
        status: "web",
        worker: "",
        port: 3002,
        error: null,
      },
      missing: [],
      readyToRecord: true,
    };
  }

  const [micStatus, screenGranted, gateway] = await Promise.all([
    getNativeMicrophoneStatus(),
    getNativeScreenRecordingStatus(),
    getGatewayDiagnostics(),
  ]);

  const micGranted = micStatus === "granted";
  const gatewayOk = diagnosticsReady(gateway);
  const missing: DesktopPermissionKind[] = [];
  if (!micGranted) missing.push("microphone");
  if (!screenGranted) missing.push("screen_recording");
  if (!gatewayOk) missing.push("pyai_api_key");

  return {
    microphone: { granted: micGranted, status: micStatus },
    screenRecording: { granted: screenGranted },
    gateway,
    missing,
    /** Mic + gateway is enough to start; system audio enhances when screen recording is granted. */
    readyToRecord: micGranted && gatewayOk,
  };
}

/**
 * Auto-detect and request missing permissions (mic prompts natively; screen optional).
 * Call on app boot and before recording.
 */
export async function autoEnsureDesktopPermissions(opts?: {
  requestScreen?: boolean;
}): Promise<{ snapshot: DesktopPermissionSnapshot; message?: string }> {
  let snapshot = await detectDesktopPermissions();

  if (!snapshot.microphone.granted) {
    const granted = await requestNativeMicrophoneAccess();
    if (!granted) {
      snapshot = await detectDesktopPermissions();
      return { snapshot, message: micBlockedMessage() };
    }
    await ensureDesktopMicrophoneAccess({ skipProbe: false });
    snapshot = await detectDesktopPermissions();
  }

  if (opts?.requestScreen && !snapshot.screenRecording.granted) {
    await requestNativeScreenRecordingAccess();
    snapshot = await detectDesktopPermissions();
  }

  if (!diagnosticsReady(snapshot.gateway)) {
    const msg = !snapshot.gateway.reachable
      ? "Local AI gateway is not running. Restart Notewise or check ~/Library/Application Support/com.notewise.app/data/gateway.log"
      : "PyAI API key is missing. Add it in Settings or gateway.env.";
    return { snapshot, message: msg };
  }

  return { snapshot };
}

/** Required before starting capture on desktop. */
export async function ensureReadyToRecord(): Promise<void> {
  const { snapshot, message } = await autoEnsureDesktopPermissions();
  if (!snapshot.microphone.granted) {
    throw new Error(message ?? micBlockedMessage());
  }
  if (!diagnosticsReady(snapshot.gateway)) {
    throw new Error(
      message ??
        "PyAI gateway is not ready. Add your API key in Settings (stored in gateway.env on this Mac).",
    );
  }
}
