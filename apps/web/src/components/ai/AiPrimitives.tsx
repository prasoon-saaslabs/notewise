import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export function AiBadge({ label = "AI generated" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)] px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-accent-dark)] ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.18)]">
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export function AiSurface({
  title,
  subtitle,
  children,
  className = "",
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section
      className={`nw-ai-surface overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.18)] shadow-[0_1px_0_var(--nw-glass-shadow)] ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[rgb(var(--nw-accent-rgb)_/_0.12)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">{title}</p>
            {subtitle ? (
              <p className="m-0 text-[0.68rem] leading-relaxed text-[var(--nw-ink-3)]">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <AiBadge />
      </header>
      <div className="p-4">{children}</div>
      {footer ? (
        <footer className="border-t border-[rgb(var(--nw-accent-rgb)_/_0.1)] bg-[var(--nw-glass-bg)] px-4 py-3">{footer}</footer>
      ) : null}
    </section>
  );
}

export function AiMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="nw-intel-card rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5">
      <p className="m-0 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
        {label}
      </p>
      <p className="m-0 mt-0.5 text-xl font-bold tracking-tight text-[var(--nw-ink)]">{value}</p>
      {hint ? <p className="m-0 mt-0.5 text-[0.62rem] text-[var(--nw-ink-4)]">{hint}</p> : null}
    </div>
  );
}

export function AiShimmer({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="nw-ai-shimmer h-3 rounded-md"
          style={{ width: `${88 - i * 12}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
      <p className="m-0 pt-1 text-[0.65rem] text-[var(--nw-ink-4)]">Generating intelligence…</p>
    </div>
  );
}

export function AiPageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="nw-ai-hero mb-4 rounded-2xl px-4 py-4 md:px-5 md:py-5">
      <p className="m-0 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
        <Sparkles className="h-3.5 w-3.5" />
        {eyebrow}
      </p>
      <h1 className="nw-title-shimmer m-0 mt-1 text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
      {description ? (
        <p className="m-0 mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--nw-ink-3)]">
          {description}
        </p>
      ) : null}
    </header>
  );
}

export function AiBulletList({
  items,
  variant = "default",
}: {
  items: string[];
  variant?: "default" | "risk" | "action";
}) {
  const dot =
    variant === "risk"
      ? "before:bg-[rgb(239_68_68)]"
      : variant === "action"
        ? "before:bg-[var(--nw-accent)]"
        : "before:bg-[var(--nw-accent)]";

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {items.map((item) => (
        <li
          key={item}
          className={`relative pl-4 text-sm leading-relaxed text-[var(--nw-ink-2)] before:absolute before:left-0 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full ${dot}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
