import { useEffect, useState } from "react";
import { Briefcase, ChevronDown, Plus, Sparkles, Users } from "lucide-react";
import { api } from "../lib/api";
import type { EntityRecord, MeetingMode } from "@notewise/api-client";
import type { ProcessPhase } from "../hooks/useRecorder";
import { PreCallBriefCard } from "./PreCallBriefCard";
import { CreateEntityModal } from "./people/CreateEntityModal";

const MODE_HINTS: Record<string, string> = {
  "sales-discovery": "Objections, budget, next steps",
  "1-1": "Blockers, career, manager recap",
  standup: "Yesterday / today / blockers",
  "investor-call": "Ask, traction, round timing",
};

export function RecordIntelligencePanel({
  sessionLive,
  phase,
  hasNotes,
}: {
  sessionLive: boolean;
  phase: ProcessPhase;
  hasNotes: boolean;
  meetingId?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const [modes, setModes] = useState<MeetingMode[]>([]);
  const [modeId, setModeId] = useState(
    () => localStorage.getItem("og-mode-id") || "sales-discovery"
  );
  const [entities, setEntities] = useState<EntityRecord[]>([]);
  const [entityId, setEntityId] = useState(
    () => localStorage.getItem("og-entity-id") || ""
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .listModes()
      .then(setModes)
      .catch(() => undefined);
    void api
      .listEntities()
      .then(setEntities)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (sessionLive) {
      setOpen(true);
    }
  }, [sessionLive]);

  useEffect(() => {
    if (phase === "ready" || hasNotes) {
      setOpen(false);
    }
  }, [phase, hasNotes]);

  const modeList = modes.length
    ? modes
    : [{ id: "sales-discovery", name: "Sales discovery" }];
  const activeMode = modeList.find((m) => m.id === modeId) ?? modeList[0];
  const optionsLocked = sessionLive;

  const pillClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-55 ${
      active
        ? "border border-[rgb(var(--nw-accent-rgb)_/_0.32)] bg-[rgb(var(--nw-accent-rgb)_/_0.16)] text-[var(--nw-accent-dark)] shadow-[0_4px_16px_rgb(var(--nw-accent-rgb)_/_0.1)]"
        : "bg-[var(--nw-glass-bg)] text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] hover:bg-[rgb(var(--nw-accent-rgb)_/_0.08)] disabled:hover:bg-[var(--nw-glass-bg)]"
    }`;

  const collapsedSubtitle = `${activeMode?.name ?? "Meeting mode"}${
    entityId
      ? ` · ${entities.find((e) => e.id === entityId)?.name ?? "Contact"}`
      : ""
  }`;

  async function handleCreateEntity(body: {
    name: string;
    kind: EntityRecord["kind"];
    company?: string | null;
  }) {
    setCreatePending(true);
    setCreateError(null);
    try {
      const entity = await api.createEntity(body);
      setEntities((prev) =>
        [...prev.filter((e) => e.id !== entity.id), entity].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setEntityId(entity.id);
      localStorage.setItem("og-entity-id", entity.id);
      setCreateOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create contact",
      );
    } finally {
      setCreatePending(false);
    }
  }

  return (
    <section className="nw-accent-panel-gradient overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.18)] shadow-[0_1px_0_var(--nw-glass-shadow)]">
      <button
        type="button"
        className={`flex w-full items-center gap-2 px-4 py-3 text-left transition hover:bg-[rgb(var(--nw-accent-rgb)_/_0.04)] ${
          open ? "border-b border-[rgb(var(--nw-accent-rgb)_/_0.12)]" : ""
        }`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">
            AI workspace
          </p>
          <p className="m-0 text-[0.68rem] text-[var(--nw-ink-3)]">
            {open ? "Set context before you record" : collapsedSubtitle}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--nw-ink-3)] transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="flex flex-col gap-4 p-4">
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
                    disabled={optionsLocked}
                    onClick={() => {
                      setModeId(m.id);
                      localStorage.setItem("og-mode-id", m.id);
                    }}
                    className={pillClass(active)}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 m-0 text-[0.72rem] leading-relaxed text-[var(--nw-ink-3)]">
              Shapes PyAI Recap after Stop —{" "}
              <span className="font-medium text-[var(--nw-ink-2)]">
                {MODE_HINTS[activeMode?.id ?? ""] ||
                  "Summary, actions, objections"}
              </span>
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
              <Users className="h-3.5 w-3.5" />
              Meeting with
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={optionsLocked}
                onClick={() => {
                  setEntityId("");
                  localStorage.removeItem("og-entity-id");
                }}
                className={pillClass(!entityId)}
              >
                Anyone
              </button>
              {entities.map((e) => {
                const active = entityId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    disabled={optionsLocked}
                    onClick={() => {
                      setEntityId(e.id);
                      localStorage.setItem("og-entity-id", e.id);
                    }}
                    className={pillClass(active)}
                  >
                    {e.name}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={optionsLocked}
                onClick={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--nw-glass-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] transition hover:bg-[rgb(var(--nw-accent-rgb)_/_0.08)] hover:text-[var(--nw-accent-dark)] disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Add contact"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {entityId ? <PreCallBriefCard entityId={entityId} /> : null}
            {!entities.length ? (
              <p className="m-0 mt-2 text-[0.72rem] leading-relaxed text-[var(--nw-ink-3)]">
                Add a contact to pull prep context into this capture.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <CreateEntityModal
        open={createOpen}
        onClose={() => !createPending && setCreateOpen(false)}
        onSubmit={handleCreateEntity}
        pending={createPending}
        error={createError}
      />
    </section>
  );
}
