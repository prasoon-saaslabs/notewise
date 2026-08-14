import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import {
  useAiWorkspace,
  type AiWorkspaceOptions,
} from "../hooks/useAiWorkspace";
import { AiWorkspaceContent } from "./AiWorkspaceContent";

type Props = AiWorkspaceOptions & {
  className?: string;
};

export function AiWorkspacePopover({
  className = "",
  sessionLive,
  hasNotes,
  ...rest
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const workspace = useAiWorkspace({
    sessionLive,
    hasNotes,
    ...rest,
  });

  const subtitle = sessionLive
    ? "Mode applies to this capture"
    : hasNotes
      ? "Change mode to regenerate notes"
      : "Set context before you record";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (workspace.createOpen) return;
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !workspace.createOpen) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, workspace.createOpen]);

  return (
    <div className={`relative shrink-0 ${className}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] border px-3 py-1.5 text-xs font-semibold transition ${
          open
            ? "border-[rgb(var(--nw-accent-rgb)_/_0.32)] bg-[rgb(var(--nw-accent-rgb)_/_0.1)] text-[var(--nw-accent-dark)] shadow-[0_4px_16px_rgb(var(--nw-accent-rgb)_/_0.08)]"
            : "border-[var(--nw-border)] bg-[var(--nw-surface-solid)] text-[var(--nw-ink-2)] hover:border-[rgb(var(--nw-accent-rgb)_/_0.25)] hover:text-[var(--nw-accent-dark)]"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>AI workspace</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="AI workspace"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))]"
        >
          <section className="nw-accent-panel-gradient overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.18)] shadow-[var(--nw-shadow-lg)]">
            <header className="border-b border-[rgb(var(--nw-accent-rgb)_/_0.12)] px-4 py-3">
              <p className="m-0 text-sm font-semibold tracking-tight text-[var(--nw-ink)]">
                AI workspace
              </p>
              <p className="m-0 text-[0.68rem] text-[var(--nw-ink-3)]">
                {subtitle}
              </p>
            </header>
            <div className="flex max-h-[min(70vh,28rem)] flex-col gap-4 overflow-auto p-4">
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
          </section>
        </div>
      ) : null}
    </div>
  );
}
