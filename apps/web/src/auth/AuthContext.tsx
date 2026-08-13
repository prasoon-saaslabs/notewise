import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthProviders, AuthUser } from "@notewise/api-client";
import { api } from "../lib/api";
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  setAuthSession,
} from "../lib/authSession";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  providers: AuthProviders | null;
  signInGuest: (name?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<AuthProviders | null>(null);

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
      setLoading(false);
    })();
  }, [refresh]);

  const signInGuest = useCallback(
    async (name = "Guest") => {
      const res = await api.authGuest(name.trim() || "Guest");
      setAuthSession(res.token, res.user);
      applyToken(res.token);
      setUser(res.user);
    },
    [applyToken],
  );

  const signInGoogle = useCallback(async () => {
    const { url } = await api.googleAuthUrl();
    window.location.href = url;
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  const value = useMemo(
    () => ({ user, loading, providers, signInGuest, signInGoogle, signOut, refresh }),
    [user, loading, providers, signInGuest, signInGoogle, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth requires AuthProvider");
  return ctx;
}
