"use client";

import { useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { getCertificateDownloadUrl } from "@/lib/certificates/actions";
import type { LearnerCertificate } from "@/lib/certificates/queries";

export function CertificatesList({ certs }: { certs: LearnerCertificate[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function download(cert: LearnerCertificate) {
    if (pendingId) return;
    setError(null);
    setPendingId(cert.id);
    const result = await getCertificateDownloadUrl(cert.id);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Certificates
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Download the PDF and share the verification ID on the public verify page.
        A revoked certificate still downloads; verify will say it was revoked.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        {certs.map((cert) => (
          <article
            key={cert.id}
            className="flex flex-col gap-4 rounded-[24px] bg-white p-5 sm:flex-row sm:items-center"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
              <Award className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{cert.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Issued {cert.issued} · ID {cert.verificationId}
                {cert.status === "revoked" ? " · Revoked" : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/verify?id=${encodeURIComponent(cert.verificationId)}`}
                className="inline-flex h-10 items-center rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
              >
                Verify
              </Link>
              <SplitCta
                size="sm"
                className="shrink-0"
                onClick={() => void download(cert)}
              >
                {pendingId === cert.id ? "Preparing…" : "Download PDF"}
              </SplitCta>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
