import { clsx } from "clsx";

export type SpeakerChipProps = {
  label: string;
  kind?: "you" | "other" | "guest";
  className?: string;
};

export function SpeakerChip({ label, kind = "other", className }: SpeakerChipProps) {
  const tone =
    kind === "you"
      ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)] border-[rgb(14_116_144_/_0.25)]"
      : kind === "guest"
        ? "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]"
        : "bg-[#eef2ff] text-[var(--nw-other)] border-[#c7d2fe]";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-semibold",
        "border",
        tone,
        className,
      )}
    >
      {label}
    </span>
  );
}
