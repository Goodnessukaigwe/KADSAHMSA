import { notFound, redirect } from "next/navigation";

import { LessonReader } from "@/components/learner/lesson-reader";
import { getPlayerPage, getVisibleCourse, liveLessonCountForSlug } from "@/lib/courses/queries";
import { lessonPlayerHref } from "@/lib/courses/paths";
import { moduleCountFor, progressPercent } from "@/lib/learning/progress";
import { getMyProgress } from "@/lib/learning/queries";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
  searchParams: Promise<{ page?: string; part?: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const { page, part } = await searchParams;
  const visible = await getVisibleCourse(courseSlug);
  if (!visible) notFound();

  const [result, progress, liveCount] = await Promise.all([
    getPlayerPage(courseSlug, lessonSlug, page, part),
    getMyProgress(courseSlug),
    liveLessonCountForSlug(courseSlug),
  ]);
  if (!result) notFound();

  const requestedHref = page
    ? `${lessonPlayerHref(courseSlug, lessonSlug)}?page=${page}`
    : part
      ? `${lessonPlayerHref(courseSlug, lessonSlug)}?part=${part}`
      : lessonPlayerHref(courseSlug, lessonSlug);
  if (requestedHref !== result.canonicalHref) {
    redirect(result.canonicalHref);
  }

  return (
    <LessonReader
      courseSlug={courseSlug}
      lesson={result.lesson}
      progressPercent={progressPercent(progress, moduleCountFor(courseSlug, liveCount))}
    />
  );
}
