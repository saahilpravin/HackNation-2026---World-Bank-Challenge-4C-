import test from "node:test";
import assert from "node:assert/strict";
import { demoAI } from "../src/ai/provider.ts";
const profile = {
  name: "Test",
  experience: "Tour",
  language: "English",
  visitors: "French",
  price: 2000,
  duration: 60,
  capacity: 8,
  hours: "10:00",
};
const message = {
  id: "m1",
  guest: "Camille",
  language: "French",
  text: "Bonjour",
  unread: true,
  demo: true,
};
test("fixture output cannot claim measured model results", async () => {
  const result = await demoAI.analyze(message, profile);
  assert.equal(result.source, "demo-fixture");
  assert.equal(result.confidence, null);
  assert.equal(result.latencyMs, null);
  assert.equal(result.modelVersion, null);
  assert.match(result.suggestion!, /2000/);
});
test("a real message sharing a fixture ID does not receive a scripted translation", async () => {
  const result = await demoAI.analyze({ ...message, demo: false }, profile);
  assert.equal(result.translation, null);
  assert.equal(result.suggestion, null);
  assert.equal(result.intent, "Needs review");
});
