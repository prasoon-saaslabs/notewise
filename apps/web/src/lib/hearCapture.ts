import { isDesktopShell } from "../capture/desktopMiniWindow";

const FRAME_SAMPLES = 320; // 20 ms @ 16 kHz per channel

export type HearFrameHandler = (pcmFrame: ArrayBuffer) => void;

export type HearMeters = { mic: number; system: number };

export type HearCaptureHandle = {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  context: AudioContext;
};

function floatToPcm16(s: number): number {
  const c = Math.max(-1, Math.min(1, s));
  return c < 0 ? (c * 0x8000) | 0 : (c * 0x7fff) | 0;
}

function downsampleChannel(input: Float32Array, inRate: number): Int16Array {
  if (inRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = floatToPcm16(input[i]!);
    return out;
  }
  const ratio = inRate / 16000;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    const s = input[i0]! * (1 - frac) + input[i1]! * frac;
    out[i] = floatToPcm16(s);
  }
  return out;
}

function rms(buf: Float32Array): number {
  if (!buf.length) return 0;
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i]! * buf[i]!;
  return Math.min(1, Math.sqrt(s / buf.length) * 4);
}

export type HearCaptureOpts = {
  systemStream?: MediaStream | null;
  /** Desktop native ScreenCaptureKit PCM (no MediaStream). */
  nativeSystemAudio?: boolean;
  stereo?: boolean;
  onMeters?: (levels: HearMeters) => void;
};

function resampleFloat32(input: Float32Array, inRate: number, outLen: number, outRate: number): Float32Array {
  if (!input.length || outLen <= 0) return new Float32Array(outLen);
  if (inRate === outRate && input.length === outLen) return input;
  const ratio = inRate / outRate;
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    out[i] = input[i0]! * (1 - frac) + input[i1]! * frac;
  }
  return out;
}

/**
 * Start mic (+ optional system) → PCM16 frames via ScriptProcessor.
 */
export async function startHearCapture(
  stream: MediaStream,
  onFrame: HearFrameHandler,
  opts?: HearCaptureOpts,
): Promise<HearCaptureHandle> {
  const nativeSystem = Boolean(opts?.nativeSystemAudio && isDesktopShell());
  let nativeAudio: typeof import("./nativeSystemAudio") | null = null;
  if (nativeSystem) {
    nativeAudio = await import("./nativeSystemAudio");
    nativeAudio.resetNativeSystemAudioBuffer();
  }

  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const context = new AC();
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      /* ignore */
    }
  }

  const tracks = stream.getAudioTracks();
  if (!tracks.length || tracks.every((t) => t.readyState !== "live" || !t.enabled)) {
    throw new Error("Microphone track is not live. Check browser mic permissions.");
  }

  const stereo =
    Boolean(opts?.stereo && (opts.systemStream?.getAudioTracks().length || nativeSystem));
  const micSource = context.createMediaStreamSource(stream);
  const sysSource =
    stereo && opts?.systemStream && !nativeSystem
      ? context.createMediaStreamSource(opts.systemStream)
      : null;
  const merger = context.createChannelMerger(2);
  micSource.connect(merger, 0, 0);
  if (sysSource) sysSource.connect(merger, 0, 1);

  const bufferSize = 4096;
  const processor = context.createScriptProcessor(bufferSize, stereo ? 2 : 1, stereo ? 2 : 1);
  let pending = new Int16Array(0);
  let paused = false;
  const channels = stereo ? 2 : 1;

  processor.onaudioprocess = (ev) => {
    if (paused) return;
    const left = ev.inputBuffer.getChannelData(0);
    let right = stereo ? ev.inputBuffer.getChannelData(1) : left;
    if (nativeSystem && nativeAudio) {
      const sysRate = nativeAudio.getNativeSystemSampleRate();
      const needSys = Math.max(1, Math.ceil(left.length * (sysRate / context.sampleRate)));
      const sysRaw = nativeAudio.takeNativeSystemSamples(needSys);
      right = new Float32Array(
        resampleFloat32(sysRaw, sysRate, left.length, context.sampleRate),
      );
    }
    opts?.onMeters?.({ mic: rms(left), system: stereo ? rms(right) : 0 });

    const l16 = downsampleChannel(left, context.sampleRate);
    const r16 = stereo ? downsampleChannel(right, context.sampleRate) : l16;
    const n = Math.min(l16.length, r16.length);
    const pcm = new Int16Array(n * channels);
    if (stereo) {
      for (let i = 0; i < n; i++) {
        pcm[i * 2] = l16[i]!;
        pcm[i * 2 + 1] = r16[i]!;
      }
    } else {
      pcm.set(l16.subarray(0, n));
    }

    const merged = new Int16Array(pending.length + pcm.length);
    merged.set(pending);
    merged.set(pcm, pending.length);
    const frameLen = FRAME_SAMPLES * channels;
    let offset = 0;
    while (offset + frameLen <= merged.length) {
      const frame = merged.slice(offset, offset + frameLen);
      offset += frameLen;
      onFrame(frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength));
    }
    pending = merged.slice(offset);
  };

  const mute = context.createGain();
  mute.gain.value = 0;
  merger.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);

  return {
    context,
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
      if (context.state === "suspended") void context.resume();
    },
    stop: () => {
      paused = true;
      try {
        processor.disconnect();
        micSource.disconnect();
        sysSource?.disconnect();
        merger.disconnect();
        mute.disconnect();
      } catch {
        /* ignore */
      }
      void context.close();
    },
  };
}

