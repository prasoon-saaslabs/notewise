"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { LiveTranscriptDemo } from "@/components/demos/LiveTranscriptDemo";
import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { PhaseStepperDemo } from "@/components/demos/app/PhaseStepperDemo";
import { chipPop } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Phase = "before" | "during" | "after";

export function MeetingBriefMock({
  phase,
  className,
  animated = false,
}: {
  phase: Phase;
  className?: string;
  animated?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && !prefersReducedMotion;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-border bg-paper-elevated shadow-[0_20px_60px_rgba(13,148,136,0.08)]",
        className,
      )}
    >
      {phase === "before" && (
        <>
          <div className="border-b border-teal/10 bg-gradient-to-br from-teal-subtle/60 to-white px-4 py-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-teal">
              Pre-call brief
            </p>
            <h4 className="mt-1 font-display text-lg text-ink">Acme Corp — security review</h4>
          </div>
          <div className="space-y-3 p-4 text-sm">
            {[
              "SSO objection raised twice. Open promise: SOC 2 report you said you'd send.",
              "Suggested opener: acknowledge the SOC 2 delay before pricing comes up again.",
            ].map((text, i) => (
              <motion.div
                key={text}
                initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: i * 0.12 }}
                className="rounded-2xl border border-border bg-white/80 px-3 py-2.5 text-xs leading-relaxed text-ink-secondary"
              >
                {text}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {phase === "during" && (
        <>
          <div className="flex items-center gap-2 border-b border-teal/10 bg-white/70 px-4 py-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-teal-muted text-teal-hover">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="m-0 text-sm font-semibold text-ink">AI workspace</p>
              <p className="m-0 text-[0.68rem] text-ink-muted">Live copilot + memory search</p>
            </div>
          </div>
          <motion.div
            initial={shouldAnimate ? { opacity: 0, scale: 0.98 } : false}
            animate={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
            className="mx-4 mt-3 rounded-2xl border border-amber-200/60 bg-amber-50/80 p-3 text-xs text-ink-secondary"
          >
            <p className="font-medium text-amber-900/80">Repeated objection · pricing tiers</p>
            <p className="mt-1">Raised Jul 28 — your answer: usage-based tiers, 2-week pilot.</p>
          </motion.div>
          <LiveTranscriptDemo active={shouldAnimate} activeLine={1} className="mt-2" />
        </>
      )}

      {phase === "after" && (
        <>
          <PhaseStepperDemo activeIndex={3} />
          <LibraryNotesDemo animate={shouldAnimate} />
        </>
      )}
    </div>
  );
}
