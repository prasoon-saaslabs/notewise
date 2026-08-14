import { Plus, Users } from "lucide-react";
import type { EntityRecord } from "@notewise/api-client";
import { MeetingModePicker } from "./MeetingModePicker";
import { PreCallBriefCard } from "./PreCallBriefCard";
import { RegeneratingNotes } from "./RegeneratingNotes";
import { CreateEntityModal } from "./people/CreateEntityModal";

function entityPillClass(active: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold transition backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-55 ${
    active
      ? "border border-[rgb(var(--nw-accent-rgb)_/_0.32)] bg-[rgb(var(--nw-accent-rgb)_/_0.16)] text-[var(--nw-accent-dark)] shadow-[0_4px_16px_rgb(var(--nw-accent-rgb)_/_0.1)]"
      : "bg-[var(--nw-glass-bg)] text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] hover:bg-[rgb(var(--nw-accent-rgb)_/_0.08)] disabled:hover:bg-[var(--nw-glass-bg)]"
  }`;
}

type Props = Readonly<{
  modeId: string;
  modeError: string | null;
  showRegenOverlay: boolean;
  activeModeName: string;
  canRegenerate: boolean;
  onModeChange: (modeId: string) => void;
  entities: EntityRecord[];
  entityId: string;
  onSelectEntity: (id: string) => void;
  onClearEntity: () => void;
  onOpenCreateEntity: () => void;
  createOpen: boolean;
  createPending: boolean;
  createError: string | null;
  onCloseCreateEntity: () => void;
  onCreateEntity: (body: {
    name: string;
    kind: EntityRecord["kind"];
    company?: string | null;
  }) => void;
}>;

export function AiWorkspaceContent({
  modeId,
  modeError,
  showRegenOverlay,
  activeModeName,
  canRegenerate,
  onModeChange,
  entities,
  entityId,
  onSelectEntity,
  onClearEntity,
  onOpenCreateEntity,
  createOpen,
  createPending,
  createError,
  onCloseCreateEntity,
  onCreateEntity,
}: Props) {
  return (
    <>
      <MeetingModePicker
        value={modeId}
        onChange={(next) => void onModeChange(next)}
        disabled={false}
        pending={showRegenOverlay}
      />
      {showRegenOverlay && canRegenerate ? (
        <RegeneratingNotes
          active
          modeName={activeModeName}
          reason="mode-change"
        />
      ) : null}
      {modeError ? (
        <p className="m-0 text-[0.72rem] text-[var(--nw-danger)]" role="alert">
          {modeError}
        </p>
      ) : null}

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          <Users className="h-3.5 w-3.5" />
          Meeting with
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearEntity}
            className={entityPillClass(!entityId)}
          >
            Anyone
          </button>
          {entities.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onSelectEntity(e.id)}
              className={entityPillClass(entityId === e.id)}
            >
              {e.name}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenCreateEntity}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--nw-glass-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--nw-ink-2)] ring-1 ring-[var(--nw-border)] transition hover:bg-[rgb(var(--nw-accent-rgb)_/_0.08)] hover:text-[var(--nw-accent-dark)]"
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

      <CreateEntityModal
        open={createOpen}
        onClose={onCloseCreateEntity}
        onSubmit={onCreateEntity}
        pending={createPending}
        error={createError}
      />
    </>
  );
}
