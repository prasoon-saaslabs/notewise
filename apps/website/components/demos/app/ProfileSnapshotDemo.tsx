"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STATS = [
  { label: "Meetings", value: "31" },
  { label: "Contacts", value: "3 in your brain" },
  { label: "Open items", value: "0 follow-ups" },
  { label: "Upcoming", value: "— connect calendar" },
];

export function ProfileSnapshotDemo({
  progress = 1,
  className,
}: {
  progress?: number;
  className?: string;
}) {
  const p = Math.min(Math.max(progress, 0), 1);

  return (
    <div className={cn("space-y-3 p-4", className)}>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: p > i * 0.12 ? 1 : 0, y: p > i * 0.12 ? 0 : 8 }}
            className="rounded-2xl border border-border bg-paper-elevated px-3 py-2.5"
          >
            <p className="m-0 text-[0.58rem] font-bold uppercase tracking-wider text-ink-muted">
              {stat.label}
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-ink">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: p > 0.45 ? 1 : 0, y: p > 0.45 ? 0 : 10 }}
        className="overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-subtle to-paper-elevated"
      >
        <div className="flex items-center justify-between gap-2 border-b border-teal/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-teal" />
            <p className="m-0 text-xs font-semibold text-ink">AI intelligence snapshot</p>
          </div>
          <span className="rounded-full bg-teal-muted px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-teal-hover">
            AI generated
          </span>
        </div>
        <p className="m-0 px-3 py-3 text-xs leading-relaxed text-ink-secondary">
          Acme raised SSO three times across six calls. Open promise: SOC 2 report. Last objection:
          pricing tiers — usage-based pilot still on the table.
        </p>
      </motion.div>
    </div>
  );
}
