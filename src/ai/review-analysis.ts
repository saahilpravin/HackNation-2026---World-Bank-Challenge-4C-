import type { Review } from "../data/types.ts";
export type Analysis = {
 model: string; version: string; source: "local-laptop-model"; latencyMs: number; testedLanguages: string[];
 reviews: {id:string;aspects:{aspect:string;sentiment:"positive"|"negative";score:number}[];sentiment:string;needsReview:boolean}[];
 praised: {aspect:string;sentiment:string;text:string;reviewIds:string[]}[];
 criticized: {aspect:string;sentiment:string;text:string;reviewIds:string[]}[];
 suggestions:{aspect:string;text:string}[];
 llm?:{model:string;status:string;latencyMs:number;advice:{aspect:string;title:string;text:string;reviewIds:string[]}[]};
};
export type AnalysisCache = { fingerprint:string; savedAt:string; result:Analysis };
const languages:Record<string,string>={English:"en",Kiswahili:"sw",Swahili:"sw",French:"fr",Spanish:"es",German:"de",Italian:"it",Portuguese:"pt",Arabic:"ar",Chinese:"zh",Japanese:"ja",Hindi:"hi"};
export const aspects:Record<string,string>={guide:"guide",price_value:"value",communication:"communication",facilities:"facilities",access_transport:"arrival",coffee_tasting:"activities",food:"activities",other:"other"};
export function fingerprint(reviews:Review[]) {return JSON.stringify(reviews.map(r=>[r.id,r.text,r.language,r.rating]));}
export function validateAnalysis(raw:unknown,reviews:Review[]):Analysis {
 const a=raw as Analysis;
 if(!a||a.source!=="local-laptop-model"||typeof a.model!=="string"||typeof a.version!=="string"||!Number.isFinite(a.latencyMs)||a.latencyMs<0||!Array.isArray(a.testedLanguages)||!a.testedLanguages.every(l=>typeof l==="string")||!Array.isArray(a.reviews)||a.reviews.length!==reviews.length)throw Error("Invalid model response.");
 const ids=new Set(reviews.map(r=>r.id));const seen=new Set<string>();
 for(const r of a.reviews){if(!r||!ids.has(r.id)||seen.has(r.id)||typeof r.needsReview!=="boolean"||!Array.isArray(r.aspects))throw Error("Model review IDs do not match this workspace.");seen.add(r.id);for(const h of r.aspects){if(!Object.hasOwn(aspects,h.aspect)||!["positive","negative"].includes(h.sentiment)||!Number.isFinite(h.score)||h.score<0||h.score>1)throw Error("Invalid model category.");}}
 for(const points of [a.praised,a.criticized]){if(!Array.isArray(points))throw Error("Missing evidence.");for(const point of points){if(!Object.hasOwn(aspects,point.aspect)||typeof point.text!=="string"||!Array.isArray(point.reviewIds)||!point.reviewIds.every(id=>ids.has(id))||new Set(point.reviewIds).size!==point.reviewIds.length)throw Error("Invalid insight evidence.");}}
 if(!Array.isArray(a.suggestions)||!a.suggestions.every(s=>Object.hasOwn(aspects,s.aspect)&&typeof s.text==="string"))throw Error("Invalid recommendations.");
 if(a.llm){if(typeof a.llm.model!=="string"||typeof a.llm.status!=="string"||!Number.isFinite(a.llm.latencyMs)||!Array.isArray(a.llm.advice)||a.llm.advice.length>3)throw Error("Invalid language model response.");for(const idea of a.llm.advice){if(!Object.hasOwn(aspects,idea.aspect)||typeof idea.title!=="string"||typeof idea.text!=="string"||!Array.isArray(idea.reviewIds)||!idea.reviewIds.every(id=>ids.has(id)))throw Error("Invalid language model evidence.");}}
 return a;
}
export async function analyzeReviews(reviews:Review[],endpoint="http://localhost:8080"):Promise<Analysis>{
 const url=new URL(endpoint);if(!["localhost","127.0.0.1"].includes(url.hostname)||url.protocol!=="http:"||url.username||url.password)throw Error("Use the local laptop service, for example http://localhost:8080.");
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),180000);
 try{const response=await fetch(`${url.origin}/workspace/analyze`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reviews:reviews.map(r=>({id:r.id,text:r.text,language:languages[r.language??"English"]??r.language??"unknown",rating:r.rating}))}),signal:abort.signal});if(!response.ok)throw Error(`Review analysis failed (${response.status}). Check the local backend.`);return validateAnalysis(await response.json(),reviews);}
 catch(e){if(e instanceof Error&&e.name==="AbortError")throw Error("Analysis took too long. Try again with a smaller review batch.");throw e;}
 finally{clearTimeout(timer);}
}
