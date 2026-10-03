import { suggestReviewResponse } from "../../ai/review-assistant";
import type { AssistantOutput } from "../../ai/assistant-contract";
import { Avatar, LanguagePicker, Stars } from "../../components/studio";
import { Platform, View } from "react-native";
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
  const { data, update, translationToken } = useStore();
  const review = data?.reviews.find(r => r.id === id);
  const saved = data?.reviewReplies?.find(r => r.reviewId === id);
  const savedDraft = data?.reviewDrafts?.find(r => r.reviewId === id);
  const validLanguage = (l?: string): ReplyLanguage => replyLanguages.find(v => v === l) ?? "English";
  const [readingLanguage, setReadingLanguage] = useState<ReplyLanguage>(validLanguage(data?.profile?.language));
  const [showOriginal, setShowOriginal] = useState(false);
  const [readingTranslation, setReadingTranslation] = useState("");
  const [readingStatus, setReadingStatus] = useState("");
  const [readingBusy, setReadingBusy] = useState(false);
  const readingRevision = useRef(0);
  const read = async () => {
    if (!review || readingBusy) return;
    const version = readingRevision.current;
    setReadingBusy(true); setReadingStatus("Translating review…");
    try {
      const output = await translateOnLaptop(review.text, validLanguage(review.language), readingLanguage, { endpoint: data?.translationEndpoint || "http://127.0.0.1:8085", token: translationToken });
      if (version === readingRevision.current) { setReadingTranslation(output.text); setReadingStatus("NLLB translation · check the original when details matter."); }
    } catch(e) { if (version === readingRevision.current) setReadingStatus(e instanceof Error ? e.message : "Translation unavailable."); }
    finally { setReadingBusy(false); }
  };
  const [from, setFrom] = useState<ReplyLanguage>(validLanguage(savedDraft?.writingLanguage ?? saved?.writingLanguage ?? data?.profile?.language));
  const [to, setTo] = useState<ReplyLanguage>(validLanguage(savedDraft?.customerLanguage ?? saved?.customerLanguage ?? review?.language));
  const [draft, setDraft] = useState(savedDraft?.draft ?? saved?.draft ?? "");
  const [example, setExample] = useState("");
  const [exampleInfo, setExampleInfo] = useState<AssistantOutput | null>(null);
  const [translated, setTranslated] = useState(savedDraft ? "" : saved?.translatedText ?? "");
  const [source, setSource] = useState<"manual" | "local-template" | "on-device-model" | "local-laptop-model">(saved?.source ?? "manual");
  const [modelVersion, setModelVersion] = useState<string | null>(saved?.modelVersion ?? null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(saved?.latencyMs);
  const [translating, setTranslating] = useState(false);
  const [key, setKey] = useState(saved && !savedDraft ? replyKey(saved.draft, saved.writingLanguage, saved.customerLanguage) : "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const invalidate = () => { revision.current++; setTranslated(""); setKey(""); setStatus(""); setModelVersion(null); setLatencyMs(undefined); };
  const suggest = async () => {
    if (!review || !data?.profile || busy) return;
    const version = revision.current; setBusy(true);
    try { const output = await suggestReviewResponse(review, data.profile, from); if (version === revision.current) { setExample(output.text); setExampleInfo(output); } }
    catch(e) { if (version === revision.current) setStatus(e instanceof Error ? e.message : "Assistant unavailable. You can still write your response."); }
    finally { setBusy(false); }
  };
  const translate = async () => {
    if (translating) return;
    const version = revision.current;
    setTranslating(true);
    setStatus("Translating…");
    try {
      const output = (data?.translationEndpoint || Platform.OS === "web") ? await translateOnLaptop(draft, from, to, { endpoint: data?.translationEndpoint || "http://127.0.0.1:8085", token: translationToken }) : await templateReplies.translate(draft, from, to);
      if (version !== revision.current) return;
      setTranslated(output.text); setSource(output.source); setModelVersion(output.modelVersion); setLatencyMs(output.latencyMs); setKey(replyKey(draft, from, to)); setStatus(from === to ? "Same language: your response is shown unchanged." : output.source === "local-laptop-model" ? "NLLB translation ready. Check meaning and details before approval." : "Template language version ready. Check the wording before approval.");
    } catch (e) { if (version === revision.current) setStatus(e instanceof Error ? e.message : "Translation unavailable."); }
    finally { setTranslating(false); }
  };
  const saveDraft = async () => {
    if (!review || busy || !draft.trim()) return;
    setBusy(true);
    try { await update(d => ({...d,reviewDrafts:[...(d.reviewDrafts ?? []).filter(r => r.reviewId !== id),{reviewId:id,draft,writingLanguage:from,customerLanguage:to,savedAt:new Date().toISOString()}]})); setStatus("Draft saved on this device. Come back whenever you’re ready."); }
    catch { setStatus("Could not save your draft. Please try again."); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!translated.trim() || key !== replyKey(draft, from, to) || !review) return;
    setBusy(true);
    try {
      await update(d => ({ ...d, reviewDrafts: d.reviewDrafts?.filter(r => r.reviewId !== id), reviewReplies: [...(d.reviewReplies ?? []).filter(r => r.reviewId !== id), { reviewId: id, draft, writingLanguage: from, customerLanguage: to, translatedText: translated.trim(), source, modelVersion, latencyMs, approvedAt: new Date().toISOString() }] }));
      setStatus("Approved reply saved on this device. Nothing has been posted to a review platform.");
    } catch { setStatus("Could not save. Please try again; your response is still here."); }
    finally { setBusy(false); }
  };
  if (!review) return <Page title="Review reply" back><Body>Review not found.</Body></Page>;
  return <Page title="Reply to a review" subtitle="Your words, checked before sharing." back>
    <Card>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Avatar name={review.guest} /><View style={{ flex: 1, gap: 5 }}><Heading>{review.guest}</Heading><Stars rating={review.rating} /><Muted>{review.language ?? "Language unknown"} · {review.date ?? "Imported review"}</Muted></View></View>
      <Badge label={review.demo ? "Synthetic sample review" : "Imported feedback"} />
      <LanguagePicker label="Read this review in" languages={replyLanguages} value={readingLanguage} onChange={l => { readingRevision.current++; setReadingLanguage(validLanguage(l)); setReadingTranslation(""); setReadingStatus(""); }} />
      <Body>{readingLanguage === review.language ? review.text : review.fixtureTranslations?.[readingLanguage] ?? (readingTranslation || review.text)}</Body>
      {readingLanguage !== review.language && !review.fixtureTranslations?.[readingLanguage] && <Button label={readingBusy ? "Translating…" : `Translate review to ${readingLanguage}`} disabled={readingBusy} onPress={() => void read()} secondary />}
      {readingLanguage !== review.language && !!review.fixtureTranslations?.[readingLanguage] && <Muted>{readingLanguage === "English" ? "Authored English version of this sample scenario" : "Cached sample translation · NLLB · not human reviewed"}</Muted>}
      {readingLanguage !== review.language && <Button secondary label={showOriginal ? "Hide original review" : "Show original review"} onPress={() => setShowOriginal(!showOriginal)} />}
      {showOriginal && readingLanguage !== review.language && <Body>{review.text}</Body>}
      {!!readingStatus && <Notice text={readingStatus} />}
    </Card>
    {(saved || review.exampleResponse) && <Card><Badge label={saved ? "Approved on this device" : "Example · already answered"} /><Heading>Previous response</Heading><Body>{saved?.translatedText ?? review.exampleResponse?.text}</Body><Muted>{saved?.approvedAt.slice(0,10) ?? review.exampleResponse?.respondedAt} · {saved?.customerLanguage ?? review.exampleResponse?.language}</Muted></Card>}
    <Card>
      <Heading>Make it your own</Heading>
      <LanguagePicker label="Your writing language" languages={replyLanguages} value={from} onChange={l => { invalidate(); setFrom(validLanguage(l)); setExample(""); }} disabled={busy} />
      <LanguagePicker label="Customer’s language" languages={replyLanguages} value={to} onChange={l => { invalidate(); setTo(validLanguage(l)); }} disabled={busy} />
    </Card>
    <Card>
      <Heading>Suggested response</Heading><Badge label={exampleInfo && exampleInfo.source !== "authored-example" ? `AI draft · ${exampleInfo.source}` : "Offline example · Authored template"} />
      <Muted>{exampleInfo && exampleInfo.source !== "authored-example" ? `Model: ${exampleInfo.modelVersion}. Review the draft before using it.` : "Optional wording to get you started. These authored examples use the rating; your teammate’s AI adapter will replace them."}</Muted>
      <Button label="Show example response" onPress={() => void suggest()} secondary disabled={busy} />
      {!!example && <><Body>{example}</Body><Button label="Use this example" onPress={() => { invalidate(); setDraft(example); }} disabled={busy} /></>}
    </Card>
    <Card><Heading>Write your response</Heading>
      <Field label={`Your response (${from})`} value={draft} onChange={v => { if (!busy) { invalidate(); setDraft(v); } }} multiline />
      {savedDraft && <Muted>{savedDraft.draft === draft && savedDraft.writingLanguage === from && savedDraft.customerLanguage === to ? "Draft saved on this device" : "Unsaved edits · save your draft before leaving"}</Muted>}
      <Button secondary label={busy ? "Saving…" : "Save draft for later"} disabled={busy || translating || !draft.trim()} onPress={() => void saveDraft()} />
      <Button label={translating ? "Translating…" : `Translate to ${to}`} onPress={() => void translate()} disabled={!draft.trim() || busy || translating} />
      <Muted>{(data?.translationEndpoint || Platform.OS === "web") ? "NLLB translates through your connected laptop service. Keep the laptop running and your phone connected. This is not on-device phone inference." : "Connect your laptop in Offline & AI settings to translate custom text with NLLB. On-device NLLB is not installed."}</Muted>
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
