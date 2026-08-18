import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Calendar,
  FileText,
  Mic,
  Monitor,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export type Feature = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  docId: string;
};

export const FEATURES: Feature[] = [
  {
    id: "capture",
    title: "Local capture",
    description: "Mic + system audio without a bot in your call. Works on web and macOS.",
    icon: Mic,
    docId: "capture",
  },
  {
    id: "receipts",
    title: "Notes with receipts",
    description: "Timestamp-linked claims. Unsupported statements never ship.",
    icon: FileText,
    docId: "notes-receipts",
  },
  {
    id: "modes",
    title: "Meeting modes",
    description: "Sales, investor, 1:1, standup — editable YAML packs.",
    icon: Sparkles,
    docId: "meeting-modes",
  },
  {
    id: "library",
    title: "Library & FTS",
    description: "Search every meeting on disk. Regenerate notes anytime.",
    icon: Search,
    docId: "library",
  },
  {
    id: "people",
    title: "Relationship AI",
    description: "People and companies with commitments, objections, and briefs.",
    icon: Users,
    docId: "people",
  },
  {
    id: "upcoming",
    title: "Prep & calendar",
    description: "Google Calendar sync, 10-minute reminders, AI prep briefs.",
    icon: Calendar,
    docId: "upcoming",
  },
  {
    id: "brain",
    title: "Meeting brain",
    description: "Ask across your library with cited answers.",
    icon: Brain,
    docId: "meeting-brain",
  },
  {
    id: "copilot",
    title: "Live copilot",
    description: "In-call suggestions, similarity-gated, budget-aware.",
    icon: Zap,
    docId: "copilot",
  },
  {
    id: "desktop",
    title: "macOS app",
    description: "Menu bar tray, overlay, bundled PyAI gateway.",
    icon: Monitor,
    docId: "desktop",
  },
  {
    id: "trust",
    title: "Trust by default",
    description: "Local SQLite, no telemetry, MIT open source.",
    icon: Shield,
    docId: "trust",
  },
];
