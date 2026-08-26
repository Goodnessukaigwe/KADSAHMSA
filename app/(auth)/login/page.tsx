import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <PhaseStub
      compact
      eyebrow="F3 · Auth"
      title="Log in"
      description="Email and password login will be wired to Supabase Auth in Phase 1–2. Phone registration is P1."
      requirement="F3 — Register / login / password reset (email)"
    />
  );
}
