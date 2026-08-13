import { useEffect, useState } from "react";
import { Briefcase, Mic2, Sparkles, Users } from "lucide-react";
import { api } from "../lib/api";
import type { EntityRecord, MeetingMode } from "@notewise/api-client";
import { PreCallBriefCard } from "./PreCallBriefCard";
import { CopilotPanel } from "./CopilotPanel";

const MODE_HINTS: Record<string, string> = {
  "sales-discovery": "Objections, budget, next steps",
  "1-1": "Blockers, career, manager recap",
  standup: "Yesterday / today / blockers",
  "investor-call": "Ask, traction, round timing",
};

export function RecordIntelligencePanel({
  sessionLive,
  meetingId,
}: {
  sessionLive: boolean;
  meetingId: string | null;
}) {
  const [modes, setModes] = useState<MeetingMode[]>([]);
  const [modeId, setModeId] = useState(() => localStorage.getItem("og-mode-id") || "sales-discovery");
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [entityId, setEntityId] = useState(() => localStorage.getItem("og-entity-id") || "");

  useEffect(() => {
    void api.listModes().then(setModes).catch(() => undefined);
    void api.listEntities().then(setEntities).catch(() => undefined);
  }, []);

  const modeList = modes.length ? modes : [{ id: "sales-discovery", name: "Sales discovery" }];
  const activeMode = modeList.find((m) => m.id === modeId) ?? modeList[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-[rgb(14_116_144_/_0.18)] bg-[linear-gradient(165deg,rgb(14_116_144_/_0.07)_0%,#fff_42%,#f8fafc_100%)] shadow-[0_1px_0_rgb(15_23_42_/_0.04)]">
      <header className="flex items-center gap-2 border-b border-[rgb(14_116_144_/_0.12)] px-4 py-3">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">AI workspace</p>
          <p className="m-0 text-[0.68rem] text-[var(--nw-ink-3)]">
            {sessionLive ? "Live copilot + memory search" : "Set context before you record"}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {!sessionLive ? (
          <>
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
                <Briefcase className="h-3.5 w-3.5" />
                Meeting mode
              </div>
              <div className="flex flex-wrap gap-1.5">
                {modeList.map((m) => {
                  const active = m.id === modeId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModeId(m.id);
                        localStorage.setItem("og-mode-id", m.id);
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-[var(--nw-accent-dark)] text-white shadow-sm"
                          : "bg-white text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] hover:bg-[var(--nw-accent-soft)]"
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 m-0 text-[0.72rem] leading-relaxed text-[var(--nw-ink-3)]">
                Shapes PyAI Recap after Stop —{" "}
                <span className="font-medium text-[var(--nw-ink-2)]">
                  {MODE_HINTS[activeMode?.id ?? ""] || "Summary, actions, objections"}
                </span>
              </p>
            </div>

            {entities.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
                  <Users className="h-3.5 w-3.5" />
                  Meeting with
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEntityId("");
                      localStorage.removeItem("og-entity-id");
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      !entityId
                        ? "bg-[var(--nw-ink)] text-white"
                        : "bg-white text-[var(--nw-ink-3)] ring-1 ring-[var(--nw-border)]"
                    }`}
                  >
                    Anyone
                  </button>
                  {entities.slice(0, 8).map((e) => {
                    const active = entityId === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => {
                          setEntityId(e.id);
                          localStorage.setItem("og-entity-id", e.id);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "bg-[rgb(79_70_229)] text-white shadow-sm"
                            : "bg-white text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] hover:bg-[rgb(79_70_229_/_0.08)]"
                        }`}
                      >
                        {e.name}
                      </button>
                    );
                  })}
                </div>
                {entityId ? <PreCallBriefCard entityId={entityId} /> : null}
              </div>
            ) : (
              <p className="m-0 rounded-xl bg-white/70 px-3 py-2 text-xs text-[var(--nw-ink-3)] ring-1 ring-[var(--nw-border)]">
                People & companies appear here after your first recorded or imported meeting.
              </p>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-[var(--nw-border)]">
            <Mic2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nw-accent-dark)]" />
            <p className="m-0 text-xs leading-relaxed text-[var(--nw-ink-2)]">
              Recording — live copilot listens for repeated objections and commitments.
            </p>
          </div>
        )}

        {sessionLive ? <CopilotPanel meetingId={meetingId} /> : null}
      </div>
    </section>
  );
}
