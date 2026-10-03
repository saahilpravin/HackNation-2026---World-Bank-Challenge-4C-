import { useState } from "react";
import { router } from "expo-router";
import { Hero, Chips } from "../../components/studio";
import { Page, Card, Field, Button, Notice, Muted } from "../../components/ui";
import { useStore } from "../../state/store";
import { recordBooking } from "../../data/booking-actions";
export default function NewBooking() {
 const {data,update}=useStore(); const [guest,setGuest]=useState(""); const [date,setDate]=useState(""); const [time,setTime]=useState(""); const [guests,setGuests]=useState("2"); const [notes,setNotes]=useState(""); const [status,setStatus]=useState("pending"); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
 const save=async()=>{if(busy)return;setError("");setBusy(true);const id=`local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;try{await update(d=>recordBooking(d,{id,messageId:"",guest,date,time,guests:Number(guests),notes,status:status as "pending"|"confirmed",demo:false}));router.replace(`/bookings/${id}`);}catch(e){setError(e instanceof Error?e.message:"Could not save your booking.");}finally{setBusy(false);}};
 return <Page title="Record a booking" subtitle="A plan that stays with you." back><Hero eyebrow="YOUR LOCAL PLANNER" title="Put the next visit on the calendar."/><Card>
 <Muted>Record a booking you received elsewhere. Saving here does not contact a guest.</Muted>
 <Field label="Guest or group name" value={guest} onChange={setGuest}/><Field label="Date (YYYY-MM-DD)" value={date} onChange={setDate}/><Field label="Time (HH:mm)" value={time} onChange={setTime}/><Field label={`Participants · maximum ${data?.profile?.capacity ?? "—"}`} value={guests} onChange={setGuests} keyboardType="numeric"/><Field label="Notes (optional)" value={notes} onChange={setNotes} multiline/>
 <Chips value={status} onChange={setStatus} options={[{label:"Pending",value:"pending"},{label:"Confirmed",value:"confirmed"}]}/>
 {!!error&&<Notice text={error}/>}<Button label={busy?"Saving…":"Save booking on this device"} disabled={busy} onPress={()=>void save()}/></Card></Page>;
}
