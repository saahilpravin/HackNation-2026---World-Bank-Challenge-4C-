import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View, Text } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../state/store";
import { filterReviews, reviewState } from "../../data/review-tools";
import { isDemoProfile } from "../../data/profile";
import { Avatar, Stars, LanguagePicker } from "../../components/studio";
import { QueueGraphic, RatingOrbit } from "../../components/feedback-graphics";
import { Page, Card, Heading, Body, Muted, Button, colors } from "../../components/ui";
export default function Reviews() {
 const { data }=useStore();
 const [filters,setFilters]=useState(false);
 const [status,setStatus]=useState("new"), [language,setLanguage]=useState("all"), [query,setQuery]=useState(""), [limit,setLimit]=useState(15);
 if(!data) return null;
 const demo=!!data.profile && isDemoProfile(data.profile), reviews=data.reviews.filter(r=>r.demo===demo);
 const languages=[...new Set(reviews.map(r=>r.language ?? "Unknown"))];
 const counts={new:0,answered:0,approved:0}; reviews.forEach(r=>counts[reviewState(r,data.reviewReplies)]++);
 const rows=filterReviews(reviews,data.reviewReplies,query,status,language);
 const average=reviews.length ? reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length : null;
 return <Page title="Reviews" subtitle="Listen closely. Reply thoughtfully.">
  <View style={s.desk}><View style={s.deskTop}><View style={{flex:1,gap:9}}><Text style={s.eyebrow}>YOUR REVIEW DESK</Text><Text style={s.deskTitle}>{counts.new ? `${counts.new} reviews\nwaiting for a reply.` : "A little attention.\nA lasting impression."}</Text><Text style={s.deskMeta}>{reviews.length} reviews · {languages.length} languages</Text></View><RatingOrbit value={average} size={88} dark /></View></View>
  <View style={s.queue}><QueueGraphic remaining={counts.new} handled={counts.answered+counts.approved}/></View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7}}>{[{label:`Needs reply ${counts.new}`,value:"new"},{label:`Answered ${counts.answered}`,value:"answered"},{label:`Approved ${counts.approved}`,value:"approved"},{label:"All",value:"all"}].map(option=><Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{selected:status===option.value}} onPress={()=>{setStatus(option.value);setLimit(15);}} style={[s.filterChip,status===option.value && {backgroundColor:colors.accent,borderColor:colors.accent}]}><Text style={[s.filterText,status===option.value && {color:"white"}]}>{option.label}</Text></Pressable>)}</ScrollView>
  <View style={s.search}><Ionicons name="search-outline" size={19} color={colors.muted}/><TextInput accessibilityLabel="Find a review" placeholder="Search visitors or topics" placeholderTextColor={colors.muted} value={query} onChangeText={v=>{setQuery(v);setLimit(15);}} style={s.searchInput}/><Pressable accessibilityRole="button" accessibilityLabel="Filter reviews by language" accessibilityState={{expanded:filters}} onPress={()=>setFilters(!filters)} style={[s.filterButton,(filters || language!=="all") && {backgroundColor:colors.lavender}]}><Ionicons name="options-outline" color={colors.accent} size={19}/></Pressable></View>
  {filters && languages.length>0 && <LanguagePicker label="Language" languages={["All languages",...languages]} value={language === "all" ? "All languages" : language} onChange={v=>{setLanguage(v === "All languages" ? "all" : v);setLimit(15);}} />}
  <View style={s.listHeading}><Text style={s.listCount}>{rows.length} reviews</Text><Text style={s.small}>{language!=="all" ? language : demo ? "Demo workspace" : "Imported feedback"}</Text></View>
  {rows.slice(0,limit).map((r,i)=>{ const state=reviewState(r,data.reviewReplies); const draft=data.reviewDrafts?.some(d=>d.reviewId===r.id); return <Pressable key={r.id} accessibilityRole="button" accessibilityLabel={`Read ${r.guest}'s review, ${r.rating} stars, ${state === "new" ? "needs reply" : state}`} onPress={()=>router.push(`/reviews/${r.id}`)} style={({pressed})=>[s.review,pressed && {opacity:.75}]}>
   <View style={s.reviewTop}><Avatar name={r.guest} index={i}/><View style={{flex:1,gap:4}}><Text style={s.guest}>{r.guest}</Text><Text style={s.small}>{r.date ?? "Imported review"}</Text></View><View style={{gap:6,alignItems:"flex-end"}}><Stars rating={r.rating}/><Text style={s.rating}>{r.rating}.0 / 5</Text></View></View>
   <Text numberOfLines={3} style={s.reviewText}>{r.text}</Text>
   <View style={s.reviewFooter}><View style={s.language}><Ionicons name="globe-outline" color={colors.muted} size={13}/><Text style={s.small}>{r.language ?? "Unknown"}</Text></View><View style={s.status}><View style={[s.dot,{backgroundColor:state==="new"?colors.accent:colors.teal}]}/><Text style={[s.statusText,{color:state==="new"?colors.accent:colors.teal}]}>{state==="new"?(draft?"Draft saved":"Needs reply"):state==="approved"?"Approved locally":"Answered example"}</Text></View><Ionicons name="arrow-up-right-box-outline" color={colors.muted} size={17}/></View>
  </Pressable>;})}
  {rows.length>limit && <Button secondary label={`Show 15 more · ${rows.length-limit} remaining`} onPress={()=>setLimit(limit+15)}/>}
  {!rows.length && <Card><Heading>{reviews.length ? "You're all clear here" : "Your review desk is ready"}</Heading><Body>{reviews.length ? "Try another filter or search to find a review." : "Import reviews from a platform export to get started."}</Body></Card>}
  {demo && <Muted>Synthetic demo reviews · 15 scenarios in ten languages. No review platform is connected.</Muted>}
 </Page>;
}
const s=StyleSheet.create({filterChip:{borderRadius:22,borderWidth:1,borderColor:colors.line,paddingHorizontal:13,minHeight:44,alignItems:"center",justifyContent:"center",backgroundColor:"white"},filterText:{fontSize:12,fontWeight:"600",color:colors.muted},search:{flexDirection:"row",alignItems:"center",gap:10,borderWidth:1,borderColor:colors.line,borderRadius:16,paddingLeft:14,paddingRight:5,backgroundColor:"white"},searchInput:{flex:1,minWidth:0,color:colors.ink,fontSize:14,paddingVertical:16},filterButton:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:12},desk:{padding:22,borderRadius:24,backgroundColor:"#302251",gap:18},deskTop:{flexDirection:"row",alignItems:"center",gap:12},eyebrow:{fontSize:10,letterSpacing:1.4,fontWeight:"700",color:"#C4B6DB"},deskTitle:{fontSize:24,lineHeight:31,fontWeight:"600",letterSpacing:-.6,color:"white"},deskMeta:{fontSize:12,color:"#C6BBDD",lineHeight:20},queue:{paddingHorizontal:4,paddingVertical:3},listHeading:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},listCount:{fontSize:14,fontWeight:"600",color:colors.ink},small:{fontSize:12,color:colors.muted,lineHeight:18},review:{padding:18,borderRadius:20,backgroundColor:"white",borderWidth:1,borderColor:colors.line,gap:15},reviewTop:{flexDirection:"row",gap:11,alignItems:"center"},guest:{fontSize:16,lineHeight:23,fontWeight:"600",color:colors.ink},rating:{fontSize:10,color:colors.muted},reviewText:{fontSize:15,lineHeight:24,color:"#394455"},reviewFooter:{borderTopWidth:1,borderTopColor:"#F0EDF5",paddingTop:13,flexDirection:"row",flexWrap:"wrap",gap:9,alignItems:"center"},language:{flexDirection:"row",gap:5,alignItems:"center",flex:1},status:{flexDirection:"row",gap:5,alignItems:"center"},dot:{height:5,width:5,borderRadius:3},statusText:{fontSize:11,fontWeight:"600"}});
