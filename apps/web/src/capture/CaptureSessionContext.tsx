import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRecorder, type ProcessPhase } from "../hooks/useRecorder";
import type { NotesPayload } from "@notewise/api-client";
import { debounce } from "../lib/throttle";
import {
  clearCaptureSnapshot,
  createCaptureChannel,
  isCaptureActive,
  publishCaptureSnapshot,
  readCaptureSnapshot,
  type CaptureSyncCommand,
  type CaptureSyncMessage,
  type CaptureSyncState,
  type CaptureTurn,
} from "./miniCaptureSync";
import { closeMiniCaptureWindow, isDesktopShell, openMiniCaptureWindow } from "./desktopMiniWindow";
import {
  listenDesktopCaptureCommand,
  listenDesktopCaptureState,
  publishDesktopCaptureState,
  sendDesktopCaptureCommand,
} from "./desktopCaptureSync";
import {
  isDocumentPipSupported,
  notifyForceFloat,
  notifyPipReady,
  openDocumentPip,
} from "./documentPip";
export type CaptureSessionValue = {
  recording: boolean;
  paused: boolean;
  busy: boolean;
  elapsed: number;
  meetingId: string | null;
  sessionId: string | null;
  turns: CaptureTurn[];
  notes: NotesPayload | null;
  error: string | null;
  statusLine: string;
  phase: ProcessPhase;
  interim: string;
  liveSupported: boolean;
  userNotes: string;
  meters: { mic: number; system: number; backend: string };
  isOwner: boolean;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  togglePause: () => void;
  setUserNotesDraft: (text: string) => void;
  applyMeetingTranscript: (detail: {
    transcript?: Array<{
      id: string;
      speaker: string;
      kind: string;
      text: string;
      startMs?: number;
      endMs?: number;
    }>;
    notes?: NotesPayload | null;
  }) => void;
  openMiniSurface: () => void;
};

/** Exported so Document PiP can mount a secondary React root with the same session. */
export const CaptureSessionContext = createContext<CaptureSessionValue | null>(null);

function buildState(session: ReturnType<typeof useRecorder>): CaptureSyncState {
  return {
    recording: session.recording,
    paused: session.paused,
    busy: session.busy,
    elapsed: session.elapsed,
    meetingId: session.meetingId,
    turns: session.turns,
    notes: session.notes,
    error: session.error,
    statusLine: session.statusLine,
    phase: session.phase,
    interim: session.interim,
    userNotes: session.userNotes,
    liveSupported: session.liveSupported,
    updatedAt: Date.now(),
  };
}

