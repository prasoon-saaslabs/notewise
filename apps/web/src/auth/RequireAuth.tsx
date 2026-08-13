import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { AppBrand } from "../components/AppBrand";

function AuthLoading() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-[var(--nw-paper)]">
      <AppBrand size="md" />
      <p className="m-0 text-sm text-[var(--nw-ink-3)]">Loading your session…</p>
    </div>
  );
}

/** Redirect unauthenticated visitors to the login page. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Keep signed-in users off the login screen. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <AuthLoading />;
  if (user) return <Navigate to="/" replace />;
  return children;
}
