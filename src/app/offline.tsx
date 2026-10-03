import { useState } from "react";
import { checkTranslationConnection, normalizeEndpoint } from "../ai/laptop-translation";
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
  Field,
  Button,
} from "../components/ui";
import { useStore } from "../state/store";
export default function Offline() {
  const { data } = useStore();
  if (!data) return <Page title="Offline & AI"><Muted>Loading your settings…</Muted></Page>;
  return <OfflineSettings />;
}
function OfflineSettings() {
  const { data, update, translationToken, setTranslationToken } = useStore();
  const [endpoint, setEndpoint] = useState(data?.translationEndpoint ?? "");
  const [token, setToken] = useState(translationToken);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [checking, setChecking] = useState(false);
  const connect = async () => {
    setChecking(true);
    try {
      const normalized = normalizeEndpoint(endpoint);
      await checkTranslationConnection({ endpoint: normalized, token: token.trim() });
      await update(d => ({ ...d, translationEndpoint: normalized }));
      setTranslationToken(token.trim());
      setConnectionStatus("Connected to NLLB. Translation runs on the laptop.");
    } catch (e) { setConnectionStatus(e instanceof Error ? e.message : "Cannot connect. Check your Wi-Fi and laptop service."); }
    finally { setChecking(false); }
  };
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
        <Heading>Connect mobile translation</Heading>
        <Badge label={data?.translationEndpoint ? "Laptop connection saved" : "Setup needed"} />
        <Body>Connect your phone to the same Wi-Fi as the laptop running NLLB.</Body>
        <Field label="Laptop translation address" value={endpoint} onChange={setEndpoint} />
        <Muted>For example http://192.168.1.20:8086. Use the address printed by the mobile bridge. Installed builds may require HTTPS.</Muted>
        <Field label="Pairing code" secure value={token} onChange={setToken} />
        <Muted>The pairing code stays in memory. Enter it again after restarting the app.</Muted>
        <Button label={checking ? "Connecting…" : "Test and save connection"} onPress={() => void connect()} disabled={checking} />
        {data?.translationEndpoint && <Button label="Disconnect laptop" secondary disabled={checking} onPress={() => { void update(d => ({ ...d, translationEndpoint: undefined })).then(() => { setTranslationToken(""); setEndpoint(""); setToken(""); setConnectionStatus("Laptop disconnected."); }).catch(() => setConnectionStatus("Could not disconnect. Try again.")); }} />}
        {!!connectionStatus && <Notice text={connectionStatus} />}
      </Card>
      <Card>
        <Heading>AI model status</Heading>
        <Badge label="No model installed" warn />
        <Body>
          Message understanding uses labelled demo fixtures. Review reply translation on mobile and web can connect to the laptop NLLB service. No on-device phone model is installed. Feedback analysis uses local English keyword rules.
        </Body>
        <Muted>
          Phone model performance and translation accuracy have not been measured.
        </Muted>
      </Card>
      <Card>
        <Heading>Local outbox</Heading>
        <Body>{data?.replies.length ?? 0} message replies queued locally · {data?.reviewReplies?.length ?? 0} review replies approved</Body>
        <Muted>
          Messaging transport is not connected. Replies stay on this device and
          are never automatically sent.
        </Muted>
      </Card>
      <Notice text="First installation needs internet. After installation, core data and these demo examples work offline. Real offline AI is remaining team work." />
    </Page>
  );
}
