import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, View, Pressable, StyleSheet, useWindowDimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Muted, Button, colors } from "../../components/ui";
import { categoryColors } from "../../components/theme";
import { Hero, Stars, Avatar } from "../../components/studio";
import { useStore } from "../../state/store";
import { ideasFor } from "../../ai/ideas";
import { categorizeReviews } from "../../ai/review-categories";
import { analyzeReviews, aspects, fingerprint } from "../../ai/review-analysis";
import { reviewState } from "../../data/review-tools";
import { isDemoProfile } from "../../data/profile";
export default function Insights() {
 const {data,update}=useStore();
 const [analyzing,setAnalyzing]=useState(false);
 const [analysisError,setAnalysisError]=useState("");
 const attempted=useRef("");
 const {width}=useWindowDimensions();
 const [view,setView]=useState("categories");
 const [selected,setSelected]=useState("guide");
 const demo=!!data?.profile&&isDemoProfile(data.profile);
 const reviews=useMemo(()=>(data?.reviews??[]).filter(r=>r.demo===demo),[data?.reviews,demo]);
 const inputKey=useMemo(()=>fingerprint(reviews),[reviews]);
 const measured=data?.reviewAnalysis?.fingerprint===inputKey?data.reviewAnalysis.result:null;
 const runAnalysis=useCallback(async()=>{
  if(!reviews.length||analyzing)return;
  setAnalyzing(true);setAnalysisError("");
  try{const result=await analyzeReviews(reviews);await update(d=>({...d,reviewAnalysis:{fingerprint:inputKey,savedAt:new Date().toISOString(),result}}));}
  catch(e){setAnalysisError(e instanceof Error?e.message:"Local analysis is unavailable.");}
  finally{setAnalyzing(false);}
 },[reviews,analyzing,inputKey,update]);
 useEffect(()=>{if(Platform.OS==="web"&&reviews.length&&!measured&&attempted.current!==inputKey){attempted.current=inputKey;void runAnalysis();}},[inputKey,measured,reviews.length,runAnalysis]); // One automatic attempt per corpus; failed connections require explicit retry.
 const categories=useMemo(()=>categorizeReviews(reviews).map(category=>measured?{...category,reviews:reviews.filter(r=>measured.reviews.find(result=>result.id===r.id)?.aspects.some(hit=>aspects[hit.aspect]===category.id))}:category),[reviews,measured]);
 const ideas=useMemo(()=>ideasFor(reviews),[reviews]);
 if(!data) return null;
 const category=categories.find(c=>c.id===selected)!;
 const unanswered=reviews.filter(r=>reviewState(r,data.reviewReplies)==="new").length;
 const average=reviews.length?(reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length).toFixed(1):"—";
 return <Page title="Visitor insights" subtitle={`${data.profile?.name ?? "Your business"} · Understand the experience behind every review.`}>
  <Hero eyebrow="REVIEW INTELLIGENCE" title={"Know what’s working.\nSee what to improve."}><Text style={s.heroBody}>A clear view of your visitors’ feedback, organised around the things that matter.</Text><View style={s.heroFooter}><View style={s.liveDot}/><Text style={s.heroCaption}>Local workspace · {reviews.length} reviews</Text></View></Hero>
  <Card><Heading>{measured?"Small AI analysis ready":"Connect your local review AI"}</Heading><Body>{measured?`MiniLM + trained classifier · ${measured.reviews.length} reviews · ${(measured.latencyMs/1000).toFixed(1)} seconds. Saved locally.`:"Start the local backend to analyze original review text. Until then, categories below are keyword examples."}</Body><Muted>{measured?`${measured.reviews.filter(r=>r.needsReview).length} reviews need human verification. The classifier has been evaluated for English and Kiswahili; other languages are unverified. Long text is limited to the first 128 tokens.`:"Laptop browser demo works without Wi-Fi after the model is downloaded. Phone preview retains cached findings; new analysis currently runs on the laptop."}</Muted><Button label={Platform.OS!=="web"?"New analysis runs on the laptop":analyzing?"Analyzing reviews…":"Analyze reviews"} onPress={()=>void runAnalysis()} disabled={Platform.OS!=="web"||analyzing||!reviews.length}/>{!!analysisError&&<Muted>{analysisError} Start the backend and press Analyze reviews to retry.</Muted>}</Card>
  {measured&&<Card><Heading>What visitors are telling you</Heading>{[...measured.praised,...measured.criticized].map(point=><View key={`${point.aspect}-${point.sentiment}`} style={{gap:8}}><Body>{point.sentiment==="positive"?"✓ ":"↗ "}{point.text}</Body><View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>{point.reviewIds.slice(0,3).map(id=><Pressable key={id} onPress={()=>router.push(`/reviews/${id}`)}><Text style={{color:colors.accent}}>Read {reviews.find(r=>r.id===id)?.guest??id} →</Text></Pressable>)}</View></View>)}</Card>}
  <View style={s.stats}>{[{label:"Average rating",value:average,icon:"star-outline"},{label:"Need a reply",value:unanswered,icon:"chatbubble-outline"},{label:"Review languages",value:new Set(reviews.map(r=>r.language)).size,icon:"language-outline"}].map(stat=><View key={stat.label} style={s.stat}><Ionicons name={stat.icon as "star-outline"} size={19} color={colors.accent}/><Text style={s.statNumber}>{stat.value}</Text><Text style={s.statLabel}>{stat.label}</Text></View>)}</View>
  <View style={s.segment}>{[{id:"categories",title:"Review categories"},{id:"ideas",title:"Suggested improvements"}].map(tab=><Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{selected:view===tab.id}} aria-selected={view===tab.id} onPress={()=>setView(tab.id)} style={[s.segmentItem,view===tab.id&&s.segmentActive]}><Text style={[s.segmentText,view===tab.id&&{color:colors.ink}]}>{tab.title}</Text></Pressable>)}</View>
  {view==="categories"?<>
   <View style={s.sectionHead}><View style={{flex:1}}><Heading>Explore by category</Heading><Muted>Select a category to see the actual feedback.</Muted></View><Text style={s.smallLabel}>{categories.length} CATEGORIES</Text></View>
   <View style={s.grid}>{categories.map((item,index)=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title}: ${item.reviews.length} reviews`} accessibilityState={{selected:selected===item.id}} onPress={()=>setSelected(item.id)} style={[s.category, {flexBasis:width>=800?"30%":"45%"},selected===item.id&&s.selectedCategory,{backgroundColor:categoryColors[index%categoryColors.length].bg,borderColor:selected===item.id?categoryColors[index%categoryColors.length].ink:colors.line}]}><View style={s.categoryTop}><View style={[s.icon,{backgroundColor:"white"},selected===item.id&&{backgroundColor:categoryColors[index%categoryColors.length].ink}]}><Ionicons name={item.icon} size={21} color={selected===item.id?"white":categoryColors[index%categoryColors.length].ink}/></View><Text style={s.categoryCount}>{item.reviews.length}</Text></View><Text style={s.categoryTitle}>{item.title}</Text><Text style={s.categoryCaption}>{item.reviews.length?"View feedback →":"No feedback yet"}</Text></Pressable>)}</View>
   <Card><View style={s.sectionHead}><View style={{flex:1}}><Text style={s.smallLabel}>SELECTED CATEGORY</Text><Heading>{category.title}</Heading></View><Ionicons name={category.icon} size={30} color={colors.accent}/></View><Body>{category.description}</Body><Muted>{category.reviews.length} matching reviews. A review can appear in more than one category. Counts reflect mentions, not quality scores.</Muted></Card>
   {category.reviews.slice(0,5).map(review=><Card key={review.id} onPress={()=>router.push(`/reviews/${review.id}`)}><View style={s.sectionHead}><Avatar name={review.guest}/><View style={{flex:1}}><Heading>{review.guest}</Heading><Muted>{review.language} · {review.date}</Muted></View><Stars rating={review.rating}/></View><Body>{review.canonicalEnglish??review.text}</Body><View style={s.sectionHead}><Text style={s.categoryCaption}>{reviewState(review,data.reviewReplies)==="new"?"Awaiting your response":"Response recorded"}</Text><Ionicons name="arrow-forward" size={20} color={colors.accent}/></View></Card>)}
   {!category.reviews.length&&<Card><Heading>No matching feedback yet</Heading><Body>There are no comments about {category.title.toLowerCase()} in this workspace. This does not indicate a positive or negative result.</Body></Card>}
   {category.reviews.length>5&&<Button label="See all reviews" secondary onPress={()=>router.navigate("/reviews")}/>}
  </>:<>
   <View><Heading>Practical improvements</Heading><Muted>Small changes to test, each linked to supporting reviews.</Muted></View>
   {measured?.llm?.advice.map(idea=><Card key={`llm-${idea.aspect}`}><Text style={s.smallLabel}>LOCAL QWEN · IDEA TO TEST</Text><Heading>{idea.title}</Heading><Body>{idea.text}</Body><Muted>Generated locally by {measured.llm?.model}. Verify before acting; the linked reviews are the classifier’s evidence.</Muted>{idea.reviewIds.slice(0,3).map(id=><Button key={id} label={`Read ${reviews.find(r=>r.id===id)?.guest??id}`} secondary onPress={()=>router.push(`/reviews/${id}`)}/>)}</Card>)}
   {measured&&<Muted>{measured.llm?.status==="generated"?`Local language model generated ${measured.llm.advice.length} ideas in ${(measured.llm.latencyMs/1000).toFixed(1)} seconds.`:"Local language model is not ready. Start Ollama with qwen3:0.6b, then analyze again. Measured categories and curated recommendations still work."}</Muted>}
   {measured?.suggestions.map(suggestion=><Card key={suggestion.aspect}><Heading>{categories.find(c=>c.id===aspects[suggestion.aspect])?.title??suggestion.aspect}</Heading><Body>{suggestion.text}</Body><Muted>Curated recommendation selected from measured negative feedback.</Muted>{measured.criticized.find(p=>p.aspect===suggestion.aspect)?.reviewIds.slice(0,3).map(id=><Button key={id} label={`Read ${reviews.find(r=>r.id===id)?.guest??id}`} secondary onPress={()=>router.push(`/reviews/${id}`)}/>)}</Card>)}
   {!measured&&ideas.map((idea,index)=><Card key={idea.id} onPress={()=>router.push(`/ideas/${idea.id}?sample=${demo?"1":"0"}`)}><View style={s.sectionHead}><View style={s.icon}><Ionicons name={idea.icon} color={colors.accent} size={24}/></View><Text style={s.smallLabel}>RECOMMENDATION {String(index+1).padStart(2,"0")}</Text><View style={{flex:1}}/><Ionicons name="arrow-up-outline" size={18} color={colors.muted}/></View><Heading>{idea.title}</Heading><Body>{idea.summary}</Body><View style={s.ideaFooter}><Text style={s.effort}>{idea.effort}</Text><Muted>{idea.evidence.length} supporting reviews</Muted></View></Card>)}
   {!measured&&!ideas.length&&<Card><Heading>More feedback is needed</Heading><Body>Suggestions will appear when this workspace contains matching review themes.</Body></Card>}
  </>}
  <View style={s.source}><Ionicons name="information-circle-outline" size={18} color={colors.muted}/><View style={{flex:1}}><Muted>{demo?"Demo: 150 synthetic reviews from 15 scenarios. ":""}{measured?"Categories use measured local MiniLM classification; recommendations use fixed templates linked to model evidence. Optional Qwen ideas use a separate local language model. No live review platform is connected.":"Categories use keyword matching; improvements are curated examples. Start the local model for measured results."}</Muted></View></View>
 </Page>;
}
const s=StyleSheet.create({
 heroBody:{color:"#C9D8E9",fontSize:15,lineHeight:23,maxWidth:560},heroFooter:{flexDirection:"row",alignItems:"center",gap:8,marginTop:8},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:"#87DDC0"},heroCaption:{color:"#B6CADF",fontSize:12},
 stats:{flexDirection:"row",backgroundColor:"white",borderRadius:18,borderWidth:1,borderColor:colors.line,paddingVertical:18},stat:{flex:1,alignItems:"center",gap:8},statNumber:{fontSize:28,fontWeight:"700",letterSpacing:-1,color:colors.ink},statLabel:{fontSize:11,color:colors.muted,textAlign:"center"},
 segment:{flexDirection:"row",padding:4,borderRadius:13,backgroundColor:"#E6EBF1",gap:4},segmentItem:{flex:1,paddingVertical:12,paddingHorizontal:4,borderRadius:10,alignItems:"center",justifyContent:"center",minHeight:48},segmentActive:{backgroundColor:"white"},segmentText:{fontSize:12,fontWeight:"700",color:colors.muted,textAlign:"center"},
 sectionHead:{flexDirection:"row",alignItems:"center",gap:12,justifyContent:"space-between"},smallLabel:{fontSize:10,fontWeight:"700",letterSpacing:1,color:colors.muted},
 grid:{flexDirection:"row",flexWrap:"wrap",gap:12},category:{flexGrow:1,flexBasis:"45%",padding:16,borderRadius:16,borderWidth:1,borderColor:colors.line,backgroundColor:"white",gap:12,minHeight:145},selectedCategory:{borderColor:colors.accent,backgroundColor:"#F0F4FF"},categoryTop:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},icon:{width:40,height:40,borderRadius:12,backgroundColor:colors.lavender,alignItems:"center",justifyContent:"center"},categoryCount:{fontSize:23,fontWeight:"700",color:colors.ink},categoryTitle:{fontSize:15,fontWeight:"700",color:colors.ink},categoryCaption:{fontSize:12,color:colors.muted},ideaFooter:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:8,paddingTop:12,borderTopWidth:1,borderTopColor:colors.line},effort:{fontSize:12,fontWeight:"600",color:colors.accent},source:{flexDirection:"row",gap:10,paddingVertical:8,alignItems:"flex-start"},
});