function OwnerCaptureProvider({ children }: { children: ReactNode }) {
  const session = useRecorder();
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastActiveRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const openMiniSurface = useCallback(async () => {
    // Desktop: always-on-top Tauri window
    if (isDesktopShell()) {
      const opened = await openMiniCaptureWindow();
      if (!opened) notifyForceFloat();
      return;
    }
    // Web: Document PiP must stay on the user-gesture async chain (no CustomEvent hop)
    if (isDocumentPipSupported()) {
      const mount = await openDocumentPip({ width: 380, height: 300 });
      if (mount) {
        notifyPipReady(mount);
        return;
      }
    }
    // Fallback: in-app floating mini player
    notifyForceFloat();
  }, []);

  const handleRemoteCommand = useCallback((cmd: CaptureSyncCommand) => {
    const s = sessionRef.current;
    if (cmd.type === "pause") s.pause();
    else if (cmd.type === "resume") s.resume();
    else if (cmd.type === "stop") void s.stop();
    else if (cmd.type === "start") void s.start();
    else if (cmd.type === "notes") s.setUserNotesDraft(cmd.payload);
    else if (cmd.type === "ping") {
      const state = buildState(s);
      publishCaptureSnapshot(state);
      channelRef.current?.postMessage({ kind: "state", state } satisfies CaptureSyncMessage);
      void publishDesktopCaptureState(state);
    } else if (cmd.type === "focus-main") {
      void import("./desktopMiniWindow").then((m) => m.focusMainWindow());
    }
  }, []);

  useEffect(() => {
    const channel = createCaptureChannel();
    channelRef.current = channel;
    if (!channel) return;

    channel.onmessage = (ev: MessageEvent<CaptureSyncMessage>) => {
      const msg = ev.data;
      if (!msg || msg.kind !== "command") return;
      handleRemoteCommand(msg.command);
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [handleRemoteCommand]);

  useEffect(() => {
    if (!isDesktopShell()) return;
    let unlisten: (() => void) | undefined;
    void listenDesktopCaptureCommand(handleRemoteCommand).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [handleRemoteCommand]);

  const publishDebounced = useMemo(
    () =>
      debounce((state: CaptureSyncState) => {
        publishCaptureSnapshot(state);
        channelRef.current?.postMessage({ kind: "state", state } satisfies CaptureSyncMessage);
        void publishDesktopCaptureState(state);
      }, 200),
    [],
  );

  useEffect(() => {
    const state = buildState(session);
    publishDebounced(state);

    const active = isCaptureActive(state);
    if (!active && lastActiveRef.current) {
      void closeMiniCaptureWindow();
      if (state.phase === "idle" || state.phase === "ready" || state.phase === "failed") {
        if (state.phase === "idle") clearCaptureSnapshot();
      }
    }
    lastActiveRef.current = active;
  }, [
    session.recording,
    session.paused,
    session.busy,
    session.elapsed,
    session.meetingId,
    session.sessionId,
    session.turns,
    session.notes,
    session.error,
    session.statusLine,
    session.phase,
    session.interim,
    session.userNotes,
    session.liveSupported,
  ]);

  const value = useMemo<CaptureSessionValue>(
    () => ({
      recording: session.recording,
      paused: session.paused,
      busy: session.busy,
      elapsed: session.elapsed,
      meetingId: session.meetingId,
      sessionId: session.sessionId,
      turns: session.turns,
      notes: session.notes,
      error: session.error,
      statusLine: session.statusLine,
      phase: session.phase,
      interim: session.interim,
      liveSupported: session.liveSupported,
      userNotes: session.userNotes,
      meters: session.meters,
      isOwner: true,
      start: async () => {
        await session.start();
      },
      stop: () => void session.stop(),
      pause: session.pause,
      resume: session.resume,
      toggle: session.toggle,
      togglePause: session.togglePause,
      setUserNotesDraft: session.setUserNotesDraft,
      applyMeetingTranscript: session.applyMeetingTranscript,
      openMiniSurface,
    }),
    [session, openMiniSurface],
  );

  return (
    <CaptureSessionContext.Provider value={value}>{children}</CaptureSessionContext.Provider>
  );
}

function RemoteCaptureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CaptureSyncState | null>(() => readCaptureSnapshot());
  const channelRef = useRef<BroadcastChannel | null>(null);

  const sendCommand = useCallback((command: CaptureSyncCommand) => {
    const msg: CaptureSyncMessage = { kind: "command", command };
    channelRef.current?.postMessage(msg);
    void sendDesktopCaptureCommand(command);
  }, []);

  useEffect(() => {
    const channel = createCaptureChannel();
    channelRef.current = channel;
    const snap = readCaptureSnapshot();
    if (snap) setState(snap);

    if (channel) {
      channel.onmessage = (ev: MessageEvent<CaptureSyncMessage>) => {
        const msg = ev.data;
        if (msg?.kind === "state") setState(msg.state);
      };
      channel.postMessage({
        kind: "command",
        command: { type: "ping" },
      } satisfies CaptureSyncMessage);
    }

    return () => {
      channel?.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isDesktopShell()) return;
    let unlisten: (() => void) | undefined;
    void listenDesktopCaptureState((next) => setState(next)).then((fn) => {
      unlisten = fn;
    });
    void sendDesktopCaptureCommand({ type: "ping" });
    return () => unlisten?.();
  }, []);

  const empty: CaptureSyncState = {
    recording: false,
    paused: false,
    busy: false,
    elapsed: 0,
    meetingId: null,
    turns: [],
    notes: null,
    error: null,
    statusLine: "Waiting for main window…",
    phase: "idle",
    interim: "",
    userNotes: "",
    liveSupported: true,
    updatedAt: 0,
  };

  const s = state ?? empty;

  const value = useMemo<CaptureSessionValue>(
    () => ({
      recording: s.recording,
      paused: s.paused,
      busy: s.busy,
      elapsed: s.elapsed,
      meetingId: s.meetingId,
      sessionId: null,
      turns: s.turns,
      notes: s.notes,
      error: s.error,
      statusLine: s.statusLine,
      phase: s.phase,
      interim: s.interim,
      liveSupported: s.liveSupported,
      userNotes: s.userNotes,
      meters: { mic: 0, system: 0, backend: "mic" },
      isOwner: false,
      start: async () => {
        sendCommand({ type: "start" });
      },
      stop: () => sendCommand({ type: "stop" }),
      pause: () => sendCommand({ type: "pause" }),
      resume: () => sendCommand({ type: "resume" }),
      toggle: () => sendCommand(s.recording || s.paused ? { type: "stop" } : { type: "start" }),
      togglePause: () => sendCommand(s.paused ? { type: "resume" } : { type: "pause" }),
      setUserNotesDraft: (text) => sendCommand({ type: "notes", payload: text }),
      applyMeetingTranscript: () => undefined,
      openMiniSurface: () => undefined,
    }),
    [s, sendCommand],
  );

  return (
    <CaptureSessionContext.Provider value={value}>{children}</CaptureSessionContext.Provider>
  );
}

export function CaptureSessionProvider({ children }: { children: ReactNode }) {
  const isMini =
    typeof window !== "undefined" && window.location.pathname.startsWith("/mini-capture");
  if (isMini) return <RemoteCaptureProvider>{children}</RemoteCaptureProvider>;
  return <OwnerCaptureProvider>{children}</OwnerCaptureProvider>;
}

export function useCaptureSession() {
  const ctx = useContext(CaptureSessionContext);
  if (!ctx) throw new Error("useCaptureSession must be used within CaptureSessionProvider");
  return ctx;
}

export function useCaptureSessionOptional() {
  return useContext(CaptureSessionContext);
}
