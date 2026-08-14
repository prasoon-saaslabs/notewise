import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STEPS = [
  "Reading transcript…",
  "Running PyAI Recap…",
  "Extracting actions & objections…",
  "Verifying citations…",
];

export function RegeneratingNotes({
  active,
  modeName,
  reason = "regenerate",
}: {
  active: boolean;
  modeName?: string;
  reason?: "regenerate" | "mode-change";
}) {
  const [step, setStep] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setStep(0);
      setStepVisible(true);
      return;
    }
    const id = window.setInterval(() => {
      setStepVisible(false);
      window.setTimeout(() => {
        setStep((s) => (s + 1) % STEPS.length);
        setStepVisible(true);
      }, 180);
    }, 1800);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const headline =
    reason === "mode-change" && modeName
      ? `Switching to ${modeName}…`
      : modeName
        ? `Regenerating with ${modeName}…`
        : "Regenerating with AI";

  return (
    <div
      className="nw-regen-panel relative overflow-hidden rounded-2xl border border-[rgb(var(--nw-accent-rgb)_/_0.22)] nw-accent-panel-gradient p-5"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="nw-regen-shimmer pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)] blur-2xl nw-regen-glow" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[rgb(79_70_229_/_0.08)] blur-2xl nw-regen-glow-delayed" />

      <div className="relative flex items-start gap-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--nw-surface-solid)] shadow-sm ring-1 ring-[rgb(var(--nw-accent-rgb)_/_0.15)]">
          <span className="nw-regen-ring absolute inset-0 rounded-xl" aria-hidden />
          <Sparkles className="relative h-5 w-5 text-[var(--nw-accent-dark)] nw-regen-spark" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">{headline}</p>
          <p
            className={`mt-1 m-0 text-xs text-[var(--nw-accent-dark)] transition-opacity duration-200 ${
              stepVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {STEPS[step]}
          </p>
          <div className="nw-regen-progress mt-3 h-1 overflow-hidden rounded-full bg-[rgb(var(--nw-accent-rgb)_/_0.12)]">
            <div className="nw-regen-progress-bar h-full w-2/5 rounded-full bg-[linear-gradient(90deg,var(--nw-accent),#0ea5e9)]" />
          </div>
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
