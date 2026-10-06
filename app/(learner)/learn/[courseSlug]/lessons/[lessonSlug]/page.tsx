import { notFound, redirect } from "next/navigation";

import { LessonReader } from "@/components/learner/lesson-reader";
import { getPlayerPage, getVisibleCourse, liveLessonCountForSlug } from "@/lib/courses/queries";
import { lessonPlayerHref } from "@/lib/courses/paths";
import { buildAccess } from "@/lib/learning/gating";
import { moduleCountFor, progressPercent } from "@/lib/learning/progress";
import { isStaffUser } from "@/lib/permissions";
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

  // Learners go in order; staff may preview any page.
  const staff = await isStaffUser();
  const access = buildAccess(visible.outline, progress, staff);
  if (visible.outline.length && !access.lessonOpen(lessonSlug)) {
    redirect(lessonPlayerHref(courseSlug, access.frontierSlug ?? visible.outline[0].lessons[0].slug));
  }
  const lesson = {
    ...result.lesson,
    toc: result.lesson.toc.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        locked: item.lessonSlug ? !access.lessonOpen(item.lessonSlug) : false,
      })),
    })),
  };

  const order = visible.outline.flatMap((module) => module.lessons.map((item) => item.slug));
  const furthest = progress.resumeLessonSlug ? order.indexOf(progress.resumeLessonSlug) : -1;
  const requireChecks = !staff && order.indexOf(lessonSlug) >= furthest;

  return (
    <LessonReader
      key={lesson.slug}
      requireChecks={requireChecks}
      courseSlug={courseSlug}
      lesson={lesson}
      progressPercent={progressPercent(progress, moduleCountFor(courseSlug, liveCount))}
    />
  );
}
