import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { AuthProviders, AuthUser } from "@notewise/api-client";
import { api } from "../lib/api";
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from "../lib/authSession";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { completeOAuthSession } from "../lib/completeOAuthSession";
import {
  isDesktopBrowserOAuthAvailable,
  listenDesktopOAuthCallback,
  openGoogleOAuthInBrowser,
  prepareDesktopOAuth,
} from "../lib/desktopAuth";
import {
  clearDesktopOAuthPending,
  markDesktopOAuthPending,
} from "../lib/desktopOAuthFlag";
import { consumeAuthReturnPath } from "../lib/authFlow";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  providers: AuthProviders | null;
  browserAuthPending: boolean;
  signInGuest: (name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [browserAuthPending, setBrowserAuthPending] = useState(false);
  const oauthHandledRef = useRef(false);

  const applyToken = useCallback((token: string | null) => {
    api.setAuthToken(token);
  }, []);

  const refresh = useCallback(async () => {
    const token = getAuthToken();
    applyToken(token);
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await api.authMe();
      if (me.authenticated && me.user) {
        setUser(me.user);
        setAuthSession(token, me.user);
      } else {
        clearAuthSession();
        applyToken(null);
        setUser(null);
      }
    } catch {
      const stored = getStoredUser();
      if (stored) setUser(stored);
    }
  }, [applyToken]);

  const finishOAuthToken = useCallback(
    async (token: string) => {
      if (oauthHandledRef.current) return;
      oauthHandledRef.current = true;
      setBrowserAuthPending(false);
      clearDesktopOAuthPending();
      try {
        const { user: signedIn, fallbackPath } = await completeOAuthSession(token);
        applyToken(getAuthToken());
        setUser(signedIn);
        await refresh();
        if (isDesktopShell()) {
          try {
            const { getCurrentWindow } = await import("@tauri-apps/api/window");
            const win = getCurrentWindow();
            await win.show();
            await win.setFocus();
          } catch {
            /* ignore */
          }
        }
        navigate(consumeAuthReturnPath(fallbackPath), { replace: true });
      } catch (e) {
        oauthHandledRef.current = false;
        throw e;
      }
    },
    [applyToken, navigate, refresh],
  );

  const signInGuest = useCallback(
    async (name = "Guest") => {
      const res = await api.authGuest(name.trim() || "Guest");
      setAuthSession(res.token, res.user);
      applyToken(res.token);
      setUser(res.user);
    },
    [applyToken],
  );

  useEffect(() => {
    void (async () => {
      try {
        const p = await api.authProviders();
        setProviders(p);
      } catch {
        setProviders({
          google: { enabled: false },
          microsoft: { enabled: false, reason: "coming_soon" },
          guest: { enabled: true },
        });
      }
      await refresh();
      if (isDesktopShell() && !getAuthToken()) {
        try {
          await signInGuest("Local");
        } catch {
          /* offline gateway may reject guest — user can sign in manually */
        }
      }
      setLoading(false);
    })();
  }, [refresh, signInGuest]);

  useEffect(() => {
    if (!isDesktopBrowserOAuthAvailable()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listenDesktopOAuthCallback((token) => {
      void finishOAuthToken(token).catch(() => {
        setBrowserAuthPending(false);
        clearDesktopOAuthPending();
        oauthHandledRef.current = false;
      });
    }).then((fn) => {
      if (cancelled) {
        fn();
        return;
      }
      unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [finishOAuthToken]);

  useEffect(() => {
    if (!browserAuthPending) return;
    const timer = window.setTimeout(() => {
      setBrowserAuthPending(false);
      clearDesktopOAuthPending();
    }, 120_000);
    return () => window.clearTimeout(timer);
  }, [browserAuthPending]);


  const signInGoogle = useCallback(async () => {
    const { url } = await api.googleAuthUrl(
      isDesktopShell() ? { client: "desktop" } : undefined,
    );
    if (isDesktopShell()) {
      oauthHandledRef.current = false;
      markDesktopOAuthPending();
      setBrowserAuthPending(true);
      await prepareDesktopOAuth();
      await openGoogleOAuthInBrowser(url);
      return;
    }
    window.location.href = url;
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    applyToken(null);
    setUser(null);
    setBrowserAuthPending(false);
    oauthHandledRef.current = false;
    clearDesktopOAuthPending();
  }, [applyToken]);

  const value = useMemo(
    () => ({
      user,
      loading,
      providers,
      browserAuthPending,
      signInGuest,
      signInGoogle,
      signOut,
      refresh,
    }),
    [user, loading, providers, browserAuthPending, signInGuest, signInGoogle, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
