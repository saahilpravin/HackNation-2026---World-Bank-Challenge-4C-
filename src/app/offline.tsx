import { router } from "expo-router";
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
          Business details, bookings, reviews and saved responses are stored
          locally.
        </Body>
        <Muted>
          {Platform.OS === "web"
            ? "Browser preview storage: localStorage."
            : "Native storage: SQLite with WAL journal."}
        </Muted>
      </Card>
      <Card>
        <Heading>Review intelligence</Heading>
        <Badge label={data?.reviewAnalysis?"Analysis saved on this device":"Local laptop setup"}/>
        <Body>MiniLM classifies review topics and sentiment. A separate small Qwen language model suggests ideas from the measured evidence. Both run on your laptop.</Body>
        <Muted>{data?.reviewAnalysis?`Last run: ${data.reviewAnalysis.savedAt.slice(0,16).replace("T"," ")} · ${data.reviewAnalysis.result.reviews.length} reviews. Saved findings can be read offline.`:"Start the local review backend and Ollama, then open Insights in the laptop browser."}</Muted>
        <Muted>The laptop browser can perform fresh analysis with Wi-Fi off. A physical phone retains saved records; fresh on-phone inference is not installed.</Muted>
        <Button label="Open Insights" secondary onPress={()=>router.navigate("/insights")}/>
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
        <Heading>What works offline</Heading>
        <Badge label="Ready on this device" />
        <Body>Read the bundled sample reviews, reopen saved NLLB translations in any previously translated language, save drafts and approved replies, edit your business, and manage bookings.</Body>
        <Muted>Native app records are stored in SQLite. The web preview uses browser storage. The first Expo Go load needs a connection; a standalone installed app is the more reliable offline demo.</Muted>
      </Card>
      <Card>
        <Heading>Your AI tools</Heading>
        <Badge label="Translation · laptop connection" />
        <Body>Custom NLLB translation runs on your laptop. After the model is downloaded, it can work without internet while your phone remains connected to the same local Wi-Fi.</Body>
        <Badge label="Review assistant · example mode" />
        <Body>Suggested replies are authored examples. Insights use local rules and curated experiments. Your teammate’s model is not connected yet.</Body>
        <Muted>No model runs on this phone yet. Fully disconnected phone AI needs a compact model and a native inference runtime.</Muted>
      </Card>
      <Card>
        <Heading>Saved responses</Heading>
        <Body>{data?.reviewDrafts?.length ?? 0} drafts · {data?.reviewReplies?.length ?? 0} approved review replies</Body>
        <Muted>Your responses stay on this device. Lauda does not automatically post to review platforms.</Muted>
      </Card>
    </Page>
  );
}
