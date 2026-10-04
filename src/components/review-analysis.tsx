import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { router } from "expo-router";
import { Card, Heading, Muted, Body, Badge, Button, colors } from "./ui";
import { useStore } from "../state/store";
import { aspectLabels, fetchReviewAnalysis, fetchReviewExamples, reviewAnalysisKey, saveAnalysisCache, type DraftExample } from "../ai/review-api";
import type { Review } from "../data/types";
export function ReviewAnalysis({ review, onUse }: { review: Review; onUse: (draft: DraftExample) => void }) {
  const { data, update } = useStore(); const endpoint = data?.analysisEndpoint ?? "http://127.0.0.1:8080";
  const language = data?.profile?.language ?? "English", business = data?.profile?.name ?? "Your business";
  const key = reviewAnalysisKey(review, endpoint, language, business);
  const saved = data?.reviewAnalysisCache?.find(c => c.key === key); const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [examplesBusy, setExamplesBusy] = useState(false), [evidence, setEvidence] = useState(false);
  const updateRef = useRef(update); const keyRef = useRef(key); useEffect(() => { updateRef.current = update; keyRef.current = key; }, [update, key]);
  const cached = !!saved;
  useEffect(() => {
    if (cached || (Platform.OS !== "web" && !data?.analysisEndpoint)) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => { if (controller.signal.aborted) return; setBusy(true); return fetchReviewAnalysis(review, endpoint, controller.signal); }).then(async analysis => {
      if (analysis && !controller.signal.aborted && keyRef.current === key) await updateRef.current(d => ({ ...d, reviewAnalysisCache: saveAnalysisCache(d.reviewAnalysisCache, { key, savedAt: new Date().toISOString(), analysis, examples: d.reviewAnalysisCache?.find(c => c.key === key)?.examples }) }));
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Analysis unavailable."); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [key, cached, review, endpoint, data?.analysisEndpoint]);
  const loadExamples = async () => {
    setExamplesBusy(true); setError("");
    try { const examples = await fetchReviewExamples(review, endpoint, language, business); if (keyRef.current === key) await updateRef.current(d => ({ ...d, reviewAnalysisCache: saveAnalysisCache(d.reviewAnalysisCache, { key, savedAt: new Date().toISOString(), analysis: examples.analysis, examples }) })); }
    catch(e) { setError(e instanceof Error ? e.message : "Examples unavailable."); } finally { setExamplesBusy(false); }
  };
  const analysis = saved?.analysis; const hits = [...(analysis?.aspects ?? [])].sort((a,b) => b.score - a.score || a.aspect.localeCompare(b.aspect)).slice(0,3);
  return <>
    <Card><Heading>Review at a glance</Heading>{busy && <ActivityIndicator color={colors.accent} />}
      {analysis && <><View style={[styles.sentiment,{ backgroundColor: analysis.overall_sentiment === "positive" ? colors.mint : analysis.overall_sentiment === "negative" ? colors.peach : colors.lavender }]}><Ionicons name={analysis.overall_sentiment === "positive" ? "happy-outline" : analysis.overall_sentiment === "negative" ? "sad-outline" : "contrast-outline"} size={26} color={analysis.overall_sentiment === "negative" ? colors.coral : colors.teal} /><View style={{flex:1,gap:3}}><Text style={styles.sentimentTitle}>{analysis.overall_sentiment[0].toUpperCase()+analysis.overall_sentiment.slice(1)} feedback</Text><Text style={styles.small}>{analysis.sentiment_source === "aspect-model" ? "Overall sentiment · detected aspects" : analysis.sentiment_source === "star-rating" ? "Overall sentiment · review stars" : "Not enough evidence"}</Text></View></View>
        {analysis.translation?.status === "translated" && <Muted>Local NLLB English translation · original review retained.</Muted>}
        {analysis.translation?.status === "failed" && <Muted>{analysis.translation.error}</Muted>}
        {analysis.needs_review && <Muted>Needs human checking · no reliable aspects or translation unavailable. Excluded from dashboard findings.</Muted>}
        <View style={styles.gauges}>{hits.map(hit => <View key={hit.aspect + hit.sentiment} style={styles.gauge} accessible accessibilityLabel={`${aspectLabels[hit.aspect]}, ${hit.sentiment}, model score ${Math.round(hit.score * 100)} out of 100`}>
          <Svg width={100} height={64} viewBox="0 0 140 86"><Path d="M 14 72 A 56 56 0 0 1 126 72" stroke={colors.line} strokeWidth={10} fill="none" strokeLinecap="round" /><Path d="M 14 72 A 56 56 0 0 1 126 72" stroke={analysis.needs_review ? colors.muted : hit.sentiment === "positive" ? colors.teal : colors.coral} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${Math.PI * 56 * hit.score} ${Math.PI * 56}`} /></Svg>
          <Text style={styles.score}>{Math.round(hit.score * 100)}</Text><Text style={styles.label}>{aspectLabels[hit.aspect]}</Text><Text style={[styles.small,{color:hit.sentiment === "positive" ? colors.teal : colors.coral}]}>{hit.sentiment}</Text>
        </View>)}</View>
        {!hits.length && <Body>No clear aspect scores available.</Body>}
        {!!hits.length && <><Muted>Model scores reflect detected aspects, not business quality or measured accuracy.</Muted><Button secondary label={evidence ? "Hide evidence" : "Read supporting evidence"} onPress={() => setEvidence(!evidence)} />{evidence && hits.map(h => <View key={h.aspect+h.sentiment} style={styles.quote}><Muted>{aspectLabels[h.aspect]} · {h.sentiment}</Muted><Body>“{h.evidence}”</Body></View>)}</>}
        <Muted>Saved on this device · {analysis.model_version}</Muted>
      </>}
      {!!error && <Muted>{error}</Muted>}
      {!analysis && !busy && <Button secondary label="Connect review analysis" onPress={() => router.push("/offline")} />}
    </Card>
    <Card><View style={{flexDirection:"row",alignItems:"center",gap:10}}><Ionicons name="create-outline" size={19} color={colors.accent}/><Heading>Reply inspiration</Heading></View><Text style={styles.small}>Optional templates based on detected aspects. Make the words your own before approval.</Text>
      {!saved?.examples && <Button secondary label={examplesBusy ? "Loading examples…" : "Show example responses"} disabled={examplesBusy} onPress={() => void loadExamples()} />}
      {saved?.examples?.warnings.map((w,i) => <Muted key={i}>{w}</Muted>)}
      {saved?.examples?.drafts.map(d => <View key={d.id} style={styles.quote}><Badge label={`${d.label} · ${d.language}`} /><Body>{d.text}</Body><Button secondary label="Use as my draft" onPress={() => onUse(d)} /></View>)}
    </Card>
  </>;
}
const styles = StyleSheet.create({ sentiment:{ flexDirection:"row",alignItems:"center",gap:12,padding:16,borderRadius:16 },sentimentTitle:{fontSize:16,fontWeight:"600",color:colors.ink},small:{fontSize:11,lineHeight:18,color:colors.muted},gauges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginVertical: 8 }, gauge: { flex:1,minWidth: 90,maxWidth:150,alignItems: "center", gap: 5,backgroundColor:"#FAF9FD",borderRadius:16,paddingVertical:14,paddingHorizontal:5 }, score: { marginTop: -37, marginBottom: 6, fontSize: 23, fontWeight: "600", color: colors.ink }, label: { color: colors.ink, fontSize:12,lineHeight:17,fontWeight: "600", textAlign: "center" }, quote: { backgroundColor: colors.bg, padding: 16, borderRadius: 16, gap: 10 } });
