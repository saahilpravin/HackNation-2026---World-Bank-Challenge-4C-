import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../state/store";
import { Loading, Notice, colors } from "../../components/ui";
export default function Layout() {
  const { data, error } = useStore();
  if (error) return <Notice text={`Local storage could not open: ${error}`} />;
  if (!data) return <Loading />;
  if (!data.profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: "#FCFCF8",
          borderTopColor: colors.line,
        },
        tabBarLabelStyle: { fontWeight: "700" },
      }}
    >
      {(["index", "messages", "bookings", "insights"] as const).map(
        (name, i) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: ["Home", "Messages", "Bookings", "Insights"][i],
              tabBarIcon: ({ color, size }) => (
                <Ionicons
                  name={
                    (
                      [
                        "home-outline",
                        "chatbubbles-outline",
                        "calendar-outline",
                        "sparkles-outline",
                      ] as const
                    )[i]
                  }
                  color={color}
                  size={size}
                />
              ),
            }}
          />
        ),
      )}
    </Tabs>
  );
}
