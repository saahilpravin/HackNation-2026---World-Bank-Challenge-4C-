import { Page, Notice, Loading } from "../components/ui";
import { ProfileForm } from "../components/profile-form";
import { useStore } from "../state/store";
export default function Onboarding() {
  const { data, error } = useStore();
  if (error) return <Notice text={error} />;
  if (!data) return <Loading />;
  return (
    <Page
      title="A little help. A lot of possibility."
      subtitle="Welcome to Noor AI, your companion for a thriving local tourism business."
    >
      <Notice text="Demo mode: sample visitors and reviews are included. AI understanding and translations are scripted examples; no model is installed." />
      <ProfileForm onboarding />
    </Page>
  );
}
