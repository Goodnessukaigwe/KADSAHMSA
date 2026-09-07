import { LearnerDashboard } from "@/components/learner/dashboard";
import { getLearningSnapshot } from "@/lib/learning/queries";
import { requireSessionProfile } from "@/lib/permissions";

export const metadata = { title: "My learning" };

export default async function LearnerHomePage() {
  const profile = await requireSessionProfile();
  const snapshot = await getLearningSnapshot();
  return (
    <LearnerDashboard firstName={profile.name} snapshot={snapshot} />
  );
}
