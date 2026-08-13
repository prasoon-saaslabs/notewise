import { Apple, Globe, Terminal } from "lucide-react";

export function DownloadPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight md:text-4xl">Download Notewise</h1>
      <p className="m-0 mt-3 max-w-2xl text-sm text-[var(--nw-ink-3)]">
        Free and open source. Choose the macOS app for menu bar capture, or run from source for
        development.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section className="nw-site-card p-6">
          <Apple className="h-6 w-6 text-[var(--nw-accent-dark)]" />
          <h2 className="m-0 mt-3 text-lg font-bold">macOS app (recommended)</h2>
          <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--nw-ink-3)]">
            Menu bar tray, floating capture overlay, bundled PyAI gateway. PyAI-only — no extra
            services to configure.
          </p>
          <ul className="m-0 mt-4 list-disc space-y-1 pl-4 text-sm text-[var(--nw-ink-2)]">
            <li>macOS 12+ (Apple Silicon & Intel)</li>
            <li>Microphone + Screen Recording permissions</li>
            <li>PyAI API key from api.pyai.com</li>
          </ul>
          <p className="m-0 mt-5 rounded-xl bg-[var(--nw-surface-2)] px-3 py-2 font-mono text-xs text-[var(--nw-ink-2)]">
            pnpm build:desktop:dmg
          </p>
          <p className="m-0 mt-2 text-[0.65rem] text-[var(--nw-ink-4)]">
            Build from source — output in apps/desktop/src-tauri/target/release/bundle/dmg/
          </p>
        </section>

        <section className="nw-site-card p-6">
          <Globe className="h-6 w-6 text-[var(--nw-accent-dark)]" />
          <h2 className="m-0 mt-3 text-lg font-bold">Web app</h2>
          <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--nw-ink-3)]">
            Run locally in the browser. Ideal for development and teams comfortable with a terminal
            workflow.
          </p>
          <pre className="m-0 mt-4 overflow-x-auto rounded-xl bg-[var(--nw-ink)] p-4 text-xs leading-relaxed text-[rgb(226_232_240)]">
{`git clone <repo> && cd notewise
make setup
make run    # gateway :3002
make web    # UI :5173`}
          </pre>
        </section>

        <section className="nw-site-card p-6 md:col-span-2">
          <Terminal className="h-6 w-6 text-[var(--nw-accent-dark)]" />
          <h2 className="m-0 mt-3 text-lg font-bold">Requirements</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm text-[var(--nw-ink-2)]">
            <div>
              <p className="m-0 font-semibold text-[var(--nw-ink)]">Runtime</p>
              <p className="m-0 mt-1 text-[var(--nw-ink-3)]">Node 20+, Python 3.11+, pnpm</p>
            </div>
            <div>
              <p className="m-0 font-semibold text-[var(--nw-ink)]">AI</p>
              <p className="m-0 mt-1 text-[var(--nw-ink-3)]">PyAI key (Hear, Recap, optional Cast)</p>
            </div>
            <div>
              <p className="m-0 font-semibold text-[var(--nw-ink)]">Storage</p>
              <p className="m-0 mt-1 text-[var(--nw-ink-3)]">Local SQLite — your disk only</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
