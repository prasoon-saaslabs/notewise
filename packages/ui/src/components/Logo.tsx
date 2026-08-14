"use client";

import clsx from "clsx";
import { BrandIcon } from "./BrandIcon";

export type LogoMarkProps = {
  className?: string;
  /** Pixel size — 36 matches AppShell `h-9 w-9` */
  size?: number;
  title?: string;
};

/** Notewise brand mark — scalable app-icon SVG. */
export function LogoMark({ className, size = 36, title }: LogoMarkProps) {
  return (
    <BrandIcon
      size={size}
      title={title}
      className={clsx(
        "drop-shadow-[0_6px_14px_rgba(14,116,144,0.28)]",
        className,
      )}
    />
  );
}

export type LogoProps = {
  className?: string;
  markSize?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
};

export function Logo({
  className,
  markSize = 36,
  showWordmark = true,
  wordmarkClassName,
}: LogoProps) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={markSize} />
      {showWordmark ? (
        <span
          className={clsx(
            "text-sm font-bold tracking-tight text-[var(--nw-ink,#0f172a)]",
            wordmarkClassName,
          )}
        >
          Notewise
        </span>
      ) : null}
    </span>
  );
}
