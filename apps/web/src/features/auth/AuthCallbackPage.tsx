import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AppBrand } from "../../components/AppBrand";
import { consumeAuthReturnPath } from "../../lib/authFlow";
import { completeOAuthSession } from "../../lib/completeOAuthSession";
import { isDesktopShell } from "../../capture/desktopMiniWindow";
import { Button } from "@notewise/ui";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    // Desktop OAuth completes on localhost:17654 — this route is web-only.
    if (isDesktopShell()) {
      navigate("/", { replace: true });
      return;
    }

    if (handled.current) return;
    handled.current = true;

    void (async () => {
      try {
        const { fallbackPath } = await completeOAuthSession(token);
        window.history.replaceState({}, "", "/auth/callback");
        await refresh();
        navigate(consumeAuthReturnPath(fallbackPath), { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed");
      }
    })();
  }, [token, navigate, refresh]);

  if (error) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-[var(--nw-paper)] p-6">
        <AppBrand size="md" showTagline={false} />
        <p className="m-0 max-w-sm text-center text-sm text-[rgb(185_28_28)]" role="alert">
          {error}
        </p>
        <Button variant="secondary" onClick={() => navigate("/login", { replace: true })}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-[var(--nw-paper)] p-6">
      <AppBrand size="md" showTagline={false} />
      <div className="flex items-center gap-2 text-sm text-[var(--nw-ink-3)]">
        <Sparkles className="h-4 w-4 animate-pulse text-[var(--nw-accent-dark)]" />
        Finishing sign-in and syncing your calendar…
      </div>
    </div>
  );
}
