import test from "node:test";
import assert from "node:assert/strict";
import { demoData, demoProfile } from "../src/data/demo.ts";
import { recordBooking } from "../src/data/booking-actions.ts";
import { validateAssistantOutput } from "../src/ai/assistant-contract.ts";
test("operator booking creation saves local data, rejects invalid names and slot overcapacity",()=>{
 const data={...demoData(),profile:demoProfile};
 const booking={id:"manual-test",messageId:"",guest:"Test group",date:"2026-10-05",time:"14:00",guests:2,status:"confirmed" as const,notes:"Recorded from a phone call",demo:false};
 const saved=recordBooking(data,booking);
 assert.equal(saved.bookings.at(-1)?.guest,"Test group");
 assert.equal(saved.messages,data.messages);
 assert.throws(()=>recordBooking(data,{...booking,guest:" "}),/guest/);
 assert.throws(()=>recordBooking(saved,{...booking,id:"other",guests:7}),/capacity/);
});
test("assistant adapter rejects invented evidence and fake measured provenance",()=>{
 const good={text:"Thank you for your feedback",source:"on-device-model" as const,evidenceIds:["r1"],modelVersion:"test-model@1",latencyMs:12};
 assert.equal(validateAssistantOutput(good,["r1"]),good);
 assert.throws(()=>validateAssistantOutput({...good,evidenceIds:["invented"]},["r1"]),/unavailable/);
 assert.throws(()=>validateAssistantOutput({...good,modelVersion:null},["r1"]),/provenance/);
});

test("default review assistant provides an offline authored example without network access",async()=>{
 const {suggestReviewResponse}=await import("../src/ai/review-assistant.ts");
 const original=globalThis.fetch; globalThis.fetch=async()=>{throw new Error("Network must not be used");};
 try {
  const output=await suggestReviewResponse(demoData().reviews[0],demoProfile,"English");
  assert.equal(output.source,"authored-example"); assert.equal(output.modelVersion,null); assert.ok(output.text.length>0);
 }finally{globalThis.fetch=original;}
});
