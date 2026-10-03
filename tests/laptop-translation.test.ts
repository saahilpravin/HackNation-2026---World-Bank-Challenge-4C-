import test from "node:test";
import assert from "node:assert/strict";
import { translateOnLaptop } from "../src/ai/laptop-translation.ts";
test("same-language drafts require no service", async () => {
  assert.equal((await translateOnLaptop("Hello", "English", "English")).text, "Hello");
});
test("model responses preserve measured provenance and reject invalid results", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ text: "Bonjour", source: "local-laptop-model", modelVersion: "nllb@revision", latencyMs: 20 }));
    assert.equal((await translateOnLaptop("Hello", "English", "French")).source, "local-laptop-model");
    globalThis.fetch = async () => new Response(JSON.stringify({ text: "Bonjour", source: "on-device-model" }));
    await assert.rejects(translateOnLaptop("Hello", "English", "French"), /invalid result/);
    globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
    await assert.rejects(translateOnLaptop("Hello", "English", "French"), /Cannot reach the laptop model/);
  } finally { globalThis.fetch = original; }
});
