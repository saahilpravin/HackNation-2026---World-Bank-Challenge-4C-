import { ReviewAnalysis } from "../../components/review-analysis";
import { languageCode } from "../../ai/insights-api";
import { findReviewTranslation, saveReviewTranslation } from "../../ai/translation-cache";
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
  const cachedReading = findReviewTranslation(data?.reviewTranslations, id, review?.text ?? "", validLanguage(review?.language), readingLanguage);
  const [showOriginal, setShowOriginal] = useState(false);
  const [readingTranslation, setReadingTranslation] = useState("");
  const [readingStatus, setReadingStatus] = useState("");
  const [readingBusy, setReadingBusy] = useState(false);
  const readingRevision = useRef(0);
  const read = async () => {
    if (!review || readingBusy) return;
    if (cachedReading) { setReadingTranslation(cachedReading.text); setReadingStatus("Saved NLLB translation · available offline."); return; }
    const version = readingRevision.current;
    setReadingBusy(true); setReadingStatus("Translating review…");
    try {
      const output = await translateOnLaptop(review.text, validLanguage(review.language), readingLanguage, { endpoint: data?.translationEndpoint || "http://127.0.0.1:8085", token: translationToken });
      await update(d => ({ ...d, reviewTranslations: saveReviewTranslation(d.reviewTranslations, { reviewId: id, sourceText: review.text, from: validLanguage(review.language), to: readingLanguage, text: output.text, modelVersion: output.modelVersion ?? "NLLB", latencyMs: output.latencyMs ?? 0 }) }));
      if (version === readingRevision.current) { setReadingTranslation(output.text); setReadingStatus("NLLB translation · check the original when details matter."); }
    } catch(e) { if (version === readingRevision.current) setReadingStatus(e instanceof Error ? e.message : "Translation unavailable."); }
    finally { setReadingBusy(false); }
  };
  const [from, setFrom] = useState<ReplyLanguage>(validLanguage(savedDraft?.writingLanguage ?? saved?.writingLanguage ?? data?.profile?.language));
  const [to, setTo] = useState<ReplyLanguage>(validLanguage(savedDraft?.customerLanguage ?? saved?.customerLanguage ?? review?.language));
  const [draft, setDraft] = useState(savedDraft?.draft ?? saved?.draft ?? "");
  const [translated, setTranslated] = useState(savedDraft?.translatedText ?? (savedDraft ? "" : saved?.translatedText ?? ""));
  const [generation, setGeneration] = useState(savedDraft?.generation ?? saved?.generation);
  const [source, setSource] = useState<"manual" | "local-template" | "on-device-model" | "local-laptop-model">(savedDraft?.source ?? saved?.source ?? "manual");
  const [modelVersion, setModelVersion] = useState<string | null>(savedDraft?.modelVersion ?? saved?.modelVersion ?? null);
  const [latencyMs, setLatencyMs] = useState<number | undefined>(savedDraft?.latencyMs ?? saved?.latencyMs);
  const [translating, setTranslating] = useState(false);
  const [key, setKey] = useState(savedDraft?.translatedText ? replyKey(savedDraft.draft, savedDraft.writingLanguage, savedDraft.customerLanguage) : saved && !savedDraft ? replyKey(saved.draft, saved.writingLanguage, saved.customerLanguage) : "");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const invalidate = () => { revision.current++; setTranslated(""); setKey(""); setStatus(""); setModelVersion(null); setLatencyMs(undefined); };
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
    try { await update(d => ({...d,reviewDrafts:[...(d.reviewDrafts ?? []).filter(r => r.reviewId !== id),{reviewId:id,draft,writingLanguage:from,customerLanguage:to,translatedText:key === replyKey(draft, from, to) ? translated : undefined,source,modelVersion,latencyMs,generation,savedAt:new Date().toISOString()}]})); setStatus("Draft saved on this device. Come back whenever you’re ready."); }
    catch { setStatus("Could not save your draft. Please try again."); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (busy || translating || !translated.trim() || key !== replyKey(draft, from, to) || !review) return;
    setBusy(true);
    try {
      await update(d => ({ ...d, reviewDrafts: d.reviewDrafts?.filter(r => r.reviewId !== id), reviewReplies: [...(d.reviewReplies ?? []).filter(r => r.reviewId !== id), { reviewId: id, draft, writingLanguage: from, customerLanguage: to, translatedText: translated.trim(), source, modelVersion, latencyMs, generation, approvedAt: new Date().toISOString() }] }));
      setStatus("Approved reply saved on this device. Nothing has been posted to a review platform.");
    } catch { setStatus("Could not save. Please try again; your response is still here."); }
    finally { setBusy(false); }
  };
  if (!review) return <Page title="Review reply" back><Body>Review not found.</Body></Page>;
  return <Page title="Review details" subtitle="Understand the feedback. Make your reply count." back>
    <Card>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}><Avatar name={review.guest} /><View style={{ flex: 1, gap: 5 }}><Heading>{review.guest}</Heading><Stars rating={review.rating} /><Muted>{review.language ?? "Language unknown"} · {review.date ?? "Imported review"}</Muted></View></View>
      <Badge label={review.demo ? "Synthetic sample review" : "Imported feedback"} />
      <LanguagePicker label="Read this review in" languages={replyLanguages} value={readingLanguage} onChange={l => { readingRevision.current++; setReadingLanguage(validLanguage(l)); setReadingTranslation(""); setReadingStatus(""); }} />
      <Body>{readingLanguage === review.language ? review.text : review.fixtureTranslations?.[readingLanguage] ?? (cachedReading?.text || readingTranslation || review.text)}</Body>
      {readingLanguage !== review.language && !review.fixtureTranslations?.[readingLanguage] && !cachedReading && <Button label={readingBusy ? "Translating…" : `Translate review to ${readingLanguage}`} disabled={readingBusy} onPress={() => void read()} secondary />}
      {readingLanguage !== review.language && !!review.fixtureTranslations?.[readingLanguage] && <Muted>{readingLanguage === "English" ? "Authored English version of this sample scenario" : "Cached sample translation · NLLB · not human reviewed"}</Muted>}
      {readingLanguage !== review.language && <Button secondary label={showOriginal ? "Hide original review" : "Show original review"} onPress={() => setShowOriginal(!showOriginal)} />}
      {showOriginal && readingLanguage !== review.language && <Body>{review.text}</Body>}
      {cachedReading && <Muted>Saved NLLB translation · available offline · check meaning before use.</Muted>}
      {!!readingStatus && <Notice text={readingStatus} />}
    </Card>
    {(saved || review.exampleResponse) && <Card><Badge label={saved ? "Approved on this device" : "Example · already answered"} /><Heading>Previous response</Heading><Body>{saved?.translatedText ?? review.exampleResponse?.text}</Body><Muted>{saved?.approvedAt.slice(0,10) ?? review.exampleResponse?.respondedAt} · {saved?.customerLanguage ?? review.exampleResponse?.language}</Muted></Card>}
    <ReviewAnalysis review={review} onUse={example => {
      if (draft.trim()) { setStatus("Your existing draft is kept. Clear it first to use an example response."); return; }
      const actualLanguage = replyLanguages.find(l => languageCode(l) === example.language);
      if (!actualLanguage) { setStatus("This example’s language is unavailable in the editor. Copy and check it manually."); return; }
      invalidate(); setFrom(actualLanguage); setDraft(example.text); setGeneration(example.generation); setSource(example.generation?.status === "generated" ? "local-laptop-model" : "local-template"); setStatus(`Example loaded in ${actualLanguage}. Edit it, then translate and approve.`);
    }} />
    <Card>
      <Heading>Respond to review</Heading>
      <LanguagePicker label="Your writing language" languages={replyLanguages} value={from} onChange={l => { invalidate(); setFrom(validLanguage(l)); }} disabled={busy} />
      <LanguagePicker label="Customer’s language" languages={replyLanguages} value={to} onChange={l => { invalidate(); setTo(validLanguage(l)); }} disabled={busy} />
      <Heading>Write your response</Heading>
      {generation && <Muted>{generation.status === "generated" ? `Started from a local ${generation.model} draft · edited text remains yours` : "Started from an authored template"}</Muted>}
      <Field label={`Your response (${from})`} value={draft} onChange={v => { if (!busy) { invalidate(); setDraft(v); } }} multiline />
      {savedDraft && <Muted>{savedDraft.draft === draft && savedDraft.writingLanguage === from && savedDraft.customerLanguage === to ? "Draft saved on this device" : "Unsaved edits · save your draft before leaving"}</Muted>}
      <Button secondary label={busy ? "Saving…" : "Save draft for later"} disabled={busy || translating || !draft.trim()} onPress={() => void saveDraft()} />
      <Button label={translating ? "Translating…" : `Translate to ${to}`} onPress={() => void translate()} disabled={!draft.trim() || busy || translating} />
      <Muted>{(data?.translationEndpoint || Platform.OS === "web") ? "NLLB translates through your connected laptop service. Keep the laptop running and your phone connected. This is not on-device phone inference." : "Connect your laptop in Offline & AI settings to translate custom text with NLLB. On-device NLLB is not installed."}</Muted>
    </Card>
    <Card><Heading>Customer-language response</Heading><Badge label={source === "manual" ? "Manually entered" : source === "local-laptop-model" ? "NLLB · Laptop model" : source === "on-device-model" ? "On-device model" : "Template / same-language text"} />
      <Field label={`Final response (${to})`} value={translated} onChange={v => { if (!busy && !translating) { setTranslated(v); setSource("manual"); setModelVersion(null); setLatencyMs(undefined); setKey(replyKey(draft, from, to)); setStatus(""); } }} multiline />
      {latencyMs !== undefined && <Muted>Translated in {(latencyMs / 1000).toFixed(1)} s</Muted>}
      <Muted>You can enter a translation yourself. Changing the draft or either language clears the previous version so you can check it again.</Muted>
      <Button label={busy ? "Saving…" : "Approve and save locally"} onPress={() => void approve()} disabled={busy || translating || !draft.trim() || !translated.trim() || key !== replyKey(draft, from, to)} />
    </Card>
    {!!status && <Notice text={status} />}
  </Page>;
}
