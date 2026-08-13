import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Reading transcript…",
  "Running PyAI Recap…",
  "Extracting actions & objections…",
  "Verifying citations…",
];

export function RegeneratingNotes({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % STEPS.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.22)] nw-accent-panel-gradient p-5"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)] blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--nw-surface-solid)] shadow-sm ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.15)]">
          <Sparkles className="h-5 w-5 animate-pulse text-[var(--nw-accent-dark)]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">Regenerating with AI</p>
          <p className="mt-1 m-0 text-xs text-[var(--nw-accent-dark)]">{STEPS[step]}</p>
          <div className="mt-3 space-y-2">
            <div className="nw-skeleton h-3 w-[88%] rounded-full" />
            <div className="nw-skeleton h-3 w-full rounded-full" />
            <div className="nw-skeleton h-3 w-[72%] rounded-full" />
            <div className="nw-skeleton mt-3 h-3 w-[45%] rounded-full" />
            <div className="nw-skeleton h-3 w-[92%] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
