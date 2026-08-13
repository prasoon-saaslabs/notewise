import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@notewise/ui";
import { Brain, Calendar, FileText, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AppBrand } from "../../components/AppBrand";
import { ThemePicker } from "../../components/ThemePicker";
import { consumeAuthReturnPath, setAuthReturnPath } from "../../lib/authFlow";
import { isDesktopShell } from "../../capture/desktopMiniWindow";

const AI_FEATURES = [
  { icon: Calendar, text: "Calendar-driven prep briefs before every call" },
  { icon: Brain, text: "Relationship memory across people & companies" },
  { icon: FileText, text: "Notes with receipts — every claim linked to transcript" },
] as const;

export function LoginPage() {
  const { providers, signInGuest, signInGoogle, browserAuthPending } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleEnabled = providers?.google.enabled;
  const returnPath =
    (location.state as { from?: string } | null)?.from && (location.state as { from: string }).from !== "/login"
      ? (location.state as { from: string }).from
      : "/";

  async function continueGuest() {
    setBusy(true);
    setError(null);
    try {
      await signInGuest(guestName.trim() || "Guest");
      navigate(consumeAuthReturnPath(returnPath), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue as guest");
    } finally {
      setBusy(false);
    }
  }

  async function continueGoogle() {
    setBusy(true);
    setError(null);
    try {
      setAuthReturnPath(returnPath);
      await signInGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in unavailable");
      setBusy(false);
    } finally {
      if (!isDesktopShell()) setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemePicker />
      </div>
      <div className="nw-editorial-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div className="nw-paper-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(ellipse_at_top,_var(--nw-accent-glow),transparent_55%)]"
        aria-hidden
      />

      <div className="relative w-full max-w-[420px]">
        <AppBrand size="lg" className="mb-8" />

        <div className="nw-glass-panel rounded-[28px] p-6 sm:p-8">
          <p className="m-0 mb-5 text-sm font-medium text-[var(--nw-accent)]">
            Sign in to your meeting brain
          </p>

          <ul className="m-0 mb-6 flex list-none flex-col gap-2.5 p-0">
            {AI_FEATURES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2.5 rounded-2xl border border-[var(--nw-border)] bg-[var(--nw-accent-subtle)]/60 px-3.5 py-2.5 text-xs leading-relaxed text-[var(--nw-ink-2)]"
              >
                <span className="mt-0.5 inline-flex rounded-xl bg-[var(--nw-accent-soft)] p-1.5 text-[var(--nw-accent)]">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={busy || browserAuthPending || !googleEnabled}
              onClick={() => void continueGoogle()}
              className="justify-center"
            >
              <Calendar className="h-4 w-4" />
              {browserAuthPending ? "Waiting for browser…" : "Continue with Google"}
            </Button>
            {browserAuthPending ? (
              <p className="m-0 text-xs text-[var(--nw-accent-dark)]">
                Finish sign-in in your default browser, then return here — Notewise will log you in
                automatically.
              </p>
            ) : null}
            {!googleEnabled ? (
              <p className="m-0 text-xs text-[var(--nw-ink-3)]">
                Add Google OAuth credentials to the gateway <code className="text-[0.7rem]">.env</code> to
                enable calendar sync.
              </p>
            ) : (
              <p className="m-0 text-xs text-[var(--nw-ink-3)]">
                Read-only calendar access for prep reminders. Add yourself as a{" "}
                <strong>Test user</strong> in Google Cloud if you see access_denied.
              </p>
            )}

            <Button variant="secondary" disabled className="justify-center opacity-60">
              Microsoft — coming soon
            </Button>

            <div className="my-1 border-t border-[var(--nw-border)]" />

            <label className="block text-sm font-medium text-[var(--nw-ink-2)]">
              Continue as guest
              <input
                className="nw-page-input mt-1.5 w-full rounded-full border border-[var(--nw-glass-border)] bg-[var(--nw-glass-bg)] px-4 py-2.5 text-sm outline-none backdrop-blur-md"
                placeholder="Your name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void continueGuest();
                }}
              />
            </label>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => void continueGuest()}
              className="justify-center"
            >
              <UserRound className="h-4 w-4" />
              Enter without calendar
            </Button>
          </div>

          {error ? (
            <p className="mt-4 m-0 text-sm text-[var(--nw-danger)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="m-0 mt-6 text-center text-xs text-[var(--nw-ink-3)]">
          Local-first · MIT open source · Your data stays on your Mac
        </p>
      </div>
    </div>
  );
}
