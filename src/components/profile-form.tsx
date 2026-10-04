import { useState } from "react";
import { router } from "expo-router";
import { Button, Card, Field, Notice, Body } from "./ui";
import { emptyProfile, finishSetup } from "../data/profile";
import { useStore } from "../state/store";
export function ProfileForm({ onboarding = false }: { onboarding?: boolean }) {
  const { data, update } = useStore();
  const [p, setP] = useState(data?.profile ?? emptyProfile);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit() {
    setError("");
    if (
      !p.name.trim() ||
      !p.experience.trim() ||
      !p.language.trim() ||
      !(p.currency ?? "KES").trim() ||
      !Number.isFinite(p.price) ||
      p.price <= 0 ||
      !Number.isInteger(p.capacity) ||
      p.capacity < 1 ||
      !Number.isFinite(p.duration) ||
      p.duration <= 0
    ) {
      setError(
        "Please fill out the business details and use positive numbers. Capacity must be a whole number.",
      );
      return;
    }
    setBusy(true);
    try {
      await update((d) =>
        onboarding ? finishSetup(d, p) : { ...d, profile: p },
      );
      router.replace("/");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Body>
        {onboarding
          ? "Set up once. Your profile stays on this device."
          : "Your business facts guide suggested replies."}
      </Body>
      {(
        [
          "name",
          "ownerName",
          "experience",
          "currency",
          "language",
          "visitors",
          "hours",
        ] as const
      ).map((k) => (
        <Field
          key={k}
          label={
            {
              name: "Business name",
              ownerName: "Your name (optional)",
              currency: "Currency code (for example KES, USD, EUR)",
              experience: "Service or experience",
              language: "Your preferred review language",
              visitors: "Customer languages",
              hours: "Available days and booking times",
            }[k]
          }
          value={p[k] ?? ""}
          onChange={(v) => setP({ ...p, [k]: v })}
        />
      ))}
      {(["price", "duration", "capacity"] as const).map((k) => (
        <Field
          key={k}
          label={
            {
              price: `Price per participant (${p.currency ?? "KES"})`,
              duration: "Duration (minutes)",
              capacity: "Maximum participants per time slot",
            }[k]
          }
          value={String(p[k])}
          keyboardType="numeric"
          onChange={(v) => setP({ ...p, [k]: Number(v) })}
        />
      ))}
      {Boolean(error) && <Notice text={error} />}
      <Button
        label={
          busy
            ? "Saving…"
            : onboarding
              ? "Start my business dashboard"
              : "Save profile"
        }
        onPress={submit}
        disabled={busy}
      />
    </Card>
  );
}
