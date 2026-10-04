import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Muted,
  Badge,
  Field,
  Button,
  Notice,
  Loading,
} from "../../components/ui";
import { useStore } from "../../state/store";
import { demoAI, Understanding } from "../../ai/provider";
import { approveReply } from "../../data/rules";
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, update } = useStore();
  const m = data?.messages.find((m) => m.id === id);
  const [ai, setAI] = useState<Understanding | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const queued = data?.replies.find((r) => r.messageId === id);
  useEffect(() => {
    let active = true;
    if (m && data?.profile)
      demoAI
        .analyze(m, data.profile)
        .then((a) => {
          if (active) {
            setAI(a);
            setReply(a.suggestion ?? "");
          }
        })
        .catch((e) => setError(String(e)));
    return () => {
      active = false;
    };
  }, [m, data?.profile]);
  async function approve() {
    setBusy(true);
    setError("");
    try {
      await update((d) => approveReply(d, id, reply));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (!data) return <Loading />;
  if (!m)
    return (
      <Page title="Message not found" back>
        <Body>This message is no longer available.</Body>
      </Page>
    );
  return (
    <Page
      title={m.guest}
      subtitle={`${m.language} · customer conversation`}
      back
    >
      <Card>
        <Badge label={m.demo ? "Sample customer message" : "Local message"} />
        <Heading>Original message</Heading>
        <Body>{m.text}</Body>
      </Card>
      <Card>
        <Badge label="Scripted AI example · unmeasured" warn />
        <Heading>Understanding</Heading>
        <Body>{ai?.intent ?? "Loading example…"}</Body>
        <Muted>Model confidence: unavailable. No model has run.</Muted>
        <Heading>Translation into English</Heading>
        <Body>
          {ai?.translation ??
            "Translation unavailable. Please review the original with a speaker of this language."}
        </Body>
        {ai &&
          Object.entries(ai.fields).map(([k, v]) => (
            <Body key={k}>
              {k}: {v}
            </Body>
          ))}
      </Card>
      {ai?.intent === "Needs review" && (
        <Notice text="Human review needed. Do not infer accessibility or other business facts from this message." />
      )}
      <Card>
        <Heading>{queued ? "Approved reply" : "Review your reply"}</Heading>
        {queued ? (
          <>
            <Body>{queued.text}</Body>
            <Badge label="Approved · saved to local outbox" />
            <Muted>
              Nothing has been sent. A messaging transport is not connected.
            </Muted>
          </>
        ) : (
          <>
            <Muted>
              Edit the suggested reply and verify all business facts before
              approving. Approval only saves a local queue entry.
            </Muted>
            <Field
              label="Reply to customer"
              value={reply}
              onChange={setReply}
              multiline
            />
            {Boolean(error) && <Notice text={error} />}
            <Button
              label={busy ? "Saving…" : "Approve & queue locally"}
              disabled={busy || !reply.trim()}
              onPress={approve}
            />
          </>
        )}
      </Card>
    </Page>
  );
}
