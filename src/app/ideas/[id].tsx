import { router, useLocalSearchParams } from "expo-router";
import { ideasFor } from "../../ai/ideas";
import { useStore } from "../../state/store";
import { Hero, Stars } from "../../components/studio";
import { Page, Card, Heading, Body, Muted, Badge, Button } from "../../components/ui";
export default function IdeaDetail() {
  const { id, sample } = useLocalSearchParams<{ id: string; sample?: string }>();
  const { data } = useStore();
  const reviews = (data?.reviews ?? []).filter(r => !!r.demo === (sample === "1"));
  const idea = ideasFor(reviews).find(i => i.id === id);
  if (!idea) return <Page title="Idea lab" back><Body>No supporting feedback for this idea yet.</Body></Page>;
  return <Page title="Idea lab" subtitle="Small experiments. Real learning." back>
    <Hero eyebrow={idea.effort.toUpperCase()} title={idea.title} />
    <Badge label="Curated example · validate before investing" />
    <Card><Heading>The opportunity</Heading><Body>{idea.summary}</Body><Muted>Inspired by {idea.evidence.length} {idea.evidence.every(r => r.demo) ? "synthetic sample" : "tagged"} reviews. This is an experiment idea, not a demand forecast.</Muted></Card>
    <Card><Heading>Try this first</Heading><Body>{idea.plan}</Body><Heading>How to learn from it</Heading><Body>{idea.measure}</Body></Card>
    <Heading>What visitors said</Heading>
    {idea.evidence.filter((r,i,all) => all.findIndex(other => (other.canonicalEnglish ?? other.text) === (r.canonicalEnglish ?? r.text)) === i).slice(0,10).map(r => <Card key={r.id} onPress={() => router.push(`/reviews/${r.id}`)}><Heading>{r.guest}</Heading><Stars rating={r.rating} /><Body>{r.canonicalEnglish ?? r.text}</Body><Muted>{r.language} · {r.demo ? "Sample feedback" : "Imported review"}</Muted></Card>)}
    <Button label="Back to feedback studio" onPress={() => router.navigate("/insights")} secondary />
  </Page>;
}
