import { View } from "react-native";
import { Avatar, Chips, Hero } from "../../components/studio";
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
  PreviewText,
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
    <Page title="Messages" subtitle="Customer conversations, all in one place.">
      <Hero eyebrow="THE CONVERSATION DESK" title="A warm welcome,
in every language." />
      <Field label="Search customers or messages" value={q} onChange={setQ} />
      <Chips options={[{label: "All conversations", value: "all"}, {label: "Needs attention", value: "new"}]} value={unread ? "new" : "all"} onChange={v => setUnread(v === "new")} />
      {rows.map((m) => (
        <Card key={m.id} onPress={() => router.push(`/messages/${m.id}`)}>
          <Badge label={`${m.language}${m.unread ? " · New" : ""}`} />
          <View style={{flexDirection: "row", gap: 12, alignItems: "center"}}><Avatar name={m.guest} /><Heading>{m.guest}</Heading></View>
          {m.demo && (
            <Badge
              warn
              label={`Demo intent: ${{ m1: "Booking request", m2: "Price inquiry", m3: "Directions", m4: "Needs review" }[m.id as "m1" | "m2" | "m3" | "m4"] ?? "Needs review"}`}
            />
          )}
          <PreviewText>{m.text}</PreviewText>
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
