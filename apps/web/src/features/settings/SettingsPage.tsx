import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@notewise/ui";
import { Link } from "react-router-dom";
import { Cpu, Mic, Radio, Server, Sparkles, UserRound } from "lucide-react";
import { api } from "../../lib/api";
import {
  detectBackendKind,
  getStoredApiBase,
  kindFromProviders,
  resolveApiBase,
  setStoredApiBase,
} from "../../lib/backend";
import { PageMotion } from "../../components/PageMotion";
import { DesktopApiKeyPanel } from "../../components/DesktopApiKeyPanel";
import { isDesktopPyaiOnly } from "../../lib/desktopMode";

const PRESETS = [
  {
    id: "pyai",
    label: "PyAI (Notewise)",
    value: "http://127.0.0.1:3002",
    kind: "pyai" as const,
    note: "Hear live/batch + Recap notes · key stays on the gateway",
    icon: Sparkles,
  },
  {
    id: "nest",
    label: "Nest (legacy, hidden from Capture)",
    value: "http://127.0.0.1:3001",
    kind: "nest" as const,
    note: "Whisper + Ollama + bots — not the hackathon ship path",
    icon: Server,
    uiHidden: true,
  },
] as const;

const VISIBLE_PRESETS = PRESETS.filter((p) => !("uiHidden" in p && p.uiHidden));

/** Voice imprint enrollment UI — keep code, hide until PyAI supports voiceprint. */
const SHOW_VOICE_IMPRINT_UI = false;

