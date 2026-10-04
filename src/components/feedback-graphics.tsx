import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "./theme";
import type { InsightsResult } from "../ai/insights-api";

const tones = { positive: colors.teal, negative: colors.coral, mixed: colors.accent, neutral: "#A2AABE", unknown: "#D9DDE6" };
export function RatingOrbit({ value, size = 100, dark = false }: { value: number | null; size?: number; dark?: boolean }) {
  const radius = 40, length = 2 * Math.PI * radius, score = Math.max(0, Math.min(5, value ?? 0));
  return <View accessible accessibilityLabel={value === null ? "No review ratings yet" : `Average review rating ${value.toFixed(1)} out of 5`} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Circle cx="50" cy="50" r={radius} fill="none" stroke={dark ? "#50417D" : "#ECE7F6"} strokeWidth="6" />
      <Circle cx="50" cy="50" r={radius} fill="none" stroke={dark ? "#BDF2DF" : colors.accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${length * score / 5} ${length}`} rotation="-90" origin="50, 50" />
    </Svg>
    <Text style={{ color: dark ? "white" : colors.ink, fontSize: size * .27, fontWeight: "700", letterSpacing: -1 }}>{value === null ? "—" : value.toFixed(1)}</Text>
    <Text style={{ color: dark ? "#C4BAE3" : colors.muted, fontSize: 11 }}>out of 5</Text>
  </View>;
}
export function RatingDistribution({ distribution }: { distribution: Record<string, number> }) {
  const total = Object.values(distribution).reduce((sum, n) => sum + n, 0);
  return <View style={s.ratingBars}>{[5,4,3,2,1].map(star => { const n = distribution[String(star)] ?? 0; return <View key={star} accessible accessibilityLabel={`${star} stars: ${n} reviews`} style={s.barRow}><Text style={s.starLabel}>{star}</Text><Ionicons name="star" size={11} color="#B28C43" /><View style={s.track}><View style={[s.fill, { width: `${total ? n / total * 100 : 0}%`, backgroundColor: star >= 4 ? colors.accent : "#C7B4EB" }]} /></View><Text style={s.count}>{n}</Text></View>; })}</View>;
}
export function SentimentBreakdown({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const entries = Object.entries(counts).filter(([,n]) => n > 0).sort(([a],[b]) => Object.keys(tones).indexOf(a) - Object.keys(tones).indexOf(b));
  return <View style={{ gap: 14 }}><View accessible accessibilityLabel={entries.map(([label,n]) => `${label}: ${n} reviews`).join(", ")} style={s.sentimentTrack}>{entries.map(([label,n]) => <View key={label} style={{ flex: n, backgroundColor: tones[label as keyof typeof tones] ?? tones.unknown }} />)}{!total && <View style={{ flex: 1, backgroundColor: colors.line }} />}</View><View style={s.legend}>{entries.map(([label,n]) => <View key={label} style={s.legendItem}><View style={[s.dot,{ backgroundColor: tones[label as keyof typeof tones] ?? tones.unknown }]} /><Text style={s.legendText}>{label[0].toUpperCase()+label.slice(1)} <Text style={{ fontWeight: "700", color: colors.ink }}>{n}</Text></Text></View>)}</View></View>;
}
export function AspectChart({ aspects, total }: { aspects: InsightsResult["quantitative"]["aspects"]; total: number }) {
  const scale = Math.max(total, ...aspects.map(a => a.positive+a.negative), 1);
  const rows = [...aspects].sort((a,b) => (b.positive+b.negative)-(a.positive+a.negative));
  return <View style={{ gap: 20 }}>{rows.map(a => <View key={a.aspect} accessible accessibilityLabel={`${a.label}: ${a.positive} positive and ${a.negative} negative mentions from ${total} included reviews`} style={{ gap: 9 }}><View style={s.barRow}><Text style={s.aspectLabel}>{a.label}</Text><Text style={s.aspectCounts}><Text style={{ color: colors.teal }}>+{a.positive}</Text>  <Text style={{ color: colors.coral }}>−{a.negative}</Text></Text></View><View style={s.aspectTrack}><View style={{ width: `${a.positive/scale*100}%`, backgroundColor: colors.teal, borderRadius: 4, height: 7 }} /><View style={{ width: `${a.negative/scale*100}%`, backgroundColor: colors.coral, borderRadius: 4, height: 7 }} /></View></View>)}</View>;
}
export function MonthlyRatings({ trend }: { trend: InsightsResult["quantitative"]["trend"] }) {
  // A single month is not a trend; never draw an invented upward sparkline.
  const points = trend.filter(t => t.average_rating !== null).slice(-6);
  if (points.length < 2) return null;
  const x = (i: number) => 12 + i * 276 / (points.length-1), y = (v: number) => 90 - (v-1)/4*74;
  return <View style={{ gap: 8 }}><Svg width="100%" height="112" viewBox="0 0 300 112" accessible={false}>{[1,3,5].map(n => <Line key={n} x1="12" x2="288" y1={y(n)} y2={y(n)} stroke={colors.line} strokeDasharray="3 5" />)}<Path d={points.map((p,i) => `${i ? "L" : "M"}${x(i)} ${y(p.average_rating!)}`).join(" ")} stroke={colors.accent} strokeWidth="3" fill="none" />{points.map((p,i) => <Circle key={p.month} cx={x(i)} cy={y(p.average_rating!)} r="4" fill={colors.accent} />)}</Svg><View style={{ flexDirection: "row", justifyContent: "space-between" }}>{points.map(p => <Text key={p.month} style={s.legendText}>{p.month.slice(5)} · {p.average_rating?.toFixed(1)}</Text>)}</View></View>;
}
export function QueueGraphic({ remaining, handled }: { remaining: number; handled: number }) {
  const total = remaining+handled;
  return <View style={{ gap: 8 }} accessible accessibilityLabel={`${remaining} reviews need reply; ${handled} handled`}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={s.legendText}>Reply progress</Text><Text style={[s.legendText,{ color: colors.ink, fontWeight: "700" }]}>{handled} / {total}</Text></View><View style={s.queueTrack}><View style={{ width: `${total ? handled/total*100 : 0}%`, height: 5, borderRadius: 5, backgroundColor: colors.teal }} /></View></View>;
}
const s = StyleSheet.create({
  ratingBars: { flex: 1, minWidth: 110, gap: 8 }, barRow: { flexDirection: "row", alignItems: "center", gap: 7 }, starLabel: { width: 10, color: colors.muted, fontSize: 11, fontWeight: "600" }, track: { flex: 1, backgroundColor: "#F0ECF6", height: 5, borderRadius: 5, overflow: "hidden" }, fill: { height: 5, borderRadius: 5 }, count: { width: 25, textAlign: "right", color: colors.muted, fontSize: 11 }, sentimentTrack: { flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 3 }, legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 18, rowGap: 10 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 6 }, dot: { width: 6, height: 6, borderRadius: 3 }, legendText: { color: colors.muted, fontSize: 12, lineHeight: 18 }, aspectLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink }, aspectCounts: { fontSize: 12, fontWeight: "700" }, aspectTrack: { flexDirection: "row", gap: 3, minHeight: 7, backgroundColor: "#F0F2F6", borderRadius: 4, overflow: "hidden" }, queueTrack: { height: 5, borderRadius: 5, overflow: "hidden", backgroundColor: colors.line },
});
