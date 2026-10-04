import type { Review } from "../data/types.ts";
import { normalizeEndpoint } from "./laptop-translation.ts";
import languages from "../data/nllb-languages.json" with { type: "json" };

export type Finding = { aspect: string; label: string; count: number; total: number; share: number; priority: string | null; priority_label: string | null; summary: string; action: string | null; quotes: { review_id: string; language: string | null; rating: number | null; text: string; original_text?: string | null; translation_model?: string | null }[]; review_ids: string[] };
export type Narrative = { status: string; source: string; model: string; digest: string; prompt_version: string; latency_ms: number; summary: string | null; aspect_notes: { aspect: string; polarity: string; text: string; review_ids: string[] }[]; warnings: string[] };
export type InsightsResult = {
  narrative?: Narrative | null;
  meta: { total: number; analysed: number; unread: number; translated?: number; translation_failed?: number; owner_language: string; model_version: string; note: string | null };
  quantitative: { average_rating: number | null; rating_distribution: Record<string, number>; sentiment: Record<string, number>; languages: Record<string, number>; aspects: { aspect: string; label: string; positive: number; negative: number; share_negative: number }[]; trend: { month: string; count: number; average_rating: number | null; negative: number }[] };
  qualitative: { problems: Finding[]; strengths: Finding[] };
  attention: { unread_review_ids: string[]; note: string | null };
};
export type InsightsCache = { key: string; savedAt: string; result: InsightsResult };
const aspectNames = new Set(["guide", "price_value", "communication", "facilities", "access_transport", "food", "other"]);
export function languageCode(language = "English"): string {
  // Preserve unknown/unsupported codes rather than claiming their text is English.
  const code = languages.find(item => item.name === language)?.code;
  const known: Record<string, string> = { eng_Latn: "en", swh_Latn: "sw", fra_Latn: "fr", spa_Latn: "es", deu_Latn: "de", ita_Latn: "it", por_Latn: "pt", arb_Arab: "ar", zho_Hans: "zh", zho_Hant: "zho_Hant", jpn_Jpan: "ja" };
  return code ? known[code] ?? code : language;
}
export function insightsKey(reviews: Review[], ownerLanguage: string, endpoint: string): string {
  return JSON.stringify(["v3-nllb-insights", normalizeEndpoint(endpoint), languageCode(ownerLanguage), [...reviews].sort((a, b) => a.id.localeCompare(b.id)).map(r => [r.id, r.text, r.language ? languageCode(r.language) : "unknown", r.rating, r.date ?? null])]);
}
export function insightsPayload(reviews: Review[], ownerLanguage: string) {
  if (!reviews.length || reviews.length > 500 || new Set(reviews.map(r => r.id)).size !== reviews.length) throw new Error("Choose 1–500 reviews with unique IDs.");
  return { include_narrative: true, owner_language: languageCode(ownerLanguage), reviews: reviews.map((review, index) => ({ id: index + 1, text: review.text, language: review.language ? languageCode(review.language) : "unknown", rating: review.rating, date: review.date ?? null })) };
}
function requireValue(ok: unknown): asserts ok { if (!ok) throw new Error("The insight service returned an incompatible response. Your saved findings have not changed."); }
function object(value: unknown): Record<string, unknown> { requireValue(value !== null && typeof value === "object" && !Array.isArray(value)); return value as Record<string, unknown>; }
function count(value: unknown, max: number): number { requireValue(typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= max); return value; }
function text(value: unknown): string { requireValue(typeof value === "string" && value.length <= 12000); return value; }
function optionalText(value: unknown): string | null { return value === null ? null : text(value); }
function array(value: unknown, max: number): unknown[] { requireValue(Array.isArray(value) && value.length <= max); return value; }
function share(value: unknown): number { requireValue(typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1); return value; }
function rating(value: unknown): number | null { if (value === null) return null; requireValue(typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5); return value; }
export function decodeInsights(value: unknown, reviews: Review[]): InsightsResult {
  const root = object(value), m = object(root.meta), q = object(root.quantitative), qual = object(root.qualitative), att = object(root.attention);
  const total = count(m.total, reviews.length); requireValue(total === reviews.length);
  const analysed = count(m.analysed, total), unread = count(m.unread, total); requireValue(analysed + unread === total);
  const translated = count(m.translated ?? 0, total), translationFailed = count(m.translation_failed ?? 0, unread);
  requireValue(translated + translationFailed <= total);
  const id = (n: unknown) => { requireValue(typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= reviews.length); return reviews[n - 1].id; };
  const ids = (v: unknown) => { const out = array(v, total).map(id); requireValue(new Set(out).size === out.length); return out; };
  const unreadIds = ids(att.unread_review_ids); requireValue(unreadIds.length === unread);
  const finding = (v: unknown): Finding => {
    const f = object(v), aspect = text(f.aspect); requireValue(aspectNames.has(aspect));
    const reviewIds = ids(f.review_ids); requireValue(reviewIds.every(i => !unreadIds.includes(i)));
    const n = count(f.count, analysed); requireValue(n === reviewIds.length && count(f.total, total) === analysed);
    const quotes = array(f.quotes, 3).map(v => { const quote = object(v), reviewId = id(quote.review_id); requireValue(reviewIds.includes(reviewId));
      const originalText = optionalText(quote.original_text ?? null), translationModel = optionalText(quote.translation_model ?? null);
      requireValue((originalText === null) === (translationModel === null));
      if (translationModel) { requireValue(originalText === reviews.find(r => r.id === reviewId)?.text && translationModel.startsWith("facebook/nllb-200-distilled-600M@")); }
      return { review_id: reviewId, language: optionalText(quote.language), rating: rating(quote.rating), text: text(quote.text), original_text: originalText, translation_model: translationModel }; });
    return { aspect, label: text(f.label), count: n, total: analysed, share: share(f.share), priority: optionalText(f.priority), priority_label: optionalText(f.priority_label), summary: text(f.summary), action: optionalText(f.action), quotes, review_ids: reviewIds };
  };
  const counts = (v: unknown) => Object.fromEntries(Object.entries(object(v)).map(([key, val]) => [key, count(val, total)]));
  const distribution = counts(q.rating_distribution); requireValue(["1", "2", "3", "4", "5"].every(key => key in distribution));
  let narrative: Narrative | null = null;
  if (root.narrative != null) {
    const n = object(root.narrative), status = text(n.status);
    requireValue(["generated", "disabled", "not-ready", "timeout", "invalid-output", "insufficient-evidence", "busy"].includes(status));
    const notes = array(n.aspect_notes, 4).map(v => { const note = object(v), aspect = text(note.aspect), polarity = text(note.polarity); requireValue(aspectNames.has(aspect) && ["positive", "negative"].includes(polarity));
      const matching = array(polarity === "positive" ? qual.strengths : qual.problems, 5).map(object).find(f => f.aspect === aspect); requireValue(matching);
      const reviewIds = ids(note.review_ids); requireValue(reviewIds.length > 0 && reviewIds.every(i => ids(matching.review_ids).includes(i)));
      return { aspect, polarity, text: text(note.text), review_ids: reviewIds };
    });
    const summary = optionalText(n.summary); requireValue(status !== "generated" || !!summary?.trim());
    requireValue(status === "generated" || (summary === null && notes.length === 0));
    narrative = { status, source: text(n.source), model: text(n.model), digest: text(n.digest), prompt_version: text(n.prompt_version), latency_ms: count(n.latency_ms, 3600000), summary, aspect_notes: notes, warnings: array(n.warnings, 10).map(text) };
  }
  return {
    narrative,
    meta: { total, analysed, unread, translated, translation_failed: translationFailed, owner_language: text(m.owner_language), model_version: text(m.model_version), note: optionalText(m.note) },
    quantitative: { average_rating: rating(q.average_rating), rating_distribution: distribution, sentiment: counts(q.sentiment), languages: counts(q.languages),
      aspects: array(q.aspects, 7).map(v => { const a = object(v), aspect = text(a.aspect); requireValue(aspectNames.has(aspect)); return { aspect, label: text(a.label), positive: count(a.positive, analysed), negative: count(a.negative, analysed), share_negative: share(a.share_negative) }; }),
      trend: array(q.trend, total).map(v => { const t = object(v); return { month: text(t.month), count: count(t.count, total), average_rating: rating(t.average_rating), negative: count(t.negative, total) }; }) },
    qualitative: { problems: array(qual.problems, 5).map(finding), strengths: array(qual.strengths, 3).map(finding) },
    attention: { unread_review_ids: unreadIds, note: optionalText(att.note) },
  };
}
export type InsightsProgress = { total: number; processed: number; status: string };
function pause(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new Error("Analysis cancelled.")); };
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 1000);
    signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
  });
}
export async function fetchInsights(reviews: Review[], ownerLanguage: string, endpoint = "http://127.0.0.1:8080", signal?: AbortSignal, progress?: (value: InsightsProgress) => void): Promise<InsightsResult> {
  const origin = normalizeEndpoint(endpoint);
  const request = async (url: string, body?: unknown) => {
    const controller = new AbortController(); const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true }); if (signal?.aborted) abort();
    const timer = setTimeout(abort, 15000);
    try {
      const response = await fetch(url, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 409 ? "Another review batch is running. Try again when it finishes." : response.status === 404 ? "Update and restart the Java backend to enable multilingual insight jobs." : "Local review analysis is unavailable.");
      return object(await response.json());
    } catch(error) {
      if (error instanceof TypeError || (error instanceof Error && error.name === "AbortError")) throw new Error("Cannot reach the review service. Start the Java backend or check its address in Offline & AI. Saved insights are still available.");
      throw error;
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", abort); }
  };
  let job = await request(`${origin}/v1/insights/jobs`, insightsPayload(reviews, ownerLanguage));
  const jobId = text(job.id); requireValue(/^[a-zA-Z0-9-]{1,64}$/.test(jobId));
  while (true) {
    requireValue(job.id === jobId && job.total === reviews.length);
    const processed = count(job.processed, reviews.length), status = text(job.status);
    requireValue(["queued", "running", "completed", "failed"].includes(status));
    progress?.({ total: reviews.length, processed, status });
    if (status === "completed") { requireValue(processed === reviews.length); return decodeInsights(job.result, reviews); }
    if (status === "failed") throw new Error(typeof job.error === "string" ? job.error : "Local analysis failed; completed translations are retained.");
    await pause(signal); job = await request(`${origin}/v1/insights/jobs/${jobId}`);
  }
}
