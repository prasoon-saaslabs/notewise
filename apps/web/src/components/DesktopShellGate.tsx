import { useEffect, useState } from "react";
import { Button } from "@notewise/ui";
import { Mic, Monitor, Sparkles } from "lucide-react";
import { isDesktopShell } from "../capture/desktopMiniWindow";
import { DESKTOP_API_BASE } from "../lib/desktopMode";
import { setStoredApiBase } from "../lib/backend";
import { api } from "../lib/api";

const READY_KEY = "nw.desktop.ready";

async function invokeHasKey(): Promise<boolean> {
  if (!isDesktopShell()) return true;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return Boolean(await invoke<boolean>("has_pyai_api_key"));
  } catch {
    return false;
  }
}

async function invokeSaveKey(key: string): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("save_pyai_api_key", { apiKey: key });
}

async function invokeGatewayStatus(): Promise<boolean> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return Boolean(await invoke<boolean>("gateway_status"));
  } catch {
    return false;
  }
}

export function DesktopShellGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"boot" | "onboard" | "ready">("boot");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [micOk, setMicOk] = useState(false);

  useEffect(() => {
    if (!isDesktopShell()) {
      setPhase("ready");
      return;
    }

    setStoredApiBase(DESKTOP_API_BASE, "pyai");

    void (async () => {
      const ready = localStorage.getItem(READY_KEY) === "1";
      const hasKey = await invokeHasKey();
      let healthy = await invokeGatewayStatus();

      if (!healthy) {
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 500));
          healthy = await invokeGatewayStatus();
          if (healthy) break;
        }
      }

      if (!healthy || (!hasKey && !ready)) {
        setPhase("onboard");
        return;
      }

      try {
        await api.health();
      } catch {
        setPhase("onboard");
        return;
      }

      setPhase("ready");
    })();
  }, []);

  async function requestMic() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicOk(true);
    } catch {
      setError(
        "Microphone access is required. Open System Settings → Privacy & Security → Microphone and enable Notewise.",
      );
    }
  }

  async function finishSetup() {
    setBusy(true);
    setError(null);
    try {
      if (apiKey.trim()) {
        await invokeSaveKey(apiKey.trim());
      }
      const healthy = await invokeGatewayStatus();
      if (!healthy) {
        throw new Error("Gateway is not responding. Check your PyAI API key.");
      }
      await api.health();
      localStorage.setItem(READY_KEY, "1");
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isDesktopShell() || phase === "ready") return children;

  if (phase === "boot") {
    return (
      <div className="grid h-full place-items-center bg-[var(--nw-paper)] p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-[var(--nw-accent-dark)]" />
          <p className="m-0 text-sm font-semibold text-[var(--nw-ink)]">Starting Notewise…</p>
          <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">Launching local AI gateway</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full place-items-center bg-[var(--nw-paper)] p-6">
      <div className="w-full max-w-md rounded-3xl border border-[var(--nw-border)] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-2 text-[var(--nw-accent-dark)]">
          <Sparkles className="h-5 w-5" />
          <h1 className="m-0 text-lg font-bold text-[var(--nw-ink)]">Welcome to Notewise</h1>
        </div>
        <p className="m-0 text-sm text-[var(--nw-ink-3)]">
          A few one-time steps so capture, menu bar, and AI notes work seamlessly on your Mac.
        </p>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-[var(--nw-border)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
              <Mic className="h-4 w-4 text-[var(--nw-accent-dark)]" />
              Microphone
            </div>
            <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">
              Required to transcribe your voice during meetings.
            </p>
            <Button
              size="sm"
              variant={micOk ? "ghost" : "secondary"}
              className="mt-2"
              onClick={() => void requestMic()}
            >
              {micOk ? "Microphone enabled" : "Enable microphone"}
            </Button>
          </section>

          <section className="rounded-2xl border border-[var(--nw-border)] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--nw-ink)]">
              <Monitor className="h-4 w-4 text-[var(--nw-accent-dark)]" />
              Screen recording
            </div>
            <p className="m-0 mt-1 text-xs text-[var(--nw-ink-3)]">
              macOS will prompt when you first capture system audio. Grant access under System
              Settings → Privacy & Security → Screen Recording.
            </p>
          </section>

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
            <p className="m-0 mt-1 text-[0.65rem] text-[var(--nw-ink-4)]">
              Stored locally in Application Support — never sent anywhere except PyAI.
            </p>
          </label>
        </div>

        {error ? (
          <p className="mt-3 m-0 text-sm text-[rgb(185_28_28)]" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          variant="primary"
          className="mt-5 w-full justify-center"
          disabled={busy || !micOk || !apiKey.trim()}
          onClick={() => void finishSetup()}
        >
          {busy ? "Setting up…" : "Continue to Notewise"}
        </Button>
      </div>
    </div>
  );
}
