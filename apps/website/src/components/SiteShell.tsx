import { useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Github, Menu, X } from "lucide-react";
import { BrandIcon } from "@notewise/ui";
import { GITHUB_URL } from "../lib/siteConfig";

const NAV = [
  { to: "/features", label: "Features" },
  { to: "/docs", label: "Docs" },
  { to: "/stories", label: "Stories" },
  { to: "/download", label: "Download" },
  { to: "/open-source", label: "Open source" },
] as const;

export function SiteShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--nw-border)] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandIcon
              size={36}
              className="drop-shadow-[0_6px_16px_rgba(14,116,144,0.25)]"
            />
            <span className="text-sm font-bold tracking-tight">Notewise</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                      : "text-[var(--nw-ink-3)] hover:bg-[var(--nw-surface-2)] hover:text-[var(--nw-ink)]"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--nw-border)] md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <a
              href={GITHUB_URL}
              className="hidden items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-[var(--nw-ink-3)] hover:bg-[var(--nw-surface-2)] sm:inline-flex"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <Link
              to="/download"
              className="rounded-xl bg-[var(--nw-accent-dark)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              Get Notewise
            </Link>
          </div>
        </div>
        {menuOpen ? (
          <nav className="flex flex-col gap-1 border-t border-[var(--nw-border)] px-4 py-3 md:hidden">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]" : "text-[var(--nw-ink-3)]"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--nw-border)] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
          <div className="md:col-span-2">
            <p className="m-0 text-sm font-bold text-[var(--nw-ink)]">Notewise</p>
            <p className="m-0 mt-2 max-w-sm text-sm leading-relaxed text-[var(--nw-ink-3)]">
              Open-source, local-first meeting intelligence. Capture without a bot. Notes with
              receipts. Memory that compounds.
            </p>
          </div>
          <div>
            <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
              Product
            </p>
            <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-[var(--nw-ink-3)]">
              <li>
                <Link to="/features" className="hover:text-[var(--nw-accent-dark)]">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-[var(--nw-accent-dark)]">
                  Documentation
                </Link>
              </li>
              <li>
                <Link to="/stories" className="hover:text-[var(--nw-accent-dark)]">
                  User stories
                </Link>
              </li>
              <li>
                <Link to="/download" className="hover:text-[var(--nw-accent-dark)]">
                  Download
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--nw-ink-4)]">
              Project
            </p>
            <ul className="m-0 mt-2 list-none space-y-1.5 p-0 text-sm text-[var(--nw-ink-3)]">
              <li>
                <Link to="/open-source" className="hover:text-[var(--nw-accent-dark)]">
                  Open source
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[var(--nw-accent-dark)]">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--nw-border)] px-4 py-4 text-center text-xs text-[var(--nw-ink-4)] md:px-6">
          MIT License · Local-first · No accounts · No telemetry
        </div>
      </footer>
    </div>
  );
}
