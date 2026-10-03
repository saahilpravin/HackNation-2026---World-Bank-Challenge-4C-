import { router, useLocalSearchParams } from "expo-router";
import { Page, Card, Heading, Body, Badge, Notice, Button } from "../../components/ui";
import { useStore } from "../../state/store";
import { analyzeFeedback } from "../../ai/feedback";
export default function Evidence() {
  const { id, sample } = useLocalSearchParams<{ id: string; sample?: string }>();
  const { data } = useStore();
  const report = analyzeFeedback(data ?? { reviews: [], messages: [] }, sample === "1");
  const finding = report.findings.find(f => f.id === id);
  return (
    <Page title="Supporting feedback" subtitle={finding?.title} back>
      <Notice text="Local keyword interpretation. Read the original words before deciding what to change. Suggested experiments are not validated demand." />
      {finding && <Card><Heading>{finding.title}</Heading><Body>{finding.action}</Body></Card>}
      {finding?.evidence.map(e => <Card key={`${e.kind}:${e.id}`}>
        <Badge label={`${e.demo ? "Sample " : ""}${e.kind}`} />
        <Heading>{e.guest}</Heading><Body>“{e.text}”</Body>
        {e.kind === "message" && <Button label="Open message" onPress={() => router.push(`/messages/${e.id}`)} secondary />}
      </Card>)}
      {!finding && <Body>No supporting feedback found. Return to Insights to see current findings.</Body>}
    </Page>
  );
}
