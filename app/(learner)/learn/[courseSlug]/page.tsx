import { CourseOverview } from "@/components/learner/course-overview";
import { getMyProgress, isEnrolledIn } from "@/lib/learning/queries";

export const metadata = { title: "Course" };

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const [enrolled, progress] = await Promise.all([
    isEnrolledIn(courseSlug),
    getMyProgress(courseSlug),
  ]);
  return (
    <CourseOverview slug={courseSlug} enrolled={enrolled} progress={progress} />
  );
}
