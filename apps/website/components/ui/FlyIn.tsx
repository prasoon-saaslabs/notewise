"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  flyInHidden,
  flyInVisible,
  flySpring,
  type FlyDirection,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type FlyInProps = {
  children: React.ReactNode;
  className?: string;
  direction?: FlyDirection;
  distance?: number;
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "span";
};

export function FlyIn({
  children,
  className,
  direction = "up",
  distance = 40,
  delay = 0,
  as = "div",
}: FlyInProps) {
  const prefersReducedMotion = useReducedMotion();
  const Component = motion[as];

  if (prefersReducedMotion) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Component
      className={cn(className)}
      initial={flyInHidden(direction, distance)}
      whileInView={flyInVisible}
      viewport={{ once: true, margin: "-12% 0px -10% 0px" }}
      transition={{ ...flySpring, delay }}
    >
      {children}
    </Component>
  );
}
