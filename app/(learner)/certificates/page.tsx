import { CertificatesEmpty } from "@/components/learner/certificates-empty";
import { CertificatesList } from "@/components/learner/certificates-list";
import { listMyCertificates } from "@/lib/certificates/queries";

export const metadata = { title: "Certificates" };

export default async function CertificatesPage() {
  const certs = await listMyCertificates();
  if (certs.length === 0) return <CertificatesEmpty />;
  return <CertificatesList certs={certs} />;
}
