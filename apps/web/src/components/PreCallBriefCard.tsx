import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PreCallBrief } from "@notewise/api-client";
import { AiBulletList, AiShimmer, AiSurface } from "./ai/AiPrimitives";

export function PreCallBriefCard({ entityId }: { entityId?: string | null }) {
  const [brief, setBrief] = useState<PreCallBrief | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entityId) {
      setBrief(null);
      return;
    }
    setLoading(true);
    void api
      .getBrief(entityId)
      .then(setBrief)
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, [entityId]);

  if (!entityId) return null;
  if (loading) {
    return (
      <div className="mt-3">
        <AiShimmer rows={3} />
      </div>
    );
  }
  if (!brief) return null;

  return (
    <div className="mt-3">
      <AiSurface
        title={`Intelligence · ${brief.entity.name}`}
        subtitle="Pre-call context from your meeting brain"
      >
        {brief.lastMeeting?.recap ? (
          <p className="m-0 text-sm leading-relaxed text-[var(--nw-ink-2)]">{brief.lastMeeting.recap}</p>
        ) : (
          <p className="m-0 text-sm text-[var(--nw-ink-3)]">No prior meetings linked yet.</p>
        )}
        {brief.openCommitments.length > 0 ? (
          <div className="mt-3">
            <p className="m-0 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
              Open follow-ups
            </p>
            <div className="mt-1.5">
              <AiBulletList
                variant="action"
                items={brief.openCommitments.slice(0, 4).map((c) => c.text)}
              />
            </div>
          </div>
        ) : null}
        {brief.suggestedAgenda.length > 0 ? (
          <p className="mt-3 m-0 text-xs text-[var(--nw-ink-3)]">
            Talking points: {brief.suggestedAgenda.join(" · ")}
          </p>
        ) : null}
      </AiSurface>
    </div>
  );
}
