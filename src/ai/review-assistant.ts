import type { Profile, Review } from "../data/types.ts";
import { templateReplies, type ReplyLanguage } from "./review-replies.ts";
import { validateAssistantOutput, type BusinessAssistant, type AssistantOutput } from "./assistant-contract.ts";
// Integration seam: install the reviewed teammate adapter here at app startup.
// No network requests are made by the default authored-example provider.
export const assistantIntegration: { provider: BusinessAssistant|null } = {provider:null};
export async function suggestReviewResponse(review:Review, business:Profile, language:ReplyLanguage):Promise<AssistantOutput> {
 if(assistantIntegration.provider) {
  const output=await assistantIntegration.provider.suggestReply({business:{name:business.name,experience:business.experience,language:business.language,price:business.price,currency:business.currency},review:{id:review.id,text:review.text,rating:review.rating,language:review.language},writingLanguage:language});
  return validateAssistantOutput(output,[review.id]);
 }
 const output=await templateReplies.suggest(review,language);
 return {text:output.text,evidenceIds:[],source:"authored-example",modelVersion:null,latencyMs:null};
}
