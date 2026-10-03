import { Text, View } from "react-native";
import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Muted,
  Badge,
  Button,
  s,
} from "../../components/ui";
import { useStore } from "../../state/store";
export default function Home() {
  const { data } = useStore();
  if (!data?.profile) return null;
  const unread = data.messages.filter((m) => m.unread).length;
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const tours = data.bookings.filter(
    (b) => b.date === key && b.status !== "cancelled",
  );
  return (
    <Page title="Karibu, Noor ☀" subtitle={data.profile.name}>
      <View style={s.hero}>
        <Badge label="Local data · works offline" />
        <Text style={s.heroTitle}>Good coffee brings people together.</Text>
        <Text style={s.heroText}>
          Let’s make every visitor feel welcome. Your messages, tours, and
          business details are right here.
        </Text>
        <Button
          label="Open visitor inbox →"
          onPress={() => router.push("/messages")}
        />
      </View>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Card onPress={() => router.push("/messages")}>
            <Heading>{unread} new</Heading>
            <Muted>visitor messages</Muted>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card onPress={() => router.push("/bookings")}>
            <Heading>{tours.length} tours</Heading>
            <Muted>scheduled today</Muted>
          </Card>
        </View>
      </View>
      <Heading>Today at the farm</Heading>
      {tours.length ? (
        tours.map((b) => (
          <Card key={b.id} onPress={() => router.push(`/bookings/${b.id}`)}>
            <Badge label={`${b.time} · ${b.status}`} />
            <Heading>{b.guest}</Heading>
            <Body>
              {b.guests} guests · {data.profile!.experience}
            </Body>
            <Muted>Sample booking</Muted>
          </Card>
        ))
      ) : (
        <Card>
          <Body>No tours today. Your next booking is a fresh opportunity.</Body>
        </Card>
      )}
      <Card onPress={() => router.push("/insights/directions")}>
        <Badge label="Demo insight" warn />
        <Heading>A smoother arrival</Heading>
        <Body>
          Two sample reviews mention finding the farm. Add clear directions to
          your visitor welcome.
        </Body>
        <Muted>See the evidence →</Muted>
      </Card>
      <Button
        label="Offline & AI status"
        secondary
        onPress={() => router.push("/offline")}
      />
    </Page>
  );
}
