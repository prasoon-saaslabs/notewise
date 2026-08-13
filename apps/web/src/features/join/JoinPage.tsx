import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@notewise/ui";
import {
  ArrowRight,
  Bot,
  Link2,
  Mic,
  Settings2,
  ShieldCheck,
  Sparkles,
  Video,
  VideoOff,
} from "lucide-react";
import { api } from "../../lib/api";
import { isPyaiBackend } from "../../lib/backend";
import { PageMotion } from "../../components/PageMotion";

function detectPlatform(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("meet.google.com")) return "Google Meet";
    if (host.includes("zoom.us") || host.includes("zoom.com")) return "Zoom";
    if (host.includes("teams.microsoft.com") || host.includes("teams.live.com"))
      return "Microsoft Teams";
    return null;
  } catch {
    return null;
  }
}

function PyaiUnsupportedJoin() {
  const navigate = useNavigate();

  return (
    <PageMotion className="nw-page-surface flex h-full min-h-0 items-center justify-center overflow-auto p-3 md:p-5">
      <section className="nw-page-card nw-join-unsupported relative w-full max-w-xl overflow-hidden px-6 py-10 text-center md:px-10 md:py-12">
        <div className="nw-page-card-glow" aria-hidden />
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="nw-join-unsupported-orb mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--nw-accent-soft)] text-[var(--nw-accent-dark)]"
            aria-hidden
          >
            <VideoOff className="h-7 w-7" strokeWidth={1.75} />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgb(255_251_235)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[rgb(146_64_14)] ring-1 ring-[rgb(217_119_6_/_0.25)]">
            <Bot className="h-3.5 w-3.5" />
            PyAI · unsupported
          </div>

          <h2 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)] md:text-[1.85rem]">
            Meeting bot join isn’t available
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--nw-ink-3)]">
            You’re connected to the <strong className="font-semibold text-[var(--nw-ink-2)]">PyAI</strong>{" "}
            backend. Bot join for Meet, Zoom, and Teams runs on Nest only. Capture locally with Hear,
            or switch backends in Settings.
          </p>

          <ul className="nw-join-unsupported-list mt-6 w-full max-w-sm space-y-2 text-left">
            {[
              "Live capture & transcript via Hear",
              "Notes and action items in Library",
              "No in-meeting bot on PyAI yet",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 rounded-xl bg-[rgb(248_250_252)] px-3.5 py-2.5 text-sm text-[var(--nw-ink-2)]"
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--nw-accent-dark)]" />
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:justify-center">
            <Button size="lg" className="w-full sm:w-auto" onClick={() => navigate("/")}>
              <Mic className="h-4 w-4" />
              Capture locally
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => navigate("/settings")}
            >
              <Settings2 className="h-4 w-4" />
              Switch to Nest
            </Button>
          </div>
        </div>
      </section>
    </PageMotion>
  );
}

function NestJoinForm() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const providers = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.listProviders(),
    staleTime: 30_000,
  });

  const platform = useMemo(() => detectPlatform(url.trim()), [url]);
  const botProvider = providers.data?.meetingBot ?? "auto";

  const join = useMutation({
    mutationFn: () =>
      api.joinMeeting({ meetingUrl: url.trim(), title: title.trim() || undefined }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      navigate(`/library/${res.meetingId}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <PageMotion className="nw-page-surface grid h-full min-h-0 gap-3 overflow-auto lg:grid-cols-[1.15fr_0.85fr]">
      <section className="nw-page-card relative overflow-hidden p-5 md:p-7">
        <div className="nw-page-card-glow" aria-hidden />
        <div className="relative z-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--nw-accent-soft)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--nw-accent-dark)]">
            <Bot className="h-3.5 w-3.5" />
            Meeting bot
          </div>
          <h2 className="m-0 text-2xl font-bold tracking-tight text-[var(--nw-ink)] md:text-[1.75rem]">
            Join a virtual meeting
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--nw-ink-3)]">
            Paste a Meet, Zoom, or Teams link. Notewise dispatches a bot, streams transcript, then
            writes summary and action items when the call ends.
          </p>

          <label className="mt-5 flex flex-col gap-1.5 text-xs font-semibold text-[var(--nw-ink-3)]">
            Meeting URL
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nw-ink-4)]" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="nw-page-input w-full rounded-2xl border border-[var(--nw-border)] bg-white py-3 pl-10 pr-3 text-sm font-normal text-[var(--nw-ink)] outline-none"
                inputMode="url"
                autoComplete="off"
              />
            </div>
          </label>

          <label className="mt-3 flex flex-col gap-1.5 text-xs font-semibold text-[var(--nw-ink-3)]">
            Meeting title (optional)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly delivery review"
              className="nw-page-input rounded-2xl border border-[var(--nw-border)] bg-white px-3.5 py-3 text-sm font-normal text-[var(--nw-ink)] outline-none"
              maxLength={200}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--nw-surface-2)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-ink-3)]">
              Provider · {botProvider}
            </span>
            {platform ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nw-accent-soft)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-accent-dark)]">
                <Video className="h-3 w-3" />
                {platform}
              </span>
            ) : url.trim() ? (
              <span className="rounded-full bg-[var(--nw-danger-soft)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--nw-danger)]">
                Unsupported URL
              </span>
            ) : null}
          </div>

          {error ? (
            <p className="nw-alert mt-3" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              size="lg"
              disabled={join.isPending || !platform}
              onClick={() => {
                setError(null);
                join.mutate();
              }}
            >
              {join.isPending ? "Dispatching bot…" : "Dispatch Notewise bot"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate("/")}>
              <Mic className="h-4 w-4" />
              Capture locally
            </Button>
          </div>
        </div>
      </section>

      <aside className="nw-page-card flex flex-col gap-4 p-5 md:p-6">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[var(--nw-accent-dark)]">
            <Sparkles className="h-4 w-4" />
            <h3 className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.14em]">How it works</h3>
          </div>
          <ol className="mt-3 m-0 space-y-3 p-0">
            {[
              "Validate Meet / Zoom / Teams URL",
              "Bot joins as “Notewise” (admit if lobby)",
              "Live transcript streams in Library",
              "Stop bot or hang up → summary & actions",
            ].map((step, i) => (
              <li
                key={step}
                className="nw-join-step flex list-none gap-3"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--nw-accent-soft)] text-xs font-bold text-[var(--nw-accent-dark)]">
                  {i + 1}
                </span>
                <span className="pt-1.5 text-sm leading-snug text-[var(--nw-ink-2)]">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-[var(--nw-border)] bg-[linear-gradient(180deg,#fff_0%,#f8fafc_100%)] p-4 text-sm text-[var(--nw-ink-3)]">
          <div className="mb-1.5 flex items-center gap-2 font-semibold text-[var(--nw-ink-2)]">
            <ShieldCheck className="h-4 w-4 text-[var(--nw-accent-dark)]" />
            Provider setup
          </div>
          Without <code className="text-xs">MEETING_BOT_API_KEY</code>, Join runs in{" "}
          <strong>sandbox mode</strong>: notes stream in Notewise, but no participant appears in
          Meet/Zoom. Add a Meeting BaaS key for a real bot.
        </div>
      </aside>
    </PageMotion>
  );
}

export function JoinPage() {
  if (isPyaiBackend()) return <PyaiUnsupportedJoin />;
  return <NestJoinForm />;
}
