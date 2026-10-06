import { notFound } from "next/navigation";

import { CourseAnalyticsView } from "@/components/admin/course-analytics";
import { getCourseAnalytics } from "@/lib/admin/analytics";

export const metadata = { title: "Course analytics" };

export default async function CourseAnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const analytics = await getCourseAnalytics(slug);
  if (!analytics) notFound();
  return <CourseAnalyticsView analytics={analytics} />;
}
