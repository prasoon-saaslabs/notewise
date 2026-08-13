import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@notewise/ui";
import { Brain, Calendar, FileText, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AppBrand } from "../../components/AppBrand";
import { consumeAuthReturnPath, setAuthReturnPath } from "../../lib/authFlow";

const AI_FEATURES = [
  { icon: Calendar, text: "Calendar-driven prep briefs before every call" },
  { icon: Brain, text: "Relationship memory across people & companies" },
  { icon: FileText, text: "Notes with receipts — every claim linked to transcript" },
] as const;

export function LoginPage() {
  const { providers, signInGuest, signInGoogle } = useAuth();
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
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[linear-gradient(180deg,#f0fdfa_0%,var(--nw-paper)_45%,#fff_100%)] p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <AppBrand size="lg" className="mb-8" />

        <div className="rounded-3xl border border-[var(--nw-border)] bg-white p-6 shadow-[0_20px_50px_rgb(15_23_42_/_0.08)] sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-[var(--nw-accent-dark)]">
            <Sparkles className="h-4 w-4" />
            <p className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em]">
              Sign in to your meeting brain
            </p>
          </div>

          <ul className="m-0 mb-6 flex list-none flex-col gap-2.5 p-0">
            {AI_FEATURES.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2.5 rounded-xl bg-[rgb(248_250_252)] px-3 py-2 text-xs leading-relaxed text-[var(--nw-ink-2)]"
              >
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--nw-accent-dark)]" />
                {text}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              disabled={busy || !googleEnabled}
              onClick={() => void continueGoogle()}
              className="justify-center"
            >
              <Calendar className="h-4 w-4" />
              Continue with Google
            </Button>
            {!googleEnabled ? (
              <p className="m-0 text-xs text-[var(--nw-ink-4)]">
                Add Google OAuth credentials to the gateway <code className="text-[0.7rem]">.env</code> to
                enable calendar sync.
              </p>
            ) : (
              <p className="m-0 text-xs text-[var(--nw-ink-4)]">
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
                className="mt-1.5 w-full rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
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
            <p className="mt-4 m-0 text-sm text-[rgb(185_28_28)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="m-0 mt-6 text-center text-[0.65rem] text-[var(--nw-ink-4)]">
          Local-first · MIT open source · Your data stays on your Mac
        </p>
      </div>
    </div>
  );
}
