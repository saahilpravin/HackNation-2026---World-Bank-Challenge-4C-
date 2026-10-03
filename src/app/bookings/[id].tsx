import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Badge,
  Field,
  Button,
  Notice,
  Loading,
} from "../../components/ui";
import { useStore } from "../../state/store";
import type { Booking } from "../../data/types";
import { validateBooking } from "../../data/rules";
function Editor({ booking }: { booking: Booking }) {
  const { data, update } = useStore();
  const [b, setB] = useState(booking);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function persist(status: Booking["status"]) {
    setError("");
    setSaved(false);
    const next = { ...b, status };
    const reason = validateBooking(
      next,
      data!.bookings,
      data!.profile!.capacity,
    );
    if (reason) {
      setError(reason);
      return;
    }
    setBusy(true);
    try {
      await update((d) => {
        const reason = validateBooking(next, d.bookings, d.profile!.capacity);
        if (reason) throw new Error(reason);
        return {
          ...d,
          bookings: d.bookings.map((row) => (row.id === b.id ? next : row)),
        };
      });
      setB(next);
      setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page title={b.guest} subtitle="Booking details" back>
      <Card>
        <Badge label={b.status} />
        <Heading>{data?.profile?.experience}</Heading>
        <Body>
          {b.guests * data!.profile!.price} KES total ·{" "}
          {data?.profile?.duration} minutes
        </Body>
        <Field
          label="Date (YYYY-MM-DD)"
          value={b.date}
          onChange={(v) => setB({ ...b, date: v })}
        />
        <Field
          label="Time (HH:mm)"
          value={b.time}
          onChange={(v) => setB({ ...b, time: v })}
        />
        <Field
          label="Guests"
          value={String(b.guests)}
          keyboardType="numeric"
          onChange={(v) => setB({ ...b, guests: Number(v) })}
        />
        <Field
          label="Notes"
          value={b.notes}
          onChange={(v) => setB({ ...b, notes: v })}
          multiline
        />
        {Boolean(error) && <Notice text={error} />}{" "}
        {saved && <Notice text="Booking saved on this device." />}
        <Button
          label="Save changes"
          onPress={() => persist(b.status)}
          disabled={busy}
        />
        <Button
          label="Confirm booking"
          onPress={() => persist("confirmed")}
          disabled={busy || b.status === "confirmed"}
        />
        <Button
          label="Cancel booking"
          secondary
          onPress={() => persist("cancelled")}
          disabled={busy || b.status === "cancelled"}
        />
        <Button
          label="Open visitor message"
          secondary
          onPress={() => router.push(`/messages/${b.messageId}`)}
        />
      </Card>
    </Page>
  );
}
export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  if (!data) return <Loading />;
  const b = data.bookings.find((b) => b.id === id);
  if (!b || !data.profile)
    return (
      <Page title="Booking not found" back>
        <Body>This booking is unavailable.</Body>
      </Page>
    );
  return <Editor key={b.id} booking={b} />;
}
