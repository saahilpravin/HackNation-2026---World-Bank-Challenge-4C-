import type { ReviewTranslation } from "../data/types.ts";
export function findReviewTranslation(entries: ReviewTranslation[] | undefined, reviewId: string, sourceText: string, from: string, to: string) {
 return entries?.find(item=>item.reviewId===reviewId&&item.sourceText===sourceText&&item.from===from&&item.to===to);
}
export function saveReviewTranslation(entries: ReviewTranslation[] | undefined, item: ReviewTranslation) {
 return [...(entries??[]).filter(old=>!(old.reviewId===item.reviewId&&old.to===item.to)),item].slice(-300);
}
