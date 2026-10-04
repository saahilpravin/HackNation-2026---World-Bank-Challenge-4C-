import type { Data, Review } from "./types.ts";
export function reviewState(review: Review, replies: Data["reviewReplies"]): "new" | "answered" | "approved" {
  if (replies?.some(reply => reply.reviewId === review.id)) return "approved";
  return review.exampleResponse ? "answered" : "new";
}
export function filterReviews(reviews: Review[], replies: Data["reviewReplies"], query: string, status: string, language: string): Review[] {
  const q = query.trim().toLocaleLowerCase();
  return reviews.filter(r => (status === "all" || reviewState(r,replies) === status) && (language === "all" || r.language === language) && `${r.guest} ${r.text} ${r.canonicalEnglish ?? ""}`.toLocaleLowerCase().includes(q));
}
