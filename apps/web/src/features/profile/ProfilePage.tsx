import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@notewise/ui";
import {
  Brain,
  Calendar,
  LogOut,
  RefreshCw,
  Users,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { PageMotion } from "../../components/PageMotion";
import { AiMetric, AiSurface } from "../../components/ai/AiPrimitives";
import { api } from "../../lib/api";
import { setAuthReturnPath } from "../../lib/authFlow";
import { useNetworkPulse } from "../../hooks/useEntityIntelligence";

export function ProfilePage() {
  const { user, signOut, signInGoogle } = useAuth();
  const navigate = useNavigate();

  const entities = useQuery({
    queryKey: ["entities"],
    queryFn: () => api.listEntities(),
    enabled: Boolean(user),
  });

  const calendar = useQuery({
    queryKey: ["calendar-events", user?.id],
    queryFn: () => api.listCalendarEvents(),
    enabled: Boolean(user?.calendarConnected),
  });

  const meetings = useQuery({
    queryKey: ["meetings-profile"],
    queryFn: () => api.listMeetings(),
    enabled: Boolean(user),
  });

  const pulse = useNetworkPulse(entities.data?.length ?? 0);

  if (!user) return null;

  const entityCount = entities.data?.length ?? 0;
  const meetingCount = meetings.data?.length ?? 0;
  const upcomingCount = calendar.data?.events?.length ?? 0;
  const openItems = (entities.data ?? []).reduce((n, e) => n + (e.openItemCount ?? 0), 0);

  function logout() {
    signOut();
    navigate("/login", { replace: true });
  }

  async function connectGoogle() {
    setAuthReturnPath("/profile");
    await signInGoogle();
  }

  return (
    <PageMotion className="nw-page-surface h-full min-h-0 overflow-auto p-3 md:p-5">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[var(--nw-border)]"
              />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--nw-accent-soft)] text-xl font-bold text-[var(--nw-accent-dark)]">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <p className="m-0 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-accent-dark)]">
                Your profile
              </p>
              <h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)]">{user.name}</h1>
              {user.email ? (
                <p className="m-0 mt-0.5 text-sm text-[var(--nw-ink-3)]">{user.email}</p>
              ) : null}
              <p className="m-0 mt-1 text-xs text-[var(--nw-ink-4)]">
                Signed in with {user.provider === "google" ? "Google" : "Guest"}
                {user.calendarConnected ? " · Calendar connected" : " · No calendar"}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={logout} className="text-[rgb(185_28_28)]">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </header>

        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <AiMetric label="Meetings" value={meetingCount} />
          <AiMetric label="Contacts" value={entityCount} hint="In your brain" />
          <AiMetric label="Open items" value={openItems} hint="Follow-ups" />
          <AiMetric
            label="Upcoming"
            value={user.calendarConnected ? upcomingCount : "—"}
            hint={user.calendarConnected ? "Next 14 days" : "Connect calendar"}
          />
        </div>

        <AiSurface
          title="AI intelligence snapshot"
          subtitle="Synthesized from your meeting library and relationships"
        >
          {pulse.isLoading ? (
            <p className="m-0 text-sm text-[var(--nw-ink-3)]">Analyzing your meeting brain…</p>
          ) : pulse.data?.answer?.length ? (
            <ul className="m-0 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[var(--nw-ink-2)]">
              {pulse.data.answer.map((a) => (
                <li key={a.text}>{a.text}</li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-[var(--nw-ink-3)]">
              Record or import meetings to unlock personalized intelligence briefs on your profile.
            </p>
          )}
        </AiSurface>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Link
            to="/upcoming"
            className="flex items-center gap-3 rounded-2xl border border-[var(--nw-border)] bg-white p-4 transition hover:border-[var(--nw-accent)]"
          >
            <Calendar className="h-5 w-5 text-[var(--nw-accent-dark)]" />
            <span>
              <span className="block text-sm font-semibold text-[var(--nw-ink)]">Upcoming calls</span>
              <span className="text-xs text-[var(--nw-ink-3)]">AI prep briefs</span>
            </span>
          </Link>
          <Link
            to="/people"
            className="flex items-center gap-3 rounded-2xl border border-[var(--nw-border)] bg-white p-4 transition hover:border-[var(--nw-accent)]"
          >
            <Users className="h-5 w-5 text-[var(--nw-accent-dark)]" />
            <span>
              <span className="block text-sm font-semibold text-[var(--nw-ink)]">People</span>
              <span className="text-xs text-[var(--nw-ink-3)]">Relationship graph</span>
            </span>
          </Link>
          <Link
            to="/library"
            className="flex items-center gap-3 rounded-2xl border border-[var(--nw-border)] bg-white p-4 transition hover:border-[var(--nw-accent)]"
          >
            <Brain className="h-5 w-5 text-[var(--nw-accent-dark)]" />
            <span>
              <span className="block text-sm font-semibold text-[var(--nw-ink)]">Library</span>
              <span className="text-xs text-[var(--nw-ink-3)]">Search all meetings</span>
            </span>
          </Link>
          {!user.calendarConnected ? (
            <button
              type="button"
              onClick={() => void connectGoogle()}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--nw-border)] bg-[rgb(248_250_252)] p-4 text-left transition hover:border-[var(--nw-accent)]"
            >
              <RefreshCw className="h-5 w-5 text-[var(--nw-accent-dark)]" />
              <span>
                <span className="block text-sm font-semibold text-[var(--nw-ink)]">Connect Google</span>
                <span className="text-xs text-[var(--nw-ink-3)]">Calendar prep & reminders</span>
              </span>
            </button>
          ) : null}
        </div>

        {user.calendarConnected ? (
          <div className="mt-5 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void api.syncCalendar().then(() => calendar.refetch())}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sync calendar
            </Button>
          </div>
        ) : null}
      </div>
    </PageMotion>
  );
}
