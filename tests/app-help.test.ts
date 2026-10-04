import { test } from "node:test";
import assert from "node:assert/strict";
import { answerAppQuestion } from "../src/ai/app-help.ts";
import languages from "../src/data/nllb-languages.json" with { type: "json" };
test("guide finds practical answers without inventing unsupported help", () => {
  assert.equal(answerAppQuestion("How do I save a draft for later?")?.id, "draft");
  assert.equal(answerAppQuestion("Where are unanswered reviews?")?.id, "queue");
  assert.equal(answerAppQuestion("NLLB pairing failed")?.id, "model");
  assert.equal(answerAppQuestion("what works offline")?.id, "offline");
  assert.equal(answerAppQuestion("Tell me tomorrow's weather"), null);
  assert.equal(answerAppQuestion(""), null);
});
test("catalog has unique model language codes and keeps existing saved names", () => {
  assert.equal(languages.length, 202);
  assert.equal(new Set(languages.map(l => l.code)).size, 202);
  assert.equal(new Set(languages.map(l => l.name)).size, 202);
  assert.equal(languages.find(l => l.name === "Kiswahili")?.code, "swh_Latn");
  assert.equal(languages.find(l => l.name === "Bengali")?.code, "ben_Beng");
  assert.equal(languages.find(l => l.name === "Chinese (Traditional)")?.code, "zho_Hant");
});

test("unsupported authored examples fail clearly instead of returning an empty reply", async () => {
  const { templateReplies } = await import("../src/ai/review-replies.ts");
  await assert.rejects(templateReplies.suggest({ rating: 5 } as Parameters<typeof templateReplies.suggest>[0], "Bengali"), /No authored example in Bengali/);
});
