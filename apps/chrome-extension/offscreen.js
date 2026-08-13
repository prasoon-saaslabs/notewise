/** Tab audio → PCM16 @ 16 kHz → background relay. */

const TARGET_RATE = 16000;
let state = null;

function floatToPcm16(s) {
  const c = Math.max(-1, Math.min(1, s));
  return c < 0 ? (c * 0x8000) | 0 : (c * 0x7fff) | 0;
}

function downsampleToPcm16(input, inRate) {
  if (inRate === TARGET_RATE) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = floatToPcm16(input[i]);
    return out;
  }
  const ratio = inRate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = src - i0;
    const s = input[i0] * (1 - frac) + input[i1] * frac;
    out[i] = floatToPcm16(s);
  }
  return out;
}

function stopCapture() {
  if (!state) return;
  try {
    state.processor?.disconnect();
    state.source?.disconnect();
    state.mute?.disconnect();
    state.stream?.getTracks().forEach((t) => t.stop());
    void state.ctx?.close();
  } catch {
    /* ignore */
  }
  state = null;
}

async function startCapture(streamId) {
  stopCapture();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  const ctx = new AudioContext();
  if (ctx.state === "suspended") await ctx.resume();

  const source = ctx.createMediaStreamSource(stream);
  // Keep the Meet tab audible (tabCapture otherwise mutes).
  source.connect(ctx.destination);

  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  processor.onaudioprocess = (ev) => {
    const input = ev.inputBuffer.getChannelData(0);
    const pcm = downsampleToPcm16(input, ctx.sampleRate);
    const buf = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
    chrome.runtime.sendMessage({ type: "PCM_FRAME", pcm: buf });
  };

  state = { stream, ctx, source, processor, mute };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return;
  if (msg.type === "START_CAPTURE") {
    startCapture(msg.streamId)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: String(e?.message || e) }));
    return true;
  }
  if (msg.type === "STOP_CAPTURE") {
    stopCapture();
    sendResponse({ ok: true });
    return true;
  }
});
