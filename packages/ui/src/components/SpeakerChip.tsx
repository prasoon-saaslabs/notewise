import { clsx } from "clsx";

export type SpeakerChipProps = {
  label: string;
  kind?: "you" | "other" | "guest";
  className?: string;
  live?: boolean;
};

export function SpeakerChip({ label, kind = "other", className, live }: SpeakerChipProps) {
  const tone =
    kind === "you"
      ? "bg-[rgb(var(--nw-accent-rgb)_/_0.12)] text-[var(--nw-accent-dark)] border-[rgb(var(--nw-accent-rgb)_/_0.22)] backdrop-blur-sm"
      : kind === "guest"
        ? "bg-[var(--nw-guest-bg)] text-[var(--nw-guest-text)] border-[var(--nw-guest-border)] backdrop-blur-sm"
        : "bg-[var(--nw-glass-bg)] text-[var(--nw-ink-2)] border-[var(--nw-glass-border)] backdrop-blur-sm";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider",
        "border",
        tone,
        className,
      )}
    >
      {live ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--nw-accent)] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--nw-accent)]" />
        </span>
      ) : null}
      {label}
    </span>
  );
}
