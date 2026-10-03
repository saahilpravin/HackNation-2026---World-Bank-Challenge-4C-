import type { Review } from "../data/types.ts";
export const reviewCategories = [
 {id:"guide",title:"Tour guide",description:"Knowledge, friendliness and the quality of the guide.",icon:"person-outline",pattern:/\b(guide|guided|host|noor|grower|stories|storytelling|knowledge|friendly|learning|learn)\b/i},
 {id:"value",title:"Value for money",description:"Price, inclusions and whether the visit feels worthwhile.",icon:"wallet-outline",pattern:/\b(price|prices|cost|expensive|cheap|value|worth|money|paid|fee)\b/i},
 {id:"communication",title:"Communication",description:"Clear information, questions and booking instructions.",icon:"chatbubbles-outline",pattern:/\b(communication|information|explain|explained|questions|instructions|booking|reply|response|hear|audibility)\b/i},
 {id:"facilities",title:"Facilities",description:"Toilets, seating, shade and visitor amenities.",icon:"business-outline",pattern:/\b(toilet|toilets|bathroom|seating|seat|shade|facilities|amenities|water|rest stop)\b/i},
 {id:"arrival",title:"Location & directions",description:"Finding the venue and arriving without difficulty.",icon:"navigate-outline",pattern:/\b(road|sign|directions|arrival|location|find|bus|transport|parking)\b/i},
 {id:"activities",title:"Activities & experience",description:"What visitors do, learn and enjoy during the visit.",icon:"sparkles-outline",pattern:/\b(tasting|taste|coffee|food|workshop|roast|roasting|growing|composting|sustainable)\b/i},
 {id:"pace",title:"Timing & organisation",description:"Waiting, group size, duration and pace.",icon:"time-outline",pattern:/\b(wait|waiting|rushed|duration|longer|shorter|time|schedule|group|pace)\b/i},
 {id:"access",title:"Accessibility",description:"Paths, steps and support for different access needs.",icon:"accessibility-outline",pattern:/\b(accessible|accessibility|wheelchair|steps|path|paths|mobility)\b/i},
 {id:"family",title:"Family friendliness",description:"The experience for children and family groups.",icon:"people-outline",pattern:/\b(children|kids|family|families)\b/i},
 {id:"other",title:"Other feedback",description:"Comments that do not fit the categories above.",icon:"ellipsis-horizontal",pattern:null},
] as const;
export function categorizeReviews(reviews: Review[]) {
 return reviewCategories.map(category=>({...category,reviews:reviews.filter(review=>{
  const text=review.demo&&review.canonicalEnglish?review.canonicalEnglish:review.text;
  return category.pattern?category.pattern.test(text):!reviewCategories.some(c=>c.pattern?.test(text));
 })}));
}
