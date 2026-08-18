export const SITE = {
  name: "NoteWise",
  tagline: "The meeting brain that remembers your relationships — and talks back.",
  description:
    "Free, open-source, local-first meeting assistant for macOS. Bot-free capture, notes with transcript receipts, cross-meeting memory, live copilot, and voice Q&A — powered by PyAI.",
  positioning:
    "Granola remembers your meetings. NoteWise remembers your relationships — and you can talk to it.",
} as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Memory", href: "#memory" },
  { label: "Privacy", href: "#privacy" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO = {
  eyebrow: "Free · MIT · local-first · macOS menu bar + local web",
  headline: "The meeting brain that remembers your relationships",
  headlineAccent: "and talks back.",
  description:
    "Capture calls without a bot. Every claim links to the transcript. Remember people and companies across every meeting — and ask your memory out loud.",
  ctaPrimary: "Download for macOS",
  ctaSecondary: "View on GitHub",
  footnote: "git clone → first transcript in under 5 minutes · No account required",
} as const;

export const STATS = [
  { value: 5, prefix: "<", suffix: " min", label: "to first transcript" },
  { value: 0, prefix: "", suffix: "", label: "bots in your call" },
  { value: 100, prefix: "", suffix: "%", label: "claims must cite proof" },
  { value: 6, prefix: "", suffix: "+", label: "meeting modes" },
  { value: 0, prefix: "", suffix: "", label: "cloud storage from us", display: "MIT" },
] as const;

export const PIPELINE_STAGES = [
  {
    id: "capture",
    label: "Capture",
    title: "Dual-channel, bot-free",
    description: "Menu-bar capture splits mic and system audio — perfect speaker separation without a bot in your waiting room.",
  },
  {
    id: "transcribe",
    label: "Transcribe",
    title: "Live transcript stream",
    description: "Words appear as people speak. Every line tagged to a speaker, timestamped, and stored locally on your disk.",
  },
  {
    id: "extract",
    label: "Extract",
    title: "Raw speech → cited notes",
    description: "Decisions, objections, and action items morph out of the transcript — each with a timestamp chip or the citation gate blocks it.",
  },
  {
    id: "remember",
    label: "Remember",
    title: "Relationship memory",
    description: "Meetings connect into persistent relationship pages — topics, commitments, and patterns across every call with Acme.",
  },
] as const;

export const HERO_DEMO = {
  stages: ["Prep", "Capture", "Transcribe", "Notes"] as const,
  newMeetingTitle: "New Meeting",
  meetingTitle: "Standup Meeting",
  transcript: [
    {
      speaker: "Others",
      kind: "other" as const,
      text: "The customer shared their experience working with engineers to gather, clean, and visualize data through Tableau, which was a strong project and a good managerial experience.",
    },
    {
      speaker: "Others",
      kind: "other" as const,
      text: "They also discussed their weakness in prioritizing tasks when faced with multiple high-priority projects.",
    },
  ],
  interim: "one in that case would be one",
  summary:
    "The customer shared their experience working with engineers to gather, clean, and visualize data through Tableau, which was a strong project and a good managerial experience. They also discussed their weakness in prioritizing tasks when faced with multiple high-priority projects.",
  upcomingMeetings: [
    {
      title: "Jira Tickets Review",
      when: "Mon 17 Aug, 11:30",
      until: "2 days 18 hours 32 min",
      tag: "platform",
    },
    {
      title: "Frontend Standup",
      when: "Mon 17 Aug, 13:30",
      until: "2 days 20 hours 32 min",
    },
  ],
  todayMeetings: [{ title: "Frontend Standup", time: "16:56" }],
  citedNotes: [
    { text: "Pilot delayed pending legal sign-off", time: "14:22" },
    { text: "Meera to send SOC 2 report by Friday", time: "14:31" },
    { text: "SAML scoped for Q4 enterprise pilot", time: "14:38" },
  ],
  memoryNodes: [
    { id: "jul", label: "Jul 14", topic: "SSO" },
    { id: "aug2", label: "Aug 2", topic: "Audit logs" },
    { id: "aug11", label: "Aug 11", topic: "SOC 2" },
  ],
} as const;

export const GALLERY_STATS = [
  "9 calls tracked",
  "4 open commitments",
  "12 calls logged",
  "6 clients · local only",
  "3 recurring 1:1s",
  "18 deals in memory",
] as const;

export const MARQUEE = {
  label: "Built for the gap between Granola and Gong",
  items: [
    "Bot-free capture",
    "Notes with receipts",
    "Cross-meeting memory",
    "Pre-call briefs",
    "Live copilot",
    "Voice Q&A",
    "MIT licensed",
    "Local-first",
    "PyAI powered",
  ],
} as const;

export const MEETING_PHASES = [
  {
    id: "before",
    label: "Before the call",
    title: "Walk in prepared",
    description:
      "When a recording starts with a known company, NoteWise surfaces a pre-call brief: last conversation recap, open commitments both ways, unresolved objections, and a suggested agenda — so you sound ready without twenty minutes of note archaeology.",
  },
  {
    id: "during",
    label: "During the call",
    title: "Quiet help, never stealing focus",
    description:
      "A non-activating live copilot flags repeated objections with how you answered last time, tracks agenda coverage, and detects commitments in real time. It only fires when retrieval clears a similarity threshold — never interrupting your client.",
  },
  {
    id: "after",
    label: "After the call",
    title: "Notes you can actually trust",
    description:
      "Decisions, objections, and action items — each with owner, due date, and a timestamp chip that jumps to the transcript line. A citation gate blocks any claim without proof. Export to Markdown, JSON, or share link.",
  },
] as const;

export const VISUAL_STORY = {
  eyebrow: "Cross-meeting memory",
  title: "The relationship is the unit — not the meeting.",
  description:
    "People and companies get persistent relationship pages: timelines, topics, and open items across every call. Ask what Acme said about security across six months of conversations — get one synthesized, fully cited answer.",
  bullets: [
    "Local vector index — query everything on your disk",
    "Every bullet cites meeting + timestamp",
    "Works offline for anything already captured",
  ],
  cardLabel: "Voice Q&A · cited answer",
  cardBody:
    "Acme raised SSO three times. Jul 14: needs SAML by Q4. Aug 2: asked about audit logs. Aug 11: wants SOC 2 report before pilot.",
} as const;

export const GALLERY = {
  eyebrow: "Built for how you actually work",
  title: "Founders, sellers, and consultants — one local memory",
  description:
    "Six to ten calls a day. Thirty open deals. Six clients with confidentiality clauses. NoteWise adapts to the persona, not the other way around.",
  captions: [
    "Founder stand-ups",
    "Investor calls",
    "Sales discovery",
    "Client workshops",
    "1:1s & hiring",
    "Remote deal reviews",
  ],
} as const;

export const SHOWCASE = {
  eyebrow: "Notes with receipts",
  title: "No claim ships without proof",
  description:
    "When a call ends, NoteWise extracts decisions, objections, and action items per your meeting mode. Every statement carries a timestamp chip — or the citation gate blocks it.",
  transcriptSnippet:
    "[14:22] Priya: Can we push the pilot until legal signs off on the terms page?",
  citedOutput:
    "Pilot delayed pending legal sign-off on terms page. Meera to send SOC 2 report by Friday.",
  memorySnippet:
    "Across 6 Acme calls: SSO raised 3× · open promise: SOC 2 report · last objection: pricing tiers",
} as const;

export const FEATURES = [
  {
    icon: "video" as const,
    title: "One-click, bot-free capture",
    description:
      "macOS menu-bar app captures mic and system audio as separate channels — perfect speaker separation, no bot in your waiting room, no audio stored in our cloud.",
  },
  {
    icon: "check" as const,
    title: "Notes with receipts",
    description:
      "Every decision, objection, and action item links to the exact transcript moment. Unproven claims are blocked by the citation gate — not shipped with a shrug.",
  },
  {
    icon: "calendar" as const,
    title: "Meeting modes",
    description:
      "Sales discovery, investor call, 1:1, standup — each mode is a prompt + schema pair in editable config files. Fork the repo and add your own.",
  },
  {
    icon: "message" as const,
    title: "Ask across every meeting",
    description:
      "What has Acme said about security across all our calls? One synthesized answer where every bullet cites meeting and timestamp.",
  },
  {
    icon: "users" as const,
    title: "Relationship pages",
    description:
      "People and companies as persistent entities — timelines, topics, open commitments, and pre-call briefs derived from your local memory.",
  },
  {
    icon: "lock" as const,
    title: "Trust you can audit",
    description:
      "MIT-licensed repo, local SQLite store, run-status per processing job, and a data-flow page showing exactly what leaves your machine.",
  },
] as const;

export const TESTIMONIALS = [
  {
    quote:
      "Prep time per call dropped from twenty minutes of note-archaeology to under two. I asked out loud what Acme said about security and got a three-point, fully cited answer walking to the review.",
    author: "Meera K.",
    role: "Founder · 9-person startup",
  },
  {
    quote:
      "A champion's boss asked about implementation time — the same objection from five weeks ago. The copilot showed my prior answer; I repeated the framing and the room read it as competence, not luck.",
    author: "Arjun S.",
    role: "Account Executive",
  },
  {
    quote:
      "My banking client banned cloud notetakers. I sent them the repo and data-flow page — first AI tool their security team ever cleared. Follow-ups take two minutes to edit, not twenty to write.",
    author: "Sana P.",
    role: "Independent consultant",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "How is NoteWise different from Granola or Otter?",
    answer:
      "Granola and Otter treat each meeting as the unit — intelligence stays trapped inside single calls, and most send audio to their cloud. NoteWise is local-first, MIT open source, organizes around relationships over time, and requires a transcript citation for every generated claim.",
  },
  {
    question: "Does a bot join my Zoom or Meet call?",
    answer:
      "Never. NoteWise captures from your menu bar using separate mic and system-audio channels. No bot in the waiting room, no awkward participant, no client compliance fight.",
  },
  {
    question: "Where does my data live?",
    answer:
      "Transcripts, embeddings, entities, and notes live in a SQLite file on your disk. Audio streams only to the STT endpoint you configure; text goes only to your LLM endpoint. No account, no telemetry, no cloud storage from us.",
  },
  {
    question: "What are “notes with receipts”?",
    answer:
      "Every decision, objection, and action item in your notes includes a timestamp chip that jumps to the transcript line. If a claim can't be traced to the transcript, the citation gate blocks it — you'll see it in the run-status card, not in your notes.",
  },
  {
    question: "Which platforms are supported today?",
    answer:
      "MVP ships macOS menu-bar capture plus a local web app at 127.0.0.1. Windows, Linux, and mobile companions are on the roadmap after macOS proves the loop — deliberately not in scope for the hackathon build.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes. MIT licensed and free to use. You bring your own PyAI API keys; the app itself costs nothing. Open source is how we earn the trust a “your audio, your machine” claim requires.",
  },
] as const;

export const TRUST_PILLS = [
  "Local-first storage",
  "MIT open source",
  "Citation gate",
  "No meeting bot",
] as const;

export const PRIVACY = {
  title: "Trust is the product",
  description:
    "The repo is the audit. See exactly what leaves your machine, what every run cost, and whether every claim passed the citation gate — so you can defend NoteWise to your most paranoid client.",
} as const;

export const FINAL_CTA = {
  title: "Clone it. Capture a call. Talk to your memory.",
  description:
    "Free, local-first, and open source. macOS menu bar + local web UI. First transcript in under five minutes.",
  ctaPrimary: "Download for macOS",
  ctaSecondary: "Star on GitHub",
  footnote: "MIT licensed · Powered by PyAI Hear, Recap, Cast, Clone & Trace",
} as const;

export const FOOTER = {
  blurb:
    "The meeting brain that remembers your relationships — and talks back. Built by SaaS Labs.",
  tagline: "Free · open source · local-first",
} as const;

/** @deprecated use MARQUEE.items */
export const LOGO_NAMES = MARQUEE.items;
