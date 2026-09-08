import { AdminCourses } from "@/components/admin/admin-courses";
import { listAdminCourses } from "@/lib/courses/queries";

export const metadata = { title: "Admin courses" };

export default async function AdminCoursesPage() {
  const courses = await listAdminCourses();
  return <AdminCourses courses={courses} />;
}
