import { useState } from "react";
import { Link } from "react-router-dom";
import { Brain, ChevronRight, MessageCircleQuestion } from "lucide-react";
import { Button } from "@notewise/ui";
import {
  AiBulletList,
  AiMetric,
  AiShimmer,
  AiSurface,
} from "../ai/AiPrimitives";
import { useMeetingBrain } from "../MeetingBrain";
import {
  useEntityBrief,
  useEntityDetail,
  useEntityNarrative,
} from "../../hooks/useEntityIntelligence";
import { api } from "../../lib/api";
import type { AskResponse } from "@notewise/api-client";

const QUICK_ASKS = [
  "What did they care about most in our last meetings?",
  "What follow-ups are still open with them?",
  "Any unresolved objections I should address?",
] as const;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function NarrativeBody({ narrative }: { narrative: AskResponse | undefined }) {
  if (!narrative) return <AiShimmer rows={4} />;
  if (!narrative.answer?.length) {
    return (
      <p className="m-0 text-sm text-[var(--nw-ink-3)]">
        Not enough meeting data yet — record a call or import samples to generate relationship
        intelligence.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <AiBulletList items={narrative.answer.map((a) => a.text)} />
      {narrative.sourceDetail ? (
        <p className="m-0 text-[0.62rem] text-[var(--nw-ink-4)]">{narrative.sourceDetail}</p>
      ) : null}
    </div>
  );
}

export function EntityIntelligencePanel({ entityId }: { entityId: string }) {
  const { openBrain } = useMeetingBrain();
  const briefQ = useEntityBrief(entityId);
  const detailQ = useEntityDetail(entityId);
  const narrativeQ = useEntityNarrative(entityId, briefQ.isSuccess);
  const [quickAnswer, setQuickAnswer] = useState<AskResponse | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);

  const brief = briefQ.data;
  const detail = detailQ.data;
  const name = detail?.name || brief?.entity.name || "Contact";

  async function runQuickAsk(question: string) {
    setQuickBusy(true);
    try {
      const res = await api.ask(question, entityId);
      setQuickAnswer(res);
    } finally {
      setQuickBusy(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
            Relationship intelligence
          </p>
          <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)]">{name}</h1>
          {detail?.company ? (
            <p className="m-0 mt-0.5 text-sm text-[var(--nw-ink-3)]">{detail.company}</p>
          ) : null}
        </div>
        <Button variant="primary" onClick={() => openBrain({ entityId })}>
          <Brain className="h-4 w-4" />
          Ask brain
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AiMetric label="Meetings" value={brief?.meetingCount ?? detail?.timeline?.length ?? 0} />
        <AiMetric
          label="Open follow-ups"
          value={brief?.openCommitments.length ?? 0}
          hint={brief?.openCommitments.length ? "Needs attention" : "All clear"}
        />
        <AiMetric
          label="Objections"
          value={brief?.unresolvedObjections.length ?? 0}
          hint="Unresolved"
        />
        <AiMetric label="Topics" value={detail?.topics?.length ?? 0} hint="Tracked themes" />
      </div>

      <AiSurface
        title="Relationship brief"
        subtitle="Synthesized from transcripts, notes, and commitments across your meetings"
      >
        {narrativeQ.isLoading ? <AiShimmer rows={4} /> : <NarrativeBody narrative={narrativeQ.data} />}
      </AiSurface>

      {brief?.lastMeeting?.recap ? (
        <AiSurface title="Last meeting recap" subtitle={brief.lastMeeting.title}>
          <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-2)]">
            {brief.lastMeeting.recap}
          </p>
          <Link
            to={`/library/${brief.lastMeeting.id}`}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--nw-accent-dark)] underline"
          >
            View full notes <ChevronRight className="h-3 w-3" />
          </Link>
        </AiSurface>
      ) : null}

      {brief?.openCommitments.length ? (
        <AiSurface title="Open follow-ups" subtitle="Commitments extracted from past conversations">
          <AiBulletList
            variant="action"
            items={brief.openCommitments.map((c) =>
              c.due ? `${c.text} (due ${c.due})` : c.text,
            )}
          />
        </AiSurface>
      ) : null}

      {brief?.unresolvedObjections.length ? (
        <AiSurface title="Unresolved objections" subtitle="Surfaced from meeting intelligence">
          <AiBulletList
            variant="risk"
            items={brief.unresolvedObjections.map((o) => o.text)}
          />
        </AiSurface>
      ) : null}

      {brief?.suggestedAgenda.length ? (
        <AiSurface title="Suggested talking points" subtitle="For your next conversation">
          <AiBulletList items={brief.suggestedAgenda} />
        </AiSurface>
      ) : null}

      <AiSurface
        title="Quick intelligence"
        subtitle="Ask focused questions about this relationship"
        footer={
          <div className="flex flex-wrap gap-2">
            {QUICK_ASKS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={quickBusy}
                onClick={() => void runQuickAsk(q)}
                className="rounded-full bg-[var(--nw-surface-solid)] px-3 py-1.5 text-xs font-semibold text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] transition hover:bg-[var(--nw-accent-soft)] hover:text-[var(--nw-accent-dark)] disabled:opacity-60"
              >
                <MessageCircleQuestion className="mr-1 inline h-3 w-3" />
                {q}
              </button>
            ))}
          </div>
        }
      >
        {quickBusy ? (
          <AiShimmer rows={2} />
        ) : quickAnswer?.answer?.length ? (
          <AiBulletList items={quickAnswer.answer.map((a) => a.text)} />
        ) : (
          <p className="m-0 text-sm text-[var(--nw-ink-3)]">
            Pick a question above to generate a focused answer from your meeting brain.
          </p>
        )}
      </AiSurface>

      {detail?.timeline?.length ? (
        <section>
          <h3 className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-4)]">
            Meeting timeline
          </h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {detail.timeline.map((m) => (
              <li key={m.id}>
                <Link
                  to={`/library/${m.id}`}
                  className="nw-intel-card block rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-4 py-3 transition hover:border-[var(--nw-accent)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold text-[var(--nw-ink)]">
                        {m.title}
                      </p>
                      {m.snippet ? (
                        <p className="m-0 mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--nw-ink-3)]">
                          {m.snippet}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-[0.62rem] text-[var(--nw-ink-4)]">
                      {formatDate(m.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </div>
    </div>
  );
}
