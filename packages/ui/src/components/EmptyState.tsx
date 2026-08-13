import { clsx } from "clsx";
import type { ReactNode } from "react";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  compact?: boolean;
};

export function EmptyState({
  icon,
  title,
  description,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center",
        compact ? "min-h-20 text-sm" : "min-h-40 text-sm",
        className,
      )}
    >
      {icon ? <div className="mb-1 text-xl opacity-50">{icon}</div> : null}
      <p className="nw-display m-0 font-bold text-[var(--nw-ink-2)]">{title}</p>
      {description ? (
        <p className="m-0 max-w-xs text-xs leading-relaxed text-[var(--nw-ink-4)]">{description}</p>
      ) : null}
    </div>
  );
}
