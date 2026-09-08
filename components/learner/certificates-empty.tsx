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
        complete every live lesson and pass the final assessment at 70%.
      </p>

      <div className="mt-10 flex max-w-lg flex-col items-center rounded-[28px] bg-white px-8 py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <Award className="size-7" />
        </span>
        <h2 className="mt-6 text-xl font-bold">No certificates yet</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">
          Finish every live lesson on a published course, then pass the final
          assessment at 70% or above. A request alone does not issue a
          certificate.
        </p>
        <div className="mt-8">
          <SplitCta href="/my/courses" size="sm">
            Go to My courses
          </SplitCta>
        </div>
      </div>
    </div>
  );
}
