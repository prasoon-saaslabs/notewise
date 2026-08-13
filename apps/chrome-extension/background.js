/** Routes tab capture between Notewise web app and offscreen document. */

const OFFSCREEN_URL = "offscreen.html";
const MEETING_RE =
  /meet\.google\.com|teams\.(microsoft|live)\.com|zoom\.us|webex\.com|whereby\.com/i;

let activePort = null;

async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  if (!existing.length) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: ["USER_MEDIA"],
      justification: "Capture meeting tab audio for Notewise transcription",
    });
  }
}

async function findMeetingTabId() {
  const audible = await chrome.tabs.query({ audible: true });
  const meetingAudible = audible.filter((t) => t.url && MEETING_RE.test(t.url));
  if (meetingAudible.length) return meetingAudible[0].id;

  const meetingTabs = await chrome.tabs.query({
    url: [
      "*://meet.google.com/*",
      "*://teams.microsoft.com/*",
      "*://teams.live.com/*",
      "*://*.zoom.us/*",
      "*://*.webex.com/*",
    ],
  });
  if (!meetingTabs.length) return undefined;
  return (meetingTabs.find((t) => t.active) || meetingTabs[0]).id;
}

async function startTabCapture(port) {
  const tabId = await findMeetingTabId();
  if (!tabId) {
    port.postMessage({
      type: "ERROR",
      message: "No meeting tab found — open Google Meet, Teams, or Zoom in another tab.",
    });
    return;
  }

  await ensureOffscreen();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  const tab = await chrome.tabs.get(tabId);
  const res = await chrome.runtime.sendMessage({
    target: "offscreen",
    type: "START_CAPTURE",
    streamId,
  });
  if (!res?.ok) {
    port.postMessage({
      type: "ERROR",
      message: res?.error || "Could not capture meeting tab audio.",
    });
    return;
  }
  port.postMessage({ type: "STARTED", tabTitle: tab.title || "Meeting tab" });
}

function stopTabCapture() {
  chrome.runtime.sendMessage({ target: "offscreen", type: "STOP_CAPTURE" }).catch(() => undefined);
}

chrome.runtime.onConnectExternal.addListener((port) => {
  if (port.name !== "meeting-audio") return;
  activePort = port;

  port.onMessage.addListener((msg) => {
    if (msg?.type === "START") void startTabCapture(port);
    if (msg?.type === "STOP") stopTabCapture();
  });

  port.onDisconnect.addListener(() => {
    stopTabCapture();
    if (activePort === port) activePort = null;
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "PCM_FRAME" && activePort && msg.pcm) {
    try {
      activePort.postMessage({ type: "PCM", pcm: msg.pcm }, [msg.pcm]);
    } catch {
      activePort.postMessage({ type: "PCM", pcm: msg.pcm });
    }
  }
});
