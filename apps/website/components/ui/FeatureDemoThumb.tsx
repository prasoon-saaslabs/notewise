"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { AppWaveform } from "@/components/demos/app/AppWaveform";
import { MiniCaptureDemo } from "@/components/demos/app/MiniCaptureDemo";
import { cn } from "@/lib/utils";

type FeatureIcon =
  | "video"
  | "check"
  | "calendar"
  | "message"
  | "users"
  | "lock";

export function FeatureDemoThumb({
  icon,
  active = false,
  className,
}: {
  icon: FeatureIcon;
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-t-[28px] border-b border-border bg-gradient-to-br from-teal-subtle/40 to-paper",
        className
      )}
    >
      {icon === "video" && (
        <div className="w-[72%] rounded-2xl border border-border/80 bg-white/70 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="nw-capture-mic is-live grid h-7 w-7 place-items-center">
              <span className="h-2 w-2 rounded-sm bg-white" />
            </span>
            <span className="font-mono text-[10px] font-semibold text-ink">
              00:14
            </span>
            <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-red-700">
              Live
            </span>
          </div>
          <AppWaveform active={active} bars={12} className="h-7" />
        </div>
      )}

      {icon === "check" && (
        <div className="w-[78%] rounded-2xl border border-border bg-white/80 p-3 text-[9px] text-ink-secondary shadow-sm">
          <p className="font-bold uppercase tracking-wider text-ink-muted">
            Run status
          </p>
          <p className="mt-1">6 cited · 0 blocked</p>
          <p className="mt-2">Send SOC 2 report by Friday</p>
          <span className="mt-1 inline-block rounded-full bg-teal/10 px-1.5 py-0.5 font-bold text-teal">
            0:31
          </span>
        </div>
      )}

      {icon === "calendar" && (
        <div className="flex flex-wrap justify-center gap-1.5 px-4">
          {["1:1", "Investor call", "Sales discovery", "Standup"].map(
            (mode, i) => (
              <span
                key={mode}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[8px] font-semibold",
                  active && i === 2
                    ? "border border-teal/30 bg-teal/15 text-teal-hover"
                    : "bg-white/70 text-ink-muted ring-1 ring-border"
                )}
              >
                {mode}
              </span>
            )
          )}
        </div>
      )}

      {icon === "message" && (
        <div className="mx-4 w-full rounded-2xl border border-teal/15 bg-white/80 p-3 text-[9px] shadow-sm">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-teal" />
            <p className="font-semibold text-ink">Ask your meeting brain</p>
          </div>
          <p className="mt-1 text-ink-secondary">
            What has Acme said about security?
          </p>
        </div>
      )}

      {icon === "users" && (
        <div className="grid w-[78%] grid-cols-2 gap-1.5">
          {[
            { label: "Meetings", value: "31" },
            { label: "Contacts", value: "3" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-white/80 px-2 py-1.5"
            >
              <p className="text-[7px] font-bold uppercase tracking-wider text-ink-muted">
                {stat.label}
              </p>
              <p className="text-[10px] font-semibold text-ink">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {icon === "lock" && (
        <div className="flex flex-wrap justify-center gap-1.5 px-4">
          {["Local SQLite", "MIT", "Citation gate"].map((pill) => (
            <span
              key={pill}
              className="rounded-full bg-teal-muted px-2 py-0.5 text-[8px] font-semibold text-teal-hover"
            >
              {pill}
            </span>
          ))}
        </div>
      )}

      {active && icon === "video" ? (
        <motion.div
          className="pointer-events-none absolute bottom-2 right-2 w-[34%] scale-[0.78]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MiniCaptureDemo timer="00:08" note="follow up Tuesday" />
        </motion.div>
      ) : null}
    </div>
  );
}
