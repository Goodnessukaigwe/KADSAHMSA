import { requireEnrolmentOrStaff } from "@/lib/learning/queries";

export default async function LearnCourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  await requireEnrolmentOrStaff(courseSlug);
  return children;
}
