"use client";

import { cn } from "@/lib/utils";

export function AppDemoShell({
  children,
  className,
  title = "Capture",
  chrome = true,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  chrome?: boolean;
}) {
  return (
    <div
      className={cn(
        "nw-app-demo relative overflow-hidden rounded-[28px] border border-border bg-paper-elevated shadow-[0_24px_80px_rgba(13,148,136,0.12)]",
        className,
      )}
    >
      <div className="nw-app-demo-glow pointer-events-none absolute inset-0" aria-hidden />
      {chrome ? (
        <div className="relative flex items-center gap-2 border-b border-border/80 bg-white/55 px-4 py-2 backdrop-blur-sm">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-ink-muted">
            {title}
          </span>
          <span className="ml-auto rounded-full bg-teal-muted px-2 py-0.5 text-[0.58rem] font-semibold text-teal-hover">
            Notewise app
          </span>
        </div>
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}
