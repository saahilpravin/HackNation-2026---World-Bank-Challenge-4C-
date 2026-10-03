import type { Message, Profile } from "../data/types";
export type Understanding = {
  source: "demo-fixture" | "on-device-model";
  intent: string;
  translation: string | null;
  fields: { guests?: number; day?: string; time?: string };
  confidence: number | null;
  modelVersion: string | null;
  latencyMs: number | null;
  suggestion: string | null;
};
export interface AIProvider {
  analyze(message: Message, profile: Profile): Promise<Understanding>;
}
// Replace this adapter with measured on-device inference. Fixtures are never evidence of model performance.
export const demoAI: AIProvider = {
  async analyze(message, profile) {
    const base = {
      source: "demo-fixture" as const,
      confidence: null,
      modelVersion: null,
      latencyMs: null,
    };
    if (!message.demo)
      return {
        ...base,
        intent: "Needs review",
        translation: null,
        fields: {},
        suggestion: null,
      };
    switch (message.id) {
      case "m1":
        return {
          ...base,
          intent: "Booking request",
          translation:
            "Hello! There are four of us. Can we visit your farm tomorrow at 2 pm?",
          fields: { guests: 4, day: "Tomorrow (verify date)", time: "14:00" },
          suggestion: `Bonjour Camille ! Merci pour votre intérêt. La visite coûte ${profile.price} KES par personne et dure ${profile.duration} minutes. Je vais vérifier la disponibilité pour quatre personnes à 14 h et vous confirmer.`,
        };
      case "m2":
        return {
          ...base,
          intent: "Price inquiry",
          translation: message.text,
          fields: {},
          suggestion: `Hi Daniel! Our ${profile.experience} costs ${profile.price} KES per person and lasts ${profile.duration} minutes. Please tell me the children's ages so I can confirm the details.`,
        };
      case "m3":
        return {
          ...base,
          intent: "Directions",
          translation: "Hello! Where is your farm? Can we get there by bus?",
          fields: {},
          suggestion:
            "Habari Amina! Asante kwa ujumbe wako. Nitakutumia maelekezo ya kufika shambani na taarifa za basi baada ya kuthibitisha njia.",
        };
      default:
        return {
          ...base,
          intent: "Needs review",
          translation: null,
          fields: {},
          suggestion: null,
        };
    }
  },
};
