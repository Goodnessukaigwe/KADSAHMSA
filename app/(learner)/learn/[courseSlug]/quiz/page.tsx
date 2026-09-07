import { ModuleQuiz } from "@/components/learner/module-quiz";

export const metadata = { title: "Module quiz" };

export default async function CourseQuizPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  return <ModuleQuiz courseSlug={courseSlug} />;
}
