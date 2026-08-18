import { MarketingArticle } from "@/components/site/MarketingArticle";
import { MarketingPageShell } from "@/components/site/MarketingPageShell";

export const metadata = {
  title: "Privacy — Notewise",
  description: "Notewise is local-first. No account. No telemetry.",
};

export default function PrivacyPage() {
  return (
    <MarketingPageShell>
      <MarketingArticle
        eyebrow="Legal"
        title="Privacy"
        description="Notewise is local-first. No account. No telemetry."
      >
        <h2 id="data-flow">What leaves your machine</h2>
        <ol>
          <li>
            <strong>Audio frames</strong> go only to the PyAI Hear endpoint you configure. They are
            not stored on disk after the call ends.
          </li>
          <li>
            <strong>Transcript text</strong> is sent to PyAI Recap to extract notes, and optionally
            to Cast/Clone when you ask a spoken question.
          </li>
          <li>
            <strong>Nothing else</strong> is uploaded: no analytics, no crash reports, no cloud
            backup, no CRM sync.
          </li>
        </ol>

        <h2>What stays on your machine</h2>
        <p>
          Transcripts, notes, entities, embeddings, and run-status live in one SQLite file on your
          disk. Optional Markdown copies can be written under ~/Margin/. Delete the database and
          the memory is gone. Copy it and you have a backup.
        </p>

        <h2 id="consent">Recording consent</h2>
        <p>
          Recording laws differ by jurisdiction (one-party vs all-party). Notewise asks for
          confirmation before the first capture and does not auto-record. You are responsible for
          obtaining consent from other participants when your local laws require it.
        </p>

        <h2 id="security">Security & audit</h2>
        <p>
          The repository is MIT-licensed and the gateway binds to 127.0.0.1 only. The in-app Trust
          page restates the data flow in product UI. Read the source if you need to prove it to
          your security team — no black-box cloud processing from Notewise.
        </p>
      </MarketingArticle>
    </MarketingPageShell>
  );
}
