import { clsx } from "clsx";
import type { ReactNode } from "react";

export type NoteSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function NoteSection({ title, children, className }: NoteSectionProps) {
  return (
    <section className={clsx("mb-4", className)}>
      <h4 className="mb-2 mt-0 text-[0.68rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
        {title}
      </h4>
      <div className="text-sm leading-relaxed text-[var(--nw-ink-2)]">{children}</div>
    </section>
  );
}
