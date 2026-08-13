export type UserStory = {
  id: string;
  persona: string;
  role: string;
  title: string;
  situation: string;
  flow: string[];
  outcome: string;
  features: string[];
};

export const USER_STORIES: UserStory[] = [
  {
    id: "sales-discovery",
    persona: "Maya",
    role: "Account Executive",
    title: "Walk into discovery already briefed",
    situation:
      "Maya has a Google Meet with Acme Corp in ten minutes. She spoke with their VP twice last quarter but cannot remember every open thread.",
    flow: [
      "Notewise reminds her 10 minutes before the call and opens the prep brief.",
      "She reviews AI-generated context: last recap, open pricing objection, and suggested talking points.",
      "She adds two questions in prep notes, then joins Meet.",
      "At meeting start, she clicks Start recording from the tray. Live transcript fills the capture pane.",
      "After the call, notes ship with receipt chips. She clicks a chip to verify the budget timeline quote.",
    ],
    outcome:
      "Maya sends a follow-up the same day with accurate quotes. Acme moves to technical eval.",
    features: ["upcoming", "people", "capture", "notes-receipts"],
  },
  {
    id: "founder-investor",
    persona: "Jordan",
    role: "Startup founder",
    title: "Track every investor conversation",
    situation:
      "Jordan takes five investor calls a week. Each partner asks different diligence questions.",
    flow: [
      "Jordan records each call in Investor mode from the desktop menu bar.",
      "People pages accumulate for each fund partner with unresolved objections flagged.",
      "Before a partner meeting, Jordan asks the brain: “What did Sequoia ask about churn last time?”",
      "Cited answer pulls the exact transcript line with timestamp.",
    ],
    outcome:
      "Jordan never repeats stale metrics and closes the round with consistent narrative.",
    features: ["meeting-modes", "people", "meeting-brain", "desktop"],
  },
  {
    id: "manager-1-1",
    persona: "Sam",
    role: "Engineering manager",
    title: "1:1s that remember commitments",
    situation:
      "Sam runs weekly 1:1s with eight reports. Action items slip between conversations.",
    flow: [
      "Sam uses 1:1 mode and links each meeting to the report’s entity.",
      "Open commitments surface on the People page before each 1:1.",
      "During the call, copilot nudges when the same blocker is mentioned twice.",
      "After stop, actions list owners and due hints from the transcript.",
    ],
    outcome:
      "Reports feel heard. Sam’s team retro shows fewer dropped follow-ups.",
    features: ["meeting-modes", "people", "copilot", "notes-receipts"],
  },
  {
    id: "revops-standup",
    persona: "Alex",
    role: "RevOps lead",
    title: "Standups without another SaaS bill",
    situation:
      "Alex’s team wants meeting notes but procurement blocked another $15/seat tool.",
    flow: [
      "Alex deploys Notewise on a shared Mac mini — open source, self-hosted gateway.",
      "Standup mode produces yesterday / today / blockers sections automatically.",
      "Library search answers “what blockers did we mention this week?” across all standups.",
    ],
    outcome:
      "Leadership gets structured notes with zero recurring license cost.",
    features: ["meeting-modes", "library", "trust"],
  },
  {
    id: "consultant-privacy",
    persona: "Priya",
    role: "Independent consultant",
    title: "Client data never leaves the laptop",
    situation:
      "Priya’s clients require local processing. Cloud note-takers are not allowed.",
    flow: [
      "Priya uses the macOS DMG with bundled gateway bound to 127.0.0.1.",
      "She reviews the Trust page data-flow diagram with each new client.",
      "Audio is transcribed via PyAI but not stored at rest; SQLite stays on her disk.",
    ],
    outcome:
      "Priya passes security review and keeps a searchable brain per client engagement.",
    features: ["desktop", "trust", "library"],
  },
  {
    id: "research-interviews",
    persona: "Lee",
    role: "Product researcher",
    title: "User interviews with verifiable quotes",
    situation:
      "Lee runs 20 customer interviews for a roadmap bet. Stakeholders challenge anecdotal quotes.",
    flow: [
      "Lee captures each interview on the web with mixed speaker mode.",
      "Notes include receipt chips on every insight claim.",
      "Lee shares the library link internally; PMs click chips to hear context in transcript.",
      "Meeting brain answers: “How many users mentioned onboarding friction?”",
    ],
    outcome:
      "Roadmap prioritization uses evidence, not memory.",
    features: ["capture", "notes-receipts", "meeting-brain", "library"],
  },
];
