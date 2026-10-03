import type { ReactNode } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";
export function Hero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <View style={styles.hero}>
    <View pointerEvents="none" style={styles.orbit} /><View pointerEvents="none" style={styles.orbitSmall} />
    <Text style={styles.eyebrow}>{eyebrow}</Text><Text style={styles.title}>{title}</Text>
    <View style={{ gap: 8 }}>{children}</View>
  </View>;
}
export function Chips({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return <View style={styles.chips}>{options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)} style={[styles.chip, value === option.value && styles.chipActive]}>
    <Text style={[styles.chipText, value === option.value && { color: "white" }]}>{option.label}</Text>
  </Pressable>)}</View>;
}
export function LanguagePicker({ label, value, languages, onChange, disabled = false }: { label: string; value: string; languages: readonly string[]; onChange: (language: string) => void; disabled?: boolean }) {
  return <View style={{ gap: 10 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700" }}>{label}</Text><View style={styles.chips}>{languages.map(language => <Pressable key={language} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${language}`} accessibilityState={{ selected: value === language, disabled }} onPress={() => onChange(language)} style={[styles.language, value === language && { backgroundColor: colors.lavender, borderColor: colors.accent }]}><Text style={{ color: value === language ? colors.accent : colors.muted, fontSize: 13, fontWeight: "600" }}>{value === language ? "✓ " : ""}{language}</Text></Pressable>)}</View></View>;
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const backgrounds = ["#EDE5FC", "#DDF2EB", "#FFE8DA", "#E5EAFB"];
  return <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: backgrounds[index % 4], alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>{name.split(" ").slice(0,2).map(n => n[0]).join("")}</Text></View>;
}
export function Stars({ rating }: { rating: number }) {
  return <View accessibilityLabel={`${rating} out of 5 stars`} style={{ flexDirection: "row", gap: 2 }}>{[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= rating ? "star" : "star-outline"} size={13} color="#AC7716" />)}</View>;
}
const styles = StyleSheet.create({
  hero: { padding: 24, gap: 12, borderRadius: 26, backgroundColor: colors.navy, overflow: "hidden" },
  eyebrow: { color: "#B7EBDB", fontWeight: "700", fontSize: 11, letterSpacing: 1.7 },
  title: { color: "white", fontWeight: "700", fontSize: 28, lineHeight: 34, letterSpacing: -0.7, maxWidth: 480 },
  orbit: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 28, borderColor: "#40335F", right: -95, top: -75 },
  orbitSmall: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "#326D6B", right: -15, bottom: -20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
  language: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#FAF9FC", borderWidth: 1, borderColor: colors.line, minHeight: 40 },
});
