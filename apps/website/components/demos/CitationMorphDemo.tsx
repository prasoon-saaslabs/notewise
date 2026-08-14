"use client";

import { LibraryNotesDemo } from "@/components/demos/app/LibraryNotesDemo";
import { cn } from "@/lib/utils";

type CitationMorphDemoProps = {
  progress?: number;
  compact?: boolean;
  className?: string;
};

/** Library notes view — matches app receipts UI */
export function CitationMorphDemo({
  progress = 1,
  compact = false,
  className,
}: CitationMorphDemoProps) {
  return (
    <div className={cn(className)} style={{ opacity: Math.min(Math.max(progress, 0.35), 1) }}>
      <LibraryNotesDemo animate={progress > 0.5} />
      {!compact && progress > 0.75 ? (
        <p className="mx-4 mb-4 text-[11px] text-ink-muted">
          Every claim links to the transcript — or the citation gate blocks it.
        </p>
      ) : null}
    </div>
  );
}
