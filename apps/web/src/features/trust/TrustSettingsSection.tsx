import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Shield } from "lucide-react";
import { api } from "../../lib/api";

const INITIAL_RUNS_VISIBLE = 5;

export function TrustSettingsSection() {
  const [runsExpanded, setRunsExpanded] = useState(false);
  const trust = useQuery({
    queryKey: ["trust"],
    queryFn: () => api.getTrust(),
  });
  const privacy = useQuery({
    queryKey: ["privacy"],
    queryFn: () => api.getPrivacy(),
  });
  const runs = trust.data?.runs ?? [];
  const flow = trust.data?.dataFlow ?? {};
  const p = privacy.data;
  const hiddenRuns = Math.max(0, runs.length - INITIAL_RUNS_VISIBLE);
  const visibleRuns =
    runsExpanded || hiddenRuns === 0
      ? runs
      : runs.slice(0, INITIAL_RUNS_VISIBLE);

  return (
    <section id="trust" className="scroll-mt-6">
      <h3 className="mb-2 mt-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
        <Shield className="h-3.5 w-3.5" />
        Trust & data flow
      </h3>
      <p className="m-0 mb-3 text-xs text-[var(--nw-ink-3)]">
        Named exits, citation gates, and what actually leaves this machine.
      </p>

      {p ? (
        <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 text-sm">
          <h4 className="m-0 text-base font-semibold">{p.title}</h4>
          <p className="mt-2">{p.audio}</p>
          <p>{p.text}</p>
          <p>{p.atRest}</p>
          <p className="text-[var(--nw-ink-4)]">{p.consent}</p>
        </div>
      ) : null}

      <div className="mt-3 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 text-sm">
        <h4 className="m-0 text-base font-semibold">Data flow</h4>
        <dl className="mt-2 grid gap-1">
          {Object.entries(flow).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-28 font-semibold capitalize">{k}</dt>
              <dd className="m-0 text-[var(--nw-ink-2)]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-xs text-[var(--nw-ink-4)]">
          SQLite: {trust.data?.dbPath}
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4">
        <h4 className="m-0 text-base font-semibold">Recent runs</h4>
        <ul className="m-0 mt-2 list-none p-0 text-sm">
          {visibleRuns.map((r) => (
            <li
              key={String(r.id)}
              className="border-b border-[var(--nw-border)] py-2"
            >
              <b>{String(r.exit)}</b> · cited {String(r.claimsCited)} · blocked{" "}
              {String(r.claimsBlocked)} · {String(r.tokens)} tok ·{" "}
              {String(r.elapsedMs)}ms
            </li>
          ))}
          {!runs.length ? (
            <li className="text-[var(--nw-ink-4)]">No runs yet.</li>
          ) : null}
        </ul>
        {hiddenRuns > 0 ? (
          <button
            type="button"
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--nw-border)] bg-[var(--nw-surface-2)] px-3 py-2 text-xs font-semibold text-[var(--nw-ink-2)] transition hover:border-[var(--nw-accent)] hover:text-[var(--nw-accent-dark)]"
            aria-expanded={runsExpanded}
            onClick={() => setRunsExpanded((v) => !v)}
          >
            {runsExpanded ? "Show less" : `Show ${hiddenRuns} more`}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${runsExpanded ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        ) : null}
      </div>
    </section>
  );
}
