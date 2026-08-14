import { useEffect, useState } from "react";
import { Apple, Download, Globe, Terminal } from "lucide-react";
import { DMG_URL_ARM, DMG_URL_INTEL, githubCloneCommand } from "../lib/siteConfig";

type MacArch = "arm64" | "x64" | "unknown";

function useMacArch(): MacArch {
  const [arch, setArch] = useState<MacArch>("unknown");

  useEffect(() => {
    const uaData = navigator as Navigator & {
      userAgentData?: {
        getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>;
      };
    };
    if (uaData.userAgentData?.getHighEntropyValues) {
      uaData.userAgentData
        .getHighEntropyValues(["architecture"])
        .then((values) => {
          const a = (values.architecture || "").toLowerCase();
          if (a.includes("arm")) setArch("arm64");
          else if (a.includes("x86") || a.includes("x64")) setArch("x64");
        })
        .catch(() => {
          setArch("arm64");
        });
      return;
    }
    const ua = navigator.userAgent;
    if (/Macintosh|Mac OS X/.test(ua)) {
      setArch(/\bx86_64\b/.test(ua) ? "x64" : "arm64");
      return;
    }
    setArch("arm64");
  }, []);

  return arch;
}

function primaryDmgUrl(arch: MacArch): string {
  if (arch === "x64" && DMG_URL_INTEL) return DMG_URL_INTEL;
  return DMG_URL_ARM || DMG_URL_INTEL;
}

export function DownloadPage() {
  const arch = useMacArch();
  const primaryUrl = primaryDmgUrl(arch);
  const hasRelease = Boolean(primaryUrl);
  const showBoth = Boolean(DMG_URL_ARM && DMG_URL_INTEL);
  const cloneBlock = `${githubCloneCommand()}
make setup
make run    # gateway :3002
make web    # UI :5173`;

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
            <li>macOS 13+ (Apple Silicon & Intel)</li>
            <li>Microphone + Screen Recording permissions</li>
            <li>PyAI API key from api.pyai.com</li>
          </ul>

          {hasRelease ? (
            <a
              href={primaryUrl}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--nw-accent-dark)] px-5 py-3 text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" />
              Download for macOS
              {arch === "x64" ? " (Intel)" : arch === "arm64" ? " (Apple Silicon)" : ""}
            </a>
          ) : (
            <p className="m-0 mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[var(--nw-surface-2)] px-5 py-3 text-sm font-semibold text-[var(--nw-ink-4)]">
              Release coming soon
            </p>
          )}

          {showBoth ? (
            <p className="m-0 mt-3 text-xs text-[var(--nw-ink-3)]">
              <a href={DMG_URL_ARM} className="font-semibold text-[var(--nw-accent-dark)]">
                Apple Silicon
              </a>
              {" · "}
              <a href={DMG_URL_INTEL} className="font-semibold text-[var(--nw-accent-dark)]">
                Intel
              </a>
            </p>
          ) : null}

          <p className="m-0 mt-3 text-[0.65rem] leading-relaxed text-[var(--nw-ink-4)]">
            If macOS says the developer cannot be verified, right-click the app → Open. The
            installer includes the local gateway — no Python or cloud backend required.
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
            {cloneBlock}
          </pre>
        </section>

        <section className="nw-site-card p-6 md:col-span-2">
          <Terminal className="h-6 w-6 text-[var(--nw-accent-dark)]" />
          <h2 className="m-0 mt-3 text-lg font-bold">Requirements</h2>
          <div className="mt-4 grid gap-4 text-sm text-[var(--nw-ink-2)] sm:grid-cols-3">
            <div>
              <p className="m-0 font-semibold text-[var(--nw-ink)]">Runtime</p>
              <p className="m-0 mt-1 text-[var(--nw-ink-3)]">
                DMG: none. From source: Node 20+, Python 3.11+, pnpm
              </p>
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
