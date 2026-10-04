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
  const [analysisAddress, setAnalysisAddress] = useState(data?.analysisEndpoint ?? "http://127.0.0.1:8080");
  const [analysisStatus, setAnalysisStatus] = useState("");
  const [analysisChecking, setAnalysisChecking] = useState(false);
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
  const connectAnalysis = async () => {
    setAnalysisChecking(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const address = normalizeEndpoint(analysisAddress);
      const response = await fetch(`${address}/v1/health`, { signal: controller.signal });
      const health = await response.json();
      if (!response.ok || health.model_ready !== true) throw new Error("Review model is not ready.");
      await update(d => ({ ...d, analysisEndpoint: address }));
      setAnalysisStatus(`Review service connected. ${health.llm?.ready ? "Local Qwen is ready for reply ideas and the review brief." : "Local Qwen is unavailable; saved results and counted findings still work."} Open Insights to load the findings.`);
    } catch { setAnalysisStatus("Cannot reach the review service. Check the address and start the Java backend."); }
    finally { clearTimeout(timeout); setAnalysisChecking(false); }
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
        <Heading>Review insights connection</Heading>
        <Field label="Review service address" value={analysisAddress} onChange={setAnalysisAddress} />
        <Muted>On this laptop use http://127.0.0.1:8080. On a phone, use the laptop’s private Wi-Fi address after enabling LAN binding. Local services still work without internet.</Muted>
        <Button label={analysisChecking ? "Connecting…" : "Test and save review service"} disabled={analysisChecking} onPress={() => void connectAnalysis()} />
        {!!analysisStatus && <Notice text={analysisStatus} />}
        <Muted>{data?.insightsCache ? "A review insight result is saved on this device." : "No review insights saved yet."}</Muted>
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
        <Badge label="Review insights · local classifier" />
        <Body>Insights loads aspect findings from the local Java backend and saves them on this device. Local Qwen writes the review brief and optional response ideas; you edit and approve every reply.</Body>
        <Badge label="Qwen · local laptop model" /><Body>After setup, Qwen drafts replies and summarizes saved findings without internet on the laptop. Previously saved results remain available when that service is disconnected.</Body>
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
