import { CourseCatalogue } from "@/components/courses/course-catalogue";
import { listPublishedCourses } from "@/lib/courses/queries";

export const metadata = {
  title: "Courses",
  description:
    "Browse published KADSAMHSA courses on drug prevention, treatment, and care.",
};

export default async function CataloguePage() {
  const courses = await listPublishedCourses();
  return <CourseCatalogue courses={courses} />;
}
