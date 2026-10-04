import type { Profile, Review } from "../data/types.ts";
export type AssistantRequest = {
 business: Pick<Profile,"name"|"experience"|"language"|"price"|"currency">;
 review: Pick<Review,"id"|"text"|"rating"|"language">;
 writingLanguage: string;
};
export type AssistantOutput = {
 text: string;
 evidenceIds: string[];
 source: "authored-example"|"on-device-model"|"local-laptop-model"|"cloud-model";
 modelVersion: string|null;
 latencyMs: number|null;
};
export interface BusinessAssistant {
 suggestReply(request: AssistantRequest):Promise<AssistantOutput>;
 recommend(request: {business:AssistantRequest["business"];reviews:AssistantRequest["review"][]}):Promise<{title:string;experiment:string;evidenceIds:string[]}[]>;
}
// Validate model output at the adapter boundary, before showing it to an operator.
export function validateAssistantOutput(output:AssistantOutput, allowedIds:readonly string[]):AssistantOutput {
 if(!output.text?.trim() || output.text.length>6000) throw new Error("The assistant returned an invalid draft.");
 if(!Array.isArray(output.evidenceIds) || output.evidenceIds.some(id=>!allowedIds.includes(id))) throw new Error("The assistant cited unavailable reviews.");
 if(!["authored-example","on-device-model","local-laptop-model","cloud-model"].includes(output.source)) throw new Error("Missing assistant provenance.");
 if(output.source!=="authored-example" && (!output.modelVersion || typeof output.latencyMs!=="number" || !Number.isFinite(output.latencyMs) || output.latencyMs<0)) throw new Error("Model results need measured provenance.");
 return output;
}
