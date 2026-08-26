import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Course" };

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PhaseStub
      eyebrow="F2 · Course detail"
      title={slug.replace(/-/g, " ")}
      description="Overview, objectives, outline, duration, certificate info, and Enrol CTA will land here in Phase 2."
      requirement="F2 — Course detail page"
    />
  );
}
