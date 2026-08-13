import { NavLink, Outlet } from "react-router-dom";
import {
  Calendar,
  Library,
  Mic,
  Settings2,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { LogoMark } from "@notewise/ui";
import { MeetingBrainHeaderTrigger } from "./MeetingBrain";
import { UserMenu } from "./UserMenu";

const links = [
  { to: "/", label: "Capture", hint: "Live STT", end: true, icon: Mic },
  {
    to: "/upcoming",
    label: "Upcoming",
    hint: "Prep briefs",
    end: false,
    icon: Calendar,
  },
  {
    to: "/library",
    label: "Library",
    hint: "Notes & search",
    end: false,
    icon: Library,
  },
  {
    to: "/people",
    label: "People",
    hint: "Relationship AI",
    end: false,
    icon: Users,
  },
  {
    to: "/profile",
    label: "Profile",
    hint: "Account & AI",
    end: false,
    icon: UserRound,
  },
  {
    to: "/trust",
    label: "Trust",
    hint: "Gates & spend",
    end: false,
    icon: Shield,
  },
  {
    to: "/settings",
    label: "Settings",
    hint: "Stack & voice",
    end: false,
    icon: Settings2,
  },
] as const;

export function AppShell() {
  return (
    <div className="nw-shell flex h-full">
      <aside className="nw-shell-rail hidden w-[72px] shrink-0 flex-col items-center py-3 md:flex lg:w-[200px] lg:items-stretch lg:px-2.5 lg:py-4 xl:w-[228px] xl:px-3">
        <div className="mb-4 flex flex-col items-center lg:mb-6 lg:flex-row lg:gap-2.5 lg:px-2">
          <LogoMark
            className="nw-shell-brand"
            size={36}
            title="Notewise"
          />
          <div className="nw-shell-brand-text hidden min-w-0 lg:block">
            <p className="m-0 truncate text-sm font-bold tracking-tight text-[var(--nw-ink)]">
              Notewise
            </p>
            <p className="m-0 truncate text-[0.65rem] text-[var(--nw-ink-4)]">
              AI meeting intelligence
            </p>
          </div>
        </div>

        <nav
          className="flex w-full flex-1 flex-col items-center gap-1 px-1.5 lg:items-stretch lg:px-0"
          aria-label="Primary"
        >
          {links.map(({ to, label, hint, end, icon: Icon }, i) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={`${label} — ${hint}`}
              aria-label={label}
              className={({ isActive }) =>
                `nw-shell-nav group relative flex w-full flex-col items-center justify-center gap-1 rounded-full px-1 py-2 text-[0.62rem] font-medium transition lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5 ${
                  isActive
                    ? "is-active nw-glass-nav-active text-[var(--nw-accent-dark)]"
                    : "text-[var(--nw-ink-3)] hover:bg-white/40 hover:text-[var(--nw-ink)]"
                }`
              }
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition lg:h-8 lg:w-8 ${
                      isActive
                        ? "bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
                        : "bg-transparent text-current group-hover:bg-[var(--nw-surface-2)]"
                    }`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="nw-shell-nav-label flex min-w-0 flex-col items-center lg:items-start">
                    <span className="max-w-full truncate leading-none">
                      {label}
                    </span>
                    <span className="mt-0.5 hidden text-[0.6rem] font-normal normal-case tracking-normal text-[var(--nw-ink-4)] xl:block">
                      {hint}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="nw-shell-header flex w-full shrink-0 items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 md:px-5">
          <MeetingBrainHeaderTrigger />
          <UserMenu />
        </header>

        <main className="nw-shell-main min-h-0 flex-1 overflow-hidden p-2.5 sm:p-3 md:p-4">
          <Outlet />
        </main>

        <nav
          className="nw-shell-mobile flex px-1 py-1 md:hidden"
          aria-label="Mobile"
        >
          {links.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-2 text-[0.6rem] font-medium transition ${
                  isActive
                    ? "nw-glass-nav-active text-[var(--nw-accent-dark)]"
                    : "text-[var(--nw-ink-3)]"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
