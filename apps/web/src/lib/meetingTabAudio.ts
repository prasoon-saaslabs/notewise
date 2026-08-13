/**
 * Optional Chrome extension bridge (tabCapture, no picker).
 * Primary Chrome path is getDisplayMedia in audio.ts — no extension required.
 */

const OG_EXTENSION_EVENT = "og-extension-ready";

type ChromeRuntime = {
  connect: (
    extensionId: string,
    info: { name: string },
  ) => {
    postMessage: (msg: unknown) => void;
    onMessage: {
      addListener: (cb: (msg: Record<string, unknown>) => void) => void;
    };
    onDisconnect: {
      addListener: (cb: () => void) => void;
    };
    disconnect: () => void;
  };
};

type ChromeWindow = Window & {
  chrome?: { runtime?: ChromeRuntime };
};

class PcmMediaStreamBridge {
  private readonly ctx: AudioContext;
  private readonly dest: MediaStreamAudioDestinationNode;
  private nextTime = 0;
  readonly stream: MediaStream;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 16000 });
    this.dest = this.ctx.createMediaStreamDestination();
    this.stream = this.dest.stream;
  }

  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  pushFrame(pcm16: ArrayBuffer) {
    const samples = new Int16Array(pcm16);
    if (!samples.length) return;
    const floats = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) floats[i] = samples[i]! / 32768;
    const buf = this.ctx.createBuffer(1, floats.length, 16000);
    buf.copyToChannel(floats, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.dest);
    const t = Math.max(this.nextTime, this.ctx.currentTime);
    src.start(t);
    this.nextTime = t + buf.duration;
  }

  stop() {
    void this.ctx.close();
  }
}

export type MeetingTabAudioHandle = {
  stream: MediaStream;
  tabTitle: string;
  stop: () => void;
};

let extensionId: string | null = null;
let bridgeInit = false;

export function initMeetingTabAudioBridge(): void {
  if (bridgeInit || typeof window === "undefined") return;
  bridgeInit = true;
  const w = window as Window & { __OG_EXTENSION_ID__?: string };
  if (w.__OG_EXTENSION_ID__) extensionId = w.__OG_EXTENSION_ID__;
  window.addEventListener(OG_EXTENSION_EVENT, (ev) => {
    const id = (ev as CustomEvent<{ extensionId?: string }>).detail?.extensionId;
    if (id) extensionId = id;
  });
}

export function isMeetingTabAudioExtensionAvailable(): boolean {
  return Boolean(extensionId);
}

export function isChromeBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) {
    return false;
  }
  return /Chrome\//i.test(navigator.userAgent) && !/Edg\//i.test(navigator.userAgent);
}

export async function startMeetingTabAudio(): Promise<MeetingTabAudioHandle | null> {
  if (!extensionId) return null;
  const chromeApi = (window as ChromeWindow).chrome?.runtime;
  if (!chromeApi?.connect) return null;

  const port = chromeApi.connect(extensionId, { name: "meeting-audio" });
  port.postMessage({ type: "START" });

  const bridge = new PcmMediaStreamBridge();
  void bridge.resume();

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: MeetingTabAudioHandle | null) => {
      if (settled) return;
      settled = true;
      if (!result) {
        port.disconnect();
        bridge.stop();
      }
      resolve(result);
    };

    const timeout = window.setTimeout(() => finish(null), 3000);

    port.onMessage.addListener((msg) => {
      if (msg.type === "STARTED") {
        window.clearTimeout(timeout);
        finish({
          stream: bridge.stream,
          tabTitle: String(msg.tabTitle || "Meeting tab"),
          stop: () => {
            try {
              port.postMessage({ type: "STOP" });
              port.disconnect();
            } catch {
              /* ignore */
            }
            bridge.stop();
          },
        });
        return;
      }
      if (msg.type === "PCM" && msg.pcm instanceof ArrayBuffer) {
        bridge.pushFrame(msg.pcm);
        return;
      }
      if (msg.type === "ERROR") {
        window.clearTimeout(timeout);
        finish(null);
      }
    });

    port.onDisconnect.addListener(() => {
      window.clearTimeout(timeout);
      if (!settled) finish(null);
    });
  });
}
