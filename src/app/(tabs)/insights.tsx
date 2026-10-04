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
    <Text style={styles.findingTitle}>{finding.label}</Text><Body>{finding.summary}</Body><Muted>{finding.count} of {finding.total} analysed reviews · {Math.round(finding.share * 100)}%</Muted>
    {finding.quotes.slice(0, 2).map(quote => <View key={quote.review_id} style={styles.quote}><Body>“{quote.text}”</Body><Button secondary label={`Read ${reviews.find(r => r.id === quote.review_id)?.guest ?? "review"}`} onPress={() => router.push(`/reviews/${quote.review_id}`)} /></View>)}
  </View>;
  return <Page title="Insights" subtitle={`${data.profile?.name ?? "Your business"} · A clear view of your reviews.`}>
    <Card>
      <View style={styles.heading}><View style={styles.icon}><Ionicons name="sparkles-outline" color={colors.accent} size={24} /></View><View style={{ flex: 1 }}><Heading>Business overview</Heading><Muted>{result ? "Local review analysis · saved on this device" : "Your reviews, brought together"}</Muted></View></View>
      {busy && <View style={styles.heading}><ActivityIndicator color={colors.accent} /><Body>Reading your reviews…</Body></View>}
      {result ? <><Body>{result.meta.analysed} of {result.meta.total} reviews contributed to the findings. {result.qualitative.strengths[0] ? `Visitors most often praise ${result.qualitative.strengths[0].label.toLowerCase()}. ` : ""}{result.qualitative.problems[0] ? `The most mentioned concern is ${result.qualitative.problems[0].label.toLowerCase()}.` : "No concerns were detected among the analysed reviews."}</Body>{result.narrative?.status === "generated" ? <View style={styles.narrative}><Heading>AI insight summary</Heading><Body>{result.narrative.summary}</Body><Muted>Qwen · running on your laptop · saved on this device</Muted>{result.narrative.aspect_notes.map(note => <View key={note.aspect + note.polarity} style={styles.quote}><Text style={styles.findingTitle}>{result.quantitative.aspects.find(a => a.aspect === note.aspect)?.label ?? note.aspect} · {note.polarity}</Text><Body>{note.text}</Body>{note.review_ids.map(id => <Button key={id} secondary label="Read evidence" onPress={() => router.push(`/reviews/${id}`)} />)}</View>)}<Muted>{result.narrative.warnings.join(" ")}</Muted></View> : <Muted>{result.narrative?.warnings.join(" ") ?? "Local LLM summary is unavailable. Counted feedback is shown below."}</Muted>}
        <Muted>{result.meta.unread} reviews need human checking. Feedback counts come from the local aspect classifier.</Muted>{result.meta.note && <Muted>{result.meta.note}</Muted>}</> : !busy && <Body>{reviews.length ? "Your review summary will load automatically when the local service is available." : "Add reviews to your workspace to see an overview."}</Body>}
      {!!error && <Muted>{error}</Muted>}
      {Platform.OS !== "web" && !data.analysisEndpoint && <Button secondary label="Connect the review service" onPress={() => router.push("/offline")} />}
      {!!reviews.length && <Button secondary label={busy ? "Loading insights…" : result ? "Refresh insights" : "Try loading insights"} disabled={busy} onPress={() => { void refresh().catch(() => setError("Could not update saved insights. Please try again.")); }} />}
      {demo && <Muted>Analysis of synthetic demo reviews; not live customer feedback.</Muted>}
      <Muted>The average rating comes directly from review stars. AI summaries do not create a business score.</Muted>
    </Card>
    <View style={styles.stats}>{[{ label: "Reviews", value: String(reviews.length), bg: colors.sky }, { label: "Average rating", value: average === null ? "—" : `${average.toFixed(1)} / 5`, bg: colors.peach }, { label: "Analysed", value: result ? String(result.meta.analysed) : "—", bg: colors.mint }].map(stat => <View key={stat.label} style={[styles.stat, { backgroundColor: stat.bg }]}><Text style={styles.value}>{stat.value}</Text><Muted>{stat.label}</Muted></View>)}</View>
    {result && <>
      <Card><Heading>Positive feedback</Heading>{result.qualitative.strengths.length ? result.qualitative.strengths.slice(0, 3).map(renderFinding) : <Body>No clear strengths detected yet. This is not a negative rating.</Body>}</Card>
      <Card><Heading>Negative feedback</Heading>{result.qualitative.problems.length ? result.qualitative.problems.slice(0, 3).map(renderFinding) : <Body>No concerns detected among the analysed reviews. Check the original feedback too.</Body>}</Card>
      {!!result.attention.unread_review_ids.length && <Card><Heading>Needs a closer look</Heading><Body>{result.attention.note ?? "These reviews were uncertain or in an unsupported language and are excluded from findings."}</Body>{result.attention.unread_review_ids.slice(0, 3).map(id => <Button key={id} secondary label={`Read ${reviews.find(r => r.id === id)?.guest ?? "review"}`} onPress={() => router.push(`/reviews/${id}`)} />)}</Card>}
      <Muted>Saved {new Date(saved!.savedAt).toLocaleString()} · Model {result.meta.model_version}. Language support is provisional; verify the evidence before relying on a finding.</Muted>
    </>}
    <Button label="View all reviews" onPress={() => router.navigate("/reviews")} />
  </Page>;
}
const styles = StyleSheet.create({
  narrative: { backgroundColor: colors.lavender, padding: 18, borderRadius: 18, gap: 12 },
  heading: { flexDirection: "row", alignItems: "center", gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.lavender, alignItems: "center", justifyContent: "center" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flex: 1, minWidth: 90, padding: 16, borderRadius: 18, gap: 10 },
  value: { color: colors.ink, fontSize: 25, fontWeight: "700" },
  finding: { gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 16 },
  findingTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  quote: { padding: 14, borderRadius: 14, backgroundColor: colors.bg, gap: 10 },
});
