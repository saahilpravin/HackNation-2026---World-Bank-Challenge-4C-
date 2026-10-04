import { useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Badge, Button, Muted, colors } from "../../components/ui";
import { Avatar, Chips, Hero } from "../../components/studio";
import { useStore } from "../../state/store";
export default function Bookings() {
 const {data}=useStore(); const [status,setStatus]=useState("upcoming");
 const rows=data?.bookings.filter(b=>status==="upcoming"?b.status!=="cancelled":b.status===status).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))??[];
 const confirmed=data?.bookings.filter(b=>b.status==="confirmed").length??0;
 return <Page title="Bookings" subtitle="Make room for a great next visit."><Hero eyebrow="YOUR LOCAL PLANNER" title={"A calmer calendar.\nA warmer welcome."}><Text style={{color:"#E8DFF9",fontSize:15}}>{confirmed} confirmed bookings · saved on this device</Text></Hero>
 <Button label="＋ Record a booking" onPress={()=>router.push("/bookings/new")}/>
 <Chips value={status} onChange={setStatus} options={[{label:"Active",value:"upcoming"},{label:"Pending",value:"pending"},{label:"Confirmed",value:"confirmed"},{label:"Cancelled",value:"cancelled"}]}/>
 {rows.map((b,i)=><Card key={b.id} onPress={()=>router.push(`/bookings/${b.id}`)}><View style={{flexDirection:"row",gap:12,alignItems:"center"}}><Avatar name={b.guest} index={i}/><View style={{flex:1}}><Heading>{b.guest}</Heading><Muted>{b.guests} participants</Muted></View><Badge label={b.status} warn={b.status==="pending"}/></View><View style={{backgroundColor:colors.lavender,borderRadius:14,padding:14,flexDirection:"row",justifyContent:"space-between"}}><Text style={{color:colors.ink,fontWeight:"600"}}>{b.date}</Text><Text style={{color:colors.accent,fontWeight:"700"}}>{b.time}</Text></View><Muted>{b.demo?"Sample booking":"Recorded by the operator"} · View details →</Muted></Card>)}
 {!rows.length&&<Card><Heading>A little breathing room</Heading><Body>No bookings in this view. Record a booking received by phone or another platform.</Body></Card>}
 <Muted>Lauda is your planning record. No booking platform is connected and no guest notifications are sent.</Muted></Page>;
}
