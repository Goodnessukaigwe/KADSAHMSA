import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Course player" };

export default async function CoursePlayerPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;

  return (
    <PhaseStub
      eyebrow="F4 · Course player"
      title={courseSlug.replace(/-/g, " ")}
      description="Module/lesson navigation, content blocks, mark complete, progress, and resume. Built in Phase 2."
      requirement="F4 — Course player"
    />
  );
}
