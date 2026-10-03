import { useState, type ReactNode } from "react";
import { Pressable, Text, View, StyleSheet, ScrollView, TextInput } from "react-native";
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
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const matches = languages.filter(language => language.toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={{ gap: 10 }}>
    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700" }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Change language`} accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={() => setExpanded(!expanded)} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, backgroundColor: "#F8FAFC", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.accent, fontWeight: "700", fontSize: 15 }}>{value}</Text><Ionicons name={expanded ? "chevron-up" : "chevron-down"} color={colors.accent} size={18} /></Pressable>
    {expanded && <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, overflow: "hidden", backgroundColor: "white" }}>
      <TextInput accessibilityLabel={`${label}: Search languages`} placeholder={`Search ${languages.length} languages`} value={query} onChangeText={setQuery} onKeyPress={event => { if (event.nativeEvent.key === "Escape") setExpanded(false); }} style={{ padding: 14, fontSize: 15, color: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.line }} />
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 250 }}>
        {matches.map(language => <Pressable key={language} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${label}: ${language}`} accessibilityState={{ selected: value === language, disabled }} onPress={() => { onChange(language); setExpanded(false); setQuery(""); }} style={{ minHeight: 48, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: value === language ? colors.lavender : "white", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}><Text style={{ flex: 1, color: colors.ink, fontSize: 15 }}>{language}</Text>{value === language && <Ionicons name="checkmark" size={18} color={colors.accent} />}</Pressable>)}
        {!matches.length && <Text style={{ padding: 16, color: colors.muted }}>No matching languages. Try another name.</Text>}
      </ScrollView>
    </View>}
  </View>;
}
export function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  const backgrounds = ["#EDE5FC", "#DDF2EB", "#FFE8DA", "#E5EAFB"];
  return <View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: backgrounds[index % 4], alignItems: "center", justifyContent: "center" }}><Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>{name.split(" ").slice(0,2).map(n => n[0]).join("")}</Text></View>;
}
export function Stars({ rating }: { rating: number }) {
  return <View accessibilityLabel={`${rating} out of 5 stars`} style={{ flexDirection: "row", gap: 2 }}>{[1,2,3,4,5].map(n => <Ionicons key={n} name={n <= rating ? "star" : "star-outline"} size={13} color="#AC7716" />)}</View>;
}
const styles = StyleSheet.create({
  hero: { padding: 24, gap: 12, borderRadius: 22, backgroundColor: colors.navy, overflow: "hidden" },
  eyebrow: { color: "#B7EBDB", fontWeight: "700", fontSize: 11, letterSpacing: 1.7 },
  title: { color: "white", fontWeight: "700", fontSize: 28, lineHeight: 34, letterSpacing: -0.7, maxWidth: 480 },
  orbit: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: "#527090", right: -95, top: -75 },
  orbitSmall: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "#3E6489", right: 32, bottom: -38 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "white", borderRadius: 24, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
  language: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: colors.line, minHeight: 40 },
});