export type HearStreamClient = {
  ws: WebSocket;
  sendPcm: (buf: ArrayBuffer) => void;
  commit: () => void;
  close: () => void;
};

export function connectHearStream(
  url: string,
  handlers: {
    onPartial?: (text: string) => void;
    onFinal?: (text: string, frame: Record<string, unknown>) => void;
    onReady?: (callId: string) => void;
    onError?: (message: string) => void;
  },
): HearStreamClient {
  const ws = new WebSocket(url);
  ws.binaryType = "arraybuffer";
  const queue: ArrayBuffer[] = [];
  let ready = false;
  /** PyAI often emits speech_final then final for the same utterance — track to dedupe. */
  let lastSpeechFinal = "";

  const flushQueue = () => {
    while (queue.length && ws.readyState === WebSocket.OPEN) {
      const buf = queue.shift();
      if (buf) ws.send(buf);
    }
  };

  ws.onopen = () => {
    ready = true;
    flushQueue();
  };

  ws.onmessage = (ev) => {
    if (typeof ev.data !== "string") return;
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(ev.data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = frame.type as string;
    if (type === "ready") {
      handlers.onReady?.(String(frame.call_id ?? ""));
      return;
    }
    if (type === "partial" || type === "partial_stable") {
      handlers.onPartial?.(String(frame.text ?? ""));
      return;
    }
    if (type === "speech_final") {
      const text = String(frame.text ?? "").trim();
      if (text) {
        lastSpeechFinal = text;
        handlers.onFinal?.(text, frame);
      }
      return;
    }
    if (type === "final") {
      const text = String(frame.text ?? "").trim();
      if (text && text !== lastSpeechFinal) {
        handlers.onFinal?.(text, frame);
      }
      lastSpeechFinal = "";
      return;
    }
    if (type === "error") {
      const code = String(frame.code ?? "");
      const message = String(frame.message ?? (code || "Hear stream error"));
      handlers.onError?.(code === "rate_limit" ? `rate_limit: ${message}` : message);
    }
  };

  ws.onerror = () => {
    handlers.onError?.("Hear WebSocket error");
  };

  return {
    ws,
    sendPcm: (buf) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(buf);
        return;
      }
      if (!ready && queue.length < 250) queue.push(buf);
    },
    commit: () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "commit" }));
      }
    },
    close: () => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "commit" }));
        }
        ws.close();
      } catch {
        /* ignore */
      }
    },
  };
}
