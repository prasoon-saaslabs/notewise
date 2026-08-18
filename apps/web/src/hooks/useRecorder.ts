import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { acquireTwoChannelCapture, createAudioRecorder } from "../lib/audio";
import { getPendingCalendarEventId } from "../lib/authSession";
import { api } from "../lib/api";
import { hearWsUrl, isPyaiBackend } from "../lib/backend";
import {
  connectHearStream,
  startHearCapture,
  type HearCaptureHandle,
  type HearStreamClient,
} from "../lib/hearCapture";
import type { NotesPayload, TranscriptTurn } from "@notewise/api-client";
import {
  ensureReadyToRecord,
  micBlockedMessage,
} from "../lib/desktopPermissions";
import { notifyDesktop } from "../lib/desktopNotify";
import {
  startNativeSystemAudioCapture,
  stopNativeSystemAudioCapture,
} from "../lib/nativeSystemAudio";
import { syncDesktopTrayRecording } from "../lib/desktopTray";
import {
  appendRecoveryChunk,
  clearAllRecovery,
  readRecordingRecoveryMeta,
  readRecoveryChunks,
  writeRecordingRecoveryMeta,
  type RecordingRecoveryMeta,
} from "../lib/recordingRecovery";
import { throttle } from "../lib/throttle";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSimpleMeetingName,
  isEditedSimpleMeetingName,
  isSimpleCaptureSession,
} from "../features/simple/simpleCapture";

type Turn = {
  id: string;
  speaker: string;
  kind: "you" | "other";
  text: string;
  live?: boolean;
};

