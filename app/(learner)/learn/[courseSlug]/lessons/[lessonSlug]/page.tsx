import { notFound, redirect } from "next/navigation";

import { LessonReader } from "@/components/learner/lesson-reader";
import { getPlayerLesson, getVisibleCourse } from "@/lib/courses/queries";
import { dptcModules } from "@/lib/content/dptc";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  const visible = await getVisibleCourse(courseSlug);
  if (!visible) notFound();

  if (courseSlug === "dptc" && lessonSlug === dptcModules[0].slug) {
    redirect(`/learn/${courseSlug}/play`);
  }

  const lesson = await getPlayerLesson(courseSlug, lessonSlug);
  if (!lesson) notFound();

  return <LessonReader courseSlug={courseSlug} lesson={lesson} />;
}
