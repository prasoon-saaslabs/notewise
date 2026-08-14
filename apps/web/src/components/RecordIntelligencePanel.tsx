import { useEffect, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { NotesPayload } from "@notewise/api-client";
import type { ProcessPhase } from "../hooks/useRecorder";
import { modeHint } from "../lib/meetingModes";
import { useAiWorkspace } from "../hooks/useAiWorkspace";
import { AiWorkspaceContent } from "./AiWorkspaceContent";

export function RecordIntelligencePanel({
  sessionLive,
  phase,
  hasNotes,
  meetingId,
  sessionId,
  userNotes,
  onNotesUpdated,
  onRegeneratingChange,
}: {
  sessionLive: boolean;
  phase: ProcessPhase;
  hasNotes: boolean;
  meetingId?: string | null;
  sessionId?: string | null;
  userNotes?: string;
  onNotesUpdated?: (detail: {
    transcript?: Array<{
      id: string;
      speaker: string;
      kind: string;
      text: string;
    }>;
    notes?: NotesPayload | null;
  }) => void;
  onRegeneratingChange?: (active: boolean) => void;
}) {
  const [open, setOpen] = useState(true);
  const workspace = useAiWorkspace({
    sessionLive,
    phase,
    hasNotes,
    meetingId,
    sessionId,
    userNotes,
    onNotesUpdated,
    onRegeneratingChange,
  });

  useEffect(() => {
    if (sessionLive) {
      setOpen(true);
    }
  }, [sessionLive]);

  const collapsedSubtitle = `${modeHint(workspace.modeId)}${
    workspace.entityId
      ? ` · ${workspace.entities.find((e) => e.id === workspace.entityId)?.name ?? "Contact"}`
      : ""
  }`;

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
            {open
              ? sessionLive
                ? "Mode applies to this capture"
                : hasNotes
                  ? "Change mode to regenerate notes"
                  : "Set context before you record"
              : collapsedSubtitle}
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
          <AiWorkspaceContent
            modeId={workspace.modeId}
            modeError={workspace.modeError}
            showRegenOverlay={workspace.showRegenOverlay}
            activeModeName={workspace.activeModeName}
            canRegenerate={workspace.canRegenerate}
            onModeChange={workspace.handleModeChange}
            entities={workspace.entities}
            entityId={workspace.entityId}
            onSelectEntity={workspace.selectEntity}
            onClearEntity={workspace.clearEntity}
            onOpenCreateEntity={workspace.openCreateEntity}
            createOpen={workspace.createOpen}
            createPending={workspace.createPending}
            createError={workspace.createError}
            onCloseCreateEntity={workspace.closeCreateEntity}
            onCreateEntity={workspace.handleCreateEntity}
          />
        </div>
      ) : null}
    </section>
  );
}
