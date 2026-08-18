"use client";

import { motion, useReducedMotion } from "motion/react";
import { wordStaggerChild, wordStaggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function SplitReveal({
  text,
  className,
  as: Tag = "span",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "span" | "p";
}) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(" ");
  const Component = motion[Tag];

  if (prefersReducedMotion) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Component
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-15% 0px -10% 0px" }}
      variants={wordStaggerContainer}
      aria-label={text}
    >
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={wordStaggerChild}
          className="mr-[0.25em] inline-block"
        >
          {word}
        </motion.span>
      ))}
    </Component>
  );
}
