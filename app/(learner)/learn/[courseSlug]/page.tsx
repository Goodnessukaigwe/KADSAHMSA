import { notFound } from "next/navigation";

import { CourseOverview } from "@/components/learner/course-overview";
import { getVisibleCourse } from "@/lib/courses/queries";
import { getMyProgress, isEnrolledIn } from "@/lib/learning/queries";

export const metadata = { title: "Course" };

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getVisibleCourse(courseSlug);
  if (!course) notFound();

  const [enrolled, progress] = await Promise.all([
    isEnrolledIn(courseSlug),
    getMyProgress(courseSlug),
  ]);
  return (
    <CourseOverview
      slug={courseSlug}
      course={course}
      enrolled={enrolled}
      progress={progress}
    />
  );
}
