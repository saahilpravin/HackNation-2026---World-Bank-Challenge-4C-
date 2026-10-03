import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Badge, Muted, Button, Field, PreviewText, colors } from "../../components/ui";
import { Avatar, Chips, Hero, Stars } from "../../components/studio";
import { useStore } from "../../state/store";
import { analyzeFeedback } from "../../ai/feedback";
import { ideasFor } from "../../ai/ideas";
import { filterReviews, reviewState } from "../../data/review-tools";
import { isDemoProfile } from "../../data/profile";
export default function Insights() {
  const { data } = useStore();
  if (!data) return null;
  return <FeedbackStudio key={data.profile?.name} />;
}
function FeedbackStudio() {
  const { data } = useStore();
  const [demo, setDemo] = useState(!!data?.profile && isDemoProfile(data.profile));
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("new");
  const [language, setLanguage] = useState("all");
  const [limit, setLimit] = useState(15);
  const reviews = useMemo(() => (data?.reviews ?? []).filter(r => r.demo === demo), [data?.reviews,demo]);
  const report = useMemo(() => analyzeFeedback({ reviews, messages: data?.messages ?? [] },demo), [reviews,data?.messages,demo]);
  const ideas = useMemo(() => ideasFor(reviews), [reviews]);
  const rows = filterReviews(reviews,data?.reviewReplies,query,status,language);
  const unanswered = reviews.filter(r => reviewState(r,data?.reviewReplies) === "new").length;
  const answered = reviews.filter(r => reviewState(r,data?.reviewReplies) === "answered").length;
  const approved = reviews.length - unanswered - answered;
  const average = reviews.length ? (reviews.reduce((n,r) => n+r.rating,0)/reviews.length).toFixed(1) : "—";
  const languages = [...new Set(reviews.map(r => r.language ?? "Unknown"))];
  const change = (setter: (v: string) => void, value: string) => { setter(value); setLimit(15); };
  return <Page title="Feedback studio" subtitle="Listen closely. Build what comes next.">
    <Hero eyebrow="YOUR VISITORS, IN FOCUS" title="Good feedback deserves a great next chapter.">
      <Text style={{ color: "#E6E0F6", fontSize: 15, lineHeight: 23 }}>{unanswered} reviews to answer · {languages.length} languages · one place to listen.</Text>
      <View style={{ flexDirection: "row", gap: 24, marginTop: 8 }}>
        {[{ value: average, label: "avg. rating" },{ value: reviews.length, label: "reviews" },{ value: ideas.length, label: "ideas to test" }].map(stat => <View key={stat.label}><Text style={{ color: "white", fontSize: 26, fontWeight: "700" }}>{stat.value}</Text><Text style={{ color: "#C3B9DC", fontSize: 12 }}>{stat.label}</Text></View>)}
      </View>
    </Hero>
    <Chips value={view} onChange={setView} options={[{label:"Overview",value:"overview"},{label:`Reviews · ${reviews.length}`,value:"reviews"},{label:"Ideas lab",value:"ideas"}]} />
    {demo && <Muted>Demo workspace · 150 synthetic reviews based on 15 scenarios. Sample translations are cached NLLB outputs, not human-reviewed. No live review platform is connected.</Muted>}
    {(data?.reviews.some(r => r.demo)) && <Button label={demo ? "Switch to business feedback" : "Explore the sample workspace"} secondary onPress={() => { setDemo(!demo); setLimit(15); }} />}
    {view === "overview" && <>
      <Card><Badge label="FEEDBACK INTELLIGENCE · EXPLAINABLE BASELINE" /><Heading>The signals behind the stars</Heading><Body>Look beyond the rating: protect the moments visitors love and remove the friction they keep mentioning.</Body><Muted>Local rules scan authored English versions of demo scenarios. Findings are evidence-based examples, not an SLM analysis or measured demand.</Muted></Card>
      <View style={{ flexDirection:"row",gap:12 }}><View style={{flex:1}}><Card><Ionicons name="chatbubble-outline" size={24} color={colors.coral} /><Heading>{unanswered} need a reply</Heading><Button label="Open queue" onPress={() => { setView("reviews"); setStatus("new"); }} secondary /></Card></View><View style={{flex:1}}><Card><Ionicons name="checkmark-circle-outline" size={24} color={colors.teal} /><Heading>{answered + approved} handled</Heading><Muted>{answered} sample replies · {approved} approved locally</Muted></Card></View></View>
      {[{ key:"love",title:"Keep the magic",caption:"What visitors value" },{ key:"improve",title:"Smooth the rough edges",caption:"Requests worth investigating" }].map(section => <Card key={section.key}>
        <Badge label={section.caption} /><Heading>{section.title}</Heading>
        {report.findings.filter(f => f.category === section.key).sort((a,b) => b.evidence.length-a.evidence.length).slice(0,4).map(f => <Card key={f.id} onPress={() => router.push(`/insights/${f.id}?sample=${demo?"1":"0"}`)}>
          <View style={{flexDirection:"row",justifyContent:"space-between",gap:8}}><Heading>{f.title}</Heading><Text style={{color:colors.accent,fontWeight:"700"}}>{f.evidence.length}</Text></View>
          <View style={{height:6,backgroundColor:colors.lavender,borderRadius:3}}><View style={{height:6,width:`${Math.min(100,f.evidence.length / Math.max(1,reviews.length)*100)}%`,backgroundColor:section.key==="love"?colors.teal:colors.coral,borderRadius:3}} /></View>
          <Muted>Supporting records · read the evidence →</Muted>
        </Card>)}
        {!report.findings.some(f => f.category === section.key) && <Muted>No matching feedback yet.</Muted>}
      </Card>)}
      <Card><Badge label="NEXT SMALL EXPERIMENT" /><Heading>{ideas[0]?.title ?? "Start with listening"}</Heading><Body>{ideas[0]?.summary ?? "Imported reviews will help you identify your next experiment."}</Body><Button label="Explore the ideas lab" onPress={() => setView("ideas")} /></Card>
    </>}
    {view === "reviews" && <>
      <Field label="Search people, words or topics" value={query} onChange={v => change(setQuery,v)} />
      <Chips value={status} onChange={v => change(setStatus,v)} options={[{label:`Needs reply · ${unanswered}`,value:"new"},{label:`Answered · ${answered}`,value:"answered"},{label:`Approved · ${approved}`,value:"approved"},{label:"All",value:"all"}]} />
      <Chips value={language} onChange={v => change(setLanguage,v)} options={[{label:"All languages",value:"all"},...languages.map(l => ({label:l,value:l}))]} />
      <Muted>{rows.length} matching reviews · tap one to read it in your language.</Muted>
      {rows.slice(0,limit).map((r,index) => <Card key={r.id} onPress={() => router.push(`/reviews/${r.id}`)}>
        <View style={{flexDirection:"row",gap:12,alignItems:"center"}}><Avatar name={r.guest} index={index} /><View style={{flex:1,gap:4}}><Heading>{r.guest}</Heading><Muted>{r.language} · {r.date ?? "Date unavailable"}</Muted></View><Stars rating={r.rating} /></View>
        <PreviewText>{r.text}</PreviewText>
        <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8}}><Badge label={reviewState(r,data?.reviewReplies) === "new" ? "Needs a thoughtful reply" : reviewState(r,data?.reviewReplies) === "approved" ? "Approved locally" : "Sample reply sent"} /><Ionicons name="arrow-forward" size={20} color={colors.accent} /></View>
      </Card>)}
      {!rows.length && <Card><Heading>A clear queue</Heading><Body>No reviews match these filters. Try another language or show all reviews.</Body></Card>}
      {rows.length>limit && <Button secondary label={`Show 15 more · ${rows.length-limit} remaining`} onPress={() => setLimit(limit+15)} />}
    </>}
    {view === "ideas" && <>
      <Card><Badge label="SMALL BETS, GROUNDED IN FEEDBACK" /><Heading>Your next offering starts here</Heading><Body>These suggested experiments link to recurring themes. Test interest with visitors before spending money.</Body><Muted>Ideas are curated examples matched to review themes, not AI-generated business forecasts.</Muted></Card>
      {ideas.map(idea => <Card key={idea.id} onPress={() => router.push(`/ideas/${idea.id}?sample=${demo?"1":"0"}`)}>
        <View style={{flexDirection:"row",alignItems:"center",gap:12}}><View style={{backgroundColor:colors.lavender,padding:12,borderRadius:15}}><Ionicons name={idea.icon} color={colors.accent} size={25} /></View><View style={{flex:1}}><Badge label={idea.effort} /><Heading>{idea.title}</Heading></View></View>
        <Body>{idea.summary}</Body><Muted>{idea.evidence.length} supporting {demo ? "sample " : ""}records · explore the experiment →</Muted>
      </Card>)}
      {!ideas.length && <Muted>No supported ideas yet. Reviews are imported by the operator; visitors do not leave reviews in Lauda.</Muted>}
    </>}
  </Page>;
}
