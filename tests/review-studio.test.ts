import test from "node:test";
import assert from "node:assert/strict";
import { demoData, demoProfile } from "../src/data/demo.ts";
import { filterReviews, reviewState } from "../src/data/review-tools.ts";
import { upgradeDemoReviews } from "../src/data/demo-upgrade.ts";
test("demo has 150 labeled reviews, ten languages, and 40 answered examples", () => {
 const data = demoData();
 assert.equal(data.reviews.length,150);
 assert.equal(new Set(data.reviews.map(r=>r.language)).size,10);
 assert.equal(data.reviews.filter(r=>r.exampleResponse).length,40);
 assert.ok(data.reviews.every(r=>r.demo && Object.keys(r.fixtureTranslations ?? {}).length===10));
 assert.equal(filterReviews(data.reviews,[],"","new","French").length,11);
});
test("local approvals override example status and upgrade preserves existing approved text", () => {
 const data=demoData();
 const previous={...data.reviews[1],text:"Previously approved review",guest:"Existing guest"};
 const reply={reviewId:previous.id,draft:"Thanks",writingLanguage:"English",customerLanguage:"English",translatedText:"Thanks",source:"manual" as const,modelVersion:null,approvedAt:"2026-10-03"};
 const old={...data,profile:demoProfile,reviews:[previous],reviewReplies:[reply],demoReviewVersion:undefined};
 const upgraded=upgradeDemoReviews(old);
 assert.equal(upgraded.reviews.length,150);
 assert.equal(upgraded.reviews.find(r=>r.id===previous.id)?.text,previous.text);
 assert.equal(reviewState(upgraded.reviews[1],upgraded.reviewReplies),"approved");
 assert.equal(upgradeDemoReviews(upgraded),upgraded);
});
