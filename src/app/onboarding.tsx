import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Page,
  Notice,
  Loading,
  Button,
  Muted,
  colors,
  s,
} from "../components/ui";
import { ProfileForm } from "../components/profile-form";
import { demoData, demoProfile } from "../data/demo";
import { useStore } from "../state/store";
export default function Onboarding() {
  const { data, error, update } = useStore();
  const [setup, setSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  async function explore() {
    setBusy(true);
    try {
      await update(() => ({ ...demoData(), profile: demoProfile }));
      router.replace("/");
    } catch (e) {
      setFailure(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (error) return <Notice text={error} />;
  if (!data) return <Loading />;
  if (data.profile) return <Redirect href="/" />;
  if (setup)
    return (
      <Page
        title="Make it yours."
        subtitle="Tell Lauda about your business."
        showProfile={false}
      >
        <Button
          label="Back to welcome"
          secondary
          onPress={() => setSetup(false)}
        />
        <ProfileForm onboarding />
      </Page>
    );
  return (
    <Page
      title="Welcome to Lauda"
      subtitle="Messages, bookings, and feedback in one place."
      showProfile={false}
    >
      <View style={s.hero}>
        <Text style={s.heroTitle}>A clearer day for your business.</Text>
        <Text style={s.heroText}>
          Keep your records on your device. Set up your business or try the
          sample workspace.
        </Text>
      </View>
      <View style={{ gap: 14, marginVertical: 4 }}>
        {[
          {
            icon: "chatbubbles-outline",
            title: "Understand every conversation",
            text: "Review messages, translations, and replies in one place.",
          },
          {
            icon: "calendar-outline",
            title: "Keep your day organized",
            text: "Manage bookings around your availability.",
          },
          {
            icon: "lock-closed-outline",
            title: "Your workspace stays with you",
            text: "Business details and saved records stay on your device.",
          },
        ].map((item) => (
          <View
            key={item.title}
            style={{ flexDirection: "row", gap: 14, alignItems: "center" }}
          >
            <View style={[s.avatar, { borderRadius: 12 }]}>
              <Ionicons
                name={item.icon as "chatbubbles-outline"}
                size={21}
                color={colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { fontSize: 15 }]}>{item.title}</Text>
              <Muted>{item.text}</Muted>
            </View>
          </View>
        ))}
      </View>
      <Button label="Set up my business" onPress={() => setSetup(true)} />
      <Button
        label={busy ? "Opening demo…" : "Explore Noor’s demo business"}
        secondary
        onPress={explore}
        disabled={busy}
      />
      {Boolean(failure) && <Notice text={failure} />}
      <Muted>
        The demo uses a coffee farm with sample records and scripted AI
        examples. No model is installed yet.
      </Muted>
    </Page>
  );
}
