import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { createApiClient } from "@notewise/api-client";

const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001");

export function JoinScreen() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function join() {
    try {
      const res = await api.joinMeeting({ meetingUrl: url.trim() });
      setStatus(`Bot ${res.botId} · meeting ${res.meetingId.slice(0, 8)}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Join failed");
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Join meeting</Text>
      <Text style={styles.meta}>Paste Zoom / Meet / Teams URL — bot joins for you.</Text>
      <TextInput
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://…"
        style={styles.input}
      />
      <Pressable style={styles.cta} onPress={() => void join()}>
        <Text style={styles.ctaText}>Send bot</Text>
      </Pressable>
      {status ? <Text style={styles.meta}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0c1222" },
  meta: { color: "#64748b", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: "#e4e2db",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  cta: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontWeight: "700" },
});
