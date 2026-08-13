import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, UserRound } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!user) return null;

  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();
  const providerLabel =
    user.provider === "google" ? "Google" : user.provider === "guest" ? "Guest" : user.provider;

  function handleLogout() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative z-40 ml-auto shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-[var(--nw-border)] bg-white py-1 pl-1 pr-2.5 text-left transition hover:border-[rgb(14_116_144_/_0.25)] hover:shadow-sm"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--nw-accent-soft)] text-xs font-bold text-[var(--nw-accent-dark)]">
            {initial}
          </span>
        )}
        <span className="hidden max-w-[7rem] truncate text-xs font-semibold text-[var(--nw-ink-2)] sm:inline">
          {user.name}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-[100] w-56 overflow-hidden rounded-2xl border border-[var(--nw-border)] bg-white shadow-[0_16px_40px_rgb(15_23_42_/_0.12)]"
        >
          <div className="border-b border-[var(--nw-border)] px-3 py-2.5">
            <p className="m-0 truncate text-sm font-semibold text-[var(--nw-ink)]">{user.name}</p>
            {user.email ? (
              <p className="m-0 mt-0.5 truncate text-[0.65rem] text-[var(--nw-ink-4)]">{user.email}</p>
            ) : null}
            <p className="m-0 mt-1 text-[0.58rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
              {providerLabel}
              {user.calendarConnected ? " · Calendar on" : ""}
            </p>
          </div>
          <div className="p-1">
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
            >
              <UserRound className="h-4 w-4 text-[var(--nw-ink-4)]" />
              Profile
            </Link>
            <Link
              to="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--nw-ink-2)] hover:bg-[var(--nw-surface-2)]"
            >
              <Settings className="h-4 w-4 text-[var(--nw-ink-4)]" />
              Settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-[rgb(185_28_28)] hover:bg-[rgb(254_242_242)]"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
