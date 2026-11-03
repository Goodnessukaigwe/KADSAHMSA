import { ProfileForm } from "@/components/profile/profile-form";
import { requireSessionProfile } from "@/lib/permissions";

export const metadata = { title: "Profile" };

export default async function LearnerProfilePage() {
  const profile = await requireSessionProfile();
  return (
    <ProfileForm
      name={profile.name}
      email={profile.email}
      avatarUrl={profile.avatarUrl}
    />
  );
}
