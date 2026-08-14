import { Github, Heart, Scale } from "lucide-react";
import { GITHUB_URL } from "../lib/siteConfig";

export function OpenSourcePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <Scale className="h-8 w-8 text-[var(--nw-accent-dark)]" />
      <h1 className="m-0 mt-4 text-3xl font-bold tracking-tight">Open source</h1>
      <p className="m-0 mt-3 text-sm leading-relaxed text-[var(--nw-ink-3)]">
        Notewise is MIT licensed. Use it, fork it, ship it internally — no vendor lock-in, no seat
        tax, no black-box cloud processing.
      </p>

      <div className="nw-prose mt-8">
        <h2>Why we open sourced it</h2>
        <p>
          Meeting notes touch sensitive conversations. Teams should be able to audit exactly what
          leaves their machine, where transcripts live, and how claims are verified. Open source is
          the strongest form of that guarantee.
        </p>
        <h2>Stack</h2>
        <ul>
          <li>
            <strong>Frontend:</strong> React, Vite, Tailwind — web + Tauri desktop shell
          </li>
          <li>
            <strong>Gateway:</strong> Python FastAPI (pyai-gateway) on localhost:3002
          </li>
          <li>
            <strong>AI:</strong> PyAI Hear (STT), Recap (notes), Cast/Clone (voice Q&A)
          </li>
          <li>
            <strong>Storage:</strong> SQLite + FTS on your filesystem
          </li>
        </ul>
        <h2>Contributing</h2>
        <p>
          Issues and pull requests welcome. Run <code>make doctor</code> before your first capture.
          Keep changes focused; match existing patterns in the monorepo.
        </p>
        <h2>What you pay for</h2>
        <p>
          Notewise software is free. You bring your own PyAI API key for speech and note generation
          — usage is billed by PyAI per their pricing, not by Notewise. There is no Notewise
          subscription.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={GITHUB_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--nw-ink)] px-5 py-3 text-sm font-semibold text-white"
          target="_blank"
          rel="noreferrer"
        >
          <Github className="h-4 w-4" />
          View on GitHub
        </a>
      </div>

      <p className="mt-8 flex items-center gap-2 text-xs text-[var(--nw-ink-4)]">
        <Heart className="h-3.5 w-3.5" />
        MIT License · Built for people who read the transcript
      </p>
    </div>
  );
}
