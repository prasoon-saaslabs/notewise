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
      ? "bg-[rgb(13_148_136_/_0.12)] text-[var(--nw-accent-dark)] border-[rgb(13_148_136_/_0.22)] backdrop-blur-sm"
      : kind === "guest"
        ? "bg-[rgb(255_247_237_/_0.7)] text-[#c2410c] border-[#fed7aa] backdrop-blur-sm"
        : "bg-[rgb(255_255_255_/_0.45)] text-[var(--nw-ink-2)] border-[rgb(255_255_255_/_0.62)] backdrop-blur-sm";

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
