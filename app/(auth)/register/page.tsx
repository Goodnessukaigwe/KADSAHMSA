import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <PhaseStub
      compact
      eyebrow="F3 · Auth"
      title="Create an account"
      description="Self-registration with email and password. Consent/privacy copy lands with NDPA work before launch."
      requirement="F3 — Self-registration and login with email + password"
    />
  );
}
