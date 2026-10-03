import type { ReplyLanguage, ReplyOutput } from "./review-replies.ts";
export type TranslationConnection = { endpoint: string; token?: string };
export function normalizeEndpoint(endpoint: string): string {
  const url = new URL(endpoint.trim());
  const ipv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) && url.hostname.split(".").every(n => Number(n) <= 255);
  const privateIPv4 = ipv4 && /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && (privateIPv4 || url.hostname === "localhost"))) || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Enter an HTTPS service address or a private Wi-Fi HTTP address, without a path or password.");
  }
  return url.origin;
}
export async function checkTranslationConnection(connection: TranslationConnection): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${normalizeEndpoint(connection.endpoint)}/health`, { headers: connection.token ? { Authorization: `Bearer ${connection.token}` } : {}, signal: controller.signal });
    const result = await response.json();
    if (!response.ok || result.ready !== true || result.source !== "local-laptop-model" || result.model !== "facebook/nllb-200-distilled-600M") throw new Error("Connection failed. Check the laptop address and pairing code.");
  } finally { clearTimeout(timeout); }
}
export async function translateOnLaptop(text: string, from: ReplyLanguage, to: ReplyLanguage, connection: TranslationConnection = { endpoint: "http://127.0.0.1:8085" }): Promise<ReplyOutput> {
  if (!text.trim()) throw new Error("Write a response first.");
  if (from === to) return { text, source: "local-template", modelVersion: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${normalizeEndpoint(connection.endpoint)}/translate`, {
      method: "POST", headers: { "Content-Type": "application/json", ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}) },
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
