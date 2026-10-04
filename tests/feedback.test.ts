import test from "node:test";
import assert from "node:assert/strict";
import { analyzeFeedback } from "../src/ai/feedback.ts";
import { demoData } from "../src/data/demo.ts";
const review = (id: string, text: string) => ({ id, text, guest: id, rating: 5, theme: "incorrect-label", demo: false });
test("sample records never contaminate business analysis", () => {
  assert.equal(analyzeFeedback(demoData(), false).analyzed, 0);
  const sample = analyzeFeedback(demoData(), true);
  assert.ok(sample.findings.some(f => f.id === "opportunity-tasting"));
  assert.ok(sample.findings.every(f => f.evidence.every(e => e.demo)));
  assert.equal(sample.source, "local-rules");
  assert.equal(sample.modelVersion, null);
});
test("mixed feedback keeps praise and complaints attached to the right clause", () => {
  const report = analyzeFeedback({ reviews: [review("a", "Wonderful tasting, but the road was hard to find.")], messages: [] }, false);
  assert.ok(report.findings.some(f => f.id === "love-tasting"));
  assert.ok(report.findings.some(f => f.id === "improve-directions"));
  assert.ok(!report.findings.some(f => f.id === "love-directions"));
  assert.ok(!report.findings.some(f => f.category === "opportunity"));
});
test("repeated praise supports an experiment and preserves exact source evidence", () => {
  const reviews = [review("a", "Loved the tasting."), review("b", "Tasting was the highlight.")];
  const report = analyzeFeedback({ reviews, messages: [{ id: "m", guest: "Guest", text: "Can children join?", language: "English", demo: false, unread: false }] }, false);
  assert.deepEqual(report.findings.find(f => f.id === "opportunity-tasting")?.evidence.map(e => e.id), ["a", "b"]);
  assert.equal(report.findings.find(f => f.id === "improve-family")?.evidence[0].kind, "message");
});
test("unknown topics and negated praise do not invent opportunities", () => {
  const report = analyzeFeedback({ reviews: [review("a", "I did not love the tasting."), review("b", "Sehr schön")], messages: [] }, false);
  assert.equal(report.findings.length, 0);
  assert.equal(report.skipped, 1);
});
