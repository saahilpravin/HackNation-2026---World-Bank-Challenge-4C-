import { useState } from "react";
import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Muted,
  Badge,
  Field,
  Button,
} from "../../components/ui";
import { useStore } from "../../state/store";
export default function Messages() {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const [unread, setUnread] = useState(false);
  const rows =
    data?.messages.filter(
      (m) =>
        (!unread || m.unread) &&
        `${m.guest} ${m.text}`.toLowerCase().includes(q.toLowerCase()),
    ) ?? [];
  return (
    <Page
      title="Visitor messages"
      subtitle="Every conversation starts a connection."
    >
      <Field label="Search visitors or messages" value={q} onChange={setQ} />
      <Button
        label={unread ? "Showing unread · show all" : "Show unread only"}
        secondary
        onPress={() => setUnread(!unread)}
      />
      {rows.map((m) => (
        <Card key={m.id} onPress={() => router.push(`/messages/${m.id}`)}>
          <Badge label={`${m.language}${m.unread ? " · New" : ""}`} />
          <Heading>{m.guest}</Heading>
          <Body>{m.text}</Body>
          <Muted>
            {m.demo ? "Sample message · demo AI available" : "Local message"} ·
            Open conversation →
          </Muted>
        </Card>
      ))}
      {!rows.length && (
        <Card>
          <Body>No messages match this search.</Body>
        </Card>
      )}
    </Page>
  );
}
