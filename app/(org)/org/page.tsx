import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Organisation" };

export default function OrgDashboardPage() {
  return (
    <PhaseStub
      eyebrow="A6–A8 · Organisations"
      title="Organisation dashboard"
      description="Staff progress, bulk enrolment, and CSV reports. Org admins see only their own staff. Built in Phase 5."
      requirement="A6, A7, A8 — Org management, bulk enrol, reports"
    />
  );
}
