import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Muted, Button, colors } from "../../components/ui";
import { useStore } from "../../state/store";
import { isDemoProfile } from "../../data/profile";
import { AspectChart, MonthlyRatings, RatingDistribution, RatingOrbit, SentimentBreakdown } from "../../components/feedback-graphics";
import { LanguagePicker } from "../../components/studio";
import { replyLanguages } from "../../ai/review-replies";
import type { Review } from "../../data/types";
import { fetchInsights, fetchSummary, insightsKey, languageCode, normalizeSummarySettings, type SummarySettings, type Finding } from "../../ai/insights-api";

export default function Insights() {
  const { data, update } = useStore();
  const demo = !!data?.profile && isDemoProfile(data.profile);
  const reviews = useMemo(() => (data?.reviews ?? []).filter(r => r.demo === demo), [data?.reviews, demo]);
  const language = data?.profile?.language ?? "English";
  const endpoint = data?.analysisEndpoint ?? "http://127.0.0.1:8080";
  const settings = normalizeSummarySettings(data?.summarySettings);
  const corpusKey = useMemo(() => insightsKey(reviews, language, endpoint), [reviews, language, endpoint]);
  const key = useMemo(() => insightsKey(reviews, language, endpoint, settings), [reviews, language, endpoint, settings]);
  const [customizing, setCustomizing] = useState(false);
  const [preferences, setPreferences] = useState<SummarySettings>(settings);
  const savedCorpus = data?.insightsCache?.corpusKey === corpusKey || data?.insightsCache?.key === key;
  const lastSaved = savedCorpus ? data?.insightsCache : undefined;
  const snapshot = lastSaved?.result.snapshot_id;
  const currentKey = useRef(key);
  const updateRef = useRef(update);
  useEffect(() => { currentKey.current = key; updateRef.current = update; }, [key, update]);
  const saved = data?.insightsCache?.key === key ? data.insightsCache : null;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [progress, setProgress] = useState({ processed: 0, total: reviews.length });
  const cached = !!saved;
  useEffect(() => {
    if (cached || !reviews.length || (Platform.OS !== "web" && !data?.analysisEndpoint)) { void Promise.resolve().then(() => setBusy(false)); return; }
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return null;
      setBusy(true); setError("");
      const progressUpdate = (value: { processed: number; total: number }) => { if (!controller.signal.aborted && currentKey.current === key) setProgress(value); };
      return snapshot ? fetchSummary(snapshot, reviews, settings, endpoint, controller.signal) : fetchInsights(reviews, language, endpoint, controller.signal, progressUpdate, settings);
    }).then(async result => {
      if (!result || controller.signal.aborted || currentKey.current !== key) return;
      if (result.narrative?.status !== "generated" && lastSaved?.result.narrative?.status === "generated") throw new Error(result.narrative?.warnings.join(" ") || "Summary unavailable. Your previous overview is kept.");
      await updateRef.current(d => currentKey.current === key ? { ...d, insightsCache: { key, corpusKey, settings, savedAt: new Date().toISOString(), result } } : d);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Insights are unavailable."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => { controller.abort(); };
  }, [key, cached, reviews, language, endpoint, data?.analysisEndpoint, settings, snapshot, corpusKey, lastSaved?.result.narrative?.status]);
  if (!data) return <Page title="Insights"><ActivityIndicator color={colors.accent} /><Muted>Loading your saved reviews…</Muted></Page>;
  const result = (saved ?? lastSaved)?.result;
  const refresh = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await fetchInsights(reviews, language, endpoint, undefined, setProgress, settings);
      if (result.narrative?.status !== "generated" && lastSaved?.result.narrative?.status === "generated") throw new Error(result.narrative?.warnings.join(" ") || "Summary unavailable. Your previous overview is kept.");
      if (currentKey.current === key) await update(d => currentKey.current === key ? { ...d, insightsCache: { key, corpusKey, settings, savedAt: new Date().toISOString(), result } } : d);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load insights."); }
    finally { setBusy(false); }
  };
  const average = result?.quantitative.average_rating ?? (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null);
  const distribution = result?.quantitative.rating_distribution ?? Object.fromEntries([1,2,3,4,5].map(n => [String(n), reviews.filter(r => r.rating === n).length]));
  const shownSettings = (saved ?? lastSaved)?.settings ?? settings;
  const narrative = result?.narrative?.status === "generated" ? result.narrative : null;
  const languageCount = new Set(reviews.map(r => r.language).filter(Boolean)).size;
  return <Page title="Insights" subtitle={data.profile?.name ?? "Your business"}>
    <View style={styles.brief}>
      <View style={styles.briefTop}><View style={styles.spark}><Ionicons name="sparkles" size={20} color="#C9F3E4" /></View><Text style={styles.eyebrow}>THE REVIEW BRIEF</Text><View style={styles.localPill}><View style={styles.localDot} /><Text style={styles.localText}>{narrative ? "Local AI" : "Overview"}</Text></View></View>
      <Text style={styles.briefTitle}>A little clarity.<Text style={{ color: "#BDF2DF" }}> A better next step.</Text></Text>
      {busy && !result ? <View style={{ gap: 12 }}><Text style={styles.briefText}>{progress.processed === progress.total ? "Your reviews are processed. Writing the local summary…" : `Bringing your reviews together · ${progress.processed} of ${progress.total}`}</Text><View style={styles.progressTrack}><View style={{ height: 4, width: `${progress.total ? progress.processed / progress.total * 100 : 0}%`, backgroundColor: "#BDF2DF" }} /></View><Text style={styles.briefMeta}>The first translation pass can take several minutes.</Text></View> : <Text style={styles.briefText}>{narrative?.summary ?? (result ? "Your counted feedback is ready below. The local AI overview is currently unavailable; your saved findings are still here." : reviews.length ? "Your review overview will appear here once the local service is connected." : "Import customer reviews to bring your business feedback into focus.")}</Text>}
      <View style={styles.briefFooter}><Text style={styles.briefMeta}>{narrative ? `Qwen · ${replyLanguages.find(l => languageCode(l) === shownSettings.language) ?? shownSettings.language} · saved locally` : "Private workspace · saved on this device"}</Text><Pressable accessibilityRole="button" accessibilityLabel="Refresh insights" accessibilityState={{ disabled: busy || !reviews.length }} disabled={busy || !reviews.length} onPress={() => void refresh()} style={styles.refresh}><Ionicons name={busy ? "hourglass-outline" : "refresh-outline"} size={18} color="white" /><Text style={styles.refreshText}>{busy ? "Updating" : "Refresh"}</Text></Pressable></View>
    </View>
    <Button secondary label={customizing ? "Close summary settings" : "Customize summary"} onPress={() => { setPreferences(settings); setCustomizing(!customizing); }} />
    {customizing && <Card><Heading>Your review brief</Heading><Muted>Change the wording and focus using the same saved analysis. Counts and charts stay grounded in your reviews.</Muted>
      <Preference label="Length" value={preferences.length} options={["brief", "standard"]} onChange={length => setPreferences({ ...preferences, length: length as SummarySettings["length"] })} />
      <Preference label="Tone" value={preferences.tone} options={["plain", "professional"]} onChange={tone => setPreferences({ ...preferences, tone: tone as SummarySettings["tone"] })} />
      <Preference label="Focus" value={preferences.focus} options={["balanced", "praise", "concerns"]} onChange={focus => setPreferences({ ...preferences, focus: focus as SummarySettings["focus"] })} />
      <LanguagePicker label="Summary language" languages={replyLanguages} value={replyLanguages.find(l => languageCode(l) === preferences.language) ?? "English"} onChange={l => setPreferences({ ...preferences, language: languageCode(l) })} />
      <Button label="Apply summary settings" disabled={busy} onPress={() => { void update(d => ({ ...d, summarySettings: preferences })).then(() => setCustomizing(false)).catch(() => setError("Could not save summary settings.")); }} />
    </Card>}
    {result && !saved && <Muted>Showing the saved overview while your selected summary is prepared.</Muted>}
    {!!error && <Card><Body>{error}</Body></Card>}
    {Platform.OS !== "web" && !data.analysisEndpoint && <Button secondary label="Connect local review AI" onPress={() => router.push("/offline")} />}
    <View style={styles.metrics}>{[{ value: String(reviews.length), label: "Reviews", icon: "chatbubbles-outline" as const },{ value: String(languageCount), label: "Languages", icon: "globe-outline" as const },{ value: result ? String(result.meta.analysed) : "—", label: "Included", icon: "checkmark-circle-outline" as const }].map(m => <View key={m.label} style={styles.metric}><Ionicons name={m.icon} size={17} color={colors.accent} /><Text style={styles.metricValue}>{m.value}</Text><Text style={styles.small}>{m.label}</Text></View>)}</View>
    <View style={styles.coverage}><View style={styles.coverageDot} /><Text style={styles.coverageText}>{result ? `${result.meta.total} processed · ${result.meta.translated ?? 0} translated · ${result.meta.unread} need checking` : "Ratings come from the original review stars."}</Text></View>
    <View style={styles.columns}>
      <View style={styles.column}><Card><SectionTitle title="How visitors rate you" icon="star-outline" /><View style={styles.ratings}><RatingOrbit value={average} size={84} /><RatingDistribution distribution={distribution} /></View><Text style={styles.small}>Average from review stars, not an AI business score.</Text></Card></View>
      {result && <View style={styles.column}><Card><SectionTitle title="The feedback mix" icon="pie-chart-outline" /><SentimentBreakdown counts={result.quantitative.sentiment} /><Text style={styles.small}>Detected sentiment, with review stars used when aspects are unclear.</Text></Card></View>}
    </View>
    {result && <>
      <Card><SectionTitle title="What gets mentioned" icon="stats-chart-outline" /><View style={styles.chartLegend}><Legend color={colors.teal} label="Positive" /><Legend color={colors.coral} label="Negative" /></View>{result.quantitative.aspects.length ? <AspectChart aspects={result.quantitative.aspects} total={result.meta.analysed} /> : <Body>No clear aspect findings yet.</Body>}<Text style={styles.small}>Mentions across {result.meta.analysed} included reviews. One review can mention several aspects.</Text></Card>
      <View style={styles.columns}>
        <View style={styles.column}><Card><SectionTitle title="Positive feedback" icon="sunny-outline" tone={colors.teal} /><Text style={styles.small}>The strengths visitors return to.</Text>{result.qualitative.strengths.length ? result.qualitative.strengths.map(f => <FindingCard key={f.aspect} finding={f} reviews={reviews} positive />) : <Body>No clear strengths detected.</Body>}</Card></View>
        <View style={styles.column}><Card><SectionTitle title="Negative feedback" icon="flag-outline" tone={colors.coral} /><Text style={styles.small}>Concerns worth a closer look.</Text>{result.qualitative.problems.length ? result.qualitative.problems.slice(0,3).map(f => <FindingCard key={f.aspect} finding={f} reviews={reviews} />) : <Body>No clear concerns detected.</Body>}</Card></View>
      </View>
      {result.quantitative.trend.filter(t => t.average_rating !== null).length > 1 && <Card><SectionTitle title="Ratings over time" icon="trending-up-outline" /><MonthlyRatings trend={result.quantitative.trend} /><Text style={styles.small}>Monthly average from the original ratings.</Text></Card>}
      {!!result.attention.unread_review_ids.length && <Card><SectionTitle title="A closer look" icon="scan-outline" /><Body>{result.meta.unread} reviews need human checking.</Body><Text style={styles.small}>They are processed, but excluded from aspect findings until the model can identify reliable themes.</Text>{result.attention.unread_review_ids.slice(0,3).map(id => <Pressable key={id} accessibilityRole="button" onPress={() => router.push(`/reviews/${id}`)} style={styles.reviewLink}><Text style={styles.reviewLinkText}>{reviews.find(r => r.id === id)?.guest ?? "Read review"}</Text><Ionicons name="arrow-forward" size={17} color={colors.accent} /></Pressable>)}</Card>}
      {!!result.meta.translation_failed && <Muted>{result.meta.translation_failed} translations failed. Start the local NLLB service and refresh.</Muted>}
      {!narrative && <Muted>{result.narrative?.warnings.join(" ")}</Muted>}
      <Text style={styles.small}>Updated {new Date((saved ?? lastSaved)!.savedAt).toLocaleString()} · {narrative ? "Local Qwen overview. " : ""}Verify model findings against original reviews.</Text>
    </>}
    {demo && <Text style={styles.small}>Synthetic demo reviews · 15 scenarios across ten languages. Not live customer feedback or independent customer observations.</Text>}
    <Button secondary label="Explore all reviews" onPress={() => router.navigate("/reviews")} />
  </Page>;
}
function Preference({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <View style={{ gap: 8 }}><Muted>{label}</Muted><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: value === option }} accessibilityLabel={`${label}: ${option}`} onPress={() => onChange(option)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14, borderRadius: 12, backgroundColor: value === option ? colors.accent : colors.lavender }}><Text style={{ color: value === option ? "white" : colors.accent, fontSize: 13, fontWeight: "600" }}>{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>)}</View></View>;
}
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legend}><View style={[styles.coverageDot,{ backgroundColor: color }]} /><Text style={styles.small}>{label}</Text></View>; }
function SectionTitle({ title, icon, tone = colors.accent }: { title: string; icon: React.ComponentProps<typeof Ionicons>["name"]; tone?: string }) { return <View style={styles.sectionTitle}><Ionicons name={icon} size={18} color={tone} /><Heading>{title}</Heading></View>; }
function FindingCard({ finding, reviews, positive = false }: { finding: Finding; reviews: Review[]; positive?: boolean }) {
  const [expanded,setExpanded] = useState(false), [original,setOriginal] = useState(false);
  const tone = positive ? colors.teal : colors.coral;
  return <View style={styles.finding}><Pressable accessibilityRole="button" accessibilityLabel={`${finding.label}, ${finding.count} of ${finding.total} reviews. ${expanded ? "Hide" : "Show"} evidence`} accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ gap: 10 }}><View style={styles.findingTop}><View style={[styles.findingMarker,{ backgroundColor: positive ? colors.mint : colors.peach }]}><Ionicons name={positive ? "add" : "remove"} size={17} color={tone} /></View><Text style={styles.findingTitle}>{finding.label}</Text><Text style={[styles.findingNumber,{ color: tone }]}>{finding.count}</Text><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} /></View><View style={styles.findingTrack}><View style={{ height: 4, borderRadius: 4, backgroundColor: tone, width: `${finding.share*100}%` }} /></View><Text style={styles.small}>{Math.round(finding.share*100)}% of included reviews · Tap for evidence</Text></Pressable>
    {expanded && finding.quotes.slice(0,2).map(q => <View key={q.review_id} style={styles.quote}><Text style={styles.quoteText}>“{original && q.original_text ? q.original_text : q.text}”</Text><View style={styles.quoteFooter}><Text style={styles.small}>{reviews.find(r => r.id === q.review_id)?.guest ?? "Visitor"}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Read review by ${reviews.find(r => r.id === q.review_id)?.guest ?? "visitor"}`} onPress={() => router.push(`/reviews/${q.review_id}`)} style={styles.smallLink}><Text style={styles.linkText}>Read review</Text><Ionicons name="arrow-forward" size={14} color={colors.accent} /></Pressable></View>{q.translation_model && <><Text style={styles.small}>{original ? "Original review" : "English evidence · local NLLB translation"}</Text><Pressable accessibilityRole="button" onPress={() => setOriginal(!original)} style={styles.smallLink}><Text style={styles.linkText}>{original ? "Show English" : "Show original"}</Text></Pressable></>}</View>)}
  </View>;
}
const styles = StyleSheet.create({
  brief: { padding: 24, gap: 18, borderRadius: 24, backgroundColor: "#302251" }, briefTop: { flexDirection: "row", gap: 9, alignItems: "center" }, spark: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#473463", alignItems: "center", justifyContent: "center" }, eyebrow: { flex: 1, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, color: "#C7BADD" }, localPill: { flexDirection: "row", alignItems: "center", gap: 6 }, localDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#BDF2DF" }, localText: { fontSize: 11, color: "#D9D2EB" }, briefTitle: { fontSize: 26, lineHeight: 33, fontWeight: "600", letterSpacing: -.6, color: "white", maxWidth: 520 }, briefText: { color: "#E9E1F5", fontSize: 15, lineHeight: 25 }, briefFooter: { borderTopWidth: 1, borderTopColor: "#53436F", paddingTop: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, justifyContent: "space-between" }, briefMeta: { color: "#C6BBD8", fontSize: 11, lineHeight: 18 }, refresh: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10 }, refreshText: { color: "white", fontSize: 12, fontWeight: "600" }, progressTrack: { height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "#564577" }, metrics: { flexDirection: "row", gap: 10 }, metric: { flex: 1, padding: 16, gap: 6, backgroundColor: "white", borderRadius: 18, borderWidth: 1, borderColor: colors.line }, metricValue: { fontSize: 28, fontWeight: "600", color: colors.ink, letterSpacing: -.8 }, small: { color: colors.muted, fontSize: 12, lineHeight: 19 }, coverage: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 3 }, coverageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent }, coverageText: { flex: 1, fontSize: 12, lineHeight: 19, color: colors.muted }, columns: { flexDirection: "row", flexWrap: "wrap", gap: 16 }, column: { flex: 1, minWidth: 250 }, sectionTitle: { flexDirection: "row", gap: 9, alignItems: "center", marginBottom: 8 }, ratings: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 8 }, chartLegend: { flexDirection: "row", gap: 18, marginBottom: 10 }, legend: { flexDirection: "row", gap: 6, alignItems: "center" }, finding: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 16, gap: 12, marginTop: 5 }, findingTop: { flexDirection: "row", alignItems: "center", gap: 9 }, findingMarker: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, findingTitle: { flex: 1, color: colors.ink, fontWeight: "600", fontSize: 14, lineHeight: 21 }, findingNumber: { fontWeight: "600", fontSize: 20 }, findingTrack: { height: 4, borderRadius: 4, backgroundColor: "#F0F2F6", overflow: "hidden" }, quote: { borderRadius: 14, backgroundColor: colors.bg, padding: 14, gap: 9 }, quoteText: { fontSize: 14, lineHeight: 23, color: colors.ink }, quoteFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }, smallLink: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 }, linkText: { fontSize: 12, color: colors.accent, fontWeight: "600" }, reviewLink: { minHeight: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.line }, reviewLinkText: { fontSize: 14, color: colors.accent, fontWeight: "600" },
});
