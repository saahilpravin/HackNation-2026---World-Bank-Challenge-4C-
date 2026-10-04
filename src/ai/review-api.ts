import type { Review } from "../data/types.ts";
import { languageCode, insightsPayload } from "./insights-api.ts";
import { normalizeEndpoint } from "./laptop-translation.ts";
export const aspectLabels: Record<string, string> = { guide: "Tour guide", price_value: "Price & value", communication: "Communication", facilities: "Facilities", access_transport: "Access & transport", food: "Food & drinks", other: "Other" };
export type Analysis = { review_id: string; aspects: { aspect: string; sentiment: "positive" | "negative"; score: number; evidence: string }[]; overall_sentiment: string; sentiment_source: string; needs_review: boolean; model_version: string; translation?: { status: string; model_version: string; original_text: string; translated_text: string | null; error: string | null } };
export type Generation = { status: string; source: "local-laptop-llm" | "template"; model: string | null; digest: string | null; prompt_version: string; latency_ms: number };
export type DraftExample = { id: string; label: string; language: string; text: string; owner_preview: string | null; generation?: Generation };
export type ReplyExamples = { analysis: Analysis; drafts: DraftExample[]; warnings: string[]; requires_approval: true; model_version: string; generation?: Generation };
export type ReviewAnalysisCache = { key: string; savedAt: string; analysis: Analysis; examples?: ReplyExamples };
export function reviewAnalysisKey(review: Review, endpoint: string, ownerLanguage: string, business: string, context?: Record<string, string>) { return JSON.stringify(["review-analysis-v4-qwen4b", normalizeEndpoint(endpoint), review.id, review.text, review.language, review.rating, review.date, ownerLanguage, business, context ?? {}]); }
function requireValue(ok: unknown): asserts ok { if (!ok) throw new Error("The review service returned incompatible data. Saved results have not changed."); }
function obj(v: unknown): Record<string, unknown> { requireValue(!!v && typeof v === "object" && !Array.isArray(v)); return v as Record<string, unknown>; }
function str(v: unknown, max = 4000): string { requireValue(typeof v === "string" && v.length <= max); return v; }
export function decodeAnalysis(value: unknown, review: Review): Analysis {
  const a = obj(value); requireValue(a.review_id === 1 && typeof a.needs_review === "boolean" && Array.isArray(a.aspects) && a.aspects.length <= 14);
  const aspects = a.aspects.map(v => { const h = obj(v), aspect = str(h.aspect), sentiment = str(h.sentiment); requireValue(aspect in aspectLabels && (sentiment === "positive" || sentiment === "negative") && typeof h.score === "number" && Number.isFinite(h.score) && h.score >= 0 && h.score <= 1); return { aspect, sentiment: sentiment as "positive" | "negative", score: h.score, evidence: str(h.evidence) }; });
  requireValue(new Set(aspects.map(h => h.aspect + h.sentiment)).size === aspects.length);
  const sentiment = str(a.overall_sentiment); requireValue(["positive", "negative", "mixed", "neutral", "unknown"].includes(sentiment));
  const source = a.sentiment_source ?? (aspects.length ? "aspect-model" : review.rating ? "star-rating" : "unknown"); requireValue(["aspect-model", "star-rating", "unknown"].includes(str(source)));
  let translation: Analysis["translation"];
  if (a.translation != null) {
    const t = obj(a.translation), status = str(t.status); requireValue(["translated", "failed"].includes(status) && t.original_text === review.text);
    const translatedText = t.translated_text === null ? null : str(t.translated_text, 12000);
    requireValue(status !== "translated" || !!translatedText?.trim());
    translation = { status, model_version: str(t.model_version, 200), original_text: str(t.original_text), translated_text: translatedText, error: t.error === null ? null : str(t.error) };
  }
  return { translation, review_id: review.id, aspects, overall_sentiment: sentiment, sentiment_source: str(source), needs_review: a.needs_review, model_version: str(a.model_version, 200) };
}
export function decodeExamples(value: unknown, review: Review): ReplyExamples {
  const r = obj(value); requireValue(r.review_id === 1 && r.requires_approval === true && Array.isArray(r.drafts) && r.drafts.length > 0 && r.drafts.length <= 2 && Array.isArray(r.warnings) && r.warnings.length <= 10);
  let generation: Generation | undefined;
  if (r.generation != null) {
    const g = obj(r.generation), status = str(g.status), source = str(g.source);
    requireValue(["generated", "disabled", "not-ready", "timeout", "invalid-output", "translation-failed", "busy"].includes(status) && ["local-laptop-llm", "template"].includes(source) && (status !== "generated" || source === "local-laptop-llm") && typeof g.latency_ms === "number" && Number.isInteger(g.latency_ms) && g.latency_ms >= 0 && g.latency_ms <= 3600000);
    generation = { status, source: source as Generation["source"], model: g.model == null ? null : str(g.model), digest: g.digest == null ? null : str(g.digest), prompt_version: str(g.prompt_version), latency_ms: g.latency_ms };
  }
  const drafts = r.drafts.map(v => { const d = obj(v); return { id: str(d.id, 32), label: str(d.label, 100), language: str(d.language, 32), text: str(d.text), owner_preview: d.owner_preview === null ? null : str(d.owner_preview), ...(generation ? { generation } : {}) }; });
  return { analysis: decodeAnalysis(r.analysis, review), drafts, warnings: r.warnings.map(v => str(v)), requires_approval: true, model_version: str(r.model_version, 200), ...(generation ? { generation } : {}) };
}
async function request(endpoint: string, route: string, body: unknown, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController(); const abort = () => controller.abort(); signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort(); const timer = setTimeout(abort, 120000);
  try { const response = await fetch(`${normalizeEndpoint(endpoint)}/v1/reviews/${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal }); if (!response.ok) throw new Error("Review analysis is unavailable. Check your local service."); return await response.json(); }
  catch(e) { if (e instanceof TypeError || (e instanceof Error && e.name === "AbortError")) throw new Error("Cannot reach the review service. Saved analysis is still available; connect it in Offline & AI."); throw e; }
  finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
}
export async function fetchReviewAnalysis(review: Review, endpoint: string, signal?: AbortSignal) { const result = await request(endpoint, "analyze", { reviews: insightsPayload([review], "English").reviews }, signal); requireValue(Array.isArray(result) && result.length === 1); return decodeAnalysis(result[0], review); }
export async function fetchReviewExamples(review: Review, endpoint: string, ownerLanguage: string, business: string, signal?: AbortSignal, context?: Record<string, string>) { return decodeExamples(await request(endpoint, "reply-draft", { review: insightsPayload([review], ownerLanguage).reviews[0], owner_language: languageCode(ownerLanguage), business_name: business, business_context: context ?? {} }, signal), review); }
export function saveAnalysisCache(caches: ReviewAnalysisCache[] = [], item: ReviewAnalysisCache) { return [...caches.filter(c => c.key !== item.key), item].slice(-100); }
