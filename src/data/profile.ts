import type { Data, Profile } from "./types";
export const emptyProfile: Profile = {
  name: "",
  ownerName: "",
  experience: "",
  language: "English",
  visitors: "",
  currency: "KES",
  price: 0,
  duration: 60,
  capacity: 1,
  hours: "",
  demoBusiness: false,
};
export function emptyData(): Data {
  return {
    profile: null,
    messages: [],
    bookings: [],
    reviews: [],
    replies: [],
  };
}
export function isDemoProfile(profile: Profile): boolean {
  return profile.demoBusiness ?? profile.name === "Noor's Coffee Farm";
}
export function finishSetup(data: Data, profile: Profile): Data {
  return {
    ...data,
    insightsCache: undefined, reviewAnalysisCache: undefined,
    profile: { ...profile, demoBusiness: false },
    messages: data.messages.filter((m) => !m.demo),
    bookings: data.bookings.filter((b) => !b.demo),
    reviews: data.reviews.filter((r) => !r.demo),
    replies: data.replies.filter((r) => !r.demo),
    reviewTranslations: data.reviewTranslations?.filter(item => data.reviews.some(r => r.id === item.reviewId && !r.demo)),
    reviewDrafts: data.reviewDrafts?.filter(reply => data.reviews.some(r => r.id === reply.reviewId && !r.demo)),
    reviewReplies: data.reviewReplies?.filter(reply => data.reviews.some(r => r.id === reply.reviewId && !r.demo)),
  };
}
