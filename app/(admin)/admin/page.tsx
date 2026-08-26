import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Admin" };

export default function AdminHomePage() {
  return (
    <PhaseStub
      eyebrow="A1–A5 · Admin builder"
      title="Course builder"
      description="Gurucan-style sidebar back office: courses, content blocks, quizzes, certificates, offers. Built in Phase 4."
      requirement="A1 — Course builder (Save / Preview / Publish / Delete)"
    />
  );
}
