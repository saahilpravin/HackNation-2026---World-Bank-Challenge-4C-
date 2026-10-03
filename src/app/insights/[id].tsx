import { useLocalSearchParams } from "expo-router";
import { Page, Card, Heading, Body, Badge, Notice } from "../../components/ui";
import { useStore } from "../../state/store";
export default function Evidence() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const reviews = data?.reviews.filter((r) => r.theme === id) ?? [];
  return (
    <Page
      title="Behind the insight"
      subtitle={
        id === "directions" ? "A smoother arrival" : "A memorable tasting"
      }
      back
    >
      <Notice text="These are seeded sample reviews, with manually assigned themes. Real model evidence will appear here after the AI adapter is connected." />
      {reviews.map((r) => (
        <Card key={r.id}>
          <Badge label={`${r.rating} / 5 · Sample review`} />
          <Heading>{r.guest}</Heading>
          <Body>“{r.text}”</Body>
        </Card>
      ))}
      {!reviews.length && <Body>No supporting reviews found.</Body>}
    </Page>
  );
}
