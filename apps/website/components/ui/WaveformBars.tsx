"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type WaveformBarsProps = {
  active?: boolean;
  channels?: 1 | 2;
  className?: string;
  barCount?: number;
};

export function WaveformBars({
  active = true,
  channels = 2,
  className,
  barCount = 24,
}: WaveformBarsProps) {
  const prefersReducedMotion = useReducedMotion();
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className={cn("space-y-3", className)}>
      {(channels === 2 ? ["Mic", "System audio"] : ["Audio"]).map((label, channelIndex) => (
        <div key={label}>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
            {label}
          </p>
          <div className="flex h-10 items-end gap-[3px] rounded-lg bg-paper px-2 py-1.5">
            {bars.map((i) => {
              const height = 20 + ((i * 7 + channelIndex * 11) % 28);
              return (
                <motion.span
                  key={`${label}-${i}`}
                  className="w-[3px] rounded-full bg-teal/70"
                  style={{ height: prefersReducedMotion || !active ? height * 0.6 : height * 0.35 }}
                  animate={
                    active && !prefersReducedMotion
                      ? {
                          height: [
                            height * 0.25,
                            height * 0.95,
                            height * 0.4,
                            height * 0.75,
                            height * 0.3,
                          ],
                        }
                      : undefined
                  }
                  transition={{
                    duration: 0.8 + (i % 5) * 0.12,
                    repeat: Infinity,
                    repeatType: "mirror",
                    ease: "easeInOut",
                    delay: i * 0.03 + channelIndex * 0.15,
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
