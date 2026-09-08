import { notFound } from "next/navigation";

import { CourseDetail } from "@/components/courses/course-detail";
import { getVisibleCourse } from "@/lib/courses/queries";
import { getMyProgress, hasRequestedEnrolment, isEnrolledIn } from "@/lib/learning/queries";
import { getAuthUser } from "@/lib/permissions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getVisibleCourse(slug);
  return {
    title: course?.title ?? "Course",
    description: course
      ? `${course.title} — KADSAMHSA LMS.`
      : "Course detail",
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = await getVisibleCourse(slug);
  if (!course) notFound();

  const user = await getAuthUser();
  const [enrolled, requested, progress] = await Promise.all([
    isEnrolledIn(slug),
    hasRequestedEnrolment(slug),
    getMyProgress(slug),
  ]);

  return (
    <CourseDetail
      course={course}
      signedIn={Boolean(user)}
      enrolled={enrolled}
      requested={requested}
      progress={progress}
    />
  );
}
