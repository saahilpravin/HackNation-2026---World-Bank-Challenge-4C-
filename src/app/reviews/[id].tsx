import { Platform } from "react-native";
import { translateOnLaptop } from "../../ai/laptop-translation";
import { useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Page, Card, Heading, Body, Badge, Button, Field, Muted, Notice } from "../../components/ui";
import { useStore } from "../../state/store";
import { replyLanguages, replyKey, templateReplies, type ReplyLanguage } from "../../ai/review-replies";

export default function ReviewReply() {
  const { data } = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!data) return <Page title="Review reply" back><Body>Loading saved feedback…</Body></Page>;
  return <ReplyForm key={id} />;
}
function ReplyForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, update } = useStore();
  const review = data?.reviews.find(r => r.id === id);
  const saved = data?.reviewReplies?.find(r => r.reviewId === id);
  const validLanguage = (l?: string): ReplyLanguage => replyLanguages.find(v => v === l) ?? "English";
  const [from, setFrom] = useState<ReplyLanguage>(validLanguage(saved?.writingLanguage ?? data?.profile?.language));
  const [to, setTo] = useState<ReplyLanguage>(validLanguage(saved?.customerLanguage ?? review?.language));
  const [draft, setDraft] = useState(saved?.draft ?? "");
  const [example, setExample] = useState("");
  const [translated, setTranslated] = useState(saved?.translatedText ?? "");
  const [source, setSource] = useState<"manual" | "local-template" | "on-device-model" | "local-laptop-model">(saved?.source ?? "manual");
  const [modelVersion, setModelVersion] = useState<string | null>(saved?.modelVersion ?? null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(saved?.latencyMs);
  const [translating, setTranslating] = useState(false);
  const [key, setKey] = useState(saved ? replyKey(saved.draft, saved.writingLanguage, saved.customerLanguage) : "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const invalidate = () => { revision.current++; setTranslated(""); setKey(""); setStatus(""); setModelVersion(null); setLatencyMs(undefined); };
  const suggest = async () => {
    if (!review) return;
    const version = revision.current;
    const output = await templateReplies.suggest(review, from);
    if (version === revision.current) setExample(output.text);
  };
  const translate = async () => {
    if (translating) return;
    const version = revision.current;
    setTranslating(true);
    setStatus("Translating…");
    try {
      const output = Platform.OS === "web" ? await translateOnLaptop(draft, from, to) : await templateReplies.translate(draft, from, to);
      if (version !== revision.current) return;
      setTranslated(output.text); setSource(output.source); setModelVersion(output.modelVersion); setLatencyMs(output.latencyMs); setKey(replyKey(draft, from, to)); setStatus(from === to ? "Same language: your response is shown unchanged." : output.source === "local-laptop-model" ? "NLLB translation ready. Check meaning and details before approval." : "Template language version ready. Check the wording before approval.");
    } catch (e) { if (version === revision.current) setStatus(e instanceof Error ? e.message : "Translation unavailable."); }
    finally { setTranslating(false); }
  };
  const approve = async () => {
    if (!translated.trim() || key !== replyKey(draft, from, to) || !review) return;
    setBusy(true);
    try {
      await update(d => ({ ...d, reviewReplies: [...(d.reviewReplies ?? []).filter(r => r.reviewId !== id), { reviewId: id, draft, writingLanguage: from, customerLanguage: to, translatedText: translated.trim(), source, modelVersion, latencyMs, approvedAt: new Date().toISOString() }] }));
      setStatus("Approved reply saved on this device. Nothing has been posted to a review platform.");
    } catch { setStatus("Could not save. Please try again; your response is still here."); }
    finally { setBusy(false); }
  };
  if (!review) return <Page title="Review reply" back><Body>Review not found.</Body></Page>;
  return <Page title="Reply to a review" subtitle="Your words, checked before sharing." back>
    <Card><Badge label={`${review.rating} / 5${review.demo ? " · Sample review" : ""}`} /><Heading>{review.guest}</Heading><Body>{review.text}</Body></Card>
    <Card>
      <Heading>Your writing language</Heading>
      {replyLanguages.map(l => <Button key={l} label={`${from === l ? "✓ " : ""}${l}`} onPress={() => { invalidate(); setFrom(l); setExample(""); }} secondary={from !== l} disabled={busy} />)}
      <Heading>Customer’s language</Heading><Muted>{review.language ? "Confirm the review’s language before replying." : "Language was not recorded. Choose it yourself; it has not been detected by AI."}</Muted>
      {replyLanguages.map(l => <Button key={l} label={`${to === l ? "✓ " : ""}${l}`} onPress={() => { invalidate(); setTo(l); }} secondary={to !== l} disabled={busy} />)}
    </Card>
    <Card>
      <Heading>Suggested response</Heading><Badge label="Offline example · Authored template" />
      <Muted>AI generation is awaiting a local model. This optional example uses the rating and is not a personalized analysis of the review.</Muted>
      <Button label="Show example response" onPress={() => void suggest()} secondary disabled={busy} />
      {!!example && <><Body>{example}</Body><Button label="Use this example" onPress={() => { invalidate(); setDraft(example); }} disabled={busy} /></>}
    </Card>
    <Card><Heading>Write your response</Heading>
      <Field label={`Your response (${from})`} value={draft} onChange={v => { if (!busy) { invalidate(); setDraft(v); } }} multiline />
      <Button label={translating ? "Translating…" : `Translate to ${to}`} onPress={() => void translate()} disabled={!draft.trim() || busy || translating} />
      <Muted>{Platform.OS === "web" ? "NLLB translates your custom text on this laptop. No cloud inference. This preview connection is not an on-device phone model." : "On-device NLLB is not installed. Native translation currently supports unchanged templates only."}</Muted>
    </Card>
    <Card><Heading>Customer-language response</Heading><Badge label={source === "manual" ? "Manually entered" : source === "local-laptop-model" ? "NLLB · Laptop model" : source === "on-device-model" ? "On-device model" : "Template / same-language text"} />
      <Field label={`Final response (${to})`} value={translated} onChange={v => { if (!busy && !translating) { setTranslated(v); setSource("manual"); setModelVersion(null); setLatencyMs(undefined); setKey(replyKey(draft, from, to)); setStatus(""); } }} multiline />
      {modelVersion && <Muted>{modelVersion}{latencyMs !== undefined ? ` · ${(latencyMs / 1000).toFixed(1)} s` : ""}</Muted>}
      <Muted>You can enter a translation yourself. Changing the draft or either language clears the previous version so you can check it again.</Muted>
      <Button label={busy ? "Saving…" : "Approve and save locally"} onPress={() => void approve()} disabled={busy || translating || !draft.trim() || !translated.trim() || key !== replyKey(draft, from, to)} />
    </Card>
    {!!status && <Notice text={status} />}
  </Page>;
}
