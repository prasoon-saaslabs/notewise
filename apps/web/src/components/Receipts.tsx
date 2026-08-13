import type { CitedClaim, RunStatus } from "@notewise/api-client";

export function formatMs(ms?: number | null) {
  if (ms == null || !Number.isFinite(ms)) return "";
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function CitationChip({
  startMs,
  onJump,
}: {
  startMs?: number | null;
  onJump?: () => void;
}) {
  if (startMs == null) return null;
  return (
    <button
      type="button"
      onClick={onJump}
      className="ml-1 rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)] px-1.5 py-0.5 text-[0.6rem] font-bold text-[var(--nw-accent-dark)]"
      title="Jump to transcript"
    >
      {formatMs(startMs)}
    </button>
  );
}

export function ClaimLine({
  claim,
  onJump,
}: {
  claim: { text: string; owner?: string | null; due?: string | null; startMs?: number | null; lineIds?: string[] };
  onJump?: (lineId?: string, startMs?: number | null) => void;
}) {
  return (
    <li className="text-sm leading-relaxed text-[var(--nw-ink-2)]">
      {claim.text}
      {claim.owner ? (
        <span className="ml-1 rounded-full bg-[var(--nw-surface-2)] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase">
          {claim.owner}
        </span>
      ) : null}
      <CitationChip
        startMs={claim.startMs}
        onJump={() => onJump?.(claim.lineIds?.[0], claim.startMs)}
      />
    </li>
  );
}

export function RunStatusCard({ status, dropped }: { status?: RunStatus | null; dropped?: number }) {
  if (!status) return null;
  return (
    <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-2)] p-3 text-xs text-[var(--nw-ink-2)]">
      <p className="m-0 font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">Run status</p>
      <p className="mt-1 m-0">
        Exit <b>{status.exit}</b> · {status.claimsCited} cited · {status.claimsBlocked} blocked
        {dropped ? ` · ${dropped} dropped` : ""}
      </p>
      <p className="mt-1 m-0 text-[var(--nw-ink-4)]">
        {status.tokens} tokens · ${status.costUsd.toFixed(4)} · {status.elapsedMs}ms
      </p>
    </div>
  );
}

export function asClaims(
  items: Array<string | CitedClaim | { text: string; startMs?: number; lineIds?: string[]; owner?: string }>,
): Array<{ text: string; startMs?: number | null; lineIds?: string[]; owner?: string | null }> {
  return items.map((item) => (typeof item === "string" ? { text: item } : item));
}
