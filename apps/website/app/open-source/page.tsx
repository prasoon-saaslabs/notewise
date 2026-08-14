import { Github, Heart, Scale } from "lucide-react";
import { MarketingArticle } from "@/components/site/MarketingArticle";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";
import { Button } from "@/components/ui/Button";
import { GITHUB_URL } from "@/lib/siteConfig";

export const metadata = {
  title: "Open source — Notewise",
  description: "Notewise is MIT licensed. Use it, fork it, ship it internally.",
};

export default function OpenSourcePage() {
  return (
    <MarketingPageShell>
      <MarketingArticle
        eyebrow="Open source"
        title="Built in the open"
        description="Notewise is MIT licensed. Use it, fork it, ship it internally — no vendor lock-in, no seat tax, no black-box cloud processing."
      >
        <h2>Why we open sourced it</h2>
        <p>
          Meeting notes touch sensitive conversations. Teams should be able to audit exactly what
          leaves their machine, where transcripts live, and how claims are verified. Open source is
          the strongest form of that guarantee.
        </p>

        <h2 id="license">MIT License</h2>
        <p>
          The full Notewise codebase is released under the MIT License. You may use, copy, modify,
          merge, publish, distribute, sublicense, and sell copies — with attribution and without
          warranty. See the LICENSE file in the repository for the complete text.
        </p>

        <h2>Stack</h2>
        <ul>
          <li>
            <strong>Frontend:</strong> React, Next.js, Tailwind — web + Tauri desktop shell
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

        <h2 id="contributing">Contributing</h2>
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

        <div className="mt-10 flex flex-wrap gap-3 not-prose">
          <Button href={GITHUB_URL} size="lg" variant="primary" external>
            <Github className="h-4 w-4" />
            View on GitHub
          </Button>
        </div>

        <p className="mt-8 flex items-center gap-2 text-sm text-ink-muted not-prose">
          <Heart className="h-3.5 w-3.5" aria-hidden />
          MIT License · Built for people who read the transcript
        </p>
      </MarketingArticle>
    </MarketingPageShell>
  );
}
