"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  display?: string;
  duration?: number;
  className?: string;
};

export function CountUp({
  value,
  prefix = "",
  suffix = "",
  display,
  duration = 1.2,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const prefersReducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(prefersReducedMotion ? value : 0);

  useEffect(() => {
    if (display) return;
    if (!inView) return;
    if (prefersReducedMotion) {
      setCurrent(value);
      return;
    }

    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration, prefersReducedMotion, display]);

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 8 }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {prefix}
      {display ?? current}
      {suffix}
    </motion.span>
  );
}
