import { router } from "expo-router";
import {
  Page,
  Card,
  Heading,
  Body,
  Badge,
  Muted,
  Notice,
} from "../../components/ui";
import { useStore } from "../../state/store";
export default function Insights() {
  const { data } = useStore();
  const reviews = data?.reviews ?? [];
  const average = reviews.length
    ? (reviews.reduce((n, r) => n + r.rating, 0) / reviews.length).toFixed(1)
    : "—";
  const demo = reviews.some((r) => r.demo);
  return (
    <Page
      title="Insights"
      subtitle="Turn customer feedback into your next good idea."
    >
      {demo && (
        <Notice text="Demo analysis: review themes were assigned by hand. Ratings and counts come from sample reviews, not measured AI results." />
      )}
      <Card>
        <Badge label={demo ? "Sample review summary" : "Review summary"} />
        <Heading>{average} / 5</Heading>
        <Muted>
          {reviews.length} {demo ? "sample " : ""}customer reviews
        </Muted>
      </Card>
      {!reviews.length && (
        <Card>
          <Heading>Start with a little listening</Heading>
          <Body>
            No reviews yet. Your feedback insights will appear here once
            customer reviews are added or imported.
          </Body>
          <Muted>Review entry and import are next implementation steps.</Muted>
        </Card>
      )}
      {[
        {
          key: "directions",
          title: "Make arrivals simpler",
          body: "Review feedback about finding your location and planning a visit.",
        },
        {
          key: "tasting",
          title: "Build on what customers love",
          body: "See which parts of the experience made a lasting impression.",
        },
      ]
        .filter((theme) => reviews.some((r) => r.theme === theme.key))
        .map((theme) => (
          <Card
            key={theme.key}
            onPress={() => router.push(`/insights/${theme.key}`)}
          >
            <Badge
              label={`${reviews.filter((r) => r.theme === theme.key).length} supporting reviews`}
            />
            <Heading>{theme.title}</Heading>
            <Body>{theme.body}</Body>
            <Muted>Read the evidence →</Muted>
          </Card>
        ))}
    </Page>
  );
}
