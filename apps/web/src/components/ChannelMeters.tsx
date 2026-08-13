export function ChannelMeters({
  mic,
  system,
  backend,
}: {
  mic: number;
  system: number;
  backend?: string;
}) {
  if (backend === "mix") {
    return (
      <div className="flex min-w-[9rem] flex-col gap-1" title="mixed capture">
        <Meter label="Mix" value={mic} />
      </div>
    );
  }
  return (
    <div className="flex min-w-[9rem] flex-col gap-1" title={backend || "capture"}>
      <Meter label="You" value={mic} />
      <Meter label="Them" value={system} muted={system <= 0.001} />
    </div>
  );
}

function Meter({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-8 shrink-0 text-[0.58rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--nw-surface-2)]">
        <div
          className={`h-full rounded-full ${muted ? "bg-[var(--nw-ink-4)]" : "bg-[var(--nw-accent-dark)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
