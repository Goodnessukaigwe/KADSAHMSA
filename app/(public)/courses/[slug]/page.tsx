import { notFound } from "next/navigation";

import { CourseDetail } from "@/components/courses/course-detail";
import { getCatalogueCourse } from "@/lib/content/catalogue";
import { getMyProgress, isEnrolledIn } from "@/lib/learning/queries";
import { getAuthUser } from "@/lib/permissions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getCatalogueCourse(slug);
  return {
    title: course?.title ?? "Course",
    description: course
      ? `${course.title} — KADSAMHSA LMS.`
      : "Course detail",
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!getCatalogueCourse(slug)) {
    notFound();
  }

  const user = await getAuthUser();
  const enrolled = await isEnrolledIn(slug);
  const progress = await getMyProgress(slug);

  return (
    <CourseDetail
      slug={slug}
      signedIn={Boolean(user)}
      enrolled={enrolled}
      progress={progress}
    />
  );
}
