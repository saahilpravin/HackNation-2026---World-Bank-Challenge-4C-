import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Muted,
  Badge,
  Button,
  colors,
  s,
} from "../../components/ui";
import { isDemoProfile } from "../../data/profile";
import { useStore } from "../../state/store";
export default function Home() {
  const { data } = useStore();
  if (!data?.profile) return null;
  const profile = data.profile;
  const demo = isDemoProfile(profile);
  const unread = data.messages.filter((m) => m.unread).length;
  const pending = data.bookings.filter((b) => b.status === "pending").length;
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const bookings = data.bookings.filter(
    (b) => b.date === key && b.status !== "cancelled",
  );
  return (
    <Page
      title={
        profile.ownerName ? `Hello, ${profile.ownerName}.` : "Welcome back."
      }
      subtitle="A little clarity for your working day."
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={[s.avatar, { borderRadius: 12 }]}>
          <Ionicons name="storefront-outline" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.label, { fontSize: 15 }]}>{profile.name}</Text>
          <Muted>{profile.experience}</Muted>
        </View>
        {demo && <Badge label="Demo" />}
      </View>
      <View style={s.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="phone-portrait-outline" size={16} color="#B2F0DA" />
          <Text style={{ color: "#B2F0DA", fontWeight: "700", fontSize: 12 }}>
            YOUR LOCAL WORKSPACE
          </Text>
        </View>
        <Text style={s.heroTitle}>Your business. A little more in sync.</Text>
        <Text style={s.heroText}>
          Keep conversations moving and your next booking in view.
        </Text>
        <Button
          label="Open messages →"
          onPress={() => router.push("/messages")}
        />
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Card onPress={() => router.push("/messages")}>
            <Ionicons
              name="chatbubbles-outline"
              size={22}
              color={colors.accent}
            />
            <Text
              style={{ fontSize: 32, fontWeight: "800", color: colors.ink }}
            >
              {unread}
            </Text>
            <Muted>Unread messages</Muted>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card onPress={() => router.push("/bookings")}>
            <Ionicons name="calendar-outline" size={22} color={colors.accent} />
            <Text
              style={{ fontSize: 32, fontWeight: "800", color: colors.ink }}
            >
              {pending}
            </Text>
            <Muted>Pending bookings</Muted>
          </Card>
        </View>
      </View>
      <Heading>On the schedule</Heading>
      {bookings.length ? (
        bookings.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Badge label={b.time} />
              <Muted>{b.status}</Muted>
            </View>
            <Heading>{b.guest}</Heading>
            <Body>
              {b.guests} participants · {profile.experience}
            </Body>
            {b.demo && <Muted>Sample booking · demo business</Muted>}
          </Card>
        ))
      ) : (
        <Card>
          <Ionicons
            name="calendar-clear-outline"
            size={28}
            color={colors.accent}
          />
          <Heading>A little room in your day</Heading>
          <Body>No bookings scheduled for today.</Body>
          <Button
            label="View all bookings"
            secondary
            onPress={() => router.push("/bookings")}
          />
        </Card>
      )}
      <Heading>From your feedback</Heading>
      <Card onPress={() => router.push("/insights")}>
        <Badge
          label={data.reviews.length ? "Reviews available" : "Getting started"}
        />
        <Heading>
          {data.reviews.length
            ? "See what customers are saying"
            : "Make feedback part of your routine"}
        </Heading>
        <Body>
          {data.reviews.length
            ? `${data.reviews.length} ${demo ? "sample " : ""}reviews in your workspace. Open Insights to see the evidence.`
            : "Your customer reviews will appear here when you add or import them. Review collection is not connected yet."}
        </Body>
        <Muted>Open Insights →</Muted>
      </Card>
      <Card onPress={() => router.push("/offline")}>
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Ionicons
            name="shield-checkmark-outline"
            size={26}
            color={colors.accent}
          />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Saved on this device</Text>
            <Muted>Offline storage & AI status →</Muted>
          </View>
        </View>
      </Card>
      {demo && (
        <Muted>
          Exploring Lauda with Noor’s Coffee Farm. All sample messages,
          bookings, and reviews are demo data.
        </Muted>
      )}
    </Page>
  );
}
