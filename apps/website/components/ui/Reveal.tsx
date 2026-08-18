"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  flyInHidden,
  flyInVisible,
  flySpring,
  revealUpReduced,
  type FlyDirection,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: FlyDirection;
  distance?: number;
  as?: "div" | "section" | "article" | "li";
};

export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 32,
  as = "div",
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const Component = motion[as];

  if (prefersReducedMotion) {
    return (
      <Component
        className={cn(className)}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10% 0px -8% 0px" }}
        variants={revealUpReduced}
        transition={{ delay }}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component
      className={cn(className)}
      initial={flyInHidden(direction, distance)}
      whileInView={flyInVisible}
      viewport={{ once: true, margin: "-10% 0px -8% 0px" }}
      transition={{ ...flySpring, delay }}
    >
      {children}
    </Component>
  );
}
