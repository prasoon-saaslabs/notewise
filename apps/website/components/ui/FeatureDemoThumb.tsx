"use client";

import { Sparkles } from "lucide-react";
import { AppWaveform } from "@/components/demos/app/AppWaveform";
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
        <div className="w-[82%] overflow-hidden rounded-2xl border border-border/80 bg-paper-elevated shadow-sm">
          <div className="grid grid-cols-2 border-b border-border/80">
            <div className="border-r border-border/80 px-2.5 py-2">
              <p className="font-display text-[10px] text-ink">New Meeting</p>
              <p className="mt-1 text-[8px] text-ink-muted">Write notes</p>
            </div>
            <div className="px-2.5 py-2">
              <p className="text-[8px] font-medium text-teal">Live transcript</p>
              <p className="mt-1 text-[8px] text-ink-muted">Listening…</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1.5">
            <AppWaveform active={active} bars={10} className="h-5" />
            <span className="ml-auto text-[7px] text-ink-muted">Stop</span>
          </div>
        </div>
      )}

      {icon === "check" && (
        <div className="w-[78%] rounded-2xl border border-border bg-paper-elevated p-3 text-[9px] text-ink-secondary shadow-sm">
          <p className="font-display text-[10px] text-ink">Standup Meeting</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-teal-muted px-1.5 py-0.5 text-[7px] font-semibold text-teal-hover">
            Enhanced
          </span>
          <p className="mt-2 leading-relaxed">
            Tableau project recap and prioritization weakness.
          </p>
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
                    : "bg-paper-elevated text-ink-muted ring-1 ring-border"
                )}
              >
                {mode}
              </span>
            )
          )}
        </div>
      )}

      {icon === "message" && (
        <div className="mx-4 w-full rounded-2xl border border-teal/15 bg-paper-elevated p-3 text-[9px] shadow-sm">
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
              className="rounded-xl border border-border bg-paper-elevated px-2 py-1.5"
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

    </div>
  );
}
