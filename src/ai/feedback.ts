import type { Data } from "../data/types.ts";

export type Evidence = { id: string; kind: "review" | "message"; guest: string; text: string; demo: boolean; canonicalEnglish?: string };
export type Finding = { id: string; category: "love" | "improve" | "opportunity"; title: string; action: string; evidence: Evidence[] };
export type FeedbackReport = { source: "local-rules" | "on-device-model"; modelVersion: string | null; analyzed: number; skipped: number; findings: Finding[] };
// A model adapter must return only source IDs present in the supplied corpus.
// Review text is untrusted input, never instructions to the model or operator.
export interface FeedbackProvider { analyze(data: Pick<Data, "reviews" | "messages">): Promise<FeedbackReport> }
const topics = [
  { id: "tasting", label: "Tasting", pattern: /\b(tasting|taste|coffee|food)\b/i, action: "Test a dedicated tasting experience with a small group before investing." },
  { id: "directions", label: "Getting here", pattern: /\b(directions|arrival|road|bus|sign|location|find)\b/i, action: "Send clear directions and arrival instructions before each booking." },
  { id: "learning", label: "Learning and local stories", pattern: /\b(learning|learn|stories|grower|growing|workshop)\b/i, action: "Try a hands-on workshop or a deeper storytelling session." },
  { id: "accessibility", label: "Accessibility", pattern: /\b(accessible|accessibility|wheelchair|steps)\b/i, action: "Check access needs with visitors and publish verified accessibility details." },
  { id: "family", label: "Family visits", pattern: /\b(children|kids|family|families)\b/i, action: "Ask families what they need, then trial a family-friendly session." },
  { id: "time", label: "Time and pacing", pattern: /\b(wait|waiting|rushed|longer|shorter|duration)\b/i, action: "Trial a different schedule and collect feedback on the pace." },
  { id: "sunset", label: "Evening experiences", pattern: /\b(sunset|evening)\b/i, action: "Test interest in a capped sunset session before adding it to the schedule." },
  { id: "retail", label: "Take-home products", pattern: /\b(gift|pack|beans|brewing)\b/i, action: "Try pre-orders for a small gift pack before committing to stock." },
  { id: "sustainability", label: "Sustainable growing", pattern: /\b(composting|sustainable|sustainability)\b/i, action: "Pilot a practical growing workshop with a small group." },
];
const praise = /\b(love[ds]?|great|wonderful|highlight|special|enjoyed|excellent)\b/i;
const request = /\b(wish|would|could|hard|difficult|need|needs|rushed|waiting|can|how|where)\b/i;
const negatedPraise = /\b(not|never|didn't|wasn't|weren't|don't|did not|was not)\b/i;

export function analyzeFeedback(data: Pick<Data, "reviews" | "messages">, demo: boolean): FeedbackReport {
  const corpus: Evidence[] = [
    ...data.reviews.filter(r => r.demo === demo).map(r => ({ ...r, kind: "review" as const })),
    ...data.messages.filter(m => m.demo === demo).map(m => ({ ...m, kind: "message" as const })),
  ];
  const findings: Finding[] = [];
  const matched = new Set<string>();
  for (const topic of topics) {
    const positive: Evidence[] = [], needs: Evidence[] = [];
    for (const item of corpus) {
      // Match signals in the same clause to avoid transferring praise across "but".
      const analysisText = item.demo && item.canonicalEnglish ? item.canonicalEnglish : item.text;
      const clauses = analysisText.split(/[.!?;]|\bbut\b/i).filter(c => topic.pattern.test(c));
      if (!clauses.length) continue;
      matched.add(`${item.kind}:${item.id}`);
      if (item.kind === "review" && clauses.some(c => praise.test(c) && !negatedPraise.test(c))) positive.push(item);
      if (clauses.some(c => request.test(c))) needs.push(item);
    }
    if (positive.length) findings.push({ id: `love-${topic.id}`, category: "love", title: topic.label, action: "Keep this part of the experience visible in your offer. Verify the interpretation in the original feedback.", evidence: positive });
    if (needs.length) findings.push({ id: `improve-${topic.id}`, category: "improve", title: topic.label, action: topic.id === "directions" ? topic.action : "Review these requests with visitors before changing the offer. Questions can indicate information gaps rather than complaints.", evidence: needs });
    if (positive.length >= 2) findings.push({ id: `opportunity-${topic.id}`, category: "opportunity", title: topic.label, action: topic.action, evidence: positive });
  }
  return { source: "local-rules", modelVersion: null, analyzed: corpus.length, skipped: corpus.length - matched.size, findings };
}
export const localFeedback: FeedbackProvider = {
  async analyze(data) { return analyzeFeedback(data, false); },
};
