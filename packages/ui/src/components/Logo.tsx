"use client";

import { Sparkles } from "lucide-react";
import clsx from "clsx";

export type LogoMarkProps = {
  className?: string;
  /** Pixel size — 36 matches AppShell `h-9 w-9` */
  size?: number;
  title?: string;
};

/** Teal gradient tile + sparkles — matches AppShell brand mark */
export function LogoMark({ className, size = 36, title }: LogoMarkProps) {
  const iconSize = Math.max(14, Math.round(size * 0.44));
  const radius = Math.max(10, Math.round(size * 0.28));

  return (
    <span
      className={clsx(
        "nw-brand-mark grid shrink-0 place-items-center shadow-[0_6px_16px_rgb(14_116_144_/_0.25)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: radius,
      }}
      title={title}
      aria-hidden={title ? undefined : true}
    >
      <Sparkles
        className="shrink-0 text-white"
        style={{ width: iconSize, height: iconSize }}
        strokeWidth={2}
      />
    </span>
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
