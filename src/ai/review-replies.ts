import type { Review } from "../data/types.ts";
export const replyLanguages = ["English", "French", "Kiswahili"] as const;
export type ReplyLanguage = typeof replyLanguages[number];
export type ReplyOutput = { text: string; source: "local-template" | "on-device-model"; modelVersion: string | null };
export interface ReviewReplyProvider {
  suggest(review: Review, language: ReplyLanguage): Promise<ReplyOutput>;
  translate(text: string, from: ReplyLanguage, to: ReplyLanguage): Promise<ReplyOutput>;
}
// These are authored templates, not generated AI or general-purpose translation.
const templates = {
  positive: {
    English: "Thank you for sharing your experience. We’re happy you enjoyed your visit and appreciate your feedback.",
    French: "Merci d’avoir partagé votre expérience. Nous sommes heureux que votre visite vous ait plu et vous remercions pour votre avis.",
    Kiswahili: "Asante kwa kushiriki uzoefu wako. Tunafurahi kwamba ulifurahia ziara yako na tunathamini maoni yako.",
  },
  neutral: {
    English: "Thank you for taking the time to share your feedback. We appreciate hearing what worked well and what could be better.",
    French: "Merci d’avoir pris le temps de partager votre avis. Nous apprécions de savoir ce qui vous a plu et ce qui pourrait être amélioré.",
    Kiswahili: "Asante kwa kutenga muda kushiriki maoni yako. Tunathamini kusikia mambo yaliyokufurahisha na yanayoweza kuboreshwa.",
  },
  negative: {
    English: "Thank you for your honest feedback. We’re sorry your experience did not meet your expectations. We would appreciate more details so we can understand your concerns.",
    French: "Merci pour votre avis sincère. Nous sommes désolés que votre expérience n’ait pas répondu à vos attentes. Nous aimerions en savoir davantage pour comprendre vos préoccupations.",
    Kiswahili: "Asante kwa maoni yako ya dhati. Tunasikitika kwamba uzoefu wako haukukidhi matarajio yako. Tungependa kupata maelezo zaidi ili kuelewa matatizo uliyokumbana nayo.",
  },
};
export const templateReplies: ReviewReplyProvider = {
  async suggest(review, language) {
    const tone = review.rating === 5 ? "positive" : review.rating >= 3 ? "neutral" : "negative";
    return { text: templates[tone][language], source: "local-template", modelVersion: null };
  },
  async translate(text, from, to) {
    if (!text.trim()) throw new Error("Write a response first.");
    if (from === to) return { text, source: "local-template", modelVersion: null };
    for (const template of Object.values(templates)) {
      if (text === template[from]) return { text: template[to], source: "local-template", modelVersion: null };
    }
    throw new Error("Custom-text translation needs a connected language model. Your draft is saved in the form. You can use the unchanged example for a template translation, or enter a translation yourself.");
  },
};
export const replyKey = (text: string, from: string, to: string) => JSON.stringify([text, from, to]);
