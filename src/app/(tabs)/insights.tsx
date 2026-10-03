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
  return (
    <Page
      title="Visitor insights"
      subtitle="Listen closely. Grow thoughtfully."
    >
      <Notice text="Demo review analysis: themes were assigned by hand. Counts and ratings are calculated from sample reviews, not measured AI results." />
      <Card>
        <Badge label="Sample reviews" />
        <Heading>{average} / 5</Heading>
        <Muted>Average across {reviews.length} sample reviews</Muted>
      </Card>
      {[
        {
          key: "directions",
          title: "Make the farm easier to find",
          body: "Consider sharing a map pin and bus stop instructions before each tour.",
        },
        {
          key: "tasting",
          title: "Keep the tasting at the heart",
          body: "Visitors value the coffee tasting and your stories. Make them part of your welcome.",
        },
      ].map((theme) => (
        <Card
          key={theme.key}
          onPress={() => router.push(`/insights/${theme.key}`)}
        >
          <Badge
            label={`${reviews.filter((r) => r.theme === theme.key).length} sample reviews`}
          />
          <Heading>{theme.title}</Heading>
          <Body>{theme.body}</Body>
          <Muted>Read supporting reviews →</Muted>
        </Card>
      ))}
    </Page>
  );
}
