import { LearnerDashboard } from "@/components/learner/dashboard";
import { listPublishedCourses } from "@/lib/courses/queries";
import { getLearningSnapshot, listMyRequestedSlugs } from "@/lib/learning/queries";
import { requireSessionProfile } from "@/lib/permissions";

export const metadata = { title: "My learning" };

export default async function LearnerHomePage() {
  const profile = await requireSessionProfile();
  const [snapshot, catalogue, requestedSlugs] = await Promise.all([
    getLearningSnapshot(),
    listPublishedCourses(),
    listMyRequestedSlugs(),
  ]);
  return (
    <LearnerDashboard
      firstName={profile.name}
      snapshot={snapshot}
      catalogue={catalogue}
      requestedSlugs={requestedSlugs}
    />
  );
}
