"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TypewriterTextProps = {
  text: string;
  active?: boolean;
  speed?: number;
  className?: string;
  showCursor?: boolean;
};

export function TypewriterText({
  text,
  active = true,
  speed = 28,
  className,
  showCursor = true,
}: TypewriterTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const [length, setLength] = useState(prefersReducedMotion ? text.length : 0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setLength(text.length);
      return;
    }
    if (!active) {
      setLength(0);
      return;
    }

    setLength(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setLength(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);

    return () => window.clearInterval(id);
  }, [text, active, speed, prefersReducedMotion]);

  const visible = text.slice(0, length);
  const typing = active && length < text.length && !prefersReducedMotion;

  return (
    <span className={cn("inline", className)}>
      {visible}
      {showCursor && typing && (
        <motion.span
          className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-teal"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}
