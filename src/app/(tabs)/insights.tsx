import { useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Muted, Button, colors } from "../../components/ui";
import { useStore } from "../../state/store";
import { isDemoProfile } from "../../data/profile";
import { reviewState } from "../../data/review-tools";

export default function Insights() {
  const { data } = useStore();
  const demo = !!data?.profile && isDemoProfile(data.profile);
  const reviews = useMemo(() => (data?.reviews ?? []).filter(review => review.demo === demo), [data?.reviews, demo]);
  if (!data) return <Page title="Insights"><ActivityIndicator color={colors.accent} /><Muted>Loading your saved reviews…</Muted></Page>;
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "—";
  const unanswered = reviews.filter(review => reviewState(review, data.reviewReplies) === "new").length;
  const stats = [
    { label: "Reviews", value: String(reviews.length), icon: "chatbubbles-outline" as const, background: colors.sky },
    { label: "Average rating", value: average, icon: "star-outline" as const, background: colors.peach },
    { label: "Awaiting reply", value: String(unanswered), icon: "create-outline" as const, background: colors.mint },
  ];
  return <Page title="Insights" subtitle={`${data.profile?.name ?? "Your business"} · Your reviews at a glance.`}>
    <Card>
      <View style={styles.headingRow}>
        <View style={styles.icon}><Ionicons name="sparkles-outline" size={24} color={colors.accent} /></View>
        <View style={{ flex: 1 }}><Heading>Business overview</Heading><Muted>A space for your next AI insights.</Muted></View>
      </View>
      <TextInput accessibilityLabel="Future AI insight summary" editable={false} multiline value="Adding AI LLM later." style={styles.placeholder} />
      <Muted>Your AI summary and business score will appear here when the model is connected.</Muted>
    </Card>
    <View style={styles.stats}>
      {stats.map(stat => <View key={stat.label} style={[styles.stat, { backgroundColor: stat.background }]}>
        <Ionicons name={stat.icon} size={22} color={colors.ink} />
        <Text style={styles.value}>{stat.value}{stat.label === "Average rating" && reviews.length > 0 ? <Text style={styles.scale}> / 5</Text> : null}</Text>
        <Text style={styles.label}>{stat.label}</Text>
      </View>)}
    </View>
    <Card>
      <Heading>Your review workspace</Heading>
      <Body>{reviews.length ? "Read your reviews, translate them into your preferred language, and write a response in your own words." : "Your review overview will appear once reviews are available in this workspace."}</Body>
      <Button label="View reviews" onPress={() => router.navigate("/reviews")} />
      <Muted>Average rating comes directly from review stars. It is not an AI score.</Muted>
    </Card>
  </Page>;
}
const styles = StyleSheet.create({
  headingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  placeholder: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 20, minHeight: 120, color: colors.muted, fontSize: 17, lineHeight: 26, textAlignVertical: "top" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flex: 1, minWidth: 90, padding: 16, borderRadius: 18, gap: 10 },
  value: { color: colors.ink, fontSize: 28, fontWeight: "700" },
  scale: { fontSize: 13, fontWeight: "500", color: colors.muted },
  label: { fontSize: 12, lineHeight: 18, color: colors.ink },
});
