import type { ReplyLanguage, ReplyOutput } from "./review-replies.ts";
export async function translateOnLaptop(text: string, from: ReplyLanguage, to: ReplyLanguage): Promise<ReplyOutput> {
  if (!text.trim()) throw new Error("Write a response first.");
  if (from === to) return { text, source: "local-template", modelVersion: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch("http://127.0.0.1:8085/translate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from, to }), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Translation failed.");
    if (typeof result.text !== "string" || !result.text.trim() || result.source !== "local-laptop-model" || typeof result.modelVersion !== "string" || !Number.isFinite(result.latencyMs)) {
      throw new Error("The translation service returned an invalid result.");
    }
    return { text: result.text, source: result.source, modelVersion: result.modelVersion, latencyMs: result.latencyMs };
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) {
      throw new Error("Cannot reach the laptop model, or the request timed out. Start the NLLB preview service and try again. Your draft is still here.");
    }
    throw error;
  } finally { clearTimeout(timeout); }
}
