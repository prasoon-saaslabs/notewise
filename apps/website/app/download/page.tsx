"use client";

import { useEffect, useState } from "react";
import { Apple, Download, Globe, Terminal } from "lucide-react";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { DMG_URL_ARM, DMG_URL_INTEL, githubCloneCommand } from "@/lib/siteConfig";

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

export default function DownloadPage() {
  const arch = useMacArch();
  const primaryUrl = primaryDmgUrl(arch);
  const hasRelease = Boolean(primaryUrl);
  const showBoth = Boolean(DMG_URL_ARM && DMG_URL_INTEL);
  const cloneBlock = `${githubCloneCommand()}
make setup
make run    # gateway :3002
make web    # UI :5173`;

  return (
    <MarketingPageShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-24">
        <p className="text-sm font-medium tracking-wide text-teal">Download</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight text-ink md:text-5xl">
          Download Notewise
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-secondary">
          Free and open source. Choose the macOS app for menu bar capture, or run from source for
          development.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <section className="nw-site-card p-6">
            <Apple className="h-6 w-6 text-teal" />
            <h2 className="m-0 mt-3 text-lg font-semibold text-ink">macOS app (recommended)</h2>
            <p className="m-0 mt-2 text-sm leading-relaxed text-ink-secondary">
              Menu bar tray, floating capture overlay, bundled PyAI gateway. PyAI-only — no extra
              services to configure.
            </p>
            <ul className="m-0 mt-4 list-disc space-y-1 pl-4 text-sm text-ink-secondary">
              <li>macOS 13+ (Apple Silicon & Intel)</li>
              <li>Microphone + Screen Recording permissions</li>
              <li>PyAI API key from api.pyai.com</li>
            </ul>

            {hasRelease ? (
              <a
                href={primaryUrl}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-hover"
              >
                <Download className="h-4 w-4" />
                Download for macOS
                {arch === "x64" ? " (Intel)" : arch === "arm64" ? " (Apple Silicon)" : ""}
              </a>
            ) : (
              <p className="m-0 mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-paper-muted px-5 py-3 text-sm font-semibold text-ink-muted">
                Release coming soon
              </p>
            )}

            {showBoth ? (
              <p className="m-0 mt-3 text-xs text-ink-secondary">
                <a href={DMG_URL_ARM} className="font-semibold text-teal hover:text-teal-hover">
                  Apple Silicon
                </a>
                {" · "}
                <a href={DMG_URL_INTEL} className="font-semibold text-teal hover:text-teal-hover">
                  Intel
                </a>
              </p>
            ) : null}

            <p className="m-0 mt-3 text-xs leading-relaxed text-ink-muted">
              If macOS says the developer cannot be verified, right-click the app → Open. The
              installer includes the local gateway — no Python or cloud backend required.
            </p>
          </section>

          <section className="nw-site-card p-6">
            <Globe className="h-6 w-6 text-teal" />
            <h2 className="m-0 mt-3 text-lg font-semibold text-ink">Web app</h2>
            <p className="m-0 mt-2 text-sm leading-relaxed text-ink-secondary">
              Run locally in the browser. Ideal for development and teams comfortable with a terminal
              workflow.
            </p>
            <pre className="m-0 mt-4 overflow-x-auto rounded-2xl bg-dark-room p-4 text-xs leading-relaxed text-white/90">
              {cloneBlock}
            </pre>
          </section>

          <section className="nw-site-card p-6 md:col-span-2">
            <Terminal className="h-6 w-6 text-teal" />
            <h2 className="m-0 mt-3 text-lg font-semibold text-ink">Requirements</h2>
            <div className="mt-4 grid gap-4 text-sm text-ink-secondary sm:grid-cols-3">
              <div>
                <p className="m-0 font-semibold text-ink">Runtime</p>
                <p className="m-0 mt-1 text-ink-secondary">
                  DMG: none. From source: Node 20+, Python 3.11+, pnpm
                </p>
              </div>
              <div>
                <p className="m-0 font-semibold text-ink">AI</p>
                <p className="m-0 mt-1 text-ink-secondary">PyAI key (Hear, Recap, optional Cast)</p>
              </div>
              <div>
                <p className="m-0 font-semibold text-ink">Storage</p>
                <p className="m-0 mt-1 text-ink-secondary">Local SQLite — your disk only</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </MarketingPageShell>
  );
}
