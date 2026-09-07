import { redirect } from "next/navigation";

import { LessonReader } from "@/components/learner/lesson-reader";
import { dptcModules } from "@/lib/content/dptc";

export const metadata = { title: "Lesson" };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}) {
  const { courseSlug, lessonSlug } = await params;
  if (lessonSlug === dptcModules[0].slug) {
    redirect(`/learn/${courseSlug}/play`);
  }
  return <LessonReader courseSlug={courseSlug} lessonSlug={lessonSlug} />;
}
