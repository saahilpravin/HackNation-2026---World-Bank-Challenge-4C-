import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Page, Card, Heading, Body, Badge, Muted, Notice, Button, Field } from "../../components/ui";
import { useStore } from "../../state/store";
import { replyLanguages } from "../../ai/review-replies";
import { analyzeFeedback } from "../../ai/feedback";

export default function Insights() {
  const { data, update } = useStore();
  const [demo, setDemo] = useState(false);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const [rating, setRating] = useState("5");
  const [language, setLanguage] = useState<string>("English");
  const [guest, setGuest] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const report = useMemo(() => analyzeFeedback(data ?? { reviews: [], messages: [] }, demo), [data, demo]);
  const hasDemo = data?.reviews.some(r => r.demo) || data?.messages.some(m => m.demo);
  const saveReview = async () => {
    const score = Number(rating);
    if (!text.trim() || !Number.isInteger(score) || score < 1 || score > 5) {
      setStatus("Enter review text and a whole-number rating from 1 to 5."); return;
    }
    setSaving(true);
    try {
      await update(d => ({ ...d, reviews: [...d.reviews, { id: `review-${Date.now()}-${Math.random().toString(36).slice(2)}`, guest: guest.trim() || "Visitor", text: text.trim(), rating: score, language, theme: "", demo: false }] }));
      setText(""); setGuest(""); setAdding(false); setDemo(false); setStatus("Review saved on this device. Insights updated.");
    } catch { setStatus("Could not save the review. Your entry is still here; please try again."); }
    finally { setSaving(false); }
  };
  return (
    <Page title="Insights" subtitle="Listen to visitors. Decide what to build next.">
      <Card>
        <Heading>Feedback assistant</Heading>
        <Body>Explore what visitors love, what they want improved, and ideas worth testing.</Body>
        <Badge label="Offline tool · Local rules" />
        <Muted>A small language model is not connected yet. This English keyword baseline can miss context, sarcasm and other languages. Check each finding against its evidence.</Muted>
        <Button label={adding ? "Close review form" : "Add a review"} onPress={() => setAdding(!adding)} secondary />
        {hasDemo && <Button label={demo ? "Use my business feedback" : "Explore sample feedback"} onPress={() => setDemo(!demo)} secondary />}
      </Card>
      {adding && <Card>
        <Heading>Add visitor feedback</Heading>
        <Muted>Paste a review you have permission to use. Saved locally; no automatic review import.</Muted>
        <Field label="Visitor name (optional)" value={guest} onChange={setGuest} />
        <Field label="Rating (1–5)" value={rating} onChange={setRating} keyboardType="numeric" />
        <Heading>Customer’s review language</Heading>
        {replyLanguages.map(l => <Button key={l} label={`${language === l ? "✓ " : ""}${l}`} onPress={() => setLanguage(l)} secondary={language !== l} />)}
        <Field label="Review text" value={text} onChange={setText} multiline />
        <Button label={saving ? "Saving…" : "Save review"} onPress={() => void saveReview()} disabled={saving} />
      </Card>}
      {!!status && <Notice text={status} />}
      {demo && <Notice text="Sample feedback only. These findings use seeded reviews and messages and do not measure model performance." />}
      <Card>
        <Heading>Respond to a review</Heading>
        <Muted>Write your own reply or start with an example, then review the customer-language version.</Muted>
        {(data?.reviews ?? []).filter(r => r.demo === demo).map(r => <Card key={r.id} onPress={() => router.push(`/reviews/${r.id}`)}>
          <Badge label={`${r.rating} / 5${r.demo ? " · Sample" : ""}`} />
          <Heading>{r.guest}</Heading><Body>{r.text}</Body><Muted>Write a reply →</Muted>
        </Card>)}
        {!(data?.reviews ?? []).some(r => r.demo === demo) && <Muted>Add a review to get started.</Muted>}
      </Card>
      <Muted>{report.analyzed} {demo ? "sample " : ""}reviews and messages scanned · {report.skipped} without a recognized topic. Counts represent records, not unique visitors or market demand.</Muted>
      {([
        { key: "love", title: "What visitors love", empty: "No clear praise recognized yet." },
        { key: "improve", title: "Requests and improvements", empty: "No requests for improvement recognized yet." },
        { key: "opportunity", title: "Ideas for your next offering", empty: "Add more feedback to find repeated praise. Ideas need at least two supporting records." },
      ] as const).map(section => <Card key={section.key}>
        <Heading>{section.title}</Heading>
        {!report.findings.some(f => f.category === section.key) && <Muted>{section.empty}</Muted>}
        {report.findings.filter(f => f.category === section.key).map(f => <Card key={f.id} onPress={() => router.push(`/insights/${f.id}?sample=${demo ? "1" : "0"}`)}>
          <Badge label={`${f.evidence.length} supporting records${f.evidence.length < 2 ? " · Early signal" : " · Repeated signal"}`} />
          <Heading>{f.title}</Heading><Body>{f.action}</Body><Muted>Read supporting feedback →</Muted>
        </Card>)}
      </Card>)}
    </Page>
  );
}
