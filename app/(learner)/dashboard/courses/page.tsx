import { MyCourses } from "@/components/learner/my-courses";
import { countMyCertificates } from "@/lib/certificates/queries";
import { listPublishedCourses } from "@/lib/courses/queries";
import { getLearningSnapshot, listMyRequestedSlugs } from "@/lib/learning/queries";

export const metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const [snapshot, certificateCount, catalogue, requestedSlugs] = await Promise.all([
    getLearningSnapshot(),
    countMyCertificates(),
    listPublishedCourses(),
    listMyRequestedSlugs(),
  ]);
  return (
    <MyCourses
      snapshot={snapshot}
      certificateCount={certificateCount}
      catalogue={catalogue}
      requestedSlugs={requestedSlugs}
    />
  );
}
