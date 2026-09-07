import { CoursePlayer } from "@/components/learner/course-player";
import { getMyProgress } from "@/lib/learning/queries";

export const metadata = { title: "Take course" };

export default async function CoursePlayPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const progress = await getMyProgress(courseSlug);
  return (
    <CoursePlayer slug={courseSlug} initialSeconds={progress.playerSeconds} />
  );
}
