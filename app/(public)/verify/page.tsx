import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Verify certificate" };

export default function VerifyPage() {
  return (
    <PhaseStub
      eyebrow="F7 · Public verify"
      title="Verify a certificate"
      description="Anyone can check a certificate ID here. QR codes are P1. Built in Phase 3."
      requirement="F7 — Public certificate verification page (ID entry)"
    />
  );
}
