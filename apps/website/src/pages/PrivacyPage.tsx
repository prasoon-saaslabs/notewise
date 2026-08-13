export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="m-0 text-3xl font-bold tracking-tight">Privacy</h1>
      <p className="m-0 mt-3 text-sm text-[var(--nw-ink-3)]">
        Notewise is local-first. No account. No telemetry.
      </p>

      <div className="nw-prose mt-8">
        <h2>What leaves your machine</h2>
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

        <h2>Consent</h2>
        <p>
          Recording laws differ by jurisdiction (one-party vs all-party). Notewise asks for
          confirmation before the first capture and does not auto-record.
        </p>

        <h2>Audit</h2>
        <p>
          The repository is MIT-licensed. The in-app Trust page (<code>/trust</code>) restates the
          data flow in product UI. Read the source if you need to prove it to your security team.
        </p>
      </div>
    </div>
  );
}
