import test from "node:test";
import assert from "node:assert/strict";
import { categorizeReviews } from "../src/ai/review-categories.ts";
import type { Review } from "../src/data/types.ts";
const review=(id:string,text:string):Review=>({id,text,guest:id,rating:4,theme:"",demo:false});
test("categories use feedback text, include unknown comments and preserve empty categories",()=>{
 const rows=[review("a","Our guide was friendly but the price was expensive."),review("b","The toilet needed cleaning."),review("c","Unusual souvenir.")];
 const categories=categorizeReviews(rows);
 assert.equal(categories.length,10);
 assert.deepEqual(categories.find(c=>c.id==="guide")?.reviews.map(r=>r.id),["a"]);
 assert.deepEqual(categories.find(c=>c.id==="value")?.reviews.map(r=>r.id),["a"]);
 assert.deepEqual(categories.find(c=>c.id==="facilities")?.reviews.map(r=>r.id),["b"]);
 assert.deepEqual(categories.find(c=>c.id==="other")?.reviews.map(r=>r.id),["c"]);
 assert.equal(categories.find(c=>c.id==="communication")?.reviews.length,0);
});
