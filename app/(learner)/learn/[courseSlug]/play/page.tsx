import { notFound, redirect } from "next/navigation";

import { CoursePlayer } from "@/components/learner/course-player";
import { getPlayerLesson, getVisibleCourse } from "@/lib/courses/queries";
import { lessonPlayerHref } from "@/lib/courses/paths";
import { dptcCourse, dptcModules } from "@/lib/content/dptc";
import { getMyProgress } from "@/lib/learning/queries";

export const metadata = { title: "Take course" };

export default async function CoursePlayPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getVisibleCourse(courseSlug);
  if (!course) notFound();

  if (courseSlug !== dptcCourse.slug) {
    const first = course.outline[0];
    redirect(first ? lessonPlayerHref(courseSlug, first.slug) : `/learn/${courseSlug}`);
  }

  const [progress, intro] = await Promise.all([
    getMyProgress(courseSlug),
    getPlayerLesson(courseSlug, dptcModules[0]?.slug ?? "introduction"),
  ]);
  return (
    <CoursePlayer
      slug={courseSlug}
      title={course.title}
      poster={course.image}
      initialSeconds={progress.playerSeconds}
      assets={intro?.assets ?? []}
    />
  );
}
