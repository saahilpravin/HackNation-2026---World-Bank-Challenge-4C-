import { Platform } from "react-native";
import { useNetworkState } from "expo-network";
import {
  Page,
  Card,
  Heading,
  Body,
  Badge,
  Muted,
  Notice,
} from "../components/ui";
import { useStore } from "../state/store";
export default function Offline() {
  const { data } = useStore();
  const network = useNetworkState();
  return (
    <Page
      title="Offline & AI"
      subtitle="Know what’s ready on your device."
      back
    >
      <Card>
        <Badge
          label={
            network.isConnected === undefined
              ? "Checking connection"
              : network.isConnected
                ? "Device connected"
                : "Device offline"
          }
        />
        <Heading>Your business stays with you</Heading>
        <Body>
          Profile, messages, bookings, reviews and approved replies are stored
          locally.
        </Body>
        <Muted>
          {Platform.OS === "web"
            ? "Browser preview storage: localStorage."
            : "Native storage: SQLite with WAL journal."}
        </Muted>
      </Card>
      <Card>
        <Heading>AI model status</Heading>
        <Badge label="No model installed" warn />
        <Body>
          Understanding and translations currently use labelled demo fixtures.
        </Body>
        <Muted>
          Download size, inference latency, accuracy and confidence: not
          measured.
        </Muted>
      </Card>
      <Card>
        <Heading>Local outbox</Heading>
        <Body>{data?.replies.length ?? 0} approved replies waiting</Body>
        <Muted>
          Messaging transport is not connected. Replies stay on this device and
          are never automatically sent.
        </Muted>
      </Card>
      <Notice text="First installation needs internet. After installation, core data and these demo examples work offline. Real offline AI is remaining team work." />
    </Page>
  );
}
