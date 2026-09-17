import { notFound, redirect } from "next/navigation";

import { LessonReader } from "@/components/learner/lesson-reader";
import { getPlayerPage, getVisibleCourse } from "@/lib/courses/queries";
import { dptcModules } from "@/lib/content/dptc";
import { lessonPlayerHref } from "@/lib/courses/paths";

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

  if (courseSlug === "dptc" && lessonSlug === dptcModules[0].slug) {
    redirect(`/learn/${courseSlug}/play`);
  }

  const result = await getPlayerPage(courseSlug, lessonSlug, page, part);
  if (!result) notFound();

  const requestedHref = page
    ? `${lessonPlayerHref(courseSlug, lessonSlug)}?page=${page}`
    : part
      ? `${lessonPlayerHref(courseSlug, lessonSlug)}?part=${part}`
      : lessonPlayerHref(courseSlug, lessonSlug);
  if (requestedHref !== result.canonicalHref) {
    redirect(result.canonicalHref);
  }

  return <LessonReader courseSlug={courseSlug} lesson={result.lesson} />;
}
