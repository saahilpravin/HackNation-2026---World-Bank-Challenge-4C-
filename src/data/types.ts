export type Profile = {
  ownerName?: string;
  currency?: string;
  demoBusiness?: boolean;
  name: string;
  experience: string;
  language: string;
  visitors: string;
  price: number;
  duration: number;
  capacity: number;
  hours: string;
};
export type Message = {
  id: string;
  guest: string;
  language: string;
  text: string;
  unread: boolean;
  demo: boolean;
};
export type Booking = {
  id: string;
  messageId: string;
  guest: string;
  date: string;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled";
  notes: string;
  demo: boolean;
};
export type Reply = {
  id: string;
  messageId: string;
  text: string;
  approvedAt: string;
  status: "queued";
  demo: boolean;
};
export type ReviewReply = {
  reviewId: string;
  draft: string;
  writingLanguage: string;
  customerLanguage: string;
  translatedText: string;
  source: "local-template" | "manual" | "on-device-model" | "local-laptop-model";
  modelVersion?: string | null;
  latencyMs?: number;
  approvedAt: string;
};
export type Review = {
  id: string;
  guest: string;
  rating: number;
  text: string;
  language?: string;
  theme: string;
  demo: boolean;
};
export type Data = {
  translationEndpoint?: string;
  profile: Profile | null;
  messages: Message[];
  bookings: Booking[];
  replies: Reply[];
  reviews: Review[];
  reviewReplies?: ReviewReply[];
};
