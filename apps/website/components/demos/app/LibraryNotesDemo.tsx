"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { chipPop } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function LibraryNotesDemo({
  animate = true,
  className,
}: {
  animate?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <div className="rounded-2xl border border-border bg-paper-muted p-3 text-xs text-ink-secondary">
        <p className="m-0 font-bold uppercase tracking-wider text-ink-muted">
          Run status
        </p>
        <p className="mt-1 m-0">
          Exit <b>ok</b> · 6 cited · 0 blocked
        </p>
        <p className="mt-1 m-0 text-ink-muted">1,842 tokens · $0.0041 · 4.2s</p>
      </div>

      <div className="rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-subtle/80 to-white p-3">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-teal" />
          <p className="m-0 text-xs font-semibold text-ink">Call summary</p>
        </div>
        <p className="m-0 text-xs leading-relaxed text-ink-secondary">
          Pilot delayed pending legal sign-off on terms page. SAML scoped for Q4
          enterprise pilot.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Action items
        </p>
        <ul className="space-y-2">
          {[
            {
              text: "Send SOC 2 report by Friday",
              owner: "Meera",
              time: "0:31",
            },
            {
              text: "Legal follow-up on terms page",
              owner: "Priya",
              time: "0:22",
            },
          ].map((item, i) => (
            <motion.li
              key={item.text}
              variants={chipPop}
              initial={animate ? "hidden" : false}
              animate={animate ? "visible" : undefined}
              transition={{ delay: i * 0.12 }}
              className="text-xs leading-relaxed text-ink-secondary"
            >
              {item.text}
              <span className="ml-1 rounded-full bg-paper-muted px-1.5 py-0.5 text-[0.6rem] font-bold uppercase">
                {item.owner}
              </span>
              <button
                type="button"
                className="ml-1 rounded-full bg-teal/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-teal"
              >
                {item.time}
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
