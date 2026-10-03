import { Text, View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "../state/store";
import { colors } from "./theme";
const tabs = [
  { label: "Home", href: "/", icon: "home-outline", activeIcon: "home" },
  { label: "Reviews", href: "/reviews", icon: "chatbox-ellipses-outline", activeIcon: "chatbox-ellipses" },
  {
    label: "Bookings",
    href: "/bookings",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    label: "Insights",
    href: "/insights",
    icon: "bar-chart-outline",
    activeIcon: "bar-chart",
  },
] as const;
export function BottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { data } = useStore();
  const unanswered = data?.reviews.filter(r => !r.exampleResponse && !data?.reviewReplies?.some(reply => reply.reviewId === r.id)).length ?? 0;
  return (
    <View
      style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Main navigation"
        style={styles.row}
      >
        {tabs.map((tab) => {
          const selected =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`) || (tab.href === "/insights" && pathname.startsWith("/ideas/"));
          return (
            <Pressable
              key={tab.href}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              aria-selected={selected}
              onPress={() => {
                if (!selected || pathname !== tab.href)
                  router.navigate(tab.href);
              }}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.active,
                pressed && { opacity: 0.7 },
              ]}
            >
              <View style={{ position: "relative" }}>
                <Ionicons
                  name={selected ? tab.activeIcon : tab.icon}
                  size={24}
                  color={selected ? colors.accent : colors.muted}
                />
                {tab.label === "Reviews" && unanswered > 0 && (
                  <View style={styles.count}>
                    <Text style={styles.countText}>
                      {unanswered > 99 ? "99+" : unanswered}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  selected && { color: colors.accent, fontWeight: "700" },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  shell: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: "row",
    gap: 4,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  tab: {
    flex: 1,
    minHeight: 64,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 9,
  },
  active: { backgroundColor: colors.lavender },
  label: { fontSize: 13, color: colors.muted, fontWeight: "500" },
  count: {
    position: "absolute",
    top: -6,
    right: -9,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "white",
  },
  countText: { color: "white", fontSize: 10, fontWeight: "700" },
});
