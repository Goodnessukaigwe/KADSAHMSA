import { CourseBuilder } from "@/components/admin/course-builder";

export const metadata = { title: "Course builder" };

export default async function AdminCourseBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CourseBuilder slug={slug} />;
}
