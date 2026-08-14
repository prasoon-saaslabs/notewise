"use client";

import { cn } from "@/lib/utils";

export function AppWaveform({
  active = true,
  bars = 16,
  className,
}: {
  active?: boolean;
  bars?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("nw-wave flex h-10 items-center justify-center gap-[3px]", className)}
      aria-hidden
      style={{ opacity: active ? 1 : 0.28 }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const mid = (bars - 1) / 2;
        const dist = Math.abs(i - mid) / mid;
        const h = 10 + (1 - dist) * 22 + ((i * 5) % 8);
        return (
          <span
            key={i}
            className="nw-wave-bar"
            style={{
              height: `${h}px`,
              animationPlayState: active ? "running" : "paused",
              animationDelay: `${(i % 8) * 0.07}s`,
              animationDuration: `${0.85 + (i % 5) * 0.12}s`,
            }}
          />
        );
      })}
    </div>
  );
}
