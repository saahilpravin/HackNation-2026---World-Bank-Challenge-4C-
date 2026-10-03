import test from "node:test";
import assert from "node:assert/strict";
import {findReviewTranslation,saveReviewTranslation} from "../src/ai/translation-cache.ts";
const item={reviewId:"r1",sourceText:"Hello",from:"English",to:"French",text:"Bonjour",modelVersion:"test-model",latencyMs:100};
test("saved translations match exact text and language pair",()=>{
 const entries=saveReviewTranslation(undefined,item);
 assert.equal(findReviewTranslation(entries,"r1","Hello","English","French")?.text,"Bonjour");
 assert.equal(findReviewTranslation(entries,"r1","Changed","English","French"),undefined);
 assert.equal(findReviewTranslation(entries,"r1","Hello","English","German"),undefined);
 assert.equal(findReviewTranslation(entries,"r1","Hello","Spanish","French"),undefined);
 assert.equal(saveReviewTranslation(entries,{...item,text:"Updated"}).length,1);
});
test("translation cache is bounded",()=>{
 const entries=Array.from({length:300},(_,i)=>({...item,reviewId:`r${i}`}));
 const saved=saveReviewTranslation(entries,{...item,reviewId:"new"});
 assert.equal(saved.length,300);assert.equal(saved[0].reviewId,"r1");
});
