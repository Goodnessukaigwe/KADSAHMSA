import { PhaseStub } from "@/components/phase-stub";

export const metadata = { title: "Certificates" };

export default function CertificatesPage() {
  return (
    <PhaseStub
      eyebrow="F6 · Certificates"
      title="My certificates"
      description="Downloadable PDFs with unique verification IDs. Issued in Phase 3."
      requirement="F6 — Auto-generated PDF certificate"
    />
  );
}
