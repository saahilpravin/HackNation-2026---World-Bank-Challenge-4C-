import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DemoFrame } from "../components/demo-frame";
import { StoreProvider } from "../state/store";
export default function Layout() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <DemoFrame><Stack screenOptions={{ headerShown: false }} /></DemoFrame>
    </StoreProvider>
  );
}
