import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
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
      title={profile.ownerName ? `Hi, ${profile.ownerName}` : "Your workspace"}
      subtitle={profile.name}
    >
      {demo && <Badge label="Demo business" />}
      <View style={s.row}>
        {[
          {
            label: "New messages",
            value: unread,
            icon: "chatbubble-ellipses-outline",
            href: "/messages",
          },
          {
            label: "Pending bookings",
            value: pending,
            icon: "calendar-outline",
            href: "/bookings",
          },
        ].map((item) => (
          <View key={item.label} style={{ flex: 1 }}>
            <Card
              onPress={() =>
                router.navigate(item.href as "/messages" | "/bookings")
              }
            >
              <Ionicons
                name={item.icon as "calendar-outline"}
                size={22}
                color={colors.accent}
              />
              <Text
                style={{ fontSize: 28, fontWeight: "600", color: colors.ink }}
              >
                {item.value}
              </Text>
              <Muted>{item.label}</Muted>
            </Card>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Heading>Today’s bookings</Heading>
        <Text
          accessibilityRole="link"
          onPress={() => router.navigate("/bookings")}
          style={{ color: colors.accent, fontSize: 14, paddingVertical: 12 }}
        >
          View all →
        </Text>
      </View>
      {bookings.length ? (
        bookings.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              <View
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  backgroundColor: "#F0F3FA",
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{ color: colors.ink, fontSize: 16, fontWeight: "600" }}
                >
                  {b.time}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Heading>{b.guest}</Heading>
                <Muted>
                  {b.guests} participants · {b.status}
                </Muted>
              </View>
              <Ionicons name="chevron-forward" color={colors.muted} size={20} />
            </View>
            {b.demo && <Muted>Sample booking</Muted>}
          </Card>
        ))
      ) : (
        <Card>
          <Heading>No bookings today</Heading>
          <Muted>Check your upcoming bookings or pending requests.</Muted>
          <Button
            label="Open bookings"
            secondary
            onPress={() => router.navigate("/bookings")}
          />
        </Card>
      )}
      <Heading>Quick access</Heading>
      {[
        {
          icon: "chatbubbles-outline",
          title: "Customer messages",
          detail: "Read, translate, and review replies",
          href: "/messages",
        },
        {
          icon: "bar-chart-outline",
          title: "Customer feedback",
          detail: `${data.reviews.length} ${demo ? "sample " : ""}reviews in your workspace`,
          href: "/insights",
        },
        {
          icon: "shield-checkmark-outline",
          title: "Offline & AI",
          detail: "Check local storage and model readiness",
          href: "/offline",
        },
      ].map((item) => (
        <Card
          key={item.title}
          onPress={() =>
            router.navigate(item.href as "/messages" | "/insights" | "/offline")
          }
        >
          <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
            <Ionicons
              name={item.icon as "chatbubbles-outline"}
              size={24}
              color={colors.accent}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}
              >
                {item.title}
              </Text>
              <Muted>{item.detail}</Muted>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </Card>
      ))}
      {demo && (
        <Muted>
          Noor’s Coffee Farm is a sample business. AI examples are scripted.
        </Muted>
      )}
    </Page>
  );
}
