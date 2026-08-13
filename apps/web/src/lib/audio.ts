import { pickRecorderMimeType, createAudioRecorder, recorderExtension } from "./audioCore";
export { pickRecorderMimeType, createAudioRecorder, recorderExtension };

import { isChromeBrowser } from "./meetingTabAudio";
import { acquirePreferredMic } from "./micCapture";
import { isDesktopShell } from "../capture/desktopMiniWindow";

export type ChannelMode = "mono" | "stereo" | "mix";

export type TwoChannelCapture = {
  recordStream: MediaStream;
  micStream: MediaStream;
  systemStream: MediaStream | null;
  channelMode: ChannelMode;
  backend: "screencapturekit" | "tab-capture" | "mic" | "mix";
  release?: () => void;
  meetingTabTitle?: string;
  /** Shown when meeting audio failed but mic still works. */
  warning?: string;
};

export type CaptureOptions = {
  /** Desktop: request system/window audio via ScreenCaptureKit. Ignored on web. */
  preferSystem?: boolean;
  /** Web: mic hears laptop speakers — no share picker. */
  mixedSpeakers?: boolean;
};

type MeetingSide = {
  stream: MediaStream;
  backend: "screencapturekit" | "tab-capture";
  release?: () => void;
  meetingTabTitle?: string;
  warning?: string;
};

async function acquireMic(separateMeetingTrack = false, mixedCapture = false): Promise<MediaStream> {
  return acquirePreferredMic({ separateMeetingTrack, mixedCapture });
}

/**
 * Chrome's built-in way to capture another tab's audio (no extension).
 * Must be invoked during the same user gesture as Start — do not await mic first.
 */
async function acquireDisplayMediaTabAudio(): Promise<MeetingSide | null> {
  if (!navigator.mediaDevices?.getDisplayMedia) return null;

  let display: MediaStream;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        suppressLocalAudioPlayback: false,
      },
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      monitorTypeSurfaces: "exclude",
      systemAudio: "include",
    } as DisplayMediaStreamOptions);
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return { stream: new MediaStream(), backend: "tab-capture", warning: "cancelled" };
    }
    return null;
  }

  display.getVideoTracks().forEach((t) => t.stop());

  const audioTracks = display.getAudioTracks().filter((t) => t.readyState === "live");
  if (!audioTracks.length) {
    display.getTracks().forEach((t) => t.stop());
    return {
      stream: new MediaStream(),
      backend: "tab-capture",
      warning:
        "No tab audio detected. Select your Meet/Teams tab and enable “Also share tab audio”.",
    };
  }

  const systemStream = new MediaStream(audioTracks);
  const label = audioTracks[0]?.label || "Meeting tab";
  return {
    stream: systemStream,
    backend: isDesktopShell() ? "screencapturekit" : "tab-capture",
    meetingTabTitle: label,
    release: () => display.getTracks().forEach((t) => t.stop()),
  };
}

/**
 * macOS desktop (WKWebView / ScreenCaptureKit): minimal getDisplayMedia constraints.
 * Chrome-only options like systemAudio / monitorTypeSurfaces break in the Tauri webview.
 */
async function acquireDesktopSystemAudio(): Promise<MeetingSide | null> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return {
      stream: new MediaStream(),
      backend: "screencapturekit",
      warning:
        "System audio capture is unavailable in this desktop build. Update Notewise or use mic-only mode.",
    };
  }

  let display: MediaStream;
  try {
    display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return { stream: new MediaStream(), backend: "screencapturekit", warning: "cancelled" };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (/user gesture/i.test(msg)) {
      return {
        stream: new MediaStream(),
        backend: "screencapturekit",
        warning: "system_audio_skipped",
      };
    }
    return {
      stream: new MediaStream(),
      backend: "screencapturekit",
      warning:
        err instanceof Error
          ? err.message
          : "Could not open system audio. Grant Screen Recording for Notewise in System Settings.",
    };
  }

  display.getVideoTracks().forEach((t) => t.stop());

  const audioTracks = display.getAudioTracks().filter((t) => t.readyState === "live");
  if (!audioTracks.length) {
    display.getTracks().forEach((t) => t.stop());
    return {
      stream: new MediaStream(),
      backend: "screencapturekit",
      warning:
        "No system audio detected. Pick the meeting window or screen, enable audio sharing, and allow Screen Recording for Notewise in System Settings → Privacy.",
    };
  }

  const systemStream = new MediaStream(audioTracks);
  const label = audioTracks[0]?.label || "System audio";
  return {
    stream: systemStream,
    backend: "screencapturekit",
    meetingTabTitle: label,
    release: () => display.getTracks().forEach((t) => t.stop()),
  };
}

async function acquireMeetingSideAudio(): Promise<MeetingSide | null> {
  if (isDesktopShell()) {
    return acquireDesktopSystemAudio();
  }
  if (isChromeBrowser()) {
    return acquireDisplayMediaTabAudio();
  }
  return null;
}

function meetingWarningText(side: MeetingSide | null): string | undefined {
  if (!side?.warning) return undefined;
  if (side.warning === "cancelled" || side.warning === "system_audio_skipped") {
    if (isDesktopShell()) {
      return "Meeting audio skipped — mic only. To capture others, share a window/screen with audio when prompted and enable Screen Recording for Notewise.";
    }
    return "Meeting audio skipped — mic only. To capture Meet, allow tab audio when Chrome asks.";
  }
  return side.warning;
}

/**
 * Mic = You (left). Meeting tab / system = Them (right).
 * Desktop: ScreenCaptureKit via getDisplayMedia.
 * Web (default): mixed capture — mic hears speakers, no share picker.
 */
export async function acquireTwoChannelCapture(
  opts: CaptureOptions | boolean = {},
): Promise<TwoChannelCapture> {
  const options: CaptureOptions =
    typeof opts === "boolean" ? { preferSystem: opts } : opts;
  const desktop = isDesktopShell();
  const mixed = !desktop && Boolean(options.mixedSpeakers);
  const preferSystem = desktop && options.preferSystem !== false;

  if (mixed) {
    const micStream = await acquireMic(false, true);
    return {
      recordStream: micStream,
      micStream,
      systemStream: null,
      channelMode: "mix",
      backend: "mix",
    };
  }

  // getDisplayMedia must be invoked during the click gesture — start it before any mic awaits.
  const meetingPromise = preferSystem ? acquireMeetingSideAudio() : Promise.resolve(null);
  const micPromise = acquireMic(preferSystem, false);
  const [micStream, meeting] = await Promise.all([micPromise, meetingPromise]);
  const warning = meetingWarningText(meeting);

  if (meeting?.stream.getAudioTracks().length) {
    return {
      recordStream: micStream,
      micStream,
      systemStream: meeting.stream,
      channelMode: "stereo",
      backend: meeting.backend,
      release: meeting.release,
      meetingTabTitle: meeting.meetingTabTitle,
      warning,
    };
  }

  meeting?.release?.();

  return {
    recordStream: micStream,
    micStream,
    systemStream: null,
    channelMode: "mono",
    backend: "mic",
    warning,
  };
}

export async function acquireCaptureStream(): Promise<MediaStream> {
  const cap = await acquireTwoChannelCapture(false);
  return cap.recordStream;
}
