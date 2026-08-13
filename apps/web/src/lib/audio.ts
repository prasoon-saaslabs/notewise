import { pickRecorderMimeType, createAudioRecorder, recorderExtension } from "./audioCore";
export { pickRecorderMimeType, createAudioRecorder, recorderExtension };

import { isChromeBrowser } from "./meetingTabAudio";
import { acquirePreferredMic } from "./micCapture";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { shouldUseMeetingAudio } from "./desktopPermissions";

export type ChannelMode = "mono" | "stereo" | "mix";

export type TwoChannelCapture = {
  recordStream: MediaStream;
  micStream: MediaStream;
  systemStream: MediaStream | null;
  channelMode: ChannelMode;
  backend: "screencapturekit" | "tab-capture" | "mic" | "mix";
  /** Desktop: system audio via native ScreenCaptureKit (not getDisplayMedia). */
  nativeSystemAudio?: boolean;
  release?: () => void;
  meetingTabTitle?: string;
  /** Shown when meeting audio failed but mic still works. */
  warning?: string;
};

export type CaptureOptions = {
  /** Desktop: request native system audio when Screen Recording is granted. */
  preferSystem?: boolean;
  /** Web: mic hears laptop speakers — no share picker. */
  mixedSpeakers?: boolean;
};

type MeetingSide = {
  stream: MediaStream;
  backend: "screencapturekit" | "tab-capture";
  native?: boolean;
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
    backend: "tab-capture",
    meetingTabTitle: label,
    release: () => display.getTracks().forEach((t) => t.stop()),
  };
}

/**
 * macOS desktop: native ScreenCaptureKit via Tauri — only when TCC already granted.
 */
async function acquireDesktopNativeSystemAudio(): Promise<MeetingSide | null> {
  if (!(await shouldUseMeetingAudio())) return null;
  return {
    stream: new MediaStream(),
    backend: "screencapturekit",
    native: true,
    meetingTabTitle: "System audio",
  };
}

async function acquireMeetingSideAudio(): Promise<MeetingSide | null> {
  if (isDesktopShell()) {
    return acquireDesktopNativeSystemAudio();
  }
  if (isChromeBrowser()) {
    return acquireDisplayMediaTabAudio();
  }
  return null;
}

function meetingWarningText(side: MeetingSide | null): string | undefined {
  if (!side?.warning) return undefined;
  if (side.warning === "cancelled" || side.warning === "system_audio_skipped") {
    if (isDesktopShell()) return undefined;
    return "Meeting audio skipped — mic only. To capture Meet, allow tab audio when Chrome asks.";
  }
  return side.warning;
}

/**
 * Mic = You (left). Meeting / system = Them (right).
 * Desktop: native ScreenCaptureKit (Tauri). Web: tab audio or mixed capture.
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

  const meetingPromise = preferSystem ? acquireMeetingSideAudio() : Promise.resolve(null);
  const micPromise = acquireMic(preferSystem, false);
  const [micStream, meeting] = await Promise.all([micPromise, meetingPromise]);
  const warning = meetingWarningText(meeting);

  if (meeting?.native) {
    return {
      recordStream: micStream,
      micStream,
      systemStream: null,
      channelMode: "stereo",
      backend: "screencapturekit",
      nativeSystemAudio: true,
      meetingTabTitle: meeting.meetingTabTitle,
      warning,
    };
  }

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
