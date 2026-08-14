"use client";

import { useId } from "react";
import clsx from "clsx";

export type BrandIconProps = {
  className?: string;
  /** Rendered pixel size (square). */
  size?: number;
  /** Accessible label. When omitted the icon is decorative. */
  title?: string;
};

/**
 * Notewise brand mark — azure squircle, white note page with copy lines,
 * and the AI sparkle badge. Scalable inline SVG so it stays crisp at any
 * size and needs no asset pipeline. Mirrors the desktop app icon.
 */
export function BrandIcon({ className, size = 36, title }: BrandIconProps) {
  const uid = useId().replace(/[:]/g, "");
  const tile = `nw-tile-${uid}`;
  const doc = `nw-doc-${uid}`;
  const badge = `nw-badge-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7FC8F5" />
          <stop offset="1" stopColor="#1E86C8" />
        </linearGradient>
        <linearGradient id={doc} x1="256" y1="118" x2="256" y2="374" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9F3FC" />
        </linearGradient>
        <linearGradient id={badge} x1="300" y1="302" x2="378" y2="382" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4FB0EC" />
          <stop offset="1" stopColor="#1277B8" />
        </linearGradient>
      </defs>

      {/* squircle tile */}
      <rect width="512" height="512" rx="118" fill={`url(#${tile})`} />

      {/* note page */}
      <rect x="164" y="118" width="188" height="256" rx="24" fill={`url(#${doc})`} />

      {/* copy lines */}
      <g fill="#A9D6F4">
        <rect x="192" y="152" width="76" height="13" rx="6.5" />
        <rect x="192" y="186" width="126" height="13" rx="6.5" />
        <rect x="192" y="214" width="126" height="13" rx="6.5" />
        <rect x="192" y="242" width="126" height="13" rx="6.5" />
        <rect x="192" y="270" width="88" height="13" rx="6.5" />
      </g>

      {/* AI sparkle badge */}
      <circle cx="340" cy="342" r="52" fill={`url(#${doc})`} />
      <circle cx="340" cy="342" r="42" fill={`url(#${badge})`} />
      <path
        d="M340 316 L346.4 335.6 L366 342 L346.4 348.4 L340 368 L333.6 348.4 L314 342 L333.6 335.6 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}
