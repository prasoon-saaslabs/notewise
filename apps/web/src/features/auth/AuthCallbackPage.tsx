import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { AppBrand } from "../../components/AppBrand";
import { setAuthSession } from "../../lib/authSession";
import { consumeAuthReturnPath } from "../../lib/authFlow";
import { api } from "../../lib/api";

export function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    api.setAuthToken(token);
    void (async () => {
      try {
        const me = await api.authMe();
        if (me.user) setAuthSession(token, me.user);
        await refresh();
        const fallback = me.user?.calendarConnected ? "/upcoming" : "/";
        navigate(consumeAuthReturnPath(fallback), { replace: true });
      } catch {
        navigate("/login", { replace: true });
      }
    })();
  }, [params, navigate, refresh]);

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
