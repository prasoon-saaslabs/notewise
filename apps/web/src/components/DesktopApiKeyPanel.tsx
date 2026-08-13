import { useState } from "react";
import { Button } from "@notewise/ui";
import { KeyRound } from "lucide-react";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { configureDesktopGateway, diagnosticsErrorMessage, diagnosticsReady } from "../lib/desktopGateway";

export function DesktopApiKeyPanel() {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!isDesktopShell()) return null;

  async function save() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const diag = await configureDesktopGateway(key.trim());
      if (!diagnosticsReady(diag)) {
        throw new Error(diagnosticsErrorMessage(diag));
      }
      setMsg("API key saved. Gateway is running.");
      setKey("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save API key");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h3 className="mb-2 mt-8 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nw-ink-3)]">
        <KeyRound className="h-3.5 w-3.5" />
        PyAI API key
      </h3>
      <div className="rounded-2xl border border-[var(--nw-border)] bg-white p-4">
        <p className="m-0 text-xs text-[var(--nw-ink-3)]">
          Stored in Application Support on this Mac. Required for transcription and AI notes.
        </p>
        <input
          type="password"
          autoComplete="off"
          className="mt-3 w-full rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
          placeholder="Paste new key to update"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={busy || !key.trim()}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save key & restart gateway"}
        </Button>
        {msg ? <p className="m-0 mt-2 text-xs text-[var(--nw-accent-dark)]">{msg}</p> : null}
        {err ? (
          <p className="m-0 mt-2 text-xs text-[rgb(185_28_28)]" role="alert">
            {err}
          </p>
        ) : null}
      </div>
    </>
  );
}
