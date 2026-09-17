import { AdminCourses } from "@/components/admin/admin-courses";
import { getAdminCourseColumns, listAdminCourses } from "@/lib/courses/queries";

export const metadata = { title: "Admin courses" };

export default async function AdminCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const [courses, columns] = await Promise.all([
    listAdminCourses(),
    getAdminCourseColumns(),
  ]);
  const initialEdit = edit?.trim() ? edit.trim() : null;
  return (
    <AdminCourses
      courses={courses}
      initialColumns={columns}
      initialEdit={initialEdit}
    />
  );
}
