"use client";

import { Award } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";

export function CertificatesEmpty() {
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Certificates
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Downloadable PDFs with a unique verification ID appear here after you
        pass a qualifying assessment at 70%.
      </p>

      <div className="mt-10 flex max-w-lg flex-col items-center rounded-[28px] bg-white px-8 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Award className="size-7" />
        </span>
        <h2 className="mt-6 text-xl font-bold">No certificates yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
          Complete the DPTC sensitisation course and pass the Module 1 quiz at
          70% or above to earn your first certificate.
        </p>
        <div className="mt-8">
          <SplitCta href="/learn/dptc" size="sm">
            Start the DPTC course
          </SplitCta>
        </div>
      </div>
    </div>
  );
}
