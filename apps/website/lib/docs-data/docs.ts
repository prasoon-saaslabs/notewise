export type DocSection = {
  id: string;
  title: string;
  summary: string;
  body: string[];
  tips?: string[];
};

export const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    summary: "Install Notewise and capture your first meeting in five minutes.",
    body: [
      "Notewise runs locally on your Mac. The PyAI gateway handles speech-to-text and note generation; the web or desktop UI is where you capture, review, and ask questions.",
      "Clone the repository, run `make setup`, then start the gateway (`make run`) and web UI (`make web`). Open http://127.0.0.1:5173, accept the recording consent prompt, pick a meeting mode, and press the mic.",
      "For the native experience, build the macOS app (`pnpm build:desktop:dmg`). The desktop bundle includes the gateway, menu bar tray, and floating capture overlay.",
    ],
    tips: [
      "Run `make doctor` to verify Python, Node, and your PyAI API key.",
      "Import sample calls from Library to explore the brain without a live meeting.",
    ],
  },
  {
    id: "capture",
    title: "Capture",
    summary: "Record meetings without a bot joining the call.",
    body: [
      "Notewise captures audio on your device — microphone plus system audio on macOS desktop — and streams it to PyAI Hear for live transcription. No bot appears in your Zoom, Meet, or Teams lobby.",
      "On the web, you can enable mixed capture to pick up speaker audio through the mic (echo cancellation off). On desktop, ScreenCaptureKit captures system audio when you grant Screen Recording permission.",
      "Stereo channel mode separates You vs Others when system audio is available. Mic-only fallback continues if screen recording is denied.",
    ],
    tips: [
      "Use the menu bar tray on desktop to start/stop without opening the main window.",
      "The mini capture overlay stays on top across workspaces and does not steal focus.",
    ],
  },
  {
    id: "notes-receipts",
    title: "Notes with receipts",
    summary: "Every claim links back to the transcript — unsupported statements are dropped.",
    body: [
      "When you stop recording, PyAI Recap generates structured notes: executive summary, takeaways, actions, objections, and open questions.",
      "Each claim includes timestamp chips. Click a chip to jump to the exact line in the transcript. A citation gate blocks claims that cannot be verified against what was actually said.",
      "The run-status card shows how many claims shipped vs were blocked, plus token spend and latency from PyAI Trace.",
    ],
  },
  {
    id: "meeting-modes",
    title: "Meeting modes",
    summary: "Shape how notes are extracted for different conversation types.",
    body: [
      "Modes are editable YAML packs under `modes/`: Sales discovery, Investor call, 1:1, and Standup. Each mode tells Recap which sections to prioritize.",
      "Pick a mode before you record on the Capture page. The mode ID is stored on the meeting and used when notes are regenerated.",
      "Modes are designed to be forked — add your own company vocabulary, compliance fields, or CRM handoff blocks.",
    ],
  },
  {
    id: "library",
    title: "Library & search",
    summary: "Full-text search across every meeting on your machine.",
    body: [
      "The Library lists all meetings stored in local SQLite, newest first. Search matches titles, snippets, and note content.",
      "Open a meeting to read AI notes, follow-up email drafts, scratchpad notes you typed during capture, and the full transcript with speaker labels.",
      "Regenerate notes from an existing transcript if you change modes or want a fresh pass after editing your scratchpad.",
    ],
  },
  {
    id: "people",
    title: "People & relationships",
    summary: "A meeting brain that remembers contacts across calls.",
    body: [
      "Notewise extracts people and companies from attendees and transcript mentions. Each entity gets a relationship page with meeting timeline, open commitments, and unresolved objections.",
      "AI synthesizes a relationship brief from your history: what they care about, open follow-ups, and suggested talking points for the next call.",
      "Quick-ask chips let you query the brain about a specific person without leaving the page.",
    ],
  },
  {
    id: "upcoming",
    title: "Upcoming calls & prep",
    summary: "Calendar-driven prep reminders and AI briefs before meetings start.",
    body: [
      "Connect Google Calendar to sync upcoming events. Notewise links attendee emails to entities in your brain and builds a prep brief per meeting.",
      "Ten minutes before a call, a reminder opens the prep page — not capture. Review brain summary, follow-ups, and add your own notes. Start recording only when the meeting begins.",
      "The Capture page shows your next meeting with a link to the full prep experience.",
    ],
  },
  {
    id: "meeting-brain",
    title: "Meeting brain",
    summary: "Ask questions across your library with citations.",
    body: [
      "The Meeting brain panel answers natural-language questions by retrieving relevant transcript chunks and synthesizing an answer with citations.",
      "Scope questions to a specific person when on their relationship page, or ask across your entire library from the header.",
      "Hold Alt+Space (where configured) for voice Q&A: Hear transcribes your question, retrieval finds evidence, Cast speaks the answer.",
    ],
  },
  {
    id: "copilot",
    title: "Live copilot",
    summary: "Non-activating suggestions during capture, gated by similarity and budget.",
    body: [
      "While recording, the live copilot watches for repeated objections, commitments, and questions. Suggestions appear in the capture pane without interrupting your flow.",
      "Similarity gating prevents noisy duplicates. Each meeting has a token budget so copilot stays predictable.",
      "Copilot is optional intelligence — your transcript and final notes are unchanged if you ignore every suggestion.",
    ],
  },
  {
    id: "desktop",
    title: "macOS desktop app",
    summary: "Menu bar app with bundled gateway and capture overlay.",
    body: [
      "The Notewise desktop app is PyAI-only: no Nest or Whisper path. The gateway starts automatically on launch; your API key is stored in Application Support.",
      "Tray menu: Open, Start/Stop recording, Library, Show/hide overlay, Settings, Quit. Closing the main window hides to the menu bar.",
      "First launch walks through microphone permission, screen recording guidance, and PyAI API key setup.",
    ],
  },
  {
    id: "trust",
    title: "Trust & privacy",
    summary: "Local-first by design — your data stays on your machine.",
    body: [
      "Audio is not stored at rest. Frames go to PyAI Hear for transcription and are discarded after processing.",
      "Transcripts, notes, entities, and embeddings live in SQLite on disk under your configured data directory. The gateway binds to 127.0.0.1 only.",
      "No accounts, no telemetry, no cloud backup. MIT licensed — audit the code yourself.",
    ],
    tips: [
      "Recording laws vary by region. Notewise asks for consent before the first capture.",
      "See the in-app Trust page for a live data-flow diagram.",
    ],
  },
];

export function getDoc(id: string) {
  return DOC_SECTIONS.find((d) => d.id === id);
}
