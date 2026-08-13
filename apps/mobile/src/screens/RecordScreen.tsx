import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Audio } from "expo-av";
import { createApiClient } from "@notewise/api-client";
import { MiniCaptureOverlay } from "../components/MiniCaptureOverlay";

const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001");

export function RecordScreen() {
  const [status, setStatus] = useState("Ready to capture");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcriptTail, setTranscriptTail] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notesRef = useRef("");

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void deactivateRecording();
    },
    [],
  );

  async function deactivateRecording() {
    try {
      if (recording) {
        const status = await recording.getStatusAsync();
        if (status.isRecording || status.canRecord) {
          await recording.stopAndUnloadAsync();
        }
      }
    } catch {
      /* ignore */
    }
  }

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function start() {
    if (busy || recording) return;
    setBusy(true);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus("Microphone permission required");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });
      const { sessionId: sid } = await api.createLocalSession("Mobile capture");
      setSessionId(sid);
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setPaused(false);
      setElapsed(0);
      setTranscriptTail([]);
      setStatus("Listening — mini player active");
      clearTimer();
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  async function pauseResume() {
    if (!recording || busy) return;
    setBusy(true);
    try {
      if (paused) {
        await recording.startAsync();
        setPaused(false);
        setStatus("Listening — resumed");
        if (!timerRef.current) {
          timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
        }
      } else {
        await recording.pauseAsync();
        setPaused(true);
        setStatus("Paused");
        clearTimer();
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Pause failed");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!recording || busy) return;
    setBusy(true);
    clearTimer();
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setPaused(false);
      setStatus(uri ? "Saved — upload/finalize next" : "Stopped");
      if (sessionId && uri) {
        setTranscriptTail((prev) => [...prev.slice(-3), "Capture saved locally"]);
        // Finalize when upload path is wired; notes kept for merge
        void notesRef.current;
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Stop failed");
    } finally {
      setBusy(false);
    }
  }

  const active = Boolean(recording) || paused;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Capture</Text>
      <Text style={styles.meta}>{status}</Text>
      <Text style={styles.hint}>
        Mini player stays visible while recording. Keep the app foregrounded for full controls;
        background notification / Live Activity comes next.
      </Text>

      {!active ? (
        <Pressable style={styles.cta} disabled={busy} onPress={() => void start()}>
          <Text style={styles.ctaText}>Start mic</Text>
        </Pressable>
      ) : (
        <Text style={styles.meta}>Use the mini player below for Pause / Stop / Notes.</Text>
      )}

      <MiniCaptureOverlay
        visible={active}
        paused={paused}
        elapsedSec={elapsed}
        statusLine={status}
        transcriptTail={transcriptTail}
        notes={notes}
        busy={busy}
        onPauseResume={() => void pauseResume()}
        onStop={() => void stop()}
        onChangeNotes={setNotes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0c1222" },
  meta: { color: "#64748b", fontSize: 14 },
  hint: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },
  cta: {
    marginTop: 12,
    backgroundColor: "#0e7490",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700" },
});
