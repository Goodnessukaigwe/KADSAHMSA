import { notFound } from "next/navigation";

import { CourseBuilder } from "@/components/admin/course-builder";
import { getAdminCourse, listCourseLearners, listCourseNav } from "@/lib/courses/queries";

export const metadata = { title: "Course builder" };

export default async function AdminCourseBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [course, nav, learners] = await Promise.all([
    getAdminCourse(slug),
    listCourseNav(),
    listCourseLearners(slug),
  ]);
  if (slug !== "new" && !course) notFound();
  return <CourseBuilder slug={slug} course={course} nav={nav} learners={learners} />;
}
