/**
 * Native macOS system audio (ScreenCaptureKit) — no browser share picker.
 */
import { isDesktopShell } from "../capture/desktopMiniWindow";

export type SystemAudioChunkEvent = {
  data_b64: string;
  sample_rate: number;
  channels: number;
};

let unlisten: (() => void) | null = null;
let pending = new Float32Array(0);
let nativeSampleRate = 48_000;
let queuedEvents: SystemAudioChunkEvent[] = [];
let flushScheduled = false;

function decodeBase64Float32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

function appendPending(chunk: Float32Array): void {
  if (!chunk.length) return;
  const copy = new Float32Array(chunk);
  if (!pending.length) {
    pending = copy;
    return;
  }
  const merged = new Float32Array(pending.length + copy.length);
  merged.set(pending);
  merged.set(copy, pending.length);
  pending = merged;
}

function mixToMono(samples: Float32Array, channels: number): Float32Array {
  if (channels <= 1) return samples;
  const frames = Math.floor(samples.length / channels);
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[i * channels + c]!;
    out[i] = sum / channels;
  }
  return out;
}

function flushQueuedEvents(): void {
  flushScheduled = false;
  if (!queuedEvents.length) return;
  const batch = queuedEvents;
  queuedEvents = [];
  for (const event of batch) {
    nativeSampleRate = event.sample_rate || 48_000;
    const channels = event.channels || 2;
    appendPending(mixToMono(decodeBase64Float32(event.data_b64), channels));
  }
  const maxSamples = nativeSampleRate * 30;
  if (pending.length > maxSamples) {
    pending = pending.subarray(pending.length - nativeSampleRate * 10);
  }
}

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  requestAnimationFrame(flushQueuedEvents);
}

export function getNativeSystemSampleRate(): number {
  return nativeSampleRate;
}

export function takeNativeSystemSamples(count: number): Float32Array {
  if (count <= 0 || pending.length === 0) return new Float32Array(count);
  const takenLen = Math.min(count, pending.length);
  const out = new Float32Array(count);
  out.set(pending.subarray(0, takenLen));
  pending = pending.subarray(takenLen);
  return out;
}

export async function armNativeSystemAudioListener(): Promise<void> {
  if (!isDesktopShell()) return;
  if (unlisten) return;
  const { listen } = await import("@tauri-apps/api/event");
  unlisten = await listen<SystemAudioChunkEvent>("system-audio-chunk", (event) => {
    queuedEvents.push(event.payload);
    scheduleFlush();
  });
}

export async function disarmNativeSystemAudioListener(): Promise<void> {
  unlisten?.();
  unlisten = null;
  queuedEvents = [];
  flushScheduled = false;
  pending = new Float32Array(0);
}

export async function startNativeSystemAudioCapture(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  await armNativeSystemAudioListener();
  const { invoke } = await import("@tauri-apps/api/core");
  try {
    await invoke<string>("start_system_audio_capture", { deviceId: "system-sck" });
    return true;
  } catch (err) {
    console.warn("Native system audio failed", err);
    await disarmNativeSystemAudioListener();
    return false;
  }
}

export async function stopNativeSystemAudioCapture(): Promise<void> {
  if (!isDesktopShell()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("stop_system_audio_capture", { sessionToken: "started:ui" });
  } catch {
    /* ignore */
  }
  await disarmNativeSystemAudioListener();
}

export function resetNativeSystemAudioBuffer(): void {
  pending = new Float32Array(0);
  queuedEvents = [];
}
