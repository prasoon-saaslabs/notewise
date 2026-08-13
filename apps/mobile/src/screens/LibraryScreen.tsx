import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { createApiClient, type MeetingSummary } from "@notewise/api-client";

const api = createApiClient(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001");

export function LibraryScreen() {
  const [items, setItems] = useState<MeetingSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listMeetings()
      .then(setItems)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Library</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.meta}>No meetings yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.source} · {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12, color: "#0c1222" },
  row: {
    backgroundColor: "#fff",
    borderColor: "#e4e2db",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  rowTitle: { fontWeight: "600", color: "#0c1222" },
  meta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  error: { color: "#b91c1c", marginBottom: 8 },
});
