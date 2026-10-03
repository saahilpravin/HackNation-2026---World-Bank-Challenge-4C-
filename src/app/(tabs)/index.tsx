import { Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Hero, Avatar } from "../../components/studio";
import { Page, Card, Heading, Muted, Badge, Button, Body, colors } from "../../components/ui";
import { useStore } from "../../state/store";
import { reviewState } from "../../data/review-tools";
import { isDemoProfile } from "../../data/profile";
export default function Home() {
 const {data}=useStore(); if(!data?.profile) return null;
 const profile=data.profile; const demo=isDemoProfile(profile);
 const reviews=data.reviews.filter(r=>r.demo===demo);
 const unanswered=reviews.filter(r=>reviewState(r,data.reviewReplies)==="new");
 const pending=data.bookings.filter(b=>b.status==="pending").length;
 const now=new Date(); const today=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
 const bookings=data.bookings.filter(b=>b.date===today&&b.status!=="cancelled");
 return <Page title={profile.ownerName?`Hi, ${profile.ownerName}`:"Your workspace"} subtitle={profile.name}>
  <Hero eyebrow="YOUR BUSINESS WORKSPACE" title={"A better experience\nstarts with listening."}><Text style={{color:"#E8DFF9",fontSize:15,lineHeight:23}}>Your reviews and plans stay together, wherever the day takes you.</Text><Button label="Open your review desk →" onPress={()=>router.navigate("/reviews")}/></Hero>
  {demo && <Badge label="Noor’s Coffee Farm · Demo workspace"/>}
  <View style={{flexDirection:"row",gap:12}}>{[{label:"Reviews to reply to",value:unanswered.length,href:"/reviews",icon:"chatbox-ellipses-outline"},{label:"Pending bookings",value:pending,href:"/bookings",icon:"calendar-outline"}].map(item=><View key={item.label} style={{flex:1}}><Card onPress={()=>router.navigate(item.href as "/reviews"|"/bookings")}><Ionicons name={item.icon as "calendar-outline"} color={colors.accent} size={22}/><Text style={{fontSize:30,fontWeight:"700",color:colors.ink}}>{item.value}</Text><Muted>{item.label}</Muted></Card></View>)}</View>
  <Heading>Next review to answer</Heading>
  {unanswered[0]?<Card onPress={()=>router.push(`/reviews/${unanswered[0].id}`)}><View style={{flexDirection:"row",gap:12,alignItems:"center"}}><Avatar name={unanswered[0].guest}/><View style={{flex:1}}><Heading>{unanswered[0].guest}</Heading><Muted>{unanswered[0].language} · Waiting for a reply</Muted></View></View><Body>{unanswered[0].canonicalEnglish ?? unanswered[0].text}</Body><Muted>Read in your language and respond →</Muted></Card>:<Card><Heading>You’re caught up</Heading><Body>Review your saved responses or explore what visitors value.</Body></Card>}
  <Card onPress={()=>router.navigate("/insights")}><Badge label="FROM FEEDBACK TO OPPORTUNITY"/><Heading>Review your visitor insights</Heading><Body>See recurring praise, recurring friction, and small experiments worth testing.</Body><Muted>Explore Insights →</Muted></Card>
  <Heading>Today’s plan</Heading>
  {bookings.length?bookings.map(b=><Card key={b.id} onPress={()=>router.push(`/bookings/${b.id}`)}><Badge label={`${b.time} · ${b.status}`}/><Heading>{b.guest}</Heading><Muted>{b.guests} participants{b.demo?" · Sample booking":""}</Muted></Card>):<Card><Heading>No visits scheduled today</Heading><Body>No bookings recorded for today.</Body><Button secondary label="Record a booking" onPress={()=>router.push("/bookings/new")}/></Card>}
  <Muted>Saved on this device · {demo?"Sample workspace":"Your business workspace"}. Custom translation requires your connected laptop.</Muted>
 </Page>;
}
