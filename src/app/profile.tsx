import { Page, Button, Loading } from "../components/ui";
import { ProfileForm } from "../components/profile-form";
import { router } from "expo-router";
import { useStore } from "../state/store";
export default function Profile() {
  const { data } = useStore();
  if (!data) return <Loading />;
  return (
    <Page
      title="Business profile"
      subtitle="The facts that make your business yours."
      back
    >
      <ProfileForm />
      <Button
        label="Offline & AI settings"
        secondary
        onPress={() => router.push("/offline")}
      />
    </Page>
  );
}
