import { notFound, redirect } from "next/navigation";

import { getVisibleCourse } from "@/lib/courses/queries";
import { firstOutlineHref } from "@/lib/learning/progress";

export const metadata = { title: "Take course" };

export default async function CoursePlayPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await getVisibleCourse(courseSlug);
  if (!course) notFound();
  redirect(firstOutlineHref(courseSlug, course.outline, `/learn/${courseSlug}`));
}
