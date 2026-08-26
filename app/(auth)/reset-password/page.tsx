import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <PhaseStub
      compact
      eyebrow="F3 · Auth"
      title="Reset password"
      description="Password reset via email. Implemented with Supabase Auth in Phase 2."
      requirement="F3 — Password reset"
    />
  );
}