export function SettingsPage() {
  const [draftBase, setDraftBase] = useState(() => getStoredApiBase() ?? resolveApiBase());
  const current = resolveApiBase();
  const labeledKind = useMemo(() => detectBackendKind(current), [current]);

  const enrollment = useQuery({
    queryKey: ["enrollment", current],
    queryFn: () => api.getEnrollment(),
    enabled: SHOW_VOICE_IMPRINT_UI,
  });
  const providers = useQuery({
    queryKey: ["providers", current],
    queryFn: () => api.listProviders(),
  });
  const health = useQuery({
    queryKey: ["health", current],
    queryFn: () => api.health(),
  });

  const liveKind =
    kindFromProviders(providers.data ?? health.data?.providers, health.data?.api) ?? labeledKind;

  const entries = Object.entries(providers.data ?? health.data?.providers ?? {});

  const applyBackend = (value: string, kind: "nest" | "pyai") => {
    setStoredApiBase(value, kind);
    window.location.reload();
  };

  const selectedId =
    current.includes(":3002") || labeledKind === "pyai"
      ? "pyai"
      : current.includes(":3001") || labeledKind === "nest"
        ? "nest"
        : null;

  return (
    <PageMotion className="nw-page-surface h-full min-h-0 overflow-auto">
      <div className="nw-page-card mx-auto max-w-3xl p-5 md:p-7">
        <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[var(--nw-accent-soft)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-accent-dark)]">
          <Cpu className="h-3.5 w-3.5" />
          Preferences
        </div>
        <h2 className="m-0 mt-2 text-2xl font-bold tracking-tight text-[var(--nw-ink)]">
          Stack
        </h2>
        <p className="mt-1.5 text-sm text-[var(--nw-ink-3)]">
          {isDesktopPyaiOnly()
            ? "Notewise desktop uses the bundled PyAI gateway on this Mac."
            : (
              <>
                PyAI is the active stack. The app stays at{" "}
                <strong>{window.location.origin}</strong> — only the API host changes.
              </>
            )}
        </p>

        {!isDesktopPyaiOnly() ? (
          <>
        <h3 className="mb-2 mt-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          <Radio className="h-3.5 w-3.5" />
          API backend
        </h3>
        <p className="m-0 mb-3 text-xs text-[var(--nw-ink-3)]">
          Active: <strong className="text-[var(--nw-ink-2)]">{current}</strong> ·{" "}
          <strong className="text-[var(--nw-ink-2)]">{liveKind}</strong>
        </p>
        <div className="flex flex-col gap-2.5">
          {VISIBLE_PRESETS.map((p) => {
            const Icon = p.icon;
            const selected = selectedId === p.id || current === p.value;
            return (
              <button
                key={p.id}
                type="button"
                className={`nw-settings-preset flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                  selected
                    ? "border-[rgb(var(--nw-accent-rgb)_/_0.35)] bg-[var(--nw-accent-soft)] shadow-[0_8px_24px_rgb(var(--nw-accent-rgb)_/_0.08)]"
                    : "border-[var(--nw-border)] bg-[var(--nw-surface-solid)] hover:border-[rgb(var(--nw-accent-rgb)_/_0.2)] hover:shadow-[var(--nw-shadow-md)]"
                }`}
                onClick={() => applyBackend(p.value, p.kind)}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    selected
                      ? "bg-[var(--nw-surface-solid)] text-[var(--nw-accent-dark)]"
                      : "bg-[var(--nw-surface-2)] text-[var(--nw-ink-3)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <strong className="text-sm text-[var(--nw-ink)]">{p.label}</strong>
                  <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--nw-ink-3)]">{p.note}</p>
                  <p className="m-0 mt-1 font-mono text-[0.65rem] text-[var(--nw-ink-4)]">{p.value}</p>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-semibold text-[var(--nw-ink-3)]">
            Custom base URL
            <input
              className="nw-page-input rounded-xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] px-3 py-2.5 text-sm font-normal text-[var(--nw-ink)] outline-none"
              value={draftBase}
              onChange={(e) => setDraftBase(e.target.value)}
              placeholder="http://127.0.0.1:3002"
            />
          </label>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const v = draftBase.trim();
              applyBackend(v, /:3002\b|pyai/i.test(v) ? "pyai" : "nest");
            }}
          >
            Apply & reload
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStoredApiBase(null);
              window.location.reload();
            }}
          >
            Use env default
          </Button>
        </div>
          </>
        ) : (
          <DesktopApiKeyPanel />
        )}

        {SHOW_VOICE_IMPRINT_UI ? (
          <>
        <h3 className="mb-2 mt-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          <UserRound className="h-3.5 w-3.5" />
          Voice imprint
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--nw-border)] nw-cta-gradient p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]">
              <Mic className="h-4 w-4" />
            </span>
            <div>
              <strong className="text-sm text-[var(--nw-ink)]">
                {enrollment.data?.enrolled ? "Enrolled" : "Not enrolled"}
              </strong>
              <p className="m-0 mt-1 max-w-prose text-xs leading-relaxed text-[var(--nw-ink-3)]">
                {liveKind === "pyai"
                  ? "PyAI has no voiceprint API — sample is stored locally; You vs Others uses check-in or stereo channels."
                  : `${enrollment.data?.samples ?? 0} sample${
                      (enrollment.data?.samples ?? 0) === 1 ? "" : "s"
                    }${
                      enrollment.data?.updatedAt
                        ? ` · updated ${new Date(enrollment.data.updatedAt).toLocaleString()}`
                        : ""
                    }`}
              </p>
            </div>
          </div>
          <Link to="/onboarding">
            <Button size="sm" variant="secondary">
              Re-enroll
            </Button>
          </Link>
        </div>
          </>
        ) : null}

        <h3 className="mb-2 mt-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
          <Sparkles className="h-3.5 w-3.5" />
          Provider constellation
        </h3>
        <p className="m-0 mb-3 text-xs text-[var(--nw-ink-3)]">
          Live from the active API ({current}).
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {entries.map(([key, value], i) => (
            <div
              key={key}
              className="nw-settings-provider rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgb(15_23_42_/_0.06)]"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-ink-4)]">
                {key}
              </span>
              <strong className="mt-1 block text-sm text-[var(--nw-ink)]">{value}</strong>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-[var(--nw-ink-4)]">
          API {health.data?.api ?? "…"} · worker {health.data?.worker ?? "…"} · secrets via env only
        </p>
      </div>
    </PageMotion>
  );
}
