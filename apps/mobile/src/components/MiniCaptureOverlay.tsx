import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

export type MiniCaptureOverlayProps = {
  visible: boolean;
  paused: boolean;
  elapsedSec: number;
  statusLine: string;
  transcriptTail: string[];
  interim?: string;
  notes: string;
  busy?: boolean;
  onPauseResume: () => void;
  onStop: () => void;
  onChangeNotes: (text: string) => void;
};

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * In-app mini capture controls for iOS/Android.
 * Background always-on-top is OS-limited; use notification/Live Activity later.
 */
export function MiniCaptureOverlay({
  visible,
  paused,
  elapsedSec,
  statusLine,
  transcriptTail,
  interim,
  notes,
  busy,
  onPauseResume,
  onStop,
  onChangeNotes,
}: MiniCaptureOverlayProps) {
  const [notesOpen, setNotesOpen] = useState(true);

  useEffect(() => {
    if (!visible) {
      void deactivateKeepAwake("notewise-capture");
      return;
    }
    void activateKeepAwakeAsync("notewise-capture");
    return () => {
      void deactivateKeepAwake("notewise-capture");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.header}>
          <View>
            <Text style={styles.timer}>{formatTimer(elapsedSec)}</Text>
            <Text style={styles.status}>{paused ? "Paused" : statusLine}</Text>
          </View>
          <Text style={styles.platform}>{Platform.OS === "ios" ? "iOS" : "Android"}</Text>
        </View>

        <View style={styles.transcript}>
          {transcriptTail.length === 0 && !interim ? (
            <Text style={styles.muted}>Transcript will appear here…</Text>
          ) : (
            <>
              {transcriptTail.map((line, i) => (
                <Text key={`${i}-${line.slice(0, 12)}`} style={styles.line}>
                  {line}
                </Text>
              ))}
              {interim ? <Text style={styles.interim}>{interim}</Text> : null}
            </>
          )}
        </View>

        <Pressable onPress={() => setNotesOpen((v) => !v)}>
          <Text style={styles.notesLabel}>Live notes {notesOpen ? "▾" : "▸"}</Text>
        </Pressable>
        {notesOpen ? (
          <TextInput
            style={styles.notes}
            multiline
            placeholder="Jot notes while you talk…"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={onChangeNotes}
          />
        ) : null}

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnSecondary]}
            disabled={busy}
            onPress={onPauseResume}
          >
            <Text style={styles.btnSecondaryText}>{paused ? "Resume" : "Pause"}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnDanger]} disabled={busy} onPress={onStop}>
            <Text style={styles.btnDangerText}>Stop</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    zIndex: 50,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    padding: 12,
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timer: { fontSize: 22, fontWeight: "700", color: "#111827", fontVariant: ["tabular-nums"] },
  status: { marginTop: 2, fontSize: 12, color: "#6b7280" },
  platform: {
    fontSize: 10,
    fontWeight: "700",
    color: "#155e75",
    backgroundColor: "#ecfeff",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  transcript: {
    marginTop: 10,
    maxHeight: 88,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    padding: 10,
  },
  muted: { fontSize: 12, color: "#94a3b8" },
  line: { fontSize: 12, color: "#1f2937", marginBottom: 4 },
  interim: { fontSize: 12, fontStyle: "italic", color: "#94a3b8" },
  notesLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#6b7280",
  },
  notes: {
    marginTop: 6,
    minHeight: 56,
    maxHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  actions: { marginTop: 10, flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
  },
  btnSecondary: { backgroundColor: "#ecfeff", borderWidth: 1, borderColor: "rgba(14,116,144,0.25)" },
  btnSecondaryText: { color: "#155e75", fontWeight: "700", fontSize: 13 },
  btnDanger: { backgroundColor: "#dc2626" },
  btnDangerText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
