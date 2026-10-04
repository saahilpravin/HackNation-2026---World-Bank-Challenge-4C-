import type { Data } from "./types.ts";
import { reviewDemo } from "./review-demo.ts";
import { isDemoProfile } from "./profile.ts";
export function upgradeDemoReviews(data: Data): Data {
  if (data.demoReviewVersion === 2 || !data.profile || !isDemoProfile(data.profile)) return data;
  const existing = new Map(data.reviews.map(r => [r.id, r]));
  const reviewReplies = data.reviewReplies ?? [];
  const samples = reviewDemo.filter(r => !existing.has(r.id) || existing.get(r.id)?.demo).map(r => {
    const previous = existing.get(r.id);
    return { ...r, ...(previous && reviewReplies.some(reply => reply.reviewId === r.id) ? { text: previous.text, guest: previous.guest, theme: previous.theme, language: previous.language ?? "English", canonicalEnglish: previous.text, fixtureTranslations: undefined } : {}) };
  });
  return { ...data, reviews: [...samples, ...data.reviews.filter(r => !r.demo)], demoReviewVersion: 2 };
}
