"use client";

import { useEffect, useState } from "react";

import { CertificatesEmpty } from "@/components/learner/certificates-empty";
import { CertificatesList } from "@/components/learner/certificates-list";
import {
  getCertificates,
  type IssuedCertificate,
} from "@/lib/learner-session";

export function CertificatesPageClient() {
  const [certs, setCerts] = useState<IssuedCertificate[] | null>(null);

  useEffect(() => {
    setCerts(getCertificates());
  }, []);

  if (certs == null) return <div className="min-h-[40vh]" />;
  if (certs.length === 0) return <CertificatesEmpty />;
  return <CertificatesList certs={certs} />;
}
