"use client";

import { Award } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import type { IssuedCertificate } from "@/lib/learner-session";

export function CertificatesList({ certs }: { certs: IssuedCertificate[] }) {
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Certificates
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Downloadable PDFs with a unique verification ID. Share the ID on the
        public verify page.
      </p>

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
                Issued {cert.issued} · ID {cert.id}
              </p>
            </div>
            <SplitCta size="sm" href="/verify" className="shrink-0">
              View certificate
            </SplitCta>
          </article>
        ))}
      </div>
    </div>
  );
}
