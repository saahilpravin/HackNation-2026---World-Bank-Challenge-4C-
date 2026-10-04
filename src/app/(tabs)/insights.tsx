import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Muted, Button, colors } from "../../components/ui";
import { useStore } from "../../state/store";
import { isDemoProfile } from "../../data/profile";
import { fetchInsights, insightsKey, type Finding } from "../../ai/insights-api";

export default function Insights() {
  const { data, update } = useStore();
  const demo = !!data?.profile && isDemoProfile(data.profile);
  const reviews = useMemo(() => (data?.reviews ?? []).filter(r => r.demo === demo), [data?.reviews, demo]);
  const language = data?.profile?.language ?? "English";
  const endpoint = data?.analysisEndpoint ?? "http://127.0.0.1:8080";
  const key = useMemo(() => insightsKey(reviews, language, endpoint), [reviews, language, endpoint]);
  const currentKey = useRef(key);
  const updateRef = useRef(update);
  useEffect(() => { currentKey.current = key; updateRef.current = update; }, [key, update]);
  const saved = data?.insightsCache?.key === key ? data.insightsCache : null;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const cached = !!saved;
  useEffect(() => {
    if (cached || !reviews.length || (Platform.OS !== "web" && !data?.analysisEndpoint)) { void Promise.resolve().then(() => setBusy(false)); return; }
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return null;
      setBusy(true); setError("");
      return fetchInsights(reviews, language, endpoint, controller.signal);
    }).then(async result => {
      if (!result || controller.signal.aborted || currentKey.current !== key) return;
      await updateRef.current(d => currentKey.current === key ? { ...d, insightsCache: { key, savedAt: new Date().toISOString(), result } } : d);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Insights are unavailable."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { controller.abort(); };
  }, [key, cached, reviews, language, endpoint, data?.analysisEndpoint]);
  if (!data) return <Page title="Insights"><ActivityIndicator color={colors.accent} /><Muted>Loading your saved reviews…</Muted></Page>;
  const result = saved?.result;
  const refresh = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await fetchInsights(reviews, language, endpoint);
      if (currentKey.current === key) await update(d => currentKey.current === key ? { ...d, insightsCache: { key, savedAt: new Date().toISOString(), result } } : d);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load insights."); }
    finally { setBusy(false); }
  };
  const average = result?.quantitative.average_rating ?? (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null);
  const renderFinding = (finding: Finding) => <View key={finding.aspect} style={styles.finding}>
    <Text style={styles.findingTitle}>{finding.label}</Text><Body>{finding.summary}</Body>
    {finding.quotes.slice(0, 2).map(quote => <View key={quote.review_id} style={styles.quote}><Body>“{quote.text}”</Body><Button secondary label={`Read ${reviews.find(r => r.id === quote.review_id)?.guest ?? "review"}`} onPress={() => router.push(`/reviews/${quote.review_id}`)} /></View>)}
  </View>;
  return <Page title="Insights" subtitle={`${data.profile?.name ?? "Your business"} · A clear view of your reviews.`}>
    <Card>
      <View style={styles.heading}><View style={styles.icon}><Ionicons name="sparkles-outline" color={colors.accent} size={24} /></View><View style={{ flex: 1 }}><Heading>Business overview</Heading><Muted>{result ? "Local review analysis · saved on this device" : "Your reviews, brought together"}</Muted></View></View>
      {busy && <View style={styles.heading}><ActivityIndicator color={colors.accent} /><Body>Reading your reviews…</Body></View>}
      {result ? <><Body>{result.meta.analysed} of {result.meta.total} reviews contributed to the findings. {result.qualitative.strengths[0] ? `Visitors most often praise ${result.qualitative.strengths[0].label.toLowerCase()}. ` : ""}{result.qualitative.problems[0] ? `The most mentioned concern is ${result.qualitative.problems[0].label.toLowerCase()}.` : "No concerns were detected among the analysed reviews."}</Body><Muted>{result.meta.unread} reviews need human checking. Findings use a local classifier and fixed wording, not an LLM-generated summary.</Muted>{result.meta.note && <Muted>{result.meta.note}</Muted>}</> : !busy && <Body>{reviews.length ? "Your review summary will load automatically when the local service is available." : "Add reviews to your workspace to see an overview."}</Body>}
      {!!error && <Muted>{error}</Muted>}
      {Platform.OS !== "web" && !data.analysisEndpoint && <Button secondary label="Connect the review service" onPress={() => router.push("/offline")} />}
      {!!reviews.length && <Button secondary label={busy ? "Loading insights…" : result ? "Refresh insights" : "Try loading insights"} disabled={busy} onPress={() => { void refresh().catch(() => setError("Could not update saved insights. Please try again.")); }} />}
      {demo && <Muted>Analysis of synthetic demo reviews; not live customer feedback.</Muted>}
      <Muted>An AI-written paragraph and business score can be added later. The rating below comes directly from review stars.</Muted>
    </Card>
    <View style={styles.stats}>{[{ label: "Reviews", value: String(reviews.length), bg: colors.sky }, { label: "Average rating", value: average === null ? "—" : `${average.toFixed(1)} / 5`, bg: colors.peach }, { label: "Analysed", value: result ? String(result.meta.analysed) : "—", bg: colors.mint }].map(stat => <View key={stat.label} style={[styles.stat, { backgroundColor: stat.bg }]}><Text style={styles.value}>{stat.value}</Text><Muted>{stat.label}</Muted></View>)}</View>
    {result && <>
      <Card><Heading>What’s working</Heading>{result.qualitative.strengths.length ? result.qualitative.strengths.slice(0, 3).map(renderFinding) : <Body>No clear strengths detected yet. This is not a negative rating.</Body>}</Card>
      <Card><Heading>What needs attention</Heading>{result.qualitative.problems.length ? result.qualitative.problems.slice(0, 3).map(renderFinding) : <Body>No concerns detected among the analysed reviews. Check the original feedback too.</Body>}</Card>
      {!!result.attention.unread_review_ids.length && <Card><Heading>Needs a closer look</Heading><Body>{result.attention.note ?? "These reviews were uncertain or in an unsupported language and are excluded from findings."}</Body>{result.attention.unread_review_ids.slice(0, 3).map(id => <Button key={id} secondary label={`Read ${reviews.find(r => r.id === id)?.guest ?? "review"}`} onPress={() => router.push(`/reviews/${id}`)} />)}</Card>}
      <Muted>Saved {new Date(saved!.savedAt).toLocaleString()} · Model {result.meta.model_version}. Language support is provisional; verify the evidence before relying on a finding.</Muted>
    </>}
    <Button label="View all reviews" onPress={() => router.navigate("/reviews")} />
  </Page>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flex: 1, minWidth: 90, padding: 16, borderRadius: 18, gap: 10 },
  value: { color: colors.ink, fontSize: 25, fontWeight: "700" },
  finding: { gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 16 },
  findingTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  quote: { padding: 14, borderRadius: 14, backgroundColor: colors.bg, gap: 10 },
});
