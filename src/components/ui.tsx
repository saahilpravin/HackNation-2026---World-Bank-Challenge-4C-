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
export const colors = {
  bg: "#F6F5EE",
  ink: "#183C35",
  muted: "#64766F",
  green: "#216653",
  line: "#DFE5DA",
  amber: "#896020",
};
export function Page({
  title,
  subtitle,
  children,
  back = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        {back && (
          <Button
            label="Back"
            secondary
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
        )}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>NOOR AI / YOUR BUSINESS COMPANION</Text>
            <Text accessibilityRole="header" style={s.title}>
              {title}
            </Text>
            {subtitle && <Text style={s.muted}>{subtitle}</Text>}
          </View>
          <Pressable
            accessibilityLabel="Business profile"
            style={s.avatar}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="leaf-outline" size={24} color={colors.green} />
          </Pressable>
        </View>
        {children}
        <Text style={[s.muted, { textAlign: "center", marginTop: 12 }]}>
          Made for local businesses. Ready for the everyday.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
          color: warn ? colors.amber : colors.green,
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
          fontWeight: "700",
          color: secondary ? colors.green : "white",
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
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  page: {
    padding: 22,
    gap: 16,
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 36,
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
    color: colors.green,
    fontWeight: "800",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3ECDD",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  heading: { fontSize: 20, fontWeight: "700", color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
    borderRadius: 20,
    backgroundColor: "#E8F1E7",
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 14,
    padding: 16,
    minHeight: 48,
  },
  secondary: { backgroundColor: "#E7EEE3" },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CCD7C8",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
  },
  notice: { padding: 16, backgroundColor: "#FFF1D8", borderRadius: 14 },
  row: { flexDirection: "row", gap: 12 },
  hero: { padding: 24, borderRadius: 24, backgroundColor: colors.ink, gap: 12 },
  heroTitle: { color: "white", fontSize: 25, fontWeight: "700" },
  heroText: { color: "#CFE2D8", fontSize: 15, lineHeight: 22 },
});