export type ProcessPhase =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "speakers"
  | "notes"
  | "ready"
  | "failed";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useRecorder() {
  const qc = useQueryClient();
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [notes, setNotes] = useState<NotesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState("Ready to capture");
  const [phase, setPhase] = useState<ProcessPhase>("idle");
  const phaseRef = useRef<ProcessPhase>("idle");
  const [interim, setInterim] = useState("");
  const [liveSupported, setLiveSupported] = useState(true);
  const [userNotes, setUserNotes] = useState("");
  const [meters, setMeters] = useState({ mic: 0, system: 0, backend: "mic" });

  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const captureReleaseRef = useRef<(() => void) | null>(null);
  const speechRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const seqRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const activeMeetingIdRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const wantSpeechRef = useRef(false);
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);
  const liveInFlightRef = useRef(false);
  const browserSpeechOkRef = useRef(false);
  const mimeRef = useRef("audio/webm");
  const hearCaptureRef = useRef<HearCaptureHandle | null>(null);
  const hearStreamRef = useRef<HearStreamClient | null>(null);
  const pcmChunksRef = useRef<ArrayBuffer[]>([]);
  const userNotesRef = useRef("");
  const checkInSentRef = useRef(false);
  const pyaiRef = useRef(isPyaiBackend());
  const usePyaiLiveRef = useRef(false);
  const turnsRef = useRef<Turn[]>([]);
  const channelModeRef = useRef<"mono" | "stereo" | "mix">("mono");
  const stopRef = useRef<() => void>(() => undefined);
  const recoverySeqRef = useRef(0);
  const backupUploadRef = useRef<number | null>(null);
  const lastBackupCountRef = useRef(0);
  const recoveryAttemptedRef = useRef(false);

  const pushInterim = useMemo(
    () =>
      throttle((text: string) => {
        setInterim(text);
      }, 120),
    [],
  );

  const pushMeters = useMemo(
    () =>
      throttle((levels: { mic: number; system: number; backend: string }) => {
        setMeters(levels);
      }, 150),
    [],
  );

  const setUserNotesDraft = useCallback((text: string) => {
    userNotesRef.current = text;
    setUserNotes(text);
  }, []);

  useEffect(() => {
    const sid = sessionIdRef.current;
    if (!sid || !pyaiRef.current) return;
    const handle = window.setTimeout(() => {
      void api.saveScratch(sid, userNotesRef.current).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [userNotes]);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const syncUserNotesFromMeeting = useCallback((value?: string | null) => {
    const next = value ?? "";
    userNotesRef.current = next;
    setUserNotes(next);
  }, []);

  const tryRecoverOrphanedRecording = useCallback(async () => {
    if (recoveryAttemptedRef.current || recordingRef.current || busyRef.current)
      return;
    const meta = readRecordingRecoveryMeta();
    if (!meta?.sessionId) return;
    recoveryAttemptedRef.current = true;
    busyRef.current = true;
    setBusy(true);
    setPhase("uploading");
    setStatusLine("Recovering interrupted recording…");
    try {
      const chunks = await readRecoveryChunks(meta.sessionId);
      const blob = new Blob(chunks, { type: meta.mime || "audio/webm" });
      if (blob.size > 0) {
        await api.uploadAudioChunk(meta.sessionId, blob, meta.seq);
      }
      await api.finalizeSession(meta.sessionId, { userNotes: meta.userNotes });
      await clearAllRecovery(meta.sessionId);
      setStatusLine("Recovered previous recording — see Library");
      void notifyDesktop(
        "Notewise",
        "Recovered an interrupted recording — see Library.",
        "info",
      );
      void qc.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      console.warn("Recording recovery failed", err);
      setError("Could not recover a previous interrupted recording.");
      void notifyDesktop(
        "Notewise — recovery failed",
        "Could not recover a previous interrupted recording.",
        "error",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPhase("idle");
    }
  }, [qc]);

  useEffect(() => {
    void tryRecoverOrphanedRecording();
  }, [tryRecoverOrphanedRecording]);

  useEffect(() => {
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      if (!recordingRef.current && !pausedRef.current) return;
      const sid = sessionIdRef.current;
      if (sid) {
        const meta: RecordingRecoveryMeta = {
          sessionId: sid,
          meetingId: activeMeetingIdRef.current ?? "",
          mime: mimeRef.current,
          seq: seqRef.current,
          startedAt: Date.now(),
          userNotes: userNotesRef.current,
          channelMode: channelModeRef.current,
        };
        writeRecordingRecoveryMeta(meta);
      }
      ev.preventDefault();
      ev.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Keep Hear AudioContext alive if the tab/PiP steals focus
  useEffect(() => {
    const resumeCtx = () => {
      const ctx = hearCaptureRef.current?.context;
      if (ctx && ctx.state === "suspended") void ctx.resume();
    };
    document.addEventListener("visibilitychange", resumeCtx);
    window.addEventListener("focus", resumeCtx);
    return () => {
      document.removeEventListener("visibilitychange", resumeCtx);
      window.removeEventListener("focus", resumeCtx);
    };
  }, []);

  const applyMeetingTranscript = useCallback(
    (detail: {
      transcript?: Array<{
        id: string;
        speaker: string;
        kind: string;
        text: string;
      }>;
      notes?: NotesPayload | null;
    }) => {
      if (detail.transcript?.length) {
        setTurns(
          detail.transcript.map((tr) => ({
            id: tr.id,
            speaker: tr.speaker,
            kind: tr.kind === "you" ? "you" : "other",
            text: tr.text,
          })),
        );
      }
      if (detail.notes !== undefined) setNotes(detail.notes);
    },
    [],
  );

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (liveTimerRef.current) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  };

  const stopSpeech = () => {
    wantSpeechRef.current = false;
    const s = speechRef.current;
    speechRef.current = null;
    if (!s) return;
    try {
      s.onend = null;
      s.onresult = null;
      s.onerror = null;
      s.stop();
    } catch {
      try {
        s.abort();
      } catch {
        /* ignore */
      }
    }
  };

  const cleanupHear = () => {
    try {
      hearStreamRef.current?.close();
    } catch {
      /* ignore */
    }
    hearStreamRef.current = null;
    try {
      hearCaptureRef.current?.stop();
    } catch {
      /* ignore */
    }
    hearCaptureRef.current = null;
  };

  const cleanupMedia = () => {
    cleanupHear();
    const rec = mediaRef.current;
    mediaRef.current = null;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    systemStreamRef.current?.getTracks().forEach((t) => t.stop());
    systemStreamRef.current = null;
    captureReleaseRef.current?.();
    captureReleaseRef.current = null;
    setMeters({ mic: 0, system: 0, backend: "mic" });
    if (
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
    ) {
      void stopNativeSystemAudioCapture();
    }
  };

  const pushBrowserFinal = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    browserSpeechOkRef.current = true;
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (last?.live && last.text === cleaned) return prev;
      return [
        ...prev,
        {
          id: `live-br-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          speaker: "You",
          kind: "you",
          text: cleaned,
          live: true,
        },
      ];
    });
    const mid = activeMeetingIdRef.current;
    if (mid) {
      window.dispatchEvent(
        new CustomEvent("og-utterance", {
          detail: { text: cleaned, meetingId: mid },
        }),
      );
    }
  }, []);

  const startSpeech = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setLiveSupported(true); // Whisper live still works
      setStatusLine("Listening — live Whisper");
      return;
    }
    wantSpeechRef.current = true;
    browserSpeechOkRef.current = false;

    const boot = () => {
      if (!wantSpeechRef.current) return;
      const rec = new Ctor();
      speechRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = navigator.language?.startsWith("en")
        ? navigator.language
        : "en-US";

      rec.onresult = (event) => {
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript?.trim();
          if (!text) continue;
          if (result.isFinal) {
            pushBrowserFinal(text);
            setInterim("");
          } else {
            interimText += `${text} `;
          }
        }
        if (interimText) {
          browserSpeechOkRef.current = true;
          setInterim(interimText.trim());
        }
      };

      rec.onerror = (ev) => {
        // no-speech / aborted are normal; network means Chrome cloud STT failed
        if (ev.error === "not-allowed") {
          wantSpeechRef.current = false;
          setStatusLine("Listening — live Whisper (mic speech blocked)");
        } else if (ev.error === "network") {
          wantSpeechRef.current = false;
          setStatusLine("Listening — live Whisper (browser STT offline)");
        }
      };

      rec.onend = () => {
        if (!wantSpeechRef.current || !recordingRef.current) return;
        window.setTimeout(() => {
          if (!wantSpeechRef.current || !recordingRef.current) return;
          try {
            rec.start();
          } catch {
            try {
              const next = new Ctor();
              speechRef.current = next;
              next.continuous = true;
              next.interimResults = true;
              next.lang = rec.lang;
              next.onresult = rec.onresult;
              next.onerror = rec.onerror;
              next.onend = rec.onend;
              next.start();
            } catch {
              /* Whisper live covers this */
            }
          }
        }, 120);
      };

      try {
        rec.start();
        setStatusLine(
          usePyaiLiveRef.current
            ? "Listening — browser captions (PyAI Hear unavailable)"
            : "Listening — live transcript on",
        );
      } catch {
        setStatusLine("Listening — live Whisper");
      }
    };

    // Start ASAP — SpeechRecognition is what makes transcript feel instant.
    boot();
  }, [pushBrowserFinal]);

  const startBrowserFallback = useCallback(
    (reason: string) => {
      const rateLimited = /rate.?limit|429|daily.?cap|usage cap/i.test(reason);
      if (rateLimited) {
        setError(
          "PyAI daily cap reached — using browser live captions. Notes still build from your transcript after Stop.",
        );
      }
      if (!wantSpeechRef.current) {
        setStatusLine(
          rateLimited
            ? "PyAI quota exceeded — browser live captions"
            : `Hear unavailable — browser captions (${reason})`,
        );
        startSpeech();
      }
    },
    [startSpeech],
  );

  const startElapsedTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = window.setInterval(() => {
      if (pausedRef.current || !recordingRef.current) return;
      setElapsed((e) => {
        const next = e + 1;
        if (
          usePyaiLiveRef.current &&
          !checkInSentRef.current &&
          channelModeRef.current !== "mix" &&
          next >= 5 &&
          sessionIdRef.current
        ) {
          checkInSentRef.current = true;
          void api
            .setSessionCheckIn(sessionIdRef.current, 5000)
            .catch(() => undefined);
        }
        return next;
      });
    }, 1000);
  }, []);

  const startLiveWhisperTimer = useCallback(() => {
    if (liveTimerRef.current || usePyaiLiveRef.current) return;
    liveTimerRef.current = window.setInterval(() => {
      if (pausedRef.current || !recordingRef.current) return;
      void tickLiveWhisperRef.current();
    }, 1500);
  }, []);

  const tickLiveWhisperRef = useRef<() => Promise<void>>(async () => undefined);

  const tickLiveWhisper = useCallback(async () => {
    if (!recordingRef.current || pausedRef.current || liveInFlightRef.current)
      return;
    const sid = sessionIdRef.current;
    if (!sid) return;
    if (chunksRef.current.length === 0) return;

    // Keep the first MediaRecorder chunk (WebM header) + recent audio.
    const all = chunksRef.current;
    if (all.length === 0) return;
    const tail = all.slice(-12);
    const slice = all[0] && tail[0] !== all[0] ? [all[0], ...tail] : tail;
    const blob = new Blob(slice, { type: mimeRef.current });
    if (blob.size < 2_500) return;

    liveInFlightRef.current = true;
    try {
      const result = await api.liveTranscribe(sid, blob);
      if (!recordingRef.current) return;
      const segments = result.segments?.filter((s) => s.text.trim()) ?? [];
      if (segments.length === 0 && !result.text?.trim()) return;

      // Browser speech already streaming — only fill if still empty.
      if (browserSpeechOkRef.current) {
        setTurns((prev) => {
          if (prev.length > 0) return prev;
          return [
            {
              id: `live-wh-${Date.now()}`,
              speaker: "You",
              kind: "you",
              text: result.text.trim(),
              live: true,
            },
          ];
        });
        return;
      }

      setTurns((prev) => {
        const browser = prev.filter((t) => t.id.startsWith("live-br-"));
        const whisper = (
          segments.length
            ? segments
            : [{ text: result.text, startMs: 0, endMs: 0 }]
        ).map((s, i) => ({
          id: `live-wh-${i}-${s.startMs}`,
          speaker: "You",
          kind: "you" as const,
          text: s.text.trim(),
          live: true,
        }));
        return [...browser, ...whisper];
      });
      setStatusLine("Listening — live Whisper");
    } catch {
      /* keep recording; next tick retries */
    } finally {
      liveInFlightRef.current = false;
    }
  }, []);

  tickLiveWhisperRef.current = tickLiveWhisper;

  const start = useCallback(async (): Promise<boolean> => {
    if (
      busyRef.current ||
      mediaRef.current ||
      recordingRef.current ||
      pausedRef.current
    )
      return false;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotes(null);
    setMeetingId(null);
    setInterim("");
    if (phaseRef.current === "ready") {
      syncUserNotesFromMeeting("");
    }
    chunksRef.current = [];
    pcmChunksRef.current = [];
    seqRef.current = 0;
    sessionIdRef.current = null;
    setSessionId(null);
    activeMeetingIdRef.current = null;
    browserSpeechOkRef.current = false;
    checkInSentRef.current = false;
    pyaiRef.current = isPyaiBackend();
    usePyaiLiveRef.current = pyaiRef.current;
    setTurns([]);
    setElapsed(0);
    setPaused(false);
    pausedRef.current = false;
    setPhase("recording");
    setStatusLine("Starting…");
    setLiveSupported(true);

    const isTauriShell =
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);

    try {
      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support MediaRecorder.");
      }
      if (window.localStorage.getItem("og-consent") !== "1") {
        window.dispatchEvent(new Event("og-need-consent"));
        throw new Error("Confirm recording consent before the first capture.");
      }

      if (isTauriShell) {
        await ensureReadyToRecord();
      }

      const usePyai = pyaiRef.current;
      const modeId = window.localStorage.getItem("og-mode-id") || "general";
      const mixedSpeakers = !isTauriShell;
      const cap = await acquireTwoChannelCapture({
        preferSystem: isTauriShell,
        mixedSpeakers,
      });
      let channelMode = cap.channelMode;
      let nativeSystemActive = Boolean(cap.nativeSystemAudio);
      if (nativeSystemActive) {
        nativeSystemActive = await startNativeSystemAudioCapture();
        if (!nativeSystemActive) {
          channelMode = "mono";
        }
      }
      channelModeRef.current = channelMode;
      window.localStorage.setItem("og-channel-mode", channelMode);
      captureReleaseRef.current = cap.release ?? null;
      setMeters({
        mic: 0,
        system: 0,
        backend: nativeSystemActive ? cap.backend : "mic",
      });
      const calendarEventId = getPendingCalendarEventId();
      const simpleCapture = isSimpleCaptureSession();
      const initialUserNotes = userNotesRef.current.trim();
      const sessionPromise = simpleCapture
        ? api.createLocalSession(undefined, {
            ...(isEditedSimpleMeetingName()
              ? { name: getSimpleMeetingName().trim() }
              : {}),
            ...(initialUserNotes ? { userNotes: initialUserNotes } : {}),
            modeId,
            channelMode,
            calendarEventId: calendarEventId ?? undefined,
          })
        : api.createLocalSession(
            `Capture · ${new Date().toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}`,
            {
              ...(initialUserNotes ? { userNotes: initialUserNotes } : {}),
              modeId,
              channelMode,
              calendarEventId: calendarEventId ?? undefined,
            },
          );
      const stream = cap.recordStream;
      const liveTracks = stream
        .getAudioTracks()
        .filter((t) => t.readyState === "live");
      if (!liveTracks.length) {
        stream.getTracks().forEach((t) => t.stop());
        cap.systemStream?.getTracks().forEach((t) => t.stop());
        captureReleaseRef.current?.();
        captureReleaseRef.current = null;
        throw new Error(
          "Microphone opened but no live audio track. Check OS/browser mic settings.",
        );
      }
      streamRef.current = stream;
      systemStreamRef.current = cap.systemStream;
      liveTracks.forEach((track) => {
        track.enabled = true;
        track.onended = () => {
          if (recordingRef.current || pausedRef.current) stopRef.current();
        };
      });

      const rec = createAudioRecorder(stream);
      mediaRef.current = rec;
      mimeRef.current = rec.mimeType || "audio/webm";

      const created = await sessionPromise;
      sessionIdRef.current = created.sessionId;
      setSessionId(created.sessionId);
      activeMeetingIdRef.current = created.meetingId;
      setMeetingId(created.meetingId);
      recoverySeqRef.current = 0;
      lastBackupCountRef.current = 0;
      writeRecordingRecoveryMeta({
        sessionId: created.sessionId,
        meetingId: created.meetingId,
        mime: mimeRef.current,
        seq: seqRef.current,
        startedAt: Date.now(),
        userNotes: userNotesRef.current,
        channelMode: channelModeRef.current,
      });

      rec.ondataavailable = (ev) => {
        if (ev.data?.size > 0 && !pausedRef.current) {
          chunksRef.current.push(ev.data);
          const sid = sessionIdRef.current;
          if (sid) {
            const seq = recoverySeqRef.current++;
            void appendRecoveryChunk(sid, seq, ev.data);
          }
        }
      };
      try {
        rec.start(250);
      } catch {
        try {
          rec.start(1000);
        } catch {
          rec.start();
        }
      }

      recordingRef.current = true;
      setRecording(true);
      void syncDesktopTrayRecording(true);
      setStatusLine(usePyai ? "Listening — PyAI Hear…" : "Listening…");
      if (!usePyai) startSpeech();
      startElapsedTimer();

      if (backupUploadRef.current)
        window.clearInterval(backupUploadRef.current);
      backupUploadRef.current = window.setInterval(() => {
        if (!recordingRef.current || pausedRef.current) return;
        const sid = sessionIdRef.current;
        if (!sid) return;
        const pending = chunksRef.current.slice(lastBackupCountRef.current);
        if (!pending.length) return;
        lastBackupCountRef.current = chunksRef.current.length;
        const blob = new Blob(pending, { type: mimeRef.current });
        if (blob.size < 4096) return;
        void api
          .uploadAudioChunk(sid, blob, seqRef.current++)
          .catch(() => undefined);
      }, 20_000);

      if (usePyai) {
        const client = connectHearStream(hearWsUrl(created.sessionId), {
          onPartial: (text) => {
            if (!recordingRef.current || pausedRef.current) return;
            pushInterim(text);
          },
          onFinal: (text) => {
            if (!recordingRef.current || pausedRef.current) return;
            const cleaned = text.trim();
            if (!cleaned) return;
            setInterim("");
            setTurns((prev) => {
              const last = prev[prev.length - 1];
              if (last?.live && last.text === cleaned) return prev;
              return [
                ...prev,
                {
                  id: `live-hear-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 7)}`,
                  speaker: cap.channelMode === "mix" ? "Others" : "You",
                  kind: cap.channelMode === "mix" ? "other" : "you",
                  text: cleaned,
                  live: true,
                },
              ];
            });
            window.dispatchEvent(
              new CustomEvent("og-utterance", {
                detail: { text, meetingId: created.meetingId },
              }),
            );
          },
          onReady: () => setStatusLine("Listening — PyAI Hear live"),
          onError: (msg) => {
            startBrowserFallback(msg);
          },
        });
        hearStreamRef.current = client;

        client.ws.onclose = () => {
          if (
            recordingRef.current &&
            !browserSpeechOkRef.current &&
            !wantSpeechRef.current
          ) {
            startBrowserFallback("Hear connection closed");
          }
        };

        try {
          const capture = await startHearCapture(
            stream,
            (frame) => {
              if (pausedRef.current) return;
              pcmChunksRef.current.push(frame);
              client.sendPcm(frame);
            },
            {
              systemStream: cap.systemStream,
              nativeSystemAudio: nativeSystemActive,
              stereo: channelMode === "stereo",
              onMeters: (levels) =>
                pushMeters({ ...levels, backend: cap.backend }),
            },
          );
          hearCaptureRef.current = capture;
          if (cap.backend === "mix") {
            setStatusLine("Listening — live capture");
          } else if (cap.backend === "tab-capture") {
            setStatusLine(
              `Listening — You + ${cap.meetingTabTitle || "meeting tab"}`,
            );
          } else {
            setStatusLine(
              channelMode === "stereo"
                ? "Listening — You + Them (system audio)"
                : "Listening — mic only",
            );
          }
        } catch (hearErr) {
          console.warn(
            "Hear live capture failed; batch upload still active",
            hearErr,
          );
          setStatusLine("Listening — mic on (live Hear unavailable)");
        }
      } else {
        startLiveWhisperTimer();
        window.setTimeout(() => void tickLiveWhisper(), 900);
      }
      return true;
    } catch (err) {
      recordingRef.current = false;
      pausedRef.current = false;
      void syncDesktopTrayRecording(false);
      stopSpeech();
      cleanupMedia();
      stopTimer();
      sessionIdRef.current = null;
      setSessionId(null);
      activeMeetingIdRef.current = null;
      const message =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
          ? isTauriShell
            ? err.message && err.message !== "Microphone access denied"
              ? err.message
              : micBlockedMessage()
            : "Microphone blocked. Allow mic access for this site, then try again."
          : err instanceof Error
            ? err.message
            : "Could not start recording";
      setError(message);
      void notifyDesktop(
        "Notewise — could not start recording",
        message,
        "error",
      );
      setRecording(false);
      setPaused(false);
      setPhase("idle");
      setStatusLine("Ready to capture");
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [
    startSpeech,
    syncUserNotesFromMeeting,
    tickLiveWhisper,
    startElapsedTimer,
    startLiveWhisperTimer,
    startBrowserFallback,
  ]);

  const pause = useCallback(() => {
    if (!recordingRef.current || pausedRef.current || busyRef.current) return;
    pausedRef.current = true;
    setPaused(true);
    setRecording(false);
    setInterim("");
    setStatusLine("Paused — resume anytime");
    try {
      if (mediaRef.current?.state === "recording") mediaRef.current.pause();
    } catch {
      /* ignore */
    }
    hearCaptureRef.current?.pause();
    stopSpeech();
    if (liveTimerRef.current) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!pausedRef.current || busyRef.current) return;
    pausedRef.current = false;
    setPaused(false);
    recordingRef.current = true;
    setRecording(true);
    setStatusLine(
      usePyaiLiveRef.current
        ? "Listening — PyAI Hear live"
        : "Listening — live transcript on",
    );
    try {
      if (mediaRef.current?.state === "paused") mediaRef.current.resume();
    } catch {
      /* ignore */
    }
    hearCaptureRef.current?.resume();
    if (!usePyaiLiveRef.current) {
      startSpeech();
      startLiveWhisperTimer();
    }
    startElapsedTimer();
  }, [startSpeech, startElapsedTimer, startLiveWhisperTimer]);

  const stop = useCallback(async () => {
    if (busyRef.current) return;
    if (!recordingRef.current && !pausedRef.current && !mediaRef.current)
      return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setInterim("");
    setPhase("uploading");
    setStatusLine("Finishing…");
    recordingRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    void syncDesktopTrayRecording(false);
    if (backupUploadRef.current) {
      window.clearInterval(backupUploadRef.current);
      backupUploadRef.current = null;
    }
    stopSpeech();
    stopTimer();
    try {
      if (mediaRef.current?.state === "paused") mediaRef.current.resume();
    } catch {
      /* ignore */
    }

    try {
      const rec = mediaRef.current;
      if (rec && rec.state !== "inactive") {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          rec.addEventListener("stop", done, { once: true });
          try {
            rec.requestData?.();
          } catch {
            /* optional */
          }
          rec.stop();
          window.setTimeout(done, 1500);
        });
      }

      const mime = rec?.mimeType || mimeRef.current || "audio/webm";
      cleanupMedia();
      setRecording(false);

      const sid = sessionIdRef.current;
      if (!sid) {
        setError("No active session — tap Start again.");
        setPhase("idle");
        setStatusLine("Ready to capture");
        return;
      }

      const usePyai = pyaiRef.current;
      // Commit Hear stream before teardown so finals flush to the gateway store
      try {
        hearStreamRef.current?.commit();
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 250));
      cleanupHear();

      const blob = new Blob(chunksRef.current, { type: mime });
      setStatusLine("Uploading audio…");
      if (blob.size > 0) {
        await api.uploadAudioChunk(sid, blob, seqRef.current++);
      }
      await clearAllRecovery(sid);
      if (usePyai && pcmChunksRef.current.length > 0) {
        const pcmBlob = new Blob(pcmChunksRef.current, {
          type: "application/octet-stream",
        });
        await api.uploadPcm(sid, pcmBlob).catch(() => undefined);
      }
      if (usePyai && !checkInSentRef.current) {
        await api
          .setSessionCheckIn(sid, Math.min(elapsed * 1000, 5000))
          .catch(() => undefined);
      }

      // Snapshot live captions before finalize (last-resort if batch/Hear empty)
      const liveTurns = turnsRef.current
        .filter((t) => t.text.trim())
        .map((t, i) => ({
          text: t.text.trim(),
          speaker: t.speaker,
          startMs: i * 1000,
          endMs: (i + 1) * 1000,
        }));

      setPhase("transcribing");
      setStatusLine(
        usePyai ? "Transcribing with PyAI Hear…" : "Transcribing with Whisper…",
      );
      const result = await api.finalizeSession(sid, {
        userNotes: userNotesRef.current,
        liveTurns: liveTurns.length ? liveTurns : undefined,
      });
      setMeetingId(result.meetingId);
      void qc.invalidateQueries({ queryKey: ["meetings"] });

      // PyAI finalize is synchronous (awaits jobs+Recap); Nest polls worker.
      if (
        usePyai &&
        (result.status === "ready" || result.status === "failed")
      ) {
        const detail = await api.getMeeting(result.meetingId);
        if (detail.transcript?.length) {
          setTurns(
            detail.transcript.map((tr) => ({
              id: tr.id,
              speaker: tr.speaker,
              kind: tr.kind === "you" ? "you" : "other",
              text: tr.text,
            })),
          );
        }
        setNotes(detail.notes);
        syncUserNotesFromMeeting(detail.userNotes);
        if (result.status === "failed") {
          const errMsg =
            (result as { error?: string }).error ||
            (detail as { error?: string }).error ||
            "Transcription failed";
          setError(errMsg);
          setPhase("failed");
          setStatusLine(
            errMsg.includes("PYAI_RATE_LIMIT")
              ? "PyAI quota exceeded — try again after 00:00 UTC or use samples"
              : errMsg.includes("EMPTY_TRANSCRIPT") ||
                  /no transcript/i.test(errMsg)
                ? liveTurns.length
                  ? "Could not build notes — retry or import samples"
                  : "No speech captured — allow mic and speak, or use browser captions"
                : "Transcribe failed",
          );
        } else {
          setPhase("ready");
          setStatusLine("Notes ready (PyAI Recap)");
        }
        void qc.invalidateQueries({ queryKey: ["meetings"] });
      } else {
        for (let i = 0; i < 90; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const detail = await api.getMeeting(result.meetingId);

          if (detail.transcript?.length && detail.status === "processing") {
            setPhase("speakers");
            setStatusLine("Identifying You vs Others…");
            setTurns(
              detail.transcript.map((tr: TranscriptTurn) => ({
                id: tr.id,
                speaker: tr.speaker,
                kind: tr.kind === "you" ? "you" : "other",
                text: tr.text,
              })),
            );
          }

          if (detail.status === "processing" && i > 8) {
            setPhase("notes");
            setStatusLine(
              usePyai
                ? "Writing notes with PyAI Recap…"
                : "Writing notes & action items…",
            );
          }

          if (detail.status === "ready" || detail.status === "failed") {
            if (detail.transcript?.length) {
              setTurns(
                detail.transcript.map((tr) => ({
                  id: tr.id,
                  speaker: tr.speaker,
                  kind: tr.kind === "you" ? "you" : "other",
                  text: tr.text,
                })),
              );
            }
            setNotes(detail.notes);
            syncUserNotesFromMeeting(detail.userNotes);
            void qc.invalidateQueries({ queryKey: ["meetings"] });
            setPhase(detail.status === "ready" ? "ready" : "failed");
            setStatusLine(
              detail.status === "ready" ? "Notes ready" : "Processing failed",
            );
            break;
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Could not finish recording";
      setError(message);
      void notifyDesktop("Notewise — recording failed", message, "error");
      setPhase("failed");
      setStatusLine("Ready to capture");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [qc, elapsed, syncUserNotesFromMeeting]); // turns read via turnsRef

  stopRef.current = () => {
    void stop();
  };

  const toggle = useCallback(() => {
    if (recording || paused) void stop();
    else void start();
  }, [recording, paused, start, stop]);

  const togglePause = useCallback(() => {
    if (paused) resume();
    else if (recording) pause();
  }, [paused, recording, pause, resume]);

  useEffect(
    () => () => {
      recordingRef.current = false;
      pausedRef.current = false;
      stopSpeech();
      stopTimer();
      cleanupMedia();
    },
    [],
  );

  return {
    recording,
    paused,
    busy,
    elapsed,
    meetingId,
    sessionId,
    turns,
    notes,
    error,
    statusLine,
    phase,
    interim,
    liveSupported,
    userNotes,
    meters,
    backend: pyaiRef.current ? ("pyai" as const) : ("nest" as const),
    start,
    stop,
    pause,
    resume,
    toggle,
    togglePause,
    setUserNotesDraft,
    applyMeetingTranscript,
  };
}
