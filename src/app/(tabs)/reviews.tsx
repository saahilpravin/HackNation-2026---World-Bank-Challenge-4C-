import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../state/store";
import { filterReviews, reviewState } from "../../data/review-tools";
import { isDemoProfile } from "../../data/profile";
import { Avatar, Chips, Hero, Stars, LanguagePicker } from "../../components/studio";
import { Page, Card, Heading, Body, Muted, Badge, Field, PreviewText, Button, colors } from "../../components/ui";
export default function Reviews() {
 const { data }=useStore();
 const [status,setStatus]=useState("new"); const [language,setLanguage]=useState("all"); const [query,setQuery]=useState(""); const [limit,setLimit]=useState(15);
 if(!data) return null;
 const demo=!!data.profile && isDemoProfile(data.profile);
 const reviews=data.reviews.filter(r=>r.demo===demo);
 const languages=[...new Set(reviews.map(r=>r.language ?? "Unknown"))];
 const counts={new:0,answered:0,approved:0}; reviews.forEach(r=>counts[reviewState(r,data.reviewReplies)]++);
 const rows=filterReviews(reviews,data.reviewReplies,query,status,language);
 return <Page title="Reviews" subtitle="Every visitor has a story. Start here.">
  <Hero eyebrow="THE REVIEW DESK" title="A thoughtful reply goes a long way."><Text style={{color:"#E8DFF9",fontSize:15,lineHeight:23}}>{counts.new} to answer · {counts.answered+counts.approved} handled</Text></Hero>
  <Chips value={status} onChange={v=>{setStatus(v);setLimit(15);}} options={[{label:`Needs reply · ${counts.new}`,value:"new"},{label:`Answered · ${counts.answered}`,value:"answered"},{label:`Approved · ${counts.approved}`,value:"approved"},{label:"All reviews",value:"all"}]} />
  <Field label="Search visitors or review topics" value={query} onChange={v=>{setQuery(v);setLimit(15);}} />
  {languages.length>0 && <LanguagePicker label="Filter by language" languages={["All languages",...languages]} value={language === "all" ? "All languages" : language} onChange={v=>{setLanguage(v === "All languages" ? "all" : v);setLimit(15);}} />}
  <Muted>{rows.length} matching reviews{demo ? " · Synthetic demo data" : " · Imported feedback"}</Muted>
  {rows.slice(0,limit).map((r,i)=><Card key={r.id} onPress={()=>router.push(`/reviews/${r.id}`)}>
   <View style={{flexDirection:"row",gap:12,alignItems:"center"}}><Avatar name={r.guest} index={i}/><View style={{flex:1,gap:4}}><Heading>{r.guest}</Heading><Muted>{r.language} · {r.date ?? "Imported"}</Muted></View></View>
   <Stars rating={r.rating}/><PreviewText>{r.text}</PreviewText>
   <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8}}><Badge label={reviewState(r,data.reviewReplies)==="new"?(data.reviewDrafts?.some(d=>d.reviewId===r.id)?"Draft saved · Needs reply":"Needs reply"):reviewState(r,data.reviewReplies)==="approved"?"Approved on this device":"Example · already answered"}/><Ionicons name="arrow-forward" color={colors.accent} size={20}/></View>
  </Card>)}
  {rows.length>limit && <Button secondary label={`Show 15 more · ${rows.length-limit} remaining`} onPress={()=>setLimit(limit+15)}/>}
  {!rows.length && <Card><Heading>{reviews.length ? "A clear queue" : "Your review desk is ready"}</Heading><Body>{reviews.length ? "Try another filter or search to find a review." : "Reviews come from platform exports or operator imports. Visitors do not leave reviews inside Lauda."}</Body></Card>}
  {demo && <Muted>150 samples from 15 scenarios in ten languages. They are not independent customer observations. No review platform is connected.</Muted>}
 </Page>;
}
