import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMatch, useNavigate } from "react-router-dom";
import { Brain, Sparkles, X } from "lucide-react";
import { VoiceAsk } from "./VoiceAsk";

export type BrainCitation = {
  meetingId: string;
  meetingTitle?: string;
  lineId: string;
  startMs: number;
  text: string;
  speaker?: string;
};

type MeetingBrainContextValue = {
  open: boolean;
  openBrain: (opts?: { entityId?: string }) => void;
  closeBrain: () => void;
  entityId: string | undefined;
  jumpToCitation: (citation: BrainCitation) => void;
};

const MeetingBrainContext = createContext<MeetingBrainContextValue | null>(null);

export function useMeetingBrain() {
  const ctx = useContext(MeetingBrainContext);
  if (!ctx) throw new Error("useMeetingBrain must be used within MeetingBrainProvider");
  return ctx;
}

export function MeetingBrainProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const peopleMatch = useMatch("/people/:id");
  const [open, setOpen] = useState(false);
  const [entityOverride, setEntityOverride] = useState<string | undefined>();

  const defaultEntityId = useMemo(() => {
    if (peopleMatch?.params.id) return peopleMatch.params.id;
    try {
      return localStorage.getItem("og-entity-id") || undefined;
    } catch {
      return undefined;
    }
  }, [peopleMatch?.params.id]);

  const entityId = entityOverride ?? defaultEntityId;

  const closeBrain = useCallback(() => {
    setOpen(false);
    setEntityOverride(undefined);
  }, []);

  const openBrain = useCallback((opts?: { entityId?: string }) => {
    setEntityOverride(opts?.entityId);
    setOpen(true);
  }, []);

  const jumpToCitation = useCallback(
    (citation: BrainCitation) => {
      closeBrain();
      navigate(`/library/${citation.meetingId}`, {
        state: { jumpLineId: citation.lineId, jumpStartMs: citation.startMs },
      });
    },
    [closeBrain, navigate],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeBrain();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeBrain]);

  const value = useMemo(
    () => ({ open, openBrain, closeBrain, entityId, jumpToCitation }),
    [open, openBrain, closeBrain, entityId, jumpToCitation],
  );

  return (
    <MeetingBrainContext.Provider value={value}>
      {children}
      {open ? (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-[rgb(15_23_42_/_0.45)] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center sm:p-6"
          role="presentation"
          onClick={closeBrain}
        >
          <div
            className="flex max-h-[min(88vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-[rgb(255_255_255_/_0.52)] bg-[rgb(255_255_255_/_0.58)] shadow-[0_8px_32px_rgb(15_23_42_/_0.12)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-brain-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--nw-border)] px-4 py-3.5 sm:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
                  <Brain className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="meeting-brain-title" className="m-0 text-base font-semibold text-[var(--nw-ink)]">
                    Notewise brain
                  </h2>
                  <p className="m-0 mt-0.5 text-xs text-[var(--nw-ink-3)]">
                    Search past meetings · tap a source to jump there
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--nw-ink-4)] hover:bg-[rgb(248_250_252)]"
                aria-label="Close"
                onClick={closeBrain}
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-5">
              <VoiceAsk
                entityId={entityId}
                autoFocus
                onCitationClick={jumpToCitation}
              />
            </div>
          </div>
        </div>
      ) : null}
    </MeetingBrainContext.Provider>
  );
}

export function MeetingBrainHeaderTrigger() {
  const { openBrain } = useMeetingBrain();

  return (
    <button
      type="button"
      className="flex w-full max-w-xl min-w-0 items-center gap-2.5 rounded-full border border-[rgb(255_255_255_/_0.62)] bg-[rgb(255_255_255_/_0.48)] px-4 py-2.5 text-left text-sm text-[var(--nw-ink-3)] shadow-[0_4px_20px_rgb(15_23_42_/_0.06)] backdrop-blur-md transition hover:border-[rgb(255_255_255_/_0.78)] hover:bg-[rgb(255_255_255_/_0.65)] hover:text-[var(--nw-ink-2)]"
      onClick={() => openBrain()}
    >
      <Sparkles className="h-4 w-4 shrink-0 text-[var(--nw-accent-dark)]" />
      <span className="truncate">Ask your meeting brain…</span>
    </button>
  );
}
