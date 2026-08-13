import { Link } from "react-router-dom";
import { ArrowRight, Brain, Upload } from "lucide-react";
import { Button } from "@notewise/ui";
import type { EntityRecord } from "@notewise/api-client";
import { AiBulletList, AiPageHero, AiShimmer, AiSurface } from "../ai/AiPrimitives";
import { useNetworkPulse } from "../../hooks/useEntityIntelligence";
import { useMeetingBrain } from "../MeetingBrain";

export function PeopleNetworkOverview({ entities }: { entities: EntityRecord[] }) {
  const { openBrain } = useMeetingBrain();
  const pulseQ = useNetworkPulse(entities.length);

  const totalMeetings = entities.reduce((n, e) => n + (e.meetingIds?.length ?? 0), 0);
  const totalOpen = entities.reduce((n, e) => n + (e.openItemCount ?? 0), 0);
  const hot = [...entities]
    .filter((e) => (e.openItemCount ?? 0) > 0)
    .sort((a, b) => (b.openItemCount ?? 0) - (a.openItemCount ?? 0))
    .slice(0, 5);

  if (!entities.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-6 py-12 text-center">
        <AiPageHero
          eyebrow="Relationship memory"
          title="Your people graph is empty"
          description="Record calls or import sample meetings. Notewise will extract people, companies, commitments, and objections automatically."
        />
        <Link
          to="/library"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--nw-accent-dark)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Upload className="h-4 w-4" />
          Go to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
      <AiPageHero
        eyebrow="Network intelligence"
        title="Relationship graph"
        description="AI synthesizes patterns across every person and company in your meeting brain."
      />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-center">
          <p className="m-0 text-xl font-bold text-[var(--nw-ink)]">{entities.length}</p>
          <p className="m-0 text-[0.62rem] uppercase tracking-wide text-[var(--nw-ink-4)]">Contacts</p>
        </div>
        <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-center">
          <p className="m-0 text-xl font-bold text-[var(--nw-ink)]">{totalMeetings}</p>
          <p className="m-0 text-[0.62rem] uppercase tracking-wide text-[var(--nw-ink-4)]">Meetings</p>
        </div>
        <div className="rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-center">
          <p className="m-0 text-xl font-bold text-[rgb(180_83_9)]">{totalOpen}</p>
          <p className="m-0 text-[0.62rem] uppercase tracking-wide text-[var(--nw-ink-4)]">Open items</p>
        </div>
      </div>

      <AiSurface title="Network pulse" subtitle="Cross-relationship intelligence from your brain">
        {pulseQ.isLoading ? (
          <AiShimmer rows={3} />
        ) : pulseQ.data?.answer?.length ? (
          <AiBulletList items={pulseQ.data.answer.map((a) => a.text)} />
        ) : (
          <p className="m-0 text-sm text-[var(--nw-ink-3)]">
            Keep recording — the network brief improves as your library grows.
          </p>
        )}
      </AiSurface>

      {hot.length > 0 ? (
        <section>
          <h3 className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-4)]">
            Needs follow-up
          </h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {hot.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/people/${e.id}`}
                  className="nw-intel-card flex items-center justify-between gap-3 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold text-[var(--nw-ink)]">{e.name}</p>
                    <p className="m-0 text-xs text-[var(--nw-ink-3)]">
                      {e.openItemCount} open item{e.openItemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--nw-accent-dark)]" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Button variant="secondary" className="self-start" onClick={() => openBrain()}>
        <Brain className="h-4 w-4" />
        Ask across all relationships
      </Button>
    </div>
  );
}
