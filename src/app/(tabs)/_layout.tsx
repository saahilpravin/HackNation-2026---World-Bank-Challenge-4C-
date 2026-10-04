import { Redirect, Tabs } from "expo-router";
import { useStore } from "../../state/store";
import { Loading, Notice } from "../../components/ui";
export default function Layout() {
  const { data, error } = useStore();
  if (error) return <Notice text={`Local storage could not open: ${error}`} />;
  if (!data) return <Loading />;
  if (!data.profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={() => null} screenOptions={{ headerShown: false }}>
      {(["index", "reviews", "bookings", "insights", "help"] as const).map(
        (name, i) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{ title: ["Home", "Reviews", "Bookings", "Insights", "Help"][i] }}
          />
        ),
      )}
    </Tabs>
  );
}
