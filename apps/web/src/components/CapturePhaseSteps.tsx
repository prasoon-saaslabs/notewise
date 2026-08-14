import type { ProcessPhase } from "../hooks/useRecorder";

const PHASES: Array<{ id: ProcessPhase; label: string }> = [
  { id: "uploading", label: "Upload" },
  { id: "transcribing", label: "Transcribe" },
  { id: "speakers", label: "Speakers" },
  { id: "notes", label: "Notes" },
];

function phaseIndex(phase: ProcessPhase) {
  const order: ProcessPhase[] = ["uploading", "transcribing", "speakers", "notes", "ready"];
  return order.indexOf(phase);
}

export function CapturePhaseSteps({ phase }: { phase: ProcessPhase }) {
  const idx = phaseIndex(phase);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {PHASES.map((step, i) => {
        const done = phase === "ready" || i < idx;
        const active = step.id === phase;

        return (
          <div
            key={step.id}
            className={`nw-capture-phase inline-flex items-center gap-1.5 rounded-[var(--nw-radius-pill)] px-2.5 py-1 text-[0.68rem] font-semibold ${
              active
                ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                : done
                  ? "bg-[var(--nw-success-soft)] text-[var(--nw-success)]"
                  : "bg-[var(--nw-surface-solid)] text-[var(--nw-ink-4)]"
            }`}
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--nw-glass-bg-strong)] text-[0.55rem] font-bold">
              {done && !active ? "✓" : i + 1}
            </span>
            {step.label}
            {active ? <span className="nw-pulse-dot" /> : null}
          </div>
        );
      })}
    </div>
  );
}

export function isCaptureProcessingPhase(phase: ProcessPhase) {
  return phase === "uploading" || phase === "transcribing" || phase === "speakers" || phase === "notes";
}
