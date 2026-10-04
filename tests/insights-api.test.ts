import test from "node:test";
import assert from "node:assert/strict";
import { decodeInsights, fetchInsights, insightsKey, insightsPayload } from "../src/ai/insights-api.ts";
import type { Review } from "../src/data/types.ts";
const reviews: Review[] = [
  { id: "r15", guest: "A", text: "Excellent guide and clear explanations.", rating: 5, language: "English", date: "2026-10-03", theme: "guide", demo: true },
  { id: "r98", guest: "B", text: "Une visite intéressante.", rating: 4, language: "French", theme: "guide", demo: true },
];
const response = () => ({ meta: { total: 2, analysed: 1, unread: 1, owner_language: "en", model_version: "v1@test", note: null }, quantitative: { average_rating: 4.5, rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 }, sentiment: { positive: 2 }, languages: { en: 1, fr: 1 }, aspects: [{ aspect: "guide", label: "Tour guide", positive: 1, negative: 0, share_negative: 0 }], trend: [{ month: "2026-10", count: 1, average_rating: 5, negative: 0 }] }, qualitative: { problems: [], strengths: [{ aspect: "guide", label: "Tour guide", count: 1, total: 1, share: 1, priority: null, priority_label: null, summary: "One review praises the guide.", action: null, quotes: [{ review_id: 1, language: "en", rating: 5, text: reviews[0].text }], review_ids: [1] }] }, attention: { unread_review_ids: [2], note: "Check this language." } });
test("payload retains original review text and maps arbitrary app IDs to numeric IDs", () => {
  const body = insightsPayload(reviews, "Kiswahili");
  assert.equal(body.owner_language, "sw");
  assert.deepEqual(body.reviews.map(r => [r.id, r.language]), [[1, "en"], [2, "fr"]]);
  assert.equal(body.reviews[1].text, reviews[1].text);
  assert.throws(() => insightsPayload([reviews[0], reviews[0]], "English"));
});
test("response maps evidence and unread IDs back to the correct frontend review", () => {
  const result = decodeInsights(response(), reviews);
  assert.equal(result.qualitative.strengths[0].quotes[0].review_id, "r15");
  assert.deepEqual(result.attention.unread_review_ids, ["r98"]);
});
test("rejects evidence from outside the workspace, invalid counts and incompatible envelopes", () => {
  const badId = response(); badId.qualitative.strengths[0].quotes[0].review_id = 99;
  assert.throws(() => decodeInsights(badId, reviews), /incompatible/);
  const badCount = response(); badCount.meta.analysed = 3;
  assert.throws(() => decodeInsights(badCount, reviews));
  assert.throws(() => decodeInsights({ problems: [] }, reviews));
});
test("cache identity survives ordering but invalidates changed content, language or endpoint", () => {
  const key = insightsKey(reviews, "English", "http://127.0.0.1:8080");
  assert.equal(key, insightsKey([...reviews].reverse(), "English", "http://127.0.0.1:8080"));
  assert.notEqual(key, insightsKey([{ ...reviews[0], text: "Changed review" }, reviews[1]], "English", "http://127.0.0.1:8080"));
  assert.notEqual(key, insightsKey(reviews, "Kiswahili", "http://127.0.0.1:8080"));
});
test("client calls the actual versioned API and explains unavailable services", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => { assert.equal(url, "http://127.0.0.1:8080/v1/insights"); assert.equal(JSON.parse(String(options?.body)).reviews[0].id, 1); return new Response(JSON.stringify(response())); };
    assert.equal((await fetchInsights(reviews, "English")).meta.total, 2);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    await assert.rejects(fetchInsights(reviews, "English"), /Saved insights are still available/);
  } finally { globalThis.fetch = original; }
});
test("LLM notes map evidence IDs and reject evidence from another finding", () => {
  const narrative = { status: "generated", source: "local-laptop-llm", model: "qwen3:0.6b", digest: "digest", prompt_version: "v1", latency_ms: 40, summary: "Guide praise", aspect_notes: [{ aspect: "guide", polarity: "positive", text: reviews[0].text, review_ids: [1] }], warnings: [] };
  assert.equal(decodeInsights({ ...response(), narrative }, reviews).narrative?.aspect_notes[0].review_ids[0], "r15");
  assert.throws(() => decodeInsights({ ...response(), narrative: { ...narrative, aspect_notes: [{ ...narrative.aspect_notes[0], review_ids: [2] }] } }, reviews));
  assert.throws(() => decodeInsights({ ...response(), narrative: { ...narrative, status: "timeout" } }, reviews));
});
