import { useEffect, useState } from "react";
import { Button } from "@notewise/ui";
import { Mic, Monitor, Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { setStoredApiBase } from "../lib/backend";
import { DESKTOP_API_BASE } from "../lib/desktopMode";
import {
  configureDesktopGateway,
  diagnosticsErrorMessage,
  diagnosticsReady,
  ensureDesktopGateway,
  getGatewayDiagnostics,
} from "../lib/desktopGateway";
import {
  autoEnsureDesktopPermissions,
  micBlockedMessage,
  openMicrophoneSettings,
  openScreenRecordingSettings,
  requestNativeScreenRecordingAccess,
  screenRecordingHelpMessage,
  setMeetingAudioSkipped,
  getNativeScreenRecordingStatus,
} from "../lib/desktopPermissions";

type Phase = "boot" | "onboard" | "permissions" | "ready";

export function DesktopShellGate({ children }: { children: React.ReactNode }) {
  const { refreshProviders } = useAuth();
  const [phase, setPhase] = useState<Phase>("boot");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [screenOk, setScreenOk] = useState(false);
  const [gatewayReady, setGatewayReady] = useState(false);
  const [statusLine, setStatusLine] = useState("Starting local AI gateway…");

  useEffect(() => {
    if (!isDesktopShell()) {
      setPhase("ready");
      return;
    }

    setStoredApiBase(DESKTOP_API_BASE, "pyai");

    void (async () => {
      try {
        setStatusLine("Checking gateway…");
        let diag = await getGatewayDiagnostics();
        if (!diag.reachable) {
          setStatusLine("Launching gateway…");
          diag = await ensureDesktopGateway();
        }
        const ready = diagnosticsReady(diag);
        setGatewayReady(ready);

        setStatusLine("Checking permissions…");
        const ensured = await autoEnsureDesktopPermissions();
        setMicOk(ensured.snapshot.microphone.granted);
        setScreenOk(ensured.snapshot.screenRecording.granted);
        if (ensured.message && !ensured.snapshot.microphone.granted) {
          setError(ensured.message);
        }

        if (ready && ensured.snapshot.readyToRecord) {
          void refreshProviders();
          setPhase("ready");
          return;
        }
        if (ready && !ensured.snapshot.microphone.granted) {
          setPhase("permissions");
          return;
        }
        if (ready && !ensured.snapshot.gateway.hasApiKey) {
          setPhase("onboard");
          return;
        }
        setPhase("onboard");
      } catch (e) {
        setPhase("onboard");
        setError(e instanceof Error ? e.message : "Could not start gateway");
      }
    })();
  }, [refreshProviders]);

  async function requestMic() {
    setError(null);
    setBusy(true);
    try {
      const ensured = await autoEnsureDesktopPermissions();
      setMicOk(ensured.snapshot.microphone.granted);
      if (!ensured.snapshot.microphone.granted) {
        setError(ensured.message ?? micBlockedMessage());
      }
    } finally {
      setBusy(false);
    }
  }

  async function requestScreenRecording() {
    setError(null);
    setBusy(true);
    try {
      const granted = await requestNativeScreenRecordingAccess();
      const ok = granted || (await getNativeScreenRecordingStatus());
      setScreenOk(ok);
      if (ok) setMeetingAudioSkipped(false);
      if (!ok) {
        setError(
          "Screen Recording was not enabled. Open System Settings → Privacy & Security → Screen Recording and allow Notewise.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable Screen Recording.");
      setScreenOk(false);
    } finally {
      setBusy(false);
    }
  }

  async function finishSetup() {
    setBusy(true);
    setError(null);
    setStatusLine("Saving API key and starting gateway…");
    try {
      const diag = await configureDesktopGateway(apiKey.trim());
      if (!diagnosticsReady(diag)) {
        throw new Error(diagnosticsErrorMessage(diag));
      }
      setGatewayReady(true);
      void refreshProviders();
      if (micOk) {
        setPhase("ready");
      } else {
        setPhase("permissions");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Setup failed";
      setError(msg);
      try {
        const diag = await getGatewayDiagnostics();
        if (!diagnosticsReady(diag)) {
          setError(diagnosticsErrorMessage(diag));
        }
      } catch {
        /* keep primary error */
      }
    } finally {
      setBusy(false);
      setStatusLine("");
    }
  }

  function continueAfterPermissions() {
    if (!micOk) {
      setError(micBlockedMessage());
      return;
    }
    setPhase("ready");
  }

  if (!isDesktopShell() || phase === "ready") return children;

  if (phase === "boot") {
    return (
      <div className="grid h-full place-items-center bg-[var(--nw-paper)] p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-[var(--nw-accent-dark)]" />
          <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">Starting Notewise…</p>
          <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">{statusLine}</p>
        </div>
      </div>
    );
  }

  if (phase === "permissions") {
    return (
      <div className="grid h-full place-items-center bg-[var(--nw-paper)] p-6">
        <div className="w-full max-w-md rounded-3xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-2 text-[var(--nw-accent-dark)]">
            <Mic className="h-5 w-5" />
            <h1 className="m-0 text-lg font-bold text-[var(--nw-ink)]">Allow microphone access</h1>
          </div>
          <p className="m-0 text-sm text-[var(--nw-ink-3)]">
            Notewise needs microphone access to transcribe your voice. macOS requires this once per
            app — the same way Zoom or Google Meet do.
          </p>

          <div className="mt-5 space-y-4">
            <section className="rounded-2xl border border-[var(--nw-border)] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
                <Mic className="h-4 w-4 text-[var(--nw-accent-dark)]" />
                Microphone
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={micOk ? "ghost" : "secondary"}
                  disabled={busy}
                  onClick={() => void requestMic()}
                >
                  {micOk ? "Microphone enabled" : "Allow microphone"}
                </Button>
                {!micOk ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void openMicrophoneSettings()}
                  >
                    Open System Settings
                  </Button>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--nw-border)] p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
                <Monitor className="h-4 w-4 text-[var(--nw-accent-dark)]" />
                Meeting audio (recommended)
              </div>
              <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">
                {screenRecordingHelpMessage()}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={screenOk ? "ghost" : "secondary"}
                  disabled={busy}
                  onClick={() => void requestScreenRecording()}
                >
                  {screenOk ? "Meeting audio enabled" : "Enable meeting audio"}
                </Button>
                {!screenOk ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void openScreenRecordingSettings()}
                    >
                      Open System Settings
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setMeetingAudioSkipped(true);
                        setScreenOk(true);
                      }}
                    >
                      Skip for now
                    </Button>
                  </>
                ) : null}
              </div>
            </section>
          </div>

          {error ? (
            <p className="mt-3 m-0 text-sm text-[rgb(185_28_28)]" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            variant="primary"
            className="mt-5 w-full justify-center"
            disabled={busy || !micOk}
            onClick={continueAfterPermissions}
          >
            Continue to Notewise
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center bg-[var(--nw-paper)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--nw-border)] bg-[var(--nw-surface-solid)] p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-[var(--nw-accent-dark)]">
          <Sparkles className="h-5 w-5" />
          <h1 className="m-0 text-lg font-bold text-[var(--nw-ink)]">Welcome to Notewise</h1>
        </div>
        <p className="m-0 text-sm text-[var(--nw-ink-3)]">
          One-time setup. Your PyAI key stays on this Mac — the gateway runs locally on port 3002.
        </p>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-[var(--nw-border)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
              <Mic className="h-4 w-4 text-[var(--nw-accent-dark)]" />
              Microphone
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={micOk ? "ghost" : "secondary"}
                disabled={busy}
                onClick={() => void requestMic()}
              >
                {micOk ? "Microphone enabled" : "Enable microphone"}
              </Button>
              {!micOk ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void openMicrophoneSettings()}
                >
                  Open System Settings
                </Button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nw-border)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
              <Monitor className="h-4 w-4 text-[var(--nw-accent-dark)]" />
              Meeting audio (recommended)
            </div>
            <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">{screenRecordingHelpMessage()}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={screenOk ? "ghost" : "secondary"}
                disabled={busy}
                onClick={() => void requestScreenRecording()}
              >
                {screenOk ? "Meeting audio enabled" : "Enable meeting audio"}
              </Button>
              {!screenOk ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void openScreenRecordingSettings()}
                  >
                    Open System Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setMeetingAudioSkipped(true);
                      setScreenOk(true);
                    }}
                  >
                    Skip for now
                  </Button>
                </>
              ) : null}
            </div>
          </section>

          {!gatewayReady ? (
            <label className="block">
              <span className="text-sm font-semibold text-[var(--nw-ink)]">PyAI API key</span>
              <input
                type="password"
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-[var(--nw-border)] px-3 py-2 text-sm outline-none focus:border-[var(--nw-accent)]"
                placeholder="Paste key from api.pyai.com"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
          ) : null}
        </div>

        {busy && statusLine ? (
          <p className="mt-3 m-0 text-xs text-[var(--nw-ink-3)]">{statusLine}</p>
        ) : null}

        {error ? (
          <p className="mt-3 m-0 text-sm text-[rgb(185_28_28)]" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          variant="primary"
          className="mt-5 w-full justify-center"
          disabled={busy || !micOk || (!gatewayReady && !apiKey.trim())}
          onClick={() => (gatewayReady ? continueAfterPermissions() : void finishSetup())}
        >
          {busy ? "Setting up…" : gatewayReady ? "Continue to Notewise" : "Continue to Notewise"}
        </Button>
      </div>
    </div>
  );
}
