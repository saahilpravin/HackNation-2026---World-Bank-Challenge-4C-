import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "./theme";
import { BottomNavigation } from "./bottom-navigation";
export { colors } from "./theme";
export function Page({
  title,
  subtitle,
  children,
  back = false,
  showProfile = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  back?: boolean;
  showProfile?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <View style={s.brandBar}>
        <View style={s.brandGroup}>
          <Logo />
          <Text style={s.wordmark}>
            Lauda<Text style={{ color: colors.accent }}>.</Text>
          </Text>
        </View>
        {showProfile && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Business profile"
            style={s.avatar}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="options-outline" size={21} color={colors.ink} />
          </Pressable>
        )}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        {back && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
            }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.muted} />
            <Text style={s.muted}>Back</Text>
          </Pressable>
        )}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[s.muted, { marginTop: 6 }]}>{subtitle}</Text>
            )}
          </View>
        </View>
        {children}
      </ScrollView>
      {showProfile && <BottomNavigation />}
    </SafeAreaView>
  );
}
export function Logo({ large = false }: { large?: boolean }) {
  const size = large ? 76 : 34;
  return (
    <View
      accessibilityLabel="Lauda logo"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        backgroundColor: colors.accent,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: size * 0.3,
          top: size * 0.25,
          width: size * 0.12,
          height: size * 0.45,
          backgroundColor: "white",
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.3,
          top: size * 0.58,
          width: size * 0.4,
          height: size * 0.12,
          backgroundColor: "white",
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.59,
          top: size * 0.26,
          width: size * 0.15,
          height: size * 0.15,
          borderRadius: size,
          backgroundColor: "#B2F0DA",
        }}
      />
    </View>
  );
}
export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}
    >
      {children}
    </Pressable>
  ) : (
    <View style={s.card}>{children}</View>
  );
}
export function Heading({ children }: { children: React.ReactNode }) {
  return (
    <Text accessibilityRole="header" style={s.heading}>
      {children}
    </Text>
  );
}
export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}
export function PreviewText({ children }: { children: React.ReactNode }) {
  return (
    <Text numberOfLines={2} style={s.body}>
      {children}
    </Text>
  );
}
export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}
export function Badge({
  label,
  warn = false,
}: {
  label: string;
  warn?: boolean;
}) {
  return (
    <View style={[s.badge, warn && { backgroundColor: "#FFF0D1" }]}>
      <Text
        style={{
          color: warn ? colors.amber : colors.accent,
          fontSize: 12,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text
        style={{
          fontWeight: "600",
          fontSize: 16,
          color: secondary ? colors.accent : "white",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          s.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function Notice({ text }: { text: string }) {
  return (
    <View style={s.notice}>
      <Text accessibilityLiveRegion="polite" style={s.body}>
        {text}
      </Text>
    </View>
  );
}
export function Loading() {
  return (
    <View
      style={{ flex: 1, justifyContent: "center", backgroundColor: colors.bg }}
    >
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
export const s = StyleSheet.create({
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brandGroup: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: {
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: -1,
    color: colors.ink,
  },
  safe: { flex: 1, backgroundColor: colors.bg },
  page: {
    padding: 20,
    gap: 18,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: colors.accent,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#EAEFFD",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 20,
    borderRadius: 18,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  heading: { fontSize: 18, fontWeight: "600", color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 22, color: colors.muted },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderRadius: 20,
    backgroundColor: "#EDF0FF",
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 16,
    minHeight: 52,
  },
  secondary: { backgroundColor: "#EDF0FF" },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE1EF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  },
  notice: { padding: 16, backgroundColor: "#F0F2F7", borderRadius: 14 },
  row: { flexDirection: "row", gap: 12 },
  hero: { padding: 22, borderRadius: 18, backgroundColor: "#EDF1FF", gap: 12 },
  heroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32,
  },
  heroText: { color: colors.muted, fontSize: 16, lineHeight: 25 },
});
