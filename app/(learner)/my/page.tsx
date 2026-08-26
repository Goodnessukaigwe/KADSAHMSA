import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "My learning" };

export default function LearnerHomePage() {
  return (
    <PhaseStub
      eyebrow="F8 · Learner dashboard"
      title="My learning"
      description="Enrolled courses, progress, certificates, and payment history will appear here in Phase 2."
      requirement="F8 — Learner dashboard"
    />
  );
}
