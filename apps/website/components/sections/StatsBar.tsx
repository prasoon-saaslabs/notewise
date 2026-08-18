"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/ui/CountUp";
import { FlyIn } from "@/components/ui/FlyIn";
import { STATS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatsBar() {
  return (
    <section className="border-y border-border bg-paper-elevated/80 py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <ul className="grid grid-cols-2 gap-8 md:grid-cols-5 md:gap-6">
          {STATS.map((stat, index) => (
            <FlyIn
              key={stat.label}
              as="li"
              direction="up"
              distance={24}
              delay={index * 0.06}
              className="group relative text-center md:text-left"
            >
              <p className="font-display text-3xl tracking-tight text-ink md:text-4xl">
                <CountUp
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  display={"display" in stat ? stat.display : undefined}
                />
              </p>
              <p className="mt-1.5 text-xs leading-snug text-ink-muted md:text-sm">
                {stat.label}
              </p>
              <motion.span
                className={cn(
                  "absolute -bottom-3 left-1/2 h-px w-0 bg-teal md:left-0 md:translate-x-0 md:-translate-y-0",
                  "-translate-x-1/2",
                )}
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              />
            </FlyIn>
          ))}
        </ul>
      </div>
    </section>
  );
}
