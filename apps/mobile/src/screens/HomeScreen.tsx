import { View, Text, Pressable, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.brandRow}>
        <View style={styles.logo} />
        <Text style={styles.brand}>Notewise</Text>
      </View>
      <Text style={styles.lede}>
        Meeting notes on the go — Record mic, Join via bot, browse Library.
      </Text>
      <Pressable style={styles.cta} onPress={() => navigation.navigate("Record")}>
        <Text style={styles.ctaText}>Record</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate("Join")}>
        <Text style={styles.secondaryText}>Join meeting</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => navigation.navigate("Library")}>
        <Text style={styles.secondaryText}>Library</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center", gap: 12 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#0f766e",
  },
  brand: { fontSize: 28, fontWeight: "700", color: "#0c1222" },
  lede: { color: "#64748b", fontSize: 15, lineHeight: 22, marginBottom: 16 },
  cta: {
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondary: {
    borderWidth: 1,
    borderColor: "#e4e2db",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
  },
  secondaryText: { color: "#1e293b", fontWeight: "600", fontSize: 15 },
});
