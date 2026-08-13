/** Headset / earphone-friendly microphone selection. */

import { isDesktopShell } from "../capture/desktopMiniWindow";
import { ensureDesktopMicrophoneAccess } from "./desktopPermissions";

const HEADSET_LABEL_RE =
  /headset|headphone|earphone|earbud|airpod|buds|bluetooth|usb audio|external|hands[- ]?free|jabra|plantronics|poly|logitech|beats|sony wh|bose|sennheiser/i;

export type MicCaptureOptions = {
  /** When meeting audio is on a separate channel, disable echo cancellation on mic. */
  separateMeetingTrack?: boolean;
  /** Web mixed-capture: mic hears laptop speakers (echo cancellation off). */
  mixedCapture?: boolean;
};

export function isHeadsetLikeLabel(label: string): boolean {
  return HEADSET_LABEL_RE.test(label);
}

export async function acquirePreferredMic(
  opts?: MicCaptureOptions,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not support microphone capture.");
  }

  if (isDesktopShell()) {
    const access = await ensureDesktopMicrophoneAccess({ skipProbe: true });
    if (!access.ok) {
      throw new DOMException(access.message ?? "Microphone access denied", "NotAllowedError");
    }
  }

  const separate = Boolean(opts?.separateMeetingTrack) && !opts?.mixedCapture;
  const mixed = Boolean(opts?.mixedCapture);
  const base: MediaTrackConstraints = mixed
    ? {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      }
    : {
        echoCancellation: !separate,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      };

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: base });
  } catch (firstErr) {
    if (
      isDesktopShell() &&
      firstErr instanceof DOMException &&
      (firstErr.name === "NotAllowedError" || firstErr.name === "PermissionDeniedError")
    ) {
      throw firstErr;
    }
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput" && d.deviceId);
    if (!inputs.length) return stream;

    const currentId = stream.getAudioTracks()[0]?.getSettings().deviceId;
    const communications = inputs.find((d) => d.deviceId === "communications");
    const headset = inputs.find((d) => isHeadsetLikeLabel(d.label));
    const preferred = communications ?? headset;
    if (!preferred?.deviceId || preferred.deviceId === currentId) return stream;

    stream.getTracks().forEach((t) => t.stop());
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { ...base, deviceId: { exact: preferred.deviceId } },
      });
    } catch (switchErr) {
      if (switchErr instanceof DOMException && switchErr.name === "NotAllowedError") {
        throw switchErr;
      }
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  } catch (err) {
    if (err instanceof DOMException) throw err;
    return stream;
  }
}
