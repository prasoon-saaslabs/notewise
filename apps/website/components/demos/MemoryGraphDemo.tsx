"use client";

import { ProfileSnapshotDemo } from "@/components/demos/app/ProfileSnapshotDemo";
import { cn } from "@/lib/utils";

type MemoryGraphDemoProps = {
  progress?: number;
  className?: string;
  compact?: boolean;
};

/** Profile + AI snapshot — matches app People/Profile intelligence */
export function MemoryGraphDemo({
  progress = 1,
  className,
  compact: _compact = false,
}: MemoryGraphDemoProps) {
  return (
    <div className={cn(className)}>
      <ProfileSnapshotDemo progress={progress} />
    </div>
  );
}
