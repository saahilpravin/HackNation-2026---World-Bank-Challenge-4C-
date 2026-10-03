import { useState } from "react";
import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Badge,
  Button,
  Muted,
} from "../../components/ui";
import { useStore } from "../../state/store";
export default function Bookings() {
  const { data } = useStore();
  const [pending, setPending] = useState(false);
  const rows =
    data?.bookings
      .filter((b) =>
        pending ? b.status === "pending" : b.status !== "cancelled",
      )
      .sort((a, b) =>
        `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`),
      ) ?? [];
  return (
    <Page
      title="Your bookings"
      subtitle="Small groups. Meaningful experiences."
    >
      <Button
        label={
          pending ? "Pending requests · show all" : "Show pending requests"
        }
        secondary
        onPress={() => setPending(!pending)}
      />
      {rows.map((b) => (
        <Card key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
          <Badge label={b.status} warn={b.status === "pending"} />
          <Heading>{b.guest}</Heading>
          <Body>
            {b.date} · {b.time} · {b.guests} guests
          </Body>
          <Muted>{b.demo ? "Sample booking · " : ""}View details →</Muted>
        </Card>
      ))}
      {!rows.length && (
        <Card>
          <Body>No bookings in this view.</Body>
        </Card>
      )}
    </Page>
  );
}
